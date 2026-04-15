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
var photos_exports = {};
__export(photos_exports, {
  iCloudPhotosEndpointService: () => iCloudPhotosEndpointService,
  iCloudPhotosService: () => iCloudPhotosService
});
module.exports = __toCommonJS(photos_exports);
var import_dayjs = __toESM(require("dayjs"));
var import_timezone = __toESM(require("dayjs/plugin/timezone"));
var import_utc = __toESM(require("dayjs/plugin/utc"));
import_dayjs.default.extend(import_utc.default);
import_dayjs.default.extend(import_timezone.default);
const SMART_FOLDERS = {
  "All Photos": {
    type: "CPLAssetAndMasterByAssetDateWithoutHiddenOrDeleted",
    direction: "ASCENDING",
    query_filter: null
  },
  "Time-lapse": {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "TIMELAPSE" }
      }
    ]
  },
  Videos: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "VIDEO" }
      }
    ]
  },
  "Slo-mo": {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "SLOMO" }
      }
    ]
  },
  Bursts: {
    type: "CPLBurstStackAssetAndMasterByAssetDate",
    direction: "ASCENDING",
    query_filter: null
  },
  Favorites: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "FAVORITE" }
      }
    ]
  },
  Panoramas: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "PANORAMA" }
      }
    ]
  },
  Screenshots: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "SCREENSHOT" }
      }
    ]
  },
  Live: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "LIVE" }
      }
    ]
  },
  Portrait: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "DEPTH" }
      }
    ]
  },
  "Long Exposure": {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "EXPOSURE" }
      }
    ]
  },
  Animated: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    direction: "ASCENDING",
    query_filter: [
      {
        fieldName: "smartAlbum",
        comparator: "EQUALS",
        fieldValue: { type: "STRING", value: "ANIMATED" }
      }
    ]
  },
  "Recently Deleted": {
    type: "CPLAssetAndMasterDeletedByExpungedDate",
    direction: "ASCENDING",
    query_filter: null
  },
  Hidden: {
    type: "CPLAssetAndMasterHiddenByAssetDate",
    direction: "ASCENDING",
    query_filter: null
  }
};
class iCloudPhotosEndpointService {
  /* eslint-disable no-useless-constructor, no-empty-function */
  constructor(serviceUri, headers, _fetchFn) {
    this.serviceUri = serviceUri;
    this.headers = headers;
    this._fetchFn = _fetchFn;
  }
  /* eslint-enable no-useless-constructor, no-empty-function */
  async fetch(url, body, headers) {
    const params = new URLSearchParams({
      remapEnums: "true",
      getCurrentSyncToken: "true"
    });
    const result = await this._fetchFn(
      `${this.serviceUri}/database/1/com.apple.photos.cloud/production/private${url}?${params}`,
      {
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Type": "text/plain",
          ...headers
        },
        body: body ? JSON.stringify(body) : void 0
      }
    );
    const json = await result.json();
    if (json.error) throw new Error(json.error + ": " + json.reason);
    return json;
  }
  /** Raw download fetch — uses the cookie-jar-backed fetch for CDN/download URLs. */
  async download(url) {
    return this._fetchFn(url);
  }
}
class iCloudPhotosService {
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    this.endpointService = new iCloudPhotosEndpointService(serviceUri, service.authStore.getHeaders(), service.fetch);
  }
  endpointService;
  _albums = /* @__PURE__ */ new Map();
  async getAlbums() {
    if (this._albums.size > 0)
      return this._albums;
    const folders = (await this.endpointService.fetch("/records/query", {
      query: { recordType: "CPLAlbumByPositionLive" },
      zoneID: { zoneName: "PrimarySync", zoneType: "REGULAR_CUSTOM_ZONE" }
    })).records;
    Object.entries(SMART_FOLDERS).map(([folderName, folderOptions]) => {
      this._albums.set(folderName, new iCloudPhotoAlbum(this.endpointService, folderName, folderOptions));
    });
    folders.map((folder) => {
      var _a;
      if (!("albumNameEnc" in folder.fields)) return;
      if (folder.recordName === "----Root-Folder----" || ((_a = folder.fields.isDeleted) == null ? void 0 : _a.value)) return;
      const folderName = Buffer.from(folder.fields.albumNameEnc.value, "base64").toString("utf-8");
      this._albums.set(folderName, new iCloudPhotoAlbum(
        this.endpointService,
        folderName,
        {
          type: "CPLContainerRelationLiveByAssetDate",
          direction: "ASCENDING",
          query_filter: [{
            fieldName: "parentId",
            comparator: "EQUALS",
            fieldValue: { type: "STRING", value: folder.recordName }
          }]
        }
      ));
    });
    return this._albums;
  }
  get all() {
    return this._albums.get("All Photos");
  }
}
class iCloudPhotoAlbum {
  /* eslint-disable no-useless-constructor, no-empty-function */
  constructor(endpointService, name, album, pageSize = 100) {
    this.endpointService = endpointService;
    this.name = name;
    this.album = album;
    this.pageSize = pageSize;
  }
  _length;
  _photos = [];
  /* eslint-enable no-useless-constructor, no-empty-function */
  get title() {
    return this.name;
  }
  async getLength() {
    if (!this._length) {
      const result = await this.endpointService.fetch("/internal/records/query/batch", {
        batch: [
          {
            resultsLimit: 1,
            query: {
              filterBy: {
                fieldName: "indexCountID",
                fieldValue: { type: "STRING_LIST", value: [this.album.type] },
                comparator: "IN"
              },
              recordType: "HyperionIndexCountLookup"
            },
            zoneWide: true,
            zoneID: { zoneName: "PrimarySync" }
          }
        ]
      });
      this._length = result.batch[0].records[0].fields.itemCount.value;
    }
    return this._length;
  }
  async photosEndpointBody(offset) {
    return {
      query: {
        filterBy: [
          {
            fieldName: "startRank",
            fieldValue: {
              type: "INT64",
              value: offset
            },
            comparator: "EQUALS"
          },
          {
            fieldName: "direction",
            fieldValue: {
              type: "STRING",
              value: this.album.direction
            },
            comparator: "EQUALS"
          },
          ...this.album.query_filter || []
        ],
        recordType: this.album.type
      },
      resultsLimit: this.pageSize * 2,
      desiredKeys: [
        "resJPEGFullWidth",
        "resJPEGFullHeight",
        "resJPEGFullFileType",
        "resJPEGFullFingerprint",
        "resJPEGFullRes",
        "resJPEGLargeWidth",
        "resJPEGLargeHeight",
        "resJPEGLargeFileType",
        "resJPEGLargeFingerprint",
        "resJPEGLargeRes",
        "resJPEGMedWidth",
        "resJPEGMedHeight",
        "resJPEGMedFileType",
        "resJPEGMedFingerprint",
        "resJPEGMedRes",
        "resJPEGThumbWidth",
        "resJPEGThumbHeight",
        "resJPEGThumbFileType",
        "resJPEGThumbFingerprint",
        "resJPEGThumbRes",
        "resVidFullWidth",
        "resVidFullHeight",
        "resVidFullFileType",
        "resVidFullFingerprint",
        "resVidFullRes",
        "resVidMedWidth",
        "resVidMedHeight",
        "resVidMedFileType",
        "resVidMedFingerprint",
        "resVidMedRes",
        "resVidSmallWidth",
        "resVidSmallHeight",
        "resVidSmallFileType",
        "resVidSmallFingerprint",
        "resVidSmallRes",
        "resSidecarWidth",
        "resSidecarHeight",
        "resSidecarFileType",
        "resSidecarFingerprint",
        "resSidecarRes",
        "itemType",
        "dataClassType",
        "filenameEnc",
        "originalOrientation",
        "resOriginalWidth",
        "resOriginalHeight",
        "resOriginalFileType",
        "resOriginalFingerprint",
        "resOriginalRes",
        "resOriginalAltWidth",
        "resOriginalAltHeight",
        "resOriginalAltFileType",
        "resOriginalAltFingerprint",
        "resOriginalAltRes",
        "resOriginalVidComplWidth",
        "resOriginalVidComplHeight",
        "resOriginalVidComplFileType",
        "resOriginalVidComplFingerprint",
        "resOriginalVidComplRes",
        "isDeleted",
        "isExpunged",
        "dateExpunged",
        "remappedRef",
        "recordName",
        "recordType",
        "recordChangeTag",
        "masterRef",
        "adjustmentRenderType",
        "assetDate",
        "addedDate",
        "isFavorite",
        "isHidden",
        "orientation",
        "duration",
        "assetSubtype",
        "assetSubtypeV2",
        "assetHDRType",
        "burstFlags",
        "burstFlagsExt",
        "burstId",
        "captionEnc",
        "locationEnc",
        "locationV2Enc",
        "locationLatitude",
        "locationLongitude",
        "adjustmentType",
        "timeZoneOffset",
        "vidComplDurValue",
        "vidComplDurScale",
        "vidComplDispValue",
        "vidComplDispScale",
        "vidComplVisibilityState",
        "customRenderedValue",
        "containerId",
        "itemId",
        "position",
        "isKeyAsset"
      ],
      zoneID: { zoneName: "PrimarySync" }
    };
  }
  async getPhotos() {
    if (this._photos.length)
      return this._photos;
    const isDescending = this.album.direction === "DESCENDING";
    const total = await this.getLength();
    let offset = isDescending ? total - 1 : 0;
    while (true) {
      const result = await this.endpointService.fetch(
        "/records/query",
        await this.photosEndpointBody(offset)
      );
      const assetRecords = {};
      const masterRecords = [];
      result.records.map((item) => {
        switch (item.recordType) {
          case "CPLAsset":
            assetRecords[item.fields.masterRef.value.recordName] = item;
            break;
          case "CPLMaster":
            masterRecords.push(item);
            break;
        }
      });
      masterRecords.map((record) => {
        this._photos.push(new iCloudPhotoAsset(this.endpointService, record, assetRecords[record.recordName]));
      });
      if (masterRecords.length > 0)
        offset += isDescending ? -masterRecords.length : masterRecords.length;
      else
        break;
    }
    return this._photos;
  }
}
class iCloudPhotoAsset {
  /* eslint-disable no-useless-constructor, no-empty-function */
  constructor(endpointService, masterRecord, assetRecord) {
    this.endpointService = endpointService;
    this.masterRecord = masterRecord;
    this.assetRecord = assetRecord;
  }
  PHOTO_VERSION_LOOKUP = {
    original: "resOriginal",
    medium: "resJPEGMed",
    thumb: "resJPEGThumb"
  };
  VIDEO_VERSION_LOOKUP = {
    original: "resOriginal",
    medium: "resVidMed",
    thumb: "resVidSmall"
  };
  _versions = {};
  /* eslint-enable no-useless-constructor, no-empty-function */
  get id() {
    return this.masterRecord.recordName;
  }
  get filename() {
    return Buffer.from(this.masterRecord.fields.filenameEnc.value, "base64").toString("utf-8");
  }
  get size() {
    return this.masterRecord.fields.resOriginalRes.value.size;
  }
  get created() {
    return this.assetDate;
  }
  get assetDate() {
    return (0, import_dayjs.default)(this.assetRecord.fields.assetDate.value).local().toDate();
  }
  get addedDate() {
    return (0, import_dayjs.default)(this.assetRecord.fields.addedDate.value).local().toDate();
  }
  /**
   * @returns array [width, height] in pixels
   */
  get dimension() {
    return [
      this.masterRecord.fields.resOriginalWidth.value,
      this.masterRecord.fields.resOriginalHeight.value
    ];
  }
  get versions() {
    if (Object.keys(this._versions).length <= 0) {
      const typedVersionLookup = "resVidSmallRes" in this.masterRecord.fields ? this.VIDEO_VERSION_LOOKUP : this.PHOTO_VERSION_LOOKUP;
      Object.entries(typedVersionLookup).map(([key, prefix]) => {
        var _a, _b, _c, _d, _e, _f, _g;
        if (`${prefix}Res` in this.masterRecord.fields) {
          const fields = this.masterRecord.fields;
          this._versions[key] = {
            filename: this.filename,
            width: (_a = fields[`${prefix}Width`]) == null ? void 0 : _a.value,
            height: (_b = fields[`${prefix}Height`]) == null ? void 0 : _b.value,
            size: (_d = (_c = fields[`${prefix}Res`]) == null ? void 0 : _c.value) == null ? void 0 : _d.size,
            url: (_f = (_e = fields[`${prefix}Res`]) == null ? void 0 : _e.value) == null ? void 0 : _f.downloadURL,
            type: (_g = fields[`${prefix}FileType`]) == null ? void 0 : _g.value
          };
        }
      });
    }
    return this._versions;
  }
  async download(version = "original") {
    if (Object.keys(this._versions).length <= 0)
      this.versions;
    if (!(version in this._versions))
      return null;
    const response = await this.endpointService.download(this._versions[version].url);
    return response.arrayBuffer();
  }
  async delete() {
    try {
      await this.endpointService.fetch(
        "/records/modify",
        {
          operations: [{
            operationType: "update",
            record: {
              recordName: this.assetRecord.recordName,
              recordType: this.assetRecord.recordType,
              recordChangeTag: this.masterRecord.recordChangeTag,
              fields: { isDeleted: { value: 1 } }
            }
          }],
          zoneID: { zoneName: "PrimarySync" },
          atomic: true
        }
      );
      return true;
    } catch (err) {
      return false;
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudPhotosEndpointService,
  iCloudPhotosService
});
//# sourceMappingURL=photos.js.map
