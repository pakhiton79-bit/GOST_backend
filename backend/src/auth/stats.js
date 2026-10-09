// Статистика для администратора (admin.html): по дням - расчёты (всего и по
// типам ящиков), регистрации, сколько разных аккаунтов считали. День - по
// московскому времени. Хранится вместе с аккаунтами (на бесплатном Render
// стирается при перезапуске так же, как они).
const store = require('./store');

const DAY_MS = 24 * 3600 * 1000;
const MSK_MS = 3 * 3600 * 1000;
const TYPE_NAMES = { i1: 'I-1', i2: 'I-2', i3: 'I-3', i4: 'I-4', ii1: 'II-1', ii1n: 'II-1 (оптимальный)', ii2: 'II-2', iii1: 'III-1', g2991i: 'ГОСТ 2991-85 I' };

function dayKey(ts) {
  return new Date(ts + MSK_MS).toISOString().slice(0, 10);
}
function day(key) {
  const days = store.statsData().days;
  if (!days[key]) days[key] = { calcs: 0, regs: 0, byType: {}, users: [] };
  return days[key];
}

function recordCalc(type, userId, now) {
  const d = day(dayKey(now));
  d.calcs += 1;
  d.byType[type] = (d.byType[type] || 0) + 1;
  if (!d.users.includes(userId)) d.users.push(userId);
  store.save();
}
function recordRegistration(now) {
  day(dayKey(now)).regs += 1;
  store.save();
}

// Сводка: итоги и ряды за последние n дней (сегодня - последний).
function summary(now, n) {
  const days = store.statsData().days;
  const keys = [];
  for (let i = n - 1; i >= 0; i--) keys.push(dayKey(now - i * DAY_MS));
  const daily = keys.map(k => ({ date: k, calcs: (days[k] || {}).calcs || 0, regs: (days[k] || {}).regs || 0 }));
  const sumLast = (m, f) => keys.slice(-m).reduce((s, k) => s + (days[k] ? f(days[k]) : 0), 0);
  const activeLast = m => new Set(keys.slice(-m).flatMap(k => (days[k] ? days[k].users : []))).size;
  const byType = Object.keys(TYPE_NAMES).map(t => ({ type: t, name: TYPE_NAMES[t], calcs: sumLast(n, d => d.byType[t] || 0) }));
  const users = store.listUsers();
  const byPlan = { free: 0, base: 0, pro: 0, team: 0 };
  users.forEach(u => { if (u.verified) byPlan[u.plan] = (byPlan[u.plan] || 0) + 1; });
  return {
    totals: {
      users: users.filter(u => u.verified).length,
      unverified: users.filter(u => !u.verified).length,
      byPlan,
      calcsToday: sumLast(1, d => d.calcs), calcs7: sumLast(7, d => d.calcs), calcs30: sumLast(30, d => d.calcs),
      calcsAll: Object.keys(days).reduce((s, k) => s + days[k].calcs, 0),
      regs7: sumLast(7, d => d.regs), regs30: sumLast(30, d => d.regs),
      active7: activeLast(7), active30: activeLast(30),
    },
    daily, byType,
  };
}

module.exports = { recordCalc, recordRegistration, summary };
