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
var import_build = __toESM(require("../icloud-lib/build/index"));
class Icloud extends utils.Adapter {
  icloud = null;
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
    await this.setObjectNotExistsAsync("account", {
      type: "channel",
      common: { name: "Account Information" },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.fullName", {
      type: "state",
      common: { name: "Full Name", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.firstName", {
      type: "state",
      common: { name: "First Name", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.lastName", {
      type: "state",
      common: { name: "Last Name", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.appleId", {
      type: "state",
      common: { name: "Apple ID", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.countryCode", {
      type: "state",
      common: { name: "Country Code", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("mfa", {
      type: "channel",
      common: { name: "Multi-Factor Authentication" },
      native: {}
    });
    await this.setObjectNotExistsAsync("mfa.code", {
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
    await this.setObjectNotExistsAsync("mfa.required", {
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
    this.setState("info.connection", false, true);
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
    this.log.debug("Subscribed to mfa.code");
    await this.connectToiCloud();
  }
  async connectToiCloud() {
    var _a;
    const dataDirectory = utils.getAbsoluteInstanceDataDir(this);
    this.log.debug(`Using data directory: ${dataDirectory}`);
    this.icloud = new import_build.default({
      username: this.config.username.trim(),
      password: this.config.password,
      saveCredentials: false,
      trustDevice: true,
      dataDirectory,
      authMethod: "srp",
      logger: (level, ...args) => {
        const msg = args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
        if (level === import_build.LogLevel.Debug) this.log.debug(`[icloud.js] ${msg}`);
        else if (level === import_build.LogLevel.Info) this.log.info(`[icloud.js] ${msg}`);
        else if (level === import_build.LogLevel.Warning) this.log.warn(`[icloud.js] ${msg}`);
        else if (level === import_build.LogLevel.Error) this.log.error(`[icloud.js] ${msg}`);
      }
    });
    this.icloud.on("Started", () => {
      this.log.debug("iCloud auth started \u2014 credentials submitted, waiting for response");
    });
    this.icloud.on("MfaRequested", () => {
      var _a2, _b;
      this.log.info("MFA required \u2014 enter the 6-digit Apple code into state mfa.code");
      this.log.debug(`iCloud status is now: ${(_b = (_a2 = this.icloud) == null ? void 0 : _a2.status) != null ? _b : "unknown"}`);
      this.setState("mfa.required", true, true);
      this.setState("info.connection", false, true);
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
      this.setState("info.connection", false, true);
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
        this.log.warn(`Apple Rate-Limit erkannt \u2014 n\xE4chster Versuch in ${retryTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} `);
        this.setTimeout(() => {
          this.log.info("Rate-Limit Wartezeit abgelaufen \u2014 starte erneuten Login-Versuch");
          this.connectToiCloud().catch(() => {
          });
        }, retryMinutes * 60 * 1e3);
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
    const info = this.icloud.accountInfo;
    if (!(info == null ? void 0 : info.dsInfo)) {
      this.log.warn("iCloud Ready but accountInfo/dsInfo is unavailable");
      this.setState("info.connection", true, true);
      this.setState("mfa.required", false, true);
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
      this.setState(id, val, true);
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
      if (inactive.length) this.log.debug(`Inactive iCloud services: ${inactive.join(", ")}`);
    }
    const family = (_f = (_e = info.iCloudInfo) == null ? void 0 : _e.familyMembers) != null ? _f : [];
    if (family.length)
      this.log.info(`Family members (${family.length}): ${family.map((m) => {
        var _a2, _b2;
        return (_b2 = (_a2 = m.fullName) != null ? _a2 : m.appleId) != null ? _b2 : "?";
      }).join(", ")}`);
    if (activeServices.includes("findme")) {
      try {
        const findMe = this.icloud.getService("findme");
        await findMe.refresh();
        const devices = findMe.devices;
        this.log.info(`FindMy: ${devices.size} device(s) found`);
        for (const [, dev] of devices) {
          const d = (_g = dev.deviceInfo) != null ? _g : dev;
          const locStr = d.location ? `${(_h = d.location.latitude) == null ? void 0 : _h.toFixed(5)}, ${(_i = d.location.longitude) == null ? void 0 : _i.toFixed(5)} (${(_j = d.location.positionType) != null ? _j : "?"})` : "no location";
          const bat = d.batteryLevel != null ? `${Math.round(d.batteryLevel * 100)}% (${(_k = d.batteryStatus) != null ? _k : "?"})` : "?";
          this.log.info(
            `  \u2022 ${(_l = d.name) != null ? _l : "?"} [${(_o = (_n = (_m = d.deviceDisplayName) != null ? _m : d.modelDisplayName) != null ? _n : d.deviceClass) != null ? _o : "?"}] \u2014 status: ${(_p = d.deviceStatus) != null ? _p : "?"}, battery: ${bat}, location: ${locStr}`
          );
        }
      } catch (err) {
        this.log.warn(`FindMy fetch failed: ${(_q = err == null ? void 0 : err.message) != null ? _q : String(err)}`);
      }
    }
    this.log.info("iCloud connection established successfully");
    this.setState("info.connection", true, true);
    this.setState("mfa.required", false, true);
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    try {
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
        this.log.warn(`MFA code received but iCloud status is "${status}" (expected "MfaRequested") \u2014 submitting anyway`);
      }
      this.log.info(`Submitting MFA code (iCloud status: ${status})`);
      this.icloud.provideMfaCode(raw).catch((err) => {
        var _a2;
        this.log.error(`Failed to submit MFA code: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : String(err)}`);
      });
    }
  }
  /**
   * Is called if a message is sent to this instance.
   *
   * @param obj - Message object
   */
  onMessage(obj) {
    if (typeof obj !== "object" || !obj.message) return;
    this.log.debug(`Message received: command="${obj.command}", message="${JSON.stringify(obj.message)}"`);
    if (obj.command === "submitMfa") {
      const code = String(obj.message).trim();
      if (code.length === 6 && this.icloud) {
        this.icloud.provideMfaCode(code).then(() => {
          if (obj.callback) this.sendTo(obj.from, obj.command, { success: true }, obj.callback);
        }).catch((err) => {
          if (obj.callback)
            this.sendTo(
              obj.from,
              obj.command,
              { success: false, error: err == null ? void 0 : err.message },
              obj.callback
            );
        });
      } else {
        if (obj.callback)
          this.sendTo(obj.from, obj.command, { success: false, error: "Invalid code" }, obj.callback);
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
