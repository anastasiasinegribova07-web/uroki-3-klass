// Скрипт для Google-таблицы сайта sayt-uroki.
// Вставляется в таблицу: Расширения → Apps Script.
// Лист «Отметки»: одна строка на урок (последнее состояние).
// Лист «История»: каждая правка отдельной строкой.
// Лист «Уроки»: содержание уроков, сайт его только читает.

var HEAD = ['Урок', 'Проведён', 'Заметка', 'Кто', 'Когда'];

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('A:E').setNumberFormat('@'); // всё как текст
  }
  return sh;
}

// Текст, который таблица не примет за формулу
function safe_(s, max) {
  s = String(s == null ? '' : s).slice(0, max);
  return /^[=+\-@]/.test(s) ? ' ' + s : s;
}

function readMarks_() {
  var rows = getSheet_('Отметки').getDataRange().getDisplayValues();
  var marks = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    marks[r[0]] = { done: r[1] === 'да', note: r[2].replace(/^ (?=[=+\-@])/, ''), who: r[3], when: r[4] };
  }
  return marks;
}

// Лист «Уроки»: тема, конспект, ДЗ и ссылки. Заполняет учитель.
// Столбцы: Дата, Предмет, Тема, Краткий конспект, Домашнее задание,
// Конспект (ссылка), Презентация (ссылка), Рабочий лист (ссылка)
function readLessons_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Уроки');
  if (!sh) return [];
  var rows = sh.getDataRange().getDisplayValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0] || !r[1]) continue;
    out.push({ date: r[0], subject: r[1], topic: r[2] || '', summary: r[3] || '',
      homework: r[4] || '', konspekt: r[5] || '', prezentaciya: r[6] || '', list: r[7] || '' });
  }
  return out;
}

function answer_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Сайт спрашивает все отметки
function doGet() {
  return answer_({ ok: true, marks: readMarks_(), lessons: readLessons_() });
}

// Сайт присылает изменения
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var changes = JSON.parse(e.postData.contents).changes || [];
    var sh = getSheet_('Отметки');
    var log = getSheet_('История');
    var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(function (r) { return r[0]; });
    var when = Utilities.formatDate(new Date(),
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'dd.MM.yyyy HH:mm');

    changes.slice(0, 100).forEach(function (c) {
      var id = safe_(c.id, 80);
      if (!id) return;
      var row = [id, c.done ? 'да' : '', safe_(c.note, 2000), safe_(c.who, 40), when];
      var at = ids.indexOf(id);
      if (at === -1) { sh.appendRow(row); ids.push(id); }
      else sh.getRange(at + 1, 1, 1, row.length).setValues([row]);
      log.appendRow(row);
    });
    return answer_({ ok: true, marks: readMarks_(), lessons: readLessons_() });
  } catch (err) {
    return answer_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
