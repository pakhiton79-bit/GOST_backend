// Счётчики защиты переживают перезапуск сайта (по указанию пользователя,
// после аудита): неверные пароли и частота запросов с IP (routes.js),
// использованные ответы капчи (antibot.js), суточные лимиты писем
// (mail-limits.js). Хранятся в DATA_DIR/limits.json - отдельно от
// accounts.json (часто меняются, в резервные копии не нужны).
//
// Модуль регистрирует часть: register(имя, dump, restore). dump() - данные
// для JSON, restore(data) - вернуть их после запуска. Запись - раз в
// SAVE_MS, если что-то изменилось, и при остановке службы (SIGTERM от
// systemd, SIGINT): после перезапуска теряется не больше SAVE_MS.
// Испорченный файл не мешает запуску - счётчики начинаются заново.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'limits.json');
const SAVE_MS = 10 * 1000;

let saved = {};
try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (e) {
  if (e.code !== 'ENOENT') console.error(`[лимиты] ${FILE} не читается, счётчики начинаются заново: ${e.message}`);
}
const parts = new Map(); // имя -> dump
let lastText = '';

function register(name, dump, restore) {
  parts.set(name, dump);
  if (saved[name] !== undefined) {
    try { restore(saved[name]); } catch (e) { console.error(`[лимиты] ${name}: не восстановлено: ${e.message}`); }
  }
}

function save() {
  const out = {};
  for (const [name, dump] of parts) out[name] = dump();
  const text = JSON.stringify(out);
  if (text === lastText) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, text, { mode: 0o600 });
    fs.renameSync(tmp, FILE);
    lastText = text;
  } catch (e) { console.error(`[лимиты] не сохранены: ${e.message}`); }
}

setInterval(save, SAVE_MS).unref();
for (const sig of ['SIGTERM', 'SIGINT']) process.once(sig, () => { save(); process.exit(0); });

// Map <-> массив пар для JSON.
const mapDump = m => [...m];
const mapRestore = (m, arr) => { m.clear(); if (Array.isArray(arr)) arr.forEach(([k, v]) => m.set(k, v)); };

module.exports = { register, save, mapDump, mapRestore };
