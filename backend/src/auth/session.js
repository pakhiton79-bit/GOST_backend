// Аккаунты: сессия входа - случайный токен в cookie sid (HttpOnly, недоступен
// скриптам страницы), на сервере - его хэш и срок. attachUser кладёт в
// req.user вошедшего пользователя (или null).
const store = require('./store');
const { newToken, sha256 } = require('./crypto');

const COOKIE = 'sid';
const SESSION_DAYS = 30;

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function cookieAttrs(req, maxAgeSec) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}` + (req.secure ? '; Secure' : '');
}

function startSession(req, res, userId) {
  const token = newToken();
  const maxAge = SESSION_DAYS * 24 * 3600;
  store.createSession(sha256(token), userId, Date.now() + maxAge * 1000);
  res.append('Set-Cookie', `${COOKIE}=${token}; ${cookieAttrs(req, maxAge)}`);
}

function endSession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) store.deleteSession(sha256(token));
  res.append('Set-Cookie', `${COOKIE}=; ${cookieAttrs(req, 0)}`);
}

function attachUser(req, res, next) {
  req.user = null;
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) {
    const s = store.getSession(sha256(token));
    const user = s && store.findUserById(s.userId);
    if (user && user.verified) req.user = user;
  }
  next();
}

module.exports = { startSession, endSession, attachUser };
