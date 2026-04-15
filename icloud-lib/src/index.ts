import EventEmitter from "events";
import fs from "fs";
import fetchCookie from "fetch-cookie";
import nodeFetch from "node-fetch";
import os from "os";
import path from "path";
import crypto from "crypto";
import { CookieJar } from "tough-cookie";
import { iCloudAuthenticationStore } from "./auth/authStore";
import { GSASRPAuthenticator } from "./auth/iCSRPAuthenticator.js";
import { AUTH_ENDPOINT, AUTH_HEADERS, DEFAULT_HEADERS, SETUP_ENDPOINT } from "./consts";
import { iCloudAccountDetailsService } from "./services/account";
import { iCloudCalendarService } from "./services/calendar";
import { iCloudDriveService } from "./services/drive";
import { iCloudFindMyService } from "./services/findMy";
import { iCloudPhotosService } from "./services/photos";
import { iCloudUbiquityService } from "./services/ubiquity";
import { AccountInfo } from "./types";

export type { iCloudAuthenticationStore } from "./auth/authStore";
export type { AccountInfo } from "./types";
export const LogLevel = {
    Debug: 0,
    Info: 1,
    Warning: 2,
    Error: 3,

    Silent: Infinity
};

/**
 * These are the options that can be passed to the iCloud service constructor.
 */
export interface iCloudServiceSetupOptions {
    /**
     * The username of the iCloud account to log in to.
     * Can be provided now (at construction time) or later (on iCloudService#authenticate).
     */
    username?: string;
    /**
     * The password of the iCloud account to log in to.
     * Can be provided now (at construction time) or later (on iCloudService#authenticate).
     */
    password?: string;
    /**
     * Whether to save the credentials to the system's secret store.
     * (i.e. Keychain on macOS)
     */
    saveCredentials?: boolean;
    /**
     * Whether to store the trust-token to disk.
     * This allows future logins to be done without MFA.
     */
    trustDevice?: boolean;
    /**
     * The directory to store the trust-token in.
     * Defaults to the ~/.icloud directory.
     */
    dataDirectory?: string;

    /**
     * The authentication method to use.
     * Currently defaults to 'legacy', however this may change in the future.
     * @default "legacy"
     */
    authMethod?: "legacy" | "srp";


    /**
     * Log level to use. Alternatively pass in a function that will recieve all log messages instead of being forwarded to console
     * @default LogLevel.Debug
     */
    logger?: keyof typeof LogLevel | ((level: (typeof LogLevel)[keyof typeof LogLevel], ...args: any[]) => void);
}
/**
 * The state of the iCloudService.
 */
export const enum iCloudServiceStatus {
    // iCloudService#authenticate has not been called yet.
    NotStarted = "NotStarted",
    // Called after iCloudService#authenticate was called and local validation of the username & password was verified.
    Started = "Started",
    // The user needs to be prompted for the MFA code, which can be provided by calling iCloudService#provideMfaCode
    MfaRequested = "MfaRequested",
    //  The MFA code was successfully validated.
    Authenticated = "Authenticated",
    // Authentication has succeeded.
    Trusted = "Trusted",
    // The iCloudService is ready for use.
    Ready = "Ready",
    // The authentication failed.
    Error = "Error"
}


/**
 * Information about the account's storage usage.
 */
export interface iCloudStorageUsage {
    storageUsageByMedia: Array<{
      mediaKey: string
      displayLabel: string
      displayColor: string
      usageInBytes: number
    }>
    storageUsageInfo: {
      compStorageInBytes: number
      usedStorageInBytes: number
      totalStorageInBytes: number
      commerceStorageInBytes: number
    }
    quotaStatus: {
      overQuota: boolean
      haveMaxQuotaTier: boolean
      "almost-full": boolean
      paidQuota: boolean
    }
    familyStorageUsageInfo: {
      mediaKey: string
      displayLabel: string
      displayColor: string
      usageInBytes: number
      familyMembers: Array<{
        lastName: string
        dsid: number
        fullName: string
        firstName: string
        usageInBytes: number
        id: string
        appleId: string
      }>
    }
  }

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The main iCloud service class
 * It serves as a central manager for logging in and exposes all other services.
 * @example ```ts
const icloud = new iCloud({
    username: "johnny.appleseed@icloud.com",
    password: "hunter2",
    saveCredentials: true,
    trustDevice: true
});
await icloud.authenticate();
console.log(icloud.status);
if (icloud.status === "MfaRequested") {
    await icloud.provideMfaCode("123456");
}
await icloud.awaitReady;
console.log(icloud.status);
console.log("Hello, " + icloud.accountInfo.dsInfo.fullName);
```
 */
export default class iCloudService extends EventEmitter {
    /**
     * The authentication store for this service instance.
     * Manages cookies & trust tokens.
     */
    authStore: iCloudAuthenticationStore;
    /**
     * Shared CookieJar — mirrors pyicloud's requests.Session() cookiejar.
     * fetch-cookie stores every Set-Cookie response header here (including from
     * 503 / error responses) and sends matching cookies automatically.
     */
    cookieJar: CookieJar;
    /**
     * Cookie-jar-backed fetch — drop-in replacement for node-fetch that
     * automatically handles cookies for all domains.
     */
    fetch: typeof nodeFetch;
    /**
     * The options for this service instance.
     */
    options: iCloudServiceSetupOptions;

    /**
     * The status of the iCloudService.
     */
    status: iCloudServiceStatus = iCloudServiceStatus.NotStarted;

    /*
     *  Has PCS (private/protected cloud service?) enabled.
     *  The check is implemented by checking if the `isDeviceConsentedForPCS` key is present in the `requestWebAccessState` object.
    */
    pcsEnabled?: boolean;
    /**
     * PCS access is granted.
     */
    pcsAccess?: boolean;
    /**
     * Has ICRS (iCloud Recovery Service) disabled.
     * This should only be true when iCloud Advanced Data Protection is enabled.
     */
    ICDRSDisabled?: boolean;

    accountInfo?: AccountInfo;

    /**
     * A promise that can be awaited that resolves when the iCloudService is ready.
     * Will reject if an error occurs during authentication.
     */
    awaitReady = new Promise((resolve, reject) => {
        this.on(iCloudServiceStatus.Ready, resolve);
        this.on(iCloudServiceStatus.Error, reject);
    });

    constructor(options: iCloudServiceSetupOptions) {
        super();
        this.options = options;
        if (!this.options.dataDirectory) this.options.dataDirectory = path.join(os.homedir(), ".icloud");
        this.cookieJar = new CookieJar();
        this.fetch = fetchCookie(nodeFetch, this.cookieJar) as unknown as typeof nodeFetch;
        this.authStore = new iCloudAuthenticationStore(this);
    }
    _log(level: number, ...args: any[]) {
        if (typeof this.options.logger === "function") {
            this.options.logger(level, ...args);
        } else {
            if (LogLevel[this.options.logger || "Debug"] > level) return;
            args.unshift("[icloud]");
            if (level === LogLevel.Debug) console.debug(...args);
            else if (level === LogLevel.Info) console.info(...args);
            else if (level === LogLevel.Warning) console.warn(...args);
            else if (level === LogLevel.Error) console.error(...args);
        }
    }

    private _setState(state: iCloudServiceStatus, ...args: any[]) {
        this._log(LogLevel.Debug, "State changed to:", state);
        this.status = state;

        this.emit(state, ...args);
    }

    /**
     * Authenticates to the iCloud service.
     * If a username is not passed to this function, it will use the one provided to the options object in the constructor, failing that, it will find the first result in the system's keychain matching https://idmsa.apple.com
     * The same applies to the password. If it is not provided to this function, the options object will be used, and then it will check the keychain for a keychain matching the email for idmsa.apple.com
     * @param username The username to use instead of the one provided in this iCloudService's options
     * @param password The password to use instead of the one provided in this iCloudService's options
     */
    async authenticate(username?: string, password?: string) {
        username = username || this.options.username;
        password = password || this.options.password;

        if (!username) {
            try {
                const saved = (await require("keytar").findCredentials("https://idmsa.apple.com"))[0];
                if (!saved) throw new Error("Username was not provided and could not be found in keychain");
                username = saved.account;
                this._log(LogLevel.Debug, "Username found in keychain:", username);
            } catch (e) {
                throw new Error("Username was not provided, and unable to use Keytar to find saved credentials" + e.toString());
            }
        }
        if (typeof (username as any) !== "string") throw new TypeError("authenticate(username?: string, password?: string): 'username' was " + (username || JSON.stringify(username)).toString());
        this.options.username = username;
        if (!password) {
            try {
                password = await require("keytar").findPassword("https://idmsa.apple.com", username);
            } catch (e) {
                throw new Error("Password was not provided, and unable to use Keytar to find saved credentials" + e.toString());
            }
        }
        if (typeof (password as any) !== "string") throw new TypeError("authenticate(username?: string, password?: string): 'password' was " + (password || JSON.stringify(password)).toString());
        // hide password from console.log
        Object.defineProperty(this.options, "password", {
            enumerable: false, // hide it from for..in
            value: password
        });
        if (!username) throw new Error("Username is required");
        if (!password) throw new Error("Password is required");


        if (!fs.existsSync(this.options.dataDirectory)) fs.mkdirSync(this.options.dataDirectory);
        // Load persisted session data and cookies (like pyicloud reads .session + cookiejar files).
        // This populates scnt, session_id, session_token, trust_token, client_id from disk so they
        // can be included in the next signin request — preventing Apple from treating us as a brand
        // new client and triggering rate-limit / 503 responses.
        const sessionData = this.authStore.loadSession(this.options.username);
        this.authStore.loadCookieJar(this.options.username);
        // Fallback: also try legacy trust-token file for accounts that only have the old format
        if (!this.authStore.trustToken) this.authStore.loadTrustToken(this.options.username);

        // Reuse persisted client_id (pyicloud pattern: generate once, reuse forever)
        const clientId = this.authStore.clientId ||
            ("auth-" + crypto.randomUUID().toLowerCase());
        if (!this.authStore.clientId) {
            this.authStore.clientId = clientId;
            this.authStore.saveSession(this.options.username);
        }

        this._setState(iCloudServiceStatus.Started);
        try {
            // ── Attempt to reuse existing session token (pyicloud: _validate_token) ────────
            if (this.authStore.sessionToken) {
                try {
                    this._log(LogLevel.Debug, "[auth] Validating existing session token...");
                    const validateResponse = await this.fetch(
                        "https://setup.icloud.com/setup/ws/1/validate",
                        { headers: this.authStore.getHeaders(), method: "POST", body: "null" }
                    );
                    this.authStore.extractSessionHeaders(validateResponse);
                    if (validateResponse.status === 200) {
                        this._log(LogLevel.Debug, "[auth] Session token valid — skipping full signin");
                        try { this.accountInfo = await validateResponse.json(); } catch (_) { /* ignore */ }
                        this.authStore.saveSession(this.options.username);
                        this._setState(iCloudServiceStatus.Trusted);
                        this._getiCloudCookies();
                        return;
                    }
                    this._log(LogLevel.Debug, "[auth] Session token invalid (HTTP " + validateResponse.status + ") — doing full signin");
                } catch (e) {
                    this._log(LogLevel.Debug, "[auth] Session token check failed:", e.toString());
                }
            }

            // Build signin headers including persisted scnt + session_id (like pyicloud).
            // Auth cookies (aasp etc.) are sent automatically by the fetch-cookie jar.
            const sessionAuthHeaders: Record<string, string> = {
                ...AUTH_HEADERS,
                "X-Apple-OAuth-State": clientId,
                ...(this.authStore.scnt      ? { scnt: this.authStore.scnt } : {}),
                ...(this.authStore.sessionId ? { "X-Apple-ID-Session-Id": this.authStore.sessionId } : {}),
            };

            let authEndpoint = "signin";
            let authData = {
                accountName: this.options.username,
                trustTokens: this.authStore.trustToken ? [this.authStore.trustToken] : [],
                rememberMe: true  // always true — matches pyicloud behaviour
            } as any;
            if (this.options.authMethod === "srp") {
                const authenticator = new GSASRPAuthenticator(username);
                const initData = await authenticator.getInit();
                this._log(LogLevel.Debug, "[auth] SRP init → POST", AUTH_ENDPOINT + "signin/init");
                const initRaw = await this.fetch(AUTH_ENDPOINT + "signin/init", {
                    headers: sessionAuthHeaders, method: "POST", body: JSON.stringify(initData)
                });
                this._log(LogLevel.Debug, "[auth] SRP init response status:", initRaw.status);
                if (!initRaw.ok) {
                    const errBody = (await initRaw.text()).slice(0, 200);
                    throw new Error("SRP init failed (" + initRaw.status + "): " + errBody);
                }
                const initResponse = await initRaw.json();
                authData = {
                    ...authData,
                    ...(await authenticator.getComplete(password, initResponse))
                };
                authEndpoint = "signin/complete";
            } else {
                authData.password = this.options.password;
            }

            const signinUrl = AUTH_ENDPOINT + authEndpoint + "?isRememberMeEnabled=true";
            this._log(LogLevel.Debug, "[auth] signin → POST", signinUrl);
            const authResponse = await this.fetch(signinUrl, { headers: sessionAuthHeaders, method: "POST", body: JSON.stringify(authData) });
            this._log(LogLevel.Debug, "[auth] signin response status:", authResponse.status);
            this._log(LogLevel.Debug, "[auth] signin response headers:",
                JSON.stringify(Object.fromEntries(authResponse.headers.entries())));

            // Always extract + persist session headers — even on error responses.
            // This is the pyicloud pattern: Apple may return scnt/session_id on a 503 and
            // expects them back on the next request. Without this, every retry looks like a
            // brand-new client and the rate-limit window resets/extends.
            this.authStore.extractSessionHeaders(authResponse);
            this.authStore.saveCookieJar(this.options.username);
            this.authStore.saveSession(this.options.username);

            if (authResponse.status == 200) {
                if (this.authStore.processAuthSecrets(authResponse, this.options.username)) {
                    this._setState(iCloudServiceStatus.Trusted);
                    this._getiCloudCookies();
                } else {
                    throw new Error("Unable to process auth response!");
                }
            } else if (authResponse.status == 409) {
                if (this.authStore.processAuthSecrets(authResponse, this.options.username)) {
                    const body = await authResponse.text();
                    this._log(LogLevel.Debug, "[auth] 409 body:", body);

                    // pyicloud always calls accountLogin immediately after signin — even after 409.
                    // If it returns 200, the session is already fully authenticated (no MFA needed).
                    // If it returns non-200, we go to MfaRequested and wait for the user's code.
                    // Either way, the POST is also what triggers Apple's push notification to trusted devices.
                    let accountLoginOk = false;
                    try {
                        const setupData = {
                            accountCountryCode: this.authStore.accountCountry,
                            dsWebAuthToken:     this.authStore.sessionToken,
                            extended_login:     true,
                            trustToken:         this.authStore.trustToken ?? ""
                        };
                        this._log(LogLevel.Debug, "[auth] POST", SETUP_ENDPOINT, "(accountLogin after 409 — triggers MFA push and may complete auth)");
                        const setupResp = await this.fetch(SETUP_ENDPOINT, {
                            headers: DEFAULT_HEADERS, method: "POST",
                            body: JSON.stringify(setupData)
                        });
                        this.authStore.extractSessionHeaders(setupResp);
                        this.authStore.saveCookieJar(this.options.username);
                        this.authStore.saveSession(this.options.username);
                        this._log(LogLevel.Debug, "[auth] accountLogin (post-409) status:", setupResp.status);
                        if (setupResp.status === 200) {
                            // Session accepted without further MFA — treat as authenticated
                            accountLoginOk = true;
                            try { this.accountInfo = await setupResp.json(); } catch (_) { /* ignore */ }
                        } else {
                            await setupResp.text(); // consume body
                        }
                    } catch (pushTriggerErr) {
                        this._log(LogLevel.Debug, "[auth] accountLogin (post-409) failed:", (pushTriggerErr as Error).toString());
                    }

                    if (accountLoginOk) {
                        this._log(LogLevel.Debug, "[auth] accountLogin after 409 succeeded — skipping MFA");
                        try { await this.checkPCS(); } catch (_) { /* ignore */ }
                        this.authStore.saveSession(this.options.username);
                        this._setState(iCloudServiceStatus.Ready);
                    } else {
                        this._setState(iCloudServiceStatus.MfaRequested);
                    }
                } else {
                    throw new Error("Unable to process auth response (409) — missing session headers!");
                }
            } else {
                const body = (await authResponse.text()).slice(0, 300);
                this._log(LogLevel.Error, "[auth] unexpected response body (truncated):", body);
                if (authResponse.status == 401 || authResponse.status == 403)
                    throw new Error("Falsche Apple-ID oder falsches Passwort (HTTP " + authResponse.status + "): " + body);
                if (authResponse.status == 503)
                    throw new Error("RATE_LIMITED: Apple hat den Login vorübergehend gesperrt (HTTP 503). Bitte 30–60 Minuten warten und dann erneut versuchen.");

                throw new Error("Unbekannter Fehler beim Login (HTTP " + authResponse.status + "): " + body);
            }
        } catch (e) {
            this._setState(iCloudServiceStatus.Error, e);
            throw e;
        }
    }

    /**
     * Call this to provide the MFA code that was sent to the user's devices.
     * @param code The six digit MFA code.
     */
    async provideMfaCode(code: string) {
        if (typeof (code as any) !== "string") throw new TypeError("provideMfaCode(code: string): 'code' was " + code.toString());
        code = code.replace(/\D/g, "");
        if (code.length !== 6) this._log(LogLevel.Warning, "Provided MFA wasn't 6-digits!");

        if (!this.authStore.validateAuthSecrets())
            throw new Error("Cannot provide MFA code without calling authenticate first!");

        const authData = { securityCode: { code } };
        const authResponse = await this.fetch(
            AUTH_ENDPOINT + "verify/trusteddevice/securitycode",
            { headers: this.authStore.getMfaHeaders(), method: "POST", body: JSON.stringify(authData) }
        );
        if (authResponse.status == 204) {
            this._setState(iCloudServiceStatus.Authenticated);
            if (this.options.trustDevice) this._getTrustToken().then(this._getiCloudCookies.bind(this));
            else this._getiCloudCookies();
        } else {
            throw new Error("Invalid status code: " + authResponse.status + " " + await authResponse.text());
        }
    }

    private async _getTrustToken() {
        if (!this.authStore.validateAuthSecrets())
            throw new Error("Cannot get auth token without calling authenticate first!");

        this._log(LogLevel.Warning, "Trusting device");
        const authResponse = await this.fetch(
            AUTH_ENDPOINT + "2sv/trust",
            { headers: this.authStore.getMfaHeaders() }
        );
        if (this.authStore.processAccountTokens(this.options.username, authResponse))
            this._setState(iCloudServiceStatus.Trusted);
        else
            this._log(LogLevel.Error, "Unable to trust device!");
    }


    private async _getiCloudCookies() {
        try {
            const data = {
                accountCountryCode: this.authStore.accountCountry,
                dsWebAuthToken: this.authStore.sessionToken,
                extended_login: true,
                trustToken: this.authStore.trustToken ?? ""
            };
            this._log(LogLevel.Debug, "[setup] accountLogin → POST", SETUP_ENDPOINT);
            const response = await this.fetch(SETUP_ENDPOINT, { headers: DEFAULT_HEADERS, method: "POST", body: JSON.stringify(data) });
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


                    this._setState(iCloudServiceStatus.Ready);
                    try {
                        if (this.options.saveCredentials) require("keytar").setPassword("https://idmsa.apple.com", this.options.username, this.options.password);
                    } catch (e) {
                        this._log(LogLevel.Warning, "Unable to save account credentials:", e);
                    }
                } else {
                    throw new Error("Unable to process cloud setup response!");
                }
            } else {
                throw new Error("Invalid status code: " + response.status);
            }
        } catch (e) {
            this._setState(iCloudServiceStatus.Error, e);
            throw e;
        }
    }


    /**
     * Updates the PCS state (iCloudService.pcsEnabled, iCloudService.pcsAccess, iCloudService.ICDRSDisabled).
     */
    async checkPCS() {
        const pcsTest = await this.fetch("https://setup.icloud.com/setup/ws/1/requestWebAccessState", { headers: this.authStore.getHeaders(), method: "POST" });
        if (pcsTest.status == 200) {
            const j = await pcsTest.json();
            this.pcsEnabled = typeof j.isDeviceConsentedForPCS == "boolean";
            this.pcsAccess = this.pcsEnabled ? j.isDeviceConsentedForPCS : true;
            this.ICDRSDisabled = j.isICDRSDisabled || false;
        } else {
            throw new Error("checkPCS: response code " + pcsTest.status);
        }
    }

    /**
     * Requests PCS access to a specific service. Required to call before accessing any PCS protected services when iCloud Advanced Data Protection is enabled.
     * @remarks Should only be called when iCloudService.ICDRSDisabled is `false`, however this function will check for you, and immediately return as it's not required..
     * @experimental
     * @param appName The service name to request access to.
     */
    async requestServiceAccess(appName: "iclouddrive") {
        await this.checkPCS();
        if (!this.ICDRSDisabled) {
            this._log(LogLevel.Warning, "requestServiceAccess: ICRS is not disabled.");
            return true;
        }
        if (!this.pcsAccess) {
            const requestPcs = await this.fetch("https://setup.icloud.com/setup/ws/1/enableDeviceConsentForPCS", { headers: this.authStore.getHeaders(), method: "POST" });
            const requestPcsJson = await requestPcs.json();
            if (!requestPcsJson.isDeviceConsentNotificationSent)
                throw new Error("Unable to request PCS access!");
        }
        while (!this.pcsAccess) {
            await sleep(5000);
            await this.checkPCS();
        }
        let pcsRequest = await this.fetch("https://setup.icloud.com/setup/ws/1/requestPCS", { headers: this.authStore.getHeaders(), method: "POST", body: JSON.stringify({ appName, derivedFromUserAction: true }) });
        let pcsJson = await pcsRequest.json();
        while (true) {
            if (pcsJson.status == "success") {
                break;
            } else {
                switch (pcsJson.message) {
                case "Requested the device to upload cookies.":
                case "Cookies not available yet on server.":
                    await sleep(5000);
                    break;
                default:
                    this._log(LogLevel.Error, "unknown PCS request state", pcsJson);
                }
                pcsRequest = await this.fetch("https://setup.icloud.com/setup/ws/1/requestPCS", { headers: this.authStore.getHeaders(), method: "POST", body: JSON.stringify({ appName, derivedFromUserAction: false }) });
                pcsJson = await pcsRequest.json();
            }
        }
        // cookies from pcsRequest are stored automatically by fetch-cookie

        return true;
    }







    private _serviceCache: {[key: string]: any} = {};
    /**
     * A mapping of service names to their classes.
     * This is used by {@link iCloudService.getService} to return the correct service class.
     * @remarks You should **not** use this to instantiate services, use {@link iCloudService.getService} instead.
     * @see {@link iCloudService.getService}
     */
    serviceConstructors: {[key: string]: any} = {
        account: iCloudAccountDetailsService,
        findme: iCloudFindMyService,
        ubiquity: iCloudUbiquityService,
        drivews: iCloudDriveService,
        calendar: iCloudCalendarService,
        photos: iCloudPhotosService
    };

    // Returns an instance of the 'account' (Account Details) service.
    getService(service: "account"): iCloudAccountDetailsService;
    // Returns an instance of the 'findme' (Find My) service.
    getService(service: "findme"): iCloudFindMyService;
    /**
     * Returns an instance of the 'ubiquity' (Legacy iCloud Documents) service.
     * @deprecated
     */
    getService(service: "ubiquity"): iCloudUbiquityService;
    // Returns an instance of the 'drivews' (iCloud Drive) service.
    getService(service: "drivews"): iCloudDriveService
    // Returns an instance of the 'calendar' (iCloud Calendar) service.
    getService(service: "calendar"): iCloudCalendarService
    // Returns an instance of the 'photos' (iCloud Photos) service.
    getService(service: "photos"): iCloudPhotosService
    /**
     * Returns an instance of the specified service. Results are cached, so subsequent calls will return the same instance.
     * @param service The service name to return an instance of. Must be one of the keys in {@link iCloudService.serviceConstructors}.
     * @returns {iCloudService}
     */
    getService(service:string) {
        if (!this.serviceConstructors[service]) throw new TypeError(`getService(service: string): 'service' was ${service.toString()}, must be one of ${Object.keys(this.serviceConstructors).join(", ")}`);
        if (service === "photos")
            this._serviceCache[service] = new this.serviceConstructors[service](this, this.accountInfo.webservices.ckdatabasews.url);

        if (!this._serviceCache[service])
            this._serviceCache[service] = new this.serviceConstructors[service](this, this.accountInfo.webservices[service].url);

        return this._serviceCache[service];
    }


    private _storage;
    /**
     * Gets the storage usage data for the account.
     * @param refresh Force a refresh of the storage usage data.
     * @returns {Promise<iCloudStorageUsage>} The storage usage data.
     */
    async getStorageUsage(refresh = false): Promise<iCloudStorageUsage> {
        if (!refresh && this._storage) return this._storage;
        const response = await this.fetch("https://setup.icloud.com/setup/ws/1/storageUsageInfo", { headers: this.authStore.getHeaders() });
        const json = await response.json();
        this._storage = json;
        return this._storage;
    }
}