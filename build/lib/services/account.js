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
var account_exports = {};
__export(account_exports, {
  iCloudAccountDetailsService: () => iCloudAccountDetailsService
});
module.exports = __toCommonJS(account_exports);
class iCloudAccountDetailsService {
  service;
  serviceUri;
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
  }
  _devices;
  /**
   * Retrieves a list of all devices associated with the account.
   * @param refresh By default, the devices are cached forever. If you want to refresh the list, set this to true.
   * @returns A list of devices associated with the account.
   */
  async getDevices(refresh = false) {
    if (!refresh && this._devices) return this._devices;
    const response = await this.service.fetch(this.serviceUri + "/setup/web/device/getDevices", { headers: this.service.authStore.getHeaders() });
    const json = await response.json();
    this._devices = json;
    return this._devices;
  }
  _family;
  /**
   * Retrieves information about the family associated with the account.
   * @param refresh  By default, the family information is cached forever. If you want to refresh the list, set this to true.
   * @returns Information about the family associated with the account.
   */
  async getFamily(refresh = false) {
    if (!refresh && this._family) return this._family;
    const response = await this.service.fetch(this.serviceUri + "/setup/web/family/getFamilyDetails", { headers: this.service.authStore.getHeaders() });
    const json = await response.json();
    this._family = json;
    return this._family;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudAccountDetailsService
});
//# sourceMappingURL=account.js.map
