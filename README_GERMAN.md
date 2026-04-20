![Logo](admin/icloud.png)
# ioBroker.icloud

[![NPM version](https://img.shields.io/npm/v/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
[![Downloads](https://img.shields.io/npm/dm/iobroker.icloud.svg)](https://www.npmjs.com/package/iobroker.icloud)
![Number of Installations](https://iobroker.live/badges/icloud-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/icloud-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.icloud.png?downloads=true)](https://nodei.co/npm/iobroker.icloud/)

**Tests:** ![Test and Release](https://github.com/ticaki/ioBroker.icloud/workflows/Test%20and%20Release/badge.svg)

## icloud Adapter für ioBroker

Dieser Adapter integriert dein Apple iCloud-Konto mit ioBroker. Er bietet Zugriff auf eine Vielzahl von Apple-Diensten — von Gerätestandorten und Erinnerungen über Drive-Dateien, Kontakte, Notizen, Kalendertermine bis hin zur Fotobibliothek — alles les- und (wo unterstützt) schreibbar als ioBroker-States oder per `sendTo()`.

## Unterstützte Funktionen

- [Wo ist? (Find My)](#wo-ist-find-my) — letzte bekannte Gerätestandorte, Akkustand, Entfernung zum Zuhause und Ton-Alarm
- [Erinnerungen](#erinnerungen--sendto-api) — Lesen, Erstellen, Bearbeiten, Abschließen und Löschen von iCloud-Erinnerungen per `sendTo()`; Listen und einzelne Erinnerungen werden auch als ioBroker-States unter `reminders.*` geschrieben
- [iCloud Drive](#icloud-drive--sendto-api) — Ordner durchsuchen, Dateien hoch-/herunterladen, erstellen, löschen und umbenennen per `sendTo()`
- [iCloud Drive Sync](#icloud-drive-sync) — automatische geplante Synchronisierung lokaler Verzeichnisse mit iCloud Drive; BackItUp-Integration; echte bidirektionale Synchronisierung für eigene Verzeichnisse
- [Kontakte](#kontakte--sendto-api) — Kontakte und Kontaktgruppen lesen per `sendTo()`; optional werden einzelne Kontaktfelder auch als ioBroker-States unter `contacts.*` geschrieben
- [Notizen](#notizen--states) — iCloud-Notizen als ioBroker-States (`notes.list`, `notes.textList`)
- [Kalender](#kalender--sendto-api) — anstehende Kalendertermine als ioBroker-States; Termine erstellen und löschen per `sendTo()`
- [Fotos](#icloud-fotos--sendto-api) — Alben durchsuchen, Fotos auflisten, herunterladen und löschen per `sendTo()`; Metadaten-Zähler als ioBroker-States
- [Zwei-Faktor-Authentifizierung (2FA)](#zwei-faktor-authentifizierung-2fa)

## Konfiguration

1. Öffne die Adaptereinstellungen in der ioBroker Admin-Oberfläche.
2. Gib deine **Apple ID** (E-Mail-Adresse) im Feld *Benutzername* ein.
3. Gib dein **Apple-ID-Passwort** im Feld *Passwort* ein.
4. Aktiviere oder deaktiviere **Wo ist?** und stelle das Aktualisierungsintervall ein (Minuten).
5. Optional: Füge benannte Standorte (Breitengrad/Längengrad) hinzu, um eine berechnete Entfernung für jedes Gerät zu erhalten.
6. Speichere die Einstellungen — der Adapter startet die Authentifizierung sofort.

## Zwei-Faktor-Authentifizierung (2FA)

2FA kann bei der Anmeldung erforderlich sein. Wenn Apple einen Bestätigungscode anfordert, wird der State `icloud.<instance>.mfa.required` auf `true` gesetzt.

### SMS-Code

1. Setze den State `icloud.<instance>.mfa.requestSmsCode` auf `true`.
2. Apple sendet einen 6-stelligen Code per SMS an die mit deiner Apple ID registrierte Telefonnummer.
3. Schreibe den erhaltenen Code in `icloud.<instance>.mfa.code`.
4. Der Adapter übermittelt den Code und verbindet sich. `mfa.required` wird automatisch auf `false` zurückgesetzt.

> **Hinweis:** Andere 2FA-Methoden (Push an vertrauenswürdiges Gerät etc.) werden möglicherweise von der API unterstützt, wurden aber nicht getestet.

---

## Wo ist? (Find My)

Wo ist? meldet den letzten bekannten Standort aller mit deiner Apple ID verknüpften Geräte (einschließlich Familienmitglieder, falls aktiviert) und schreibt deren GPS-Koordinaten, Akkustand und Entfernung in ioBroker-States unter `findme.<numericId>.*`.

> **Wichtig — das ist kein Echtzeit-Tracking.**
> Apples „Wo ist?"-Dienst liefert einen *Schnappschuss* der letzten Position, die das Gerät an iCloud übermittelt hat. Bis die Daten diesen Adapter erreichen, sind sie bereits mindestens eine Minute alt — und darüber hinaus hat das Gerät selbst seinen Standort möglicherweise schon länger nicht mehr aktualisiert. Das tatsächliche Alter einer Position wird im State `locationTimestamp` angezeigt; `isOld` wird auf `true` gesetzt, wenn Apple selbst die Position als veraltet betrachtet.
> Verwende „Wo ist?" um einen allgemeinen Eindruck zu bekommen, wo sich ein Gerät befindet — nicht um seine Bewegung in Echtzeit zu verfolgen.

### Geräte-States

| State | Beschreibung |
|-------|-------------|
| `name` | Gerätename wie in den Apple-Einstellungen festgelegt |
| `latitude` / `longitude` | Letzte bekannte GPS-Koordinaten |
| `batteryLevel` | Akkustand (0–100 %) |
| `batteryStatus` | Ladezustand (`Charging`, `Charged`, `NotCharging`) |
| `distanceKm` | Entfernung in km zum ersten konfigurierten Standort |
| `locationName` | Gemeindename (nur wenn **Geo-Suche** aktiviert ist) |
| `ping` | Schreibe `true`, um einen Ton auf dem Gerät abzuspielen (nur für fähige Geräte, siehe unten) |

### Geräte filtern

Geräte, die du nicht verfolgen möchtest, können in den Adaptereinstellungen unter **Wo ist? → Deaktivierte Geräte** ausgeschlossen werden. Die Admin-Oberfläche listet alle derzeit bekannten Geräte auf — markiere die zu versteckenden. Ihre ioBroker-States werden automatisch entfernt und erscheinen erst wieder, wenn sie erneut aktiviert werden.

### Entfernung zum Zuhause

Füge einen oder mehrere benannte Standorte (Breitengrad / Längengrad) in den Adaptereinstellungen unter **Wo ist? → Standorte** hinzu. Der `distanceKm`-State jedes Geräts zeigt die Luftlinienentfernung in Kilometern zum **ersten** Standort. Zusätzliche Punkte werden als extra States geschrieben (`distanceKm_1`, `distanceKm_2`, …).

### Ping — Ton abspielen

Geräte, die die Tonfunktion unterstützen, stellen einen `findme.<numericId>.ping`-State (Typ: Button) bereit. Setze ihn auf `true` aus einem Skript oder dem ioBroker-State-Panel, um das Gerät einen Ton abspielen zu lassen — nützlich, wenn du ein Gerät in der Nähe verlegt hast.

```javascript
setState('icloud.0.findme.123456.ping', true);
```

> **Hinweis:** Der `ping`-State wird nur für Geräte erstellt, deren `features.SND`-Fähigkeitsflag `true` ist.

---

## Erinnerungen — sendTo() API

Du kannst iCloud-Erinnerungen aus JavaScript- oder Blockly-Skripten per `sendTo()` lesen, erstellen, bearbeiten, abschließen und löschen.

### Feldreferenz

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `reminderId` | `string` | Eindeutige Erinnerungs-ID, z.B. `"Reminder/A1B2-..."`. Verfügbar im State `reminders.<list>.<slot>.id` und bei `getReminders` zurückgegeben. |
| `listId` | `string` | Eindeutige Listen-ID, z.B. `"List/A1B2-..."`. Von `getReminderLists` als `listId`-Feld zurückgegeben. |
| `title` | `string` | Titel der Erinnerung, z.B. `"Milch kaufen"`. |
| `description` | `string` | Notizen / Textinhalt der Erinnerung (kann leer sein). |
| `dueDate` | `number` | Fälligkeitsdatum als Unix-Zeitstempel in **Millisekunden** (gleiches Format wie `Date.now()`). `null` = kein Fälligkeitsdatum. |
| `priority` | `number` | Prioritätsstufe: `0` = keine, `1` = hoch, `5` = mittel, `9` = niedrig. Entspricht den Prioritätsstufen in der Erinnerungen-App. |
| `flagged` | `boolean` | `true` = Erinnerung ist markiert (mit einer orangefarbenen Flagge in der App angezeigt — nützlich für einen schnellen Überblick über wichtige Einträge). |
| `allDay` | `boolean` | `true` = Ganztages-Erinnerung (keine bestimmte Uhrzeit, nur ein Datum). In diesem Fall wird die Uhrzeitkomponente von `dueDate` von Apple ignoriert. |
| `completed` | `boolean` | `true` = Erinnerung ist als erledigt markiert. |

> **Hinweis zu Wiederholungsregeln:** Das Setzen von Wiederholungsregeln (täglich, wöchentlich etc.) wird von dieser API nicht unterstützt, da Apple sie als separates CloudKit-Objekt (RecurrenceRule) speichert. Bestehende Wiederholungsregeln einer Erinnerung bleiben beim Bearbeiten erhalten.

---

### Schritt 1 — Erinnerungslisten abrufen

Du benötigst die `listId` der Zielliste, bevor du eine Erinnerung erstellen kannst.

```javascript
sendTo('icloud.0', 'getReminderLists', {}, (result) => {
    if (result.success) {
        // result.lists = [
        //   { listId: "List/A1B2-...", title: "Einkaufen", color: "#FF0000", count: 3 },
        //   { listId: "List/C3D4-...", title: "Arbeit",    color: "#0000FF", count: 1 },
        // ]
        result.lists.forEach(list => {
            console.log(list.title + ' -> listId: ' + list.listId);
        });
    } else {
        console.error(result.error);
    }
});
```

### Schritt 2 — Erinnerungen abrufen

```javascript
// Alle Erinnerungen aller Listen:
sendTo('icloud.0', 'getReminders', {}, (result) => {
    if (result.success) {
        result.reminders.forEach(r => {
            const due = r.dueDate ? new Date(r.dueDate).toLocaleString() : 'kein Datum';
            console.log(r.title + ' (fällig: ' + due + ')');
        });
    }
});

// Nur Erinnerungen einer bestimmten Liste (listId aus getReminderLists):
sendTo('icloud.0', 'getReminders', { listId: 'List/A1B2-...' }, (result) => {
    if (result.success) {
        console.log(result.reminders.length + ' Erinnerung(en) in dieser Liste');
    }
});
```

### Erinnerung erstellen

Pflichtfelder: `listId`, `title`. Alle anderen Felder sind optional.

```javascript
sendTo('icloud.0', 'createReminder', {
    listId: 'List/A1B2-...',         // Pflicht -- von getReminderLists
    title:  'Milch kaufen',          // Pflicht -- Titel der Erinnerung

    description: 'Bio-Vollmilch',    // optional -- Notizen/Textinhalt
    dueDate: Date.now() + 86400000,  // optional -- morgen um diese Zeit (ms-Zeitstempel)
    allDay:  false,                  // optional -- true = nur Datum, keine Uhrzeit
    priority: 1,                     // optional -- 0=keine  1=hoch  5=mittel  9=niedrig
    flagged:  false,                 // optional -- true = mit orangefarbener Flagge markieren
    completed: false,                // optional -- true = bereits als erledigt erstellen
}, (result) => {
    if (result.success) {
        console.log('Erstellt mit ID: ' + result.reminder.id);
    } else {
        console.error(result.error);
    }
});
```

### Erinnerung als erledigt markieren

Pflichtfeld: `reminderId`.

```javascript
// Als erledigt markieren:
sendTo('icloud.0', 'completeReminder', {
    reminderId: 'Reminder/A1B2-...',  // Pflicht -- Erinnerungs-ID
    completed:  true,                 // optional -- Standard: true; false = wieder öffnen
}, (result) => {
    if (result.success) {
        console.log('Erledigt!');
    } else {
        console.error(result.error);
    }
});

// Eine erledigte Erinnerung wieder öffnen:
sendTo('icloud.0', 'completeReminder', {
    reminderId: 'Reminder/A1B2-...',
    completed:  false,
}, (result) => { /* ... */ });
```

### Erinnerung bearbeiten

Pflichtfeld: `reminderId`. Nur die angegebenen Felder werden geändert — alle anderen bleiben unberührt.

```javascript
sendTo('icloud.0', 'updateReminder', {
    reminderId:  'Reminder/A1B2-...', // Pflicht -- Erinnerungs-ID

    title:       'Hafermilch kaufen',  // optional -- neuer Titel
    description: 'Bio',               // optional -- neuer Notiztext
    dueDate:     Date.now() + 172800000, // optional -- neues Fälligkeitsdatum (ms)
    allDay:      false,               // optional
    priority:    5,                   // optional -- 0/1/5/9
    flagged:     true,                // optional
    completed:   false,               // optional
}, (result) => {
    if (result.success) {
        console.log('Aktualisiert: ' + result.reminder.title);
    } else {
        console.error(result.error);
    }
});
```

### Erinnerung löschen

Pflichtfeld: `reminderId`.

```javascript
sendTo('icloud.0', 'deleteReminder', {
    reminderId: 'Reminder/A1B2-...',  // Pflicht -- Erinnerungs-ID
}, (result) => {
    if (result.success) {
        console.log('Gelöscht!');
    } else {
        console.error(result.error);
    }
});
```

> **Tipp:** Die `reminderId` ist im State `reminders.<list>.<slot>.id` oder im `id`-Feld, das von `getReminders` zurückgegeben wird, verfügbar.

---

## iCloud Drive — sendTo() API

Du kannst Ordner auflisten, Dateien hoch-/herunterladen, Ordner erstellen, Elemente löschen und umbenennen in iCloud Drive per `sendTo()`.

> **Hinweis:** Aktiviere zuerst "iCloud Drive" in den Adaptereinstellungen. Dateiinhalte werden als **Base64**-Strings übertragen.

### Feldreferenz

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `path` | `string` | Schrägstrich-getrennter Pfad relativ zum Drive-Stammverzeichnis, z.B. `"Documents/Photos/cat.jpg"`. |
| `folderId` | `string` | Die `drivewsid` eines Ordners (von `driveListFolder` zurückgegeben). Alternative zu `path`. |
| `fileId` | `string` | Die `drivewsid` einer Datei (von `driveListFolder` zurückgegeben). Alternative zu `path`. |
| `itemId` | `string` | Die `drivewsid` eines beliebigen Elements (Datei oder Ordner) für `driveGetMetadata`. Alternative zu `path`. |
| `fileName` | `string` | Name für die hochzuladende Datei, z.B. `"photo.jpg"`. |
| `base64` | `string` | Dateiinhalt als Base64-kodierter String. |
| `contentType` | `string` | MIME-Typ, z.B. `"image/jpeg"`. Optional — Standard ist `"application/octet-stream"`. |
| `folderPath` | `string` | Schrägstrich-getrennter Pfad zum Zielordner für Uploads. Optional — Standard ist das Stammverzeichnis. |
| `parentPath` | `string` | Schrägstrich-getrennter Pfad zum übergeordneten Ordner für `driveCreateFolder`. Optional — Standard ist das Stammverzeichnis. |
| `parentId` | `string` | Die `drivewsid` des übergeordneten Ordners. Alternative zu `parentPath`. |
| `name` | `string` | Name für einen neuen Ordner. |
| `newName` | `string` | Neuer Name zum Umbenennen eines Elements. |
| `drivewsid` | `string` | Drive-Element-ID für Lösch-/Umbenennungsoperationen. |
| `etag` | `string` | ETag des Elements (zusammen mit `drivewsid` für Löschen/Umbenennen erforderlich). |

---

### Ordner auflisten

```javascript
// Stammverzeichnis auflisten:
sendTo('icloud.0', 'driveListFolder', {}, (result) => {
    if (result.success) {
        result.items.forEach(item => {
            console.log(item.name + ' (' + item.type + ', ' + item.size + ' Bytes)');
        });
    } else {
        console.error(result.error);
    }
});

// Einen Unterordner per Pfad auflisten:
sendTo('icloud.0', 'driveListFolder', { path: 'Documents/Photos' }, (result) => {
    if (result.success) {
        console.log(result.items.length + ' Element(e) in Documents/Photos');
    } else {
        console.error(result.error);
    }
});
```

### Metadaten einer Datei oder eines Ordners

Gibt alle verfügbaren Metadaten zurück, ohne den Dateiinhalt herunterzuladen.

```javascript
sendTo('icloud.0', 'driveGetMetadata', {
    path: 'Documents/photo.jpg',  // Pfad oder itemId (drivewsid)
}, (result) => {
    if (result.success) {
        const item = result.item;
        console.log(item.name + ': ' + item.size + ' Bytes, geändert ' + new Date(item.dateModified).toLocaleString());
    } else {
        console.error(result.error);
    }
});
```

### Datei herunterladen

Gibt den Dateiinhalt als Base64-String zurück. Ideal für Bilder.

```javascript
sendTo('icloud.0', 'driveGetFile', {
    path: 'Documents/photo.jpg',       // Pfad oder fileId (drivewsid)
}, (result) => {
    if (result.success) {
        console.log('Heruntergeladen: ' + result.name + ' (' + result.size + ' Bytes)');
    } else {
        console.error(result.error);
    }
});
```

### Datei hochladen

Pflichtfelder: `fileName`, `base64`. Optional `folderPath` oder `folderId` angeben.

```javascript
sendTo('icloud.0', 'driveUploadFile', {
    fileName:    'screenshot.png',       // Pflicht — Dateiname
    base64:      '/9j/4AAQSkZJRg...',    // Pflicht — Base64-kodierter Inhalt
    contentType: 'image/png',            // optional — MIME-Typ
    folderPath:  'Documents/Photos',     // optional — Zielordner-Pfad (Standard: Stammverzeichnis)
}, (result) => {
    if (result.success) {
        console.log('Upload erfolgreich!');
    } else {
        console.error(result.error);
    }
});
```

### Ordner erstellen

Pflichtfeld: `name`. Optional `parentPath` oder `parentId` angeben.

```javascript
sendTo('icloud.0', 'driveCreateFolder', {
    name:       'Backups',               // Pflicht — Ordnername
    parentPath: 'Documents',             // optional — übergeordneter Ordner (Standard: Stammverzeichnis)
}, (result) => {
    if (result.success) {
        console.log('Ordner erstellt!');
    } else {
        console.error(result.error);
    }
});
```

### Element löschen

Löschen per Pfad oder per `drivewsid` + `etag`.

```javascript
// Per Pfad löschen:
sendTo('icloud.0', 'driveDeleteItem', {
    path: 'Documents/alte-datei.txt',
}, (result) => {
    if (result.success) {
        console.log('Gelöscht!');
    } else {
        console.error(result.error);
    }
});
```

### Element umbenennen

Pflichtfeld: `newName`. Element identifizieren per Pfad oder per `drivewsid` + `etag`.

```javascript
sendTo('icloud.0', 'driveRenameItem', {
    path:    'Documents/alter-name.txt',  // Pfad oder drivewsid + etag
    newName: 'neuer-name.txt',            // Pflicht — neuer Name
}, (result) => {
    if (result.success) {
        console.log('Umbenannt!');
    } else {
        console.error(result.error);
    }
});
```

> **Tipp:** Verwende `driveListFolder` um Datei-/Ordner-IDs und etags zu ermitteln. Die `drivewsid` und `etag` werden für jedes Element zurückgegeben.

---

## iCloud Drive Sync

Die Drive Sync-Funktion hält lokale Verzeichnisse automatisch nach einem konfigurierbaren Zeitplan mit iCloud Drive synchron. Sie bietet zwei Modi je nach Sync-Eintragstyp:

| Modus | Verwendung | Lokale Dateien betroffen? |
|-------|-----------|--------------------------|
| **Nur-Upload** | BackItUp-Einträge | **Nie** — lokale Backup-Dateien sind schreibgeschützt |
| **Bidirektional** | Verzeichnis-Einträge | Ja — neue Remote-Dateien werden heruntergeladen; entfernt gelöschte Dateien werden lokal entfernt |

> **Hinweis:** Aktiviere zuerst **iCloud Drive** im Einstellungen-Tab. Der **Drive Sync**-Tab erscheint erst, wenn iCloud Drive aktiviert ist.

> **Hinweis:** Die erste Synchronisierung läuft **30 Sekunden** nach dem Adapterstart. Folgende Syncs folgen dem konfigurierten Intervall.

### Drive Sync einrichten (Schritt für Schritt)

1. **Adaptereinstellungen öffnen** und zum **Einstellungen**-Tab wechseln.
2. **iCloud Drive aktivieren** ("iCloud Drive aktivieren" ankreuzen).
3. Ein neuer Tab **Drive Sync** erscheint — darauf klicken.
4. **Drive Sync aktivieren** und das Sync-Intervall einstellen (Standard: 60 Minuten).
5. Klicke auf **BackItUp-Sync hinzufügen** oder **Verzeichnis-Sync hinzufügen** um einen Sync-Eintrag zu erstellen.

### BackItUp-Integration — nur Upload

Wenn du den [BackItUp](https://github.com/simatec/ioBroker.backitup)-Adapter verwendest um Backups zu erstellen, kann die Drive Sync-Funktion diese Backup-Dateien automatisch erkennen und in iCloud Drive hochladen.

> **Lokale Dateien werden im Backup-Modus nie verändert oder gelöscht.** Der Adapter liest lokale Dateien nur und lädt sie hoch.

**Voraussetzungen:**

- Der **BackItUp**-Adapter muss installiert sein (jede Instanz, z.B. `backitup.0`).
- In den BackItUp-Einstellungen muss **CIFS/NAS-Backup** aktiviert sein.
- Der CIFS-**Verbindungstyp** muss auf **"Copy"** gesetzt sein (nicht "CIFS mount").

**Instanz-Erkennung:**

Der Adapter sucht nach allen installierten BackItUp-Instanzen und filtert diejenigen, die die Voraussetzungen erfüllen (CIFS aktiviert mit Verbindungstyp "Copy").

- **Eine passende Instanz:** Der Drive Sync-Tab zeigt eine Erfolgsmeldung an, welche Instanz verwendet wird (z.B. "Verwende BackItUp-Instanz: backitup.0"). Der Backup-Pfad wird automatisch gelesen.
- **Mehrere passende Instanzen:** Ein Dropdown erscheint im Drive Sync-Tab um die gewünschte BackItUp-Instanz auszuwählen. Jeder Eintrag zeigt den Instanznamen und Backup-Pfad.
- **Keine passende Instanz:** Eine Warnung wird angezeigt, dass keine BackItUp-Instanz mit passender CIFS-Konfiguration gefunden wurde.

**Einen BackItUp-Sync-Eintrag hinzufügen:**

1. Falls mehrere BackItUp-Instanzen gefunden wurden, **wähle zuerst die gewünschte Instanz** aus dem Dropdown.
2. Klicke im Drive Sync-Tab auf **"BackItUp-Sync hinzufügen"** (nur sichtbar, wenn mindestens eine Instanz die Voraussetzungen erfüllt).
3. Der **lokale Pfad** wird automatisch von der ausgewählten BackItUp-Instanz übernommen — du kannst ihn nicht ändern.
4. Klicke auf **Durchsuchen** neben "iCloud Drive-Ordner" um den Ordner-Browser zu öffnen.
   - Navigiere durch Ordner, indem du sie anklickst.
   - Erstelle einen neuen Ordner mit dem **"Neuer Ordner"**-Button — der Browser navigiert automatisch hinein.
   - Klicke auf **"Diesen Ordner auswählen"** um zu bestätigen.
5. Optional **Backup-Limits** setzen:
   - **Max. Dateien**: Maximale Anzahl der Backup-Dateien in iCloud Drive (älteste werden zuerst gelöscht). `0` = unbegrenzt.
   - **Max. Größe (MB)**: Maximale Gesamtgröße der Backup-Dateien in MB. `0` = unbegrenzt.
6. Wähle eine **Konfliktlösungsstrategie** und klicke auf **Speichern**.

### Eigenes Verzeichnis-Sync — bidirektional

Eigene Verzeichniseinträge führen eine **echte Zwei-Wege-Synchronisierung** zwischen einem lokalen Verzeichnis und einem iCloud Drive-Ordner durch:

- **Neue lokale Datei** → wird in iCloud Drive hochgeladen.
- **Neue Remote-Datei** → wird in das lokale Verzeichnis heruntergeladen.
- **Datei lokal gelöscht** → wird beim nächsten Sync aus iCloud Drive gelöscht.
- **Datei in iCloud Drive gelöscht** → wird aus dem lokalen Verzeichnis gelöscht.
- **Datei auf einer Seite geändert** → die neuere Version gewinnt (60-Sekunden-Toleranz). Falls beide Seiten geändert wurden, greift die konfigurierte Konfliktlösung.

> Die erste Synchronisierung wird als initiale Basislinie behandelt — es werden keine Löschungen durchgeführt, bis eine zweite Synchronisierung gelaufen ist.

**Einen Verzeichnis-Sync-Eintrag hinzufügen:**

1. Klicke auf **"Verzeichnis-Sync hinzufügen"**.
2. Gib den vollständigen **lokalen Pfad** ein (z.B. `/opt/iobroker/exports`).
3. Wähle oder erstelle den **iCloud Drive-Ordner** mit dem Durchsuchen-Button.
4. Wähle eine **Konfliktlösungsstrategie**.
5. Klicke auf **Speichern**.

### Ordner-Browser

Der Ordner-Browser lässt dich iCloud Drive durchsuchen und einen Zielordner auswählen:

- Klicke auf einen Ordner um hineinzunavigieren. Eine Breadcrumb-Leiste zeigt den aktuellen Pfad.
- Klicke auf **"Neuer Ordner"** um einen Unterordner zu erstellen — der Browser navigiert sofort hinein, damit du die Auswahl bestätigen kannst.
- Klicke auf **"Diesen Ordner auswählen"** um den aktuell angezeigten Ordner zu verwenden.

### Konfliktlösung

Greift wenn eine Datei auf **beiden Seiten mit unterschiedlichem Inhalt** existiert und die neuere Seite nicht bestimmt werden kann.

| Strategie | Verhalten |
|-----------|----------|
| **Frag mich (Sync pausieren)** | Datei wird übersprungen; eine Konfliktbenachrichtigung erscheint in der Admin-Oberfläche. Öffne den Drive Sync-Tab um sie manuell zu lösen. |
| **Immer lokale Version hochladen** | Lokale Datei überschreibt die Remote-Version. |
| **Konfliktierende Dateien überspringen** | Datei wird stillschweigend übersprungen — keine Seite wird geändert. |
| **Beide Versionen behalten** | Lokale Datei wird mit einem zeitgestempelten Namen hochgeladen (z.B. `datei_local_1713500000000.txt`), beide Versionen bleiben erhalten. |

#### Konflikte manuell lösen

Der Drive Sync-Tab zeigt ein **Fehler-Banner** mit den konfliktiierenden Dateien. Klicke auf einen Dateinamen um den Lösungsdialog zu öffnen, der beide Versionen nebeneinander zeigt (Änderungsdatum und Größe). Optionen:

- **Lokale Version hochladen** — überschreibt die Remote-Datei.
- **Beide behalten** — lädt die lokale Datei mit einem umbenannten Dateinamen hoch.
- **Überspringen** — ignoriert diesen Konflikt bis sich die Datei wieder ändert.

### Sync-Metadaten

Der Sync-Status (letzte Sync-Zeit, synchronisierte Dateien, Gesamtgröße, Fehler, Konflikte und die Liste bekannter Dateien für die Löschungsverfolgung) wird in der `native.syncMeta`-Eigenschaft des `drive`-Objekts als JSON-String gespeichert. Dies vermeidet ioBrokers Deep-Merge-Verhalten für Objekt-Natives.

---

## Kontakte — sendTo() API

Du kannst Kontakte und Kontaktgruppen aus iCloud-Kontakten per `sendTo()` lesen.

> **Hinweis:** Aktiviere zuerst **Kontakte** in den Adaptereinstellungen.

### Kontaktgruppen abrufen

```javascript
sendTo('icloud.0', 'getContactGroups', {}, (result) => {
    if (result.success) {
        result.groups.forEach(g => {
            console.log(g.name + ' (' + g.contactCount + ' Kontakt(e))');
        });
    } else {
        console.error(result.error);
    }
});
```

### Kontakte abrufen

```javascript
// Alle Kontakte:
sendTo('icloud.0', 'getContacts', {}, (result) => {
    if (result.success) {
        result.contacts.forEach(c => {
            const phone = c.phones[0] ? c.phones[0].field : 'kein Telefon';
            console.log(c.fullName + ' — ' + phone);
        });
    } else {
        console.error(result.error);
    }
});

// Einzelner Kontakt per contactId:
sendTo('icloud.0', 'getContacts', { contactId: 'abc123-...' }, (result) => {
    if (result.success && result.contacts.length) {
        const c = result.contacts[0];
        console.log(c.fullName + ', ' + c.city);
    }
});

// Alle Kontakte in einer bestimmten Gruppe (Name aus getContactGroups):
sendTo('icloud.0', 'getContacts', { groupName: 'Familie' }, (result) => {
    if (result.success) {
        console.log(result.contacts.length + ' Kontakt(e) in Familie');
    }
});
```

### Kontakt-Feldreferenz

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `contactId` | `string` | Stabile eindeutige Kennung des Kontakts. |
| `firstName` / `lastName` | `string` | Vor- und Nachname. |
| `fullName` | `string` | Zusammengesetzter vollständiger Name (einschließlich Präfix, zweiter Vorname, Suffix). |
| `companyName` | `string` | Firmen-/Organisationsname. |
| `phones` | `Array<{label, field}>` | Telefonnummern mit Bezeichnung (z.B. `"mobile"`, `"home"`). |
| `emails` | `Array<{label, field}>` | E-Mail-Adressen mit Bezeichnung. |
| `streetAddresses` | `Array<{label, street, city, state, postalCode, country, countryCode}>` | Postadressen. |
| `city` | `string` | Stadt aus der ersten Adresse. |
| `birthday` | `string` | Geburtstag als ISO-Datumsstring (z.B. `"1990-01-15"`). |
| `nickname` | `string` | Spitzname. |
| `jobTitle` | `string` | Berufsbezeichnung. |
| `department` | `string` | Abteilung im Unternehmen. |
| `notes` | `string` | Freitext-Notizen. |
| `groups` | `string[]` | Namen der Gruppen, denen dieser Kontakt angehört. |
| `isMe` | `boolean` | `true` wenn dies die "Ich"-Karte ist (der Kontoinhaber). |
| `raw` | `object` | Vollständiges Roh-JSON von iCloud für fortgeschrittene Nutzung. |

---

## Notizen — States

iCloud-Notizen sind schreibgeschützt und werden als JSON-States für die Verwendung in Visualisierungen bereitgestellt.

> **Hinweis:** Aktiviere zuerst **Notizen** in den Adaptereinstellungen.

### States

| State | Typ | Beschreibung |
|-------|-----|-------------|
| `notes.count` | `number` | Gesamtanzahl der (nicht gelöschten) Notizen. |
| `notes.folderCount` | `number` | Anzahl der Ordner. |
| `notes.lastSync` | `number` | Zeitstempel (ms) der letzten erfolgreichen Synchronisierung. |
| `notes.list` | `string` | JSON-Array aller Notizen mit Metadaten und Text (siehe unten). |
| `notes.textList` | `string` | JSON-Array reiner Notiztexte (`string[]`) — nur nicht gesperrte Notizen, sortiert nach neuesten zuerst. |

### `notes.list`-Format

```json
[
    {
        "id": "RecordName-...",
        "title": "Einkaufsliste",
        "snippet": "Milch, Eier, Brot...",
        "folderId": "FolderRecordName-...",
        "folderName": "Persönlich",
        "modifiedDate": 1745000000000,
        "isLocked": false,
        "text": "Milch\nEier\nBrot\nButter"
    }
]
```

Notizen sind nach Änderungsdatum sortiert (neueste zuerst). Passwortgeschützte Notizen haben `isLocked: true` und `text: null`.

### `notes.textList`-Format

```json
[
    "Milch\nEier\nBrot\nButter",
    "772*16 *20",
    "300x200"
]
```

Ein flaches Array reiner Textstrings — ein Eintrag pro Notiz. Enthält nur nicht gesperrte Notizen mit lesbarem Text, sortiert nach neuesten zuerst.

> **Einschränkung:** Notizen sind schreibgeschützt. Apples Notes-API unterstützt das Erstellen oder Bearbeiten von Notizen über den Webdienst nicht.

---

## Kalender — sendTo() API

Du kannst Kalender auflisten, Termine durchsuchen, neue Termine erstellen und Termine löschen per `sendTo()`.

> **Hinweis:** Aktiviere zuerst **Kalender** in den Adaptereinstellungen.

### States

| State | Typ | Schreibbar | Beschreibung |
|-------|-----|:----------:|---------------|
| `calendar.lastSync` | `number` | | Zeitstempel (ms) der letzten erfolgreichen Synchronisierung. |
| `calendar.<name>.guid` | `string` | | Kalender-GUID. |
| `calendar.<name>.color` | `string` | | Kalenderfarbe. |
| `calendar.<name>.enabled` | `boolean` | | Ob der Kalender aktiviert ist. |
| `calendar.<name>.readOnly` | `boolean` | | Ob der Kalender schreibgeschützt ist. |
| `calendar.<name>.<slot>.title` | `string` | ✓ | Terminbezeichnung. |
| `calendar.<name>.<slot>.startDate` | `number` | ✓ | Startzeit des Termins (ms). |
| `calendar.<name>.<slot>.endDate` | `number` | ✓ | Endzeit des Termins (ms). |
| `calendar.<name>.<slot>.allDay` | `boolean` | ✓ | Ob es ein Ganztagestermin ist. |
| `calendar.<name>.<slot>.location` | `string` | ✓ | Ort des Termins. |
| `calendar.<name>.<slot>.description` | `string` | ✓ | Beschreibung / Notizen des Termins. |
| `calendar.<name>.<slot>.url` | `string` | ✓ | URL des Termins. |
| `calendar.<name>.<slot>.alarms` | `string` | ✓ | Erinnerungen als JSON-Array mit `{before, hours, minutes, days, weeks, seconds}`. |
| `calendar.<name>.<slot>.duration` | `number` | | Dauer in Minuten (berechnet aus Start/Ende). |
| `calendar.<name>.<slot>.json` | `string` | ✓ | Alle editierbaren Felder als einzelnes JSON-Objekt. |

Anstehende Termine werden automatisch im konfigurierten Aktualisierungsintervall synchronisiert.

### Termine über States bearbeiten

Alle mit **✓** markierten Event-States sind beschreibbar. Schreibe einen neuen Wert (ohne ack) in einen davon.

**Debounce-Regeln:**
- **Einzelne Felder** (`title`, `startDate`, `endDate`, …): Schreibzugriffe auf denselben Termins-Slot werden **5 Sekunden** lang gesammelt. Kommt innerhalb des Fensters kein weiterer Schreibzugriff auf diesen Slot, wird ein einzelner API-Aufruf an iCloud gesendet.
- **`json`-State**: wird nahezu sofort ausgeführt (100 ms Verzögerung). Verwende diesen State, wenn mehrere Felder atomar geändert werden sollen.
- **Ein Resync nach allen Updates**: Ein Kalender-Refresh wird erst ausgelöst, wenn *alle* Slots aktualisiert wurden und keine weiteren Schreibzugriffe mehr ausstehen. Ändert ein Skript Slot A, 3 Sekunden später Slot B und 2 Sekunden danach Slot C, wird einmalig nach dem Abschluss von C ein Refresh ausgelöst.
- States werden erst nach erfolgreichem API-Aufruf bestätigt (`ack`).

#### Einzelne Felder

```javascript
// Titel des ersten Termins im Kalender "Home" ändern
setState('icloud.0.calendar.Home.000001.title', 'Teammeeting (geändert)', false);

// Start- und Endzeit um eine Stunde nach vorne verschieben
const start = getState('icloud.0.calendar.Home.000001.startDate').val;
const end   = getState('icloud.0.calendar.Home.000001.endDate').val;
setState('icloud.0.calendar.Home.000001.startDate', start + 3600000, false);
setState('icloud.0.calendar.Home.000001.endDate',   end   + 3600000, false);
```

#### Über den json-State (mehrere Felder auf einmal ändern)

```javascript
setState('icloud.0.calendar.Home.000001.json', JSON.stringify({
    title:       'Teammeeting (geändert)',
    startDate:   new Date('2026-05-10T10:00:00').getTime(),
    endDate:     new Date('2026-05-10T11:00:00').getTime(),
    allDay:      false,
    location:    'Konferenzraum 3',
    description: 'Sprint-Review',
    url:         '',
    alarms:      [{ before: true, hours: 0, minutes: 15, days: 0, weeks: 0, seconds: 0 }],
}), false);
```

Schreibzugriffe auf einzelne Felder innerhalb des 5-Sekunden-Fensters werden zu einem API-Aufruf pro Slot zusammengefasst.
Schreibzugriffe über `json` werden sofort gesendet und überschreiben gleichzeitige Einzelfeldänderungen.
Werden `json` und einzelne Felder gleichzeitig beschrieben, haben die Einzelfelder Vorrang.

### Kalender abrufen

```javascript
sendTo('icloud.0', 'getCalendars', {}, (result) => {
    if (result.success) {
        result.calendars.forEach(c => {
            console.log(c.title + ' (GUID: ' + c.guid + ')');
        });
    } else {
        console.error(result.error);
    }
});
```

### Termine abrufen

Gibt Termine für einen Zeitraum zurück. Standard ist der aktuelle Monat.

```javascript
sendTo('icloud.0', 'getCalendarEvents', {
    from: Date.now(),                         // optional — Startzeitstempel (Standard: Monatsanfang)
    to:   Date.now() + 7 * 24 * 60 * 60000,  // optional — Endzeitstempel (Standard: Monatsende)
    calendarGuid: '...',                      // optional — nach Kalender-GUID filtern
}, (result) => {
    if (result.success) {
        result.events.forEach(e => {
            console.log(e.title + ' — ' + new Date(e.startDate).toLocaleString());
        });
    } else {
        console.error(result.error);
    }
});
```

### Termin erstellen

Pflichtfelder: `calendarGuid`, `title`, `startDate`, `endDate`.

Der Callback erhält `{ success: true, eventGuid: "..." }` — die `eventGuid` kann gespeichert und später zum Aktualisieren oder Löschen des Termins verwendet werden.

```javascript
sendTo('icloud.0', 'createCalendarEvent', {
    calendarGuid: '...',                         // Pflicht — Kalender-GUID von getCalendars
    title:        'Zahnarzttermin',               // Pflicht
    startDate:    new Date('2026-05-15T10:00').getTime(),  // Pflicht — Zeitstempel ms
    endDate:      new Date('2026-05-15T11:00').getTime(),  // Pflicht — Zeitstempel ms
    allDay:       false,                          // optional — Standard: false
    location:     'Hauptstraße 5',                // optional
    description:  'Jahreskontrolle',              // optional
    alarms:       [                               // optional — Array von Alarm-Definitionen
        { before: true, minutes: 15, hours: 0, days: 0, weeks: 0, seconds: 0 },
    ],
}, (result) => {
    if (result.success) {
        console.log('Termin erstellt! GUID: ' + result.eventGuid);
    } else {
        console.error(result.error);
    }
});
```

### Termin aktualisieren

Alle Felder außer `calendarGuid` und `eventGuid` sind optional — nur die angegebenen Felder werden geändert, alles andere bleibt wie es ist.

```javascript
sendTo('icloud.0', 'updateCalendarEvent', {
    calendarGuid: '...',                         // Pflicht — Kalender-GUID
    eventGuid:    '...',                          // Pflicht — Termin-GUID von getCalendarEvents
    title:        'Zahnarzt (verschoben)',         // optional — neuer Titel
    startDate:    new Date('2026-05-20T10:00').getTime(),  // optional
    endDate:      new Date('2026-05-20T11:00').getTime(),  // optional
}, (result) => {
    if (result.success) {
        console.log('Termin aktualisiert!');
    } else {
        console.error(result.error);
    }
});
```

### Termin löschen

Pflichtfelder: `calendarGuid`, `eventGuid`. Das ETag wird automatisch abgerufen, wenn es nicht angegeben wird.

```javascript
sendTo('icloud.0', 'deleteCalendarEvent', {
    calendarGuid: '...',    // Pflicht — Kalender-GUID
    eventGuid:    '...',    // Pflicht — Termin-GUID von getCalendarEvents
    etag:         '...',    // optional — wird automatisch abgerufen wenn nicht angegeben
}, (result) => {
    if (result.success) {
        console.log('Termin gelöscht!');
    } else {
        console.error(result.error);
    }
});
```

### Alarm-Feldreferenz

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `before` | `boolean` | `true` = Alarm wird vor dem Terminstart ausgelöst. |
| `minutes` | `number` | Minuten-Komponente des Zeitversatzes. |
| `hours` | `number` | Stunden-Komponente des Zeitversatzes. |
| `days` | `number` | Tage-Komponente des Zeitversatzes. |
| `weeks` | `number` | Wochen-Komponente des Zeitversatzes. |
| `seconds` | `number` | Sekunden-Komponente des Zeitversatzes. |

> **Tipp:** Verwende `getCalendars` um die `calendarGuid` zu ermitteln, dann `getCalendarEvents` um Termin-GUIDs und ETags zu erhalten.

---

## iCloud Fotos — sendTo() API

Du kannst Alben auflisten, Fotos durchsuchen, Dateien herunterladen und Fotos löschen per `sendTo()`.

> **Hinweis:** Aktiviere zuerst **Fotos** in den Adaptereinstellungen.

### States

| State | Typ | Beschreibung |
|-------|-----|-------------|
| `photos.albumCount` | `number` | Gesamtanzahl der Alben (Smart + benutzerdefiniert). |
| `photos.photoCount` | `number` | Gesamtanzahl der Fotos in der Bibliothek. |
| `photos.videoCount` | `number` | Gesamtanzahl der Videos. |
| `photos.favoriteCount` | `number` | Anzahl der Favoriten. |
| `photos.albums` | `string` | JSON-Array der Alben mit Name und Fotoanzahl. |
| `photos.lastSync` | `number` | Zeitstempel (ms) der letzten erfolgreichen Synchronisierung. |

### Alben abrufen

```javascript
sendTo('icloud.0', 'photosGetAlbums', {}, (result) => {
    if (result.success) {
        result.albums.forEach(a => {
            console.log(a.name + ': ' + a.photoCount + ' Element(e)');
        });
    } else {
        console.error(result.error);
    }
});
```

### Fotos abrufen (paginiert)

Gibt eine Seite von Foto-Metadaten aus einem bestimmten Album zurück.

```javascript
sendTo('icloud.0', 'photosGetPhotos', {
    albumName: 'All Photos',  // optional — Standard: 'All Photos'
    offset:    0,              // optional — Startoffset (Standard: 0)
    limit:     50,             // optional — Max. Einträge pro Seite (1–100, Standard: 50)
}, (result) => {
    if (result.success) {
        result.photos.forEach(p => {
            console.log(p.filename + ' (' + p.itemType + ', ' + p.size + ' Bytes)');
        });
    } else {
        console.error(result.error);
    }
});
```

### Foto herunterladen

Gibt den Fotoinhalt als Base64-String zurück.

```javascript
sendTo('icloud.0', 'photosDownload', {
    photoId: 'AaBbCc...',      // Pflicht — Foto-ID von photosGetPhotos
    version: 'original',       // optional — 'original', 'medium', oder 'thumb' (Standard: 'original')
}, (result) => {
    if (result.success) {
        console.log('Heruntergeladen: ' + result.name + ' (' + result.size + ' Bytes)');
    } else {
        console.error(result.error);
    }
});
```

### Foto löschen

Verschiebt ein Foto in das Album „Zuletzt gelöscht".

```javascript
sendTo('icloud.0', 'photosDelete', {
    photoId: 'AaBbCc...',  // Pflicht — Foto-ID
}, (result) => {
    if (result.success) {
        console.log('Foto gelöscht');
    } else {
        console.error(result.error);
    }
});
```

### Foto-Feldreferenz

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | `string` | Eindeutiger Foto-Bezeichner (CloudKit-Recordname). |
| `filename` | `string` | Originaler Dateiname (z.B. `"IMG_1234.HEIC"`). |
| `size` | `number` | Dateigröße in Bytes (Originalversion). |
| `width` | `number` | Breite in Pixeln. |
| `height` | `number` | Höhe in Pixeln. |
| `itemType` | `string` | `"image"` oder `"movie"`. |
| `isFavorite` | `boolean` | Ob das Element als Favorit markiert ist. |
| `isHidden` | `boolean` | Ob das Element versteckt ist. |
| `duration` | `number` | Dauer in Sekunden (0 für Fotos, > 0 für Videos). |
| `assetDate` | `number` | Erstellungszeitstempel (ms). |
| `addedDate` | `number` | Zeitstempel des Hinzufügens zur Bibliothek (ms). |
| `latitude` | `number \| null` | GPS-Breitengrad (null wenn kein Standort). |
| `longitude` | `number \| null` | GPS-Längengrad (null wenn kein Standort). |

---

## Credits

Dieser Adapter wäre ohne die folgenden Open-Source-Projekte nicht möglich gewesen:

- **[icloud.js](https://github.com/foxt/icloud.js)** von foxt — die originale JavaScript iCloud-Client-Bibliothek, von der dieser Adapter abgeleitet ist und auf der er aufbaut.
- **[pyicloud](https://github.com/picklepete/pyicloud)** von picklepete — die Python-Referenzimplementierung für Apples iCloud-APIs, die viele der Service-Integrationen geleitet hat.
- **[pyicloud (timlaing Fork)](https://github.com/timlaing/pyicloud)** von timlaing — ein aktiv gepflegter Fork von pyicloud, der als Referenzimplementierung für moderne Erinnerungen (CloudKit v2) und andere aktuelle API-Details diente.

Ein großes Dankeschön an alle Mitwirkenden dieser Projekte!


## Haftungsausschluss

Dieser Adapter ist ein unabhängiges, von der Community entwickeltes Open-Source-Projekt. Er ist **nicht mit Apple Inc. verbunden, wird nicht von Apple Inc. unterstützt und steht in keiner offiziellen Verbindung zu Apple Inc.**

*iCloud*, *Wo ist?*, *Apple ID*, *iCloud Drive* und alle anderen Apple-Marken sind Eigentum von Apple Inc. Alle Produktnamen, Logos und Marken sind Eigentum ihrer jeweiligen Inhaber. Die Verwendung dieser Namen dient ausschließlich der Identifizierung.

Der Adapter greift auf Apples iCloud-Dienste über dieselben APIs zu, die auch von Apples eigenen Clients verwendet werden. Die Nutzung dieser APIs unterliegt Apples Nutzungsbedingungen. Durch die Verwendung dieses Adapters erklärst du dich damit einverstanden, alle geltenden Apple-Bedingungen einzuhalten. Der Autor übernimmt keine Haftung für jeglichen Missbrauch des Adapters oder Verstöße gegen Apples Nutzungsbedingungen.
