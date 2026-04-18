import type iCloudService from '..';

interface iCloudFindMyDeviceInfo {
    msg?: {
        strobe: boolean;
        userText: boolean;
        playSound: boolean;
        vibrate: boolean;
        createTimestamp: number;
        statusCode: string;
    };
    activationLocked: boolean;
    passcodeLength: number;
    features: {
        BTR: boolean;
        LLC: boolean;
        CLK: boolean;
        TEU: boolean;
        SND: boolean;
        ALS: boolean;
        CLT: boolean;
        PRM?: boolean;
        SVP: boolean;
        SPN: boolean;
        XRM: boolean;
        NWLB?: boolean;
        NWF: boolean;
        CWP: boolean;
        MSG: boolean;
        LOC: boolean;
        LME: boolean;
        LMG: boolean;
        LYU?: boolean;
        LKL: boolean;
        LST: boolean;
        LKM: boolean;
        WMG: boolean;
        SCA?: boolean;
        PSS: boolean;
        EAL: boolean;
        LAE: boolean;
        PIN: boolean;
        LCK: boolean;
        REL?: boolean;
        REM: boolean;
        MCS: boolean;
        REP?: boolean;
        KEY: boolean;
        KPD: boolean;
        WIP: boolean;
    };
    scd: boolean;
    id: string;
    remoteLock: unknown;
    rm2State: number;
    modelDisplayName: string;
    fmlyShare: boolean;
    pendingRemoveUntilTS: number;
    repairReadyExpireTS: number;
    repairReady: boolean;
    repairStatus: unknown;
    repairDeviceReason: string;
    commandLookupId: string;
    lostModeCapable: boolean;
    wipedTimestamp: unknown;
    encodedDeviceId: unknown;
    scdPh: string;
    locationCapable: boolean;
    trackingInfo: unknown;
    name: string;
    isMac: boolean;
    thisDevice: boolean;
    deviceClass: string;
    nwd: boolean;
    remoteWipe: unknown;
    canWipeAfterLock: boolean;
    baUUID: string;
    lostModeEnabled: boolean;
    wipeInProgress: boolean;
    deviceStatus: string;
    deviceColor?: string;
    isConsideredAccessory: boolean;
    deviceWithYou: boolean;
    lowPowerMode: boolean;
    rawDeviceModel: string;
    deviceDiscoveryId: string;
    isLocating: boolean;
    lostTimestamp: string;
    mesg: unknown;
    batteryLevel: number;
    locationEnabled: boolean;
    lockedTimestamp: unknown;
    locFoundEnabled: boolean;
    snd?: {
        continueButtonTitle: string;
        alertText: string;
        cancelButtonTitle: string;
        createTimestamp: number;
        statusCode: string;
        alertTitle: string;
    };
    lostDevice: unknown;
    deviceDisplayName: string;
    prsId?: string;
    audioChannels: Array<{
        name: string;
        available: number;
        playing: boolean;
        muted: boolean;
    }>;
    batteryStatus: string | null;
    brassStatus: string;
    pendingRemove: boolean;
    location?: {
        isOld: boolean;
        isInaccurate: boolean;
        altitude: number;
        addresses: unknown;
        positionType: string;
        secureLocation: unknown;
        secureLocationTs: number;
        latitude: number;
        floorLevel: number;
        horizontalAccuracy: number;
        locationType: string;
        timeStamp: number;
        locationFinished: boolean;
        verticalAccuracy: number;
        locationMode: unknown;
        longitude: number;
    };
    deviceModel: string;
    maxMsgChar: number;
    darkWake: boolean;
}

interface iCloudFindMyResponse {
    userInfo: {
        accountFormatter: number;
        firstName: string;
        lastName: string;
        membersInfo: {
            [key: string]: {
                accountFormatter: number;
                firstName: string;
                lastName: string;
                deviceFetchStatus: string;
                useAuthWidget: boolean;
                isHSA: boolean;
                appleId: string;
            };
        };
        hasMembers: boolean;
    };
    serverContext: {
        minCallbackIntervalInMS: number;
        preferredLanguage: string;
        enable2FAFamilyActions: boolean;
        lastSessionExtensionTime: any;
        callbackIntervalInMS: number;
        enableMapStats: boolean;
        validRegion: boolean;
        timezone: {
            currentOffset: number;
            previousTransition: number;
            previousOffset: number;
            tzCurrentName: string;
            tzName: string;
        };
        authToken: any;
        maxCallbackIntervalInMS: number;
        classicUser: boolean;
        isHSA: boolean;
        trackInfoCacheDurationInSecs: number;
        imageBaseUrl: string;
        minTrackLocThresholdInMts: number;
        itemLearnMoreURL: string;
        maxLocatingTime: number;
        itemsTabEnabled: boolean;
        sessionLifespan: number;
        info: string;
        prefsUpdateTime: number;
        useAuthWidget: boolean;
        clientId: string;
        inaccuracyRadiusThreshold: number;
        enable2FAFamilyRemove: boolean;
        serverTimestamp: number;
        deviceImageVersion: string;
        macCount: number;
        deviceLoadStatus: string;
        maxDeviceLoadTime: number;
        prsId: number;
        showSllNow: boolean;
        cloudUser: boolean;
        enable2FAErase: boolean;
    };
    alert: any;
    userPreferences: {
        webPrefs: any;
    };
    content: Array<iCloudFindMyDeviceInfo>;
    statusCode: string;
}

export class iCloudFindMyDevice {
    deviceInfo!: iCloudFindMyDeviceInfo;
    service: iCloudFindMyService;
    constructor(service: iCloudFindMyService) {
        this.service = service;
    }
    apply(newInfo: iCloudFindMyDeviceInfo): this {
        this.deviceInfo = newInfo;
        return this;
    }
    get(value: keyof iCloudFindMyDeviceInfo): iCloudFindMyDeviceInfo[typeof value] {
        return this.deviceInfo[value];
    }
}

export class iCloudFindMyService {
    service: iCloudService;
    serviceUri: string;
    includeFamily = true;
    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        void this.refresh();
    }
    devices: Map<string, iCloudFindMyDevice> = new Map();
    membersInfo: Record<
        string,
        {
            accountFormatter: number;
            firstName: string;
            lastName: string;
            deviceFetchStatus: string;
            useAuthWidget: boolean;
            isHSA: boolean;
            appleId: string;
        }
    > = {};
    async refresh(selectedDevice = 'all'): Promise<iCloudFindMyResponse> {
        const doRequest = async (): Promise<unknown> => {
            const request = await this.service.fetch(`${this.serviceUri}/fmipservice/client/web/refreshClient`, {
                headers: this.service.authStore.getHeaders(),
                method: 'POST',
                body: JSON.stringify({
                    clientContext: {
                        fmly: this.includeFamily,
                        shouldLocate: true,
                        deviceListVersion: 1,
                        selectedDevice,
                    },
                }),
            });
            if (!request.ok) {
                const body = (await request.text()).slice(0, 200);
                throw new Error(`HTTP ${request.status}: ${body || '(empty body)'}`);
            }
            return request.json();
        };

        let json: iCloudFindMyResponse;
        try {
            json = (await doRequest()) as iCloudFindMyResponse;
        } catch (err: unknown) {
            // 421 = wrong region, 450 = need re-auth, 500 = server error —
            // mirrors pyicloud: refresh webservices (accountLogin) silently, then retry once.
            if (err instanceof Error && /HTTP (421|450|500)/.test(err.message)) {
                this.service._log(
                    1 /* Info */,
                    '[findmy] session expired (',
                    err.message,
                    ') — refreshing webservices',
                );
                const refreshed = await this.service.refreshWebservices();
                if (refreshed) {
                    // serviceUri may have changed — pick up the new URL from accountInfo
                    const newUri = this.service.accountInfo?.webservices.findme.url;
                    if (newUri) {
                        this.serviceUri = newUri;
                    }
                    json = (await doRequest()) as iCloudFindMyResponse;
                } else {
                    throw err;
                }
            } else {
                throw err;
            }
        }

        const newDevices = new Map();
        for (const device of json.content) {
            newDevices.set(device.id, (this.devices.get(device.id) || new iCloudFindMyDevice(this)).apply(device));
        }

        this.devices = newDevices;
        this.membersInfo = json.userInfo?.membersInfo ?? {};
        return json;
    }

    async playSound(deviceId: string, subject = 'Find My iPhone Alert'): Promise<void> {
        const request = await this.service.fetch(`${this.serviceUri}/fmipservice/client/web/playSound`, {
            headers: this.service.authStore.getHeaders(),
            method: 'POST',
            body: JSON.stringify({
                device: deviceId,
                subject,
                clientContext: { fmly: true },
            }),
        });
        if (!request.ok) {
            const body = (await request.text()).slice(0, 200);
            throw new Error(`playSound HTTP ${request.status}: ${body || '(empty body)'}`);
        }
    }
}
export type { iCloudFindMyDeviceInfo, iCloudFindMyResponse };
