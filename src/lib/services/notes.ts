import * as zlib from 'zlib';
import type iCloudService from '..';

// ── CloudKit record types ─────────────────────────────────────────────────────

interface CKZoneID {
    zoneName: string;
    zoneType: string;
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
    error?: { serverErrorCode?: string; reason?: string; errorCode?: number };
}

interface CKZoneChangesResponse {
    zones: CKZoneChangesZone[];
}

// ── Domain models ─────────────────────────────────────────────────────────────

export interface NoteFolder {
    id: string;
    title: string;
}

export interface NoteSummary {
    id: string;
    title: string;
    snippet: string;
    folderId: string | null;
    folderName: string | null;
    isDeleted: boolean;
    isLocked: boolean;
    modifiedDate: number | null;
    text: string | null;
}

export interface NotesSyncMap {
    syncToken: string;
    folders: Record<string, NoteFolder>;
    notes: Record<string, NoteSummary>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTES_ZONE: CKZoneID = { zoneName: 'Notes', zoneType: 'REGULAR_CUSTOM_ZONE' };
const CONTAINER = 'com.apple.notes';
const ENV = 'production';
const SCOPE = 'private';

// ── Protobuf helpers (minimal, hand-rolled — same approach as reminders) ──────

/**
 * Read a protobuf varint at the given offset.
 *
 * @param buf - buffer to read from
 * @param offset - byte offset to start reading
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
 * Collect all length-delimited (wire type 2) payloads for a given field number.
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
            offset += 8;
        } else if (wireType === 5) {
            offset += 4;
        } else {
            break;
        }
    }
    return results;
}

/**
 * Parse the Apple Notes protobuf (NoteStoreProto) to extract plain text.
 *
 * Structure: NoteStoreProto { field 2: Document { field 3: Note { field 2: note_text } } }
 *
 * @param buf - decompressed protobuf buffer
 */
function parseNoteStoreProto(buf: Buffer): string {
    // NoteStoreProto → field 2 = Document
    const documents = readLengthDelimitedFields(buf, 2);
    for (const docBuf of documents) {
        // Document → field 3 = Note
        const notes = readLengthDelimitedFields(docBuf, 3);
        for (const noteBuf of notes) {
            // Note → field 2 = note_text (string)
            const texts = readLengthDelimitedFields(noteBuf, 2);
            for (const t of texts) {
                const text = t.toString('utf-8');
                if (text.length > 0) {
                    return text;
                }
            }
        }
    }
    return '';
}

/**
 * Decode the TextDataEncrypted field from iCloud Notes.
 *
 * Pipeline: base64 → gzip/zlib decompress → protobuf (NoteStoreProto)
 *
 * @param value - base64-encoded string, Uint8Array, or raw bytes
 * @param debugLog - optional callback for diagnostic messages
 */
function decodeNoteBody(value: unknown, debugLog?: (msg: string) => void): string {
    if (value === null || value === undefined) {
        return '';
    }

    let data: Buffer;
    if (typeof value === 'string') {
        let b64 = value;
        const padding = 4 - (b64.length % 4);
        if (padding !== 4) {
            b64 += '='.repeat(padding);
        }
        try {
            data = Buffer.from(b64, 'base64');
        } catch (e) {
            debugLog?.(`base64 decode failed: ${(e as Error).message}`);
            return '';
        }
    } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        data = Buffer.from(value);
    } else {
        return '';
    }

    // Decompress
    try {
        data = zlib.gunzipSync(data);
    } catch {
        try {
            data = zlib.inflateSync(data);
        } catch {
            // May not be compressed — try raw
        }
    }

    try {
        return parseNoteStoreProto(data);
    } catch (e) {
        debugLog?.(`proto parse failed: ${(e as Error).message}`);
        return '';
    }
}

// ── CloudKit field helpers ────────────────────────────────────────────────────

function getFieldValue<T = unknown>(fields: Record<string, CKFieldValue | undefined>, key: string): T | null {
    const f = fields[key];
    if (!f || f.value === undefined || f.value === null) {
        return null;
    }
    return f.value as T;
}

function decodeEncryptedString(fields: Record<string, CKFieldValue | undefined>, key: string): string | null {
    const f = fields[key];
    if (!f) {
        return null;
    }
    const val = f.value;
    if (typeof val === 'string') {
        // Apple CloudKit returns *Encrypted fields as Base64-encoded UTF-8 strings.
        try {
            const decoded = Buffer.from(val, 'base64').toString('utf-8');
            if (decoded.length > 0) {
                return decoded;
            }
        } catch {
            // fall through
        }
        return val;
    }
    if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
        return Buffer.from(val).toString('utf-8');
    }
    return null;
}

function getRefName(fields: Record<string, CKFieldValue | undefined>, key: string): string {
    const f = fields[key];
    if (!f || f.type !== 'REFERENCE') {
        return '';
    }
    const ref = f.value as { recordName?: string } | null;
    return ref?.recordName ?? '';
}

// ── Service ───────────────────────────────────────────────────────────────────

export class iCloudNotesService {
    service: iCloudService;
    serviceUri: string;
    private baseEndpoint: string;

    /** Fetched folders keyed by CloudKit recordName. */
    private foldersById: Map<string, NoteFolder> = new Map();
    /** Fetched notes keyed by CloudKit recordName. */
    private notesById: Map<string, NoteSummary> = new Map();
    /** Last sync token for incremental updates. */
    private _syncToken: string | undefined;

    /** Public: current folders snapshot. */
    get folders(): NoteFolder[] {
        return [...this.foldersById.values()];
    }

    /** Public: current notes snapshot (non-deleted only). */
    get notes(): NoteSummary[] {
        return [...this.notesById.values()].filter(n => !n.isDeleted);
    }

    /** Public: all notes including deleted (for internal use). */
    get allNotes(): NoteSummary[] {
        return [...this.notesById.values()];
    }

    /**
     * Restore in-memory state from a persisted syncMap.
     *
     * @param map - Persisted sync map containing folders, notes and sync token.
     */
    loadSyncMap(map: NotesSyncMap): void {
        this._syncToken = map.syncToken || undefined;
        this.foldersById.clear();
        for (const [id, folder] of Object.entries(map.folders)) {
            this.foldersById.set(id, folder);
        }
        this.notesById.clear();
        for (const [id, note] of Object.entries(map.notes)) {
            this.notesById.set(id, note);
        }
    }

    /** Export current state as a plain object for persistence. */
    exportSyncMap(): NotesSyncMap {
        return {
            syncToken: this._syncToken ?? '',
            folders: Object.fromEntries(this.foldersById),
            notes: Object.fromEntries(this.notesById),
        };
    }

    /**
     * Clear all in-memory state and the syncToken so the next `refresh()` performs a full sync.
     */
    resetSyncMap(): void {
        this._syncToken = undefined;
        this.foldersById.clear();
        this.notesById.clear();
    }

    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        const ckUrl = service.accountInfo!.webservices.ckdatabasews.url;
        this.baseEndpoint = `${ckUrl}/database/1/${CONTAINER}/${ENV}/${SCOPE}`;
    }

    /**
     * POST a CloudKit request to the notes endpoint.
     *
     * @param path - CloudKit API path
     * @param body - request body
     * @param retry - whether to retry on auth failure
     */
    private async ckPost<T = unknown>(path: string, body: object, retry = true): Promise<T> {
        const params = new URLSearchParams({
            remapEnums: 'true',
            getCurrentSyncToken: 'true',
        });
        const url = `${this.baseEndpoint}${path}?${params.toString()}`;
        this.service._log(0 /* Debug */, `[notes-ck] POST ${path}`);

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
                await this.service.authenticateWebService('notes');
                return this.ckPost<T>(path, body, false);
            }
            return {} as T;
        }

        const json = JSON.parse(text);
        if (json?.error) {
            if (response.status === 401 && retry) {
                await this.service.authenticateWebService('notes');
                return this.ckPost<T>(path, body, false);
            }
            throw new Error(`CloudKit error: ${json.error?.errorCode ?? json.reason ?? JSON.stringify(json.error)}`);
        }
        return json as T;
    }

    /**
     * Refresh folders and notes via CloudKit /changes/zone.
     *
     * On first call (no syncToken): fetches a full snapshot.
     * On subsequent calls: fetches only the delta since last sync.
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
                this.service._log(1, `[notes-ck] refresh: hit max page limit (${MAX_PAGES}), stopping`);
                break;
            }

            const resp = await this.ckPost<CKZoneChangesResponse>('/changes/zone', {
                zones: [
                    {
                        zoneID: NOTES_ZONE,
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
                if (zone.error) {
                    const e = zone.error;
                    const code = e.serverErrorCode ?? '';
                    if (code === 'GONE_ZONE' && this._syncToken) {
                        this.service._log(1, '[notes-ck] GONE_ZONE — syncToken expired, resetting to full sync');
                        this._syncToken = undefined;
                        return this.refresh();
                    }
                    throw new Error(`CloudKit zone error: ${code || e.reason || JSON.stringify(e)}`);
                }
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

        // Remove notes whose folder no longer exists (except notes without folder)
        if (recordsIngested > 0) {
            for (const note of this.notesById.values()) {
                if (note.folderId && !this.foldersById.has(note.folderId)) {
                    // Folder was deleted — keep note but clear folder reference
                    this.notesById.set(note.id, { ...note, folderId: null, folderName: null });
                }
            }
        }

        this.service._log(
            0,
            `[notes-ck] refresh: ${isIncremental ? 'incremental' : 'full'}, ` +
                `${page} page(s), ${recordsIngested} record(s) ingested, ` +
                `${this.foldersById.size} folder(s), ${this.notesById.size} note(s) total`,
        );

        return recordsIngested > 0;
    }

    /**
     * Route a single CloudKit record into the in-memory maps.
     *
     * @param rec - CloudKit record to process
     */
    private ingestRecord(rec: CKRecord): void {
        const rt = rec.recordType;

        if (rt === 'Folder' || rt === 'SearchIndexes') {
            // SearchIndexes records can contain folder metadata — skip them for now,
            // we'll process only Folder records for our folder map.
            if (rt === 'SearchIndexes') {
                return;
            }
            if (rec.deleted) {
                this.foldersById.delete(rec.recordName);
                return;
            }
            const fields = rec.fields ?? {};
            const title = decodeEncryptedString(fields, 'TitleEncrypted') ?? 'Untitled';
            this.foldersById.set(rec.recordName, {
                id: rec.recordName,
                title,
            });
            return;
        }

        // Notes have recordType 'Note' or 'PasswordProtectedNote'
        if (rt !== 'Note' && rt !== 'PasswordProtectedNote') {
            return;
        }

        if (rec.deleted) {
            this.notesById.delete(rec.recordName);
            return;
        }

        const fields = rec.fields ?? {};
        const makeDebugLog =
            (field: string): ((msg: string) => void) =>
            (msg: string) =>
                this.service._log(0, `[notes-ck] ${rec.recordName} ${field}: ${msg}`);

        const title = decodeEncryptedString(fields, 'TitleEncrypted') ?? '';
        const snippet = decodeEncryptedString(fields, 'SnippetEncrypted') ?? '';
        const isDeleted = !!getFieldValue<number>(fields, 'Deleted');
        const isLocked = rt === 'PasswordProtectedNote';
        const modifiedDate = getFieldValue<number>(fields, 'ModificationDate');

        // Extract folder reference
        let folderId: string | null = getRefName(fields, 'Folder') || null;
        if (!folderId) {
            // Some records use "Folders" (REFERENCE_LIST)
            const foldersField = fields.Folders;
            if (foldersField?.type === 'REFERENCE_LIST' && Array.isArray(foldersField.value)) {
                const refs = foldersField.value as Array<{ recordName?: string }>;
                folderId = refs[0]?.recordName ?? null;
            }
        }
        const folderName = folderId ? (this.foldersById.get(folderId)?.title ?? null) : null;

        // Decode note body text from protobuf
        let text: string | null = null;
        if (!isLocked) {
            const rawBody = getFieldValue(fields, 'TextDataEncrypted');
            if (rawBody) {
                text = decodeNoteBody(rawBody, makeDebugLog('TextDataEncrypted')) || null;
            }
        }

        this.notesById.set(rec.recordName, {
            id: rec.recordName,
            title,
            snippet,
            folderId,
            folderName,
            isDeleted,
            isLocked,
            modifiedDate,
            text,
        });
    }
}
