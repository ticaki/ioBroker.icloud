import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type iCloudService from '..';
dayjs.extend(utc);
dayjs.extend(timezone);

interface iCloudCalendarAlarm {
    messageType: string;
    pGuid: string;
    guid: string;
    isLocationBased: boolean;
    measurement: {
        hours: number;
        seconds: number;
        weeks: number;
        minutes: number;
        days: number;
        before: boolean;
    };
}

interface iCloudCalendarEvent {
    tz: string;
    icon: number;
    recurrenceException: boolean;
    title: string;
    tzname: string;
    duration: number;
    allDay: boolean;
    startDateTZOffset: string;
    pGuid: string;
    hasAttachments: boolean;
    birthdayIsYearlessBday: boolean;
    alarms: string[];
    lastModifiedDate: number[];
    readOnly: boolean;
    localEndDate: number[];
    recurrence?: string;
    localStartDate: number[];
    createdDate: number[];
    extendedDetailsAreIncluded: boolean;
    guid: string;
    etag: string;
    startDate: number[];
    endDate: number[];
    masterStartDate: number[];
    masterEndDate: number[];
    birthdayShowAsCompany: boolean;
    recurrenceMaster: boolean;
    transparent: boolean;
    attachments: any[];
    privateComments: any[];
    shouldShowJunkUIWhenAppropriate: boolean;
    url?: string;
}

interface iCloudCalendarRecurrence {
    guid: string;
    pGuid: string;
    freq: string;
    interval: number;
    recurrenceMasterStartDate: any[];
    weekStart: string;
    frequencyDays: string;
    weekDays: any[];
}

interface iCloudCalendarInvitee {
    commonName: string;
    isMe: boolean;
    isOrganizer: boolean;
    inviteeStatus: string;
    pGuid: string;
    guid: string;
    isSenderMe: boolean;
    email: string;
    cutype: string;
}

interface iCloudCalendarCollection {
    title: string;
    guid: string;
    ctag: string;
    order: number;
    color: string;
    symbolicColor: string;
    enabled: boolean;
    createdDate: number[];
    isFamily: boolean;
    lastModifiedDate: number[];
    shareTitle: string;
    prePublishedUrl: string;
    supportedType: string;
    etag: string;
    isDefault: boolean;
    objectType: string;
    readOnly: boolean;
    isPublished: boolean;
    isPrivatelyShared: boolean;
    extendedDetailsAreIncluded: boolean;
    shouldShowJunkUIWhenAppropriate: boolean;
    publishedUrl?: string;
    visible: boolean;
}

interface iCloudCalendarEventDetailResponse {
    Alarm: Array<iCloudCalendarAlarm>;
    Event: Array<iCloudCalendarEvent>;
    Invitee: Array<iCloudCalendarInvitee>;
    Recurrence: Array<iCloudCalendarRecurrence>;
}

interface iCloudCalendarStartupResponse {
    Alarm: Array<iCloudCalendarAlarm>;
    Event: Array<iCloudCalendarEvent>;
    Collection: Array<iCloudCalendarCollection>;
}

interface iCloudCalendarEventsResponse {
    Alarm: Array<iCloudCalendarAlarm>;
    Event: Array<iCloudCalendarEvent>;
    Recurrence: Array<iCloudCalendarRecurrence>;
}

export class iCloudCalendarService {
    service: iCloudService;
    serviceUri: string;
    dsid: string;
    dateFormat = 'YYYY-MM-DD';
    calendarServiceUri: string;
    tz = dayjs.tz.guess() || 'UTC';
    constructor(service: iCloudService, serviceUri: string) {
        this.service = service;
        this.serviceUri = serviceUri;
        this.dsid = this.service.accountInfo!.dsInfo.dsid;
        this.calendarServiceUri = `${service.accountInfo!.webservices.calendar.url}/ca`;
    }
    private async fetchEndpoint<T = any>(
        endpointUrl: string,
        params: Record<string, string>,
        retry = true,
    ): Promise<T> {
        const url = new URL(`${this.calendarServiceUri}${endpointUrl}`);
        url.search = new URLSearchParams(params).toString();
        this.service._log(0 /* LogLevel.Debug */, `[calendar] GET ${url.toString()}`);

        // pyicloud sends no Content-Type on GET requests — Apple returns 400 if it is present.
        const { 'Content-Type': _ct, ...getHeaders } = this.service.authStore.getHeaders();
        const response = await this.service.fetch(url, {
            headers: {
                ...getHeaders,
                Referer: 'https://www.icloud.com/',
            },
        });

        const text = await response.text();

        if (!text || !text.trim()) {
            this.service._log(
                0 /* LogLevel.Debug */,
                `[calendar] Empty response from ${endpointUrl} (HTTP ${response.status}) — skipping`,
            );
            // 4xx = server rejected the request (bad params or session expired w/o body).
            // Only retry with re-auth on 401; 400 means bad request (nothing auth can fix).
            if (response.status === 401 && retry) {
                await this.service.authenticateWebService('calendar');
                return this.fetchEndpoint<T>(endpointUrl, params, false);
            }
            return {} as T;
        }

        const json = JSON.parse(text);

        if (json?.error === 1 && typeof json?.reason === 'string' && json.reason.includes('X-APPLE-WEBAUTH-TOKEN')) {
            if (retry) {
                this.service._log(
                    0 /* LogLevel.Debug */,
                    '[calendar] Missing X-APPLE-WEBAUTH-TOKEN — re-authenticating for calendar service',
                );
                await this.service.authenticateWebService('calendar');
                return this.fetchEndpoint<T>(endpointUrl, params, false);
            }
            throw new Error(`Calendar authentication failed: ${json.reason}`);
        }

        return json as T;
    }
    async eventDetails(calendarGuid: string, eventGuid: string): Promise<iCloudCalendarEventDetailResponse> {
        return this.fetchEndpoint<iCloudCalendarEventDetailResponse>(`/eventdetail/${calendarGuid}/${eventGuid}`, {
            lang: 'en-us',
            usertz: this.tz,
            dsid: this.dsid,
        });
    }

    async events(from?: Date, to?: Date): Promise<iCloudCalendarEventsResponse> {
        return this.fetchEndpoint<iCloudCalendarEventsResponse>('/events', {
            startDate: dayjs(from ?? dayjs().startOf('month')).format(this.dateFormat),
            endDate: dayjs(to ?? dayjs().endOf('month')).format(this.dateFormat),
            dsid: this.dsid,
            lang: 'en-us',
            usertz: this.tz,
        });
    }

    async calendars(from?: Date, to?: Date): Promise<iCloudCalendarCollection[]> {
        const response = await this.fetchEndpoint<iCloudCalendarStartupResponse>('/startup', {
            startDate: dayjs(from ?? dayjs().startOf('month')).format(this.dateFormat),
            endDate: dayjs(to ?? dayjs().endOf('month')).format(this.dateFormat),
            dsid: this.dsid,
            lang: 'en-us',
            usertz: this.tz,
        });
        return response.Collection || [];
    }

    async startup(from?: Date, to?: Date): Promise<iCloudCalendarStartupResponse> {
        return this.fetchEndpoint<iCloudCalendarStartupResponse>('/startup', {
            startDate: dayjs(from ?? dayjs().startOf('month')).format(this.dateFormat),
            endDate: dayjs(to ?? dayjs().endOf('month')).format(this.dateFormat),
            dsid: this.dsid,
            lang: 'en-us',
            usertz: this.tz,
        });
    }
}
export type {
    iCloudCalendarAlarm,
    iCloudCalendarCollection,
    iCloudCalendarEvent,
    iCloudCalendarEventDetailResponse,
    iCloudCalendarEventsResponse,
    iCloudCalendarInvitee,
    iCloudCalendarRecurrence,
    iCloudCalendarStartupResponse,
};
