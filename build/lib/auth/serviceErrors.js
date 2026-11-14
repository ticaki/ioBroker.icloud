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
var serviceErrors_exports = {};
__export(serviceErrors_exports, {
  classifySecurityKeyVerification: () => classifySecurityKeyVerification,
  parseServiceErrors: () => parseServiceErrors
});
module.exports = __toCommonJS(serviceErrors_exports);
function parseServiceErrors(body) {
  try {
    const parsed = JSON.parse(body);
    const camel = Array.isArray(parsed == null ? void 0 : parsed.serviceErrors) ? parsed.serviceErrors : [];
    const snake = Array.isArray(parsed == null ? void 0 : parsed.service_errors) ? parsed.service_errors : [];
    return [...camel, ...snake];
  } catch {
    return [];
  }
}
function classifySecurityKeyVerification(status, body) {
  if (status === 200 || status === 204) {
    return "ok";
  }
  if (status === 409 && parseServiceErrors(body).length === 0) {
    return "conflict";
  }
  return "rejected";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  classifySecurityKeyVerification,
  parseServiceErrors
});
//# sourceMappingURL=serviceErrors.js.map
