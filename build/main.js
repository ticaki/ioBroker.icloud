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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_lib = __toESM(require("./lib/index"));
var import_geo = require("./lib/geo");
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
  { id: "batteryLevel", name: "Battery Level", type: "number", role: "value.battery" },
  { id: "batteryStatus", name: "Battery Status", type: "string", role: "text" },
  { id: "isLocating", name: "Is Locating", type: "boolean", role: "indicator" },
  { id: "locationEnabled", name: "Location Enabled", type: "boolean", role: "indicator" },
  { id: "lostModeEnabled", name: "Lost Mode Enabled", type: "boolean", role: "indicator" },
  { id: "lowPowerMode", name: "Low Power Mode", type: "boolean", role: "indicator" },
  { id: "fmlyShare", name: "Family Share", type: "boolean", role: "indicator" },
  { id: "isConsideredAccessory", name: "Is Accessory", type: "boolean", role: "indicator" },
  { id: "deviceWithYou", name: "Device With You", type: "boolean", role: "indicator" },
  { id: "latitude", name: "Latitude", type: "number", role: "value.gps.latitude" },
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
  { id: "title", name: "Title", type: "string", role: "text" },
  { id: "guid", name: "GUID", type: "string", role: "text" },
  { id: "etag", name: "ETag", type: "string", role: "text" },
  { id: "pGuid", name: "Calendar GUID", type: "string", role: "text" },
  { id: "startDate", name: "Start Date", type: "number", role: "value.time" },
  { id: "endDate", name: "End Date", type: "number", role: "value.time" },
  { id: "masterStartDate", name: "Master Start Date", type: "number", role: "value.time" },
  { id: "masterEndDate", name: "Master End Date", type: "number", role: "value.time" },
  { id: "createdDate", name: "Created Date", type: "number", role: "value.time" },
  { id: "lastModifiedDate", name: "Last Modified Date", type: "number", role: "value.time" },
  { id: "allDay", name: "All Day", type: "boolean", role: "indicator" },
  { id: "duration", name: "Duration", type: "number", role: "value.interval", unit: "min" },
  { id: "url", name: "URL", type: "string", role: "url" },
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
  { id: "alarms", name: "Alarms (JSON)", type: "string", role: "json" }
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
  findMyCleanupDone = false;
  /** Maps Apple device API id → 6-digit zero-padded folder id (e.g. '000001') */
  findMyIdMap = /* @__PURE__ */ new Map();
  calendarRefreshTimer = null;
  remindersRefreshTimer = null;
  remindersSyncMapLoaded = false;
  driveRefreshTimer = null;
  accountStorageRefreshTimer = null;
  findMyFirstLoad = true;
  calendarFirstLoad = true;
  driveFirstLoad = true;
  accountStorageFirstLoad = true;
  geoLookup = new import_geo.GeoLookup();
  /** In-memory cache of last written state values — used to skip unchanged writes after adapter start. */
  stateCache = /* @__PURE__ */ new Map();
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
    this.subscribeStates("reminders.*.*.completed");
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
      saveCredentials: false,
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
      this.log.error(`iCloud authentication error: ${msg}`);
      this.log.debug(`iCloud error details: ${err instanceof Error ? err.stack : JSON.stringify(err)}`);
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
      } else {
        this.log.error(`Failed to start iCloud authentication: ${msg}`);
        this.log.debug(`authenticate() exception stack: ${err instanceof Error ? err.stack : String(err)}`);
      }
    }
  }
  /**
   * Called after the iCloud session reaches Ready state.
   * All post-login data fetching happens here — info.connection is set true only
   * after account info, available services and FindMy devices have been collected.
   */
  async onICloudReady() {
    var _a, _b, _c, _d, _e, _f, _g;
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
      if (this.config.findMyGeoEnabled) {
        const adapterRoot = path.join(__dirname, "..");
        this.geoLookup.load(adapterRoot, (msg) => this.log.info(msg));
      }
      await this.loadFindMyIdMap();
      await this.refreshFindMyDevices(locationPoints);
      this.scheduleFindMyRefresh(locationPoints);
    }
    if (activeServices.includes("calendar") && this.config.calendarEnabled) {
      await this.refreshCalendarEvents();
      this.scheduleCalendarRefresh();
    }
    if (activeServices.includes("reminders") && this.config.remindersEnabled) {
      await this.refreshReminders();
      this.scheduleRemindersRefresh();
    }
    if (activeServices.includes("drivews") && this.config.driveEnabled) {
      try {
        await this.icloud.requestServiceAccess("iclouddrive");
      } catch (err) {
        this.log.warn(`Drive PCS access failed: ${(_g = err == null ? void 0 : err.message) != null ? _g : String(err)}`);
      }
      await this.refreshDrive();
    }
    if (this.config.accountStorageEnabled) {
      await this.refreshAccountStorage();
      this.scheduleAccountStorageRefresh();
    }
    this.log.info("iCloud connection established successfully");
    await this.setState("info.connection", true, true);
    await this.setState("mfa.required", false, true);
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
   * Fetch FindMy devices and write states.
   *
   * @param locationPoints - configured location points for distance calculation
   */
  async refreshFindMyDevices(locationPoints) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t;
    if (!this.icloud) {
      return;
    }
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
      const allDevices = [...regularDevices, ...accessories, ...familyDevices];
      if (!this.findMyCleanupDone) {
        await this.cleanupFindMyObjects(allDevices);
        if (!this.config.findMyGeoEnabled) {
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
      let _geoTotalMs = 0;
      let _geoCount = 0;
      for (const d of allDevices) {
        const apiId = (_a = d.id) != null ? _a : "";
        if (!apiId) {
          this.log.warn(`FindMy: skipping device with empty id (name: ${(_b = d.name) != null ? _b : "?"})`);
          continue;
        }
        const numericId = this.getOrAssignFindMyNumericId(apiId);
        const safeId = `findme.${numericId}`;
        await this.extendObject(safeId, {
          type: "device",
          common: { name: (_d = (_c = d.name) != null ? _c : d.deviceDisplayName) != null ? _d : apiId },
          native: { id: apiId, baUUID: d.baUUID }
        });
        for (const def of FINDMY_DEVICE_STATES) {
          await this.extendObject(`${safeId}.${def.id}`, {
            type: "state",
            common: {
              name: def.name,
              type: def.type,
              role: def.role,
              read: true,
              write: false
            },
            native: {}
          });
        }
        if (this.config.findMyGeoEnabled) {
          await this.extendObject(`${safeId}.locationName`, {
            type: "state",
            common: {
              name: "Location (Municipality)",
              type: "string",
              role: "text",
              read: true,
              write: false
            },
            native: {}
          });
        }
        if ((_e = d.features) == null ? void 0 : _e.SND) {
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
                name: (_f = FINDMY_FEATURE_NAMES[feat]) != null ? _f : feat,
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
        const _geoResult = loc ? this.geoLookup.resolve(loc.latitude, loc.longitude) : "unknown";
        const _geoElapsed = loc ? Number(process.hrtime.bigint() - _geoT0) : 0;
        const vals = {
          name: (_g = d.name) != null ? _g : "",
          deviceClass: d.deviceClass,
          deviceDisplayName: d.deviceDisplayName,
          modelDisplayName: d.modelDisplayName,
          rawDeviceModel: d.rawDeviceModel,
          deviceStatus: d.deviceStatus,
          batteryLevel: Math.round(d.batteryLevel * 100),
          batteryStatus: d.batteryStatus,
          isLocating: d.isLocating,
          locationEnabled: d.locationEnabled,
          lostModeEnabled: d.lostModeEnabled,
          lowPowerMode: d.lowPowerMode,
          fmlyShare: d.fmlyShare,
          isConsideredAccessory: d.isConsideredAccessory,
          deviceWithYou: d.deviceWithYou,
          latitude: (_h = loc == null ? void 0 : loc.latitude) != null ? _h : null,
          longitude: (_i = loc == null ? void 0 : loc.longitude) != null ? _i : null,
          altitude: (_j = loc == null ? void 0 : loc.altitude) != null ? _j : null,
          horizontalAccuracy: (_k = loc == null ? void 0 : loc.horizontalAccuracy) != null ? _k : null,
          positionType: (_l = loc == null ? void 0 : loc.positionType) != null ? _l : null,
          locationTimestamp: (_m = loc == null ? void 0 : loc.timeStamp) != null ? _m : null,
          isOld: (_n = loc == null ? void 0 : loc.isOld) != null ? _n : null,
          isInaccurate: (_o = loc == null ? void 0 : loc.isInaccurate) != null ? _o : null,
          distanceKm: distKm !== null ? Math.round(distKm * 1e3) / 1e3 : null,
          ...this.config.findMyGeoEnabled ? { locationName: _geoResult } : {},
          ownerAppleId: d.prsId ? (_q = (_p = membersInfo[d.prsId]) == null ? void 0 : _p.appleId) != null ? _q : null : null,
          ownerName: d.prsId ? [(_r = membersInfo[d.prsId]) == null ? void 0 : _r.firstName, (_s = membersInfo[d.prsId]) == null ? void 0 : _s.lastName].filter(Boolean).join(" ") || null : null
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
      this.log.debug(
        `FindMy GEO timing: ${_geoCount}/${allDevices.length} device(s) with location, total ${(_geoTotalMs / 1e6).toFixed(3)} ms, avg ${(_geoCount ? _geoTotalMs / _geoCount / 1e6 : 0).toFixed(3)} ms/device`
      );
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
      this.log.warn(`FindMy refresh failed: ${(_t = err == null ? void 0 : err.message) != null ? _t : String(err)}`);
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
      this.log.warn(`FindMy interval is ${intervalMin} minutes \u2014 clamping to 120 minutes`);
      intervalMin = 120;
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$;
    if (!this.icloud) {
      return;
    }
    try {
      const calService = this.icloud.getService("calendar");
      const now = /* @__PURE__ */ new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startupResp = await calService.startup(monthStart, monthEnd);
      const collections = (_a = startupResp.Collection) != null ? _a : [];
      const events = (_b = startupResp.Event) != null ? _b : [];
      const maxCount = Math.max(1, Math.floor((_c = this.config.calendarEventCount) != null ? _c : 10));
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
        await this.setStateIfChanged(`calendar.${calId}.guid`, (_d = col.guid) != null ? _d : "");
        await this.setStateIfChanged(`calendar.${calId}.ctag`, (_e = col.ctag) != null ? _e : "");
        await this.setStateIfChanged(`calendar.${calId}.etag`, (_f = col.etag) != null ? _f : "");
        await this.setStateIfChanged(`calendar.${calId}.color`, (_g = col.color) != null ? _g : "");
        await this.setStateIfChanged(`calendar.${calId}.symbolicColor`, (_h = col.symbolicColor) != null ? _h : "");
        await this.setStateIfChanged(`calendar.${calId}.order`, (_i = col.order) != null ? _i : 0);
        await this.setStateIfChanged(`calendar.${calId}.enabled`, (_j = col.enabled) != null ? _j : false);
        await this.setStateIfChanged(`calendar.${calId}.visible`, (_k = col.visible) != null ? _k : false);
        await this.setStateIfChanged(`calendar.${calId}.readOnly`, (_l = col.readOnly) != null ? _l : false);
        await this.setStateIfChanged(`calendar.${calId}.isDefault`, (_m = col.isDefault) != null ? _m : false);
        await this.setStateIfChanged(`calendar.${calId}.isFamily`, (_n = col.isFamily) != null ? _n : false);
        await this.setStateIfChanged(`calendar.${calId}.isPublished`, (_o = col.isPublished) != null ? _o : false);
        await this.setStateIfChanged(`calendar.${calId}.isPrivatelyShared`, (_p = col.isPrivatelyShared) != null ? _p : false);
        await this.setStateIfChanged(
          `calendar.${calId}.extendedDetailsAreIncluded`,
          (_q = col.extendedDetailsAreIncluded) != null ? _q : false
        );
        await this.setStateIfChanged(
          `calendar.${calId}.shouldShowJunkUIWhenAppropriate`,
          (_r = col.shouldShowJunkUIWhenAppropriate) != null ? _r : false
        );
        await this.setStateIfChanged(`calendar.${calId}.shareTitle`, (_s = col.shareTitle) != null ? _s : "");
        await this.setStateIfChanged(`calendar.${calId}.prePublishedUrl`, (_t = col.prePublishedUrl) != null ? _t : "");
        await this.setStateIfChanged(`calendar.${calId}.supportedType`, (_u = col.supportedType) != null ? _u : "");
        await this.setStateIfChanged(`calendar.${calId}.objectType`, (_v = col.objectType) != null ? _v : "");
        await this.setStateIfChanged(
          `calendar.${calId}.createdDate`,
          (_w = this.localDateArrayToTimestamp(col.createdDate)) != null ? _w : null
        );
        await this.setStateIfChanged(
          `calendar.${calId}.lastModifiedDate`,
          (_x = this.localDateArrayToTimestamp(col.lastModifiedDate)) != null ? _x : null
        );
        const calEvents = (_y = eventsByCalendar.get(col.guid)) != null ? _y : [];
        for (let i = 1; i <= maxCount; i++) {
          const slotId = String(i).padStart(6, "0");
          const basePath = `calendar.${calId}.${slotId}`;
          const ev = calEvents[i - 1];
          await this.extendObject(basePath, {
            type: "folder",
            common: { name: (_z = ev == null ? void 0 : ev.title) != null ? _z : `Event ${slotId}` },
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
                write: false,
                ...s.unit ? { unit: s.unit } : {}
              },
              native: {}
            });
          }
          if (ev) {
            await this.setStateIfChanged(`${basePath}.title`, (_A = ev.title) != null ? _A : "");
            await this.setStateIfChanged(`${basePath}.guid`, (_B = ev.guid) != null ? _B : "");
            await this.setStateIfChanged(`${basePath}.etag`, (_C = ev.etag) != null ? _C : "");
            await this.setStateIfChanged(`${basePath}.pGuid`, (_D = ev.pGuid) != null ? _D : "");
            await this.setStateIfChanged(
              `${basePath}.startDate`,
              (_E = this.localDateArrayToTimestamp(ev.localStartDate)) != null ? _E : null
            );
            await this.setStateIfChanged(
              `${basePath}.endDate`,
              (_F = this.localDateArrayToTimestamp(ev.localEndDate)) != null ? _F : null
            );
            await this.setStateIfChanged(
              `${basePath}.masterStartDate`,
              (_G = this.localDateArrayToTimestamp(ev.masterStartDate)) != null ? _G : null
            );
            await this.setStateIfChanged(
              `${basePath}.masterEndDate`,
              (_H = this.localDateArrayToTimestamp(ev.masterEndDate)) != null ? _H : null
            );
            await this.setStateIfChanged(
              `${basePath}.createdDate`,
              (_I = this.localDateArrayToTimestamp(ev.createdDate)) != null ? _I : null
            );
            await this.setStateIfChanged(
              `${basePath}.lastModifiedDate`,
              (_J = this.localDateArrayToTimestamp(ev.lastModifiedDate)) != null ? _J : null
            );
            await this.setStateIfChanged(`${basePath}.allDay`, (_K = ev.allDay) != null ? _K : false);
            await this.setStateIfChanged(`${basePath}.duration`, (_L = ev.duration) != null ? _L : null);
            await this.setStateIfChanged(`${basePath}.url`, (_M = ev.url) != null ? _M : "");
            await this.setStateIfChanged(`${basePath}.tz`, (_N = ev.tz) != null ? _N : "");
            await this.setStateIfChanged(`${basePath}.tzname`, (_O = ev.tzname) != null ? _O : "");
            await this.setStateIfChanged(`${basePath}.startDateTZOffset`, (_P = ev.startDateTZOffset) != null ? _P : "");
            await this.setStateIfChanged(`${basePath}.icon`, (_Q = ev.icon) != null ? _Q : 0);
            await this.setStateIfChanged(`${basePath}.readOnly`, (_R = ev.readOnly) != null ? _R : false);
            await this.setStateIfChanged(`${basePath}.transparent`, (_S = ev.transparent) != null ? _S : false);
            await this.setStateIfChanged(`${basePath}.hasAttachments`, (_T = ev.hasAttachments) != null ? _T : false);
            await this.setStateIfChanged(
              `${basePath}.recurrenceException`,
              (_U = ev.recurrenceException) != null ? _U : false
            );
            await this.setStateIfChanged(`${basePath}.recurrenceMaster`, (_V = ev.recurrenceMaster) != null ? _V : false);
            await this.setStateIfChanged(
              `${basePath}.birthdayIsYearlessBday`,
              (_W = ev.birthdayIsYearlessBday) != null ? _W : false
            );
            await this.setStateIfChanged(
              `${basePath}.birthdayShowAsCompany`,
              (_X = ev.birthdayShowAsCompany) != null ? _X : false
            );
            await this.setStateIfChanged(
              `${basePath}.extendedDetailsAreIncluded`,
              (_Y = ev.extendedDetailsAreIncluded) != null ? _Y : false
            );
            await this.setStateIfChanged(
              `${basePath}.shouldShowJunkUIWhenAppropriate`,
              (_Z = ev.shouldShowJunkUIWhenAppropriate) != null ? _Z : false
            );
            await this.setStateIfChanged(`${basePath}.alarms`, JSON.stringify((__ = ev.alarms) != null ? __ : []));
          } else {
            for (const s of CALENDAR_EVENT_STATES) {
              await this.setStateIfChanged(`${basePath}.${s.id}`, null);
            }
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
      const msg = (_$ = err == null ? void 0 : err.message) != null ? _$ : String(err);
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
  // ── Reminders helpers ─────────────────────────────────────────────────────
  async refreshReminders() {
    var _a, _b;
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
        await this.extendObject("reminders", {
          type: "folder",
          common: { name: "Reminders" },
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
      const msg = (_b = err == null ? void 0 : err.message) != null ? _b : String(err);
      this.log.warn(`Reminders refresh failed: ${msg}`);
    }
  }
  async persistRemindersSyncMap() {
    if (!this.icloud || !this.remindersSyncMapLoaded) {
      return;
    }
    try {
      const remService = this.icloud.getService("reminders");
      await this.extendObject("reminders", {
        type: "folder",
        common: { name: "Reminders" },
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
  // ── iCloud Drive helpers ──────────────────────────────────────────────────
  async refreshDrive() {
    var _a, _b, _c;
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
      this.log.warn(`Drive refresh failed: ${msg}`);
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
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    const persistAndCleanup = async () => {
      await this.persistRemindersSyncMap();
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
        if (this.remindersRefreshTimer) {
          this.clearTimeout(this.remindersRefreshTimer);
          this.remindersRefreshTimer = null;
        }
        if (this.driveRefreshTimer) {
          this.clearTimeout(this.driveRefreshTimer);
          this.driveRefreshTimer = null;
        }
        if (this.accountStorageRefreshTimer) {
          this.clearTimeout(this.accountStorageRefreshTimer);
          this.accountStorageRefreshTimer = null;
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
    if (typeof obj !== "object" || !obj.message) {
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
    }
  }
  // ── onMessage Reminder handlers ───────────────────────────────────────────
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
    const parentId = msg.parentId;
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
      this.sendCallback(obj, { success: true, result });
    })().catch((err) => {
      var _a;
      this.sendCallback(obj, { success: false, error: (_a = err == null ? void 0 : err.message) != null ? _a : String(err) });
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
  sendCallback(obj, response) {
    if (obj.callback) {
      this.sendTo(obj.from, obj.command, response, obj.callback);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Icloud(options);
} else {
  (() => new Icloud())();
}
//# sourceMappingURL=main.js.map
