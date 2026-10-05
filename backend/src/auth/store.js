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
  const user = { id: d.nextUserId++, email, passHash, verified: false, plan: 'free', createdAt: new Date().toISOString() };
  d.users.push(user);
  save();
  return user;
}
function updateUser(user, fields) {
  Object.assign(user, fields);
  save();
  return user;
}

// ---- Сессии (ключ - хэш токена из cookie) ----
function createSession(tokenHash, userId, expires) {
  load().sessions[tokenHash] = { userId, expires };
  save();
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

module.exports = {
  findUserByEmail, findUserById, createUser, updateUser,
  createSession, getSession, deleteSession, deleteUserSessions,
  getCode, setCode, deleteCode,
};
