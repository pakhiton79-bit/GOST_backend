// Аккаунты (этап 1, по указанию пользователя): почта + пароль, код
// подтверждения на почту при регистрации (и при восстановлении пароля).
// Лимиты и подписки - следующими этапами.
//
//   GET  /api/auth/challenge                           - задача капчи «Я не робот» (antibot.js)
//   POST /api/auth/register { email, password, consents, website, captchaToken }
//                                                      - аккаунт + код на почту
//                                                        (consents: terms, pd - обязательно; marketing - legal.js;
//                                                        website - поле-ловушка, captchaToken - ответ капчи)
//   POST /api/auth/verify   { email, code }            - подтверждение почты, вход
//   POST /api/auth/resend   { email, purpose }         - код ещё раз
//   POST /api/auth/login    { email, password }        - вход (почта не подтверждена - код)
//   POST /api/auth/logout                              - выход
//   GET  /api/auth/me                                  - кто вошёл
//   POST /api/auth/forgot   { email, website, captchaToken } - код для нового пароля
//   POST /api/auth/reset    { email, code, password }  - новый пароль, вход
//   POST /api/auth/device-replace { ticket, id }       - вход сверх лимита устройств:
//                                                        выйти на устройстве id и войти
//   GET  /api/auth/devices                             - устройства, где выполнен вход
//   POST /api/auth/devices/logout { id }               - выйти на устройстве
//   POST /api/auth/delete   { password }               - удалить свой аккаунт
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
const { consentsFromRequest } = require('./legal');
const antibot = require('./antibot');

const TICKET_TTL_MS = 10 * 60 * 1000; // выбрать устройство - в течение 10 минут
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
function isAdmin(user) {
  return !!user && ADMIN_EMAILS.includes(user.email);
}

const CODE_TTL_MS = 15 * 60 * 1000;   // код действует 15 минут
const CODE_MAX_ATTEMPTS = 5;          // столько попыток ввести код
const CODE_RESEND_MS = 60 * 1000;     // новый код - не чаще раза в минуту
// Защита от подбора кода через повторные запросы: не больше CODE_DAY_FAILS
// неверных кодов за сутки на почту и назначение, дальше - пауза до конца суток
// (счётчик переносится в каждый новый код).
const CODE_DAY_MS = 24 * 3600 * 1000;
const CODE_DAY_FAILS = 15;
// Подбор пароля: после LOGIN_MAX_FAILS неверных паролей подряд вход в этот
// аккаунт - через LOGIN_LOCK_MS (восстановление пароля снимает паузу).
const LOGIN_MAX_FAILS = 10;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const PASSWORD_MIN = 8;

// Ограничение частоты запросов с одного IP (защита от подбора паролей и
// кодов): не больше RATE_MAX запросов за RATE_WINDOW_MS.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
const hits = new Map();
// Раз в 10 минут - убрать IP без свежих запросов (таблица не растёт без конца).
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (!list.length || now - list[list.length - 1] >= RATE_WINDOW_MS) hits.delete(ip);
}, RATE_WINDOW_MS).unref();
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
function codeDayWindow(rec, now) {
  return rec && rec.dayStart && now - rec.dayStart < CODE_DAY_MS ? { dayStart: rec.dayStart, dayFails: rec.dayFails || 0 } : { dayStart: now, dayFails: 0 };
}
function codeLockText(rec, now) {
  const w = codeDayWindow(rec, now);
  if (w.dayFails < CODE_DAY_FAILS) return null;
  return `Слишком много неверных кодов. Попробуйте через ${Math.ceil((w.dayStart + CODE_DAY_MS - now) / 3600000)} ч.`;
}
async function issueCode(email, purpose) {
  const prev = store.getCode(email, purpose);
  const lock = codeLockText(prev, Date.now());
  if (lock) return lock;
  if (prev && Date.now() - prev.sentAt < CODE_RESEND_MS) {
    const sec = Math.ceil((CODE_RESEND_MS - (Date.now() - prev.sentAt)) / 1000);
    return `Новый код можно запросить через ${sec} с.`;
  }
  const code = newCode();
  const rec = { hash: hashCode(email, code), expires: Date.now() + CODE_TTL_MS, attempts: 0, sentAt: Date.now(), ...codeDayWindow(prev, Date.now()) };
  store.setCode(email, purpose, rec);
  try {
    await sendCode(email, code, purpose);
  } catch (e) {
    // Письмо не ушло - код не действует, повторный запрос сразу (счётчик
    // неверных кодов за сутки сохраняется).
    console.error(`[почта] код не отправлен (${email}): ${e.message}`);
    store.setCode(email, purpose, { ...rec, expires: 0, sentAt: 0 });
    return 'Не удалось отправить письмо с кодом. Попробуйте ещё раз через минуту.';
  }
  return null;
}

// Проверка кода. Возвращает текст ошибки или null (код верный, удалён).
function checkCode(email, purpose, code) {
  const rec = store.getCode(email, purpose);
  const now = Date.now();
  const lock = codeLockText(rec, now);
  if (lock) return lock;
  if (!rec || rec.expires < now) return 'Код устарел или не запрашивался. Запросите новый.';
  if (rec.attempts >= CODE_MAX_ATTEMPTS) return 'Слишком много неверных попыток. Запросите новый код.';
  if (!sameHash(rec.hash, hashCode(email, String(code || '').trim()))) {
    const w = codeDayWindow(rec, now);
    Object.assign(rec, { attempts: rec.attempts + 1, dayStart: w.dayStart, dayFails: w.dayFails + 1 });
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

// Заблокированный аккаунт (admin.js): вход запрещён, причина - в сообщении.
function blockedError(user) {
  const why = user.blocked.reason ? ` Причина: ${user.blocked.reason}.` : '';
  return { error: `Аккаунт заблокирован.${why} Если вы считаете это ошибкой, напишите на почту, указанную в Пользовательском соглашении.`, blocked: true };
}

// Вход (пароль или код уже проверены): если устройств уже столько, сколько
// разрешает подписка, - пропуск и список устройств, иначе сессия.
function finishLogin(req, res, user) {
  if (user.blocked) return res.status(403).json(blockedError(user));
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

router.get('/challenge', (req, res) => {
  res.json(antibot.createChallenge());
});

router.post('/register', rateLimit, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'Введите правильный адрес почты.' });
    const pErr = checkPassword(req.body.password);
    if (pErr) return res.status(400).json({ error: pErr });
    const legal = consentsFromRequest(req);
    if (legal.error) return res.status(400).json({ error: legal.error });
    // Бот заполнил поле-ловушку - ответ как при успехе, но ничего не делаем.
    if (antibot.honeypotFilled(req)) return res.json({ ok: true, needVerify: true });
    if (!antibot.verifyCaptcha(req)) return res.status(400).json({ error: antibot.CAPTCHA_ERROR, captcha: true });
    if (antibot.isDisposableEmail(email)) return res.status(400).json({ error: antibot.DISPOSABLE_ERROR });
    // Хеш - до обращения к хранилищу: дальше без await, чтобы два
    // одновременных запроса не создали два аккаунта с одной почтой.
    const passHash = await hashPassword(req.body.password);
    let user = store.findUserByEmail(email);
    if (user && user.verified) return res.status(409).json({ error: 'Аккаунт с этой почтой уже есть. Войдите с паролем или восстановите его на странице входа.', exists: true });
    // Почта ещё не подтверждена - регистрацию можно пройти заново.
    if (user) store.updateUser(user, { passHash });
    else user = store.createUser(email, passHash);
    store.updateUser(user, { consents: legal.consents });
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
    if (!email) return res.status(400).json({ error: 'Введите правильный адрес почты.' });
    const user = store.findUserByEmail(email);
    // По указанию пользователя: аккаунта нет - так и сообщаем (а не «неверные
    // данные»), с предложением зарегистрироваться.
    if (!user) return res.status(404).json({ error: 'Аккаунта с такой почтой нет. Проверьте адрес или зарегистрируйтесь.', noAccount: true });
    const lockLeft = (user.loginLockUntil || 0) - Date.now();
    if (lockLeft > 0) {
      return res.status(429).json({ error: `Слишком много неверных паролей. Попробуйте через ${Math.ceil(lockLeft / 60000)} мин. или восстановите пароль.` });
    }
    if (!(await verifyPassword(String(req.body.password || ''), user.passHash))) {
      const fails = (user.loginFails || 0) + 1;
      if (fails >= LOGIN_MAX_FAILS) {
        store.updateUser(user, { loginFails: 0, loginLockUntil: Date.now() + LOGIN_LOCK_MS });
        return res.status(429).json({ error: `Слишком много неверных паролей. Попробуйте через ${LOGIN_LOCK_MS / 60000} мин. или восстановите пароль.` });
      }
      store.updateUser(user, { loginFails: fails });
      return res.status(401).json({ error: 'Неверный пароль. Попробуйте ещё раз или восстановите пароль.' });
    }
    if (user.loginFails || user.loginLockUntil) store.updateUser(user, { loginFails: 0, loginLockUntil: 0 });
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

// Удаление своего аккаунта (по указанию пользователя) - с подтверждением
// паролем. Удаляются аккаунт, подписка, счётчики, входы на всех устройствах.
router.post('/delete', rateLimit, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт.' });
    if (!(await verifyPassword(String(req.body.password || ''), req.user.passHash))) {
      return res.status(401).json({ error: 'Неверный пароль.' });
    }
    store.deleteUser(req.user);
    endSession(req, res);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

router.post('/forgot', rateLimit, async (req, res, next) => {
  try {
    const email = normEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'Введите правильный адрес почты.' });
    if (antibot.honeypotFilled(req)) return res.json({ ok: true });
    if (!antibot.verifyCaptcha(req)) return res.status(400).json({ error: antibot.CAPTCHA_ERROR, captcha: true });
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

router.post('/reset', rateLimit, async (req, res, next) => {
  try {
    const pErr = checkPassword(req.body.password);
    if (pErr) return res.status(400).json({ error: pErr });
    // Хеш - заранее, дальше без await (см. /register).
    const passHash = await hashPassword(req.body.password);
    const email = normEmail(req.body.email);
    const user = email && store.findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'Код устарел или не запрашивался. Запросите новый.' });
    const err = checkCode(email, 'reset', req.body.code);
    if (err) return res.status(400).json({ error: err });
    // Новый пароль: прежние входы на всех устройствах завершаются, пауза
    // после неверных паролей снимается. Код пришёл на почту - значит,
    // почта подтверждена.
    store.updateUser(user, { passHash, verified: true, loginFails: 0, loginLockUntil: 0 });
    store.deleteUserSessions(user.id);
    if (user.blocked) return res.status(403).json(blockedError(user));
    startSession(req, res, user.id);
    res.json({ ok: true, user: publicUser(user) });
  } catch (e) { next(e); }
});

module.exports = { router, isAdmin, rateLimit };
