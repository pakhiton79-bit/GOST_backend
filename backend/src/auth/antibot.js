// Защита регистрации и восстановления пароля от ботов (по указанию
// пользователя): эти формы отправляют письма, и бот мог бы слать их на чужие
// адреса или массово заводить аккаунты ради бонусных расчётов.
//
//   1. Поле-ловушка: в форме есть скрытое поле trap; человек его не видит
//      и не заполняет, бот - заполняет. Имя нейтральное, чтобы браузер не
//      заполнял его сам. Заполнено - запрос молча «принимается», но ничего
//      не делается.
//   2. Одноразовые почтовые ящики (temp-mail и т.п.) при регистрации не
//      принимаются. Дополнить список можно переменной окружения
//      BLOCKED_EMAIL_DOMAINS (домены через запятую).
//   3. Своя капча (по указанию пользователя - без сторонних сервисов, данные
//      никуда не передаются): «доказательство работы», как в открытом
//      проекте ALTCHA. Сервер выдаёт задачу (GET /api/auth/challenge): соль
//      и SHA-256 от «соль + число», где число - случайное от 0 до POW_MAX,
//      плюс подпись HMAC. Браузер перебирает числа, пока хеш не совпадёт
//      (около секунды на телефоне), и присылает ответ с формой. Сервер
//      проверяет хеш, подпись, срок (10 минут) и что ответ ещё не
//      использовался. Ботам массовые запросы становятся дорогими.
//      CAPTCHA_SECRET (необязательно) - ключ подписи; без него ключ
//      случайный при каждом запуске (задачи, выданные до перезапуска,
//      просто перевыдаются).
//   4. Сложность по нагрузке (по указанию пользователя, после аудита):
//      обычно задача - до POW_MAX (около секунды на телефоне). Много задач
//      с одного IP или много проверок по всему сайту за POW_WINDOW_MS -
//      задача в 4 или в 10 раз длиннее (powLevel): людям - пара секунд
//      ожидания, массовому боту - намного дороже.
//   5. Минимальное время заполнения формы: регистрация и восстановление
//      пароля принимаются не раньше чем через MIN_FILL_MS после выдачи
//      задачи (задача выдаётся, когда форма показана). Страница сама
//      дожидается этого времени (js/account/pow.js), человек не замечает;
//      бот, отправляющий форму сразу, - не проходит.
const crypto = require('crypto');

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '20minutemail.com', '1secmail.com', '1secmail.net', '1secmail.org',
  'burnermail.io', 'cool.fr.nf', 'crazymailing.com', 'discard.email', 'dispostable.com', 'dropmail.me',
  'emailfake.com', 'emailondeck.com', 'fakeinbox.com', 'getnada.com', 'grr.la', 'guerrillamail.biz',
  'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamailblock.com', 'harakirimail.com', 'inboxkitten.com', 'jetable.org', 'mail.tm', 'mailcatch.com',
  'maildrop.cc', 'mailinator.com', 'mailinator.net', 'mailnesia.com', 'mailpoof.com', 'mintemail.com',
  'minuteinbox.com', 'moakt.com', 'mohmal.com', 'mytemp.email', 'pokemail.net', 'sharklasers.com',
  'spam4.me', 'spamgourmet.com', 'tempail.com', 'temp-mail.io', 'temp-mail.org', 'tempinbox.com',
  'tempmail.com', 'tempmail.net', 'tempmailo.com', 'tempr.email', 'throwawaymail.com', 'tmail.ws',
  'tmpmail.net', 'tmpmail.org', 'trash-mail.com', 'trashmail.com', 'trashmail.de', 'trashmail.net',
  'wegwerfmail.de', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
]);
function blockedDomains() {
  const extra = String(process.env.BLOCKED_EMAIL_DOMAINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return extra.length ? new Set([...DISPOSABLE_DOMAINS, ...extra]) : DISPOSABLE_DOMAINS;
}
// Домен почты или его родитель - в списке (sub.yopmail.com тоже).
function isDisposableEmail(email) {
  const set = blockedDomains();
  const parts = String(email).split('@').pop().toLowerCase().split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (set.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

function honeypotFilled(req) {
  return String((req.body || {}).trap || '').trim() !== '';
}

const POW_MAX = 100000;                  // обычная сложность
const POW_TOP = POW_MAX * 10;            // самая высокая (powLevel)
const POW_TTL_MS = 10 * 60 * 1000;
const POW_WINDOW_MS = 10 * 60 * 1000;    // окно подсчёта нагрузки
const IP_EASY = 5, IP_HARD = 15;         // задач с одного IP за окно: до 5 - обычная, до 15 - ×4, больше - ×10
const ALL_EASY = 30, ALL_HARD = 100;     // пройденных проверок по всему сайту за окно: так же
const MIN_FILL_MS = 3000;
const POW_SECRET = process.env.CAPTCHA_SECRET || crypto.randomBytes(32).toString('hex');
const powUsed = new Map(); // подпись -> срок; повторно ответ не принимается
const powByIp = new Map(); // ip -> времена выдачи задач (за окно)
let powPassed = [];        // времена пройденных проверок (за окно)
// Использованные ответы помнятся и после перезапуска (limits-file.js): с
// постоянным CAPTCHA_SECRET старый ответ иначе прошёл бы ещё раз.
const limitsFile = require('./limits-file');
limitsFile.register('captchaUsed', () => limitsFile.mapDump(powUsed), d => limitsFile.mapRestore(powUsed, d));
limitsFile.register('captchaLoad', () => ({ byIp: limitsFile.mapDump(powByIp), passed: powPassed }), d => {
  limitsFile.mapRestore(powByIp, d.byIp);
  powPassed = Array.isArray(d.passed) ? d.passed : [];
});
const recent = (list, now) => (list || []).filter(t => now - t < POW_WINDOW_MS);
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of powByIp) { const r = recent(list, now); if (r.length) powByIp.set(ip, r); else powByIp.delete(ip); }
  powPassed = recent(powPassed, now);
}, POW_WINDOW_MS).unref();

// Сложность задачи: 1 (обычная), 4 или 10 - по числу задач с этого IP и
// пройденных проверок по всему сайту за окно.
function powLevel(ipCount, allCount) {
  if (ipCount > IP_HARD || allCount > ALL_HARD) return 10;
  if (ipCount > IP_EASY || allCount > ALL_EASY) return 4;
  return 1;
}

const sha256hex = s => crypto.createHash('sha256').update(s).digest('hex');
const powSign = challenge => crypto.createHmac('sha256', POW_SECRET).update(challenge).digest('hex');

function createChallenge(ip) {
  const now = Date.now();
  const list = recent(powByIp.get(ip), now);
  list.push(now);
  powByIp.set(ip, list);
  const max = POW_MAX * powLevel(list.length, recent(powPassed, now).length);
  if (max > POW_MAX) console.log(`[капча] сложность ×${max / POW_MAX} для IP ${ip} (задач за 10 мин: ${list.length}, проверок по сайту: ${recent(powPassed, now).length})`);
  const salt = crypto.randomBytes(12).toString('hex') + '.' + (now + POW_TTL_MS);
  const challenge = sha256hex(salt + crypto.randomInt(0, max + 1));
  return { salt, challenge, signature: powSign(challenge), maxnumber: max };
}

// true - ответ на задачу верный (и с выдачи задачи прошло не меньше
// minFillMs). Токен - base64 от JSON { salt, number, challenge, signature }.
function verifyCaptcha(req, minFillMs = 0) {
  let p;
  try { p = JSON.parse(Buffer.from(String((req.body || {}).captchaToken || ''), 'base64').toString('utf8')); } catch (e) { return false; }
  if (!p || typeof p.salt !== 'string' || typeof p.challenge !== 'string' || typeof p.signature !== 'string') return false;
  if (!Number.isInteger(p.number) || p.number < 0 || p.number > POW_TOP) return false;
  const expires = Number(p.salt.split('.')[1]);
  const now = Date.now();
  if (!(expires > now)) return false;
  // Слишком быстро после выдачи задачи - форму отправил не человек.
  if (now - (expires - POW_TTL_MS) < minFillMs) {
    console.log(`[капча] форма отправлена через ${now - (expires - POW_TTL_MS)} мс после показа - отклонено (IP ${req.ip})`);
    return false;
  }
  if (sha256hex(p.salt + p.number) !== p.challenge) return false;
  const sig = powSign(p.challenge);
  if (sig.length !== p.signature.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(p.signature))) return false;
  for (const [k, t] of powUsed) if (t <= now) powUsed.delete(k);
  if (powUsed.has(sig)) return false;
  powUsed.set(sig, expires);
  // Нагрузка - по формам (регистрация, восстановление), не по показу почты поддержки.
  if (minFillMs) powPassed.push(now);
  return true;
}

const CAPTCHA_ERROR = 'Проверка «Я не робот» не пройдена. Попробуйте ещё раз.';
const DISPOSABLE_ERROR = 'Временные (одноразовые) почтовые ящики не принимаются. Укажите постоянную почту.';

module.exports = { isDisposableEmail, honeypotFilled, createChallenge, verifyCaptcha, MIN_FILL_MS, CAPTCHA_ERROR, DISPOSABLE_ERROR };
