// Оплата подписок через Робокассу (по указанию пользователя). Настройки -
// переменные окружения (вписывает владелец сайта, /etc/taraplus/env):
//   ROBOKASSA_LOGIN  - идентификатор магазина;
//   ROBOKASSA_PASS1  - пароль #1 (подпись ссылки на оплату);
//   ROBOKASSA_PASS2  - пароль #2 (проверка уведомления об оплате);
//   ROBOKASSA_TEST   - 1: тестовый режим (тестовые пароли из технических
//                      настроек магазина, деньги не списываются);
//   ROBOKASSA_HASH   - алгоритм подписи, как в технических настройках
//                      магазина: sha256 (по умолчанию), md5, sha1, sha384, sha512.
// Пока логин или пароли не заданы - оплаты нет (на странице подписок кнопки
// «Скоро»), маршруты отвечают 404. В тестовом режиме оплата видна и
// доступна только администраторам (ADMIN_EMAILS): посетители не получат
// подписку тестовой картой, пока режим не выключен. В боевом режиме
// уведомление о тестовом платеже (IsTest=1) не принимается.
//
// Технические настройки магазина в кабинете Робокассы:
//   Result URL  - https://<домен>/api/pay/result (метод POST);
//   Success URL - https://<домен>/pay-success.html (GET);
//   Fail URL    - https://<домен>/pay-fail.html (GET).
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
// Подписка подключается только по уведомлению Робокассы (Result URL) с
// проверенной подписью; страница Success лишь показывает результат.
//
// Маршруты:
//   GET  /api/pay/quote?plan&months - сумма и что произойдёт (для окна на сайте);
//   POST /api/pay/create { plan, months } - счёт и ссылка на оплату;
//   POST /api/pay/result - уведомление Робокассы об оплате (ответ «OK<InvId>»);
//   GET  /api/pay/status?inv - состояние своего счёта (страница Success).
const crypto = require('crypto');
const express = require('express');
const store = require('./store');
const { PLANS, PLAN_TERMS, PERIOD_MS, planOf, syncUser, quotaInfo } = require('./plans');
const { needsReconsent } = require('./legal');
const { isAdmin } = require('./routes');

const PAY_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';
const HASHES = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];

function payConfig() {
  const env = process.env;
  const hash = String(env.ROBOKASSA_HASH || 'sha256').toLowerCase();
  return {
    login: env.ROBOKASSA_LOGIN || '', pass1: env.ROBOKASSA_PASS1 || '', pass2: env.ROBOKASSA_PASS2 || '',
    test: env.ROBOKASSA_TEST === '1', hash: HASHES.includes(hash) ? hash : 'sha256',
  };
}
function payConfigured() {
  const c = payConfig();
  return Boolean(c.login && c.pass1 && c.pass2);
}
// Оплата доступна этому посетителю: настроена и (в тестовом режиме) он
// администратор.
function payEnabled(user) {
  return payConfigured() && (!payConfig().test || isAdmin(user));
}
if (payConfigured() && payConfig().test) console.log('[оплата] ТЕСТОВЫЙ режим Робокассы (ROBOKASSA_TEST=1): оплата доступна только администраторам');
function sign(cfg, parts) {
  return crypto.createHash(cfg.hash).update(parts.join(':')).digest('hex');
}
function sameSign(a, b) {
  const x = Buffer.from(String(a || '').toLowerCase()), y = Buffer.from(String(b || '').toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
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

// Подключить оплаченную подписку (уведомление Робокассы). Состояние аккаунта
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

const router = express.Router();
// Уведомление Робокассы (/result) приходит без входа - нужна только настройка.
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

router.post('/create', (req, res) => {
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
  const outSum = q.amount.toFixed(2);
  const params = new URLSearchParams({
    MerchantLogin: cfg.login, OutSum: outSum, InvId: String(pay.id),
    Description: `Подписка ${PLANS[planId].name} на ${months} мес. - доступ к онлайн-сервису Тара+`,
    SignatureValue: sign(cfg, [cfg.login, outSum, pay.id, cfg.pass1]),
    Email: user.email, Culture: 'ru',
  });
  if (cfg.test) params.set('IsTest', '1');
  console.log(`[оплата] счёт ${pay.id}: ${user.email}, ${planId} × ${months} мес., ${outSum} ₽ (${q.kind})${cfg.test ? ', тест' : ''}`);
  res.json({ url: `${PAY_URL}?${params}`, ...publicQuote(q) });
});

// Уведомление об оплате: Робокасса шлёт POST (или GET) с OutSum, InvId,
// SignatureValue = hash(OutSum:InvId:пароль #2). Повторное уведомление по
// уже оплаченному счёту - снова «OK» без повторного подключения.
router.all('/result', express.urlencoded({ extended: false }), (req, res) => {
  const p = { ...req.query, ...(req.body || {}) };
  const cfg = payConfig();
  const pay = store.getPayment(Number(p.InvId));
  if (!pay || !sameSign(p.SignatureValue, sign(cfg, [p.OutSum, p.InvId, cfg.pass2]))) {
    console.log(`[оплата] отклонено уведомление по счёту ${p.InvId}: неверная подпись или счёт`);
    return res.status(400).send('bad sign');
  }
  // Тестовый платёж в боевом режиме - отклонить (на случай, если тестовые
  // пароли совпали с боевыми).
  if (!cfg.test && String(p.IsTest || '') === '1') {
    console.log(`[оплата] счёт ${pay.id}: тестовый платёж в боевом режиме - отклонено`);
    return res.status(400).send('test payment');
  }
  if (Math.abs(Number(p.OutSum) - pay.amount) > 0.005) {
    console.log(`[оплата] счёт ${pay.id}: сумма ${p.OutSum} не совпадает с ${pay.amount}`);
    return res.status(400).send('bad sum');
  }
  if (pay.status !== 'paid') {
    const now = Date.now();
    const result = applyPayment(pay, now);
    store.updatePayment(pay, { status: 'paid', paidAt: new Date(now).toISOString(), result });
    console.log(`[оплата] счёт ${pay.id} оплачен: ${pay.email}, ${pay.plan} × ${pay.months} мес., ${pay.amount} ₽ - подписка ${result}`);
  }
  res.type('text/plain').send(`OK${pay.id}`);
});

router.get('/status', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт.' });
  const pay = store.getPayment(Number(req.query.inv));
  if (!pay || pay.userId !== req.user.id) return res.status(404).json({ error: 'Счёт не найден.' });
  res.json({ status: pay.status, plan: PLANS[pay.plan] ? PLANS[pay.plan].name : pay.plan, months: pay.months, amount: pay.amount, quota: quotaInfo(req.user, Date.now()) });
});

module.exports = { router, payEnabled, quote };
