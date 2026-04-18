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
var findMy_exports = {};
__export(findMy_exports, {
  iCloudFindMyDevice: () => iCloudFindMyDevice,
  iCloudFindMyService: () => iCloudFindMyService
});
module.exports = __toCommonJS(findMy_exports);
class iCloudFindMyDevice {
  deviceInfo;
  service;
  constructor(service) {
    this.service = service;
  }
  apply(newInfo) {
    this.deviceInfo = newInfo;
    return this;
  }
  get(value) {
    return this.deviceInfo[value];
  }
}
class iCloudFindMyService {
  service;
  serviceUri;
  includeFamily = true;
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    void this.refresh();
  }
  devices = /* @__PURE__ */ new Map();
  membersInfo = {};
  async refresh(selectedDevice = "all") {
    var _a, _b, _c;
    const doRequest = async () => {
      const request = await this.service.fetch(`${this.serviceUri}/fmipservice/client/web/refreshClient`, {
        headers: this.service.authStore.getHeaders(),
        method: "POST",
        body: JSON.stringify({
          clientContext: {
            fmly: this.includeFamily,
            shouldLocate: true,
            deviceListVersion: 1,
            selectedDevice
          }
        })
      });
      if (!request.ok) {
        const body = (await request.text()).slice(0, 200);
        throw new Error(`HTTP ${request.status}: ${body || "(empty body)"}`);
      }
      return request.json();
    };
    let json;
    try {
      json = await doRequest();
    } catch (err) {
      if (err instanceof Error && /HTTP (421|450|500)/.test(err.message)) {
        this.service._log(
          1,
          "[findmy] session expired (",
          err.message,
          ") \u2014 refreshing webservices"
        );
        const refreshed = await this.service.refreshWebservices();
        if (refreshed) {
          const newUri = (_a = this.service.accountInfo) == null ? void 0 : _a.webservices.findme.url;
          if (newUri) {
            this.serviceUri = newUri;
          }
          json = await doRequest();
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
    const newDevices = /* @__PURE__ */ new Map();
    for (const device of json.content) {
      newDevices.set(device.id, (this.devices.get(device.id) || new iCloudFindMyDevice(this)).apply(device));
    }
    this.devices = newDevices;
    this.membersInfo = (_c = (_b = json.userInfo) == null ? void 0 : _b.membersInfo) != null ? _c : {};
    return json;
  }
  async playSound(deviceId, subject = "Find My iPhone Alert") {
    const request = await this.service.fetch(`${this.serviceUri}/fmipservice/client/web/playSound`, {
      headers: this.service.authStore.getHeaders(),
      method: "POST",
      body: JSON.stringify({
        device: deviceId,
        subject,
        clientContext: { fmly: true }
      })
    });
    if (!request.ok) {
      const body = (await request.text()).slice(0, 200);
      throw new Error(`playSound HTTP ${request.status}: ${body || "(empty body)"}`);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudFindMyDevice,
  iCloudFindMyService
});
//# sourceMappingURL=findMy.js.map
