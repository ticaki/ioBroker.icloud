/**
 * iCloud Contacts service.
 *
 * Reference: pyicloud ContactsService
 * https://github.com/picklepete/pyicloud/blob/master/pyicloud/services/contacts.py
 *
 * Uses the legacy contacts endpoint ({contacts.url}/co/startup + /co/contacts).
 */
import type iCloudService from '..';

// ── API response shapes ───────────────────────────────────────────────────────

/** Raw contact record returned by the iCloud Contacts API. */
export interface ContactsApiRawContact {
    contactId?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    prefix?: string;
    suffix?: string;
    nickName?: string;
    companyName?: string;
    jobTitle?: string;
    department?: string;
    /**
     * Birthday as returned by the Apple Contacts API.
     * Can be a string ("YYYY-MM-DD" or "--MM-DD" for yearless birthdays in vCard style)
     * or a structured object `{ year?: number, month: number, day: number }`.
     */
    birthday?: string | { year?: number; month?: number; day?: number };
    notes?: string;
    /** Change-tracking tag — NOT a group reference. */
    etag?: string;
    phones?: Array<{ label?: string; field?: string }>;
    emailAddresses?: Array<{ label?: string; field?: string }>;
    streetAddresses?: Array<{
        label?: string;
        field?: {
            street?: string;
            city?: string;
            state?: string;
            postalCode?: string;
            country?: string;
            countryCode?: string;
        };
    }>;
    /** Normalized sort key (e.g. lower-case name). */
    normalized?: string;
    isCompany?: boolean;
    isGuardianApproved?: boolean;
    whitelisted?: boolean;
    dateCreated?: string;
    dateModified?: string;
    [key: string]: unknown;
}

/** Raw group record returned by the iCloud Contacts API. */
export interface ContactsApiRawGroup {
    groupId?: string;
    contactGroupId?: string;
    id?: string;
    name?: string;
    groupName?: string;
    contactIds?: string[];
    memberIds?: string[];
    members?: string[];
    [key: string]: unknown;
}

/**
 * A "collection" from /co/startup.
 * Known instance: `{ collectionId: "card", etag: "0000", groupsOrder: [] }`.
 * `groupsOrder` lists the group IDs in display order when groups exist.
 */
export interface ContactsApiCollection {
    collectionId: string;
    etag?: string;
    groupsOrder?: string[];
    [key: string]: unknown;
}

/**
 * Response from the /co/startup endpoint.
 *
 * Known keys (from live observation):
 * headerPositions, syncToken, contactsOrder, meCardId, collections,
 * restricted, isGuardianRestricted, prefToken, groups, contacts
 */
export interface ContactsStartupResponse {
    prefToken: string;
    syncToken: string;
    meCardId?: string;
    contacts?: ContactsApiRawContact[];
    groups?: ContactsApiRawGroup[];
    /** Contains a single "card" collection whose `groupsOrder` lists group IDs. */
    collections?: ContactsApiCollection[];
    /** Maps first-letter header → position index in the sorted contacts list. */
    headerPositions?: Record<string, number>;
    /** Ordered array of contactId strings defining the display order. */
    contactsOrder?: string[];
    restricted?: boolean;
    isGuardianRestricted?: boolean;
    [key: string]: unknown;
}

/**
 * Response from the /co/contacts endpoint.
 *
 * Known keys (from live observation): contacts
 */
export interface ContactsContactsResponse {
    contacts?: ContactsApiRawContact[];
    groups?: ContactsApiRawGroup[];
    syncToken?: string;
    meContactId?: string;
    [key: string]: unknown;
}

// ── Domain models ─────────────────────────────────────────────────────────────

export interface ContactGroup {
    groupId: string;
    name: string;
    contactIds: string[];
}

export interface Contact {
    /** iCloud contactId — stable across syncs */
    contactId: string;
    firstName: string;
    lastName: string;
    companyName: string;
    /** Assembled full name */
    fullName: string;
    /** Phones as array of { label, field } */
    phones: Array<{ label: string; field: string }>;
    /** Emails as array of { label, field } */
    emails: Array<{ label: string; field: string }>;
    /** Street addresses as array of objects */
    streetAddresses: Array<{
        label: string;
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        countryCode: string;
    }>;
    /** City from the first street address (for display) */
    city: string;
    birthday: string;
    notes: string;
    prefix: string;
    suffix: string;
    middleName: string;
    nickname: string;
    jobTitle: string;
    department: string;
    /** Group names this contact belongs to */
    groups: string[];
    /** Raw etag for change tracking */
    etag: string;
    /** True if this is the "me" card */
    isMe: boolean;
    /** Full JSON for advanced use */
    raw: Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise the birthday value returned by the Apple Contacts API into a
 * canonical string so all downstream code deals with one consistent format.
 *
 * Apple may return birthday as:
 *   - `"YYYY-MM-DD"` — ISO date string with year
 *   - `"--MM-DD"` — vCard-style yearless birthday
 *   - `{ year?: number, month: number, day: number }` — structured object
 *
 * @param raw — The raw birthday value from the API response.
 * @returns A normalised `"YYYY-MM-DD"` or `"--MM-DD"` string, or `""` when the
 *          value cannot be interpreted.
 */
export function parseBirthday(
    raw: string | { year?: number; month?: number; day?: number } | undefined | null,
): string {
    if (!raw) {
        return '';
    }

    // Structured-object format: { year?, month, day }
    if (typeof raw === 'object') {
        const month = typeof raw.month === 'number' ? raw.month : null;
        const day = typeof raw.day === 'number' ? raw.day : null;
        if (month === null || day === null) {
            return '';
        }
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const hasYear = typeof raw.year === 'number' && raw.year > 1;
        if (hasYear) {
            const yyyy = String(raw.year!).padStart(4, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        return `--${mm}-${dd}`;
    }

    // String — pass through as-is (already "YYYY-MM-DD" or "--MM-DD")
    return raw;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class iCloudContactsService {
    service: iCloudService;
    serviceUri: string;
    private contactsEndpoint: string;

    private contactsById: Map<string, Contact> = new Map();
    private groupsById: Map<string, ContactGroup> = new Map();
    private _syncToken: string | undefined;
    private _prefToken: string | undefined;

    /** Public: all contacts as array. */
    get contacts(): Contact[] {
        return [...this.contactsById.values()];
    }

    /** Public: all groups as array. */
    get groups(): ContactGroup[] {
        return [...this.groupsById.values()];
    }

    /**
     * Get a contact by contactId.
     *
     * @param contactId — The unique identifier of the contact to retrieve.
     */
    getContact(contactId: string): Contact | undefined {
        return this.contactsById.get(contactId);
    }

    /**
     * Get contacts filtered by group name(s).
     *
     * @param groupNames — List of group names to filter by.
     */
    getContactsByGroups(groupNames: string[]): Contact[] {
        if (!groupNames.length) {
            return this.contacts;
        }
        const lowerNames = new Set(groupNames.map(n => n.toLowerCase().trim()));
        return this.contacts.filter(c => c.groups.some(gName => lowerNames.has(gName.toLowerCase().trim())));
    }

    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        this.contactsEndpoint = `${serviceUri}/co`;
    }

    /**
     * Fetch all contacts from the iCloud Contacts API and update the in-memory store.
     *
     * Mirrors pyicloud ContactsService.refresh_client(): two sequential GET requests
     * (/co/startup then /co/contacts) with no server-side change detection — Apple
     * provides no reliable "changed" flag for contacts, so a full fetch is performed
     * on every call.
     *
     * Base query parameters include `dsid`, `clientBuildNumber`, `clientMasteringNumber`,
     * and `clientId` (via `service.getParams()`) — mirroring pyicloud's `self.params`
     * so that Apple's CDN caches responses per-user rather than globally.
     *
     * Reference: https://github.com/picklepete/pyicloud/blob/master/pyicloud/services/contacts.py
     */
    async refresh(): Promise<void> {
        // Step 1: startup — get prefToken + syncToken.
        // Base params include dsid + clientBuildNumber etc., matching pyicloud's self.params.
        // This makes the URL user-specific and prevents Apple's CDN from serving a shared,
        // potentially stale, cached startup response.
        const startupParams = new URLSearchParams(this.service.getParams());
        startupParams.set('locale', 'en_US');
        startupParams.set('order', 'last,first');
        startupParams.set('includePhoneNumbers', 'true');
        startupParams.set('includePhotos', 'true');

        this.service._log(0, '[contacts] GET startup');
        const startupResp = await this.service.fetch(`${this.contactsEndpoint}/startup?${startupParams.toString()}`, {
            method: 'GET',
            headers: {
                ...this.service.authStore.getHeaders(),
                Accept: 'application/json',
                'Cache-Control': 'no-cache, no-store',
                Pragma: 'no-cache',
            },
        });
        if (!startupResp.ok) {
            throw new Error(`Contacts startup failed (HTTP ${startupResp.status})`);
        }
        const startupData = (await startupResp.json()) as ContactsStartupResponse;

        // prefToken + syncToken from /startup are passed as-is to /contacts — mirroring
        // pyicloud's dict(params_contacts).update({prefToken, syncToken}).
        this._prefToken = startupData.prefToken;
        this._syncToken = startupData.syncToken;

        // Debug: log all top-level keys from startup response
        this.service._log(0, `[contacts] startup response keys: ${Object.keys(startupData).join(', ')}`);
        this.service._log(0, `[contacts] startup syncToken: ${startupData.syncToken ?? 'n/a'}`);
        if (startupData.collections) {
            this.service._log(
                0,
                `[contacts] startup.collections (${startupData.collections.length} item(s), first 2): ${JSON.stringify(startupData.collections.slice(0, 2)).slice(0, 1200)}`,
            );
        }
        if (startupData.headerPositions) {
            this.service._log(
                0,
                `[contacts] startup.headerPositions: ${JSON.stringify(startupData.headerPositions).slice(0, 600)}`,
            );
        }
        this.service._log(
            0,
            `[contacts] startup misc: meCardId=${startupData.meCardId ?? 'n/a'}, restricted=${startupData.restricted ?? 'n/a'}, isGuardianRestricted=${startupData.isGuardianRestricted ?? 'n/a'}`,
        );

        // Step 2: fetch full contact list using prefToken + syncToken.
        // Start from the same base params as startup (incl. dsid), then add token + pagination.
        const contactsParams = new URLSearchParams(startupParams);
        contactsParams.set('prefToken', this._prefToken);
        contactsParams.set('syncToken', this._syncToken);
        contactsParams.set('limit', '0');
        contactsParams.set('offset', '0');
        
        this.service._log(0, '[contacts] GET contacts');
        const contactsResp = await this.service.fetch(
            `${this.contactsEndpoint}/contacts?${contactsParams.toString()}`,
            {
                method: 'GET',
                headers: {
                    ...this.service.authStore.getHeaders(),
                    Accept: 'application/json',
                    'Cache-Control': 'no-cache, no-store',
                    Pragma: 'no-cache',
                },
            },
        );
        if (!contactsResp.ok) {
            throw new Error(`Contacts fetch failed (HTTP ${contactsResp.status})`);
        }
        const contactsData = (await contactsResp.json()) as ContactsContactsResponse;

        const meContactId = contactsData.meContactId ?? startupData.meCardId;

        // Debug: log all top-level keys from contacts response
        this.service._log(0, `[contacts] contacts response keys: ${Object.keys(contactsData).join(', ')}`);
        // Log all field names from the first contact
        const firstContact = (contactsData.contacts ?? [])[0];
        if (firstContact) {
            this.service._log(
                0,
                `[contacts] contact field names (first record): ${Object.keys(firstContact).join(', ')}`,
            );
            // Log a sample record (redacted: only keys + types/lengths)
            const shape: Record<string, string> = {};
            for (const [k, v] of Object.entries(firstContact)) {
                if (Array.isArray(v)) {
                    shape[k] = `Array(${v.length})`;
                } else if (v && typeof v === 'object') {
                    shape[k] = `Object{${Object.keys(v).join(',')}}`;
                } else {
                    shape[k] = `${typeof v}`;
                }
            }
            this.service._log(0, `[contacts] contact field shapes: ${JSON.stringify(shape).slice(0, 1200)}`);
        }

        // Parse groups
        this.groupsById.clear();
        const rawGroupsFromContacts = contactsData.groups ?? [];
        const rawGroupsFromStartup = startupData.groups ?? [];
        const rawGroups: ContactsApiRawGroup[] = rawGroupsFromContacts.length
            ? rawGroupsFromContacts
            : rawGroupsFromStartup;
        for (const g of rawGroups) {
            const groupId = g.groupId ?? g.contactGroupId ?? g.id;
            if (!groupId) {
                continue;
            }
            const contactIds = g.contactIds ?? g.memberIds ?? g.members ?? [];
            this.groupsById.set(groupId, {
                groupId,
                name: g.name ?? g.groupName ?? '',
                contactIds,
            });
        }

        // Build contactId → group names mapping
        const contactGroupMap = new Map<string, string[]>();
        for (const grp of this.groupsById.values()) {
            for (const cid of grp.contactIds) {
                let arr = contactGroupMap.get(cid);
                if (!arr) {
                    arr = [];
                    contactGroupMap.set(cid, arr);
                }
                arr.push(grp.name);
            }
        }

        // Parse contacts
        this.contactsById.clear();
        const rawContacts = contactsData.contacts ?? [];
        for (const raw of rawContacts) {
            const contactId = raw.contactId;
            if (!contactId) {
                continue;
            }

            const firstName = raw.firstName ?? '';
            const lastName = raw.lastName ?? '';
            const companyName = raw.companyName ?? '';
            const middleName = raw.middleName ?? '';
            const prefix = raw.prefix ?? '';
            const suffix = raw.suffix ?? '';
            const nickname = raw.nickName ?? '';

            // Build full name
            const nameParts = [firstName, middleName, lastName].filter(Boolean);
            const fullName = nameParts.join(' ') || companyName || '';

            // Parse phones
            const phones = (raw.phones ?? []).map(p => ({
                label: p.label ?? '',
                field: p.field ?? '',
            }));

            // Parse emails
            const emails = (raw.emailAddresses ?? []).map(e => ({
                label: e.label ?? '',
                field: e.field ?? '',
            }));

            // Parse street addresses
            const streetAddresses = (raw.streetAddresses ?? []).map(a => ({
                label: a.label ?? '',
                street: a.field?.street ?? '',
                city: a.field?.city ?? '',
                state: a.field?.state ?? '',
                postalCode: a.field?.postalCode ?? '',
                country: a.field?.country ?? '',
                countryCode: a.field?.countryCode ?? '',
            }));

            const city = streetAddresses[0]?.city ?? '';

            // Birthday — normalise to "YYYY-MM-DD" or "--MM-DD" regardless of API format
            const birthday = parseBirthday(raw.birthday);

            // Notes
            const notes = raw.notes ?? '';

            const etag = raw.etag ?? '';

            const contact: Contact = {
                contactId,
                firstName,
                lastName,
                companyName,
                fullName,
                phones,
                emails,
                streetAddresses,
                city,
                birthday,
                notes,
                prefix,
                suffix,
                middleName,
                nickname,
                jobTitle: raw.jobTitle ?? '',
                department: raw.department ?? '',
                groups: contactGroupMap.get(contactId) ?? [],
                etag,
                isMe: contactId === meContactId,
                raw: raw,
            };

            this.contactsById.set(contactId, contact);
        }

        this.service._log(0, `[contacts] refresh: ${rawContacts.length} contact(s), ${rawGroups.length} group(s)`);

        // ── Diagnostic: log the 5 most recently modified contacts ─────────────
        // Helps detect whether Apple's API is returning stale snapshots: if all
        // dateModified values pre-date recent changes, the syncToken or CDN cache
        // is returning an old snapshot.
        const recentlyModified = [...this.contactsById.values()]
            .filter(c => typeof c.raw.dateModified === 'string' && c.raw.dateModified !== '')
            .sort((a, b) => String(b.raw.dateModified).localeCompare(String(a.raw.dateModified)))
            .slice(0, 5);
        if (recentlyModified.length > 0) {
            this.service._log(0, '[contacts] 5 most recently modified contacts (newest first):');
            for (const c of recentlyModified) {
                this.service._log(
                    0,
                    `  contactId=${c.contactId} firstName="${c.firstName}" lastName="${c.lastName}" dateModified="${String(c.raw.dateModified)}" etag="${c.etag}"`,
                );
            }
        }
    }
}
