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
  dateModified;
  dateChanged;
  lastOpenTime;
  extension;
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
  zone;
  fileCount;
  shareCount;
  directChildrenCount;
  parentId;
  docwsid;
  items;
  extension;
  dateModified;
  dateChanged;
  dateLastOpen;
  _children = null;
  constructor(service, nodeId = "root") {
    this.service = service;
    this.serviceUri = service.serviceUri;
    this.nodeId = nodeId;
  }
  async refresh() {
    var _a;
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
    this.zone = (_a = rawNode.zone) != null ? _a : "com.apple.CloudDocs";
    this.size = rawNode.assetQuota;
    this.fileCount = rawNode.fileCount;
    this.shareCount = rawNode.shareCount;
    this.directChildrenCount = rawNode.directChildrenCount;
    this.items = rawNode.items;
    this.parentId = rawNode.parentId;
    this.docwsid = rawNode.docwsid;
    this.extension = rawNode.extension;
    this.dateModified = rawNode.dateModified ? new Date(rawNode.dateModified) : void 0;
    this.dateChanged = rawNode.dateChanged ? new Date(rawNode.dateChanged) : void 0;
    this.dateLastOpen = rawNode.lastOpenTime ? new Date(rawNode.lastOpenTime) : void 0;
    this._children = null;
    return this;
  }
  get fullName() {
    return this.extension ? `${this.name}.${this.extension}` : this.name;
  }
  async getChildren() {
    var _a;
    if (this._children) {
      return this._children;
    }
    if (!this.hasData) {
      await this.refresh();
    }
    this._children = ((_a = this.items) != null ? _a : []).map((item) => {
      var _a2, _b;
      const child = new iCloudDriveNode(this.service, item.drivewsid);
      child.name = item.name;
      child.etag = item.etag;
      child.type = item.type;
      child.size = (_a2 = item.size) != null ? _a2 : 0;
      child.parentId = item.parentId;
      child.docwsid = item.docwsid;
      child.zone = (_b = item.zone) != null ? _b : "com.apple.CloudDocs";
      child.dateCreated = new Date(item.dateCreated);
      child.extension = item.extension;
      child.dateModified = item.dateModified ? new Date(item.dateModified) : void 0;
      child.dateChanged = item.dateChanged ? new Date(item.dateChanged) : void 0;
      child.dateLastOpen = item.lastOpenTime ? new Date(item.lastOpenTime) : void 0;
      child.items = [];
      return child;
    });
    return this._children;
  }
  dir() {
    var _a;
    if (this.type === "FILE") {
      return null;
    }
    return ((_a = this.items) != null ? _a : []).map((item) => item.extension ? `${item.name}.${item.extension}` : item.name);
  }
  async get(name) {
    if (this.type === "FILE") {
      return void 0;
    }
    const children = await this.getChildren();
    return children.find((c) => c.fullName === name || c.name === name);
  }
  async mkdir(name) {
    return this.service.mkdir(this.nodeId, name);
  }
  async rename(name) {
    return this.service.renameItem(this.nodeId, this.etag, name);
  }
  async delete() {
    return this.service.del(this.nodeId, this.etag);
  }
  async open() {
    var _a, _b, _c, _d, _e;
    const docwsid = (_b = this.docwsid) != null ? _b : (_a = this.rawData) == null ? void 0 : _a.docwsid;
    if (!docwsid) {
      throw new Error("Node has no docwsid, call refresh() first");
    }
    const zone = (_e = (_d = this.zone) != null ? _d : (_c = this.rawData) == null ? void 0 : _c.zone) != null ? _e : "com.apple.CloudDocs";
    return this.service.downloadFile({ docwsid, zone, size: this.size });
  }
  async upload(file) {
    var _a, _b;
    const docwsid = (_b = this.docwsid) != null ? _b : (_a = this.rawData) == null ? void 0 : _a.docwsid;
    if (!docwsid) {
      throw new Error("Node has no docwsid, call refresh() first");
    }
    return this.service.sendFile(docwsid, file);
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
    var _a, _b;
    if (item.size === 0) {
      return new import_web.ReadableStream({
        start(controller) {
          controller.close();
        }
      });
    }
    const params = this.service.getParams();
    params.set("document_id", item.docwsid);
    const zone = item.zone || "com.apple.CloudDocs";
    const response = await this.service.fetch(
      `${this.docsServiceUri}/ws/${zone}/download/by_id?${params.toString()}`,
      { headers: this.service.authStore.getHeaders() }
    );
    if (!response.ok) {
      let body = "";
      try {
        body = await response.text();
      } catch {
      }
      throw new Error(
        `${response.statusText} (${response.status}) fetching download URL for ${item.docwsid} [zone=${zone}]${body ? `: ${body.slice(0, 200)}` : ""}`
      );
    }
    const json = await response.json();
    if (json.error_code) {
      throw new Error(`${(_a = json.reason) != null ? _a : json.error_code} [docwsid=${item.docwsid}, zone=${zone}]`);
    }
    const url = json.data_token ? json.data_token.url : (_b = json.package_token) == null ? void 0 : _b.url;
    if (!url) {
      throw new Error(
        `No download URL in response for ${item.docwsid} [zone=${zone}]: ${JSON.stringify(json).slice(0, 200)}`
      );
    }
    const fileResponse = await this.service.fetch(url, {
      headers: this.service.authStore.getHeaders()
    });
    if (!fileResponse.ok) {
      let body = "";
      try {
        body = await fileResponse.text();
      } catch {
      }
      throw new Error(
        `${fileResponse.statusText} (${fileResponse.status}) downloading content for ${item.docwsid}${body ? `: ${body.slice(0, 200)}` : ""}`
      );
    }
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
  async renameItem(nodeId, etag, name) {
    const response = await this.service.fetch(`${this.serviceUri}/renameItems`, {
      headers: this.service.authStore.getHeaders(),
      method: "POST",
      body: JSON.stringify({
        items: [{ drivewsid: nodeId, etag, name }]
      })
    });
    return response.json();
  }
  async getAppData() {
    const response = await this.service.fetch(`${this.serviceUri}/retrieveAppLibraries`, {
      headers: this.service.authStore.getHeaders()
    });
    const json = await response.json();
    return json.items;
  }
  /**
   * Navigate to a node by its slash-separated path relative to the root folder.
   * Example: `getNodeByPath('Documents/Photos/cat.jpg')`
   *
   * @param pathStr - Slash-separated path, e.g. `"Documents/Photos/cat.jpg"`
   */
  async getNodeByPath(pathStr) {
    const parts = pathStr.split("/").map((p) => p.trim()).filter(Boolean);
    let node = await this.getNode();
    for (const part of parts) {
      const child = await node.get(part);
      if (!child) {
        throw new Error(`Path segment "${part}" not found in "${node.fullName}"`);
      }
      node = child;
      if (node.type === "FOLDER" && !node.hasData) {
        await node.refresh();
      }
    }
    return node;
  }
  async sendFile(folderDocwsid, file) {
    var _a;
    const contentType = (_a = file.contentType) != null ? _a : "application/octet-stream";
    const uploadResponse = await this.service.fetch(`${this.docsServiceUri}/ws/com.apple.CloudDocs/upload/web`, {
      headers: {
        ...this.service.authStore.getHeaders(),
        "Content-Type": "text/plain"
      },
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        type: "FILE",
        content_type: contentType,
        size: file.content.byteLength
      })
    });
    const uploadJson = await uploadResponse.json();
    const { document_id, url } = uploadJson[0];
    const formData = new FormData();
    formData.append(
      file.name,
      new Blob([file.content], { type: contentType }),
      file.name
    );
    const contentResponse = await this.service.fetch(url, { method: "POST", body: formData });
    const contentJson = await contentResponse.json();
    await this._updateContentws(folderDocwsid, contentJson.singleFile, document_id, file.name);
  }
  async _updateContentws(folderDocwsid, sfInfo, documentId, fileName) {
    const data = {
      data: {
        signature: sfInfo.fileChecksum,
        wrapping_key: sfInfo.wrappingKey,
        reference_signature: sfInfo.referenceChecksum,
        size: sfInfo.size,
        ...sfInfo.receipt ? { receipt: sfInfo.receipt } : {}
      },
      command: "add_file",
      create_short_guid: true,
      document_id: documentId,
      path: { starting_document_id: folderDocwsid, path: fileName },
      allow_conflict: true,
      file_flags: { is_writable: true, is_executable: false, is_hidden: false },
      mtime: Date.now(),
      btime: Date.now()
    };
    const response = await this.service.fetch(`${this.docsServiceUri}/ws/com.apple.CloudDocs/update/documents`, {
      headers: {
        ...this.service.authStore.getHeaders(),
        "Content-Type": "text/plain"
      },
      method: "POST",
      body: JSON.stringify(data)
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
