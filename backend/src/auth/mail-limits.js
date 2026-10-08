// Лимиты писем (по указанию пользователя: у почтового сервиса лимит около
// 100 писем в сутки - злоумышленник не должен израсходовать его запросами
// кодов). Сутки - по московскому времени, счётчики - в памяти сервера
// (после перезапуска начинаются заново, это допустимо).
//
//   - коды подтверждения: не больше CODES_PER_EMAIL в сутки на одну почту и
//     CODES_PER_IP с одного IP; всего - не больше доли CODE_SHARE от
//     суточного лимита, остальное - запас на письма в поддержку;
//   - письма в поддержку (заявки, сообщения об ошибках): то, что не
//     помещается в лимит, не отправляется письмом, но сохраняется и видно в
//     админке.
// MAIL_DAY_LIMIT (переменная окружения) - суточный лимит почтового сервиса,
// по умолчанию 100.
const CODES_PER_EMAIL = 5;
const CODES_PER_IP = 10;
const CODE_SHARE = 0.8;

function dayLimit() {
  const n = Number(process.env.MAIL_DAY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 100;
}
// Дата по Москве (UTC+3) - смена суток в полночь по Москве.
function mskDay(now) {
  return new Date(now + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

let day = '';
let codesTotal = 0, supportTotal = 0;
const byEmail = new Map(), byIp = new Map();
function roll(now) {
  const d = mskDay(now);
  if (d !== day) { day = d; codesTotal = 0; supportTotal = 0; byEmail.clear(); byIp.clear(); }
}

// Можно ли отправить код: null - можно (и письмо учтено), иначе текст ошибки.
function takeCode(email, ip, now) {
  roll(now);
  if ((byEmail.get(email) || 0) >= CODES_PER_EMAIL) return 'На эту почту сегодня уже отправлено много кодов. Попробуйте завтра.';
  if ((byIp.get(ip) || 0) >= CODES_PER_IP) return 'С этого устройства сегодня запрошено слишком много кодов. Попробуйте завтра.';
  if (codesTotal >= Math.floor(dayLimit() * CODE_SHARE)) return 'Отправка кодов на сегодня временно недоступна. Попробуйте завтра или напишите в поддержку.';
  codesTotal++;
  byEmail.set(email, (byEmail.get(email) || 0) + 1);
  byIp.set(ip, (byIp.get(ip) || 0) + 1);
  return null;
}
// Письмо не ушло - вернуть его в лимит.
function returnCode(email, ip) {
  codesTotal = Math.max(0, codesTotal - 1);
  if (byEmail.get(email)) byEmail.set(email, byEmail.get(email) - 1);
  if (byIp.get(ip)) byIp.set(ip, byIp.get(ip) - 1);
}
// Письмо в поддержку: true - можно отправить (учтено). Общий лимит суток
// на все письма не превышается.
function takeSupport(now) {
  roll(now);
  if (codesTotal + supportTotal >= dayLimit()) return false;
  supportTotal++;
  return true;
}

module.exports = { takeCode, returnCode, takeSupport };
