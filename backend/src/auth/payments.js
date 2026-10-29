// Оплата подписок через ЮKassa (по указанию пользователя). Настройки -
// переменные окружения (вписывает владелец сайта, /etc/taraplus/env):
//   YOOKASSA_SHOP_ID    - идентификатор магазина (shopId);
//   YOOKASSA_SECRET_KEY - секретный ключ API (кабинет ЮKassa → Интеграция →
//                         Ключи API);
//   YOOKASSA_TEST       - 1: тестовый режим (shopId и ключ тестового
//                         магазина, деньги не списываются);
//   YOOKASSA_VAT_CODE   - только если в магазине включены чеки 54-ФЗ от
//                         ЮKassa: код НДС для чека (1 - без НДС). Самозанятому
//                         не нужен - доход в «Мой налог» передаёт ЮKassa;
//   SITE_URL            - адрес сайта для возврата после оплаты (как в mailer.js).
// Пока shopId или ключ не заданы - оплаты нет (на странице подписок кнопки
// «Скоро»), маршруты отвечают 404. В тестовом режиме оплата видна и
// доступна только администраторам (ADMIN_EMAILS): посетители не получат
// подписку тестовой картой, пока режим не выключен. В боевом режиме
// тестовый платёж (test: true) не принимается.
//
// Кабинет ЮKassa → Интеграция → HTTP-уведомления:
//   URL - https://<домен>/api/pay/result, события payment.succeeded и
//   payment.canceled.
// У уведомлений ЮKassa нет подписи - сайт не верит телу уведомления, а
// запрашивает платёж у API ЮKassa по его id (confirmPayment). Тот же запрос -
// при проверке состояния со страницы после оплаты, если уведомление
// задержалось, и раз в минуту по неоплаченным счетам (sweepPending) - так
// подписка подключается и без HTTP-уведомлений.
//
// Правила (по указанию пользователя; цена - за месяц × срок, без скидок):
//   - нет действующей платной подписки - новая подписка с момента оплаты;
//   - та же подписка - срок добавляется к концу текущего;
//   - подписка дороже - включается сразу, стоимость неиспользованных дней
//     текущей зачитывается в цену;
//   - подписка дешевле - начинается после окончания текущей (очередь queue,
//     syncUser в plans.js).
// При оплате правило применяется к состоянию аккаунта на момент оплаты, а
// не выставления счёта (счетов может быть несколько, оплачены в любом
// порядке): оплаченное время никогда не пропадает - всё, что нельзя
// применить, как было рассчитано, встаёт в очередь после текущей (applyPayment).
// Подписка подключается только когда API ЮKassa подтвердил платёж
// (succeeded, сумма и счёт совпадают); страница после оплаты лишь
// показывает результат.
//
// Маршруты:
//   GET  /api/pay/quote?plan&months - сумма и что произойдёт (для окна на сайте);
//   POST /api/pay/create { plan, months } - счёт, платёж ЮKassa и ссылка на оплату;
//   POST /api/pay/result - уведомление ЮKassa (ответ 200, иначе ЮKassa повторяет);
//   GET  /api/pay/status?inv - состояние своего счёта (страница pay-success.html).
const express = require('express');
const store = require('./store');
const { PLANS, PLAN_TERMS, PERIOD_MS, planOf, syncUser, quotaInfo } = require('./plans');
const { needsReconsent } = require('./legal');
const { isAdmin } = require('./routes');

const API_URL = 'https://api.yookassa.ru/v3/payments';
const SITE_URL = (process.env.SITE_URL || 'https://taraplus.site').replace(/\/+$/, '');

function payConfig() {
  const env = process.env;
  return {
    shopId: env.YOOKASSA_SHOP_ID || '', secret: env.YOOKASSA_SECRET_KEY || '',
    test: env.YOOKASSA_TEST === '1', vatCode: Number(env.YOOKASSA_VAT_CODE) || 0,
  };
}
function payConfigured() {
  const c = payConfig();
  return Boolean(c.shopId && c.secret);
}
// Оплата доступна этому посетителю: настроена и (в тестовом режиме) он
// администратор.
function payEnabled(user) {
  return payConfigured() && (!payConfig().test || isAdmin(user));
}
if (payConfigured() && payConfig().test) console.log('[оплата] ТЕСТОВЫЙ режим ЮKassa (YOOKASSA_TEST=1): оплата доступна только администраторам');

// Запрос к API ЮKassa: { ok, status, data }. Ошибка сети - исключение.
async function ykRequest(method, path, body, idempotenceKey) {
  const cfg = payConfig();
  const headers = { Authorization: 'Basic ' + Buffer.from(`${cfg.shopId}:${cfg.secret}`).toString('base64') };
  if (body) headers['Content-Type'] = 'application/json';
  if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;
  const r = await fetch(API_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

// Что произойдёт при оплате подписки planId на months месяцев: { amount (₽),
// kind: new|extend|upgrade|queue, credit (₽, зачёт), startsAt, until } или
// { error }.
function quote(user, planId, months, now) {
  const p = PLANS[planId];
  if (!p || !p.price) return { error: 'Нет такой платной подписки.' };
  if (!PLAN_TERMS.includes(months)) return { error: 'Выберите срок подписки.' };
  if (syncUser(user, now)) store.updateUser(user);
  const total = p.price * months, len = months * PERIOD_MS;
  const active = user.plan !== 'free' && user.planUntil > now;
  if (!active) return { amount: total, kind: 'new', credit: 0, startsAt: now, until: now + len };
  if (user.queuedPlan || (Array.isArray(user.queue) && user.queue.length)) return { error: 'Следующая подписка уже оплачена. Новую можно оформить, когда она начнётся.' };
  if (user.plan === planId) return { amount: total, kind: 'extend', credit: 0, startsAt: user.planUntil, until: user.planUntil + len };
  const cur = planOf(user);
  if (p.price > cur.price) {
    const credit = Math.floor(cur.price * (user.planUntil - now) / PERIOD_MS);
    if (total - credit < 1) return { error: 'Остаток текущей подписки больше стоимости: выберите срок 3 месяца.' };
    return { amount: total - credit, kind: 'upgrade', credit, startsAt: now, until: now + len };
  }
  return { amount: total, kind: 'queue', credit: 0, startsAt: user.planUntil, until: user.planUntil + len };
}

// Подключить оплаченную подписку (платёж подтверждён ЮKassa). Состояние аккаунта
// могло измениться после выставления счёта (оплачен другой счёт, подписку
// выдал администратор) - правило применяется к текущему, и оплаченное время
// не теряется:
//   - действующей подписки нет - новая с момента оплаты;
//   - та же подписка - срок добавляется к концу текущей;
//   - замена с зачётом (upgrade) - только если текущая подписка та же и не
//     продлевалась после выставления счёта (зачёт был рассчитан по ней);
//   - всё остальное - в очередь после текущей и уже оплаченных (та же
//     подписка в конце очереди - добавляется срок).
function applyPayment(pay, now) {
  const user = store.findUserById(pay.userId);
  if (!user) return 'аккаунт удалён';
  syncUser(user, now);
  const len = pay.months * PERIOD_MS;
  const active = user.plan !== 'free' && user.planUntil > now;
  if (!active) {
    store.updateUser(user, { plan: pay.plan, planSince: now, planUntil: now + len, periodStart: now, used: 0, planMonths: pay.months });
    return 'подключена';
  }
  if (user.plan === pay.plan) {
    store.updateUser(user, { planUntil: user.planUntil + len, planMonths: pay.months });
    return 'продлена';
  }
  if (pay.kind === 'upgrade' && pay.fromPlan === user.plan && user.planUntil <= pay.fromUntil && PLANS[pay.plan].price > planOf(user).price) {
    // Очередь (если есть) начнётся после новой подписки.
    store.updateUser(user, { plan: pay.plan, planSince: now, planUntil: now + len, periodStart: now, used: 0, planMonths: pay.months });
    return 'подключена с зачётом';
  }
  const queue = Array.isArray(user.queue) ? user.queue.slice() : [];
  const last = queue[queue.length - 1];
  if (last && last.plan === pay.plan) queue[queue.length - 1] = { plan: last.plan, months: last.months + pay.months };
  else queue.push({ plan: pay.plan, months: pay.months });
  store.updateUser(user, { queue });
  return 'начнётся после текущей';
}

// Сверить счёт с платежом в ЮKassa и, если оплачен, подключить подписку.
// Платёж берётся из API ЮKassa (не из уведомления). Возвращает состояние
// счёта: paid | canceled | pending.
async function confirmPayment(pay) {
  if (pay.status !== 'pending' || !pay.ykId) return pay.status;
  const r = await ykRequest('GET', '/' + encodeURIComponent(pay.ykId));
  if (!r.ok) {
    console.log(`[оплата] счёт ${pay.id}: ЮKassa ответила ${r.status} на запрос платежа`);
    return pay.status;
  }
  const yk = r.data, cfg = payConfig();
  if (yk.id !== pay.ykId || String(yk.metadata && yk.metadata.inv) !== String(pay.id)) {
    console.log(`[оплата] счёт ${pay.id}: платёж ЮKassa ${yk.id} не от этого счёта`);
    return pay.status;
  }
  if (yk.status === 'canceled') {
    if (pay.status === 'pending') store.updatePayment(pay, { status: 'canceled', canceledAt: new Date().toISOString(), cancelReason: yk.cancellation_details && yk.cancellation_details.reason });
    return pay.status;
  }
  if (yk.status !== 'succeeded' || !yk.paid) return pay.status;
  // Тестовый платёж в боевом режиме - не принимать.
  if (!cfg.test && yk.test) {
    console.log(`[оплата] счёт ${pay.id}: тестовый платёж в боевом режиме - отклонено`);
    return pay.status;
  }
  if (!yk.amount || yk.amount.currency !== 'RUB' || Math.abs(Number(yk.amount.value) - pay.amount) > 0.005) {
    console.log(`[оплата] счёт ${pay.id}: сумма ${yk.amount && yk.amount.value} ${yk.amount && yk.amount.currency} не совпадает с ${pay.amount}`);
    return pay.status;
  }
  // После await счёт мог подтвердить параллельный запрос (уведомление и
  // страница после оплаты) - проверка и подключение ниже без await, поэтому
  // подписка подключается один раз.
  if (pay.status !== 'pending') return pay.status;
  const now = Date.now();
  const result = applyPayment(pay, now);
  store.updatePayment(pay, { status: 'paid', paidAt: new Date(now).toISOString(), result });
  console.log(`[оплата] счёт ${pay.id} оплачен: ${pay.email}, ${pay.plan} × ${pay.months} мес., ${pay.amount} ₽ - подписка ${result}`);
  return pay.status;
}

// Сверка неоплаченных счетов с ЮKassa (по указанию пользователя: в кабинете
// может не быть HTTP-уведомлений, а покупатель - закрыть вкладку до возврата
// на сайт). Раз в минуту - счета моложе SWEEP_FRESH_MS, раз в
// SWEEP_SLOW_EVERY_MS - остальные до SWEEP_MAX_AGE_MS. Счета другого режима
// (тестовые при боевом ключе и наоборот) не проверяются - ЮKassa их не знает.
const SWEEP_EVERY_MS = 60 * 1000;
const SWEEP_FRESH_MS = 2 * 3600 * 1000;
const SWEEP_SLOW_EVERY_MS = 30 * 60 * 1000;
const SWEEP_MAX_AGE_MS = 3 * 24 * 3600 * 1000;
const sweptAt = new Map(); // id счёта -> когда проверяли
let sweeping = false;
async function sweepPending(now) {
  if (sweeping || !payConfigured()) return 0;
  sweeping = true;
  let paid = 0;
  try {
    const test = payConfig().test;
    for (const pay of store.listPayments()) {
      if (pay.status !== 'pending' || !pay.ykId || Boolean(pay.test) !== test) continue;
      const age = now - Date.parse(pay.createdAt);
      if (!(age < SWEEP_MAX_AGE_MS)) continue;
      if (age >= SWEEP_FRESH_MS && now - (sweptAt.get(pay.id) || 0) < SWEEP_SLOW_EVERY_MS) continue;
      sweptAt.set(pay.id, now);
      try {
        if (await confirmPayment(pay) === 'paid') paid++;
      } catch (err) { console.log(`[оплата] сверка счёта ${pay.id}: нет связи с ЮKassa: ${err.message}`); }
    }
  } finally { sweeping = false; }
  return paid;
}
setInterval(() => {
  sweepPending(Date.now()).then(n => { if (n) console.log(`[оплата] сверка: подключено по оплаченным счетам - ${n}`); })
    .catch(e => console.error('[оплата] сверка: ошибка:', e));
}, SWEEP_EVERY_MS).unref();

const router = express.Router();
// Уведомление ЮKassa (/result) приходит без входа - нужна только настройка.
router.use((req, res, next) => ((req.path === '/result' ? payConfigured() : payEnabled(req.user)) ? next() : res.status(404).json({ error: 'Оплата пока не подключена.' })));

// Кто может оплатить: вошёл, не заблокирован, принял действующие документы.
function payer(req, res) {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Войдите в аккаунт, чтобы оформить подписку.' }); return null; }
  if (user.blocked) { res.status(403).json({ error: 'Аккаунт заблокирован.' }); return null; }
  if (needsReconsent(user)) { res.status(409).json({ error: 'Сначала примите обновлённые документы.' }); return null; }
  return user;
}
function publicQuote(q) {
  return { amount: q.amount, kind: q.kind, credit: q.credit, startsAt: new Date(q.startsAt).toISOString(), until: new Date(q.until).toISOString() };
}

router.get('/quote', (req, res) => {
  const user = payer(req, res);
  if (!user) return;
  const q = quote(user, String(req.query.plan || ''), Number(req.query.months), Date.now());
  if (q.error) return res.status(400).json({ error: q.error });
  res.json(publicQuote(q));
});

router.post('/create', async (req, res, next) => {
  try {
    const user = payer(req, res);
    if (!user) return;
    const planId = String(req.body.plan || ''), months = Number(req.body.months), now = Date.now();
    const q = quote(user, planId, months, now);
    if (q.error) return res.status(400).json({ error: q.error });
    const cfg = payConfig();
    const pay = store.createPayment({
      userId: user.id, email: user.email, plan: planId, months, amount: q.amount, kind: q.kind, credit: q.credit,
      // Для замены с зачётом - какая подписка была и до какого срока (applyPayment).
      fromPlan: user.plan, fromUntil: user.planUntil,
      status: 'pending', test: cfg.test, createdAt: new Date(now).toISOString(),
    });
    const value = q.amount.toFixed(2);
    const description = `Подписка ${PLANS[planId].name} на ${months} мес. - доступ к онлайн-сервису Тара+`;
    const body = {
      amount: { value, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: `${SITE_URL}/pay-success.html?InvId=${pay.id}`, locale: 'ru_RU' },
      description: description.slice(0, 128),
      metadata: { inv: String(pay.id), userId: String(user.id) },
    };
    if (cfg.vatCode) {
      body.receipt = {
        customer: { email: user.email },
        items: [{ description: description.slice(0, 128), quantity: '1.00', amount: { value, currency: 'RUB' }, vat_code: cfg.vatCode, payment_mode: 'full_payment', payment_subject: 'service' }],
      };
    }
    // Ключ идемпотентности - номер счёта: повтор запроса не создаст второй платёж.
    const r = await ykRequest('POST', '', body, `taraplus-inv-${pay.id}`);
    if (!r.ok || !r.data.confirmation || !r.data.confirmation.confirmation_url) {
      console.log(`[оплата] счёт ${pay.id}: ЮKassa не создала платёж (${r.status}): ${r.data.code || ''} ${r.data.description || ''}`);
      store.updatePayment(pay, { status: 'failed' });
      return res.status(502).json({ error: 'Платёжный сервис не ответил. Попробуйте ещё раз через минуту.' });
    }
    store.updatePayment(pay, { ykId: r.data.id });
    console.log(`[оплата] счёт ${pay.id}: ${user.email}, ${planId} × ${months} мес., ${value} ₽ (${q.kind}), платёж ЮKassa ${r.data.id}${cfg.test ? ', тест' : ''}`);
    res.json({ url: r.data.confirmation.confirmation_url, ...publicQuote(q) });
  } catch (err) { next(err); }
});

// Уведомление ЮKassa: JSON { type: 'notification', event, object: платёж }.
// Телу не верим - по object.metadata.inv находим счёт и сверяем платёж через
// API (confirmPayment). Ответ всегда 200 (кроме сбоя связи с ЮKassa - 500,
// ЮKassa повторит уведомление позже): иначе ЮKassa повторяет его сутки.
router.post('/result', async (req, res) => {
  const obj = (req.body && req.body.object) || {};
  const pay = store.getPayment(Number(obj.metadata && obj.metadata.inv));
  if (!pay || pay.ykId !== obj.id) {
    console.log(`[оплата] уведомление ЮKassa без известного счёта (платёж ${String(obj.id || '').slice(0, 64)})`);
    return res.sendStatus(200);
  }
  try {
    await confirmPayment(pay);
    res.sendStatus(200);
  } catch (err) {
    console.log(`[оплата] счёт ${pay.id}: нет связи с ЮKassa при проверке уведомления: ${err.message}`);
    res.sendStatus(500);
  }
});

router.get('/status', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт.' });
  const pay = store.getPayment(Number(req.query.inv));
  if (!pay || pay.userId !== req.user.id) return res.status(404).json({ error: 'Счёт не найден.' });
  // Уведомление могло задержаться - спросить ЮKassa самим.
  try { await confirmPayment(pay); } catch (err) { console.log(`[оплата] счёт ${pay.id}: нет связи с ЮKassa: ${err.message}`); }
  res.json({ status: pay.status, plan: PLANS[pay.plan] ? PLANS[pay.plan].name : pay.plan, months: pay.months, amount: pay.amount, quota: quotaInfo(req.user, Date.now()) });
});

module.exports = { router, payEnabled, quote, sweepPending };
