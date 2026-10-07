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
//   3. Yandex SmartCaptcha («Я не робот»). Включается, когда в окружении
//      заданы оба ключа из консоли Yandex Cloud:
//        YANDEX_CAPTCHA_CLIENT_KEY - ключ клиента (виден на странице);
//        YANDEX_CAPTCHA_SERVER_KEY - ключ сервера (секретный).
//      Без ключей капча не показывается и не проверяется. Если сервис капчи
//      недоступен (сбой сети, ошибка на их стороне), запрос пропускается,
//      чтобы люди не остались без регистрации (ловушка и лимит запросов
//      продолжают работать).
const CAPTCHA_HOST = process.env.YANDEX_CAPTCHA_HOST || 'smartcaptcha.cloud.yandex.ru';

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

function captchaConfig() {
  const client = process.env.YANDEX_CAPTCHA_CLIENT_KEY || '';
  const server = process.env.YANDEX_CAPTCHA_SERVER_KEY || '';
  return { enabled: Boolean(client && server), client, server };
}
// Для страницы входа: ключ клиента и адрес скрипта (пусто - капчи нет).
function captchaPublic() {
  const cfg = captchaConfig();
  return cfg.enabled ? { captchaKey: cfg.client, captchaScript: `https://${CAPTCHA_HOST}/captcha.js?render=onload&onload=onSmartCaptchaLoad` } : { captchaKey: '' };
}

// true - проверка пройдена (или капча выключена / сервис недоступен).
async function verifyCaptcha(req) {
  const cfg = captchaConfig();
  if (!cfg.enabled) return true;
  const token = String((req.body || {}).captchaToken || '');
  if (!token) return false;
  try {
    const res = await fetch(`https://${CAPTCHA_HOST}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: cfg.server, token, ip: req.ip || '' }).toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[капча] сервис ответил ${res.status} - запрос пропущен`);
      return true;
    }
    const data = await res.json().catch(() => ({}));
    return data.status === 'ok';
  } catch (e) {
    console.error(`[капча] сервис недоступен (${e.message}) - запрос пропущен`);
    return true;
  }
}

const CAPTCHA_ERROR = 'Подтвердите, что вы не робот.';
const DISPOSABLE_ERROR = 'Временные (одноразовые) почтовые ящики не принимаются. Укажите постоянную почту.';

module.exports = { isDisposableEmail, honeypotFilled, captchaPublic, verifyCaptcha, CAPTCHA_ERROR, DISPOSABLE_ERROR };
