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
var lib_exports = {};
__export(lib_exports, {
  LogLevel: () => LogLevel,
  default: () => iCloudService,
  iCloudServiceStatus: () => iCloudServiceStatus
});
module.exports = __toCommonJS(lib_exports);
var import_events = __toESM(require("events"));
var import_fs = __toESM(require("fs"));
var import_fetch_cookie = __toESM(require("fetch-cookie"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_crypto = __toESM(require("crypto"));
var import_tough_cookie = require("tough-cookie");
var import_authStore = require("./auth/authStore");
var import_iCSRPAuthenticator = require("./auth/iCSRPAuthenticator.js");
var import_consts = require("./consts");
var import_account = require("./services/account");
var import_calendar = require("./services/calendar");
var import_drive = require("./services/drive");
var import_findMy = require("./services/findMy");
var import_photos = require("./services/photos");
var import_ubiquity = require("./services/ubiquity");
const LogLevel = {
  Debug: 0,
  Info: 1,
  Warning: 2,
  Error: 3,
  Silent: Infinity
};
var iCloudServiceStatus = /* @__PURE__ */ ((iCloudServiceStatus2) => {
  iCloudServiceStatus2["NotStarted"] = "NotStarted";
  iCloudServiceStatus2["Started"] = "Started";
  iCloudServiceStatus2["MfaRequested"] = "MfaRequested";
  iCloudServiceStatus2["Authenticated"] = "Authenticated";
  iCloudServiceStatus2["Trusted"] = "Trusted";
  iCloudServiceStatus2["Ready"] = "Ready";
  iCloudServiceStatus2["Error"] = "Error";
  return iCloudServiceStatus2;
})(iCloudServiceStatus || {});
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
class iCloudService extends import_events.default {
  /**
   * The authentication store for this service instance.
   * Manages cookies & trust tokens.
   */
  authStore;
  /**
   * Shared CookieJar — mirrors pyicloud's requests.Session() cookiejar.
   * fetch-cookie stores every Set-Cookie response header here (including from
   * 503 / error responses) and sends matching cookies automatically.
   */
  cookieJar;
  /**
   * Cookie-jar-backed fetch — native globalThis.fetch wrapped with fetch-cookie
   * for automatic cookie handling across all domains.
   */
  fetch;
  /**
   * The options for this service instance.
   */
  options;
  /**
   * The status of the iCloudService.
   */
  status = "NotStarted" /* NotStarted */;
  /*
   *  Has PCS (private/protected cloud service?) enabled.
   *  The check is implemented by checking if the `isDeviceConsentedForPCS` key is present in the `requestWebAccessState` object.
   */
  pcsEnabled;
  /**
   * PCS access is granted.
   */
  pcsAccess;
  /**
   * Has ICRS (iCloud Recovery Service) disabled.
   * This should only be true when iCloud Advanced Data Protection is enabled.
   */
  ICDRSDisabled;
  accountInfo;
  /**
   * A promise that can be awaited that resolves when the iCloudService is ready.
   * Will reject if an error occurs during authentication.
   */
  awaitReady = new Promise((resolve, reject) => {
    this.on("Ready" /* Ready */, resolve);
    this.on("Error" /* Error */, reject);
  });
  constructor(options) {
    super();
    this.options = options;
    if (!this.options.dataDirectory) {
      this.options.dataDirectory = import_path.default.join(import_os.default.homedir(), ".icloud");
    }
    this.cookieJar = new import_tough_cookie.CookieJar();
    this.fetch = (0, import_fetch_cookie.default)(globalThis.fetch, this.cookieJar);
    this.authStore = new import_authStore.iCloudAuthenticationStore(this);
  }
  _log(level, ...args) {
    if (typeof this.options.logger === "function") {
      this.options.logger(level, ...args);
    } else {
      if (LogLevel[this.options.logger || "Debug"] > level) {
        return;
      }
      args.unshift("[icloud]");
      if (level === LogLevel.Debug) {
        console.debug(...args);
      } else if (level === LogLevel.Info) {
        console.info(...args);
      } else if (level === LogLevel.Warning) {
        console.warn(...args);
      } else if (level === LogLevel.Error) {
        console.error(...args);
      }
    }
  }
  _setState(state, ...args) {
    this._log(LogLevel.Debug, "State changed to:", state);
    this.status = state;
    this.emit(state, ...args);
  }
  /**
   * Authenticates to the iCloud service.
   * If a username is not passed to this function, it will use the one provided to the options object in the constructor, failing that, it will find the first result in the system's keychain matching https://idmsa.apple.com
   * The same applies to the password. If it is not provided to this function, the options object will be used, and then it will check the keychain for a keychain matching the email for idmsa.apple.com
   *
   * @param username The username to use instead of the one provided in this iCloudService's options
   * @param password The password to use instead of the one provided in this iCloudService's options
   */
  async authenticate(username, password) {
    var _a;
    username = username || this.options.username;
    password = password || this.options.password;
    if (!username) {
      try {
        const keytarMod = require("keytar");
        const saved = (await keytarMod.findCredentials("https://idmsa.apple.com"))[0];
        if (!saved) {
          throw new Error("Username was not provided and could not be found in keychain");
        }
        username = saved.account;
        this._log(LogLevel.Debug, "Username found in keychain:", username);
      } catch (e) {
        throw new Error(
          `Username was not provided, and unable to use Keytar to find saved credentials${String(e)}`
        );
      }
    }
    if (typeof username !== "string") {
      throw new TypeError(
        `authenticate(username?: string, password?: string): 'username' was ${(username || JSON.stringify(username)).toString()}`
      );
    }
    this.options.username = username;
    if (!password) {
      try {
        password = await // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("keytar").findPassword(
          "https://idmsa.apple.com",
          username != null ? username : ""
        );
      } catch (e) {
        throw new Error(
          `Password was not provided, and unable to use Keytar to find saved credentials${String(e)}`
        );
      }
    }
    if (typeof password !== "string") {
      throw new TypeError(
        `authenticate(username?: string, password?: string): 'password' was ${(password || JSON.stringify(password)).toString()}`
      );
    }
    Object.defineProperty(this.options, "password", {
      enumerable: false,
      // hide it from for..in
      value: password
    });
    if (!username) {
      throw new Error("Username is required");
    }
    if (!password) {
      throw new Error("Password is required");
    }
    if (!import_fs.default.existsSync(this.options.dataDirectory)) {
      import_fs.default.mkdirSync(this.options.dataDirectory);
    }
    this.authStore.loadSession(this.options.username);
    this.authStore.loadCookieJar(this.options.username);
    if (!this.authStore.trustToken) {
      this.authStore.loadTrustToken(this.options.username);
    }
    const clientId = this.authStore.clientId || `auth-${import_crypto.default.randomUUID().toLowerCase()}`;
    if (!this.authStore.clientId) {
      this.authStore.clientId = clientId;
      this.authStore.saveSession(this.options.username);
    }
    this._setState("Started" /* Started */);
    try {
      if (this.authStore.sessionToken) {
        try {
          this._log(LogLevel.Debug, "[auth] Validating existing session token...");
          const validateResponse = await this.fetch("https://setup.icloud.com/setup/ws/1/validate", {
            headers: this.authStore.getHeaders(),
            method: "POST",
            body: "null"
          });
          this.authStore.extractSessionHeaders(validateResponse);
          if (validateResponse.status === 200) {
            this._log(LogLevel.Debug, "[auth] Session token valid \u2014 skipping full signin");
            try {
              this.accountInfo = await validateResponse.json();
            } catch {
            }
            this.authStore.saveSession(this.options.username);
            this._setState("Trusted" /* Trusted */);
            void this._getiCloudCookies();
            return;
          }
          this._log(
            LogLevel.Debug,
            `[auth] Session token invalid (HTTP ${validateResponse.status}) \u2014 doing full signin`
          );
        } catch (e) {
          this._log(LogLevel.Debug, "[auth] Session token check failed:", String(e));
        }
      }
      const sessionAuthHeaders = {
        ...import_consts.AUTH_HEADERS,
        "X-Apple-OAuth-State": clientId,
        ...this.authStore.scnt ? { scnt: this.authStore.scnt } : {},
        ...this.authStore.sessionId ? { "X-Apple-ID-Session-Id": this.authStore.sessionId } : {}
      };
      let authEndpoint = "signin";
      let authData = {
        accountName: this.options.username,
        trustTokens: this.authStore.trustToken ? [this.authStore.trustToken] : [],
        rememberMe: true
        // always true — matches pyicloud behaviour
      };
      if (this.options.authMethod === "srp") {
        const authenticator = new import_iCSRPAuthenticator.GSASRPAuthenticator(username);
        const initData = await authenticator.getInit();
        this._log(LogLevel.Debug, "[auth] SRP init \u2192 POST", `${import_consts.AUTH_ENDPOINT}signin/init`);
        const initRaw = await this.fetch(`${import_consts.AUTH_ENDPOINT}signin/init`, {
          headers: sessionAuthHeaders,
          method: "POST",
          body: JSON.stringify(initData)
        });
        this._log(LogLevel.Debug, "[auth] SRP init response status:", initRaw.status);
        if (!initRaw.ok) {
          const errBody = (await initRaw.text()).slice(0, 200);
          throw new Error(`SRP init failed (${initRaw.status}): ${errBody}`);
        }
        const initResponse = await initRaw.json();
        authData = {
          ...authData,
          ...await authenticator.getComplete(password, initResponse)
        };
        authEndpoint = "signin/complete";
      } else {
        authData.password = this.options.password;
      }
      const signinUrl = `${import_consts.AUTH_ENDPOINT + authEndpoint}?isRememberMeEnabled=true`;
      this._log(LogLevel.Debug, "[auth] signin \u2192 POST", signinUrl);
      const authResponse = await this.fetch(signinUrl, {
        headers: sessionAuthHeaders,
        method: "POST",
        body: JSON.stringify(authData)
      });
      this._log(LogLevel.Debug, "[auth] signin response status:", authResponse.status);
      this._log(
        LogLevel.Debug,
        "[auth] signin response headers:",
        JSON.stringify(Object.fromEntries(authResponse.headers.entries()))
      );
      this.authStore.extractSessionHeaders(authResponse);
      this.authStore.saveCookieJar(this.options.username);
      this.authStore.saveSession(this.options.username);
      if (authResponse.status == 200) {
        if (this.authStore.processAuthSecrets(authResponse, this.options.username)) {
          this._setState("Trusted" /* Trusted */);
          void this._getiCloudCookies();
        } else {
          throw new Error("Unable to process auth response!");
        }
      } else if (authResponse.status == 409) {
        if (this.authStore.processAuthSecrets(authResponse, this.options.username)) {
          const body = await authResponse.text();
          this._log(LogLevel.Debug, "[auth] 409 body:", body);
          let accountLoginOk = false;
          try {
            const setupData = {
              accountCountryCode: this.authStore.accountCountry,
              dsWebAuthToken: this.authStore.sessionToken,
              extended_login: true,
              trustToken: (_a = this.authStore.trustToken) != null ? _a : ""
            };
            this._log(
              LogLevel.Debug,
              "[auth] POST",
              import_consts.SETUP_ENDPOINT,
              "(accountLogin after 409 \u2014 triggers MFA push and may complete auth)"
            );
            const setupResp = await this.fetch(import_consts.SETUP_ENDPOINT, {
              headers: import_consts.DEFAULT_HEADERS,
              method: "POST",
              body: JSON.stringify(setupData)
            });
            this.authStore.extractSessionHeaders(setupResp);
            this.authStore.saveCookieJar(this.options.username);
            this.authStore.saveSession(this.options.username);
            this._log(LogLevel.Debug, "[auth] accountLogin (post-409) status:", setupResp.status);
            if (setupResp.status === 200) {
              accountLoginOk = true;
              try {
                this.accountInfo = await setupResp.json();
              } catch {
              }
            } else {
              await setupResp.text();
            }
          } catch (pushTriggerErr) {
            this._log(
              LogLevel.Debug,
              "[auth] accountLogin (post-409) failed:",
              pushTriggerErr.toString()
            );
          }
          if (accountLoginOk) {
            this._log(LogLevel.Debug, "[auth] accountLogin after 409 succeeded \u2014 skipping MFA");
            try {
              await this.checkPCS();
            } catch {
            }
            this.authStore.saveSession(this.options.username);
            this._setState("Ready" /* Ready */);
          } else {
            this._setState("MfaRequested" /* MfaRequested */);
          }
        } else {
          throw new Error("Unable to process auth response (409) \u2014 missing session headers!");
        }
      } else {
        const body = (await authResponse.text()).slice(0, 300);
        this._log(LogLevel.Error, "[auth] unexpected response body (truncated):", body);
        if (authResponse.status == 401 || authResponse.status == 403) {
          throw new Error(`Falsche Apple-ID oder falsches Passwort (HTTP ${authResponse.status}): ${body}`);
        }
        if (authResponse.status == 503) {
          throw new Error(
            "RATE_LIMITED: Apple hat den Login vor\xFCbergehend gesperrt (HTTP 503). Bitte 30\u201360 Minuten warten und dann erneut versuchen."
          );
        }
        throw new Error(`Unbekannter Fehler beim Login (HTTP ${authResponse.status}): ${body}`);
      }
    } catch (e) {
      this._setState("Error" /* Error */, e);
      throw e;
    }
  }
  /**
   * Call this to provide the MFA code that was sent to the user's devices.
   *
   * @param code The six digit MFA code.
   */
  async provideMfaCode(code) {
    if (typeof code !== "string") {
      throw new TypeError(`provideMfaCode(code: string): 'code' was ${code.toString()}`);
    }
    code = code.replace(/\D/g, "");
    if (code.length !== 6) {
      this._log(LogLevel.Warning, "Provided MFA wasn't 6-digits!");
    }
    if (!this.authStore.validateAuthSecrets()) {
      throw new Error("Cannot provide MFA code without calling authenticate first!");
    }
    const authData = { securityCode: { code } };
    const authResponse = await this.fetch(`${import_consts.AUTH_ENDPOINT}verify/trusteddevice/securitycode`, {
      headers: this.authStore.getMfaHeaders(),
      method: "POST",
      body: JSON.stringify(authData)
    });
    if (authResponse.status == 204) {
      this._setState("Authenticated" /* Authenticated */);
      if (this.options.trustDevice) {
        void this._getTrustToken().then(this._getiCloudCookies.bind(this));
      } else {
        void this._getiCloudCookies();
      }
    } else {
      throw new Error(`Invalid status code: ${authResponse.status} ${await authResponse.text()}`);
    }
  }
  async _getTrustToken() {
    if (!this.authStore.validateAuthSecrets()) {
      throw new Error("Cannot get auth token without calling authenticate first!");
    }
    this._log(LogLevel.Warning, "Trusting device");
    const authResponse = await this.fetch(`${import_consts.AUTH_ENDPOINT}2sv/trust`, { headers: this.authStore.getMfaHeaders() });
    if (this.authStore.processAccountTokens(this.options.username, authResponse)) {
      this._setState("Trusted" /* Trusted */);
    } else {
      this._log(LogLevel.Error, "Unable to trust device!");
    }
  }
  async _getiCloudCookies() {
    var _a;
    try {
      const data = {
        accountCountryCode: this.authStore.accountCountry,
        dsWebAuthToken: this.authStore.sessionToken,
        extended_login: true,
        trustToken: (_a = this.authStore.trustToken) != null ? _a : ""
      };
      this._log(LogLevel.Debug, "[setup] accountLogin \u2192 POST", import_consts.SETUP_ENDPOINT);
      const response = await this.fetch(import_consts.SETUP_ENDPOINT, {
        headers: import_consts.DEFAULT_HEADERS,
        method: "POST",
        body: JSON.stringify(data)
      });
      this._log(LogLevel.Debug, "[setup] accountLogin response status:", response.status);
      if (response.status == 200) {
        if (this.authStore.processCloudSetupResponse(response, this.options.username)) {
          try {
            this.accountInfo = await response.json();
          } catch (e) {
            this._log(LogLevel.Warning, "Could not get account info:", e);
          }
          try {
            await this.checkPCS();
          } catch (e) {
            this._log(LogLevel.Warning, "Could not get PCS state:", e);
          }
          this._setState("Ready" /* Ready */);
          if (this.options.saveCredentials) {
            try {
              const keytar = require("keytar");
              keytar.setPassword(
                "https://idmsa.apple.com",
                this.options.username,
                this.options.password
              );
            } catch (e) {
              this._log(LogLevel.Warning, "Unable to save account credentials:", e);
            }
          }
        } else {
          throw new Error("Unable to process cloud setup response!");
        }
      } else {
        throw new Error(`Invalid status code: ${response.status}`);
      }
    } catch (e) {
      this._setState("Error" /* Error */, e);
      throw e;
    }
  }
  /**
   * Updates the PCS state (iCloudService.pcsEnabled, iCloudService.pcsAccess, iCloudService.ICDRSDisabled).
   */
  async checkPCS() {
    const pcsTest = await this.fetch("https://setup.icloud.com/setup/ws/1/requestWebAccessState", {
      headers: this.authStore.getHeaders(),
      method: "POST"
    });
    if (pcsTest.status == 200) {
      const j = await pcsTest.json();
      this.pcsEnabled = typeof j.isDeviceConsentedForPCS == "boolean";
      this.pcsAccess = this.pcsEnabled ? j.isDeviceConsentedForPCS : true;
      this.ICDRSDisabled = j.isICDRSDisabled || false;
    } else {
      throw new Error(`checkPCS: response code ${pcsTest.status}`);
    }
  }
  /**
   * Requests PCS access to a specific service. Required to call before accessing any PCS protected services when iCloud Advanced Data Protection is enabled.
   *
   * @remarks Should only be called when iCloudService.ICDRSDisabled is `false`, however this function will check for you, and immediately return as it's not required..
   * @experimental
   * @param appName The service name to request access to.
   */
  async requestServiceAccess(appName) {
    await this.checkPCS();
    if (!this.ICDRSDisabled) {
      this._log(LogLevel.Warning, "requestServiceAccess: ICRS is not disabled.");
      return true;
    }
    if (!this.pcsAccess) {
      const requestPcs = await this.fetch("https://setup.icloud.com/setup/ws/1/enableDeviceConsentForPCS", {
        headers: this.authStore.getHeaders(),
        method: "POST"
      });
      const requestPcsJson = await requestPcs.json();
      if (!requestPcsJson.isDeviceConsentNotificationSent) {
        throw new Error("Unable to request PCS access!");
      }
    }
    while (!this.pcsAccess) {
      await sleep(5e3);
      await this.checkPCS();
    }
    let pcsRequest = await this.fetch("https://setup.icloud.com/setup/ws/1/requestPCS", {
      headers: this.authStore.getHeaders(),
      method: "POST",
      body: JSON.stringify({ appName, derivedFromUserAction: true })
    });
    let pcsJson = await pcsRequest.json();
    while (true) {
      if (pcsJson.status == "success") {
        break;
      } else {
        switch (pcsJson.message) {
          case "Requested the device to upload cookies.":
          case "Cookies not available yet on server.":
            await sleep(5e3);
            break;
          default:
            this._log(LogLevel.Error, "unknown PCS request state", pcsJson);
        }
        pcsRequest = await this.fetch("https://setup.icloud.com/setup/ws/1/requestPCS", {
          headers: this.authStore.getHeaders(),
          method: "POST",
          body: JSON.stringify({ appName, derivedFromUserAction: false })
        });
        pcsJson = await pcsRequest.json();
      }
    }
    return true;
  }
  _serviceCache = {};
  /**
   * A mapping of service names to their classes.
   * This is used by {@link iCloudService.getService} to return the correct service class.
   *
   * @remarks You should **not** use this to instantiate services, use {@link iCloudService.getService} instead.
   * @see {@link iCloudService.getService}
   */
  serviceConstructors = {
    account: import_account.iCloudAccountDetailsService,
    findme: import_findMy.iCloudFindMyService,
    ubiquity: import_ubiquity.iCloudUbiquityService,
    drivews: import_drive.iCloudDriveService,
    calendar: import_calendar.iCloudCalendarService,
    photos: import_photos.iCloudPhotosService
  };
  /**
   * Returns an instance of the specified service. Results are cached, so subsequent calls will return the same instance.
   *
   * @param service The service name to return an instance of. Must be one of the keys in {@link iCloudService.serviceConstructors}.
   * @returns
   */
  getService(service) {
    var _a, _b, _c, _d;
    if (!this.serviceConstructors[service]) {
      throw new TypeError(
        `getService(service: string): 'service' was ${service.toString()}, must be one of ${Object.keys(this.serviceConstructors).join(", ")}`
      );
    }
    const webservices = (_b = (_a = this.accountInfo) == null ? void 0 : _a.webservices) != null ? _b : {};
    const ws = webservices;
    if (service === "photos") {
      this._serviceCache[service] = new this.serviceConstructors[service](
        this,
        (_c = webservices.ckdatabasews) == null ? void 0 : _c.url
      );
    }
    if (!this._serviceCache[service]) {
      this._serviceCache[service] = new this.serviceConstructors[service](this, (_d = ws[service]) == null ? void 0 : _d.url);
    }
    return this._serviceCache[service];
  }
  /**
   * Re-fetch iCloud webservices (accountLogin) using the current session token.
   * Mirrors pyicloud's _authenticate_with_credentials_service("find") pattern:
   * called automatically when FindMy returns 421/450/500 to get fresh service URLs.
   * Clears the service cache so getService() picks up the new URLs.
   *
   * @returns true on success, false if the session token is no longer valid.
   */
  async refreshWebservices() {
    var _a;
    if (!this.authStore.sessionToken) {
      return false;
    }
    try {
      const data = {
        accountCountryCode: this.authStore.accountCountry,
        dsWebAuthToken: this.authStore.sessionToken,
        extended_login: true,
        trustToken: (_a = this.authStore.trustToken) != null ? _a : ""
      };
      this._log(LogLevel.Debug, "[findmy] refreshWebservices \u2192 POST", import_consts.SETUP_ENDPOINT);
      const response = await this.fetch(import_consts.SETUP_ENDPOINT, {
        headers: import_consts.DEFAULT_HEADERS,
        method: "POST",
        body: JSON.stringify(data)
      });
      this._log(LogLevel.Debug, "[findmy] refreshWebservices response status:", response.status);
      if (response.status === 200) {
        this.authStore.processCloudSetupResponse(response, this.options.username);
        try {
          this.accountInfo = await response.json();
        } catch {
        }
        this._serviceCache = {};
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  _storage;
  /**
   * Gets the storage usage data for the account.
   *
   * @param refresh Force a refresh of the storage usage data.
   * @returns The storage usage data.
   */
  async getStorageUsage(refresh = false) {
    if (!refresh && this._storage) {
      return this._storage;
    }
    const response = await this.fetch("https://setup.icloud.com/setup/ws/1/storageUsageInfo", {
      headers: this.authStore.getHeaders()
    });
    const json = await response.json();
    this._storage = json;
    return this._storage;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LogLevel,
  iCloudServiceStatus
});
//# sourceMappingURL=index.js.map
