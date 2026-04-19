"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var geocoding_exports = {};
__export(geocoding_exports, {
  ExternalGeocoder: () => ExternalGeocoder
});
module.exports = __toCommonJS(geocoding_exports);
const GRID_FACTOR = 37037;
const CACHE_LIMITS = {
  small: 25e4,
  medium: 75e4,
  large: 15e5
};
const REQUEST_INTERVAL_MS = 1e3;
class LruCache {
  map = /* @__PURE__ */ new Map();
  maxSize;
  constructor(maxSize) {
    this.maxSize = maxSize;
  }
  get(key) {
    const v = this.map.get(key);
    if (v !== void 0) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
  get size() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
}
class ExternalGeocoder {
  provider;
  baseUrl;
  apiKey;
  cache;
  log;
  /** ISO country code of the ioBroker system location (lower-case). */
  systemCountryCode = "";
  /** BCP 47 language tag for localized address names (e.g. 'de', 'en'). Empty = server default. */
  language = "";
  // Rate-limit state
  lastRequestTs = 0;
  // Per-cycle stats — reset by takeStats()
  statCacheHits = 0;
  statRequests = 0;
  statFails = 0;
  /** True until the first successful geocode — used for the one-time success log. */
  firstSuccess = true;
  constructor(provider, baseUrl, apiKey, cacheSize, log) {
    var _a;
    this.provider = provider;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.cache = new LruCache((_a = CACHE_LIMITS[cacheSize]) != null ? _a : CACHE_LIMITS.small);
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
  async resolve(lat, lon) {
    const key = ExternalGeocoder.gridKey(lat, lon);
    const cached = this.cache.get(key);
    if (cached) {
      this.statCacheHits++;
      return this.formatAddress(cached);
    }
    if (!await this.enforceRateLimit()) {
      return null;
    }
    this.statRequests++;
    const result = await this.fetchFromProvider(lat, lon);
    if (!result) {
      this.statFails++;
      return null;
    }
    this.cache.set(key, result);
    const formatted = this.formatAddress(result);
    if (this.firstSuccess) {
      this.firstSuccess = false;
      this.log(
        "info",
        `Geocoder (${this.provider}): first successful reverse geocode \u2014 "${formatted}" (cache: ${this.cache.size} entries)`
      );
    }
    return formatted;
  }
  /**
   * Return per-cycle statistics and reset all counters to zero.
   * Call once at the end of each FindMy refresh cycle.
   */
  takeStats() {
    const stats = {
      cacheHits: this.statCacheHits,
      requests: this.statRequests,
      fails: this.statFails,
      cacheSize: this.cache.size
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
  async resolveSystemCountry(lat, lon) {
    var _a, _b;
    const result = await this.fetchFromProvider(lat, lon);
    return (_b = (_a = result == null ? void 0 : result.country_code) == null ? void 0 : _a.toLowerCase()) != null ? _b : "";
  }
  /**
   * Validate the configuration and log helpful messages.
   * Returns `true` if the configuration is usable.
   */
  validate() {
    if (!this.baseUrl) {
      this.log(
        "warn",
        `Geocoder (${this.provider}): no server URL configured. Please enter the URL in the adapter settings (Geocoding tab).`
      );
      return false;
    }
    try {
      new URL(this.baseUrl);
    } catch {
      this.log(
        "error",
        `Geocoder (${this.provider}): invalid URL "${this.baseUrl}". Please use a full URL including scheme, e.g. http://192.168.1.100:3000`
      );
      return false;
    }
    if (this.provider === "opencage" && !this.apiKey) {
      this.log(
        "warn",
        "Geocoder (opencage): OpenCage Data requires an API key. Please enter the key in the adapter settings."
      );
      return false;
    }
    if (!this.apiKey && this.provider !== "nominatim") {
      this.log(
        "info",
        `Geocoder (${this.provider}): no API key configured \u2014 requests will be sent without authentication.`
      );
    }
    this.log("info", `Geocoder (${this.provider}): configuration valid, server URL: ${this.baseUrl}`);
    return true;
  }
  // ── Internals ─────────────────────────────────────────────────────────────
  static gridKey(lat, lon) {
    return `${Math.round(lat * GRID_FACTOR)}_${Math.round(lon * GRID_FACTOR)}`;
  }
  formatAddress(result) {
    const addr = result.address;
    if (!addr || addr === "unknown") {
      return "unknown";
    }
    return addr;
  }
  /**
   * Enforce the per-second rate limit before making an external request.
   * Sleeps for the remaining time within the current second if needed.
   */
  async enforceRateLimit() {
    const elapsed = Date.now() - this.lastRequestTs;
    if (elapsed < REQUEST_INTERVAL_MS) {
      const waitMs = REQUEST_INTERVAL_MS - elapsed;
      this.log("debug", `Geocoder (${this.provider}): rate throttle \u2014 waiting ${waitMs} ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    return true;
  }
  async fetchFromProvider(lat, lon) {
    this.lastRequestTs = Date.now();
    switch (this.provider) {
      case "traccar":
        return this.fetchTraccar(lat, lon);
      case "nominatim":
        return this.fetchNominatim(lat, lon);
      case "opencage":
        return this.fetchOpencage(lat, lon);
      default:
        return null;
    }
  }
  // ── Traccar ───────────────────────────────────────────────────────────────
  async fetchTraccar(lat, lon) {
    let url;
    try {
      url = new URL("/reverse", this.baseUrl);
    } catch {
      this.log(
        "error",
        `Geocoder (traccar): cannot build request URL from base "${this.baseUrl}". Check the server URL.`
      );
      return null;
    }
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    if (this.apiKey) {
      url.searchParams.set("key", this.apiKey);
    }
    const data = await this.httpGet(url.toString(), lat, lon);
    if (!(data == null ? void 0 : data.address)) {
      this.log(
        "debug",
        `Geocoder (traccar): no address in response for (${lat}, ${lon}). The position may be outside the server's map data coverage.`
      );
      return null;
    }
    return this.parseNominatimAddress(data.address);
  }
  // ── Nominatim ─────────────────────────────────────────────────────────────
  async fetchNominatim(lat, lon) {
    let url;
    try {
      url = new URL("/reverse", this.baseUrl);
    } catch {
      this.log(
        "error",
        `Geocoder (nominatim): cannot build request URL from base "${this.baseUrl}". Check the server URL.`
      );
      return null;
    }
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    if (this.apiKey) {
      url.searchParams.set("key", this.apiKey);
    }
    const data = await this.httpGet(url.toString(), lat, lon);
    if (!(data == null ? void 0 : data.address)) {
      this.log(
        "debug",
        `Geocoder (nominatim): no address in response for (${lat}, ${lon}). The position may not be covered by the Nominatim instance.`
      );
      return null;
    }
    return this.parseNominatimAddress(data.address);
  }
  // ── OpenCage ──────────────────────────────────────────────────────────────
  async fetchOpencage(lat, lon) {
    var _a, _b, _c;
    let url;
    try {
      url = new URL("/geocode/v1/json", this.baseUrl);
    } catch {
      this.log(
        "error",
        `Geocoder (opencage): cannot build request URL from base "${this.baseUrl}". Check the server URL.`
      );
      return null;
    }
    url.searchParams.set("q", `${lat}+${lon}`);
    if (this.apiKey) {
      url.searchParams.set("key", this.apiKey);
    }
    url.searchParams.set("no_annotations", "1");
    url.searchParams.set("limit", "1");
    if (this.language) {
      url.searchParams.set("language", this.language);
    }
    const data = await this.httpGet(url.toString(), lat, lon);
    if (!data) {
      return null;
    }
    if (data.status && data.status.code && data.status.code !== 200) {
      this.log(
        "warn",
        `Geocoder (opencage): API error ${data.status.code}: ${(_a = data.status.message) != null ? _a : "unknown"} for (${lat}, ${lon})`
      );
      return null;
    }
    const comp = (_c = (_b = data.results) == null ? void 0 : _b[0]) == null ? void 0 : _c.components;
    if (!comp) {
      this.log("debug", `Geocoder (opencage): no result for (${lat}, ${lon}). The position may not be covered.`);
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
  parseNominatimAddress(addr) {
    var _a, _b;
    const cc = (_b = (_a = addr.country_code) == null ? void 0 : _a.toLowerCase()) != null ? _b : "";
    const street = [addr.road, addr.house_number].filter(Boolean).join(" ");
    const city = addr.city || addr.town || addr.village || "";
    const parts = [street, city].filter(Boolean);
    let address;
    if (!parts.length) {
      address = "unknown";
    } else {
      address = parts.join(", ");
      if (cc && cc !== this.systemCountryCode && addr.country) {
        address += ` (${addr.country})`;
      }
    }
    return { address, country_code: cc };
  }
  // ── HTTP helper ───────────────────────────────────────────────────────────
  async httpGet(url, lat, lon) {
    var _a;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1e4);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ioBroker.icloud",
          Accept: "application/json",
          ...this.language ? { "Accept-Language": this.language } : {}
        }
      });
      if (res.status === 401 || res.status === 403) {
        this.log(
          "warn",
          `Geocoder (${this.provider}): authentication failed (HTTP ${res.status}) for (${lat}, ${lon}). Check your API key in the adapter settings.`
        );
        return null;
      }
      if (res.status === 429) {
        this.log(
          "warn",
          `Geocoder (${this.provider}): rate limit exceeded (HTTP 429) for (${lat}, ${lon}). The service is rejecting requests \u2014 consider increasing the FindMy refresh interval.`
        );
        return null;
      }
      if (!res.ok) {
        this.log(
          "warn",
          `Geocoder (${this.provider}): HTTP ${res.status} for (${lat}, ${lon}). Check that the server is running and the URL is correct.`
        );
        return null;
      }
      return await res.json();
    } catch (err) {
      const msg = (_a = err == null ? void 0 : err.message) != null ? _a : String(err);
      if (msg.includes("aborted") || msg.includes("abort")) {
        this.log(
          "warn",
          `Geocoder (${this.provider}): request timed out after 10 s for (${lat}, ${lon}). The server may be unreachable or overloaded.`
        );
      } else if (msg.includes("ECONNREFUSED")) {
        this.log(
          "warn",
          `Geocoder (${this.provider}): connection refused at "${this.baseUrl}". Make sure the server is running and the URL/port are correct.`
        );
      } else if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
        this.log(
          "warn",
          `Geocoder (${this.provider}): hostname not found for "${this.baseUrl}". Check the server URL \u2014 the hostname cannot be resolved.`
        );
      } else {
        this.log("warn", `Geocoder (${this.provider}): request failed \u2014 ${msg}`);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExternalGeocoder
});
//# sourceMappingURL=geocoding.js.map
