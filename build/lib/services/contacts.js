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
  iCloudContactsService: () => iCloudContactsService,
  parseBirthday: () => parseBirthday
});
module.exports = __toCommonJS(contacts_exports);
function parseBirthday(raw) {
  if (!raw) {
    return "";
  }
  if (typeof raw === "object") {
    const month = typeof raw.month === "number" ? raw.month : null;
    const day = typeof raw.day === "number" ? raw.day : null;
    if (month === null || day === null) {
      return "";
    }
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const hasYear = typeof raw.year === "number" && raw.year > 1;
    if (hasYear) {
      const yyyy = String(raw.year).padStart(4, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return `--${mm}-${dd}`;
  }
  return raw;
}
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
   * @param contactId — The unique identifier of the contact to retrieve.
   */
  getContact(contactId) {
    return this.contactsById.get(contactId);
  }
  /**
   * Get contacts filtered by group name(s).
   *
   * @param groupNames — List of group names to filter by.
   */
  getContactsByGroups(groupNames) {
    if (!groupNames.length) {
      return this.contacts;
    }
    const lowerNames = new Set(groupNames.map((n) => n.toLowerCase().trim()));
    return this.contacts.filter((c) => c.groups.some((gName) => lowerNames.has(gName.toLowerCase().trim())));
  }
  constructor(service, serviceUri) {
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
  async refresh() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F;
    const startupParams = new URLSearchParams(this.service.getParams());
    startupParams.set("locale", "de_DE");
    startupParams.set("order", "last,first");
    startupParams.set("includePhoneNumbers", "true");
    startupParams.set("includePhotos", "true");
    startupParams.set("clientVersion", "2.1");
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
    this.service._log(0, `[contacts] headers: ${JSON.stringify(Object.fromEntries(startupParams.entries()))}`);
    const startupData = await startupResp.json();
    this._prefToken = startupData.prefToken;
    this._syncToken = startupData.syncToken;
    this.service._log(0, `[contacts] startup response keys: ${Object.keys(startupData).join(", ")}`);
    this.service._log(0, `[contacts] startup syncToken: ${(_a = startupData.syncToken) != null ? _a : "n/a"}`);
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
    this.service._log(
      0,
      `[contacts] startup misc: meCardId=${(_b = startupData.meCardId) != null ? _b : "n/a"}, restricted=${(_c = startupData.restricted) != null ? _c : "n/a"}, isGuardianRestricted=${(_d = startupData.isGuardianRestricted) != null ? _d : "n/a"}`
    );
    const contactsParams = new URLSearchParams(startupParams);
    contactsParams.set("prefToken", this._prefToken);
    contactsParams.set("syncToken", this._syncToken);
    contactsParams.set("limit", "0");
    contactsParams.set("offset", "0");
    contactsParams.set("clientVersion", "2.1");
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
    const meContactId = (_e = contactsData.meContactId) != null ? _e : startupData.meCardId;
    this.service._log(0, `[contacts] contacts response keys: ${Object.keys(contactsData).join(", ")}`);
    this.groupsById.clear();
    const rawGroupsFromContacts = (_f = contactsData.groups) != null ? _f : [];
    const rawGroupsFromStartup = (_g = startupData.groups) != null ? _g : [];
    const startupHasMembership = rawGroupsFromStartup.some(
      (g) => {
        var _a2, _b2, _c2;
        return ((_c2 = (_b2 = (_a2 = g.contactIds) != null ? _a2 : g.memberIds) != null ? _b2 : g.members) != null ? _c2 : []).length > 0;
      }
    );
    const rawGroups = rawGroupsFromStartup.length && startupHasMembership ? rawGroupsFromStartup : rawGroupsFromContacts.length ? rawGroupsFromContacts : rawGroupsFromStartup;
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
    const groupSource = rawGroupsFromStartup.length && startupHasMembership ? "startup" : "contacts";
    const groupSummary = [...this.groupsById.values()].map((g) => `"${g.name}" (${g.contactIds.length} member(s))`).join(", ");
    this.service._log(0, `[contacts] groups parsed (source: ${groupSource}): ${groupSummary}`);
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
      const birthday = parseBirthday(raw.birthday);
      const notes = (_B = raw.notes) != null ? _B : "";
      const etag = (_C = raw.etag) != null ? _C : "";
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
        jobTitle: (_D = raw.jobTitle) != null ? _D : "",
        department: (_E = raw.department) != null ? _E : "",
        groups: (_F = contactGroupMap.get(contactId)) != null ? _F : [],
        etag,
        isMe: contactId === meContactId,
        raw
      };
      this.contactsById.set(contactId, contact);
    }
    this.service._log(0, `[contacts] refresh: ${rawContacts.length} contact(s), ${rawGroups.length} group(s)`);
    const recentlyModified = [...this.contactsById.values()].filter((c) => typeof c.raw.dateModified === "string" && c.raw.dateModified !== "").sort((a, b) => String(b.raw.dateModified).localeCompare(String(a.raw.dateModified))).slice(0, 5);
    if (recentlyModified.length > 0) {
      this.service._log(0, "[contacts] 5 most recently modified contacts (newest first):");
      for (const c of recentlyModified) {
        this.service._log(
          0,
          `  contactId=${c.contactId} firstName="${c.firstName}" lastName="${c.lastName}" dateModified="${String(c.raw.dateModified)}" etag="${c.etag}"`
        );
      }
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudContactsService,
  parseBirthday
});
//# sourceMappingURL=contacts.js.map
