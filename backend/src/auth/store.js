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

function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    db = {};
  }
  db.users = Array.isArray(db.users) ? db.users : [];
  db.sessions = db.sessions && typeof db.sessions === 'object' ? db.sessions : {};
  db.codes = db.codes && typeof db.codes === 'object' ? db.codes : {};
  db.tickets = db.tickets && typeof db.tickets === 'object' ? db.tickets : {};
  db.stats = db.stats && typeof db.stats === 'object' ? db.stats : {};
  db.stats.days = db.stats.days && typeof db.stats.days === 'object' ? db.stats.days : {};
  db.nextUserId = Number.isInteger(db.nextUserId) ? db.nextUserId : db.users.length + 1;
  return db;
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
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

// ---- Статистика по дням (см. stats.js) ----
function statsData() {
  return load().stats;
}

module.exports = {
  save, statsData,
  findUserByEmail, findUserById, createUser, updateUser, listUsers, deleteUser,
  createSession, touchSession, getSession, deleteSession, deleteUserSessions, listUserSessions, deleteSessionById,
  getCode, setCode, deleteCode,
  setTicket, getTicket, deleteTicket,
};
