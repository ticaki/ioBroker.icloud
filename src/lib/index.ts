import EventEmitter from 'node:events';
import fs from 'node:fs';
import fetchCookie from 'fetch-cookie';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { CookieJar } from 'tough-cookie';
import { iCloudAuthenticationStore } from './auth/authStore';
import { GSASRPAuthenticator } from './auth/iCSRPAuthenticator.js';
import {
    detectFido2Support,
    listFido2Devices,
    buildClientDataJSON,
    getAssertion,
    b64decode,
    b64encode,
    type Fido2Capability,
    type Fido2Assertion,
} from './auth/fido2';
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

    /**
     * Cancellable delay backed by the ioBroker adapter timer (adapter.delay).
     * Used for all internal waits so that pending timers are cleared on adapter unload.
     */
    delay: (ms: number) => Promise<void>;
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

/**
 * Progress milestones reported by {@link iCloudService.authenticateWithSecurityKey} so the adapter
 * can surface a live status to the user (e.g. in a state) instead of a silent wait.
 */
export type SecurityKeyProgress =
    | 'waiting-for-key' // no FIDO2 device plugged in yet — polling
    | 'key-detected' // at least one device present, trying to match Apple's credential(s)
    | 'signing' // asking a device for an assertion — the matching key blinks for a touch
    | 'verifying' // a touch produced an assertion; submitting it to Apple
    | 'success' // Apple accepted the assertion
    | 'no-match' // devices present but none held the credential / no touch this round — retrying
    | 'timeout'; // the overall window elapsed without a successful touch

/**
 * Which of Apple's two MFA verification endpoints a six-digit code has to be submitted to.
 * `sms` → /verify/phone/securitycode, `device` → /verify/trusteddevice/securitycode.
 */
export type SecurityCodeChannel = 'sms' | 'device';

/**
 * A parsed FIDO2 security-key challenge from Apple's `fsaChallenge` (GET /appleauth/auth).
 * `challenge` and `keyHandles` are base64(url) strings exactly as Apple sent them.
 */
export interface SecurityKeyChallenge {
    /** The assertion challenge (base64/base64url), echoed back to Apple unchanged. */
    challenge: string;
    /** Registered credential ids (keyHandles), base64/base64url. */
    keyHandles: string[];
    /** Relying party id, e.g. `apple.com`. */
    rpId: string;
}

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
     * Cancellable delay backed by the ioBroker adapter timer (adapter.delay).
     * Pending timers are cleared automatically when the adapter unloads.
     */
    delay: (ms: number) => Promise<void>;

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
     * Parsed FIDO2 security-key challenge from GET /appleauth/auth (Apple's `fsaChallenge`).
     * Present only for accounts that have hardware security keys enrolled — for those accounts
     * SMS / trusted-device 2FA is disabled by Apple and this is the ONLY way to satisfy MFA.
     * Consumed by authenticateWithSecurityKey(). See src/lib/auth/fido2.ts.
     */
    private _securityKeyChallenge?: SecurityKeyChallenge;

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
        this.delay = options.delay;
        if (!this.options.dataDirectory) {
            this.options.dataDirectory = path.join(os.homedir(), '.icloud');
        }
        this.cookieJar = new CookieJar();
        this.fetch = fetchCookie(globalThis.fetch, this.cookieJar);
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
     * If a username is not passed to this function, it will use the one provided to the options object in the constructor.
     * The same applies to the password.
     *
     * @param username The username to use instead of the one provided in this iCloudService's options
     * @param password The password to use instead of the one provided in this iCloudService's options
     */
    async authenticate(username?: string, password?: string): Promise<void> {
        username = username || this.options.username;
        password = password || this.options.password;

        if (!username) {
            throw new Error('Username was not provided');
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
            throw new Error('Password was not provided');
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
            // Built fresh for every request: Apple hands out a new scnt / session id on the
            // SRP init response, and signin/complete is rejected when it still carries the
            // previous one (pyicloud refreshes its header data from every response).
            const buildSessionAuthHeaders = (): Record<string, string> => ({
                ...AUTH_HEADERS,
                'X-Apple-OAuth-State': clientId,
                ...(this.authStore.scnt ? { scnt: this.authStore.scnt } : {}),
                ...(this.authStore.sessionId ? { 'X-Apple-ID-Session-Id': this.authStore.sessionId } : {}),
            });

            let authEndpoint = 'signin';
            let authData = {
                accountName: this.options.username,
                trustTokens: this.authStore.trustToken ? [this.authStore.trustToken] : [],
                rememberMe: true, // always true — matches pyicloud behaviour
            } as any;
            if (this.options.authMethod === 'srp') {
                // Apple answers signin/init with 409 when the session we present (persisted scnt /
                // X-Apple-ID-Session-Id / aasp cookie) is still stuck in a half-finished 2FA phase —
                // e.g. after an aborted MFA prompt or an adapter update. Retry once from scratch with
                // that session discarded; the trust token survives so MFA can still be skipped.
                for (let attempt = 0; attempt < 2; attempt++) {
                    const authenticator = new GSASRPAuthenticator(username);
                    const initData = await authenticator.getInit();
                    this._log(LogLevel.Debug, '[auth] SRP init → POST', `${AUTH_ENDPOINT}signin/init`);
                    const initRaw = await this.fetch(`${AUTH_ENDPOINT}signin/init`, {
                        headers: buildSessionAuthHeaders(),
                        method: 'POST',
                        body: JSON.stringify(initData),
                    });
                    this._log(LogLevel.Debug, '[auth] SRP init response status:', initRaw.status);
                    if (initRaw.ok) {
                        // Adopt the fresh scnt / session id before signin/complete goes out.
                        this.authStore.extractSessionHeaders(initRaw);
                        const initResponse = (await initRaw.json()) as any;
                        authData = {
                            ...authData,
                            ...(await authenticator.getComplete(password, initResponse)),
                        };
                        break;
                    }
                    if (initRaw.status === 409 && attempt === 0) {
                        const staleBody = (await initRaw.text()).slice(0, 200);
                        this._log(
                            LogLevel.Debug,
                            `[auth] SRP init returned 409 (${staleBody}) — discarding stale session and retrying once`,
                        );
                        this.authStore.clearStaleSession(this.options.username);
                        continue;
                    }
                    const errBody = (await initRaw.text()).slice(0, 200);
                    if (initRaw.status === 409) {
                        // Second 409 in a row: the retry already ran without any persisted session
                        // data, so this is not something a further retry can fix.
                        this.authStore.clearStaleSession(this.options.username);
                        throw new Error(
                            `SRP init failed (409): Apple lehnt den Login-Start ab. Bitte prüfe Apple-ID und Passwort und versuche es in einigen Minuten erneut. ${errBody}`,
                        );
                    }
                    throw new Error(`SRP init failed (${initRaw.status}): ${errBody}`);
                }
                authEndpoint = 'signin/complete';
            } else {
                authData.password = this.options.password;
            }

            const signinUrl = `${AUTH_ENDPOINT + authEndpoint}?isRememberMeEnabled=true`;
            this._log(LogLevel.Debug, '[auth] signin → POST', signinUrl);
            const authResponse = await this.fetch(signinUrl, {
                headers: buildSessionAuthHeaders(),
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
                            // pyiCloud refreshes its session data from EVERY response — Apple hands
                            // out a fresh scnt / session id here, and the securitycode POST later on
                            // is rejected (-21669) when it still carries the previous one.
                            this.authStore.extractSessionHeaders(authResp);
                            const authRespText = await authResp.text();
                            this._log(
                                LogLevel.Debug,
                                `[auth] GET /appleauth/auth → ${authResp.status}: ${authRespText}`,
                            );

                            // Parse trusted phone number from auth options (pyiCloud: _get_mfa_auth_options)
                            try {
                                const authOptions = JSON.parse(authRespText) as Record<string, unknown>;
                                // Apple may nest phone data under "phoneNumberVerification" (modern flow,
                                // as seen in pyiCloud's PhoneNumberVerification.from_mapping) or expose it
                                // at the top level. Check both.
                                const phoneVerification = authOptions?.phoneNumberVerification as
                                    | Record<string, unknown>
                                    | undefined;
                                const phoneData =
                                    (authOptions?.trustedPhoneNumber as Record<string, unknown> | undefined) ??
                                    (phoneVerification?.trustedPhoneNumber as Record<string, unknown> | undefined) ??
                                    (authOptions?.trustedPhoneNumbers as Record<string, unknown>[] | undefined)?.[0] ??
                                    (
                                        phoneVerification?.trustedPhoneNumbers as Record<string, unknown>[] | undefined
                                    )?.[0];
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

                                // Parse the FIDO2 security-key challenge, if present. Accounts with
                                // hardware security keys get an `fsaChallenge` here instead of usable
                                // SMS/trusted-device options — see authenticateWithSecurityKey().
                                const fsa = authOptions?.fsaChallenge as Record<string, unknown> | undefined;
                                const keyHandles = fsa?.keyHandles;
                                if (
                                    fsa &&
                                    typeof fsa.challenge === 'string' &&
                                    typeof fsa.rpId === 'string' &&
                                    Array.isArray(keyHandles) &&
                                    keyHandles.every(k => typeof k === 'string')
                                ) {
                                    this._securityKeyChallenge = {
                                        challenge: fsa.challenge,
                                        rpId: fsa.rpId,
                                        keyHandles: keyHandles,
                                    };
                                    this._log(
                                        LogLevel.Debug,
                                        `[auth] Security-key challenge present: rpId=${fsa.rpId}, ${keyHandles.length} keyHandle(s)`,
                                    );
                                }
                            } catch {
                                /* JSON parse failed — non-fatal; _trustedPhone stays undefined */
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
                            this.authStore.extractSessionHeaders(pushResp);
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
     * Mirrors pyiCloud's `_request_sms_2fa_code`: throws if no trusted phone number is available.
     *
     * @param phoneNumberId - Optional explicit phone number ID. When omitted, the ID from Apple's auth response is used.
     */
    async requestSmsMfaCode(phoneNumberId?: number | string): Promise<void> {
        // Normally Apple returns a trusted phone number in the auth options. Accounts that use
        // security keys (FIDO2 / YubiKey) as their primary 2FA may omit the phone number from
        // GET /appleauth/auth (the response carries an fsaChallenge instead), even though a phone
        // number is still registered. Rather than bailing out, attempt id=1 (the first registered
        // number) as a diagnostic fallback so we can observe Apple's actual /verify/phone response.
        let id: number | string;
        if (phoneNumberId !== undefined) {
            id = phoneNumberId;
        } else if (this._trustedPhone !== undefined) {
            id = this._trustedPhone.id;
        } else {
            id = 1;
            this._log(
                LogLevel.Warning,
                '[auth] No trusted phone number in auth options (security-key account?) — trying SMS fallback with phone id=1',
            );
        }

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
        // Apple returns a refreshed scnt / session id here. Without picking it up, the following
        // POST verify/phone/securitycode runs against a stale session and Apple answers -21669
        // ("incorrect verification code") even though the SMS code is correct.
        this.authStore.extractSessionHeaders(resp);
        const text = await resp.text();
        this._log(LogLevel.Debug, `[auth] SMS request → ${resp.status}: ${text.slice(0, 200)}`);
        if (!resp.ok) {
            throw new Error(`SMS request failed (${resp.status}): ${text.slice(0, 200)}`);
        }
        // Remember that next MFA code submission must go to the phone endpoint
        this._smsPhoneNumberId = id;
    }

    /**
     * True when Apple's MFA challenge for the current login requires a hardware security key
     * (the auth response carried an `fsaChallenge`). For such accounts SMS / trusted-device 2FA is
     * disabled by Apple, so {@link authenticateWithSecurityKey} is the only way forward.
     */
    get securityKeyRequested(): boolean {
        return this._securityKeyChallenge !== undefined;
    }

    /**
     * Probe whether this host can perform security-key login (Linux + libfido2 CLI tools present).
     * Cheap/synchronous — safe to call from the adapter to decide between offering the FIDO2 button
     * and showing a "not supported on this platform" hint.
     */
    get securityKeyCapability(): Fido2Capability {
        return detectFido2Support();
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
    async authenticateWithSecurityKey(options?: {
        timeoutMs?: number;
        pollIntervalMs?: number;
        perAttemptTimeoutMs?: number;
        onProgress?: (status: SecurityKeyProgress, detail?: string) => void;
    }): Promise<void> {
        const challenge = this._securityKeyChallenge;
        if (!challenge) {
            throw new Error('No security-key challenge available — not in a security-key MFA state.');
        }
        const cap = detectFido2Support();
        if (!cap.supported) {
            throw new Error(cap.reason ?? 'Security-key (FIDO2) login is not supported on this platform.');
        }
        if (!this.authStore.validateAuthSecrets()) {
            throw new Error('Cannot authenticate with a security key without calling authenticate first!');
        }

        const timeoutMs = options?.timeoutMs ?? 5 * 60_000;
        const pollIntervalMs = options?.pollIntervalMs ?? 5000;
        const perAttemptTimeoutMs = options?.perAttemptTimeoutMs ?? 25_000;
        const onProgress = options?.onProgress ?? ((): void => {});

        // Apple's fsaChallenge is single-use and short-lived, so it must NOT be reused from login
        // time. We re-fetch it fresh immediately before each signing round (inside the loop below) —
        // mirrors icloud3's _get_webauthn_options(). The `challenge` read above only proves we are in
        // a security-key MFA state; the bytes that get signed come from the refreshed challenge.
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            let devices: string[];
            try {
                devices = await listFido2Devices();
            } catch (e) {
                this._log(LogLevel.Warning, '[auth] Could not list FIDO2 devices:', String(e));
                devices = [];
            }

            if (devices.length === 0) {
                onProgress('waiting-for-key');
                await this.delay(Math.max(0, Math.min(pollIntervalMs, deadline - Date.now())));
                continue;
            }

            onProgress('key-detected', devices.join(', '));

            // Re-fetch a fresh challenge right before signing. A stale or already-spent fsaChallenge
            // (e.g. the one captured at login, or one consumed by a prior touch) is exactly what makes
            // Apple reject the assertion with serviceError -27962 "Failed to verify security key".
            const current = await this._refreshSecurityKeyChallenge();
            if (!current) {
                this._log(LogLevel.Warning, '[auth] No fresh security-key challenge from Apple — retrying');
                onProgress('no-match');
                await this.delay(Math.max(0, Math.min(pollIntervalMs, deadline - Date.now())));
                continue;
            }
            const challengeRaw = b64decode(current.challenge);
            // WebAuthn origin is the fixed string "https://apple.com", matching icloud3's reference
            // (DefaultClientDataCollector("https://apple.com")). The real -27962 cause was the
            // CBOR-wrapped authData, not the origin; we follow the working reference here.
            const clientDataJSON = buildClientDataJSON(challengeRaw, 'https://apple.com');
            const credentialIds = current.keyHandles.map(h => b64decode(h));

            for (const device of devices) {
                for (const credentialId of credentialIds) {
                    if (Date.now() >= deadline) {
                        break;
                    }
                    onProgress('signing', device);
                    let assertion;
                    try {
                        assertion = await getAssertion({
                            device,
                            rpId: current.rpId,
                            credentialId,
                            clientDataJSON,
                            userVerification: false,
                            timeoutMs: Math.min(perAttemptTimeoutMs, Math.max(1000, deadline - Date.now())),
                            log: msg => this._log(LogLevel.Debug, `[auth][fido2] ${msg}`),
                        });
                    } catch (e) {
                        // Touch timeout or transient error — keep trying within the window.
                        this._log(LogLevel.Debug, `[auth][fido2] attempt on ${device} failed: ${String(e)}`);
                        continue;
                    }
                    if (assertion) {
                        onProgress('verifying');
                        await this._submitSecurityKeyAssertion(current, assertion);
                        onProgress('success');
                        return;
                    }
                    // null → this device does not hold this credential; try the next combination.
                }
            }

            // Devices were present but none matched (or no touch yet) — pause briefly and retry.
            onProgress('no-match');
            await this.delay(Math.max(0, Math.min(pollIntervalMs, deadline - Date.now())));
        }

        onProgress('timeout');
        throw new Error('Security-key authentication timed out — no matching key was touched in time.');
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
    private async _refreshSecurityKeyChallenge(): Promise<SecurityKeyChallenge | undefined> {
        try {
            const resp = await this.fetch(AUTH_ENDPOINT.replace(/\/$/, ''), {
                headers: this.authStore.getMfaHeaders(),
            });
            const authOptions = JSON.parse(await resp.text()) as Record<string, unknown>;
            const fsa = authOptions?.fsaChallenge as Record<string, unknown> | undefined;
            const keyHandles = fsa?.keyHandles;
            if (
                fsa &&
                typeof fsa.challenge === 'string' &&
                typeof fsa.rpId === 'string' &&
                Array.isArray(keyHandles) &&
                keyHandles.every(k => typeof k === 'string')
            ) {
                this._securityKeyChallenge = {
                    challenge: fsa.challenge,
                    rpId: fsa.rpId,
                    keyHandles,
                };
                this._log(
                    LogLevel.Debug,
                    `[auth] Refreshed security-key challenge (rpId=${fsa.rpId}, ${keyHandles.length} keyHandle(s))`,
                );
                return this._securityKeyChallenge;
            }
            this._log(LogLevel.Warning, '[auth] GET /appleauth/auth returned no fsaChallenge on refresh');
        } catch (e) {
            this._log(LogLevel.Warning, '[auth] Failed to refresh security-key challenge:', String(e));
        }
        return undefined;
    }

    /**
     * POST a completed WebAuthn assertion to Apple and advance the auth state machine.
     * Mirrors the tail of provideMfaCode(): Authenticated → (trust) → Ready.
     *
     * @param challenge The security-key challenge whose `challenge`/`rpId` are echoed back to Apple.
     * @param assertion The WebAuthn assertion produced by the physical key.
     */
    private async _submitSecurityKeyAssertion(
        challenge: SecurityKeyChallenge,
        assertion: Fido2Assertion,
    ): Promise<void> {
        // Body shape + encoding mirror pyicloud confirm_security_key(): the echoed `challenge` keeps
        // Apple's original encoding; the signed outputs go out as standard base64.
        const body = {
            challenge: challenge.challenge,
            clientData: b64encode(assertion.clientDataJSON),
            signatureData: b64encode(assertion.signature),
            authenticatorData: b64encode(assertion.authenticatorData),
            userHandle: assertion.userHandle ? b64encode(assertion.userHandle) : null,
            credentialID: b64encode(assertion.credentialId),
            rpId: challenge.rpId,
        };
        this._log(LogLevel.Debug, '[auth] POST /verify/security/key — submitting assertion');
        const resp = await this.fetch(`${AUTH_ENDPOINT}verify/security/key`, {
            headers: this.authStore.getMfaHeaders(),
            method: 'POST',
            body: JSON.stringify(body),
        });
        const text = await resp.text();
        this._log(LogLevel.Debug, `[auth] verify/security/key → ${resp.status}: ${text.slice(0, 300)}`);
        if (resp.status !== 200 && resp.status !== 204) {
            throw new Error(`Security-key verification failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
        }

        this._securityKeyChallenge = undefined;
        this._smsPhoneNumberId = undefined;
        this._setState(iCloudServiceStatus.Authenticated);
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

        // Apple issues the code either through the trusted-device push or through the phone
        // (SMS / voice) channel, and each channel has its own verification endpoint. A code that is
        // submitted to the *other* endpoint is refused — typically with HTTP 409, even though the
        // code itself is valid. requestSmsMfaCode() records the phone channel, but when Apple falls
        // back to SMS on its own (no trusted device reachable) we only notice here. Therefore the
        // other channel is retried automatically before giving up.
        const primary: SecurityCodeChannel = this._smsPhoneNumberId !== undefined ? 'sms' : 'device';
        const fallback: SecurityCodeChannel = primary === 'sms' ? 'device' : 'sms';
        // BOTH endpoints are always tried. Apple issues *different* codes for the device push and
        // for the SMS/phone channel, and each endpoint only knows its own code: a code submitted to
        // the wrong endpoint is answered with -21669 ("incorrect verification code") — exactly like
        // a genuinely wrong code. Stopping on -21669 therefore made a perfectly valid code look
        // permanently wrong whenever the channel guess was off.
        const channels: SecurityCodeChannel[] = [primary, fallback];

        let last: { status: number; body: string } | undefined;
        let accepted = false;
        for (const channel of channels) {
            last = await this._submitSecurityCode(channel, code);
            // Device push answers 204, phone verification 200 with a JSON body.
            if (last.status === 204 || last.status === 200) {
                accepted = true;
                break;
            }
            // Apple also answers 409 ("conflict") when the code was accepted but the session state
            // doesn't match the endpoint; the body then carries no rejection error. Continuing into
            // the trust flow is safe — 2sv/trust and accountLogin decide whether the session is
            // really authenticated and push the service into Error state if it isn't.
            if (last.status === 409 && !this._isCodeRejection(last.body)) {
                this._log(
                    LogLevel.Warning,
                    '[auth] Code verification answered 409 without a rejection error — continuing with the trust flow',
                );
                accepted = true;
                break;
            }
            if (this._isCodeLockout(last.body)) {
                // -21670: too many failed attempts. Further requests only make it worse.
                this._log(LogLevel.Error, '[auth] Apple reports too many failed attempts (-21670) — giving up');
                break;
            }
            this._log(
                LogLevel.Debug,
                `[auth] ${channel} endpoint did not accept the code (HTTP ${last.status}) — trying the other channel`,
            );
        }

        if (!accepted) {
            // Keep _smsPhoneNumberId so a retry still targets the phone endpoint.
            throw new Error(this._describeCodeFailure(last));
        }

        this._smsPhoneNumberId = undefined; // reset after successful use
        this._setState(iCloudServiceStatus.Authenticated);
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
    private async _submitSecurityCode(
        channel: SecurityCodeChannel,
        code: string,
    ): Promise<{ status: number; body: string }> {
        let response: Response;
        if (channel === 'sms') {
            // pyiCloud: _validate_sms_code — trustedPhoneNumber payload incl. nonFTEU, phone's pushMode
            const id = this._smsPhoneNumberId ?? this._trustedPhone?.id ?? 1;
            const phonePayload: Record<string, unknown> = { id };
            if (this._trustedPhone?.nonFTEU !== undefined) {
                phonePayload.nonFTEU = this._trustedPhone.nonFTEU;
            }
            const mode = this._trustedPhone?.pushMode ?? 'sms';
            this._log(LogLevel.Debug, `[auth] POST /verify/phone/securitycode (phone id ${id}, mode ${mode})`);
            response = await this.fetch(`${AUTH_ENDPOINT}verify/phone/securitycode`, {
                headers: this.authStore.getMfaHeaders(),
                method: 'POST',
                body: JSON.stringify({ phoneNumber: phonePayload, securityCode: { code }, mode }),
            });
        } else {
            this._log(LogLevel.Debug, '[auth] POST /verify/trusteddevice/securitycode (device push)');
            response = await this.fetch(`${AUTH_ENDPOINT}verify/trusteddevice/securitycode`, {
                headers: this.authStore.getMfaHeaders(),
                method: 'POST',
                body: JSON.stringify({ securityCode: { code } }),
            });
        }
        // pyiCloud refreshes its session data from EVERY response: Apple hands out a fresh
        // session token / scnt here, which 2sv/trust and accountLogin need afterwards.
        this.authStore.extractSessionHeaders(response);
        const body = await response.text();
        this._log(LogLevel.Debug, `[auth] verify ${channel} securitycode → ${response.status}: ${body.slice(0, 300)}`);
        return { status: response.status, body };
    }

    /**
     * Parse Apple's `serviceErrors` / `service_errors` array out of a raw response body.
     * Returns an empty array when the body is not JSON or carries no errors.
     *
     * @param body - The raw response body of an auth request.
     */
    private _parseServiceErrors(body: string): { code?: unknown; message?: unknown }[] {
        try {
            const parsed = JSON.parse(body) as {
                serviceErrors?: { code?: unknown; message?: unknown }[];
                service_errors?: { code?: unknown; message?: unknown }[];
            };
            return [...(parsed?.serviceErrors ?? []), ...(parsed?.service_errors ?? [])];
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
    private _isCodeRejection(body: string): boolean {
        return this._parseServiceErrors(body).some(e => ['-21669', '-21670'].includes(String(e?.code)));
    }

    /**
     * True when Apple locked further code attempts after too many failures (-21670).
     *
     * @param body - The raw response body of a securitycode request.
     */
    private _isCodeLockout(body: string): boolean {
        return this._parseServiceErrors(body).some(e => String(e?.code) === '-21670');
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
    private _describeCodeFailure(last?: { status: number; body: string }): string {
        const errors = this._parseServiceErrors(last?.body ?? '');
        const codes = errors.map(e => String(e?.code));
        if (codes.includes('-21670')) {
            return 'Zu viele Fehlversuche — Apple hat die Code-Eingabe vorübergehend gesperrt (Apple-Fehler -21670). Bitte später erneut anmelden und einen neuen Code anfordern.';
        }
        if (codes.includes('-21669')) {
            return 'Apple hat den Bestätigungscode abgelehnt (Apple-Fehler -21669: falscher oder abgelaufener Code). Bitte einen neuen Code anfordern und ihn direkt nach dem Empfang eingeben.';
        }
        const appleMessage = errors.find(e => typeof e?.message === 'string')?.message as string | undefined;
        const detail = appleMessage ?? (last?.body ? last.body.slice(0, 200) : '');
        return `Code-Prüfung fehlgeschlagen (HTTP ${last?.status ?? 'unbekannt'})${detail ? `: ${detail}` : ''}`;
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
            await this.delay(PCS_SLEEP_MS);
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
                await this.delay(PCS_SLEEP_MS);
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
     * Validates the current session against Apple's /validate endpoint without triggering
     * a full re-authentication. Mirrors pyicloud's `_validate_token()`: sends a lightweight
     * POST /setup/ws/1/validate to check whether the existing session token is still accepted.
     * Updates accountInfo with the returned data when the session is valid.
     *
     * @returns true when Apple accepts the current session, false when it has expired or the call fails.
     */
    async validateSession(): Promise<boolean> {
        if (!this.authStore.sessionToken) {
            return false;
        }
        try {
            const resp = await this.fetch('https://setup.icloud.com/setup/ws/1/validate', {
                headers: this.authStore.getHeaders(),
                method: 'POST',
                body: 'null',
            });
            this.authStore.extractSessionHeaders(resp);
            if (resp.status === 200) {
                try {
                    this.accountInfo = (await resp.json()) as any;
                } catch {
                    /* ignore JSON parse failure */
                }
                if (this.options.username) {
                    this.authStore.saveSession(this.options.username);
                }
                this._log(LogLevel.Debug, '[keepalive] /validate → session still valid');
                return true;
            }
            this._log(LogLevel.Debug, `[keepalive] /validate → HTTP ${resp.status} — session expired`);
            return false;
        } catch (e) {
            this._log(LogLevel.Debug, '[keepalive] /validate → request failed:', String(e));
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
