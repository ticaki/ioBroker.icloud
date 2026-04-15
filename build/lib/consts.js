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
var consts_exports = {};
__export(consts_exports, {
  AUTH_ENDPOINT: () => AUTH_ENDPOINT,
  AUTH_HEADERS: () => AUTH_HEADERS,
  BASE_ENDPOINT: () => BASE_ENDPOINT,
  CLIENT_ID: () => CLIENT_ID,
  DEFAULT_HEADERS: () => DEFAULT_HEADERS,
  SETUP_ENDPOINT: () => SETUP_ENDPOINT
});
module.exports = __toCommonJS(consts_exports);
const CLIENT_ID = "d39ba9916b7251055b22c7f910e2ea796ee65e98b2ddecea8f5dde8d9d1a815d";
const CHROME_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
  "User-Agent": CHROME_USER_AGENT,
  Accept: "application/json",
  "Content-Type": "application/json",
  Origin: "https://www.icloud.com",
  Referer: "https://www.icloud.com/"
};
const AUTH_HEADERS = {
  "User-Agent": CHROME_USER_AGENT,
  // "application/json, text/javascript" matches pyicloud_ipd — differs from "*/*" which Apple WAF may flag
  Accept: "application/json, text/javascript",
  "Content-Type": "application/json",
  Origin: "https://www.icloud.com",
  Referer: "https://www.icloud.com/",
  "X-Apple-Widget-Key": CLIENT_ID,
  "X-Apple-OAuth-Client-Id": CLIENT_ID,
  "X-Apple-OAuth-Client-Type": "firstPartyAuth",
  "X-Apple-OAuth-Redirect-URI": "https://www.icloud.com",
  "X-Apple-OAuth-Require-Grant-Code": "true",
  "X-Apple-OAuth-Response-Type": "code",
  "X-Apple-OAuth-Response-Mode": "web_message"
};
const AUTH_ENDPOINT = "https://idmsa.apple.com/appleauth/auth/";
const BASE_ENDPOINT = "https://www.icloud.com/";
const SETUP_ENDPOINT = "https://setup.icloud.com/setup/ws/1/accountLogin";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AUTH_ENDPOINT,
  AUTH_HEADERS,
  BASE_ENDPOINT,
  CLIENT_ID,
  DEFAULT_HEADERS,
  SETUP_ENDPOINT
});
//# sourceMappingURL=consts.js.map
