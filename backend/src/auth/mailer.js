// Аккаунты: отправка писем через Unisender Go (HTTP API).
//
// На бесплатном Render почтовые порты (SMTP) закрыты, поэтому письма идут
// через HTTP API сервиса. Настройки - переменные окружения Render (вводит
// владелец сайта):
//   UNISENDER_GO_API_KEY  - API-ключ (личный кабинет Unisender Go);
//   UNISENDER_GO_URL      - адрес API из личного кабинета, например
//                           https://go1.unisender.ru/ru/transactional/api/v1
//                           (у разных аккаунтов go1 или go2);
//   MAIL_FROM             - адрес отправителя на подтверждённом в сервисе
//                           домене, например noreply@example.ru;
//   MAIL_FROM_NAME        - имя отправителя (по умолчанию «Тара+»);
//   SUPPORT_EMAIL         - куда приходят заявки на стандарты и сообщения об
//                           ошибках (ответ на письмо уходит пользователю);
//   (ответы из админки - «Почта поддержки», support-mail.js);
//   MAIL_SKIP_UNSUBSCRIBE - 1, если поддержка сервиса разрешила письма без
//                           ссылки «отписаться» (для кодов это уместно).
// Пока ключ или отправитель не заданы - тестовый режим: письма не
// отправляются, всё пишется в журнал сервера (логи Render), как раньше.
const SITE_NAME = 'Тара+';
const PURPOSE_TEXT = {
  register: 'подтверждение почты',
  reset: 'восстановление пароля',
  login: 'вход в аккаунт',
};

function mailConfig() {
  const env = process.env;
  return {
    apiKey: env.UNISENDER_GO_API_KEY || '',
    url: (env.UNISENDER_GO_URL || 'https://go1.unisender.ru/ru/transactional/api/v1').replace(/\/+$/, ''),
    from: env.MAIL_FROM || '',
    fromName: env.MAIL_FROM_NAME || SITE_NAME,
    support: env.SUPPORT_EMAIL || '',
    skipUnsubscribe: env.MAIL_SKIP_UNSUBSCRIBE === '1',
  };
}
function mailEnabled(cfg) { return Boolean(cfg.apiKey && cfg.from); }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Одно письмо одному получателю. Ошибка сервиса - исключение с текстом ответа.
async function sendMail(cfg, { to, subject, text, html, replyTo }) {
  const message = {
    recipients: [{ email: to }],
    from_email: cfg.from,
    from_name: cfg.fromName,
    subject,
    body: { plaintext: text, html },
    track_links: 0,
    track_read: 0,
  };
  if (replyTo) message.reply_to = replyTo;
  if (cfg.skipUnsubscribe) message.skip_unsubscribe = 1;
  const res = await fetch(cfg.url + '/email/send.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-KEY': cfg.apiKey },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== 'success') {
    throw new Error(`Unisender Go ${res.status}: ${data.message || JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

// Простое оформление письма: заголовок и строки (уже экранированные).
function layout(title, htmlLines) {
  return '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:560px">'
    + `<h2 style="font-size:18px;margin:0 0 16px">${title}</h2>${htmlLines.join('')}`
    + `<p style="color:#888;font-size:13px;margin-top:24px">${SITE_NAME}</p></div>`;
}

// Код подтверждения. Ошибка отправки - исключение (routes.js сообщает
// пользователю, что письмо не ушло).
async function sendCode(email, code, purpose) {
  const cfg = mailConfig();
  const what = PURPOSE_TEXT[purpose] || purpose;
  if (!mailEnabled(cfg)) {
    console.log(`[почта, тестовый режим] ${email}: код ${code} (${what})`);
    return;
  }
  const subject = `${SITE_NAME}: код ${code}`;
  const note = 'Код действует ограниченное время. Если вы ничего не запрашивали, просто удалите это письмо.';
  const text = `Ваш код (${what}): ${code}\n\n${note}\n\n${SITE_NAME}`;
  const html = layout(`Код: ${escapeHtml(what)}`, [
    `<p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:8px 0 16px">${escapeHtml(code)}</p>`,
    `<p>${note}</p>`,
  ]);
  await sendMail(cfg, { to: email, subject, text, html });
}

// Письмо в поддержку (заявка, сообщение об ошибке): ответ - на почту
// пользователя. Ошибка отправки не мешает пользователю: запись уже в
// хранилище и видна в админке, ошибка - в журнале сервера.
async function sendToSupport(kind, rec, subject, fields) {
  const cfg = mailConfig();
  const lines = fields.filter(([, v]) => v != null && v !== '');
  const text = lines.map(([k, v]) => `${k}: ${v}`).join('\n');
  if (!mailEnabled(cfg) || !cfg.support) {
    console.log(`[${kind}, тестовый режим]\n${text}`);
    return;
  }
  // Суточный лимит писем исчерпан - письмо не отправляется (запись уже в
  // хранилище и видна в админке).
  if (!require('./mail-limits').takeSupport(Date.now())) {
    console.log(`[${kind}] суточный лимит писем исчерпан - только в админке`);
    return;
  }
  const html = layout(escapeHtml(subject), lines.map(([k, v]) =>
    `<p style="margin:0 0 8px"><b>${escapeHtml(k)}:</b> ${escapeHtml(v).replace(/\n/g, '<br>')}</p>`));
  try {
    await sendMail(cfg, { to: cfg.support, subject, text, html, replyTo: rec.userEmail || undefined });
  } catch (e) {
    console.error(`[${kind}] письмо в поддержку не отправлено: ${e.message}\n${text}`);
  }
}

// Заявка на внутренний стандарт завода (standards.js).
async function sendStandardRequest(rec) {
  await sendToSupport('заявка на стандарт', rec, `${SITE_NAME}: заявка на внутренний стандарт (${rec.company})`, [
    ['Почта аккаунта', rec.userEmail], ['Подписка', rec.plan], ['Предприятие', rec.company],
    ['Стандарт', rec.standard], ['Подробности', rec.details], ['Время', rec.at],
  ]);
}

// Сообщение об ошибке (feedback.js).
async function sendErrorReport(rec) {
  await sendToSupport('сообщение об ошибке', rec, `${SITE_NAME}: сообщение об ошибке (${rec.gost} ${rec.type})`, [
    ['Почта аккаунта', rec.userEmail || 'гость'], ['Подписка', rec.plan], ['ГОСТ', rec.gost], ['Тип', rec.type],
    ['Страница', rec.page], ['Входные данные', rec.inputs ? JSON.stringify(rec.inputs) : ''],
    ['Описание', rec.description], ['Время', rec.at],
  ]);
}

// Напоминание об автопродлении подписки (auto-renew.js): за несколько дней до
// окончания - дата, сумма и как отключить. Ошибка отправки - исключение
// (напоминание повторится через час).
async function sendAutoRenewNotice(email, { planName, date, amount }) {
  const cfg = mailConfig();
  const day = date.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
  const sum = amount.toLocaleString('ru-RU') + ' ₽';
  const lines = [
    `Подписка ${planName} будет автоматически продлена ${day}.`,
    `Сумма списания: ${sum}.`,
    'Отключить автопродление можно в любой момент: окно «Настройки» на сайте, раздел «Аккаунт».',
  ];
  if (!mailEnabled(cfg)) {
    console.log(`[почта, тестовый режим] ${email}: ${lines.join(' ')}`);
    return;
  }
  const subject = `${SITE_NAME}: подписка ${planName} продлится ${day}`;
  const html = layout('Автопродление подписки', lines.map(l => `<p>${escapeHtml(l)}</p>`));
  await sendMail(cfg, { to: email, subject, text: lines.join('\n\n') + `\n\n${SITE_NAME}`, html });
}

// Ответ из раздела «Почта поддержки» админки (support-mail.js): обычный
// текст, ответ пользователя придёт на replyTo (ящик поддержки). Возвращает
// { from, test } - отправителя (для копии в «Отправленные») и тестовый ли
// режим; ошибка сервиса - исключение.
async function sendSupportReply({ to, subject, text, replyTo }) {
  const cfg = mailConfig();
  if (!mailEnabled(cfg)) {
    console.log(`[почта, тестовый режим] ответ поддержки ${to}: ${subject}\n${text}`);
    return { from: { name: cfg.fromName, address: replyTo || 'test@localhost' }, test: true };
  }
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;white-space:pre-wrap">'
    + escapeHtml(text) + '</div>';
  await sendMail(cfg, { to, subject, text, html, replyTo });
  return { from: { name: cfg.fromName, address: cfg.from }, test: false };
}

module.exports = { sendCode, sendStandardRequest, sendErrorReport, sendAutoRenewNotice, sendSupportReply };
