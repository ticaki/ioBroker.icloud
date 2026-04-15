import iCloudService from "..";

interface iCloudFindMyDeviceInfo {
    msg?: {
      strobe: boolean
      userText: boolean
      playSound: boolean
      vibrate: boolean
      createTimestamp: number
      statusCode: string
    }
    activationLocked: boolean
    passcodeLength: number
    features: {
      BTR: boolean
      LLC: boolean
      CLK: boolean
      TEU: boolean
      SND: boolean
      ALS: boolean
      CLT: boolean
      SVP: boolean
      SPN: boolean
      XRM: boolean
      NWLB: boolean
      NWF: boolean
      CWP: boolean
      MSG: boolean
      LOC: boolean
      LME: boolean
      LMG: boolean
      LYU?: boolean
      LKL: boolean
      LST: boolean
      LKM: boolean
      WMG: boolean
      SCA?: boolean
      PSS: boolean
      EAL: boolean
      LAE: boolean
      PIN: boolean
      LCK: boolean
      REM: boolean
      MCS: boolean
      KEY: boolean
      KPD: boolean
      WIP: boolean
    }
    scd: boolean
    id: string
    remoteLock: any
    rm2State: number
    modelDisplayName: string
    fmlyShare: boolean
    lostModeCapable: boolean
    wipedTimestamp: any
    encodedDeviceId: any
    scdPh: string
    locationCapable: boolean
    trackingInfo: any
    name: string
    isMac: boolean
    thisDevice: boolean
    deviceClass: string
    nwd: boolean
    remoteWipe: any
    canWipeAfterLock: boolean
    baUUID: string
    lostModeEnabled: boolean
    wipeInProgress: boolean
    deviceStatus: string
    deviceColor?: string
    isConsideredAccessory: boolean
    deviceWithYou: boolean
    lowPowerMode: boolean
    rawDeviceModel: string
    deviceDiscoveryId: string
    isLocating: boolean
    lostTimestamp: string
    mesg: any
    batteryLevel: number
    locationEnabled: boolean
    lockedTimestamp: any
    locFoundEnabled: boolean
    snd?: {
      continueButtonTitle: string
      alertText: string
      cancelButtonTitle: string
      createTimestamp: number
      statusCode: string
      alertTitle: string
    }
    lostDevice: any
    deviceDisplayName: string
    prsId?: string
    audioChannels: Array<{
      name: string
      available: number
      playing: boolean
      muted: boolean
    }>
    batteryStatus: string
    location?: {
      isOld: boolean
      isInaccurate: boolean
      altitude: number
      positionType: string
      secureLocation: any
      secureLocationTs: number
      latitude: number
      floorLevel: number
      horizontalAccuracy: number
      locationType: string
      timeStamp: number
      locationFinished: boolean
      verticalAccuracy: number
      locationMode: any
      longitude: number
    }
    deviceModel: string
    maxMsgChar: number
    darkWake: boolean
  }

interface iCloudFindMyResponse {
    userInfo: {
      accountFormatter: number
      firstName: string
      lastName: string
      membersInfo: {
        [key: string]: {
            accountFormatter: number
            firstName: string
            lastName: string
            deviceFetchStatus: string
            useAuthWidget: boolean
            isHSA: boolean
            appleId: string
        }
      }
      hasMembers: boolean
    }
    serverContext: {
      minCallbackIntervalInMS: number
      preferredLanguage: string
      enable2FAFamilyActions: boolean
      lastSessionExtensionTime: any
      callbackIntervalInMS: number
      enableMapStats: boolean
      validRegion: boolean
      timezone: {
        currentOffset: number
        previousTransition: number
        previousOffset: number
        tzCurrentName: string
        tzName: string
      }
      authToken: any
      maxCallbackIntervalInMS: number
      classicUser: boolean
      isHSA: boolean
      trackInfoCacheDurationInSecs: number
      imageBaseUrl: string
      minTrackLocThresholdInMts: number
      itemLearnMoreURL: string
      maxLocatingTime: number
      itemsTabEnabled: boolean
      sessionLifespan: number
      info: string
      prefsUpdateTime: number
      useAuthWidget: boolean
      clientId: string
      inaccuracyRadiusThreshold: number
      enable2FAFamilyRemove: boolean
      serverTimestamp: number
      deviceImageVersion: string
      macCount: number
      deviceLoadStatus: string
      maxDeviceLoadTime: number
      prsId: number
      showSllNow: boolean
      cloudUser: boolean
      enable2FAErase: boolean
    }
    alert: any
    userPreferences: {
      webPrefs:any
    }
    content: Array<iCloudFindMyDeviceInfo>
    statusCode: string
  }


class iCloudFindMyDevice {
    deviceInfo!: iCloudFindMyDeviceInfo;
    service: iCloudFindMyService;
    constructor(service: iCloudFindMyService) {
        this.service = service;
    }
    apply(newInfo: iCloudFindMyDeviceInfo) {
        this.deviceInfo = newInfo;
        return this;
    }
    get(value: keyof iCloudFindMyDeviceInfo) {
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
        this.refresh();
    }
    devices: Map<string, iCloudFindMyDevice> = new Map();
    async refresh(selectedDevice = "all") {
        const doRequest = async () => {
            const request = await this.service.fetch(
                this.serviceUri + "/fmipservice/client/web/refreshClient",
                {
                    headers: this.service.authStore.getHeaders(),
                    method: "POST",
                    body: JSON.stringify({
                        clientContext: {
                            fmly: this.includeFamily,
                            shouldLocate: true,
                            deviceListVersion: 1,
                            selectedDevice
                        }
                    })
                }
            );
            if (!request.ok) {
                const body = (await request.text()).slice(0, 200);
                throw new Error(`HTTP ${request.status}: ${body || "(empty body)"}`);
            }
            return request.json();
        };

        let json: any;
        try {
            json = await doRequest();
        } catch (err: any) {
            // 421 = wrong region, 450 = need re-auth, 500 = server error —
            // mirrors pyicloud: refresh webservices (accountLogin) silently, then retry once.
            if (/HTTP (421|450|500)/.test(err?.message ?? "")) {
                this.service._log(1 /* Info */, "[findmy] session expired (", err.message, ") — refreshing webservices");
                const refreshed = await this.service.refreshWebservices();
                if (refreshed) {
                    // serviceUri may have changed — pick up the new URL from accountInfo
                    const newUri = (this.service.accountInfo as any)?.webservices?.findme?.url;
                    if (newUri) this.serviceUri = newUri;
                    json = await doRequest();
                } else {
                    throw err;
                }
            } else {
                throw err;
            }
        }

        const newDevices = new Map();
        for (const device of json.content)
            newDevices.set(device.id, (this.devices.get(device.id) || new iCloudFindMyDevice(this)).apply(device));

        this.devices = newDevices;
        return json as iCloudFindMyResponse;
    }
}
export type { iCloudFindMyDeviceInfo, iCloudFindMyResponse };
