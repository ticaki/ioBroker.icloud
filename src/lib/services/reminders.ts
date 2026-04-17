import * as zlib from 'zlib';
import type iCloudService from '..';

// ── CloudKit record types ─────────────────────────────────────────────────────

interface CKZoneID {
    zoneName: string;
    zoneType: string;
}

interface CKReference {
    recordName: string;
    action: string;
}

interface CKFieldValue {
    type: string;
    value: unknown;
}

interface CKRecord {
    recordName: string;
    recordType: string;
    recordChangeTag?: string;
    fields: Record<string, CKFieldValue | undefined>;
    created?: { timestamp: number };
    modified?: { timestamp: number };
    deleted?: boolean;
    zoneID?: CKZoneID;
}

interface CKZoneChangesZone {
    records: CKRecord[];
    syncToken?: string;
    moreComing?: boolean;
}

interface CKZoneChangesResponse {
    zones: CKZoneChangesZone[];
}

// ── Domain models ─────────────────────────────────────────────────────────────

export interface RemindersList {
    id: string;
    title: string;
    color: string | null;
    count: number;
}

export interface Reminder {
    id: string;
    listId: string;
    title: string;
    description: string;
    completed: boolean;
    completedDate: number | null;
    dueDate: number | null;
    startDate: number | null;
    priority: number;
    flagged: boolean;
    allDay: boolean;
    deleted: boolean;
    createdDate: number | null;
    lastModifiedDate: number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REMINDERS_ZONE: CKZoneID = { zoneName: 'Reminders', zoneType: 'REGULAR_CUSTOM_ZONE' };
const CONTAINER = 'com.apple.reminders';
const ENV = 'production';
const SCOPE = 'private';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFieldValue<T = unknown>(fields: Record<string, CKFieldValue | undefined>, key: string): T | null {
    const f = fields[key];
    if (!f || f.value === undefined || f.value === null) {
        return null;
    }
    return f.value as T;
}

function getRefName(fields: Record<string, CKFieldValue | undefined>, key: string): string {
    const f = fields[key];
    if (!f || f.type !== 'REFERENCE') {
        return '';
    }
    const ref = f.value as CKReference | null;
    return ref?.recordName ?? '';
}

function tsToMs(timestamp: unknown): number | null {
    if (typeof timestamp === 'number') {
        // CloudKit timestamps are milliseconds since epoch
        return timestamp;
    }
    return null;
}

/**
 * Read a protobuf varint at the given offset.
 *
 * @param buf - buffer to read from
 * @param offset - byte offset to start reading
 * @returns tuple [value, newOffset] or null on failure
 */
function readVarint(buf: Buffer, offset: number): [number, number] | null {
    if (offset >= buf.length) {
        return null;
    }
    let value = 0;
    let shift = 0;
    while (offset < buf.length) {
        const b = buf[offset++];
        value |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) {
            return [value >>> 0, offset];
        }
        shift += 7;
        if (shift > 35) {
            return null;
        }
    }
    return null;
}

/**
 * Collect all length-delimited (wire type 2) payloads for a given field number
 * from a protobuf-encoded buffer.
 *
 * @param buf - protobuf-encoded buffer
 * @param targetField - field number to extract
 */
function readLengthDelimitedFields(buf: Buffer, targetField: number): Buffer[] {
    const results: Buffer[] = [];
    let offset = 0;
    while (offset < buf.length) {
        const tagResult = readVarint(buf, offset);
        if (!tagResult) {
            break;
        }
        const [tag, tagEnd] = tagResult;
        offset = tagEnd;

        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x07;

        if (wireType === 2) {
            const lenResult = readVarint(buf, offset);
            if (!lenResult) {
                break;
            }
            const [len, dataStart] = lenResult;
            offset = dataStart;
            if (offset + len > buf.length) {
                break;
            }
            if (fieldNumber === targetField) {
                results.push(buf.subarray(offset, offset + len));
            }
            offset += len;
        } else if (wireType === 0) {
            const vResult = readVarint(buf, offset);
            if (!vResult) {
                break;
            }
            offset = vResult[1];
        } else if (wireType === 1) {
            offset += 8; // 64-bit fixed
        } else if (wireType === 5) {
            offset += 4; // 32-bit fixed
        } else {
            break;
        }
    }
    return results;
}

/**
 * Parse the text from a protobuf-encoded CRDT document.
 *
 * Apple uses a versioned wrapper (versioned_document.Document) containing
 * a topotext.String message. The structure is:
 *
 *   Document { field 2: Version { field 3: bytes → topotext.String { field 2: string } } }
 *
 * Falls back to parsing as Version or bare String if the outer wrapper is absent.
 *
 * @param buf - decompressed protobuf buffer
 */
function parseDocumentProto(buf: Buffer): string {
    // Try as Document: field 2 = Version messages
    const versions = readLengthDelimitedFields(buf, 2);
    for (const versionBuf of versions) {
        // Version: field 3 = bytes data (containing topotext.String)
        const dataFields = readLengthDelimitedFields(versionBuf, 3);
        for (const stringBuf of dataFields) {
            const strings = readLengthDelimitedFields(stringBuf, 2);
            for (const s of strings) {
                const text = s.toString('utf-8');
                if (text.length > 0) {
                    return text;
                }
            }
        }
    }

    // Fallback: try as bare Version (field 3 = data)
    const dataFields = readLengthDelimitedFields(buf, 3);
    for (const stringBuf of dataFields) {
        const strings = readLengthDelimitedFields(stringBuf, 2);
        for (const s of strings) {
            const text = s.toString('utf-8');
            if (text.length > 0) {
                return text;
            }
        }
    }

    // Fallback: try as bare topotext.String (field 2 = string)
    const strings = readLengthDelimitedFields(buf, 2);
    for (const s of strings) {
        const text = s.toString('utf-8');
        if (text.length > 0) {
            return text;
        }
    }

    return '';
}

/**
 * Decode a CRDT document (protobuf-encoded TitleDocument/NotesDocument).
 *
 * Apple stores reminder titles and notes as zlib-compressed, protobuf-encoded
 * CRDT documents (base64 over the wire). The decoding pipeline is:
 *
 *   base64 → zlib inflate → protobuf (Document → Version → topotext.String)
 *
 * Reference: timlaing/pyicloud `_decode_crdt_document`.
 *
 * @param value - base64-encoded string, Uint8Array, or plain string
 */
function decodeCrdtDocument(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    let data: Buffer;
    if (typeof value === 'string') {
        // Pad base64 if needed
        let b64 = value;
        const padding = 4 - (b64.length % 4);
        if (padding !== 4) {
            b64 += '='.repeat(padding);
        }
        try {
            data = Buffer.from(b64, 'base64');
        } catch {
            return '';
        }
    } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        data = Buffer.from(value);
    } else {
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return `${value as string | number | boolean}`;
    }

    // Decompress — Apple zlib-compresses CRDT documents
    try {
        data = zlib.inflateSync(data);
    } catch {
        try {
            data = zlib.gunzipSync(data);
        } catch {
            // Data may not be compressed — continue with raw bytes
        }
    }

    // Parse protobuf structure
    try {
        return parseDocumentProto(data);
    } catch {
        return '';
    }
}

// ── Service ───────────────────────────────────────────────────────────────────

export class iCloudRemindersService {
    service: iCloudService;
    serviceUri: string;
    private baseEndpoint: string;

    /** Fetched reminder lists (keyed by CloudKit recordName). */
    private listsById: Map<string, RemindersList> = new Map();
    /** Fetched reminders keyed by reminder recordName. */
    private remindersById: Map<string, Reminder> = new Map();
    /** Last sync token — persisted across refreshes for incremental updates. */
    private _syncToken: string | undefined;

    /** Public: current lists snapshot. */
    get lists(): RemindersList[] {
        return [...this.listsById.values()];
    }

    /** Public: reminders grouped by list ID. */
    get remindersByList(): Map<string, Reminder[]> {
        const map = new Map<string, Reminder[]>();
        for (const rem of this.remindersById.values()) {
            let arr = map.get(rem.listId);
            if (!arr) {
                arr = [];
                map.set(rem.listId, arr);
            }
            arr.push(rem);
        }
        return map;
    }

    /** Get the current sync token (for persistence by the adapter). */
    get syncToken(): string | undefined {
        return this._syncToken;
    }

    /** Set the sync token (restored from adapter state on startup). */
    set syncToken(token: string | undefined) {
        this._syncToken = token;
    }

    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        // CloudKit endpoint: ckdatabasews URL + /database/1/com.apple.reminders/production/private
        const ckUrl = service.accountInfo!.webservices.ckdatabasews.url;
        this.baseEndpoint = `${ckUrl}/database/1/${CONTAINER}/${ENV}/${SCOPE}`;
    }

    /**
     * POST a CloudKit request to the reminders endpoint.
     *
     * @param path - CloudKit API path (e.g. '/records/query', '/changes/zone')
     * @param body - request body
     * @param retry - whether to retry on auth failure
     */
    private async ckPost<T = unknown>(path: string, body: object, retry = true): Promise<T> {
        const params = new URLSearchParams({
            remapEnums: 'true',
            getCurrentSyncToken: 'true',
        });
        const url = `${this.baseEndpoint}${path}?${params.toString()}`;
        this.service._log(0 /* Debug */, `[reminders-ck] POST ${path}`);

        const response = await this.service.fetch(url, {
            method: 'POST',
            headers: {
                ...this.service.authStore.getHeaders(),
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();
        if (!text || !text.trim()) {
            if (response.status === 401 && retry) {
                await this.service.authenticateWebService('reminders');
                return this.ckPost<T>(path, body, false);
            }
            return {} as T;
        }

        const json = JSON.parse(text);
        if (json?.error) {
            if (response.status === 401 && retry) {
                await this.service.authenticateWebService('reminders');
                return this.ckPost<T>(path, body, false);
            }
            throw new Error(`CloudKit error: ${json.error?.errorCode ?? json.reason ?? JSON.stringify(json.error)}`);
        }
        return json as T;
    }

    /**
     * Refresh lists and reminders via a single CloudKit /changes/zone call.
     *
     * On first call (no syncToken): fetches a full snapshot of the entire
     * Reminders zone — both List and Reminder records arrive together.
     * On subsequent calls (with syncToken): fetches only the delta since last sync.
     *
     * The sync token is updated after each successful refresh and should be
     * persisted by the adapter so it survives restarts.
     */
    async refresh(): Promise<void> {
        let moreComing = true;
        const MAX_PAGES = 50;
        let page = 0;
        const isIncremental = !!this._syncToken;

        while (moreComing) {
            if (++page > MAX_PAGES) {
                this.service._log(1, `[reminders-ck] refresh: hit max page limit (${MAX_PAGES}), stopping`);
                break;
            }

            const resp = await this.ckPost<CKZoneChangesResponse>('/changes/zone', {
                zones: [
                    {
                        zoneID: REMINDERS_ZONE,
                        ...(this._syncToken ? { syncToken: this._syncToken } : {}),
                    },
                ],
            });

            const zones = resp.zones ?? [];
            if (zones.length === 0) {
                break;
            }

            moreComing = false;
            for (const zone of zones) {
                for (const rec of zone.records ?? []) {
                    this.ingestRecord(rec);
                }
                if (zone.syncToken) {
                    this._syncToken = zone.syncToken;
                }
                if (zone.moreComing) {
                    moreComing = true;
                }
            }
        }

        // After an incremental sync the in-memory maps may still be empty
        // because the delta contained no records (nothing changed since last token).
        // In that case fall back to a full resync so the maps are populated.
        if (isIncremental && this.listsById.size === 0) {
            this.service._log(0, `[reminders-ck] incremental sync returned empty maps — falling back to full resync`);
            this._syncToken = undefined;
            return this.refresh();
        }

        // Remove reminders whose list no longer exists
        for (const rem of this.remindersById.values()) {
            if (!this.listsById.has(rem.listId)) {
                this.remindersById.delete(rem.id);
            }
        }

        const totalReminders = this.remindersById.size;
        this.service._log(
            0,
            `[reminders-ck] refresh: ${isIncremental ? 'incremental' : 'full'}, ` +
                `${page} page(s), ${this.listsById.size} list(s), ${totalReminders} reminder(s)`,
        );
    }

    /**
     * Route a single CloudKit record into the in-memory maps.
     *
     * @param rec - CloudKit record to process
     */
    private ingestRecord(rec: CKRecord): void {
        if (rec.recordType === 'List') {
            if (rec.deleted) {
                this.listsById.delete(rec.recordName);
                return;
            }
            const fields = rec.fields ?? {};
            const name = getFieldValue<string>(fields, 'Name');
            const color = getFieldValue<string>(fields, 'Color');
            const count = getFieldValue<number>(fields, 'Count') ?? 0;
            this.listsById.set(rec.recordName, {
                id: rec.recordName,
                title: name ?? 'Untitled',
                color: color ?? null,
                count,
            });
        } else if (rec.recordType === 'Reminder') {
            if (rec.deleted) {
                this.remindersById.delete(rec.recordName);
                return;
            }
            const fields = rec.fields ?? {};

            const titleDoc = getFieldValue<string>(fields, 'TitleDocument');
            const notesDoc = getFieldValue<string>(fields, 'NotesDocument');
            const title = titleDoc ? decodeCrdtDocument(titleDoc) : '';
            const desc = notesDoc ? decodeCrdtDocument(notesDoc) : '';

            const dueDate = tsToMs(getFieldValue(fields, 'DueDate'));
            const startDate = tsToMs(getFieldValue(fields, 'StartDate'));
            const completedDate = tsToMs(getFieldValue(fields, 'CompletionDate'));
            const createdDate = tsToMs(getFieldValue(fields, 'CreationDate')) ?? tsToMs(rec.created?.timestamp);
            const modifiedDate = tsToMs(getFieldValue(fields, 'LastModifiedDate')) ?? tsToMs(rec.modified?.timestamp);
            const listId = getRefName(fields, 'List');

            this.remindersById.set(rec.recordName, {
                id: rec.recordName,
                listId,
                title: title || 'Untitled',
                description: desc,
                completed: !!getFieldValue<number>(fields, 'Completed'),
                completedDate,
                dueDate,
                startDate,
                priority: (getFieldValue<number>(fields, 'Priority') as number) ?? 0,
                flagged: !!getFieldValue<number>(fields, 'Flagged'),
                allDay: !!getFieldValue<number>(fields, 'AllDay'),
                deleted: !!getFieldValue<number>(fields, 'Deleted'),
                createdDate,
                lastModifiedDate: modifiedDate,
            });
        }
        // Other record types (Alarm, Hashtag, etc.) are ignored — we don't need them.
    }
}
