import EventEmitter from 'node:events';
import fs from 'node:fs';
import fetchCookie from 'fetch-cookie';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { CookieJar } from 'tough-cookie';
import { iCloudAuthenticationStore } from './auth/authStore';
import { GSASRPAuthenticator } from './auth/iCSRPAuthenticator.js';
import { AUTH_ENDPOINT, AUTH_HEADERS, DEFAULT_HEADERS, SETUP_ENDPOINT } from './consts';
import { iCloudAccountDetailsService } from './services/account';
import { iCloudCalendarService } from './services/calendar';
import { iCloudDriveService } from './services/drive';
import { iCloudFindMyService } from './services/findMy';
import { iCloudPhotosService } from './services/photos';
import { iCloudRemindersService } from './services/reminders';
import { iCloudContactsService } from './services/contacts';
import { iCloudNotesService } from './services/notes';
import { iCloudUbiquityService } from './services/ubiquity';
import type { AccountInfo } from './types';

export type { iCloudAuthenticationStore } from './auth/authStore';
export type { AccountInfo } from './types';
export const LogLevel = {
    Debug: 0,
    Info: 1,
    Warning: 2,
    Error: 3,

    Silent: Infinity,
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
     *
     * @default "legacy"
     */
    authMethod?: 'legacy' | 'srp';

    /**
     * Log level to use. Alternatively pass in a function that will recieve all log messages instead of being forwarded to console
     *
     * @default LogLevel.Debug
     */
    logger?: keyof typeof LogLevel | ((level: (typeof LogLevel)[keyof typeof LogLevel], ...args: any[]) => void);
}
/**
 * The state of the iCloudService.
 */
export const enum iCloudServiceStatus {
    // iCloudService#authenticate has not been called yet.
    NotStarted = 'NotStarted',
    // Called after iCloudService#authenticate was called and local validation of the username & password was verified.
    Started = 'Started',
    // The user needs to be prompted for the MFA code, which can be provided by calling iCloudService#provideMfaCode
    MfaRequested = 'MfaRequested',
    //  The MFA code was successfully validated.
    Authenticated = 'Authenticated',
    // Authentication has succeeded.
    Trusted = 'Trusted',
    // The iCloudService is ready for use.
    Ready = 'Ready',
    // The authentication failed.
    Error = 'Error',
}

/**
 * Information about the account's storage usage.
 */
export interface iCloudStorageUsage {
    storageUsageByMedia: Array<{
        mediaKey: string;
        displayLabel: string;
        displayColor: string;
        usageInBytes: number;
    }>;
    storageUsageInfo: {
        compStorageInBytes: number;
        usedStorageInBytes: number;
        totalStorageInBytes: number;
        commerceStorageInBytes: number;
    };
    quotaStatus: {
        overQuota: boolean;
        haveMaxQuotaTier: boolean;
        'almost-full': boolean;
        paidQuota: boolean;
    };
    familyStorageUsageInfo: {
        mediaKey: string;
        displayLabel: string;
        displayColor: string;
        usageInBytes: number;
        familyMembers: Array<{
            lastName: string;
            dsid: number;
            fullName: string;
            firstName: string;
            usageInBytes: number;
            id: string;
            appleId: string;
        }>;
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * The main iCloud service class
 * It serves as a central manager for logging in and exposes all other services.
 *
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
     * Cookie-jar-backed fetch — native globalThis.fetch wrapped with fetch-cookie
     * for automatic cookie handling across all domains.
     */
    fetch: typeof globalThis.fetch;
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
     * Parsed trusted phone number from GET /appleauth/auth.
     * Populated during the MFA challenge phase and used by requestSmsMfaCode / provideMfaCode.
     * Mirrors pyiCloud's TrustedPhoneNumber dataclass.
     */
    private _trustedPhone?: { id: number | string; nonFTEU?: boolean; pushMode?: string };

    /** Set after requestSmsMfaCode() — routes provideMfaCode to /verify/phone/securitycode */
    private _smsPhoneNumberId?: number | string;

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
        if (!this.options.dataDirectory) {
            this.options.dataDirectory = path.join(os.homedir(), '.icloud');
        }
        this.cookieJar = new CookieJar();
        this.fetch = fetchCookie(globalThis.fetch, this.cookieJar) as unknown as typeof globalThis.fetch;
        this.authStore = new iCloudAuthenticationStore(this);
    }
    _log(level: number, ...args: unknown[]): void {
        if (typeof this.options.logger === 'function') {
            this.options.logger(level, ...args);
        } else {
            if (LogLevel[this.options.logger || 'Debug'] > level) {
                return;
            }
            args.unshift('[icloud]');
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

    private _setState(state: iCloudServiceStatus, ...args: unknown[]): void {
        this._log(LogLevel.Debug, 'State changed to:', state);
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
    async authenticate(username?: string, password?: string): Promise<void> {
        username = username || this.options.username;
        password = password || this.options.password;

        if (!username) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const keytarMod = require('keytar') as {
                    findCredentials: (s: string) => Promise<Array<{ account: string }>>;
                };
                const saved = (await keytarMod.findCredentials('https://idmsa.apple.com'))[0];
                if (!saved) {
                    throw new Error('Username was not provided and could not be found in keychain');
                }
                username = saved.account;
                this._log(LogLevel.Debug, 'Username found in keychain:', username);
            } catch (e) {
                throw new Error(
                    `Username was not provided, and unable to use Keytar to find saved credentials${String(e)}`,
                );
            }
        }
        if (typeof (username as any) !== 'string') {
            throw new TypeError(
                `authenticate(username?: string, password?: string): 'username' was ${(
                    username || JSON.stringify(username)
                ).toString()}`,
            );
        }
        this.options.username = username;
        if (!password) {
            try {
                password = await // eslint-disable-next-line @typescript-eslint/no-require-imports
                (require('keytar') as { findPassword: (s: string, u: string) => Promise<string> }).findPassword(
                    'https://idmsa.apple.com',
                    username ?? '',
                );
            } catch (e) {
                throw new Error(
                    `Password was not provided, and unable to use Keytar to find saved credentials${String(e)}`,
                );
            }
        }
        if (typeof (password as any) !== 'string') {
            throw new TypeError(
                `authenticate(username?: string, password?: string): 'password' was ${(
                    password || JSON.stringify(password)
                ).toString()}`,
            );
        }
        // hide password from console.log
        Object.defineProperty(this.options, 'password', {
            enumerable: false, // hide it from for..in
            value: password,
        });
        if (!username) {
            throw new Error('Username is required');
        }
        if (!password) {
            throw new Error('Password is required');
        }

        if (!fs.existsSync(this.options.dataDirectory!)) {
            fs.mkdirSync(this.options.dataDirectory!);
        }
        // Load persisted session data and cookies (like pyicloud reads .session + cookiejar files).
        // This populates scnt, session_id, session_token, trust_token, client_id from disk so they
        // can be included in the next signin request — preventing Apple from treating us as a brand
        // new client and triggering rate-limit / 503 responses.
        this.authStore.loadSession(this.options.username);
        this.authStore.loadCookieJar(this.options.username);
        // Fallback: also try legacy trust-token file for accounts that only have the old format
        if (!this.authStore.trustToken) {
            this.authStore.loadTrustToken(this.options.username);
        }

        // Reuse persisted client_id (pyicloud pattern: generate once, reuse forever)
        const clientId = this.authStore.clientId || `auth-${crypto.randomUUID().toLowerCase()}`;
        if (!this.authStore.clientId) {
            this.authStore.clientId = clientId;
            this.authStore.saveSession(this.options.username);
        }

        this._setState(iCloudServiceStatus.Started);
        try {
            // ── Attempt to reuse existing session token (pyicloud: _validate_token) ────────
            if (this.authStore.sessionToken) {
                try {
                    this._log(LogLevel.Debug, '[auth] Validating existing session token...');
                    const validateResponse = await this.fetch('https://setup.icloud.com/setup/ws/1/validate', {
                        headers: this.authStore.getHeaders(),
                        method: 'POST',
                        body: 'null',
                    });
                    this.authStore.extractSessionHeaders(validateResponse);
                    if (validateResponse.status === 200) {
                        this._log(LogLevel.Debug, '[auth] Session token valid — skipping full signin');
                        try {
                            this.accountInfo = (await validateResponse.json()) as any;
                        } catch {
                            /* ignore */
                        }
                        this.authStore.saveSession(this.options.username);
                        this._setState(iCloudServiceStatus.Trusted);
                        void this._getiCloudCookies();
                        return;
                    }
                    this._log(
                        LogLevel.Debug,
                        `[auth] Session token invalid (HTTP ${validateResponse.status}) — doing full signin`,
                    );
                } catch (e) {
                    this._log(LogLevel.Debug, '[auth] Session token check failed:', String(e));
                }
            }

            // Build signin headers including persisted scnt + session_id (like pyicloud).
            // Auth cookies (aasp etc.) are sent automatically by the fetch-cookie jar.
            const sessionAuthHeaders: Record<string, string> = {
                ...AUTH_HEADERS,
                'X-Apple-OAuth-State': clientId,
                ...(this.authStore.scnt ? { scnt: this.authStore.scnt } : {}),
                ...(this.authStore.sessionId ? { 'X-Apple-ID-Session-Id': this.authStore.sessionId } : {}),
            };

            let authEndpoint = 'signin';
            let authData = {
                accountName: this.options.username,
                trustTokens: this.authStore.trustToken ? [this.authStore.trustToken] : [],
                rememberMe: true, // always true — matches pyicloud behaviour
            } as any;
            if (this.options.authMethod === 'srp') {
                const authenticator = new GSASRPAuthenticator(username);
                const initData = await authenticator.getInit();
                this._log(LogLevel.Debug, '[auth] SRP init → POST', `${AUTH_ENDPOINT}signin/init`);
                const initRaw = await this.fetch(`${AUTH_ENDPOINT}signin/init`, {
                    headers: sessionAuthHeaders,
                    method: 'POST',
                    body: JSON.stringify(initData),
                });
                this._log(LogLevel.Debug, '[auth] SRP init response status:', initRaw.status);
                if (!initRaw.ok) {
                    const errBody = (await initRaw.text()).slice(0, 200);
                    throw new Error(`SRP init failed (${initRaw.status}): ${errBody}`);
                }
                const initResponse = (await initRaw.json()) as any;
                authData = {
                    ...authData,
                    ...(await authenticator.getComplete(password, initResponse)),
                };
                authEndpoint = 'signin/complete';
            } else {
                authData.password = this.options.password;
            }

            const signinUrl = `${AUTH_ENDPOINT + authEndpoint}?isRememberMeEnabled=true`;
            this._log(LogLevel.Debug, '[auth] signin → POST', signinUrl);
            const authResponse = await this.fetch(signinUrl, {
                headers: sessionAuthHeaders,
                method: 'POST',
                body: JSON.stringify(authData),
            });
            this._log(LogLevel.Debug, '[auth] signin response status:', authResponse.status);
            this._log(
                LogLevel.Debug,
                '[auth] signin response headers:',
                JSON.stringify(Object.fromEntries(authResponse.headers.entries())),
            );

            // Always extract session headers in-memory — Apple may return a new scnt even on
            // error responses, and we need it for in-session retries (pyicloud pattern).
            this.authStore.extractSessionHeaders(authResponse);

            if (authResponse.status == 200) {
                this.authStore.saveCookieJar(this.options.username);
                if (this.authStore.processAuthSecrets(authResponse, this.options.username)) {
                    this._setState(iCloudServiceStatus.Trusted);
                    void this._getiCloudCookies();
                } else {
                    throw new Error('Unable to process auth response!');
                }
            } else if (authResponse.status == 409) {
                if (this.authStore.processAuthSecrets(authResponse, this.options.username)) {
                    const body = await authResponse.text();
                    this._log(LogLevel.Debug, '[auth] 409 body:', body);

                    // accountLogin (pyiCloud: _authenticate_with_token) — called immediately after 409.
                    // pyiCloud does exactly this and nothing else before it.
                    // Apple sends the HSA2 push notification to trusted devices as a side-effect of this call.
                    let accountLoginOk = false;
                    try {
                        const setupData = {
                            accountCountryCode: this.authStore.accountCountry,
                            dsWebAuthToken: this.authStore.sessionToken,
                            extended_login: true,
                            trustToken: this.authStore.trustToken ?? '',
                        };
                        this._log(
                            LogLevel.Debug,
                            '[auth] accountLogin body:',
                            JSON.stringify({
                                accountCountryCode: setupData.accountCountryCode,
                                dsWebAuthToken: setupData.dsWebAuthToken ? '(set)' : '(missing!)',
                                extended_login: setupData.extended_login,
                                trustToken: setupData.trustToken ? '(set)' : '(empty)',
                            }),
                        );
                        this._log(LogLevel.Debug, '[auth] POST', SETUP_ENDPOINT, '(accountLogin)');
                        const setupResp = await this.fetch(SETUP_ENDPOINT, {
                            headers: DEFAULT_HEADERS,
                            method: 'POST',
                            body: JSON.stringify(setupData),
                        });
                        this.authStore.extractSessionHeaders(setupResp);
                        this.authStore.saveCookieJar(this.options.username);
                        this.authStore.saveSession(this.options.username);
                        this._log(LogLevel.Debug, '[auth] accountLogin (post-409) status:', setupResp.status);
                        if (setupResp.status === 200) {
                            try {
                                const data = (await setupResp.json()) as AccountInfo;
                                this.accountInfo = data;
                                // pyiCloud: requires_2fa = hsaVersion >= 2 && (hsaChallengeRequired || !hsaTrustedBrowser)
                                // Even a 200 from accountLogin does NOT mean the session is trusted —
                                // Apple returns 200 with hsaTrustedBrowser=false when 2FA has never been completed.
                                const requiresMfa =
                                    (data?.dsInfo?.hsaVersion ?? 0) >= 2 &&
                                    (data?.hsaChallengeRequired === true || data?.hsaTrustedBrowser === false);
                                this._log(
                                    LogLevel.Debug,
                                    `[auth] accountLogin 200 — hsaTrustedBrowser=${data?.hsaTrustedBrowser}, hsaChallengeRequired=${data?.hsaChallengeRequired}, requiresMfa=${requiresMfa}`,
                                );
                                if (!requiresMfa) {
                                    accountLoginOk = true;
                                }
                                // else: accountLoginOk stays false → MfaRequested
                            } catch {
                                /* JSON parse failed — fall through to MfaRequested */
                            }
                        } else {
                            await setupResp.text(); // consume body
                        }
                    } catch (pushTriggerErr) {
                        this._log(
                            LogLevel.Debug,
                            '[auth] accountLogin (post-409) failed:',
                            (pushTriggerErr as Error).toString(),
                        );
                    }

                    if (accountLoginOk) {
                        this._log(LogLevel.Debug, '[auth] accountLogin after 409 succeeded — skipping MFA');
                        try {
                            await this.checkPCS();
                        } catch {
                            /* ignore */
                        }
                        this.authStore.saveSession(this.options.username);
                        this._setState(iCloudServiceStatus.Ready);
                    } else {
                        try {
                            this._log(LogLevel.Debug, '[auth] GET /appleauth/auth — fetching auth options');
                            const authResp = await this.fetch(AUTH_ENDPOINT.replace(/\/$/, ''), {
                                headers: this.authStore.getMfaHeaders(),
                            });
                            const authRespText = await authResp.text();
                            this._log(
                                LogLevel.Debug,
                                `[auth] GET /appleauth/auth → ${authResp.status}: ${authRespText}`,
                            );

                            // Parse trusted phone number from auth options (pyiCloud: _get_mfa_auth_options)
                            try {
                                const authOptions = JSON.parse(authRespText) as Record<string, unknown>;
                                // Apple returns either trustedPhoneNumber (single) or trustedPhoneNumbers (list)
                                const phoneData =
                                    (authOptions?.trustedPhoneNumber as Record<string, unknown> | undefined) ??
                                    (authOptions?.trustedPhoneNumbers as Record<string, unknown>[] | undefined)?.[0];
                                if (phoneData?.id !== undefined) {
                                    this._trustedPhone = {
                                        id: phoneData.id as number | string,
                                        nonFTEU: typeof phoneData.nonFTEU === 'boolean' ? phoneData.nonFTEU : undefined,
                                        pushMode:
                                            typeof phoneData.pushMode === 'string' ? phoneData.pushMode : undefined,
                                    };
                                    this._log(
                                        LogLevel.Debug,
                                        `[auth] Trusted phone: id=${this._trustedPhone.id}, nonFTEU=${this._trustedPhone.nonFTEU}, pushMode=${this._trustedPhone.pushMode}`,
                                    );
                                }
                            } catch {
                                /* JSON parse failed — non-fatal, SMS will fall back to id=1 */
                            }

                            // After GET /appleauth/auth, explicitly request Apple to push the code
                            // to trusted devices. Without this PUT call, SRP-authenticated sessions
                            // do NOT automatically trigger device push notifications.
                            this._log(
                                LogLevel.Debug,
                                '[auth] PUT /appleauth/auth/verify/trusteddevice — requesting device push',
                            );
                            const pushResp = await this.fetch(`${AUTH_ENDPOINT}verify/trusteddevice`, {
                                headers: this.authStore.getMfaHeaders(),
                                method: 'PUT',
                            });
                            const pushRespText = await pushResp.text();
                            this._log(
                                LogLevel.Debug,
                                `[auth] PUT verify/trusteddevice → ${pushResp.status}: ${pushRespText.slice(0, 300)}`,
                            );
                        } catch (e) {
                            this._log(LogLevel.Debug, '[auth] auth challenge request failed (non-fatal):', String(e));
                        }
                        this._setState(iCloudServiceStatus.MfaRequested);
                    }
                } else {
                    throw new Error('Unable to process auth response (409) — missing session headers!');
                }
            } else {
                const body = (await authResponse.text()).slice(0, 300);
                // 401/403/503 are handled below — log at debug to avoid noise in the UI.
                // Any other status is genuinely unexpected and warrants an error.
                const knownErrorStatus =
                    authResponse.status === 401 || authResponse.status === 403 || authResponse.status === 503;
                this._log(knownErrorStatus ? LogLevel.Debug : LogLevel.Error, '[auth] signin response body:', body);
                if (authResponse.status == 401 || authResponse.status == 403) {
                    // Clear the stale session (scnt, sessionToken, cookies) but preserve the
                    // trustToken so that a subsequent authenticate() call can skip MFA.
                    // clearPersistedSession would also wipe the trustToken, forcing the user to
                    // re-enter their MFA code on the very next attempt (e.g. after an adapter update
                    // where old session data causes a transient 401).
                    this.authStore.clearStaleSession(this.options.username);
                    throw new Error(
                        `STALE_SESSION_401: Falsche Apple-ID, falsches Passwort oder veraltete Session (HTTP ${authResponse.status}): ${body}`,
                    );
                }
                if (authResponse.status == 503) {
                    // Rate-limited: Apple expects the same scnt on the next attempt → persist it.
                    this.authStore.saveCookieJar(this.options.username);
                    this.authStore.saveSession(this.options.username);
                    throw new Error(
                        'RATE_LIMITED: Apple hat den Login vorübergehend gesperrt (HTTP 503). Bitte 30–60 Minuten warten und dann erneut versuchen.',
                    );
                }

                throw new Error(`Unbekannter Fehler beim Login (HTTP ${authResponse.status}): ${body}`);
            }
        } catch (e) {
            this._setState(iCloudServiceStatus.Error, e);
            throw e;
        }
    }

    /**
     * Request Apple to send a 2FA code via SMS to the trusted phone number.
     * Use this when no push notification arrives on trusted devices.
     * phoneNumberId defaults to 1 (the first trusted phone number).
     *
     * @param phoneNumberId - Optional phone number ID for SMS delivery. Defaults to 1 (first trusted phone).
     */
    async requestSmsMfaCode(phoneNumberId?: number | string): Promise<void> {
        // Use explicit ID, then the one from Apple's auth options, then fall back to 1
        const id = phoneNumberId ?? this._trustedPhone?.id ?? 1;

        // Build phoneNumber payload like pyiCloud's as_phone_number_payload()
        const phonePayload: Record<string, unknown> = { id };
        if (this._trustedPhone?.nonFTEU !== undefined) {
            phonePayload.nonFTEU = this._trustedPhone.nonFTEU;
        }

        this._log(LogLevel.Debug, `[auth] PUT /appleauth/auth/verify/phone — requesting SMS code to phone id ${id}`);
        const resp = await this.fetch(`${AUTH_ENDPOINT}verify/phone`, {
            headers: this.authStore.getMfaHeaders(),
            method: 'PUT',
            body: JSON.stringify({ phoneNumber: phonePayload, mode: 'sms' }),
        });
        const text = await resp.text();
        this._log(LogLevel.Debug, `[auth] SMS request → ${resp.status}: ${text.slice(0, 200)}`);
        if (!resp.ok) {
            throw new Error(`SMS request failed (${resp.status}): ${text.slice(0, 200)}`);
        }
        // Remember that next MFA code submission must go to the phone endpoint
        this._smsPhoneNumberId = id;
    }

    /**
     * Call this to provide the MFA code that was sent to the user's devices.
     *
     * @param code The six digit MFA code.
     */
    async provideMfaCode(code: string): Promise<void> {
        if (typeof (code as any) !== 'string') {
            throw new TypeError(`provideMfaCode(code: string): 'code' was ${code.toString()}`);
        }
        code = code.replace(/\D/g, '');
        if (code.length !== 6) {
            this._log(LogLevel.Warning, "Provided MFA wasn't 6-digits!");
        }

        if (!this.authStore.validateAuthSecrets()) {
            throw new Error('Cannot provide MFA code without calling authenticate first!');
        }

        let authResponse: Response;
        if (this._smsPhoneNumberId !== undefined) {
            // Code sent via SMS — must verify against /verify/phone/securitycode
            // pyiCloud: _validate_sms_code — uses trustedPhoneNumber payload including nonFTEU
            const phoneId = this._smsPhoneNumberId;
            const mode = this._trustedPhone?.pushMode ?? 'sms';
            const phonePayload: Record<string, unknown> = { id: phoneId };
            if (this._trustedPhone?.nonFTEU !== undefined) {
                phonePayload.nonFTEU = this._trustedPhone.nonFTEU;
            }
            this._log(
                LogLevel.Debug,
                `[auth] POST /verify/phone/securitycode (SMS, phone id ${phoneId}, mode ${mode})`,
            );
            authResponse = await this.fetch(`${AUTH_ENDPOINT}verify/phone/securitycode`, {
                headers: this.authStore.getMfaHeaders(),
                method: 'POST',
                body: JSON.stringify({ phoneNumber: phonePayload, securityCode: { code }, mode }),
            });
        } else {
            // Code sent via trusted device push
            this._log(LogLevel.Debug, '[auth] POST /verify/trusteddevice/securitycode (device push)');
            authResponse = await this.fetch(`${AUTH_ENDPOINT}verify/trusteddevice/securitycode`, {
                headers: this.authStore.getMfaHeaders(),
                method: 'POST',
                body: JSON.stringify({ securityCode: { code } }),
            });
        }
        this._smsPhoneNumberId = undefined; // reset after use
        // Device push returns 204, SMS verification returns 200 with a JSON body containing "valid: true"
        if (authResponse.status === 204 || authResponse.status === 200) {
            this._setState(iCloudServiceStatus.Authenticated);
            if (this.options.trustDevice) {
                void this._getTrustToken().then(this._getiCloudCookies.bind(this));
            } else {
                void this._getiCloudCookies();
            }
        } else {
            throw new Error(`Invalid status code: ${authResponse.status} ${await authResponse.text()}`);
        }
    }

    private async _getTrustToken(): Promise<void> {
        if (!this.authStore.validateAuthSecrets()) {
            throw new Error('Cannot get auth token without calling authenticate first!');
        }

        this._log(LogLevel.Warning, 'Trusting device');
        const authResponse = await this.fetch(`${AUTH_ENDPOINT}2sv/trust`, { headers: this.authStore.getMfaHeaders() });
        if (this.authStore.processAccountTokens(this.options.username!, authResponse)) {
            this._setState(iCloudServiceStatus.Trusted);
        } else {
            this._log(LogLevel.Error, 'Unable to trust device!');
        }
    }

    private async _getiCloudCookies(): Promise<void> {
        try {
            const data = {
                accountCountryCode: this.authStore.accountCountry,
                dsWebAuthToken: this.authStore.sessionToken,
                extended_login: true,
                trustToken: this.authStore.trustToken ?? '',
            };
            this._log(LogLevel.Debug, '[setup] accountLogin → POST', SETUP_ENDPOINT);
            const response = await this.fetch(SETUP_ENDPOINT, {
                headers: DEFAULT_HEADERS,
                method: 'POST',
                body: JSON.stringify(data),
            });
            this._log(LogLevel.Debug, '[setup] accountLogin response status:', response.status);
            if (response.status == 200) {
                if (this.authStore.processCloudSetupResponse(response, this.options.username)) {
                    try {
                        this.accountInfo = (await response.json()) as any;
                    } catch (e) {
                        this._log(LogLevel.Warning, 'Could not get account info:', e);
                    }

                    try {
                        await this.checkPCS();
                    } catch (e) {
                        this._log(LogLevel.Warning, 'Could not get PCS state:', e);
                    }

                    this._setState(iCloudServiceStatus.Ready);
                    if (this.options.saveCredentials) {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            const keytar = require('keytar') as {
                                setPassword: (s: string, u: string, p: string) => void;
                            };
                            keytar.setPassword(
                                'https://idmsa.apple.com',
                                this.options.username!,
                                this.options.password!,
                            );
                        } catch (e) {
                            this._log(LogLevel.Warning, 'Unable to save account credentials:', e);
                        }
                    }
                } else {
                    throw new Error('Unable to process cloud setup response!');
                }
            } else {
                throw new Error(`Invalid status code: ${response.status}`);
            }
        } catch (e) {
            this._setState(iCloudServiceStatus.Error, e);
            throw e;
        }
    }

    /**
     * Returns URL query parameters matching pyiCloud's self.params.
     * These are required for setup.icloud.com PCS-related endpoints.
     */
    getParams(): URLSearchParams {
        return this._getSetupParams();
    }

    private _getSetupParams(): URLSearchParams {
        const params = new URLSearchParams({
            clientBuildNumber: '2534Project66',
            clientMasteringNumber: '2534B22',
            clientId: this.authStore.clientId || '',
        });
        const dsid = (this.accountInfo as any)?.dsInfo?.dsid;
        if (dsid != null) {
            params.set('dsid', String(dsid));
        }
        return params;
    }

    /**
     * Updates the PCS state (iCloudService.pcsEnabled, iCloudService.pcsAccess, iCloudService.ICDRSDisabled).
     */
    async checkPCS(): Promise<void> {
        const params = this._getSetupParams();
        const pcsTest = await this.fetch(
            `https://setup.icloud.com/setup/ws/1/requestWebAccessState?${params.toString()}`,
            {
                headers: this.authStore.getHeaders(),
                method: 'POST',
            },
        );
        if (pcsTest.status == 200) {
            const j = (await pcsTest.json()) as any;
            this.pcsEnabled = typeof j.isDeviceConsentedForPCS == 'boolean';
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
    async requestServiceAccess(appName: string): Promise<boolean> {
        const PCS_SLEEP_MS = 5000;
        const PCS_MAX_RETRIES = 10;

        await this.checkPCS();
        if (!this.ICDRSDisabled) {
            this._log(LogLevel.Debug, `requestServiceAccess("${appName}"): ICDRS not disabled, PCS not required`);
            return true;
        }
        this._log(LogLevel.Info, `ADP detected (ICDRSDisabled=true) — requesting PCS cookies for "${appName}"`);

        if (!this.pcsAccess) {
            this._log(LogLevel.Debug, 'Requesting PCS consent from device');
            const params = this._getSetupParams();
            const requestPcs = await this.fetch(
                `https://setup.icloud.com/setup/ws/1/enableDeviceConsentForPCS?${params.toString()}`,
                {
                    headers: this.authStore.getHeaders(),
                    method: 'POST',
                },
            );
            const requestPcsJson = (await requestPcs.json()) as any;
            if (!requestPcsJson.isDeviceConsentNotificationSent) {
                throw new Error('Unable to request PCS access — consent notification not sent');
            }
        }

        // Wait for device consent
        for (let i = 0; i < PCS_MAX_RETRIES && !this.pcsAccess; i++) {
            this._log(LogLevel.Debug, `Waiting for PCS consent (${i + 1}/${PCS_MAX_RETRIES})...`);
            await sleep(PCS_SLEEP_MS);
            await this.checkPCS();
        }
        if (!this.pcsAccess) {
            throw new Error('PCS consent not granted within timeout — ensure an Apple device is online and unlocked');
        }

        // Request PCS cookies
        for (let attempt = 0; attempt < PCS_MAX_RETRIES; attempt++) {
            const params = this._getSetupParams();
            const pcsRequest = await this.fetch(`https://setup.icloud.com/setup/ws/1/requestPCS?${params.toString()}`, {
                headers: this.authStore.getHeaders(),
                method: 'POST',
                body: JSON.stringify({ appName, derivedFromUserAction: attempt === 0 }),
            });
            const pcsJson = (await pcsRequest.json()) as any;

            if (pcsJson.status === 'success') {
                this._log(LogLevel.Info, `PCS access granted for "${appName}"`);
                return true;
            }

            if (
                pcsJson.message === 'Requested the device to upload cookies.' ||
                pcsJson.message === 'Cookies not available yet on server.'
            ) {
                this._log(LogLevel.Debug, `PCS: ${pcsJson.message} (${attempt + 1}/${PCS_MAX_RETRIES})`);
                await sleep(PCS_SLEEP_MS);
            } else {
                throw new Error(`PCS request failed for "${appName}": ${pcsJson.message ?? JSON.stringify(pcsJson)}`);
            }
        }

        throw new Error(`PCS cookies for "${appName}" not available after ${PCS_MAX_RETRIES} retries`);
    }

    private _serviceCache: { [key: string]: any } = {};
    /**
     * A mapping of service names to their classes.
     * This is used by {@link iCloudService.getService} to return the correct service class.
     *
     * Note: You should **not** use this to instantiate services, use {@link iCloudService.getService} instead.
     *
     * @see {@link iCloudService.getService}
     */
    serviceConstructors: { [key: string]: any } = {
        account: iCloudAccountDetailsService,
        findme: iCloudFindMyService,
        ubiquity: iCloudUbiquityService,
        drivews: iCloudDriveService,
        calendar: iCloudCalendarService,
        photos: iCloudPhotosService,
        reminders: iCloudRemindersService,
        contacts: iCloudContactsService,
        notes: iCloudNotesService,
    };

    // Returns an instance of the 'account' (Account Details) service.
    getService(service: 'account'): iCloudAccountDetailsService;
    // Returns an instance of the 'findme' (Find My) service.
    getService(service: 'findme'): iCloudFindMyService;
    /**
     * Returns an instance of the 'ubiquity' (Legacy iCloud Documents) service.
     *
     * @deprecated
     */
    getService(service: 'ubiquity'): iCloudUbiquityService;
    // Returns an instance of the 'drivews' (iCloud Drive) service.
    getService(service: 'drivews'): iCloudDriveService;
    // Returns an instance of the 'calendar' (iCloud Calendar) service.
    getService(service: 'calendar'): iCloudCalendarService;
    // Returns an instance of the 'photos' (iCloud Photos) service.
    getService(service: 'photos'): iCloudPhotosService;
    // Returns an instance of the 'reminders' (iCloud Reminders) service.
    getService(service: 'reminders'): iCloudRemindersService;
    // Returns an instance of the 'contacts' (iCloud Contacts) service.
    getService(service: 'contacts'): iCloudContactsService;
    // Returns an instance of the 'notes' (iCloud Notes) service.
    getService(service: 'notes'): iCloudNotesService;
    /**
     * Returns an instance of the specified service. Results are cached, so subsequent calls will return the same instance.
     *
     * @param service The service name to return an instance of. Must be one of the keys in {@link iCloudService.serviceConstructors}.
     * @returns The service instance for the specified service name.
     */
    getService(service: string): unknown {
        if (!this.serviceConstructors[service]) {
            throw new TypeError(
                `getService(service: string): 'service' was ${service.toString()}, must be one of ${Object.keys(this.serviceConstructors).join(', ')}`,
            );
        }

        if (!this._serviceCache[service]) {
            const webservices = this.accountInfo?.webservices ?? ({} as AccountInfo['webservices']);
            const ws = webservices as unknown as Record<string, { url?: string } | undefined>;
            let serviceUrl: string | undefined;
            if (service === 'photos' || service === 'reminders' || service === 'notes') {
                // Photos & Reminders use the CloudKit (ckdatabasews) endpoint
                serviceUrl = (webservices as { ckdatabasews?: { url?: string } }).ckdatabasews?.url;
            } else {
                serviceUrl = ws[service]?.url;
            }
            if (!serviceUrl) {
                throw new Error(`iCloud service '${service}' is not available: URL missing — not yet authenticated?`);
            }
            this._serviceCache[service] = new this.serviceConstructors[service](this, serviceUrl);
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
    async refreshWebservices(): Promise<boolean> {
        if (!this.authStore.sessionToken) {
            return false;
        }
        try {
            const data = {
                accountCountryCode: this.authStore.accountCountry,
                dsWebAuthToken: this.authStore.sessionToken,
                extended_login: true,
                trustToken: this.authStore.trustToken ?? '',
            };
            this._log(LogLevel.Debug, '[findmy] refreshWebservices → POST', SETUP_ENDPOINT);
            const response = await this.fetch(SETUP_ENDPOINT, {
                headers: DEFAULT_HEADERS,
                method: 'POST',
                body: JSON.stringify(data),
            });
            this._log(LogLevel.Debug, '[findmy] refreshWebservices response status:', response.status);
            if (response.status === 200) {
                this.authStore.processCloudSetupResponse(response, this.options.username);
                try {
                    this.accountInfo = (await response.json()) as any;
                } catch {
                    /* ignore */
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
    async authenticateWebService(appName: string): Promise<void> {
        const data = {
            appName,
            apple_id: this.options.username,
            password: this.options.password,
        };
        this._log(LogLevel.Debug, `[auth] authenticateWebService "${appName}" → POST`, SETUP_ENDPOINT);
        const response = await this.fetch(SETUP_ENDPOINT, {
            headers: DEFAULT_HEADERS,
            method: 'POST',
            body: JSON.stringify(data),
        });
        this._log(LogLevel.Debug, `[auth] authenticateWebService "${appName}" response status:`, response.status);
        if (response.status === 421 || response.status === 450) {
            // Apple requires full re-authentication including 2FA for this service.
            // Mirrors pyiCloud: 421/450 triggers authenticate(force_refresh=True, service=...)
            try {
                await response.text();
            } catch {
                /* ignore */
            }
            throw new Error(`WEBSERVICE_REAUTH_REQUIRED:${appName}`);
        }
        if (response.ok) {
            this.authStore.processCloudSetupResponse(response, this.options.username);
        }
        try {
            await response.text();
        } catch {
            /* ignore */
        }
    }

    /**
     * Clear all persisted session + cookie files and in-memory tokens.
     * Forces a full re-authentication (including 2FA) on the next authenticate() call.
     */
    invalidatePersistedAuth(): void {
        if (this.options.username) {
            this.authStore.clearPersistedSession(this.options.username);
        }
    }

    private _storage: iCloudStorageUsage | undefined;
    /**
     * Gets the storage usage data for the account.
     *
     * @param refresh Force a refresh of the storage usage data.
     * @returns The storage usage data.
     */
    async getStorageUsage(refresh = false): Promise<iCloudStorageUsage> {
        if (!refresh && this._storage) {
            return this._storage;
        }
        const response = await this.fetch('https://setup.icloud.com/setup/ws/1/storageUsageInfo', {
            headers: this.authStore.getHeaders(),
        });
        const json = (await response.json()) as any;
        this._storage = json;
        return this._storage!;
    }
}
