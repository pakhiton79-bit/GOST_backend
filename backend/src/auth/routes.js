// Аккаунты (этап 1, по указанию пользователя): почта + пароль, код
// подтверждения на почту при регистрации (и при восстановлении пароля).
// Лимиты и подписки - следующими этапами.
//
//   POST /api/auth/register { email, password }        - аккаунт + код на почту
//   POST /api/auth/verify   { email, code }            - подтверждение почты, вход
//   POST /api/auth/resend   { email, purpose }         - код ещё раз
//   POST /api/auth/login    { email, password }        - вход (почта не подтверждена - код)
//   POST /api/auth/logout                              - выход
//   GET  /api/auth/me                                  - кто вошёл
//   POST /api/auth/forgot   { email }                  - код для нового пароля
//   POST /api/auth/reset    { email, code, password }  - новый пароль, вход
//   POST /api/auth/device-replace { ticket, id }       - вход сверх лимита устройств:
//                                                        выйти на устройстве id и войти
//   GET  /api/auth/devices                             - устройства, где выполнен вход
//   POST /api/auth/devices/logout { id }               - выйти на устройстве
//
// Вход, когда устройств уже столько, сколько разрешает подписка (по
// указанию пользователя): вместо входа - список устройств, пользователь
// выбирает, где выйти (ответ { needDevice, ticket, devices }).
const express = require('express');
const store = require('./store');
const { hashPassword, verifyPassword, newCode, newToken, sha256, hashCode, sameHash } = require('./crypto');
const { sendCode } = require('./mailer');
const { startSession, endSession } = require('./session');
const { planOf, quotaInfo, syncUser } = require('./plans');
const stats = require('./stats');

const TICKET_TTL_MS = 10 * 60 * 1000; // выбрать устройство - в течение 10 минут
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
function isAdmin(user) {
  return !!user && ADMIN_EMAILS.includes(user.email);
}

const CODE_TTL_MS = 15 * 60 * 1000;   // код действует 15 минут
const CODE_MAX_ATTEMPTS = 5;          // столько попыток ввести код
const CODE_RESEND_MS = 60 * 1000;     // новый код - не чаще раза в минуту
const PASSWORD_MIN = 8;

// Ограничение частоты запросов с одного IP (защита от подбора паролей и
// кодов): не больше RATE_MAX запросов за RATE_WINDOW_MS.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const list = (hits.get(req.ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(req.ip, list);
    return res.status(429).json({ error: 'Слишком много попыток. Подождите несколько минут и попробуйте снова.' });
  }
  list.push(now);
  hits.set(req.ip, list);
  next();
}

function normEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}
function checkPassword(v) {
  const p = typeof v === 'string' ? v : '';
  if (p.length < PASSWORD_MIN) return `Пароль - не короче ${PASSWORD_MIN} символов.`;
  if (p.length > 200) return 'Пароль слишком длинный.';
  return null;
}

// Новый код на почту; не чаще раза в CODE_RESEND_MS. Возвращает текст ошибки
// или null.
async function issueCode(email, purpose) {
  const prev = store.getCode(email, purpose);
  if (prev && Date.now() - prev.sentAt < CODE_RESEND_MS) {
    const sec = Math.ceil((CODE_RESEND_MS - (Date.now() - prev.sentAt)) / 1000);
    return `Новый код можно запросить через ${sec} с.`;
  }
  const code = newCode();
  store.setCode(email, purpose, { hash: hashCode(email, code), expires: Date.now() + CODE_TTL_MS, attempts: 0, sentAt: Date.now() });
  await sendCode(email, code, purpose);
  return null;
}

// Проверка кода. Возвращает текст ошибки или null (код верный, удалён).
function checkCode(email, purpose, code) {
  const rec = store.getCode(email, purpose);
  if (!rec || rec.expires < Date.now()) return 'Код устарел или не запрашивался. Запросите новый.';
  if (rec.attempts >= CODE_MAX_ATTEMPTS) return 'Слишком много неверных попыток. Запросите новый код.';
  if (!sameHash(rec.hash, hashCode(email, String(code || '').trim()))) {
    rec.attempts += 1;
    store.setCode(email, purpose, rec);
    return 'Неверный код.';
  }
  store.deleteCode(email, purpose);
  return null;
}

function publicUser(u) {
  const now = Date.now();
  if (syncUser(u, now)) store.updateUser(u);
  return { email: u.email, createdAt: u.createdAt, quota: quotaInfo(u, now), isAdmin: isAdmin(u) };
}

function publicDevices(user, currentId) {
  return store.listUserSessions(user.id).map(s => ({
    id: s.id, label: s.label || 'Браузер', lastSeen: new Date(s.lastSeen || s.createdAt || Date.now()).toISOString(),
    current: s.id === currentId,
  }));
}

// Вход (пароль или код уже проверены): если устройств уже столько, сколько
// разрешает подписка, - пропуск и список устройств, иначе сессия.
function finishLogin(req, res, user) {
  const limit = planOf(user).devices;
  if (store.listUserSessions(user.id).length >= limit) {
    const ticket = newToken();
    store.setTicket(sha256(ticket), { userId: user.id, expires: Date.now() + TICKET_TTL_MS });
    return res.json({ ok: true, needDevice: true, ticket, limit, planName: planOf(user).name, devices: publicDevices(user, null) });
  }
  startSession(req, res, user.id);
  res.json({ ok: true, user: publicUser(user) });
}

const router = express.Router();

router.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

router.post('/register', rateLimit, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'Введите правильный адрес почты.' });
    const pErr = checkPassword(req.body.password);
    if (pErr) return res.status(400).json({ error: pErr });
    let user = store.findUserByEmail(email);
    if (user && user.verified) return res.status(409).json({ error: 'Аккаунт с этой почтой уже есть. Войдите или восстановите пароль.' });
    // Почта ещё не подтверждена - регистрацию можно пройти заново.
    if (user) store.updateUser(user, { passHash: hashPassword(req.body.password) });
    else user = store.createUser(email, hashPassword(req.body.password));
    const err = await issueCode(email, 'register');
    res.json({ ok: true, needVerify: true, notice: err || undefined });
  } catch (e) { next(e); }
});

router.post('/verify', rateLimit, (req, res) => {
  const email = normEmail(req.body.email);
  const user = email && store.findUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'Аккаунт не найден. Зарегистрируйтесь заново.' });
  const err = checkCode(email, 'register', req.body.code);
  if (err) return res.status(400).json({ error: err });
  store.updateUser(user, { verified: true });
  stats.recordRegistration(Date.now());
  finishLogin(req, res, user);
});

router.post('/resend', rateLimit, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    const purpose = req.body.purpose === 'reset' ? 'reset' : 'register';
    const user = email && store.findUserByEmail(email);
    // Для восстановления пароля не сообщаем, есть ли такой аккаунт.
    if (!user || (purpose === 'register' && user.verified)) {
      if (purpose === 'reset') return res.json({ ok: true });
      return res.status(400).json({ error: 'Аккаунт не найден или уже подтверждён.' });
    }
    const err = await issueCode(email, purpose);
    if (err) return res.status(429).json({ error: err });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/login', rateLimit, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    const user = email && store.findUserByEmail(email);
    if (!user || !verifyPassword(String(req.body.password || ''), user.passHash)) {
      return res.status(401).json({ error: 'Неверная почта или пароль.' });
    }
    if (!user.verified) {
      const err = await issueCode(email, 'register');
      return res.json({ ok: true, needVerify: true, notice: err || undefined });
    }
    finishLogin(req, res, user);
  } catch (e) { next(e); }
});

router.post('/device-replace', rateLimit, (req, res) => {
  const ticketHash = sha256(String(req.body.ticket || ''));
  const t = store.getTicket(ticketHash);
  const user = t && store.findUserById(t.userId);
  if (!user) return res.status(400).json({ error: 'Время на выбор устройства вышло. Войдите ещё раз.' });
  if (!store.deleteSessionById(user.id, String(req.body.id || ''))) {
    return res.status(400).json({ error: 'Это устройство уже не в аккаунте. Обновите список.', devices: publicDevices(user, null) });
  }
  store.deleteTicket(ticketHash);
  finishLogin(req, res, user);
});

router.get('/devices', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт.' });
  res.json({ devices: publicDevices(req.user, req.sessionId) });
});

router.post('/devices/logout', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт.' });
  const id = String(req.body.id || '');
  if (id === req.sessionId) return res.status(400).json({ error: 'Чтобы выйти на этом устройстве, нажмите «Выйти».' });
  store.deleteSessionById(req.user.id, id);
  res.json({ ok: true, devices: publicDevices(req.user, req.sessionId) });
});

router.post('/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

router.post('/forgot', rateLimit, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'Введите правильный адрес почты.' });
    const user = store.findUserByEmail(email);
    // Ответ одинаковый, есть аккаунт или нет, - чтобы по нему нельзя было
    // проверять чужие почты.
    if (user) {
      const err = await issueCode(email, 'reset');
      if (err) return res.status(429).json({ error: err });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/reset', rateLimit, (req, res) => {
  const email = normEmail(req.body.email);
  const user = email && store.findUserByEmail(email);
  const pErr = checkPassword(req.body.password);
  if (pErr) return res.status(400).json({ error: pErr });
  if (!user) return res.status(400).json({ error: 'Код устарел или не запрашивался. Запросите новый.' });
  const err = checkCode(email, 'reset', req.body.code);
  if (err) return res.status(400).json({ error: err });
  // Новый пароль: прежние входы на всех устройствах завершаются. Код пришёл
  // на почту - значит, почта подтверждена.
  store.updateUser(user, { passHash: hashPassword(req.body.password), verified: true });
  store.deleteUserSessions(user.id);
  startSession(req, res, user.id);
  res.json({ ok: true, user: publicUser(user) });
});

module.exports = { router, isAdmin };
