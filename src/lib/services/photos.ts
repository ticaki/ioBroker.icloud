import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type iCloudService from '..';
dayjs.extend(utc);
dayjs.extend(timezone);

type Album = {
    type: string;
    direction: string;
    query_filter: Array<{
        fieldName: string;
        comparator: string;
        fieldValue: {
            type: string;
            value: unknown;
        };
    }> | null;
};

interface Folder {
    recordName: string;
    recordType: string;
    fields: Record<string, { value: unknown; type: string }>;
    pluginFields: Record<string, unknown>;
    recordChangeTag: string;
    created: {
        timestamp: number;
        userRecordName: string;
        deviceID: string;
    };
    modified: {
        timestamp: number;
        userRecordName: string;
        deviceID: string;
    };
    deleted: boolean;
    zoneID: {
        zoneName: string;
        ownerRecordName: string;
        zoneType: string;
    };
}

interface UnknownRecord {
    recordName: string;
    recordType: string;
    fields: {
        itemType?: {
            value: string;
            type: string;
        };
        resJPEGThumbFingerprint?: {
            value: string;
            type: string;
        };
        filenameEnc?: {
            value: string;
            type: string;
        };
        resJPEGMedRes?: {
            value: {
                fileChecksum: string;
                size: number;
                wrappingKey: string;
                referenceChecksum: string;
                downloadURL: string;
            };
            type: string;
        };
        originalOrientation?: {
            value: number;
            type: string;
        };
        resJPEGMedHeight?: {
            value: number;
            type: string;
        };
        resOriginalRes?: {
            value: {
                fileChecksum: string;
                size: number;
                wrappingKey: string;
                referenceChecksum: string;
                downloadURL: string;
            };
            type: string;
        };
        resJPEGMedFileType?: {
            value: string;
            type: string;
        };
        resJPEGThumbHeight?: {
            value: number;
            type: string;
        };
        resJPEGThumbWidth?: {
            value: number;
            type: string;
        };
        resOriginalWidth?: {
            value: number;
            type: string;
        };
        resJPEGThumbFileType?: {
            value: string;
            type: string;
        };
        dataClassType?: {
            value: number;
            type: string;
        };
        resOriginalFingerprint?: {
            value: string;
            type: string;
        };
        resJPEGMedWidth?: {
            value: number;
            type: string;
        };
        resJPEGThumbRes?: {
            value: {
                fileChecksum: string;
                size: number;
                wrappingKey: string;
                referenceChecksum: string;
                downloadURL: string;
            };
            type: string;
        };
        resOriginalFileType?: {
            value: string;
            type: string;
        };
        resOriginalHeight?: {
            value: number;
            type: string;
        };
        resJPEGMedFingerprint?: {
            value: string;
            type: string;
        };
        resVidSmallHeight?: {
            value: number;
            type: string;
        };
        resVidMedFileType?: {
            value: string;
            type: string;
        };
        resVidMedRes?: {
            value: {
                fileChecksum: string;
                size: number;
                wrappingKey: string;
                referenceChecksum: string;
                downloadURL: string;
            };
            type: string;
        };
        resVidSmallFingerprint?: {
            value: string;
            type: string;
        };
        resVidMedWidth?: {
            value: number;
            type: string;
        };
        resVidSmallFileType?: {
            value: string;
            type: string;
        };
        resVidSmallRes?: {
            value: {
                fileChecksum: string;
                size: number;
                wrappingKey: string;
                referenceChecksum: string;
                downloadURL: string;
            };
            type: string;
        };
        resVidMedFingerprint?: {
            value: string;
            type: string;
        };
        resVidMedHeight?: {
            value: number;
            type: string;
        };
        resVidSmallWidth?: {
            value: number;
            type: string;
        };
        assetDate?: {
            value: number;
            type: string;
        };
        orientation?: {
            value: number;
            type: string;
        };
        addedDate?: {
            value: number;
            type: string;
        };
        assetSubtypeV2?: {
            value: number;
            type: string;
        };
        assetHDRType?: {
            value: number;
            type: string;
        };
        timeZoneOffset?: {
            value: number;
            type: string;
        };
        masterRef?: {
            value: {
                recordName: string;
                action: string;
                zoneID: {
                    zoneName: string;
                    ownerRecordName: string;
                    zoneType: string;
                };
            };
            type: string;
        };
        adjustmentRenderType?: {
            value: number;
            type: string;
        };
        vidComplDispScale?: {
            value: number;
            type: string;
        };
        isHidden?: {
            value: number;
            type: string;
        };
        duration?: {
            value: number;
            type: string;
        };
        burstFlags?: {
            value: number;
            type: string;
        };
        assetSubtype?: {
            value: number;
            type: string;
        };
        vidComplDurScale?: {
            value: number;
            type: string;
        };
        vidComplDurValue?: {
            value: number;
            type: string;
        };
        vidComplVisibilityState?: {
            value: number;
            type: string;
        };
        customRenderedValue?: {
            value: number;
            type: string;
        };
        isFavorite?: {
            value: number;
            type: string;
        };
        vidComplDispValue?: {
            value: number;
            type: string;
        };
        adjustmentType?: {
            value: string;
            type: string;
        };
    };
    pluginFields: Record<any, any>;
    recordChangeTag: string;
    created: {
        timestamp: number;
        userRecordName: string;
        deviceID: string;
    };
    modified: {
        timestamp: number;
        userRecordName: string;
        deviceID: string;
    };
    deleted: boolean;
    zoneID: {
        zoneName: string;
        ownerRecordName: string;
        zoneType: string;
    };
}

type MasterRecord = UnknownRecord & { recordType: 'CPLMaster' };
type AssetRecord = UnknownRecord & { recordType: 'CPLAsset' };

interface QueryPhotoResponse {
    records: Array<MasterRecord | AssetRecord>;
    continuationMarker: string;
    syncToken: string;
}

const SMART_FOLDERS = {
    'All Photos': {
        type: 'CPLAssetAndMasterByAssetDateWithoutHiddenOrDeleted',
        direction: 'ASCENDING',
        query_filter: null,
    },
    'Time-lapse': {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'TIMELAPSE' },
            },
        ],
    },
    Videos: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'VIDEO' },
            },
        ],
    },
    'Slo-mo': {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'SLOMO' },
            },
        ],
    },
    Bursts: {
        type: 'CPLBurstStackAssetAndMasterByAssetDate',
        direction: 'ASCENDING',
        query_filter: null,
    },
    Favorites: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'FAVORITE' },
            },
        ],
    },
    Panoramas: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'PANORAMA' },
            },
        ],
    },
    Screenshots: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'SCREENSHOT' },
            },
        ],
    },
    Live: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'LIVE' },
            },
        ],
    },
    Portrait: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'DEPTH' },
            },
        ],
    },
    'Long Exposure': {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'EXPOSURE' },
            },
        ],
    },
    Animated: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        direction: 'ASCENDING',
        query_filter: [
            {
                fieldName: 'smartAlbum',
                comparator: 'EQUALS',
                fieldValue: { type: 'STRING', value: 'ANIMATED' },
            },
        ],
    },
    'Recently Deleted': {
        type: 'CPLAssetAndMasterDeletedByExpungedDate',
        direction: 'ASCENDING',
        query_filter: null,
    },
    Hidden: {
        type: 'CPLAssetAndMasterHiddenByAssetDate',
        direction: 'ASCENDING',
        query_filter: null,
    },
};

type FieldResValue = {
    size: number;
    downloadURL: string;
    fileChecksum?: string;
    wrappingKey?: string;
    referenceChecksum?: string;
};
type PhotoVersion = {
    filename: string;
    width: number | undefined;
    height: number | undefined;
    size: number | undefined;
    url: string | undefined;
    type: string | undefined;
};
type DynamicFields = Record<string, { value?: FieldResValue | number | string; type?: string } | undefined>;

export class iCloudPhotosEndpointService {
    constructor(
        private serviceUri: string,
        private headers: string[][] | Record<string, string | ReadonlyArray<string>> | Headers,
        private _fetchFn: iCloudService['fetch'],
    ) {}

    async fetch<T = unknown>(
        url: string,
        body?: object,
        headers?: string[][] | Record<string, string | ReadonlyArray<string>> | Headers,
    ): Promise<T> {
        const params = new URLSearchParams({
            remapEnums: 'true',
            getCurrentSyncToken: 'true',
        });

        const result = await this._fetchFn(
            `${this.serviceUri}/database/1/com.apple.photos.cloud/production/private${url}?${params.toString()}`,
            {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Content-Type': 'text/plain',
                    ...headers,
                } as Record<string, string>,
                body: body ? JSON.stringify(body) : undefined,
            },
        );

        const json = (await result.json()) as any;
        if (json.error) {
            throw new Error(`${json.error}: ${json.reason}`);
        }
        return json as T;
    }
    /**
     * Raw download fetch — uses the cookie-jar-backed fetch for CDN/download URLs.
     *
     * @param url
     */
    async download(url: string): Promise<Response> {
        return this._fetchFn(url);
    }
}

export class iCloudPhotosService {
    private endpointService: iCloudPhotosEndpointService;
    private _albums: Map<string, iCloudPhotoAlbum> = new Map();
    constructor(
        private service: iCloudService,
        private serviceUri: string,
    ) {
        this.endpointService = new iCloudPhotosEndpointService(
            serviceUri,
            service.authStore.getHeaders(),
            service.fetch,
        );
    }
    async getAlbums(): Promise<Map<string, iCloudPhotoAlbum>> {
        if (this._albums.size > 0) {
            return this._albums;
        }

        const folders = (
            await this.endpointService.fetch<{ records: Array<Folder> }>('/records/query', {
                query: { recordType: 'CPLAlbumByPositionLive' },
                zoneID: { zoneName: 'PrimarySync', zoneType: 'REGULAR_CUSTOM_ZONE' },
            })
        ).records;

        Object.entries(SMART_FOLDERS).map(([folderName, folderOptions]) => {
            this._albums.set(folderName, new iCloudPhotoAlbum(this.endpointService, folderName, folderOptions));
        });

        folders.map(folder => {
            if (!('albumNameEnc' in folder.fields)) {
                return;
            }
            if (folder.recordName === '----Root-Folder----' || folder.fields.isDeleted?.value) {
                return;
            }

            const folderName = Buffer.from(folder.fields.albumNameEnc.value as string, 'base64').toString('utf-8');

            this._albums.set(
                folderName,
                new iCloudPhotoAlbum(this.endpointService, folderName, {
                    type: 'CPLContainerRelationLiveByAssetDate',
                    direction: 'ASCENDING',
                    query_filter: [
                        {
                            fieldName: 'parentId',
                            comparator: 'EQUALS',
                            fieldValue: { type: 'STRING', value: folder.recordName },
                        },
                    ],
                }),
            );
        });

        return this._albums;
    }
    get all(): iCloudPhotoAlbum | undefined {
        return this._albums.get('All Photos');
    }
}

class iCloudPhotoAlbum {
    private _length!: number;
    private _photos: Array<iCloudPhotoAsset> = [];

    constructor(
        private endpointService: iCloudPhotosEndpointService,
        private name: string,
        private album: Album | null,
        private pageSize = 100,
    ) {}

    get title(): string {
        return this.name;
    }
    async getLength(): Promise<number> {
        if (!this._length) {
            const result = await this.endpointService.fetch<any>('/internal/records/query/batch', {
                batch: [
                    {
                        resultsLimit: 1,
                        query: {
                            filterBy: {
                                fieldName: 'indexCountID',
                                fieldValue: { type: 'STRING_LIST', value: [this.album!.type] },
                                comparator: 'IN',
                            },
                            recordType: 'HyperionIndexCountLookup',
                        },
                        zoneWide: true,
                        zoneID: { zoneName: 'PrimarySync' },
                    },
                ],
            });

            this._length = result.batch[0].records[0].fields.itemCount.value;
        }

        return this._length;
    }
    private async photosEndpointBody(offset: number): Promise<object> {
        return {
            query: {
                filterBy: [
                    {
                        fieldName: 'startRank',
                        fieldValue: {
                            type: 'INT64',
                            value: offset,
                        },
                        comparator: 'EQUALS',
                    },
                    {
                        fieldName: 'direction',
                        fieldValue: {
                            type: 'STRING',
                            value: this.album!.direction,
                        },
                        comparator: 'EQUALS',
                    },
                    ...(this.album!.query_filter || []),
                ],
                recordType: this.album!.type,
            },
            resultsLimit: this.pageSize * 2,
            desiredKeys: [
                'resJPEGFullWidth',
                'resJPEGFullHeight',
                'resJPEGFullFileType',
                'resJPEGFullFingerprint',
                'resJPEGFullRes',
                'resJPEGLargeWidth',
                'resJPEGLargeHeight',
                'resJPEGLargeFileType',
                'resJPEGLargeFingerprint',
                'resJPEGLargeRes',
                'resJPEGMedWidth',
                'resJPEGMedHeight',
                'resJPEGMedFileType',
                'resJPEGMedFingerprint',
                'resJPEGMedRes',
                'resJPEGThumbWidth',
                'resJPEGThumbHeight',
                'resJPEGThumbFileType',
                'resJPEGThumbFingerprint',
                'resJPEGThumbRes',
                'resVidFullWidth',
                'resVidFullHeight',
                'resVidFullFileType',
                'resVidFullFingerprint',
                'resVidFullRes',
                'resVidMedWidth',
                'resVidMedHeight',
                'resVidMedFileType',
                'resVidMedFingerprint',
                'resVidMedRes',
                'resVidSmallWidth',
                'resVidSmallHeight',
                'resVidSmallFileType',
                'resVidSmallFingerprint',
                'resVidSmallRes',
                'resSidecarWidth',
                'resSidecarHeight',
                'resSidecarFileType',
                'resSidecarFingerprint',
                'resSidecarRes',
                'itemType',
                'dataClassType',
                'filenameEnc',
                'originalOrientation',
                'resOriginalWidth',
                'resOriginalHeight',
                'resOriginalFileType',
                'resOriginalFingerprint',
                'resOriginalRes',
                'resOriginalAltWidth',
                'resOriginalAltHeight',
                'resOriginalAltFileType',
                'resOriginalAltFingerprint',
                'resOriginalAltRes',
                'resOriginalVidComplWidth',
                'resOriginalVidComplHeight',
                'resOriginalVidComplFileType',
                'resOriginalVidComplFingerprint',
                'resOriginalVidComplRes',
                'isDeleted',
                'isExpunged',
                'dateExpunged',
                'remappedRef',
                'recordName',
                'recordType',
                'recordChangeTag',
                'masterRef',
                'adjustmentRenderType',
                'assetDate',
                'addedDate',
                'isFavorite',
                'isHidden',
                'orientation',
                'duration',
                'assetSubtype',
                'assetSubtypeV2',
                'assetHDRType',
                'burstFlags',
                'burstFlagsExt',
                'burstId',
                'captionEnc',
                'locationEnc',
                'locationV2Enc',
                'locationLatitude',
                'locationLongitude',
                'adjustmentType',
                'timeZoneOffset',
                'vidComplDurValue',
                'vidComplDurScale',
                'vidComplDispValue',
                'vidComplDispScale',
                'vidComplVisibilityState',
                'customRenderedValue',
                'containerId',
                'itemId',
                'position',
                'isKeyAsset',
            ],
            zoneID: { zoneName: 'PrimarySync' },
        };
    }
    async getPhotos(): Promise<Array<iCloudPhotoAsset>> {
        if (this._photos.length) {
            return this._photos;
        }

        const isDescending = this.album!.direction === 'DESCENDING';
        const total = await this.getLength();
        let offset = isDescending ? total - 1 : 0;

        while (true) {
            const result = await this.endpointService.fetch<QueryPhotoResponse>(
                '/records/query',
                await this.photosEndpointBody(offset),
            );

            const assetRecords: Record<string, AssetRecord> = {};
            const masterRecords: MasterRecord[] = [];

            result.records.map(item => {
                switch (item.recordType) {
                    case 'CPLAsset':
                        assetRecords[item.fields.masterRef!.value.recordName] = item;
                        break;
                    case 'CPLMaster':
                        masterRecords.push(item);
                        break;
                }
            });

            masterRecords.map(record => {
                this._photos.push(new iCloudPhotoAsset(this.endpointService, record, assetRecords[record.recordName]));
            });

            if (masterRecords.length > 0) {
                offset += isDescending ? -masterRecords.length : masterRecords.length;
            } else {
                break;
            }
        }

        return this._photos;
    }
}

class iCloudPhotoAsset {
    private readonly PHOTO_VERSION_LOOKUP = {
        original: 'resOriginal',
        medium: 'resJPEGMed',
        thumb: 'resJPEGThumb',
    };
    private readonly VIDEO_VERSION_LOOKUP = {
        original: 'resOriginal',
        medium: 'resVidMed',
        thumb: 'resVidSmall',
    };
    private _versions: Record<string, PhotoVersion> = {};

    constructor(
        private endpointService: iCloudPhotosEndpointService,
        private masterRecord: MasterRecord,
        private assetRecord: AssetRecord,
    ) {}

    get id(): string {
        return this.masterRecord.recordName;
    }
    get filename(): string {
        return Buffer.from(this.masterRecord.fields.filenameEnc!.value, 'base64').toString('utf-8');
    }
    get size(): number {
        return this.masterRecord.fields.resOriginalRes!.value.size;
    }
    get created(): Date {
        return this.assetDate;
    }
    get assetDate(): Date {
        return dayjs(this.assetRecord.fields.assetDate!.value).local().toDate();
    }
    get addedDate(): Date {
        return dayjs(this.assetRecord.fields.addedDate!.value).local().toDate();
    }
    /**
     * @returns array [width, height] in pixels
     */
    get dimension(): number[] {
        return [this.masterRecord.fields.resOriginalWidth!.value, this.masterRecord.fields.resOriginalHeight!.value];
    }
    get versions(): Record<string, PhotoVersion> {
        if (Object.keys(this._versions).length <= 0) {
            const typedVersionLookup =
                'resVidSmallRes' in this.masterRecord.fields ? this.VIDEO_VERSION_LOOKUP : this.PHOTO_VERSION_LOOKUP;

            Object.entries(typedVersionLookup).map(([key, prefix]) => {
                if (`${prefix}Res` in this.masterRecord.fields) {
                    const fields = this.masterRecord.fields as unknown as DynamicFields;
                    this._versions[key] = {
                        filename: this.filename,
                        width: fields[`${prefix}Width`]?.value as number | undefined,
                        height: fields[`${prefix}Height`]?.value as number | undefined,
                        size: (fields[`${prefix}Res`]?.value as FieldResValue | undefined)?.size,
                        url: (fields[`${prefix}Res`]?.value as FieldResValue | undefined)?.downloadURL,
                        type: fields[`${prefix}FileType`]?.value as string | undefined,
                    };
                }
            });
        }

        return this._versions;
    }
    async download(version = 'original'): Promise<ArrayBuffer | null> {
        if (Object.keys(this._versions).length <= 0) {
            this.versions;
        }

        if (!(version in this._versions)) {
            return null;
        }

        const response = await this.endpointService.download(this._versions[version].url!);

        return response.arrayBuffer();
    }
    async delete(): Promise<boolean> {
        try {
            await this.endpointService.fetch('/records/modify', {
                operations: [
                    {
                        operationType: 'update',
                        record: {
                            recordName: this.assetRecord.recordName,
                            recordType: this.assetRecord.recordType,
                            recordChangeTag: this.masterRecord.recordChangeTag,
                            fields: { isDeleted: { value: 1 } },
                        },
                    },
                ],
                zoneID: { zoneName: 'PrimarySync' },
                atomic: true,
            });
            return true;
        } catch {
            return false;
        }
    }
}
export type {
    Album,
    AssetRecord,
    Folder,
    MasterRecord,
    QueryPhotoResponse,
    UnknownRecord,
    iCloudPhotoAlbum,
    iCloudPhotoAsset,
};
