![Logo](admin/icloud.png)
# ioBroker.icloud

[![NPM version](https://img.shields.io/npm/v/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
[![Downloads](https://img.shields.io/npm/dm/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
![Number of Installations](https://iobroker.live/badges/icloud-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/icloud-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.icloud.png?downloads=true)](https://nodei.co/npm/iobroker.icloud/)

**Tests:** ![Test and Release](https://github.com/ticaki/ioBroker.icloud/workflows/Test%20and%20Release/badge.svg)

## icloud adapter for ioBroker

This adapter connects ioBroker to your Apple iCloud account. It reads the location of your devices via **Find My** and exposes them as ioBroker states, including GPS coordinates, battery level, and distance to configurable home points.

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


## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.2.0-alpha.0 (2026-04-17)
* (ticaki) iCloud Reminders are read and provided as data points (lists & reminders with due date, priority, and status)
* (ticaki) Added Blockly sendTo blocks for creating, updating, completing, deleting, and querying iCloud Reminders

### 0.1.0-alpha.0 (2026-04-16)
* (ticaki) initial release

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