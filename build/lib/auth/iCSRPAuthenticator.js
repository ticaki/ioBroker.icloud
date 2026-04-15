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
var iCSRPAuthenticator_exports = {};
__export(iCSRPAuthenticator_exports, {
  GSASRPAuthenticator: () => GSASRPAuthenticator
});
module.exports = __toCommonJS(iCSRPAuthenticator_exports);
var import_crypto = __toESM(require("crypto"));
var import_util = require("util");
const SRP_N = BigInt(
  "0xac6bdb41324a9a9bf166de5e1389582faf72b6651987ee07fc3192943db56050a37329cbb4a099ed8193e0757767a13dd52312ab4b03310dcd7f48a9da04fd50e8083969edb767b0cf6095179a163ab3661a05fbd5faaae82918a9962f0b93b855f97993ec975eeaa80d740adbf4ff747359d041d5c33ea71d281e446b14773bca97b43a23fb801676bd207a436c6481f1d2b9078717461a5b9d32e688f87748544523b524b0d57d5ea77a2775d2ecfa032cfbdbf52fb3786160279004e57ae6af874e7303ce53299ccc041c7bc308d82a5698f3a8d0c38271ae35f8e9dbfbb694b5c803d89f7ae435de236d525f54759b65e372fcd68ef20fa7111f9e4aff73"
);
const SRP_G = 2n;
const SRP_N_BYTES = 256;
function srpBytesFromBigint(n) {
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < result.length; i++)
    result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return result;
}
function srpBigintFromBytes(bytes) {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  return n;
}
function srpPadToLen(value, targetLen) {
  const raw = srpBytesFromBigint(value);
  if (raw.length >= targetLen) return raw;
  const padded = new Uint8Array(targetLen);
  padded.set(raw, targetLen - raw.length);
  return padded;
}
function srpConcat(...arrays) {
  let total = 0;
  for (const a of arrays) total += a.length;
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}
function srpXor(a, b) {
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = a[i] ^ b[i];
  return result;
}
function srpToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function srpSha256(data) {
  const buf = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data);
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", buf));
}
async function srpSha256BigInt(data) {
  return srpBigintFromBytes(await srpSha256(data));
}
function srpModPow(base, exp, mod) {
  if (mod === 1n) return 0n;
  base = (base % mod + mod) % mod;
  let result = 1n;
  for (; exp > 0n; exp >>= 1n) {
    if (exp & 1n) result = result * base % mod;
    base = base * base % mod;
  }
  return result;
}
const stringToU8Array = (str) => new import_util.TextEncoder().encode(str);
const base64ToU8Array = (str) => Uint8Array.from(Buffer.from(str, "base64"));
class GSASRPAuthenticator {
  constructor(username) {
    this.username = username;
  }
  clienta;
  clientA;
  async derivePassword(protocol, password, salt, iterations) {
    let passHash = await srpSha256(stringToU8Array(password));
    if (protocol === "s2k_fo")
      passHash = stringToU8Array(srpToHex(passHash));
    const imported = await globalThis.crypto.subtle.importKey(
      "raw",
      Buffer.from(passHash),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derived = await globalThis.crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: { name: "SHA-256" }, iterations, salt: Buffer.from(salt) },
      imported,
      256
    );
    return new Uint8Array(derived);
  }
  async getInit() {
    if (this.clientA !== void 0) throw new Error("Already initialized");
    this.clienta = srpBigintFromBytes(import_crypto.default.randomBytes(SRP_N_BYTES));
    this.clientA = srpModPow(SRP_G, this.clienta, SRP_N);
    const a = Buffer.from(srpBytesFromBigint(this.clientA)).toString("base64");
    return { a, protocols: ["s2k", "s2k_fo"], accountName: this.username };
  }
  async getComplete(password, serverData) {
    if (this.clientA === void 0 || this.clienta === void 0)
      throw new Error("Not initialized");
    if (serverData.protocol !== "s2k" && serverData.protocol !== "s2k_fo")
      throw new Error("Unsupported protocol " + serverData.protocol);
    const salt = base64ToU8Array(serverData.salt);
    const serverPubBytes = base64ToU8Array(serverData.b);
    const B = srpBigintFromBytes(serverPubBytes);
    const k = await srpSha256BigInt(
      srpConcat(srpBytesFromBigint(SRP_N), srpPadToLen(SRP_G, SRP_N_BYTES))
    );
    const u = await srpSha256BigInt(
      srpConcat(srpPadToLen(this.clientA, SRP_N_BYTES), srpPadToLen(B, SRP_N_BYTES))
    );
    const p = await this.derivePassword(serverData.protocol, password, salt, serverData.iteration);
    const x = await srpSha256BigInt(
      srpConcat(salt, await srpSha256(srpConcat(new Uint8Array([58]), p)))
    );
    const base = B - srpModPow(SRP_G, x, SRP_N) * k;
    const S = srpModPow(base, this.clienta + u * x, SRP_N);
    const K = await srpSha256(srpBytesFromBigint(S));
    const M1 = await srpSha256(srpConcat(
      srpXor(
        await srpSha256(srpBytesFromBigint(SRP_N)),
        await srpSha256(srpPadToLen(SRP_G, SRP_N_BYTES))
      ),
      await srpSha256(stringToU8Array(this.username)),
      salt,
      srpBytesFromBigint(this.clientA),
      srpBytesFromBigint(B),
      K
    ));
    const M2 = await srpSha256(srpConcat(srpBytesFromBigint(this.clientA), M1, K));
    return {
      accountName: this.username,
      m1: Buffer.from(M1).toString("base64"),
      m2: Buffer.from(M2).toString("base64"),
      c: serverData.c
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GSASRPAuthenticator
});
//# sourceMappingURL=iCSRPAuthenticator.js.map
