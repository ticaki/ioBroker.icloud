"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var calendar_exports = {};
__export(calendar_exports, {
  iCloudCalendarService: () => iCloudCalendarService
});
module.exports = __toCommonJS(calendar_exports);
var import_dayjs = __toESM(require("dayjs"));
var import_timezone = __toESM(require("dayjs/plugin/timezone"));
var import_utc = __toESM(require("dayjs/plugin/utc"));
import_dayjs.default.extend(import_utc.default);
import_dayjs.default.extend(import_timezone.default);
function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  }).toUpperCase();
}
function dateToAppleList(dt, isStart) {
  const year = dt.getFullYear();
  const month = dt.getMonth() + 1;
  const day = dt.getDate();
  const hour = dt.getHours();
  const minute = dt.getMinutes();
  const dateString = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const minutesFromMidnight = isStart ? hour * 60 + minute : (24 - hour) * 60 + (60 - minute);
  return [dateString, year, month, day, hour, minute, minutesFromMidnight];
}
class iCloudCalendarService {
  service;
  serviceUri;
  dsid;
  dateFormat = "YYYY-MM-DD";
  calendarServiceUri;
  tz = import_dayjs.default.tz.guess() || "UTC";
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    this.dsid = this.service.accountInfo.dsInfo.dsid;
    this.calendarServiceUri = `${service.accountInfo.webservices.calendar.url}/ca`;
  }
  defaultParams(from, to) {
    return {
      startDate: (0, import_dayjs.default)(from != null ? from : (0, import_dayjs.default)().startOf("month")).format(this.dateFormat),
      endDate: (0, import_dayjs.default)(to != null ? to : (0, import_dayjs.default)().endOf("month")).format(this.dateFormat),
      dsid: this.dsid,
      lang: "en-us",
      usertz: this.tz
    };
  }
  async handleAuthError(json, retry, retryFn) {
    if ((json == null ? void 0 : json.error) === 1 && typeof (json == null ? void 0 : json.reason) === "string" && json.reason.includes("X-APPLE-WEBAUTH-TOKEN")) {
      if (retry) {
        this.service._log(
          0,
          "[calendar] Missing X-APPLE-WEBAUTH-TOKEN \u2014 re-authenticating for calendar service"
        );
        await this.service.authenticateWebService("calendar");
        return retryFn();
      }
      throw new Error(`Calendar authentication failed: ${json.reason}`);
    }
    return null;
  }
  async fetchEndpoint(endpointUrl, params, retry = true) {
    const url = new URL(`${this.calendarServiceUri}${endpointUrl}`);
    url.search = new URLSearchParams(params).toString();
    this.service._log(0, `[calendar] GET ${url.toString()}`);
    const { "Content-Type": _ct, ...getHeaders } = this.service.authStore.getHeaders();
    const response = await this.service.fetch(url, {
      headers: {
        ...getHeaders,
        Referer: "https://www.icloud.com/"
      }
    });
    const text = await response.text();
    if (!text || !text.trim()) {
      this.service._log(
        0,
        `[calendar] Empty response from ${endpointUrl} (HTTP ${response.status}) \u2014 skipping`
      );
      if (response.status === 401 && retry) {
        await this.service.authenticateWebService("calendar");
        return this.fetchEndpoint(endpointUrl, params, false);
      }
      return {};
    }
    const json = JSON.parse(text);
    const authResult = await this.handleAuthError(
      json,
      retry,
      () => this.fetchEndpoint(endpointUrl, params, false)
    );
    if (authResult !== null) {
      return authResult;
    }
    return json;
  }
  async postEndpoint(endpointUrl, params, body, retry = true) {
    const url = new URL(`${this.calendarServiceUri}${endpointUrl}`);
    url.search = new URLSearchParams(params).toString();
    this.service._log(0, `[calendar] POST ${url.toString()}`);
    const headers = this.service.authStore.getHeaders();
    const response = await this.service.fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "text/plain",
        Referer: "https://www.icloud.com/"
      },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!text || !text.trim()) {
      this.service._log(
        0,
        `[calendar] Empty response from POST ${endpointUrl} (HTTP ${response.status})`
      );
      if (response.status === 401 && retry) {
        await this.service.authenticateWebService("calendar");
        return this.postEndpoint(endpointUrl, params, body, false);
      }
      return {};
    }
    const json = JSON.parse(text);
    const authResult = await this.handleAuthError(
      json,
      retry,
      () => this.postEndpoint(endpointUrl, params, body, false)
    );
    if (authResult !== null) {
      return authResult;
    }
    return json;
  }
  async eventDetails(calendarGuid, eventGuid) {
    return this.fetchEndpoint(`/eventdetail/${calendarGuid}/${eventGuid}`, {
      lang: "en-us",
      usertz: this.tz,
      dsid: this.dsid
    });
  }
  async events(from, to) {
    return this.fetchEndpoint("/events", this.defaultParams(from, to));
  }
  /**
   * Fetch events across multiple months by issuing one /events request per month,
   * similar to timlaing/pyicloud's `refresh_client()` approach.
   * Apple's API silently returns empty results when the date range exceeds ~30 days,
   * so we chunk the request into individual calendar months.
   *
   * @param months Number of months to fetch (1 = current month only).
   */
  async eventsForMonths(months) {
    var _a, _b, _c;
    const allEvents = [];
    const allAlarms = [];
    const allRecurrences = [];
    const seenGuids = /* @__PURE__ */ new Set();
    const now = /* @__PURE__ */ new Date();
    for (let i = 0; i < months; i++) {
      const year = now.getFullYear();
      const month = now.getMonth() + i;
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      const resp = await this.events(from, to);
      for (const ev of (_a = resp.Event) != null ? _a : []) {
        if (!seenGuids.has(ev.guid)) {
          seenGuids.add(ev.guid);
          allEvents.push(ev);
        }
      }
      for (const a of (_b = resp.Alarm) != null ? _b : []) {
        allAlarms.push(a);
      }
      for (const r of (_c = resp.Recurrence) != null ? _c : []) {
        allRecurrences.push(r);
      }
    }
    return { Event: allEvents, Alarm: allAlarms, Recurrence: allRecurrences };
  }
  async calendars(from, to) {
    const response = await this.fetchEndpoint(
      "/startup",
      this.defaultParams(from, to)
    );
    return response.Collection || [];
  }
  async startup(from, to) {
    return this.fetchEndpoint("/startup", this.defaultParams(from, to));
  }
  async getCtag(calendarGuid) {
    const collections = await this.calendars();
    const col = collections.find((c) => c.guid === calendarGuid);
    if (!col) {
      throw new Error(`Calendar with guid "${calendarGuid}" not found`);
    }
    return col.ctag;
  }
  async createEvent(opts) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const guid = generateGuid();
    const now = /* @__PURE__ */ new Date();
    const duration = Math.round((opts.endDate.getTime() - opts.startDate.getTime()) / 6e4);
    const startDateList = dateToAppleList(opts.startDate, true);
    const endDateList = dateToAppleList(opts.endDate, false);
    const nowList = dateToAppleList(now, true);
    const alarmGuids = [];
    const alarmPayload = [];
    if (opts.alarms && opts.alarms.length > 0) {
      for (const alarm of opts.alarms) {
        const alarmGuid = `${guid}:${generateGuid()}`;
        alarmGuids.push(alarmGuid);
        alarmPayload.push({
          messageType: "message",
          pGuid: guid,
          guid: alarmGuid,
          isLocationBased: false,
          measurement: {
            hours: (_a = alarm.hours) != null ? _a : 0,
            minutes: (_b = alarm.minutes) != null ? _b : 0,
            seconds: (_c = alarm.seconds) != null ? _c : 0,
            days: (_d = alarm.days) != null ? _d : 0,
            weeks: (_e = alarm.weeks) != null ? _e : 0,
            before: (_f = alarm.before) != null ? _f : true
          }
        });
      }
    }
    const event = {
      title: opts.title,
      tz: this.tz,
      icon: 0,
      duration,
      allDay: (_g = opts.allDay) != null ? _g : false,
      pGuid: opts.calendarGuid,
      guid,
      startDate: startDateList,
      endDate: endDateList,
      localStartDate: startDateList,
      localEndDate: endDateList,
      createdDate: nowList,
      lastModifiedDate: nowList,
      extendedDetailsAreIncluded: true,
      recurrenceException: false,
      recurrenceMaster: false,
      hasAttachments: false,
      readOnly: false,
      transparent: false,
      birthdayIsYearlessBday: false,
      birthdayShowAsCompany: false,
      shouldShowJunkUIWhenAppropriate: false,
      location: (_h = opts.location) != null ? _h : "",
      description: (_i = opts.description) != null ? _i : "",
      url: (_j = opts.url) != null ? _j : "",
      etag: "",
      alarms: alarmGuids,
      attachments: [],
      invitees: []
    };
    const ctag = await this.getCtag(opts.calendarGuid);
    const body = {
      Event: event,
      Invitee: [],
      Alarm: alarmPayload,
      ClientState: {
        Collection: [{ guid: opts.calendarGuid, ctag }]
      }
    };
    const response = await this.postEndpoint(
      `/events/${opts.calendarGuid}/${guid}`,
      this.defaultParams(),
      body
    );
    return { guid, response };
  }
  async updateEvent(opts) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    const detail = await this.eventDetails(opts.calendarGuid, opts.eventGuid);
    if (!detail.Event || detail.Event.length === 0) {
      throw new Error(`Event "${opts.eventGuid}" not found`);
    }
    const existing = detail.Event[0];
    const resolvedEtag = (_a = opts.etag) != null ? _a : existing.etag;
    if (!resolvedEtag) {
      throw new Error(`Could not determine etag for event "${opts.eventGuid}"`);
    }
    const now = /* @__PURE__ */ new Date();
    const nowList = dateToAppleList(now, true);
    const startDate = opts.startDate;
    const endDate = opts.endDate;
    const startDateList = startDate ? dateToAppleList(startDate, true) : existing.localStartDate;
    const endDateList = endDate ? dateToAppleList(endDate, false) : existing.localEndDate;
    const startMs = startDate ? startDate.getTime() : new Date(
      existing.localStartDate[1],
      existing.localStartDate[2] - 1,
      existing.localStartDate[3],
      (_b = existing.localStartDate[4]) != null ? _b : 0,
      (_c = existing.localStartDate[5]) != null ? _c : 0
    ).getTime();
    const endMs = endDate ? endDate.getTime() : new Date(
      existing.localEndDate[1],
      existing.localEndDate[2] - 1,
      existing.localEndDate[3],
      (_d = existing.localEndDate[4]) != null ? _d : 0,
      (_e = existing.localEndDate[5]) != null ? _e : 0
    ).getTime();
    const duration = Math.round((endMs - startMs) / 6e4);
    const alarmGuids = [];
    const alarmPayload = [];
    if (opts.alarms !== void 0) {
      for (const alarm of opts.alarms) {
        const alarmGuid = `${opts.eventGuid}:${generateGuid()}`;
        alarmGuids.push(alarmGuid);
        alarmPayload.push({
          messageType: "message",
          pGuid: opts.eventGuid,
          guid: alarmGuid,
          isLocationBased: false,
          measurement: {
            hours: (_f = alarm.hours) != null ? _f : 0,
            minutes: (_g = alarm.minutes) != null ? _g : 0,
            seconds: (_h = alarm.seconds) != null ? _h : 0,
            days: (_i = alarm.days) != null ? _i : 0,
            weeks: (_j = alarm.weeks) != null ? _j : 0,
            before: (_k = alarm.before) != null ? _k : true
          }
        });
      }
    }
    const event = {
      ...existing,
      title: (_l = opts.title) != null ? _l : existing.title,
      allDay: opts.allDay !== void 0 ? opts.allDay : existing.allDay,
      location: opts.location !== void 0 ? opts.location : (_m = existing.location) != null ? _m : "",
      description: opts.description !== void 0 ? opts.description : (_n = existing.description) != null ? _n : "",
      url: opts.url !== void 0 ? opts.url : (_o = existing.url) != null ? _o : "",
      startDate: startDateList,
      endDate: endDateList,
      localStartDate: startDateList,
      localEndDate: endDateList,
      duration,
      lastModifiedDate: nowList,
      etag: resolvedEtag,
      alarms: opts.alarms !== void 0 ? alarmGuids : existing.alarms
    };
    const ctag = await this.getCtag(opts.calendarGuid);
    const body = {
      Event: event,
      Invitee: [],
      Alarm: opts.alarms !== void 0 ? alarmPayload : (_p = detail.Alarm) != null ? _p : [],
      ClientState: {
        Collection: [{ guid: opts.calendarGuid, ctag }]
      }
    };
    const params = {
      ...this.defaultParams(),
      ifMatch: resolvedEtag
    };
    return this.postEndpoint(
      `/events/${opts.calendarGuid}/${opts.eventGuid}`,
      params,
      body
    );
  }
  async deleteEvent(calendarGuid, eventGuid, etag) {
    let resolvedEtag = etag;
    if (!resolvedEtag) {
      const detail = await this.eventDetails(calendarGuid, eventGuid);
      if (detail.Event && detail.Event.length > 0) {
        resolvedEtag = detail.Event[0].etag;
      }
      if (!resolvedEtag) {
        throw new Error(`Could not determine etag for event "${eventGuid}"`);
      }
    }
    const ctag = await this.getCtag(calendarGuid);
    const body = {
      Event: {},
      Invitee: [],
      Alarm: [],
      ClientState: {
        Collection: [{ guid: calendarGuid, ctag }]
      }
    };
    const params = {
      ...this.defaultParams(),
      methodOverride: "DELETE",
      ifMatch: resolvedEtag
    };
    return this.postEndpoint(`/events/${calendarGuid}/${eventGuid}`, params, body);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudCalendarService
});
//# sourceMappingURL=calendar.js.map
