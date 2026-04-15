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
var ubiquity_exports = {};
__export(ubiquity_exports, {
  iCloudUbiquityService: () => iCloudUbiquityService
});
module.exports = __toCommonJS(ubiquity_exports);
class iCloudUbiquityService {
  service;
  dsid;
  serviceUri;
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    this.dsid = this.service.accountInfo.dsInfo.dsid;
  }
  async getNode(nodeId = 0, type = "item") {
    const response = await this.service.fetch(this.serviceUri + "/ws/" + this.dsid + "/" + type + "/" + nodeId, { headers: this.service.authStore.getHeaders() });
    const json = await response.text();
    if (json == "Account migrated") throw new Error("Ubiquity not supported on this account");
    return JSON.parse(json);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudUbiquityService
});
//# sourceMappingURL=ubiquity.js.map
