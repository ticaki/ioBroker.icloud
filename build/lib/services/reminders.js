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
function encodeCrdtDocument(text) {
  const textLen = text.length;
  const CLOCK_MAX = 4294967295;
  const REPLICA_UUID = Buffer.from("d46bcae41b8766c18d75efe35c9145c3", "hex");
  function charID(replicaID, clock) {
    return Buffer.concat([writeProtobufVarint(1, replicaID), writeProtobufVarint(2, clock)]);
  }
  const sentinel = Buffer.concat([
    writeProtobufField(1, charID(0, 0)),
    // charID
    writeProtobufVarint(2, 0),
    // length = 0
    writeProtobufField(3, charID(0, 0)),
    // timestamp
    writeProtobufVarint(5, 1)
    // child[0] = 1
  ]);
  let content = null;
  if (textLen > 0) {
    content = Buffer.concat([
      writeProtobufField(1, charID(1, 0)),
      writeProtobufVarint(2, textLen),
      writeProtobufField(3, charID(1, 0)),
      writeProtobufVarint(5, 2)
      // child[0] = 2
    ]);
  }
  const terminal = Buffer.concat([
    writeProtobufField(1, charID(0, CLOCK_MAX)),
    writeProtobufVarint(2, 0),
    writeProtobufField(3, charID(0, CLOCK_MAX))
  ]);
  const replicaClock1 = writeProtobufVarint(1, textLen);
  const replicaClock2 = writeProtobufVarint(1, 1);
  const clockMsg = Buffer.concat([
    writeProtobufField(1, REPLICA_UUID),
    // replicaUUID (bytes)
    writeProtobufField(2, replicaClock1),
    // replicaClock[0]
    writeProtobufField(2, replicaClock2)
    // replicaClock[1]
  ]);
  const vectorTimestamp = writeProtobufField(1, clockMsg);
  const textBuf = Buffer.from(text, "utf-8");
  const stringParts = [
    writeProtobufField(2, textBuf),
    // string (field 2)
    writeProtobufField(3, sentinel)
    // substring[0]
  ];
  if (content) {
    stringParts.push(writeProtobufField(3, content));
  }
  stringParts.push(writeProtobufField(3, terminal));
  stringParts.push(writeProtobufField(4, vectorTimestamp));
  if (textLen > 0) {
    const attrRun = writeProtobufVarint(1, textLen);
    stringParts.push(writeProtobufField(5, attrRun));
  }
  const stringMsg = Buffer.concat(stringParts);
  const versionMsg = Buffer.concat([
    writeProtobufVarint(1, 0),
    // serializationVersion
    writeProtobufVarint(2, 0),
    // minimumSupportedVersion
    writeProtobufField(3, stringMsg)
    // data
  ]);
  const documentMsg = Buffer.concat([
    writeProtobufVarint(1, 0),
    // serializationVersion
    writeProtobufField(2, versionMsg)
    // version[0]
  ]);
  const compressed = zlib.deflateSync(documentMsg);
  return compressed.toString("base64");
}
function writeProtobufVarint(fieldNumber, value) {
  const tag = fieldNumber << 3 | 0;
  const parts = [];
  let t = tag;
  while (t > 127) {
    parts.push(t & 127 | 128);
    t >>>= 7;
  }
  parts.push(t & 127);
  let v = value >>> 0;
  while (v > 127) {
    parts.push(v & 127 | 128);
    v >>>= 7;
  }
  parts.push(v & 127);
  return Buffer.from(parts);
}
function writeProtobufField(fieldNumber, data) {
  const tag = fieldNumber << 3 | 2;
  const parts = [];
  let t = tag;
  while (t > 127) {
    parts.push(t & 127 | 128);
    t >>>= 7;
  }
  parts.push(t & 127);
  let len = data.length;
  while (len > 127) {
    parts.push(len & 127 | 128);
    len >>>= 7;
  }
  parts.push(len & 127);
  return Buffer.concat([Buffer.from(parts), data]);
}
function generateResolutionTokenMap(fieldsModified) {
  const appleEpoch = Date.now() / 1e3 - 978307200;
  const tokens = {};
  for (const field of fieldsModified) {
    tokens[field] = {
      counter: 1,
      modificationTime: appleEpoch,
      replicaID: generateUUID()
    };
  }
  return JSON.stringify({ map: tokens });
}
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  }).toUpperCase();
}
function decodeCrdtDocument(value, debugLog) {
  var _a, _b;
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
      debugLog == null ? void 0 : debugLog(`base64 decode failed: ${e.message} \u2014 raw(32): ${String(value).slice(0, 32)}`);
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
  let decompressed = false;
  try {
    data = zlib.inflateSync(data);
    decompressed = true;
  } catch {
    try {
      data = zlib.gunzipSync(data);
      decompressed = true;
    } catch {
    }
  }
  if (!decompressed) {
    debugLog == null ? void 0 : debugLog(
      `decompression skipped (not zlib/gzip) \u2014 treating as raw proto, byte(0): 0x${(_b = (_a = data[0]) == null ? void 0 : _a.toString(16)) != null ? _b : "??"}`
    );
  }
  try {
    const text = parseDocumentProto(data);
    if (!text) {
      debugLog == null ? void 0 : debugLog(`proto parse returned empty string \u2014 bytes(hex, 16): ${data.subarray(0, 16).toString("hex")}`);
    }
    return text;
  } catch (e) {
    debugLog == null ? void 0 : debugLog(
      `proto parse threw: ${e.message} \u2014 bytes(hex, 16): ${data.subarray(0, 16).toString("hex")}`
    );
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
  /**
   * Restore in-memory state from a persisted syncMap.
   *
   * @param map - Persisted sync map containing lists, reminders and sync token.
   */
  loadSyncMap(map) {
    this._syncToken = map.syncToken || void 0;
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
  exportSyncMap() {
    var _a;
    return {
      syncToken: (_a = this._syncToken) != null ? _a : "",
      lists: Object.fromEntries(this.listsById),
      reminders: Object.fromEntries(this.remindersById)
    };
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
        if (zone.error) {
          const e = zone.error;
          const code = (_b = e.serverErrorCode) != null ? _b : "";
          if (code === "GONE_ZONE" && this._syncToken) {
            this.service._log(1, "[reminders-ck] GONE_ZONE \u2014 syncToken expired, resetting to full sync");
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
      for (const rem of this.remindersById.values()) {
        if (!this.listsById.has(rem.listId)) {
          this.remindersById.delete(rem.id);
        }
      }
    }
    this.service._log(
      0,
      `[reminders-ck] refresh: ${isIncremental ? "incremental" : "full"}, ${page} page(s), ${recordsIngested} record(s) ingested, ${this.listsById.size} list(s), ${this.remindersById.size} reminder(s) total`
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
    if (rec.recordType === "List") {
      if (rec.deleted) {
        this.listsById.delete(rec.recordName);
        return;
      }
      const fields = (_a = rec.fields) != null ? _a : {};
      const name = getFieldValue(fields, "Name");
      const color = getFieldValue(fields, "Color");
      const count = (_b = getFieldValue(fields, "Count")) != null ? _b : 0;
      if (!name) {
        this.service._log(
          0,
          `[reminders-ck] List ${rec.recordName}: Name field missing \u2014 available fields: ${Object.keys(fields).join(", ")}`
        );
      }
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
      const makeDebugLog = (field) => (msg) => this.service._log(0, `[reminders-ck] ${rec.recordName} ${field}: ${msg}`);
      const titleDoc = getFieldValue(fields, "TitleDocument");
      const notesDoc = getFieldValue(fields, "NotesDocument");
      if (!titleDoc) {
        this.service._log(
          0,
          `[reminders-ck] Reminder ${rec.recordName}: TitleDocument missing \u2014 available fields: ${Object.keys(fields).join(", ")}`
        );
      }
      const title = titleDoc ? decodeCrdtDocument(titleDoc, makeDebugLog("TitleDocument")) : "";
      const desc = notesDoc ? decodeCrdtDocument(notesDoc, makeDebugLog("NotesDocument")) : "";
      if (!title && titleDoc) {
        this.service._log(
          0,
          `[reminders-ck] Reminder ${rec.recordName}: TitleDocument decoded to empty \u2014 falling back to "Untitled"`
        );
      }
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
        lastModifiedDate: modifiedDate,
        recordChangeTag: (_i = rec.recordChangeTag) != null ? _i : null
      });
    }
  }
  // ── CRUD operations ───────────────────────────────────────────────────────
  /**
   * Create a new reminder in a list.
   *
   * Reference: timlaing/pyicloud RemindersWriteAPI.create
   *
   * @param options - reminder creation options
   * @param options.listId - The ID of the reminder list to add the reminder to.
   * @param options.title - The title of the reminder.
   * @param options.description - Optional notes/description text.
   * @param options.completed - Whether the reminder is already completed.
   * @param options.dueDate - Due date as Unix timestamp (ms), or null/undefined for no due date.
   * @param options.priority - Priority level: 0=none, 1=high, 5=medium, 9=low.
   * @param options.flagged - Whether the reminder is flagged.
   * @param options.allDay - Whether the due date is an all-day event.
   * @returns the created Reminder (after re-fetching from CloudKit)
   */
  async createReminder(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const reminderUuid = generateUUID();
    const recordName = `Reminder/${reminderUuid}`;
    const nowMs = Date.now();
    const completed = (_a = options.completed) != null ? _a : false;
    const titleDoc = encodeCrdtDocument(options.title);
    const notesDoc = encodeCrdtDocument((_b = options.description) != null ? _b : "");
    const fieldsModified = [
      "allDay",
      "titleDocument",
      "notesDocument",
      "priority",
      "creationDate",
      "list",
      "flagged",
      "completed",
      "completionDate",
      "lastModifiedDate"
    ];
    if (options.dueDate) {
      fieldsModified.push("dueDate");
    }
    const recordFields = {
      AllDay: { type: "INT64", value: options.allDay ? 1 : 0 },
      Completed: { type: "INT64", value: completed ? 1 : 0 },
      CompletionDate: { type: "TIMESTAMP", value: completed ? nowMs : null },
      CreationDate: { type: "TIMESTAMP", value: nowMs },
      Deleted: { type: "INT64", value: 0 },
      Flagged: { type: "INT64", value: options.flagged ? 1 : 0 },
      Imported: { type: "INT64", value: 0 },
      LastModifiedDate: { type: "TIMESTAMP", value: nowMs },
      List: {
        type: "REFERENCE",
        value: { recordName: options.listId, action: "VALIDATE" }
      },
      NotesDocument: { type: "STRING", value: notesDoc },
      Priority: { type: "INT64", value: (_c = options.priority) != null ? _c : 0 },
      ResolutionTokenMap: { type: "STRING", value: generateResolutionTokenMap(fieldsModified) },
      TitleDocument: { type: "STRING", value: titleDoc }
    };
    if (options.dueDate) {
      recordFields.DueDate = { type: "TIMESTAMP", value: options.dueDate };
    }
    const resp = await this.ckPost("/records/modify", {
      operations: [
        {
          operationType: "create",
          record: {
            recordName,
            recordType: "Reminder",
            fields: recordFields,
            createShortGUID: true,
            desiredKeys: []
          }
        }
      ],
      zoneID: REMINDERS_ZONE,
      atomic: true
    });
    const created = (_d = resp.records) == null ? void 0 : _d[0];
    if (created) {
      this.ingestRecord(created);
    }
    const reminder = this.remindersById.get(recordName);
    if (!reminder) {
      const fallback = {
        id: recordName,
        listId: options.listId,
        title: options.title,
        description: (_e = options.description) != null ? _e : "",
        completed,
        completedDate: completed ? nowMs : null,
        dueDate: (_f = options.dueDate) != null ? _f : null,
        startDate: null,
        priority: (_g = options.priority) != null ? _g : 0,
        flagged: (_h = options.flagged) != null ? _h : false,
        allDay: (_i = options.allDay) != null ? _i : false,
        deleted: false,
        createdDate: nowMs,
        lastModifiedDate: nowMs,
        recordChangeTag: (_j = created == null ? void 0 : created.recordChangeTag) != null ? _j : null
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
  async updateReminder(reminder) {
    var _a, _b, _c, _d;
    if (!reminder.recordChangeTag) {
      throw new Error(`Cannot update reminder ${reminder.id} \u2014 no recordChangeTag (sync first)`);
    }
    const nowMs = Date.now();
    const titleDoc = encodeCrdtDocument(reminder.title);
    const notesDoc = encodeCrdtDocument((_a = reminder.description) != null ? _a : "");
    const fieldsModified = [
      "titleDocument",
      "notesDocument",
      "completed",
      "completionDate",
      "priority",
      "flagged",
      "allDay",
      "lastModifiedDate",
      "dueDate"
    ];
    const completionDateMs = reminder.completed ? (_b = reminder.completedDate) != null ? _b : nowMs : null;
    const fields = {
      TitleDocument: { type: "STRING", value: titleDoc },
      NotesDocument: { type: "STRING", value: notesDoc },
      Completed: { type: "INT64", value: reminder.completed ? 1 : 0 },
      CompletionDate: { type: "TIMESTAMP", value: completionDateMs },
      Priority: { type: "INT64", value: reminder.priority },
      Flagged: { type: "INT64", value: reminder.flagged ? 1 : 0 },
      AllDay: { type: "INT64", value: reminder.allDay ? 1 : 0 },
      LastModifiedDate: { type: "TIMESTAMP", value: nowMs },
      DueDate: { type: "TIMESTAMP", value: (_c = reminder.dueDate) != null ? _c : null },
      ResolutionTokenMap: { type: "STRING", value: generateResolutionTokenMap(fieldsModified) }
    };
    const resp = await this.ckPost("/records/modify", {
      operations: [
        {
          operationType: "update",
          record: {
            recordName: reminder.id,
            recordType: "Reminder",
            recordChangeTag: reminder.recordChangeTag,
            fields
          }
        }
      ],
      zoneID: REMINDERS_ZONE,
      atomic: true
    });
    reminder.lastModifiedDate = nowMs;
    if (reminder.completed && !reminder.completedDate) {
      reminder.completedDate = nowMs;
    }
    const updated = (_d = resp.records) == null ? void 0 : _d[0];
    if (updated == null ? void 0 : updated.recordChangeTag) {
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
  async deleteReminder(reminderId) {
    const reminder = this.remindersById.get(reminderId);
    if (!reminder) {
      throw new Error(`Reminder not found: ${reminderId}`);
    }
    if (!reminder.recordChangeTag) {
      throw new Error(`Cannot delete reminder ${reminderId} \u2014 no recordChangeTag (sync first)`);
    }
    const nowMs = Date.now();
    const fieldsModified = ["deleted", "lastModifiedDate"];
    await this.ckPost("/records/modify", {
      operations: [
        {
          operationType: "update",
          record: {
            recordName: reminder.id,
            recordType: "Reminder",
            recordChangeTag: reminder.recordChangeTag,
            fields: {
              Deleted: { type: "INT64", value: 1 },
              LastModifiedDate: { type: "TIMESTAMP", value: nowMs },
              ResolutionTokenMap: {
                type: "STRING",
                value: generateResolutionTokenMap(fieldsModified)
              }
            }
          }
        }
      ],
      zoneID: REMINDERS_ZONE,
      atomic: true
    });
    this.remindersById.delete(reminderId);
  }
  /**
   * Mark a reminder as completed or uncompleted.
   *
   * @param reminderId - ID of the reminder
   * @param completed - true to mark completed, false to uncomplete
   */
  async completeReminder(reminderId, completed) {
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
   * @param reminderId - The ID of the reminder to retrieve.
   */
  getReminder(reminderId) {
    return this.remindersById.get(reminderId);
  }
  /** Get all reminders as an array. */
  getAllReminders() {
    return [...this.remindersById.values()];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudRemindersService
});
//# sourceMappingURL=reminders.js.map
