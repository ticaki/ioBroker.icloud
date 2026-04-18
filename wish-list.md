# Feature Wish-List — ioBroker.icloud

Basiert auf dem Vergleich mit pyicloud (timlaing-Fork) vom 18.04.2026.
Referenz: https://github.com/timlaing/pyicloud

---

## ✅ Bereits vollständig implementiert

| Service | Was wir haben |
|---|---|
| Reminders | CloudKit v2, volles CRUD + Listen, sendTo + States |
| iCloud Drive | List, Download, Upload, CreateFolder, Delete, Rename |
| Contacts | getContacts, getContactGroups (read-only) |
| Find My | Refresh, playSound, Geräte-States |
| Account | Devices-Liste, Family-Info |

---

## 🚀 Priorität 1 — Notes (komplett fehlender Service)

CloudKit-basierte Notizen lesen.
Referenz: `pyicloud/services/notes/` im timlaing-Fork.

### Was pyicloud kann
- `recents(limit)` — neueste Notizen (Titel, Snippet, Ordner, Datum)
- `iter_all(since?)` — alle Notizen, optional inkrementell via Sync-Token
- `folders()` — alle Ordner (mit Unterordner-Flag)
- `in_folder(folder_id, limit?)` — Notizen in einem bestimmten Ordner
- `get(note_id, with_attachments?)` — vollständige Notiz mit Textinhalt + Anhang-Metadaten
- `iter_changes(since?)` — Änderungs-Feed: updated/deleted Events
- `sync_cursor()` — Sync-Token für inkrementelle Updates
- `render_note(note_id)` — HTML-Fragment-Rendering
- `export_note(note_id, output_dir)` — HTML-Export auf Disk

### Datenformat
Notizinhalt steckt im CloudKit-Feld `TextDataEncrypted`:
- Base64-kodiert → GZIP/zlib-komprimiert → **Protocol Buffers** (`NoteStoreProto`)
- Protobuf-Schema: `NoteStoreProto > document > note > note_text + attribute_run[]`
- `attribute_run` enthält Anhang-Referenzen (`attachment_identifier`, `type_uti`)

### Datenmodelle (NoteSummary / Note)
```
NoteSummary:
  id           string     CloudKit record name
  title        string?    Titel (verschlüsselt, schon dekodiert)
  snippet      string?    Vorschautext
  modified_at  datetime?  Letzte Änderung
  folder_id    string?    CloudKit-ID des Ordners
  folder_name  string?    Lesbarer Ordnername
  is_deleted   bool
  is_locked    bool       Notiz ist passwortgeschützt

Note (extends NoteSummary):
  text         string?    Reiner Klartext (aus Protobuf dekodiert)
  html         string?    HTML-Rendering (optional)
  attachments  Attachment[]?

Attachment:
  id           string
  filename     string?
  uti          string?    MIME-ähnlicher UTI-Typ (z.B. public.jpeg)
  size         int?       Bytes
  download_url string?    Direkte Download-URL (zeitlich begrenzt)
  preview_url  string?    Vorschau-URL
  thumbnail_url string?   Thumbnail-URL

NoteFolder:
  id           string
  name         string?
  has_subfolders bool?
  count        int?

ChangeEvent:
  type  "updated" | "deleted"
  note  NoteSummary
```

### Komplexität
**Hoch** — wegen Protobuf-Dekodierung. Optionen:
1. `protobufjs` npm-Paket + `.proto`-Datei aus dem timlaing-Fork übernehmen
2. Nur Plaintext aus Protobuf extrahieren (kein HTML-Rendering) → deutlich einfacher
3. Als reine Lese-API starten, kein Write

### sendTo-Commands (Vorschlag)
- `getNotes` — alle Notizen oder letzte N (Felder: `limit`, `folderId`, `since`)
- `getNoteFolders` — alle Ordner
- `getNoteContent` — Vollinhalt einer Notiz (Feld: `noteId`)
- `getNoteChanges` — Änderungs-Feed seit Sync-Token (Feld: `since`)

---

## 🚀 Priorität 2 — Calendar Write

Calendar-Service (`calendar.ts`) ist vorhanden aber nur lesend und **nicht via sendTo exponiert**.
Referenz: `pyicloud/services/calendar.py`

### Was fehlt
- sendTo-Commands für `getCalendars`, `getEvents`
- Events erstellen / ändern / löschen (pyicloud `calendar.py` im timlaing-Fork)
- Alarm-Unterstützung bei Events

### Komplexität: mittel

---

## 🚀 Priorität 3 — Hide My Email

Vollständig neuer Service. Referenz: `pyicloud/services/hidemyemail.py`

### Was pyicloud kann
- `generate()` — neue zufällige Hide-My-Email-Adresse erzeugen
- `reserve(email, label, note?)` — generierte Adresse dauerhaft reservieren
- `list()` — alle aktiven Aliase auflisten
- `update(anonymousId, label?, note?, isActive?)` — Alias umbenennen oder (de-)aktivieren
- `deactivate(anonymousId)` — Alias deaktivieren
- `reactivate(anonymousId)` — Alias reaktivieren
- `delete(anonymousId)` — Alias endgültig löschen

### Datenmodell
```
HideMyEmailAddress:
  anonymousId   string   Stabile ID
  email         string   Die generierte @privaterelay.appleid.com-Adresse
  label         string   Nutzervergebener Name
  note          string?
  isActive      bool
  domain        string   i.c.com / privaterelay.appleid.com / etc.
  hme           string   Gleich wie email
```

### Komplexität: niedrig (REST-API, kein CloudKit, kein Protobuf)

### sendTo-Commands (Vorschlag)
- `hmeGenerate` — neue Adresse erzeugen
- `hmeReserve` — Adresse reservieren (Felder: `email`, `label`, `note?`)
- `hmeList` — alle Aliase
- `hmeUpdate` — Alias ändern (Felder: `anonymousId`, `label?`, `note?`, `isActive?`)
- `hmeDelete` — Alias löschen (Feld: `anonymousId`)

---

## ⚠️ Priorität 4 — Photos Write

`photos.ts` ist vorhanden, aber Upload, Delete und Album-Operationen sind **nicht via sendTo exponiert**.

### Was fehlt (Code ist schon da!)
- `deletePhoto(photoId)` — `delete()` existiert in `iCloudPhotoAsset`
- `uploadPhoto(base64, fileName, albumName?)` — Upload-Methode fehlt noch im Service
- `addToAlbum(photoId, albumName)` — in pyicloud vorhanden
- `deleteAlbum(albumName)` — in pyicloud vorhanden

### Komplexität: niedrig bis mittel (Service-Klasse erweitern + sendTo)

---

## 👀 Beobachten (noch nicht reif)

| Was | Warum beobachten |
|---|---|
| timlaing PR #217 — CloudKit Photos | Würde den REST-Photos-Service durch CloudKit ersetzen; noch offen/unfertig |
| Account Storage Details | Aufschlüsselung des iCloud-Speichers nach Medientyp; trivial zu ergänzen |

---

## ❌ Bewusst nicht umgesetzt

| Was | Warum |
|---|---|
| Ubiquity | Legacy vor iCloud Drive, kein Nutzen |
| Notes Write / Erstellen | Apple verschlüsselt `TextDataEncrypted` — Schreiben wäre ohne Kenntnis des Geräteschlüssels nicht möglich |
| Premium Mail Settings | Nur in picklepete-PRs, noch nicht in timlaing |
