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
//   payment.canceled, refund.succeeded.
// Возврат (кабинет ЮKassa → Платежи → «Вернуть», по указанию пользователя):
// полный - оплаченное этим счётом время снимается (applyRefund), частичный -
// подписка не меняется, аккаунт помечается для администратора (refundNote).
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
// Автопродление (по указанию пользователя; п. 6.6-6.10 Пользовательского
// соглашения, правила - auto-renew.js): при оплате с галочкой «Продлевать
// автоматически» ЮKassa сохраняет способ оплаты (save_payment_method), сайт
// хранит только его id и название вида «Mir •••• 4477» (user.card), данные
// карты - у ЮKassa. Списание (chargeRenewals) - в конце срока подписки, но не
// раньше чем через MIN_NOTICE_MS после письма-напоминания; не прошло -
// ещё одна попытка за RETRY_BEFORE_MS до окончания, затем подписка
// заканчивается как обычно. Об отказе - письмо. В кабинете ЮKassa для
// магазина должны быть разрешены автоплатежи.
//
// Маршруты:
//   GET  /api/pay/quote?plan&months - сумма и что произойдёт (для окна на сайте);
//   POST /api/pay/create { plan, months, autoRenew } - счёт, платёж ЮKassa и ссылка на оплату
//                                      (autoRenew: true - согласие на автопродление, карта сохраняется);
//   POST /api/pay/result - уведомление ЮKassa (ответ 200, иначе ЮKassa повторяет);
//   GET  /api/pay/status?inv - состояние своего счёта (страница pay-success.html).
const express = require('express');
const store = require('./store');
const { PLANS, PLAN_TERMS, PERIOD_MS, planOf, syncUser, quotaInfo } = require('./plans');
const { LEGAL_VERSION, needsReconsent } = require('./legal');
const { isAdmin } = require('./routes');
const { autoRenewEnabled, renewAmount } = require('./auto-renew');
const { sendAutoRenewFailed, sendExpiryReminder } = require('./mailer');

const API_URL = 'https://api.yookassa.ru/v3';
const SITE_URL = (process.env.SITE_URL || 'https://taraplus.site').replace(/\/+$/, '');
const DAY_MS = 24 * 3600 * 1000;

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

// Тело платежа ЮKassa: сумма, описание, номер счёта и (YOOKASSA_VAT_CODE) чек.
function paymentBody(pay, email, description) {
  const cfg = payConfig(), value = pay.amount.toFixed(2);
  const body = {
    amount: { value, currency: 'RUB' },
    capture: true,
    description: description.slice(0, 128),
    metadata: { inv: String(pay.id), userId: String(pay.userId) },
  };
  if (cfg.vatCode) {
    body.receipt = {
      customer: { email },
      items: [{ description: description.slice(0, 128), quantity: '1.00', amount: { value, currency: 'RUB' }, vat_code: cfg.vatCode, payment_mode: 'full_payment', payment_subject: 'service' }],
    };
  }
  return body;
}

// Название сохранённого способа оплаты для страницы: «Mir •••• 4477».
function cardTitle(pm) {
  if (pm.card && pm.card.last4) return `${pm.card.card_type && pm.card.card_type !== 'Unknown' ? pm.card.card_type + ' ' : 'Карта '}•••• ${pm.card.last4}`;
  return pm.title || 'Сохранённый способ оплаты';
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
  const r = await ykRequest('GET', '/payments/' + encodeURIComponent(pay.ykId));
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
  console.log(`[оплата] счёт ${pay.id} оплачен: ${pay.email}, ${pay.plan} × ${pay.months} мес., ${pay.amount} ₽ - подписка ${result}${pay.renew ? ' (автопродление)' : ''}`);
  // Оплата с согласием на автопродление - сохранить способ оплаты и включить.
  const user = store.findUserById(pay.userId);
  if (user && pay.arConsent && yk.payment_method && yk.payment_method.saved && yk.payment_method.id) {
    syncUser(user, now);
    const card = { id: yk.payment_method.id, title: cardTitle(yk.payment_method), savedAt: now, test: Boolean(yk.test) };
    store.updateUser(user, { card, autoRenew: user.plan === 'free' ? user.autoRenew : { on: true, since: now, ...pay.arConsent } });
    console.log(`[автопродление] ${user.email}: сохранён способ оплаты ${card.title}, автопродление включено`);
  }
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
// ---- Автопродление: списание с сохранённой карты ----
// Попытка 1 - когда прошло MIN_NOTICE_MS после письма (noticeAt, auto-renew.js)
// и до конца срока не больше CHARGE_BEFORE_MS; попытка 2 - если первая не
// прошла, за RETRY_BEFORE_MS до конца. Счётчик попыток - на каждый срок
// (renewFor = planUntil). Пока по аккаунту есть неоплаченный счёт
// автопродления - новая попытка не начинается (его подтвердит sweepPending).
const MIN_NOTICE_MS = 3 * 24 * 3600 * 1000;
const CHARGE_BEFORE_MS = 12 * 3600 * 1000;
const RETRY_BEFORE_MS = 2 * 3600 * 1000;
const MAX_ATTEMPTS = 2;
// Причины отказа ЮKassa, после которых карта больше не годится.
const CARD_DEAD = ['permission_revoked', 'card_expired', 'payment_method_restricted', 'payment_method_limit_exceeded'];
let charging = false;

// Аккаунт, которому пора списывать: { attempt } или null.
function renewalDue(user, now) {
  const ar = user.autoRenew, cfg = payConfig();
  if (!ar || !ar.on || !user.card || Boolean(user.card.test) !== cfg.test) return null;
  if (user.plan === 'free' || !PLANS[user.plan].price || !Number.isFinite(user.planUntil) || now >= user.planUntil) return null;
  if (Array.isArray(user.queue) && user.queue.length) return null; // следующая подписка уже оплачена
  // Письмо-напоминание об этом списании ушло не меньше чем за 3 дня (п. 6.8).
  if (ar.noticeFor !== user.planUntil || !Number.isFinite(ar.noticeAt) || now < ar.noticeAt + MIN_NOTICE_MS) return null;
  const tries = ar.renewFor === user.planUntil ? (ar.renewTries || 0) : 0;
  if (tries >= MAX_ATTEMPTS) return null;
  const left = user.planUntil - now;
  if (tries === 0 ? left > CHARGE_BEFORE_MS : left > RETRY_BEFORE_MS) return null;
  if (store.listPayments().some(p => p.userId === user.id && p.renew && p.status === 'pending')) return null;
  return { attempt: tries + 1 };
}

async function chargeRenewals(now) {
  if (charging || !payConfigured() || !autoRenewEnabled()) return 0;
  charging = true;
  let done = 0;
  try {
    for (const user of store.listUsers()) {
      if (syncUser(user, now)) store.updateUser(user);
      const due = renewalDue(user, now);
      if (!due) continue;
      const months = Number.isInteger(user.planMonths) && PLAN_TERMS.includes(user.planMonths) ? user.planMonths : 1;
      const until = user.planUntil;
      store.updateUser(user, { autoRenew: { ...user.autoRenew, renewFor: until, renewTries: due.attempt, renewAt: now } });
      const pay = store.createPayment({
        userId: user.id, email: user.email, plan: user.plan, months, amount: renewAmount(user), kind: 'extend', credit: 0,
        fromPlan: user.plan, fromUntil: until, status: 'pending', test: payConfig().test, createdAt: new Date(now).toISOString(),
        renew: true, attempt: due.attempt,
      });
      const body = paymentBody(pay, user.email, `Автопродление подписки ${PLANS[user.plan].name} на ${months} мес. - доступ к онлайн-сервису Тара+`);
      body.payment_method_id = user.card.id;
      let status = 'pending', reason = '';
      try {
        const r = await ykRequest('POST', '/payments', body, `taraplus-inv-${pay.id}`);
        if (r.ok && r.data.id) {
          store.updatePayment(pay, { ykId: r.data.id });
          status = await confirmPayment(pay);
          reason = (r.data.cancellation_details && r.data.cancellation_details.reason) || pay.cancelReason || '';
        } else {
          store.updatePayment(pay, { status: 'failed' });
          status = 'failed';
          reason = r.data.code || String(r.status);
          console.log(`[автопродление] счёт ${pay.id}: ЮKassa не создала списание (${r.status}): ${r.data.code || ''} ${r.data.description || ''}`);
        }
      } catch (err) {
        // Нет связи - счёт без платежа ЮKassa, попытка не считается.
        store.updatePayment(pay, { status: 'failed' });
        store.updateUser(user, { autoRenew: { ...user.autoRenew, renewTries: due.attempt - 1 } });
        console.log(`[автопродление] ${user.email}: нет связи с ЮKassa: ${err.message}`);
        continue;
      }
      console.log(`[автопродление] ${user.email}: попытка ${due.attempt}, счёт ${pay.id} - ${status}${reason ? ' (' + reason + ')' : ''}`);
      if (status === 'paid') { done++; continue; }
      if (status === 'pending') continue; // подтвердит sweepPending
      await renewalFailed(user, until, due.attempt, reason);
    }
  } finally { charging = false; }
  return done;
}

// Списание не прошло: карта больше не годится - отвязать и выключить
// автопродление; письмо - после каждой неудачной попытки (п. 6.9).
async function renewalFailed(user, until, attempt, reason) {
  const dead = CARD_DEAD.includes(reason);
  if (dead) {
    store.updateUser(user, { card: null, autoRenew: { ...user.autoRenew, on: false, offAt: Date.now(), offReason: 'карта больше не принимается (' + reason + ')' } });
  }
  const final = dead || attempt >= MAX_ATTEMPTS;
  try {
    await sendAutoRenewFailed(user.email, { planName: PLANS[user.plan] ? PLANS[user.plan].name : user.plan, date: new Date(until), final, cardDead: dead });
  } catch (e) { console.error(`[автопродление] письмо об отказе ${user.email} не отправлено: ${e.message}`); }
}

setInterval(() => {
  sweepPending(Date.now()).then(n => { if (n) console.log(`[оплата] сверка: подключено по оплаченным счетам - ${n}`); })
    .catch(e => console.error('[оплата] сверка: ошибка:', e));
}, SWEEP_EVERY_MS).unref();
// ---- Письмо «Подписка заканчивается» (по указанию пользователя) ----
// За EXPIRY_NOTICE_MS до конца платной подписки - письмо со ссылкой на
// оплату продления (plans.html?renew=<подписка>), один раз на срок
// (expiryNoticeFor = planUntil). Не отправляется: автопродление включено с
// картой (придёт его письмо), следующая подписка уже оплачена (очередь),
// оплата на сайте недоступна посетителям (не настроена или тестовый режим).
const EXPIRY_NOTICE_MS = 4 * DAY_MS;
async function sendExpiryReminders(now) {
  const cfg = payConfig();
  if (!payConfigured() || cfg.test) return 0;
  let sent = 0;
  for (const user of store.listUsers()) {
    if (syncUser(user, now)) store.updateUser(user);
    if (user.plan === 'free' || !PLANS[user.plan].price || !Number.isFinite(user.planUntil) || user.blocked) continue;
    if (user.planUntil - now > EXPIRY_NOTICE_MS || user.planUntil <= now || user.expiryNoticeFor === user.planUntil) continue;
    if (Array.isArray(user.queue) && user.queue.length) continue;
    if (autoRenewEnabled() && user.autoRenew && user.autoRenew.on && user.card) continue;
    try {
      await sendExpiryReminder(user.email, { planName: PLANS[user.plan].name, planId: user.plan, date: new Date(user.planUntil) });
      store.updateUser(user, { expiryNoticeFor: user.planUntil });
      sent++;
    } catch (e) { console.error(`[подписка] письмо об окончании ${user.email} не отправлено: ${e.message}`); }
  }
  return sent;
}
setInterval(() => {
  sendExpiryReminders(Date.now()).then(n => { if (n) console.log(`[подписка] писем об окончании подписки: ${n}`); })
    .catch(e => console.error('[подписка] письма об окончании: ошибка:', e));
}, 3600 * 1000).unref();

setInterval(() => {
  chargeRenewals(Date.now()).then(n => { if (n) console.log(`[автопродление] продлено подписок: ${n}`); })
    .catch(e => console.error('[автопродление] ошибка:', e));
}, 10 * 60 * 1000).unref();

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
    // Согласие на автопродление (галочка в окне оплаты, п. 6.6) - записывается
    // в счёт, включается после оплаты вместе с сохранённой картой.
    const arConsent = req.body.autoRenew === true && autoRenewEnabled() ? { ip: req.ip, version: LEGAL_VERSION, consentAt: now } : null;
    const pay = store.createPayment({
      userId: user.id, email: user.email, plan: planId, months, amount: q.amount, kind: q.kind, credit: q.credit,
      // Для замены с зачётом - какая подписка была и до какого срока (applyPayment).
      fromPlan: user.plan, fromUntil: user.planUntil,
      status: 'pending', test: cfg.test, createdAt: new Date(now).toISOString(), arConsent,
    });
    const value = q.amount.toFixed(2);
    const body = paymentBody(pay, user.email, `Подписка ${PLANS[planId].name} на ${months} мес. - доступ к онлайн-сервису Тара+`);
    body.confirmation = { type: 'redirect', return_url: `${SITE_URL}/pay-success.html?InvId=${pay.id}`, locale: 'ru_RU' };
    if (arConsent) body.save_payment_method = true;
    // Ключ идемпотентности - номер счёта: повтор запроса не создаст второй платёж.
    const r = await ykRequest('POST', '/payments', body, `taraplus-inv-${pay.id}`);
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

// ---- Возвраты ----
// Полный возврат (возвращено столько, сколько оплачено, - одним или
// несколькими частичными) снимает оплаченное этим счётом время:
//   - подключена / продлена - срок подписки короче на оплаченный (дошёл до
//     «сейчас» - пробная или следующая из очереди, syncUser);
//   - подключена с зачётом - возвращается прежняя подписка до прежнего срока;
//   - начнётся после текущей - убирается из очереди.
// Если аккаунт с тех пор изменился так, что снять точно нельзя (другая
// подписка, нет в очереди), - ничего не меняется, пометка для администратора.
// Частичный возврат подписку не трогает (вернули часть по договорённости) -
// только пометка.
function applyRefund(pay, now) {
  const user = store.findUserById(pay.userId);
  if (!user) return 'аккаунт удалён';
  syncUser(user, now);
  const len = pay.months * PERIOD_MS;
  if (pay.result === 'начнётся после текущей') {
    const queue = Array.isArray(user.queue) ? user.queue.slice() : [];
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].plan !== pay.plan || queue[i].months < pay.months) continue;
      if (queue[i].months === pay.months) queue.splice(i, 1);
      else queue[i] = { plan: queue[i].plan, months: queue[i].months - pay.months };
      store.updateUser(user, { queue });
      return 'убрана из очереди';
    }
  } else if (user.plan === pay.plan && Number.isFinite(user.planUntil)) {
    if (pay.result === 'подключена с зачётом' && PLANS[pay.fromPlan] && pay.fromUntil > now) {
      store.updateUser(user, { plan: pay.fromPlan, planUntil: pay.fromUntil, planSince: now, periodStart: now, used: 0 });
      return `возвращена прежняя подписка ${PLANS[pay.fromPlan].name}`;
    }
    store.updateUser(user, { planUntil: user.planUntil - len });
    if (syncUser(user, now)) store.updateUser(user);
    return user.plan === 'free' ? 'подписка снята, теперь пробная' : 'срок сокращён';
  }
  return null; // снять точно нельзя - решает администратор
}

// Уведомление о возврате: refund.payment_id - платёж ЮKassa. Сумма
// возвращённого - из самого платежа в API (refunded_amount), не из
// уведомления.
async function handleRefund(obj) {
  const ykId = String(obj.payment_id || '');
  const pay = ykId && store.listPayments().find(p => p.ykId === ykId);
  if (!pay || pay.status !== 'paid') {
    console.log(`[возврат] уведомление без оплаченного счёта (платёж ${ykId.slice(0, 64)})`);
    return;
  }
  const r = await ykRequest('GET', '/payments/' + encodeURIComponent(ykId));
  if (!r.ok) throw new Error(`ЮKassa ответила ${r.status} на запрос платежа`);
  const refunded = Number(r.data.refunded_amount && r.data.refunded_amount.value) || 0;
  // Возврат из админки (refundUser) - подписка уже переведена на пробную.
  if (pay.adminRefund) { if (refunded > (pay.refunded || 0)) store.updatePayment(pay, { refunded }); return; }
  if (!(refunded > (pay.refunded || 0))) return; // уже учтено
  const now = Date.now(), full = refunded >= pay.amount - 0.005;
  store.updatePayment(pay, { refunded, refundedAt: new Date(now).toISOString() });
  const user = store.findUserById(pay.userId);
  if (full && !pay.refundApplied) {
    const result = applyRefund(pay, now);
    store.updatePayment(pay, { refundApplied: true, refundResult: result || 'не снято - проверить вручную' });
    // Снято - прежняя пометка (частичный возврат) больше не нужна.
    if (user) store.updateUser(user, { refundNote: result ? null : `полный возврат ${refunded} ₽ по счёту ${pay.id} - подписку проверить вручную` });
    console.log(`[возврат] счёт ${pay.id}: ${pay.email}, возвращено ${refunded} ₽ (полностью) - ${result || 'подписка не изменена, проверить вручную'}`);
  } else if (!full) {
    if (user) store.updateUser(user, { refundNote: `частичный возврат ${refunded} из ${pay.amount} ₽ по счёту ${pay.id} - подписка не изменена` });
    console.log(`[возврат] счёт ${pay.id}: ${pay.email}, возвращено ${refunded} из ${pay.amount} ₽ (частично) - подписка не изменена`);
  }
}

// Возврат из админки по заявлению пользователя (п. 6.4 соглашения, по
// указанию пользователя): стоимость неиспользованной части - пропорционально
// оставшимся полным дням. Неиспользованное время (до конца текущей подписки
// и оплаченные вперёд из очереди) раскладывается по оплатам с последней:
// последняя оплата покрывает самый конец. Время, выданное администратором
// без оплаты, не возвращается. После возврата - «Пробная» (п. 6.4).
function refundQuote(user, now) {
  if (syncUser(user, now)) store.updateUser(user);
  const cfg = payConfig();
  let tail = (user.plan !== 'free' && user.planUntil > now ? user.planUntil - now : 0)
    + (Array.isArray(user.queue) ? user.queue.reduce((s, q) => s + q.months * PERIOD_MS, 0) : 0);
  const days = Math.floor(tail / DAY_MS);
  const items = [];
  const paid = store.listPayments()
    .filter(p => p.userId === user.id && p.status === 'paid' && p.ykId && Boolean(p.test) === cfg.test && p.amount - (p.refunded || 0) > 0.005)
    .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt));
  for (const p of paid) {
    if (tail <= 0) break;
    const len = p.months * PERIOD_MS, covered = Math.min(len, tail);
    tail -= covered;
    const unusedDays = Math.floor(covered / DAY_MS);
    const refundable = Math.min(p.amount - (p.refunded || 0), Math.floor(p.amount * unusedDays * DAY_MS / len));
    if (refundable > 0) items.push({ inv: p.id, paidAt: p.paidAt, plan: p.plan, months: p.months, amount: p.amount, refunded: p.refunded || 0, unusedDays, refundable });
  }
  return { days, items, total: items.reduce((s, i) => s + i.refundable, 0) };
}

// Вернуть amount ₽ (не больше расчёта refundQuote) через ЮKassa и перевести
// аккаунт на пробную. Сумма раскладывается по оплатам с последней.
async function refundUser(user, amount, now) {
  const q = refundQuote(user, now);
  if (!(amount > 0) || amount > q.total + 0.005) return { error: `Сумма возврата - от 1 до ${q.total} ₽.` };
  const cfg = payConfig();
  let left = Math.round(amount * 100) / 100, done = 0;
  const results = [];
  for (const it of q.items) {
    if (left <= 0) break;
    const take = Math.min(it.refundable, left), pay = store.getPayment(it.inv);
    const value = take.toFixed(2);
    const body = { payment_id: pay.ykId, amount: { value, currency: 'RUB' }, description: `Возврат за неиспользованные дни подписки (счёт ${pay.id})` };
    if (cfg.vatCode) body.receipt = { customer: { email: pay.email }, items: [{ description: `Подписка ${PLANS[pay.plan] ? PLANS[pay.plan].name : pay.plan} - возврат`, quantity: '1.00', amount: { value, currency: 'RUB' }, vat_code: cfg.vatCode, payment_mode: 'full_payment', payment_subject: 'service' }] };
    // Уведомление refund.succeeded по этому счёту не меняет подписку (handleRefund).
    store.updatePayment(pay, { adminRefund: true, refundApplied: true });
    const r = await ykRequest('POST', '/refunds', body, `taraplus-refund-${pay.id}-${((pay.refunded || 0) + take).toFixed(2)}`);
    if (!r.ok || !['succeeded', 'pending'].includes(r.data.status)) {
      console.log(`[возврат] счёт ${pay.id}: ЮKassa не приняла возврат ${value} ₽ (${r.status}): ${r.data.code || ''} ${r.data.description || ''}`);
      results.push({ inv: pay.id, error: r.data.description || 'ЮKassa не приняла возврат' });
      break;
    }
    store.updatePayment(pay, { refunded: (pay.refunded || 0) + take, refundedAt: new Date(now).toISOString(), refundResult: 'возврат из админки' });
    results.push({ inv: pay.id, refunded: take, status: r.data.status });
    left -= take; done += take;
    console.log(`[возврат] счёт ${pay.id}: ${pay.email}, возвращено ${value} ₽ из админки (${r.data.status})`);
  }
  if (done > 0) {
    store.updateUser(user, { plan: 'free', planSince: now, planUntil: null, planExpiredAt: now, used: 0, queue: [], refundNote: null,
      autoRenew: user.autoRenew ? { ...user.autoRenew, on: false, offAt: now, offReason: 'возврат по заявлению' } : user.autoRenew });
    syncUser(user, now); store.updateUser(user);
  }
  return { refunded: done, results, error: done < amount - 0.005 ? `Возвращено ${done} из ${amount} ₽: ${(results.find(x => x.error) || {}).error || 'ошибка'}` : null };
}

// Уведомление ЮKassa: JSON { type: 'notification', event, object: платёж }.
// Телу не верим - по object.metadata.inv находим счёт и сверяем платёж через
// API (confirmPayment). Ответ всегда 200 (кроме сбоя связи с ЮKassa - 500,
// ЮKassa повторит уведомление позже): иначе ЮKassa повторяет его сутки.
router.post('/result', async (req, res) => {
  const obj = (req.body && req.body.object) || {};
  if (String(req.body && req.body.event || '').startsWith('refund.')) {
    try { await handleRefund(obj); res.sendStatus(200); } catch (err) {
      console.log(`[возврат] нет связи с ЮKassa при проверке уведомления: ${err.message}`);
      res.sendStatus(500);
    }
    return;
  }
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

module.exports = { router, payEnabled, quote, sweepPending, chargeRenewals, refundQuote, refundUser, sendExpiryReminders };
