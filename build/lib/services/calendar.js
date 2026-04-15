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
  async fetchEndpoint(endpointUrl, params) {
    const url = new URL(`${this.calendarServiceUri}${endpointUrl}`);
    url.search = new URLSearchParams({ ...params, clientVersion: "5.1" }).toString();
    const response = await this.service.fetch(url, {
      headers: {
        ...this.service.authStore.getHeaders(),
        Referer: "https://www.icloud.com/"
      }
    });
    return await response.json();
  }
  async eventDetails(calendarGuid, eventGuid) {
    const response = await this.fetchEndpoint(`/eventdetail/${calendarGuid}/${eventGuid}`, {
      lang: "en-us",
      usertz: this.tz,
      dsid: this.dsid
    });
    return response.Event[0];
  }
  async events(from, to) {
    const response = await this.fetchEndpoint("/events", {
      startDate: (0, import_dayjs.default)(from != null ? from : (0, import_dayjs.default)().startOf("month")).format(this.dateFormat),
      endDate: (0, import_dayjs.default)(to != null ? to : (0, import_dayjs.default)().endOf("month")).format(this.dateFormat),
      dsid: this.dsid,
      lang: "en-us",
      usertz: this.tz
    });
    return response.Event || [];
  }
  async calendars() {
    const response = await this.fetchEndpoint("/startup", {
      startDate: (0, import_dayjs.default)((0, import_dayjs.default)().startOf("month")).format(this.dateFormat),
      endDate: (0, import_dayjs.default)((0, import_dayjs.default)().endOf("month")).format(this.dateFormat),
      dsid: this.dsid,
      lang: "en-us",
      usertz: this.tz
    });
    return response.Collection || [];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudCalendarService
});
//# sourceMappingURL=calendar.js.map
