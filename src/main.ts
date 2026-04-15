/*
 * Created with @iobroker/create-adapter v3.1.2
 */

import * as utils from '@iobroker/adapter-core';
import iCloudService, { LogLevel } from './lib/index';
import type { iCloudFindMyDeviceInfo } from './lib/services/findMy';

/** Best-effort human-readable names for Apple FindMy feature flags (not officially documented). */
const FINDMY_FEATURE_NAMES: Record<string, string> = {
    BTR: 'Battery Reporting',
    LLC: 'Low-power Location Capability',
    CLK: 'Clock / Precision Finding',
    TEU: 'Trusted Execution Unit',
    SND: 'Play Sound',
    ALS: 'Always-on Location Service',
    CLT: 'Cellular Tracking',
    PRM: 'Premium Features',
    SVP: 'Saved Position',
    SPN: 'Sound while Paired Nearby',
    XRM: 'Extended Remote Management',
    NWLB: 'Network-based Location Bypass',
    NWF: 'Network Find (Crowd-sourced)',
    CWP: 'Crowd-sourced Wireless Positioning',
    MSG: 'Send Message',
    LOC: 'Location',
    LME: 'Lost Mode Enable',
    LMG: 'Lost Mode GPS',
    LYU: 'Location via U1 / Precision Find',
    LKL: 'Lock (Local)',
    LST: 'Lost Mode',
    LKM: 'Lock (Managed)',
    WMG: 'Wipe Managed',
    SCA: 'Secure Communication Accessory',
    PSS: 'Passcode Set',
    EAL: 'Enable Activation Lock',
    LAE: 'Lock after Erase',
    PIN: 'PIN / Passcode reset',
    LCK: 'Lock Device',
    REL: 'Remote Erase Lock',
    REM: 'Remote Actions',
    MCS: 'Managed Client Status',
    REP: 'Repair State',
    KEY: 'Precision Finding / Keys',
    KPD: 'Keypad',
    WIP: 'Wipe Device',
};

/** State definitions for a FindMy device — each entry maps a state id suffix to its common metadata. */
const FINDMY_DEVICE_STATES: Array<{
    id: string;
    name: string;
    type: ioBroker.CommonType;
    role: string;
}> = [
    { id: 'name', name: 'Device Name', type: 'string', role: 'text' },
    { id: 'deviceClass', name: 'Device Class', type: 'string', role: 'text' },
    { id: 'deviceDisplayName', name: 'Display Name', type: 'string', role: 'text' },
    { id: 'modelDisplayName', name: 'Model', type: 'string', role: 'text' },
    { id: 'rawDeviceModel', name: 'Raw Model', type: 'string', role: 'text' },
    { id: 'deviceStatus', name: 'Device Status', type: 'string', role: 'text' },
    { id: 'batteryLevel', name: 'Battery Level', type: 'number', role: 'value.battery' },
    { id: 'batteryStatus', name: 'Battery Status', type: 'string', role: 'text' },
    { id: 'isLocating', name: 'Is Locating', type: 'boolean', role: 'indicator' },
    { id: 'locationEnabled', name: 'Location Enabled', type: 'boolean', role: 'indicator' },
    { id: 'lostModeEnabled', name: 'Lost Mode Enabled', type: 'boolean', role: 'indicator' },
    { id: 'lowPowerMode', name: 'Low Power Mode', type: 'boolean', role: 'indicator' },
    { id: 'fmlyShare', name: 'Family Share', type: 'boolean', role: 'indicator' },
    { id: 'isConsideredAccessory', name: 'Is Accessory', type: 'boolean', role: 'indicator' },
    { id: 'deviceWithYou', name: 'Device With You', type: 'boolean', role: 'indicator' },
    { id: 'latitude', name: 'Latitude', type: 'number', role: 'value.gps.latitude' },
    { id: 'longitude', name: 'Longitude', type: 'number', role: 'value.gps.longitude' },
    { id: 'altitude', name: 'Altitude', type: 'number', role: 'value.gps.elevation' },
    { id: 'horizontalAccuracy', name: 'Horizontal Accuracy', type: 'number', role: 'value' },
    { id: 'positionType', name: 'Position Type', type: 'string', role: 'text' },
    { id: 'locationTimestamp', name: 'Location Timestamp', type: 'number', role: 'value.time' },
    { id: 'isOld', name: 'Location is Old', type: 'boolean', role: 'indicator' },
    { id: 'isInaccurate', name: 'Location is Inaccurate', type: 'boolean', role: 'indicator' },
    { id: 'distanceKm', name: 'Distance from Home', type: 'number', role: 'value.distance' },
];

/**
 * Haversine distance in km between two WGS84 coordinate pairs.
 *
 * @param lat1
 * @param lon1
 * @param lat2
 * @param lon2
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class Icloud extends utils.Adapter {
    private icloud: iCloudService | null = null;
    private findMyRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private findMyCleanupDone = false;
    /** Maps Apple device API id → 6-digit zero-padded folder id (e.g. '000001') */
    private findMyIdMap: Map<string, string> = new Map();

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'icloud',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private async createObjects(): Promise<void> {
        // info channel is already created via instanceObjects in io-package.json

        // account channel
        await this.extendObject('account', {
            type: 'channel',
            common: { name: 'Account Information' },
            native: {},
        });
        await this.extendObject('account.fullName', {
            type: 'state',
            common: { name: 'Full Name', type: 'string', role: 'text', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObject('account.firstName', {
            type: 'state',
            common: { name: 'First Name', type: 'string', role: 'text', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObject('account.lastName', {
            type: 'state',
            common: { name: 'Last Name', type: 'string', role: 'text', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObject('account.appleId', {
            type: 'state',
            common: { name: 'Apple ID', type: 'string', role: 'text', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObject('account.countryCode', {
            type: 'state',
            common: { name: 'Country Code', type: 'string', role: 'text', read: true, write: false, def: '' },
            native: {},
        });

        // mfa channel
        await this.extendObject('mfa', {
            type: 'channel',
            common: { name: 'Multi-Factor Authentication' },
            native: {},
        });
        await this.extendObject('mfa.code', {
            type: 'state',
            common: {
                name: 'MFA Code (enter 6-digit code here)',
                type: 'string',
                role: 'text',
                read: true,
                write: true,
                def: '',
            },
            native: {},
        });
        await this.extendObject('mfa.required', {
            type: 'state',
            common: {
                name: 'MFA Required',
                type: 'boolean',
                role: 'indicator',
                read: true,
                write: false,
                def: false,
            },
            native: {},
        });
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        this.log.debug('onReady called');
        await this.setState('info.connection', false, true);

        const username = this.config.username?.trim();
        const password = this.config.password;

        if (!username) {
            this.log.error('Configuration error: username (Apple ID) is empty');
            return;
        }
        if (!password) {
            this.log.error('Configuration error: password is empty');
            return;
        }
        if (!username.includes('@')) {
            this.log.warn(`Username "${username}" does not look like a valid Apple ID (expected an email address)`);
        }

        this.log.debug(`Config OK — username: ${username}, password: ${'*'.repeat(password.length)}`);

        await this.createObjects();
        this.log.debug('Objects created/verified');

        this.subscribeStates('mfa.code');
        this.subscribeStates('findme.*.ping');
        this.log.debug('Subscribed to mfa.code');

        await this.connectToiCloud();
    }

    private async connectToiCloud(): Promise<void> {
        const dataDirectory = utils.getAbsoluteInstanceDataDir(this);
        this.log.debug(`Using data directory: ${dataDirectory}`);

        this.icloud = new iCloudService({
            username: this.config.username.trim(),
            password: this.config.password,
            saveCredentials: false,
            trustDevice: true,
            dataDirectory,
            authMethod: 'srp',
            logger: (level, ...args) => {
                const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
                if (level === LogLevel.Debug) {
                    this.log.debug(`[icloud.js] ${msg}`);
                } else if (level === LogLevel.Info) {
                    this.log.info(`[icloud.js] ${msg}`);
                } else if (level === LogLevel.Warning) {
                    this.log.warn(`[icloud.js] ${msg}`);
                } else if (level === LogLevel.Error) {
                    this.log.error(`[icloud.js] ${msg}`);
                }
            },
        });

        this.icloud.on('Started', () => {
            this.log.debug('iCloud auth started — credentials submitted, waiting for response');
        });

        this.icloud.on('MfaRequested', () => {
            this.log.info('MFA required — enter the 6-digit Apple code into state mfa.code');
            this.log.debug(`iCloud status is now: ${this.icloud?.status ?? 'unknown'}`);
            void this.setState('mfa.required', true, true);
            void this.setState('info.connection', false, true);
        });

        this.icloud.on('Authenticated', () => {
            this.log.debug('MFA accepted — waiting for trust token and iCloud cookies');
        });

        this.icloud.on('Trusted', () => {
            this.log.debug('Device trusted — fetching iCloud account data');
        });

        this.icloud.on('Ready', () => {
            this.log.debug(`iCloud status is now: ${this.icloud?.status ?? 'unknown'}`);
            this.onICloudReady().catch((err: unknown) => {
                this.log.error(`Error during post-login data fetch: ${(err as Error)?.message ?? String(err)}`);
            });
        });

        this.icloud.on('Error', (err: unknown) => {
            const msg = (err as Error)?.message ?? String(err);
            this.log.error(`iCloud authentication error: ${msg}`);
            this.log.debug(`iCloud error details: ${err instanceof Error ? err.stack : JSON.stringify(err)}`);
            void this.setState('info.connection', false, true);
        });

        // Suppress unhandled rejection from awaitReady — errors are handled via the 'Error' event above
        this.icloud.awaitReady.catch(() => {
            /* handled via Error event */
        });

        this.log.debug('Calling icloud.authenticate()');
        try {
            await this.icloud.authenticate();
            this.log.debug(`authenticate() returned — status: ${this.icloud.status}`);
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            if (msg.startsWith('RATE_LIMITED')) {
                const retryMinutes = 61; // Apple seems to use a 1-hour rate limit, but we add a buffer to be safe
                const retryTime = new Date(new Date().getTime() + retryMinutes * 60 * 1000);
                this.log.warn(
                    `Apple Rate-Limit erkannt — nächster Versuch in ${retryTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} `,
                );
                this.setTimeout(
                    () => {
                        this.log.info('Rate-Limit Wartezeit abgelaufen — starte erneuten Login-Versuch');
                        this.connectToiCloud().catch(() => {
                            /* Error-Event wird ausgelöst */
                        });
                    },
                    retryMinutes * 60 * 1000,
                );
            } else {
                this.log.error(`Failed to start iCloud authentication: ${msg}`);
                this.log.debug(`authenticate() exception stack: ${err instanceof Error ? err.stack : String(err)}`);
            }
            // Do not let the adapter crash — nodemon restarts would hammer Apple's servers
        }
    }

    /**
     * Called after the iCloud session reaches Ready state.
     * All post-login data fetching happens here — info.connection is set true only
     * after account info, available services and FindMy devices have been collected.
     */
    private async onICloudReady(): Promise<void> {
        const info = this.icloud!.accountInfo;
        if (!info?.dsInfo) {
            this.log.warn('iCloud Ready but accountInfo/dsInfo is unavailable');
            await this.setState('info.connection', true, true);
            await this.setState('mfa.required', false, true);
            return;
        }

        // ── Account info ──────────────────────────────────────────────────────
        const ds = info.dsInfo;
        this.log.info(`Logged in as: ${ds.fullName ?? '(no name)'} (${ds.appleId ?? '(no appleId)'})`);
        this.log.info(`Country: ${ds.countryCode ?? '?'}, Locale: ${ds.locale ?? '?'}`);
        this.log.debug(`Full dsInfo: ${JSON.stringify(ds)}`);

        const setChecked = (id: string, val: string | undefined): void => {
            if (val == null) {
                this.log.warn(`Skipping state "${id}" — value is ${val}`);
                return;
            }
            void this.setState(id, val, true);
        };
        setChecked('account.fullName', ds.fullName);
        setChecked('account.firstName', ds.firstName);
        setChecked('account.lastName', ds.lastName);
        setChecked('account.appleId', ds.appleId);
        setChecked('account.countryCode', ds.countryCode);

        // ── Available webservices ─────────────────────────────────────────────
        const webservices = info.webservices as unknown as Record<string, { status: string; url: string }> | undefined;
        const activeServices = webservices
            ? Object.entries(webservices)
                  .filter(([, v]) => v?.status === 'active')
                  .map(([k]) => k)
                  .sort()
            : [];
        if (webservices) {
            const inactive = Object.entries(webservices)
                .filter(([, v]) => v?.status !== 'active')
                .map(([k, v]) => `${k}(${v?.status ?? '?'})`)
                .sort();
            this.log.info(`Available iCloud services (${activeServices.length}): ${activeServices.join(', ')}`);
            if (inactive.length) {
                this.log.debug(`Inactive iCloud services: ${inactive.join(', ')}`);
            }
        }

        // ── Family members ────────────────────────────────────────────────────
        const family = info.iCloudInfo?.familyMembers ?? [];
        if (family.length) {
            this.log.info(
                `Family members (${family.length}): ${family.map(m => m.fullName ?? m.appleId ?? '?').join(', ')}`,
            );
        }

        // ── Home coordinates (from config or system.config) ───────────────────
        const locationPoints = await this.resolveLocationPoints();

        // ── FindMy devices ────────────────────────────────────────────────────
        if (activeServices.includes('findme') && this.config.findMyEnabled) {
            await this.loadFindMyIdMap();
            await this.refreshFindMyDevices(locationPoints);
            this.scheduleFindMyRefresh(locationPoints);
        }

        // ── Done: mark connection as established ──────────────────────────────
        this.log.info('iCloud connection established successfully');
        await this.setState('info.connection', true, true);
        await this.setState('mfa.required', false, true);
    }

    /**
     * Resolve location points from config.
     * Falls back to system.config coordinates as a single 'home' point if none configured.
     *
     * @returns array of resolved location points
     */
    private async resolveLocationPoints(): Promise<Array<{ index: string; lat: number; lon: number; name: string }>> {
        const pts = (this.config.locationPoints ?? []).filter(
            p => p.index?.trim() && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude)),
        );
        if (pts.length > 0) {
            return pts.map(p => ({
                index: p.index.trim(),
                lat: Number(p.latitude),
                lon: Number(p.longitude),
                name: p.name?.trim() || p.index.trim(),
            }));
        }
        // fallback: system.config
        try {
            const sysCfg = await this.getForeignObjectAsync('system.config');
            const common = sysCfg?.common;
            const lat = Number(common?.latitude);
            const lon = Number(common?.longitude);
            if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
                this.log.debug(`Location points: using system.config fallback (${lat}, ${lon})`);
                return [{ index: 'iobroker', lat, lon, name: 'ioBroker' }];
            }
        } catch {
            /* ignore */
        }
        this.log.debug('No location points configured');
        return [];
    }

    /**
     * Fetch FindMy devices and write states.
     *
     * @param locationPoints - configured location points for distance calculation
     */
    private async refreshFindMyDevices(
        locationPoints: Array<{ index: string; lat: number; lon: number; name: string }>,
    ): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const findMe = this.icloud.getService('findme');
            await findMe.refresh();
            const devices = findMe.devices;

            const regularDevices: iCloudFindMyDeviceInfo[] = [];
            const accessories: iCloudFindMyDeviceInfo[] = [];
            const familyDevices: iCloudFindMyDeviceInfo[] = [];
            for (const [, dev] of devices) {
                const d = dev.deviceInfo;
                this.log.debug(JSON.stringify(d));
                if (d.isConsideredAccessory) {
                    accessories.push(d);
                } else if (d.fmlyShare) {
                    familyDevices.push(d);
                } else {
                    regularDevices.push(d);
                }
            }

            // ── Write states ─────────────────────────────────────────────────
            const allDevices = [...regularDevices, ...accessories, ...familyDevices];
            if (!this.findMyCleanupDone) {
                await this.cleanupFindMyObjects(allDevices);
                this.findMyCleanupDone = true;
            }
            await this.extendObject('findme', {
                type: 'folder',
                common: { name: 'FindMy' },
                native: {},
            });
            for (const d of allDevices) {
                const apiId = d.id ?? '';
                if (!apiId) {
                    this.log.warn(`FindMy: skipping device with empty id (name: ${d.name ?? '?'})`);
                    continue;
                }
                const numericId = this.getOrAssignFindMyNumericId(apiId);
                const safeId = `findme.${numericId}`;
                await this.extendObject(safeId, {
                    type: 'device',
                    common: { name: d.name ?? d.deviceDisplayName ?? apiId },
                    native: { id: apiId, baUUID: d.baUUID },
                });
                for (const def of FINDMY_DEVICE_STATES) {
                    await this.extendObject(`${safeId}.${def.id}`, {
                        type: 'state',
                        common: {
                            name: def.name,
                            type: def.type,
                            role: def.role,
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                }
                // ping (play sound) command — only for SND-capable devices
                if (d.features?.SND) {
                    await this.extendObject(`${safeId}.ping`, {
                        type: 'state',
                        common: {
                            name: 'Play Sound (Ping)',
                            type: 'boolean',
                            role: 'button',
                            read: false,
                            write: true,
                        },
                        native: {},
                    });
                }
                // features channel
                await this.extendObject(`${safeId}.features`, {
                    type: 'channel',
                    common: { name: 'Features' },
                    native: {},
                });
                if (d.features) {
                    for (const [feat, val] of Object.entries(d.features)) {
                        await this.extendObject(`${safeId}.features.${feat}`, {
                            type: 'state',
                            common: {
                                name: FINDMY_FEATURE_NAMES[feat] ?? feat,
                                type: 'boolean',
                                role: 'indicator',
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        await this.setState(`${safeId}.features.${feat}`, val, true);
                    }
                }
                // Write values
                const loc = d.location;
                const distKm =
                    loc && locationPoints.length > 0
                        ? haversineKm(locationPoints[0].lat, locationPoints[0].lon, loc.latitude, loc.longitude)
                        : null;
                const vals: Record<string, ioBroker.StateValue> = {
                    name: d.name ?? '',
                    deviceClass: d.deviceClass,
                    deviceDisplayName: d.deviceDisplayName,
                    modelDisplayName: d.modelDisplayName,
                    rawDeviceModel: d.rawDeviceModel,
                    deviceStatus: d.deviceStatus,
                    batteryLevel: Math.round(d.batteryLevel * 100),
                    batteryStatus: d.batteryStatus,
                    isLocating: d.isLocating,
                    locationEnabled: d.locationEnabled,
                    lostModeEnabled: d.lostModeEnabled,
                    lowPowerMode: d.lowPowerMode,
                    fmlyShare: d.fmlyShare,
                    isConsideredAccessory: d.isConsideredAccessory,
                    deviceWithYou: d.deviceWithYou,
                    latitude: loc?.latitude ?? null,
                    longitude: loc?.longitude ?? null,
                    altitude: loc?.altitude ?? null,
                    horizontalAccuracy: loc?.horizontalAccuracy ?? null,
                    positionType: loc?.positionType ?? null,
                    locationTimestamp: loc?.timeStamp ?? null,
                    isOld: loc?.isOld ?? null,
                    isInaccurate: loc?.isInaccurate ?? null,
                    distanceKm: distKm !== null ? Math.round(distKm * 1000) / 1000 : null,
                };
                for (const [key, val] of Object.entries(vals)) {
                    if (val !== null) {
                        await this.setState(`${safeId}.${key}`, val, true);
                    }
                }
                // distances channel
                if (loc && locationPoints.length > 0) {
                    await this.extendObject(`${safeId}.distances`, {
                        type: 'channel',
                        common: { name: 'Distances' },
                        native: {},
                    });
                    for (const pt of locationPoints) {
                        const distM = Math.round(haversineKm(pt.lat, pt.lon, loc.latitude, loc.longitude) * 1000);
                        await this.extendObject(`${safeId}.distances.${pt.index}`, {
                            type: 'state',
                            common: {
                                name: pt.name,
                                type: 'number',
                                role: 'value.distance',
                                unit: 'm',
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        await this.setState(`${safeId}.distances.${pt.index}`, distM, true);
                    }
                }
            }
        } catch (err) {
            this.log.warn(`FindMy refresh failed: ${(err as Error)?.message ?? String(err)}`);
        }
    }

    /**
     * Schedule a self-rescheduling FindMy refresh every 15 minutes.
     * Uses setTimeout (not setInterval) so the next run only starts after the
     * current one completes — no overlapping requests.
     */
    /**
     * Load the map of Apple device API id → numeric folder id from existing objects.
     */
    private async loadFindMyIdMap(): Promise<void> {
        const existing = await this.getObjectViewAsync('system', 'device', {
            startkey: `${this.namespace}.findme.`,
            endkey: `${this.namespace}.findme.\u9999`,
        });
        for (const row of existing.rows) {
            const apiId = row.value?.native?.id as string | undefined;
            const numericPart = row.id.replace(`${this.namespace}.findme.`, '');
            if (apiId && /^\d{6}$/.test(numericPart)) {
                this.findMyIdMap.set(apiId, numericPart);
            }
        }
        this.log.debug(`FindMy ID map loaded: ${this.findMyIdMap.size} known device(s)`);
    }

    private getOrAssignFindMyNumericId(apiId: string): string {
        if (this.findMyIdMap.has(apiId)) {
            return this.findMyIdMap.get(apiId)!;
        }
        let max = 0;
        for (const v of this.findMyIdMap.values()) {
            const n = parseInt(v, 10);
            if (n > max) {
                max = n;
            }
        }
        const next = String(max + 1).padStart(6, '0');
        this.findMyIdMap.set(apiId, next);
        return next;
    }

    /**
     * Remove findme device objects (and their children) that are no longer returned by the API.
     *
     * @param currentDevices - list of currently active devices
     */
    private async cleanupFindMyObjects(currentDevices: iCloudFindMyDeviceInfo[]): Promise<void> {
        const currentIds = new Set(
            currentDevices
                .map(d => {
                    const apiId = d.id ?? '';
                    if (!apiId) {
                        return '';
                    }
                    const numericId = this.findMyIdMap.get(apiId);
                    return numericId ? `${this.namespace}.findme.${numericId}` : '';
                })
                .filter(Boolean),
        );
        const existing = await this.getObjectViewAsync('system', 'device', {
            startkey: `${this.namespace}.findme.`,
            endkey: `${this.namespace}.findme.\u9999`,
        });
        for (const row of existing.rows) {
            if (!currentIds.has(row.id)) {
                this.log.info(`FindMy cleanup: removing stale device ${row.id}`);
                await this.delObjectAsync(row.id, { recursive: true });
            }
        }
    }

    private scheduleFindMyRefresh(
        locationPoints: Array<{ index: string; lat: number; lon: number; name: string }>,
    ): void {
        if (this.findMyRefreshTimer) {
            this.clearTimeout(this.findMyRefreshTimer);
            this.findMyRefreshTimer = null;
        }
        let intervalMin = Math.floor(this.config.findMyInterval ?? 15);
        if (!Number.isFinite(intervalMin) || intervalMin < 1) {
            this.log.warn(
                `FindMy interval is ${this.config.findMyInterval} — value below 1 minute, falling back to 5 minutes`,
            );
            intervalMin = 5;
        } else if (intervalMin > 120) {
            this.log.warn(`FindMy interval is ${intervalMin} minutes — clamping to 120 minutes`);
            intervalMin = 120;
        }
        const INTERVAL_MS = intervalMin * 60 * 1000;
        const schedule = (): void => {
            this.findMyRefreshTimer = this.setTimeout(async () => {
                this.findMyRefreshTimer = null;
                if (!this.icloud) {
                    return;
                }
                this.log.debug('FindMy scheduled refresh starting...');
                await this.refreshFindMyDevices(locationPoints);
                schedule(); // reschedule only after completion
            }, INTERVAL_MS);
        };
        schedule();
        this.log.debug('FindMy refresh scheduled every 15 min');
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback - Callback function
     */
    private onUnload(callback: () => void): void {
        try {
            if (this.findMyRefreshTimer) {
                this.clearTimeout(this.findMyRefreshTimer);
                this.findMyRefreshTimer = null;
            }
            if (this.icloud) {
                this.icloud.removeAllListeners();
                this.icloud = null;
            }
            callback();
        } catch {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     *
     * @param id - State ID
     * @param state - State object
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (!state) {
            this.log.debug(`State deleted: ${id}`);
            return;
        }
        if (state.ack) {
            this.log.debug(`State update (ack=true, ignoring): ${id} = ${state.val}`);
            return;
        }

        this.log.debug(`Command received: ${id} = "${state.val}"`);

        if (id === `${this.namespace}.mfa.code`) {
            const raw = String(state.val ?? '').trim();
            this.log.debug(`MFA code value received: "${raw}" (length: ${raw.length})`);

            if (raw.length === 0) {
                this.log.debug('Empty MFA code — ignoring');
                return;
            }
            if (!/^\d{6}$/.test(raw)) {
                this.log.warn(`Invalid MFA code: "${raw}" — must be exactly 6 digits, got ${raw.length} characters`);
                return;
            }
            if (!this.icloud) {
                this.log.warn('MFA code received but iCloud service is not initialized');
                return;
            }
            const status = this.icloud.status;
            if (status !== 'MfaRequested') {
                this.log.warn(
                    `MFA code received but iCloud status is "${status}" (expected "MfaRequested") — submitting anyway`,
                );
            }
            this.log.info(`Submitting MFA code (iCloud status: ${status})`);
            this.icloud.provideMfaCode(raw).catch((err: unknown) => {
                this.log.error(`Failed to submit MFA code: ${(err as Error)?.message ?? String(err)}`);
            });
            return;
        }

        // findme.XXXXXX.ping
        const pingMatch = id.match(/^[^.]+\.[^.]+\.findme\.(\d{6})\.ping$/);
        if (pingMatch) {
            if (!this.icloud) {
                this.log.warn('Ping command received but iCloud service is not initialized');
                return;
            }
            const numericId = pingMatch[1];
            // resolve Apple API id from map
            let apiId: string | undefined;
            for (const [k, v] of this.findMyIdMap.entries()) {
                if (v === numericId) {
                    apiId = k;
                    break;
                }
            }
            if (!apiId) {
                this.log.warn(`Ping: could not find Apple device id for folder ${numericId}`);
                return;
            }
            this.log.info(`Ping: sending play-sound to device ${numericId} (${apiId})`);
            this.icloud
                .getService('findme')
                .playSound(apiId)
                .then(() => {
                    this.log.info(`Ping: play-sound sent to ${numericId}`);
                })
                .catch((err: unknown) => {
                    this.log.error(`Ping failed for ${numericId}: ${(err as Error)?.message ?? String(err)}`);
                });
        }
    }

    /**
     * Is called if a message is sent to this instance.
     *
     * @param obj - Message object
     */
    private onMessage(obj: ioBroker.Message): void {
        if (typeof obj !== 'object' || !obj.message) {
            return;
        }
        this.log.debug(`Message received: command="${obj.command}", message="${JSON.stringify(obj.message)}"`);

        if (obj.command === 'submitMfa') {
            const code = String(obj.message).trim();
            if (code.length === 6 && this.icloud) {
                this.icloud
                    .provideMfaCode(code)
                    .then(() => {
                        if (obj.callback) {
                            this.sendTo(obj.from, obj.command, { success: true }, obj.callback);
                        }
                    })
                    .catch((err: unknown) => {
                        if (obj.callback) {
                            this.sendTo(
                                obj.from,
                                obj.command,
                                { success: false, error: (err as Error)?.message },
                                obj.callback,
                            );
                        }
                    });
            } else {
                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, { success: false, error: 'Invalid code' }, obj.callback);
                }
            }
        }
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Icloud(options);
} else {
    // otherwise start the instance directly
    (() => new Icloud())();
}
