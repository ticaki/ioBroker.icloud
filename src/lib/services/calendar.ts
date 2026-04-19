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
    location?: string;
    description?: string;
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

interface AlarmMeasurement {
    before: boolean;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface CreateEventOptions {
    calendarGuid: string;
    title: string;
    startDate: Date;
    endDate: Date;
    allDay?: boolean;
    location?: string;
    description?: string;
    url?: string;
    alarms?: AlarmMeasurement[];
}

interface UpdateEventOptions {
    calendarGuid: string;
    eventGuid: string;
    etag?: string;
    title?: string;
    startDate?: Date;
    endDate?: Date;
    allDay?: boolean;
    location?: string;
    description?: string;
    url?: string;
    alarms?: AlarmMeasurement[];
}

function generateGuid(): string {
    // UUID v4 generation without crypto dependency
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        })
        .toUpperCase();
}

function dateToAppleList(dt: Date, isStart: boolean): (string | number)[] {
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const hour = dt.getHours();
    const minute = dt.getMinutes();
    const dateString = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const minutesFromMidnight = isStart ? hour * 60 + minute : (24 - hour) * 60 + (60 - minute);
    return [dateString, year, month, day, hour, minute, minutesFromMidnight];
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

    private defaultParams(from?: Date, to?: Date): Record<string, string> {
        return {
            startDate: dayjs(from ?? dayjs().startOf('month')).format(this.dateFormat),
            endDate: dayjs(to ?? dayjs().endOf('month')).format(this.dateFormat),
            dsid: this.dsid,
            lang: 'en-us',
            usertz: this.tz,
        };
    }

    private async handleAuthError<T>(json: any, retry: boolean, retryFn: () => Promise<T>): Promise<T | null> {
        if (json?.error === 1 && typeof json?.reason === 'string' && json.reason.includes('X-APPLE-WEBAUTH-TOKEN')) {
            if (retry) {
                this.service._log(
                    0 /* LogLevel.Debug */,
                    '[calendar] Missing X-APPLE-WEBAUTH-TOKEN — re-authenticating for calendar service',
                );
                await this.service.authenticateWebService('calendar');
                return retryFn();
            }
            throw new Error(`Calendar authentication failed: ${json.reason}`);
        }
        return null;
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
            if (response.status === 401 && retry) {
                await this.service.authenticateWebService('calendar');
                return this.fetchEndpoint<T>(endpointUrl, params, false);
            }
            return {} as T;
        }

        const json = JSON.parse(text);
        const authResult = await this.handleAuthError<T>(json, retry, () =>
            this.fetchEndpoint<T>(endpointUrl, params, false),
        );
        if (authResult !== null) {
            return authResult;
        }

        return json as T;
    }

    private async postEndpoint<T = any>(
        endpointUrl: string,
        params: Record<string, string>,
        body: unknown,
        retry = true,
    ): Promise<T> {
        const url = new URL(`${this.calendarServiceUri}${endpointUrl}`);
        url.search = new URLSearchParams(params).toString();
        this.service._log(0 /* LogLevel.Debug */, `[calendar] POST ${url.toString()}`);

        const headers = this.service.authStore.getHeaders();
        const response = await this.service.fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'text/plain',
                Referer: 'https://www.icloud.com/',
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();

        if (!text || !text.trim()) {
            this.service._log(
                0 /* LogLevel.Debug */,
                `[calendar] Empty response from POST ${endpointUrl} (HTTP ${response.status})`,
            );
            if (response.status === 401 && retry) {
                await this.service.authenticateWebService('calendar');
                return this.postEndpoint<T>(endpointUrl, params, body, false);
            }
            return {} as T;
        }

        const json = JSON.parse(text);
        const authResult = await this.handleAuthError<T>(json, retry, () =>
            this.postEndpoint<T>(endpointUrl, params, body, false),
        );
        if (authResult !== null) {
            return authResult;
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
        return this.fetchEndpoint<iCloudCalendarEventsResponse>('/events', this.defaultParams(from, to));
    }

    async calendars(from?: Date, to?: Date): Promise<iCloudCalendarCollection[]> {
        const response = await this.fetchEndpoint<iCloudCalendarStartupResponse>(
            '/startup',
            this.defaultParams(from, to),
        );
        return response.Collection || [];
    }

    async startup(from?: Date, to?: Date): Promise<iCloudCalendarStartupResponse> {
        return this.fetchEndpoint<iCloudCalendarStartupResponse>('/startup', this.defaultParams(from, to));
    }

    private async getCtag(calendarGuid: string): Promise<string> {
        const collections = await this.calendars();
        const col = collections.find(c => c.guid === calendarGuid);
        if (!col) {
            throw new Error(`Calendar with guid "${calendarGuid}" not found`);
        }
        return col.ctag;
    }

    async createEvent(opts: CreateEventOptions): Promise<{ guid: string; response: iCloudCalendarEventsResponse }> {
        const guid = generateGuid();
        const now = new Date();
        const duration = Math.round((opts.endDate.getTime() - opts.startDate.getTime()) / 60_000);

        const startDateList = dateToAppleList(opts.startDate, true);
        const endDateList = dateToAppleList(opts.endDate, false);
        const nowList = dateToAppleList(now, true);

        const alarmGuids: string[] = [];
        const alarmPayload: iCloudCalendarAlarm[] = [];

        if (opts.alarms && opts.alarms.length > 0) {
            for (const alarm of opts.alarms) {
                const alarmGuid = `${guid}:${generateGuid()}`;
                alarmGuids.push(alarmGuid);
                alarmPayload.push({
                    messageType: 'message',
                    pGuid: guid,
                    guid: alarmGuid,
                    isLocationBased: false,
                    measurement: {
                        hours: alarm.hours ?? 0,
                        minutes: alarm.minutes ?? 0,
                        seconds: alarm.seconds ?? 0,
                        days: alarm.days ?? 0,
                        weeks: alarm.weeks ?? 0,
                        before: alarm.before ?? true,
                    },
                });
            }
        }

        const event: Record<string, unknown> = {
            title: opts.title,
            tz: this.tz,
            icon: 0,
            duration,
            allDay: opts.allDay ?? false,
            pGuid: opts.calendarGuid,
            guid,
            startDate: startDateList,
            endDate: endDateList,
            localStartDate: startDateList,
            localEndDate: endDateList,
            createdDate: nowList,
            lastModifiedDate: nowList,
            extendedDetailsAreIncluded: true,
            recurrenceException: false,
            recurrenceMaster: false,
            hasAttachments: false,
            readOnly: false,
            transparent: false,
            birthdayIsYearlessBday: false,
            birthdayShowAsCompany: false,
            shouldShowJunkUIWhenAppropriate: false,
            location: opts.location ?? '',
            description: opts.description ?? '',
            url: opts.url ?? '',
            etag: '',
            alarms: alarmGuids,
            attachments: [],
            invitees: [],
        };

        const ctag = await this.getCtag(opts.calendarGuid);

        const body = {
            Event: event,
            Invitee: [],
            Alarm: alarmPayload,
            ClientState: {
                Collection: [{ guid: opts.calendarGuid, ctag }],
            },
        };

        const response = await this.postEndpoint<iCloudCalendarEventsResponse>(
            `/events/${opts.calendarGuid}/${guid}`,
            this.defaultParams(),
            body,
        );
        return { guid, response };
    }

    async updateEvent(opts: UpdateEventOptions): Promise<iCloudCalendarEventsResponse> {
        // Fetch the current event to merge fields
        const detail = await this.eventDetails(opts.calendarGuid, opts.eventGuid);
        if (!detail.Event || detail.Event.length === 0) {
            throw new Error(`Event "${opts.eventGuid}" not found`);
        }
        const existing = detail.Event[0];
        const resolvedEtag = opts.etag ?? existing.etag;
        if (!resolvedEtag) {
            throw new Error(`Could not determine etag for event "${opts.eventGuid}"`);
        }

        const now = new Date();
        const nowList = dateToAppleList(now, true);

        // Resolve updated dates — fall back to existing Apple-format arrays
        const startDate = opts.startDate;
        const endDate = opts.endDate;
        const startDateList = startDate ? dateToAppleList(startDate, true) : existing.localStartDate;
        const endDateList = endDate ? dateToAppleList(endDate, false) : existing.localEndDate;
        const startMs = startDate
            ? startDate.getTime()
            : new Date(
                  existing.localStartDate[1],
                  existing.localStartDate[2] - 1,
                  existing.localStartDate[3],
                  existing.localStartDate[4] ?? 0,
                  existing.localStartDate[5] ?? 0,
              ).getTime();
        const endMs = endDate
            ? endDate.getTime()
            : new Date(
                  existing.localEndDate[1],
                  existing.localEndDate[2] - 1,
                  existing.localEndDate[3],
                  existing.localEndDate[4] ?? 0,
                  existing.localEndDate[5] ?? 0,
              ).getTime();
        const duration = Math.round((endMs - startMs) / 60_000);

        // Build alarm payload if new alarms are provided
        const alarmGuids: string[] = [];
        const alarmPayload: iCloudCalendarAlarm[] = [];
        if (opts.alarms !== undefined) {
            for (const alarm of opts.alarms) {
                const alarmGuid = `${opts.eventGuid}:${generateGuid()}`;
                alarmGuids.push(alarmGuid);
                alarmPayload.push({
                    messageType: 'message',
                    pGuid: opts.eventGuid,
                    guid: alarmGuid,
                    isLocationBased: false,
                    measurement: {
                        hours: alarm.hours ?? 0,
                        minutes: alarm.minutes ?? 0,
                        seconds: alarm.seconds ?? 0,
                        days: alarm.days ?? 0,
                        weeks: alarm.weeks ?? 0,
                        before: alarm.before ?? true,
                    },
                });
            }
        }

        const event: Record<string, unknown> = {
            ...existing,
            title: opts.title ?? existing.title,
            allDay: opts.allDay !== undefined ? opts.allDay : existing.allDay,
            location: opts.location !== undefined ? opts.location : (existing.location ?? ''),
            description: opts.description !== undefined ? opts.description : (existing.description ?? ''),
            url: opts.url !== undefined ? opts.url : (existing.url ?? ''),
            startDate: startDateList,
            endDate: endDateList,
            localStartDate: startDateList,
            localEndDate: endDateList,
            duration,
            lastModifiedDate: nowList,
            etag: resolvedEtag,
            alarms: opts.alarms !== undefined ? alarmGuids : existing.alarms,
        };

        const ctag = await this.getCtag(opts.calendarGuid);

        const body = {
            Event: event,
            Invitee: [],
            Alarm: opts.alarms !== undefined ? alarmPayload : (detail.Alarm ?? []),
            ClientState: {
                Collection: [{ guid: opts.calendarGuid, ctag }],
            },
        };

        const params: Record<string, string> = {
            ...this.defaultParams(),
            ifMatch: resolvedEtag,
        };

        return this.postEndpoint<iCloudCalendarEventsResponse>(
            `/events/${opts.calendarGuid}/${opts.eventGuid}`,
            params,
            body,
        );
    }

    async deleteEvent(calendarGuid: string, eventGuid: string, etag?: string): Promise<iCloudCalendarEventsResponse> {
        // If no etag provided, fetch it from event detail
        let resolvedEtag = etag;
        if (!resolvedEtag) {
            const detail = await this.eventDetails(calendarGuid, eventGuid);
            if (detail.Event && detail.Event.length > 0) {
                resolvedEtag = detail.Event[0].etag;
            }
            if (!resolvedEtag) {
                throw new Error(`Could not determine etag for event "${eventGuid}"`);
            }
        }

        const ctag = await this.getCtag(calendarGuid);

        const body = {
            Event: {},
            Invitee: [],
            Alarm: [],
            ClientState: {
                Collection: [{ guid: calendarGuid, ctag }],
            },
        };

        const params: Record<string, string> = {
            ...this.defaultParams(),
            methodOverride: 'DELETE',
            ifMatch: resolvedEtag,
        };

        return this.postEndpoint<iCloudCalendarEventsResponse>(`/events/${calendarGuid}/${eventGuid}`, params, body);
    }
}
export type {
    AlarmMeasurement,
    CreateEventOptions,
    UpdateEventOptions,
    iCloudCalendarAlarm,
    iCloudCalendarCollection,
    iCloudCalendarEvent,
    iCloudCalendarEventDetailResponse,
    iCloudCalendarEventsResponse,
    iCloudCalendarInvitee,
    iCloudCalendarRecurrence,
    iCloudCalendarStartupResponse,
};
