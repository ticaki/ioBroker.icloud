/// <reference types="mocha" />
import { expect } from 'chai';
import { agendaRange, buildCalendarAgenda, type AgendaOptions, type AgendaSourceEvent } from './calendar-agenda';

/**
 * Apple's local date array for a local date/time.
 *
 * @param y - Year.
 * @param m - Month (1–12).
 * @param d - Day of month.
 * @param h - Hour.
 * @param min - Minute.
 */
function local(y: number, m: number, d: number, h = 0, min = 0): number[] {
    return [y * 10_000 + m * 100 + d, y, m, d, h, min, h * 60 + min];
}

function event(
    partial: Partial<AgendaSourceEvent> & Pick<AgendaSourceEvent, 'localStartDate' | 'localEndDate'>,
): AgendaSourceEvent {
    return { guid: 'ev', pGuid: 'work', title: 'Event', ...partial };
}

function build(
    events: AgendaSourceEvent[],
    overrides: Partial<AgendaOptions> = {},
): ReturnType<typeof buildCalendarAgenda> {
    return buildCalendarAgenda({
        events,
        alarmsByGuid: new Map(),
        calendars: [
            { guid: 'work', title: 'Arbeit', color: '#63da38' },
            { guid: 'home', title: 'Privat', color: '#34aadc' },
        ],
        calendarGuids: [],
        now: new Date(2026, 8, 20, 12, 0),
        daysBack: 1,
        daysAhead: 3,
        ...overrides,
    });
}

describe('calendar-agenda => buildCalendarAgenda', () => {
    it('creates one key per day of the window, empty days included', () => {
        const agenda = build([]);
        expect(Object.keys(agenda)).to.deep.equal([
            '2026-09-19',
            '2026-09-20',
            '2026-09-21',
            '2026-09-22',
            '2026-09-23',
        ]);
        expect(agenda['2026-09-20']).to.deep.equal([]);
    });

    it('lists a two-day all-day event on both days but not on its exclusive end day', () => {
        // Shape as delivered by Apple: 21.–22.9. ends on 23.9. 00:00 with duration 2880.
        const agenda = build([
            event({
                allDay: true,
                localStartDate: local(2026, 9, 21),
                localEndDate: local(2026, 9, 23),
                duration: 2880,
            }),
        ]);
        expect(agenda['2026-09-21']).to.have.length(1);
        expect(agenda['2026-09-22']).to.have.length(1);
        expect(agenda['2026-09-23']).to.have.length(0);
        expect(agenda['2026-09-21'][0]).to.include({ allDay: true, startTime: '', endTime: '', duration: 2880 });
    });

    it('lists an overnight event on both days it touches', () => {
        const agenda = build([
            event({ localStartDate: local(2026, 9, 20, 22, 0), localEndDate: local(2026, 9, 21, 2, 0) }),
        ]);
        expect(agenda['2026-09-20']).to.have.length(1);
        expect(agenda['2026-09-21']).to.have.length(1);
        expect(agenda['2026-09-21'][0]).to.include({ startTime: '22:00', endTime: '02:00', duration: 240 });
    });

    it('keeps a zero-length event on its start day', () => {
        const agenda = build([
            event({ localStartDate: local(2026, 9, 21, 0, 0), localEndDate: local(2026, 9, 21, 0, 0) }),
        ]);
        expect(agenda['2026-09-20']).to.have.length(0);
        expect(agenda['2026-09-21']).to.have.length(1);
    });

    it('fills calendar title and colour and filters by calendar guid', () => {
        const events = [
            event({
                guid: 'a',
                pGuid: 'work',
                localStartDate: local(2026, 9, 20, 9),
                localEndDate: local(2026, 9, 20, 10),
            }),
            event({
                guid: 'b',
                pGuid: 'home',
                localStartDate: local(2026, 9, 20, 11),
                localEndDate: local(2026, 9, 20, 12),
            }),
        ];
        expect(build(events)['2026-09-20'].map(e => e.calendar)).to.deep.equal(['Arbeit', 'Privat']);
        const filtered = build(events, { calendarGuids: ['home'] })['2026-09-20'];
        expect(filtered).to.have.length(1);
        expect(filtered[0]).to.include({
            guid: 'b',
            calendar: 'Privat',
            calendarColor: '#34aadc',
            calendarGuid: 'home',
        });
    });

    it('orders all-day events first, then by start time', () => {
        const agenda = build([
            event({ title: 'late', localStartDate: local(2026, 9, 20, 15), localEndDate: local(2026, 9, 20, 16) }),
            event({ title: 'early', localStartDate: local(2026, 9, 20, 8), localEndDate: local(2026, 9, 20, 9) }),
            event({
                title: 'all day',
                allDay: true,
                localStartDate: local(2026, 9, 20),
                localEndDate: local(2026, 9, 21),
            }),
        ]);
        expect(agenda['2026-09-20'].map(e => e.title)).to.deep.equal(['all day', 'early', 'late']);
    });

    it('resolves alarms and computes absolute alarm times', () => {
        const agenda = build(
            [
                event({
                    alarms: ['al1', 'unknown'],
                    localStartDate: local(2026, 9, 20, 10),
                    localEndDate: local(2026, 9, 20, 11),
                }),
            ],
            {
                alarmsByGuid: new Map([
                    ['al1', { before: true, weeks: 0, days: 0, hours: 1, minutes: 15, seconds: 0 }],
                ]),
            },
        );
        const entry = agenda['2026-09-20'][0];
        expect(entry.alarms).to.have.length(1);
        expect(entry.alarmAt).to.deep.equal([new Date(2026, 8, 20, 8, 45).getTime()]);
    });

    it('walks calendar days across a DST change', () => {
        // 25.10.2026 is the end of summer time in Europe — the day has 25 hours there.
        const agenda = build(
            [event({ localStartDate: local(2026, 10, 25, 23, 30), localEndDate: local(2026, 10, 25, 23, 45) })],
            { now: new Date(2026, 9, 24, 12, 0), daysBack: 0, daysAhead: 2 },
        );
        expect(Object.keys(agenda)).to.deep.equal(['2026-10-24', '2026-10-25', '2026-10-26']);
        expect(agenda['2026-10-25']).to.have.length(1);
        expect(agenda['2026-10-26']).to.have.length(0);
    });

    it('agendaRange ends exclusively at the start of the day after the window', () => {
        const { from, to } = agendaRange(new Date(2026, 8, 20, 12, 0), 2, 7);
        expect(from.getTime()).to.equal(new Date(2026, 8, 18).getTime());
        expect(to.getTime()).to.equal(new Date(2026, 8, 28).getTime());
    });
});
