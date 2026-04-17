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
    recordChangeTag: string | null;
}

export interface RemindersSyncMap {
    syncToken: string;
    lists: Record<string, RemindersList>;
    reminders: Record<string, Reminder>;
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
/**
 * Encode a plain string into a CRDT document for CloudKit.
 *
 * Builds the full Apple versioned topotext CRDT structure:
 *   Document → Version → topotext.String (with Substrings, VectorTimestamp, AttributeRun)
 * then zlib-compresses and base64-encodes the result.
 *
 * Reference: timlaing/pyicloud `_encode_crdt_document`.
 *
 * @param text - plain text to encode
 */
function encodeCrdtDocument(text: string): string {
    const textLen = text.length; // UTF-16 code units (matches proto spec)
    const CLOCK_MAX = 0xff_ff_ff_ff;
    // Fixed replica UUID used by pyiCloud
    const REPLICA_UUID = Buffer.from('d46bcae41b8766c18d75efe35c9145c3', 'hex');

    /**
     * Build a CharID sub-message { replicaID, clock }.
     *
     * @param replicaID
     * @param clock
     */
    function charID(replicaID: number, clock: number): Buffer {
        return Buffer.concat([writeProtobufVarint(1, replicaID), writeProtobufVarint(2, clock)]);
    }

    // ── Substrings (field 3 of topotext.String, repeated) ─────────────────

    // Sentinel substring: charID(0,0), length=0, timestamp(0,0), child=[1]
    const sentinel = Buffer.concat([
        writeProtobufField(1, charID(0, 0)), // charID
        writeProtobufVarint(2, 0), // length = 0
        writeProtobufField(3, charID(0, 0)), // timestamp
        writeProtobufVarint(5, 1), // child[0] = 1
    ]);

    // Content substring (only if text is non-empty): charID(1,0), length=textLen, timestamp(1,0), child=[2]
    let content: Buffer | null = null;
    if (textLen > 0) {
        content = Buffer.concat([
            writeProtobufField(1, charID(1, 0)),
            writeProtobufVarint(2, textLen),
            writeProtobufField(3, charID(1, 0)),
            writeProtobufVarint(5, 2), // child[0] = 2
        ]);
    }

    // Terminal substring: charID(0, MAX), length=0, timestamp(0, MAX)
    const terminal = Buffer.concat([
        writeProtobufField(1, charID(0, CLOCK_MAX)),
        writeProtobufVarint(2, 0),
        writeProtobufField(3, charID(0, CLOCK_MAX)),
    ]);

    // ── VectorTimestamp (field 4 of topotext.String) ──────────────────────
    // Clock { replicaUUID, replicaClock: [{ clock: textLen }, { clock: 1 }] }
    const replicaClock1 = writeProtobufVarint(1, textLen); // ReplicaClock { clock: textLen }
    const replicaClock2 = writeProtobufVarint(1, 1); // ReplicaClock { clock: 1 }
    const clockMsg = Buffer.concat([
        writeProtobufField(1, REPLICA_UUID), // replicaUUID (bytes)
        writeProtobufField(2, replicaClock1), // replicaClock[0]
        writeProtobufField(2, replicaClock2), // replicaClock[1]
    ]);
    const vectorTimestamp = writeProtobufField(1, clockMsg); // VectorTimestamp { clock[0] }

    // ── Assemble topotext.String ─────────────────────────────────────────
    const textBuf = Buffer.from(text, 'utf-8');
    const stringParts: Buffer[] = [
        writeProtobufField(2, textBuf), // string (field 2)
        writeProtobufField(3, sentinel), // substring[0]
    ];
    if (content) {
        stringParts.push(writeProtobufField(3, content)); // substring[1]
    }
    stringParts.push(writeProtobufField(3, terminal)); // substring[last]
    stringParts.push(writeProtobufField(4, vectorTimestamp)); // timestamp (field 4)
    if (textLen > 0) {
        const attrRun = writeProtobufVarint(1, textLen); // AttributeRun { length: textLen }
        stringParts.push(writeProtobufField(5, attrRun)); // attributeRun[0] (field 5)
    }
    const stringMsg = Buffer.concat(stringParts);

    // ── Version ──────────────────────────────────────────────────────────
    const versionMsg = Buffer.concat([
        writeProtobufVarint(1, 0), // serializationVersion
        writeProtobufVarint(2, 0), // minimumSupportedVersion
        writeProtobufField(3, stringMsg), // data
    ]);

    // ── Document ─────────────────────────────────────────────────────────
    const documentMsg = Buffer.concat([
        writeProtobufVarint(1, 0), // serializationVersion
        writeProtobufField(2, versionMsg), // version[0]
    ]);

    const compressed = zlib.deflateSync(documentMsg);
    return compressed.toString('base64');
}

/**
 * Encode a varint protobuf field (wire type 0).
 *
 * @param fieldNumber
 * @param value
 */
function writeProtobufVarint(fieldNumber: number, value: number): Buffer {
    const tag = (fieldNumber << 3) | 0;
    const parts: number[] = [];
    // encode tag
    let t = tag;
    while (t > 0x7f) {
        parts.push((t & 0x7f) | 0x80);
        t >>>= 7;
    }
    parts.push(t & 0x7f);
    // encode value
    let v = value >>> 0;
    while (v > 0x7f) {
        parts.push((v & 0x7f) | 0x80);
        v >>>= 7;
    }
    parts.push(v & 0x7f);
    return Buffer.from(parts);
}

/**
 * Encode a length-delimited protobuf field (wire type 2).
 *
 * @param fieldNumber
 * @param data
 */
function writeProtobufField(fieldNumber: number, data: Buffer): Buffer {
    const tag = (fieldNumber << 3) | 2;
    const parts: number[] = [];
    let t = tag;
    while (t > 0x7f) {
        parts.push((t & 0x7f) | 0x80);
        t >>>= 7;
    }
    parts.push(t & 0x7f);
    // encode length
    let len = data.length;
    while (len > 0x7f) {
        parts.push((len & 0x7f) | 0x80);
        len >>>= 7;
    }
    parts.push(len & 0x7f);
    return Buffer.concat([Buffer.from(parts), data]);
}

/**
 * Generate a ResolutionTokenMap JSON string for CloudKit modify operations.
 *
 * Reference: timlaing/pyicloud `_generate_resolution_token_map`.
 *
 * @param fieldsModified - list of camelCase field names that are being modified
 */
function generateResolutionTokenMap(fieldsModified: string[]): string {
    const appleEpoch = Date.now() / 1000 - 978_307_200;
    const tokens: Record<string, object> = {};
    for (const field of fieldsModified) {
        tokens[field] = {
            counter: 1,
            modificationTime: appleEpoch,
            replicaID: generateUUID(),
        };
    }
    return JSON.stringify({ map: tokens });
}

/** Generate an uppercase UUID. */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        })
        .toUpperCase();
}

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

    /**
     * Restore in-memory state from a persisted syncMap.
     *
     * @param map
     */
    loadSyncMap(map: RemindersSyncMap): void {
        this._syncToken = map.syncToken || undefined;
        this.listsById.clear();
        for (const [id, list] of Object.entries(map.lists)) {
            this.listsById.set(id, list);
        }
        this.remindersById.clear();
        for (const [id, rem] of Object.entries(map.reminders)) {
            this.remindersById.set(id, rem);
        }
    }

    /** Export current state as a plain object for persistence. */
    exportSyncMap(): RemindersSyncMap {
        return {
            syncToken: this._syncToken ?? '',
            lists: Object.fromEntries(this.listsById),
            reminders: Object.fromEntries(this.remindersById),
        };
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
     * @returns true if any records were ingested (data changed), false otherwise.
     */
    async refresh(): Promise<boolean> {
        let moreComing = true;
        const MAX_PAGES = 50;
        let page = 0;
        const isIncremental = !!this._syncToken;
        let recordsIngested = 0;

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
                    recordsIngested++;
                }
                if (zone.syncToken) {
                    this._syncToken = zone.syncToken;
                }
                if (zone.moreComing) {
                    moreComing = true;
                }
            }
        }

        // Remove reminders whose list no longer exists
        if (recordsIngested > 0) {
            for (const rem of this.remindersById.values()) {
                if (!this.listsById.has(rem.listId)) {
                    this.remindersById.delete(rem.id);
                }
            }
        }

        this.service._log(
            0,
            `[reminders-ck] refresh: ${isIncremental ? 'incremental' : 'full'}, ` +
                `${page} page(s), ${recordsIngested} record(s) ingested, ` +
                `${this.listsById.size} list(s), ${this.remindersById.size} reminder(s) total`,
        );

        return recordsIngested > 0;
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
                recordChangeTag: rec.recordChangeTag ?? null,
            });
        }
        // Other record types (Alarm, Hashtag, etc.) are ignored — we don't need them.
    }

    // ── CRUD operations ───────────────────────────────────────────────────────

    /**
     * Create a new reminder in a list.
     *
     * Reference: timlaing/pyicloud RemindersWriteAPI.create
     *
     * @param options - reminder creation options
     * @param options.listId
     * @param options.title
     * @param options.description
     * @param options.completed
     * @param options.dueDate
     * @param options.priority
     * @param options.flagged
     * @param options.allDay
     * @returns the created Reminder (after re-fetching from CloudKit)
     */
    async createReminder(options: {
        listId: string;
        title: string;
        description?: string;
        completed?: boolean;
        dueDate?: number | null;
        priority?: number;
        flagged?: boolean;
        allDay?: boolean;
    }): Promise<Reminder> {
        const reminderUuid = generateUUID();
        const recordName = `Reminder/${reminderUuid}`;
        const nowMs = Date.now();
        const completed = options.completed ?? false;

        const titleDoc = encodeCrdtDocument(options.title);
        const notesDoc = encodeCrdtDocument(options.description ?? '');

        const fieldsModified = [
            'allDay',
            'titleDocument',
            'notesDocument',
            'priority',
            'creationDate',
            'list',
            'flagged',
            'completed',
            'completionDate',
            'lastModifiedDate',
        ];
        if (options.dueDate) {
            fieldsModified.push('dueDate');
        }

        const recordFields: Record<string, object> = {
            AllDay: { type: 'INT64', value: options.allDay ? 1 : 0 },
            Completed: { type: 'INT64', value: completed ? 1 : 0 },
            CompletionDate: { type: 'TIMESTAMP', value: completed ? nowMs : null },
            CreationDate: { type: 'TIMESTAMP', value: nowMs },
            Deleted: { type: 'INT64', value: 0 },
            Flagged: { type: 'INT64', value: options.flagged ? 1 : 0 },
            Imported: { type: 'INT64', value: 0 },
            LastModifiedDate: { type: 'TIMESTAMP', value: nowMs },
            List: {
                type: 'REFERENCE',
                value: { recordName: options.listId, action: 'VALIDATE' },
            },
            NotesDocument: { type: 'STRING', value: notesDoc },
            Priority: { type: 'INT64', value: options.priority ?? 0 },
            ResolutionTokenMap: { type: 'STRING', value: generateResolutionTokenMap(fieldsModified) },
            TitleDocument: { type: 'STRING', value: titleDoc },
        };

        if (options.dueDate) {
            recordFields.DueDate = { type: 'TIMESTAMP', value: options.dueDate };
        }

        interface CKModifyResponse {
            records?: CKRecord[];
        }

        const resp = await this.ckPost<CKModifyResponse>('/records/modify', {
            operations: [
                {
                    operationType: 'create',
                    record: {
                        recordName,
                        recordType: 'Reminder',
                        fields: recordFields,
                        createShortGUID: true,
                        desiredKeys: [],
                    },
                },
            ],
            zoneID: REMINDERS_ZONE,
            atomic: true,
        });

        // Ingest the created record if returned
        const created = resp.records?.[0];
        if (created) {
            this.ingestRecord(created);
        }

        const reminder = this.remindersById.get(recordName);
        if (!reminder) {
            // Fallback: build a minimal Reminder from input
            const fallback: Reminder = {
                id: recordName,
                listId: options.listId,
                title: options.title,
                description: options.description ?? '',
                completed,
                completedDate: completed ? nowMs : null,
                dueDate: options.dueDate ?? null,
                startDate: null,
                priority: options.priority ?? 0,
                flagged: options.flagged ?? false,
                allDay: options.allDay ?? false,
                deleted: false,
                createdDate: nowMs,
                lastModifiedDate: nowMs,
                recordChangeTag: created?.recordChangeTag ?? null,
            };
            this.remindersById.set(recordName, fallback);
            return fallback;
        }
        return reminder;
    }

    /**
     * Update an existing reminder.
     *
     * Reference: timlaing/pyicloud RemindersWriteAPI.update
     *
     * @param reminder - the reminder with updated fields
     */
    async updateReminder(reminder: Reminder): Promise<void> {
        if (!reminder.recordChangeTag) {
            throw new Error(`Cannot update reminder ${reminder.id} — no recordChangeTag (sync first)`);
        }

        const nowMs = Date.now();
        const titleDoc = encodeCrdtDocument(reminder.title);
        const notesDoc = encodeCrdtDocument(reminder.description ?? '');

        const fieldsModified = [
            'titleDocument',
            'notesDocument',
            'completed',
            'completionDate',
            'priority',
            'flagged',
            'allDay',
            'lastModifiedDate',
            'dueDate',
        ];

        const completionDateMs = reminder.completed ? (reminder.completedDate ?? nowMs) : null;

        const fields: Record<string, object> = {
            TitleDocument: { type: 'STRING', value: titleDoc },
            NotesDocument: { type: 'STRING', value: notesDoc },
            Completed: { type: 'INT64', value: reminder.completed ? 1 : 0 },
            CompletionDate: { type: 'TIMESTAMP', value: completionDateMs },
            Priority: { type: 'INT64', value: reminder.priority },
            Flagged: { type: 'INT64', value: reminder.flagged ? 1 : 0 },
            AllDay: { type: 'INT64', value: reminder.allDay ? 1 : 0 },
            LastModifiedDate: { type: 'TIMESTAMP', value: nowMs },
            DueDate: { type: 'TIMESTAMP', value: reminder.dueDate ?? null },
            ResolutionTokenMap: { type: 'STRING', value: generateResolutionTokenMap(fieldsModified) },
        };

        interface CKModifyResponse {
            records?: CKRecord[];
        }

        const resp = await this.ckPost<CKModifyResponse>('/records/modify', {
            operations: [
                {
                    operationType: 'update',
                    record: {
                        recordName: reminder.id,
                        recordType: 'Reminder',
                        recordChangeTag: reminder.recordChangeTag,
                        fields,
                    },
                },
            ],
            zoneID: REMINDERS_ZONE,
            atomic: true,
        });

        // Update local state
        reminder.lastModifiedDate = nowMs;
        if (reminder.completed && !reminder.completedDate) {
            reminder.completedDate = nowMs;
        }
        const updated = resp.records?.[0];
        if (updated?.recordChangeTag) {
            reminder.recordChangeTag = updated.recordChangeTag;
        }
        this.remindersById.set(reminder.id, reminder);
    }

    /**
     * Delete a reminder (soft-delete via Deleted=1).
     *
     * Reference: timlaing/pyicloud RemindersWriteAPI.delete
     *
     * @param reminderId - ID of the reminder to delete
     */
    async deleteReminder(reminderId: string): Promise<void> {
        const reminder = this.remindersById.get(reminderId);
        if (!reminder) {
            throw new Error(`Reminder not found: ${reminderId}`);
        }
        if (!reminder.recordChangeTag) {
            throw new Error(`Cannot delete reminder ${reminderId} — no recordChangeTag (sync first)`);
        }

        const nowMs = Date.now();
        const fieldsModified = ['deleted', 'lastModifiedDate'];

        await this.ckPost('/records/modify', {
            operations: [
                {
                    operationType: 'update',
                    record: {
                        recordName: reminder.id,
                        recordType: 'Reminder',
                        recordChangeTag: reminder.recordChangeTag,
                        fields: {
                            Deleted: { type: 'INT64', value: 1 },
                            LastModifiedDate: { type: 'TIMESTAMP', value: nowMs },
                            ResolutionTokenMap: {
                                type: 'STRING',
                                value: generateResolutionTokenMap(fieldsModified),
                            },
                        },
                    },
                },
            ],
            zoneID: REMINDERS_ZONE,
            atomic: true,
        });

        // Remove from local state
        this.remindersById.delete(reminderId);
    }

    /**
     * Mark a reminder as completed or uncompleted.
     *
     * @param reminderId - ID of the reminder
     * @param completed - true to mark completed, false to uncomplete
     */
    async completeReminder(reminderId: string, completed: boolean): Promise<void> {
        const reminder = this.remindersById.get(reminderId);
        if (!reminder) {
            throw new Error(`Reminder not found: ${reminderId}`);
        }
        reminder.completed = completed;
        reminder.completedDate = completed ? Date.now() : null;
        await this.updateReminder(reminder);
    }

    /**
     * Get a reminder by ID.
     *
     * @param reminderId
     */
    getReminder(reminderId: string): Reminder | undefined {
        return this.remindersById.get(reminderId);
    }

    /** Get all reminders as an array. */
    getAllReminders(): Reminder[] {
        return [...this.remindersById.values()];
    }
}
