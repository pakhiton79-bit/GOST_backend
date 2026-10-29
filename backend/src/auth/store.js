// Аккаунты: хранилище - один JSON-файл (по указанию пользователя: пока сайт
// на бесплатном Render, где файлы стираются при перезапуске, это допустимо;
// при переезде на свой сервер хранилище заменяется базой данных, остальной
// код аккаунтов работает только через функции этого модуля).
//
// Каталог - DATA_DIR из окружения или backend/data (в git не попадает).
// Запись - во временный файл и переименование, чтобы файл не оставался
// недописанным.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'accounts.json');

let db = null;
let loadError = null;

// Файла нет - пустое хранилище (первый запуск). Файл есть, но не читается
// или повреждён - ошибка: сервер не работает с пустой базой, иначе первая же
// запись стёрла бы все данные (по указанию пользователя, после аудита).
// Испорченный файл один раз копируется рядом (accounts.json.corrupt-<время>).
function load() {
  if (db) return db;
  if (loadError) throw loadError;
  let raw = null;
  try {
    raw = fs.readFileSync(FILE, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') { loadError = new Error(`Файл данных ${FILE} не читается: ${e.message}`); throw loadError; }
  }
  if (raw === null) {
    db = {};
  } else {
    let parsed = null, why = '';
    try { parsed = JSON.parse(raw); } catch (e) { why = e.message; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const copy = `${FILE}.corrupt-${Date.now()}`;
      try { fs.copyFileSync(FILE, copy); } catch (e) { /* копия не обязательна */ }
      loadError = new Error(`Файл данных ${FILE} повреждён${why ? ` (${why})` : ''}; копия - ${copy}. `
        + 'Сервер не работает с пустой базой, чтобы не стереть данные: восстановите файл из резервной копии.');
      throw loadError;
    }
    db = parsed;
  }
  db.users = Array.isArray(db.users) ? db.users : [];
  db.sessions = db.sessions && typeof db.sessions === 'object' ? db.sessions : {};
  db.codes = db.codes && typeof db.codes === 'object' ? db.codes : {};
  db.tickets = db.tickets && typeof db.tickets === 'object' ? db.tickets : {};
  db.stats = db.stats && typeof db.stats === 'object' ? db.stats : {};
  db.stats.days = db.stats.days && typeof db.stats.days === 'object' ? db.stats.days : {};
  db.requests = Array.isArray(db.requests) ? db.requests : [];
  db.reports = Array.isArray(db.reports) ? db.reports : [];
  // Номер сообщения об ошибке (удаление из админки); старым записям без
  // номера - по порядку.
  db.nextReportId = Number.isInteger(db.nextReportId) ? db.nextReportId : 1;
  db.reports.forEach(r => { if (!Number.isInteger(r.id)) r.id = db.nextReportId++; });
  // Платежи (payments.js): номер счёта (InvId) -> запись (ykId - платёж ЮKassa).
  db.payments = db.payments && typeof db.payments === 'object' ? db.payments : {};
  db.nextInvId = Number.isInteger(db.nextInvId) ? db.nextInvId : 1;
  // IP (ipKey) -> времена выдачи бонуса за регистрацию (plans.js, WELCOME_PER_IP).
  db.welcomeIps = db.welcomeIps && typeof db.welcomeIps === 'object' ? db.welcomeIps : {};
  db.nextUserId = Number.isInteger(db.nextUserId) ? db.nextUserId : db.users.length + 1;
  return db;
}

// Запись: временный файл, сброс на диск (fsync), переименование - при сбое
// питания остаётся либо старый, либо новый файл целиком.
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  const fd = fs.openSync(tmp, 'w', 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(db));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, FILE);
}

// ---- Пользователи ----
function findUserByEmail(email) {
  return load().users.find(u => u.email === email) || null;
}
function findUserById(id) {
  return load().users.find(u => u.id === id) || null;
}
function createUser(email, passHash) {
  const d = load();
  const now = Date.now();
  const user = { id: d.nextUserId++, email, passHash, verified: false, createdAt: new Date(now).toISOString(), plan: 'free', planSince: now };
  d.users.push(user);
  save();
  return user;
}
function updateUser(user, fields) {
  Object.assign(user, fields || {});
  save();
  return user;
}
function listUsers() {
  return load().users.slice();
}
// Удалить аккаунт со всеми его входами, кодами и пропусками.
function deleteUser(user) {
  const d = load();
  d.users = d.users.filter(u => u.id !== user.id);
  Object.keys(d.sessions).forEach(k => { if (d.sessions[k].userId === user.id) delete d.sessions[k]; });
  Object.keys(d.tickets).forEach(k => { if (d.tickets[k].userId === user.id) delete d.tickets[k]; });
  Object.keys(d.codes).forEach(k => { if (k.endsWith(':' + user.email)) delete d.codes[k]; });
  save();
}

// ---- Сессии (ключ - хэш токена из cookie) ----
// Сессия = устройство (браузер, где выполнен вход): id - для списка
// устройств, label - браузер и система, lastSeen - последнее обращение.
function createSession(tokenHash, userId, expires, meta) {
  load().sessions[tokenHash] = { userId, expires, ...(meta || {}) };
  save();
}
function touchSession(tokenHash, now) {
  const s = load().sessions[tokenHash];
  if (s) { s.lastSeen = now; save(); }
}
// Действующие сессии пользователя, свежие - первыми.
function listUserSessions(userId) {
  const d = load(), now = Date.now();
  return Object.keys(d.sessions)
    .filter(k => d.sessions[k].userId === userId && d.sessions[k].expires > now)
    .map(k => ({ tokenHash: k, ...d.sessions[k] }))
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
}
function deleteSessionById(userId, id) {
  const d = load();
  const k = Object.keys(d.sessions).find(k => d.sessions[k].userId === userId && d.sessions[k].id === id);
  if (!k) return false;
  delete d.sessions[k];
  save();
  return true;
}
function getSession(tokenHash) {
  const s = load().sessions[tokenHash];
  if (!s) return null;
  if (s.expires < Date.now()) {
    delete db.sessions[tokenHash];
    save();
    return null;
  }
  return s;
}
function deleteSession(tokenHash) {
  if (load().sessions[tokenHash]) {
    delete db.sessions[tokenHash];
    save();
  }
}
function deleteUserSessions(userId) {
  const d = load();
  Object.keys(d.sessions).forEach(k => { if (d.sessions[k].userId === userId) delete d.sessions[k]; });
  save();
}

// ---- Коды подтверждения (ключ - почта + назначение) ----
function getCode(email, purpose) {
  return load().codes[purpose + ':' + email] || null;
}
function setCode(email, purpose, rec) {
  load().codes[purpose + ':' + email] = rec;
  save();
}
function deleteCode(email, purpose) {
  delete load().codes[purpose + ':' + email];
  save();
}

// ---- Пропуск на вход сверх лимита устройств (ключ - хэш): пароль уже
// проверен, осталось выбрать, на каком устройстве выйти. ----
function setTicket(ticketHash, rec) {
  const d = load(), now = Date.now();
  Object.keys(d.tickets).forEach(k => { if (d.tickets[k].expires < now) delete d.tickets[k]; });
  d.tickets[ticketHash] = rec;
  save();
}
function getTicket(ticketHash) {
  const t = load().tickets[ticketHash];
  return t && t.expires > Date.now() ? t : null;
}
function deleteTicket(ticketHash) {
  delete load().tickets[ticketHash];
  save();
}

// ---- Заявки на внутренние стандарты заводов (см. standards.js) ----
// Хранятся последние LIST_MAX заявок и сообщений (файл не растёт без конца).
const LIST_MAX = 2000;
function addRequest(rec) {
  const d = load();
  d.requests.push(rec);
  if (d.requests.length > LIST_MAX) d.requests.splice(0, d.requests.length - LIST_MAX);
  save();
}
function listRequests() {
  return load().requests.slice();
}

// ---- Сообщения об ошибках (см. feedback.js) ----
function addReport(rec) {
  const d = load();
  d.reports.push({ id: d.nextReportId++, ...rec });
  if (d.reports.length > LIST_MAX) d.reports.splice(0, d.reports.length - LIST_MAX);
  save();
}
// Сколько записей пользователь отправил за последние сутки (лимит в сутки -
// в feedback.js и standards.js).
function countRecentByUser(list, email, now) {
  return list.filter(r => r.userEmail === email && now - Date.parse(r.at) < 24 * 3600 * 1000).length;
}
function listReports() {
  return load().reports.slice();
}
// Удалить сообщение (админка); false - такого нет.
function deleteReport(id) {
  const d = load();
  const i = d.reports.findIndex(r => r.id === id);
  if (i < 0) return false;
  d.reports.splice(i, 1);
  save();
  return true;
}

// ---- Платежи (см. payments.js) ----
// Записи об оплатах не удаляются вместе с аккаунтом: это учёт доходов
// (чеки, возвраты, претензии).
function createPayment(rec) {
  const d = load();
  const id = d.nextInvId++;
  d.payments[id] = { id, ...rec };
  save();
  return d.payments[id];
}
function getPayment(id) {
  return load().payments[id] || null;
}
function updatePayment(rec, fields) {
  Object.assign(rec, fields || {});
  save();
  return rec;
}
function listPayments() {
  return Object.values(load().payments);
}

// ---- Очистка (по указанию пользователя, после аудита; раз в сутки, см.
// server.js): истёкшие входы и пропуски, коды, срок и суточный счётчик
// которых прошли, неподтверждённые аккаунты старше UNVERIFIED_DAYS дней.
// Возвращает, сколько записей удалено.
const UNVERIFIED_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;
const WELCOME_KEEP_MS = 30 * DAY_MS;   // = WELCOME_IP_DAYS в plans.js
function cleanup(now) {
  const d = load();
  let removed = 0;
  Object.keys(d.sessions).forEach(k => { if (!(d.sessions[k].expires > now)) { delete d.sessions[k]; removed++; } });
  Object.keys(d.tickets).forEach(k => { if (!(d.tickets[k].expires > now)) { delete d.tickets[k]; removed++; } });
  Object.keys(d.codes).forEach(k => {
    const c = d.codes[k];
    if (!(c.expires > now) && !(c.dayStart && now - c.dayStart < DAY_MS)) { delete d.codes[k]; removed++; }
  });
  const stale = d.users.filter(u => !u.verified && now - (Date.parse(u.createdAt) || now) > UNVERIFIED_DAYS * DAY_MS);
  stale.forEach(u => {
    d.users = d.users.filter(x => x.id !== u.id);
    Object.keys(d.codes).forEach(k => { if (k.endsWith(':' + u.email)) delete d.codes[k]; });
    removed++;
  });
  Object.keys(d.welcomeIps).forEach(k => {
    const list = d.welcomeIps[k].filter(t => now - t < WELCOME_KEEP_MS);
    if (list.length !== d.welcomeIps[k].length) removed++;
    if (list.length) d.welcomeIps[k] = list; else delete d.welcomeIps[k];
  });
  if (removed) save();
  return removed;
}

// ---- Бонус за регистрацию по IP ----
// Ключ: IPv4 целиком, IPv6 - первые 4 группы (сеть /64 обычно у одного
// абонента и меняется внутри неё).
function ipKey(ip) {
  const s = String(ip || '').replace(/^::ffff:/i, '');
  if (!s.includes(':')) return s;
  return s.split(':').slice(0, 4).join(':') + '::/64';
}
// true - бонус можно выдать (выдача записывается), false - лимит с этого IP
// за окно исчерпан. Удалённые аккаунты не освобождают место.
function takeWelcomeSlot(ip, now, perIp, windowMs) {
  const d = load();
  const key = ipKey(ip);
  const list = (d.welcomeIps[key] || []).filter(t => now - t < windowMs);
  if (list.length >= perIp) { d.welcomeIps[key] = list; save(); return false; }
  list.push(now);
  d.welcomeIps[key] = list;
  save();
  return true;
}

// ---- Статистика по дням (см. stats.js) ----
function statsData() {
  return load().stats;
}

module.exports = {
  load, save, statsData, cleanup,
  findUserByEmail, findUserById, createUser, updateUser, listUsers, deleteUser,
  createSession, touchSession, getSession, deleteSession, deleteUserSessions, listUserSessions, deleteSessionById,
  getCode, setCode, deleteCode,
  setTicket, getTicket, deleteTicket,
  addRequest, listRequests,
  addReport, listReports, deleteReport, countRecentByUser,
  takeWelcomeSlot,
  createPayment, getPayment, updatePayment, listPayments,
};
