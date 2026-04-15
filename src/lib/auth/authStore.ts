import fs from 'fs';
import path from 'path';
import { Cookie, CookieJar } from 'tough-cookie';
import type iCloudService from '..';
import { AUTH_HEADERS, DEFAULT_HEADERS } from '../consts';
import { LogLevel } from '../index';

/**
 * pyicloud HEADER_DATA mapping — these response headers are persisted to the session file
 * so subsequent requests can include them, avoiding Apple rate-limiting / 503 responses.
 */
const SESSION_HEADER_MAP: Record<string, keyof iCloudAuthenticationStore> = {
    'x-apple-id-account-country': 'accountCountry',
    'x-apple-id-session-id': 'sessionId',
    'x-apple-session-token': 'sessionToken',
    'x-apple-twosv-trust-token': 'trustToken',
    scnt: 'scnt',
};

export class iCloudAuthenticationStore {
    options: iCloudService['options'];
    _log: iCloudService['_log'];
    tknFile: string;

    /**
     * Shared CookieJar — populated automatically by fetch-cookie on every response.
     * Cookies from all domains (idmsa.apple.com, setup.icloud.com, …) are stored here
     * and sent back automatically to matching domains, exactly like pyicloud's
     * requests.Session() with its LWPCookieJar.
     */
    cookieJar: CookieJar;

    trustToken?: string;
    sessionId?: string;
    sessionToken?: string;
    scnt?: string;
    accountCountry?: string;
    /** Persisted client_id (reused across sessions, like pyicloud) */
    clientId?: string;

    constructor(service: iCloudService) {
        this.options = service.options;
        this._log = service._log;
        this.tknFile = path.format({ dir: this.options.dataDirectory, base: '.trust-token' });
        this.cookieJar = service.cookieJar;

        Object.defineProperty(this, 'trustToken', { enumerable: false });
        Object.defineProperty(this, 'sessionId', { enumerable: false });
        Object.defineProperty(this, 'sessionToken', { enumerable: false });
        Object.defineProperty(this, 'scnt', { enumerable: false });
        Object.defineProperty(this, 'cookieJar', { enumerable: false });
    }

    /**
     * Sanitise account name for use as a filename component (matches pyicloud behaviour).
     *
     * @param account
     */
    private _accountFilename(account: string): string {
        return account.replace(/\W/g, '');
    }

    private _sessionPath(account: string): string {
        return path.join(this.options.dataDirectory!, `${this._accountFilename(account)}.session`);
    }

    private _jarPath(account: string): string {
        return path.join(this.options.dataDirectory!, `${this._accountFilename(account)}.jar.json`);
    }

    // ── Session persistence (mirrors pyicloud's .session JSON file) ────────────

    /**
     * Load session data from disk.
     * Populates scnt, sessionId, sessionToken, accountCountry, trustToken, clientId.
     * Returns the raw JSON object so the caller can read client_id etc.
     *
     * @param account
     */
    loadSession(account: string): Record<string, string> {
        try {
            const data = JSON.parse(fs.readFileSync(this._sessionPath(account), 'utf8')) as Record<string, string>;
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
            this._log(LogLevel.Debug, '[authStore] Session loaded from disk');
            return data;
        } catch {
            this._log(LogLevel.Info, '[authStore] No session file found, starting fresh');
            return {};
        }
    }

    /**
     * Persist current session data to disk.
     *
     * @param account
     */
    saveSession(account: string): void {
        try {
            const data: Record<string, string> = {};
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
            if (!fs.existsSync(this.options.dataDirectory!)) {
                fs.mkdirSync(this.options.dataDirectory!);
            }
            fs.writeFileSync(this._sessionPath(account), JSON.stringify(data, null, 2), 'utf8');
            this._log(LogLevel.Debug, '[authStore] Session saved to disk');
        } catch (e) {
            this._log(LogLevel.Warning, '[authStore] Unable to save session:', (e as Error).toString());
        }
    }

    // ── CookieJar persistence ──────────────────────────────────────────────────

    /**
     * Load the persisted CookieJar from disk.
     * Automatically migrates legacy .cookies and .auth-cookies files on first run.
     *
     * @param account
     */
    loadCookieJar(account: string): void {
        const jarPath = this._jarPath(account);
        try {
            const raw = JSON.parse(fs.readFileSync(jarPath, 'utf8'));
            const loaded = CookieJar.deserializeSync(raw);
            for (const c of (loaded.toJSON() as any).cookies ?? []) {
                try {
                    this.cookieJar.setCookieSync(
                        `${c.key}=${c.value}; Domain=${c.domain}; Path=${c.path || '/'}`,
                        `https://${c.domain}`,
                    );
                } catch {
                    /* skip invalid */
                }
            }
            this._log(LogLevel.Debug, '[authStore] Cookie jar loaded from disk');
            return;
        } catch {
            this._log(LogLevel.Debug, '[authStore] No jar file — trying legacy migration');
        }

        // ── Migrate legacy .cookies / .auth-cookies files ─────────────────────
        const base = path.join(this.options.dataDirectory!, this._accountFilename(account));
        const tryMigrate = (filePath: string, domain: string): void => {
            try {
                const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as string[];
                for (const v of raw) {
                    const c = Cookie.parse(v);
                    if (!c) {
                        continue;
                    }
                    try {
                        this.cookieJar.setCookieSync(c.toString(), `https://${domain}`);
                    } catch {
                        /* skip */
                    }
                }
                this._log(LogLevel.Debug, `[authStore] Migrated legacy cookies from ${filePath}`);
            } catch {
                /* file doesn't exist */
            }
        };
        tryMigrate(`${base}.cookies`, 'setup.icloud.com');
        tryMigrate(`${base}.auth-cookies`, 'idmsa.apple.com');
    }

    /**
     * Persist the CookieJar to disk.
     *
     * @param account
     */
    saveCookieJar(account: string): void {
        try {
            if (!fs.existsSync(this.options.dataDirectory!)) {
                fs.mkdirSync(this.options.dataDirectory!);
            }
            fs.writeFileSync(this._jarPath(account), JSON.stringify(this.cookieJar.serializeSync(), null, 2), 'utf8');
            this._log(LogLevel.Debug, '[authStore] Cookie jar saved to disk');
        } catch (e) {
            this._log(LogLevel.Warning, '[authStore] Unable to save cookie jar:', (e as Error).toString());
        }
    }

    // ── Header extraction (mirrors pyicloud's per-request HEADER_DATA extraction) ──

    /**
     * Extract all session-related headers from a response and update in-memory state.
     * Safe to call on ANY response, including error responses — this is the key mechanism
     * that ensures session continuity across login attempts (fixing Apple 503 / rate-limit).
     *
     * @param response
     */
    extractSessionHeaders(response: Response): void {
        for (const [header, prop] of Object.entries(SESSION_HEADER_MAP)) {
            const value = response.headers.get(header);
            if (value) {
                (this as any)[prop] = value;
            }
        }
        // Special fallback: if X-Apple-ID-Session-Id is absent, use X-Apple-Session-Token
        if (!response.headers.get('x-apple-id-session-id')) {
            const fallback = response.headers.get('x-apple-session-token');
            if (fallback) {
                this.sessionId = fallback;
            }
        }
    }

    // ── Legacy trust-token helpers (kept for backward compatibility) ───────────

    loadTrustToken(account: string): void {
        try {
            this.trustToken = fs.readFileSync(
                `${this.tknFile}-${Buffer.from(account.toLowerCase()).toString('base64')}`,
                'utf8',
            );
        } catch {
            this._log(LogLevel.Debug, '[authStore] No legacy trust-token file found');
        }
    }

    writeTrustToken(account: string): void {
        try {
            if (!fs.existsSync(this.options.dataDirectory!)) {
                fs.mkdirSync(this.options.dataDirectory!);
            }
            fs.writeFileSync(
                `${this.tknFile}-${Buffer.from(account.toLowerCase()).toString('base64')}`,
                this.trustToken ?? '',
                'utf8',
            );
        } catch (e) {
            this._log(LogLevel.Warning, '[authStore] Unable to write trust token:', (e as Error).toString());
        }
    }

    // ── Response processors ────────────────────────────────────────────────────

    /**
     * Process a sign-in response: extract session headers.
     * Cookies are handled automatically by fetch-cookie (stored in cookieJar).
     *
     * @param authResponse
     * @param account
     */
    processAuthSecrets(authResponse: Response, account?: string): boolean {
        try {
            this.extractSessionHeaders(authResponse);
            if (account) {
                this.saveSession(account);
            }
            return this.validateAuthSecrets();
        } catch (e) {
            this._log(LogLevel.Warning, '[authStore] Unable to process auth secrets:', (e as Error).toString());
            return false;
        }
    }

    /**
     * Process a cloud-setup response: extract session headers.
     * Cookies are handled automatically by fetch-cookie (stored in cookieJar).
     *
     * @param cloudSetupResponse
     * @param account
     */
    processCloudSetupResponse(cloudSetupResponse: Response, account?: string): boolean {
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
     * @param account
     * @param trustResponse
     */
    processAccountTokens(account: string, trustResponse: Response): boolean {
        this.extractSessionHeaders(trustResponse);
        this.writeTrustToken(account);
        this.saveSession(account);
        return this.validateAccountTokens();
    }

    getMfaHeaders(): Record<string, string> {
        // aasp cookie is sent automatically by fetch-cookie (domain: idmsa.apple.com)
        return {
            ...AUTH_HEADERS,
            ...(this.scnt ? { scnt: this.scnt } : {}),
            ...(this.sessionId ? { 'X-Apple-ID-Session-Id': this.sessionId } : {}),
        };
    }

    getHeaders(): Record<string, string> {
        // iCloud session cookies are sent automatically by fetch-cookie
        return { ...DEFAULT_HEADERS };
    }

    validateAccountTokens(): boolean {
        return !!(this.sessionToken && this.trustToken);
    }

    validateAuthSecrets(): boolean {
        return !!(this.scnt && this.sessionId);
    }
}
