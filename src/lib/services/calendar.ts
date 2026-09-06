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
    /**
     * Set when `/startup` never answered and the calendar list had to be reconstructed from the
     * `pGuid`s of the events. Such a list only contains calendars that actually have events in
     * the queried range and carries no titles, colours or flags — consumers must not treat it as
     * the authoritative set of calendars (i.e. must not delete anything missing from it).
     */
    degraded?: boolean;
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

/**
 * Compact rendering of the Apple edge headers that tell an empty error response apart:
 * which instance answered, whether a CDN served it and whether Apple asked us to back off.
 *
 * @param headers - The response headers to describe.
 */
function describeAppleHeaders(headers: Headers): string {
    const keys = [
        'x-apple-request-uuid',
        'x-responding-instance',
        'x-apple-edge-response-time',
        'retry-after',
        'age',
        'via',
        'content-length',
    ];
    const parts = keys
        .map(k => [k, headers.get(k)] as const)
        .filter((e): e is readonly [string, string] => e[1] !== null)
        .map(([k, v]) => `${k}=${v}`);
    return parts.length ? parts.join(', ') : 'no diagnostic headers';
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

    /**
     * Query parameters every calendar request carries.
     *
     * The base set (`clientBuildNumber`, `clientMasteringNumber`, `clientId`, `dsid`) comes from
     * `service.getParams()` — pyicloud builds every calendar request as `dict(self.params)` plus
     * lang/usertz/startDate/endDate, and Apple's own web client sends the same client identifiers.
     * Without them some calendar partitions reject the request outright (HTTP 500 with an empty
     * body) and Apple's CDN caches the response globally instead of per user.
     */
    private baseParams(): Record<string, string> {
        return { ...Object.fromEntries(this.service.getParams()), dsid: this.dsid };
    }

    private defaultParams(from?: Date, to?: Date): Record<string, string> {
        return {
            ...this.baseParams(),
            startDate: dayjs(from ?? dayjs().startOf('month')).format(this.dateFormat),
            endDate: dayjs(to ?? dayjs().endOf('month')).format(this.dateFormat),
            lang: 'en-us',
            usertz: this.tz,
        };
    }

    /**
     * Re-authenticate for the calendar web service and pick up the (possibly new) partition URL.
     *
     * Apple moves accounts between calendar partitions (p198-calendarws.icloud.com and friends);
     * accountLogin returns the current one, so a cached URI from a previous session would keep
     * addressing the old host.
     */
    private async reauthenticate(): Promise<void> {
        await this.service.authenticateWebService('calendar');
        const newUri = this.service.accountInfo?.webservices.calendar?.url;
        if (newUri) {
            this.calendarServiceUri = `${newUri}/ca`;
        }
    }

    private async handleAuthError<T>(json: any, retry: boolean, retryFn: () => Promise<T>): Promise<T | null> {
        if (json?.error === 1 && typeof json?.reason === 'string' && json.reason.includes('X-APPLE-WEBAUTH-TOKEN')) {
            if (retry) {
                this.service._log(
                    0 /* LogLevel.Debug */,
                    '[calendar] Missing X-APPLE-WEBAUTH-TOKEN — re-authenticating for calendar service',
                );
                await this.reauthenticate();
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

        if (!response.ok) {
            // An empty error body carries no clue about who refused the request. Apple's edge
            // headers do: they identify the responding instance and whether the answer came from
            // a cache — the difference between a broken request, a stale CDN entry and an outage.
            this.service._log(
                0 /* LogLevel.Debug */,
                `[calendar] GET ${endpointUrl} → HTTP ${response.status}, ${describeAppleHeaders(response.headers)}`,
            );
        }

        if (!text || !text.trim()) {
            // Only a 401 means the X-APPLE-WEBAUTH-* cookie is gone. An empty 5xx does not:
            // accounts that get one on /startup answer /events with the very same cookies in the
            // next request, so re-authenticating on 5xx only replaced Apple's error with a
            // misleading auth error of our own.
            if (response.status === 401 && retry) {
                await this.reauthenticate();
                return this.fetchEndpoint<T>(endpointUrl, params, false);
            }
            if (!response.ok) {
                throw new Error(`GET ${endpointUrl} failed: HTTP ${response.status} (empty response)`);
            }
            this.service._log(
                0 /* LogLevel.Debug */,
                `[calendar] Empty response from ${endpointUrl} (HTTP ${response.status}) — skipping`,
            );
            return {} as T;
        }

        if (!response.ok) {
            throw new Error(`GET ${endpointUrl} failed: HTTP ${response.status} — ${text.slice(0, 200)}`);
        }

        const json = JSON.parse(text);
        const authResult = await this.handleAuthError<T>(json, retry, () =>
            this.fetchEndpoint<T>(endpointUrl, params, false),
        );
        if (authResult !== null) {
            return authResult;
        }
        // Apple answers with HTTP 200 and an error envelope for anything the auth handler above
        // does not cover (service disabled, rate limit, …) — surface it instead of returning
        // a response object whose expected arrays are simply missing.
        if (json?.error === 1) {
            throw new Error(`GET ${endpointUrl} failed: ${json.reason ?? 'unknown error'}`);
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
                await this.reauthenticate();
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
            ...this.baseParams(),
            lang: 'en-us',
            usertz: this.tz,
        });
    }

    async events(from?: Date, to?: Date): Promise<iCloudCalendarEventsResponse> {
        return this.fetchEndpoint<iCloudCalendarEventsResponse>('/events', this.defaultParams(from, to));
    }

    /**
     * Fetch events across multiple months by issuing one /events request per month,
     * similar to timlaing/pyicloud's `refresh_client()` approach.
     * Apple's API silently returns empty results when the date range exceeds ~30 days,
     * so we chunk the request into individual calendar months.
     *
     * @param months Number of months to fetch (1 = current month only).
     */
    async eventsForMonths(months: number): Promise<iCloudCalendarEventsResponse> {
        const allEvents: iCloudCalendarEvent[] = [];
        const allAlarms: iCloudCalendarAlarm[] = [];
        const allRecurrences: iCloudCalendarRecurrence[] = [];
        const seenGuids = new Set<string>();

        const now = new Date();
        for (let i = 0; i < months; i++) {
            const year = now.getFullYear();
            const month = now.getMonth() + i;
            const from = new Date(year, month, 1);
            const to = new Date(year, month + 1, 0); // last day of that month
            const resp = await this.events(from, to);

            for (const ev of resp.Event ?? []) {
                if (!seenGuids.has(ev.guid)) {
                    seenGuids.add(ev.guid);
                    allEvents.push(ev);
                }
            }
            for (const a of resp.Alarm ?? []) {
                allAlarms.push(a);
            }
            for (const r of resp.Recurrence ?? []) {
                allRecurrences.push(r);
            }
        }

        return { Event: allEvents, Alarm: allAlarms, Recurrence: allRecurrences };
    }

    async calendars(from?: Date, to?: Date): Promise<iCloudCalendarCollection[]> {
        const response = await this.fetchStartup(from, to);
        return response.Collection || [];
    }

    async startup(from?: Date, to?: Date): Promise<iCloudCalendarStartupResponse> {
        return this.fetchStartup(from, to);
    }

    /**
     * GET /ca/startup, with two fallbacks so a broken calendar list does not cost the events too.
     *
     * Some accounts get an empty HTTP 500 from `/startup` while `/events` answers normally with
     * the very same host, cookies and query parameters — Apple serves the events but chokes on
     * the calendar list. Rather than failing the whole refresh we try, in order:
     *
     * 1. `/startup` for the requested range,
     * 2. `/startup` for a single day — `Collection[]` does not depend on the queried range, so a
     *    narrow request still yields the complete calendar list when the failure comes from the
     *    events inside the range,
     * 3. `/events` for the requested range, with the calendar list reconstructed from the events'
     *    `pGuid`s and flagged as `degraded`.
     *
     * The fallbacks never re-authenticate (`retry = false`): the first request already settled
     * whether the session is valid, and a second reauth would only mask Apple's real error.
     *
     * @param from - Start of the requested range (defaults to the start of the current month).
     * @param to - End of the requested range (defaults to the end of the current month).
     */
    private async fetchStartup(from?: Date, to?: Date): Promise<iCloudCalendarStartupResponse> {
        const params = this.defaultParams(from, to);
        try {
            return await this.fetchEndpoint<iCloudCalendarStartupResponse>('/startup', params);
        } catch (e) {
            const today = dayjs().format(this.dateFormat);
            try {
                const narrow = await this.fetchEndpoint<iCloudCalendarStartupResponse>(
                    '/startup',
                    { ...params, startDate: today, endDate: today },
                    false,
                );
                if (narrow.Collection?.length) {
                    this.service._log(
                        2 /* LogLevel.Warning */,
                        `[calendar] /startup failed for ${params.startDate}..${params.endDate} but answered for a ` +
                            `single day — using the calendar list from the narrow request ` +
                            `(${narrow.Collection.length} calendar(s)); events are fetched separately anyway.`,
                    );
                    return narrow;
                }
            } catch (narrowErr) {
                this.service._log(
                    0 /* LogLevel.Debug */,
                    `[calendar] /startup for a single day failed as well: ${(narrowErr as Error)?.message ?? String(narrowErr)}`,
                );
            }

            try {
                const probe = await this.fetchEndpoint<iCloudCalendarEventsResponse>('/events', params, false);
                const events = probe.Event ?? [];
                const guids = [...new Set(events.map(ev => ev.pGuid).filter((g): g is string => !!g))];
                if (guids.length) {
                    this.service._log(
                        2 /* LogLevel.Warning */,
                        `[calendar] /startup failed but /events answered (${events.length} event(s) in ` +
                            `${guids.length} calendar(s)) — Apple serves this account's events but not its ` +
                            `calendar list. Continuing with a calendar list reconstructed from the events: ` +
                            `calendars without events in the queried range are missing and no titles, colours ` +
                            `or flags are available for the others.`,
                    );
                    return {
                        Alarm: probe.Alarm ?? [],
                        Event: events,
                        Collection: guids.map(guid => this.placeholderCollection(guid)),
                        degraded: true,
                    };
                }
                this.service._log(
                    0 /* LogLevel.Debug */,
                    '[calendar] counter-probe GET /events answered but contained no events — no calendar list to reconstruct',
                );
            } catch (probeErr) {
                this.service._log(
                    0 /* LogLevel.Debug */,
                    `[calendar] counter-probe GET /events failed as well: ${(probeErr as Error)?.message ?? String(probeErr)}`,
                );
            }
            throw e;
        }
    }

    /**
     * A calendar collection reconstructed from an event's `pGuid` — everything Apple would have
     * delivered in `/startup` is unknown here, so only the guid is real.
     *
     * @param guid - The calendar guid taken from the events' `pGuid`.
     */
    private placeholderCollection(guid: string): iCloudCalendarCollection {
        return {
            title: guid,
            guid,
            ctag: '',
            order: 0,
            color: '',
            symbolicColor: '',
            enabled: true,
            createdDate: [],
            isFamily: false,
            lastModifiedDate: [],
            shareTitle: '',
            prePublishedUrl: '',
            supportedType: '',
            etag: '',
            isDefault: false,
            objectType: '',
            readOnly: true,
            isPublished: false,
            isPrivatelyShared: false,
            extendedDetailsAreIncluded: false,
            shouldShowJunkUIWhenAppropriate: false,
            visible: true,
        };
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
