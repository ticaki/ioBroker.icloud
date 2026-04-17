# Agent-Referenz: ioBroker Blockly-Blöcke erstellen

> Dieses Dokument dient als Vorlage und Checkliste, um Blockly-Blöcke für beliebige ioBroker-Adapter schnell und fehlerfrei zu erstellen.

---

## 1. Voraussetzungen im Adapter

### io-package.json — Pflichtfelder in `common`

```json
{
  "common": {
    "messagebox": true,
    "blockly": true
  }
}
```

| Feld | Zweck |
|---|---|
| `"messagebox": true` | Adapter kann `sendTo()`-Nachrichten empfangen |
| `"blockly": true` | **PFLICHT** — ohne dieses Flag wird `admin/blockly.js` vom JavaScript-Adapter nicht geladen! |

> **Häufigster Fehler:** `"blockly": true` vergessen → Blöcke erscheinen nicht in der Toolbox.

### package.json — files-Array

`admin/blockly.js` muss im `files`-Array enthalten sein, damit die Datei im npm-Paket landet. Typisches Muster:

```json
"files": [
  "admin{,/!(src)/**}/*.{html,css,png,svg,jpg,js}",
  ...
]
```

Das `*.js`-Glob deckt `blockly.js` bereits ab — prüfen, nicht blind annehmen.

---

## 2. Dateistruktur

```
admin/
  blockly.js      ← Einzige Datei, wird automatisch entdeckt
```

Keine Registrierung in `io-package.json` nötig (außer dem `"blockly": true` Flag). Der ioBroker JavaScript-Adapter scannt alle installierten Adapter nach `admin/blockly.js`.

---

## 3. Datei-Aufbau: admin/blockly.js

Die Datei hat **immer** diese Struktur:

```
1. goog-Preamble + Blockly.Translate Polyfill
2. Hilfsfunktionen (z.B. Instanz-Dropdown)
3. Pro Block:
   a. Blockly.Words['blockname']           → Übersetzungen
   b. Blockly.Sendto.blocks['blockname']   → Toolbox-XML
   c. Blockly.Blocks['blockname']          → Block-UI (init)
   d. Blockly.JavaScript['blockname']      → Code-Generator
```

### 3.1 Preamble (immer identisch)

```js
/* eslint-disable no-undef */
'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');
    goog.require('Blockly.JavaScript');
}

Blockly.Translate =
    Blockly.Translate ||
    function (word, lang) {
        lang = lang || systemLang;
        if (Blockly.Words && Blockly.Words[word]) {
            return Blockly.Words[word][lang] || Blockly.Words[word].en;
        }
        return word;
    };
```

### 3.2 Instanz-Dropdown-Helper (adaptername anpassen)

```js
function myAdapterGetInstances(anyLabel) {
    var options = [];
    if (typeof main !== 'undefined' && main.instances) {
        for (var i = 0; i < main.instances.length; i++) {
            var m = main.instances[i].match(/^system\.adapter\.ADAPTERNAME\.(\d+)$/);
            if (m) {
                options.push(['ADAPTERNAME.' + parseInt(m[1], 10), '.' + m[1]]);
            }
        }
    }
    if (!options.length) {
        for (var k = 0; k <= 4; k++) {
            options.push(['ADAPTERNAME.' + k, '.' + k]);
        }
    }
    if (anyLabel) {
        options.unshift([anyLabel, '']);
    }
    return options;
}
```

### 3.3 Übersetzungen

```js
Blockly.Words['blockname'] = {
    en: 'English text',
    de: 'Deutscher Text',
    ru: 'Русский текст',
    pt: 'Texto em português',
    nl: 'Nederlandse tekst',
    fr: 'Texte français',
    it: 'Testo italiano',
    es: 'Texto en español',
    pl: 'Tekst polski',
    uk: 'Текст українською',
    'zh-cn': '中文文本',
};
```

**Unterstützte Sprachen:** en, de, ru, pt, nl, fr, it, es, pl, uk, zh-cn (alle 11 ioBroker-Sprachen).

### 3.4 Toolbox-XML

```js
Blockly.Sendto.blocks['blockname'] =
    '<block type="blockname">' +
    '  <field name="INSTANCE"></field>' +
    '  <value name="MESSAGE">' +
    '    <shadow type="text"><field name="TEXT">default</field></shadow>' +
    '  </value>' +
    '</block>';
```

- Blöcke nach dem ersten mit `'<sep gap="5"></sep>'` voranstellen für optischen Abstand
- `<shadow>` erzeugt Standard-Werte, die der Nutzer überschreiben kann

### 3.5 Block-Definition (init)

```js
Blockly.Blocks['blockname'] = {
    init: function () {
        // Instanz-Dropdown
        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('blockname'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        // Text-Input (mit externem Blockly-Block verbindbar)
        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Translate('blockname_message'));

        // Dropdown
        this.appendDummyInput('ACTION')
            .appendField(Blockly.Translate('blockname_action'))
            .appendField(new Blockly.FieldDropdown([
                ['Label 1', 'value1'],
                ['Label 2', 'value2'],
            ]), 'ACTION');

        // Checkbox
        this.appendDummyInput('FLAG')
            .appendField('Flagged')
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'FLAG');

        // Statement-Block (hat Vorgänger + Nachfolger)
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('blockname'));
        this.setHelpUrl(Blockly.Translate('blockname_help'));
    },
};
```

**Für Blöcke mit Rückgabewert** (statt Statement):

```js
// STATT setPreviousStatement/setNextStatement:
this.setOutput(true, null);  // Block liefert einen Wert
```

### 3.6 Code-Generator

```js
Blockly.JavaScript['blockname'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var action = block.getFieldValue('ACTION');
    var flag = block.getFieldValue('FLAG') === 'TRUE';

    // Statement-Block: gibt Code-String zurück
    var code = "sendTo('adaptername" + instance + "', 'command', {\n";
    code += '  message: ' + (message || "''") + '\n';
    code += '});\n';
    return code;

    // ODER für Value-Block: gibt [code, ORDER] zurück
    // return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};
```

---

## 4. Verfügbare Globals im Blockly-Kontext

| Global | Beschreibung |
|---|---|
| `Blockly.Sendto.HUE` | Vordefinierte Block-Farbe für SendTo-Kategorie |
| `Blockly.Translate(word)` | Übersetzt `Blockly.Words[word]` in aktuelle Sprache |
| `main.instances` | Array aller Instanzen: `["system.adapter.name.0", ...]` |
| `systemLang` | Aktuelle Systemsprache (`"en"`, `"de"`, etc.) |

---

## 5. Feld-Typen Referenz

| Feld | Blockly-Klasse | Beispiel |
|---|---|---|
| Dropdown | `new Blockly.FieldDropdown([['Label', 'value'], ...])` | Instanz, Aktion |
| Checkbox | `new Blockly.FieldCheckbox('FALSE')` | Flags, Boolean-Optionen |
| Text-Input | `new Blockly.FieldTextInput('default')` | Inline-Eingabe |
| Value-Input | `this.appendValueInput('NAME')` | Externer Block-Anschluss |
| Number (Shadow) | `<shadow type="math_number"><field name="NUM">0</field></shadow>` | Timestamps, Zahlen |
| Text (Shadow) | `<shadow type="text"><field name="TEXT">default</field></shadow>` | String-Eingaben |

---

## 6. Namenskonventionen

| Element | Konvention | Beispiel |
|---|---|---|
| Block-Type | `adaptername` oder `adaptername_action` | `icloud_create_reminder` |
| Übersetzungskeys | `adaptername_feldname` | `icloud_listId`, `icloud_priority` |
| Instanz-Regex | `system\.adapter\.ADAPTERNAME\.(\d+)` | `system\.adapter\.icloud\.(\d+)` |
| Generierter Code | `sendTo('adapter.instance', 'cmd', {...})` | `sendTo('icloud.0', 'createReminder', {...})` |

---

## 7. Checkliste für einen neuen Adapter

1. [ ] `io-package.json`: `"messagebox": true` vorhanden?
2. [ ] `io-package.json`: `"blockly": true` hinzugefügt?
3. [ ] `package.json` → `files`-Array: Enthält es `admin/*.js`?
4. [ ] `admin/blockly.js` erstellt mit:
   - [ ] goog-Preamble + Translate-Polyfill
   - [ ] Instanz-Helper-Funktion
   - [ ] Für jeden Block: Words + Sendto.blocks + Blocks + JavaScript
5. [ ] Alle 11 Sprachen in `Blockly.Words` gepflegt
6. [ ] `npm run build` — keine Fehler
7. [ ] `npm run lint` — keine neuen Fehler
8. [ ] JavaScript-Adapter neu starten → Blöcke prüfen

---

## 8. Tipps & Stolpersteine

- **ES5-Syntax verwenden!** `blockly.js` wird im Browser-Kontext geladen — kein TypeScript, kein `const`/`let`, keine Arrow-Functions, kein Template-Literal verwenden. Nur `var`, `function () {}`, String-Konkatenation.
- **Blockly.Sendto.blocks** registriert den Block in der Toolbox-Sidebar. Ohne diesen Eintrag erscheint der Block nirgends.
- **`<sep gap="5"></sep>`** vor dem Toolbox-XML erzeugt einen kleinen Abstand zum vorherigen Block.
- **Value-Blöcke** (mit `setOutput`) können in anderen Blöcken als Wert verwendet werden — ideal für Abfragen, die ein Ergebnis liefern.
- **Statement-Blöcke** (mit `setPreviousStatement`/`setNextStatement`) werden verkettet — ideal für Aktionen wie create/delete/update.
- **Shadow-Blöcke** in der Toolbox-XML geben dem Nutzer sichtbare Standardwerte, die überschrieben werden können.
- **Optional-Felder:** Leere Strings im Generator mit `|| undefined` oder durch Weglassen im generierten Objekt handhaben.
- **Dropdown mit "nicht ändern":** Einen Platzhalterwert wie `'-1'` oder `'keep'` verwenden und im Generator dieses Feld überspringen.
- **sendTo-Callback:** Der generierte Code kann `function (result) { ... }` als Callback nutzen, um Ergebnisse zu loggen.

---

## 9. Vollständiges Minimal-Beispiel

Ein einzelner Block, der eine Nachricht an einen Adapter sendet:

```js
/* eslint-disable no-undef */
'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');
    goog.require('Blockly.JavaScript');
}

Blockly.Translate =
    Blockly.Translate ||
    function (word, lang) {
        lang = lang || systemLang;
        if (Blockly.Words && Blockly.Words[word]) {
            return Blockly.Words[word][lang] || Blockly.Words[word].en;
        }
        return word;
    };

// ── Translations ─────────────────────────────────────────────────────────────
Blockly.Words['myadapter'] = {
    en: 'My Adapter: Send message', de: 'Mein Adapter: Nachricht senden',
    ru: 'Мой адаптер: Отправить', pt: 'Meu adaptador: Enviar',
    nl: 'Mijn adapter: Bericht sturen', fr: 'Mon adaptateur: Envoyer',
    it: 'Mio adattatore: Invia', es: 'Mi adaptador: Enviar',
    pl: 'Mój adapter: Wyślij', uk: 'Мій адаптер: Надіслати',
    'zh-cn': '我的适配器：发送',
};
Blockly.Words['myadapter_message'] = {
    en: 'Message', de: 'Nachricht', ru: 'Сообщение', pt: 'Mensagem',
    nl: 'Bericht', fr: 'Message', it: 'Messaggio', es: 'Mensaje',
    pl: 'Wiadomość', uk: 'Повідомлення', 'zh-cn': '消息',
};
Blockly.Words['myadapter_help'] = {
    en: 'https://github.com/user/ioBroker.myadapter/blob/main/README.md',
};

// ── Toolbox XML ──────────────────────────────────────────────────────────────
Blockly.Sendto.blocks['myadapter'] =
    '<block type="myadapter">' +
    '  <field name="INSTANCE"></field>' +
    '  <value name="MESSAGE">' +
    '    <shadow type="text"><field name="TEXT">Hello</field></shadow>' +
    '  </value>' +
    '</block>';

// ── Block Definition ─────────────────────────────────────────────────────────
Blockly.Blocks['myadapter'] = {
    init: function () {
        var options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (var i = 0; i < main.instances.length; i++) {
                var m = main.instances[i].match(/^system\.adapter\.myadapter\.(\d+)$/);
                if (m) {
                    options.push(['myadapter.' + parseInt(m[1], 10), '.' + m[1]]);
                }
            }
        }
        if (!options.length) {
            for (var k = 0; k <= 4; k++) {
                options.push(['myadapter.' + k, '.' + k]);
            }
        }

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('myadapter'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Translate('myadapter_message'));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('myadapter'));
        this.setHelpUrl(Blockly.Translate('myadapter_help'));
    },
};

// ── Code Generator ───────────────────────────────────────────────────────────
Blockly.JavaScript['myadapter'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);

    return (
        "sendTo('myadapter" + instance + "', 'send', {\n" +
        '  message: ' + (message || "''") + '\n' +
        '});\n'
    );
};
```

---

## 10. Referenz-Adapter

| Adapter | Komplexität | Besonderheiten |
|---|---|---|
| [notification-manager](https://github.com/foxriver76/ioBroker.notification-manager) | Einfach | 1 Block, gutes Minimalbeispiel |
| [telegram](https://github.com/ioBroker/ioBroker.telegram) | Komplex | Mehrere Blöcke, Mutator, optionale Felder |
| icloud (dieser Adapter) | Mittel | 4 Blöcke, Dropdowns, Checkboxen, Value+Statement |
