import fs from "fs";
import { Response } from "node-fetch";
import path from "path";
import { Cookie } from "tough-cookie";
import type iCloudService from "..";
import { AUTH_HEADERS, DEFAULT_HEADERS } from "../consts";
import { LogLevel } from "../index.js";

/**
 * pyicloud HEADER_DATA mapping — these response headers are persisted to the session file
 * so subsequent requests can include them, avoiding Apple rate-limiting / 503 responses.
 */
const SESSION_HEADER_MAP: Record<string, keyof iCloudAuthenticationStore> = {
    "x-apple-id-account-country": "accountCountry",
    "x-apple-id-session-id":      "sessionId",
    "x-apple-session-token":      "sessionToken",
    "x-apple-twosv-trust-token":  "trustToken",
    "scnt":                       "scnt",
};

export class iCloudAuthenticationStore {
    options: iCloudService["options"];
    _log: iCloudService["_log"];
    tknFile: string;

    trustToken?: string;
    sessionId?: string;
    sessionToken?: string;
    scnt?: string;
    aasp?: string;
    accountCountry?: string;
    /** Persisted client_id (reused across sessions, like pyicloud) */
    clientId?: string;
    icloudCookies: Cookie[];
    /** Cookies from idmsa.apple.com auth responses (aasp etc.) — sent back to signin like pyicloud's cookiejar */
    authCookies: Cookie[];

    constructor(service: iCloudService) {
        this.options = service.options;
        this._log = service._log;
        this.tknFile = path.format({ dir: this.options.dataDirectory, base: ".trust-token" });

        Object.defineProperty(this, "trustToken",    { enumerable: false });
        Object.defineProperty(this, "sessionId",     { enumerable: false });
        Object.defineProperty(this, "sessionToken",  { enumerable: false });
        Object.defineProperty(this, "scnt",          { enumerable: false });
        Object.defineProperty(this, "aasp",          { enumerable: false });
        Object.defineProperty(this, "icloudCookies", { enumerable: false });
        Object.defineProperty(this, "authCookies",   { enumerable: false });
        this.authCookies = [];
    }

    /** Sanitise account name for use as a filename component (matches pyicloud behaviour). */
    private _accountFilename(account: string): string {
        return account.replace(/\W/g, "");
    }

    private _sessionPath(account: string): string {
        return path.join(this.options.dataDirectory, this._accountFilename(account) + ".session");
    }

    private _cookiesPath(account: string): string {
        return path.join(this.options.dataDirectory, this._accountFilename(account) + ".cookies");
    }

    private _authCookiesPath(account: string): string {
        return path.join(this.options.dataDirectory, this._accountFilename(account) + ".auth-cookies");
    }

    // ── Session persistence (mirrors pyicloud's .session JSON file) ────────────

    /**
     * Load session data from disk.
     * Populates scnt, sessionId, sessionToken, accountCountry, trustToken, clientId.
     * Returns the raw JSON object so the caller can read client_id etc.
     */
    loadSession(account: string): Record<string, string> {
        try {
            const data = JSON.parse(
                fs.readFileSync(this._sessionPath(account), "utf8")
            ) as Record<string, string>;
            if (data.scnt)            this.scnt            = data.scnt;
            if (data.session_id)      this.sessionId       = data.session_id;
            if (data.session_token)   this.sessionToken    = data.session_token;
            if (data.account_country) this.accountCountry  = data.account_country;
            if (data.trust_token)     this.trustToken      = data.trust_token;
            if (data.client_id)       this.clientId        = data.client_id;
            this._log(LogLevel.Debug, "[authStore] Session loaded from disk");
            return data;
        } catch (e) {
            this._log(LogLevel.Info, "[authStore] No session file found, starting fresh");
            return {};
        }
    }

    /** Persist current session data to disk. */
    saveSession(account: string): void {
        try {
            const data: Record<string, string> = {};
            if (this.scnt)           data.scnt            = this.scnt;
            if (this.sessionId)      data.session_id      = this.sessionId;
            if (this.sessionToken)   data.session_token   = this.sessionToken;
            if (this.accountCountry) data.account_country = this.accountCountry;
            if (this.trustToken)     data.trust_token     = this.trustToken;
            if (this.clientId)       data.client_id       = this.clientId;
            if (!fs.existsSync(this.options.dataDirectory))
                fs.mkdirSync(this.options.dataDirectory);
            fs.writeFileSync(this._sessionPath(account), JSON.stringify(data, null, 2), "utf8");
            this._log(LogLevel.Debug, "[authStore] Session saved to disk");
        } catch (e) {
            this._log(LogLevel.Warning, "[authStore] Unable to save session:", e.toString());
        }
    }

    // ── Cookie persistence ─────────────────────────────────────────────────────

    /** Load persisted iCloud cookies from disk. */
    loadCookies(account: string): void {
        try {
            const raw = JSON.parse(
                fs.readFileSync(this._cookiesPath(account), "utf8")
            ) as string[];
            this.icloudCookies = raw.map(v => Cookie.parse(v)).filter(v => !!v);
            this._log(LogLevel.Debug, `[authStore] Loaded ${this.icloudCookies.length} cookies from disk`);
        } catch (e) {
            this.icloudCookies = [];
        }
    }

    /** Persist current iCloud cookies to disk. */
    saveCookies(account: string): void {
        try {
            if (!fs.existsSync(this.options.dataDirectory))
                fs.mkdirSync(this.options.dataDirectory);
            fs.writeFileSync(
                this._cookiesPath(account),
                JSON.stringify(this.icloudCookies.map(c => c.toString())),
                "utf8"
            );
            this._log(LogLevel.Debug, "[authStore] Cookies saved to disk");
        } catch (e) {
            this._log(LogLevel.Warning, "[authStore] Unable to save cookies:", e.toString());
        }
    }

    // ── Auth-endpoint cookie persistence (idmsa.apple.com, mirrors pyicloud cookiejar) ──

    /** Load persisted idmsa.apple.com auth cookies from disk. */
    loadAuthCookies(account: string): void {
        try {
            const raw = JSON.parse(
                fs.readFileSync(this._authCookiesPath(account), "utf8")
            ) as string[];
            this.authCookies = raw.map(v => Cookie.parse(v)).filter(v => !!v);
            this._log(LogLevel.Debug, `[authStore] Loaded ${this.authCookies.length} auth cookies from disk`);
        } catch (e) {
            this.authCookies = [];
        }
    }

    /** Persist idmsa.apple.com auth cookies to disk. */
    saveAuthCookies(account: string): void {
        try {
            if (!fs.existsSync(this.options.dataDirectory))
                fs.mkdirSync(this.options.dataDirectory);
            fs.writeFileSync(
                this._authCookiesPath(account),
                JSON.stringify(this.authCookies.map(c => c.toString())),
                "utf8"
            );
            this._log(LogLevel.Debug, "[authStore] Auth cookies saved to disk");
        } catch (e) {
            this._log(LogLevel.Warning, "[authStore] Unable to save auth cookies:", e.toString());
        }
    }

    /** Build Cookie header string from stored auth cookies (for idmsa signin request). */
    getAuthCookieHeader(): string | undefined {
        const cookies = this.authCookies.filter(c => c.value);
        if (!cookies.length) return undefined;
        return cookies.map(c => c.cookieString()).join("; ");
    }

    // ── Header extraction (mirrors pyicloud's per-request HEADER_DATA extraction) ──

    /**
     * Extract all session-related headers from a response and update in-memory state.
     * Safe to call on ANY response, including error responses — this is the key mechanism
     * that ensures session continuity across login attempts (fixing Apple 503 / rate-limit).
     */
    extractSessionHeaders(response: Response): void {
        for (const [header, prop] of Object.entries(SESSION_HEADER_MAP)) {
            const value = response.headers.get(header);
            if (value) (this as any)[prop] = value;
        }
        // Special fallback: if X-Apple-ID-Session-Id is absent, use X-Apple-Session-Token
        if (!response.headers.get("x-apple-id-session-id")) {
            const fallback = response.headers.get("x-apple-session-token");
            if (fallback) this.sessionId = fallback;
        }
    }

    // ── Legacy trust-token helpers (kept for backward compatibility) ───────────

    loadTrustToken(account: string) {
        try {
            this.trustToken = fs.readFileSync(
                this.tknFile + "-" + Buffer.from(account.toLowerCase()).toString("base64"),
                "utf8"
            );
        } catch (e) {
            this._log(LogLevel.Debug, "[authStore] No legacy trust-token file found");
        }
    }

    writeTrustToken(account: string) {
        try {
            if (!fs.existsSync(this.options.dataDirectory)) fs.mkdirSync(this.options.dataDirectory);
            fs.writeFileSync(
                this.tknFile + "-" + Buffer.from(account.toLowerCase()).toString("base64"),
                this.trustToken,
                "utf8"
            );
        } catch (e) {
            this._log(LogLevel.Warning, "[authStore] Unable to write trust token:", e.toString());
        }
    }

    // ── Response processors ────────────────────────────────────────────────────

    /**
     * Process a sign-in response: extract all session headers + aasp cookie.
     * Also saves all Set-Cookie headers as auth cookies (mirrors pyicloud cookiejar behaviour).
     * Pass `account` to auto-persist to disk (strongly recommended).
     */
    processAuthSecrets(authResponse: Response, account?: string) {
        try {
            this.extractSessionHeaders(authResponse);

            const headers = Array.from(authResponse.headers.values());
            const aaspCookie = headers.find((v) => v.includes("aasp="));
            this.aasp = aaspCookie.split("aasp=")[1].split(";")[0];

            // Save ALL Set-Cookie headers from the auth response as auth cookies.
            // pyicloud's requests.Session does this automatically via its LWPCookieJar —
            // these cookies are then sent back to idmsa.apple.com on subsequent signin requests.
            const newAuthCookies = Array.from(authResponse.headers.entries())
                .filter(([k]) => k.toLowerCase() === "set-cookie")
                .map(([, v]) => Cookie.parse(v))
                .filter(v => !!v);
            if (newAuthCookies.length) {
                // Merge: replace existing cookies with the same key, add new ones
                for (const nc of newAuthCookies) {
                    const idx = this.authCookies.findIndex(c => c.key === nc.key);
                    if (idx >= 0) this.authCookies[idx] = nc;
                    else this.authCookies.push(nc);
                }
                if (account) this.saveAuthCookies(account);
            }

            if (account) this.saveSession(account);
            return this.validateAuthSecrets();
        } catch (e) {
            this._log(LogLevel.Warning, "[authStore] Unable to process auth secrets:", e.toString());
            return false;
        }
    }

    /**
     * Parse Set-Cookie headers from the accountLogin response.
     * Pass `account` to auto-persist cookies to disk.
     */
    processCloudSetupResponse(cloudSetupResponse: Response, account?: string) {
        this.extractSessionHeaders(cloudSetupResponse);
        this.icloudCookies = Array.from(cloudSetupResponse.headers.entries())
            .filter((v) => v[0].toLowerCase() == "set-cookie")
            .map((v) => v[1].split(", "))
            .reduce((a, b) => a.concat(b), [])
            .map((v) => Cookie.parse(v))
            .filter((v) => !!v);
        if (account && this.icloudCookies.length) {
            this.saveCookies(account);
            this.saveSession(account);
        }
        return !!this.icloudCookies.length;
    }

    /**
     * Process a 2sv/trust response: extract session headers, persist trust token.
     */
    processAccountTokens(account: string, trustResponse: Response) {
        this.extractSessionHeaders(trustResponse);
        this.writeTrustToken(account);
        this.saveSession(account);
        return this.validateAccountTokens();
    }

    addCookies(cookies: string[]) {
        cookies.map((v) => Cookie.parse(v)).forEach((v) => this.icloudCookies.push(v));
    }

    getMfaHeaders() {
        return { ...AUTH_HEADERS, scnt: this.scnt, "X-Apple-ID-Session-Id": this.sessionId, Cookie: "aasp=" + this.aasp };
    }

    getHeaders() {
        return { ...DEFAULT_HEADERS, Cookie: this.icloudCookies.filter((a) => a.value).map((cookie) => cookie.cookieString()).join("; ") };
    }

    validateAccountTokens() {
        return this.sessionToken && this.trustToken;
    }

    validateAuthSecrets() {
        return this.aasp && this.scnt && this.sessionId;
    }
}