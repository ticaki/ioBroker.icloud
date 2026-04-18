# Copilot Instructions — ioBroker.icloud

## Code quality — mandatory after every change

After **every** code change, run **all applicable checks** and fix all reported errors before finishing:

```bash
npm run build       # always
npm run lint        # always
npm run build:admin # mandatory when any file under src-admin/ was changed
```

- `npm run build` — TypeScript compilation of the adapter; no errors allowed
- `npm run build:admin` — Vite + tsc build of the React admin component; **must be run and must succeed whenever src-admin/ is touched** — no exceptions
- `npm run lint` — ESLint + Prettier; no errors allowed (warnings are acceptable)

Alle während einer Sitzung eingeführten Lint-Fehler und -Warnungen **müssen vor Ende der Sitzung behoben sein** — die Anzahl der Fehler und Warnungen darf nie größer werden als zu Beginn.
Bereits vorher existierende Fehler und Warnungen **müssen ebenfalls behoben werden**, sofern sie im Rahmen der aktuellen Änderungen berührt werden oder ohne großen Aufwand behebbar sind.

## Forbidden patterns — never use these

The following constructs are **strictly forbidden** and must never appear in any committed code:

- `// @ts-expect-error` — fix the underlying type error instead
- `// @ts-ignore` — fix the underlying type error instead
- `// @ts-nocheck` — fix the underlying type errors instead
- `// eslint-disable` — fix the underlying lint issue instead

If a suppression directive is the only apparent solution, that is a signal to rethink the approach entirely.

## README language

The `README.md` must be written **entirely in English**. Do not use any other language in the README, including comments inside code examples.

## Project structure

- `src/main.ts` — ioBroker adapter entry point (all adapter logic lives here)
- `src/lib/` — TypeScript iCloud API library (auth, FindMy, Drive, Photos, …), compiled together with the adapter
- `admin/jsonConfig.json` — Admin UI configuration (JSON Config schema)
- `admin/i18n/*.json` — translations for the Admin UI

# Apple API reference

Alle Implementierungen, die mit der Apple-Server-Kommunikation zu tun haben (Auth, FindMy, Drive, Photos, etc.), **müssen mit pyiCloud abgeglichen werden**.
pyiCloud ist die Referenzimplementierung: https://github.com/picklepete/pyicloud

- Endpunkte, Request-Parameter, Header und Antwortstrukturen aus pyiCloud übernehmen
- Bei Abweichungen oder Unklarheiten gilt pyiCloud als autoritäre Quelle

### Reminders — CloudKit v2

Der Legacy-Endpoint `/rd/startup` liefert nur noch alte, nicht-migrierte Erinnerungen.
Alle modernen iCloud-Clients nutzen seit 2024/2025 die **CloudKit-API**:

- Container: `com.apple.reminders` über den `ckdatabasews`-Webservice
- Endpoint: `{ckdatabasews.url}/database/1/com.apple.reminders/production/private`
- CloudKit-Zone: `Reminders` (REGULAR_CUSTOM_ZONE)
- Listen: `POST /changes/zone` mit `desiredRecordTypes: ['List']`
- Erinnerungen: `POST /records/query` mit RecordType `reminderList`

Referenz-Implementierung für Reminders: **timlaing/pyicloud** (aktiv gepflegter Fork):
https://github.com/timlaing/pyicloud/tree/main/pyicloud/services/reminders

## Key references

- **ioBroker JSON Config schema & field types**:
  https://github.com/ioBroker/ioBroker.admin/blob/master/packages/jsonConfig/README.md
  Relevant field types used in this adapter: `text`, `password`, `coordinates`, `header`

- **ioBroker adapter-core API**:
  https://github.com/ioBroker/ioBroker.js-controller

## Auth flow

1. `authenticate()` — SRP init + complete → `409` triggers `accountLogin` → may skip MFA if `200`
2. On `409` + non-200 `accountLogin`: emit `MfaRequested`, wait for `mfa.code` state
3. `provideMfaCode()` → trust → `_getiCloudCookies()` → `Ready`
4. On `Ready`: `onICloudReady()` collects account info, webservices, FindMy devices, then sets `info.connection = true`

## FindMy refresh

`scheduleFindMyRefresh()` uses a self-rescheduling `setTimeout` (not `setInterval`) —
the next 15-minute tick only starts **after** the previous refresh completes,
preventing overlapping API calls.

