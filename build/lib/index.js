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
var import_node_events = __toESM(require("node:events"));
var import_node_fs = __toESM(require("node:fs"));
var import_fetch_cookie = __toESM(require("fetch-cookie"));
var import_node_os = __toESM(require("node:os"));
var import_node_path = __toESM(require("node:path"));
var import_node_crypto = __toESM(require("node:crypto"));
var import_tough_cookie = require("tough-cookie");
var import_authStore = require("./auth/authStore");
var import_iCSRPAuthenticator = require("./auth/iCSRPAuthenticator.js");
var import_fido2 = require("./auth/fido2");
var import_consts = require("./consts");
var import_account = require("./services/account");
var import_calendar = require("./services/calendar");
var import_drive = require("./services/drive");
var import_findMy = require("./services/findMy");
var import_photos = require("./services/photos");
var import_reminders = require("./services/reminders");
var import_contacts = require("./services/contacts");
var import_notes = require("./services/notes");
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
class iCloudService extends import_node_events.default {
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
   * Cancellable delay backed by the ioBroker adapter timer (adapter.delay).
   * Pending timers are cleared automatically when the adapter unloads.
   */
  delay;
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
   * Parsed trusted phone number from GET /appleauth/auth.
   * Populated during the MFA challenge phase and used by requestSmsMfaCode / provideMfaCode.
   * Mirrors pyiCloud's TrustedPhoneNumber dataclass.
   */
  _trustedPhone;
  /** Set after requestSmsMfaCode() — routes provideMfaCode to /verify/phone/securitycode */
  _smsPhoneNumberId;
  /**
   * Parsed FIDO2 security-key challenge from GET /appleauth/auth (Apple's `fsaChallenge`).
   * Present only for accounts that have hardware security keys enrolled — for those accounts
   * SMS / trusted-device 2FA is disabled by Apple and this is the ONLY way to satisfy MFA.
   * Consumed by authenticateWithSecurityKey(). See src/lib/auth/fido2.ts.
   */
  _securityKeyChallenge;
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
    this.delay = options.delay;
    if (!this.options.dataDirectory) {
      this.options.dataDirectory = import_node_path.default.join(import_node_os.default.homedir(), ".icloud");
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
   * If a username is not passed to this function, it will use the one provided to the options object in the constructor.
   * The same applies to the password.
   *
   * @param username The username to use instead of the one provided in this iCloudService's options
   * @param password The password to use instead of the one provided in this iCloudService's options
   */
  async authenticate(username, password) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    username = username || this.options.username;
    password = password || this.options.password;
    if (!username) {
      throw new Error("Username was not provided");
    }
    if (typeof username !== "string") {
      throw new TypeError(
        `authenticate(username?: string, password?: string): 'username' was ${(username || JSON.stringify(username)).toString()}`
      );
    }
    this.options.username = username;
    if (!password) {
      throw new Error("Password was not provided");
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
    if (!import_node_fs.default.existsSync(this.options.dataDirectory)) {
      import_node_fs.default.mkdirSync(this.options.dataDirectory);
    }
    this.authStore.loadSession(this.options.username);
    this.authStore.loadCookieJar(this.options.username);
    if (!this.authStore.trustToken) {
      this.authStore.loadTrustToken(this.options.username);
    }
    const clientId = this.authStore.clientId || `auth-${import_node_crypto.default.randomUUID().toLowerCase()}`;
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
      const buildSessionAuthHeaders = () => ({
        ...import_consts.AUTH_HEADERS,
        "X-Apple-OAuth-State": clientId,
        ...this.authStore.scnt ? { scnt: this.authStore.scnt } : {},
        ...this.authStore.sessionId ? { "X-Apple-ID-Session-Id": this.authStore.sessionId } : {}
      });
      let authEndpoint = "signin";
      let authData = {
        accountName: this.options.username,
        trustTokens: this.authStore.trustToken ? [this.authStore.trustToken] : [],
        rememberMe: true
        // always true — matches pyicloud behaviour
      };
      if (this.options.authMethod === "srp") {
        for (let attempt = 0; attempt < 2; attempt++) {
          const authenticator = new import_iCSRPAuthenticator.GSASRPAuthenticator(username);
          const initData = await authenticator.getInit();
          this._log(LogLevel.Debug, "[auth] SRP init \u2192 POST", `${import_consts.AUTH_ENDPOINT}signin/init`);
          const initRaw = await this.fetch(`${import_consts.AUTH_ENDPOINT}signin/init`, {
            headers: buildSessionAuthHeaders(),
            method: "POST",
            body: JSON.stringify(initData)
          });
          this._log(LogLevel.Debug, "[auth] SRP init response status:", initRaw.status);
          if (initRaw.ok) {
            this.authStore.extractSessionHeaders(initRaw);
            const initResponse = await initRaw.json();
            authData = {
              ...authData,
              ...await authenticator.getComplete(password, initResponse)
            };
            break;
          }
          if (initRaw.status === 409 && attempt === 0) {
            const staleBody = (await initRaw.text()).slice(0, 200);
            this._log(
              LogLevel.Debug,
              `[auth] SRP init returned 409 (${staleBody}) \u2014 discarding stale session and retrying once`
            );
            this.authStore.clearStaleSession(this.options.username);
            continue;
          }
          const errBody = (await initRaw.text()).slice(0, 200);
          if (initRaw.status === 409) {
            this.authStore.clearStaleSession(this.options.username);
            throw new Error(
              `SRP init failed (409): Apple lehnt den Login-Start ab. Bitte pr\xFCfe Apple-ID und Passwort und versuche es in einigen Minuten erneut. ${errBody}`
            );
          }
          throw new Error(`SRP init failed (${initRaw.status}): ${errBody}`);
        }
        authEndpoint = "signin/complete";
      } else {
        authData.password = this.options.password;
      }
      const signinUrl = `${import_consts.AUTH_ENDPOINT + authEndpoint}?isRememberMeEnabled=true`;
      this._log(LogLevel.Debug, "[auth] signin \u2192 POST", signinUrl);
      const authResponse = await this.fetch(signinUrl, {
        headers: buildSessionAuthHeaders(),
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
      if (authResponse.status == 200) {
        this.authStore.saveCookieJar(this.options.username);
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
              "[auth] accountLogin body:",
              JSON.stringify({
                accountCountryCode: setupData.accountCountryCode,
                dsWebAuthToken: setupData.dsWebAuthToken ? "(set)" : "(missing!)",
                extended_login: setupData.extended_login,
                trustToken: setupData.trustToken ? "(set)" : "(empty)"
              })
            );
            this._log(LogLevel.Debug, "[auth] POST", import_consts.SETUP_ENDPOINT, "(accountLogin)");
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
              try {
                const data = await setupResp.json();
                this.accountInfo = data;
                const requiresMfa = ((_c = (_b = data == null ? void 0 : data.dsInfo) == null ? void 0 : _b.hsaVersion) != null ? _c : 0) >= 2 && ((data == null ? void 0 : data.hsaChallengeRequired) === true || (data == null ? void 0 : data.hsaTrustedBrowser) === false);
                this._log(
                  LogLevel.Debug,
                  `[auth] accountLogin 200 \u2014 hsaTrustedBrowser=${data == null ? void 0 : data.hsaTrustedBrowser}, hsaChallengeRequired=${data == null ? void 0 : data.hsaChallengeRequired}, requiresMfa=${requiresMfa}`
                );
                if (!requiresMfa) {
                  accountLoginOk = true;
                }
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
            try {
              this._log(LogLevel.Debug, "[auth] GET /appleauth/auth \u2014 fetching auth options");
              const authResp = await this.fetch(import_consts.AUTH_ENDPOINT.replace(/\/$/, ""), {
                headers: this.authStore.getMfaHeaders()
              });
              this.authStore.extractSessionHeaders(authResp);
              const authRespText = await authResp.text();
              this._log(
                LogLevel.Debug,
                `[auth] GET /appleauth/auth \u2192 ${authResp.status}: ${authRespText}`
              );
              try {
                const authOptions = JSON.parse(authRespText);
                const phoneVerification = authOptions == null ? void 0 : authOptions.phoneNumberVerification;
                const phoneData = (_h = (_f = (_d = authOptions == null ? void 0 : authOptions.trustedPhoneNumber) != null ? _d : phoneVerification == null ? void 0 : phoneVerification.trustedPhoneNumber) != null ? _f : (_e = authOptions == null ? void 0 : authOptions.trustedPhoneNumbers) == null ? void 0 : _e[0]) != null ? _h : (_g = phoneVerification == null ? void 0 : phoneVerification.trustedPhoneNumbers) == null ? void 0 : _g[0];
                if ((phoneData == null ? void 0 : phoneData.id) !== void 0) {
                  this._trustedPhone = {
                    id: phoneData.id,
                    nonFTEU: typeof phoneData.nonFTEU === "boolean" ? phoneData.nonFTEU : void 0,
                    pushMode: typeof phoneData.pushMode === "string" ? phoneData.pushMode : void 0
                  };
                  this._log(
                    LogLevel.Debug,
                    `[auth] Trusted phone: id=${this._trustedPhone.id}, nonFTEU=${this._trustedPhone.nonFTEU}, pushMode=${this._trustedPhone.pushMode}`
                  );
                }
                const fsa = authOptions == null ? void 0 : authOptions.fsaChallenge;
                const keyHandles = fsa == null ? void 0 : fsa.keyHandles;
                if (fsa && typeof fsa.challenge === "string" && typeof fsa.rpId === "string" && Array.isArray(keyHandles) && keyHandles.every((k) => typeof k === "string")) {
                  this._securityKeyChallenge = {
                    challenge: fsa.challenge,
                    rpId: fsa.rpId,
                    keyHandles
                  };
                  this._log(
                    LogLevel.Debug,
                    `[auth] Security-key challenge present: rpId=${fsa.rpId}, ${keyHandles.length} keyHandle(s)`
                  );
                }
              } catch {
              }
              this._log(
                LogLevel.Debug,
                "[auth] PUT /appleauth/auth/verify/trusteddevice \u2014 requesting device push"
              );
              const pushResp = await this.fetch(`${import_consts.AUTH_ENDPOINT}verify/trusteddevice`, {
                headers: this.authStore.getMfaHeaders(),
                method: "PUT"
              });
              this.authStore.extractSessionHeaders(pushResp);
              const pushRespText = await pushResp.text();
              this._log(
                LogLevel.Debug,
                `[auth] PUT verify/trusteddevice \u2192 ${pushResp.status}: ${pushRespText.slice(0, 300)}`
              );
            } catch (e) {
              this._log(LogLevel.Debug, "[auth] auth challenge request failed (non-fatal):", String(e));
            }
            this._setState("MfaRequested" /* MfaRequested */);
          }
        } else {
          throw new Error("Unable to process auth response (409) \u2014 missing session headers!");
        }
      } else {
        const body = (await authResponse.text()).slice(0, 300);
        const knownErrorStatus = authResponse.status === 401 || authResponse.status === 403 || authResponse.status === 503;
        this._log(knownErrorStatus ? LogLevel.Debug : LogLevel.Error, "[auth] signin response body:", body);
        if (authResponse.status == 401 || authResponse.status == 403) {
          this.authStore.clearStaleSession(this.options.username);
          throw new Error(
            `STALE_SESSION_401: Falsche Apple-ID, falsches Passwort oder veraltete Session (HTTP ${authResponse.status}): ${body}`
          );
        }
        if (authResponse.status == 503) {
          this.authStore.saveCookieJar(this.options.username);
          this.authStore.saveSession(this.options.username);
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
   * Request Apple to send a 2FA code via SMS to the trusted phone number.
   * Use this when no push notification arrives on trusted devices.
   * Mirrors pyiCloud's `_request_sms_2fa_code`: throws if no trusted phone number is available.
   *
   * @param phoneNumberId - Optional explicit phone number ID. When omitted, the ID from Apple's auth response is used.
   */
  async requestSmsMfaCode(phoneNumberId) {
    var _a;
    let id;
    if (phoneNumberId !== void 0) {
      id = phoneNumberId;
    } else if (this._trustedPhone !== void 0) {
      id = this._trustedPhone.id;
    } else {
      id = 1;
      this._log(
        LogLevel.Warning,
        "[auth] No trusted phone number in auth options (security-key account?) \u2014 trying SMS fallback with phone id=1"
      );
    }
    const phonePayload = { id };
    if (((_a = this._trustedPhone) == null ? void 0 : _a.nonFTEU) !== void 0) {
      phonePayload.nonFTEU = this._trustedPhone.nonFTEU;
    }
    this._log(LogLevel.Debug, `[auth] PUT /appleauth/auth/verify/phone \u2014 requesting SMS code to phone id ${id}`);
    const resp = await this.fetch(`${import_consts.AUTH_ENDPOINT}verify/phone`, {
      headers: this.authStore.getMfaHeaders(),
      method: "PUT",
      body: JSON.stringify({ phoneNumber: phonePayload, mode: "sms" })
    });
    this.authStore.extractSessionHeaders(resp);
    const text = await resp.text();
    this._log(LogLevel.Debug, `[auth] SMS request \u2192 ${resp.status}: ${text.slice(0, 200)}`);
    if (!resp.ok) {
      throw new Error(`SMS request failed (${resp.status}): ${text.slice(0, 200)}`);
    }
    this._smsPhoneNumberId = id;
  }
  /**
   * True when Apple's MFA challenge for the current login requires a hardware security key
   * (the auth response carried an `fsaChallenge`). For such accounts SMS / trusted-device 2FA is
   * disabled by Apple, so {@link authenticateWithSecurityKey} is the only way forward.
   */
  get securityKeyRequested() {
    return this._securityKeyChallenge !== void 0;
  }
  /**
   * Probe whether this host can perform security-key login (Linux + libfido2 CLI tools present).
   * Cheap/synchronous — safe to call from the adapter to decide between offering the FIDO2 button
   * and showing a "not supported on this platform" hint.
   */
  get securityKeyCapability() {
    return (0, import_fido2.detectFido2Support)();
  }
  /**
   * Satisfy a security-key MFA challenge by producing a WebAuthn assertion with a physical key.
   *
   * Strategy (no device pinning — security keys often expose no unique USB serial): within a time
   * window, repeatedly enumerate the connected FIDO2 authenticators and offer each of Apple's
   * keyHandles to each device. A device that does NOT hold a given credential rejects instantly
   * and silently (no blink); only the matching key raises a user-presence prompt (blinks) and waits
   * for a touch. The first assertion that succeeds is POSTed to Apple's /verify/security/key
   * endpoint, after which the normal Authenticated → Trusted → Ready flow runs (mirroring
   * provideMfaCode). This works even with many identical keys plugged in at once.
   *
   * Mirrors pyicloud's `confirm_security_key()` for the Apple-facing request/encoding details.
   *
   * @param options                      Tuning parameters and the progress callback (all optional).
   * @param options.timeoutMs            Overall window to wait for a successful touch. Default 5 min.
   * @param options.pollIntervalMs       How often to re-scan for devices. Default 5 s.
   * @param options.perAttemptTimeoutMs  Per-assertion touch timeout before retrying. Default 25 s.
   * @param options.onProgress           Live status callback for the adapter UI.
   */
  async authenticateWithSecurityKey(options) {
    var _a, _b, _c, _d, _e;
    const challenge = this._securityKeyChallenge;
    if (!challenge) {
      throw new Error("No security-key challenge available \u2014 not in a security-key MFA state.");
    }
    const cap = (0, import_fido2.detectFido2Support)();
    if (!cap.supported) {
      throw new Error((_a = cap.reason) != null ? _a : "Security-key (FIDO2) login is not supported on this platform.");
    }
    if (!this.authStore.validateAuthSecrets()) {
      throw new Error("Cannot authenticate with a security key without calling authenticate first!");
    }
    const timeoutMs = (_b = options == null ? void 0 : options.timeoutMs) != null ? _b : 5 * 6e4;
    const pollIntervalMs = (_c = options == null ? void 0 : options.pollIntervalMs) != null ? _c : 5e3;
    const perAttemptTimeoutMs = (_d = options == null ? void 0 : options.perAttemptTimeoutMs) != null ? _d : 25e3;
    const onProgress = (_e = options == null ? void 0 : options.onProgress) != null ? _e : (() => {
    });
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      let devices;
      try {
        devices = await (0, import_fido2.listFido2Devices)();
      } catch (e) {
        this._log(LogLevel.Warning, "[auth] Could not list FIDO2 devices:", String(e));
        devices = [];
      }
      if (devices.length === 0) {
        onProgress("waiting-for-key");
        await this.delay(Math.max(0, Math.min(pollIntervalMs, deadline - Date.now())));
        continue;
      }
      onProgress("key-detected", devices.join(", "));
      const current = await this._refreshSecurityKeyChallenge();
      if (!current) {
        this._log(LogLevel.Warning, "[auth] No fresh security-key challenge from Apple \u2014 retrying");
        onProgress("no-match");
        await this.delay(Math.max(0, Math.min(pollIntervalMs, deadline - Date.now())));
        continue;
      }
      const challengeRaw = (0, import_fido2.b64decode)(current.challenge);
      const clientDataJSON = (0, import_fido2.buildClientDataJSON)(challengeRaw, "https://apple.com");
      const credentialIds = current.keyHandles.map((h) => (0, import_fido2.b64decode)(h));
      for (const device of devices) {
        for (const credentialId of credentialIds) {
          if (Date.now() >= deadline) {
            break;
          }
          onProgress("signing", device);
          let assertion;
          try {
            assertion = await (0, import_fido2.getAssertion)({
              device,
              rpId: current.rpId,
              credentialId,
              clientDataJSON,
              userVerification: false,
              timeoutMs: Math.min(perAttemptTimeoutMs, Math.max(1e3, deadline - Date.now())),
              log: (msg) => this._log(LogLevel.Debug, `[auth][fido2] ${msg}`)
            });
          } catch (e) {
            this._log(LogLevel.Debug, `[auth][fido2] attempt on ${device} failed: ${String(e)}`);
            continue;
          }
          if (assertion) {
            onProgress("verifying");
            await this._submitSecurityKeyAssertion(current, assertion);
            onProgress("success");
            return;
          }
        }
      }
      onProgress("no-match");
      await this.delay(Math.max(0, Math.min(pollIntervalMs, deadline - Date.now())));
    }
    onProgress("timeout");
    throw new Error("Security-key authentication timed out \u2014 no matching key was touched in time.");
  }
  /**
   * Re-fetch Apple's `fsaChallenge` via GET /appleauth/auth and update {@link _securityKeyChallenge}.
   *
   * Apple's security-key challenge is single-use and short-lived: the one captured during the
   * initial login (or one already consumed by a previous touch) is rejected server-side with
   * serviceError -27962 ("Failed to verify security key"). This must therefore be called fresh
   * immediately before each signing round — mirrors icloud3's `_get_webauthn_options()`.
   *
   * @returns The refreshed challenge, or `undefined` if Apple no longer presents an `fsaChallenge`.
   */
  async _refreshSecurityKeyChallenge() {
    try {
      const resp = await this.fetch(import_consts.AUTH_ENDPOINT.replace(/\/$/, ""), {
        headers: this.authStore.getMfaHeaders()
      });
      const authOptions = JSON.parse(await resp.text());
      const fsa = authOptions == null ? void 0 : authOptions.fsaChallenge;
      const keyHandles = fsa == null ? void 0 : fsa.keyHandles;
      if (fsa && typeof fsa.challenge === "string" && typeof fsa.rpId === "string" && Array.isArray(keyHandles) && keyHandles.every((k) => typeof k === "string")) {
        this._securityKeyChallenge = {
          challenge: fsa.challenge,
          rpId: fsa.rpId,
          keyHandles
        };
        this._log(
          LogLevel.Debug,
          `[auth] Refreshed security-key challenge (rpId=${fsa.rpId}, ${keyHandles.length} keyHandle(s))`
        );
        return this._securityKeyChallenge;
      }
      this._log(LogLevel.Warning, "[auth] GET /appleauth/auth returned no fsaChallenge on refresh");
    } catch (e) {
      this._log(LogLevel.Warning, "[auth] Failed to refresh security-key challenge:", String(e));
    }
    return void 0;
  }
  /**
   * POST a completed WebAuthn assertion to Apple and advance the auth state machine.
   * Mirrors the tail of provideMfaCode(): Authenticated → (trust) → Ready.
   *
   * @param challenge The security-key challenge whose `challenge`/`rpId` are echoed back to Apple.
   * @param assertion The WebAuthn assertion produced by the physical key.
   */
  async _submitSecurityKeyAssertion(challenge, assertion) {
    const body = {
      challenge: challenge.challenge,
      clientData: (0, import_fido2.b64encode)(assertion.clientDataJSON),
      signatureData: (0, import_fido2.b64encode)(assertion.signature),
      authenticatorData: (0, import_fido2.b64encode)(assertion.authenticatorData),
      userHandle: assertion.userHandle ? (0, import_fido2.b64encode)(assertion.userHandle) : null,
      credentialID: (0, import_fido2.b64encode)(assertion.credentialId),
      rpId: challenge.rpId
    };
    this._log(LogLevel.Debug, "[auth] POST /verify/security/key \u2014 submitting assertion");
    const resp = await this.fetch(`${import_consts.AUTH_ENDPOINT}verify/security/key`, {
      headers: this.authStore.getMfaHeaders(),
      method: "POST",
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    this._log(LogLevel.Debug, `[auth] verify/security/key \u2192 ${resp.status}: ${text.slice(0, 300)}`);
    if (resp.status !== 200 && resp.status !== 204) {
      throw new Error(`Security-key verification failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
    }
    this._securityKeyChallenge = void 0;
    this._smsPhoneNumberId = void 0;
    this._setState("Authenticated" /* Authenticated */);
    if (this.options.trustDevice) {
      void this._getTrustToken().then(this._getiCloudCookies.bind(this));
    } else {
      void this._getiCloudCookies();
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
    const primary = this._smsPhoneNumberId !== void 0 ? "sms" : "device";
    const fallback = primary === "sms" ? "device" : "sms";
    const channels = [primary, fallback];
    let last;
    let accepted = false;
    for (const channel of channels) {
      last = await this._submitSecurityCode(channel, code);
      if (last.status === 204 || last.status === 200) {
        accepted = true;
        break;
      }
      if (last.status === 409 && !this._isCodeRejection(last.body)) {
        this._log(
          LogLevel.Warning,
          "[auth] Code verification answered 409 without a rejection error \u2014 continuing with the trust flow"
        );
        accepted = true;
        break;
      }
      if (this._isCodeLockout(last.body)) {
        this._log(LogLevel.Error, "[auth] Apple reports too many failed attempts (-21670) \u2014 giving up");
        break;
      }
      this._log(
        LogLevel.Debug,
        `[auth] ${channel} endpoint did not accept the code (HTTP ${last.status}) \u2014 trying the other channel`
      );
    }
    if (!accepted) {
      throw new Error(this._describeCodeFailure(last));
    }
    this._smsPhoneNumberId = void 0;
    this._setState("Authenticated" /* Authenticated */);
    if (this.options.trustDevice) {
      void this._getTrustToken().then(this._getiCloudCookies.bind(this));
    } else {
      void this._getiCloudCookies();
    }
  }
  /**
   * POST the six-digit code to one of Apple's two verification endpoints.
   *
   * @param channel - `sms` → /verify/phone/securitycode, `device` → /verify/trusteddevice/securitycode.
   * @param code - The six digit MFA code.
   */
  async _submitSecurityCode(channel, code) {
    var _a, _b, _c, _d, _e, _f;
    let response;
    if (channel === "sms") {
      const id = (_c = (_b = this._smsPhoneNumberId) != null ? _b : (_a = this._trustedPhone) == null ? void 0 : _a.id) != null ? _c : 1;
      const phonePayload = { id };
      if (((_d = this._trustedPhone) == null ? void 0 : _d.nonFTEU) !== void 0) {
        phonePayload.nonFTEU = this._trustedPhone.nonFTEU;
      }
      const mode = (_f = (_e = this._trustedPhone) == null ? void 0 : _e.pushMode) != null ? _f : "sms";
      this._log(LogLevel.Debug, `[auth] POST /verify/phone/securitycode (phone id ${id}, mode ${mode})`);
      response = await this.fetch(`${import_consts.AUTH_ENDPOINT}verify/phone/securitycode`, {
        headers: this.authStore.getMfaHeaders(),
        method: "POST",
        body: JSON.stringify({ phoneNumber: phonePayload, securityCode: { code }, mode })
      });
    } else {
      this._log(LogLevel.Debug, "[auth] POST /verify/trusteddevice/securitycode (device push)");
      response = await this.fetch(`${import_consts.AUTH_ENDPOINT}verify/trusteddevice/securitycode`, {
        headers: this.authStore.getMfaHeaders(),
        method: "POST",
        body: JSON.stringify({ securityCode: { code } })
      });
    }
    this.authStore.extractSessionHeaders(response);
    const body = await response.text();
    this._log(LogLevel.Debug, `[auth] verify ${channel} securitycode \u2192 ${response.status}: ${body.slice(0, 300)}`);
    return { status: response.status, body };
  }
  /**
   * Parse Apple's `serviceErrors` / `service_errors` array out of a raw response body.
   * Returns an empty array when the body is not JSON or carries no errors.
   *
   * @param body - The raw response body of an auth request.
   */
  _parseServiceErrors(body) {
    var _a, _b;
    try {
      const parsed = JSON.parse(body);
      return [...(_a = parsed == null ? void 0 : parsed.serviceErrors) != null ? _a : [], ...(_b = parsed == null ? void 0 : parsed.service_errors) != null ? _b : []];
    } catch {
      return [];
    }
  }
  /**
   * True when Apple's error body states that the code itself was refused (wrong, expired or
   * locked) rather than signalling a session / channel mismatch.
   * pyiCloud maps -21669 to "wrong verification code"; -21670 is the too-many-attempts lockout.
   *
   * NOTE: -21669 is endpoint-local — it only means "this endpoint does not know this code".
   * A code that belongs to the *other* channel produces the very same error, so this must not
   * be treated as a final verdict on the code itself (see provideMfaCode).
   *
   * @param body - The raw response body of a securitycode request.
   */
  _isCodeRejection(body) {
    return this._parseServiceErrors(body).some((e) => ["-21669", "-21670"].includes(String(e == null ? void 0 : e.code)));
  }
  /**
   * True when Apple locked further code attempts after too many failures (-21670).
   *
   * @param body - The raw response body of a securitycode request.
   */
  _isCodeLockout(body) {
    return this._parseServiceErrors(body).some((e) => String(e == null ? void 0 : e.code) === "-21670");
  }
  /**
   * Turn the last failed securitycode response into a message a user can act on, instead of
   * dumping Apple's raw JSON (which made the internal error code -21669 look like a mangled
   * version of the entered code).
   *
   * @param last - Status and body of the last verification attempt, if any.
   * @param last.status - HTTP status of that attempt.
   * @param last.body - Raw response body of that attempt.
   */
  _describeCodeFailure(last) {
    var _a, _b, _c;
    const errors = this._parseServiceErrors((_a = last == null ? void 0 : last.body) != null ? _a : "");
    const codes = errors.map((e) => String(e == null ? void 0 : e.code));
    if (codes.includes("-21670")) {
      return "Zu viele Fehlversuche \u2014 Apple hat die Code-Eingabe vor\xFCbergehend gesperrt (Apple-Fehler -21670). Bitte sp\xE4ter erneut anmelden und einen neuen Code anfordern.";
    }
    if (codes.includes("-21669")) {
      return "Apple hat den Best\xE4tigungscode abgelehnt (Apple-Fehler -21669: falscher oder abgelaufener Code). Bitte einen neuen Code anfordern und ihn direkt nach dem Empfang eingeben.";
    }
    const appleMessage = (_b = errors.find((e) => typeof (e == null ? void 0 : e.message) === "string")) == null ? void 0 : _b.message;
    const detail = appleMessage != null ? appleMessage : (last == null ? void 0 : last.body) ? last.body.slice(0, 200) : "";
    return `Code-Pr\xFCfung fehlgeschlagen (HTTP ${(_c = last == null ? void 0 : last.status) != null ? _c : "unbekannt"})${detail ? `: ${detail}` : ""}`;
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
   * Returns URL query parameters matching pyiCloud's self.params.
   * These are required for setup.icloud.com PCS-related endpoints.
   */
  getParams() {
    return this._getSetupParams();
  }
  _getSetupParams() {
    var _a, _b;
    const params = new URLSearchParams({
      clientBuildNumber: "2534Project66",
      clientMasteringNumber: "2534B22",
      clientId: this.authStore.clientId || ""
    });
    const dsid = (_b = (_a = this.accountInfo) == null ? void 0 : _a.dsInfo) == null ? void 0 : _b.dsid;
    if (dsid != null) {
      params.set("dsid", String(dsid));
    }
    return params;
  }
  /**
   * Updates the PCS state (iCloudService.pcsEnabled, iCloudService.pcsAccess, iCloudService.ICDRSDisabled).
   */
  async checkPCS() {
    const params = this._getSetupParams();
    const pcsTest = await this.fetch(
      `https://setup.icloud.com/setup/ws/1/requestWebAccessState?${params.toString()}`,
      {
        headers: this.authStore.getHeaders(),
        method: "POST"
      }
    );
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
   * Mirrors timlaing/pyicloud `_request_pcs_for_service`.
   *
   * @param appName The service name to request access to (e.g. 'iclouddrive', 'photos').
   */
  async requestServiceAccess(appName) {
    var _a;
    const PCS_SLEEP_MS = 5e3;
    const PCS_MAX_RETRIES = 10;
    await this.checkPCS();
    if (!this.ICDRSDisabled) {
      this._log(LogLevel.Debug, `requestServiceAccess("${appName}"): ICDRS not disabled, PCS not required`);
      return true;
    }
    this._log(LogLevel.Info, `ADP detected (ICDRSDisabled=true) \u2014 requesting PCS cookies for "${appName}"`);
    if (!this.pcsAccess) {
      this._log(LogLevel.Debug, "Requesting PCS consent from device");
      const params = this._getSetupParams();
      const requestPcs = await this.fetch(
        `https://setup.icloud.com/setup/ws/1/enableDeviceConsentForPCS?${params.toString()}`,
        {
          headers: this.authStore.getHeaders(),
          method: "POST"
        }
      );
      const requestPcsJson = await requestPcs.json();
      if (!requestPcsJson.isDeviceConsentNotificationSent) {
        throw new Error("Unable to request PCS access \u2014 consent notification not sent");
      }
    }
    for (let i = 0; i < PCS_MAX_RETRIES && !this.pcsAccess; i++) {
      this._log(LogLevel.Debug, `Waiting for PCS consent (${i + 1}/${PCS_MAX_RETRIES})...`);
      await this.delay(PCS_SLEEP_MS);
      await this.checkPCS();
    }
    if (!this.pcsAccess) {
      throw new Error("PCS consent not granted within timeout \u2014 ensure an Apple device is online and unlocked");
    }
    for (let attempt = 0; attempt < PCS_MAX_RETRIES; attempt++) {
      const params = this._getSetupParams();
      const pcsRequest = await this.fetch(`https://setup.icloud.com/setup/ws/1/requestPCS?${params.toString()}`, {
        headers: this.authStore.getHeaders(),
        method: "POST",
        body: JSON.stringify({ appName, derivedFromUserAction: attempt === 0 })
      });
      const pcsJson = await pcsRequest.json();
      if (pcsJson.status === "success") {
        this._log(LogLevel.Info, `PCS access granted for "${appName}"`);
        return true;
      }
      if (pcsJson.message === "Requested the device to upload cookies." || pcsJson.message === "Cookies not available yet on server.") {
        this._log(LogLevel.Debug, `PCS: ${pcsJson.message} (${attempt + 1}/${PCS_MAX_RETRIES})`);
        await this.delay(PCS_SLEEP_MS);
      } else {
        throw new Error(`PCS request failed for "${appName}": ${(_a = pcsJson.message) != null ? _a : JSON.stringify(pcsJson)}`);
      }
    }
    throw new Error(`PCS cookies for "${appName}" not available after ${PCS_MAX_RETRIES} retries`);
  }
  _serviceCache = {};
  /**
   * A mapping of service names to their classes.
   * This is used by {@link iCloudService.getService} to return the correct service class.
   *
   * Note: You should **not** use this to instantiate services, use {@link iCloudService.getService} instead.
   *
   * @see {@link iCloudService.getService}
   */
  serviceConstructors = {
    account: import_account.iCloudAccountDetailsService,
    findme: import_findMy.iCloudFindMyService,
    ubiquity: import_ubiquity.iCloudUbiquityService,
    drivews: import_drive.iCloudDriveService,
    calendar: import_calendar.iCloudCalendarService,
    photos: import_photos.iCloudPhotosService,
    reminders: import_reminders.iCloudRemindersService,
    contacts: import_contacts.iCloudContactsService,
    notes: import_notes.iCloudNotesService
  };
  /**
   * Returns an instance of the specified service. Results are cached, so subsequent calls will return the same instance.
   *
   * @param service The service name to return an instance of. Must be one of the keys in {@link iCloudService.serviceConstructors}.
   * @returns The service instance for the specified service name.
   */
  getService(service) {
    var _a, _b, _c, _d;
    if (!this.serviceConstructors[service]) {
      throw new TypeError(
        `getService(service: string): 'service' was ${service.toString()}, must be one of ${Object.keys(this.serviceConstructors).join(", ")}`
      );
    }
    if (!this._serviceCache[service]) {
      const webservices = (_b = (_a = this.accountInfo) == null ? void 0 : _a.webservices) != null ? _b : {};
      const ws = webservices;
      let serviceUrl;
      if (service === "photos" || service === "reminders" || service === "notes") {
        serviceUrl = (_c = webservices.ckdatabasews) == null ? void 0 : _c.url;
      } else {
        serviceUrl = (_d = ws[service]) == null ? void 0 : _d.url;
      }
      if (!serviceUrl) {
        throw new Error(`iCloud service '${service}' is not available: URL missing \u2014 not yet authenticated?`);
      }
      this._serviceCache[service] = new this.serviceConstructors[service](this, serviceUrl);
    }
    return this._serviceCache[service];
  }
  /**
   * Validates the current session against Apple's /validate endpoint without triggering
   * a full re-authentication. Mirrors pyicloud's `_validate_token()`: sends a lightweight
   * POST /setup/ws/1/validate to check whether the existing session token is still accepted.
   * Updates accountInfo with the returned data when the session is valid.
   *
   * @returns true when Apple accepts the current session, false when it has expired or the call fails.
   */
  async validateSession() {
    if (!this.authStore.sessionToken) {
      return false;
    }
    try {
      const resp = await this.fetch("https://setup.icloud.com/setup/ws/1/validate", {
        headers: this.authStore.getHeaders(),
        method: "POST",
        body: "null"
      });
      this.authStore.extractSessionHeaders(resp);
      if (resp.status === 200) {
        try {
          this.accountInfo = await resp.json();
        } catch {
        }
        if (this.options.username) {
          this.authStore.saveSession(this.options.username);
        }
        this._log(LogLevel.Debug, "[keepalive] /validate \u2192 session still valid");
        return true;
      }
      this._log(LogLevel.Debug, `[keepalive] /validate \u2192 HTTP ${resp.status} \u2014 session expired`);
      return false;
    } catch (e) {
      this._log(LogLevel.Debug, "[keepalive] /validate \u2192 request failed:", String(e));
      return false;
    }
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
  /**
   * Authenticate for a specific web service by calling accountLogin with appName + credentials.
   * Mirrors pyicloud's _authenticate_with_credentials_service(service).
   * Sets the service-specific X-APPLE-WEBAUTH-* cookie (e.g. X-APPLE-WEBAUTH-TOKEN for calendar).
   *
   * @param appName - Apple webservice app name (e.g. 'calendar', 'contacts', 'reminders')
   */
  async authenticateWebService(appName) {
    const data = {
      appName,
      apple_id: this.options.username,
      password: this.options.password
    };
    this._log(LogLevel.Debug, `[auth] authenticateWebService "${appName}" \u2192 POST`, import_consts.SETUP_ENDPOINT);
    const response = await this.fetch(import_consts.SETUP_ENDPOINT, {
      headers: import_consts.DEFAULT_HEADERS,
      method: "POST",
      body: JSON.stringify(data)
    });
    this._log(LogLevel.Debug, `[auth] authenticateWebService "${appName}" response status:`, response.status);
    if (response.status === 421 || response.status === 450) {
      try {
        await response.text();
      } catch {
      }
      throw new Error(`WEBSERVICE_REAUTH_REQUIRED:${appName}`);
    }
    if (response.ok) {
      this.authStore.processCloudSetupResponse(response, this.options.username);
    }
    try {
      await response.text();
    } catch {
    }
  }
  /**
   * Clear all persisted session + cookie files and in-memory tokens.
   * Forces a full re-authentication (including 2FA) on the next authenticate() call.
   */
  invalidatePersistedAuth() {
    if (this.options.username) {
      this.authStore.clearPersistedSession(this.options.username);
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
