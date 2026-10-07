// Сообщения об ошибках (по указанию пользователя): кнопка «Сообщить об
// ошибке» в верхней панели сайта (js/account/feedback.js). ГОСТ и тип ящика
// подставляются по странице, пользователь описывает ошибку; к сообщению
// можно приложить введённые размеры и массу. Отправить можно только из
// аккаунта (по указанию пользователя: обращения к администрации - после
// входа); ответ - на почту аккаунта.
//
//   POST /api/feedback/error { gost, type, description, page, inputs }
//
// Сообщение сохраняется в хранилище (список - в админке) и уходит письмом на
// SUPPORT_EMAIL (mailer.js; без настроек почты - в журнал сервера).
const express = require('express');
const store = require('./store');
const { rateLimit } = require('./routes');
const { sendErrorReport } = require('./mailer');

const MAX = { gost: 60, type: 60, description: 3000, page: 200 };
const INPUT_KEYS = ['L', 'W', 'H', 'M'];

const router = express.Router();

router.post('/error', rateLimit, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт, чтобы сообщить об ошибке.' });
    const b = req.body || {};
    const rec = {};
    for (const [k, max] of Object.entries(MAX)) {
      const v = String(b[k] || '').trim();
      if (v.length > max) return res.status(400).json({ error: 'Слишком длинный текст в одном из полей.' });
      rec[k] = v;
    }
    if (!rec.description) return res.status(400).json({ error: 'Опишите, что не так.' });
    // Размеры и масса - только числа (не персональные данные).
    if (b.inputs && typeof b.inputs === 'object') {
      const inputs = {};
      INPUT_KEYS.forEach(k => { const n = Number(b.inputs[k]); if (Number.isFinite(n) && n > 0) inputs[k] = n; });
      if (Object.keys(inputs).length) rec.inputs = inputs;
    }
    Object.assign(rec, { userEmail: req.user.email, plan: req.user.plan, at: new Date().toISOString() });
    store.addReport(rec);
    await sendErrorReport(rec);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
