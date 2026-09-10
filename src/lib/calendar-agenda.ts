/**
 * Day-keyed calendar agenda for the `calendar.agenda` state.
 *
 * Kept free of adapter state so the day bucketing (exclusive all-day end dates, multi-day
 * events, DST days) can be unit-tested on its own.
 */
import type { AlarmMeasurement } from './services/calendar';

/** The subset of an iCloud `/events` entry the agenda needs. */
export interface AgendaSourceEvent {
    guid: string;
    pGuid: string;
    title?: string;
    allDay?: boolean;
    localStartDate: number[];
    localEndDate: number[];
    duration?: number;
    location?: string;
    description?: string;
    alarms?: string[];
}

/** Calendar metadata used to label agenda entries. */
export interface AgendaCalendar {
    guid: string;
    title: string;
    color?: string;
}

/** One event as it appears below a day key in `calendar.agenda`. */
export interface AgendaEntry {
    title: string;
    allDay: boolean;
    /** Start timestamp (ms). */
    start: number;
    /** End timestamp (ms) — exclusive for all-day events (a one-day event ends at 00:00 of the next day). */
    end: number | null;
    /** Local start time `HH:mm`, empty for all-day events. */
    startTime: string;
    /** Local end time `HH:mm`, empty for all-day events. */
    endTime: string;
    /** Duration in minutes. */
    duration: number | null;
    location: string;
    description: string;
    /** Calendar title. */
    calendar: string;
    calendarColor: string;
    alarms: AlarmMeasurement[];
    /** Absolute alarm timestamps (ms), in the order of `alarms`. */
    alarmAt: number[];
    guid: string;
    calendarGuid: string;
}

/** `YYYY-MM-DD` (local date) → events touching that day. */
export type CalendarAgenda = Record<string, AgendaEntry[]>;

/** Input for {@link buildCalendarAgenda}. */
export interface AgendaOptions {
    events: AgendaSourceEvent[];
    alarmsByGuid: Map<string, AlarmMeasurement>;
    calendars: AgendaCalendar[];
    /** Calendar guids to include; empty includes every calendar. */
    calendarGuids: string[];
    now: Date;
    daysBack: number;
    daysAhead: number;
}

/**
 * Convert Apple's local date array to a timestamp in the process time zone.
 *
 * @param arr - `[YYYYMMDD, YYYY, MM, DD, HH, mm, …]`; the compact first field is skipped.
 */
export function localDateArrayToTimestamp(arr: number[] | null | undefined): number | null {
    if (!arr || arr.length < 4) {
        return null;
    }
    return new Date(arr[1], arr[2] - 1, arr[3], arr[4] ?? 0, arr[5] ?? 0, 0).getTime();
}

/**
 * Start of the local day `offset` days away from `date`. Built from calendar fields instead of
 * adding 24 h, so DST days keep their 23 or 25 hours.
 *
 * @param date - Reference date.
 * @param offset - Day offset, negative for past days.
 */
export function startOfLocalDay(date: Date, offset = 0): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/**
 * The agenda window: `from` is the start of the first day, `to` the start of the day after the
 * last one (exclusive).
 *
 * @param now - Reference date ("today").
 * @param daysBack - Past days to include.
 * @param daysAhead - Days after today to include.
 */
export function agendaRange(now: Date, daysBack: number, daysAhead: number): { from: Date; to: Date } {
    return { from: startOfLocalDay(now, -daysBack), to: startOfLocalDay(now, daysAhead + 1) };
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function dayKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function clockTime(ts: number): string {
    const d = new Date(ts);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function alarmOffsetMs(alarm: AlarmMeasurement): number {
    const minutes =
        ((alarm.weeks ?? 0) * 7 + (alarm.days ?? 0)) * 1440 + (alarm.hours ?? 0) * 60 + (alarm.minutes ?? 0);
    return (minutes * 60 + (alarm.seconds ?? 0)) * 1000;
}

function touchesDay(entry: AgendaEntry, dayStart: number, dayEnd: number): boolean {
    // End dates are exclusive; a zero-length event belongs to the day it starts on.
    const end = entry.end !== null && entry.end > entry.start ? entry.end : entry.start + 1;
    return entry.start < dayEnd && end > dayStart;
}

/**
 * Group events by local day. Every day of the window gets a key (empty days map to `[]`),
 * multi-day events are listed on each day they touch, and each day is ordered all-day first,
 * then by start time.
 *
 * @param opts - Events, calendar metadata, filter and window.
 */
export function buildCalendarAgenda(opts: AgendaOptions): CalendarAgenda {
    const calendars = new Map(opts.calendars.map(c => [c.guid, c]));
    const filter = new Set(opts.calendarGuids);
    const entries: AgendaEntry[] = [];

    for (const ev of opts.events) {
        if (!ev.pGuid || (filter.size > 0 && !filter.has(ev.pGuid))) {
            continue;
        }
        const start = localDateArrayToTimestamp(ev.localStartDate);
        if (start === null) {
            continue;
        }
        const end = localDateArrayToTimestamp(ev.localEndDate);
        const allDay = ev.allDay ?? false;
        const alarms = (ev.alarms ?? [])
            .map(guid => opts.alarmsByGuid.get(guid))
            .filter((a): a is AlarmMeasurement => a !== undefined);
        const calendar = calendars.get(ev.pGuid);
        entries.push({
            title: ev.title ?? '',
            allDay,
            start,
            end,
            startTime: allDay ? '' : clockTime(start),
            endTime: allDay || end === null ? '' : clockTime(end),
            duration: ev.duration ?? (end !== null ? Math.round((end - start) / 60_000) : null),
            location: ev.location ?? '',
            description: ev.description ?? '',
            calendar: calendar?.title ?? '',
            calendarColor: calendar?.color ?? '',
            alarms,
            alarmAt: alarms.map(a => (a.before === false ? start + alarmOffsetMs(a) : start - alarmOffsetMs(a))),
            guid: ev.guid,
            calendarGuid: ev.pGuid,
        });
    }

    entries.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start || a.title.localeCompare(b.title));

    const agenda: CalendarAgenda = {};
    for (let offset = -opts.daysBack; offset <= opts.daysAhead; offset++) {
        const dayStart = startOfLocalDay(opts.now, offset);
        const dayEnd = startOfLocalDay(opts.now, offset + 1).getTime();
        agenda[dayKey(dayStart)] = entries.filter(e => touchesDay(e, dayStart.getTime(), dayEnd));
    }
    return agenda;
}
