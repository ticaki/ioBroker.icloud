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
var authStore_exports = {};
__export(authStore_exports, {
  iCloudAuthenticationStore: () => iCloudAuthenticationStore
});
module.exports = __toCommonJS(authStore_exports);
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_tough_cookie = require("tough-cookie");
var import_consts = require("../consts");
var import__ = require("../index");
const SESSION_HEADER_MAP = {
  "x-apple-id-account-country": "accountCountry",
  "x-apple-id-session-id": "sessionId",
  "x-apple-session-token": "sessionToken",
  "x-apple-twosv-trust-token": "trustToken",
  scnt: "scnt"
};
class iCloudAuthenticationStore {
  options;
  _log;
  tknFile;
  /**
   * Shared CookieJar — populated automatically by fetch-cookie on every response.
   * Cookies from all domains (idmsa.apple.com, setup.icloud.com, …) are stored here
   * and sent back automatically to matching domains, exactly like pyicloud's
   * requests.Session() with its LWPCookieJar.
   */
  cookieJar;
  trustToken;
  sessionId;
  sessionToken;
  scnt;
  accountCountry;
  /** Persisted client_id (reused across sessions, like pyicloud) */
  clientId;
  constructor(service) {
    this.options = service.options;
    this._log = service._log;
    this.tknFile = import_node_path.default.format({ dir: this.options.dataDirectory, base: ".trust-token" });
    this.cookieJar = service.cookieJar;
    Object.defineProperty(this, "trustToken", { enumerable: false });
    Object.defineProperty(this, "sessionId", { enumerable: false });
    Object.defineProperty(this, "sessionToken", { enumerable: false });
    Object.defineProperty(this, "scnt", { enumerable: false });
    Object.defineProperty(this, "cookieJar", { enumerable: false });
  }
  /**
   * Sanitise account name for use as a filename component (matches pyicloud behaviour).
   *
   * @param account - The iCloud account identifier (e.g. email address).
   */
  _accountFilename(account) {
    return account.replace(/\W/g, "");
  }
  _sessionPath(account) {
    return import_node_path.default.join(this.options.dataDirectory, `${this._accountFilename(account)}.session`);
  }
  _jarPath(account) {
    return import_node_path.default.join(this.options.dataDirectory, `${this._accountFilename(account)}.jar.json`);
  }
  // ── Session persistence (mirrors pyicloud's .session JSON file) ────────────
  /**
   * Load session data from disk.
   * Populates scnt, sessionId, sessionToken, accountCountry, trustToken, clientId.
   * Returns the raw JSON object so the caller can read client_id etc.
   *
   * @param account - The iCloud account identifier (e.g. email address).
   */
  loadSession(account) {
    try {
      const data = JSON.parse(import_node_fs.default.readFileSync(this._sessionPath(account), "utf8"));
      if (data.scnt) {
        this.scnt = data.scnt;
      }
      if (data.session_id) {
        this.sessionId = data.session_id;
      }
      if (data.session_token) {
        this.sessionToken = data.session_token;
      }
      if (data.account_country) {
        this.accountCountry = data.account_country;
      }
      if (data.trust_token) {
        this.trustToken = data.trust_token;
      }
      if (data.client_id) {
        this.clientId = data.client_id;
      }
      this._log(import__.LogLevel.Debug, "[authStore] Session loaded from disk");
      return data;
    } catch {
      this._log(import__.LogLevel.Info, "[authStore] No session file found, starting fresh");
      return {};
    }
  }
  /**
   * Persist current session data to disk.
   *
   * @param account - The iCloud account identifier (e.g. email address).
   */
  saveSession(account) {
    try {
      const data = {};
      if (this.scnt) {
        data.scnt = this.scnt;
      }
      if (this.sessionId) {
        data.session_id = this.sessionId;
      }
      if (this.sessionToken) {
        data.session_token = this.sessionToken;
      }
      if (this.accountCountry) {
        data.account_country = this.accountCountry;
      }
      if (this.trustToken) {
        data.trust_token = this.trustToken;
      }
      if (this.clientId) {
        data.client_id = this.clientId;
      }
      if (!import_node_fs.default.existsSync(this.options.dataDirectory)) {
        import_node_fs.default.mkdirSync(this.options.dataDirectory);
      }
      import_node_fs.default.writeFileSync(this._sessionPath(account), JSON.stringify(data, null, 2), "utf8");
      this._log(import__.LogLevel.Debug, "[authStore] Session saved to disk");
    } catch (e) {
      this._log(import__.LogLevel.Warning, "[authStore] Unable to save session:", e.toString());
    }
  }
  // ── CookieJar persistence ──────────────────────────────────────────────────
  /**
   * Load the persisted CookieJar from disk.
   * Automatically migrates legacy .cookies and .auth-cookies files on first run.
   *
   * @param account - The iCloud account identifier (e.g. email address).
   */
  loadCookieJar(account) {
    var _a;
    const jarPath = this._jarPath(account);
    try {
      const raw = JSON.parse(import_node_fs.default.readFileSync(jarPath, "utf8"));
      const loaded = import_tough_cookie.CookieJar.deserializeSync(raw);
      for (const c of (_a = loaded.toJSON().cookies) != null ? _a : []) {
        try {
          this.cookieJar.setCookieSync(
            `${c.key}=${c.value}; Domain=${c.domain}; Path=${c.path || "/"}`,
            `https://${c.domain}`
          );
        } catch {
        }
      }
      this._log(import__.LogLevel.Debug, "[authStore] Cookie jar loaded from disk");
      return;
    } catch {
      this._log(import__.LogLevel.Debug, "[authStore] No jar file \u2014 trying legacy migration");
    }
    const base = import_node_path.default.join(this.options.dataDirectory, this._accountFilename(account));
    const tryMigrate = (filePath, domain) => {
      try {
        const raw = JSON.parse(import_node_fs.default.readFileSync(filePath, "utf8"));
        for (const v of raw) {
          const c = import_tough_cookie.Cookie.parse(v);
          if (!c) {
            continue;
          }
          try {
            this.cookieJar.setCookieSync(c.toString(), `https://${domain}`);
          } catch {
          }
        }
        this._log(import__.LogLevel.Debug, `[authStore] Migrated legacy cookies from ${filePath}`);
      } catch {
      }
    };
    tryMigrate(`${base}.cookies`, "setup.icloud.com");
    tryMigrate(`${base}.auth-cookies`, "idmsa.apple.com");
  }
  /**
   * Persist the CookieJar to disk.
   *
   * @param account - The iCloud account identifier (e.g. email address).
   */
  saveCookieJar(account) {
    try {
      if (!import_node_fs.default.existsSync(this.options.dataDirectory)) {
        import_node_fs.default.mkdirSync(this.options.dataDirectory);
      }
      import_node_fs.default.writeFileSync(this._jarPath(account), JSON.stringify(this.cookieJar.serializeSync(), null, 2), "utf8");
      this._log(import__.LogLevel.Debug, "[authStore] Cookie jar saved to disk");
    } catch (e) {
      this._log(import__.LogLevel.Warning, "[authStore] Unable to save cookie jar:", e.toString());
    }
  }
  // ── Header extraction (mirrors pyicloud's per-request HEADER_DATA extraction) ──
  /**
   * Extract all session-related headers from a response and update in-memory state.
   * Safe to call on ANY response, including error responses — this is the key mechanism
   * that ensures session continuity across login attempts (fixing Apple 503 / rate-limit).
   *
   * @param response - The HTTP response to extract session headers from.
   */
  extractSessionHeaders(response) {
    for (const [header, prop] of Object.entries(SESSION_HEADER_MAP)) {
      const value = response.headers.get(header);
      if (value) {
        this[prop] = value;
      }
    }
    if (!response.headers.get("x-apple-id-session-id")) {
      const fallback = response.headers.get("x-apple-session-token");
      if (fallback) {
        this.sessionId = fallback;
      }
    }
  }
  // ── Legacy trust-token helpers (kept for backward compatibility) ───────────
  loadTrustToken(account) {
    try {
      this.trustToken = import_node_fs.default.readFileSync(
        `${this.tknFile}-${Buffer.from(account.toLowerCase()).toString("base64")}`,
        "utf8"
      );
    } catch {
      this._log(import__.LogLevel.Debug, "[authStore] No legacy trust-token file found");
    }
  }
  writeTrustToken(account) {
    var _a;
    try {
      if (!import_node_fs.default.existsSync(this.options.dataDirectory)) {
        import_node_fs.default.mkdirSync(this.options.dataDirectory);
      }
      import_node_fs.default.writeFileSync(
        `${this.tknFile}-${Buffer.from(account.toLowerCase()).toString("base64")}`,
        (_a = this.trustToken) != null ? _a : "",
        "utf8"
      );
    } catch (e) {
      this._log(import__.LogLevel.Warning, "[authStore] Unable to write trust token:", e.toString());
    }
  }
  // ── Response processors ────────────────────────────────────────────────────
  /**
   * Delete persisted session + cookie files and clear all in-memory tokens.
   * Call this to force a full re-authentication on the next authenticate() call.
   *
   * @param account - The iCloud account identifier (e.g. email address).
   */
  clearPersistedSession(account) {
    this.sessionToken = void 0;
    this.trustToken = void 0;
    this.scnt = void 0;
    this.sessionId = void 0;
    this.accountCountry = void 0;
    try {
      import_node_fs.default.unlinkSync(this._sessionPath(account));
    } catch {
    }
    try {
      import_node_fs.default.unlinkSync(this._jarPath(account));
    } catch {
    }
    this._log(import__.LogLevel.Debug, "[authStore] Persisted session + cookies cleared");
  }
  /**
   * Process a sign-in response: extract session headers.
   * Cookies are handled automatically by fetch-cookie (stored in cookieJar).
   *
   * @param authResponse - The HTTP sign-in response.
   * @param account - The iCloud account identifier (optional; if set, session is persisted).
   */
  processAuthSecrets(authResponse, account) {
    try {
      this.extractSessionHeaders(authResponse);
      if (account) {
        this.saveSession(account);
      }
      return this.validateAuthSecrets();
    } catch (e) {
      this._log(import__.LogLevel.Warning, "[authStore] Unable to process auth secrets:", e.toString());
      return false;
    }
  }
  /**
   * Process a cloud-setup response: extract session headers.
   * Cookies are handled automatically by fetch-cookie (stored in cookieJar).
   *
   * @param cloudSetupResponse - The HTTP cloud-setup response.
   * @param account - The iCloud account identifier (optional; if set, cookies and session are persisted).
   */
  processCloudSetupResponse(cloudSetupResponse, account) {
    this.extractSessionHeaders(cloudSetupResponse);
    if (account) {
      this.saveCookieJar(account);
      this.saveSession(account);
    }
    return true;
  }
  /**
   * Process a 2sv/trust response: extract session headers, persist trust token.
   *
   * @param account - The iCloud account identifier.
   * @param trustResponse - The HTTP trust/2SV response.
   */
  processAccountTokens(account, trustResponse) {
    this.extractSessionHeaders(trustResponse);
    this.writeTrustToken(account);
    this.saveSession(account);
    return this.validateAccountTokens();
  }
  getMfaHeaders() {
    return {
      ...import_consts.AUTH_HEADERS,
      ...this.scnt ? { scnt: this.scnt } : {},
      ...this.sessionId ? { "X-Apple-ID-Session-Id": this.sessionId } : {}
    };
  }
  getHeaders() {
    return { ...import_consts.DEFAULT_HEADERS };
  }
  validateAccountTokens() {
    return !!(this.sessionToken && this.trustToken);
  }
  validateAuthSecrets() {
    return !!(this.scnt && this.sessionId);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudAuthenticationStore
});
//# sourceMappingURL=authStore.js.map
