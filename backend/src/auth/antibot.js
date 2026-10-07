// Защита регистрации и восстановления пароля от ботов (по указанию
// пользователя): эти формы отправляют письма, и бот мог бы слать их на чужие
// адреса или массово заводить аккаунты ради бонусных расчётов.
//
//   1. Поле-ловушка: в форме есть скрытое поле website; человек его не видит
//      и не заполняет, бот - заполняет. Заполнено - запрос молча
//      «принимается», но ничего не делается.
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
  return String((req.body || {}).website || '').trim() !== '';
}

const POW_MAX = 100000;
const POW_TTL_MS = 10 * 60 * 1000;
const POW_SECRET = process.env.CAPTCHA_SECRET || crypto.randomBytes(32).toString('hex');
const powUsed = new Map(); // подпись -> срок; повторно ответ не принимается

const sha256hex = s => crypto.createHash('sha256').update(s).digest('hex');
const powSign = challenge => crypto.createHmac('sha256', POW_SECRET).update(challenge).digest('hex');

function createChallenge() {
  const salt = crypto.randomBytes(12).toString('hex') + '.' + (Date.now() + POW_TTL_MS);
  const challenge = sha256hex(salt + crypto.randomInt(0, POW_MAX + 1));
  return { salt, challenge, signature: powSign(challenge), maxnumber: POW_MAX };
}

// true - ответ на задачу верный. Токен - base64 от JSON
// { salt, number, challenge, signature }.
function verifyCaptcha(req) {
  let p;
  try { p = JSON.parse(Buffer.from(String((req.body || {}).captchaToken || ''), 'base64').toString('utf8')); } catch (e) { return false; }
  if (!p || typeof p.salt !== 'string' || typeof p.challenge !== 'string' || typeof p.signature !== 'string') return false;
  if (!Number.isInteger(p.number) || p.number < 0 || p.number > POW_MAX) return false;
  const expires = Number(p.salt.split('.')[1]);
  const now = Date.now();
  if (!(expires > now)) return false;
  if (sha256hex(p.salt + p.number) !== p.challenge) return false;
  const sig = powSign(p.challenge);
  if (sig.length !== p.signature.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(p.signature))) return false;
  for (const [k, t] of powUsed) if (t <= now) powUsed.delete(k);
  if (powUsed.has(sig)) return false;
  powUsed.set(sig, expires);
  return true;
}

const CAPTCHA_ERROR = 'Проверка «Я не робот» не пройдена. Попробуйте ещё раз.';
const DISPOSABLE_ERROR = 'Временные (одноразовые) почтовые ящики не принимаются. Укажите постоянную почту.';

module.exports = { isDisposableEmail, honeypotFilled, createChallenge, verifyCaptcha, CAPTCHA_ERROR, DISPOSABLE_ERROR };
