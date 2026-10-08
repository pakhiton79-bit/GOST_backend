// Аккаунты: сессия входа - случайный токен в cookie sid (HttpOnly, недоступен
// скриптам страницы), на сервере - его хэш, срок и данные устройства.
// attachUser кладёт в req.user вошедшего пользователя (или null), в
// req.sessionId - id его сессии.
const crypto = require('crypto');
const store = require('./store');
const { newToken, sha256 } = require('./crypto');
const { syncUser, planOf } = require('./plans');

const COOKIE = 'sid';
const SESSION_DAYS = 30;
const TOUCH_MS = 5 * 60 * 1000; // «последний раз» обновляется не чаще раза в 5 минут

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    // Испорченное значение (не по правилам кодирования) - пропускаем, а не
    // роняем запрос.
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { /* пропуск */ }
  });
  return out;
}

function cookieAttrs(req, maxAgeSec) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}` + (req.secure ? '; Secure' : '');
}

// Название устройства для списка: браузер и система по User-Agent.
function deviceLabel(ua) {
  ua = String(ua || '');
  const browser = /YaBrowser/.test(ua) ? 'Яндекс Браузер' : /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Браузер';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser}, ${os}` : browser;
}

function startSession(req, res, userId) {
  const token = newToken();
  const maxAge = SESSION_DAYS * 24 * 3600;
  const now = Date.now();
  store.createSession(sha256(token), userId, now + maxAge * 1000, {
    id: crypto.randomBytes(8).toString('hex'),
    label: deviceLabel(req.get('user-agent')),
    createdAt: now, lastSeen: now,
  });
  res.append('Set-Cookie', `${COOKIE}=${token}; ${cookieAttrs(req, maxAge)}`);
}

function endSession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) store.deleteSession(sha256(token));
  res.append('Set-Cookie', `${COOKIE}=; ${cookieAttrs(req, 0)}`);
}

function attachUser(req, res, next) {
  req.user = null;
  req.sessionId = null;
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) {
    const hash = sha256(token);
    const s = store.getSession(hash);
    const user = s && store.findUserById(s.userId);
    if (user && user.verified && !user.blocked) {
      const now = Date.now();
      if (syncUser(user, now)) {
        store.updateUser(user);
        // Подписка закончилась (стала пробной) - входов больше, чем разрешает
        // подписка, быть не может: выход на самых давних.
        store.listUserSessions(user.id).slice(planOf(user).devices).forEach(x => store.deleteSessionById(user.id, x.id));
      }
      if (!store.getSession(hash)) return next();
      if (!s.lastSeen || now - s.lastSeen > TOUCH_MS) store.touchSession(hash, now);
      req.user = user;
      req.sessionId = s.id;
    }
  }
  next();
}

module.exports = { startSession, endSession, attachUser, deviceLabel };
