import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type iCloudService from '..';
dayjs.extend(utc);
dayjs.extend(timezone);

type Album = {
    /** list_type — used as the recordType in /records/query requests */
    type: string;
    /** obj_type — used as the indexCountID in HyperionIndexCountLookup requests */
    obj_type: string;
    /** record_id — set for custom (user) albums; appended to obj_type to form the container ID */
    record_id?: string;
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
        locationLatitude?: {
            value: number;
            type: string;
        };
        locationLongitude?: {
            value: number;
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
        obj_type: 'CPLAssetByAssetDateWithoutHiddenOrDeleted',
        direction: 'ASCENDING',
        query_filter: null,
    },
    'Time-lapse': {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Timelapse',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Video',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Slomo',
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
        obj_type: 'CPLBurstStackAssetAndMasterByAssetDate',
        direction: 'ASCENDING',
        query_filter: null,
    },
    Favorites: {
        type: 'CPLAssetAndMasterInSmartAlbumByAssetDate',
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Favorite',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Panorama',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Screenshot',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Live',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Depth',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:LongExposure',
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
        obj_type: 'CPLAssetInSmartAlbumByAssetDate:Animated',
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
        obj_type: 'CPLAssetAndMasterDeletedByExpungedDate',
        direction: 'ASCENDING',
        query_filter: null,
    },
    Hidden: {
        type: 'CPLAssetAndMasterHiddenByAssetDate',
        obj_type: 'CPLAssetAndMasterHiddenByAssetDate',
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

/** Serializable photo metadata returned by sendTo handlers. */
export type PhotoAssetInfo = {
    id: string;
    filename: string;
    size: number;
    width: number;
    height: number;
    itemType: string;
    isFavorite: boolean;
    isHidden: boolean;
    duration: number;
    assetDate: number;
    addedDate: number;
    latitude: number | null;
    longitude: number | null;
};

const DESIRED_KEYS = [
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
];

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
     * @param url - The download URL to fetch.
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

    /**
     * Check if the photo library indexing is finished.
     * Returns true when ready, false when still indexing.
     */
    async checkIndexingState(): Promise<boolean> {
        try {
            const result = await this.endpointService.fetch<{
                records: Array<{ fields: { state: { value: string } } }>;
            }>('/records/query', {
                query: { recordType: 'CheckIndexingState' },
                zoneID: { zoneName: 'PrimarySync', zoneType: 'REGULAR_CUSTOM_ZONE' },
            });
            const state = result.records?.[0]?.fields?.state?.value;
            return state === 'FINISHED';
        } catch {
            return false;
        }
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

        for (const [folderName, folderOptions] of Object.entries(SMART_FOLDERS)) {
            this._albums.set(folderName, new iCloudPhotoAlbum(this.endpointService, folderName, folderOptions));
        }

        for (const folder of folders) {
            if (!('albumNameEnc' in folder.fields)) {
                continue;
            }
            if (folder.recordName === '----Root-Folder----' || folder.fields.isDeleted?.value) {
                continue;
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
                    obj_type: 'CPLContainerRelationNotDeletedByAssetDate',
                    record_id: folder.recordName,
                }),
            );
        }

        return this._albums;
    }

    /**
     * Invalidate cached albums so the next getAlbums() call fetches fresh data.
     */
    resetAlbums(): void {
        this._albums.clear();
    }

    get all(): iCloudPhotoAlbum | undefined {
        return this._albums.get('All Photos');
    }

    /**
     * Returns a summary of all albums: name and photo count.
     * Automatically loads albums if not yet fetched.
     */
    async getAlbumSummaries(): Promise<Array<{ name: string; photoCount: number }>> {
        const albums = await this.getAlbums();
        const summaries: Array<{ name: string; photoCount: number }> = [];
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
    async getPhotosPage(albumName = 'All Photos', offset = 0, limit = 100): Promise<Array<PhotoAssetInfo>> {
        const albums = await this.getAlbums();
        const album = albums.get(albumName);
        if (!album) {
            throw new Error(`Album not found: ${albumName}`);
        }
        const photos = await album.getPhotosPage(offset, Math.min(limit, 100));
        return photos.map(p => p.toInfo());
    }

    /**
     * Download a photo by its record name from the 'All Photos' album.
     *
     * @param photoId - The recordName of the photo master record
     * @param version - Which version to download (original, medium, thumb)
     * @returns The raw bytes as ArrayBuffer, or null if not found
     */
    async downloadPhoto(
        photoId: string,
        version = 'original',
    ): Promise<{ data: ArrayBuffer; filename: string; size: number } | null> {
        const albums = await this.getAlbums();
        const allPhotos = albums.get('All Photos');
        if (!allPhotos) {
            throw new Error('All Photos album not available');
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
    async deletePhoto(photoId: string): Promise<boolean> {
        const albums = await this.getAlbums();
        const allPhotos = albums.get('All Photos');
        if (!allPhotos) {
            throw new Error('All Photos album not available');
        }
        const photo = await allPhotos.getPhotoById(photoId);
        if (!photo) {
            throw new Error(`Photo not found: ${photoId}`);
        }
        return photo.delete();
    }
}

class iCloudPhotoAlbum {
    private _length!: number;

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
                                fieldValue: {
                                    type: 'STRING_LIST',
                                    value: [
                                        this.album!.record_id
                                            ? `${this.album!.obj_type}:${this.album!.record_id}`
                                            : this.album!.obj_type,
                                    ],
                                },
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
    private photosEndpointBody(offset: number, limit?: number): object {
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
            resultsLimit: (limit ?? this.pageSize) * 2,
            desiredKeys: DESIRED_KEYS,
            zoneID: { zoneName: 'PrimarySync' },
        };
    }

    /**
     * Fetch a single page of photos at the given offset.
     *
     * @param offset - Start offset
     * @param limit - Maximum number of photo assets to return (max 100)
     */
    async getPhotosPage(offset: number, limit: number): Promise<Array<iCloudPhotoAsset>> {
        const result = await this.endpointService.fetch<QueryPhotoResponse>(
            '/records/query',
            this.photosEndpointBody(offset, limit),
        );
        return this.parsePhotoResponse(result);
    }

    /**
     * Find a specific photo by its master record name (paging through the album).
     *
     * @param photoId - The recordName of the master record
     */
    async getPhotoById(photoId: string): Promise<iCloudPhotoAsset | null> {
        const total = await this.getLength();
        const isDescending = this.album!.direction === 'DESCENDING';
        let offset = isDescending ? total - 1 : 0;

        while (true) {
            const result = await this.endpointService.fetch<QueryPhotoResponse>(
                '/records/query',
                this.photosEndpointBody(offset),
            );
            const photos = this.parsePhotoResponse(result);
            const found = photos.find(p => p.id === photoId);
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

    async getPhotos(): Promise<Array<iCloudPhotoAsset>> {
        const photos: Array<iCloudPhotoAsset> = [];
        const isDescending = this.album!.direction === 'DESCENDING';
        const total = await this.getLength();
        let offset = isDescending ? total - 1 : 0;

        while (true) {
            const result = await this.endpointService.fetch<QueryPhotoResponse>(
                '/records/query',
                this.photosEndpointBody(offset),
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

    private parsePhotoResponse(result: QueryPhotoResponse): iCloudPhotoAsset[] {
        const assetRecords: Record<string, AssetRecord> = {};
        const masterRecords: MasterRecord[] = [];

        for (const item of result.records) {
            if (item.recordType === 'CPLAsset') {
                assetRecords[item.fields.masterRef!.value.recordName] = item;
            } else if (item.recordType === 'CPLMaster') {
                masterRecords.push(item);
            }
        }

        return masterRecords
            .filter(record => record.recordName in assetRecords)
            .map(record => new iCloudPhotoAsset(this.endpointService, record, assetRecords[record.recordName]));
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
    private readonly ITEM_TYPES: Record<string, string> = {
        'public.heic': 'image',
        'public.jpeg': 'image',
        'public.png': 'image',
        'com.apple.quicktime-movie': 'movie',
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
        return this.masterRecord.fields.resOriginalRes?.value.size ?? 0;
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
        return [
            this.masterRecord.fields.resOriginalWidth?.value ?? 0,
            this.masterRecord.fields.resOriginalHeight?.value ?? 0,
        ];
    }
    get itemType(): string {
        const raw = this.masterRecord.fields.itemType?.value ?? '';
        if (raw in this.ITEM_TYPES) {
            return this.ITEM_TYPES[raw];
        }
        const ext = this.filename.toLowerCase();
        if (ext.endsWith('.heic') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png')) {
            return 'image';
        }
        return 'movie';
    }
    get isFavorite(): boolean {
        return this.assetRecord.fields.isFavorite?.value === 1;
    }
    get isHidden(): boolean {
        return this.assetRecord.fields.isHidden?.value === 1;
    }
    get duration(): number {
        return this.assetRecord.fields.duration?.value ?? 0;
    }
    get latitude(): number | null {
        return this.assetRecord.fields.locationLatitude?.value ?? null;
    }
    get longitude(): number | null {
        return this.assetRecord.fields.locationLongitude?.value ?? null;
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

    /**
     * Returns a serializable info object for sendTo responses.
     */
    toInfo(): PhotoAssetInfo {
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
            longitude: this.longitude,
        };
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
