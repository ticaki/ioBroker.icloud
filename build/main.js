"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var path = __toESM(require("node:path"));
var fs = __toESM(require("node:fs"));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_lib = __toESM(require("./lib/index"));
var import_geo = require("./lib/geo");
var import_geocoding = require("./lib/geocoding");
const FINDMY_FEATURE_NAMES = {
  BTR: "Battery Reporting",
  LLC: "Low-power Location Capability",
  CLK: "Clock / Precision Finding",
  TEU: "Trusted Execution Unit",
  SND: "Play Sound",
  ALS: "Always-on Location Service",
  CLT: "Cellular Tracking",
  PRM: "Premium Features",
  SVP: "Saved Position",
  SPN: "Sound while Paired Nearby",
  XRM: "Extended Remote Management",
  NWLB: "Network-based Location Bypass",
  NWF: "Network Find (Crowd-sourced)",
  CWP: "Crowd-sourced Wireless Positioning",
  MSG: "Send Message",
  LOC: "Location",
  LME: "Lost Mode Enable",
  LMG: "Lost Mode GPS",
  LYU: "Location via U1 / Precision Find",
  LKL: "Lock (Local)",
  LST: "Lost Mode",
  LKM: "Lock (Managed)",
  WMG: "Wipe Managed",
  SCA: "Secure Communication Accessory",
  PSS: "Passcode Set",
  EAL: "Enable Activation Lock",
  LAE: "Lock after Erase",
  PIN: "PIN / Passcode reset",
  LCK: "Lock Device",
  REL: "Remote Erase Lock",
  REM: "Remote Actions",
  MCS: "Managed Client Status",
  REP: "Repair State",
  KEY: "Precision Finding / Keys",
  KPD: "Keypad",
  WIP: "Wipe Device"
};
const FINDMY_DEVICE_STATES = [
  { id: "name", name: "Device Name", type: "string", role: "text" },
  { id: "deviceClass", name: "Device Class", type: "string", role: "text" },
  { id: "deviceDisplayName", name: "Display Name", type: "string", role: "text" },
  { id: "modelDisplayName", name: "Model", type: "string", role: "text" },
  { id: "rawDeviceModel", name: "Raw Model", type: "string", role: "text" },
  { id: "deviceStatus", name: "Device Status", type: "string", role: "text" },
  { id: "batteryLevel", name: "Battery Level", type: "number", role: "value.battery", unit: "%" },
  { id: "batteryCharging", name: "Battery Charging", type: "boolean", role: "indicator" },
  { id: "isLocating", name: "Is Locating", type: "boolean", role: "indicator" },
  { id: "locationEnabled", name: "Location Enabled", type: "boolean", role: "indicator" },
  { id: "lostModeEnabled", name: "Lost Mode Enabled", type: "boolean", role: "indicator" },
  { id: "lowPowerMode", name: "Low Power Mode", type: "boolean", role: "indicator" },
  { id: "fmlyShare", name: "Family Share", type: "boolean", role: "indicator" },
  { id: "isConsideredAccessory", name: "Is Accessory", type: "boolean", role: "indicator" },
  { id: "deviceWithYou", name: "Device With You", type: "boolean", role: "indicator" },
  { id: "latitude", name: "Latitude", type: "number", role: "value.gps.latitude" },
  { id: "coordinates", name: "Coordinates", type: "string", role: "value.gps" },
  { id: "longitude", name: "Longitude", type: "number", role: "value.gps.longitude" },
  { id: "altitude", name: "Altitude", type: "number", role: "value.gps.elevation" },
  { id: "horizontalAccuracy", name: "Horizontal Accuracy", type: "number", role: "value" },
  { id: "positionType", name: "Position Type", type: "string", role: "text" },
  { id: "locationTimestamp", name: "Location Timestamp", type: "number", role: "value.time" },
  { id: "isOld", name: "Location is Old", type: "boolean", role: "indicator" },
  { id: "isInaccurate", name: "Location is Inaccurate", type: "boolean", role: "indicator" },
  { id: "distanceKm", name: "Distance from Home", type: "number", role: "value.distance" },
  { id: "ownerAppleId", name: "Owner Apple ID", type: "string", role: "text" },
  { id: "ownerName", name: "Owner Name", type: "string", role: "text" }
];
const CALENDAR_EVENT_STATES = [
  { id: "title", name: "Title", type: "string", role: "text", write: true },
  { id: "guid", name: "GUID", type: "string", role: "text" },
  { id: "etag", name: "ETag", type: "string", role: "text" },
  { id: "pGuid", name: "Calendar GUID", type: "string", role: "text" },
  { id: "startDate", name: "Start Date", type: "number", role: "value.time", write: true },
  { id: "endDate", name: "End Date", type: "number", role: "value.time", write: true },
  { id: "masterStartDate", name: "Master Start Date", type: "number", role: "value.time" },
  { id: "masterEndDate", name: "Master End Date", type: "number", role: "value.time" },
  { id: "createdDate", name: "Created Date", type: "number", role: "value.time" },
  { id: "lastModifiedDate", name: "Last Modified Date", type: "number", role: "value.time" },
  { id: "allDay", name: "All Day", type: "boolean", role: "indicator", write: true },
  { id: "duration", name: "Duration", type: "number", role: "value.interval", unit: "min" },
  { id: "location", name: "Location", type: "string", role: "text", write: true },
  { id: "description", name: "Description", type: "string", role: "text", write: true },
  { id: "url", name: "URL", type: "string", role: "url", write: true },
  { id: "tz", name: "Timezone", type: "string", role: "text" },
  { id: "tzname", name: "Timezone Name", type: "string", role: "text" },
  { id: "startDateTZOffset", name: "TZ Offset", type: "string", role: "text" },
  { id: "icon", name: "Icon", type: "number", role: "value" },
  { id: "readOnly", name: "Read Only", type: "boolean", role: "indicator" },
  { id: "transparent", name: "Transparent", type: "boolean", role: "indicator" },
  { id: "hasAttachments", name: "Has Attachments", type: "boolean", role: "indicator" },
  { id: "recurrenceException", name: "Recurrence Exception", type: "boolean", role: "indicator" },
  { id: "recurrenceMaster", name: "Recurrence Master", type: "boolean", role: "indicator" },
  { id: "birthdayIsYearlessBday", name: "Birthday (Yearless)", type: "boolean", role: "indicator" },
  { id: "birthdayShowAsCompany", name: "Birthday Show As Company", type: "boolean", role: "indicator" },
  { id: "extendedDetailsAreIncluded", name: "Extended Details Included", type: "boolean", role: "indicator" },
  { id: "shouldShowJunkUIWhenAppropriate", name: "Junk UI Flag", type: "boolean", role: "indicator" },
  { id: "alarms", name: "Alarms (JSON)", type: "string", role: "json", write: true }
];
const CALENDAR_COLLECTION_STATES = [
  { id: "guid", name: "GUID", type: "string", role: "text" },
  { id: "ctag", name: "CTag", type: "string", role: "text" },
  { id: "etag", name: "ETag", type: "string", role: "text" },
  { id: "color", name: "Color", type: "string", role: "text" },
  { id: "symbolicColor", name: "Symbolic Color", type: "string", role: "text" },
  { id: "order", name: "Order", type: "number", role: "value" },
  { id: "enabled", name: "Enabled", type: "boolean", role: "indicator" },
  { id: "visible", name: "Visible", type: "boolean", role: "indicator" },
  { id: "readOnly", name: "Read Only", type: "boolean", role: "indicator" },
  { id: "isDefault", name: "Default Calendar", type: "boolean", role: "indicator" },
  { id: "isFamily", name: "Family Calendar", type: "boolean", role: "indicator" },
  { id: "isPublished", name: "Published", type: "boolean", role: "indicator" },
  { id: "isPrivatelyShared", name: "Privately Shared", type: "boolean", role: "indicator" },
  { id: "extendedDetailsAreIncluded", name: "Extended Details Included", type: "boolean", role: "indicator" },
  { id: "shouldShowJunkUIWhenAppropriate", name: "Junk UI Flag", type: "boolean", role: "indicator" },
  { id: "shareTitle", name: "Share Title", type: "string", role: "text" },
  { id: "prePublishedUrl", name: "Pre-Published URL", type: "string", role: "url" },
  { id: "supportedType", name: "Supported Type", type: "string", role: "text" },
  { id: "objectType", name: "Object Type", type: "string", role: "text" },
  { id: "createdDate", name: "Created Date", type: "number", role: "value.time" },
  { id: "lastModifiedDate", name: "Last Modified Date", type: "number", role: "value.time" }
];
const REMINDER_ITEM_STATES = [
  { id: "title", name: "Title", type: "string", role: "text" },
  { id: "description", name: "Description", type: "string", role: "text" },
  { id: "id", name: "Reminder ID", type: "string", role: "text" },
  { id: "listId", name: "List ID", type: "string", role: "text" },
  { id: "priority", name: "Priority", type: "number", role: "value" },
  { id: "flagged", name: "Flagged", type: "boolean", role: "indicator" },
  { id: "allDay", name: "All Day", type: "boolean", role: "indicator" },
  { id: "completed", name: "Completed", type: "boolean", role: "switch", write: true },
  { id: "dueDate", name: "Due Date", type: "number", role: "value.time" },
  { id: "startDate", name: "Start Date", type: "number", role: "value.time" },
  { id: "completedDate", name: "Completed Date", type: "number", role: "value.time" },
  { id: "createdDate", name: "Created Date", type: "number", role: "value.time" },
  { id: "lastModifiedDate", name: "Last Modified Date", type: "number", role: "value.time" }
];
const REMINDER_COLLECTION_STATES = [
  { id: "id", name: "List ID", type: "string", role: "text" },
  { id: "color", name: "Color", type: "string", role: "text" },
  { id: "count", name: "Reminder Count", type: "number", role: "value" }
];
const DRIVE_ROOT_STATES = [
  { id: "name", name: "Root Folder Name", type: "string", role: "text" },
  { id: "docwsid", name: "Document WS ID", type: "string", role: "text" },
  { id: "drivewsid", name: "Drive WS ID", type: "string", role: "text" },
  { id: "fileCount", name: "File Count", type: "number", role: "value" },
  { id: "directChildrenCount", name: "Direct Children Count", type: "number", role: "value" },
  { id: "dateCreated", name: "Date Created", type: "number", role: "value.time" },
  { id: "etag", name: "ETag", type: "string", role: "text" },
  { id: "lastRefresh", name: "Last Refresh", type: "number", role: "value.time" }
];
const CONTACT_ITEM_STATES = [
  { id: "contactId", name: "Contact ID", type: "string", role: "text" },
  { id: "fullName", name: "Full Name", type: "string", role: "text" },
  { id: "firstName", name: "First Name", type: "string", role: "text" },
  { id: "lastName", name: "Last Name", type: "string", role: "text" },
  { id: "companyName", name: "Company", type: "string", role: "text" },
  { id: "nickname", name: "Nickname", type: "string", role: "text" },
  { id: "birthday", name: "Birthday", type: "string", role: "text" },
  { id: "jobTitle", name: "Job Title", type: "string", role: "text" },
  { id: "department", name: "Department", type: "string", role: "text" },
  { id: "city", name: "City", type: "string", role: "text" },
  { id: "phones", name: "Phones (JSON)", type: "string", role: "json" },
  { id: "emails", name: "Emails (JSON)", type: "string", role: "json" },
  { id: "streetAddresses", name: "Addresses (JSON)", type: "string", role: "json" },
  { id: "notes", name: "Notes", type: "string", role: "text" },
  { id: "groups", name: "Groups (JSON)", type: "string", role: "json" },
  { id: "isMe", name: "Is Me", type: "boolean", role: "indicator" }
];
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
class Icloud extends utils.Adapter {
  icloud = null;
  findMyRefreshTimer = null;
  findMyRefreshing = false;
  findMyCleanupDone = false;
  /** Serialized snapshot of last-seen findMyDisabledDevices — used to detect config changes at runtime */
  findMyLastDisabledKey = "";
  /** Maps Apple device API id → 6-digit zero-padded folder id (e.g. '000001') */
  findMyIdMap = /* @__PURE__ */ new Map();
  staleSessionRetryDone = false;
  sessionRecoveryInProgress = false;
  calendarRefreshTimer = null;
  remindersRefreshTimer = null;
  remindersSyncMapLoaded = false;
  contactsRefreshTimer = null;
  notesRefreshTimer = null;
  notesSyncMapLoaded = false;
  photosRefreshTimer = null;
  photosFirstLoad = true;
  driveRefreshTimer = null;
  accountStorageRefreshTimer = null;
  sessionKeepAliveTimer = null;
  findMyFirstLoad = true;
  calendarFirstLoad = true;
  driveFirstLoad = true;
  driveSyncTimer = null;
  driveSyncConflicts = [];
  calendarEventUpdateTimers = /* @__PURE__ */ new Map();
  calendarEventPendingChanges = /* @__PURE__ */ new Map();
  calendarEventUpdatesInFlight = 0;
  calendarResyncTimer = null;
  accountStorageFirstLoad = true;
  geoLookup = new import_geo.GeoLookup();
  externalGeocoder = null;
  /** In-memory cache of last written state values — used to skip unchanged writes after adapter start. */
  stateCache = /* @__PURE__ */ new Map();
  extendedObjects = /* @__PURE__ */ new Map();
  extendObject(id, objPart, optionsOrCallback, callback) {
    const serialized = JSON.stringify(objPart);
    const previous = this.extendedObjects.get(id);
    const options = typeof optionsOrCallback === "function" ? void 0 : optionsOrCallback;
    const cb = typeof optionsOrCallback === "function" ? optionsOrCallback : callback;
    if (previous === serialized) {
      if (cb) {
        cb(null);
        return;
      }
      return Promise.resolve({ id });
    }
    this.extendedObjects.set(id, serialized);
    this.log.debug(`Extending object ${id} with ${serialized} (previous: ${previous != null ? previous : "none"})`);
    if (cb) {
      if (options) {
        super.extendObject(id, objPart, options, cb);
        return;
      }
      super.extendObject(id, objPart, cb);
      return;
    }
    if (options) {
      return super.extendObject(id, objPart, options);
    }
    return super.extendObject(id, objPart);
  }
  constructor(options = {}) {
    super({
      ...options,
      name: "icloud"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Writes a state only if its value has changed compared to the in-memory cache.
   * On first adapter start the cache is empty, so every state is written once unconditionally.
   *
   * @param id - State ID (without namespace prefix)
   * @param val - New value
   */
  async setStateIfChanged(id, val) {
    if (this.stateCache.has(id) && this.stateCache.get(id) === val) {
      return;
    }
    this.stateCache.set(id, val);
    await this.setState(id, val, true);
  }
  async createObjects() {
    await this.extendObject("account", {
      type: "channel",
      common: { name: "Account Information" },
      native: {}
    });
    await this.extendObject("account.fullName", {
      type: "state",
      common: { name: "Full Name", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.extendObject("account.firstName", {
      type: "state",
      common: { name: "First Name", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.extendObject("account.lastName", {
      type: "state",
      common: { name: "Last Name", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.extendObject("account.appleId", {
      type: "state",
      common: { name: "Apple ID", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.extendObject("account.countryCode", {
      type: "state",
      common: { name: "Country Code", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.extendObject("mfa", {
      type: "channel",
      common: { name: "Multi-Factor Authentication" },
      native: {}
    });
    await this.extendObject("mfa.code", {
      type: "state",
      common: {
        name: "MFA Code (enter 6-digit code here)",
        type: "string",
        role: "text",
        read: true,
        write: true,
        def: ""
      },
      native: {}
    });
    await this.extendObject("mfa.required", {
      type: "state",
      common: {
        name: "MFA Required",
        type: "boolean",
        role: "indicator",
        read: true,
        write: false,
        def: false
      },
      native: {}
    });
    await this.extendObject("mfa.requestSmsCode", {
      type: "state",
      common: {
        name: "Request MFA code via SMS (set to true)",
        type: "boolean",
        role: "button",
        read: true,
        write: true,
        def: false
      },
      native: {}
    });
    await this.extendObject("account.storage", {
      type: "channel",
      common: { name: "Storage" },
      native: {}
    });
    const STORAGE_STATES = [
      { id: "usedMB", name: "Used Storage", type: "number", role: "value", unit: "MB" },
      { id: "totalMB", name: "Total Storage", type: "number", role: "value", unit: "MB" },
      { id: "availableMB", name: "Available Storage", type: "number", role: "value", unit: "MB" },
      { id: "usedPercent", name: "Used Percent", type: "number", role: "value", unit: "%" },
      { id: "overQuota", name: "Over Quota", type: "boolean", role: "indicator.alarm" },
      { id: "almostFull", name: "Almost Full", type: "boolean", role: "indicator.alarm" },
      { id: "paidQuota", name: "Paid Quota", type: "boolean", role: "indicator" }
    ];
    for (const s of STORAGE_STATES) {
      await this.extendObject(`account.storage.${s.id}`, {
        type: "state",
        common: {
          name: s.name,
          type: s.type,
          role: s.role,
          read: true,
          write: false,
          ...s.unit ? { unit: s.unit } : {}
        },
        native: {}
      });
    }
    await this.extendObject("account.storage.byMedia", {
      type: "channel",
      common: { name: "Storage by Media Type" },
      native: {}
    });
    await this.extendObject("account.storage.family", {
      type: "channel",
      common: { name: "Family Storage" },
      native: {}
    });
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    var _a;
    this.log.debug("onReady called");
    await this.setState("info.connection", false, true);
    const username = (_a = this.config.username) == null ? void 0 : _a.trim();
    const password = this.config.password;
    if (!username) {
      this.log.error("Configuration error: username (Apple ID) is empty");
      return;
    }
    if (!password) {
      this.log.error("Configuration error: password is empty");
      return;
    }
    if (!username.includes("@")) {
      this.log.warn(`Username "${username}" does not look like a valid Apple ID (expected an email address)`);
    }
    this.log.debug(`Config OK \u2014 username: ${username}, password: ${"*".repeat(password.length)}`);
    await this.createObjects();
    this.log.debug("Objects created/verified");
    try {
      const existing = await this.getStatesAsync(`${this.namespace}.*`);
      for (const [id, state] of Object.entries(existing)) {
        if (state != null) {
          const shortId = id.slice(this.namespace.length + 1);
          this.stateCache.set(shortId, state.val);
        }
      }
      this.log.debug(`State cache pre-populated with ${this.stateCache.size} entries`);
    } catch {
      this.log.debug("State cache pre-population failed, starting with empty cache");
    }
    this.subscribeStates("mfa.code");
    this.subscribeStates("mfa.requestSmsCode");
    this.subscribeStates("findme.*.ping");
    this.subscribeStates("findme.refresh");
    this.subscribeStates("reminders.*.*.completed");
    this.subscribeStates("calendar.*.*.*");
    this.log.debug("Subscribed to mfa.code");
    await this.connectToiCloud();
  }
  async connectToiCloud() {
    var _a;
    const dataDirectory = utils.getAbsoluteInstanceDataDir(this);
    this.log.debug(`Using data directory: ${dataDirectory}`);
    this.icloud = new import_lib.default({
      username: this.config.username.trim(),
      password: this.config.password,
      trustDevice: true,
      dataDirectory,
      authMethod: "srp",
      logger: (level, ...args) => {
        const msg = args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
        if (level === import_lib.LogLevel.Debug) {
          this.log.debug(`[icloud.js] ${msg}`);
        } else if (level === import_lib.LogLevel.Info) {
          this.log.info(`[icloud.js] ${msg}`);
        } else if (level === import_lib.LogLevel.Warning) {
          this.log.warn(`[icloud.js] ${msg}`);
        } else if (level === import_lib.LogLevel.Error) {
          this.log.error(`[icloud.js] ${msg}`);
        }
      }
    });
    this.icloud.on("Started", () => {
      this.log.debug("iCloud auth started \u2014 credentials submitted, waiting for response");
    });
    this.icloud.on("MfaRequested", () => {
      var _a2, _b;
      this.log.warn("MFA required \u2014 enter the 6-digit Apple code into state mfa.code");
      this.log.debug(`iCloud status is now: ${(_b = (_a2 = this.icloud) == null ? void 0 : _a2.status) != null ? _b : "unknown"}`);
      void this.setState("mfa.required", true, true);
      void this.setState("info.connection", false, true);
    });
    this.icloud.on("Authenticated", () => {
      this.log.debug("MFA accepted \u2014 waiting for trust token and iCloud cookies");
    });
    this.icloud.on("Trusted", () => {
      this.log.debug("Device trusted \u2014 fetching iCloud account data");
    });
    this.icloud.on("Ready", () => {
      var _a2, _b;
      this.log.debug(`iCloud status is now: ${(_b = (_a2 = this.icloud) == null ? void 0 : _a2.status) != null ? _b : "unknown"}`);
      this.onICloudReady().catch((err) => {
        var _a3;
        this.log.error(`Error during post-login data fetch: ${(_a3 = err == null ? void 0 : err.message) != null ? _a3 : String(err)}`);
      });
    });
    this.icloud.on("Error", (err) => {
      var _a2;
      const msg = (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err);
      const isHandledRetry = msg.startsWith("STALE_SESSION_401") || msg.startsWith("RATE_LIMITED");
      if (isHandledRetry) {
        this.log.debug(
          `iCloud error (will be retried): ${err instanceof Error ? err.stack : JSON.stringify(err)}`
        );
      } else {
        this.log.error(`iCloud authentication error: ${msg}`);
        this.log.debug(`iCloud error details: ${err instanceof Error ? err.stack : JSON.stringify(err)}`);
      }
      void this.setState("info.connection", false, true);
    });
    this.icloud.awaitReady.catch(() => {
    });
    this.log.debug("Calling icloud.authenticate()");
    try {
      await this.icloud.authenticate();
      this.log.debug(`authenticate() returned \u2014 status: ${this.icloud.status}`);
    } catch (err) {
      const msg = (_a = err == null ? void 0 : err.message) != null ? _a : String(err);
      if (msg.startsWith("RATE_LIMITED")) {
        const retryMinutes = 61;
        const retryTime = new Date((/* @__PURE__ */ new Date()).getTime() + retryMinutes * 60 * 1e3);
        this.log.warn(
          `Apple Rate-Limit erkannt \u2014 n\xE4chster Versuch in ${retryTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} `
        );
        this.setTimeout(
          () => {
            this.log.info("Rate-Limit Wartezeit abgelaufen \u2014 starte erneuten Login-Versuch");
            this.connectToiCloud().catch(() => {
            });
          },
          retryMinutes * 60 * 1e3
        );
      } else if (msg.startsWith("STALE_SESSION_401")) {
        const humanMsg = msg.replace(/^STALE_SESSION_401: /, "");
        if (this.staleSessionRetryDone) {
          this.log.error(
            `Neuversuch nach veralteter Session ebenfalls fehlgeschlagen \u2014 bitte Zugangsdaten pr\xFCfen. (${humanMsg})`
          );
        } else {
          this.staleSessionRetryDone = true;
          this.log.warn(
            `Veraltete Session erkannt (HTTP 401) \u2014 starte automatischen Neuversuch in 10 s. (${humanMsg})`
          );
          this.setTimeout(() => {
            this.log.info("Starte Neuversuch nach veralteter Session\u2026");
            this.connectToiCloud().catch(() => {
            });
          }, 1e4);
        }
      } else {
        this.log.error(`Failed to start iCloud authentication: ${msg}`);
        this.log.debug(`authenticate() exception stack: ${err instanceof Error ? err.stack : String(err)}`);
      }
    }
  }
  /**
   * Triggers a full re-authentication when the iCloud session is permanently dead.
   * Called when a service (FindMy, Reminders, …) detects that refreshWebservices()
   * could not recover the session. Prevents duplicate concurrent recovery attempts.
   *
   * @param reason - Short description of the error that triggered recovery, for logging.
   */
  triggerSessionRecovery(reason) {
    if (this.sessionRecoveryInProgress) {
      return;
    }
    this.sessionRecoveryInProgress = true;
    this.log.warn(`iCloud session permanently expired (${reason}) \u2014 triggering full re-authentication in 10 s`);
    void this.setState("info.connection", false, true);
    this.icloud = null;
    if (this.findMyRefreshTimer) {
      this.clearTimeout(this.findMyRefreshTimer);
      this.findMyRefreshTimer = null;
    }
    if (this.calendarRefreshTimer) {
      this.clearTimeout(this.calendarRefreshTimer);
      this.calendarRefreshTimer = null;
    }
    if (this.remindersRefreshTimer) {
      this.clearTimeout(this.remindersRefreshTimer);
      this.remindersRefreshTimer = null;
    }
    if (this.contactsRefreshTimer) {
      this.clearTimeout(this.contactsRefreshTimer);
      this.contactsRefreshTimer = null;
    }
    if (this.notesRefreshTimer) {
      this.clearTimeout(this.notesRefreshTimer);
      this.notesRefreshTimer = null;
    }
    if (this.accountStorageRefreshTimer) {
      this.clearTimeout(this.accountStorageRefreshTimer);
      this.accountStorageRefreshTimer = null;
    }
    if (this.sessionKeepAliveTimer) {
      this.clearTimeout(this.sessionKeepAliveTimer);
      this.sessionKeepAliveTimer = null;
    }
    this.setTimeout(() => {
      this.sessionRecoveryInProgress = false;
      this.log.info("Session recovery: re-authenticating with iCloud now");
      this.connectToiCloud().catch((err) => {
        var _a;
        this.log.error(`Session recovery re-auth failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : String(err)}`);
      });
    }, 1e4);
  }
  /**
   * Called after the iCloud session reaches Ready state.
   * All post-login data fetching happens here — info.connection is set true only
   * after account info, available services and FindMy devices have been collected.
   */
  async onICloudReady() {
    var _a, _b, _c, _d, _e, _f;
    this.staleSessionRetryDone = false;
    const info = this.icloud.accountInfo;
    if (!(info == null ? void 0 : info.dsInfo)) {
      this.log.warn("iCloud Ready but accountInfo/dsInfo is unavailable");
      await this.setState("info.connection", true, true);
      await this.setState("mfa.required", false, true);
      return;
    }
    const ds = info.dsInfo;
    this.log.info(`Logged in as: ${(_a = ds.fullName) != null ? _a : "(no name)"} (${(_b = ds.appleId) != null ? _b : "(no appleId)"})`);
    this.log.info(`Country: ${(_c = ds.countryCode) != null ? _c : "?"}, Locale: ${(_d = ds.locale) != null ? _d : "?"}`);
    this.log.debug(`Full dsInfo: ${JSON.stringify(ds)}`);
    const setChecked = (id, val) => {
      if (val == null) {
        this.log.warn(`Skipping state "${id}" \u2014 value is ${val}`);
        return;
      }
      void this.setState(id, val, true);
    };
    setChecked("account.fullName", ds.fullName);
    setChecked("account.firstName", ds.firstName);
    setChecked("account.lastName", ds.lastName);
    setChecked("account.appleId", ds.appleId);
    setChecked("account.countryCode", ds.countryCode);
    const webservices = info.webservices;
    const activeServices = webservices ? Object.entries(webservices).filter(([, v]) => (v == null ? void 0 : v.status) === "active").map(([k]) => k).sort() : [];
    if (webservices) {
      const inactive = Object.entries(webservices).filter(([, v]) => (v == null ? void 0 : v.status) !== "active").map(([k, v]) => {
        var _a2;
        return `${k}(${(_a2 = v == null ? void 0 : v.status) != null ? _a2 : "?"})`;
      }).sort();
      this.log.info(`Available iCloud services (${activeServices.length}): ${activeServices.join(", ")}`);
      if (inactive.length) {
        this.log.debug(`Inactive iCloud services: ${inactive.join(", ")}`);
      }
    }
    const family = (_f = (_e = info.iCloudInfo) == null ? void 0 : _e.familyMembers) != null ? _f : [];
    if (family.length) {
      this.log.info(
        `Family members (${family.length}): ${family.map((m) => {
          var _a2, _b2;
          return (_b2 = (_a2 = m.fullName) != null ? _a2 : m.appleId) != null ? _b2 : "?";
        }).join(", ")}`
      );
    }
    const locationPoints = await this.resolveLocationPoints();
    if (activeServices.includes("findme") && this.config.findMyEnabled) {
      await this.initGeocoding();
      await this.loadFindMyIdMap();
      await this.refreshFindMyDevices(locationPoints);
      this.scheduleFindMyRefresh(locationPoints);
    }
    if (activeServices.includes("calendar") && this.config.calendarEnabled) {
      await this.refreshCalendarEvents();
      this.scheduleCalendarRefresh();
    }
    if (activeServices.includes("reminders") && this.config.remindersEnabled) {
      this.refreshReminders().catch((err) => {
        var _a2;
        this.log.warn(`Reminders initial refresh failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
      this.scheduleRemindersRefresh();
    }
    if (activeServices.includes("contacts") && this.config.contactsEnabled) {
      this.refreshContacts().catch((err) => {
        var _a2;
        this.log.warn(`Contacts initial refresh failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
      this.scheduleContactsRefresh();
    }
    if (activeServices.includes("notes") && this.config.notesEnabled) {
      this.refreshNotes().catch((err) => {
        var _a2;
        this.log.warn(`Notes initial refresh failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
      this.scheduleNotesRefresh();
    }
    if (activeServices.includes("ckdatabasews") && this.config.photosEnabled) {
      this.refreshPhotos().catch((err) => {
        var _a2;
        this.log.warn(`Photos initial refresh failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
      this.schedulePhotosRefresh();
    }
    if (this.config.accountStorageEnabled) {
      await this.refreshAccountStorage();
      this.scheduleAccountStorageRefresh();
    }
    this.log.info("iCloud connection established successfully");
    await this.setState("info.connection", true, true);
    await this.setState("mfa.required", false, true);
    this.scheduleSessionKeepAlive();
    if (activeServices.includes("drivews") && this.config.driveEnabled) {
      (async () => {
        var _a2;
        try {
          await this.icloud.requestServiceAccess("iclouddrive");
        } catch (err) {
          const msg = (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err);
          this.log.debug(`Drive PCS access skipped: ${msg}`);
        }
        await this.refreshDrive();
        if (this.config.driveSyncEnabled) {
          await this.loadDriveSyncMeta();
          this.executeDriveSync().then(() => this.scheduleDriveSync()).catch((err) => {
            var _a3;
            this.log.warn(`Drive Sync: initial sync failed: ${(_a3 = err == null ? void 0 : err.message) != null ? _a3 : String(err)}`);
            this.scheduleDriveSync();
          });
          this.log.info("Drive Sync enabled");
        }
      })().catch((err) => {
        var _a2;
        this.log.warn(`Drive initial refresh failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
    }
  }
  /**
   * Resolve location points from config.
   * Falls back to system.config coordinates as a single 'home' point if none configured.
   *
   * @returns array of resolved location points
   */
  async resolveLocationPoints() {
    var _a;
    const pts = ((_a = this.config.locationPoints) != null ? _a : []).filter(
      (p) => {
        var _a2;
        return ((_a2 = String(p.index)) == null ? void 0 : _a2.trim()) && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude));
      }
    );
    if (pts.length > 0) {
      return pts.map((p) => {
        var _a2;
        return {
          index: String(p.index).trim(),
          lat: Number(p.latitude),
          lon: Number(p.longitude),
          name: ((_a2 = p.name) == null ? void 0 : _a2.trim()) || String(p.index).trim()
        };
      });
    }
    try {
      const sysCfg = await this.getForeignObjectAsync("system.config");
      const common = sysCfg == null ? void 0 : sysCfg.common;
      const lat = Number(common == null ? void 0 : common.latitude);
      const lon = Number(common == null ? void 0 : common.longitude);
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        this.log.debug(`Location points: using system.config fallback (${lat}, ${lon})`);
        return [{ index: "iobroker", lat, lon, name: "ioBroker" }];
      }
    } catch {
    }
    this.log.debug("No location points configured");
    return [];
  }
  /**
   * Initialise the geocoding provider based on adapter config.
   * Loads the local GeoJSON index or creates an ExternalGeocoder instance.
   */
  async initGeocoding() {
    var _a, _b, _c, _d;
    const provider = (_a = this.config.geocodingProvider) != null ? _a : "none";
    if (provider === "none") {
      this.log.debug("Geocoding: disabled");
      return;
    }
    if (provider === "local") {
      const adapterRoot = path.join(__dirname, "..");
      this.geoLookup.load(adapterRoot, (msg) => this.log.info(msg));
      return;
    }
    const geocoder = new import_geocoding.ExternalGeocoder(
      provider,
      (_b = this.config.geocodingUrl) != null ? _b : "",
      (_c = this.config.geocodingApiKey) != null ? _c : "",
      (_d = this.config.geocodingCacheSize) != null ? _d : "small",
      (level, msg) => this.log[level](msg)
    );
    if (!geocoder.validate()) {
      return;
    }
    try {
      const sysCfg = await this.getForeignObjectAsync("system.config");
      const common = sysCfg == null ? void 0 : sysCfg.common;
      const lang = common == null ? void 0 : common.language;
      if (lang) {
        geocoder.language = lang;
        this.log.info(`Geocoder: using system language '${lang}' for localized address names.`);
      }
      const lat = Number(common == null ? void 0 : common.latitude);
      const lon = Number(common == null ? void 0 : common.longitude);
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        geocoder.systemCountryCode = await geocoder.resolveSystemCountry(lat, lon);
        if (geocoder.systemCountryCode) {
          this.log.info(
            `Geocoder: system country code resolved to '${geocoder.systemCountryCode}' \u2014 country will be omitted from location names for devices in this country.`
          );
        } else {
          this.log.info(
            "Geocoder: could not determine system country code from system.config coordinates. Country will always be appended to location names."
          );
        }
      }
    } catch {
    }
    this.externalGeocoder = geocoder;
  }
  /**
   * Fetch FindMy devices and write states.
   *
   * @param locationPoints - configured location points for distance calculation
   */
  async refreshFindMyDevices(locationPoints) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    if (!this.icloud) {
      return;
    }
    this.findMyRefreshing = true;
    try {
      const findMe = this.icloud.getService("findme");
      this.log.debug("FindMy: calling API refresh...");
      await findMe.refresh();
      const membersInfo = findMe.membersInfo;
      const devices = findMe.devices;
      this.log.debug(`FindMy: API returned ${devices.size} device(s)`);
      const regularDevices = [];
      const accessories = [];
      const familyDevices = [];
      for (const [, dev] of devices) {
        const d = dev.deviceInfo;
        if (d.isConsideredAccessory) {
          accessories.push(d);
        } else if (d.fmlyShare) {
          familyDevices.push(d);
        } else {
          regularDevices.push(d);
        }
      }
      const allDevicesUnfiltered = [...regularDevices, ...accessories, ...familyDevices];
      const disabledSet = new Set((_a = this.config.findMyDisabledDevices) != null ? _a : []);
      const disabledKey = [...disabledSet].sort().join("\0");
      if (disabledKey !== this.findMyLastDisabledKey) {
        this.findMyLastDisabledKey = disabledKey;
        this.findMyCleanupDone = false;
      }
      const allDevices = allDevicesUnfiltered.filter((d) => {
        var _a2;
        return !disabledSet.has((_a2 = d.id) != null ? _a2 : "");
      });
      const geocodingActive = ((_b = this.config.geocodingProvider) != null ? _b : "none") !== "none";
      if (!this.findMyCleanupDone) {
        await this.cleanupFindMyObjects(allDevices);
        await this.cleanupDisabledDevices(disabledSet);
        if (!geocodingActive) {
          await this.cleanupFindMyGeoStates();
        }
        this.findMyCleanupDone = true;
      }
      await this.extendObject("findme", {
        type: "folder",
        common: { name: "FindMy" },
        native: {}
      });
      await this.extendObject("findme.lastSync", {
        type: "state",
        common: {
          name: "Last Sync",
          type: "number",
          role: "value.time",
          read: true,
          write: false
        },
        native: {}
      });
      await this.extendObject("findme.refresh", {
        type: "state",
        common: {
          name: "Refresh now",
          type: "boolean",
          role: "button",
          read: false,
          write: true
        },
        native: {}
      });
      let _geoTotalMs = 0;
      let _geoCount = 0;
      for (const d of allDevices) {
        const apiId = (_c = d.id) != null ? _c : "";
        if (!apiId) {
          this.log.warn(`FindMy: skipping device with empty id (name: ${(_d = d.name) != null ? _d : "?"})`);
          continue;
        }
        const numericId = this.getOrAssignFindMyNumericId(apiId);
        const safeId = `findme.${numericId}`;
        {
          const existingDeviceObj = await this.getObjectAsync(safeId);
          await this.setObject(safeId, {
            ...existingDeviceObj != null ? existingDeviceObj : {},
            type: "device",
            common: {
              ...(_e = existingDeviceObj == null ? void 0 : existingDeviceObj.common) != null ? _e : {},
              name: (_g = (_f = d.name) != null ? _f : d.deviceDisplayName) != null ? _g : apiId
            },
            native: { id: apiId, baUUID: d.baUUID }
          });
        }
        const hasBattery = d.batteryStatus != null && d.batteryStatus !== "Unknown";
        const batteryStateDefs = hasBattery ? FINDMY_DEVICE_STATES : FINDMY_DEVICE_STATES.filter((def) => def.id !== "batteryLevel" && def.id !== "batteryCharging");
        for (const def of batteryStateDefs) {
          await this.extendObject(`${safeId}.${def.id}`, {
            type: "state",
            common: {
              name: def.name,
              type: def.type,
              role: def.role,
              ...def.unit !== void 0 ? { unit: def.unit } : {},
              read: true,
              write: false
            },
            native: {}
          });
        }
        if (geocodingActive) {
          await this.extendObject(`${safeId}.locationName`, {
            type: "state",
            common: {
              name: this.config.geocodingProvider === "local" ? "Location (Municipality)" : "Location (Address)",
              type: "string",
              role: "text",
              read: true,
              write: false
            },
            native: {}
          });
        }
        if ((_h = d.features) == null ? void 0 : _h.SND) {
          await this.extendObject(`${safeId}.ping`, {
            type: "state",
            common: {
              name: "Play Sound (Ping)",
              type: "boolean",
              role: "button",
              read: false,
              write: true
            },
            native: {}
          });
        }
        await this.extendObject(`${safeId}.features`, {
          type: "channel",
          common: { name: "Features" },
          native: {}
        });
        if (d.features) {
          for (const [feat, val] of Object.entries(d.features)) {
            await this.extendObject(`${safeId}.features.${feat}`, {
              type: "state",
              common: {
                name: (_i = FINDMY_FEATURE_NAMES[feat]) != null ? _i : feat,
                type: "boolean",
                role: "indicator",
                read: true,
                write: false
              },
              native: {}
            });
            await this.setStateIfChanged(`${safeId}.features.${feat}`, val);
          }
        }
        const loc = d.location;
        const distKm = loc && locationPoints.length > 0 ? haversineKm(locationPoints[0].lat, locationPoints[0].lon, loc.latitude, loc.longitude) : null;
        const _geoT0 = process.hrtime.bigint();
        let _geoResult = "unknown";
        if (loc && this.externalGeocoder) {
          const addr = await this.externalGeocoder.resolve(loc.latitude, loc.longitude);
          if (addr) {
            _geoResult = addr;
          }
        } else if (loc && this.config.geocodingProvider === "local") {
          _geoResult = this.geoLookup.resolve(loc.latitude, loc.longitude);
        }
        const _geoElapsed = loc ? Number(process.hrtime.bigint() - _geoT0) : 0;
        const vals = {
          name: (_j = d.name) != null ? _j : "",
          deviceClass: d.deviceClass,
          deviceDisplayName: d.deviceDisplayName,
          modelDisplayName: d.modelDisplayName,
          rawDeviceModel: d.rawDeviceModel,
          deviceStatus: d.deviceStatus,
          ...hasBattery ? {
            batteryLevel: d.batteryLevel != null ? Math.round(d.batteryLevel * 100) : -1,
            batteryCharging: d.batteryStatus === "Charging"
          } : {},
          isLocating: d.isLocating,
          locationEnabled: d.locationEnabled,
          lostModeEnabled: d.lostModeEnabled,
          lowPowerMode: d.lowPowerMode,
          fmlyShare: d.fmlyShare,
          isConsideredAccessory: d.isConsideredAccessory,
          deviceWithYou: d.deviceWithYou,
          coordinates: loc ? `${loc.latitude};${loc.longitude}` : null,
          latitude: (_k = loc == null ? void 0 : loc.latitude) != null ? _k : null,
          longitude: (_l = loc == null ? void 0 : loc.longitude) != null ? _l : null,
          altitude: (_m = loc == null ? void 0 : loc.altitude) != null ? _m : null,
          horizontalAccuracy: (_n = loc == null ? void 0 : loc.horizontalAccuracy) != null ? _n : null,
          positionType: (_o = loc == null ? void 0 : loc.positionType) != null ? _o : null,
          locationTimestamp: (_p = loc == null ? void 0 : loc.timeStamp) != null ? _p : null,
          isOld: (_q = loc == null ? void 0 : loc.isOld) != null ? _q : null,
          isInaccurate: (_r = loc == null ? void 0 : loc.isInaccurate) != null ? _r : null,
          distanceKm: distKm !== null ? Math.round(distKm * 1e3) / 1e3 : null,
          ...geocodingActive ? { locationName: _geoResult } : {},
          ownerAppleId: d.prsId ? (_t = (_s = membersInfo[d.prsId]) == null ? void 0 : _s.appleId) != null ? _t : null : null,
          ownerName: d.prsId ? [(_u = membersInfo[d.prsId]) == null ? void 0 : _u.firstName, (_v = membersInfo[d.prsId]) == null ? void 0 : _v.lastName].filter(Boolean).join(" ") || null : null
        };
        if (loc) {
          _geoTotalMs += _geoElapsed;
          _geoCount++;
        }
        for (const [key, val] of Object.entries(vals)) {
          if (val !== null) {
            await this.setStateIfChanged(`${safeId}.${key}`, val);
          }
        }
        if (loc && locationPoints.length > 0) {
          await this.extendObject(`${safeId}.distances`, {
            type: "channel",
            common: { name: "Distances" },
            native: {}
          });
          for (const pt of locationPoints) {
            const distM = Math.round(haversineKm(pt.lat, pt.lon, loc.latitude, loc.longitude) * 1e3);
            await this.extendObject(`${safeId}.distances.${pt.index}`, {
              type: "state",
              common: {
                name: pt.name,
                type: "number",
                role: "value.distance",
                unit: "m",
                read: true,
                write: false
              },
              native: {}
            });
            await this.setStateIfChanged(`${safeId}.distances.${pt.index}`, distM);
          }
        }
      }
      if (geocodingActive) {
        if (this.externalGeocoder) {
          const st = this.externalGeocoder.takeStats();
          this.log.debug(
            `FindMy geocoding: ${allDevices.length} device(s), ${_geoCount} with location \u2014 cache hits: ${st.cacheHits}, requests: ${st.requests}, fails: ${st.fails}, cache size: ${st.cacheSize}, total: ${(_geoTotalMs / 1e6).toFixed(1)} ms`
          );
        } else {
          this.log.debug(
            `FindMy geocoding (local): ${allDevices.length} device(s), ${_geoCount} with location, total: ${(_geoTotalMs / 1e6).toFixed(1)} ms`
          );
        }
      }
      await this.setState("findme.lastSync", Date.now(), true);
      const locatedCount = allDevices.filter((d) => d.location).length;
      if (this.findMyFirstLoad) {
        this.findMyFirstLoad = false;
        this.log.info(
          `FindMy ready \u2014 ${allDevices.length} device(s): ${regularDevices.length} own, ${familyDevices.length} family, ${accessories.length} accessories; ${locatedCount}/${allDevices.length} with location`
        );
      } else {
        this.log.debug(`FindMy: refresh done \u2014 ${allDevices.length} device(s) written`);
      }
    } catch (err) {
      this.log.warn(`FindMy refresh failed: ${(_w = err == null ? void 0 : err.message) != null ? _w : String(err)}`);
      if (err instanceof Error && /HTTP (421|450)/.test(err.message)) {
        this.triggerSessionRecovery(err.message);
      }
    } finally {
      this.findMyRefreshing = false;
    }
  }
  /**
   * Schedule a self-rescheduling FindMy refresh every 15 minutes.
   * Uses setTimeout (not setInterval) so the next run only starts after the
   * current one completes — no overlapping requests.
   */
  /**
   * Load the map of Apple device API id → numeric folder id from existing objects.
   */
  async loadFindMyIdMap() {
    var _a, _b;
    const existing = await this.getObjectViewAsync("system", "device", {
      startkey: `${this.namespace}.findme.`,
      endkey: `${this.namespace}.findme.\u9999`
    });
    for (const row of existing.rows) {
      const apiId = (_b = (_a = row.value) == null ? void 0 : _a.native) == null ? void 0 : _b.id;
      const numericPart = row.id.replace(`${this.namespace}.findme.`, "");
      if (apiId && /^\d{6}$/.test(numericPart)) {
        this.findMyIdMap.set(apiId, numericPart);
      }
    }
    this.log.debug(`FindMy ID map loaded: ${this.findMyIdMap.size} known device(s)`);
  }
  getOrAssignFindMyNumericId(apiId) {
    if (this.findMyIdMap.has(apiId)) {
      return this.findMyIdMap.get(apiId);
    }
    const used = /* @__PURE__ */ new Set();
    for (const v of this.findMyIdMap.values()) {
      used.add(parseInt(v, 10));
    }
    let next = 1;
    while (used.has(next)) {
      next++;
    }
    const nextStr = String(next).padStart(6, "0");
    this.findMyIdMap.set(apiId, nextStr);
    return nextStr;
  }
  /**
   * Remove findme device objects (and their children) that are no longer returned by the API.
   *
   * @param currentDevices - list of currently active devices
   */
  async cleanupFindMyObjects(currentDevices) {
    const currentIds = new Set(
      currentDevices.map((d) => {
        var _a;
        const apiId = (_a = d.id) != null ? _a : "";
        if (!apiId) {
          return "";
        }
        const numericId = this.findMyIdMap.get(apiId);
        return numericId ? `${this.namespace}.findme.${numericId}` : "";
      }).filter(Boolean)
    );
    const existing = await this.getObjectViewAsync("system", "device", {
      startkey: `${this.namespace}.findme.`,
      endkey: `${this.namespace}.findme.\u9999`
    });
    for (const row of existing.rows) {
      if (!currentIds.has(row.id)) {
        this.log.info(`FindMy cleanup: removing stale device ${row.id}`);
        await this.delObjectAsync(row.id, { recursive: true });
      }
    }
  }
  /**
   * Remove findme device objects whose native.id is in the disabled set.
   * This runs independently of findMyIdMap so it works even when the map is incomplete.
   *
   * @param disabledIds - set of Apple API device IDs that are disabled
   */
  async cleanupDisabledDevices(disabledIds) {
    var _a, _b;
    if (disabledIds.size === 0) {
      return;
    }
    const existing = await this.getObjectViewAsync("system", "device", {
      startkey: `${this.namespace}.findme.`,
      endkey: `${this.namespace}.findme.\u9999`
    });
    for (const row of existing.rows) {
      const nativeId = (_b = (_a = row.value) == null ? void 0 : _a.native) == null ? void 0 : _b.id;
      if (nativeId && disabledIds.has(nativeId)) {
        this.log.info(`FindMy: removing disabled device ${row.id}`);
        await this.delObjectAsync(row.id, { recursive: true });
      }
    }
  }
  async cleanupFindMyGeoStates() {
    const existing = await this.getObjectViewAsync("system", "state", {
      startkey: `${this.namespace}.findme.`,
      endkey: `${this.namespace}.findme.\u9999`
    });
    for (const row of existing.rows) {
      if (row.id.endsWith(".locationName")) {
        this.log.info(`FindMy GEO cleanup: removing ${row.id}`);
        await this.delObjectAsync(row.id);
      }
    }
  }
  scheduleFindMyRefresh(locationPoints) {
    var _a;
    if (this.findMyRefreshTimer) {
      this.clearTimeout(this.findMyRefreshTimer);
      this.findMyRefreshTimer = null;
    }
    let intervalMin = Math.floor((_a = this.config.findMyInterval) != null ? _a : 15);
    if (!Number.isFinite(intervalMin) || intervalMin < 1) {
      this.log.warn(
        `FindMy interval is ${this.config.findMyInterval} \u2014 value below 1 minute, falling back to 5 minutes`
      );
      intervalMin = 5;
    } else if (intervalMin > 120) {
      this.log.warn(`FindMy interval is ${intervalMin} minutes \u2014 clamping to 121 minutes`);
      intervalMin = 121;
    } else if (intervalMin === 120 && this.config.findMyIntervalExpert != null && Number.isFinite(this.config.findMyIntervalExpert)) {
      intervalMin = this.config.findMyIntervalExpert / 60;
      if (intervalMin < 0.5) {
        intervalMin = 0.5;
        this.log.warn(
          `FindMy expert interval is ${this.config.findMyIntervalExpert} seconds \u2014 value below 30 seconds, falling back to 30 seconds`
        );
      }
      this.log.warn(
        `FindMy expert interval: (${this.config.findMyIntervalExpert} seconds). Be warned \u2014 setting very low intervals may cause Apple to temporarily block your account!`
      );
    }
    const INTERVAL_MS = intervalMin * 60 * 1e3;
    const schedule = () => {
      this.findMyRefreshTimer = this.setTimeout(async () => {
        this.findMyRefreshTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("FindMy scheduled refresh starting...");
        await this.refreshFindMyDevices(locationPoints);
        schedule();
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug("FindMy refresh scheduled every 15 min");
  }
  // ── Calendar helpers ──────────────────────────────────────────────────────
  sanitizeCalendarId(name) {
    return (name || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
  }
  localDateArrayToTimestamp(arr) {
    var _a, _b;
    if (!arr || arr.length < 4) {
      return null;
    }
    return new Date(arr[1], arr[2] - 1, arr[3], (_a = arr[4]) != null ? _a : 0, (_b = arr[5]) != null ? _b : 0, 0).getTime();
  }
  async refreshCalendarEvents() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa, _ba, _ca, _da, _ea, _fa, _ga, _ha, _ia, _ja;
    if (!this.icloud) {
      return;
    }
    try {
      const calService = this.icloud.getService("calendar");
      const now = /* @__PURE__ */ new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startupResp = await calService.startup();
      const collections = (_a = startupResp.Collection) != null ? _a : [];
      const months = Math.max(1, Math.min(12, Math.floor((_b = this.config.calendarMonths) != null ? _b : 2)));
      const eventsResp = await calService.eventsForMonths(months);
      const events = (_c = eventsResp.Event) != null ? _c : [];
      const maxCount = Math.max(1, Math.floor((_d = this.config.calendarEventCount) != null ? _d : 10));
      const alarmsByGuid = /* @__PURE__ */ new Map();
      for (const a of (_e = eventsResp.Alarm) != null ? _e : []) {
        alarmsByGuid.set(a.guid, {
          before: a.measurement.before,
          hours: a.measurement.hours,
          minutes: a.measurement.minutes,
          seconds: a.measurement.seconds,
          days: a.measurement.days,
          weeks: a.measurement.weeks
        });
      }
      const eventsByCalendar = /* @__PURE__ */ new Map();
      for (const ev of events) {
        if (!ev.pGuid) {
          continue;
        }
        const startTs = this.localDateArrayToTimestamp(ev.localStartDate);
        if (startTs !== null && startTs < todayStart) {
          continue;
        }
        if (!eventsByCalendar.has(ev.pGuid)) {
          eventsByCalendar.set(ev.pGuid, []);
        }
        eventsByCalendar.get(ev.pGuid).push(ev);
      }
      for (const evList of eventsByCalendar.values()) {
        evList.sort((a, b) => {
          var _a2, _b2;
          const ta = (_a2 = this.localDateArrayToTimestamp(a.localStartDate)) != null ? _a2 : 0;
          const tb = (_b2 = this.localDateArrayToTimestamp(b.localStartDate)) != null ? _b2 : 0;
          return ta - tb;
        });
      }
      await this.extendObject("calendar", {
        type: "folder",
        common: { name: "Calendar" },
        native: {}
      });
      await this.extendObject("calendar.lastSync", {
        type: "state",
        common: {
          name: "Last Sync",
          type: "number",
          role: "value.time",
          read: true,
          write: false
        },
        native: {}
      });
      const activeCalendarIds = /* @__PURE__ */ new Set();
      for (const col of collections) {
        const calId = this.sanitizeCalendarId(col.title);
        activeCalendarIds.add(calId);
        await this.extendObject(`calendar.${calId}`, {
          type: "folder",
          common: { name: col.title },
          native: {}
        });
        for (const s of CALENDAR_COLLECTION_STATES) {
          await this.extendObject(`calendar.${calId}.${s.id}`, {
            type: "state",
            common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
            native: {}
          });
        }
        await this.setStateIfChanged(`calendar.${calId}.guid`, (_f = col.guid) != null ? _f : "");
        await this.setStateIfChanged(`calendar.${calId}.ctag`, (_g = col.ctag) != null ? _g : "");
        await this.setStateIfChanged(`calendar.${calId}.etag`, (_h = col.etag) != null ? _h : "");
        await this.setStateIfChanged(`calendar.${calId}.color`, (_i = col.color) != null ? _i : "");
        await this.setStateIfChanged(`calendar.${calId}.symbolicColor`, (_j = col.symbolicColor) != null ? _j : "");
        await this.setStateIfChanged(`calendar.${calId}.order`, (_k = col.order) != null ? _k : 0);
        await this.setStateIfChanged(`calendar.${calId}.enabled`, (_l = col.enabled) != null ? _l : false);
        await this.setStateIfChanged(`calendar.${calId}.visible`, (_m = col.visible) != null ? _m : false);
        await this.setStateIfChanged(`calendar.${calId}.readOnly`, (_n = col.readOnly) != null ? _n : false);
        await this.setStateIfChanged(`calendar.${calId}.isDefault`, (_o = col.isDefault) != null ? _o : false);
        await this.setStateIfChanged(`calendar.${calId}.isFamily`, (_p = col.isFamily) != null ? _p : false);
        await this.setStateIfChanged(`calendar.${calId}.isPublished`, (_q = col.isPublished) != null ? _q : false);
        await this.setStateIfChanged(`calendar.${calId}.isPrivatelyShared`, (_r = col.isPrivatelyShared) != null ? _r : false);
        await this.setStateIfChanged(
          `calendar.${calId}.extendedDetailsAreIncluded`,
          (_s = col.extendedDetailsAreIncluded) != null ? _s : false
        );
        await this.setStateIfChanged(
          `calendar.${calId}.shouldShowJunkUIWhenAppropriate`,
          (_t = col.shouldShowJunkUIWhenAppropriate) != null ? _t : false
        );
        await this.setStateIfChanged(`calendar.${calId}.shareTitle`, (_u = col.shareTitle) != null ? _u : "");
        await this.setStateIfChanged(`calendar.${calId}.prePublishedUrl`, (_v = col.prePublishedUrl) != null ? _v : "");
        await this.setStateIfChanged(`calendar.${calId}.supportedType`, (_w = col.supportedType) != null ? _w : "");
        await this.setStateIfChanged(`calendar.${calId}.objectType`, (_x = col.objectType) != null ? _x : "");
        await this.setStateIfChanged(
          `calendar.${calId}.createdDate`,
          (_y = this.localDateArrayToTimestamp(col.createdDate)) != null ? _y : null
        );
        await this.setStateIfChanged(
          `calendar.${calId}.lastModifiedDate`,
          (_z = this.localDateArrayToTimestamp(col.lastModifiedDate)) != null ? _z : null
        );
        const calEvents = (_A = eventsByCalendar.get(col.guid)) != null ? _A : [];
        for (let i = 1; i <= maxCount; i++) {
          const slotId = String(i).padStart(6, "0");
          const basePath = `calendar.${calId}.${slotId}`;
          const ev = calEvents[i - 1];
          await this.extendObject(basePath, {
            type: "folder",
            common: { name: (_B = ev == null ? void 0 : ev.title) != null ? _B : `Event ${slotId}` },
            native: {}
          });
          for (const s of CALENDAR_EVENT_STATES) {
            await this.extendObject(`${basePath}.${s.id}`, {
              type: "state",
              common: {
                name: s.name,
                type: s.type,
                role: s.role,
                read: true,
                write: (_C = s.write) != null ? _C : false,
                ...s.unit ? { unit: s.unit } : {}
              },
              native: {}
            });
          }
          await this.extendObject(`${basePath}.json`, {
            type: "state",
            common: {
              name: "Event JSON (editable)",
              type: "string",
              role: "json",
              read: true,
              write: true
            },
            native: {}
          });
          if (ev) {
            await this.setStateIfChanged(`${basePath}.title`, (_D = ev.title) != null ? _D : "");
            await this.setStateIfChanged(`${basePath}.guid`, (_E = ev.guid) != null ? _E : "");
            await this.setStateIfChanged(`${basePath}.etag`, (_F = ev.etag) != null ? _F : "");
            await this.setStateIfChanged(`${basePath}.pGuid`, (_G = ev.pGuid) != null ? _G : "");
            await this.setStateIfChanged(
              `${basePath}.startDate`,
              (_H = this.localDateArrayToTimestamp(ev.localStartDate)) != null ? _H : null
            );
            await this.setStateIfChanged(
              `${basePath}.endDate`,
              (_I = this.localDateArrayToTimestamp(ev.localEndDate)) != null ? _I : null
            );
            await this.setStateIfChanged(
              `${basePath}.masterStartDate`,
              (_J = this.localDateArrayToTimestamp(ev.masterStartDate)) != null ? _J : null
            );
            await this.setStateIfChanged(
              `${basePath}.masterEndDate`,
              (_K = this.localDateArrayToTimestamp(ev.masterEndDate)) != null ? _K : null
            );
            await this.setStateIfChanged(
              `${basePath}.createdDate`,
              (_L = this.localDateArrayToTimestamp(ev.createdDate)) != null ? _L : null
            );
            await this.setStateIfChanged(
              `${basePath}.lastModifiedDate`,
              (_M = this.localDateArrayToTimestamp(ev.lastModifiedDate)) != null ? _M : null
            );
            await this.setStateIfChanged(`${basePath}.allDay`, (_N = ev.allDay) != null ? _N : false);
            await this.setStateIfChanged(`${basePath}.duration`, (_O = ev.duration) != null ? _O : null);
            await this.setStateIfChanged(`${basePath}.url`, (_P = ev.url) != null ? _P : "");
            await this.setStateIfChanged(`${basePath}.tz`, (_Q = ev.tz) != null ? _Q : "");
            await this.setStateIfChanged(`${basePath}.tzname`, (_R = ev.tzname) != null ? _R : "");
            await this.setStateIfChanged(`${basePath}.startDateTZOffset`, (_S = ev.startDateTZOffset) != null ? _S : "");
            await this.setStateIfChanged(`${basePath}.icon`, (_T = ev.icon) != null ? _T : 0);
            await this.setStateIfChanged(`${basePath}.readOnly`, (_U = ev.readOnly) != null ? _U : false);
            await this.setStateIfChanged(`${basePath}.transparent`, (_V = ev.transparent) != null ? _V : false);
            await this.setStateIfChanged(`${basePath}.hasAttachments`, (_W = ev.hasAttachments) != null ? _W : false);
            await this.setStateIfChanged(
              `${basePath}.recurrenceException`,
              (_X = ev.recurrenceException) != null ? _X : false
            );
            await this.setStateIfChanged(`${basePath}.recurrenceMaster`, (_Y = ev.recurrenceMaster) != null ? _Y : false);
            await this.setStateIfChanged(
              `${basePath}.birthdayIsYearlessBday`,
              (_Z = ev.birthdayIsYearlessBday) != null ? _Z : false
            );
            await this.setStateIfChanged(
              `${basePath}.birthdayShowAsCompany`,
              (__ = ev.birthdayShowAsCompany) != null ? __ : false
            );
            await this.setStateIfChanged(
              `${basePath}.extendedDetailsAreIncluded`,
              (_$ = ev.extendedDetailsAreIncluded) != null ? _$ : false
            );
            await this.setStateIfChanged(
              `${basePath}.shouldShowJunkUIWhenAppropriate`,
              (_aa = ev.shouldShowJunkUIWhenAppropriate) != null ? _aa : false
            );
            const alarmDetails = ((_ba = ev.alarms) != null ? _ba : []).map((guid) => alarmsByGuid.get(guid)).filter((m) => m !== void 0);
            await this.setStateIfChanged(`${basePath}.alarms`, JSON.stringify(alarmDetails));
            await this.setStateIfChanged(`${basePath}.location`, (_ca = ev.location) != null ? _ca : "");
            await this.setStateIfChanged(`${basePath}.description`, (_da = ev.description) != null ? _da : "");
            await this.setStateIfChanged(
              `${basePath}.json`,
              JSON.stringify({
                title: (_ea = ev.title) != null ? _ea : "",
                startDate: this.localDateArrayToTimestamp(ev.localStartDate),
                endDate: this.localDateArrayToTimestamp(ev.localEndDate),
                allDay: (_fa = ev.allDay) != null ? _fa : false,
                location: (_ga = ev.location) != null ? _ga : "",
                description: (_ha = ev.description) != null ? _ha : "",
                url: (_ia = ev.url) != null ? _ia : "",
                alarms: alarmDetails
              })
            );
          } else {
            for (const s of CALENDAR_EVENT_STATES) {
              await this.setStateIfChanged(`${basePath}.${s.id}`, null);
            }
            await this.setStateIfChanged(`${basePath}.json`, null);
          }
        }
      }
      await this.cleanupCalendarObjects(activeCalendarIds, maxCount);
      await this.setState("calendar.lastSync", Date.now(), true);
      if (this.calendarFirstLoad) {
        this.calendarFirstLoad = false;
        const upcomingCount = [...eventsByCalendar.values()].reduce((s, l) => s + l.length, 0);
        this.log.info(
          `Calendar ready \u2014 ${collections.length} calendar(s), ${upcomingCount} upcoming event(s) this month`
        );
      } else {
        this.log.debug(`Calendar refresh done \u2014 ${collections.length} calendar(s), ${events.length} event(s)`);
      }
    } catch (err) {
      const msg = (_ja = err == null ? void 0 : err.message) != null ? _ja : String(err);
      this.log.warn(`Calendar refresh failed: ${msg}`);
    }
  }
  async cleanupCalendarObjects(activeCalendarIds, maxCount) {
    const prefix = `${this.namespace}.calendar.`;
    const existing = await this.getObjectViewAsync("system", "folder", {
      startkey: prefix,
      endkey: `${prefix}\u9999`
    });
    for (const row of existing.rows) {
      const suffix = row.id.slice(prefix.length);
      const parts = suffix.split(".");
      if (parts.length === 1) {
        if (!activeCalendarIds.has(parts[0])) {
          this.log.info(`Calendar cleanup: removing deleted calendar "${parts[0]}"`);
          await this.delObjectAsync(row.id, { recursive: true });
        }
      } else if (parts.length === 2) {
        const slotNum = parseInt(parts[1], 10);
        if (activeCalendarIds.has(parts[0]) && !isNaN(slotNum) && slotNum > maxCount) {
          this.log.info(`Calendar cleanup: removing excess slot ${parts[1]} in calendar "${parts[0]}"`);
          await this.delObjectAsync(row.id, { recursive: true });
        }
      }
    }
  }
  scheduleCalendarRefresh() {
    var _a;
    if (this.calendarRefreshTimer) {
      this.clearTimeout(this.calendarRefreshTimer);
      this.calendarRefreshTimer = null;
    }
    let intervalMin = Math.floor((_a = this.config.calendarInterval) != null ? _a : 60);
    if (!Number.isFinite(intervalMin) || intervalMin < 5) {
      this.log.warn(
        `Calendar interval is ${this.config.calendarInterval} \u2014 value below 5 minutes, falling back to 60 minutes`
      );
      intervalMin = 60;
    } else if (intervalMin > 1440) {
      this.log.warn(`Calendar interval is ${intervalMin} minutes \u2014 clamping to 1440 minutes`);
      intervalMin = 1440;
    }
    const INTERVAL_MS = intervalMin * 60 * 1e3;
    const schedule = () => {
      this.calendarRefreshTimer = this.setTimeout(async () => {
        this.calendarRefreshTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("Calendar scheduled refresh starting...");
        await this.refreshCalendarEvents();
        schedule();
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug(`Calendar refresh scheduled every ${intervalMin} min`);
  }
  // ── Calendar event write helpers ──────────────────────────────────────────
  async applyCalendarEventUpdate(calId, slotId) {
    var _a, _b;
    const pendingKey = `${calId}.${slotId}`;
    const pending = this.calendarEventPendingChanges.get(pendingKey);
    if (!pending) {
      return;
    }
    this.calendarEventPendingChanges.delete(pendingKey);
    if (!this.icloud) {
      this.log.warn("Calendar event update: iCloud not initialized");
      this.scheduleCalendarResyncIfIdle();
      return;
    }
    const basePath = `calendar.${calId}.${slotId}`;
    const [guidState, pGuidState, etagState] = await Promise.all([
      this.getStateAsync(`${basePath}.guid`),
      this.getStateAsync(`${basePath}.pGuid`),
      this.getStateAsync(`${basePath}.etag`)
    ]);
    const eventGuid = guidState == null ? void 0 : guidState.val;
    const calendarGuid = pGuidState == null ? void 0 : pGuidState.val;
    const etag = etagState == null ? void 0 : etagState.val;
    if (!eventGuid || !calendarGuid) {
      this.log.warn(`Calendar event update: missing guid or pGuid for ${basePath} \u2014 slot may be empty`);
      this.scheduleCalendarResyncIfIdle();
      return;
    }
    const resolved = {};
    const jsonVal = pending.fields.get("json");
    if (jsonVal != null) {
      try {
        const parsed = JSON.parse(String(jsonVal));
        const allowed = ["title", "startDate", "endDate", "allDay", "location", "description", "url", "alarms"];
        for (const key of allowed) {
          if (key in parsed) {
            resolved[key] = parsed[key];
          }
        }
      } catch {
        this.log.warn(`Calendar event update: invalid JSON in ${basePath}.json \u2014 ignoring`);
      }
    }
    for (const [field, val] of pending.fields.entries()) {
      if (field !== "json") {
        resolved[field] = val;
      }
    }
    const opts = {
      calendarGuid,
      eventGuid,
      etag: etag != null ? etag : void 0,
      ...resolved.title !== void 0 ? { title: String(resolved.title) } : {},
      ...resolved.startDate !== void 0 ? { startDate: new Date(Number(resolved.startDate)) } : {},
      ...resolved.endDate !== void 0 ? { endDate: new Date(Number(resolved.endDate)) } : {},
      ...resolved.allDay !== void 0 ? { allDay: Boolean(resolved.allDay) } : {},
      ...resolved.url !== void 0 ? { url: String(resolved.url) } : {},
      ...resolved.location !== void 0 ? { location: String(resolved.location) } : {},
      ...resolved.description !== void 0 ? { description: String(resolved.description) } : {},
      ...resolved.alarms !== void 0 ? { alarms: this.parseEventAlarmsJson(resolved.alarms) } : {}
    };
    this.log.info(`Updating calendar event ${eventGuid} in ${calendarGuid}\u2026`);
    this.calendarEventUpdatesInFlight++;
    try {
      const calService = this.icloud.getService("calendar");
      await calService.updateEvent(opts);
      this.log.info(`Calendar event ${eventGuid} updated`);
      for (const [field, stateId] of pending.stateIds.entries()) {
        const relId = stateId.startsWith(`${this.namespace}.`) ? stateId.slice(this.namespace.length + 1) : stateId;
        await this.setState(relId, (_a = pending.fields.get(field)) != null ? _a : null, true);
      }
    } catch (err) {
      this.log.error(`Failed to update calendar event ${eventGuid}: ${(_b = err == null ? void 0 : err.message) != null ? _b : String(err)}`);
    } finally {
      this.calendarEventUpdatesInFlight--;
      this.scheduleCalendarResyncIfIdle();
    }
  }
  /**
   * Schedules a calendar refresh only when no debounce timers, no in-flight API
   * calls, and no pending changes remain.  This ensures exactly one resync fires
   * after all batched event updates have been sent to Apple.
   */
  scheduleCalendarResyncIfIdle() {
    if (this.calendarEventUpdateTimers.size > 0 || this.calendarEventPendingChanges.size > 0 || this.calendarEventUpdatesInFlight > 0) {
      return;
    }
    if (this.calendarResyncTimer) {
      this.clearTimeout(this.calendarResyncTimer);
    }
    this.calendarResyncTimer = this.setTimeout(() => {
      this.calendarResyncTimer = null;
      this.refreshCalendarEvents().catch((err) => {
        var _a;
        this.log.warn(`Calendar post-edit refresh failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : String(err)}`);
      });
    }, 2e3);
  }
  parseEventAlarmsJson(val) {
    try {
      const arr = JSON.parse(String(val));
      if (!Array.isArray(arr)) {
        return [];
      }
      return arr.map((a) => {
        var _a, _b, _c, _d, _e, _f;
        const m = a;
        return {
          before: Boolean((_a = m.before) != null ? _a : true),
          weeks: Number((_b = m.weeks) != null ? _b : 0),
          days: Number((_c = m.days) != null ? _c : 0),
          hours: Number((_d = m.hours) != null ? _d : 0),
          minutes: Number((_e = m.minutes) != null ? _e : 0),
          seconds: Number((_f = m.seconds) != null ? _f : 0)
        };
      });
    } catch {
      return [];
    }
  }
  // ── Reminders helpers ─────────────────────────────────────────────────────
  async refreshReminders() {
    var _a, _b, _c;
    if (!this.icloud) {
      return;
    }
    try {
      const remService = this.icloud.getService("reminders");
      const isFirstCall = !this.remindersSyncMapLoaded;
      if (isFirstCall) {
        this.remindersSyncMapLoaded = true;
        try {
          const obj = await this.getObjectAsync("reminders");
          const syncMap = (_a = obj == null ? void 0 : obj.native) == null ? void 0 : _a.syncMap;
          if (syncMap && typeof syncMap === "object" && syncMap.syncToken) {
            remService.loadSyncMap(syncMap);
            this.log.debug(
              `Reminders: restored syncMap (${remService.lists.length} list(s), syncToken present)`
            );
          }
        } catch {
        }
      }
      const changed = await remService.refresh();
      if (changed) {
        const remObj = await this.getObjectAsync("reminders");
        await this.setObject("reminders", {
          ...remObj != null ? remObj : {},
          type: "folder",
          common: { ...(_b = remObj == null ? void 0 : remObj.common) != null ? _b : {}, name: "Reminders" },
          native: { syncMap: remService.exportSyncMap() }
        });
      }
      if (!changed && !isFirstCall) {
        this.log.debug("Reminders refresh: no changes, skipping state updates");
        return;
      }
      await this.writeReminderStates(remService);
      if (isFirstCall) {
        const totalCount = [...remService.remindersByList.values()].reduce((s, l) => s + l.length, 0);
        const openCount = [...remService.remindersByList.values()].flat().filter((r) => !r.completed && !r.deleted).length;
        this.log.info(
          `Reminders ready \u2014 ${remService.lists.length} list(s), ${openCount} open / ${totalCount} total`
        );
      }
    } catch (err) {
      const msg = (_c = err == null ? void 0 : err.message) != null ? _c : String(err);
      this.log.warn(`Reminders refresh failed: ${msg}`);
      if (msg.includes("Invalid global session") || msg.includes("INVALID_GLOBAL_SESSION")) {
        this.triggerSessionRecovery(msg);
      }
    }
  }
  async persistRemindersSyncMap() {
    var _a;
    if (!this.icloud || !this.remindersSyncMapLoaded) {
      return;
    }
    try {
      const remService = this.icloud.getService("reminders");
      const remObj = await this.getObjectAsync("reminders");
      await this.setObject("reminders", {
        ...remObj != null ? remObj : {},
        type: "folder",
        common: { ...(_a = remObj == null ? void 0 : remObj.common) != null ? _a : {}, name: "Reminders" },
        native: { syncMap: remService.exportSyncMap() }
      });
    } catch {
    }
  }
  async writeReminderStates(remService) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const maxCount = Math.max(1, Math.floor((_a = this.config.remindersItemCount) != null ? _a : 10));
    const filterMode = (_b = this.config.remindersFilter) != null ? _b : "due";
    const showCompleted = (_c = this.config.remindersShowCompleted) != null ? _c : false;
    const now = Date.now();
    await this.extendObject("reminders", {
      type: "folder",
      common: { name: "Reminders" },
      native: {}
    });
    await this.extendObject("reminders.lastSync", {
      type: "state",
      common: {
        name: "Last Sync",
        type: "number",
        role: "value.time",
        read: true,
        write: false
      },
      native: {}
    });
    const activeListIds = /* @__PURE__ */ new Set();
    for (const list of remService.lists) {
      const listId = this.sanitizeCalendarId(list.title);
      activeListIds.add(listId);
      await this.extendObject(`reminders.${listId}`, {
        type: "folder",
        common: { name: list.title },
        native: {}
      });
      for (const s of REMINDER_COLLECTION_STATES) {
        await this.extendObject(`reminders.${listId}.${s.id}`, {
          type: "state",
          common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
          native: {}
        });
      }
      await this.setStateIfChanged(`reminders.${listId}.id`, (_d = list.id) != null ? _d : "");
      await this.setStateIfChanged(`reminders.${listId}.color`, (_e = list.color) != null ? _e : "");
      await this.setStateIfChanged(`reminders.${listId}.count`, (_f = list.count) != null ? _f : 0);
      const allOpen = ((_g = remService.remindersByList.get(list.id)) != null ? _g : []).filter((r) => !r.completed && !r.deleted);
      let items;
      if (filterMode === "due") {
        items = allOpen.filter((r) => {
          var _a2, _b2;
          const earliest = Math.min((_a2 = r.startDate) != null ? _a2 : Infinity, (_b2 = r.dueDate) != null ? _b2 : Infinity);
          return earliest <= now;
        });
      } else {
        items = allOpen;
      }
      items.sort((a, b) => {
        var _a2, _b2;
        const ta = (_a2 = a.dueDate) != null ? _a2 : Infinity;
        const tb = (_b2 = b.dueDate) != null ? _b2 : Infinity;
        return ta - tb;
      });
      await this.writeReminderSlots(`reminders.${listId}`, items, maxCount);
      if (showCompleted) {
        const completedItems = ((_h = remService.remindersByList.get(list.id)) != null ? _h : []).filter((r) => r.completed && !r.deleted).sort((a, b) => {
          var _a2, _b2, _c2, _d2;
          const ta = (_b2 = (_a2 = a.completedDate) != null ? _a2 : a.lastModifiedDate) != null ? _b2 : 0;
          const tb = (_d2 = (_c2 = b.completedDate) != null ? _c2 : b.lastModifiedDate) != null ? _d2 : 0;
          return tb - ta;
        });
        await this.extendObject(`reminders.${listId}.completed`, {
          type: "folder",
          common: { name: "Completed" },
          native: {}
        });
        await this.writeReminderSlots(`reminders.${listId}.completed`, completedItems, maxCount);
      }
    }
    await this.cleanupRemindersObjects(activeListIds, maxCount, showCompleted);
    await this.setState("reminders.lastSync", Date.now(), true);
    this.log.debug(
      `Reminders refresh done \u2014 ${remService.lists.length} list(s), ${[...remService.remindersByList.values()].reduce((s, l) => s + l.length, 0)} reminder(s)`
    );
  }
  async writeReminderSlots(basePath, items, maxCount) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    for (let i = 1; i <= maxCount; i++) {
      const slotId = String(i).padStart(6, "0");
      const slotPath = `${basePath}.${slotId}`;
      const rem = items[i - 1];
      await this.extendObject(slotPath, {
        type: "folder",
        common: { name: (_a = rem == null ? void 0 : rem.title) != null ? _a : `Reminder ${slotId}` },
        native: {}
      });
      for (const s of REMINDER_ITEM_STATES) {
        await this.extendObject(`${slotPath}.${s.id}`, {
          type: "state",
          common: {
            name: s.name,
            type: s.type,
            role: s.role,
            read: true,
            write: (_b = s.write) != null ? _b : false
          },
          native: {}
        });
      }
      if (rem) {
        await this.setStateIfChanged(`${slotPath}.title`, (_c = rem.title) != null ? _c : "");
        await this.setStateIfChanged(`${slotPath}.description`, (_d = rem.description) != null ? _d : "");
        await this.setStateIfChanged(`${slotPath}.id`, (_e = rem.id) != null ? _e : "");
        await this.setStateIfChanged(`${slotPath}.listId`, (_f = rem.listId) != null ? _f : "");
        await this.setStateIfChanged(`${slotPath}.priority`, (_g = rem.priority) != null ? _g : 0);
        await this.setStateIfChanged(`${slotPath}.flagged`, (_h = rem.flagged) != null ? _h : false);
        await this.setStateIfChanged(`${slotPath}.allDay`, (_i = rem.allDay) != null ? _i : false);
        await this.setStateIfChanged(`${slotPath}.completed`, (_j = rem.completed) != null ? _j : false);
        await this.setStateIfChanged(`${slotPath}.dueDate`, (_k = rem.dueDate) != null ? _k : null);
        await this.setStateIfChanged(`${slotPath}.startDate`, (_l = rem.startDate) != null ? _l : null);
        await this.setStateIfChanged(`${slotPath}.completedDate`, (_m = rem.completedDate) != null ? _m : null);
        await this.setStateIfChanged(`${slotPath}.createdDate`, (_n = rem.createdDate) != null ? _n : null);
        await this.setStateIfChanged(`${slotPath}.lastModifiedDate`, (_o = rem.lastModifiedDate) != null ? _o : null);
      } else {
        for (const s of REMINDER_ITEM_STATES) {
          await this.setStateIfChanged(`${slotPath}.${s.id}`, null);
        }
      }
    }
  }
  async cleanupRemindersObjects(activeListIds, maxCount, showCompleted) {
    const prefix = `${this.namespace}.reminders.`;
    const existing = await this.getObjectViewAsync("system", "folder", {
      startkey: prefix,
      endkey: `${prefix}\u9999`
    });
    for (const row of existing.rows) {
      const suffix = row.id.slice(prefix.length);
      const parts = suffix.split(".");
      if (parts.length === 1) {
        if (!activeListIds.has(parts[0])) {
          this.log.info(`Reminders cleanup: removing deleted list "${parts[0]}"`);
          await this.delObjectAsync(row.id, { recursive: true });
        }
      } else if (parts.length === 2) {
        if (parts[1] === "completed") {
          if (!showCompleted && activeListIds.has(parts[0])) {
            this.log.info(`Reminders cleanup: removing completed folder in list "${parts[0]}"`);
            await this.delObjectAsync(row.id, { recursive: true });
          }
        } else {
          const slotNum = parseInt(parts[1], 10);
          if (activeListIds.has(parts[0]) && !isNaN(slotNum) && slotNum > maxCount) {
            this.log.info(`Reminders cleanup: removing excess slot ${parts[1]} in list "${parts[0]}"`);
            await this.delObjectAsync(row.id, { recursive: true });
          }
        }
      } else if (parts.length === 3 && parts[1] === "completed") {
        const slotNum = parseInt(parts[2], 10);
        if (activeListIds.has(parts[0]) && !isNaN(slotNum) && slotNum > maxCount) {
          this.log.info(
            `Reminders cleanup: removing excess completed slot ${parts[2]} in list "${parts[0]}"`
          );
          await this.delObjectAsync(row.id, { recursive: true });
        }
      }
    }
  }
  scheduleRemindersRefresh() {
    var _a;
    if (this.remindersRefreshTimer) {
      this.clearTimeout(this.remindersRefreshTimer);
      this.remindersRefreshTimer = null;
    }
    let intervalMin = Math.floor((_a = this.config.remindersInterval) != null ? _a : 60);
    if (!Number.isFinite(intervalMin) || intervalMin < 5) {
      this.log.warn(
        `Reminders interval is ${this.config.remindersInterval} \u2014 value below 5 minutes, falling back to 60 minutes`
      );
      intervalMin = 60;
    } else if (intervalMin > 1440) {
      this.log.warn(`Reminders interval is ${intervalMin} minutes \u2014 clamping to 1440 minutes`);
      intervalMin = 1440;
    }
    const INTERVAL_MS = intervalMin * 60 * 1e3;
    const schedule = () => {
      this.remindersRefreshTimer = this.setTimeout(async () => {
        this.remindersRefreshTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("Reminders scheduled refresh starting...");
        await this.refreshReminders();
        schedule();
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug(`Reminders refresh scheduled every ${intervalMin} min`);
  }
  // ── Contacts helpers ──────────────────────────────────────────────────────
  async refreshContacts() {
    var _a;
    if (!this.icloud) {
      return;
    }
    try {
      const contactsService = this.icloud.getService("contacts");
      await contactsService.refresh();
      await this.writeContactsMetaStates(contactsService);
      if (this.config.contactsWriteStates) {
        await this.writeContactStates(contactsService);
      }
      if (this.config.contactsBirthdayStates) {
        await this.writeBirthdayStates(contactsService);
      }
      this.log.debug(
        `Contacts refresh done \u2014 ${contactsService.contacts.length} contact(s), ${contactsService.groups.length} group(s)`
      );
    } catch (err) {
      const msg = (_a = err == null ? void 0 : err.message) != null ? _a : String(err);
      this.log.warn(`Contacts refresh failed: ${msg}`);
    }
  }
  async writeContactsMetaStates(contactsService) {
    await this.extendObject("contacts", {
      type: "folder",
      common: { name: "Contacts" },
      native: {}
    });
    await this.extendObject("contacts.list", {
      type: "folder",
      common: { name: "Contact list" },
      native: {}
    });
    await this.extendObject("contacts.count", {
      type: "state",
      common: { name: "Contact count", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("contacts.groupCount", {
      type: "state",
      common: { name: "Group count", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("contacts.lastSync", {
      type: "state",
      common: { name: "Last Sync", type: "number", role: "value.time", read: true, write: false },
      native: {}
    });
    await this.setStateIfChanged("contacts.count", contactsService.contacts.length);
    await this.setStateIfChanged("contacts.groupCount", contactsService.groups.length);
    await this.setState("contacts.lastSync", Date.now(), true);
  }
  async writeContactStates(contactsService) {
    const configuredGroups = Array.isArray(this.config.contactsGroups) ? this.config.contactsGroups.filter((g) => typeof g === "string" && g.trim() !== "") : [];
    this.log.debug(
      `Contacts writeStates: configuredGroups=${JSON.stringify(configuredGroups)}, available groups=${JSON.stringify(contactsService.groups.map((g) => `${g.name}(${g.contactIds.length})`))}, total contacts in memory=${contactsService.contacts.length}`
    );
    const contacts = configuredGroups.length ? contactsService.getContactsByGroups(configuredGroups) : contactsService.contacts;
    this.log.debug(
      `Contacts writeStates: ${contacts.length} contact(s) will be written to states${configuredGroups.length ? ` (filtered by groups: ${configuredGroups.join(", ")})` : " (no filter)"}`
    );
    const activeContactIds = /* @__PURE__ */ new Set();
    for (const contact of contacts) {
      const safeId = this.sanitizeCalendarId(contact.contactId);
      activeContactIds.add(safeId);
      const displayCity = contact.city ? ` (${contact.city})` : "";
      const displayName = `${contact.fullName || contact.companyName || contact.contactId}${displayCity}`;
      await this.extendObject(`contacts.list.${safeId}`, {
        type: "folder",
        common: { name: displayName },
        native: { contactId: contact.contactId }
      });
      for (const s of CONTACT_ITEM_STATES) {
        await this.extendObject(`contacts.list.${safeId}.${s.id}`, {
          type: "state",
          common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
          native: {}
        });
      }
      await this.setStateIfChanged(`contacts.list.${safeId}.contactId`, contact.contactId);
      await this.setStateIfChanged(`contacts.list.${safeId}.fullName`, contact.fullName);
      await this.setStateIfChanged(`contacts.list.${safeId}.firstName`, contact.firstName);
      await this.setStateIfChanged(`contacts.list.${safeId}.lastName`, contact.lastName);
      await this.setStateIfChanged(`contacts.list.${safeId}.companyName`, contact.companyName);
      await this.setStateIfChanged(`contacts.list.${safeId}.nickname`, contact.nickname);
      await this.setStateIfChanged(`contacts.list.${safeId}.birthday`, contact.birthday);
      await this.setStateIfChanged(`contacts.list.${safeId}.jobTitle`, contact.jobTitle);
      await this.setStateIfChanged(`contacts.list.${safeId}.department`, contact.department);
      await this.setStateIfChanged(`contacts.list.${safeId}.city`, contact.city);
      await this.setStateIfChanged(`contacts.list.${safeId}.phones`, JSON.stringify(contact.phones));
      await this.setStateIfChanged(`contacts.list.${safeId}.emails`, JSON.stringify(contact.emails));
      await this.setStateIfChanged(
        `contacts.list.${safeId}.streetAddresses`,
        JSON.stringify(contact.streetAddresses)
      );
      await this.setStateIfChanged(`contacts.list.${safeId}.notes`, contact.notes);
      await this.setStateIfChanged(`contacts.list.${safeId}.groups`, JSON.stringify(contact.groups));
      await this.setStateIfChanged(`contacts.list.${safeId}.isMe`, contact.isMe);
    }
    await this.cleanupContactsObjects(activeContactIds);
    this.log.debug(`Contacts refresh done \u2014 ${contacts.length} contact(s) written to states`);
  }
  async cleanupContactsObjects(activeContactIds) {
    const prefix = `${this.namespace}.contacts.`;
    const existing = await this.getObjectViewAsync("system", "folder", {
      startkey: prefix,
      endkey: `${prefix}\u9999`
    });
    for (const row of existing.rows) {
      const suffix = row.id.slice(prefix.length);
      const parts = suffix.split(".");
      if (parts.length === 2 && parts[0] === "list") {
        if (!activeContactIds.has(parts[1])) {
          this.log.info(`Contacts cleanup: removing contact "${parts[1]}"`);
          await this.delObjectAsync(row.id, { recursive: true });
        }
      }
    }
  }
  async writeBirthdayStates(contactsService) {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const todayStart = new Date(year, now.getMonth(), now.getDate());
    const tomorrowStart = new Date(year, now.getMonth(), now.getDate() + 1);
    const sevenDaysEnd = new Date(year, now.getMonth(), now.getDate() + 7);
    const todayList = [];
    const tomorrowList = [];
    const next7List = [];
    for (const contact of contactsService.contacts) {
      if (!contact.birthday) {
        continue;
      }
      const withYear = /^(\d{4})-(\d{2})-(\d{2})/.exec(contact.birthday);
      const yearless = /^--(\d{2})-(\d{2})$/.exec(contact.birthday);
      let birthYear;
      let birthMonth;
      let birthDay;
      if (withYear) {
        birthYear = parseInt(withYear[1], 10);
        birthMonth = parseInt(withYear[2], 10) - 1;
        birthDay = parseInt(withYear[3], 10);
      } else if (yearless) {
        birthYear = 0;
        birthMonth = parseInt(yearless[1], 10) - 1;
        birthDay = parseInt(yearless[2], 10);
      } else {
        continue;
      }
      let birthdayDate = new Date(year, birthMonth, birthDay);
      if (birthdayDate < todayStart) {
        birthdayDate = new Date(year + 1, birthMonth, birthDay);
      }
      const effectiveYear = birthdayDate.getFullYear();
      const age = birthYear > 1 ? effectiveYear - birthYear : null;
      const entry = { ...contact, age };
      const ts = birthdayDate.getTime();
      if (ts === todayStart.getTime()) {
        todayList.push(entry);
      }
      if (ts === tomorrowStart.getTime()) {
        tomorrowList.push(entry);
      }
      if (birthdayDate >= todayStart && birthdayDate < sevenDaysEnd) {
        next7List.push(entry);
      }
    }
    await this.extendObject("contacts.birthdays", {
      type: "folder",
      common: { name: "Birthdays" },
      native: {}
    });
    await this.extendObject("contacts.birthdays.today", {
      type: "state",
      common: { name: "Birthdays today", type: "string", role: "json", read: true, write: false },
      native: {}
    });
    await this.extendObject("contacts.birthdays.tomorrow", {
      type: "state",
      common: { name: "Birthdays tomorrow", type: "string", role: "json", read: true, write: false },
      native: {}
    });
    await this.extendObject("contacts.birthdays.next7days", {
      type: "state",
      common: { name: "Birthdays next 7 days", type: "string", role: "json", read: true, write: false },
      native: {}
    });
    await this.setStateIfChanged("contacts.birthdays.today", JSON.stringify(todayList));
    await this.setStateIfChanged("contacts.birthdays.tomorrow", JSON.stringify(tomorrowList));
    await this.setStateIfChanged("contacts.birthdays.next7days", JSON.stringify(next7List));
  }
  async cleanupBirthdayStates() {
    const obj = await this.getObjectAsync("contacts.birthdays");
    if (obj) {
      await this.delObjectAsync("contacts.birthdays", { recursive: true });
    }
  }
  scheduleContactsRefresh() {
    var _a;
    if (this.contactsRefreshTimer) {
      this.clearTimeout(this.contactsRefreshTimer);
      this.contactsRefreshTimer = null;
    }
    let intervalMin = Math.floor((_a = this.config.contactsInterval) != null ? _a : 60);
    if (!Number.isFinite(intervalMin) || intervalMin < 30) {
      this.log.warn(
        `Contacts interval is ${this.config.contactsInterval} \u2014 value below 30 minutes, falling back to 60 minutes`
      );
      intervalMin = 60;
    } else if (intervalMin > 1440) {
      this.log.warn(`Contacts interval is ${intervalMin} minutes \u2014 clamping to 1440 minutes`);
      intervalMin = 1440;
    }
    const INTERVAL_MS = intervalMin * 60 * 1e3;
    const schedule = () => {
      this.contactsRefreshTimer = this.setTimeout(async () => {
        this.contactsRefreshTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("Contacts scheduled refresh starting...");
        await this.refreshContacts();
        schedule();
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug(`Contacts refresh scheduled every ${intervalMin} min`);
  }
  // ── Notes helpers ─────────────────────────────────────────────────────────
  async refreshNotes() {
    var _a, _b, _c;
    if (!this.icloud) {
      return;
    }
    try {
      const notesService = this.icloud.getService("notes");
      const isFirstCall = !this.notesSyncMapLoaded;
      if (isFirstCall) {
        this.notesSyncMapLoaded = true;
        try {
          const obj = await this.getObjectAsync("notes");
          const syncMap = (_a = obj == null ? void 0 : obj.native) == null ? void 0 : _a.syncMap;
          if (syncMap && typeof syncMap === "object" && syncMap.syncToken) {
            notesService.loadSyncMap(syncMap);
            this.log.debug(
              `Notes: restored syncMap (${notesService.notes.length} note(s), syncToken present)`
            );
          }
        } catch {
        }
      }
      const changed = await notesService.refresh();
      if (changed) {
        const notesObj = await this.getObjectAsync("notes");
        await this.setObject("notes", {
          ...notesObj != null ? notesObj : {},
          type: "folder",
          common: { ...(_b = notesObj == null ? void 0 : notesObj.common) != null ? _b : {}, name: "Notes" },
          native: { syncMap: notesService.exportSyncMap() }
        });
      }
      if (!changed && !isFirstCall) {
        this.log.debug("Notes refresh: no changes, skipping state updates");
        return;
      }
      await this.writeNotesStates(notesService);
      if (isFirstCall) {
        this.log.info(
          `Notes ready \u2014 ${notesService.notes.length} note(s), ${notesService.folders.length} folder(s)`
        );
      }
    } catch (err) {
      const msg = (_c = err == null ? void 0 : err.message) != null ? _c : String(err);
      this.log.warn(`Notes refresh failed: ${msg}`);
    }
  }
  async persistNotesSyncMap() {
    var _a;
    if (!this.icloud || !this.notesSyncMapLoaded) {
      return;
    }
    try {
      const notesService = this.icloud.getService("notes");
      const notesObj = await this.getObjectAsync("notes");
      await this.setObject("notes", {
        ...notesObj != null ? notesObj : {},
        type: "folder",
        common: { ...(_a = notesObj == null ? void 0 : notesObj.common) != null ? _a : {}, name: "Notes" },
        native: { syncMap: notesService.exportSyncMap() }
      });
    } catch {
    }
  }
  async writeNotesStates(notesService) {
    const notes = notesService.notes;
    await this.extendObject("notes", {
      type: "folder",
      common: { name: "Notes" },
      native: {}
    });
    await this.extendObject("notes.count", {
      type: "state",
      common: { name: "Note count", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("notes.folderCount", {
      type: "state",
      common: { name: "Folder count", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("notes.lastSync", {
      type: "state",
      common: { name: "Last Sync", type: "number", role: "value.time", read: true, write: false },
      native: {}
    });
    await this.extendObject("notes.list", {
      type: "state",
      common: { name: "Notes (JSON)", type: "string", role: "json", read: true, write: false },
      native: {}
    });
    await this.extendObject("notes.textList", {
      type: "state",
      common: { name: "Notes text (string array JSON)", type: "string", role: "json", read: true, write: false },
      native: {}
    });
    const notesList = notes.map((n) => ({
      id: n.id,
      title: n.title,
      snippet: n.snippet,
      folderId: n.folderId,
      folderName: n.folderName,
      modifiedDate: n.modifiedDate,
      isLocked: n.isLocked,
      text: n.text
    }));
    notesList.sort((a, b) => {
      var _a, _b;
      return ((_a = b.modifiedDate) != null ? _a : 0) - ((_b = a.modifiedDate) != null ? _b : 0);
    });
    const textList = notes.filter((n) => n.text && !n.isLocked).sort((a, b) => {
      var _a, _b;
      return ((_a = b.modifiedDate) != null ? _a : 0) - ((_b = a.modifiedDate) != null ? _b : 0);
    }).map((n) => n.text);
    await this.setStateIfChanged("notes.count", notes.length);
    await this.setStateIfChanged("notes.folderCount", notesService.folders.length);
    await this.setStateIfChanged("notes.list", JSON.stringify(notesList));
    await this.setStateIfChanged("notes.textList", JSON.stringify(textList));
    await this.setState("notes.lastSync", Date.now(), true);
    this.log.debug(`Notes refresh done \u2014 ${notes.length} note(s), ${notesService.folders.length} folder(s)`);
  }
  scheduleNotesRefresh() {
    var _a;
    if (this.notesRefreshTimer) {
      this.clearTimeout(this.notesRefreshTimer);
      this.notesRefreshTimer = null;
    }
    let intervalMin = Math.floor((_a = this.config.notesInterval) != null ? _a : 60);
    if (!Number.isFinite(intervalMin) || intervalMin < 15) {
      this.log.warn(
        `Notes interval is ${this.config.notesInterval} \u2014 value below 15 minutes, falling back to 60 minutes`
      );
      intervalMin = 60;
    } else if (intervalMin > 1440) {
      this.log.warn(`Notes interval is ${intervalMin} minutes \u2014 clamping to 1440 minutes`);
      intervalMin = 1440;
    }
    const INTERVAL_MS = intervalMin * 60 * 1e3;
    const schedule = () => {
      this.notesRefreshTimer = this.setTimeout(async () => {
        this.notesRefreshTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("Notes scheduled refresh starting...");
        await this.refreshNotes();
        schedule();
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug(`Notes refresh scheduled every ${intervalMin} min`);
  }
  // ── Photos helpers ────────────────────────────────────────────────────────
  async refreshPhotos() {
    var _a;
    if (!this.icloud) {
      return;
    }
    try {
      const photosService = this.icloud.getService("photos");
      if (this.photosFirstLoad) {
        const ready = await photosService.checkIndexingState();
        if (!ready) {
          this.log.warn("Photos: library is still indexing \u2014 metadata may be incomplete");
        }
      }
      await this.writePhotosStates(photosService);
      if (this.photosFirstLoad) {
        this.photosFirstLoad = false;
      }
    } catch (err) {
      const msg = (_a = err == null ? void 0 : err.message) != null ? _a : String(err);
      this.log.warn(`Photos refresh failed: ${msg}`);
    }
  }
  async writePhotosStates(photosService) {
    await this.extendObject("photos", {
      type: "channel",
      common: { name: "iCloud Photos" },
      native: {}
    });
    await this.extendObject("photos.lastSync", {
      type: "state",
      common: { name: "Last Sync", type: "number", role: "value.time", read: true, write: false },
      native: {}
    });
    await this.extendObject("photos.albumCount", {
      type: "state",
      common: { name: "Album Count", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("photos.photoCount", {
      type: "state",
      common: { name: "Total Photos", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("photos.videoCount", {
      type: "state",
      common: { name: "Total Videos", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("photos.favoriteCount", {
      type: "state",
      common: { name: "Favorites", type: "number", role: "value", read: true, write: false },
      native: {}
    });
    await this.extendObject("photos.albums", {
      type: "state",
      common: { name: "Albums (JSON)", type: "string", role: "json", read: true, write: false },
      native: {}
    });
    const summaries = await photosService.getAlbumSummaries();
    const albumCount = summaries.length;
    let photoCount = 0;
    let videoCount = 0;
    let favoriteCount = 0;
    for (const s of summaries) {
      if (s.name === "All Photos") {
        photoCount = s.photoCount;
      } else if (s.name === "Videos") {
        videoCount = s.photoCount;
      } else if (s.name === "Favorites") {
        favoriteCount = s.photoCount;
      }
    }
    await this.setStateIfChanged("photos.albumCount", albumCount);
    await this.setStateIfChanged("photos.photoCount", photoCount);
    await this.setStateIfChanged("photos.videoCount", videoCount);
    await this.setStateIfChanged("photos.favoriteCount", favoriteCount);
    await this.setStateIfChanged(
      "photos.albums",
      JSON.stringify(summaries.map((s) => ({ name: s.name, photoCount: s.photoCount })))
    );
    await this.setState("photos.lastSync", Date.now(), true);
    if (this.photosFirstLoad) {
      this.log.info(
        `Photos ready \u2014 ${albumCount} album(s), ${photoCount} photo(s), ${videoCount} video(s), ${favoriteCount} favorite(s)`
      );
    } else {
      this.log.debug(`Photos refresh done \u2014 ${albumCount} album(s), ${photoCount} photo(s)`);
    }
  }
  schedulePhotosRefresh() {
    var _a;
    if (this.photosRefreshTimer) {
      this.clearTimeout(this.photosRefreshTimer);
      this.photosRefreshTimer = null;
    }
    let intervalMin = Math.floor((_a = this.config.photosInterval) != null ? _a : 60);
    if (!Number.isFinite(intervalMin) || intervalMin < 15) {
      this.log.warn(
        `Photos interval is ${this.config.photosInterval} \u2014 value below 15 minutes, falling back to 60 minutes`
      );
      intervalMin = 60;
    } else if (intervalMin > 1440) {
      this.log.warn(`Photos interval is ${intervalMin} minutes \u2014 clamping to 1440 minutes`);
      intervalMin = 1440;
    }
    const INTERVAL_MS = intervalMin * 60 * 1e3;
    const schedule = () => {
      this.photosRefreshTimer = this.setTimeout(async () => {
        this.photosRefreshTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("Photos scheduled refresh starting...");
        this.icloud.getService("photos").resetAlbums();
        await this.refreshPhotos();
        schedule();
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug(`Photos refresh scheduled every ${intervalMin} min`);
  }
  // ── iCloud Drive helpers ──────────────────────────────────────────────────
  async refreshDrive() {
    var _a, _b, _c, _d, _e, _f;
    if (!this.icloud) {
      return;
    }
    try {
      const driveService = this.icloud.getService("drivews");
      const root = await driveService.getNode();
      await this.writeDriveStates(root);
      if (this.driveFirstLoad) {
        this.driveFirstLoad = false;
        this.log.info(
          `Drive ready \u2014 ${(_a = root.directChildrenCount) != null ? _a : 0} root item(s), ${(_b = root.fileCount) != null ? _b : 0} file(s) total`
        );
      }
    } catch (err) {
      const msg = (_c = err == null ? void 0 : err.message) != null ? _c : String(err);
      if (msg.includes("Missing PCS cookies") || msg.includes("PCS")) {
        this.log.info(`Drive refresh: PCS cookie issue detected, retrying after PCS refresh...`);
        try {
          await this.icloud.requestServiceAccess("iclouddrive");
          const driveService = this.icloud.getService("drivews");
          const root = await driveService.getNode();
          await this.writeDriveStates(root);
          if (this.driveFirstLoad) {
            this.driveFirstLoad = false;
            this.log.info(
              `Drive ready (after PCS retry) \u2014 ${(_d = root.directChildrenCount) != null ? _d : 0} root item(s), ${(_e = root.fileCount) != null ? _e : 0} file(s) total`
            );
          }
          return;
        } catch (retryErr) {
          const retryMsg = (_f = retryErr == null ? void 0 : retryErr.message) != null ? _f : String(retryErr);
          this.log.warn(`Drive refresh failed after PCS retry: ${retryMsg}`);
        }
      } else {
        this.log.warn(`Drive refresh failed: ${msg}`);
      }
    }
  }
  async writeDriveStates(root) {
    var _a, _b, _c, _d, _e, _f, _g;
    await this.extendObject("drive", {
      type: "channel",
      common: { name: "iCloud Drive" },
      native: {}
    });
    await this.extendObject("drive.lastSync", {
      type: "state",
      common: {
        name: "Last Sync",
        type: "number",
        role: "value.time",
        read: true,
        write: false
      },
      native: {}
    });
    const vals = {
      name: (_a = root.name) != null ? _a : "root",
      docwsid: (_b = root.docwsid) != null ? _b : "",
      drivewsid: (_c = root.nodeId) != null ? _c : "",
      fileCount: (_d = root.fileCount) != null ? _d : 0,
      directChildrenCount: (_e = root.directChildrenCount) != null ? _e : 0,
      dateCreated: root.dateCreated ? root.dateCreated.getTime() : 0,
      etag: (_f = root.etag) != null ? _f : "",
      lastRefresh: Date.now()
    };
    for (const s of DRIVE_ROOT_STATES) {
      await this.extendObject(`drive.${s.id}`, {
        type: "state",
        common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
        native: {}
      });
      const v = vals[s.id];
      if (v !== void 0) {
        await this.setStateIfChanged(`drive.${s.id}`, v);
      }
    }
    await this.extendObject("drive.rootItems", {
      type: "state",
      common: { name: "Root Items (JSON)", type: "string", role: "json", read: true, write: false },
      native: {}
    });
    const items = ((_g = root.items) != null ? _g : []).map((item) => {
      var _a2;
      return {
        name: item.extension ? `${item.name}.${item.extension}` : item.name,
        type: item.type,
        drivewsid: item.drivewsid,
        docwsid: item.docwsid,
        size: (_a2 = item.size) != null ? _a2 : 0,
        dateModified: item.dateModified ? new Date(item.dateModified).getTime() : null,
        etag: item.etag
      };
    });
    await this.setStateIfChanged("drive.rootItems", JSON.stringify(items));
    await this.setState("drive.lastSync", Date.now(), true);
  }
  getDriveService() {
    if (!this.icloud) {
      throw new Error("iCloud not connected");
    }
    return this.icloud.getService("drivews");
  }
  // ── Account Storage helpers ───────────────────────────────────────────────
  async refreshAccountStorage() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    if (!this.icloud) {
      return;
    }
    try {
      const storage = await this.icloud.getStorageUsage(true);
      const info = storage.storageUsageInfo;
      const quota = storage.quotaStatus;
      const used = (_a = info.usedStorageInBytes) != null ? _a : 0;
      const total = (_b = info.totalStorageInBytes) != null ? _b : 0;
      const available = total - used;
      const usedPercent = total > 0 ? Math.round(used / total * 1e3) / 10 : 0;
      const toMB = (bytes) => Math.round(bytes / 1024 / 1024);
      await this.extendObject("account.storage.lastSync", {
        type: "state",
        common: {
          name: "Last Sync",
          type: "number",
          role: "value.time",
          read: true,
          write: false
        },
        native: {}
      });
      await this.setStateIfChanged("account.storage.usedMB", toMB(used));
      await this.setStateIfChanged("account.storage.totalMB", toMB(total));
      await this.setStateIfChanged("account.storage.availableMB", toMB(available));
      await this.setStateIfChanged("account.storage.usedPercent", usedPercent);
      await this.setStateIfChanged("account.storage.overQuota", (_c = quota.overQuota) != null ? _c : false);
      await this.setStateIfChanged("account.storage.almostFull", (_d = quota["almost-full"]) != null ? _d : false);
      await this.setStateIfChanged("account.storage.paidQuota", (_e = quota.paidQuota) != null ? _e : false);
      for (const media of (_f = storage.storageUsageByMedia) != null ? _f : []) {
        const rawKey = (_g = media.mediaKey) != null ? _g : "";
        if (!rawKey) {
          continue;
        }
        const mediaStateId = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "_");
        await this.extendObject(`account.storage.byMedia.${mediaStateId}`, {
          type: "state",
          common: {
            name: (_h = media.displayLabel) != null ? _h : rawKey,
            type: "number",
            role: "value",
            unit: "MB",
            read: true,
            write: false
          },
          native: {}
        });
        await this.setStateIfChanged(
          `account.storage.byMedia.${mediaStateId}`,
          media.usageInBytes != null ? toMB(media.usageInBytes) : null
        );
      }
      const fam = storage.familyStorageUsageInfo;
      if (fam) {
        await this.extendObject("account.storage.family.totalMB", {
          type: "state",
          common: {
            name: "Family Total Storage",
            type: "number",
            role: "value",
            unit: "MB",
            read: true,
            write: false
          },
          native: {}
        });
        await this.setStateIfChanged("account.storage.family.totalMB", toMB((_i = fam.usageInBytes) != null ? _i : 0));
        for (const member of (_j = fam.familyMembers) != null ? _j : []) {
          const memberId = ((_m = (_l = member.id) != null ? _l : (_k = member.dsid) == null ? void 0 : _k.toString()) != null ? _m : "").replace(/[^a-z0-9]/gi, "_");
          if (!memberId) {
            continue;
          }
          await this.extendObject(`account.storage.family.${memberId}`, {
            type: "state",
            common: {
              name: (_o = (_n = member.fullName) != null ? _n : member.appleId) != null ? _o : memberId,
              type: "number",
              role: "value",
              unit: "MB",
              read: true,
              write: false
            },
            native: {}
          });
          await this.setStateIfChanged(
            `account.storage.family.${memberId}`,
            member.usageInBytes != null ? toMB(member.usageInBytes) : null
          );
        }
      }
      await this.setState("account.storage.lastSync", Date.now(), true);
      if (this.accountStorageFirstLoad) {
        this.accountStorageFirstLoad = false;
        const quotaNote = quota.overQuota ? " \u2014 OVER QUOTA" : quota["almost-full"] ? " \u2014 almost full" : "";
        this.log.info(
          `Account storage ready \u2014 ${toMB(used)} / ${toMB(total)} MB used (${usedPercent}%)${quotaNote}`
        );
      } else {
        this.log.debug(`Account storage: ${toMB(used)} / ${toMB(total)} MB (${usedPercent}%)`);
      }
    } catch (err) {
      this.log.warn(`Account storage refresh failed: ${(_p = err == null ? void 0 : err.message) != null ? _p : String(err)}`);
    }
  }
  scheduleAccountStorageRefresh() {
    var _a;
    if (this.accountStorageRefreshTimer) {
      this.clearTimeout(this.accountStorageRefreshTimer);
      this.accountStorageRefreshTimer = null;
    }
    let intervalMin = Math.floor((_a = this.config.accountStorageInterval) != null ? _a : 60);
    if (!Number.isFinite(intervalMin) || intervalMin < 30) {
      this.log.warn(
        `Account storage interval is ${this.config.accountStorageInterval} \u2014 value below 30 minutes, falling back to 60 minutes`
      );
      intervalMin = 60;
    } else if (intervalMin > 1440) {
      this.log.warn(`Account storage interval is ${intervalMin} minutes \u2014 clamping to 1440 minutes`);
      intervalMin = 1440;
    }
    const INTERVAL_MS = intervalMin * 60 * 1e3;
    const schedule = () => {
      this.accountStorageRefreshTimer = this.setTimeout(async () => {
        this.accountStorageRefreshTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("Account storage scheduled refresh starting...");
        await this.refreshAccountStorage();
        schedule();
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug(`Account storage refresh scheduled every ${intervalMin} min`);
  }
  /**
   * Schedules a periodic lightweight session keep-alive call to Apple's /validate endpoint.
   * Mirrors the background-monitor pattern from pyicloud's FindMyiPhoneServiceManager:
   * periodically confirms the session is still accepted by Apple and triggers a full
   * re-authentication if it has expired — before any actual service call fails.
   */
  scheduleSessionKeepAlive() {
    if (this.sessionKeepAliveTimer) {
      this.clearTimeout(this.sessionKeepAliveTimer);
      this.sessionKeepAliveTimer = null;
    }
    const INTERVAL_MS = 6 * 60 * 60 * 1e3;
    const schedule = () => {
      this.sessionKeepAliveTimer = this.setTimeout(async () => {
        this.sessionKeepAliveTimer = null;
        if (!this.icloud) {
          return;
        }
        this.log.debug("[session keepalive] Validating iCloud session...");
        const valid = await this.icloud.validateSession();
        if (valid) {
          this.log.debug("[session keepalive] Session is still valid");
          schedule();
        } else {
          this.log.warn("[session keepalive] Session validation failed \u2014 triggering re-authentication");
          this.triggerSessionRecovery("session keepalive: /validate returned non-200");
        }
      }, INTERVAL_MS);
    };
    schedule();
    this.log.debug("Session keep-alive scheduled every 6 hours");
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    const persistAndCleanup = async () => {
      await this.persistRemindersSyncMap();
      await this.persistNotesSyncMap();
    };
    persistAndCleanup().catch(() => {
    }).finally(() => {
      try {
        if (this.findMyRefreshTimer) {
          this.clearTimeout(this.findMyRefreshTimer);
          this.findMyRefreshTimer = null;
        }
        if (this.calendarRefreshTimer) {
          this.clearTimeout(this.calendarRefreshTimer);
          this.calendarRefreshTimer = null;
        }
        for (const t of this.calendarEventUpdateTimers.values()) {
          this.clearTimeout(t);
        }
        this.calendarEventUpdateTimers.clear();
        this.calendarEventPendingChanges.clear();
        if (this.calendarResyncTimer) {
          this.clearTimeout(this.calendarResyncTimer);
          this.calendarResyncTimer = null;
        }
        if (this.remindersRefreshTimer) {
          this.clearTimeout(this.remindersRefreshTimer);
          this.remindersRefreshTimer = null;
        }
        if (this.contactsRefreshTimer) {
          this.clearTimeout(this.contactsRefreshTimer);
          this.contactsRefreshTimer = null;
        }
        if (this.notesRefreshTimer) {
          this.clearTimeout(this.notesRefreshTimer);
          this.notesRefreshTimer = null;
        }
        if (this.photosRefreshTimer) {
          this.clearTimeout(this.photosRefreshTimer);
          this.photosRefreshTimer = null;
        }
        if (this.driveRefreshTimer) {
          this.clearTimeout(this.driveRefreshTimer);
          this.driveRefreshTimer = null;
        }
        if (this.driveSyncTimer) {
          this.clearTimeout(this.driveSyncTimer);
          this.driveSyncTimer = null;
        }
        if (this.accountStorageRefreshTimer) {
          this.clearTimeout(this.accountStorageRefreshTimer);
          this.accountStorageRefreshTimer = null;
        }
        if (this.sessionKeepAliveTimer) {
          this.clearTimeout(this.sessionKeepAliveTimer);
          this.sessionKeepAliveTimer = null;
        }
        if (this.icloud) {
          this.icloud.removeAllListeners();
          this.icloud = null;
        }
      } catch {
      }
      callback();
    });
  }
  /**
   * Is called if a subscribed state changes
   *
   * @param id - State ID
   * @param state - State object
   */
  onStateChange(id, state) {
    var _a;
    if (!state) {
      this.log.debug(`State deleted: ${id}`);
      return;
    }
    if (state.ack) {
      return;
    }
    this.log.debug(`Command received: ${id} = "${state.val}"`);
    if (id === `${this.namespace}.mfa.code`) {
      const raw = String((_a = state.val) != null ? _a : "").trim();
      this.log.debug(`MFA code value received: "${raw}" (length: ${raw.length})`);
      if (raw.length === 0) {
        this.log.debug("Empty MFA code \u2014 ignoring");
        return;
      }
      if (!/^\d{6}$/.test(raw)) {
        this.log.warn(`Invalid MFA code: "${raw}" \u2014 must be exactly 6 digits, got ${raw.length} characters`);
        return;
      }
      if (!this.icloud) {
        this.log.warn("MFA code received but iCloud service is not initialized");
        return;
      }
      const status = this.icloud.status;
      if (status !== "MfaRequested") {
        this.log.warn(
          `MFA code received but iCloud status is "${status}" (expected "MfaRequested") \u2014 submitting anyway`
        );
      }
      this.log.info(`Submitting MFA code (iCloud status: ${status})`);
      this.icloud.provideMfaCode(raw).catch((err) => {
        var _a2;
        this.log.error(`Failed to submit MFA code: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
      return;
    }
    if (id === `${this.namespace}.mfa.requestSmsCode` && state.val === true) {
      if (!this.icloud) {
        this.log.warn("SMS request received but iCloud service is not initialized");
        return;
      }
      if (this.icloud.status !== "MfaRequested") {
        this.log.warn(`SMS request received but iCloud status is "${this.icloud.status}" \u2014 not in MFA state`);
        return;
      }
      this.log.info("Requesting MFA code via SMS...");
      this.icloud.requestSmsMfaCode().then(() => {
        this.log.info("SMS code requested \u2014 check your phone and enter the code into mfa.code");
      }).catch((err) => {
        var _a2;
        this.log.error(`Failed to request SMS code: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
      void this.setState("mfa.requestSmsCode", false, true);
      return;
    }
    const pingMatch = id.match(/^[^.]+\.[^.]+\.findme\.(\d{6})\.ping$/);
    if (pingMatch) {
      if (!this.icloud) {
        this.log.warn("Ping command received but iCloud service is not initialized");
        return;
      }
      const numericId = pingMatch[1];
      let apiId;
      for (const [k, v] of this.findMyIdMap.entries()) {
        if (v === numericId) {
          apiId = k;
          break;
        }
      }
      if (!apiId) {
        this.log.warn(`Ping: could not find Apple device id for folder ${numericId}`);
        return;
      }
      this.log.info(`Ping: sending play-sound to device ${numericId} (${apiId})`);
      this.icloud.getService("findme").playSound(apiId).then(() => {
        this.log.info(`Ping: play-sound sent to ${numericId}`);
      }).catch((err) => {
        var _a2;
        this.log.error(`Ping failed for ${numericId}: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
    }
    if (id === `${this.namespace}.findme.refresh` && state.val === true) {
      if (this.findMyRefreshing) {
        this.log.debug("FindMy manual refresh requested but a refresh is already running \u2014 ignoring");
        return;
      }
      this.log.info("FindMy manual refresh triggered via state");
      if (this.findMyRefreshTimer) {
        this.clearTimeout(this.findMyRefreshTimer);
        this.findMyRefreshTimer = null;
      }
      this.resolveLocationPoints().then(async (locationPoints) => {
        await this.refreshFindMyDevices(locationPoints);
        this.scheduleFindMyRefresh(locationPoints);
      }).catch((err) => {
        var _a2;
        this.log.error(`FindMy manual refresh failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
      return;
    }
    const calEventMatch = id.match(
      /^[^.]+\.[^.]+\.calendar\.([^.]+)\.(\d{6})\.(title|startDate|endDate|allDay|url|location|description|alarms|json)$/
    );
    if (calEventMatch) {
      const [, calId, slotId, field] = calEventMatch;
      const pendingKey = `${calId}.${slotId}`;
      if (!this.calendarEventPendingChanges.has(pendingKey)) {
        this.calendarEventPendingChanges.set(pendingKey, { fields: /* @__PURE__ */ new Map(), stateIds: /* @__PURE__ */ new Map() });
      }
      const pending = this.calendarEventPendingChanges.get(pendingKey);
      pending.fields.set(field, state.val);
      pending.stateIds.set(field, id);
      if (this.calendarResyncTimer) {
        this.clearTimeout(this.calendarResyncTimer);
        this.calendarResyncTimer = null;
      }
      const debounceMs = field === "json" ? 100 : 5e3;
      const existing = this.calendarEventUpdateTimers.get(pendingKey);
      if (existing) {
        this.clearTimeout(existing);
      }
      const timer = this.setTimeout(() => {
        this.calendarEventUpdateTimers.delete(pendingKey);
        this.applyCalendarEventUpdate(calId, slotId).catch((err) => {
          var _a2;
          this.log.error(`Calendar event update failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
        });
      }, debounceMs);
      if (timer !== void 0) {
        this.calendarEventUpdateTimers.set(pendingKey, timer);
      }
      return;
    }
    const reminderCompletedMatch = id.match(/^[^.]+\.[^.]+\.reminders\.([^.]+)\.(\d{6})\.completed$/);
    if (reminderCompletedMatch) {
      if (!this.icloud) {
        this.log.warn("Reminder completed toggle received but iCloud is not initialized");
        return;
      }
      const listFolder = reminderCompletedMatch[1];
      const slotId = reminderCompletedMatch[2];
      const completed = !!state.val;
      this.getStateAsync(`reminders.${listFolder}.${slotId}.id`).then(async (idState) => {
        var _a2;
        const reminderId = idState == null ? void 0 : idState.val;
        if (!reminderId) {
          this.log.warn(`Reminder completed: no reminder ID in slot ${listFolder}.${slotId}`);
          return;
        }
        try {
          const remService = this.icloud.getService("reminders");
          await remService.completeReminder(reminderId, completed);
          this.log.info(`Reminder ${reminderId} marked as ${completed ? "completed" : "uncompleted"}`);
          await this.refreshReminders();
        } catch (err) {
          this.log.error(`Failed to set reminder completed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
        }
      }).catch((err) => {
        var _a2;
        this.log.error(`Failed to resolve reminder ID: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
    }
  }
  /**
   * Is called if a message is sent to this instance.
   *
   * @param obj - Message object
   */
  onMessage(obj) {
    if (typeof obj !== "object") {
      return;
    }
    const requiresPayload = [
      "submitMfa",
      "createReminder",
      "completeReminder",
      "updateReminder",
      "deleteReminder",
      "createCalendarEvent",
      "updateCalendarEvent",
      "deleteCalendarEvent"
    ];
    if (!obj.message && requiresPayload.includes(obj.command)) {
      return;
    }
    this.log.debug(`Message received: command="${obj.command}", message="${JSON.stringify(obj.message)}"`);
    if (obj.command === "submitMfa") {
      const code = String(obj.message).trim();
      if (code.length === 6 && this.icloud) {
        this.icloud.provideMfaCode(code).then(() => {
          if (obj.callback) {
            this.sendTo(obj.from, obj.command, { success: true }, obj.callback);
          }
        }).catch((err) => {
          if (obj.callback) {
            this.sendTo(
              obj.from,
              obj.command,
              { success: false, error: err == null ? void 0 : err.message },
              obj.callback
            );
          }
        });
      } else {
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, { success: false, error: "Invalid code" }, obj.callback);
        }
      }
    } else if (obj.command === "createReminder") {
      this.handleCreateReminder(obj);
    } else if (obj.command === "completeReminder") {
      this.handleCompleteReminder(obj);
    } else if (obj.command === "updateReminder") {
      this.handleUpdateReminder(obj);
    } else if (obj.command === "deleteReminder") {
      this.handleDeleteReminder(obj);
    } else if (obj.command === "getReminders") {
      this.handleGetReminders(obj);
    } else if (obj.command === "getReminderLists") {
      this.handleGetReminderLists(obj);
    } else if (obj.command === "driveListFolder") {
      this.handleDriveListFolder(obj);
    } else if (obj.command === "driveGetMetadata") {
      this.handleDriveGetMetadata(obj);
    } else if (obj.command === "driveGetFile") {
      this.handleDriveGetFile(obj);
    } else if (obj.command === "driveUploadFile") {
      this.handleDriveUploadFile(obj);
    } else if (obj.command === "driveCreateFolder") {
      this.handleDriveCreateFolder(obj);
    } else if (obj.command === "driveDeleteItem") {
      this.handleDriveDeleteItem(obj);
    } else if (obj.command === "driveRenameItem") {
      this.handleDriveRenameItem(obj);
    } else if (obj.command === "getContacts") {
      this.handleGetContacts(obj);
    } else if (obj.command === "getContactGroups") {
      this.handleGetContactGroups(obj);
    } else if (obj.command === "photosGetAlbums") {
      this.handlePhotosGetAlbums(obj);
    } else if (obj.command === "photosGetPhotos") {
      this.handlePhotosGetPhotos(obj);
    } else if (obj.command === "photosDownload") {
      this.handlePhotosDownload(obj);
    } else if (obj.command === "photosDelete") {
      this.handlePhotosDelete(obj);
    } else if (obj.command === "resetRemindersSyncMap") {
      this.handleResetRemindersSyncMap(obj);
    } else if (obj.command === "getDevices") {
      this.handleGetDevices(obj);
    } else if (obj.command === "refreshFindMyNow") {
      void this.handleRefreshFindMyNow(obj);
    } else if (obj.command === "getCalendars") {
      this.handleGetCalendars(obj);
    } else if (obj.command === "getCalendarEvents") {
      this.handleGetCalendarEvents(obj);
    } else if (obj.command === "createCalendarEvent") {
      this.handleCreateCalendarEvent(obj);
    } else if (obj.command === "updateCalendarEvent") {
      this.handleUpdateCalendarEvent(obj);
    } else if (obj.command === "deleteCalendarEvent") {
      this.handleDeleteCalendarEvent(obj);
    } else if (obj.command === "queryCalendarEvents") {
      this.handleQueryCalendarEvents(obj);
    } else if (obj.command === "listLocalFolder") {
      this.handleListLocalFolder(obj);
    } else if (obj.command === "driveSyncGetBackitupInfo") {
      this.handleDriveSyncGetBackitupInfo(obj);
    } else if (obj.command === "driveSyncGetStatus") {
      this.handleDriveSyncGetStatus(obj);
    } else if (obj.command === "driveSyncResolveConflict") {
      this.handleDriveSyncResolveConflict(obj);
    } else if (obj.command === "getMfaStatus") {
      this.handleGetMfaStatus(obj);
    } else if (obj.command === "requestSmsMfa") {
      this.handleRequestSmsMfa(obj);
    }
  }
  // ── onMessage MFA admin UI handlers ──────────────────────────────────────
  /**
   * Returns the current MFA status so the admin UI can decide whether to show the MFA panel.
   * Uses the adapter's internal iCloud service status — never reads the `mfa.required` state —
   * so the response is only possible when the adapter is actually running and ready.
   *
   * @param obj - The incoming ioBroker message object.
   */
  handleGetMfaStatus(obj) {
    var _a;
    if (obj.callback) {
      this.sendTo(obj.from, obj.command, { mfaRequested: ((_a = this.icloud) == null ? void 0 : _a.status) === "MfaRequested" }, obj.callback);
    }
  }
  /**
   * Triggers an SMS MFA code request on behalf of the admin UI.
   *
   * @param obj - The incoming ioBroker message object.
   */
  handleRequestSmsMfa(obj) {
    if (!this.icloud || this.icloud.status !== "MfaRequested") {
      if (obj.callback) {
        this.sendTo(obj.from, obj.command, { success: false, error: "Not in MFA state" }, obj.callback);
      }
      return;
    }
    this.log.info("Admin UI: requesting MFA code via SMS");
    this.icloud.requestSmsMfaCode().then(() => {
      if (obj.callback) {
        this.sendTo(obj.from, obj.command, { success: true }, obj.callback);
      }
    }).catch((err) => {
      var _a, _b;
      this.log.error(`Admin UI: failed to request SMS code: ${(_a = err == null ? void 0 : err.message) != null ? _a : String(err)}`);
      if (obj.callback) {
        this.sendTo(
          obj.from,
          obj.command,
          { success: false, error: (_b = err == null ? void 0 : err.message) != null ? _b : String(err) },
          obj.callback
        );
      }
    });
  }
  // ── onMessage FindMy handlers ────────────────────────────────────────────
  /**
   * Returns the list of all known FindMy devices (from last refresh) for the admin UI.
   * Each device includes: id, name, model, batteryLevel, distanceKm, owner.
   *
   * @param obj The ioBroker message object from the message handler.
   */
  handleGetDevices(obj) {
    var _a, _b, _c, _d, _e;
    if (!this.icloud || this.icloud.status !== import_lib.iCloudServiceStatus.Ready) {
      this.sendCallback(obj, { alive: false, devices: [] });
      return;
    }
    const findMe = this.icloud.getService("findme");
    const locationPoints = [];
    if (Array.isArray(this.config.locationPoints)) {
      for (const lp of this.config.locationPoints) {
        if (lp.latitude != null && lp.longitude != null) {
          locationPoints.push({ lat: lp.latitude, lon: lp.longitude });
          break;
        }
      }
    }
    const result = [];
    for (const [, dev] of findMe.devices) {
      const d = dev.deviceInfo;
      const loc = d.location;
      const distKm = loc && locationPoints.length > 0 ? Math.round(
        haversineKm(locationPoints[0].lat, locationPoints[0].lon, loc.latitude, loc.longitude) * 1e3
      ) / 1e3 : null;
      let owner = null;
      if (d.prsId != null) {
        const memberInfo = findMe.membersInfo[d.prsId];
        owner = memberInfo ? `${memberInfo.firstName} ${memberInfo.lastName}`.trim() : String(d.prsId);
      }
      result.push({
        id: (_a = d.id) != null ? _a : "",
        name: (_c = (_b = d.name) != null ? _b : d.deviceDisplayName) != null ? _c : "",
        model: (_e = (_d = d.modelDisplayName) != null ? _d : d.rawDeviceModel) != null ? _e : "",
        batteryLevel: d.batteryLevel != null ? Math.round(d.batteryLevel * 100) : -1,
        distanceKm: distKm,
        owner
      });
    }
    this.sendCallback(obj, { alive: true, devices: result });
  }
  /**
   * Trigger an immediate FindMy refresh from the admin UI.
   * Cancels any pending scheduled refresh and runs one now (unless a refresh
   * is already in progress, in which case the request is ignored).
   * After the refresh completes, the normal schedule resumes.
   *
   * @param obj The ioBroker message object from the message handler.
   */
  async handleRefreshFindMyNow(obj) {
    if (!this.icloud || this.icloud.status !== import_lib.iCloudServiceStatus.Ready) {
      this.sendCallback(obj, { success: false, error: "Adapter not connected to iCloud" });
      return;
    }
    if (this.findMyRefreshing) {
      this.sendCallback(obj, { success: false, busy: true });
      return;
    }
    if (this.findMyRefreshTimer) {
      this.clearTimeout(this.findMyRefreshTimer);
      this.findMyRefreshTimer = null;
    }
    const locationPoints = await this.resolveLocationPoints();
    await this.refreshFindMyDevices(locationPoints);
    this.scheduleFindMyRefresh(locationPoints);
    this.sendCallback(obj, { success: true });
  }
  // ── onMessage Reminder handlers ───────────────────────────────────────────
  handleResetRemindersSyncMap(obj) {
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "Adapter not connected to iCloud" });
      return;
    }
    const remService = this.icloud.getService("reminders");
    remService.resetSyncMap();
    this.remindersSyncMapLoaded = false;
    this.extendObject("reminders", {
      type: "folder",
      common: { name: "Reminders" },
      native: { syncMap: remService.exportSyncMap() }
    }).then(() => {
      this.log.info("Reminders sync map reset \u2014 triggering full resync");
      return this.refreshReminders();
    }).then(() => {
      this.sendCallback(obj, { success: true });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleCreateReminder(obj) {
    var _a, _b, _c, _d, _e, _f;
    if (!this.config.remindersEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Reminders are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const listId = msg.listId;
    const title = msg.title;
    if (!listId || !title) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required fields missing: "listId" and "title" are mandatory'
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const remService = this.icloud.getService("reminders");
    remService.createReminder({
      listId,
      title,
      description: (_a = msg.description) != null ? _a : void 0,
      completed: (_b = msg.completed) != null ? _b : void 0,
      dueDate: (_c = msg.dueDate) != null ? _c : void 0,
      priority: (_d = msg.priority) != null ? _d : void 0,
      flagged: (_e = msg.flagged) != null ? _e : void 0,
      allDay: (_f = msg.allDay) != null ? _f : void 0
    }).then(async (reminder) => {
      await this.refreshReminders();
      this.sendCallback(obj, { success: true, reminder });
    }).catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handleCompleteReminder(obj) {
    if (!this.config.remindersEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Reminders are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const reminderId = msg.reminderId;
    if (!reminderId) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required field missing: "reminderId" is mandatory'
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const completed = msg.completed !== false;
    const remService = this.icloud.getService("reminders");
    remService.completeReminder(reminderId, completed).then(async () => {
      await this.refreshReminders();
      this.sendCallback(obj, { success: true });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleUpdateReminder(obj) {
    if (!this.config.remindersEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Reminders are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const reminderId = msg.reminderId;
    if (!reminderId) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required field missing: "reminderId" is mandatory'
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const remService = this.icloud.getService("reminders");
    const reminder = remService.getReminder(reminderId);
    if (!reminder) {
      this.sendCallback(obj, { success: false, error: `Reminder not found: ${reminderId}` });
      return;
    }
    if (msg.title !== void 0) {
      reminder.title = `${msg.title}`;
    }
    if (msg.description !== void 0) {
      reminder.description = `${msg.description}`;
    }
    if (msg.completed !== void 0) {
      reminder.completed = !!msg.completed;
      reminder.completedDate = reminder.completed ? Date.now() : null;
    }
    if (msg.dueDate !== void 0) {
      reminder.dueDate = msg.dueDate;
    }
    if (msg.priority !== void 0) {
      reminder.priority = Number(msg.priority) || 0;
    }
    if (msg.flagged !== void 0) {
      reminder.flagged = !!msg.flagged;
    }
    if (msg.allDay !== void 0) {
      reminder.allDay = !!msg.allDay;
    }
    remService.updateReminder(reminder).then(async () => {
      await this.refreshReminders();
      this.sendCallback(obj, { success: true, reminder });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleDeleteReminder(obj) {
    if (!this.config.remindersEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Reminders are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const reminderId = msg.reminderId;
    if (!reminderId) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required field missing: "reminderId" is mandatory'
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const remService = this.icloud.getService("reminders");
    remService.deleteReminder(reminderId).then(async () => {
      await this.refreshReminders();
      this.sendCallback(obj, { success: true });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleGetReminders(obj) {
    var _a;
    if (!this.config.remindersEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Reminders are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const msg = obj.message;
    const listId = msg && typeof msg === "object" ? msg.listId : void 0;
    const remService = this.icloud.getService("reminders");
    let reminders;
    if (listId) {
      reminders = (_a = remService.remindersByList.get(listId)) != null ? _a : [];
    } else {
      reminders = remService.getAllReminders();
    }
    this.sendCallback(obj, { success: true, reminders });
  }
  handleGetReminderLists(obj) {
    if (!this.config.remindersEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Reminders are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const remService = this.icloud.getService("reminders");
    const lists = remService.lists.map((l) => ({ listId: l.id, title: l.title, color: l.color, count: l.count }));
    this.sendCallback(obj, { success: true, lists });
  }
  // ── onMessage Drive handlers ──────────────────────────────────────────────
  handleDriveListFolder(obj) {
    var _a;
    if (!this.config.driveEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "iCloud Drive is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    const folderPath = (_a = msg && typeof msg === "object" ? msg.path : void 0) != null ? _a : "";
    const folderId = msg && typeof msg === "object" ? msg.folderId : void 0;
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    (async () => {
      let node;
      if (folderId) {
        node = await driveService.getNode(folderId);
      } else if (folderPath) {
        node = await driveService.getNodeByPath(folderPath);
      } else {
        node = await driveService.getNode();
      }
      const children = await node.getChildren();
      const items = children.map((c) => {
        var _a2, _b;
        return {
          name: c.fullName,
          type: c.type,
          drivewsid: c.nodeId,
          docwsid: (_a2 = c.docwsid) != null ? _a2 : "",
          size: (_b = c.size) != null ? _b : 0,
          etag: c.etag,
          dateCreated: c.dateCreated ? c.dateCreated.getTime() : null,
          dateModified: c.dateModified ? c.dateModified.getTime() : null
        };
      });
      this.sendCallback(obj, { success: true, items });
    })().catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handleDriveGetMetadata(obj) {
    if (!this.config.driveEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "iCloud Drive is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const itemPath = msg.path;
    const itemId = msg.itemId;
    if (!itemPath && !itemId) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required: "path" (slash-separated) or "itemId" (drivewsid)'
      });
      return;
    }
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    (async () => {
      var _a, _b, _c, _d, _e, _f, _g;
      const node = itemId ? await driveService.getNode(itemId) : await driveService.getNodeByPath(itemPath);
      this.sendCallback(obj, {
        success: true,
        item: {
          name: node.fullName,
          type: node.type,
          drivewsid: node.nodeId,
          docwsid: (_a = node.docwsid) != null ? _a : "",
          parentId: (_b = node.parentId) != null ? _b : "",
          etag: node.etag,
          size: (_c = node.size) != null ? _c : 0,
          fileCount: (_d = node.fileCount) != null ? _d : 0,
          shareCount: (_e = node.shareCount) != null ? _e : 0,
          directChildrenCount: (_f = node.directChildrenCount) != null ? _f : 0,
          dateCreated: node.dateCreated ? node.dateCreated.getTime() : null,
          dateModified: node.dateModified ? node.dateModified.getTime() : null,
          dateChanged: node.dateChanged ? node.dateChanged.getTime() : null,
          dateLastOpen: node.dateLastOpen ? node.dateLastOpen.getTime() : null,
          extension: (_g = node.extension) != null ? _g : null
        }
      });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleDriveGetFile(obj) {
    if (!this.config.driveEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "iCloud Drive is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const filePath = msg.path;
    const fileId = msg.fileId;
    if (!filePath && !fileId) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required: "path" (slash-separated) or "fileId" (drivewsid)'
      });
      return;
    }
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    (async () => {
      let node;
      if (fileId) {
        node = await driveService.getNode(fileId);
      } else {
        node = await driveService.getNodeByPath(filePath);
      }
      if (node.type !== "FILE") {
        this.sendCallback(obj, { success: false, error: `"${node.fullName}" is not a file` });
        return;
      }
      const stream = await node.open();
      if (!stream) {
        this.sendCallback(obj, { success: false, error: "Download returned empty stream" });
        return;
      }
      const reader = stream.getReader();
      const chunks = [];
      for (; ; ) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
      }
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      const base64 = Buffer.from(merged).toString("base64");
      this.sendCallback(obj, {
        success: true,
        name: node.fullName,
        size: totalLen,
        base64
      });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleDriveUploadFile(obj) {
    var _a;
    if (!this.config.driveEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "iCloud Drive is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const folderId = msg.folderId;
    const folderPath = msg.folderPath;
    const fileName = msg.fileName;
    const base64Content = msg.base64;
    const contentType = (_a = msg.contentType) != null ? _a : void 0;
    if (!fileName) {
      this.sendCallback(obj, { success: false, error: 'Required field missing: "fileName"' });
      return;
    }
    if (!base64Content) {
      this.sendCallback(obj, { success: false, error: 'Required field missing: "base64" (file content)' });
      return;
    }
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    (async () => {
      let targetFolderDocwsid;
      if (folderId) {
        targetFolderDocwsid = folderId;
      } else if (folderPath) {
        const folder = await driveService.getNodeByPath(folderPath);
        if (!folder.docwsid) {
          throw new Error(`Folder "${folderPath}" has no docwsid \u2014 call refresh() first`);
        }
        targetFolderDocwsid = folder.docwsid;
      } else {
        const root = await driveService.getNode();
        if (!root.docwsid) {
          throw new Error("Root folder has no docwsid");
        }
        targetFolderDocwsid = root.docwsid;
      }
      const content = new Uint8Array(Buffer.from(base64Content, "base64"));
      await driveService.sendFile(targetFolderDocwsid, { name: fileName, content, contentType });
      this.sendCallback(obj, { success: true });
    })().catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handleDriveCreateFolder(obj) {
    var _a;
    if (!this.config.driveEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "iCloud Drive is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const name = msg.name;
    const parentId = (_a = msg.parentId) != null ? _a : msg.folderId;
    const parentPath = msg.parentPath;
    if (!name) {
      this.sendCallback(obj, { success: false, error: 'Required field missing: "name"' });
      return;
    }
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    (async () => {
      var _a2, _b, _c;
      let targetParentId;
      if (parentId) {
        targetParentId = parentId;
      } else if (parentPath) {
        const parent = await driveService.getNodeByPath(parentPath);
        targetParentId = parent.nodeId;
      } else {
        const root = await driveService.getNode();
        targetParentId = root.nodeId;
      }
      const result = await driveService.mkdir(targetParentId, name);
      const items = Array.isArray(result) ? result : (_a2 = result == null ? void 0 : result.folders) != null ? _a2 : [];
      const newDrivewsid = (_c = (_b = items[0]) == null ? void 0 : _b.drivewsid) != null ? _c : null;
      this.sendCallback(obj, { success: true, drivewsid: newDrivewsid, result });
    })().catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handleDriveDeleteItem(obj) {
    if (!this.config.driveEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "iCloud Drive is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const drivewsid = msg.drivewsid;
    const etag = msg.etag;
    const itemPath = msg.path;
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    (async () => {
      if (drivewsid && etag) {
        await driveService.del(drivewsid, etag);
      } else if (itemPath) {
        const node = await driveService.getNodeByPath(itemPath);
        await node.delete();
      } else {
        this.sendCallback(obj, {
          success: false,
          error: 'Required: "drivewsid" + "etag", or "path"'
        });
        return;
      }
      this.sendCallback(obj, { success: true });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleDriveRenameItem(obj) {
    if (!this.config.driveEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "iCloud Drive is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const drivewsid = msg.drivewsid;
    const etag = msg.etag;
    const newName = msg.newName;
    const itemPath = msg.path;
    if (!newName) {
      this.sendCallback(obj, { success: false, error: 'Required field missing: "newName"' });
      return;
    }
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    (async () => {
      if (drivewsid && etag) {
        await driveService.renameItem(drivewsid, etag, newName);
      } else if (itemPath) {
        const node = await driveService.getNodeByPath(itemPath);
        await node.rename(newName);
      } else {
        this.sendCallback(obj, {
          success: false,
          error: 'Required: "drivewsid" + "etag", or "path"'
        });
        return;
      }
      this.sendCallback(obj, { success: true });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  // ── onMessage Contacts handlers ─────────────────────────────────────────
  handleGetContacts(obj) {
    if (!this.config.contactsEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Contacts are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const msg = obj.message;
    const contactId = msg && typeof msg === "object" ? msg.contactId : void 0;
    const groupName = msg && typeof msg === "object" ? msg.groupName : void 0;
    const contactsService = this.icloud.getService("contacts");
    let contacts;
    if (contactId) {
      const c = contactsService.getContact(contactId);
      contacts = c ? [c] : [];
    } else if (groupName) {
      contacts = contactsService.getContactsByGroups([groupName]);
    } else {
      contacts = contactsService.contacts;
    }
    this.sendCallback(obj, { success: true, contacts });
  }
  handleGetContactGroups(obj) {
    if (!this.config.contactsEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Contacts are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const contactsService = this.icloud.getService("contacts");
    const groups = contactsService.groups.map((g) => ({
      groupId: g.groupId,
      name: g.name,
      contactCount: g.contactIds.length
    }));
    this.sendCallback(obj, { success: true, groups });
  }
  // ── onMessage Calendar handlers ─────────────────────────────────────────
  handleGetCalendars(obj) {
    if (!this.config.calendarEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Calendar is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const calService = this.icloud.getService("calendar");
    calService.calendars().then((collections) => {
      const calendars = collections.map((c) => ({
        guid: c.guid,
        title: c.title,
        color: c.color,
        symbolicColor: c.symbolicColor,
        enabled: c.enabled,
        isDefault: c.isDefault,
        isFamily: c.isFamily,
        readOnly: c.readOnly,
        order: c.order
      }));
      this.sendCallback(obj, { success: true, calendars });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleGetCalendarEvents(obj) {
    var _a;
    if (!this.config.calendarEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Calendar is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const msg = (_a = obj.message) != null ? _a : {};
    const fromTs = msg.from;
    const toTs = msg.to;
    const calendarGuid = msg.calendarGuid;
    const from = fromTs ? new Date(fromTs) : void 0;
    const to = toTs ? new Date(toTs) : void 0;
    const calService = this.icloud.getService("calendar");
    calService.events(from, to).then((resp) => {
      var _a2;
      let events = (_a2 = resp.Event) != null ? _a2 : [];
      if (calendarGuid) {
        events = events.filter((e) => e.pGuid === calendarGuid);
      }
      const mapped = events.map((e) => {
        var _a3, _b, _c, _d;
        return {
          guid: e.guid,
          calendarGuid: e.pGuid,
          title: e.title,
          startDate: this.localDateArrayToTimestamp(e.localStartDate),
          endDate: this.localDateArrayToTimestamp(e.localEndDate),
          allDay: e.allDay,
          duration: e.duration,
          location: (_a3 = e.location) != null ? _a3 : "",
          description: (_b = e.description) != null ? _b : "",
          url: (_c = e.url) != null ? _c : "",
          tz: e.tz,
          etag: e.etag,
          readOnly: e.readOnly,
          recurrenceMaster: e.recurrenceMaster,
          alarms: (_d = e.alarms) != null ? _d : []
        };
      });
      this.sendCallback(obj, { success: true, events: mapped });
    }).catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handleCreateCalendarEvent(obj) {
    var _a, _b, _c, _d, _e;
    if (!this.config.calendarEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Calendar is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const calendarGuid = msg.calendarGuid;
    const title = msg.title;
    const startDate = msg.startDate;
    const endDate = msg.endDate;
    if (!calendarGuid || !title || !startDate || !endDate) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required fields missing: "calendarGuid", "title", "startDate" (timestamp), "endDate" (timestamp)'
      });
      return;
    }
    if (endDate <= startDate) {
      this.sendCallback(obj, { success: false, error: '"endDate" must be after "startDate"' });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const calService = this.icloud.getService("calendar");
    calService.createEvent({
      calendarGuid,
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: (_a = msg.allDay) != null ? _a : false,
      location: (_b = msg.location) != null ? _b : void 0,
      description: (_c = msg.description) != null ? _c : void 0,
      url: (_d = msg.url) != null ? _d : void 0,
      alarms: (_e = msg.alarms) != null ? _e : void 0
    }).then(({ guid }) => {
      this.sendCallback(obj, { success: true, eventGuid: guid });
      this.refreshCalendarEvents().catch(() => {
      });
    }).catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handleUpdateCalendarEvent(obj) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!this.config.calendarEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Calendar is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const calendarGuid = msg.calendarGuid;
    const eventGuid = msg.eventGuid;
    if (!calendarGuid || !eventGuid) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required fields missing: "calendarGuid" and "eventGuid"'
      });
      return;
    }
    const startDate = msg.startDate;
    const endDate = msg.endDate;
    if (startDate !== void 0 && endDate !== void 0 && endDate <= startDate) {
      this.sendCallback(obj, { success: false, error: '"endDate" must be after "startDate"' });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const opts = {
      calendarGuid,
      eventGuid,
      etag: (_a = msg.etag) != null ? _a : void 0,
      title: (_b = msg.title) != null ? _b : void 0,
      startDate: startDate !== void 0 ? new Date(startDate) : void 0,
      endDate: endDate !== void 0 ? new Date(endDate) : void 0,
      allDay: (_c = msg.allDay) != null ? _c : void 0,
      location: (_d = msg.location) != null ? _d : void 0,
      description: (_e = msg.description) != null ? _e : void 0,
      url: (_f = msg.url) != null ? _f : void 0,
      alarms: (_g = msg.alarms) != null ? _g : void 0
    };
    const calService = this.icloud.getService("calendar");
    calService.updateEvent(opts).then(() => {
      this.sendCallback(obj, { success: true });
      this.refreshCalendarEvents().catch(() => {
      });
    }).catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handleDeleteCalendarEvent(obj) {
    if (!this.config.calendarEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Calendar is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const calendarGuid = msg.calendarGuid;
    const eventGuid = msg.eventGuid;
    if (!calendarGuid || !eventGuid) {
      this.sendCallback(obj, {
        success: false,
        error: 'Required fields missing: "calendarGuid" and "eventGuid"'
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const calService = this.icloud.getService("calendar");
    calService.deleteEvent(calendarGuid, eventGuid, msg.etag).then(() => {
      this.sendCallback(obj, { success: true });
      this.refreshCalendarEvents().catch(() => {
      });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  /**
   * Fetches calendar events for a user-defined time range from iCloud, splitting the
   * request into one-month chunks to respect Apple's per-query limit.
   * Results are filtered to the exact requested range, written to `calendar.query`
   * (role=json, q=0x01) and sent back as the sendTo response.
   *
   * @param obj — The ioBroker message; `obj.message.from` and `obj.message.to` must be
   *   Unix timestamps in milliseconds defining the desired date range.
   */
  handleQueryCalendarEvents(obj) {
    var _a;
    if (!this.config.calendarEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Calendar is disabled \u2014 enable it in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const msg = (_a = obj.message) != null ? _a : {};
    const fromTs = msg.from;
    const toTs = msg.to;
    if (typeof fromTs !== "number" || typeof toTs !== "number") {
      this.sendCallback(obj, {
        success: false,
        error: 'Required fields: "from" (timestamp ms) and "to" (timestamp ms)'
      });
      return;
    }
    if (toTs <= fromTs) {
      this.sendCallback(obj, { success: false, error: '"to" must be after "from"' });
      return;
    }
    const fromDate = new Date(fromTs);
    const toDate = new Date(toTs);
    const calService = this.icloud.getService("calendar");
    const chunks = [];
    const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const lastMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    while (cursor <= lastMonth) {
      chunks.push({
        start: new Date(cursor.getFullYear(), cursor.getMonth(), 1),
        end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const fetchAll = async () => {
      var _a2, _b, _c;
      const allEvents = [];
      const allAlarms = [];
      const allRecurrences = [];
      const seenGuids = /* @__PURE__ */ new Set();
      for (const chunk of chunks) {
        const resp = await calService.events(chunk.start, chunk.end);
        for (const ev of (_a2 = resp.Event) != null ? _a2 : []) {
          if (!seenGuids.has(ev.guid)) {
            seenGuids.add(ev.guid);
            allEvents.push(ev);
          }
        }
        for (const a of (_b = resp.Alarm) != null ? _b : []) {
          allAlarms.push(a);
        }
        for (const r of (_c = resp.Recurrence) != null ? _c : []) {
          allRecurrences.push(r);
        }
      }
      const filtered = allEvents.filter((ev) => {
        const startTs = this.localDateArrayToTimestamp(ev.localStartDate);
        const endTs = this.localDateArrayToTimestamp(ev.localEndDate);
        if (startTs === null) {
          return false;
        }
        return startTs < toTs && (endTs === null || endTs > fromTs);
      });
      filtered.sort((a, b) => {
        var _a3, _b2;
        const ta = (_a3 = this.localDateArrayToTimestamp(a.localStartDate)) != null ? _a3 : 0;
        const tb = (_b2 = this.localDateArrayToTimestamp(b.localStartDate)) != null ? _b2 : 0;
        return ta - tb;
      });
      const result = {
        from: fromTs,
        to: toTs,
        count: filtered.length,
        events: filtered,
        alarms: allAlarms,
        recurrences: allRecurrences
      };
      await this.extendObjectAsync("calendar.query", {
        type: "state",
        common: {
          name: "Calendar Query Result",
          type: "string",
          role: "json",
          read: true,
          write: false
        },
        native: {}
      });
      await this.setStateAsync("calendar.query", { val: JSON.stringify(result), q: 1, ack: true });
      this.sendCallback(obj, { success: true, ...result });
    };
    fetchAll().catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  // ── onMessage Photos handlers ─────────────────────────────────────────────
  handlePhotosGetAlbums(obj) {
    if (!this.config.photosEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Photos are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const photosService = this.icloud.getService("photos");
    photosService.getAlbumSummaries().then((albums) => {
      this.sendCallback(obj, { success: true, albums });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handlePhotosGetPhotos(obj) {
    var _a;
    if (!this.config.photosEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Photos are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const msg = obj.message;
    const albumName = (_a = msg == null ? void 0 : msg.albumName) != null ? _a : "All Photos";
    const offset = Math.max(0, Number(msg == null ? void 0 : msg.offset) || 0);
    const limit = Math.min(100, Math.max(1, Number(msg == null ? void 0 : msg.limit) || 50));
    const photosService = this.icloud.getService("photos");
    photosService.getPhotosPage(albumName, offset, limit).then((photos) => {
      this.sendCallback(obj, { success: true, photos });
    }).catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handlePhotosDownload(obj) {
    var _a;
    if (!this.config.photosEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Photos are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const photoId = msg.photoId;
    if (!photoId) {
      this.sendCallback(obj, { success: false, error: 'Required field missing: "photoId"' });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const version = (_a = msg.version) != null ? _a : "original";
    const photosService = this.icloud.getService("photos");
    photosService.downloadPhoto(photoId, version).then((result) => {
      if (!result) {
        this.sendCallback(obj, { success: false, error: `Photo not found: ${photoId}` });
        return;
      }
      const base64 = Buffer.from(result.data).toString("base64");
      this.sendCallback(obj, {
        success: true,
        name: result.filename,
        size: result.size,
        base64
      });
    }).catch((err) => {
      var _a2;
      this.sendCallback(obj, { success: false, error: (_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err) });
    });
  }
  handlePhotosDelete(obj) {
    if (!this.config.photosEnabled) {
      this.sendCallback(obj, {
        success: false,
        error: "Photos are disabled \u2014 enable them in the adapter settings first"
      });
      return;
    }
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const photoId = msg.photoId;
    if (!photoId) {
      this.sendCallback(obj, { success: false, error: 'Required field missing: "photoId"' });
      return;
    }
    if (!this.icloud) {
      this.sendCallback(obj, { success: false, error: "iCloud not connected" });
      return;
    }
    const photosService = this.icloud.getService("photos");
    photosService.deletePhoto(photoId).then((success) => {
      this.sendCallback(obj, { success });
    }).catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  sendCallback(obj, response) {
    if (obj.callback) {
      this.sendTo(obj.from, obj.command, response, obj.callback);
    }
  }
  // ── Drive Sync engine ────────────────────────────────────────────────────
  getDriveSyncEntries() {
    try {
      const raw = this.config.driveSyncConfig;
      if (typeof raw === "string" && raw) {
        return JSON.parse(raw);
      }
    } catch {
    }
    return [];
  }
  async loadDriveSyncMeta() {
    var _a, _b;
    try {
      const obj = await this.getObjectAsync("drive");
      if ((_a = obj == null ? void 0 : obj.native) == null ? void 0 : _a.syncMeta) {
        const meta = JSON.parse(obj.native.syncMeta);
        this.driveSyncConflicts = (_b = meta.conflicts) != null ? _b : [];
      }
    } catch {
    }
  }
  async saveDriveSyncMeta(meta) {
    var _a, _b;
    this.driveSyncConflicts = meta.conflicts;
    try {
      const obj = await this.getObjectAsync("drive");
      if (obj) {
        obj.native = (_a = obj.native) != null ? _a : {};
        obj.native.syncMeta = JSON.stringify(meta);
        await this.setObjectAsync("drive", obj);
      }
    } catch (err) {
      this.log.warn(`Failed to save Drive Sync meta: ${(_b = err == null ? void 0 : err.message) != null ? _b : String(err)}`);
    }
  }
  scheduleDriveSync() {
    if (this.driveSyncTimer) {
      this.clearTimeout(this.driveSyncTimer);
    }
    const intervalMs = (this.config.driveSyncInterval || 60) * 6e4;
    this.driveSyncTimer = this.setTimeout(async () => {
      this.driveSyncTimer = null;
      await this.executeDriveSync();
      this.scheduleDriveSync();
    }, intervalMs);
  }
  async executeDriveSync() {
    var _a;
    if (!this.icloud || !this.config.driveEnabled || !this.config.driveSyncEnabled) {
      return;
    }
    const entries = this.getDriveSyncEntries().filter((e) => e.enabled);
    if (entries.length === 0) {
      return;
    }
    this.log.debug(`Drive Sync: starting sync for ${entries.length} entries`);
    let driveService;
    try {
      driveService = this.getDriveService();
    } catch {
      this.log.warn("Drive Sync: iCloud not connected");
      return;
    }
    const meta = { entries: [], conflicts: [...this.driveSyncConflicts] };
    for (const entry of entries) {
      const entryMeta = { id: entry.id, lastSync: 0, lastError: "", filesSynced: 0, totalSizeMB: 0 };
      try {
        await this.syncEntry(driveService, entry, entryMeta, meta);
        entryMeta.lastSync = Date.now();
      } catch (err) {
        entryMeta.lastError = (_a = err == null ? void 0 : err.message) != null ? _a : String(err);
        this.log.warn(`Drive Sync: entry ${entry.id} (${entry.localPath}) failed: ${entryMeta.lastError}`);
      }
      meta.entries.push(entryMeta);
    }
    await this.saveDriveSyncMeta(meta);
    this.log.debug("Drive Sync: completed");
  }
  async syncEntry(driveService, entry, entryMeta, meta) {
    const localDir = entry.localPath;
    if (!localDir || !fs.existsSync(localDir)) {
      throw new Error(`Local path does not exist: ${localDir}`);
    }
    const targetNode = await this.resolveOrCreateDriveFolder(driveService, entry.icloudFolder);
    if (entry.type === "backitup") {
      await this.syncEntryUploadOnly(driveService, targetNode, entry, entryMeta, meta);
    } else {
      await this.syncEntryBidirectional(driveService, targetNode, entry, entryMeta, meta);
    }
    try {
      await targetNode.refresh();
      const remoteChildren = await targetNode.getChildren();
      const remoteFiles = remoteChildren.filter((c) => c.type === "FILE");
      entryMeta.remoteFileCount = remoteFiles.length;
      entryMeta.remoteTotalSizeMB = remoteFiles.reduce((s, c) => {
        var _a;
        return s + ((_a = c.size) != null ? _a : 0);
      }, 0) / 1024 / 1024;
    } catch {
    }
  }
  /**
   * Resolve a slash-separated iCloud Drive path, creating missing folders.
   *
   * @param driveService - The iCloud Drive service instance
   * @param icloudFolder - Slash-separated target folder path (leading slash is stripped)
   */
  async resolveOrCreateDriveFolder(driveService, icloudFolder) {
    const icloudPath = icloudFolder.replace(/^\//, "");
    if (!icloudPath) {
      return driveService.getNode();
    }
    try {
      return await driveService.getNodeByPath(icloudPath);
    } catch {
      const parts = icloudPath.split("/").filter(Boolean);
      let currentNode = await driveService.getNode();
      for (const part of parts) {
        const existing = await currentNode.get(part);
        if (existing) {
          await existing.refresh();
          currentNode = existing;
        } else {
          await currentNode.mkdir(part);
          await currentNode.refresh();
          const created = await currentNode.get(part);
          if (!created) {
            throw new Error(`Failed to create folder "${part}" in iCloud Drive`);
          }
          await created.refresh();
          currentNode = created;
        }
      }
      return currentNode;
    }
  }
  // ── BackItUp sync: UPLOAD-ONLY ───────────────────────────────────────────
  // Local files are NEVER modified, overwritten, or deleted.
  // Only remote (iCloud Drive) files may be created, overwritten, or deleted.
  async syncEntryUploadOnly(driveService, targetNode, entry, entryMeta, meta) {
    var _a, _b;
    const localDir = entry.localPath;
    const allFiles = fs.readdirSync(localDir).filter((f) => fs.statSync(path.join(localDir, f)).isFile());
    const fileStats = allFiles.map((f) => {
      const stat = fs.statSync(path.join(localDir, f));
      return { name: f, size: stat.size, mtime: stat.mtimeMs };
    });
    fileStats.sort((a, b) => b.mtime - a.mtime);
    if (entry.maxFiles > 0) {
      fileStats.splice(entry.maxFiles);
    }
    let localFiles;
    if (entry.maxSizeMB > 0) {
      const maxBytes = entry.maxSizeMB * 1024 * 1024;
      let total = 0;
      const filtered = [];
      for (const f of fileStats) {
        if (total + f.size > maxBytes) {
          break;
        }
        total += f.size;
        filtered.push(f);
      }
      localFiles = filtered.map((f) => f.name);
    } else {
      localFiles = fileStats.map((f) => f.name);
    }
    const remoteChildren = await targetNode.getChildren();
    const remoteFileMap = /* @__PURE__ */ new Map();
    for (const child of remoteChildren) {
      if (child.type === "FILE") {
        remoteFileMap.set(child.fullName, child);
      }
    }
    let filesSynced = 0;
    let totalSize = 0;
    for (const localFileName of localFiles) {
      const localFilePath = path.join(localDir, localFileName);
      const localStat = fs.statSync(localFilePath);
      const remoteFile = remoteFileMap.get(localFileName);
      if (remoteFile) {
        const sizeDiffers = remoteFile.size !== localStat.size;
        if (!sizeDiffers) {
          continue;
        }
      }
      const content = new Uint8Array(fs.readFileSync(localFilePath));
      const docwsid = (_b = targetNode.docwsid) != null ? _b : (_a = targetNode.rawData) == null ? void 0 : _a.docwsid;
      if (!docwsid) {
        throw new Error(`Target folder "${entry.icloudFolder}" has no docwsid`);
      }
      await driveService.sendFile(docwsid, { name: localFileName, content });
      filesSynced++;
      totalSize += localStat.size;
      this.log.debug(
        `Drive Sync [backup]: uploaded "${localFileName}" (${(localStat.size / 1024 / 1024).toFixed(2)} MB)`
      );
    }
    if (entry.maxFiles > 0 || entry.maxSizeMB > 0) {
      await this.cleanupRemoteBackups(driveService, targetNode, entry);
    }
    meta.conflicts = meta.conflicts.filter((c) => c.entryId !== entry.id);
    entryMeta.filesSynced = filesSynced;
    entryMeta.totalSizeMB = totalSize / 1024 / 1024;
  }
  // ── Directory sync: BIDIRECTIONAL ─────────────────────────────────────────
  // True sync: upload local→remote, download remote→local, propagate deletions.
  async syncEntryBidirectional(driveService, targetNode, entry, entryMeta, meta) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const localDir = entry.localPath;
    const prevMeta = meta.entries.find((e) => e.id === entry.id);
    const lastKnownFiles = new Set((_a = prevMeta == null ? void 0 : prevMeta.lastKnownFiles) != null ? _a : []);
    const isFirstSync = lastKnownFiles.size === 0 && !prevMeta;
    const localFiles = fs.readdirSync(localDir).filter((f) => fs.statSync(path.join(localDir, f)).isFile());
    const localSet = new Set(localFiles);
    const remoteChildren = await targetNode.getChildren();
    const remoteFileMap = /* @__PURE__ */ new Map();
    for (const child of remoteChildren) {
      if (child.type === "FILE") {
        remoteFileMap.set(child.fullName, child);
      }
    }
    let filesSynced = 0;
    let totalSize = 0;
    const docwsid = (_c = targetNode.docwsid) != null ? _c : (_b = targetNode.rawData) == null ? void 0 : _b.docwsid;
    for (const localFileName of localFiles) {
      const localFilePath = path.join(localDir, localFileName);
      const localStat = fs.statSync(localFilePath);
      const remoteFile = remoteFileMap.get(localFileName);
      if (remoteFile) {
        const remoteModified = (_g = (_f = (_d = remoteFile.dateModified) == null ? void 0 : _d.getTime()) != null ? _f : (_e = remoteFile.dateCreated) == null ? void 0 : _e.getTime()) != null ? _g : 0;
        const localModified = localStat.mtimeMs;
        const sizeDiffers = remoteFile.size !== localStat.size;
        if (!sizeDiffers) {
          continue;
        }
        const remoteFresher = remoteModified > localModified + 6e4;
        const localFresher = localModified > remoteModified + 6e4;
        if (remoteFresher && !localFresher) {
          await this.downloadRemoteFile(remoteFile, localFilePath);
          filesSynced++;
          totalSize += (_h = remoteFile.size) != null ? _h : 0;
          this.log.debug(`Drive Sync [dir]: downloaded newer "${localFileName}"`);
          continue;
        }
        if (localFresher && !remoteFresher) {
          if (docwsid) {
            const content = new Uint8Array(fs.readFileSync(localFilePath));
            await driveService.sendFile(docwsid, { name: localFileName, content });
            filesSynced++;
            totalSize += localStat.size;
            this.log.debug(`Drive Sync [dir]: uploaded newer "${localFileName}"`);
          }
          continue;
        }
        if (entry.conflictResolution === "ask") {
          const existing = meta.conflicts.find((c) => c.entryId === entry.id && c.fileName === localFileName);
          if (!existing) {
            meta.conflicts.push({
              entryId: entry.id,
              fileName: localFileName,
              localModified,
              remoteModified,
              localSize: localStat.size,
              remoteSize: (_i = remoteFile.size) != null ? _i : 0
            });
            this.log.warn(`Drive Sync [dir]: conflict for "${localFileName}" \u2014 open Admin to resolve`);
          }
        } else if (entry.conflictResolution === "overwrite-remote" && docwsid) {
          const content = new Uint8Array(fs.readFileSync(localFilePath));
          await driveService.sendFile(docwsid, { name: localFileName, content });
          filesSynced++;
          totalSize += localStat.size;
        } else if (entry.conflictResolution === "keep-both" && docwsid) {
          const ext = path.extname(localFileName);
          const base = path.basename(localFileName, ext);
          const renamedName = `${base}_local_${Date.now()}${ext}`;
          const content = new Uint8Array(fs.readFileSync(localFilePath));
          await driveService.sendFile(docwsid, { name: renamedName, content });
          filesSynced++;
          totalSize += localStat.size;
        }
        continue;
      }
      if (!isFirstSync && lastKnownFiles.has(localFileName)) {
        try {
          fs.unlinkSync(localFilePath);
          this.log.debug(`Drive Sync [dir]: deleted local "${localFileName}" (removed on remote)`);
        } catch (err) {
          this.log.warn(
            `Drive Sync [dir]: failed to delete local "${localFileName}": ${(_j = err == null ? void 0 : err.message) != null ? _j : String(err)}`
          );
        }
        continue;
      }
      if (docwsid) {
        const content = new Uint8Array(fs.readFileSync(localFilePath));
        await driveService.sendFile(docwsid, { name: localFileName, content });
        filesSynced++;
        totalSize += localStat.size;
        this.log.debug(
          `Drive Sync [dir]: uploaded "${localFileName}" (${(localStat.size / 1024 / 1024).toFixed(2)} MB)`
        );
      }
    }
    for (const [remoteName, remoteNode] of remoteFileMap) {
      if (localSet.has(remoteName)) {
        continue;
      }
      if (!isFirstSync && lastKnownFiles.has(remoteName)) {
        try {
          await remoteNode.delete();
          this.log.debug(`Drive Sync [dir]: deleted remote "${remoteName}" (removed locally)`);
        } catch (err) {
          this.log.warn(
            `Drive Sync [dir]: failed to delete remote "${remoteName}": ${(_k = err == null ? void 0 : err.message) != null ? _k : String(err)}`
          );
        }
        continue;
      }
      const localFilePath = path.join(localDir, remoteName);
      await this.downloadRemoteFile(remoteNode, localFilePath);
      filesSynced++;
      totalSize += (_l = remoteNode.size) != null ? _l : 0;
      this.log.debug(`Drive Sync [dir]: downloaded "${remoteName}"`);
    }
    const currentLocalFiles = fs.readdirSync(localDir).filter((f) => fs.statSync(path.join(localDir, f)).isFile());
    entryMeta.lastKnownFiles = currentLocalFiles;
    meta.conflicts = meta.conflicts.filter((c) => c.entryId !== entry.id || currentLocalFiles.includes(c.fileName));
    entryMeta.filesSynced = filesSynced;
    entryMeta.totalSizeMB = totalSize / 1024 / 1024;
  }
  /**
   * Download a remote iCloud Drive file to a local path.
   *
   * @param remoteNode - The iCloud Drive node representing the remote file
   * @param localFilePath - Absolute local filesystem path to write the file to
   */
  async downloadRemoteFile(remoteNode, localFilePath) {
    var _a, _b, _c, _d;
    let stream;
    try {
      stream = await remoteNode.open();
    } catch (err) {
      this.log.debug(
        `Drive Sync: download failed \u2014 file="${remoteNode.fullName}", docwsid=${(_a = remoteNode.docwsid) != null ? _a : "n/a"}, zone=${(_b = remoteNode.zone) != null ? _b : "n/a"}, size=${(_c = remoteNode.size) != null ? _c : "n/a"}: ${(_d = err == null ? void 0 : err.message) != null ? _d : String(err)}`
      );
      throw err;
    }
    if (!stream) {
      throw new Error(`Download returned empty stream for "${remoteNode.fullName}"`);
    }
    const reader = stream.getReader();
    const chunks = [];
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
    }
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    fs.writeFileSync(localFilePath, merged);
  }
  async cleanupRemoteBackups(_driveService, targetNode, entry) {
    var _a;
    await targetNode.refresh();
    const children = await targetNode.getChildren();
    const remoteFiles = children.filter((c) => c.type === "FILE").map((c) => {
      var _a2, _b, _c, _d, _e;
      return {
        node: c,
        name: c.fullName,
        size: (_a2 = c.size) != null ? _a2 : 0,
        modified: (_e = (_d = (_b = c.dateModified) == null ? void 0 : _b.getTime()) != null ? _d : (_c = c.dateCreated) == null ? void 0 : _c.getTime()) != null ? _e : 0
      };
    }).sort((a, b) => b.modified - a.modified);
    const toDelete = [];
    if (entry.maxFiles > 0 && remoteFiles.length > entry.maxFiles) {
      toDelete.push(...remoteFiles.slice(entry.maxFiles));
    }
    if (entry.maxSizeMB > 0) {
      const maxBytes = entry.maxSizeMB * 1024 * 1024;
      let total = 0;
      for (const f of remoteFiles) {
        total += f.size;
        if (total > maxBytes && !toDelete.includes(f)) {
          toDelete.push(f);
        }
      }
    }
    for (const f of toDelete) {
      try {
        await f.node.delete();
        this.log.debug(`Drive Sync: cleaned up remote file "${f.name}"`);
      } catch (err) {
        this.log.warn(
          `Drive Sync: failed to delete remote "${f.name}": ${(_a = err == null ? void 0 : err.message) != null ? _a : String(err)}`
        );
      }
    }
  }
  // ── Drive Sync sendTo handlers ───────────────────────────────────────────
  handleListLocalFolder(obj) {
    const msg = obj.message;
    const requestedPath = typeof (msg == null ? void 0 : msg.path) === "string" ? msg.path : "/";
    const resolved = path.resolve(requestedPath);
    (async () => {
      var _a;
      let entries = [];
      try {
        const dirents = fs.readdirSync(resolved, { withFileTypes: true });
        entries = dirents.filter((d) => {
          if (!d.isDirectory()) {
            return false;
          }
          if (d.name.startsWith(".")) {
            return false;
          }
          return true;
        }).map((d) => ({ name: d.name, path: path.join(resolved, d.name) })).sort((a, b) => a.name.localeCompare(b.name));
      } catch (err) {
        this.log.debug(`listLocalFolder: cannot read "${resolved}": ${(_a = err == null ? void 0 : err.message) != null ? _a : String(err)}`);
      }
      const parent = resolved !== path.parse(resolved).root ? path.dirname(resolved) : null;
      this.sendCallback(obj, { success: true, path: resolved, parent, entries });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleDriveSyncGetBackitupInfo(obj) {
    (async () => {
      var _a;
      const instances = [];
      for (let i = 0; i < 10; i++) {
        const instId = `system.adapter.backitup.${i}`;
        try {
          const instObj = await this.getForeignObjectAsync(instId);
          if (instObj) {
            const native = instObj.native;
            const cifsEnabled = native ? !!native.cifsEnabled : false;
            const ct = native == null ? void 0 : native.connectType;
            const cifsConnType = typeof ct === "string" ? ct : "";
            const cp = native ? (_a = native.cifsDir) != null ? _a : native.backupDir : void 0;
            const cifsPath = typeof cp === "string" ? cp : "";
            instances.push({ instance: `backitup.${i}`, cifsEnabled, cifsConnType, cifsPath });
          }
        } catch {
        }
      }
      this.sendCallback(obj, { success: true, installed: instances.length > 0, instances });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleDriveSyncGetStatus(obj) {
    (async () => {
      var _a;
      await this.loadDriveSyncMeta();
      const driveObj = await this.getObjectAsync("drive");
      let meta = { entries: [], conflicts: [] };
      if ((_a = driveObj == null ? void 0 : driveObj.native) == null ? void 0 : _a.syncMeta) {
        try {
          meta = JSON.parse(driveObj.native.syncMeta);
        } catch {
        }
      }
      this.sendCallback(obj, { success: true, ...meta });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
  handleDriveSyncResolveConflict(obj) {
    const msg = obj.message;
    if (!msg || typeof msg !== "object") {
      this.sendCallback(obj, { success: false, error: "Message must be an object" });
      return;
    }
    const entryId = msg.entryId;
    const fileName = msg.fileName;
    const action = msg.action;
    if (!entryId || !fileName || !action) {
      this.sendCallback(obj, { success: false, error: "Required: entryId, fileName, action" });
      return;
    }
    (async () => {
      var _a, _b;
      const driveObj = await this.getObjectAsync("drive");
      let meta = { entries: [], conflicts: [] };
      if ((_a = driveObj == null ? void 0 : driveObj.native) == null ? void 0 : _a.syncMeta) {
        try {
          meta = JSON.parse(driveObj.native.syncMeta);
        } catch {
        }
      }
      meta.conflicts = meta.conflicts.filter((c) => !(c.entryId === entryId && c.fileName === fileName));
      if (action === "overwrite-remote" || action === "keep-both") {
        const entries = this.getDriveSyncEntries();
        const entry = entries.find((e) => e.id === entryId);
        if (entry && this.icloud && this.config.driveEnabled) {
          try {
            const driveService = this.getDriveService();
            const overrideEntry = {
              ...entry,
              conflictResolution: action
            };
            const entryMeta = { id: entry.id, lastSync: 0, lastError: "", filesSynced: 0, totalSizeMB: 0 };
            await this.syncEntry(driveService, overrideEntry, entryMeta, meta);
            entryMeta.lastSync = Date.now();
            const idx = meta.entries.findIndex((e) => e.id === entry.id);
            if (idx >= 0) {
              meta.entries[idx] = entryMeta;
            } else {
              meta.entries.push(entryMeta);
            }
          } catch (err) {
            this.log.warn(
              `Drive Sync: conflict resolution sync failed: ${(_b = err == null ? void 0 : err.message) != null ? _b : String(err)}`
            );
          }
        }
      }
      await this.saveDriveSyncMeta(meta);
      this.sendCallback(obj, { success: true });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
    });
  }
}
if (require.main !== module) {
  module.exports = (options) => new Icloud(options);
} else {
  (() => new Icloud())();
}
//# sourceMappingURL=main.js.map
