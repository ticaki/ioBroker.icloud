# Older Changelog

Older changelog entries will be moved here from the [README](README.md) once the changelog section there grows too long.
## 0.7.7 (2026-05-11)
- (ticaki) Extends an ioBroker object only when the provided partial object has actually changed

## 0.7.6 (2026-04-26)
* (ticaki) fixed: SMS 2FA verification mode is now always forced to `sms` — using `pushMode` from the trusted phone could cause authentication failures

## 0.7.5 (2026-04-23)
* (ticaki) changed: Removed unused keytar dependency and code.
* (ticaki) fixed: jsonConfig warnings / all repochecker error, warnings
* (ticaki) donate link

## 0.7.4 (2026-04-22)
* (ticaki) New: SMS MFA panel in the General admin tab — appears automatically below the login fields when the adapter requests MFA; lets you request an SMS code and submit the 6-digit code directly from the admin UI without touching ioBroker states; visibility is driven by an internal adapter variable (not the `mfa.required` state) so the panel only appears once the adapter is ready to accept the code

## 0.7.3 (2026-04-22)
* (ticaki) Fix: persistent HTTP 450 (session expired) on FindMy / Reminders now triggers automatic full re-authentication instead of looping indefinitely
* (ticaki) New: session keep-alive — every 6 hours a lightweight POST /validate is sent to Apple to keep the session alive and detect expiry before any service call fails

## 0.7.2 (2026-04-22)
* (ticaki) fixed: sms 2fa

## 0.7.0 (2026-04-21)
* (ticaki) **BREAKING CHANGE** Contacts: contact detail states moved under a new `list` folder — state path changed from `contacts.<id>.<field>` to `contacts.list.<id>.<field>`; existing state objects are cleaned up automatically on the next adapter start
* (ticaki) Contacts: new **Birthday states** option — creates `contacts.birthdays.today`, `.tomorrow` and `.next7days` JSON states; each entry includes all contact fields plus calculated `age` (or `null` for year-less birthdays)
* (ticaki) Contacts: new **Filter groups** chips field — when filled, only contacts belonging to at least one of the listed groups are written as states; leave empty to write all contacts
* (ticaki) Drive Sync: both sync modes (directory & BackItUp) are now fully recursive — subdirectories are synced, created and deleted on both sides automatically
* (ticaki) Fix SMS MFA 412 error: `X-Apple-Auth-Attributes` response header is now captured and round-tripped in all subsequent MFA requests; added `X-Apple-OAuth-State`, `X-Apple-Frame-Id` and corrected `Referer` to `getMfaHeaders()`

## 0.6.5 (2026-04-20)
* (ticaki) Drive Sync admin UI: both the iCloud Drive folder browser and the local folder browser are now scrollable (list capped at 300 px height)

## 0.6.4 (2026-04-20)
* (ticaki) Drive Sync: fixed
* (ticaki) Drive Sync admin UI: added local folder browser for directory-type sync entries

## 0.6.3 (2026-04-20)
* (ticaki) Calendar: writing writable event states (title, startDate, endDate, allDay, location, description, url, alarms, json) now correctly triggers an update to iCloud — changes were silently ignored before due to a missing state subscription
* (ticaki) Calendar: configurable look-ahead period (1–12 months) in the admin UI controls how many months of events are fetched

## 0.6.2 (2026-04-20)
* (ticaki) Auth: automatic one-shot retry after a stale-session HTTP 401 (e.g. after an adapter update); the trust token is preserved so MFA is not required again

## 0.6.1 (2026-04-20)
* (ticaki) Drive Sync: for BackItUp Admin UI improved

## 0.6.0 (2026-04-20)
* (ticaki) Drive Sync: true bidirectional sync for directory entries (upload new/changed, download new/changed, propagate deletions on both sides)
* (ticaki) Drive Sync: BackItUp entries are strictly upload-only — local backup files are never modified or deleted
* (ticaki) FindMy: added manual refresh button in admin UI/states — cancels pending timeout and triggers an immediate refresh without interrupting any ongoing refresh

## 0.5.0 (2026-04-19)
* (ticaki) Drive Sync added see Readme
* (ticaki) Calendar sendTo() API: create, update and delete calendar events; new Blockly blocks for calendar actions
* (ticaki) Photos sendTo() API: browse albums, list photos, download and delete items

## 0.4.0 (2026-04-19)
* (ticaki) iCloud Photos integration: browse albums, paginated photo listing, download and delete photos via sendTo()
* (ticaki) Photos metadata states: album count, photo count, video count, favorites, album list (JSON)
* (ticaki) Geocoding tab: unified reverse-geocoding for FindMy device positions, selectable provider (local German municipalities, Traccar, Nominatim/OpenStreetMap, OpenCage Data)
* (ticaki) External geocoders: shared URL + API-key fields, LRU cache with configurable size (3 m grid, ~50/150/300 MB), 1 req/s throttle with automatic delay, street names returned in ioBroker system language

## 0.3.0 (2026-04-18)
* (ticaki) Added iCloud Notes integration: read-only notes and folders via CloudKit, provided as JSON states
* (ticaki) Added iCloud Contacts integration: read contacts and groups via sendTo()
* (ticaki) Improved iCloud Drive connection stability
* (ticaki) Added device filter for Find My in the admin UI to hide unwanted devices

## 0.2.1 (2026-04-18)
* (ticaki) Fixed Drive and Reminders silently failing when iCloud Advanced Data Protection (ADP) is enabled; expired CloudKit sync tokens are now automatically reset
* (ticaki) Added PCS cookie handling for iCloud Drive with ADP-enabled accounts (mirrors pyicloud `_request_pcs_for_service`)

## 0.2.0 (2026-04-17)
* (ticaki) iCloud Drive integration: browse folders, upload/download files, create folders, delete and rename items via sendTo()
* (ticaki) Added Blockly blocks for uploading and downloading iCloud Drive files
* (ticaki) Drive root metadata exposed as states (drive.name, drive.fileCount, drive.rootItems, etc.)
* (ticaki) iCloud Reminders are read and provided as data points (lists & reminders with due date, priority, and status)
* (ticaki) Added Blockly sendTo blocks for creating, updating, completing, deleting, and querying iCloud Reminders
