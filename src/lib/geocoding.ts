/**
 * Unified reverse-geocoding module with LRU cache and rate limiting.
 *
 * Providers: Traccar Geocoder, Nominatim (OpenStreetMap), OpenCage Data.
 * All external providers share the same URL + API-key configuration.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeocodingProvider = 'traccar' | 'nominatim' | 'opencage';
export type GeocodingCacheSize = 'small' | 'medium' | 'large';

interface NominatimAddress {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
}

export interface GeocodingResult {
    address: string;
    country_code: string;
}

type LogFn = (level: 'debug' | 'info' | 'warn' | 'error', msg: string) => void;

// ── Constants ─────────────────────────────────────────────────────────────────

/** Approximate factor to quantise coordinates to a 3 m grid. 1° lat ≈ 111 111 m → 3 m ≈ 1/37 037° */
const GRID_FACTOR = 37_037;

const CACHE_LIMITS: Record<GeocodingCacheSize, number> = {
    small: 250_000,
    medium: 750_000,
    large: 1_500_000,
};

const REQUEST_INTERVAL_MS = 1000; // min 1 s between external requests

// ── LRU Cache ─────────────────────────────────────────────────────────────────

class LruCache<V> {
    private readonly map = new Map<string, V>();
    private readonly maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    get(key: string): V | undefined {
        const v = this.map.get(key);
        if (v !== undefined) {
            // Move to end (most recently used)
            this.map.delete(key);
            this.map.set(key, v);
        }
        return v;
    }

    set(key: string, value: V): void {
        if (this.map.has(key)) {
            this.map.delete(key);
        } else if (this.map.size >= this.maxSize) {
            // Evict oldest (first entry)
            const oldest = this.map.keys().next().value as string;
            this.map.delete(oldest);
        }
        this.map.set(key, value);
    }

    get size(): number {
        return this.map.size;
    }

    clear(): void {
        this.map.clear();
    }
}

// ── Geocoder ──────────────────────────────────────────────────────────────────

export class ExternalGeocoder {
    private readonly provider: GeocodingProvider;
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly cache: LruCache<GeocodingResult>;
    private readonly log: LogFn;

    /** ISO country code of the ioBroker system location (lower-case). */
    systemCountryCode = '';
    /** BCP 47 language tag for localized address names (e.g. 'de', 'en'). Empty = server default. */
    language = '';

    // Rate-limit state
    private lastRequestTs = 0;

    // Per-cycle stats — reset by takeStats()
    private statCacheHits = 0;
    private statRequests = 0;
    private statFails = 0;

    /** True until the first successful geocode — used for the one-time success log. */
    private firstSuccess = true;

    constructor(
        provider: GeocodingProvider,
        baseUrl: string,
        apiKey: string,
        cacheSize: GeocodingCacheSize,
        log: LogFn,
    ) {
        this.provider = provider;
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.apiKey = apiKey;
        this.cache = new LruCache(CACHE_LIMITS[cacheSize] ?? CACHE_LIMITS.small);
        this.log = log;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Resolve coordinates to a formatted address string.
     * Returns `null` when the lookup could not be performed (rate-limited, error, etc.).
     *
     * @param lat - Latitude in degrees
     * @param lon - Longitude in degrees
     */
    async resolve(lat: number, lon: number): Promise<string | null> {
        // Cache lookup — no delay, always instant
        const key = ExternalGeocoder.gridKey(lat, lon);
        const cached = this.cache.get(key);
        if (cached) {
            this.statCacheHits++;
            return this.formatAddress(cached);
        }

        // Rate-limit enforcement — may delay, or abort if daily limit reached
        if (!(await this.enforceRateLimit())) {
            return null;
        }

        // Fetch from provider
        this.statRequests++;
        const result = await this.fetchFromProvider(lat, lon);
        if (!result) {
            this.statFails++;
            return null;
        }

        // Cache & format
        this.cache.set(key, result);

        const formatted = this.formatAddress(result);

        if (this.firstSuccess) {
            this.firstSuccess = false;
            this.log(
                'info',
                `Geocoder (${this.provider}): first successful reverse geocode — "${formatted}" ` +
                    `(cache: ${this.cache.size} entries)`,
            );
        }

        return formatted;
    }

    /**
     * Return per-cycle statistics and reset all counters to zero.
     * Call once at the end of each FindMy refresh cycle.
     */
    takeStats(): { cacheHits: number; requests: number; fails: number; cacheSize: number } {
        const stats = {
            cacheHits: this.statCacheHits,
            requests: this.statRequests,
            fails: this.statFails,
            cacheSize: this.cache.size,
        };
        this.statCacheHits = 0;
        this.statRequests = 0;
        this.statFails = 0;
        return stats;
    }

    /**
     * Resolve the system country code by reverse-geocoding the given coordinates.
     *
     * @param lat - System latitude
     * @param lon - System longitude
     */
    async resolveSystemCountry(lat: number, lon: number): Promise<string> {
        const result = await this.fetchFromProvider(lat, lon);
        return result?.country_code?.toLowerCase() ?? '';
    }

    /**
     * Validate the configuration and log helpful messages.
     * Returns `true` if the configuration is usable.
     */
    validate(): boolean {
        if (!this.baseUrl) {
            this.log(
                'warn',
                `Geocoder (${this.provider}): no server URL configured. ` +
                    'Please enter the URL in the adapter settings (Geocoding tab).',
            );
            return false;
        }

        try {
            new URL(this.baseUrl);
        } catch {
            this.log(
                'error',
                `Geocoder (${this.provider}): invalid URL "${this.baseUrl}". ` +
                    'Please use a full URL including scheme, e.g. http://192.168.1.100:3000',
            );
            return false;
        }

        if (this.provider === 'opencage' && !this.apiKey) {
            this.log(
                'warn',
                'Geocoder (opencage): OpenCage Data requires an API key. ' +
                    'Please enter the key in the adapter settings.',
            );
            return false;
        }

        if (!this.apiKey && this.provider !== 'nominatim') {
            this.log(
                'info',
                `Geocoder (${this.provider}): no API key configured — requests will be sent without authentication.`,
            );
        }

        this.log('info', `Geocoder (${this.provider}): configuration valid, server URL: ${this.baseUrl}`);
        return true;
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private static gridKey(lat: number, lon: number): string {
        return `${Math.round(lat * GRID_FACTOR)}_${Math.round(lon * GRID_FACTOR)}`;
    }

    private formatAddress(result: GeocodingResult): string {
        const addr = result.address;
        if (!addr || addr === 'unknown') {
            return 'unknown';
        }
        return addr;
    }

    /**
     * Enforce the per-second rate limit before making an external request.
     * Sleeps for the remaining time within the current second if needed.
     */
    private async enforceRateLimit(): Promise<boolean> {
        // Per-second throttle — wait out the remaining time instead of dropping the request
        const elapsed = Date.now() - this.lastRequestTs;
        if (elapsed < REQUEST_INTERVAL_MS) {
            const waitMs = REQUEST_INTERVAL_MS - elapsed;
            this.log('debug', `Geocoder (${this.provider}): rate throttle — waiting ${waitMs} ms before next request`);
            await new Promise<void>(resolve => setTimeout(resolve, waitMs));
        }

        return true;
    }

    private async fetchFromProvider(lat: number, lon: number): Promise<GeocodingResult | null> {
        this.lastRequestTs = Date.now();

        switch (this.provider) {
            case 'traccar':
                return this.fetchTraccar(lat, lon);
            case 'nominatim':
                return this.fetchNominatim(lat, lon);
            case 'opencage':
                return this.fetchOpencage(lat, lon);
            default:
                return null;
        }
    }

    // ── Traccar ───────────────────────────────────────────────────────────────

    private async fetchTraccar(lat: number, lon: number): Promise<GeocodingResult | null> {
        let url: URL;
        try {
            url = new URL('/reverse', this.baseUrl);
        } catch {
            this.log(
                'error',
                `Geocoder (traccar): cannot build request URL from base "${this.baseUrl}". Check the server URL.`,
            );
            return null;
        }
        url.searchParams.set('lat', String(lat));
        url.searchParams.set('lon', String(lon));
        if (this.apiKey) {
            url.searchParams.set('key', this.apiKey);
        }

        const data = await this.httpGet<{ address?: NominatimAddress }>(url.toString(), lat, lon);
        if (!data?.address) {
            this.log(
                'debug',
                `Geocoder (traccar): no address in response for (${lat}, ${lon}). ` +
                    "The position may be outside the server's map data coverage.",
            );
            return null;
        }
        return this.parseNominatimAddress(data.address);
    }

    // ── Nominatim ─────────────────────────────────────────────────────────────

    private async fetchNominatim(lat: number, lon: number): Promise<GeocodingResult | null> {
        let url: URL;
        try {
            url = new URL('/reverse', this.baseUrl);
        } catch {
            this.log(
                'error',
                `Geocoder (nominatim): cannot build request URL from base "${this.baseUrl}". Check the server URL.`,
            );
            return null;
        }
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('lat', String(lat));
        url.searchParams.set('lon', String(lon));
        if (this.apiKey) {
            url.searchParams.set('key', this.apiKey);
        }

        const data = await this.httpGet<{ address?: NominatimAddress }>(url.toString(), lat, lon);
        if (!data?.address) {
            this.log(
                'debug',
                `Geocoder (nominatim): no address in response for (${lat}, ${lon}). ` +
                    'The position may not be covered by the Nominatim instance.',
            );
            return null;
        }
        return this.parseNominatimAddress(data.address);
    }

    // ── OpenCage ──────────────────────────────────────────────────────────────

    private async fetchOpencage(lat: number, lon: number): Promise<GeocodingResult | null> {
        let url: URL;
        try {
            url = new URL('/geocode/v1/json', this.baseUrl);
        } catch {
            this.log(
                'error',
                `Geocoder (opencage): cannot build request URL from base "${this.baseUrl}". Check the server URL.`,
            );
            return null;
        }
        url.searchParams.set('q', `${lat}+${lon}`);
        if (this.apiKey) {
            url.searchParams.set('key', this.apiKey);
        }
        url.searchParams.set('no_annotations', '1');
        url.searchParams.set('limit', '1');
        if (this.language) {
            url.searchParams.set('language', this.language);
        }

        const data = await this.httpGet<{
            results?: Array<{
                components?: {
                    house_number?: string;
                    road?: string;
                    city?: string;
                    town?: string;
                    village?: string;
                    state?: string;
                    postcode?: string;
                    country?: string;
                    country_code?: string;
                };
            }>;
            status?: { code?: number; message?: string };
        }>(url.toString(), lat, lon);

        if (!data) {
            return null;
        }
        if (data.status && data.status.code && data.status.code !== 200) {
            this.log(
                'warn',
                `Geocoder (opencage): API error ${data.status.code}: ${data.status.message ?? 'unknown'} for (${lat}, ${lon})`,
            );
            return null;
        }
        const comp = data.results?.[0]?.components;
        if (!comp) {
            this.log('debug', `Geocoder (opencage): no result for (${lat}, ${lon}). The position may not be covered.`);
            return null;
        }

        return this.parseNominatimAddress(comp);
    }

    // ── Shared parsers ────────────────────────────────────────────────────────

    /**
     * Parse a Nominatim-style address object into "Straße Hausnummer, Ort (Land)".
     *
     * @param addr - Address fields from the API response
     */
    private parseNominatimAddress(addr: NominatimAddress): GeocodingResult {
        const cc = addr.country_code?.toLowerCase() ?? '';
        const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
        const city = addr.city || addr.town || addr.village || '';
        const parts = [street, city].filter(Boolean);

        let address: string;
        if (!parts.length) {
            address = 'unknown';
        } else {
            address = parts.join(', ');
            if (cc && cc !== this.systemCountryCode && addr.country) {
                address += ` (${addr.country})`;
            }
        }

        return { address, country_code: cc };
    }

    // ── HTTP helper ───────────────────────────────────────────────────────────

    private async httpGet<T>(url: string, lat: number, lon: number): Promise<T | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'ioBroker.icloud',
                    Accept: 'application/json',
                    ...(this.language ? { 'Accept-Language': this.language } : {}),
                },
            });
            if (res.status === 401 || res.status === 403) {
                this.log(
                    'warn',
                    `Geocoder (${this.provider}): authentication failed (HTTP ${res.status}) for (${lat}, ${lon}). ` +
                        'Check your API key in the adapter settings.',
                );
                return null;
            }
            if (res.status === 429) {
                this.log(
                    'warn',
                    `Geocoder (${this.provider}): rate limit exceeded (HTTP 429) for (${lat}, ${lon}). ` +
                        'The service is rejecting requests — consider increasing the FindMy refresh interval.',
                );
                return null;
            }
            if (!res.ok) {
                this.log(
                    'warn',
                    `Geocoder (${this.provider}): HTTP ${res.status} for (${lat}, ${lon}). ` +
                        'Check that the server is running and the URL is correct.',
                );
                return null;
            }
            return (await res.json()) as T;
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            if (msg.includes('aborted') || msg.includes('abort')) {
                this.log(
                    'warn',
                    `Geocoder (${this.provider}): request timed out after 10 s for (${lat}, ${lon}). ` +
                        'The server may be unreachable or overloaded.',
                );
            } else if (msg.includes('ECONNREFUSED')) {
                this.log(
                    'warn',
                    `Geocoder (${this.provider}): connection refused at "${this.baseUrl}". ` +
                        'Make sure the server is running and the URL/port are correct.',
                );
            } else if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
                this.log(
                    'warn',
                    `Geocoder (${this.provider}): hostname not found for "${this.baseUrl}". ` +
                        'Check the server URL — the hostname cannot be resolved.',
                );
            } else {
                this.log('warn', `Geocoder (${this.provider}): request failed — ${msg}`);
            }
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }
}
