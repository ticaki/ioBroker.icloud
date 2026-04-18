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
var contacts_exports = {};
__export(contacts_exports, {
  iCloudContactsService: () => iCloudContactsService
});
module.exports = __toCommonJS(contacts_exports);
class iCloudContactsService {
  service;
  serviceUri;
  contactsEndpoint;
  contactsById = /* @__PURE__ */ new Map();
  groupsById = /* @__PURE__ */ new Map();
  _syncToken;
  _prefToken;
  /** Public: all contacts as array. */
  get contacts() {
    return [...this.contactsById.values()];
  }
  /** Public: all groups as array. */
  get groups() {
    return [...this.groupsById.values()];
  }
  /**
   * Get a contact by contactId.
   *
   * @param contactId The unique identifier of the contact to retrieve.
   */
  getContact(contactId) {
    return this.contactsById.get(contactId);
  }
  /**
   * Get contacts filtered by group name(s).
   *
   * @param groupNames List of group names to filter by.
   */
  getContactsByGroups(groupNames) {
    if (!groupNames.length) {
      return this.contacts;
    }
    const lowerNames = new Set(groupNames.map((n) => n.toLowerCase().trim()));
    return this.contacts.filter((c) => c.groups.some((gName) => lowerNames.has(gName.toLowerCase().trim())));
  }
  /**
   * Restore in-memory state from a persisted syncMap.
   *
   * @param map The persisted sync map to restore state from.
   */
  loadSyncMap(map) {
    var _a;
    this._syncToken = map.syncToken || void 0;
    this._prefToken = map.prefToken || void 0;
    this.contactsById.clear();
    for (const [id, c] of Object.entries(map.contacts)) {
      this.contactsById.set(id, c);
    }
    this.groupsById.clear();
    for (const [id, g] of Object.entries((_a = map.groups) != null ? _a : {})) {
      this.groupsById.set(id, g);
    }
  }
  /** Export current state for persistence. */
  exportSyncMap() {
    var _a, _b;
    return {
      syncToken: (_a = this._syncToken) != null ? _a : "",
      prefToken: (_b = this._prefToken) != null ? _b : "",
      contacts: Object.fromEntries(this.contactsById),
      groups: Object.fromEntries(this.groupsById)
    };
  }
  constructor(service, serviceUri) {
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
  async refresh() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G;
    const startupParams = new URLSearchParams({
      clientVersion: "2.1",
      locale: "en_US",
      order: "last,first"
    });
    this.service._log(0, "[contacts] GET startup");
    const startupResp = await this.service.fetch(`${this.contactsEndpoint}/startup?${startupParams.toString()}`, {
      method: "GET",
      headers: {
        ...this.service.authStore.getHeaders(),
        Accept: "application/json"
      }
    });
    if (!startupResp.ok) {
      throw new Error(`Contacts startup failed (HTTP ${startupResp.status})`);
    }
    const startupData = await startupResp.json();
    const prevSyncToken = this._syncToken;
    this._prefToken = startupData.prefToken;
    this._syncToken = startupData.syncToken;
    this.service._log(0, `[contacts] startup response keys: ${Object.keys(startupData).join(", ")}`);
    if (startupData.collections) {
      this.service._log(
        0,
        `[contacts] startup.collections (${startupData.collections.length} item(s), first 2): ${JSON.stringify(startupData.collections.slice(0, 2)).slice(0, 1200)}`
      );
    }
    if (startupData.headerPositions) {
      this.service._log(
        0,
        `[contacts] startup.headerPositions: ${JSON.stringify(startupData.headerPositions).slice(0, 600)}`
      );
    }
    if (startupData.contactsOrder) {
      this.service._log(
        0,
        `[contacts] startup.contactsOrder: ${JSON.stringify(startupData.contactsOrder).slice(0, 400)}`
      );
    }
    this.service._log(
      0,
      `[contacts] startup misc: meCardId=${(_a = startupData.meCardId) != null ? _a : "n/a"}, restricted=${(_b = startupData.restricted) != null ? _b : "n/a"}, isGuardianRestricted=${(_c = startupData.isGuardianRestricted) != null ? _c : "n/a"}`
    );
    const contactsParams = new URLSearchParams({
      clientVersion: "2.1",
      locale: "en_US",
      order: "last,first",
      prefToken: this._prefToken,
      syncToken: this._syncToken,
      limit: "0",
      offset: "0"
    });
    this.service._log(0, "[contacts] GET contacts");
    const contactsResp = await this.service.fetch(
      `${this.contactsEndpoint}/contacts?${contactsParams.toString()}`,
      {
        method: "GET",
        headers: {
          ...this.service.authStore.getHeaders(),
          Accept: "application/json"
        }
      }
    );
    if (!contactsResp.ok) {
      throw new Error(`Contacts fetch failed (HTTP ${contactsResp.status})`);
    }
    const contactsData = await contactsResp.json();
    if (contactsData.syncToken) {
      this._syncToken = contactsData.syncToken;
    }
    const meContactId = (_d = contactsData.meContactId) != null ? _d : startupData.meCardId;
    this.service._log(0, `[contacts] contacts response keys: ${Object.keys(contactsData).join(", ")}`);
    const firstContact = ((_e = contactsData.contacts) != null ? _e : [])[0];
    if (firstContact) {
      this.service._log(
        0,
        `[contacts] contact field names (first record): ${Object.keys(firstContact).join(", ")}`
      );
      const shape = {};
      for (const [k, v] of Object.entries(firstContact)) {
        if (Array.isArray(v)) {
          shape[k] = `Array(${v.length})`;
        } else if (v && typeof v === "object") {
          shape[k] = `Object{${Object.keys(v).join(",")}}`;
        } else {
          shape[k] = `${typeof v}`;
        }
      }
      this.service._log(0, `[contacts] contact field shapes: ${JSON.stringify(shape).slice(0, 1200)}`);
    }
    this.groupsById.clear();
    const rawGroupsFromContacts = (_f = contactsData.groups) != null ? _f : [];
    const rawGroupsFromStartup = (_g = startupData.groups) != null ? _g : [];
    const rawGroups = rawGroupsFromContacts.length ? rawGroupsFromContacts : rawGroupsFromStartup;
    for (const g of rawGroups) {
      const groupId = (_i = (_h = g.groupId) != null ? _h : g.contactGroupId) != null ? _i : g.id;
      if (!groupId) {
        continue;
      }
      const contactIds = (_l = (_k = (_j = g.contactIds) != null ? _j : g.memberIds) != null ? _k : g.members) != null ? _l : [];
      this.groupsById.set(groupId, {
        groupId,
        name: (_n = (_m = g.name) != null ? _m : g.groupName) != null ? _n : "",
        contactIds
      });
    }
    const contactGroupMap = /* @__PURE__ */ new Map();
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
    this.contactsById.clear();
    const rawContacts = (_o = contactsData.contacts) != null ? _o : [];
    for (const raw of rawContacts) {
      const contactId = raw.contactId;
      if (!contactId) {
        continue;
      }
      const firstName = (_p = raw.firstName) != null ? _p : "";
      const lastName = (_q = raw.lastName) != null ? _q : "";
      const companyName = (_r = raw.companyName) != null ? _r : "";
      const middleName = (_s = raw.middleName) != null ? _s : "";
      const prefix = (_t = raw.prefix) != null ? _t : "";
      const suffix = (_u = raw.suffix) != null ? _u : "";
      const nickname = (_v = raw.nickName) != null ? _v : "";
      const nameParts = [firstName, middleName, lastName].filter(Boolean);
      const fullName = nameParts.join(" ") || companyName || "";
      const phones = ((_w = raw.phones) != null ? _w : []).map((p) => {
        var _a2, _b2;
        return {
          label: (_a2 = p.label) != null ? _a2 : "",
          field: (_b2 = p.field) != null ? _b2 : ""
        };
      });
      const emails = ((_x = raw.emailAddresses) != null ? _x : []).map((e) => {
        var _a2, _b2;
        return {
          label: (_a2 = e.label) != null ? _a2 : "",
          field: (_b2 = e.field) != null ? _b2 : ""
        };
      });
      const streetAddresses = ((_y = raw.streetAddresses) != null ? _y : []).map((a) => {
        var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k2, _l2, _m2;
        return {
          label: (_a2 = a.label) != null ? _a2 : "",
          street: (_c2 = (_b2 = a.field) == null ? void 0 : _b2.street) != null ? _c2 : "",
          city: (_e2 = (_d2 = a.field) == null ? void 0 : _d2.city) != null ? _e2 : "",
          state: (_g2 = (_f2 = a.field) == null ? void 0 : _f2.state) != null ? _g2 : "",
          postalCode: (_i2 = (_h2 = a.field) == null ? void 0 : _h2.postalCode) != null ? _i2 : "",
          country: (_k2 = (_j2 = a.field) == null ? void 0 : _j2.country) != null ? _k2 : "",
          countryCode: (_m2 = (_l2 = a.field) == null ? void 0 : _l2.countryCode) != null ? _m2 : ""
        };
      });
      const city = (_A = (_z = streetAddresses[0]) == null ? void 0 : _z.city) != null ? _A : "";
      const birthday = (_B = raw.birthday) != null ? _B : "";
      const notes = (_C = raw.notes) != null ? _C : "";
      const etag = (_D = raw.etag) != null ? _D : "";
      const contact = {
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
        jobTitle: (_E = raw.jobTitle) != null ? _E : "",
        department: (_F = raw.department) != null ? _F : "",
        groups: (_G = contactGroupMap.get(contactId)) != null ? _G : [],
        etag,
        isMe: contactId === meContactId,
        raw
      };
      this.contactsById.set(contactId, contact);
    }
    const changed = this._syncToken !== prevSyncToken || !prevSyncToken;
    this.service._log(
      0,
      `[contacts] refresh: ${rawContacts.length} contact(s), ${rawGroups.length} group(s), syncToken ${changed ? "changed" : "unchanged"}`
    );
    return changed;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudContactsService
});
//# sourceMappingURL=contacts.js.map
