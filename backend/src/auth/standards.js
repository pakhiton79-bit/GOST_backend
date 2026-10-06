// Заявки на внутренние стандарты заводов (по указанию пользователя): в
// подписках Base, Pro и Team пользователь присылает сведения о стандарте
// своего предприятия, администрация добавляет его расчёт. Кнопка и форма -
// на странице выбора ГОСТа (js/account/standards.js).
//
//   POST /api/standards/request { company, standard, details, contact, email }
//   (телефон не запрашиваем - по указанию пользователя, меньше персональных данных)
//
// Пока почта в тестовом режиме: заявка сохраняется в хранилище и пишется в
// журнал сервера (mailer.js); письмо администратору - когда подключим почту.
const express = require('express');
const store = require('./store');
const { planOf } = require('./plans');
const { rateLimit } = require('./routes');
const { sendStandardRequest } = require('./mailer');

const FIELDS = { company: 200, standard: 300, details: 3000, contact: 200, email: 254 };
const REQUIRED = ['company', 'standard', 'details', 'contact', 'email'];

const router = express.Router();

router.post('/request', rateLimit, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт, чтобы отправить заявку.' });
    if (!planOf(req.user).customStandards) {
      return res.status(403).json({ error: 'Внутренние стандарты доступны в подписках Base, Pro и Team.' });
    }
    const rec = {};
    for (const [k, max] of Object.entries(FIELDS)) {
      const v = String((req.body || {})[k] || '').trim();
      if (v.length > max) return res.status(400).json({ error: 'Слишком длинный текст в одном из полей.' });
      rec[k] = v;
    }
    if (REQUIRED.some(k => !rec[k])) return res.status(400).json({ error: 'Заполните обязательные поля.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email)) return res.status(400).json({ error: 'Введите правильный адрес почты.' });
    Object.assign(rec, { userEmail: req.user.email, plan: req.user.plan, at: new Date().toISOString() });
    store.addRequest(rec);
    await sendStandardRequest(rec);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
