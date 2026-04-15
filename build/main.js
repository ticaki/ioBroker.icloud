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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_lib = __toESM(require("./lib/index"));
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
  { id: "distanceKm", name: "Distance from Home", type: "number", role: "value.distance" }
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
    this.subscribeStates("mfa.code");
    this.subscribeStates("findme.*.ping");
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
      this.log.info("MFA required \u2014 enter the 6-digit Apple code into state mfa.code");
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
    var _a, _b, _c, _d, _e, _f;
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
      await this.loadFindMyIdMap();
      await this.refreshFindMyDevices(locationPoints);
      this.scheduleFindMyRefresh(locationPoints);
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
        return ((_a2 = p.index) == null ? void 0 : _a2.trim()) && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude));
      }
    );
    if (pts.length > 0) {
      return pts.map((p) => {
        var _a2;
        return {
          index: p.index.trim(),
          lat: Number(p.latitude),
          lon: Number(p.longitude),
          name: ((_a2 = p.name) == null ? void 0 : _a2.trim()) || p.index.trim()
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    if (!this.icloud) {
      return;
    }
    try {
      const findMe = this.icloud.getService("findme");
      await findMe.refresh();
      const devices = findMe.devices;
      const regularDevices = [];
      const accessories = [];
      const familyDevices = [];
      for (const [, dev] of devices) {
        const d = dev.deviceInfo;
        this.log.debug(JSON.stringify(d));
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
        this.findMyCleanupDone = true;
      }
      await this.extendObject("findme", {
        type: "folder",
        common: { name: "FindMy" },
        native: {}
      });
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
            await this.setState(`${safeId}.features.${feat}`, val, true);
          }
        }
        const loc = d.location;
        const distKm = loc && locationPoints.length > 0 ? haversineKm(locationPoints[0].lat, locationPoints[0].lon, loc.latitude, loc.longitude) : null;
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
          distanceKm: distKm !== null ? Math.round(distKm * 1e3) / 1e3 : null
        };
        for (const [key, val] of Object.entries(vals)) {
          if (val !== null) {
            await this.setState(`${safeId}.${key}`, val, true);
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
            await this.setState(`${safeId}.distances.${pt.index}`, distM, true);
          }
        }
      }
    } catch (err) {
      this.log.warn(`FindMy refresh failed: ${(_p = err == null ? void 0 : err.message) != null ? _p : String(err)}`);
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
    let max = 0;
    for (const v of this.findMyIdMap.values()) {
      const n = parseInt(v, 10);
      if (n > max) {
        max = n;
      }
    }
    const next = String(max + 1).padStart(6, "0");
    this.findMyIdMap.set(apiId, next);
    return next;
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
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    try {
      if (this.findMyRefreshTimer) {
        this.clearTimeout(this.findMyRefreshTimer);
        this.findMyRefreshTimer = null;
      }
      if (this.icloud) {
        this.icloud.removeAllListeners();
        this.icloud = null;
      }
      callback();
    } catch {
      callback();
    }
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
      this.log.debug(`State update (ack=true, ignoring): ${id} = ${state.val}`);
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
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Icloud(options);
} else {
  (() => new Icloud())();
}
//# sourceMappingURL=main.js.map
