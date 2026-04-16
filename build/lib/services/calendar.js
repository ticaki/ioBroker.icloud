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
    if ((json == null ? void 0 : json.error) === 1 && typeof (json == null ? void 0 : json.reason) === "string" && json.reason.includes("X-APPLE-WEBAUTH-TOKEN")) {
      if (retry) {
        this.service._log(
          0,
          "[calendar] Missing X-APPLE-WEBAUTH-TOKEN \u2014 re-authenticating for calendar service"
        );
        await this.service.authenticateWebService("calendar");
        return this.fetchEndpoint(endpointUrl, params, false);
      }
      throw new Error(`Calendar authentication failed: ${json.reason}`);
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
    return this.fetchEndpoint("/events", {
      startDate: (0, import_dayjs.default)(from != null ? from : (0, import_dayjs.default)().startOf("month")).format(this.dateFormat),
      endDate: (0, import_dayjs.default)(to != null ? to : (0, import_dayjs.default)().endOf("month")).format(this.dateFormat),
      dsid: this.dsid,
      lang: "en-us",
      usertz: this.tz
    });
  }
  async calendars(from, to) {
    const response = await this.fetchEndpoint("/startup", {
      startDate: (0, import_dayjs.default)(from != null ? from : (0, import_dayjs.default)().startOf("month")).format(this.dateFormat),
      endDate: (0, import_dayjs.default)(to != null ? to : (0, import_dayjs.default)().endOf("month")).format(this.dateFormat),
      dsid: this.dsid,
      lang: "en-us",
      usertz: this.tz
    });
    return response.Collection || [];
  }
  async startup(from, to) {
    return this.fetchEndpoint("/startup", {
      startDate: (0, import_dayjs.default)(from != null ? from : (0, import_dayjs.default)().startOf("month")).format(this.dateFormat),
      endDate: (0, import_dayjs.default)(to != null ? to : (0, import_dayjs.default)().endOf("month")).format(this.dateFormat),
      dsid: this.dsid,
      lang: "en-us",
      usertz: this.tz
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudCalendarService
});
//# sourceMappingURL=calendar.js.map
