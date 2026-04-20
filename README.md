![Logo](admin/icloud.png)
# ioBroker.icloud

[![NPM version](https://img.shields.io/npm/v/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
[![Downloads](https://img.shields.io/npm/dm/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
![Number of Installations](https://iobroker.live/badges/icloud-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/icloud-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.icloud.png?downloads=true)](https://nodei.co/npm/iobroker.icloud/)

**Tests:** ![Test and Release](https://github.com/ticaki/ioBroker.icloud/workflows/Test%20and%20Release/badge.svg)

## icloud adapter for ioBroker

This adapter integrates your Apple iCloud account with ioBroker. It gives you access to a wide range of Apple services — from device locations and reminders to drive files, contacts, notes, calendar events, and your photo library — all readable and (where supported) writable as ioBroker states or via `sendTo()`.

[![Deutsche Dokumentation](https://img.shields.io/badge/Doku-Deutsch-green?logo=readme)](README_GERMAN.md)

[![English documentation](https://img.shields.io/badge/docs-English-blue?logo=readme)](README_ENGLISH.md)


---

## Credits

This adapter would not have been possible without the following open-source projects:

- **[icloud.js](https://github.com/foxt/icloud.js)** by foxt — the original JavaScript iCloud client library that this adapter is derived from and builds upon.
- **[pyicloud](https://github.com/picklepete/pyicloud)** by picklepete — the Python reference implementation for Apple's iCloud APIs that guided many of the service integrations.
- **[pyicloud (timlaing fork)](https://github.com/timlaing/pyicloud)** by timlaing — an actively maintained fork of pyicloud that served as the reference implementation for modern Reminders (CloudKit v2) and other up-to-date API details.

A big thank you to all contributors of these projects!


## Disclaimer

This adapter is an independent, community-developed open-source project. It is **not affiliated with, endorsed by, or in any way officially connected to Apple Inc.**

*iCloud*, *Find My*, *Apple ID*, *iCloud Drive*, and all other Apple trademarks are the property of Apple Inc. All product names, logos, and brands are property of their respective owners. The use of these names is for identification purposes only.

The adapter accesses Apple's iCloud services using the same APIs that are used by Apple's own clients. Use of those APIs is subject to Apple's Terms of Service. By using this adapter, you agree to comply with all applicable Apple terms and conditions. The author accepts no liability for any misuse of the adapter or any violations of Apple's Terms of Service.


## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.6.5 (2026-04-20)
* (ticaki) Drive Sync admin UI: both the iCloud Drive folder browser and the local folder browser are now scrollable (list capped at 300 px height)

### 0.6.4 (2026-04-20)
* (ticaki) Drive Sync: fixed
* (ticaki) Drive Sync admin UI: added local folder browser for directory-type sync entries

### 0.6.3 (2026-04-20)
* (ticaki) Calendar: writing writable event states (title, startDate, endDate, allDay, location, description, url, alarms, json) now correctly triggers an update to iCloud — changes were silently ignored before due to a missing state subscription
* (ticaki) Calendar: configurable look-ahead period (1–12 months) in the admin UI controls how many months of events are fetched

### 0.6.2 (2026-04-20)
* (ticaki) Auth: automatic one-shot retry after a stale-session HTTP 401 (e.g. after an adapter update); the trust token is preserved so MFA is not required again

### 0.6.1 (2026-04-20)
* (ticaki) Drive Sync: for BackItUp Admin UI improved

### 0.6.0 (2026-04-20)
* (ticaki) Drive Sync: true bidirectional sync for directory entries (upload new/changed, download new/changed, propagate deletions on both sides)
* (ticaki) Drive Sync: BackItUp entries are strictly upload-only — local backup files are never modified or deleted
* (ticaki) FindMy: added manual refresh button in admin UI/states — cancels pending timeout and triggers an immediate refresh without interrupting any ongoing refresh

### 0.5.0 (2026-04-19)
* (ticaki) Drive Sync added see Readme
* (ticaki) Calendar sendTo() API: create, update and delete calendar events; new Blockly blocks for calendar actions
* (ticaki) Photos sendTo() API: browse albums, list photos, download and delete items

### 0.4.0 (2026-04-19)
* (ticaki) iCloud Photos integration: browse albums, paginated photo listing, download and delete photos via sendTo()
* (ticaki) Photos metadata states: album count, photo count, video count, favorites, album list (JSON)
* (ticaki) Geocoding tab: unified reverse-geocoding for FindMy device positions, selectable provider (local German municipalities, Traccar, Nominatim/OpenStreetMap, OpenCage Data)
* (ticaki) External geocoders: shared URL + API-key fields, LRU cache with configurable size (3 m grid, ~50/150/300 MB), 1 req/s throttle with automatic delay, street names returned in ioBroker system language

### 0.3.0 (2026-04-18)
* (ticaki) Added iCloud Notes integration: read-only notes and folders via CloudKit, provided as JSON states
* (ticaki) Added iCloud Contacts integration: read contacts and groups via sendTo()
* (ticaki) Improved iCloud Drive connection stability
* (ticaki) Added device filter for Find My in the admin UI to hide unwanted devices

### 0.2.1 (2026-04-18)
* (ticaki) Fixed Drive and Reminders silently failing when iCloud Advanced Data Protection (ADP) is enabled; expired CloudKit sync tokens are now automatically reset
* (ticaki) Added PCS cookie handling for iCloud Drive with ADP-enabled accounts (mirrors pyicloud `_request_pcs_for_service`)

### 0.2.0 (2026-04-17)
* (ticaki) iCloud Drive integration: browse folders, upload/download files, create folders, delete and rename items via sendTo()
* (ticaki) Added Blockly blocks for uploading and downloading iCloud Drive files
* (ticaki) Drive root metadata exposed as states (drive.name, drive.fileCount, drive.rootItems, etc.)

### 0.2.0-alpha.0 (2026-04-17)
* (ticaki) iCloud Reminders are read and provided as data points (lists & reminders with due date, priority, and status)
* (ticaki) Added Blockly sendTo blocks for creating, updating, completing, deleting, and querying iCloud Reminders

## License
MIT License

Copyright (c) 2026 ticaki <github@renopoint.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.