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
var drive_exports = {};
__export(drive_exports, {
  iCloudDriveNode: () => iCloudDriveNode,
  iCloudDriveRawNode: () => iCloudDriveRawNode,
  iCloudDriveService: () => iCloudDriveService
});
module.exports = __toCommonJS(drive_exports);
var import_web = require("stream/web");
class iCloudDriveRawNode {
  dateCreated;
  drivewsid;
  docwsid;
  zone;
  name;
  etag;
  type;
  assetQuota;
  fileCount;
  shareCount;
  shareAliasCount;
  directChildrenCount;
  items;
  numberOfItems;
  status;
  parentId;
}
class iCloudDriveNode {
  service;
  serviceUri;
  nodeId;
  rawData;
  hasData = false;
  lastUpdated;
  dateCreated;
  name;
  etag;
  type;
  size;
  fileCount;
  shareCount;
  directChildrenCount;
  parentId;
  items;
  constructor(service, nodeId = "root") {
    this.service = service;
    this.serviceUri = service.serviceUri;
    this.nodeId = nodeId;
  }
  async refresh() {
    const response = await this.service.service.fetch(`${this.serviceUri}/retrieveItemDetailsInFolders`, {
      headers: this.service.service.authStore.getHeaders(),
      method: "POST",
      body: JSON.stringify([
        {
          drivewsid: this.nodeId,
          partialData: false
        }
      ])
    });
    let json = await response.json();
    if (json.errorCode) {
      throw new Error(json.errorReason);
    }
    if (Array.isArray(json)) {
      json = json[0];
    }
    const rawNode = json;
    this.hasData = true;
    this.lastUpdated = Date.now();
    this.rawData = rawNode;
    this.dateCreated = new Date(rawNode.dateCreated);
    this.name = rawNode.name;
    this.etag = rawNode.etag;
    this.type = rawNode.type;
    this.size = rawNode.assetQuota;
    this.fileCount = rawNode.fileCount;
    this.shareCount = rawNode.shareCount;
    this.directChildrenCount = rawNode.directChildrenCount;
    this.items = rawNode.items;
    this.parentId = rawNode.parentId;
    return this;
  }
}
class iCloudDriveService {
  service;
  serviceUri;
  docsServiceUri;
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    this.docsServiceUri = service.accountInfo.webservices.docws.url;
  }
  async getNode(nodeId = "FOLDER::com.apple.CloudDocs::root") {
    return new iCloudDriveNode(this, typeof nodeId === "string" ? nodeId : nodeId.drivewsid).refresh();
  }
  async downloadFile(item) {
    if (item.size === 0) {
      return new import_web.ReadableStream({
        start(controller) {
          controller.close();
        }
      });
    }
    const response = await this.service.fetch(
      `${this.docsServiceUri}/ws/${item.zone || "com.apple.CloudDocs"}/download/by_id?document_id=${encodeURIComponent(item.docwsid)}`,
      { headers: this.service.authStore.getHeaders() }
    );
    const json = await response.json();
    if (json.error_code) {
      throw new Error(json.reason);
    }
    const url = json.data_token ? json.data_token.url : json.package_token.url;
    const fileResponse = await this.service.fetch(url, { headers: this.service.authStore.getHeaders() });
    return fileResponse.body;
  }
  async mkdir(parent, name) {
    const parentId = typeof parent === "string" ? parent : parent.drivewsid;
    const response = await this.service.fetch(`${this.serviceUri}/createFolders`, {
      headers: this.service.authStore.getHeaders(),
      method: "POST",
      body: JSON.stringify({
        destinationDrivewsId: parentId,
        folders: [
          {
            name,
            clientId: "auth-ab95dcd4-65db-11ed-a792-244bfee1e3c1"
          }
        ]
      })
    });
    return response.json();
  }
  async del(item, etag) {
    const drivewsid = typeof item === "string" ? item : item.drivewsid;
    const itemEtag = typeof item === "string" ? etag : item.etag;
    const response = await this.service.fetch(`${this.serviceUri}/moveItemsToTrash`, {
      headers: this.service.authStore.getHeaders(),
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            drivewsid,
            etag: itemEtag,
            clientId: "auth-ab95dcd4-65db-11ed-a792-244bfee1e3c1"
          }
        ]
      })
    });
    return response.json();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudDriveNode,
  iCloudDriveRawNode,
  iCloudDriveService
});
//# sourceMappingURL=drive.js.map
