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
var reminders_exports = {};
__export(reminders_exports, {
  iCloudRemindersService: () => iCloudRemindersService
});
module.exports = __toCommonJS(reminders_exports);
var zlib = __toESM(require("zlib"));
const REMINDERS_ZONE = { zoneName: "Reminders", zoneType: "REGULAR_CUSTOM_ZONE" };
const CONTAINER = "com.apple.reminders";
const ENV = "production";
const SCOPE = "private";
function getFieldValue(fields, key) {
  const f = fields[key];
  if (!f || f.value === void 0 || f.value === null) {
    return null;
  }
  return f.value;
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
function tsToMs(timestamp) {
  if (typeof timestamp === "number") {
    return timestamp;
  }
  return null;
}
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
function parseDocumentProto(buf) {
  const versions = readLengthDelimitedFields(buf, 2);
  for (const versionBuf of versions) {
    const dataFields2 = readLengthDelimitedFields(versionBuf, 3);
    for (const stringBuf of dataFields2) {
      const strings2 = readLengthDelimitedFields(stringBuf, 2);
      for (const s of strings2) {
        const text = s.toString("utf-8");
        if (text.length > 0) {
          return text;
        }
      }
    }
  }
  const dataFields = readLengthDelimitedFields(buf, 3);
  for (const stringBuf of dataFields) {
    const strings2 = readLengthDelimitedFields(stringBuf, 2);
    for (const s of strings2) {
      const text = s.toString("utf-8");
      if (text.length > 0) {
        return text;
      }
    }
  }
  const strings = readLengthDelimitedFields(buf, 2);
  for (const s of strings) {
    const text = s.toString("utf-8");
    if (text.length > 0) {
      return text;
    }
  }
  return "";
}
function decodeCrdtDocument(value) {
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
    } catch {
      return "";
    }
  } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    data = Buffer.from(value);
  } else {
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return `${value}`;
  }
  try {
    data = zlib.inflateSync(data);
  } catch {
    try {
      data = zlib.gunzipSync(data);
    } catch {
    }
  }
  try {
    return parseDocumentProto(data);
  } catch {
    return "";
  }
}
class iCloudRemindersService {
  service;
  serviceUri;
  baseEndpoint;
  /** Fetched reminder lists (keyed by CloudKit recordName). */
  listsById = /* @__PURE__ */ new Map();
  /** Fetched reminders keyed by reminder recordName. */
  remindersById = /* @__PURE__ */ new Map();
  /** Last sync token — persisted across refreshes for incremental updates. */
  _syncToken;
  /** Public: current lists snapshot. */
  get lists() {
    return [...this.listsById.values()];
  }
  /** Public: reminders grouped by list ID. */
  get remindersByList() {
    const map = /* @__PURE__ */ new Map();
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
  get syncToken() {
    return this._syncToken;
  }
  /** Set the sync token (restored from adapter state on startup). */
  set syncToken(token) {
    this._syncToken = token;
  }
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    const ckUrl = service.accountInfo.webservices.ckdatabasews.url;
    this.baseEndpoint = `${ckUrl}/database/1/${CONTAINER}/${ENV}/${SCOPE}`;
  }
  /**
   * POST a CloudKit request to the reminders endpoint.
   *
   * @param path - CloudKit API path (e.g. '/records/query', '/changes/zone')
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
    this.service._log(0, `[reminders-ck] POST ${path}`);
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
        await this.service.authenticateWebService("reminders");
        return this.ckPost(path, body, false);
      }
      return {};
    }
    const json = JSON.parse(text);
    if (json == null ? void 0 : json.error) {
      if (response.status === 401 && retry) {
        await this.service.authenticateWebService("reminders");
        return this.ckPost(path, body, false);
      }
      throw new Error(`CloudKit error: ${(_c = (_b = (_a = json.error) == null ? void 0 : _a.errorCode) != null ? _b : json.reason) != null ? _c : JSON.stringify(json.error)}`);
    }
    return json;
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
  async refresh() {
    var _a, _b;
    let moreComing = true;
    const MAX_PAGES = 50;
    let page = 0;
    const isIncremental = !!this._syncToken;
    while (moreComing) {
      if (++page > MAX_PAGES) {
        this.service._log(1, `[reminders-ck] refresh: hit max page limit (${MAX_PAGES}), stopping`);
        break;
      }
      const resp = await this.ckPost("/changes/zone", {
        zones: [
          {
            zoneID: REMINDERS_ZONE,
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
        for (const rec of (_b = zone.records) != null ? _b : []) {
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
    if (isIncremental && this.listsById.size === 0) {
      this.service._log(0, `[reminders-ck] incremental sync returned empty maps \u2014 falling back to full resync`);
      this._syncToken = void 0;
      return this.refresh();
    }
    for (const rem of this.remindersById.values()) {
      if (!this.listsById.has(rem.listId)) {
        this.remindersById.delete(rem.id);
      }
    }
    const totalReminders = this.remindersById.size;
    this.service._log(
      0,
      `[reminders-ck] refresh: ${isIncremental ? "incremental" : "full"}, ${page} page(s), ${this.listsById.size} list(s), ${totalReminders} reminder(s)`
    );
  }
  /**
   * Route a single CloudKit record into the in-memory maps.
   *
   * @param rec - CloudKit record to process
   */
  ingestRecord(rec) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (rec.recordType === "List") {
      if (rec.deleted) {
        this.listsById.delete(rec.recordName);
        return;
      }
      const fields = (_a = rec.fields) != null ? _a : {};
      const name = getFieldValue(fields, "Name");
      const color = getFieldValue(fields, "Color");
      const count = (_b = getFieldValue(fields, "Count")) != null ? _b : 0;
      this.listsById.set(rec.recordName, {
        id: rec.recordName,
        title: name != null ? name : "Untitled",
        color: color != null ? color : null,
        count
      });
    } else if (rec.recordType === "Reminder") {
      if (rec.deleted) {
        this.remindersById.delete(rec.recordName);
        return;
      }
      const fields = (_c = rec.fields) != null ? _c : {};
      const titleDoc = getFieldValue(fields, "TitleDocument");
      const notesDoc = getFieldValue(fields, "NotesDocument");
      const title = titleDoc ? decodeCrdtDocument(titleDoc) : "";
      const desc = notesDoc ? decodeCrdtDocument(notesDoc) : "";
      const dueDate = tsToMs(getFieldValue(fields, "DueDate"));
      const startDate = tsToMs(getFieldValue(fields, "StartDate"));
      const completedDate = tsToMs(getFieldValue(fields, "CompletionDate"));
      const createdDate = (_e = tsToMs(getFieldValue(fields, "CreationDate"))) != null ? _e : tsToMs((_d = rec.created) == null ? void 0 : _d.timestamp);
      const modifiedDate = (_g = tsToMs(getFieldValue(fields, "LastModifiedDate"))) != null ? _g : tsToMs((_f = rec.modified) == null ? void 0 : _f.timestamp);
      const listId = getRefName(fields, "List");
      this.remindersById.set(rec.recordName, {
        id: rec.recordName,
        listId,
        title: title || "Untitled",
        description: desc,
        completed: !!getFieldValue(fields, "Completed"),
        completedDate,
        dueDate,
        startDate,
        priority: (_h = getFieldValue(fields, "Priority")) != null ? _h : 0,
        flagged: !!getFieldValue(fields, "Flagged"),
        allDay: !!getFieldValue(fields, "AllDay"),
        deleted: !!getFieldValue(fields, "Deleted"),
        createdDate,
        lastModifiedDate: modifiedDate
      });
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudRemindersService
});
//# sourceMappingURL=reminders.js.map
