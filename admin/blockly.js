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

// ══════════════════════════════════════════════════════════════════════════════
//  Helper: build adapter-instance dropdown
// ══════════════════════════════════════════════════════════════════════════════
function icloudGetInstances(anyLabel) {
    var options = [];
    if (typeof main !== 'undefined' && main.instances) {
        for (var i = 0; i < main.instances.length; i++) {
            var m = main.instances[i].match(/^system\.adapter\.icloud\.(\d+)$/);
            if (m) {
                options.push(['icloud.' + parseInt(m[1], 10), '.' + m[1]]);
            }
        }
    }
    if (!options.length) {
        for (var k = 0; k <= 4; k++) {
            options.push(['icloud.' + k, '.' + k]);
        }
    }
    if (anyLabel) {
        options.unshift([anyLabel, '']);
    }
    return options;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Translations
// ══════════════════════════════════════════════════════════════════════════════

// ── Block: icloud_create_reminder ────────────────────────────────────────────
Blockly.Words['icloud_create_reminder'] = {
    en: 'iCloud: Create reminder',
    de: 'iCloud: Erinnerung erstellen',
    ru: 'iCloud: Создать напоминание',
    pt: 'iCloud: Criar lembrete',
    nl: 'iCloud: Herinnering maken',
    fr: 'iCloud: Créer un rappel',
    it: 'iCloud: Crea promemoria',
    es: 'iCloud: Crear recordatorio',
    pl: 'iCloud: Utwórz przypomnienie',
    uk: 'iCloud: Створити нагадування',
    'zh-cn': 'iCloud: 创建提醒',
};
Blockly.Words['icloud_listId'] = {
    en: 'List ID',
    de: 'Listen-ID',
    ru: 'ID списка',
    pt: 'ID da lista',
    nl: 'Lijst-ID',
    fr: 'ID de la liste',
    it: 'ID lista',
    es: 'ID de la lista',
    pl: 'ID listy',
    uk: 'ID списку',
    'zh-cn': '列表ID',
};
Blockly.Words['icloud_title'] = {
    en: 'Title',
    de: 'Titel',
    ru: 'Заголовок',
    pt: 'Título',
    nl: 'Titel',
    fr: 'Titre',
    it: 'Titolo',
    es: 'Título',
    pl: 'Tytuł',
    uk: 'Назва',
    'zh-cn': '标题',
};
Blockly.Words['icloud_description'] = {
    en: 'Description (optional)',
    de: 'Beschreibung (optional)',
    ru: 'Описание (необязательно)',
    pt: 'Descrição (opcional)',
    nl: 'Beschrijving (optioneel)',
    fr: 'Description (facultatif)',
    it: 'Descrizione (opzionale)',
    es: 'Descripción (opcional)',
    pl: 'Opis (opcjonalnie)',
    uk: 'Опис (необов\'язково)',
    'zh-cn': '描述（可选）',
};
Blockly.Words['icloud_priority'] = {
    en: 'Priority',
    de: 'Priorität',
    ru: 'Приоритет',
    pt: 'Prioridade',
    nl: 'Prioriteit',
    fr: 'Priorité',
    it: 'Priorità',
    es: 'Prioridad',
    pl: 'Priorytet',
    uk: 'Пріоритет',
    'zh-cn': '优先级',
};
Blockly.Words['icloud_priority_none'] = {
    en: 'None',
    de: 'Keine',
    ru: 'Нет',
    pt: 'Nenhuma',
    nl: 'Geen',
    fr: 'Aucune',
    it: 'Nessuna',
    es: 'Ninguna',
    pl: 'Brak',
    uk: 'Немає',
    'zh-cn': '无',
};
Blockly.Words['icloud_priority_low'] = {
    en: 'Low',
    de: 'Niedrig',
    ru: 'Низкий',
    pt: 'Baixa',
    nl: 'Laag',
    fr: 'Basse',
    it: 'Bassa',
    es: 'Baja',
    pl: 'Niski',
    uk: 'Низький',
    'zh-cn': '低',
};
Blockly.Words['icloud_priority_medium'] = {
    en: 'Medium',
    de: 'Mittel',
    ru: 'Средний',
    pt: 'Média',
    nl: 'Gemiddeld',
    fr: 'Moyenne',
    it: 'Media',
    es: 'Media',
    pl: 'Średni',
    uk: 'Середній',
    'zh-cn': '中',
};
Blockly.Words['icloud_priority_high'] = {
    en: 'High',
    de: 'Hoch',
    ru: 'Высокий',
    pt: 'Alta',
    nl: 'Hoog',
    fr: 'Haute',
    it: 'Alta',
    es: 'Alta',
    pl: 'Wysoki',
    uk: 'Високий',
    'zh-cn': '高',
};
Blockly.Words['icloud_flagged'] = {
    en: 'Flagged',
    de: 'Markiert',
    ru: 'Отмечено',
    pt: 'Sinalizado',
    nl: 'Gemarkeerd',
    fr: 'Signalé',
    it: 'Contrassegnato',
    es: 'Marcado',
    pl: 'Oflagowany',
    uk: 'Позначено',
    'zh-cn': '已标记',
};
Blockly.Words['icloud_dueDate'] = {
    en: 'Due date (timestamp, optional)',
    de: 'Fälligkeitsdatum (Zeitstempel, optional)',
    ru: 'Срок выполнения (метка времени, необязательно)',
    pt: 'Data de vencimento (timestamp, opcional)',
    nl: 'Verloopdatum (tijdstempel, optioneel)',
    fr: 'Échéance (timestamp, facultatif)',
    it: 'Scadenza (timestamp, opzionale)',
    es: 'Fecha límite (timestamp, opcional)',
    pl: 'Termin (znacznik czasu, opcjonalnie)',
    uk: 'Термін (часова мітка, необов\'язково)',
    'zh-cn': '截止日期（时间戳，可选）',
};
Blockly.Words['icloud_log'] = {
    en: 'Log level',
    de: 'Loglevel',
    ru: 'Уровень журнала',
    pt: 'Nível de log',
    nl: 'Logniveau',
    fr: 'Niveau de log',
    it: 'Livello di log',
    es: 'Nivel de registro',
    pl: 'Poziom logowania',
    uk: 'Рівень журналу',
    'zh-cn': '日志级别',
};

Blockly.Words['icloud_help'] = {
    en: 'https://github.com/ticaki/ioBroker.icloud/blob/main/README.md',
};

Blockly.Words['icloud_anyInstance'] = {
    en: 'All instances',
    de: 'Alle Instanzen',
    ru: 'Все экземпляры',
    pt: 'Todas as instâncias',
    nl: 'Alle instanties',
    fr: 'Toutes les instances',
    it: 'Tutte le istanze',
    es: 'Todas las instancias',
    pl: 'Wszystkie instancje',
    uk: 'Всі екземпляри',
    'zh-cn': '所有实例',
};

// ── Block: icloud_reminder_action ────────────────────────────────────────────
Blockly.Words['icloud_reminder_action'] = {
    en: 'iCloud: Reminder action',
    de: 'iCloud: Erinnerungsaktion',
    ru: 'iCloud: Действие с напоминанием',
    pt: 'iCloud: Ação do lembrete',
    nl: 'iCloud: Herinneringsactie',
    fr: 'iCloud: Action sur rappel',
    it: 'iCloud: Azione promemoria',
    es: 'iCloud: Acción de recordatorio',
    pl: 'iCloud: Akcja przypomnienia',
    uk: 'iCloud: Дія з нагадуванням',
    'zh-cn': 'iCloud: 提醒操作',
};
Blockly.Words['icloud_action'] = {
    en: 'Action',
    de: 'Aktion',
    ru: 'Действие',
    pt: 'Ação',
    nl: 'Actie',
    fr: 'Action',
    it: 'Azione',
    es: 'Acción',
    pl: 'Akcja',
    uk: 'Дія',
    'zh-cn': '操作',
};
Blockly.Words['icloud_reminderId'] = {
    en: 'Reminder ID',
    de: 'Erinnerungs-ID',
    ru: 'ID напоминания',
    pt: 'ID do lembrete',
    nl: 'Herinnerings-ID',
    fr: 'ID du rappel',
    it: 'ID promemoria',
    es: 'ID del recordatorio',
    pl: 'ID przypomnienia',
    uk: 'ID нагадування',
    'zh-cn': '提醒ID',
};
Blockly.Words['icloud_action_complete'] = {
    en: 'Complete',
    de: 'Abschließen',
    ru: 'Завершить',
    pt: 'Concluir',
    nl: 'Voltooien',
    fr: 'Terminer',
    it: 'Completare',
    es: 'Completar',
    pl: 'Ukończ',
    uk: 'Завершити',
    'zh-cn': '完成',
};
Blockly.Words['icloud_action_uncomplete'] = {
    en: 'Uncomplete',
    de: 'Wieder öffnen',
    ru: 'Отменить',
    pt: 'Reabrir',
    nl: 'Heropenen',
    fr: 'Rouvrir',
    it: 'Riaprire',
    es: 'Reabrir',
    pl: 'Otwórz ponownie',
    uk: 'Скасувати',
    'zh-cn': '取消完成',
};
Blockly.Words['icloud_action_delete'] = {
    en: 'Delete',
    de: 'Löschen',
    ru: 'Удалить',
    pt: 'Excluir',
    nl: 'Verwijderen',
    fr: 'Supprimer',
    it: 'Eliminare',
    es: 'Eliminar',
    pl: 'Usuń',
    uk: 'Видалити',
    'zh-cn': '删除',
};

// ── Block: icloud_update_reminder ────────────────────────────────────────────
Blockly.Words['icloud_update_reminder'] = {
    en: 'iCloud: Update reminder',
    de: 'iCloud: Erinnerung aktualisieren',
    ru: 'iCloud: Обновить напоминание',
    pt: 'iCloud: Atualizar lembrete',
    nl: 'iCloud: Herinnering bijwerken',
    fr: 'iCloud: Mettre à jour le rappel',
    it: 'iCloud: Aggiorna promemoria',
    es: 'iCloud: Actualizar recordatorio',
    pl: 'iCloud: Aktualizuj przypomnienie',
    uk: 'iCloud: Оновити нагадування',
    'zh-cn': 'iCloud: 更新提醒',
};
Blockly.Words['icloud_new_title'] = {
    en: 'New title (optional)',
    de: 'Neuer Titel (optional)',
    ru: 'Новый заголовок (необязательно)',
    pt: 'Novo título (opcional)',
    nl: 'Nieuwe titel (optioneel)',
    fr: 'Nouveau titre (facultatif)',
    it: 'Nuovo titolo (opzionale)',
    es: 'Nuevo título (opcional)',
    pl: 'Nowy tytuł (opcjonalnie)',
    uk: 'Нова назва (необов\'язково)',
    'zh-cn': '新标题（可选）',
};

// ── Block: icloud_get_data ───────────────────────────────────────────────────
Blockly.Words['icloud_get_data'] = {
    en: 'iCloud: Get data',
    de: 'iCloud: Daten abrufen',
    ru: 'iCloud: Получить данные',
    pt: 'iCloud: Obter dados',
    nl: 'iCloud: Gegevens ophalen',
    fr: 'iCloud: Obtenir les données',
    it: 'iCloud: Ottieni dati',
    es: 'iCloud: Obtener datos',
    pl: 'iCloud: Pobierz dane',
    uk: 'iCloud: Отримати дані',
    'zh-cn': 'iCloud: 获取数据',
};
Blockly.Words['icloud_query'] = {
    en: 'Query',
    de: 'Abfrage',
    ru: 'Запрос',
    pt: 'Consulta',
    nl: 'Query',
    fr: 'Requête',
    it: 'Query',
    es: 'Consulta',
    pl: 'Zapytanie',
    uk: 'Запит',
    'zh-cn': '查询',
};
Blockly.Words['icloud_query_reminders'] = {
    en: 'Reminders',
    de: 'Erinnerungen',
    ru: 'Напоминания',
    pt: 'Lembretes',
    nl: 'Herinneringen',
    fr: 'Rappels',
    it: 'Promemoria',
    es: 'Recordatorios',
    pl: 'Przypomnienia',
    uk: 'Нагадування',
    'zh-cn': '提醒',
};
Blockly.Words['icloud_query_lists'] = {
    en: 'Reminder lists',
    de: 'Erinnerungslisten',
    ru: 'Списки напоминаний',
    pt: 'Listas de lembretes',
    nl: 'Herinneringslijsten',
    fr: 'Listes de rappels',
    it: 'Liste promemoria',
    es: 'Listas de recordatorios',
    pl: 'Listy przypomnień',
    uk: 'Списки нагадувань',
    'zh-cn': '提醒列表',
};
Blockly.Words['icloud_query_contacts'] = {
    en: 'Contacts',
    de: 'Kontakte',
    ru: 'Контакты',
    pt: 'Contactos',
    nl: 'Contacten',
    fr: 'Contacts',
    it: 'Contatti',
    es: 'Contactos',
    pl: 'Kontakty',
    uk: 'Контакти',
    'zh-cn': '联系人',
};
Blockly.Words['icloud_listId_optional'] = {
    en: 'Filter by list ID (optional)',
    de: 'Nach Listen-ID filtern (optional)',
    ru: 'Фильтр по ID списка (необязательно)',
    pt: 'Filtrar por ID da lista (opcional)',
    nl: 'Filteren op lijst-ID (optioneel)',
    fr: 'Filtrer par ID de liste (facultatif)',
    it: 'Filtra per ID lista (opzionale)',
    es: 'Filtrar por ID de lista (opcional)',
    pl: 'Filtruj wg ID listy (opcjonalnie)',
    uk: 'Фільтрувати за ID списку (необов\'язково)',
    'zh-cn': '按列表ID过滤（可选）',
};
Blockly.Words['icloud_result'] = {
    en: 'Result variable',
    de: 'Ergebnisvariable',
    ru: 'Переменная результата',
    pt: 'Variável de resultado',
    nl: 'Resultaatvariabele',
    fr: 'Variable de résultat',
    it: 'Variabile risultato',
    es: 'Variable de resultado',
    pl: 'Zmienna wyniku',
    uk: 'Змінна результату',
    'zh-cn': '结果变量',
};

// ══════════════════════════════════════════════════════════════════════════════
//  1) icloud_create_reminder
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Sendto.blocks['icloud_create_reminder'] =
    '<block type="icloud_create_reminder">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="PRIORITY">0</field>' +
    '  <field name="FLAGGED">FALSE</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="LIST_ID">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="TITLE">' +
    '    <shadow type="text"><field name="TEXT">My reminder</field></shadow>' +
    '  </value>' +
    '  <value name="DESCRIPTION">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="DUE_DATE">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_create_reminder'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_create_reminder'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('LIST_ID').appendField(Blockly.Translate('icloud_listId'));

        this.appendValueInput('TITLE').appendField(Blockly.Translate('icloud_title'));

        this.appendValueInput('DESCRIPTION').appendField(Blockly.Translate('icloud_description'));

        this.appendDummyInput('PRIORITY')
            .appendField(Blockly.Translate('icloud_priority'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('icloud_priority_none'), '0'],
                    [Blockly.Translate('icloud_priority_low'), '9'],
                    [Blockly.Translate('icloud_priority_medium'), '5'],
                    [Blockly.Translate('icloud_priority_high'), '1'],
                ]),
                'PRIORITY',
            );

        this.appendDummyInput('FLAGGED')
            .appendField(Blockly.Translate('icloud_flagged'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'FLAGGED');

        this.appendValueInput('DUE_DATE').appendField(Blockly.Translate('icloud_dueDate'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_create_reminder'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_create_reminder'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var listId = Blockly.JavaScript.valueToCode(block, 'LIST_ID', Blockly.JavaScript.ORDER_ATOMIC);
    var title = Blockly.JavaScript.valueToCode(block, 'TITLE', Blockly.JavaScript.ORDER_ATOMIC);
    var description = Blockly.JavaScript.valueToCode(block, 'DESCRIPTION', Blockly.JavaScript.ORDER_ATOMIC);
    var priority = block.getFieldValue('PRIORITY');
    var flagged = block.getFieldValue('FLAGGED') === 'TRUE';
    var dueDate = Blockly.JavaScript.valueToCode(block, 'DUE_DATE', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var code = 'sendTo(\'icloud' + instance + "', 'createReminder', {\n";
    code += '  listId: ' + (listId || "''") + ',\n';
    code += '  title: ' + (title || "''") + ',\n';
    if (description) {
        code += '  description: ' + description + ' || undefined,\n';
    }
    code += '  priority: ' + priority + ',\n';
    code += '  flagged: ' + flagged + ',\n';
    if (dueDate) {
        code += '  dueDate: ' + dueDate + ' || undefined,\n';
    }
    code += '}, function (result) {\n';
    if (logLevel) {
        code += "  console." + logLevel + "('iCloud createReminder: ' + JSON.stringify(result));\n";
    }
    code += '});\n';
    return code;
};

// ══════════════════════════════════════════════════════════════════════════════
//  2) icloud_reminder_action (complete / uncomplete / delete)
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Sendto.blocks['icloud_reminder_action'] =
    '<sep gap="5"></sep>' +
    '<block type="icloud_reminder_action">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="ACTION">complete</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="REMINDER_ID">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_reminder_action'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_reminder_action'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendDummyInput('ACTION')
            .appendField(Blockly.Translate('icloud_action'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('icloud_action_complete'), 'complete'],
                    [Blockly.Translate('icloud_action_uncomplete'), 'uncomplete'],
                    [Blockly.Translate('icloud_action_delete'), 'delete'],
                ]),
                'ACTION',
            );

        this.appendValueInput('REMINDER_ID').appendField(Blockly.Translate('icloud_reminderId'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_reminder_action'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_reminder_action'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var action = block.getFieldValue('ACTION');
    var reminderId = Blockly.JavaScript.valueToCode(block, 'REMINDER_ID', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var code;
    if (action === 'delete') {
        code = 'sendTo(\'icloud' + instance + "', 'deleteReminder', {\n";
        code += '  reminderId: ' + (reminderId || "''") + '\n';
        code += '}, function (result) {\n';
        if (logLevel) {
            code += "  console." + logLevel + "('iCloud deleteReminder: ' + JSON.stringify(result));\n";
        }
        code += '});\n';
    } else {
        var completed = action === 'complete' ? 'true' : 'false';
        code = 'sendTo(\'icloud' + instance + "', 'completeReminder', {\n";
        code += '  reminderId: ' + (reminderId || "''") + ',\n';
        code += '  completed: ' + completed + '\n';
        code += '}, function (result) {\n';
        if (logLevel) {
            code += "  console." + logLevel + "('iCloud completeReminder: ' + JSON.stringify(result));\n";
        }
        code += '});\n';
    }
    return code;
};

// ══════════════════════════════════════════════════════════════════════════════
//  3) icloud_update_reminder
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Sendto.blocks['icloud_update_reminder'] =
    '<sep gap="5"></sep>' +
    '<block type="icloud_update_reminder">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="PRIORITY">-1</field>' +
    '  <field name="FLAGGED_ACTION">keep</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="REMINDER_ID">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="NEW_TITLE">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="DESCRIPTION">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="DUE_DATE">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_update_reminder'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_update_reminder'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('REMINDER_ID').appendField(Blockly.Translate('icloud_reminderId'));

        this.appendValueInput('NEW_TITLE').appendField(Blockly.Translate('icloud_new_title'));

        this.appendValueInput('DESCRIPTION').appendField(Blockly.Translate('icloud_description'));

        this.appendDummyInput('PRIORITY')
            .appendField(Blockly.Translate('icloud_priority'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['—', '-1'],
                    [Blockly.Translate('icloud_priority_none'), '0'],
                    [Blockly.Translate('icloud_priority_low'), '9'],
                    [Blockly.Translate('icloud_priority_medium'), '5'],
                    [Blockly.Translate('icloud_priority_high'), '1'],
                ]),
                'PRIORITY',
            );

        this.appendDummyInput('FLAGGED_ACTION')
            .appendField(Blockly.Translate('icloud_flagged'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['—', 'keep'],
                    ['✓', 'true'],
                    ['✗', 'false'],
                ]),
                'FLAGGED_ACTION',
            );

        this.appendValueInput('DUE_DATE').appendField(Blockly.Translate('icloud_dueDate'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_update_reminder'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_update_reminder'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var reminderId = Blockly.JavaScript.valueToCode(block, 'REMINDER_ID', Blockly.JavaScript.ORDER_ATOMIC);
    var newTitle = Blockly.JavaScript.valueToCode(block, 'NEW_TITLE', Blockly.JavaScript.ORDER_ATOMIC);
    var description = Blockly.JavaScript.valueToCode(block, 'DESCRIPTION', Blockly.JavaScript.ORDER_ATOMIC);
    var priority = block.getFieldValue('PRIORITY');
    var flaggedAction = block.getFieldValue('FLAGGED_ACTION');
    var dueDate = Blockly.JavaScript.valueToCode(block, 'DUE_DATE', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var code = 'sendTo(\'icloud' + instance + "', 'updateReminder', {\n";
    code += '  reminderId: ' + (reminderId || "''") + ',\n';
    if (newTitle) {
        code += '  title: ' + newTitle + ' || undefined,\n';
    }
    if (description) {
        code += '  description: ' + description + ' || undefined,\n';
    }
    if (priority !== '-1') {
        code += '  priority: ' + priority + ',\n';
    }
    if (flaggedAction !== 'keep') {
        code += '  flagged: ' + (flaggedAction === 'true') + ',\n';
    }
    if (dueDate) {
        code += '  dueDate: ' + dueDate + ' || undefined,\n';
    }
    code += '}, function (result) {\n';
    if (logLevel) {
        code += "  console." + logLevel + "('iCloud updateReminder: ' + JSON.stringify(result));\n";
    }
    code += '});\n';
    return code;
};

// ══════════════════════════════════════════════════════════════════════════════
//  4) icloud_get_data (getReminders / getReminderLists)
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Sendto.blocks['icloud_get_data'] =
    '<sep gap="5"></sep>' +
    '<block type="icloud_get_data">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="QUERY">getReminders</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="LIST_ID">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_get_data'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_get_data'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendDummyInput('QUERY')
            .appendField(Blockly.Translate('icloud_query'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('icloud_query_reminders'), 'getReminders'],
                    [Blockly.Translate('icloud_query_lists'), 'getReminderLists'],
                    [Blockly.Translate('icloud_query_contacts'), 'getContacts'],
                ]),
                'QUERY',
            );

        this.appendValueInput('LIST_ID').appendField(Blockly.Translate('icloud_listId_optional'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setOutput(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_get_data'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_get_data'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var query = block.getFieldValue('QUERY');
    var listId = Blockly.JavaScript.valueToCode(block, 'LIST_ID', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var msg = '{}';
    if (query === 'getReminders' && listId) {
        msg = '{ listId: ' + listId + ' }';
    } else if (query === 'getContacts' && listId) {
        msg = '{ contactId: ' + listId + ' }';
    }

    var resultVar = 'icloudResult_' + Blockly.JavaScript.variableDB_.getDistinctName('data', Blockly.Variables.NAME_TYPE);

    var code = '(function () {\n';
    code += '  var ' + resultVar + ';\n';
    code += '  sendTo(\'icloud' + instance + "', '" + query + "', " + msg + ', function (result) {\n';
    if (logLevel) {
        code += "    console." + logLevel + "('iCloud " + query + ": ' + JSON.stringify(result));\n";
    }
    code += '    ' + resultVar + ' = result;\n';
    code += '  });\n';
    code += '  return ' + resultVar + ';\n';
    code += '})()';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// ══════════════════════════════════════════════════════════════════════════════
//  Translations — Drive blocks
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Words['icloud_drive_upload'] = {
    en: 'iCloud Drive: Upload file',
    de: 'iCloud Drive: Datei hochladen',
    ru: 'iCloud Drive: Загрузить файл',
    pt: 'iCloud Drive: Enviar arquivo',
    nl: 'iCloud Drive: Bestand uploaden',
    fr: 'iCloud Drive: Envoyer un fichier',
    it: 'iCloud Drive: Carica file',
    es: 'iCloud Drive: Subir archivo',
    pl: 'iCloud Drive: Prześlij plik',
    uk: 'iCloud Drive: Завантажити файл',
    'zh-cn': 'iCloud Drive: 上传文件',
};
Blockly.Words['icloud_drive_fileName'] = {
    en: 'File name',
    de: 'Dateiname',
    ru: 'Имя файла',
    pt: 'Nome do arquivo',
    nl: 'Bestandsnaam',
    fr: 'Nom du fichier',
    it: 'Nome file',
    es: 'Nombre de archivo',
    pl: 'Nazwa pliku',
    uk: 'Ім\'я файлу',
    'zh-cn': '文件名',
};
Blockly.Words['icloud_drive_base64'] = {
    en: 'Content (Base64)',
    de: 'Inhalt (Base64)',
    ru: 'Содержимое (Base64)',
    pt: 'Conteúdo (Base64)',
    nl: 'Inhoud (Base64)',
    fr: 'Contenu (Base64)',
    it: 'Contenuto (Base64)',
    es: 'Contenido (Base64)',
    pl: 'Zawartość (Base64)',
    uk: 'Вміст (Base64)',
    'zh-cn': '内容（Base64）',
};
Blockly.Words['icloud_drive_folderPath'] = {
    en: 'Folder path (optional)',
    de: 'Ordnerpfad (optional)',
    ru: 'Путь к папке (необязательно)',
    pt: 'Caminho da pasta (opcional)',
    nl: 'Mappad (optioneel)',
    fr: 'Chemin du dossier (facultatif)',
    it: 'Percorso cartella (opzionale)',
    es: 'Ruta de carpeta (opcional)',
    pl: 'Ścieżka folderu (opcjonalnie)',
    uk: 'Шлях до теки (необов\'язково)',
    'zh-cn': '文件夹路径（可选）',
};
Blockly.Words['icloud_drive_contentType'] = {
    en: 'Content type (optional)',
    de: 'Inhaltstyp (optional)',
    ru: 'Тип содержимого (необязательно)',
    pt: 'Tipo de conteúdo (opcional)',
    nl: 'Inhoudstype (optioneel)',
    fr: 'Type de contenu (facultatif)',
    it: 'Tipo di contenuto (opzionale)',
    es: 'Tipo de contenido (opcional)',
    pl: 'Typ zawartości (opcjonalnie)',
    uk: 'Тип вмісту (необов\'язково)',
    'zh-cn': '内容类型（可选）',
};
Blockly.Words['icloud_drive_get'] = {
    en: 'iCloud Drive: Get file',
    de: 'iCloud Drive: Datei abrufen',
    ru: 'iCloud Drive: Получить файл',
    pt: 'iCloud Drive: Obter arquivo',
    nl: 'iCloud Drive: Bestand ophalen',
    fr: 'iCloud Drive: Obtenir un fichier',
    it: 'iCloud Drive: Ottieni file',
    es: 'iCloud Drive: Obtener archivo',
    pl: 'iCloud Drive: Pobierz plik',
    uk: 'iCloud Drive: Отримати файл',
    'zh-cn': 'iCloud Drive: 获取文件',
};
Blockly.Words['icloud_drive_filePath'] = {
    en: 'File path',
    de: 'Dateipfad',
    ru: 'Путь к файлу',
    pt: 'Caminho do arquivo',
    nl: 'Bestandspad',
    fr: 'Chemin du fichier',
    it: 'Percorso file',
    es: 'Ruta del archivo',
    pl: 'Ścieżka pliku',
    uk: 'Шлях до файлу',
    'zh-cn': '文件路径',
};

// ══════════════════════════════════════════════════════════════════════════════
//  5) icloud_drive_upload (upload / send file, mainly images)
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Sendto.blocks['icloud_drive_upload'] =
    '<sep gap="5"></sep>' +
    '<block type="icloud_drive_upload">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="LOG"></field>' +
    '  <value name="FILE_NAME">' +
    '    <shadow type="text"><field name="TEXT">photo.jpg</field></shadow>' +
    '  </value>' +
    '  <value name="BASE64">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="FOLDER_PATH">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="CONTENT_TYPE">' +
    '    <shadow type="text"><field name="TEXT">image/jpeg</field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_drive_upload'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_drive_upload'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('FILE_NAME').appendField(Blockly.Translate('icloud_drive_fileName'));

        this.appendValueInput('BASE64').appendField(Blockly.Translate('icloud_drive_base64'));

        this.appendValueInput('FOLDER_PATH').appendField(Blockly.Translate('icloud_drive_folderPath'));

        this.appendValueInput('CONTENT_TYPE').appendField(Blockly.Translate('icloud_drive_contentType'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_drive_upload'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_drive_upload'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var fileName = Blockly.JavaScript.valueToCode(block, 'FILE_NAME', Blockly.JavaScript.ORDER_ATOMIC);
    var base64 = Blockly.JavaScript.valueToCode(block, 'BASE64', Blockly.JavaScript.ORDER_ATOMIC);
    var folderPath = Blockly.JavaScript.valueToCode(block, 'FOLDER_PATH', Blockly.JavaScript.ORDER_ATOMIC);
    var contentType = Blockly.JavaScript.valueToCode(block, 'CONTENT_TYPE', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var code = 'sendTo(\'icloud' + instance + "', 'driveUploadFile', {\n";
    code += '  fileName: ' + (fileName || "''") + ',\n';
    code += '  base64: ' + (base64 || "''") + ',\n';
    if (folderPath) {
        code += '  folderPath: ' + folderPath + ' || undefined,\n';
    }
    if (contentType) {
        code += '  contentType: ' + contentType + ' || undefined,\n';
    }
    code += '}, function (result) {\n';
    if (logLevel) {
        code += "  console." + logLevel + "('iCloud driveUploadFile: ' + JSON.stringify(result));\n";
    }
    code += '});\n';
    return code;
};

// ══════════════════════════════════════════════════════════════════════════════
//  6) icloud_drive_get (download / read file, mainly images)
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Sendto.blocks['icloud_drive_get'] =
    '<sep gap="5"></sep>' +
    '<block type="icloud_drive_get">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="LOG"></field>' +
    '  <value name="FILE_PATH">' +
    '    <shadow type="text"><field name="TEXT">Documents/photo.jpg</field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_drive_get'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_drive_get'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('FILE_PATH').appendField(Blockly.Translate('icloud_drive_filePath'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setOutput(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_drive_get'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_drive_get'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var filePath = Blockly.JavaScript.valueToCode(block, 'FILE_PATH', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var resultVar = 'icloudDriveResult_' + Blockly.JavaScript.variableDB_.getDistinctName('data', Blockly.Variables.NAME_TYPE);

    var code = '(function () {\n';
    code += '  var ' + resultVar + ';\n';
    code += '  sendTo(\'icloud' + instance + "', 'driveGetFile', {\n";
    code += '    path: ' + (filePath || "''") + '\n';
    code += '  }, function (result) {\n';
    if (logLevel) {
        code += "    console." + logLevel + "('iCloud driveGetFile: ' + JSON.stringify(result));\n";
    }
    code += '    ' + resultVar + ' = result;\n';
    code += '  });\n';
    code += '  return ' + resultVar + ';\n';
    code += '})()';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// ══════════════════════════════════════════════════════════════════════════════
//  Translations — Calendar blocks
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Words['icloud_calendar_event'] = {
    en: 'iCloud Calendar: Event action',
    de: 'iCloud Kalender: Termin-Aktion',
    ru: 'iCloud Календарь: Действие с событием',
    pt: 'iCloud Calendário: Ação de evento',
    nl: 'iCloud Kalender: Evenement-actie',
    fr: 'iCloud Calendrier: Action événement',
    it: 'iCloud Calendario: Azione evento',
    es: 'iCloud Calendario: Acción de evento',
    pl: 'iCloud Kalendarz: Akcja wydarzenia',
    uk: 'iCloud Календар: Дія з подією',
    'zh-cn': 'iCloud 日历: 事件操作',
};
Blockly.Words['icloud_calendar_action_create'] = {
    en: 'Create',
    de: 'Erstellen',
    ru: 'Создать',
    pt: 'Criar',
    nl: 'Aanmaken',
    fr: 'Créer',
    it: 'Crea',
    es: 'Crear',
    pl: 'Utwórz',
    uk: 'Створити',
    'zh-cn': '创建',
};
Blockly.Words['icloud_calendar_action_delete'] = {
    en: 'Delete',
    de: 'Löschen',
    ru: 'Удалить',
    pt: 'Excluir',
    nl: 'Verwijderen',
    fr: 'Supprimer',
    it: 'Eliminare',
    es: 'Eliminar',
    pl: 'Usuń',
    uk: 'Видалити',
    'zh-cn': '删除',
};
Blockly.Words['icloud_calendar_guid'] = {
    en: 'Calendar GUID',
    de: 'Kalender-GUID',
    ru: 'GUID календаря',
    pt: 'GUID do calendário',
    nl: 'Kalender-GUID',
    fr: 'GUID du calendrier',
    it: 'GUID calendario',
    es: 'GUID del calendario',
    pl: 'GUID kalendarza',
    uk: 'GUID календаря',
    'zh-cn': '日历GUID',
};
Blockly.Words['icloud_event_guid'] = {
    en: 'Event GUID (for delete)',
    de: 'Termin-GUID (zum Löschen)',
    ru: 'GUID события (для удаления)',
    pt: 'GUID do evento (para excluir)',
    nl: 'Evenement-GUID (voor verwijderen)',
    fr: 'GUID événement (pour suppression)',
    it: 'GUID evento (per eliminare)',
    es: 'GUID del evento (para eliminar)',
    pl: 'GUID wydarzenia (do usunięcia)',
    uk: 'GUID події (для видалення)',
    'zh-cn': '事件GUID（用于删除）',
};
Blockly.Words['icloud_calendar_startDate'] = {
    en: 'Start date (timestamp)',
    de: 'Startdatum (Zeitstempel)',
    ru: 'Начало (метка времени)',
    pt: 'Data de início (timestamp)',
    nl: 'Startdatum (tijdstempel)',
    fr: 'Date de début (timestamp)',
    it: 'Data inizio (timestamp)',
    es: 'Fecha de inicio (timestamp)',
    pl: 'Data rozpoczęcia (znacznik czasu)',
    uk: 'Дата початку (часова мітка)',
    'zh-cn': '开始日期（时间戳）',
};
Blockly.Words['icloud_calendar_endDate'] = {
    en: 'End date (timestamp)',
    de: 'Enddatum (Zeitstempel)',
    ru: 'Конец (метка времени)',
    pt: 'Data de término (timestamp)',
    nl: 'Einddatum (tijdstempel)',
    fr: 'Date de fin (timestamp)',
    it: 'Data fine (timestamp)',
    es: 'Fecha de fin (timestamp)',
    pl: 'Data zakończenia (znacznik czasu)',
    uk: 'Дата закінчення (часова мітка)',
    'zh-cn': '结束日期（时间戳）',
};
Blockly.Words['icloud_calendar_allDay'] = {
    en: 'All day',
    de: 'Ganztägig',
    ru: 'Весь день',
    pt: 'Dia inteiro',
    nl: 'Hele dag',
    fr: 'Toute la journée',
    it: 'Tutto il giorno',
    es: 'Todo el día',
    pl: 'Cały dzień',
    uk: 'Весь день',
    'zh-cn': '全天',
};
Blockly.Words['icloud_calendar_location'] = {
    en: 'Location (optional)',
    de: 'Ort (optional)',
    ru: 'Место (необязательно)',
    pt: 'Local (opcional)',
    nl: 'Locatie (optioneel)',
    fr: 'Lieu (facultatif)',
    it: 'Luogo (opzionale)',
    es: 'Ubicación (opcional)',
    pl: 'Lokalizacja (opcjonalnie)',
    uk: 'Місце (необов\'язково)',
    'zh-cn': '位置（可选）',
};
Blockly.Words['icloud_calendar_alarmMinutes'] = {
    en: 'Alarm (minutes before, 0 = none)',
    de: 'Alarm (Minuten vorher, 0 = kein)',
    ru: 'Напоминание (минуты до, 0 = нет)',
    pt: 'Alarme (minutos antes, 0 = nenhum)',
    nl: 'Alarm (minuten voor, 0 = geen)',
    fr: 'Alarme (minutes avant, 0 = aucune)',
    it: 'Allarme (minuti prima, 0 = nessuno)',
    es: 'Alarma (minutos antes, 0 = ninguna)',
    pl: 'Alarm (minuty przed, 0 = brak)',
    uk: 'Нагадування (хвилин до, 0 = немає)',
    'zh-cn': '提醒（提前分钟数，0 = 无）',
};

// ══════════════════════════════════════════════════════════════════════════════
//  7) icloud_calendar_event (create / delete)
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Sendto.blocks['icloud_calendar_event'] =
    '<sep gap="5"></sep>' +
    '<block type="icloud_calendar_event">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="ACTION">create</field>' +
    '  <field name="ALL_DAY">FALSE</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="CALENDAR_GUID">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="TITLE">' +
    '    <shadow type="text"><field name="TEXT">My event</field></shadow>' +
    '  </value>' +
    '  <value name="START_DATE">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '  <value name="END_DATE">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '  <value name="EVENT_GUID">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="LOCATION">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="ALARM_MINUTES">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_calendar_event'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_calendar_event'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendDummyInput('ACTION')
            .appendField(Blockly.Translate('icloud_action'))
            .appendField(
                new Blockly.FieldDropdown([
                    [Blockly.Translate('icloud_calendar_action_create'), 'create'],
                    [Blockly.Translate('icloud_calendar_action_delete'), 'delete'],
                ]),
                'ACTION',
            );

        this.appendValueInput('CALENDAR_GUID').appendField(Blockly.Translate('icloud_calendar_guid'));

        this.appendValueInput('TITLE').appendField(Blockly.Translate('icloud_title'));

        this.appendValueInput('START_DATE').appendField(Blockly.Translate('icloud_calendar_startDate'));

        this.appendValueInput('END_DATE').appendField(Blockly.Translate('icloud_calendar_endDate'));

        this.appendDummyInput('ALL_DAY')
            .appendField(Blockly.Translate('icloud_calendar_allDay'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'ALL_DAY');

        this.appendValueInput('LOCATION').appendField(Blockly.Translate('icloud_calendar_location'));

        this.appendValueInput('ALARM_MINUTES').appendField(Blockly.Translate('icloud_calendar_alarmMinutes'));

        this.appendValueInput('EVENT_GUID').appendField(Blockly.Translate('icloud_event_guid'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_calendar_event'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_calendar_event'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var action = block.getFieldValue('ACTION');
    var calendarGuid = Blockly.JavaScript.valueToCode(block, 'CALENDAR_GUID', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var code;
    if (action === 'delete') {
        var eventGuid = Blockly.JavaScript.valueToCode(block, 'EVENT_GUID', Blockly.JavaScript.ORDER_ATOMIC);
        code = 'sendTo(\'icloud' + instance + "', 'deleteCalendarEvent', {\n";
        code += '  calendarGuid: ' + (calendarGuid || "''") + ',\n';
        code += '  eventGuid: ' + (eventGuid || "''") + '\n';
        code += '}, function (result) {\n';
        if (logLevel) {
            code += "  console." + logLevel + "('iCloud deleteCalendarEvent: ' + JSON.stringify(result));\n";
        }
        code += '});\n';
    } else {
        var title = Blockly.JavaScript.valueToCode(block, 'TITLE', Blockly.JavaScript.ORDER_ATOMIC);
        var startDate = Blockly.JavaScript.valueToCode(block, 'START_DATE', Blockly.JavaScript.ORDER_ATOMIC);
        var endDate = Blockly.JavaScript.valueToCode(block, 'END_DATE', Blockly.JavaScript.ORDER_ATOMIC);
        var allDay = block.getFieldValue('ALL_DAY') === 'TRUE';
        var location = Blockly.JavaScript.valueToCode(block, 'LOCATION', Blockly.JavaScript.ORDER_ATOMIC);
        var alarmMinutes = Blockly.JavaScript.valueToCode(block, 'ALARM_MINUTES', Blockly.JavaScript.ORDER_ATOMIC);

        code = 'sendTo(\'icloud' + instance + "', 'createCalendarEvent', {\n";
        code += '  calendarGuid: ' + (calendarGuid || "''") + ',\n';
        code += '  title: ' + (title || "''") + ',\n';
        code += '  startDate: ' + (startDate || '0') + ',\n';
        code += '  endDate: ' + (endDate || '0') + ',\n';
        code += '  allDay: ' + allDay + ',\n';
        if (location) {
            code += '  location: ' + location + ' || undefined,\n';
        }
        if (alarmMinutes) {
            code += '  alarms: (' + alarmMinutes + ' > 0) ? [{ before: true, minutes: ' + alarmMinutes + ', hours: 0, days: 0, weeks: 0, seconds: 0 }] : undefined,\n';
        }
        code += '}, function (result) {\n';
        if (logLevel) {
            code += "  console." + logLevel + "('iCloud createCalendarEvent: ' + JSON.stringify(result));\n";
        }
        code += '});\n';
    }
    return code;
};

// ══════════════════════════════════════════════════════════════════════════════
//  8) icloud_calendar_create_result  (Value-Block — returns result object)
// ══════════════════════════════════════════════════════════════════════════════

Blockly.Words['icloud_calendar_create_result'] = {
    en: 'iCloud Calendar: Create event (with result)',
    de: 'iCloud Kalender: Termin erstellen (mit Ergebnis)',
    ru: 'iCloud Календарь: Создать событие (с результатом)',
    pt: 'iCloud Calendário: Criar evento (com resultado)',
    nl: 'iCloud Kalender: Evenement aanmaken (met resultaat)',
    fr: 'iCloud Calendrier: Créer événement (avec résultat)',
    it: 'iCloud Calendario: Crea evento (con risultato)',
    es: 'iCloud Calendario: Crear evento (con resultado)',
    pl: 'iCloud Kalendarz: Utwórz wydarzenie (z wynikiem)',
    uk: 'iCloud Календар: Створити подію (з результатом)',
    'zh-cn': 'iCloud 日历: 创建事件（带返回值）',
};

Blockly.Sendto.blocks['icloud_calendar_create_result'] =
    '<sep gap="5"></sep>' +
    '<block type="icloud_calendar_create_result">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="ALL_DAY">FALSE</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="CALENDAR_GUID">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="TITLE">' +
    '    <shadow type="text"><field name="TEXT">My event</field></shadow>' +
    '  </value>' +
    '  <value name="START_DATE">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '  <value name="END_DATE">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '  <value name="LOCATION">' +
    '    <shadow type="text"><field name="TEXT"></field></shadow>' +
    '  </value>' +
    '  <value name="ALARM_MINUTES">' +
    '    <shadow type="math_number"><field name="NUM">0</field></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['icloud_calendar_create_result'] = {
    init: function () {
        var options = icloudGetInstances(Blockly.Translate('icloud_anyInstance'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('icloud_calendar_create_result'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('CALENDAR_GUID').appendField(Blockly.Translate('icloud_calendar_guid'));

        this.appendValueInput('TITLE').appendField(Blockly.Translate('icloud_title'));

        this.appendValueInput('START_DATE').appendField(Blockly.Translate('icloud_calendar_startDate'));

        this.appendValueInput('END_DATE').appendField(Blockly.Translate('icloud_calendar_endDate'));

        this.appendDummyInput('ALL_DAY')
            .appendField(Blockly.Translate('icloud_calendar_allDay'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'ALL_DAY');

        this.appendValueInput('LOCATION').appendField(Blockly.Translate('icloud_calendar_location'));

        this.appendValueInput('ALARM_MINUTES').appendField(Blockly.Translate('icloud_calendar_alarmMinutes'));

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('icloud_log'))
            .appendField(
                new Blockly.FieldDropdown([
                    ['none', ''],
                    ['debug', 'debug'],
                    ['info', 'info'],
                    ['warn', 'warn'],
                    ['error', 'error'],
                ]),
                'LOG',
            );

        this.setInputsInline(false);
        this.setOutput(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('icloud_calendar_create_result'));
        this.setHelpUrl(Blockly.Translate('icloud_help'));
    },
};

Blockly.JavaScript['icloud_calendar_create_result'] = function (block) {
    var instance = block.getFieldValue('INSTANCE');
    var calendarGuid = Blockly.JavaScript.valueToCode(block, 'CALENDAR_GUID', Blockly.JavaScript.ORDER_ATOMIC);
    var title = Blockly.JavaScript.valueToCode(block, 'TITLE', Blockly.JavaScript.ORDER_ATOMIC);
    var startDate = Blockly.JavaScript.valueToCode(block, 'START_DATE', Blockly.JavaScript.ORDER_ATOMIC);
    var endDate = Blockly.JavaScript.valueToCode(block, 'END_DATE', Blockly.JavaScript.ORDER_ATOMIC);
    var allDay = block.getFieldValue('ALL_DAY') === 'TRUE';
    var location = Blockly.JavaScript.valueToCode(block, 'LOCATION', Blockly.JavaScript.ORDER_ATOMIC);
    var alarmMinutes = Blockly.JavaScript.valueToCode(block, 'ALARM_MINUTES', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var resultVar =
        'icloudCalResult_' +
        Blockly.JavaScript.variableDB_.getDistinctName('data', Blockly.Variables.NAME_TYPE);

    var code = '(function () {\n';
    code += '  var ' + resultVar + ';\n';
    code += '  sendTo(\'icloud' + instance + "', 'createCalendarEvent', {\n";
    code += '    calendarGuid: ' + (calendarGuid || "''") + ',\n';
    code += '    title: ' + (title || "''") + ',\n';
    code += '    startDate: ' + (startDate || '0') + ',\n';
    code += '    endDate: ' + (endDate || '0') + ',\n';
    code += '    allDay: ' + allDay + ',\n';
    if (location) {
        code += '    location: ' + location + ' || undefined,\n';
    }
    if (alarmMinutes) {
        code +=
            '    alarms: (' +
            alarmMinutes +
            ' > 0) ? [{ before: true, minutes: ' +
            alarmMinutes +
            ', hours: 0, days: 0, weeks: 0, seconds: 0 }] : undefined,\n';
    }
    code += '  }, function (result) {\n';
    if (logLevel) {
        code += "    console." + logLevel + "('iCloud createCalendarEvent: ' + JSON.stringify(result));\n";
    }
    code += '    ' + resultVar + ' = result;\n';
    code += '  });\n';
    code += '  return ' + resultVar + ';\n';
    code += '})()';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};
