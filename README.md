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

## This adapter supports

- [Find My](#find-my) — last known device locations, battery level, home distance and sound alerts
- [Reminders](#reminders--sendto-api) — read, create, edit, complete and delete iCloud Reminders via `sendTo()`; lists and individual reminders are also written as ioBroker states under `reminders.*`
- [iCloud Drive](#icloud-drive--sendto-api) — browse, upload, download, create, delete and rename files via `sendTo()`
- [Contacts](#contacts--sendto-api) — read contacts and contact groups via `sendTo()`; optionally also writes individual contact fields as ioBroker states under `contacts.*`
- [Notes](#notes--states) — iCloud Notes as ioBroker states (`notes.list`, `notes.textList`)
- [Calendar](#calendar--sendto-api) — upcoming calendar events as ioBroker states; create and delete events via `sendTo()`
- [Photos](#icloud-photos--sendto-api) — browse albums, list photos, download and delete items via `sendTo()`; metadata counters as ioBroker states
- [Two-factor authentication (2FA)](#two-factor-authentication-2fa)

## Configuration

1. Open the adapter settings in the ioBroker Admin UI.
2. Enter your **Apple ID** (e-mail address) in the *Username* field.
3. Enter your **Apple ID password** in the *Password* field.
4. Enable or disable **Find My** and set the refresh interval (minutes).
5. Optionally add named home-location points (latitude/longitude) to get a calculated distance for each device.
6. Save the settings — the adapter starts the authentication immediately.

## Two-factor authentication (2FA)

2FA may be required when signing in. If Apple requests a verification code, the state `icloud.<instance>.mfa.required` is set to `true`.

### SMS code

1. Set the state `icloud.<instance>.mfa.requestSmsCode` to `true`.
2. Apple sends a 6-digit code via SMS to the phone number registered with your Apple ID.
3. Write the received code into `icloud.<instance>.mfa.code`.
4. The adapter submits the code and connects. `mfa.required` is reset to `false` automatically.

> **Note:** Other 2FA methods (trusted device push etc.) may be supported by the underlying API but have not been tested.

---

## Find My

Find My reports the last known location of all devices linked to your Apple ID (including family members if enabled) and writes their GPS coordinates, battery level, and distance to ioBroker states under `findme.<numericId>.*`.

> **Important — this is not real-time tracking.**
> Apple's Find My service delivers a *snapshot* of the last position the device uploaded to iCloud. By the time the data reaches this adapter it is already at least a minute old — and on top of that the device itself may not have updated its location recently either. The actual age of a position is shown in the `locationTimestamp` state; `isOld` is set to `true` when Apple itself considers the fix outdated.
> Use Find My to get a general sense of where a device is, not to follow its movement in real time.

### Device states

| State | Description |
|-------|-------------|
| `name` | Device name as set in Apple's settings |
| `latitude` / `longitude` | Last known GPS coordinates |
| `batteryLevel` | Battery level (0–100 %) |
| `batteryStatus` | Charging state (`Charging`, `Charged`, `NotCharging`) |
| `distanceKm` | Distance in km to the first configured home location |
| `locationName` | Municipality name (only when **Geo lookup** is enabled) |
| `ping` | Write `true` to play a sound on the device (only for capable devices, see below) |

### Filtering devices

Devices you do not want to track can be excluded in the adapter settings under **Find My → Disabled devices**. The admin UI lists all currently known devices — tick the ones to hide. Their ioBroker states are removed automatically and will not reappear until re-enabled.

### Home distance

Add one or more named home-location points (latitude / longitude) in the adapter settings under **Find My → Location points**. The `distanceKm` state of each device shows the straight-line distance in kilometres to the **first** location point. Additional points are written as extra states (`distanceKm_1`, `distanceKm_2`, …).

### Ping — play sound

Devices that support the sound feature expose a `findme.<numericId>.ping` state (type: button). Set it to `true` from a script or the ioBroker state panel to make the device play a sound — useful when you have misplaced a device nearby.

```javascript
setState('icloud.0.findme.123456.ping', true);
```

> **Note:** The `ping` state is only created for devices whose `features.SND` capability flag is `true`.

---

## Reminders — sendTo() API

You can read, create, edit, complete and delete iCloud Reminders from JavaScript or Blockly scripts using `sendTo()`.

### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `reminderId` | `string` | Unique reminder ID, e.g. `"Reminder/A1B2-..."`. Available in the state `reminders.<list>.<slot>.id` and returned by `getReminders`. |
| `listId` | `string` | Unique list ID, e.g. `"List/A1B2-..."`. Returned by `getReminderLists` as the `listId` field. |
| `title` | `string` | Reminder title, e.g. `"Buy milk"`. |
| `description` | `string` | Notes / body text of the reminder (may be empty). |
| `dueDate` | `number` | Due date as a Unix timestamp in **milliseconds** (same format as `Date.now()`). `null` = no due date. |
| `priority` | `number` | Priority level: `0` = none, `1` = high, `5` = medium, `9` = low. Matches the priority levels shown in the Reminders app. |
| `flagged` | `boolean` | `true` = reminder is flagged (shown with an orange flag in the app — useful for a quick overview of important items). |
| `allDay` | `boolean` | `true` = all-day reminder (no specific time, only a date). When set, the time component of `dueDate` is ignored by Apple. |
| `completed` | `boolean` | `true` = reminder is marked as completed. |

> **Note on recurrence rules:** Setting recurrence rules (daily, weekly, etc.) is not supported by this API because Apple stores them as a separate CloudKit object (RecurrenceRule). Existing recurrence rules on a reminder are preserved when editing.

---

### Step 1 — Get reminder lists

You need the `listId` of the target list before creating a reminder.

```javascript
sendTo('icloud.0', 'getReminderLists', {}, (result) => {
    if (result.success) {
        // result.lists = [
        //   { listId: "List/A1B2-...", title: "Groceries", color: "#FF0000", count: 3 },
        //   { listId: "List/C3D4-...", title: "Work",      color: "#0000FF", count: 1 },
        // ]
        result.lists.forEach(list => {
            console.log(list.title + ' -> listId: ' + list.listId);
        });
    } else {
        console.error(result.error);
    }
});
```

### Step 2 — Get reminders

```javascript
// All reminders from all lists:
sendTo('icloud.0', 'getReminders', {}, (result) => {
    if (result.success) {
        // result.reminders = [
        //   { id: "Reminder/A1B2-...", listId: "List/...", title: "Buy milk",
        //     completed: false, flagged: false, allDay: false,
        //     dueDate: 1745000000000, priority: 0, description: "" }, ...
        // ]
        result.reminders.forEach(r => {
            const due = r.dueDate ? new Date(r.dueDate).toLocaleString() : 'no date';
            console.log(r.title + ' (due: ' + due + ')');
        });
    }
});

// Only reminders from a specific list (listId from getReminderLists):
sendTo('icloud.0', 'getReminders', { listId: 'List/A1B2-...' }, (result) => {
    if (result.success) {
        console.log(result.reminders.length + ' reminder(s) in this list');
    }
});
```

### Create a reminder

Required fields: `listId`, `title`. All other fields are optional.

```javascript
sendTo('icloud.0', 'createReminder', {
    listId: 'List/A1B2-...',         // required -- from getReminderLists
    title:  'Buy milk',              // required -- reminder title

    description: 'Organic whole milk', // optional -- notes/body text
    dueDate: Date.now() + 86400000,  // optional -- tomorrow at this time (ms timestamp)
    allDay:  false,                  // optional -- true = date only, no specific time
    priority: 1,                     // optional -- 0=none  1=high  5=medium  9=low
    flagged:  false,                 // optional -- true = mark with an orange flag
    completed: false,                // optional -- true = create already completed
}, (result) => {
    if (result.success) {
        // result.reminder contains the full reminder object including the assigned reminderId
        console.log('Created with ID: ' + result.reminder.id);
    } else {
        console.error(result.error);
    }
});
```

### Mark a reminder as completed

Required field: `reminderId`.

```javascript
// Mark as completed:
sendTo('icloud.0', 'completeReminder', {
    reminderId: 'Reminder/A1B2-...',  // required -- reminder ID
    completed:  true,                 // optional -- default: true; false = reopen
}, (result) => {
    if (result.success) {
        console.log('Done!');
    } else {
        console.error(result.error);
    }
});

// Reopen a completed reminder:
sendTo('icloud.0', 'completeReminder', {
    reminderId: 'Reminder/A1B2-...',
    completed:  false,
}, (result) => { /* ... */ });
```

### Edit a reminder

Required field: `reminderId`. Only the fields you provide are changed — all others remain untouched.

```javascript
sendTo('icloud.0', 'updateReminder', {
    reminderId:  'Reminder/A1B2-...', // required -- reminder ID

    title:       'Buy oat milk',      // optional -- new title
    description: 'Organic',           // optional -- new notes text
    dueDate:     Date.now() + 172800000, // optional -- new due date (ms)
    allDay:      false,               // optional
    priority:    5,                   // optional -- 0/1/5/9
    flagged:     true,                // optional
    completed:   false,               // optional
}, (result) => {
    if (result.success) {
        console.log('Updated: ' + result.reminder.title);
    } else {
        console.error(result.error);
    }
});
```

### Delete a reminder

Required field: `reminderId`.

```javascript
sendTo('icloud.0', 'deleteReminder', {
    reminderId: 'Reminder/A1B2-...',  // required -- reminder ID
}, (result) => {
    if (result.success) {
        console.log('Deleted!');
    } else {
        console.error(result.error);
    }
});
```

> **Tip:** The `reminderId` is available in the state `reminders.<list>.<slot>.id` or in the `id` field returned by `getReminders`.

---

## iCloud Drive — sendTo() API

You can list folders, upload files, download files, create folders, delete and rename items in iCloud Drive using `sendTo()`.

> **Note:** Enable "iCloud Drive" in the adapter settings first. File content is transferred as **Base64** strings.

### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Slash-separated path relative to the Drive root, e.g. `"Documents/Photos/cat.jpg"`. |
| `folderId` | `string` | The `drivewsid` of a folder (returned by `driveListFolder`). Alternative to `path`. |
| `fileId` | `string` | The `drivewsid` of a file (returned by `driveListFolder`). Alternative to `path`. |
| `itemId` | `string` | The `drivewsid` of any item (file or folder) for `driveGetMetadata`. Alternative to `path`. |
| `fileName` | `string` | Name for the uploaded file, e.g. `"photo.jpg"`. |
| `base64` | `string` | File content encoded as Base64 string. |
| `contentType` | `string` | MIME type, e.g. `"image/jpeg"`. Optional — defaults to `"application/octet-stream"`. |
| `folderPath` | `string` | Slash-separated path to the target folder for uploads. Optional — defaults to root. |
| `parentPath` | `string` | Slash-separated path to the parent folder for `driveCreateFolder`. Optional — defaults to root. |
| `parentId` | `string` | The `drivewsid` of the parent folder. Alternative to `parentPath`. |
| `name` | `string` | Name for a new folder. |
| `newName` | `string` | New name for renaming an item. |
| `drivewsid` | `string` | Drive item ID for delete/rename operations. |
| `etag` | `string` | ETag of the item (required together with `drivewsid` for delete/rename). |

---

### List a folder

```javascript
// List root folder:
sendTo('icloud.0', 'driveListFolder', {}, (result) => {
    if (result.success) {
        // result.items = [
        //   { name: "Documents", type: "FOLDER", drivewsid: "FOLDER::...", docwsid: "...", size: 0, etag: "..." },
        //   { name: "photo.jpg", type: "FILE",   drivewsid: "FILE::...",   docwsid: "...", size: 123456, etag: "..." },
        // ]
        result.items.forEach(item => {
            console.log(item.name + ' (' + item.type + ', ' + item.size + ' bytes)');
        });
    } else {
        console.error(result.error);
    }
});

// List a subfolder by path:
sendTo('icloud.0', 'driveListFolder', { path: 'Documents/Photos' }, (result) => {
    if (result.success) {
        console.log(result.items.length + ' item(s) in Documents/Photos');
    } else {
        console.error(result.error);
    }
});
```

### Get metadata of a file or folder

Returns all available metadata without downloading the file content.

```javascript
sendTo('icloud.0', 'driveGetMetadata', {
    path: 'Documents/photo.jpg',  // path or itemId (drivewsid)
}, (result) => {
    if (result.success) {
        // result.item = {
        //   name:                "photo.jpg",
        //   type:                "FILE",           // "FILE" | "FOLDER" | "APP_LIBRARY"
        //   drivewsid:           "FILE::com.apple.CloudDocs::...",
        //   docwsid:             "...",
        //   parentId:            "FOLDER::...",
        //   etag:                "abc123",
        //   size:                123456,           // bytes (0 for folders)
        //   fileCount:           0,                // only relevant for folders
        //   directChildrenCount: 0,                // only relevant for folders
        //   dateCreated:         1745000000000,    // ms timestamp
        //   dateModified:        1745000000000,    // ms timestamp (null if not set)
        //   dateChanged:         1745000000000,    // ms timestamp (null if not set)
        //   dateLastOpen:        1745000000000,    // ms timestamp (null if not set)
        //   extension:           "jpg",            // null for folders
        // }
        const item = result.item;
        console.log(item.name + ': ' + item.size + ' bytes, modified ' + new Date(item.dateModified).toLocaleString());
    } else {
        console.error(result.error);
    }
});
```

### Download a file

Returns the file content as a Base64 string. Ideal for images.

```javascript
sendTo('icloud.0', 'driveGetFile', {
    path: 'Documents/photo.jpg',       // path or fileId (drivewsid)
}, (result) => {
    if (result.success) {
        // result.name   = "photo.jpg"
        // result.size   = 123456        (bytes)
        // result.base64 = "/9j/4AAQ..." (Base64 encoded content)
        console.log('Downloaded: ' + result.name + ' (' + result.size + ' bytes)');

        // Example: write image to a file in ioBroker missing callback
        // writeFile('0_userdata.0', '/icloud/' + result.name, Buffer.from(result.base64, 'base64'));
    } else {
        console.error(result.error);
    }
});
```

### Upload a file

Required fields: `fileName`, `base64`. Optionally specify `folderPath` or `folderId`.

```javascript
// Upload an image to the root folder:
sendTo('icloud.0', 'driveUploadFile', {
    fileName:    'screenshot.png',       // required — file name
    base64:      '/9j/4AAQSkZJRg...',    // required — Base64 encoded content
    contentType: 'image/png',            // optional — MIME type
    folderPath:  'Documents/Photos',     // optional — target folder path (default: root)
}, (result) => {
    if (result.success) {
        console.log('Upload successful!');
    } else {
        console.error(result.error);
    }
});

// Example: read a local file and upload it
const data = readFileSync('0_userdata.0', '/cameras/snapshot.jpg');
sendTo('icloud.0', 'driveUploadFile', {
    fileName:    'snapshot.jpg',
    base64:      data.toString('base64'),
    contentType: 'image/jpeg',
    folderPath:  'Documents',
}, (result) => { /* ... */ });

// Example: without file
const content = 'Hallo iCloud Drive!';
const base64 = Buffer.from(content).toString('base64');

sendTo('icloud.0', 'driveUploadFile', {
    fileName:    'test.txt',
    base64:      base64,
    contentType: 'text/plain',
}, (result) => {
    console.log(JSON.stringify(result));
});
```

### Create a folder

Required field: `name`. Optionally specify `parentPath` or `parentId`.

```javascript
sendTo('icloud.0', 'driveCreateFolder', {
    name:       'Backups',               // required — folder name
    parentPath: 'Documents',             // optional — parent folder (default: root)
}, (result) => {
    if (result.success) {
        console.log('Folder created!');
    } else {
        console.error(result.error);
    }
});
```

### Delete an item

You can delete by path or by `drivewsid` + `etag`.

```javascript
// Delete by path:
sendTo('icloud.0', 'driveDeleteItem', {
    path: 'Documents/old-file.txt',
}, (result) => {
    if (result.success) {
        console.log('Deleted!');
    } else {
        console.error(result.error);
    }
});

// Delete by ID (from driveListFolder result):
sendTo('icloud.0', 'driveDeleteItem', {
    drivewsid: 'FILE::com.apple.CloudDocs::...',
    etag:      'abc123',
}, (result) => { /* ... */ });
```

### Rename an item

Required field: `newName`. Identify the item by path or by `drivewsid` + `etag`.

```javascript
sendTo('icloud.0', 'driveRenameItem', {
    path:    'Documents/old-name.txt',   // path or drivewsid + etag
    newName: 'new-name.txt',             // required — new name
}, (result) => {
    if (result.success) {
        console.log('Renamed!');
    } else {
        console.error(result.error);
    }
});
```

> **Tip:** Use `driveListFolder` to discover file/folder IDs and etags. The `drivewsid` and `etag` are returned for each item.

---

## Contacts — sendTo() API

You can read contacts and contact groups from iCloud Contacts using `sendTo()`.

> **Note:** Enable **Contacts** in the adapter settings first.

### Get contact groups

```javascript
sendTo('icloud.0', 'getContactGroups', {}, (result) => {
    if (result.success) {
        // result.groups = [
        //   { groupId: "...", name: "Family", contactCount: 4 },
        //   { groupId: "...", name: "Work",   contactCount: 12 },
        // ]
        result.groups.forEach(g => {
            console.log(g.name + ' (' + g.contactCount + ' contact(s))');
        });
    } else {
        console.error(result.error);
    }
});
```

### Get contacts

```javascript
// All contacts:
sendTo('icloud.0', 'getContacts', {}, (result) => {
    if (result.success) {
        // result.contacts = [
        //   { contactId: "abc123-...", fullName: "Jane Doe",
        //     firstName: "Jane", lastName: "Doe",
        //     phones: [{ label: "mobile", field: "+49 123 456789" }],
        //     emails: [{ label: "home",   field: "jane@example.com" }],
        //     city: "Berlin", groups: ["Family"], isMe: false, ... }, ...
        // ]
        result.contacts.forEach(c => {
            const phone = c.phones[0] ? c.phones[0].field : 'no phone';
            console.log(c.fullName + ' — ' + phone);
        });
    } else {
        console.error(result.error);
    }
});

// Single contact by contactId:
sendTo('icloud.0', 'getContacts', { contactId: 'abc123-...' }, (result) => {
    if (result.success && result.contacts.length) {
        const c = result.contacts[0];
        console.log(c.fullName + ', ' + c.city);
    }
});

// All contacts in a specific group (use name from getContactGroups):
sendTo('icloud.0', 'getContacts', { groupName: 'Family' }, (result) => {
    if (result.success) {
        console.log(result.contacts.length + ' contact(s) in Family');
    }
});
```

### Contact field reference

| Field | Type | Description |
|-------|------|-------------|
| `contactId` | `string` | Stable unique identifier for the contact. |
| `firstName` / `lastName` | `string` | First and last name. |
| `fullName` | `string` | Assembled full name (including prefix, middle name, suffix). |
| `companyName` | `string` | Company / organisation name. |
| `phones` | `Array<{label, field}>` | Phone numbers with label (e.g. `"mobile"`, `"home"`). |
| `emails` | `Array<{label, field}>` | Email addresses with label. |
| `streetAddresses` | `Array<{label, street, city, state, postalCode, country, countryCode}>` | Postal addresses. |
| `city` | `string` | City from the first street address. |
| `birthday` | `string` | Birthday as an ISO date string (e.g. `"1990-01-15"`). |
| `nickname` | `string` | Nickname. |
| `jobTitle` | `string` | Job title. |
| `department` | `string` | Department within the company. |
| `notes` | `string` | Free-text notes. |
| `groups` | `string[]` | Names of the groups this contact belongs to. |
| `isMe` | `boolean` | `true` if this is the "Me" card (the account owner). |
| `raw` | `object` | Full raw JSON from iCloud for advanced use. |

---

## Notes — States

iCloud Notes are read-only and provided as JSON states for use in visualizations.

> **Note:** Enable **Notes** in the adapter settings first.

### States

| State | Type | Description |
|-------|------|-------------|
| `notes.count` | `number` | Total number of (non-deleted) notes. |
| `notes.folderCount` | `number` | Number of folders. |
| `notes.lastSync` | `number` | Timestamp (ms) of the last successful sync. |
| `notes.list` | `string` | JSON array of all notes with metadata and text (see below). |
| `notes.textList` | `string` | JSON array of plain note texts (`string[]`) — non-locked notes only, sorted newest first. |

### `notes.list` format

```json
[
    {
        "id": "RecordName-...",
        "title": "Shopping List",
        "snippet": "Milk, Eggs, Bread...",
        "folderId": "FolderRecordName-...",
        "folderName": "Personal",
        "modifiedDate": 1745000000000,
        "isLocked": false,
        "text": "Milk\nEggs\nBread\nButter"
    }
]
```

Notes are sorted by modification date (newest first). Password-protected notes have `isLocked: true` and `text: null`.

### `notes.textList` format

```json
[
    "Milk\nEggs\nBread\nButter",
    "772*16 *20",
    "300x200"
]
```

A flat array of plain text strings — one entry per note. Contains only non-locked notes with readable text, sorted newest first.

> **Limitation:** Notes are read-only. Apple's Notes API does not support creating or editing notes via the web service.

---

## Calendar — sendTo() API

You can list calendars, browse events, create new events, and delete events using `sendTo()`.

> **Note:** Enable **Calendar** in the adapter settings first.

### States

| State | Type | Description |
|-------|------|-------------|
| `calendar.lastSync` | `number` | Timestamp (ms) of the last successful sync. |
| `calendar.<name>.guid` | `string` | Calendar GUID. |
| `calendar.<name>.color` | `string` | Calendar color. |
| `calendar.<name>.enabled` | `boolean` | Whether the calendar is enabled. |
| `calendar.<name>.readOnly` | `boolean` | Whether the calendar is read-only. |
| `calendar.<name>.<slot>.title` | `string` | Event title. |
| `calendar.<name>.<slot>.startDate` | `number` | Event start timestamp (ms). |
| `calendar.<name>.<slot>.endDate` | `number` | Event end timestamp (ms). |
| `calendar.<name>.<slot>.allDay` | `boolean` | Whether the event is all-day. |
| `calendar.<name>.<slot>.duration` | `number` | Duration in minutes. |

Upcoming events are automatically synced at the configured refresh interval.

### Get calendars

```javascript
sendTo('icloud.0', 'getCalendars', {}, (result) => {
    if (result.success) {
        // result.calendars = [
        //   { guid: "...", title: "Home", color: "#1badf8", enabled: true, isDefault: true, isFamily: false, readOnly: false, order: 1 },
        //   { guid: "...", title: "Work", color: "#ff9500", enabled: true, isDefault: false, isFamily: false, readOnly: false, order: 2 },
        // ]
        result.calendars.forEach(c => {
            console.log(c.title + ' (GUID: ' + c.guid + ')');
        });
    } else {
        console.error(result.error);
    }
});
```

### Get events

Returns events for a date range. Defaults to the current month.

```javascript
sendTo('icloud.0', 'getCalendarEvents', {
    from: Date.now(),                         // optional — start timestamp (default: first of month)
    to:   Date.now() + 7 * 24 * 60 * 60000,  // optional — end timestamp (default: last of month)
    calendarGuid: '...',                      // optional — filter by calendar GUID
}, (result) => {
    if (result.success) {
        // result.events = [
        //   {
        //     guid: "ABC-123",
        //     calendarGuid: "...",
        //     title: "Team Meeting",
        //     startDate: 1713500000000,
        //     endDate: 1713503600000,
        //     allDay: false,
        //     duration: 60,
        //     location: "Room 42",
        //     description: "Weekly sync",
        //     url: "",
        //     tz: "Europe/Berlin",
        //     etag: "...",
        //     readOnly: false,
        //     recurrenceMaster: false,
        //     alarms: [],
        //   }, ...
        // ]
        result.events.forEach(e => {
            console.log(e.title + ' — ' + new Date(e.startDate).toLocaleString());
        });
    } else {
        console.error(result.error);
    }
});
```

### Create an event

Required fields: `calendarGuid`, `title`, `startDate`, `endDate`.

```javascript
sendTo('icloud.0', 'createCalendarEvent', {
    calendarGuid: '...',                         // required — calendar GUID from getCalendars
    title:        'Dentist Appointment',          // required
    startDate:    new Date('2026-05-15T10:00').getTime(),  // required — timestamp ms
    endDate:      new Date('2026-05-15T11:00').getTime(),  // required — timestamp ms
    allDay:       false,                          // optional — default: false
    location:     'Main Street 5',                // optional
    description:  'Annual checkup',               // optional
    url:          '',                             // optional
    alarms:       [                               // optional — array of alarm definitions
        { before: true, minutes: 15, hours: 0, days: 0, weeks: 0, seconds: 0 },
    ],
}, (result) => { //{ success: true, eventGuid: guid }
    if (result.success) {
        console.log('Event created! result: ' + JSON.stringify(result));
    } else {
        console.error(result.error);
    }
});
```

### Update an event

All fields except `calendarGuid` and `eventGuid` are optional — only the provided fields are changed, everything else stays as-is.

```javascript
sendTo('icloud.0', 'updateCalendarEvent', {
    calendarGuid: '...',                         // required — calendar GUID
    eventGuid:    '...',                          // required — event GUID from getCalendarEvents
    etag:         '...',                          // optional — if omitted, fetched automatically
    title:        'Dentist (rescheduled)',         // optional — new title
    startDate:    new Date('2026-05-20T10:00').getTime(),  // optional — new start timestamp ms
    endDate:      new Date('2026-05-20T11:00').getTime(),  // optional — new end timestamp ms
    allDay:       false,                          // optional
    location:     'New Street 10',                // optional
    description:  'Moved appointment',            // optional
    alarms:       [                               // optional — replaces all existing alarms
        { before: true, minutes: 30, hours: 0, days: 0, weeks: 0, seconds: 0 },
    ],
}, (result) => {
    if (result.success) {
        console.log('Event updated!');
    } else {
        console.error(result.error);
    }
});
```

### Delete an event

Required fields: `calendarGuid`, `eventGuid`. The etag is fetched automatically if not provided.

```javascript
sendTo('icloud.0', 'deleteCalendarEvent', {
    calendarGuid: '...',    // required — calendar GUID
    eventGuid:    '...',    // required — event GUID from getCalendarEvents
    etag:         '...',    // optional — if omitted, fetched automatically
}, (result) => {
    if (result.success) {
        console.log('Event deleted!');
    } else {
        console.error(result.error);
    }
});
```

### Alarm field reference

| Field | Type | Description |
|-------|------|-------------|
| `before` | `boolean` | `true` = alarm fires before the event start. |
| `minutes` | `number` | Minutes component of the offset. |
| `hours` | `number` | Hours component of the offset. |
| `days` | `number` | Days component of the offset. |
| `weeks` | `number` | Weeks component of the offset. |
| `seconds` | `number` | Seconds component of the offset. |

> **Tip:** Use `getCalendars` to discover the `calendarGuid`, then `getCalendarEvents` to discover event GUIDs and etags.

---

## iCloud Photos — sendTo() API

You can list albums, browse photos, download files, and delete photos using `sendTo()`.

> **Note:** Enable **Photos** in the adapter settings first.

### States

| State | Type | Description |
|-------|------|-------------|
| `photos.albumCount` | `number` | Total number of albums (smart + custom). |
| `photos.photoCount` | `number` | Total number of photos in the library. |
| `photos.videoCount` | `number` | Total number of videos. |
| `photos.favoriteCount` | `number` | Number of favorite items. |
| `photos.albums` | `string` | JSON array of albums with name and photo count. |
| `photos.lastSync` | `number` | Timestamp (ms) of the last successful sync. |

### Get albums

```javascript
sendTo('icloud.0', 'photosGetAlbums', {}, (result) => {
    if (result.success) {
        // result.albums = [
        //   { name: "All Photos", photoCount: 12345 },
        //   { name: "Favorites", photoCount: 42 },
        //   { name: "Videos", photoCount: 100 },
        //   { name: "My Album", photoCount: 25 },
        // ]
        result.albums.forEach(a => {
            console.log(a.name + ': ' + a.photoCount + ' item(s)');
        });
    } else {
        console.error(result.error);
    }
});
```

### Get photos (paginated)

Returns a page of photo metadata from a given album.

```javascript
sendTo('icloud.0', 'photosGetPhotos', {
    albumName: 'All Photos',  // optional — defaults to 'All Photos'
    offset:    0,              // optional — start offset (default: 0)
    limit:     50,             // optional — max items per page (1–100, default: 50)
}, (result) => {
    if (result.success) {
        // result.photos = [
        //   {
        //     id: "AaBbCc...",
        //     filename: "IMG_1234.HEIC",
        //     size: 3456789,
        //     width: 4032,
        //     height: 3024,
        //     itemType: "image",         // "image" or "movie"
        //     isFavorite: false,
        //     isHidden: false,
        //     duration: 0,               // seconds (> 0 for videos)
        //     assetDate: 1713500000000,  // timestamp ms
        //     addedDate: 1713500100000,
        //     latitude: 52.52,           // null if no location
        //     longitude: 13.405,
        //   }, ...
        // ]
        result.photos.forEach(p => {
            console.log(p.filename + ' (' + p.itemType + ', ' + p.size + ' bytes)');
        });
    } else {
        console.error(result.error);
    }
});
```

### Download a photo

Returns the photo file content as a Base64 string.

```javascript
sendTo('icloud.0', 'photosDownload', {
    photoId: 'AaBbCc...',      // required — photo ID from photosGetPhotos
    version: 'original',       // optional — 'original', 'medium', or 'thumb' (default: 'original')
}, (result) => {
    if (result.success) {
        // result.name   = "IMG_1234.HEIC"
        // result.size   = 3456789
        // result.base64 = "/9j/4AAQ..." (Base64 encoded content)
        console.log('Downloaded: ' + result.name + ' (' + result.size + ' bytes)');
    } else {
        console.error(result.error);
    }
});
```

### Delete a photo

Moves a photo to the "Recently Deleted" album.

```javascript
sendTo('icloud.0', 'photosDelete', {
    photoId: 'AaBbCc...',  // required — photo ID
}, (result) => {
    if (result.success) {
        console.log('Photo deleted');
    } else {
        console.error(result.error);
    }
});
```

### Photo field reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique photo identifier (CloudKit record name). |
| `filename` | `string` | Original filename (e.g. `"IMG_1234.HEIC"`). |
| `size` | `number` | File size in bytes (original version). |
| `width` | `number` | Width in pixels. |
| `height` | `number` | Height in pixels. |
| `itemType` | `string` | `"image"` or `"movie"`. |
| `isFavorite` | `boolean` | Whether the item is marked as favorite. |
| `isHidden` | `boolean` | Whether the item is hidden. |
| `duration` | `number` | Duration in seconds (0 for photos, > 0 for videos). |
| `assetDate` | `number` | Creation timestamp (ms). |
| `addedDate` | `number` | Added-to-library timestamp (ms). |
| `latitude` | `number \| null` | GPS latitude (null if no location). |
| `longitude` | `number \| null` | GPS longitude (null if no location). |

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
### **WORK IN PROGRESS**
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