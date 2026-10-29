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
//   MAIL_SKIP_UNSUBSCRIBE - 1, если поддержка сервиса разрешила письма без
//                           ссылки «отписаться» (для кодов это уместно);
//   SITE_URL              - адрес сайта для ссылок в письмах (по умолчанию
//                           https://taraplus.site).
// Пока ключ или отправитель не заданы - тестовый режим: письма не
// отправляются, всё пишется в журнал сервера (логи Render).
const SITE_NAME = 'Тара+';
const SITE_URL = (process.env.SITE_URL || 'https://taraplus.site').replace(/\/+$/, '');
// Логотип в шапке письма (по указанию пользователя - как значок сайта,
// 72×72 для чётких 36 px) - картинкой с сайта, а не вложением (вложение
// почта показывала файлом под письмом). Почта не загрузила картинку - видна
// подложка: коричневый квадрат с «Т+».
const MAIL_LOGO_URL = `${SITE_URL}/images/mail-logo.png`;
const PURPOSE_TEXT = {
  register: 'подтверждение почты',
  reset: 'восстановление пароля',
  login: 'вход в аккаунт',
};
// Заголовок письма с кодом.
const CODE_TITLE = {
  register: 'Код подтверждения почты',
  reset: 'Код для восстановления пароля',
  login: 'Код для входа',
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

// Оформление письма в стиле сайта (по указанию пользователя): шапка с
// логотипом (MAIL_LOGO_URL; если почта картинку не покажет - коричневый квадрат
// с «Т+»), белая карточка на бежевом фоне, подвал со ссылкой на сайт и почтой
// поддержки. Вёрстка для почтовых программ: таблицы, стили в атрибутах, без
// внешних шрифтов; из картинок - только логотип. title и htmlLines - уже экранированные;
// preheader - строка, которую почта показывает в списке писем (без
// оформления, экранируется здесь); toSupport - письмо в поддержку (ответ на
// него уходит пользователю, подвал другой).
const MAIL_C = { bg: '#F6F2EC', card: '#FFFFFF', ink: '#091135', soft: '#4A4D5C', accent: '#8A4B26', wash: '#F1E4D8', rule: '#E6DED3' };
const MAIL_FONT = "Arial,'Helvetica Neue',Helvetica,sans-serif";
function layout(title, htmlLines, preheader, toSupport) {
  const c = MAIL_C;
  const support = mailConfig().support;
  const pre = preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${c.bg}">${escapeHtml(preheader)}</div>` : '';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>`
    + `<body style="margin:0;padding:0;background:${c.bg}">${pre}`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.bg}"><tr><td align="center" style="padding:32px 16px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">`
    // шапка: знак и название
    + `<tr><td style="padding:0 4px 20px"><a href="${SITE_URL}" style="text-decoration:none;color:${c.ink}">`
    + `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;background:${c.accent};border-radius:9px;color:#FFFFFF;font:bold 16px ${MAIL_FONT}">`
    + `<img src="${MAIL_LOGO_URL}" width="36" height="36" alt="Т+" style="display:block;width:36px;height:36px;border:0;border-radius:9px;color:#FFFFFF;font:bold 16px/36px ${MAIL_FONT};text-align:center">`
    + `</td>`
    + `<td style="padding-left:10px;font:bold 20px ${MAIL_FONT};color:${c.ink}">${SITE_NAME}</td>`
    + `</tr></table></a></td></tr>`
    // карточка
    + `<tr><td style="background:${c.card};border:1px solid ${c.rule};border-radius:14px;padding:32px 32px 28px;font:15px/1.55 ${MAIL_FONT};color:${c.ink}">`
    + `<h1 style="margin:0 0 16px;font:bold 22px/1.3 ${MAIL_FONT};color:${c.ink}">${title}</h1>${htmlLines.join('')}</td></tr>`
    // подвал
    + `<tr><td style="padding:20px 4px 0;font:13px/1.55 ${MAIL_FONT};color:${c.soft}">`
    + (toSupport ? 'Ответ на это письмо уйдёт на почту пользователя.'
      : `Письмо отправлено автоматически, отвечать на него не нужно.`
        + (support ? ` Вопросы - на <a href="mailto:${escapeHtml(support)}" style="color:${c.accent}">${escapeHtml(support)}</a>.` : ''))
    + `<br><a href="${SITE_URL}" style="color:${c.accent};text-decoration:none">${SITE_URL.replace(/^https?:\/\//, '')}</a> - расчёт деревянных ящиков по ГОСТ`
    + `</td></tr></table></td></tr></table></body></html>`;
}
// Абзац текста письма (строка уже экранирована).
function mailP(html, last) {
  return `<p style="margin:0 0 ${last ? 0 : 14}px;color:${MAIL_C.ink}">${html}</p>`;
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
  const note = 'Код действует 15 минут. Если вы ничего не запрашивали, просто удалите это письмо.';
  const text = `Ваш код (${what}): ${code}\n\n${note}\n\n${SITE_NAME}`;
  const html = layout(CODE_TITLE[purpose] || 'Код подтверждения', [
    mailP(`Введите этот код на сайте ${SITE_NAME}:`),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px"><tr><td style="background:${MAIL_C.wash};border-radius:12px;padding:14px 22px;font:bold 32px/1 ${MAIL_FONT};letter-spacing:8px;color:${MAIL_C.accent}">${escapeHtml(code)}</td></tr></table>`,
    mailP('Код действует 15 минут.'),
    `<p style="margin:0;font-size:13px;color:${MAIL_C.soft}">Если вы ничего не запрашивали, просто удалите это письмо: без кода никто не войдёт в ваш аккаунт.</p>`,
  ], `Код ${code} - ${what}`);
  await sendMail(cfg, { to: email, subject, text, html });
  // Сам код в журнал не пишется - только факт отправки.
  console.log(`[почта] код отправлен письмом: ${email} (${what})`);
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
    `<p style="margin:0 0 8px"><b>${escapeHtml(k)}:</b> ${escapeHtml(v).replace(/\n/g, '<br>')}</p>`), subject, true);
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
  const html = layout('Автопродление подписки', [
    ...lines.map((l, i) => mailP(escapeHtml(l))),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px"><tr><td style="background:${MAIL_C.accent};border-radius:10px"><a href="${SITE_URL}/gosts.html" style="display:inline-block;padding:12px 22px;font:bold 15px ${MAIL_FONT};color:#FFFFFF;text-decoration:none">Открыть сайт</a></td></tr></table>`,
  ], `Подписка ${planName} продлится ${day}, сумма ${sum}`);
  await sendMail(cfg, { to: email, subject, text: lines.join('\n\n') + `\n\n${SITE_NAME}`, html });
}

// Автопродление не прошло (payments.js, chargeRenewals): final - попыток
// больше не будет, cardDead - карта отвязана (банк больше её не принимает).
async function sendAutoRenewFailed(email, { planName, date, final, cardDead }) {
  const cfg = mailConfig();
  const day = date.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
  const lines = [
    `Не удалось списать оплату за автопродление подписки ${planName}.`,
    cardDead ? 'Банк больше не принимает сохранённую карту - она отвязана от аккаунта, автопродление выключено.'
      : final ? 'Повторных попыток больше не будет.' : 'Попробуем списать ещё раз незадолго до окончания подписки.',
    final ? `Подписка действует до ${day}, затем перейдёт на «Пробную». Продлить можно вручную на странице «Подписки» на сайте.`
      : `Подписка действует до ${day}.`,
  ];
  if (!mailEnabled(cfg)) {
    console.log(`[почта, тестовый режим] ${email}: ${lines.join(' ')}`);
    return;
  }
  const subject = `${SITE_NAME}: не удалось продлить подписку ${planName}`;
  const html = layout('Автопродление не прошло', [
    ...lines.map(l => mailP(escapeHtml(l))),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px"><tr><td style="background:${MAIL_C.accent};border-radius:10px"><a href="${SITE_URL}/plans.html" style="display:inline-block;padding:12px 22px;font:bold 15px ${MAIL_FONT};color:#FFFFFF;text-decoration:none">Подписки</a></td></tr></table>`,
  ], `Не удалось продлить подписку ${planName}`);
  await sendMail(cfg, { to: email, subject, text: lines.join('\n\n') + `\n\n${SITE_NAME}`, html });
}

module.exports = { sendCode, sendStandardRequest, sendErrorReport, sendAutoRenewNotice, sendAutoRenewFailed };
