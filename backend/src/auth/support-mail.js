// Почта поддержки в админке (по указанию пользователя): ящик поддержки на
// Яндексе читается по IMAP, ответы уходят с этого же ящика через SMTP
// Яндекса (не через Unisender - он только для кодов и писем сайта), копия
// ответа - в «Отправленные».
//
// Настройки - переменные окружения (вписывает владелец сайта):
//   SUPPORT_IMAP_USER     - адрес ящика поддержки целиком;
//   SUPPORT_IMAP_PASSWORD - пароль приложения Яндекса (не основной пароль);
//   SUPPORT_IMAP_HOST, SUPPORT_IMAP_PORT - по умолчанию imap.yandex.ru:993,
//   SUPPORT_SMTP_HOST, SUPPORT_SMTP_PORT - по умолчанию smtp.yandex.ru:465
//                           (менять не нужно; для проверки на своём сервере).
// Пока не заданы - раздел в админке показывает, что почта не подключена.
//
// Маршруты (внутри /api/admin - только администраторам, admin.js):
//   GET  /mail?folder=inbox|sent&offset=N - письма, новые сверху, по PAGE штук
//   GET  /mail/message?folder&uid         - письмо целиком (отмечается прочитанным)
//   GET  /mail/attachment?folder&uid&i    - вложение (скачивание)
//   POST /mail/reply { uid, text }        - ответить на письмо из «Входящих»
// Подключение к ящику - на каждый запрос (открыть, сделать, закрыть).
const express = require('express');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const store = require('./store');
const { PLANS } = require('./plans');

const PAGE = 30;
const MAX_SOURCE = 20 * 1024 * 1024;  // письма больше - без разбора (память сервера)
const MAX_TEXT = 200000;              // символов текста письма на страницу
const MAX_REPLY = 20000;              // символов в ответе

function imapConfig() {
  const env = process.env;
  const port = Number(env.SUPPORT_IMAP_PORT) || 993;
  return {
    user: (env.SUPPORT_IMAP_USER || '').trim(),
    pass: env.SUPPORT_IMAP_PASSWORD || '',
    host: env.SUPPORT_IMAP_HOST || 'imap.yandex.ru',
    port,
    secure: port === 993,
  };
}
// Пароль по сети - только в шифрованном соединении: порт 993 (TLS) или
// STARTTLS; без шифрования - только для проверки на своём компьютере.
const isLocalHost = h => ['127.0.0.1', 'localhost', '::1'].includes(h);
const configured = cfg => Boolean(cfg.user && cfg.pass);

// Понятный текст ошибки подключения.
function imapError(e) {
  if (e.authenticationFailed || /AUTHENTICATIONFAILED|Invalid credentials|LOGIN/i.test(e.responseText || e.message || '')) {
    return 'Яндекс не принял логин или пароль ящика поддержки. Проверьте SUPPORT_IMAP_USER, пароль приложения в SUPPORT_IMAP_PASSWORD и что в настройках почты включён IMAP.';
  }
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET', 'NoConnection'].includes(e.code) || /timeout/i.test(e.message || '')) {
    return 'Нет соединения с почтовым сервером. Возможно, хостинг закрывает порт IMAP (993).';
  }
  return 'Ошибка почтового сервера: ' + (e.responseText || e.message || 'неизвестная ошибка');
}

// Открыть ящик, выполнить fn(client), закрыть.
async function withImap(fn) {
  const cfg = imapConfig();
  const client = new ImapFlow({
    host: cfg.host, port: cfg.port, secure: cfg.secure,
    doSTARTTLS: cfg.secure ? undefined : (isLocalHost(cfg.host) ? undefined : true),
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 60000,
  });
  client.on('error', () => {}); // ошибка сокета - уже в результате connect/команды
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

// Папка: входящие или отправленные (по специальной пометке \Sent, у Яндекса
// «Отправленные» / Sent).
async function folderPath(client, folder) {
  if (folder !== 'sent') return 'INBOX';
  const list = await client.list();
  const sent = list.find(m => m.specialUse === '\\Sent') || list.find(m => /^(sent|отправленные)$/i.test(m.name));
  if (!sent) throw Object.assign(new Error('В ящике нет папки «Отправленные».'), { userText: true });
  return sent.path;
}

const addr = a => (a && a.address ? { name: a.name || '', address: a.address.toLowerCase() } : null);
// Аккаунт сайта с этой почтой (подписка - рядом с письмом).
function accountOf(email) {
  const u = email && store.findUserByEmail(email);
  if (!u) return null;
  return { email: u.email, plan: (PLANS[u.plan] || PLANS.free).name, blocked: !!u.blocked };
}

const router = express.Router();
router.use((req, res, next) => {
  if (!configured(imapConfig())) return res.status(503).json({ error: 'Почта поддержки не подключена: задайте SUPPORT_IMAP_USER и SUPPORT_IMAP_PASSWORD в настройках сервера.', notConfigured: true });
  next();
});
const handle = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (!e.userText) console.error(`[почта поддержки] ${e.message}`);
    res.status(e.status || 502).json({ error: e.userText ? e.message : imapError(e) });
  }
};
const uidOf = req => {
  const uid = Number(req.query.uid != null ? req.query.uid : req.body.uid);
  if (!Number.isInteger(uid) || uid < 1) throw Object.assign(new Error('Не указано письмо.'), { userText: true, status: 400 });
  return uid;
};

router.get('/', handle(async (req, res) => {
  const folder = req.query.folder === 'sent' ? 'sent' : 'inbox';
  const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0));
  const out = await withImap(async client => {
    const lock = await client.getMailboxLock(await folderPath(client, folder), { readOnly: true });
    try {
      const uids = (await client.search({ all: true }, { uid: true })) || [];
      uids.sort((a, b) => b - a);
      const page = uids.slice(offset, offset + PAGE);
      const unseen = ((await client.search({ seen: false }, { uid: true })) || []).length;
      const messages = [];
      if (page.length) {
        for await (const m of client.fetch(page.join(','), { uid: true, envelope: true, flags: true, bodyStructure: true, size: true }, { uid: true })) {
          const from = addr(m.envelope.from && m.envelope.from[0]);
          const to = addr(m.envelope.to && m.envelope.to[0]);
          const other = folder === 'sent' ? to : from;
          messages.push({
            uid: m.uid, from, to, subject: m.envelope.subject || '', date: m.envelope.date ? new Date(m.envelope.date).toISOString() : null,
            seen: m.flags.has('\\Seen'), answered: m.flags.has('\\Answered'), size: m.size,
            attachments: hasAttachments(m.bodyStructure), account: accountOf(other && other.address),
          });
        }
      }
      messages.sort((a, b) => b.uid - a.uid);
      return { folder, total: uids.length, unseen, offset, pageSize: PAGE, messages };
    } finally { lock.release(); }
  });
  res.json(out);
}));

function hasAttachments(node) {
  if (!node) return false;
  if (node.disposition === 'attachment') return true;
  return (node.childNodes || []).some(hasAttachments);
}

// Письмо целиком: источник и разбор (mailparser: кодировки, вложения; у
// писем только с HTML текст получается из HTML). Показывается только текст -
// HTML письма на страницу не попадает.
async function loadMessage(client, folder, uid, markSeen) {
  const lock = await client.getMailboxLock(await folderPath(client, folder));
  try {
    const head = await client.fetchOne(String(uid), { uid: true, size: true, flags: true, envelope: true }, { uid: true });
    if (!head) throw Object.assign(new Error('Письмо не найдено - возможно, его удалили.'), { userText: true, status: 404 });
    if (head.size > MAX_SOURCE) throw Object.assign(new Error('Письмо слишком большое для просмотра в админке - откройте его в Яндекс Почте.'), { userText: true, status: 413 });
    const { source } = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (markSeen && !head.flags.has('\\Seen')) await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
    return { head, mail: await simpleParser(source) };
  } finally { lock.release(); }
}
const listAddr = v => (v ? [].concat(v).flatMap(x => x.value || []).map(addr).filter(Boolean) : []);

router.get('/message', handle(async (req, res) => {
  const folder = req.query.folder === 'sent' ? 'sent' : 'inbox';
  const uid = uidOf(req);
  const { head, mail } = await withImap(client => loadMessage(client, folder, uid, true));
  const from = listAddr(mail.from)[0] || null;
  const to = listAddr(mail.to), cc = listAddr(mail.cc), replyTo = listAddr(mail.replyTo)[0] || null;
  const acc = a => accountOf(a && a.address);
  let text = mail.text || '';
  const cut = text.length > MAX_TEXT;
  if (cut) text = text.slice(0, MAX_TEXT);
  res.json({
    folder, uid, subject: mail.subject || '', date: mail.date ? mail.date.toISOString() : null,
    from, to, cc, replyTo, text, cut, answered: head.flags.has('\\Answered'),
    attachments: (mail.attachments || []).map((a, i) => ({ i, filename: a.filename || `вложение-${i + 1}`, size: a.size, contentType: a.contentType })),
    account: folder === 'sent' ? acc(to[0]) : (acc(from) || acc(replyTo)),
  });
}));

router.get('/attachment', handle(async (req, res) => {
  const folder = req.query.folder === 'sent' ? 'sent' : 'inbox';
  const uid = uidOf(req), i = Number(req.query.i);
  const { mail } = await withImap(client => loadMessage(client, folder, uid, false));
  const a = Number.isInteger(i) && (mail.attachments || [])[i];
  if (!a) return res.status(404).json({ error: 'Вложение не найдено.' });
  // Всегда скачивание (не открывать в браузере: в письме может быть что угодно).
  const name = (a.filename || `вложение-${i + 1}`).replace(/[\r\n"\\/]/g, '_');
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'no-store',
  });
  res.send(a.content);
}));

// Ответ (по указанию пользователя - с ящика поддержки на Яндексе, не через
// Unisender): письмо отправителю (или на его Reply-To), «Re: тема», ниже -
// цитата исходного письма. Отправка - через SMTP Яндекса тем же паролем
// приложения; копия - в «Отправленные» (если Яндекс не положил её сам),
// исходное письмо помечается отвеченным. Не ушло (на бесплатном Render
// почтовые порты могут быть закрыты - заработает на своём сервере, или
// Яндекс не принял письмо) - ошибка с причиной.
function smtpConfig() {
  const env = process.env, imap = imapConfig();
  const port = Number(env.SUPPORT_SMTP_PORT) || 465;
  const host = env.SUPPORT_SMTP_HOST || 'smtp.yandex.ru';
  return {
    host, port, secure: port === 465,
    // Без шифрования пароль не отправляется (кроме проверки на своём компьютере).
    requireTLS: port !== 465 && !isLocalHost(host),
    auth: { user: imap.user, pass: imap.pass },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
  };
}
function smtpError(e) {
  if (e.code === 'EAUTH') return 'Яндекс не принял логин или пароль для отправки (SMTP).';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNREFUSED', 'ECONNRESET'].includes(e.code) || /timeout|ECONNREFUSED/i.test(e.message || '')) {
    return 'Нет соединения с сервером отправки Яндекса (smtp.yandex.ru:465): возможно, хостинг закрывает почтовые порты (так бывает на бесплатном Render).';
  }
  return 'Яндекс не принял письмо: ' + (e.response || e.message || 'неизвестная ошибка');
}

// Письмо целиком (RFC 5322) - nodemailer кодирует заголовки сам (переводы
// строк из чужой темы не превращаются в новые заголовки).
function buildReply({ from, to, subject, text, inReplyTo, references }) {
  const MailComposer = require('nodemailer/lib/mail-composer');
  const domain = String(from.address).split('@')[1] || 'localhost';
  const messageId = `<${Date.now().toString(36)}.${require('crypto').randomBytes(8).toString('hex')}@${domain}>`;
  const one = v => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ');
  const refs = [].concat(references || []).concat(inReplyTo || []).map(one).filter(Boolean);
  const mail = new MailComposer({
    from, to, subject: one(subject), text, messageId, date: new Date(),
    inReplyTo: inReplyTo ? one(inReplyTo) : undefined, references: refs.length ? refs : undefined,
  });
  return new Promise((resolve, reject) => mail.compile().build((err, raw) => (err ? reject(err) : resolve({ raw, messageId }))));
}

async function specialFolder(client, use, names) {
  const list = await client.list();
  const f = list.find(m => m.specialUse === use) || list.find(m => names.test(m.name));
  return f ? f.path : null;
}

router.post('/reply', handle(async (req, res) => {
  const uid = uidOf(req);
  const body = String(req.body.text || '').replace(/\r\n/g, '\n').trim();
  if (!body) return res.status(400).json({ error: 'Напишите текст ответа.' });
  if (body.length > MAX_REPLY) return res.status(400).json({ error: `Ответ слишком длинный (больше ${MAX_REPLY.toLocaleString('ru-RU')} символов).` });
  const support = imapConfig().user;
  const result = await withImap(async client => {
    const { mail } = await loadMessage(client, 'inbox', uid, true);
    const to = listAddr(mail.replyTo)[0] || listAddr(mail.from)[0];
    if (!to) throw Object.assign(new Error('В письме нет адреса отправителя - ответить нельзя.'), { userText: true, status: 400 });
    const subj = String(mail.subject || '').replace(/[\r\n]+/g, ' ');
    const subject = /^\s*re:/i.test(subj) ? subj : `Re: ${subj}`.trim();
    const when = mail.date ? mail.date.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) : '';
    const quote = (mail.text || '').trim().slice(0, 20000).split('\n').map(l => '> ' + l).join('\n');
    const author = listAddr(mail.from)[0] || to;
    const text = `${body}\n\n${when}, ${author.name || author.address} пишет:\n${quote}`;
    const from = { name: process.env.MAIL_FROM_NAME || 'Тара+', address: support };
    const { raw, messageId } = await buildReply({ from, to: to.address, subject, text, inReplyTo: mail.messageId, references: mail.references });

    let sendErr = null;
    try {
      const transport = require('nodemailer').createTransport(smtpConfig());
      try { await transport.sendMail({ envelope: { from: support, to: [to.address] }, raw }); } finally { transport.close(); }
    } catch (e) {
      sendErr = e;
      console.error(`[почта поддержки] ответ не отправлен (${e.code || ''}): ${e.message}`);
    }

    // Не ушло - ошибка (текст ответа остаётся в поле на странице).
    if (sendErr) throw Object.assign(new Error(`Ответ не отправлен. ${smtpError(sendErr)}`), { userText: true });

    // Ушло. Копия в «Отправленные» - если Яндекс не положил её сам (ищем по
    // Message-ID); отметка «отвечено». Ошибки здесь не страшны - ответ ушёл.
    let copied = false;
    try {
      const sentPath = await specialFolder(client, '\\Sent', /^(sent|отправленные)$/i);
      if (sentPath) {
        await new Promise(r => setTimeout(r, 1500));
        const lock = await client.getMailboxLock(sentPath);
        let found = [];
        try { found = (await client.search({ header: { 'message-id': messageId } }, { uid: true })) || []; } finally { lock.release(); }
        if (!found.length) await client.append(sentPath, raw, ['\\Seen']);
        copied = true;
      }
    } catch (e) { console.error(`[почта поддержки] копия ответа не сохранена: ${e.message}`); }
    try {
      const lock = await client.getMailboxLock('INBOX');
      try { await client.messageFlagsAdd(String(uid), ['\\Answered'], { uid: true }); } finally { lock.release(); }
    } catch (e) { /* не страшно */ }
    return { to: to.address, sent: true, copied };
  });
  res.json({ ok: true, ...result });
}));

module.exports = { router, imapConfig };
