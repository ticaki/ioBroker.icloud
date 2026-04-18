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
    birthday?: string;
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

export interface ContactsSyncMap {
    syncToken: string;
    prefToken: string;
    contacts: Record<string, Contact>;
    groups: Record<string, ContactGroup>;
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
     * @param contactId The unique identifier of the contact to retrieve.
     */
    getContact(contactId: string): Contact | undefined {
        return this.contactsById.get(contactId);
    }

    /**
     * Get contacts filtered by group name(s).
     *
     * @param groupNames List of group names to filter by.
     */
    getContactsByGroups(groupNames: string[]): Contact[] {
        if (!groupNames.length) {
            return this.contacts;
        }
        const lowerNames = new Set(groupNames.map(n => n.toLowerCase().trim()));
        return this.contacts.filter(c => c.groups.some(gName => lowerNames.has(gName.toLowerCase().trim())));
    }

    /**
     * Restore in-memory state from a persisted syncMap.
     *
     * @param map The persisted sync map to restore state from.
     */
    loadSyncMap(map: ContactsSyncMap): void {
        this._syncToken = map.syncToken || undefined;
        this._prefToken = map.prefToken || undefined;
        this.contactsById.clear();
        for (const [id, c] of Object.entries(map.contacts)) {
            this.contactsById.set(id, c);
        }
        this.groupsById.clear();
        for (const [id, g] of Object.entries(map.groups ?? {})) {
            this.groupsById.set(id, g);
        }
    }

    /** Export current state for persistence. */
    exportSyncMap(): ContactsSyncMap {
        return {
            syncToken: this._syncToken ?? '',
            prefToken: this._prefToken ?? '',
            contacts: Object.fromEntries(this.contactsById),
            groups: Object.fromEntries(this.groupsById),
        };
    }

    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        this.contactsEndpoint = `${serviceUri}/co`;
    }

    /**
     * Fetch all contacts from the iCloud Contacts API.
     *
     * Reference: pyicloud ContactsService.refresh_client()
     *
     * @returns true if contacts data changed, false otherwise
     */
    async refresh(): Promise<boolean> {
        // Step 1: startup — get prefToken + syncToken
        const startupParams = new URLSearchParams({
            clientVersion: '2.1',
            locale: 'en_US',
            order: 'last,first',
        });
        this.service._log(0, '[contacts] GET startup');
        const startupResp = await this.service.fetch(`${this.contactsEndpoint}/startup?${startupParams.toString()}`, {
            method: 'GET',
            headers: {
                ...this.service.authStore.getHeaders(),
                Accept: 'application/json',
            },
        });
        if (!startupResp.ok) {
            throw new Error(`Contacts startup failed (HTTP ${startupResp.status})`);
        }
        const startupData = (await startupResp.json()) as ContactsStartupResponse;

        const prevSyncToken = this._syncToken;
        this._prefToken = startupData.prefToken;
        this._syncToken = startupData.syncToken;

        // Debug: log all top-level keys from startup response
        this.service._log(0, `[contacts] startup response keys: ${Object.keys(startupData).join(', ')}`);
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
        if (startupData.contactsOrder) {
            this.service._log(
                0,
                `[contacts] startup.contactsOrder: ${JSON.stringify(startupData.contactsOrder).slice(0, 400)}`,
            );
        }
        this.service._log(
            0,
            `[contacts] startup misc: meCardId=${startupData.meCardId ?? 'n/a'}, restricted=${startupData.restricted ?? 'n/a'}, isGuardianRestricted=${startupData.isGuardianRestricted ?? 'n/a'}`,
        );

        // Step 2: fetch full contact list using prefToken + syncToken
        const contactsParams = new URLSearchParams({
            clientVersion: '2.1',
            locale: 'en_US',
            order: 'last,first',
            prefToken: this._prefToken,
            syncToken: this._syncToken,
            limit: '0',
            offset: '0',
        });
        this.service._log(0, '[contacts] GET contacts');
        const contactsResp = await this.service.fetch(
            `${this.contactsEndpoint}/contacts?${contactsParams.toString()}`,
            {
                method: 'GET',
                headers: {
                    ...this.service.authStore.getHeaders(),
                    Accept: 'application/json',
                },
            },
        );
        if (!contactsResp.ok) {
            throw new Error(`Contacts fetch failed (HTTP ${contactsResp.status})`);
        }
        const contactsData = (await contactsResp.json()) as ContactsContactsResponse;

        if (contactsData.syncToken) {
            this._syncToken = contactsData.syncToken;
        }

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

            // Birthday
            const birthday = raw.birthday ?? '';

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

        const changed = this._syncToken !== prevSyncToken || !prevSyncToken;

        this.service._log(
            0,
            `[contacts] refresh: ${rawContacts.length} contact(s), ${rawGroups.length} group(s), ` +
                `syncToken ${changed ? 'changed' : 'unchanged'}`,
        );

        return changed;
    }
}
