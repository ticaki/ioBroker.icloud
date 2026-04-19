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
    obj_type: "CPLAssetByAssetDateWithoutHiddenOrDeleted",
    direction: "ASCENDING",
    query_filter: null
  },
  "Time-lapse": {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Timelapse",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Video",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Slomo",
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
    obj_type: "CPLBurstStackAssetAndMasterByAssetDate",
    direction: "ASCENDING",
    query_filter: null
  },
  Favorites: {
    type: "CPLAssetAndMasterInSmartAlbumByAssetDate",
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Favorite",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Panorama",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Screenshot",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Live",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Depth",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:LongExposure",
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
    obj_type: "CPLAssetInSmartAlbumByAssetDate:Animated",
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
    obj_type: "CPLAssetAndMasterDeletedByExpungedDate",
    direction: "ASCENDING",
    query_filter: null
  },
  Hidden: {
    type: "CPLAssetAndMasterHiddenByAssetDate",
    obj_type: "CPLAssetAndMasterHiddenByAssetDate",
    direction: "ASCENDING",
    query_filter: null
  }
};
const DESIRED_KEYS = [
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
];
class iCloudPhotosEndpointService {
  constructor(serviceUri, headers, _fetchFn) {
    this.serviceUri = serviceUri;
    this.headers = headers;
    this._fetchFn = _fetchFn;
  }
  async fetch(url, body, headers) {
    const params = new URLSearchParams({
      remapEnums: "true",
      getCurrentSyncToken: "true"
    });
    const result = await this._fetchFn(
      `${this.serviceUri}/database/1/com.apple.photos.cloud/production/private${url}?${params.toString()}`,
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
    if (json.error) {
      throw new Error(`${json.error}: ${json.reason}`);
    }
    return json;
  }
  /**
   * Raw download fetch — uses the cookie-jar-backed fetch for CDN/download URLs.
   *
   * @param url - The download URL to fetch.
   */
  async download(url) {
    return this._fetchFn(url);
  }
}
class iCloudPhotosService {
  constructor(service, serviceUri) {
    this.service = service;
    this.serviceUri = serviceUri;
    this.endpointService = new iCloudPhotosEndpointService(
      serviceUri,
      service.authStore.getHeaders(),
      service.fetch
    );
  }
  endpointService;
  _albums = /* @__PURE__ */ new Map();
  /**
   * Check if the photo library indexing is finished.
   * Returns true when ready, false when still indexing.
   */
  async checkIndexingState() {
    var _a, _b, _c, _d;
    try {
      const result = await this.endpointService.fetch("/records/query", {
        query: { recordType: "CheckIndexingState" },
        zoneID: { zoneName: "PrimarySync", zoneType: "REGULAR_CUSTOM_ZONE" }
      });
      const state = (_d = (_c = (_b = (_a = result.records) == null ? void 0 : _a[0]) == null ? void 0 : _b.fields) == null ? void 0 : _c.state) == null ? void 0 : _d.value;
      return state === "FINISHED";
    } catch {
      return false;
    }
  }
  async getAlbums() {
    var _a;
    if (this._albums.size > 0) {
      return this._albums;
    }
    const folders = (await this.endpointService.fetch("/records/query", {
      query: { recordType: "CPLAlbumByPositionLive" },
      zoneID: { zoneName: "PrimarySync", zoneType: "REGULAR_CUSTOM_ZONE" }
    })).records;
    for (const [folderName, folderOptions] of Object.entries(SMART_FOLDERS)) {
      this._albums.set(folderName, new iCloudPhotoAlbum(this.endpointService, folderName, folderOptions));
    }
    for (const folder of folders) {
      if (!("albumNameEnc" in folder.fields)) {
        continue;
      }
      if (folder.recordName === "----Root-Folder----" || ((_a = folder.fields.isDeleted) == null ? void 0 : _a.value)) {
        continue;
      }
      const folderName = Buffer.from(folder.fields.albumNameEnc.value, "base64").toString("utf-8");
      this._albums.set(
        folderName,
        new iCloudPhotoAlbum(this.endpointService, folderName, {
          type: "CPLContainerRelationLiveByAssetDate",
          direction: "ASCENDING",
          query_filter: [
            {
              fieldName: "parentId",
              comparator: "EQUALS",
              fieldValue: { type: "STRING", value: folder.recordName }
            }
          ],
          obj_type: "CPLContainerRelationNotDeletedByAssetDate",
          record_id: folder.recordName
        })
      );
    }
    return this._albums;
  }
  /**
   * Invalidate cached albums so the next getAlbums() call fetches fresh data.
   */
  resetAlbums() {
    this._albums.clear();
  }
  get all() {
    return this._albums.get("All Photos");
  }
  /**
   * Returns a summary of all albums: name and photo count.
   * Automatically loads albums if not yet fetched.
   */
  async getAlbumSummaries() {
    const albums = await this.getAlbums();
    const summaries = [];
    for (const [name, album] of albums) {
      try {
        const count = await album.getLength();
        summaries.push({ name, photoCount: count });
      } catch {
        summaries.push({ name, photoCount: -1 });
      }
    }
    return summaries;
  }
  /**
   * Retrieve a page of photos from a given album.
   *
   * @param albumName - Album name (defaults to 'All Photos')
   * @param offset - Start offset for pagination
   * @param limit - Number of photos to retrieve (max 100)
   * @returns Array of serializable photo metadata
   */
  async getPhotosPage(albumName = "All Photos", offset = 0, limit = 100) {
    const albums = await this.getAlbums();
    const album = albums.get(albumName);
    if (!album) {
      throw new Error(`Album not found: ${albumName}`);
    }
    const photos = await album.getPhotosPage(offset, Math.min(limit, 100));
    return photos.map((p) => p.toInfo());
  }
  /**
   * Download a photo by its record name from the 'All Photos' album.
   *
   * @param photoId - The recordName of the photo master record
   * @param version - Which version to download (original, medium, thumb)
   * @returns The raw bytes as ArrayBuffer, or null if not found
   */
  async downloadPhoto(photoId, version = "original") {
    const albums = await this.getAlbums();
    const allPhotos = albums.get("All Photos");
    if (!allPhotos) {
      throw new Error("All Photos album not available");
    }
    const photo = await allPhotos.getPhotoById(photoId);
    if (!photo) {
      return null;
    }
    const data = await photo.download(version);
    if (!data) {
      return null;
    }
    return { data, filename: photo.filename, size: data.byteLength };
  }
  /**
   * Delete a photo by its record name.
   *
   * @param photoId - The recordName of the photo master record
   */
  async deletePhoto(photoId) {
    const albums = await this.getAlbums();
    const allPhotos = albums.get("All Photos");
    if (!allPhotos) {
      throw new Error("All Photos album not available");
    }
    const photo = await allPhotos.getPhotoById(photoId);
    if (!photo) {
      throw new Error(`Photo not found: ${photoId}`);
    }
    return photo.delete();
  }
}
class iCloudPhotoAlbum {
  constructor(endpointService, name, album, pageSize = 100) {
    this.endpointService = endpointService;
    this.name = name;
    this.album = album;
    this.pageSize = pageSize;
  }
  _length;
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
                fieldValue: {
                  type: "STRING_LIST",
                  value: [
                    this.album.record_id ? `${this.album.obj_type}:${this.album.record_id}` : this.album.obj_type
                  ]
                },
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
  photosEndpointBody(offset, limit) {
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
      resultsLimit: (limit != null ? limit : this.pageSize) * 2,
      desiredKeys: DESIRED_KEYS,
      zoneID: { zoneName: "PrimarySync" }
    };
  }
  /**
   * Fetch a single page of photos at the given offset.
   *
   * @param offset - Start offset
   * @param limit - Maximum number of photo assets to return (max 100)
   */
  async getPhotosPage(offset, limit) {
    const result = await this.endpointService.fetch(
      "/records/query",
      this.photosEndpointBody(offset, limit)
    );
    return this.parsePhotoResponse(result);
  }
  /**
   * Find a specific photo by its master record name (paging through the album).
   *
   * @param photoId - The recordName of the master record
   */
  async getPhotoById(photoId) {
    const total = await this.getLength();
    const isDescending = this.album.direction === "DESCENDING";
    let offset = isDescending ? total - 1 : 0;
    while (true) {
      const result = await this.endpointService.fetch(
        "/records/query",
        this.photosEndpointBody(offset)
      );
      const photos = this.parsePhotoResponse(result);
      const found = photos.find((p) => p.id === photoId);
      if (found) {
        return found;
      }
      if (photos.length === 0) {
        break;
      }
      offset += isDescending ? -photos.length : photos.length;
      if (isDescending && offset < 0) {
        break;
      }
    }
    return null;
  }
  async getPhotos() {
    const photos = [];
    const isDescending = this.album.direction === "DESCENDING";
    const total = await this.getLength();
    let offset = isDescending ? total - 1 : 0;
    while (true) {
      const result = await this.endpointService.fetch(
        "/records/query",
        this.photosEndpointBody(offset)
      );
      const page = this.parsePhotoResponse(result);
      photos.push(...page);
      if (page.length > 0) {
        offset += isDescending ? -page.length : page.length;
      } else {
        break;
      }
    }
    return photos;
  }
  parsePhotoResponse(result) {
    const assetRecords = {};
    const masterRecords = [];
    for (const item of result.records) {
      if (item.recordType === "CPLAsset") {
        assetRecords[item.fields.masterRef.value.recordName] = item;
      } else if (item.recordType === "CPLMaster") {
        masterRecords.push(item);
      }
    }
    return masterRecords.filter((record) => record.recordName in assetRecords).map((record) => new iCloudPhotoAsset(this.endpointService, record, assetRecords[record.recordName]));
  }
}
class iCloudPhotoAsset {
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
  ITEM_TYPES = {
    "public.heic": "image",
    "public.jpeg": "image",
    "public.png": "image",
    "com.apple.quicktime-movie": "movie"
  };
  _versions = {};
  get id() {
    return this.masterRecord.recordName;
  }
  get filename() {
    return Buffer.from(this.masterRecord.fields.filenameEnc.value, "base64").toString("utf-8");
  }
  get size() {
    var _a, _b;
    return (_b = (_a = this.masterRecord.fields.resOriginalRes) == null ? void 0 : _a.value.size) != null ? _b : 0;
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
    var _a, _b, _c, _d;
    return [
      (_b = (_a = this.masterRecord.fields.resOriginalWidth) == null ? void 0 : _a.value) != null ? _b : 0,
      (_d = (_c = this.masterRecord.fields.resOriginalHeight) == null ? void 0 : _c.value) != null ? _d : 0
    ];
  }
  get itemType() {
    var _a, _b;
    const raw = (_b = (_a = this.masterRecord.fields.itemType) == null ? void 0 : _a.value) != null ? _b : "";
    if (raw in this.ITEM_TYPES) {
      return this.ITEM_TYPES[raw];
    }
    const ext = this.filename.toLowerCase();
    if (ext.endsWith(".heic") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".png")) {
      return "image";
    }
    return "movie";
  }
  get isFavorite() {
    var _a;
    return ((_a = this.assetRecord.fields.isFavorite) == null ? void 0 : _a.value) === 1;
  }
  get isHidden() {
    var _a;
    return ((_a = this.assetRecord.fields.isHidden) == null ? void 0 : _a.value) === 1;
  }
  get duration() {
    var _a, _b;
    return (_b = (_a = this.assetRecord.fields.duration) == null ? void 0 : _a.value) != null ? _b : 0;
  }
  get latitude() {
    var _a, _b;
    return (_b = (_a = this.assetRecord.fields.locationLatitude) == null ? void 0 : _a.value) != null ? _b : null;
  }
  get longitude() {
    var _a, _b;
    return (_b = (_a = this.assetRecord.fields.locationLongitude) == null ? void 0 : _a.value) != null ? _b : null;
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
    if (Object.keys(this._versions).length <= 0) {
      this.versions;
    }
    if (!(version in this._versions)) {
      return null;
    }
    const response = await this.endpointService.download(this._versions[version].url);
    return response.arrayBuffer();
  }
  async delete() {
    try {
      await this.endpointService.fetch("/records/modify", {
        operations: [
          {
            operationType: "update",
            record: {
              recordName: this.assetRecord.recordName,
              recordType: this.assetRecord.recordType,
              recordChangeTag: this.masterRecord.recordChangeTag,
              fields: { isDeleted: { value: 1 } }
            }
          }
        ],
        zoneID: { zoneName: "PrimarySync" },
        atomic: true
      });
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Returns a serializable info object for sendTo responses.
   */
  toInfo() {
    const [width, height] = this.dimension;
    return {
      id: this.id,
      filename: this.filename,
      size: this.size,
      width,
      height,
      itemType: this.itemType,
      isFavorite: this.isFavorite,
      isHidden: this.isHidden,
      duration: this.duration,
      assetDate: this.assetDate.getTime(),
      addedDate: this.addedDate.getTime(),
      latitude: this.latitude,
      longitude: this.longitude
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iCloudPhotosEndpointService,
  iCloudPhotosService
});
//# sourceMappingURL=photos.js.map
