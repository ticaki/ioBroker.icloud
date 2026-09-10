"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var calendar_agenda_exports = {};
__export(calendar_agenda_exports, {
  agendaRange: () => agendaRange,
  buildCalendarAgenda: () => buildCalendarAgenda,
  localDateArrayToTimestamp: () => localDateArrayToTimestamp,
  startOfLocalDay: () => startOfLocalDay
});
module.exports = __toCommonJS(calendar_agenda_exports);
function localDateArrayToTimestamp(arr) {
  var _a, _b;
  if (!arr || arr.length < 4) {
    return null;
  }
  return new Date(arr[1], arr[2] - 1, arr[3], (_a = arr[4]) != null ? _a : 0, (_b = arr[5]) != null ? _b : 0, 0).getTime();
}
function startOfLocalDay(date, offset = 0) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}
function agendaRange(now, daysBack, daysAhead) {
  return { from: startOfLocalDay(now, -daysBack), to: startOfLocalDay(now, daysAhead + 1) };
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function clockTime(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function alarmOffsetMs(alarm) {
  var _a, _b, _c, _d, _e;
  const minutes = (((_a = alarm.weeks) != null ? _a : 0) * 7 + ((_b = alarm.days) != null ? _b : 0)) * 1440 + ((_c = alarm.hours) != null ? _c : 0) * 60 + ((_d = alarm.minutes) != null ? _d : 0);
  return (minutes * 60 + ((_e = alarm.seconds) != null ? _e : 0)) * 1e3;
}
function touchesDay(entry, dayStart, dayEnd) {
  const end = entry.end !== null && entry.end > entry.start ? entry.end : entry.start + 1;
  return entry.start < dayEnd && end > dayStart;
}
function buildCalendarAgenda(opts) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const calendars = new Map(opts.calendars.map((c) => [c.guid, c]));
  const filter = new Set(opts.calendarGuids);
  const entries = [];
  for (const ev of opts.events) {
    if (!ev.pGuid || filter.size > 0 && !filter.has(ev.pGuid)) {
      continue;
    }
    const start = localDateArrayToTimestamp(ev.localStartDate);
    if (start === null) {
      continue;
    }
    const end = localDateArrayToTimestamp(ev.localEndDate);
    const allDay = (_a = ev.allDay) != null ? _a : false;
    const alarms = ((_b = ev.alarms) != null ? _b : []).map((guid) => opts.alarmsByGuid.get(guid)).filter((a) => a !== void 0);
    const calendar = calendars.get(ev.pGuid);
    entries.push({
      title: (_c = ev.title) != null ? _c : "",
      allDay,
      start,
      end,
      startTime: allDay ? "" : clockTime(start),
      endTime: allDay || end === null ? "" : clockTime(end),
      duration: (_d = ev.duration) != null ? _d : end !== null ? Math.round((end - start) / 6e4) : null,
      location: (_e = ev.location) != null ? _e : "",
      description: (_f = ev.description) != null ? _f : "",
      calendar: (_g = calendar == null ? void 0 : calendar.title) != null ? _g : "",
      calendarColor: (_h = calendar == null ? void 0 : calendar.color) != null ? _h : "",
      alarms,
      alarmAt: alarms.map((a) => a.before === false ? start + alarmOffsetMs(a) : start - alarmOffsetMs(a)),
      guid: ev.guid,
      calendarGuid: ev.pGuid
    });
  }
  entries.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start || a.title.localeCompare(b.title));
  const agenda = {};
  for (let offset = -opts.daysBack; offset <= opts.daysAhead; offset++) {
    const dayStart = startOfLocalDay(opts.now, offset);
    const dayEnd = startOfLocalDay(opts.now, offset + 1).getTime();
    agenda[dayKey(dayStart)] = entries.filter((e) => touchesDay(e, dayStart.getTime(), dayEnd));
  }
  return agenda;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  agendaRange,
  buildCalendarAgenda,
  localDateArrayToTimestamp,
  startOfLocalDay
});
//# sourceMappingURL=calendar-agenda.js.map
