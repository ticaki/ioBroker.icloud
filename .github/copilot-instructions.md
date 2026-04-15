# Copilot Instructions — ioBroker.icloud

## Project structure

- `src/main.ts` — ioBroker adapter entry point (all adapter logic lives here)
- `icloud-lib/src/` — TypeScript iCloud API library (auth, FindMy, Drive, Photos, …)
- `icloud-lib/build/` — compiled output of the library (do not edit manually)
- `admin/jsonConfig.json` — Admin UI configuration (JSON Config schema)
- `admin/i18n/*.json` — translations for the Admin UI

After editing `icloud-lib/src/`, always run `npm run build` inside `icloud-lib/` before testing.

# Apple API reference

Alle Implementierungen, die mit der Apple-Server-Kommunikation zu tun haben (Auth, FindMy, Drive, Photos, etc.), **müssen mit pyiCloud abgeglichen werden**.
pyiCloud ist die Referenzimplementierung: https://github.com/picklepete/pyicloud

- Endpunkte, Request-Parameter, Header und Antwortstrukturen aus pyiCloud übernehmen
- Bei Abweichungen oder Unklarheiten gilt pyiCloud als autoritäre Quelle

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

## Coordinates

Config fields: `latitude` (number), `longitude` (number), `useSystemCoordinates` (boolean).
Use `resolveHomeCoords()` to get the effective home position (config → system.config fallback).
Distance is calculated with the Haversine formula in `haversineKm()`.
