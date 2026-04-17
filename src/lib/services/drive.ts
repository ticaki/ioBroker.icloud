import { ReadableStream } from 'stream/web';
import type iCloudService from '..';

export type ItemType = 'APP_LIBRARY' | 'FILE' | 'FOLDER';

export interface iCloudDriveItem {
    dateCreated: Date;
    drivewsid: string;
    docwsid: string;
    zone: 'com.apple.CloudDocs';
    name: string;
    parentId: string;
    isChainedToParent?: boolean;
    dateModified?: Date;
    dateChanged?: Date;
    size?: number;
    etag: string;
    type: ItemType;
    extension?: string;
    lastOpenTime?: Date;
    assetQuota?: number;
    fileCount?: number;
    shareCount?: number;
    shareAliasCount?: number;
    directChildrenCount?: number;
    maxDepth?: 'ANY';
    icons?: {
        url: string;
        type: 'OSX' | 'IOS';
        size: number;
    }[];
    supportedExtensions?: string[];
    supportedTypes?: string[];
}
export class iCloudDriveRawNode {
    dateCreated!: string;
    drivewsid!: string;
    docwsid!: string;
    zone!: 'com.apple.CloudDocs';
    name!: string;
    etag!: string;
    type!: ItemType;
    assetQuota!: number;
    fileCount!: number;
    shareCount!: number;
    shareAliasCount!: number;
    directChildrenCount!: number;
    items!: iCloudDriveItem[];
    numberOfItems!: number;
    status!: string;
    parentId?: string;
    dateModified?: string;
    dateChanged?: string;
    lastOpenTime?: string;
    extension?: string;
}

export class iCloudDriveNode {
    service: iCloudDriveService;
    serviceUri: string;
    nodeId: string;

    rawData!: iCloudDriveRawNode;
    hasData = false;
    lastUpdated!: number;

    dateCreated!: Date;
    name!: string;
    etag!: string;
    type!: ItemType;
    size!: number;
    fileCount!: number;
    shareCount!: number;
    directChildrenCount!: number;
    parentId?: string;
    docwsid?: string;
    items!: iCloudDriveItem[];
    extension?: string;
    dateModified?: Date;
    dateChanged?: Date;
    dateLastOpen?: Date;
    private _children: iCloudDriveNode[] | null = null;

    constructor(service: iCloudDriveService, nodeId = 'root') {
        this.service = service;
        this.serviceUri = service.serviceUri;
        this.nodeId = nodeId;
    }

    async refresh(): Promise<this> {
        const response = await this.service.service.fetch(`${this.serviceUri}/retrieveItemDetailsInFolders`, {
            headers: this.service.service.authStore.getHeaders(),
            method: 'POST',
            body: JSON.stringify([
                {
                    drivewsid: this.nodeId,
                    partialData: false,
                },
            ]),
        });
        let json = (await response.json()) as any;
        if (json.errorCode) {
            throw new Error(json.errorReason);
        }
        if (Array.isArray(json)) {
            json = json[0];
        }
        const rawNode = json as iCloudDriveRawNode;
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
        this.docwsid = rawNode.docwsid;
        this.extension = rawNode.extension;
        this.dateModified = rawNode.dateModified ? new Date(rawNode.dateModified) : undefined;
        this.dateChanged = rawNode.dateChanged ? new Date(rawNode.dateChanged) : undefined;
        this.dateLastOpen = rawNode.lastOpenTime ? new Date(rawNode.lastOpenTime) : undefined;
        this._children = null;

        return this;
    }

    get fullName(): string {
        return this.extension ? `${this.name}.${this.extension}` : this.name;
    }

    async getChildren(): Promise<iCloudDriveNode[]> {
        if (this._children) {
            return this._children;
        }
        if (!this.hasData) {
            await this.refresh();
        }
        this._children = (this.items ?? []).map(item => {
            const child = new iCloudDriveNode(this.service, item.drivewsid);
            child.name = item.name;
            child.etag = item.etag;
            child.type = item.type;
            child.size = item.size ?? 0;
            child.parentId = item.parentId;
            child.docwsid = item.docwsid;
            child.dateCreated = new Date(item.dateCreated as unknown as string);
            child.extension = item.extension;
            child.dateModified = item.dateModified ? new Date(item.dateModified as unknown as string) : undefined;
            child.dateChanged = item.dateChanged ? new Date(item.dateChanged as unknown as string) : undefined;
            child.dateLastOpen = item.lastOpenTime ? new Date(item.lastOpenTime as unknown as string) : undefined;
            child.items = [];
            return child;
        });
        return this._children;
    }

    dir(): string[] | null {
        if (this.type === 'FILE') {
            return null;
        }
        return (this.items ?? []).map(item => (item.extension ? `${item.name}.${item.extension}` : item.name));
    }

    async get(name: string): Promise<iCloudDriveNode | undefined> {
        if (this.type === 'FILE') {
            return undefined;
        }
        const children = await this.getChildren();
        return children.find(c => c.fullName === name || c.name === name);
    }

    async mkdir(name: string): Promise<unknown> {
        return this.service.mkdir(this.nodeId, name);
    }

    async rename(name: string): Promise<unknown> {
        return this.service.renameItem(this.nodeId, this.etag, name);
    }

    async delete(): Promise<unknown> {
        return this.service.del(this.nodeId, this.etag);
    }

    async open(): Promise<ReadableStream | null> {
        const docwsid = this.docwsid ?? this.rawData?.docwsid;
        if (!docwsid) {
            throw new Error('Node has no docwsid, call refresh() first');
        }
        return this.service.downloadFile({ docwsid, size: this.size });
    }

    async upload(file: { name: string; content: Uint8Array; contentType?: string }): Promise<void> {
        const docwsid = this.docwsid ?? this.rawData?.docwsid;
        if (!docwsid) {
            throw new Error('Node has no docwsid, call refresh() first');
        }
        return this.service.sendFile(docwsid, file);
    }
}

export class iCloudDriveService {
    service: iCloudService;
    serviceUri: string;
    docsServiceUri: string;
    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        this.docsServiceUri = service.accountInfo!.webservices.docws.url;
    }
    async getNode(
        nodeId: { drivewsid: string } | string = 'FOLDER::com.apple.CloudDocs::root',
    ): Promise<iCloudDriveNode> {
        return new iCloudDriveNode(this, typeof nodeId === 'string' ? nodeId : nodeId.drivewsid).refresh();
    }
    async downloadFile(item: { zone?: string; docwsid: string; size?: number }): Promise<ReadableStream | null> {
        if (item.size === 0) {
            return new ReadableStream({
                start(controller) {
                    controller.close();
                },
            });
        }
        const response = await this.service.fetch(
            `${this.docsServiceUri}/ws/${item.zone || 'com.apple.CloudDocs'}/download/by_id?document_id=${encodeURIComponent(item.docwsid)}`,
            { headers: this.service.authStore.getHeaders() },
        );
        const json = (await response.json()) as any;
        if (json.error_code) {
            throw new Error(json.reason);
        }
        const url = json.data_token ? json.data_token.url : json.package_token.url;
        const fileResponse = await this.service.fetch(url, { headers: this.service.authStore.getHeaders() });
        return fileResponse.body;
    }
    async mkdir(parent: { drivewsid: string } | string, name: string): Promise<unknown> {
        const parentId = typeof parent === 'string' ? parent : parent.drivewsid;
        const response = await this.service.fetch(`${this.serviceUri}/createFolders`, {
            headers: this.service.authStore.getHeaders(),
            method: 'POST',
            body: JSON.stringify({
                destinationDrivewsId: parentId,
                folders: [
                    {
                        name,
                        clientId: 'auth-ab95dcd4-65db-11ed-a792-244bfee1e3c1',
                    },
                ],
            }),
        });
        return response.json();
    }
    async del(item: { drivewsid: string; etag: string } | string, etag?: string): Promise<unknown> {
        const drivewsid = typeof item === 'string' ? item : item.drivewsid;
        const itemEtag = typeof item === 'string' ? etag : item.etag;
        const response = await this.service.fetch(`${this.serviceUri}/moveItemsToTrash`, {
            headers: this.service.authStore.getHeaders(),
            method: 'POST',
            body: JSON.stringify({
                items: [
                    {
                        drivewsid,
                        etag: itemEtag,
                        clientId: 'auth-ab95dcd4-65db-11ed-a792-244bfee1e3c1',
                    },
                ],
            }),
        });
        return response.json();
    }

    async renameItem(nodeId: string, etag: string, name: string): Promise<unknown> {
        const response = await this.service.fetch(`${this.serviceUri}/renameItems`, {
            headers: this.service.authStore.getHeaders(),
            method: 'POST',
            body: JSON.stringify({
                items: [{ drivewsid: nodeId, etag, name }],
            }),
        });
        return response.json();
    }

    async getAppData(): Promise<unknown[]> {
        const response = await this.service.fetch(`${this.serviceUri}/retrieveAppLibraries`, {
            headers: this.service.authStore.getHeaders(),
        });
        const json = (await response.json()) as { items: unknown[] };
        return json.items;
    }

    /**
     * Navigate to a node by its slash-separated path relative to the root folder.
     * Example: `getNodeByPath('Documents/Photos/cat.jpg')`
     *
     * @param pathStr - Slash-separated path, e.g. `"Documents/Photos/cat.jpg"`
     */
    async getNodeByPath(pathStr: string): Promise<iCloudDriveNode> {
        const parts = pathStr
            .split('/')
            .map(p => p.trim())
            .filter(Boolean);
        let node = await this.getNode();
        for (const part of parts) {
            const child = await node.get(part);
            if (!child) {
                throw new Error(`Path segment "${part}" not found in "${node.fullName}"`);
            }
            node = child;
            // Ensure full data is available for folders
            if (node.type === 'FOLDER' && !node.hasData) {
                await node.refresh();
            }
        }
        return node;
    }

    async sendFile(
        folderDocwsid: string,
        file: { name: string; content: Uint8Array; contentType?: string },
    ): Promise<void> {
        const contentType = file.contentType ?? 'application/octet-stream';
        const uploadResponse = await this.service.fetch(`${this.docsServiceUri}/ws/com.apple.CloudDocs/upload/web`, {
            headers: {
                ...this.service.authStore.getHeaders(),
                'Content-Type': 'text/plain',
            },
            method: 'POST',
            body: JSON.stringify({
                filename: file.name,
                type: 'FILE',
                content_type: contentType,
                size: file.content.byteLength,
            }),
        });
        const uploadJson = (await uploadResponse.json()) as Array<{ document_id: string; url: string }>;
        const { document_id, url } = uploadJson[0];
        const formData = new FormData();
        formData.append(
            file.name,
            new Blob([file.content as Uint8Array<ArrayBuffer>], { type: contentType }),
            file.name,
        );
        const contentResponse = await this.service.fetch(url, { method: 'POST', body: formData });
        const contentJson = (await contentResponse.json()) as { singleFile: Record<string, unknown> };
        await this._updateContentws(folderDocwsid, contentJson.singleFile, document_id, file.name);
    }

    private async _updateContentws(
        folderDocwsid: string,
        sfInfo: Record<string, unknown>,
        documentId: string,
        fileName: string,
    ): Promise<unknown> {
        const data: Record<string, unknown> = {
            data: {
                signature: sfInfo.fileChecksum,
                wrapping_key: sfInfo.wrappingKey,
                reference_signature: sfInfo.referenceChecksum,
                size: sfInfo.size,
                ...(sfInfo.receipt ? { receipt: sfInfo.receipt } : {}),
            },
            command: 'add_file',
            create_short_guid: true,
            document_id: documentId,
            path: { starting_document_id: folderDocwsid, path: fileName },
            allow_conflict: true,
            file_flags: { is_writable: true, is_executable: false, is_hidden: false },
            mtime: Date.now(),
            btime: Date.now(),
        };
        const response = await this.service.fetch(`${this.docsServiceUri}/ws/com.apple.CloudDocs/update/documents`, {
            headers: {
                ...this.service.authStore.getHeaders(),
                'Content-Type': 'text/plain',
            },
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.json();
    }
}
