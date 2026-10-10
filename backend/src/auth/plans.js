// Подписки и лимиты расчётов (по указанию пользователя). Пока без оплаты:
// платные подписки выдаёт администратор вручную (admin.html).
//
//   Пробная (id free) - только 20 расчётов за регистрацию (один раз, не
//          сгорают; месячных расчётов нет), 1 устройство, бесплатно;
//   Base - 25 расчётов в месяц, 1 устройство, 5 000 ₽ в месяц;
//   Pro  - 150 расчётов в месяц, 1 устройство, 10 000 ₽ в месяц;
//   Team - 2500 расчётов в месяц на аккаунт, 4 устройства, 30 000 ₽ в месяц.
// Расчёт - каждое успешное нажатие «Рассчитать». Месяц - 30 дней (по
// указанию пользователя, после аудита) от даты подключения подписки (у
// пробной - от регистрации); неиспользованные расчёты месяца не переносятся.
// Платную подписку администратор выдаёт на 1 или 3 месяца (PLAN_TERMS);
// по окончании срока (planUntil) аккаунт переходит на пробную, лишние входы
// на устройствах завершаются. prioritySupport - приоритетное обслуживание (по
// указанию пользователя - в Pro и Team): заявки и сообщения об ошибках от этих
// подписок в админке помечены и стоят первыми. customStandards - можно прислать заявку на
// внутренний стандарт своего завода (standards.js; по указанию пользователя -
// во всех подписках, кроме пробной). id пробной - прежний «free» (так он записан у
// существующих аккаунтов). Порядок ключей - порядок подписок на сайте.
const PLANS = {
  free: { name: 'Пробная', monthly: 0, devices: 1, price: null, customStandards: false, prioritySupport: false },
  base: { name: 'Base', monthly: 25, devices: 1, price: 5000, customStandards: true, prioritySupport: false },
  pro:  { name: 'Pro',  monthly: 150, devices: 1, price: 10000, customStandards: true, prioritySupport: true },
  team: { name: 'Team', monthly: 2500, devices: 4, price: 30000, customStandards: true, prioritySupport: true },
};
const WELCOME_CALCS = 20;
const PERIOD_MS = 30 * 24 * 3600 * 1000;  // «месяц» подписки
const PLAN_TERMS = [1, 3];                // срок платной подписки, месяцев
// Следующая подписка (для предложения «Больше в ...»): по порядку PLANS.
function nextPlan(id) {
  const ids = Object.keys(PLANS);
  const i = ids.indexOf(id);
  return i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;
}

function planOf(user) {
  return PLANS[user.plan] || PLANS.free;
}

// Текущий месяц (30 дней) подписки: [start, end).
function periodBounds(anchor, now) {
  const k = Math.max(0, Math.floor((now - anchor) / PERIOD_MS));
  return { start: anchor + k * PERIOD_MS, end: anchor + (k + 1) * PERIOD_MS };
}

// Поля подписки у пользователя (у старых записей - значения по умолчанию)
// и сброс счётчика, если начался новый месяц. Возвращает true, если что-то
// поменялось (нужно сохранить).
function syncUser(user, now) {
  let changed = false;
  if (!PLANS[user.plan]) { user.plan = 'free'; changed = true; }
  if (!Number.isFinite(user.planSince)) { user.planSince = Date.parse(user.createdAt) || now; changed = true; }
  if (!Number.isInteger(user.welcomeLeft)) { user.welcomeLeft = WELCOME_CALCS; changed = true; }
  if (!Number.isInteger(user.used)) { user.used = 0; changed = true; }
  // Платная подписка без срока (выдана до появления сроков) - на 1 месяц от
  // подключения.
  if (user.plan !== 'free' && !Number.isFinite(user.planUntil)) { user.planUntil = user.planSince + PERIOD_MS; changed = true; }
  // Срок вышел - пробная с этого момента (бонус за регистрацию не меняется).
  if (user.plan !== 'free' && now >= user.planUntil) {
    Object.assign(user, { plan: 'free', planSince: now, planUntil: null, planExpiredAt: now, used: 0 });
    changed = true;
  }
  // Пробная - автопродления нет (auto-renew.js).
  if (user.plan === 'free' && user.autoRenew && user.autoRenew.on) {
    user.autoRenew = { ...user.autoRenew, on: false, offAt: now, offReason: 'подписка закончилась' };
    changed = true;
  }
  const { start } = periodBounds(user.planSince, now);
  if (user.periodStart !== start) { user.periodStart = start; user.used = 0; changed = true; }
  return changed;
}

function quotaInfo(user, now) {
  const p = planOf(user);
  const { start, end } = periodBounds(user.planSince, now);
  const monthlyLeft = Math.max(0, p.monthly - user.used);
  return {
    plan: user.plan, planName: p.name, devices: p.devices,
    planUntil: Number.isFinite(user.planUntil) ? new Date(user.planUntil).toISOString() : null,
    monthly: p.monthly, used: user.used, monthlyLeft,
    welcomeLeft: user.welcomeLeft, welcomeTotal: WELCOME_CALCS, left: monthlyLeft + user.welcomeLeft,
    periodStart: new Date(start).toISOString(), periodEnd: new Date(end).toISOString(),
  };
}

// Списать один расчёт: сначала месячные, потом бонус за регистрацию.
// false - расчётов не осталось.
function consume(user) {
  if (user.used < planOf(user).monthly) { user.used += 1; return true; }
  if (user.welcomeLeft > 0) { user.welcomeLeft -= 1; return true; }
  return false;
}

function publicPlans() {
  return Object.keys(PLANS).map(id => ({ id, ...PLANS[id], welcome: id === 'free' ? WELCOME_CALCS : 0 }));
}

module.exports = { PLANS, WELCOME_CALCS, PERIOD_MS, PLAN_TERMS, planOf, periodBounds, syncUser, quotaInfo, consume, publicPlans, nextPlan };
