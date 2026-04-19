/*
 * Created with @iobroker/create-adapter v3.1.2
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as utils from '@iobroker/adapter-core';
import iCloudService, { iCloudServiceStatus, LogLevel } from './lib/index';
import type { iCloudFindMyDeviceInfo } from './lib/services/findMy';
import type { iCloudRemindersService, Reminder, RemindersSyncMap } from './lib/services/reminders';
import type { iCloudDriveService, iCloudDriveNode, iCloudDriveItem } from './lib/services/drive';
import type { iCloudContactsService, Contact, ContactsSyncMap } from './lib/services/contacts';
import type { iCloudNotesService, NotesSyncMap } from './lib/services/notes';
import type { iCloudPhotosService, PhotoAssetInfo } from './lib/services/photos';
import type { AlarmMeasurement, UpdateEventOptions } from './lib/services/calendar';
import { GeoLookup } from './lib/geo';
import { ExternalGeocoder } from './lib/geocoding';
import type { GeocodingProvider, GeocodingCacheSize } from './lib/geocoding';

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
    unit?: string;
}> = [
    { id: 'name', name: 'Device Name', type: 'string', role: 'text' },
    { id: 'deviceClass', name: 'Device Class', type: 'string', role: 'text' },
    { id: 'deviceDisplayName', name: 'Display Name', type: 'string', role: 'text' },
    { id: 'modelDisplayName', name: 'Model', type: 'string', role: 'text' },
    { id: 'rawDeviceModel', name: 'Raw Model', type: 'string', role: 'text' },
    { id: 'deviceStatus', name: 'Device Status', type: 'string', role: 'text' },
    { id: 'batteryLevel', name: 'Battery Level', type: 'number', role: 'value.battery', unit: '%' },
    { id: 'batteryCharging', name: 'Battery Charging', type: 'boolean', role: 'indicator' },
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
    { id: 'ownerAppleId', name: 'Owner Apple ID', type: 'string', role: 'text' },
    { id: 'ownerName', name: 'Owner Name', type: 'string', role: 'text' },
];

/** State definitions for a Calendar event slot. */
const CALENDAR_EVENT_STATES: Array<{
    id: string;
    name: string;
    type: ioBroker.CommonType;
    role: string;
    unit?: string;
}> = [
    { id: 'title', name: 'Title', type: 'string', role: 'text' },
    { id: 'guid', name: 'GUID', type: 'string', role: 'text' },
    { id: 'etag', name: 'ETag', type: 'string', role: 'text' },
    { id: 'pGuid', name: 'Calendar GUID', type: 'string', role: 'text' },
    { id: 'startDate', name: 'Start Date', type: 'number', role: 'value.time' },
    { id: 'endDate', name: 'End Date', type: 'number', role: 'value.time' },
    { id: 'masterStartDate', name: 'Master Start Date', type: 'number', role: 'value.time' },
    { id: 'masterEndDate', name: 'Master End Date', type: 'number', role: 'value.time' },
    { id: 'createdDate', name: 'Created Date', type: 'number', role: 'value.time' },
    { id: 'lastModifiedDate', name: 'Last Modified Date', type: 'number', role: 'value.time' },
    { id: 'allDay', name: 'All Day', type: 'boolean', role: 'indicator' },
    { id: 'duration', name: 'Duration', type: 'number', role: 'value.interval', unit: 'min' },
    { id: 'url', name: 'URL', type: 'string', role: 'url' },
    { id: 'tz', name: 'Timezone', type: 'string', role: 'text' },
    { id: 'tzname', name: 'Timezone Name', type: 'string', role: 'text' },
    { id: 'startDateTZOffset', name: 'TZ Offset', type: 'string', role: 'text' },
    { id: 'icon', name: 'Icon', type: 'number', role: 'value' },
    { id: 'readOnly', name: 'Read Only', type: 'boolean', role: 'indicator' },
    { id: 'transparent', name: 'Transparent', type: 'boolean', role: 'indicator' },
    { id: 'hasAttachments', name: 'Has Attachments', type: 'boolean', role: 'indicator' },
    { id: 'recurrenceException', name: 'Recurrence Exception', type: 'boolean', role: 'indicator' },
    { id: 'recurrenceMaster', name: 'Recurrence Master', type: 'boolean', role: 'indicator' },
    { id: 'birthdayIsYearlessBday', name: 'Birthday (Yearless)', type: 'boolean', role: 'indicator' },
    { id: 'birthdayShowAsCompany', name: 'Birthday Show As Company', type: 'boolean', role: 'indicator' },
    { id: 'extendedDetailsAreIncluded', name: 'Extended Details Included', type: 'boolean', role: 'indicator' },
    { id: 'shouldShowJunkUIWhenAppropriate', name: 'Junk UI Flag', type: 'boolean', role: 'indicator' },
    { id: 'alarms', name: 'Alarms (JSON)', type: 'string', role: 'json' },
];

/** State definitions for a Calendar collection (calendar folder). */
const CALENDAR_COLLECTION_STATES: Array<{
    id: string;
    name: string;
    type: ioBroker.CommonType;
    role: string;
}> = [
    { id: 'guid', name: 'GUID', type: 'string', role: 'text' },
    { id: 'ctag', name: 'CTag', type: 'string', role: 'text' },
    { id: 'etag', name: 'ETag', type: 'string', role: 'text' },
    { id: 'color', name: 'Color', type: 'string', role: 'text' },
    { id: 'symbolicColor', name: 'Symbolic Color', type: 'string', role: 'text' },
    { id: 'order', name: 'Order', type: 'number', role: 'value' },
    { id: 'enabled', name: 'Enabled', type: 'boolean', role: 'indicator' },
    { id: 'visible', name: 'Visible', type: 'boolean', role: 'indicator' },
    { id: 'readOnly', name: 'Read Only', type: 'boolean', role: 'indicator' },
    { id: 'isDefault', name: 'Default Calendar', type: 'boolean', role: 'indicator' },
    { id: 'isFamily', name: 'Family Calendar', type: 'boolean', role: 'indicator' },
    { id: 'isPublished', name: 'Published', type: 'boolean', role: 'indicator' },
    { id: 'isPrivatelyShared', name: 'Privately Shared', type: 'boolean', role: 'indicator' },
    { id: 'extendedDetailsAreIncluded', name: 'Extended Details Included', type: 'boolean', role: 'indicator' },
    { id: 'shouldShowJunkUIWhenAppropriate', name: 'Junk UI Flag', type: 'boolean', role: 'indicator' },
    { id: 'shareTitle', name: 'Share Title', type: 'string', role: 'text' },
    { id: 'prePublishedUrl', name: 'Pre-Published URL', type: 'string', role: 'url' },
    { id: 'supportedType', name: 'Supported Type', type: 'string', role: 'text' },
    { id: 'objectType', name: 'Object Type', type: 'string', role: 'text' },
    { id: 'createdDate', name: 'Created Date', type: 'number', role: 'value.time' },
    { id: 'lastModifiedDate', name: 'Last Modified Date', type: 'number', role: 'value.time' },
];

/** State definitions for a Reminder item slot (CloudKit). */
const REMINDER_ITEM_STATES: Array<{
    id: string;
    name: string;
    type: ioBroker.CommonType;
    role: string;
    write?: boolean;
}> = [
    { id: 'title', name: 'Title', type: 'string', role: 'text' },
    { id: 'description', name: 'Description', type: 'string', role: 'text' },
    { id: 'id', name: 'Reminder ID', type: 'string', role: 'text' },
    { id: 'listId', name: 'List ID', type: 'string', role: 'text' },
    { id: 'priority', name: 'Priority', type: 'number', role: 'value' },
    { id: 'flagged', name: 'Flagged', type: 'boolean', role: 'indicator' },
    { id: 'allDay', name: 'All Day', type: 'boolean', role: 'indicator' },
    { id: 'completed', name: 'Completed', type: 'boolean', role: 'switch', write: true },
    { id: 'dueDate', name: 'Due Date', type: 'number', role: 'value.time' },
    { id: 'startDate', name: 'Start Date', type: 'number', role: 'value.time' },
    { id: 'completedDate', name: 'Completed Date', type: 'number', role: 'value.time' },
    { id: 'createdDate', name: 'Created Date', type: 'number', role: 'value.time' },
    { id: 'lastModifiedDate', name: 'Last Modified Date', type: 'number', role: 'value.time' },
];

/** State definitions for a Reminder collection (list, CloudKit). */
const REMINDER_COLLECTION_STATES: Array<{
    id: string;
    name: string;
    type: ioBroker.CommonType;
    role: string;
}> = [
    { id: 'id', name: 'List ID', type: 'string', role: 'text' },
    { id: 'color', name: 'Color', type: 'string', role: 'text' },
    { id: 'count', name: 'Reminder Count', type: 'number', role: 'value' },
];

/** State definitions for the iCloud Drive root metadata. */
const DRIVE_ROOT_STATES: Array<{
    id: string;
    name: string;
    type: ioBroker.CommonType;
    role: string;
}> = [
    { id: 'name', name: 'Root Folder Name', type: 'string', role: 'text' },
    { id: 'docwsid', name: 'Document WS ID', type: 'string', role: 'text' },
    { id: 'drivewsid', name: 'Drive WS ID', type: 'string', role: 'text' },
    { id: 'fileCount', name: 'File Count', type: 'number', role: 'value' },
    { id: 'directChildrenCount', name: 'Direct Children Count', type: 'number', role: 'value' },
    { id: 'dateCreated', name: 'Date Created', type: 'number', role: 'value.time' },
    { id: 'etag', name: 'ETag', type: 'string', role: 'text' },
    { id: 'lastRefresh', name: 'Last Refresh', type: 'number', role: 'value.time' },
];

/** State definitions for a Contact item slot. */
const CONTACT_ITEM_STATES: Array<{
    id: string;
    name: string;
    type: ioBroker.CommonType;
    role: string;
}> = [
    { id: 'contactId', name: 'Contact ID', type: 'string', role: 'text' },
    { id: 'fullName', name: 'Full Name', type: 'string', role: 'text' },
    { id: 'firstName', name: 'First Name', type: 'string', role: 'text' },
    { id: 'lastName', name: 'Last Name', type: 'string', role: 'text' },
    { id: 'companyName', name: 'Company', type: 'string', role: 'text' },
    { id: 'nickname', name: 'Nickname', type: 'string', role: 'text' },
    { id: 'birthday', name: 'Birthday', type: 'string', role: 'text' },
    { id: 'jobTitle', name: 'Job Title', type: 'string', role: 'text' },
    { id: 'department', name: 'Department', type: 'string', role: 'text' },
    { id: 'city', name: 'City', type: 'string', role: 'text' },
    { id: 'phones', name: 'Phones (JSON)', type: 'string', role: 'json' },
    { id: 'emails', name: 'Emails (JSON)', type: 'string', role: 'json' },
    { id: 'streetAddresses', name: 'Addresses (JSON)', type: 'string', role: 'json' },
    { id: 'notes', name: 'Notes', type: 'string', role: 'text' },
    { id: 'groups', name: 'Groups (JSON)', type: 'string', role: 'json' },
    { id: 'isMe', name: 'Is Me', type: 'boolean', role: 'indicator' },
];

/**
 * Haversine distance in km between two WGS84 coordinate pairs.
 *
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
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

// ── Drive Sync types ─────────────────────────────────────────────────────────

interface DriveSyncEntry {
    id: string;
    enabled: boolean;
    type: 'backitup' | 'directory';
    localPath: string;
    icloudFolder: string;
    maxSizeMB: number;
    maxFiles: number;
    conflictResolution: 'ask' | 'overwrite-remote' | 'skip' | 'keep-both';
}

interface DriveSyncConflict {
    entryId: string;
    fileName: string;
    localModified: number;
    remoteModified: number;
    localSize: number;
    remoteSize: number;
}

interface DriveSyncMeta {
    entries: Array<{
        id: string;
        lastSync: number;
        lastError: string;
        filesSynced: number;
        totalSizeMB: number;
        /** Files known from last successful sync — used to detect deletions in directory mode. */
        lastKnownFiles?: string[];
    }>;
    conflicts: DriveSyncConflict[];
}

class Icloud extends utils.Adapter {
    private icloud: iCloudService | null = null;
    private findMyRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private findMyCleanupDone = false;
    /** Serialized snapshot of last-seen findMyDisabledDevices — used to detect config changes at runtime */
    private findMyLastDisabledKey = '';
    /** Maps Apple device API id → 6-digit zero-padded folder id (e.g. '000001') */
    private findMyIdMap: Map<string, string> = new Map();
    private calendarRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private remindersRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private remindersSyncMapLoaded = false;
    private contactsRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private contactsSyncMapLoaded = false;
    private notesRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private notesSyncMapLoaded = false;
    private photosRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private photosFirstLoad = true;
    private driveRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private accountStorageRefreshTimer: ioBroker.Timeout | null | undefined = null;
    private findMyFirstLoad = true;
    private calendarFirstLoad = true;
    private driveFirstLoad = true;
    private driveSyncTimer: ioBroker.Timeout | null | undefined = null;
    private driveSyncConflicts: DriveSyncConflict[] = [];
    private accountStorageFirstLoad = true;
    private geoLookup: GeoLookup = new GeoLookup();
    private externalGeocoder: ExternalGeocoder | null = null;
    /** In-memory cache of last written state values — used to skip unchanged writes after adapter start. */
    private stateCache: Map<string, ioBroker.StateValue> = new Map();

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

    /**
     * Writes a state only if its value has changed compared to the in-memory cache.
     * On first adapter start the cache is empty, so every state is written once unconditionally.
     *
     * @param id - State ID (without namespace prefix)
     * @param val - New value
     */
    private async setStateIfChanged(id: string, val: ioBroker.StateValue): Promise<void> {
        if (this.stateCache.has(id) && this.stateCache.get(id) === val) {
            return;
        }
        this.stateCache.set(id, val);
        await this.setState(id, val, true);
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
        await this.extendObject('mfa.requestSmsCode', {
            type: 'state',
            common: {
                name: 'Request MFA code via SMS (set to true)',
                type: 'boolean',
                role: 'button',
                read: true,
                write: true,
                def: false,
            },
            native: {},
        });

        // account.storage channel + states
        await this.extendObject('account.storage', {
            type: 'channel',
            common: { name: 'Storage' },
            native: {},
        });
        const STORAGE_STATES: Array<{
            id: string;
            name: string;
            type: ioBroker.CommonType;
            role: string;
            unit?: string;
        }> = [
            { id: 'usedMB', name: 'Used Storage', type: 'number', role: 'value', unit: 'MB' },
            { id: 'totalMB', name: 'Total Storage', type: 'number', role: 'value', unit: 'MB' },
            { id: 'availableMB', name: 'Available Storage', type: 'number', role: 'value', unit: 'MB' },
            { id: 'usedPercent', name: 'Used Percent', type: 'number', role: 'value', unit: '%' },
            { id: 'overQuota', name: 'Over Quota', type: 'boolean', role: 'indicator.alarm' },
            { id: 'almostFull', name: 'Almost Full', type: 'boolean', role: 'indicator.alarm' },
            { id: 'paidQuota', name: 'Paid Quota', type: 'boolean', role: 'indicator' },
        ];
        for (const s of STORAGE_STATES) {
            await this.extendObject(`account.storage.${s.id}`, {
                type: 'state',
                common: {
                    name: s.name,
                    type: s.type,
                    role: s.role,
                    read: true,
                    write: false,
                    ...(s.unit ? { unit: s.unit } : {}),
                },
                native: {},
            });
        }
        await this.extendObject('account.storage.byMedia', {
            type: 'channel',
            common: { name: 'Storage by Media Type' },
            native: {},
        });
        await this.extendObject('account.storage.family', {
            type: 'channel',
            common: { name: 'Family Storage' },
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

        // Pre-populate stateCache from persisted states so setStateIfChanged skips unchanged writes on first refresh
        try {
            const existing = await this.getStatesAsync(`${this.namespace}.*`);
            for (const [id, state] of Object.entries(existing)) {
                if (state != null) {
                    const shortId = id.slice(this.namespace.length + 1);
                    this.stateCache.set(shortId, state.val);
                }
            }
            this.log.debug(`State cache pre-populated with ${this.stateCache.size} entries`);
        } catch {
            // Non-critical — cache stays empty, first refresh writes all states as before
            this.log.debug('State cache pre-population failed, starting with empty cache');
        }

        this.subscribeStates('mfa.code');
        this.subscribeStates('mfa.requestSmsCode');
        this.subscribeStates('findme.*.ping');
        this.subscribeStates('reminders.*.*.completed');
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
            this.log.warn('MFA required — enter the 6-digit Apple code into state mfa.code');
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
            // Initialise geocoding provider
            await this.initGeocoding();
            await this.loadFindMyIdMap();
            await this.refreshFindMyDevices(locationPoints);
            this.scheduleFindMyRefresh(locationPoints);
        }

        // ── Calendar ──────────────────────────────────────────────────────────
        if (activeServices.includes('calendar') && this.config.calendarEnabled) {
            await this.refreshCalendarEvents();
            this.scheduleCalendarRefresh();
        }

        // ── Reminders ─────────────────────────────────────────────────────────
        // Intentionally not awaited: CloudKit is independent from other Apple services,
        // so the initial sync runs in the background without blocking onICloudReady().
        if (activeServices.includes('reminders') && this.config.remindersEnabled) {
            this.refreshReminders().catch((err: unknown) => {
                this.log.warn(`Reminders initial refresh failed: ${(err as Error)?.message ?? String(err)}`);
            });
            this.scheduleRemindersRefresh();
        }

        // ── Contacts ──────────────────────────────────────────────────────────
        if (activeServices.includes('contacts') && this.config.contactsEnabled) {
            this.refreshContacts().catch((err: unknown) => {
                this.log.warn(`Contacts initial refresh failed: ${(err as Error)?.message ?? String(err)}`);
            });
            this.scheduleContactsRefresh();
        }

        // ── Notes ─────────────────────────────────────────────────────────────
        if (activeServices.includes('notes') && this.config.notesEnabled) {
            this.refreshNotes().catch((err: unknown) => {
                this.log.warn(`Notes initial refresh failed: ${(err as Error)?.message ?? String(err)}`);
            });
            this.scheduleNotesRefresh();
        }

        // ── Photos ────────────────────────────────────────────────────────────
        if (activeServices.includes('ckdatabasews') && this.config.photosEnabled) {
            this.refreshPhotos().catch((err: unknown) => {
                this.log.warn(`Photos initial refresh failed: ${(err as Error)?.message ?? String(err)}`);
            });
            this.schedulePhotosRefresh();
        }

        // ── iCloud Drive ──────────────────────────────────────────────────────
        if (activeServices.includes('drivews') && this.config.driveEnabled) {
            try {
                await this.icloud!.requestServiceAccess('iclouddrive');
            } catch (err) {
                const msg = (err as Error)?.message ?? String(err);
                // PCS failures are expected when Advanced Data Protection is enabled and the
                // user's device cannot be reached for consent. Drive refresh continues anyway
                // — states will show what was last cached. No warn needed; debug is sufficient.
                this.log.debug(`Drive PCS access skipped: ${msg}`);
            }
            await this.refreshDrive();

            // Start Drive Sync if enabled
            if (this.config.driveSyncEnabled) {
                await this.loadDriveSyncMeta();
                // Run initial sync quickly (30s) so users see it working right away
                this.driveSyncTimer = this.setTimeout(async () => {
                    this.driveSyncTimer = null;
                    await this.executeDriveSync();
                    this.scheduleDriveSync();
                }, 30_000);
                this.log.info('Drive Sync enabled — initial sync in 30 seconds');
            }
        }

        // ── Account Storage ───────────────────────────────────────────────────
        if (this.config.accountStorageEnabled) {
            await this.refreshAccountStorage();
            this.scheduleAccountStorageRefresh();
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
            p => String(p.index)?.trim() && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude)),
        );
        if (pts.length > 0) {
            return pts.map(p => ({
                index: String(p.index).trim(),
                lat: Number(p.latitude),
                lon: Number(p.longitude),
                name: p.name?.trim() || String(p.index).trim(),
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
     * Initialise the geocoding provider based on adapter config.
     * Loads the local GeoJSON index or creates an ExternalGeocoder instance.
     */
    private async initGeocoding(): Promise<void> {
        const provider = this.config.geocodingProvider ?? 'none';
        if (provider === 'none') {
            this.log.debug('Geocoding: disabled');
            return;
        }

        if (provider === 'local') {
            const adapterRoot = path.join(__dirname, '..');
            this.geoLookup.load(adapterRoot, msg => this.log.info(msg));
            return;
        }

        // External provider
        const geocoder = new ExternalGeocoder(
            provider as GeocodingProvider,
            this.config.geocodingUrl ?? '',
            this.config.geocodingApiKey ?? '',
            (this.config.geocodingCacheSize ?? 'small') as GeocodingCacheSize,
            (level, msg) => this.log[level](msg),
        );

        if (!geocoder.validate()) {
            return;
        }

        // Resolve system country code and language for localized address names
        try {
            const sysCfg = await this.getForeignObjectAsync('system.config');
            const common = sysCfg?.common;
            const lang = (common as unknown as Record<string, unknown>)?.language as string | undefined;
            if (lang) {
                geocoder.language = lang;
                this.log.info(`Geocoder: using system language '${lang}' for localized address names.`);
            }
            const lat = Number(common?.latitude);
            const lon = Number(common?.longitude);
            if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
                geocoder.systemCountryCode = await geocoder.resolveSystemCountry(lat, lon);
                if (geocoder.systemCountryCode) {
                    this.log.info(
                        `Geocoder: system country code resolved to '${geocoder.systemCountryCode}' — ` +
                            'country will be omitted from location names for devices in this country.',
                    );
                } else {
                    this.log.info(
                        'Geocoder: could not determine system country code from system.config coordinates. ' +
                            'Country will always be appended to location names.',
                    );
                }
            }
        } catch {
            /* ignore — country will always be appended */
        }

        this.externalGeocoder = geocoder;
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
            this.log.debug('FindMy: calling API refresh...');
            await findMe.refresh();
            const membersInfo = findMe.membersInfo;
            const devices = findMe.devices;
            this.log.debug(`FindMy: API returned ${devices.size} device(s)`);

            const regularDevices: iCloudFindMyDeviceInfo[] = [];
            const accessories: iCloudFindMyDeviceInfo[] = [];
            const familyDevices: iCloudFindMyDeviceInfo[] = [];
            for (const [, dev] of devices) {
                const d = dev.deviceInfo;
                //this.log.debug(JSON.stringify(d));
                if (d.isConsideredAccessory) {
                    accessories.push(d);
                } else if (d.fmlyShare) {
                    familyDevices.push(d);
                } else {
                    regularDevices.push(d);
                }
            }

            // ── Write states ─────────────────────────────────────────────────
            const allDevicesUnfiltered = [...regularDevices, ...accessories, ...familyDevices];
            const disabledSet = new Set(this.config.findMyDisabledDevices ?? []);
            const disabledKey = [...disabledSet].sort().join('\0');
            if (disabledKey !== this.findMyLastDisabledKey) {
                // disabled list changed (or first run) — force cleanup on this cycle
                this.findMyLastDisabledKey = disabledKey;
                this.findMyCleanupDone = false;
            }
            const allDevices = allDevicesUnfiltered.filter(d => !disabledSet.has(d.id ?? ''));
            const geocodingActive = (this.config.geocodingProvider ?? 'none') !== 'none';
            if (!this.findMyCleanupDone) {
                await this.cleanupFindMyObjects(allDevices);
                await this.cleanupDisabledDevices(disabledSet);
                if (!geocodingActive) {
                    await this.cleanupFindMyGeoStates();
                }
                this.findMyCleanupDone = true;
            }
            await this.extendObject('findme', {
                type: 'folder',
                common: { name: 'FindMy' },
                native: {},
            });
            await this.extendObject('findme.lastSync', {
                type: 'state',
                common: {
                    name: 'Last Sync',
                    type: 'number',
                    role: 'value.time',
                    read: true,
                    write: false,
                },
                native: {},
            });
            // Geocoding stats for end-of-cycle summary
            let _geoTotalMs = 0;
            let _geoCount = 0;
            for (const d of allDevices) {
                const apiId = d.id ?? '';
                if (!apiId) {
                    this.log.warn(`FindMy: skipping device with empty id (name: ${d.name ?? '?'})`);
                    continue;
                }
                const numericId = this.getOrAssignFindMyNumericId(apiId);
                const safeId = `findme.${numericId}`;
                {
                    const existingDeviceObj = await this.getObjectAsync(safeId);
                    await this.setObject(safeId, {
                        ...(existingDeviceObj ?? {}),
                        type: 'device',
                        common: {
                            ...((existingDeviceObj?.common ?? {}) as ioBroker.DeviceCommon),
                            name: d.name ?? d.deviceDisplayName ?? apiId,
                        },
                        native: { id: apiId, baUUID: d.baUUID },
                    } as ioBroker.DeviceObject);
                }
                // Battery states only for devices that report a valid battery
                const hasBattery = d.batteryStatus != null && d.batteryStatus !== 'Unknown';
                const batteryStateDefs = hasBattery
                    ? FINDMY_DEVICE_STATES
                    : FINDMY_DEVICE_STATES.filter(def => def.id !== 'batteryLevel' && def.id !== 'batteryCharging');
                for (const def of batteryStateDefs) {
                    await this.extendObject(`${safeId}.${def.id}`, {
                        type: 'state',
                        common: {
                            name: def.name,
                            type: def.type,
                            role: def.role,
                            ...(def.unit !== undefined ? { unit: def.unit } : {}),
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                }
                if (geocodingActive) {
                    await this.extendObject(`${safeId}.locationName`, {
                        type: 'state',
                        common: {
                            name:
                                this.config.geocodingProvider === 'local'
                                    ? 'Location (Municipality)'
                                    : 'Location (Address)',
                            type: 'string',
                            role: 'text',
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
                        await this.setStateIfChanged(`${safeId}.features.${feat}`, val);
                    }
                }
                // Write values
                const loc = d.location;
                const distKm =
                    loc && locationPoints.length > 0
                        ? haversineKm(locationPoints[0].lat, locationPoints[0].lon, loc.latitude, loc.longitude)
                        : null;
                // Geocoding
                const _geoT0 = process.hrtime.bigint();
                let _geoResult = 'unknown';
                if (loc && this.externalGeocoder) {
                    const addr = await this.externalGeocoder.resolve(loc.latitude, loc.longitude);
                    if (addr) {
                        _geoResult = addr;
                    }
                } else if (loc && this.config.geocodingProvider === 'local') {
                    _geoResult = this.geoLookup.resolve(loc.latitude, loc.longitude);
                }
                const _geoElapsed = loc ? Number(process.hrtime.bigint() - _geoT0) : 0; // ns
                const vals: Record<string, ioBroker.StateValue> = {
                    name: d.name ?? '',
                    deviceClass: d.deviceClass,
                    deviceDisplayName: d.deviceDisplayName,
                    modelDisplayName: d.modelDisplayName,
                    rawDeviceModel: d.rawDeviceModel,
                    deviceStatus: d.deviceStatus,
                    ...(hasBattery
                        ? {
                              batteryLevel: d.batteryLevel != null ? Math.round(d.batteryLevel * 100) : -1,
                              batteryCharging: d.batteryStatus === 'Charging',
                          }
                        : {}),
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
                    ...(geocodingActive ? { locationName: _geoResult } : {}),
                    ownerAppleId: d.prsId ? (membersInfo[d.prsId]?.appleId ?? null) : null,
                    ownerName: d.prsId
                        ? [membersInfo[d.prsId]?.firstName, membersInfo[d.prsId]?.lastName].filter(Boolean).join(' ') ||
                          null
                        : null,
                };
                if (loc) {
                    _geoTotalMs += _geoElapsed;
                    _geoCount++;
                }
                for (const [key, val] of Object.entries(vals)) {
                    if (val !== null) {
                        await this.setStateIfChanged(`${safeId}.${key}`, val);
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
                        await this.setStateIfChanged(`${safeId}.distances.${pt.index}`, distM);
                    }
                }
            }
            // End-of-resync geocoding summary
            if (geocodingActive) {
                if (this.externalGeocoder) {
                    const st = this.externalGeocoder.takeStats();
                    this.log.debug(
                        `FindMy geocoding: ${allDevices.length} device(s), ${_geoCount} with location — ` +
                            `cache hits: ${st.cacheHits}, requests: ${st.requests}, fails: ${st.fails}, ` +
                            `cache size: ${st.cacheSize}, total: ${(_geoTotalMs / 1e6).toFixed(1)} ms`,
                    );
                } else {
                    // local provider
                    this.log.debug(
                        `FindMy geocoding (local): ${allDevices.length} device(s), ${_geoCount} with location, ` +
                            `total: ${(_geoTotalMs / 1e6).toFixed(1)} ms`,
                    );
                }
            }
            await this.setState('findme.lastSync', Date.now(), true);
            const locatedCount = allDevices.filter(d => d.location).length;
            if (this.findMyFirstLoad) {
                this.findMyFirstLoad = false;
                this.log.info(
                    `FindMy ready — ${allDevices.length} device(s): ${regularDevices.length} own, ` +
                        `${familyDevices.length} family, ${accessories.length} accessories; ` +
                        `${locatedCount}/${allDevices.length} with location`,
                );
            } else {
                this.log.debug(`FindMy: refresh done — ${allDevices.length} device(s) written`);
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
        // Collect all currently used numeric IDs as integers
        const used = new Set<number>();
        for (const v of this.findMyIdMap.values()) {
            used.add(parseInt(v, 10));
        }
        // Find the lowest positive integer not yet in use (gap-filling)
        let next = 1;
        while (used.has(next)) {
            next++;
        }
        const nextStr = String(next).padStart(6, '0');
        this.findMyIdMap.set(apiId, nextStr);
        return nextStr;
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

    /**
     * Remove findme device objects whose native.id is in the disabled set.
     * This runs independently of findMyIdMap so it works even when the map is incomplete.
     *
     * @param disabledIds - set of Apple API device IDs that are disabled
     */
    private async cleanupDisabledDevices(disabledIds: Set<string>): Promise<void> {
        if (disabledIds.size === 0) {
            return;
        }
        const existing = await this.getObjectViewAsync('system', 'device', {
            startkey: `${this.namespace}.findme.`,
            endkey: `${this.namespace}.findme.\u9999`,
        });
        for (const row of existing.rows) {
            const nativeId = row.value?.native?.id as string | undefined;
            if (nativeId && disabledIds.has(nativeId)) {
                this.log.info(`FindMy: removing disabled device ${row.id}`);
                await this.delObjectAsync(row.id, { recursive: true });
            }
        }
    }

    private async cleanupFindMyGeoStates(): Promise<void> {
        const existing = await this.getObjectViewAsync('system', 'state', {
            startkey: `${this.namespace}.findme.`,
            endkey: `${this.namespace}.findme.\u9999`,
        });
        for (const row of existing.rows) {
            if (row.id.endsWith('.locationName')) {
                this.log.info(`FindMy GEO cleanup: removing ${row.id}`);
                await this.delObjectAsync(row.id);
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

    // ── Calendar helpers ──────────────────────────────────────────────────────

    private sanitizeCalendarId(name: string): string {
        return (
            (name || 'unknown')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '') || 'unknown'
        );
    }

    private localDateArrayToTimestamp(arr: number[]): number | null {
        // Array format: [YYYYMMDD, YYYY, MM, DD, HH, mm, sss]
        // arr[0] is the compact YYYYMMDD integer — skip it; use positional fields.
        if (!arr || arr.length < 4) {
            return null;
        }
        return new Date(arr[1], arr[2] - 1, arr[3], arr[4] ?? 0, arr[5] ?? 0, 0).getTime();
    }

    private async refreshCalendarEvents(): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const calService = this.icloud.getService('calendar');
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            // pyicloud uses first..last day of current month for /startup
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const startupResp = await calService.startup(monthStart, monthEnd);
            const collections = startupResp.Collection ?? [];
            const events = startupResp.Event ?? [];
            const maxCount = Math.max(1, Math.floor(this.config.calendarEventCount ?? 10));

            // Group events by pGuid (calendar guid), skip already-ended events
            const eventsByCalendar = new Map<string, typeof events>();
            for (const ev of events) {
                if (!ev.pGuid) {
                    continue;
                }
                const startTs = this.localDateArrayToTimestamp(ev.localStartDate);
                if (startTs !== null && startTs < todayStart) {
                    continue;
                }
                if (!eventsByCalendar.has(ev.pGuid)) {
                    eventsByCalendar.set(ev.pGuid, []);
                }
                eventsByCalendar.get(ev.pGuid)!.push(ev);
            }

            // Sort each calendar's events ascending by start date
            for (const evList of eventsByCalendar.values()) {
                evList.sort((a, b) => {
                    const ta = this.localDateArrayToTimestamp(a.localStartDate) ?? 0;
                    const tb = this.localDateArrayToTimestamp(b.localStartDate) ?? 0;
                    return ta - tb;
                });
            }

            await this.extendObject('calendar', {
                type: 'folder',
                common: { name: 'Calendar' },
                native: {},
            });
            await this.extendObject('calendar.lastSync', {
                type: 'state',
                common: {
                    name: 'Last Sync',
                    type: 'number',
                    role: 'value.time',
                    read: true,
                    write: false,
                },
                native: {},
            });

            const activeCalendarIds = new Set<string>();
            for (const col of collections) {
                const calId = this.sanitizeCalendarId(col.title);
                activeCalendarIds.add(calId);

                await this.extendObject(`calendar.${calId}`, {
                    type: 'folder',
                    common: { name: col.title },
                    native: {},
                });

                // Collection-level states (color, enabled, visible, …)
                for (const s of CALENDAR_COLLECTION_STATES) {
                    await this.extendObject(`calendar.${calId}.${s.id}`, {
                        type: 'state',
                        common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
                        native: {},
                    });
                }
                await this.setStateIfChanged(`calendar.${calId}.guid`, col.guid ?? '');
                await this.setStateIfChanged(`calendar.${calId}.ctag`, col.ctag ?? '');
                await this.setStateIfChanged(`calendar.${calId}.etag`, col.etag ?? '');
                await this.setStateIfChanged(`calendar.${calId}.color`, col.color ?? '');
                await this.setStateIfChanged(`calendar.${calId}.symbolicColor`, col.symbolicColor ?? '');
                await this.setStateIfChanged(`calendar.${calId}.order`, col.order ?? 0);
                await this.setStateIfChanged(`calendar.${calId}.enabled`, col.enabled ?? false);
                await this.setStateIfChanged(`calendar.${calId}.visible`, col.visible ?? false);
                await this.setStateIfChanged(`calendar.${calId}.readOnly`, col.readOnly ?? false);
                await this.setStateIfChanged(`calendar.${calId}.isDefault`, col.isDefault ?? false);
                await this.setStateIfChanged(`calendar.${calId}.isFamily`, col.isFamily ?? false);
                await this.setStateIfChanged(`calendar.${calId}.isPublished`, col.isPublished ?? false);
                await this.setStateIfChanged(`calendar.${calId}.isPrivatelyShared`, col.isPrivatelyShared ?? false);
                await this.setStateIfChanged(
                    `calendar.${calId}.extendedDetailsAreIncluded`,
                    col.extendedDetailsAreIncluded ?? false,
                );
                await this.setStateIfChanged(
                    `calendar.${calId}.shouldShowJunkUIWhenAppropriate`,
                    col.shouldShowJunkUIWhenAppropriate ?? false,
                );
                await this.setStateIfChanged(`calendar.${calId}.shareTitle`, col.shareTitle ?? '');
                await this.setStateIfChanged(`calendar.${calId}.prePublishedUrl`, col.prePublishedUrl ?? '');
                await this.setStateIfChanged(`calendar.${calId}.supportedType`, col.supportedType ?? '');
                await this.setStateIfChanged(`calendar.${calId}.objectType`, col.objectType ?? '');
                await this.setStateIfChanged(
                    `calendar.${calId}.createdDate`,
                    this.localDateArrayToTimestamp(col.createdDate) ?? null,
                );
                await this.setStateIfChanged(
                    `calendar.${calId}.lastModifiedDate`,
                    this.localDateArrayToTimestamp(col.lastModifiedDate) ?? null,
                );

                const calEvents = eventsByCalendar.get(col.guid) ?? [];

                for (let i = 1; i <= maxCount; i++) {
                    const slotId = String(i).padStart(6, '0');
                    const basePath = `calendar.${calId}.${slotId}`;
                    const ev = calEvents[i - 1];

                    await this.extendObject(basePath, {
                        type: 'folder',
                        common: { name: ev?.title ?? `Event ${slotId}` },
                        native: {},
                    });

                    for (const s of CALENDAR_EVENT_STATES) {
                        await this.extendObject(`${basePath}.${s.id}`, {
                            type: 'state',
                            common: {
                                name: s.name,
                                type: s.type,
                                role: s.role,
                                read: true,
                                write: false,
                                ...(s.unit ? { unit: s.unit } : {}),
                            },
                            native: {},
                        });
                    }

                    if (ev) {
                        await this.setStateIfChanged(`${basePath}.title`, ev.title ?? '');
                        await this.setStateIfChanged(`${basePath}.guid`, ev.guid ?? '');
                        await this.setStateIfChanged(`${basePath}.etag`, ev.etag ?? '');
                        await this.setStateIfChanged(`${basePath}.pGuid`, ev.pGuid ?? '');
                        await this.setStateIfChanged(
                            `${basePath}.startDate`,
                            this.localDateArrayToTimestamp(ev.localStartDate) ?? null,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.endDate`,
                            this.localDateArrayToTimestamp(ev.localEndDate) ?? null,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.masterStartDate`,
                            this.localDateArrayToTimestamp(ev.masterStartDate) ?? null,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.masterEndDate`,
                            this.localDateArrayToTimestamp(ev.masterEndDate) ?? null,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.createdDate`,
                            this.localDateArrayToTimestamp(ev.createdDate) ?? null,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.lastModifiedDate`,
                            this.localDateArrayToTimestamp(ev.lastModifiedDate) ?? null,
                        );
                        await this.setStateIfChanged(`${basePath}.allDay`, ev.allDay ?? false);
                        await this.setStateIfChanged(`${basePath}.duration`, ev.duration ?? null);
                        await this.setStateIfChanged(`${basePath}.url`, ev.url ?? '');
                        await this.setStateIfChanged(`${basePath}.tz`, ev.tz ?? '');
                        await this.setStateIfChanged(`${basePath}.tzname`, ev.tzname ?? '');
                        await this.setStateIfChanged(`${basePath}.startDateTZOffset`, ev.startDateTZOffset ?? '');
                        await this.setStateIfChanged(`${basePath}.icon`, ev.icon ?? 0);
                        await this.setStateIfChanged(`${basePath}.readOnly`, ev.readOnly ?? false);
                        await this.setStateIfChanged(`${basePath}.transparent`, ev.transparent ?? false);
                        await this.setStateIfChanged(`${basePath}.hasAttachments`, ev.hasAttachments ?? false);
                        await this.setStateIfChanged(
                            `${basePath}.recurrenceException`,
                            ev.recurrenceException ?? false,
                        );
                        await this.setStateIfChanged(`${basePath}.recurrenceMaster`, ev.recurrenceMaster ?? false);
                        await this.setStateIfChanged(
                            `${basePath}.birthdayIsYearlessBday`,
                            ev.birthdayIsYearlessBday ?? false,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.birthdayShowAsCompany`,
                            ev.birthdayShowAsCompany ?? false,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.extendedDetailsAreIncluded`,
                            ev.extendedDetailsAreIncluded ?? false,
                        );
                        await this.setStateIfChanged(
                            `${basePath}.shouldShowJunkUIWhenAppropriate`,
                            ev.shouldShowJunkUIWhenAppropriate ?? false,
                        );
                        await this.setStateIfChanged(`${basePath}.alarms`, JSON.stringify(ev.alarms ?? []));
                    } else {
                        for (const s of CALENDAR_EVENT_STATES) {
                            await this.setStateIfChanged(`${basePath}.${s.id}`, null);
                        }
                    }
                }
            }

            await this.cleanupCalendarObjects(activeCalendarIds, maxCount);
            await this.setState('calendar.lastSync', Date.now(), true);
            if (this.calendarFirstLoad) {
                this.calendarFirstLoad = false;
                const upcomingCount = [...eventsByCalendar.values()].reduce((s, l) => s + l.length, 0);
                this.log.info(
                    `Calendar ready — ${collections.length} calendar(s), ${upcomingCount} upcoming event(s) this month`,
                );
            } else {
                this.log.debug(`Calendar refresh done — ${collections.length} calendar(s), ${events.length} event(s)`);
            }
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            this.log.warn(`Calendar refresh failed: ${msg}`);
        }
    }

    private async cleanupCalendarObjects(activeCalendarIds: Set<string>, maxCount: number): Promise<void> {
        const prefix = `${this.namespace}.calendar.`;
        const existing = await this.getObjectViewAsync('system', 'folder', {
            startkey: prefix,
            endkey: `${prefix}\u9999`,
        });
        for (const row of existing.rows) {
            const suffix = row.id.slice(prefix.length);
            const parts = suffix.split('.');
            if (parts.length === 1) {
                // Calendar-level folder — delete if no longer in Apple
                if (!activeCalendarIds.has(parts[0])) {
                    this.log.info(`Calendar cleanup: removing deleted calendar "${parts[0]}"`);
                    await this.delObjectAsync(row.id, { recursive: true });
                }
            } else if (parts.length === 2) {
                // Slot-level folder — delete if slot number exceeds current maxCount
                const slotNum = parseInt(parts[1], 10);
                if (activeCalendarIds.has(parts[0]) && !isNaN(slotNum) && slotNum > maxCount) {
                    this.log.info(`Calendar cleanup: removing excess slot ${parts[1]} in calendar "${parts[0]}"`);
                    await this.delObjectAsync(row.id, { recursive: true });
                }
            }
        }
    }

    private scheduleCalendarRefresh(): void {
        if (this.calendarRefreshTimer) {
            this.clearTimeout(this.calendarRefreshTimer);
            this.calendarRefreshTimer = null;
        }
        let intervalMin = Math.floor(this.config.calendarInterval ?? 60);
        if (!Number.isFinite(intervalMin) || intervalMin < 5) {
            this.log.warn(
                `Calendar interval is ${this.config.calendarInterval} — value below 5 minutes, falling back to 60 minutes`,
            );
            intervalMin = 60;
        } else if (intervalMin > 1440) {
            this.log.warn(`Calendar interval is ${intervalMin} minutes — clamping to 1440 minutes`);
            intervalMin = 1440;
        }
        const INTERVAL_MS = intervalMin * 60 * 1000;
        const schedule = (): void => {
            this.calendarRefreshTimer = this.setTimeout(async () => {
                this.calendarRefreshTimer = null;
                if (!this.icloud) {
                    return;
                }
                this.log.debug('Calendar scheduled refresh starting...');
                await this.refreshCalendarEvents();
                schedule();
            }, INTERVAL_MS);
        };
        schedule();
        this.log.debug(`Calendar refresh scheduled every ${intervalMin} min`);
    }

    // ── Reminders helpers ─────────────────────────────────────────────────────

    private async refreshReminders(): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const remService = this.icloud.getService('reminders');
            const isFirstCall = !this.remindersSyncMapLoaded;

            // On first call: restore syncMap from the reminders object's native
            if (isFirstCall) {
                this.remindersSyncMapLoaded = true;
                try {
                    const obj = await this.getObjectAsync('reminders');
                    const syncMap = (obj?.native as { syncMap?: unknown } | undefined)?.syncMap;
                    if (syncMap && typeof syncMap === 'object' && (syncMap as { syncToken?: string }).syncToken) {
                        remService.loadSyncMap(syncMap as RemindersSyncMap);
                        this.log.debug(
                            `Reminders: restored syncMap (${remService.lists.length} list(s), syncToken present)`,
                        );
                    }
                } catch {
                    // Object doesn't exist yet — fresh install, full sync will follow
                }
            }

            const changed = await remService.refresh();

            // Persist syncMap only when data actually changed
            if (changed) {
                const remObj = await this.getObjectAsync('reminders');
                await this.setObject('reminders', {
                    ...(remObj ?? {}),
                    type: 'folder',
                    common: { ...((remObj?.common ?? {}) as ioBroker.OtherCommon), name: 'Reminders' },
                    native: { syncMap: remService.exportSyncMap() },
                } as ioBroker.FolderObject);
            }

            // First call: always write states (data comes from restored syncMap even if delta was empty)
            // Subsequent calls: skip state updates when nothing changed
            if (!changed && !isFirstCall) {
                this.log.debug('Reminders refresh: no changes, skipping state updates');
                return;
            }

            await this.writeReminderStates(remService);
            if (isFirstCall) {
                const totalCount = [...remService.remindersByList.values()].reduce((s, l) => s + l.length, 0);
                const openCount = [...remService.remindersByList.values()]
                    .flat()
                    .filter(r => !r.completed && !r.deleted).length;
                this.log.info(
                    `Reminders ready — ${remService.lists.length} list(s), ${openCount} open / ${totalCount} total`,
                );
            }
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            this.log.warn(`Reminders refresh failed: ${msg}`);
        }
    }

    private async persistRemindersSyncMap(): Promise<void> {
        if (!this.icloud || !this.remindersSyncMapLoaded) {
            return;
        }
        try {
            const remService = this.icloud.getService('reminders');
            const remObj = await this.getObjectAsync('reminders');
            await this.setObject('reminders', {
                ...(remObj ?? {}),
                type: 'folder',
                common: { ...((remObj?.common ?? {}) as ioBroker.OtherCommon), name: 'Reminders' },
                native: { syncMap: remService.exportSyncMap() },
            } as ioBroker.FolderObject);
        } catch {
            // Best effort on shutdown
        }
    }

    private async writeReminderStates(remService: iCloudRemindersService): Promise<void> {
        const maxCount = Math.max(1, Math.floor(this.config.remindersItemCount ?? 10));
        const filterMode = this.config.remindersFilter ?? 'due';
        const showCompleted = this.config.remindersShowCompleted ?? false;
        const now = Date.now();

        await this.extendObject('reminders', {
            type: 'folder',
            common: { name: 'Reminders' },
            native: {},
        });
        await this.extendObject('reminders.lastSync', {
            type: 'state',
            common: {
                name: 'Last Sync',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
            },
            native: {},
        });

        const activeListIds = new Set<string>();
        for (const list of remService.lists) {
            const listId = this.sanitizeCalendarId(list.title);
            activeListIds.add(listId);

            await this.extendObject(`reminders.${listId}`, {
                type: 'folder',
                common: { name: list.title },
                native: {},
            });

            for (const s of REMINDER_COLLECTION_STATES) {
                await this.extendObject(`reminders.${listId}.${s.id}`, {
                    type: 'state',
                    common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
                    native: {},
                });
            }
            await this.setStateIfChanged(`reminders.${listId}.id`, list.id ?? '');
            await this.setStateIfChanged(`reminders.${listId}.color`, list.color ?? '');
            await this.setStateIfChanged(`reminders.${listId}.count`, list.count ?? 0);

            // ── Open reminders ────────────────────────────────────────────
            const allOpen = (remService.remindersByList.get(list.id) ?? []).filter(r => !r.completed && !r.deleted);

            let items: typeof allOpen;
            if (filterMode === 'due') {
                // Only reminders whose start or due date is in the past (or right now)
                items = allOpen.filter(r => {
                    const earliest = Math.min(r.startDate ?? Infinity, r.dueDate ?? Infinity);
                    return earliest <= now;
                });
            } else {
                items = allOpen;
            }
            items.sort((a, b) => {
                const ta = a.dueDate ?? Infinity;
                const tb = b.dueDate ?? Infinity;
                return ta - tb;
            });

            await this.writeReminderSlots(`reminders.${listId}`, items, maxCount);

            // ── Completed reminders (optional subfolder) ──────────────────
            if (showCompleted) {
                const completedItems = (remService.remindersByList.get(list.id) ?? [])
                    .filter(r => r.completed && !r.deleted)
                    .sort((a, b) => {
                        // Newest completed first
                        const ta = a.completedDate ?? a.lastModifiedDate ?? 0;
                        const tb = b.completedDate ?? b.lastModifiedDate ?? 0;
                        return tb - ta;
                    });

                await this.extendObject(`reminders.${listId}.completed`, {
                    type: 'folder',
                    common: { name: 'Completed' },
                    native: {},
                });

                await this.writeReminderSlots(`reminders.${listId}.completed`, completedItems, maxCount);
            }
        }

        await this.cleanupRemindersObjects(activeListIds, maxCount, showCompleted);
        await this.setState('reminders.lastSync', Date.now(), true);
        this.log.debug(
            `Reminders refresh done — ${remService.lists.length} list(s), ` +
                `${[...remService.remindersByList.values()].reduce((s, l) => s + l.length, 0)} reminder(s)`,
        );
    }

    private async writeReminderSlots(basePath: string, items: Reminder[], maxCount: number): Promise<void> {
        for (let i = 1; i <= maxCount; i++) {
            const slotId = String(i).padStart(6, '0');
            const slotPath = `${basePath}.${slotId}`;
            const rem = items[i - 1];

            await this.extendObject(slotPath, {
                type: 'folder',
                common: { name: rem?.title ?? `Reminder ${slotId}` },
                native: {},
            });

            for (const s of REMINDER_ITEM_STATES) {
                await this.extendObject(`${slotPath}.${s.id}`, {
                    type: 'state',
                    common: {
                        name: s.name,
                        type: s.type,
                        role: s.role,
                        read: true,
                        write: s.write ?? false,
                    },
                    native: {},
                });
            }

            if (rem) {
                await this.setStateIfChanged(`${slotPath}.title`, rem.title ?? '');
                await this.setStateIfChanged(`${slotPath}.description`, rem.description ?? '');
                await this.setStateIfChanged(`${slotPath}.id`, rem.id ?? '');
                await this.setStateIfChanged(`${slotPath}.listId`, rem.listId ?? '');
                await this.setStateIfChanged(`${slotPath}.priority`, rem.priority ?? 0);
                await this.setStateIfChanged(`${slotPath}.flagged`, rem.flagged ?? false);
                await this.setStateIfChanged(`${slotPath}.allDay`, rem.allDay ?? false);
                await this.setStateIfChanged(`${slotPath}.completed`, rem.completed ?? false);
                await this.setStateIfChanged(`${slotPath}.dueDate`, rem.dueDate ?? null);
                await this.setStateIfChanged(`${slotPath}.startDate`, rem.startDate ?? null);
                await this.setStateIfChanged(`${slotPath}.completedDate`, rem.completedDate ?? null);
                await this.setStateIfChanged(`${slotPath}.createdDate`, rem.createdDate ?? null);
                await this.setStateIfChanged(`${slotPath}.lastModifiedDate`, rem.lastModifiedDate ?? null);
            } else {
                for (const s of REMINDER_ITEM_STATES) {
                    await this.setStateIfChanged(`${slotPath}.${s.id}`, null);
                }
            }
        }
    }

    private async cleanupRemindersObjects(
        activeListIds: Set<string>,
        maxCount: number,
        showCompleted: boolean,
    ): Promise<void> {
        const prefix = `${this.namespace}.reminders.`;
        const existing = await this.getObjectViewAsync('system', 'folder', {
            startkey: prefix,
            endkey: `${prefix}\u9999`,
        });
        for (const row of existing.rows) {
            const suffix = row.id.slice(prefix.length);
            const parts = suffix.split('.');
            if (parts.length === 1) {
                if (!activeListIds.has(parts[0])) {
                    this.log.info(`Reminders cleanup: removing deleted list "${parts[0]}"`);
                    await this.delObjectAsync(row.id, { recursive: true });
                }
            } else if (parts.length === 2) {
                // Could be a slot (000001) or the "completed" subfolder
                if (parts[1] === 'completed') {
                    // Remove the completed folder if the option was disabled
                    if (!showCompleted && activeListIds.has(parts[0])) {
                        this.log.info(`Reminders cleanup: removing completed folder in list "${parts[0]}"`);
                        await this.delObjectAsync(row.id, { recursive: true });
                    }
                } else {
                    const slotNum = parseInt(parts[1], 10);
                    if (activeListIds.has(parts[0]) && !isNaN(slotNum) && slotNum > maxCount) {
                        this.log.info(`Reminders cleanup: removing excess slot ${parts[1]} in list "${parts[0]}"`);
                        await this.delObjectAsync(row.id, { recursive: true });
                    }
                }
            } else if (parts.length === 3 && parts[1] === 'completed') {
                // Slot inside the completed subfolder — clean up excess
                const slotNum = parseInt(parts[2], 10);
                if (activeListIds.has(parts[0]) && !isNaN(slotNum) && slotNum > maxCount) {
                    this.log.info(
                        `Reminders cleanup: removing excess completed slot ${parts[2]} in list "${parts[0]}"`,
                    );
                    await this.delObjectAsync(row.id, { recursive: true });
                }
            }
        }
    }

    private scheduleRemindersRefresh(): void {
        if (this.remindersRefreshTimer) {
            this.clearTimeout(this.remindersRefreshTimer);
            this.remindersRefreshTimer = null;
        }
        let intervalMin = Math.floor(this.config.remindersInterval ?? 60);
        if (!Number.isFinite(intervalMin) || intervalMin < 5) {
            this.log.warn(
                `Reminders interval is ${this.config.remindersInterval} — value below 5 minutes, falling back to 60 minutes`,
            );
            intervalMin = 60;
        } else if (intervalMin > 1440) {
            this.log.warn(`Reminders interval is ${intervalMin} minutes — clamping to 1440 minutes`);
            intervalMin = 1440;
        }
        const INTERVAL_MS = intervalMin * 60 * 1000;
        const schedule = (): void => {
            this.remindersRefreshTimer = this.setTimeout(async () => {
                this.remindersRefreshTimer = null;
                if (!this.icloud) {
                    return;
                }
                this.log.debug('Reminders scheduled refresh starting...');
                await this.refreshReminders();
                schedule();
            }, INTERVAL_MS);
        };
        schedule();
        this.log.debug(`Reminders refresh scheduled every ${intervalMin} min`);
    }

    // ── Contacts helpers ──────────────────────────────────────────────────────

    private async refreshContacts(): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const contactsService = this.icloud.getService('contacts');
            const isFirstCall = !this.contactsSyncMapLoaded;

            // On first call: restore syncMap from the contacts object's native
            if (isFirstCall) {
                this.contactsSyncMapLoaded = true;
                try {
                    const obj = await this.getObjectAsync('contacts');
                    const syncMap = (obj?.native as { syncMap?: unknown } | undefined)?.syncMap;
                    if (syncMap && typeof syncMap === 'object' && (syncMap as { syncToken?: string }).syncToken) {
                        contactsService.loadSyncMap(syncMap as ContactsSyncMap);
                        this.log.debug(
                            `Contacts: restored syncMap (${contactsService.contacts.length} contact(s), syncToken present)`,
                        );
                    }
                } catch {
                    // Object doesn't exist yet — fresh install, full sync will follow
                }
            }

            const changed = await contactsService.refresh();

            // Persist syncMap only when data actually changed
            if (changed) {
                const contactsObj = await this.getObjectAsync('contacts');
                await this.setObject('contacts', {
                    ...(contactsObj ?? {}),
                    type: 'folder',
                    common: { ...((contactsObj?.common ?? {}) as ioBroker.OtherCommon), name: 'Contacts' },
                    native: { syncMap: contactsService.exportSyncMap() },
                } as ioBroker.FolderObject);
            }

            // First call: always write states (data comes from restored syncMap even if delta was empty)
            if (!changed && !isFirstCall) {
                this.log.debug('Contacts refresh: no changes, skipping state updates');
                return;
            }

            // Always write metadata states (count, groupCount, lastSync)
            await this.writeContactsMetaStates(contactsService);

            // Write per-contact detail states only if enabled; clean up if disabled
            if (this.config.contactsWriteStates) {
                await this.writeContactStates(contactsService);
            } else if (isFirstCall) {
                // On first call with disabled states: remove any leftover contact objects
                await this.cleanupContactsObjects(new Set());
            }

            if (isFirstCall) {
                this.log.info(
                    `Contacts ready — ${contactsService.contacts.length} contact(s), ${contactsService.groups.length} group(s)`,
                );
            }
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            this.log.warn(`Contacts refresh failed: ${msg}`);
        }
    }

    private async persistContactsSyncMap(): Promise<void> {
        if (!this.icloud || !this.contactsSyncMapLoaded) {
            return;
        }
        try {
            const contactsService = this.icloud.getService('contacts');
            const contactsObj = await this.getObjectAsync('contacts');
            await this.setObject('contacts', {
                ...(contactsObj ?? {}),
                type: 'folder',
                common: { ...((contactsObj?.common ?? {}) as ioBroker.OtherCommon), name: 'Contacts' },
                native: { syncMap: contactsService.exportSyncMap() },
            } as ioBroker.FolderObject);
        } catch {
            // Best effort on shutdown
        }
    }

    private async writeContactsMetaStates(contactsService: iCloudContactsService): Promise<void> {
        await this.extendObject('contacts', {
            type: 'folder',
            common: { name: 'Contacts' },
            native: {},
        });
        await this.extendObject('contacts.count', {
            type: 'state',
            common: { name: 'Contact count', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('contacts.groupCount', {
            type: 'state',
            common: { name: 'Group count', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('contacts.lastSync', {
            type: 'state',
            common: { name: 'Last Sync', type: 'number', role: 'value.time', read: true, write: false },
            native: {},
        });
        await this.setStateIfChanged('contacts.count', contactsService.contacts.length);
        await this.setStateIfChanged('contacts.groupCount', contactsService.groups.length);
        await this.setState('contacts.lastSync', Date.now(), true);
    }

    private async writeContactStates(contactsService: iCloudContactsService): Promise<void> {
        const contacts = contactsService.contacts;

        // Stable ID: use contactId directly (sanitized)
        const activeContactIds = new Set<string>();
        for (const contact of contacts) {
            const safeId = this.sanitizeCalendarId(contact.contactId);
            activeContactIds.add(safeId);

            const displayCity = contact.city ? ` (${contact.city})` : '';
            const displayName = `${contact.fullName || contact.companyName || contact.contactId}${displayCity}`;

            await this.extendObject(`contacts.${safeId}`, {
                type: 'folder',
                common: { name: displayName },
                native: { contactId: contact.contactId },
            });

            for (const s of CONTACT_ITEM_STATES) {
                await this.extendObject(`contacts.${safeId}.${s.id}`, {
                    type: 'state',
                    common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
                    native: {},
                });
            }

            await this.setStateIfChanged(`contacts.${safeId}.contactId`, contact.contactId);
            await this.setStateIfChanged(`contacts.${safeId}.fullName`, contact.fullName);
            await this.setStateIfChanged(`contacts.${safeId}.firstName`, contact.firstName);
            await this.setStateIfChanged(`contacts.${safeId}.lastName`, contact.lastName);
            await this.setStateIfChanged(`contacts.${safeId}.companyName`, contact.companyName);
            await this.setStateIfChanged(`contacts.${safeId}.nickname`, contact.nickname);
            await this.setStateIfChanged(`contacts.${safeId}.birthday`, contact.birthday);
            await this.setStateIfChanged(`contacts.${safeId}.jobTitle`, contact.jobTitle);
            await this.setStateIfChanged(`contacts.${safeId}.department`, contact.department);
            await this.setStateIfChanged(`contacts.${safeId}.city`, contact.city);
            await this.setStateIfChanged(`contacts.${safeId}.phones`, JSON.stringify(contact.phones));
            await this.setStateIfChanged(`contacts.${safeId}.emails`, JSON.stringify(contact.emails));
            await this.setStateIfChanged(`contacts.${safeId}.streetAddresses`, JSON.stringify(contact.streetAddresses));
            await this.setStateIfChanged(`contacts.${safeId}.notes`, contact.notes);
            await this.setStateIfChanged(`contacts.${safeId}.groups`, JSON.stringify(contact.groups));
            await this.setStateIfChanged(`contacts.${safeId}.isMe`, contact.isMe);
        }

        // Cleanup contacts that no longer exist
        await this.cleanupContactsObjects(activeContactIds);
        this.log.debug(`Contacts refresh done — ${contacts.length} contact(s) written to states`);
    }

    private async cleanupContactsObjects(activeContactIds: Set<string>): Promise<void> {
        const prefix = `${this.namespace}.contacts.`;
        const existing = await this.getObjectViewAsync('system', 'folder', {
            startkey: prefix,
            endkey: `${prefix}\u9999`,
        });
        for (const row of existing.rows) {
            const suffix = row.id.slice(prefix.length);
            const parts = suffix.split('.');
            // Skip built-in meta entries
            const META_IDS = new Set(['lastSync', 'count', 'groupCount']);
            if (parts.length === 1 && !META_IDS.has(parts[0])) {
                if (!activeContactIds.has(parts[0])) {
                    this.log.info(`Contacts cleanup: removing contact "${parts[0]}"`);
                    await this.delObjectAsync(row.id, { recursive: true });
                }
            }
        }
    }

    private scheduleContactsRefresh(): void {
        if (this.contactsRefreshTimer) {
            this.clearTimeout(this.contactsRefreshTimer);
            this.contactsRefreshTimer = null;
        }
        let intervalMin = Math.floor(this.config.contactsInterval ?? 60);
        if (!Number.isFinite(intervalMin) || intervalMin < 30) {
            this.log.warn(
                `Contacts interval is ${this.config.contactsInterval} — value below 30 minutes, falling back to 60 minutes`,
            );
            intervalMin = 60;
        } else if (intervalMin > 1440) {
            this.log.warn(`Contacts interval is ${intervalMin} minutes — clamping to 1440 minutes`);
            intervalMin = 1440;
        }
        const INTERVAL_MS = intervalMin * 60 * 1000;
        const schedule = (): void => {
            this.contactsRefreshTimer = this.setTimeout(async () => {
                this.contactsRefreshTimer = null;
                if (!this.icloud) {
                    return;
                }
                this.log.debug('Contacts scheduled refresh starting...');
                await this.refreshContacts();
                schedule();
            }, INTERVAL_MS);
        };
        schedule();
        this.log.debug(`Contacts refresh scheduled every ${intervalMin} min`);
    }

    // ── Notes helpers ─────────────────────────────────────────────────────────

    private async refreshNotes(): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const notesService = this.icloud.getService('notes');
            const isFirstCall = !this.notesSyncMapLoaded;

            // On first call: restore syncMap from the notes object's native
            if (isFirstCall) {
                this.notesSyncMapLoaded = true;
                try {
                    const obj = await this.getObjectAsync('notes');
                    const syncMap = (obj?.native as { syncMap?: unknown } | undefined)?.syncMap;
                    if (syncMap && typeof syncMap === 'object' && (syncMap as { syncToken?: string }).syncToken) {
                        notesService.loadSyncMap(syncMap as NotesSyncMap);
                        this.log.debug(
                            `Notes: restored syncMap (${notesService.notes.length} note(s), syncToken present)`,
                        );
                    }
                } catch {
                    // Object doesn't exist yet — fresh install, full sync will follow
                }
            }

            const changed = await notesService.refresh();

            // Persist syncMap only when data actually changed
            if (changed) {
                const notesObj = await this.getObjectAsync('notes');
                await this.setObject('notes', {
                    ...(notesObj ?? {}),
                    type: 'folder',
                    common: { ...((notesObj?.common ?? {}) as ioBroker.OtherCommon), name: 'Notes' },
                    native: { syncMap: notesService.exportSyncMap() },
                } as ioBroker.FolderObject);
            }

            // First call: always write states; subsequent calls: skip if no changes
            if (!changed && !isFirstCall) {
                this.log.debug('Notes refresh: no changes, skipping state updates');
                return;
            }

            await this.writeNotesStates(notesService);
            if (isFirstCall) {
                this.log.info(
                    `Notes ready — ${notesService.notes.length} note(s), ${notesService.folders.length} folder(s)`,
                );
            }
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            this.log.warn(`Notes refresh failed: ${msg}`);
        }
    }

    private async persistNotesSyncMap(): Promise<void> {
        if (!this.icloud || !this.notesSyncMapLoaded) {
            return;
        }
        try {
            const notesService = this.icloud.getService('notes');
            const notesObj = await this.getObjectAsync('notes');
            await this.setObject('notes', {
                ...(notesObj ?? {}),
                type: 'folder',
                common: { ...((notesObj?.common ?? {}) as ioBroker.OtherCommon), name: 'Notes' },
                native: { syncMap: notesService.exportSyncMap() },
            } as ioBroker.FolderObject);
        } catch {
            // Best effort on shutdown
        }
    }

    private async writeNotesStates(notesService: iCloudNotesService): Promise<void> {
        const notes = notesService.notes;

        await this.extendObject('notes', {
            type: 'folder',
            common: { name: 'Notes' },
            native: {},
        });
        await this.extendObject('notes.count', {
            type: 'state',
            common: { name: 'Note count', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('notes.folderCount', {
            type: 'state',
            common: { name: 'Folder count', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('notes.lastSync', {
            type: 'state',
            common: { name: 'Last Sync', type: 'number', role: 'value.time', read: true, write: false },
            native: {},
        });
        await this.extendObject('notes.list', {
            type: 'state',
            common: { name: 'Notes (JSON)', type: 'string', role: 'json', read: true, write: false },
            native: {},
        });
        await this.extendObject('notes.textList', {
            type: 'state',
            common: { name: 'Notes text (string array JSON)', type: 'string', role: 'json', read: true, write: false },
            native: {},
        });

        // Build JSON array with note metadata
        const notesList = notes.map(n => ({
            id: n.id,
            title: n.title,
            snippet: n.snippet,
            folderId: n.folderId,
            folderName: n.folderName,
            modifiedDate: n.modifiedDate,
            isLocked: n.isLocked,
            text: n.text,
        }));
        // Sort by modified date descending (newest first)
        notesList.sort((a, b) => (b.modifiedDate ?? 0) - (a.modifiedDate ?? 0));

        // Build plain text array (only non-locked notes with text)
        const textList: string[] = notes
            .filter(n => n.text && !n.isLocked)
            .sort((a, b) => (b.modifiedDate ?? 0) - (a.modifiedDate ?? 0))
            .map(n => n.text as string);

        await this.setStateIfChanged('notes.count', notes.length);
        await this.setStateIfChanged('notes.folderCount', notesService.folders.length);
        await this.setStateIfChanged('notes.list', JSON.stringify(notesList));
        await this.setStateIfChanged('notes.textList', JSON.stringify(textList));
        await this.setState('notes.lastSync', Date.now(), true);

        this.log.debug(`Notes refresh done — ${notes.length} note(s), ${notesService.folders.length} folder(s)`);
    }

    private scheduleNotesRefresh(): void {
        if (this.notesRefreshTimer) {
            this.clearTimeout(this.notesRefreshTimer);
            this.notesRefreshTimer = null;
        }
        let intervalMin = Math.floor(this.config.notesInterval ?? 60);
        if (!Number.isFinite(intervalMin) || intervalMin < 15) {
            this.log.warn(
                `Notes interval is ${this.config.notesInterval} — value below 15 minutes, falling back to 60 minutes`,
            );
            intervalMin = 60;
        } else if (intervalMin > 1440) {
            this.log.warn(`Notes interval is ${intervalMin} minutes — clamping to 1440 minutes`);
            intervalMin = 1440;
        }
        const INTERVAL_MS = intervalMin * 60 * 1000;
        const schedule = (): void => {
            this.notesRefreshTimer = this.setTimeout(async () => {
                this.notesRefreshTimer = null;
                if (!this.icloud) {
                    return;
                }
                this.log.debug('Notes scheduled refresh starting...');
                await this.refreshNotes();
                schedule();
            }, INTERVAL_MS);
        };
        schedule();
        this.log.debug(`Notes refresh scheduled every ${intervalMin} min`);
    }

    // ── Photos helpers ────────────────────────────────────────────────────────

    private async refreshPhotos(): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const photosService = this.icloud.getService('photos');

            // On first load: check indexing state
            if (this.photosFirstLoad) {
                const ready = await photosService.checkIndexingState();
                if (!ready) {
                    this.log.warn('Photos: library is still indexing — metadata may be incomplete');
                }
            }

            await this.writePhotosStates(photosService);

            if (this.photosFirstLoad) {
                this.photosFirstLoad = false;
            }
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            this.log.warn(`Photos refresh failed: ${msg}`);
        }
    }

    private async writePhotosStates(photosService: iCloudPhotosService): Promise<void> {
        await this.extendObject('photos', {
            type: 'channel',
            common: { name: 'iCloud Photos' },
            native: {},
        });
        await this.extendObject('photos.lastSync', {
            type: 'state',
            common: { name: 'Last Sync', type: 'number', role: 'value.time', read: true, write: false },
            native: {},
        });
        await this.extendObject('photos.albumCount', {
            type: 'state',
            common: { name: 'Album Count', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('photos.photoCount', {
            type: 'state',
            common: { name: 'Total Photos', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('photos.videoCount', {
            type: 'state',
            common: { name: 'Total Videos', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('photos.favoriteCount', {
            type: 'state',
            common: { name: 'Favorites', type: 'number', role: 'value', read: true, write: false },
            native: {},
        });
        await this.extendObject('photos.albums', {
            type: 'state',
            common: { name: 'Albums (JSON)', type: 'string', role: 'json', read: true, write: false },
            native: {},
        });

        const summaries = await photosService.getAlbumSummaries();
        const albumCount = summaries.length;

        // Extract counts from smart albums
        let photoCount = 0;
        let videoCount = 0;
        let favoriteCount = 0;
        for (const s of summaries) {
            if (s.name === 'All Photos') {
                photoCount = s.photoCount;
            } else if (s.name === 'Videos') {
                videoCount = s.photoCount;
            } else if (s.name === 'Favorites') {
                favoriteCount = s.photoCount;
            }
        }

        await this.setStateIfChanged('photos.albumCount', albumCount);
        await this.setStateIfChanged('photos.photoCount', photoCount);
        await this.setStateIfChanged('photos.videoCount', videoCount);
        await this.setStateIfChanged('photos.favoriteCount', favoriteCount);
        await this.setStateIfChanged(
            'photos.albums',
            JSON.stringify(summaries.map(s => ({ name: s.name, photoCount: s.photoCount }))),
        );
        await this.setState('photos.lastSync', Date.now(), true);

        if (this.photosFirstLoad) {
            this.log.info(
                `Photos ready — ${albumCount} album(s), ${photoCount} photo(s), ${videoCount} video(s), ${favoriteCount} favorite(s)`,
            );
        } else {
            this.log.debug(`Photos refresh done — ${albumCount} album(s), ${photoCount} photo(s)`);
        }
    }

    private schedulePhotosRefresh(): void {
        if (this.photosRefreshTimer) {
            this.clearTimeout(this.photosRefreshTimer);
            this.photosRefreshTimer = null;
        }
        let intervalMin = Math.floor(this.config.photosInterval ?? 60);
        if (!Number.isFinite(intervalMin) || intervalMin < 15) {
            this.log.warn(
                `Photos interval is ${this.config.photosInterval} — value below 15 minutes, falling back to 60 minutes`,
            );
            intervalMin = 60;
        } else if (intervalMin > 1440) {
            this.log.warn(`Photos interval is ${intervalMin} minutes — clamping to 1440 minutes`);
            intervalMin = 1440;
        }
        const INTERVAL_MS = intervalMin * 60 * 1000;
        const schedule = (): void => {
            this.photosRefreshTimer = this.setTimeout(async () => {
                this.photosRefreshTimer = null;
                if (!this.icloud) {
                    return;
                }
                this.log.debug('Photos scheduled refresh starting...');
                // Reset cached albums to force fresh data
                this.icloud.getService('photos').resetAlbums();
                await this.refreshPhotos();
                schedule();
            }, INTERVAL_MS);
        };
        schedule();
        this.log.debug(`Photos refresh scheduled every ${intervalMin} min`);
    }

    // ── iCloud Drive helpers ──────────────────────────────────────────────────

    private async refreshDrive(): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const driveService = this.icloud.getService('drivews');
            const root = await driveService.getNode();
            await this.writeDriveStates(root);
            if (this.driveFirstLoad) {
                this.driveFirstLoad = false;
                this.log.info(
                    `Drive ready — ${root.directChildrenCount ?? 0} root item(s), ${root.fileCount ?? 0} file(s) total`,
                );
            }
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            this.log.warn(`Drive refresh failed: ${msg}`);
        }
    }

    private async writeDriveStates(root: iCloudDriveNode): Promise<void> {
        await this.extendObject('drive', {
            type: 'channel',
            common: { name: 'iCloud Drive' },
            native: {},
        });
        await this.extendObject('drive.lastSync', {
            type: 'state',
            common: {
                name: 'Last Sync',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
            },
            native: {},
        });

        const vals: Record<string, ioBroker.StateValue> = {
            name: root.name ?? 'root',
            docwsid: root.docwsid ?? '',
            drivewsid: root.nodeId ?? '',
            fileCount: root.fileCount ?? 0,
            directChildrenCount: root.directChildrenCount ?? 0,
            dateCreated: root.dateCreated ? root.dateCreated.getTime() : 0,
            etag: root.etag ?? '',
            lastRefresh: Date.now(),
        };

        for (const s of DRIVE_ROOT_STATES) {
            await this.extendObject(`drive.${s.id}`, {
                type: 'state',
                common: { name: s.name, type: s.type, role: s.role, read: true, write: false },
                native: {},
            });
            const v = vals[s.id];
            if (v !== undefined) {
                await this.setStateIfChanged(`drive.${s.id}`, v);
            }
        }

        // Write root children as JSON summary (one state, avoids hundreds of objects)
        await this.extendObject('drive.rootItems', {
            type: 'state',
            common: { name: 'Root Items (JSON)', type: 'string', role: 'json', read: true, write: false },
            native: {},
        });
        const items = (root.items ?? []).map((item: iCloudDriveItem) => ({
            name: item.extension ? `${item.name}.${item.extension}` : item.name,
            type: item.type,
            drivewsid: item.drivewsid,
            docwsid: item.docwsid,
            size: item.size ?? 0,
            dateModified: item.dateModified ? new Date(item.dateModified as unknown as string).getTime() : null,
            etag: item.etag,
        }));
        await this.setStateIfChanged('drive.rootItems', JSON.stringify(items));
        await this.setState('drive.lastSync', Date.now(), true);
    }

    private getDriveService(): iCloudDriveService {
        if (!this.icloud) {
            throw new Error('iCloud not connected');
        }
        return this.icloud.getService('drivews');
    }

    // ── Account Storage helpers ───────────────────────────────────────────────

    private async refreshAccountStorage(): Promise<void> {
        if (!this.icloud) {
            return;
        }
        try {
            const storage = await this.icloud.getStorageUsage(true);
            const info = storage.storageUsageInfo;
            const quota = storage.quotaStatus;

            const used = info.usedStorageInBytes ?? 0;
            const total = info.totalStorageInBytes ?? 0;
            const available = total - used;
            const usedPercent = total > 0 ? Math.round((used / total) * 1000) / 10 : 0;

            const toMB = (bytes: number): number => Math.round(bytes / 1024 / 1024);

            await this.extendObject('account.storage.lastSync', {
                type: 'state',
                common: {
                    name: 'Last Sync',
                    type: 'number',
                    role: 'value.time',
                    read: true,
                    write: false,
                },
                native: {},
            });
            await this.setStateIfChanged('account.storage.usedMB', toMB(used));
            await this.setStateIfChanged('account.storage.totalMB', toMB(total));
            await this.setStateIfChanged('account.storage.availableMB', toMB(available));
            await this.setStateIfChanged('account.storage.usedPercent', usedPercent);
            await this.setStateIfChanged('account.storage.overQuota', quota.overQuota ?? false);
            await this.setStateIfChanged('account.storage.almostFull', quota['almost-full'] ?? false);
            await this.setStateIfChanged('account.storage.paidQuota', quota.paidQuota ?? false);

            for (const media of storage.storageUsageByMedia ?? []) {
                const rawKey = media.mediaKey ?? '';
                if (!rawKey) {
                    continue;
                }
                const mediaStateId = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
                await this.extendObject(`account.storage.byMedia.${mediaStateId}`, {
                    type: 'state',
                    common: {
                        name: media.displayLabel ?? rawKey,
                        type: 'number',
                        role: 'value',
                        unit: 'MB',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.setStateIfChanged(
                    `account.storage.byMedia.${mediaStateId}`,
                    media.usageInBytes != null ? toMB(media.usageInBytes) : null,
                );
            }

            // family storage
            const fam = storage.familyStorageUsageInfo;
            if (fam) {
                await this.extendObject('account.storage.family.totalMB', {
                    type: 'state',
                    common: {
                        name: 'Family Total Storage',
                        type: 'number',
                        role: 'value',
                        unit: 'MB',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.setStateIfChanged('account.storage.family.totalMB', toMB(fam.usageInBytes ?? 0));

                for (const member of fam.familyMembers ?? []) {
                    const memberId = (member.id ?? member.dsid?.toString() ?? '').replace(/[^a-z0-9]/gi, '_');
                    if (!memberId) {
                        continue;
                    }
                    await this.extendObject(`account.storage.family.${memberId}`, {
                        type: 'state',
                        common: {
                            name: member.fullName ?? member.appleId ?? memberId,
                            type: 'number',
                            role: 'value',
                            unit: 'MB',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    await this.setStateIfChanged(
                        `account.storage.family.${memberId}`,
                        member.usageInBytes != null ? toMB(member.usageInBytes) : null,
                    );
                }
            }

            await this.setState('account.storage.lastSync', Date.now(), true);
            if (this.accountStorageFirstLoad) {
                this.accountStorageFirstLoad = false;
                const quotaNote = quota.overQuota ? ' — OVER QUOTA' : quota['almost-full'] ? ' — almost full' : '';
                this.log.info(
                    `Account storage ready — ${toMB(used)} / ${toMB(total)} MB used (${usedPercent}%)${quotaNote}`,
                );
            } else {
                this.log.debug(`Account storage: ${toMB(used)} / ${toMB(total)} MB (${usedPercent}%)`);
            }
        } catch (err) {
            this.log.warn(`Account storage refresh failed: ${(err as Error)?.message ?? String(err)}`);
        }
    }

    private scheduleAccountStorageRefresh(): void {
        if (this.accountStorageRefreshTimer) {
            this.clearTimeout(this.accountStorageRefreshTimer);
            this.accountStorageRefreshTimer = null;
        }
        let intervalMin = Math.floor(this.config.accountStorageInterval ?? 60);
        if (!Number.isFinite(intervalMin) || intervalMin < 30) {
            this.log.warn(
                `Account storage interval is ${this.config.accountStorageInterval} — value below 30 minutes, falling back to 60 minutes`,
            );
            intervalMin = 60;
        } else if (intervalMin > 1440) {
            this.log.warn(`Account storage interval is ${intervalMin} minutes — clamping to 1440 minutes`);
            intervalMin = 1440;
        }
        const INTERVAL_MS = intervalMin * 60 * 1000;
        const schedule = (): void => {
            this.accountStorageRefreshTimer = this.setTimeout(async () => {
                this.accountStorageRefreshTimer = null;
                if (!this.icloud) {
                    return;
                }
                this.log.debug('Account storage scheduled refresh starting...');
                await this.refreshAccountStorage();
                schedule();
            }, INTERVAL_MS);
        };
        schedule();
        this.log.debug(`Account storage refresh scheduled every ${intervalMin} min`);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback - Callback function
     */
    private onUnload(callback: () => void): void {
        const persistAndCleanup = async (): Promise<void> => {
            // Persist reminders syncMap on shutdown
            await this.persistRemindersSyncMap();
            // Persist contacts syncMap on shutdown
            await this.persistContactsSyncMap();
            // Persist notes syncMap on shutdown
            await this.persistNotesSyncMap();
        };

        persistAndCleanup()
            .catch(() => {
                // Best effort
            })
            .finally(() => {
                try {
                    if (this.findMyRefreshTimer) {
                        this.clearTimeout(this.findMyRefreshTimer);
                        this.findMyRefreshTimer = null;
                    }
                    if (this.calendarRefreshTimer) {
                        this.clearTimeout(this.calendarRefreshTimer);
                        this.calendarRefreshTimer = null;
                    }
                    if (this.remindersRefreshTimer) {
                        this.clearTimeout(this.remindersRefreshTimer);
                        this.remindersRefreshTimer = null;
                    }
                    if (this.contactsRefreshTimer) {
                        this.clearTimeout(this.contactsRefreshTimer);
                        this.contactsRefreshTimer = null;
                    }
                    if (this.notesRefreshTimer) {
                        this.clearTimeout(this.notesRefreshTimer);
                        this.notesRefreshTimer = null;
                    }
                    if (this.photosRefreshTimer) {
                        this.clearTimeout(this.photosRefreshTimer);
                        this.photosRefreshTimer = null;
                    }
                    if (this.driveRefreshTimer) {
                        this.clearTimeout(this.driveRefreshTimer);
                        this.driveRefreshTimer = null;
                    }
                    if (this.driveSyncTimer) {
                        this.clearTimeout(this.driveSyncTimer);
                        this.driveSyncTimer = null;
                    }
                    if (this.accountStorageRefreshTimer) {
                        this.clearTimeout(this.accountStorageRefreshTimer);
                        this.accountStorageRefreshTimer = null;
                    }
                    if (this.icloud) {
                        this.icloud.removeAllListeners();
                        this.icloud = null;
                    }
                } catch {
                    // ignore
                }
                callback();
            });
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
            //this.log.debug(`State update (ack=true, ignoring): ${id} = ${state.val}`);
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

        if (id === `${this.namespace}.mfa.requestSmsCode` && state.val === true) {
            if (!this.icloud) {
                this.log.warn('SMS request received but iCloud service is not initialized');
                return;
            }
            if (this.icloud.status !== 'MfaRequested') {
                this.log.warn(`SMS request received but iCloud status is "${this.icloud.status}" — not in MFA state`);
                return;
            }
            this.log.info('Requesting MFA code via SMS...');
            this.icloud
                .requestSmsMfaCode()
                .then(() => {
                    this.log.info('SMS code requested — check your phone and enter the code into mfa.code');
                })
                .catch((err: unknown) => {
                    this.log.error(`Failed to request SMS code: ${(err as Error)?.message ?? String(err)}`);
                });
            void this.setState('mfa.requestSmsCode', false, true);
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

        // reminders.*.XXXXXX.completed — toggle completed state
        const reminderCompletedMatch = id.match(/^[^.]+\.[^.]+\.reminders\.([^.]+)\.(\d{6})\.completed$/);
        if (reminderCompletedMatch) {
            if (!this.icloud) {
                this.log.warn('Reminder completed toggle received but iCloud is not initialized');
                return;
            }
            const listFolder = reminderCompletedMatch[1];
            const slotId = reminderCompletedMatch[2];
            const completed = !!state.val;

            // Resolve reminder ID from the slot's id state
            this.getStateAsync(`reminders.${listFolder}.${slotId}.id`)
                .then(async idState => {
                    const reminderId = idState?.val as string | undefined;
                    if (!reminderId) {
                        this.log.warn(`Reminder completed: no reminder ID in slot ${listFolder}.${slotId}`);
                        return;
                    }
                    try {
                        const remService = this.icloud!.getService('reminders');
                        await remService.completeReminder(reminderId, completed);
                        this.log.info(`Reminder ${reminderId} marked as ${completed ? 'completed' : 'uncompleted'}`);
                        // Resync to update states
                        await this.refreshReminders();
                    } catch (err) {
                        this.log.error(`Failed to set reminder completed: ${(err as Error)?.message ?? String(err)}`);
                    }
                })
                .catch((err: unknown) => {
                    this.log.error(`Failed to resolve reminder ID: ${(err as Error)?.message ?? String(err)}`);
                });
        }
    }

    /**
     * Is called if a message is sent to this instance.
     *
     * @param obj - Message object
     */
    private onMessage(obj: ioBroker.Message): void {
        if (typeof obj !== 'object') {
            return;
        }
        // Some commands (e.g. getDevices) send no payload — only reject truly absent messages
        // for commands that require one.
        const requiresPayload = [
            'submitMfa',
            'createReminder',
            'completeReminder',
            'updateReminder',
            'deleteReminder',
            'createCalendarEvent',
            'updateCalendarEvent',
            'deleteCalendarEvent',
        ];
        if (!obj.message && requiresPayload.includes(obj.command)) {
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
        } else if (obj.command === 'createReminder') {
            this.handleCreateReminder(obj);
        } else if (obj.command === 'completeReminder') {
            this.handleCompleteReminder(obj);
        } else if (obj.command === 'updateReminder') {
            this.handleUpdateReminder(obj);
        } else if (obj.command === 'deleteReminder') {
            this.handleDeleteReminder(obj);
        } else if (obj.command === 'getReminders') {
            this.handleGetReminders(obj);
        } else if (obj.command === 'getReminderLists') {
            this.handleGetReminderLists(obj);
        } else if (obj.command === 'driveListFolder') {
            this.handleDriveListFolder(obj);
        } else if (obj.command === 'driveGetMetadata') {
            this.handleDriveGetMetadata(obj);
        } else if (obj.command === 'driveGetFile') {
            this.handleDriveGetFile(obj);
        } else if (obj.command === 'driveUploadFile') {
            this.handleDriveUploadFile(obj);
        } else if (obj.command === 'driveCreateFolder') {
            this.handleDriveCreateFolder(obj);
        } else if (obj.command === 'driveDeleteItem') {
            this.handleDriveDeleteItem(obj);
        } else if (obj.command === 'driveRenameItem') {
            this.handleDriveRenameItem(obj);
        } else if (obj.command === 'getContacts') {
            this.handleGetContacts(obj);
        } else if (obj.command === 'getContactGroups') {
            this.handleGetContactGroups(obj);
        } else if (obj.command === 'photosGetAlbums') {
            this.handlePhotosGetAlbums(obj);
        } else if (obj.command === 'photosGetPhotos') {
            this.handlePhotosGetPhotos(obj);
        } else if (obj.command === 'photosDownload') {
            this.handlePhotosDownload(obj);
        } else if (obj.command === 'photosDelete') {
            this.handlePhotosDelete(obj);
        } else if (obj.command === 'resetRemindersSyncMap') {
            this.handleResetRemindersSyncMap(obj);
        } else if (obj.command === 'getDevices') {
            this.handleGetDevices(obj);
        } else if (obj.command === 'getCalendars') {
            this.handleGetCalendars(obj);
        } else if (obj.command === 'getCalendarEvents') {
            this.handleGetCalendarEvents(obj);
        } else if (obj.command === 'createCalendarEvent') {
            this.handleCreateCalendarEvent(obj);
        } else if (obj.command === 'updateCalendarEvent') {
            this.handleUpdateCalendarEvent(obj);
        } else if (obj.command === 'deleteCalendarEvent') {
            this.handleDeleteCalendarEvent(obj);
        } else if (obj.command === 'driveSyncGetBackitupInfo') {
            this.handleDriveSyncGetBackitupInfo(obj);
        } else if (obj.command === 'driveSyncGetStatus') {
            this.handleDriveSyncGetStatus(obj);
        } else if (obj.command === 'driveSyncResolveConflict') {
            this.handleDriveSyncResolveConflict(obj);
        }
    }

    // ── onMessage FindMy handlers ────────────────────────────────────────────

    /**
     * Returns the list of all known FindMy devices (from last refresh) for the admin UI.
     * Each device includes: id, name, model, batteryLevel, distanceKm, owner.
     *
     * @param obj The ioBroker message object from the message handler.
     */
    private handleGetDevices(obj: ioBroker.Message): void {
        if (!this.icloud || this.icloud.status !== iCloudServiceStatus.Ready) {
            this.sendCallback(obj, { alive: false, devices: [] });
            return;
        }
        const findMe = this.icloud.getService('findme');
        const locationPoints: Array<{ lat: number; lon: number }> = [];
        if (Array.isArray(this.config.locationPoints)) {
            for (const lp of this.config.locationPoints) {
                if (lp.latitude != null && lp.longitude != null) {
                    locationPoints.push({ lat: lp.latitude, lon: lp.longitude });
                    break; // only first for home distance
                }
            }
        }
        const result: Array<{
            id: string;
            name: string;
            model: string;
            batteryLevel: number;
            distanceKm: number | null;
            owner: string | null;
        }> = [];
        for (const [, dev] of findMe.devices) {
            const d = dev.deviceInfo;
            const loc = d.location;
            const distKm =
                loc && locationPoints.length > 0
                    ? Math.round(
                          haversineKm(locationPoints[0].lat, locationPoints[0].lon, loc.latitude, loc.longitude) * 1000,
                      ) / 1000
                    : null;
            let owner: string | null = null;
            if (d.prsId != null) {
                const memberInfo = findMe.membersInfo[d.prsId];
                owner = memberInfo ? `${memberInfo.firstName} ${memberInfo.lastName}`.trim() : String(d.prsId);
            }
            result.push({
                id: d.id ?? '',
                name: d.name ?? d.deviceDisplayName ?? '',
                model: d.modelDisplayName ?? d.rawDeviceModel ?? '',
                batteryLevel: d.batteryLevel != null ? Math.round(d.batteryLevel * 100) : -1,
                distanceKm: distKm,
                owner,
            });
        }
        this.sendCallback(obj, { alive: true, devices: result });
    }

    // ── onMessage Reminder handlers ───────────────────────────────────────────

    private handleResetRemindersSyncMap(obj: ioBroker.Message): void {
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'Adapter not connected to iCloud' });
            return;
        }
        const remService = this.icloud.getService('reminders');
        remService.resetSyncMap();
        this.remindersSyncMapLoaded = false;
        // Persist the cleared map so the next startup also does a full sync
        this.extendObject('reminders', {
            type: 'folder',
            common: { name: 'Reminders' },
            native: { syncMap: remService.exportSyncMap() },
        })
            .then(() => {
                this.log.info('Reminders sync map reset — triggering full resync');
                return this.refreshReminders();
            })
            .then(() => {
                this.sendCallback(obj, { success: true });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleCreateReminder(obj: ioBroker.Message): void {
        if (!this.config.remindersEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Reminders are disabled — enable them in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const listId = msg.listId as string | undefined;
        const title = msg.title as string | undefined;
        if (!listId || !title) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required fields missing: "listId" and "title" are mandatory',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const remService = this.icloud.getService('reminders');
        remService
            .createReminder({
                listId,
                title,
                description: (msg.description as string) ?? undefined,
                completed: (msg.completed as boolean) ?? undefined,
                dueDate: (msg.dueDate as number) ?? undefined,
                priority: (msg.priority as number) ?? undefined,
                flagged: (msg.flagged as boolean) ?? undefined,
                allDay: (msg.allDay as boolean) ?? undefined,
            })
            .then(async reminder => {
                await this.refreshReminders();
                this.sendCallback(obj, { success: true, reminder });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleCompleteReminder(obj: ioBroker.Message): void {
        if (!this.config.remindersEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Reminders are disabled — enable them in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const reminderId = msg.reminderId as string | undefined;
        if (!reminderId) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required field missing: "reminderId" is mandatory',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const completed = msg.completed !== false; // default true
        const remService = this.icloud.getService('reminders');
        remService
            .completeReminder(reminderId, completed)
            .then(async () => {
                await this.refreshReminders();
                this.sendCallback(obj, { success: true });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleUpdateReminder(obj: ioBroker.Message): void {
        if (!this.config.remindersEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Reminders are disabled — enable them in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const reminderId = msg.reminderId as string | undefined;
        if (!reminderId) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required field missing: "reminderId" is mandatory',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const remService = this.icloud.getService('reminders');
        const reminder = remService.getReminder(reminderId);
        if (!reminder) {
            this.sendCallback(obj, { success: false, error: `Reminder not found: ${reminderId}` });
            return;
        }

        // Apply provided fields
        if (msg.title !== undefined) {
            reminder.title = `${msg.title as string}`;
        }
        if (msg.description !== undefined) {
            reminder.description = `${msg.description as string}`;
        }
        if (msg.completed !== undefined) {
            reminder.completed = !!msg.completed;
            reminder.completedDate = reminder.completed ? Date.now() : null;
        }
        if (msg.dueDate !== undefined) {
            reminder.dueDate = msg.dueDate as number | null;
        }
        if (msg.priority !== undefined) {
            reminder.priority = Number(msg.priority) || 0;
        }
        if (msg.flagged !== undefined) {
            reminder.flagged = !!msg.flagged;
        }
        if (msg.allDay !== undefined) {
            reminder.allDay = !!msg.allDay;
        }

        remService
            .updateReminder(reminder)
            .then(async () => {
                await this.refreshReminders();
                this.sendCallback(obj, { success: true, reminder });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleDeleteReminder(obj: ioBroker.Message): void {
        if (!this.config.remindersEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Reminders are disabled — enable them in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const reminderId = msg.reminderId as string | undefined;
        if (!reminderId) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required field missing: "reminderId" is mandatory',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const remService = this.icloud.getService('reminders');
        remService
            .deleteReminder(reminderId)
            .then(async () => {
                await this.refreshReminders();
                this.sendCallback(obj, { success: true });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleGetReminders(obj: ioBroker.Message): void {
        if (!this.config.remindersEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Reminders are disabled — enable them in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        const listId = (msg && typeof msg === 'object' ? msg.listId : undefined) as string | undefined;
        const remService = this.icloud.getService('reminders');
        let reminders: Reminder[];
        if (listId) {
            reminders = remService.remindersByList.get(listId) ?? [];
        } else {
            reminders = remService.getAllReminders();
        }
        this.sendCallback(obj, { success: true, reminders });
    }

    private handleGetReminderLists(obj: ioBroker.Message): void {
        if (!this.config.remindersEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Reminders are disabled — enable them in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const remService = this.icloud.getService('reminders');
        // Expose `listId` as the canonical key (mirrors the `listId` parameter used everywhere else)
        const lists = remService.lists.map(l => ({ listId: l.id, title: l.title, color: l.color, count: l.count }));
        this.sendCallback(obj, { success: true, lists });
    }

    // ── onMessage Drive handlers ──────────────────────────────────────────────

    private handleDriveListFolder(obj: ioBroker.Message): void {
        if (!this.config.driveEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'iCloud Drive is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        const folderPath = (msg && typeof msg === 'object' ? (msg.path as string) : undefined) ?? '';
        const folderId = msg && typeof msg === 'object' ? (msg.folderId as string) : undefined;

        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }

        (async (): Promise<void> => {
            let node: iCloudDriveNode;
            if (folderId) {
                node = await driveService.getNode(folderId);
            } else if (folderPath) {
                node = await driveService.getNodeByPath(folderPath);
            } else {
                node = await driveService.getNode();
            }
            const children = await node.getChildren();
            const items = children.map(c => ({
                name: c.fullName,
                type: c.type,
                drivewsid: c.nodeId,
                docwsid: c.docwsid ?? '',
                size: c.size ?? 0,
                etag: c.etag,
                dateCreated: c.dateCreated ? c.dateCreated.getTime() : null,
                dateModified: c.dateModified ? c.dateModified.getTime() : null,
            }));
            this.sendCallback(obj, { success: true, items });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveGetMetadata(obj: ioBroker.Message): void {
        if (!this.config.driveEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'iCloud Drive is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const itemPath = msg.path as string | undefined;
        const itemId = msg.itemId as string | undefined;
        if (!itemPath && !itemId) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required: "path" (slash-separated) or "itemId" (drivewsid)',
            });
            return;
        }

        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }

        (async (): Promise<void> => {
            const node = itemId ? await driveService.getNode(itemId) : await driveService.getNodeByPath(itemPath!);
            this.sendCallback(obj, {
                success: true,
                item: {
                    name: node.fullName,
                    type: node.type,
                    drivewsid: node.nodeId,
                    docwsid: node.docwsid ?? '',
                    parentId: node.parentId ?? '',
                    etag: node.etag,
                    size: node.size ?? 0,
                    fileCount: node.fileCount ?? 0,
                    shareCount: node.shareCount ?? 0,
                    directChildrenCount: node.directChildrenCount ?? 0,
                    dateCreated: node.dateCreated ? node.dateCreated.getTime() : null,
                    dateModified: node.dateModified ? node.dateModified.getTime() : null,
                    dateChanged: node.dateChanged ? node.dateChanged.getTime() : null,
                    dateLastOpen: node.dateLastOpen ? node.dateLastOpen.getTime() : null,
                    extension: node.extension ?? null,
                },
            });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveGetFile(obj: ioBroker.Message): void {
        if (!this.config.driveEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'iCloud Drive is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const filePath = msg.path as string | undefined;
        const fileId = msg.fileId as string | undefined;
        if (!filePath && !fileId) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required: "path" (slash-separated) or "fileId" (drivewsid)',
            });
            return;
        }

        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }

        (async (): Promise<void> => {
            let node: iCloudDriveNode;
            if (fileId) {
                node = await driveService.getNode(fileId);
            } else {
                node = await driveService.getNodeByPath(filePath!);
            }
            if (node.type !== 'FILE') {
                this.sendCallback(obj, { success: false, error: `"${node.fullName}" is not a file` });
                return;
            }
            const stream = await node.open();
            if (!stream) {
                this.sendCallback(obj, { success: false, error: 'Download returned empty stream' });
                return;
            }
            // Collect stream into a Buffer, return as base64
            const reader = stream.getReader();
            const chunks: Uint8Array[] = [];
            for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                chunks.push(value);
            }
            const totalLen = chunks.reduce((s, c) => s + c.length, 0);
            const merged = new Uint8Array(totalLen);
            let offset = 0;
            for (const c of chunks) {
                merged.set(c, offset);
                offset += c.length;
            }
            const base64 = Buffer.from(merged).toString('base64');
            this.sendCallback(obj, {
                success: true,
                name: node.fullName,
                size: totalLen,
                base64,
            });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveUploadFile(obj: ioBroker.Message): void {
        if (!this.config.driveEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'iCloud Drive is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const folderId = msg.folderId as string | undefined;
        const folderPath = msg.folderPath as string | undefined;
        const fileName = msg.fileName as string | undefined;
        const base64Content = msg.base64 as string | undefined;
        const contentType = (msg.contentType as string) ?? undefined;

        if (!fileName) {
            this.sendCallback(obj, { success: false, error: 'Required field missing: "fileName"' });
            return;
        }
        if (!base64Content) {
            this.sendCallback(obj, { success: false, error: 'Required field missing: "base64" (file content)' });
            return;
        }

        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }

        (async (): Promise<void> => {
            let targetFolderDocwsid: string;
            if (folderId) {
                targetFolderDocwsid = folderId;
            } else if (folderPath) {
                const folder = await driveService.getNodeByPath(folderPath);
                if (!folder.docwsid) {
                    throw new Error(`Folder "${folderPath}" has no docwsid — call refresh() first`);
                }
                targetFolderDocwsid = folder.docwsid;
            } else {
                // Default: root folder
                const root = await driveService.getNode();
                if (!root.docwsid) {
                    throw new Error('Root folder has no docwsid');
                }
                targetFolderDocwsid = root.docwsid;
            }

            const content = new Uint8Array(Buffer.from(base64Content, 'base64'));
            await driveService.sendFile(targetFolderDocwsid, { name: fileName, content, contentType });
            this.sendCallback(obj, { success: true });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveCreateFolder(obj: ioBroker.Message): void {
        if (!this.config.driveEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'iCloud Drive is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const name = msg.name as string | undefined;
        const parentId = msg.parentId as string | undefined;
        const parentPath = msg.parentPath as string | undefined;

        if (!name) {
            this.sendCallback(obj, { success: false, error: 'Required field missing: "name"' });
            return;
        }

        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }

        (async (): Promise<void> => {
            let targetParentId: string;
            if (parentId) {
                targetParentId = parentId;
            } else if (parentPath) {
                const parent = await driveService.getNodeByPath(parentPath);
                targetParentId = parent.nodeId;
            } else {
                const root = await driveService.getNode();
                targetParentId = root.nodeId;
            }
            const result = await driveService.mkdir(targetParentId, name);
            this.sendCallback(obj, { success: true, result });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveDeleteItem(obj: ioBroker.Message): void {
        if (!this.config.driveEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'iCloud Drive is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const drivewsid = msg.drivewsid as string | undefined;
        const etag = msg.etag as string | undefined;
        const itemPath = msg.path as string | undefined;

        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }

        (async (): Promise<void> => {
            if (drivewsid && etag) {
                await driveService.del(drivewsid, etag);
            } else if (itemPath) {
                const node = await driveService.getNodeByPath(itemPath);
                await node.delete();
            } else {
                this.sendCallback(obj, {
                    success: false,
                    error: 'Required: "drivewsid" + "etag", or "path"',
                });
                return;
            }
            this.sendCallback(obj, { success: true });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveRenameItem(obj: ioBroker.Message): void {
        if (!this.config.driveEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'iCloud Drive is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const drivewsid = msg.drivewsid as string | undefined;
        const etag = msg.etag as string | undefined;
        const newName = msg.newName as string | undefined;
        const itemPath = msg.path as string | undefined;

        if (!newName) {
            this.sendCallback(obj, { success: false, error: 'Required field missing: "newName"' });
            return;
        }

        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }

        (async (): Promise<void> => {
            if (drivewsid && etag) {
                await driveService.renameItem(drivewsid, etag, newName);
            } else if (itemPath) {
                const node = await driveService.getNodeByPath(itemPath);
                await node.rename(newName);
            } else {
                this.sendCallback(obj, {
                    success: false,
                    error: 'Required: "drivewsid" + "etag", or "path"',
                });
                return;
            }
            this.sendCallback(obj, { success: true });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    // ── onMessage Contacts handlers ─────────────────────────────────────────

    private handleGetContacts(obj: ioBroker.Message): void {
        if (!this.config.contactsEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Contacts are disabled — enable them in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        const contactId = (msg && typeof msg === 'object' ? msg.contactId : undefined) as string | undefined;
        const groupName = (msg && typeof msg === 'object' ? msg.groupName : undefined) as string | undefined;
        const contactsService = this.icloud.getService('contacts');

        let contacts: Contact[];
        if (contactId) {
            const c = contactsService.getContact(contactId);
            contacts = c ? [c] : [];
        } else if (groupName) {
            contacts = contactsService.getContactsByGroups([groupName]);
        } else {
            contacts = contactsService.contacts;
        }
        this.sendCallback(obj, { success: true, contacts });
    }

    private handleGetContactGroups(obj: ioBroker.Message): void {
        if (!this.config.contactsEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Contacts are disabled — enable them in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const contactsService = this.icloud.getService('contacts');
        const groups = contactsService.groups.map(g => ({
            groupId: g.groupId,
            name: g.name,
            contactCount: g.contactIds.length,
        }));
        this.sendCallback(obj, { success: true, groups });
    }

    // ── onMessage Calendar handlers ─────────────────────────────────────────

    private handleGetCalendars(obj: ioBroker.Message): void {
        if (!this.config.calendarEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Calendar is disabled — enable it in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const calService = this.icloud.getService('calendar');
        calService
            .calendars()
            .then(collections => {
                const calendars = collections.map(c => ({
                    guid: c.guid,
                    title: c.title,
                    color: c.color,
                    symbolicColor: c.symbolicColor,
                    enabled: c.enabled,
                    isDefault: c.isDefault,
                    isFamily: c.isFamily,
                    readOnly: c.readOnly,
                    order: c.order,
                }));
                this.sendCallback(obj, { success: true, calendars });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleGetCalendarEvents(obj: ioBroker.Message): void {
        if (!this.config.calendarEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Calendar is disabled — enable it in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const msg = (obj.message as Record<string, unknown>) ?? {};
        const fromTs = msg.from as number | undefined;
        const toTs = msg.to as number | undefined;
        const calendarGuid = msg.calendarGuid as string | undefined;
        const from = fromTs ? new Date(fromTs) : undefined;
        const to = toTs ? new Date(toTs) : undefined;

        const calService = this.icloud.getService('calendar');
        calService
            .events(from, to)
            .then(resp => {
                let events = resp.Event ?? [];
                if (calendarGuid) {
                    events = events.filter(e => e.pGuid === calendarGuid);
                }
                const mapped = events.map(e => ({
                    guid: e.guid,
                    calendarGuid: e.pGuid,
                    title: e.title,
                    startDate: this.localDateArrayToTimestamp(e.localStartDate),
                    endDate: this.localDateArrayToTimestamp(e.localEndDate),
                    allDay: e.allDay,
                    duration: e.duration,
                    location: e.location ?? '',
                    description: e.description ?? '',
                    url: e.url ?? '',
                    tz: e.tz,
                    etag: e.etag,
                    readOnly: e.readOnly,
                    recurrenceMaster: e.recurrenceMaster,
                    alarms: e.alarms ?? [],
                }));
                this.sendCallback(obj, { success: true, events: mapped });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleCreateCalendarEvent(obj: ioBroker.Message): void {
        if (!this.config.calendarEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Calendar is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const calendarGuid = msg.calendarGuid as string | undefined;
        const title = msg.title as string | undefined;
        const startDate = msg.startDate as number | undefined;
        const endDate = msg.endDate as number | undefined;
        if (!calendarGuid || !title || !startDate || !endDate) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required fields missing: "calendarGuid", "title", "startDate" (timestamp), "endDate" (timestamp)',
            });
            return;
        }
        if (endDate <= startDate) {
            this.sendCallback(obj, { success: false, error: '"endDate" must be after "startDate"' });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const calService = this.icloud.getService('calendar');
        calService
            .createEvent({
                calendarGuid,
                title,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                allDay: (msg.allDay as boolean) ?? false,
                location: (msg.location as string) ?? undefined,
                description: (msg.description as string) ?? undefined,
                url: (msg.url as string) ?? undefined,
                alarms: (msg.alarms as AlarmMeasurement[]) ?? undefined,
            })
            .then(({ guid }) => {
                this.sendCallback(obj, { success: true, eventGuid: guid });
                this.refreshCalendarEvents().catch(() => {});
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleUpdateCalendarEvent(obj: ioBroker.Message): void {
        if (!this.config.calendarEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Calendar is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const calendarGuid = msg.calendarGuid as string | undefined;
        const eventGuid = msg.eventGuid as string | undefined;
        if (!calendarGuid || !eventGuid) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required fields missing: "calendarGuid" and "eventGuid"',
            });
            return;
        }
        const startDate = msg.startDate as number | undefined;
        const endDate = msg.endDate as number | undefined;
        if (startDate !== undefined && endDate !== undefined && endDate <= startDate) {
            this.sendCallback(obj, { success: false, error: '"endDate" must be after "startDate"' });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const opts: UpdateEventOptions = {
            calendarGuid,
            eventGuid,
            etag: (msg.etag as string) ?? undefined,
            title: (msg.title as string) ?? undefined,
            startDate: startDate !== undefined ? new Date(startDate) : undefined,
            endDate: endDate !== undefined ? new Date(endDate) : undefined,
            allDay: (msg.allDay as boolean) ?? undefined,
            location: (msg.location as string) ?? undefined,
            description: (msg.description as string) ?? undefined,
            url: (msg.url as string) ?? undefined,
            alarms: (msg.alarms as AlarmMeasurement[]) ?? undefined,
        };
        const calService = this.icloud.getService('calendar');
        calService
            .updateEvent(opts)
            .then(() => {
                this.sendCallback(obj, { success: true });
                this.refreshCalendarEvents().catch(() => {});
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handleDeleteCalendarEvent(obj: ioBroker.Message): void {
        if (!this.config.calendarEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Calendar is disabled — enable it in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const calendarGuid = msg.calendarGuid as string | undefined;
        const eventGuid = msg.eventGuid as string | undefined;
        if (!calendarGuid || !eventGuid) {
            this.sendCallback(obj, {
                success: false,
                error: 'Required fields missing: "calendarGuid" and "eventGuid"',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const calService = this.icloud.getService('calendar');
        calService
            .deleteEvent(calendarGuid, eventGuid, msg.etag as string | undefined)
            .then(() => {
                this.sendCallback(obj, { success: true });
                this.refreshCalendarEvents().catch(() => {});
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    // ── onMessage Photos handlers ─────────────────────────────────────────────

    private handlePhotosGetAlbums(obj: ioBroker.Message): void {
        if (!this.config.photosEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Photos are disabled — enable them in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const photosService = this.icloud.getService('photos');
        photosService
            .getAlbumSummaries()
            .then(albums => {
                this.sendCallback(obj, { success: true, albums });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handlePhotosGetPhotos(obj: ioBroker.Message): void {
        if (!this.config.photosEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Photos are disabled — enable them in the adapter settings first',
            });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        const albumName = (msg?.albumName as string) ?? 'All Photos';
        const offset = Math.max(0, Number(msg?.offset) || 0);
        const limit = Math.min(100, Math.max(1, Number(msg?.limit) || 50));

        const photosService = this.icloud.getService('photos');
        photosService
            .getPhotosPage(albumName, offset, limit)
            .then((photos: PhotoAssetInfo[]) => {
                this.sendCallback(obj, { success: true, photos });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handlePhotosDownload(obj: ioBroker.Message): void {
        if (!this.config.photosEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Photos are disabled — enable them in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const photoId = msg.photoId as string | undefined;
        if (!photoId) {
            this.sendCallback(obj, { success: false, error: 'Required field missing: "photoId"' });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const version = (msg.version as string) ?? 'original';
        const photosService = this.icloud.getService('photos');
        photosService
            .downloadPhoto(photoId, version)
            .then(result => {
                if (!result) {
                    this.sendCallback(obj, { success: false, error: `Photo not found: ${photoId}` });
                    return;
                }
                const base64 = Buffer.from(result.data).toString('base64');
                this.sendCallback(obj, {
                    success: true,
                    name: result.filename,
                    size: result.size,
                    base64,
                });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private handlePhotosDelete(obj: ioBroker.Message): void {
        if (!this.config.photosEnabled) {
            this.sendCallback(obj, {
                success: false,
                error: 'Photos are disabled — enable them in the adapter settings first',
            });
            return;
        }
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const photoId = msg.photoId as string | undefined;
        if (!photoId) {
            this.sendCallback(obj, { success: false, error: 'Required field missing: "photoId"' });
            return;
        }
        if (!this.icloud) {
            this.sendCallback(obj, { success: false, error: 'iCloud not connected' });
            return;
        }
        const photosService = this.icloud.getService('photos');
        photosService
            .deletePhoto(photoId)
            .then(success => {
                this.sendCallback(obj, { success });
            })
            .catch((err: unknown) => {
                this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
            });
    }

    private sendCallback(obj: ioBroker.Message, response: Record<string, unknown>): void {
        if (obj.callback) {
            this.sendTo(obj.from, obj.command, response, obj.callback);
        }
    }

    // ── Drive Sync engine ────────────────────────────────────────────────────

    private getDriveSyncEntries(): DriveSyncEntry[] {
        try {
            const raw = this.config.driveSyncConfig;
            if (typeof raw === 'string' && raw) {
                return JSON.parse(raw) as DriveSyncEntry[];
            }
        } catch {
            // ignore
        }
        return [];
    }

    private async loadDriveSyncMeta(): Promise<void> {
        try {
            const obj = await this.getObjectAsync('drive');
            if (obj?.native?.syncMeta) {
                const meta = JSON.parse(obj.native.syncMeta as string) as DriveSyncMeta;
                this.driveSyncConflicts = meta.conflicts ?? [];
            }
        } catch {
            // ignore — fresh start
        }
    }

    private async saveDriveSyncMeta(meta: DriveSyncMeta): Promise<void> {
        this.driveSyncConflicts = meta.conflicts;
        try {
            const obj = await this.getObjectAsync('drive');
            if (obj) {
                obj.native = obj.native ?? {};
                obj.native.syncMeta = JSON.stringify(meta);
                await this.setObjectAsync('drive', obj);
            }
        } catch (err) {
            this.log.warn(`Failed to save Drive Sync meta: ${(err as Error)?.message ?? String(err)}`);
        }
    }

    private scheduleDriveSync(): void {
        if (this.driveSyncTimer) {
            this.clearTimeout(this.driveSyncTimer);
        }
        const intervalMs = (this.config.driveSyncInterval || 60) * 60_000;
        this.driveSyncTimer = this.setTimeout(async () => {
            this.driveSyncTimer = null;
            await this.executeDriveSync();
            this.scheduleDriveSync();
        }, intervalMs);
    }

    private async executeDriveSync(): Promise<void> {
        if (!this.icloud || !this.config.driveEnabled || !this.config.driveSyncEnabled) {
            return;
        }

        const entries = this.getDriveSyncEntries().filter(e => e.enabled);
        if (entries.length === 0) {
            return;
        }

        this.log.debug(`Drive Sync: starting sync for ${entries.length} entries`);
        let driveService: iCloudDriveService;
        try {
            driveService = this.getDriveService();
        } catch {
            this.log.warn('Drive Sync: iCloud not connected');
            return;
        }

        const meta: DriveSyncMeta = { entries: [], conflicts: [...this.driveSyncConflicts] };

        for (const entry of entries) {
            const entryMeta = { id: entry.id, lastSync: 0, lastError: '', filesSynced: 0, totalSizeMB: 0 };
            try {
                await this.syncEntry(driveService, entry, entryMeta, meta);
                entryMeta.lastSync = Date.now();
            } catch (err) {
                entryMeta.lastError = (err as Error)?.message ?? String(err);
                this.log.warn(`Drive Sync: entry ${entry.id} (${entry.localPath}) failed: ${entryMeta.lastError}`);
            }
            meta.entries.push(entryMeta);
        }

        await this.saveDriveSyncMeta(meta);
        this.log.debug('Drive Sync: completed');
    }

    private async syncEntry(
        driveService: iCloudDriveService,
        entry: DriveSyncEntry,
        entryMeta: DriveSyncMeta['entries'][0],
        meta: DriveSyncMeta,
    ): Promise<void> {
        // Resolve local path
        const localDir = entry.localPath;
        if (!localDir || !fs.existsSync(localDir)) {
            throw new Error(`Local path does not exist: ${localDir}`);
        }

        // Get or create iCloud target folder
        const targetNode = await this.resolveOrCreateDriveFolder(driveService, entry.icloudFolder);

        if (entry.type === 'backitup') {
            await this.syncEntryUploadOnly(driveService, targetNode, entry, entryMeta, meta);
        } else {
            await this.syncEntryBidirectional(driveService, targetNode, entry, entryMeta, meta);
        }
    }

    /**
     * Resolve a slash-separated iCloud Drive path, creating missing folders.
     *
     * @param driveService
     * @param icloudFolder
     */
    private async resolveOrCreateDriveFolder(
        driveService: iCloudDriveService,
        icloudFolder: string,
    ): Promise<iCloudDriveNode> {
        const icloudPath = icloudFolder.replace(/^\//, '');
        if (!icloudPath) {
            return driveService.getNode();
        }
        try {
            return await driveService.getNodeByPath(icloudPath);
        } catch {
            // Create folder path recursively
            const parts = icloudPath.split('/').filter(Boolean);
            let currentNode = await driveService.getNode();
            for (const part of parts) {
                const existing = await currentNode.get(part);
                if (existing) {
                    await existing.refresh();
                    currentNode = existing;
                } else {
                    await currentNode.mkdir(part);
                    await currentNode.refresh();
                    const created = await currentNode.get(part);
                    if (!created) {
                        throw new Error(`Failed to create folder "${part}" in iCloud Drive`);
                    }
                    await created.refresh();
                    currentNode = created;
                }
            }
            return currentNode;
        }
    }

    // ── BackItUp sync: UPLOAD-ONLY ───────────────────────────────────────────
    // Local files are NEVER modified, overwritten, or deleted.
    // Only remote (iCloud Drive) files may be created, overwritten, or deleted.

    private async syncEntryUploadOnly(
        driveService: iCloudDriveService,
        targetNode: iCloudDriveNode,
        entry: DriveSyncEntry,
        entryMeta: DriveSyncMeta['entries'][0],
        meta: DriveSyncMeta,
    ): Promise<void> {
        const localDir = entry.localPath;

        // List local files, apply limits (sort by mtime descending, take newest)
        const allFiles = fs.readdirSync(localDir).filter(f => fs.statSync(path.join(localDir, f)).isFile());
        const fileStats = allFiles.map(f => {
            const stat = fs.statSync(path.join(localDir, f));
            return { name: f, size: stat.size, mtime: stat.mtimeMs };
        });
        fileStats.sort((a, b) => b.mtime - a.mtime);

        if (entry.maxFiles > 0) {
            fileStats.splice(entry.maxFiles);
        }
        let localFiles: string[];
        if (entry.maxSizeMB > 0) {
            const maxBytes = entry.maxSizeMB * 1024 * 1024;
            let total = 0;
            const filtered: typeof fileStats = [];
            for (const f of fileStats) {
                if (total + f.size > maxBytes) {
                    break;
                }
                total += f.size;
                filtered.push(f);
            }
            localFiles = filtered.map(f => f.name);
        } else {
            localFiles = fileStats.map(f => f.name);
        }

        // Get remote files
        const remoteChildren = await targetNode.getChildren();
        const remoteFileMap = new Map<string, iCloudDriveNode>();
        for (const child of remoteChildren) {
            if (child.type === 'FILE') {
                remoteFileMap.set(child.fullName, child);
            }
        }

        let filesSynced = 0;
        let totalSize = 0;

        for (const localFileName of localFiles) {
            const localFilePath = path.join(localDir, localFileName);
            const localStat = fs.statSync(localFilePath);
            const remoteFile = remoteFileMap.get(localFileName);

            if (remoteFile) {
                // File exists on both sides — upload only if local is newer/different
                const sizeDiffers = remoteFile.size !== localStat.size;
                if (!sizeDiffers) {
                    continue; // same size → skip (backup files are immutable)
                }
            }

            // Upload the file
            const content = new Uint8Array(fs.readFileSync(localFilePath));
            const docwsid = targetNode.docwsid ?? targetNode.rawData?.docwsid;
            if (!docwsid) {
                throw new Error(`Target folder "${entry.icloudFolder}" has no docwsid`);
            }
            await driveService.sendFile(docwsid, { name: localFileName, content });
            filesSynced++;
            totalSize += localStat.size;
            this.log.debug(
                `Drive Sync [backup]: uploaded "${localFileName}" (${(localStat.size / 1024 / 1024).toFixed(2)} MB)`,
            );
        }

        // Clean up remote files that exceed limits
        if (entry.maxFiles > 0 || entry.maxSizeMB > 0) {
            await this.cleanupRemoteBackups(driveService, targetNode, entry);
        }

        meta.conflicts = meta.conflicts.filter(c => c.entryId !== entry.id);
        entryMeta.filesSynced = filesSynced;
        entryMeta.totalSizeMB = totalSize / 1024 / 1024;
    }

    // ── Directory sync: BIDIRECTIONAL ─────────────────────────────────────────
    // True sync: upload local→remote, download remote→local, propagate deletions.

    private async syncEntryBidirectional(
        driveService: iCloudDriveService,
        targetNode: iCloudDriveNode,
        entry: DriveSyncEntry,
        entryMeta: DriveSyncMeta['entries'][0],
        meta: DriveSyncMeta,
    ): Promise<void> {
        const localDir = entry.localPath;

        // Previous known file list (for deletion detection)
        const prevMeta = meta.entries.find(e => e.id === entry.id);
        const lastKnownFiles = new Set<string>(prevMeta?.lastKnownFiles ?? []);
        const isFirstSync = lastKnownFiles.size === 0 && !prevMeta;

        // List local files
        const localFiles = fs.readdirSync(localDir).filter(f => fs.statSync(path.join(localDir, f)).isFile());
        const localSet = new Set(localFiles);

        // Get remote files
        const remoteChildren = await targetNode.getChildren();
        const remoteFileMap = new Map<string, iCloudDriveNode>();
        for (const child of remoteChildren) {
            if (child.type === 'FILE') {
                remoteFileMap.set(child.fullName, child);
            }
        }
        const remoteSet = new Set(remoteFileMap.keys());

        let filesSynced = 0;
        let totalSize = 0;
        const docwsid = targetNode.docwsid ?? targetNode.rawData?.docwsid;

        // ── 1. Upload local files not yet on remote ──
        for (const localFileName of localFiles) {
            const localFilePath = path.join(localDir, localFileName);
            const localStat = fs.statSync(localFilePath);
            const remoteFile = remoteFileMap.get(localFileName);

            if (remoteFile) {
                // Both sides have the file
                const remoteModified = remoteFile.dateModified?.getTime() ?? remoteFile.dateCreated?.getTime() ?? 0;
                const localModified = localStat.mtimeMs;
                const sizeDiffers = remoteFile.size !== localStat.size;

                if (!sizeDiffers) {
                    continue; // identical — nothing to do
                }

                // Size differs → conflict
                const remoteFresher = remoteModified > localModified + 60_000;
                const localFresher = localModified > remoteModified + 60_000;

                if (remoteFresher && !localFresher) {
                    // Remote is newer → download
                    await this.downloadRemoteFile(remoteFile, localFilePath);
                    filesSynced++;
                    totalSize += remoteFile.size ?? 0;
                    this.log.debug(`Drive Sync [dir]: downloaded newer "${localFileName}"`);
                    continue;
                }

                if (localFresher && !remoteFresher) {
                    // Local is newer → upload
                    if (docwsid) {
                        const content = new Uint8Array(fs.readFileSync(localFilePath));
                        await driveService.sendFile(docwsid, { name: localFileName, content });
                        filesSynced++;
                        totalSize += localStat.size;
                        this.log.debug(`Drive Sync [dir]: uploaded newer "${localFileName}"`);
                    }
                    continue;
                }

                // Both modified (or unclear) → apply conflict resolution
                if (entry.conflictResolution === 'ask') {
                    const existing = meta.conflicts.find(c => c.entryId === entry.id && c.fileName === localFileName);
                    if (!existing) {
                        meta.conflicts.push({
                            entryId: entry.id,
                            fileName: localFileName,
                            localModified,
                            remoteModified,
                            localSize: localStat.size,
                            remoteSize: remoteFile.size ?? 0,
                        });
                        this.log.warn(`Drive Sync [dir]: conflict for "${localFileName}" — open Admin to resolve`);
                    }
                } else if (entry.conflictResolution === 'overwrite-remote' && docwsid) {
                    const content = new Uint8Array(fs.readFileSync(localFilePath));
                    await driveService.sendFile(docwsid, { name: localFileName, content });
                    filesSynced++;
                    totalSize += localStat.size;
                } else if (entry.conflictResolution === 'keep-both' && docwsid) {
                    const ext = path.extname(localFileName);
                    const base = path.basename(localFileName, ext);
                    const renamedName = `${base}_local_${Date.now()}${ext}`;
                    const content = new Uint8Array(fs.readFileSync(localFilePath));
                    await driveService.sendFile(docwsid, { name: renamedName, content });
                    filesSynced++;
                    totalSize += localStat.size;
                }
                // 'skip' → do nothing
                continue;
            }

            // File only exists locally
            if (!isFirstSync && lastKnownFiles.has(localFileName)) {
                // Was known before but now missing on remote → deleted remotely → delete locally
                try {
                    fs.unlinkSync(localFilePath);
                    this.log.debug(`Drive Sync [dir]: deleted local "${localFileName}" (removed on remote)`);
                } catch (err) {
                    this.log.warn(
                        `Drive Sync [dir]: failed to delete local "${localFileName}": ${(err as Error)?.message ?? String(err)}`,
                    );
                }
                continue;
            }

            // New local file → upload
            if (docwsid) {
                const content = new Uint8Array(fs.readFileSync(localFilePath));
                await driveService.sendFile(docwsid, { name: localFileName, content });
                filesSynced++;
                totalSize += localStat.size;
                this.log.debug(
                    `Drive Sync [dir]: uploaded "${localFileName}" (${(localStat.size / 1024 / 1024).toFixed(2)} MB)`,
                );
            }
        }

        // ── 2. Download remote-only files / propagate local deletions ──
        for (const [remoteName, remoteNode] of remoteFileMap) {
            if (localSet.has(remoteName)) {
                continue; // already handled above
            }

            if (!isFirstSync && lastKnownFiles.has(remoteName)) {
                // Was known before but now missing locally → deleted locally → delete on remote
                try {
                    await remoteNode.delete();
                    this.log.debug(`Drive Sync [dir]: deleted remote "${remoteName}" (removed locally)`);
                } catch (err) {
                    this.log.warn(
                        `Drive Sync [dir]: failed to delete remote "${remoteName}": ${(err as Error)?.message ?? String(err)}`,
                    );
                }
                continue;
            }

            // New remote file → download
            const localFilePath = path.join(localDir, remoteName);
            await this.downloadRemoteFile(remoteNode, localFilePath);
            filesSynced++;
            totalSize += remoteNode.size ?? 0;
            this.log.debug(`Drive Sync [dir]: downloaded "${remoteName}"`);
        }

        // ── 3. Build new known-files snapshot ──
        // Re-read local dir after all changes to get the actual current state
        const currentLocalFiles = fs.readdirSync(localDir).filter(f => fs.statSync(path.join(localDir, f)).isFile());
        entryMeta.lastKnownFiles = currentLocalFiles;

        meta.conflicts = meta.conflicts.filter(c => c.entryId !== entry.id || currentLocalFiles.includes(c.fileName));
        entryMeta.filesSynced = filesSynced;
        entryMeta.totalSizeMB = totalSize / 1024 / 1024;
    }

    /**
     * Download a remote iCloud Drive file to a local path.
     *
     * @param remoteNode
     * @param localFilePath
     */
    private async downloadRemoteFile(remoteNode: iCloudDriveNode, localFilePath: string): Promise<void> {
        await remoteNode.refresh();
        const stream = await remoteNode.open();
        if (!stream) {
            throw new Error(`Download returned empty stream for "${remoteNode.fullName}"`);
        }
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
        }
        const totalLen = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
            merged.set(c, offset);
            offset += c.length;
        }
        fs.writeFileSync(localFilePath, merged);
    }

    private async cleanupRemoteBackups(
        _driveService: iCloudDriveService,
        targetNode: iCloudDriveNode,
        entry: DriveSyncEntry,
    ): Promise<void> {
        await targetNode.refresh();
        const children = await targetNode.getChildren();
        const remoteFiles = children
            .filter(c => c.type === 'FILE')
            .map(c => ({
                node: c,
                name: c.fullName,
                size: c.size ?? 0,
                modified: c.dateModified?.getTime() ?? c.dateCreated?.getTime() ?? 0,
            }))
            .sort((a, b) => b.modified - a.modified); // newest first

        const toDelete: typeof remoteFiles = [];

        if (entry.maxFiles > 0 && remoteFiles.length > entry.maxFiles) {
            toDelete.push(...remoteFiles.slice(entry.maxFiles));
        }

        if (entry.maxSizeMB > 0) {
            const maxBytes = entry.maxSizeMB * 1024 * 1024;
            let total = 0;
            for (const f of remoteFiles) {
                total += f.size;
                if (total > maxBytes && !toDelete.includes(f)) {
                    toDelete.push(f);
                }
            }
        }

        for (const f of toDelete) {
            try {
                await f.node.delete();
                this.log.debug(`Drive Sync: cleaned up remote file "${f.name}"`);
            } catch (err) {
                this.log.warn(
                    `Drive Sync: failed to delete remote "${f.name}": ${(err as Error)?.message ?? String(err)}`,
                );
            }
        }
    }

    // ── Drive Sync sendTo handlers ───────────────────────────────────────────

    private handleDriveSyncGetBackitupInfo(obj: ioBroker.Message): void {
        (async (): Promise<void> => {
            const info: {
                success: boolean;
                installed: boolean;
                cifsEnabled: boolean;
                cifsConnType: string;
                cifsPath: string;
                instance: string;
            } = {
                success: true,
                installed: false,
                cifsEnabled: false,
                cifsConnType: '',
                cifsPath: '',
                instance: '',
            };

            // Check all possible BackItUp instances (0-9)
            for (let i = 0; i < 10; i++) {
                const instId = `system.adapter.backitup.${i}`;
                try {
                    const instObj = await this.getForeignObjectAsync(instId);
                    if (instObj) {
                        info.installed = true;
                        info.instance = `backitup.${i}`;
                        const native = instObj.native as Record<string, unknown> | undefined;
                        if (native) {
                            info.cifsEnabled = !!native.cifsEnabled;
                            const ct = native.connectType;
                            info.cifsConnType = typeof ct === 'string' ? ct : '';
                            const cp = native.cifsDir ?? native.backupDir;
                            info.cifsPath = typeof cp === 'string' ? cp : '';
                        }
                        break;
                    }
                } catch {
                    // instance doesn't exist
                }
            }

            this.sendCallback(obj, info);
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveSyncGetStatus(obj: ioBroker.Message): void {
        (async (): Promise<void> => {
            await this.loadDriveSyncMeta();
            const driveObj = await this.getObjectAsync('drive');
            let meta: DriveSyncMeta = { entries: [], conflicts: [] };
            if (driveObj?.native?.syncMeta) {
                try {
                    meta = JSON.parse(driveObj.native.syncMeta as string) as DriveSyncMeta;
                } catch {
                    // ignore
                }
            }
            this.sendCallback(obj, { success: true, ...meta });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }

    private handleDriveSyncResolveConflict(obj: ioBroker.Message): void {
        const msg = obj.message as Record<string, unknown> | undefined;
        if (!msg || typeof msg !== 'object') {
            this.sendCallback(obj, { success: false, error: 'Message must be an object' });
            return;
        }
        const entryId = msg.entryId as string | undefined;
        const fileName = msg.fileName as string | undefined;
        const action = msg.action as string | undefined;
        if (!entryId || !fileName || !action) {
            this.sendCallback(obj, { success: false, error: 'Required: entryId, fileName, action' });
            return;
        }

        (async (): Promise<void> => {
            // Remove conflict from meta
            const driveObj = await this.getObjectAsync('drive');
            let meta: DriveSyncMeta = { entries: [], conflicts: [] };
            if (driveObj?.native?.syncMeta) {
                try {
                    meta = JSON.parse(driveObj.native.syncMeta as string) as DriveSyncMeta;
                } catch {
                    // ignore
                }
            }

            // Find and remove the conflict
            meta.conflicts = meta.conflicts.filter(c => !(c.entryId === entryId && c.fileName === fileName));

            // If action is overwrite-remote or keep-both, trigger immediate sync for that entry
            if (action === 'overwrite-remote' || action === 'keep-both') {
                const entries = this.getDriveSyncEntries();
                const entry = entries.find(e => e.id === entryId);
                if (entry && this.icloud && this.config.driveEnabled) {
                    try {
                        const driveService = this.getDriveService();
                        // Temporarily override conflict resolution for this entry
                        const overrideEntry = {
                            ...entry,
                            conflictResolution: action as DriveSyncEntry['conflictResolution'],
                        };
                        const entryMeta = { id: entry.id, lastSync: 0, lastError: '', filesSynced: 0, totalSizeMB: 0 };
                        await this.syncEntry(driveService, overrideEntry, entryMeta, meta);
                        entryMeta.lastSync = Date.now();
                        // Update meta entry
                        const idx = meta.entries.findIndex(e => e.id === entry.id);
                        if (idx >= 0) {
                            meta.entries[idx] = entryMeta;
                        } else {
                            meta.entries.push(entryMeta);
                        }
                    } catch (err) {
                        this.log.warn(
                            `Drive Sync: conflict resolution sync failed: ${(err as Error)?.message ?? String(err)}`,
                        );
                    }
                }
            }

            await this.saveDriveSyncMeta(meta);
            this.sendCallback(obj, { success: true });
        })().catch((err: unknown) => {
            this.sendCallback(obj, { success: false, error: (err as Error)?.message ?? String(err) });
        });
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Icloud(options);
} else {
    // otherwise start the instance directly
    (() => new Icloud())();
}
