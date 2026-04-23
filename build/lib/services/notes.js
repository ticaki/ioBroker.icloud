"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var notes_exports = {};
__export(notes_exports, {
  iCloudNotesService: () => iCloudNotesService
});
module.exports = __toCommonJS(notes_exports);
var zlib = __toESM(require("node:zlib"));
const NOTES_ZONE = { zoneName: "Notes", zoneType: "REGULAR_CUSTOM_ZONE" };
const CONTAINER = "com.apple.notes";
const ENV = "production";
const SCOPE = "private";
function readVarint(buf, offset) {
  if (offset >= buf.length) {
    return null;
  }
  let value = 0;
  let shift = 0;
  while (offset < buf.length) {
    const b = buf[offset++];
    value |= (b & 127) << shift;
    if ((b & 128) === 0) {
      return [value >>> 0, offset];
    }
    shift += 7;
    if (shift > 35) {
      return null;
    }
  }
  return null;
}
function readLengthDelimitedFields(buf, targetField) {
  const results = [];
  let offset = 0;
  while (offset < buf.length) {
    const tagResult = readVarint(buf, offset);
    if (!tagResult) {
      break;
    }
    const [tag, tagEnd] = tagResult;
    offset = tagEnd;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 7;
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
function parseNoteStoreProto(buf) {
  const documents = readLengthDelimitedFields(buf, 2);
  for (const docBuf of documents) {
    const notes = readLengthDelimitedFields(docBuf, 3);
    for (const noteBuf of notes) {
      const texts = readLengthDelimitedFields(noteBuf, 2);
      for (const t of texts) {
        const text = t.toString("utf-8");
        if (text.length > 0) {
          return text;
        }
      }
    }
  }
  return "";
}
function decodeNoteBody(value, debugLog) {
  if (value === null || value === void 0) {
    return "";
  }
  let data;
  if (typeof value === "string") {
    let b64 = value;
    const padding = 4 - b64.length % 4;
    if (padding !== 4) {
      b64 += "=".repeat(padding);
    }
    try {
      data = Buffer.from(b64, "base64");
    } catch (e) {
      debugLog == null ? void 0 : debugLog(`base64 decode failed: ${e.message}`);
      return "";
    }
  } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    data = Buffer.from(value);
  } else {
    return "";
  }
  try {
    data = zlib.gunzipSync(data);
  } catch {
    try {
      data = zlib.inflateSync(data);
    } catch {
    }
  }
  try {
    return parseNoteStoreProto(data);
  } catch (e) {
    debugLog == null ? void 0 : debugLog(`proto parse failed: ${e.message}`);
    return "";
  }
}
function getFieldValue(fields, key) {
  const f = fields[key];
  if (!f || f.value === void 0 || f.value === null) {
    return null;
  }
  return f.value;
}
function decodeEncryptedString(fields, key) {
  const f = fields[key];
  if (!f) {
    return null;
  }
  const val = f.value;
  if (typeof val === "string") {
    try {
      const decoded = Buffer.from(val, "base64").toString("utf-8");
      if (decoded.length > 0) {
        return decoded;
      }
    } catch {
    }
    return val;
  }
  if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
    return Buffer.from(val).toString("utf-8");
  }
  return null;
}
function getRefName(fields, key) {
  var _a;
  const f = fields[key];
  if (!f || f.type !== "REFERENCE") {
    return "";
  }
  const ref = f.value;
  return (_a = ref == null ? void 0 : ref.recordName) != null ? _a : "";
}
class iCloudNotesService {
  service;
  serviceUri;
  baseEndpoint;
  /** Fetched folders keyed by CloudKit recordName. */
  foldersById = /* @__PURE__ */ new Map();
  /** Fetched notes keyed by CloudKit recordName. */
  notesById = /* @__PURE__ */ new Map();
  /** Last sync token for incremental updates. */
  _syncToken;
  /** Public: current folders snapshot. */
  get folders() {
    return [...this.foldersById.values()];
  }
  /** Public: current notes snapshot (non-deleted only). */
  get notes() {
    return [...this.notesById.values()].filter((n) => !n.isDeleted);
  }
  /** Public: all notes including deleted (for internal use). */
  get allNotes() {
    return [...this.notesById.values()];
  }
  /**
   * Restore in-memory state from a persisted syncMap.
   *
   * @param map - Persisted sync map containing folders, notes and sync token.
   */
  loadSyncMap(map) {
    this._syncToken = map.syncToken || void 0;
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
  exportSyncMap() {
    var _a;
    return {
      syncToken: (_a = this._syncToken) != null ? _a : "",
      folders: Object.fromEntries(this.foldersById),
      notes: Object.fromEntries(this.notesById)
    };
  }
  /**
   * Clear all in-memory state and the syncToken so the next `refresh()` performs a full sync.
   */
  resetSyncMap() {
    this._syncToken = void 0;
    this.foldersById.clear();
    this.notesById.clear();
  }
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    const ckUrl = service.accountInfo.webservices.ckdatabasews.url;
    this.baseEndpoint = `${ckUrl}/database/1/${CONTAINER}/${ENV}/${SCOPE}`;
  }
  /**
   * POST a CloudKit request to the notes endpoint.
   *
   * @param path - CloudKit API path
   * @param body - request body
   * @param retry - whether to retry on auth failure
   */
  async ckPost(path, body, retry = true) {
    var _a, _b, _c;
    const params = new URLSearchParams({
      remapEnums: "true",
      getCurrentSyncToken: "true"
    });
    const url = `${this.baseEndpoint}${path}?${params.toString()}`;
    this.service._log(0, `[notes-ck] POST ${path}`);
    const response = await this.service.fetch(url, {
      method: "POST",
      headers: {
        ...this.service.authStore.getHeaders(),
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!text || !text.trim()) {
      if (response.status === 401 && retry) {
        await this.service.authenticateWebService("notes");
        return this.ckPost(path, body, false);
      }
      return {};
    }
    const json = JSON.parse(text);
    if (json == null ? void 0 : json.error) {
      if (response.status === 401 && retry) {
        await this.service.authenticateWebService("notes");
        return this.ckPost(path, body, false);
      }
      throw new Error(`CloudKit error: ${(_c = (_b = (_a = json.error) == null ? void 0 : _a.errorCode) != null ? _b : json.reason) != null ? _c : JSON.stringify(json.error)}`);
    }
    return json;
  }
  /**
   * Refresh folders and notes via CloudKit /changes/zone.
   *
   * On first call (no syncToken): fetches a full snapshot.
   * On subsequent calls: fetches only the delta since last sync.
   *
   * @returns true if any records were ingested (data changed), false otherwise.
   */
  async refresh() {
    var _a, _b, _c;
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
      const resp = await this.ckPost("/changes/zone", {
        zones: [
          {
            zoneID: NOTES_ZONE,
            ...this._syncToken ? { syncToken: this._syncToken } : {}
          }
        ]
      });
      const zones = (_a = resp.zones) != null ? _a : [];
      if (zones.length === 0) {
        break;
      }
      moreComing = false;
      for (const zone of zones) {
        if (zone.error) {
          const e = zone.error;
          const code = (_b = e.serverErrorCode) != null ? _b : "";
          if (code === "GONE_ZONE" && this._syncToken) {
            this.service._log(1, "[notes-ck] GONE_ZONE \u2014 syncToken expired, resetting to full sync");
            this._syncToken = void 0;
            return this.refresh();
          }
          throw new Error(`CloudKit zone error: ${code || e.reason || JSON.stringify(e)}`);
        }
        for (const rec of (_c = zone.records) != null ? _c : []) {
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
    if (recordsIngested > 0) {
      for (const note of this.notesById.values()) {
        if (note.folderId && !this.foldersById.has(note.folderId)) {
          this.notesById.set(note.id, { ...note, folderId: null, folderName: null });
        }
      }
    }
    this.service._log(
      0,
      `[notes-ck] refresh: ${isIncremental ? "incremental" : "full"}, ${page} page(s), ${recordsIngested} record(s) ingested, ${this.foldersById.size} folder(s), ${this.notesById.size} note(s) total`
    );
    return recordsIngested > 0;
  }
  /**
   * Route a single CloudKit record into the in-memory maps.
   *
   * @param rec - CloudKit record to process
   */
  ingestRecord(rec) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const rt = rec.recordType;
    if (rt === "Folder" || rt === "SearchIndexes") {
      if (rt === "SearchIndexes") {
        return;
      }
      if (rec.deleted) {
        this.foldersById.delete(rec.recordName);
        return;
      }
      const fields2 = (_a = rec.fields) != null ? _a : {};
      const title2 = (_b = decodeEncryptedString(fields2, "TitleEncrypted")) != null ? _b : "Untitled";
      this.foldersById.set(rec.recordName, {
        id: rec.recordName,
        title: title2
      });
      return;
    }
    if (rt !== "Note" && rt !== "PasswordProtectedNote") {
      return;
    }
    if (rec.deleted) {
      this.notesById.delete(rec.recordName);
      return;
    }
    const fields = (_c = rec.fields) != null ? _c : {};
    const makeDebugLog = (field) => (msg) => this.service._log(0, `[notes-ck] ${rec.recordName} ${field}: ${msg}`);
    const title = (_d = decodeEncryptedString(fields, "TitleEncrypted")) != null ? _d : "";
    const snippet = (_e = decodeEncryptedString(fields, "SnippetEncrypted")) != null ? _e : "";
    const isDeleted = !!getFieldValue(fields, "Deleted");
    const isLocked = rt === "PasswordProtectedNote";
    const modifiedDate = getFieldValue(fields, "ModificationDate");
    let folderId = getRefName(fields, "Folder") || null;
    if (!folderId) {
      const foldersField = fields.Folders;
      if ((foldersField == null ? void 0 : foldersField.type) === "REFERENCE_LIST" && Array.isArray(foldersField.value)) {
        const refs = foldersField.value;
        folderId = (_g = (_f = refs[0]) == null ? void 0 : _f.recordName) != null ? _g : null;
      }
    }
    const folderName = folderId ? (_i = (_h = this.foldersById.get(folderId)) == null ? void 0 : _h.title) != null ? _i : null : null;
    let text = null;
    if (!isLocked) {
      const rawBody = getFieldValue(fields, "TextDataEncrypted");
      if (rawBody) {
        text = decodeNoteBody(rawBody, makeDebugLog("TextDataEncrypted")) || null;
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
      text
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudNotesService
});
//# sourceMappingURL=notes.js.map
