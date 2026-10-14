// Тара+ - бэкенд: расчёты ящиков по ГОСТ 10198-91 (I-1, I-2, I-3, I-4, II-1,
// II-2 и их оптимальные версии, III-1) и ГОСТ 2991-85 (I, II-1) за HTTP API
// (src/<тип>/compute.js), аккаунты и подписки (src/auth), раздача
// фронтенда (frontend/public).
const path = require('path');
const express = require('express');

const { computeGost10198I3 } = require('./src/i3/compute');
const { computeGost10198I1 } = require('./src/i1/compute');
const { computeGost10198I2 } = require('./src/i2/compute');
const { computeGost10198I4 } = require('./src/i4/compute');
const { computeGost10198II1 } = require('./src/ii1/compute');
const { computeGost10198II1N } = require('./src/ii1n/compute');
const { computeGost10198II2 } = require('./src/ii2/compute');
const { computeGost10198II2N } = require('./src/ii2n/compute');
const { computeGost10198III1 } = require('./src/iii1/compute');
const { computeGost10198III1N } = require('./src/iii1n/compute');
const { computeGost2991I } = require('./src/g2991/i/compute');
const { computeGost2991II1 } = require('./src/g2991/ii1/compute');
const { G2991_THICKNESS_OPTIONS, G2991_WIDTH_OPTIONS } = require('./src/g2991/table2');
const { router: authRoutes } = require('./src/auth/routes');
const adminRoutes = require('./src/auth/admin');
const standardsRoutes = require('./src/auth/standards');
const feedbackRoutes = require('./src/auth/feedback');
const { calcQuota } = require('./src/auth/calc-quota');
const { makeThrottle } = require('./src/auth/throttle');
const { publicPlans } = require('./src/auth/plans');
const { attachUser } = require('./src/auth/session');
const { AVAILABLE_THICKNESS_OPTIONS, applyTableEdits, sanitizeTableEdits, computeNormaVremeni } = require('./src/helpers');

// Ручные правки таблицы деталей учитываются только при нажатии
// "Рассчитать", т.е. здесь, на сервере: подставляются в строки результата,
// объём, норма времени и масса ящика пересчитываются с их учётом.
function withTableEdits(result, rawEdits, sections, input) {
  if (!result || result.error) return result;
  const edits = sanitizeTableEdits(rawEdits, sections);
  if (applyTableEdits(result, edits, sections)) {
    result.normaVremeni = computeNormaVremeni(result.totalVolume, input.baseProductivity, input.timeCoeff);
    result.crateMass = result.totalVolume * result.woodDensity;
  }
  return result;
}

const app = express();
// Render и другие хостинги стоят за прокси: настоящий IP клиента и https -
// из заголовков прокси (нужно для ограничения частоты запросов и cookie
// Secure у аккаунтов).
app.set('trust proxy', 1);
// Защитные заголовки (по указанию пользователя):
//  - не называем движок сервера (X-Powered-By: Express);
//  - сайт нельзя встроить в чужую страницу (кликджекинг); свои фреймы
//    (печать, PDF - common-print.js, html2canvas) разрешены: SAMEORIGIN;
//  - браузер не угадывает тип файлов (nosniff);
//  - адрес страницы уходит на другие сайты только без пути и параметров;
//  - по https браузер запоминает, что сайт только https (HSTS, 180 дней).
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
  next();
});
app.use(express.json());
// Ответы API не кэшируются (кто вошёл, лимиты, расчёты - всегда свежие).
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
// Аккаунты: кто вошёл (req.user) и /api/auth/* (см. src/auth/routes.js).
app.use(attachUser);
app.use('/api/auth/auto-renew', require('./src/auth/auto-renew').router);
app.use('/api/auth', authRoutes);
app.use('/api/admin', makeThrottle(), adminRoutes);
app.use('/api/standards', standardsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.get('/api/plans', (req, res) => res.json({ plans: publicPlans() }));
// Проверка, что сервер жив (для самопинга ниже и мониторинга).
app.get('/api/health', (req, res) => res.json({ ok: true }));
// Толщины "в наличии" приходят от клиента (localStorage на его стороне) -
// на входе в API фильтруем до допустимого сортаментного ряда и сортируем.
function sanitizeThicknesses(arr, options) {
  if (!Array.isArray(arr)) return [];
  const allowed = options || AVAILABLE_THICKNESS_OPTIONS;
  return arr.filter(v => allowed.includes(v)).sort((a, b) => a - b);
}
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// manualOverrides - правки толщины, введённые пользователем прямо в таблице
// деталей, и fineThickness - «Тонкая настройка» толщин, - объекты
// { ключ: число }. На входе в API оставляем только конечные положительные
// числа под известными ключами типа (overrides/fine в CALC_TYPES ниже) -
// произвольные поля из тела запроса дальше в расчёт не пропускаются.
function sanitizeManualOverrides(obj, allowedKeys) {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;
  allowedKeys.forEach(key => {
    const n = Number(obj[key]);
    if (Number.isFinite(n) && n > 0) result[key] = n;
  });
  return result;
}

// Поля тела запроса расчёта: [имя, разбор]. Всё, чего нет в списке типа, в
// расчёт не попадает.
const num = k => [k, b => toNum(b[k])];
const flag = k => [k, b => !!b[k]];
const choice = k => [k, b => b[k]];
const plankLayoutMode = ['plankLayoutMode', b => (b.plankLayoutMode === 'count' || b.plankLayoutMode === 'gap') ? b.plankLayoutMode : null];
const thicknesses = options => ['availableThicknesses', b => sanitizeThicknesses(b.availableThicknesses, options)];
const widths = options => ['availableWidths', b => sanitizeThicknesses(b.availableWidths, options)];
const species = ['species', b => typeof b.species === 'string' ? b.species : 'conifer'];
const overrides = keys => ['manualOverrides', b => sanitizeManualOverrides(b.manualOverrides, keys)];
const fine = keys => ['fineThickness', b => sanitizeManualOverrides(b.fineThickness, keys)];

// Типы расчёта: функция расчёта, разделы таблицы деталей и их множители в
// итоговом объёме (щиты торцевой/боковой - по 2 шт.; 0 - не входит в объём:
// endTape - лента обшивки торцов, parchment - пергамин, bolts - болты),
// обязательный выбор крепления (variant/fasteningType) и поля запроса.
// У каждого типа - свой полный список полей и ключей правок, без общих
// кусков: правка одного типа не задевает другие.
// Ключи правок толщин в таблице: у I-3/I-4 wallValue/t12Value/t21Value/
// t10Value каскадные (см. ov() в computeGost10198I3), t9Value/t11Value
// (полоз/торцовый брус дна) - изолированные; у II-1/II-2 так же
// skinValue/t21/tStojka/t10/tLongbeam/floorBoardT/tRaskosina и t9/t11; у
// III-1 tTorFrame/tBokFrame - каркас торцевого/бокового щита, tLidBeam -
// брусья крышки, tDnoBeam - продольный брус дна.
const SKID_CHOICE = ['skid', 'floor_boards'];
const CALC_TYPES = {
  i1: { compute: computeGost10198I1, sections: { dno: 1, kryshka: 1, torec: 2, bokovoy: 2, endTape: 0, parchment: 0 },
    fields: [num('L'), num('W'), num('H'), num('MASS'), flag('skidEnabled'), num('skidThicknessRaw'), flag('roundBoardWidths'),
      flag('removeLidBottomRaskosina'), flag('addRaskosina'), flag('xRaskosina'), flag('addEndTape'), flag('addParchment'),
      plankLayoutMode, num('plankLayoutValue'), thicknesses(),
      overrides(['t9Value', 'tDnoPlanka', 'tDnoBoard', 'tDnoRask', 'tKrPlanka', 'tKrBoard', 'tKrRask', 'tBokPlanka', 'tBokBoard', 'tBokRask', 'tTorPlanka', 'tTorBoard', 'tTorRask']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // I-2 - тот же ящик, что I-1, но обшивка с промежутками (boardGapPercent), без пергамина.
  i2: { compute: computeGost10198I2, sections: { dno: 1, kryshka: 1, torec: 2, bokovoy: 2, endTape: 0 },
    fields: [num('L'), num('W'), num('H'), num('MASS'), flag('skidEnabled'), num('skidThicknessRaw'), flag('roundBoardWidths'),
      flag('removeLidBottomRaskosina'), flag('addRaskosina'), flag('xRaskosina'), flag('addEndTape'),
      plankLayoutMode, num('plankLayoutValue'), thicknesses(),
      overrides(['t9Value', 'tDnoPlanka', 'tDnoBoard', 'tDnoRask', 'tKrPlanka', 'tKrBoard', 'tKrRask', 'tBokPlanka', 'tBokBoard', 'tBokRask', 'tTorPlanka', 'tTorBoard', 'tTorRask']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff'), num('boardGapPercent')] },
  i3: { compute: computeGost10198I3, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2, endTape: 0, parchment: 0 }, choice: 'variant',
    fields: [choice('variant'), num('L'), num('W'), num('H'), num('MASS'), flag('optimizeSizes'), flag('removeFloorBoards'),
      flag('removeSkidBoards'), flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'), flag('xRaskosina'),
      flag('addRaskosina'), flag('addEndTape'), flag('addParchment'), plankLayoutMode, num('plankLayoutValue'),
      num('beamGapValue'), num('beamCountValue'), thicknesses(),
      overrides(['wallValue', 't9Value', 't10Value', 't11Value', 't12Value', 't21Value']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // I-4 - тот же ящик, что I-3, но обшивка с промежутками (boardGapMax), без пергамина.
  i4: { compute: computeGost10198I4, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2, endTape: 0 }, choice: 'variant',
    fields: [choice('variant'), num('L'), num('W'), num('H'), num('MASS'), flag('optimizeSizes'), flag('removeFloorBoards'),
      flag('removeSkidBoards'), flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'), flag('xRaskosina'),
      flag('addRaskosina'), flag('addEndTape'), plankLayoutMode, num('plankLayoutValue'),
      num('beamGapValue'), num('beamCountValue'), thicknesses(),
      overrides(['wallValue', 't9Value', 't10Value', 't11Value', 't12Value', 't21Value']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff'), num('boardGapMax')] },
  ii1: { compute: computeGost10198II1, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2, parchment: 0 }, choice: 'fasteningType',
    fields: [num('L'), num('W'), num('H'), num('MASS'), choice('fasteningType'), flag('bulkCargo'), flag('optimizeSizes'),
      flag('removeFloorBoards'), flag('removeSkidBoards'), flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'),
      flag('xRaskosina'), flag('addRaskosina'), flag('addParchment'),
      num('torecPostCount'), num('bokPostCount'), num('lidCrossBeamCount'), thicknesses(),
      overrides(['skinValue', 't21', 'tStojka', 't10', 'tLongbeam', 'floorBoardT', 'tRaskosina', 't9', 't11']),
      fine(['frame', 'skid', 'sub', 'skin', 'floor', 'endBeam', 'crossBeam', 'longBeam']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // II-1 оптимальный - независимая копия II-1 (src/ii1n).
  ii1n: { compute: computeGost10198II1N, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2, parchment: 0 }, choice: 'fasteningType',
    fields: [num('L'), num('W'), num('H'), num('MASS'), choice('fasteningType'), flag('bulkCargo'), flag('optimizeSizes'),
      flag('removeFloorBoards'), flag('removeSkidBoards'), flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'),
      flag('xRaskosina'), flag('addRaskosina'), flag('addParchment'),
      num('torecPostCount'), num('bokPostCount'), num('lidCrossBeamCount'), thicknesses(),
      overrides(['skinValue', 't21', 'tStojka', 't10', 'tLongbeam', 'floorBoardT', 'tRaskosina', 't9', 't11']),
      fine(['frame', 'skid', 'sub', 'skin', 'floor', 'endBeam', 'crossBeam', 'longBeam']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // II-2 - тот же ящик, что II-1, но обшивка с промежутками (boardGapMax), без пергамина.
  ii2: { compute: computeGost10198II2, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2 }, choice: 'fasteningType',
    fields: [num('L'), num('W'), num('H'), num('MASS'), choice('fasteningType'), flag('bulkCargo'), flag('optimizeSizes'),
      flag('removeFloorBoards'), flag('removeSkidBoards'), flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'),
      flag('xRaskosina'), flag('addRaskosina'),
      num('torecPostCount'), num('bokPostCount'), num('lidCrossBeamCount'), num('boardGapMax'), thicknesses(),
      overrides(['skinValue', 't21', 'tStojka', 't10', 'tLongbeam', 'floorBoardT', 'tRaskosina', 't9', 't11']),
      fine(['frame', 'skid', 'sub', 'skin', 'floor', 'endBeam', 'crossBeam', 'longBeam']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // II-2 оптимальный - независимая копия II-2 (src/ii2n).
  ii2n: { compute: computeGost10198II2N, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2 }, choice: 'fasteningType',
    fields: [num('L'), num('W'), num('H'), num('MASS'), choice('fasteningType'), flag('bulkCargo'), flag('optimizeSizes'),
      flag('removeFloorBoards'), flag('removeSkidBoards'), flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'),
      flag('xRaskosina'), flag('addRaskosina'),
      num('torecPostCount'), num('bokPostCount'), num('lidCrossBeamCount'), num('boardGapMax'), thicknesses(),
      overrides(['skinValue', 't21', 'tStojka', 't10', 'tLongbeam', 'floorBoardT', 'tRaskosina', 't9', 't11']),
      fine(['frame', 'skid', 'sub', 'skin', 'floor', 'endBeam', 'crossBeam', 'longBeam']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  iii1: { compute: computeGost10198III1, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2, bolts: 0, parchment: 0 }, choice: 'fasteningType',
    fields: [num('L'), num('W'), num('H'), num('MASS'), choice('fasteningType'), flag('removeFloorBoards'), flag('removeSkidBoards'),
      flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'), flag('bulkCargo'), flag('addRaskosina'),
      flag('xRaskosina'), flag('addParchment'),
      num('torecPostCount'), num('bokPostCount'), num('lidCrossBeamCount'), num('lidCrossBeamAxis'), thicknesses(),
      overrides(['skinValue', 'tTorFrame', 'tBokFrame', 'tLidBeam', 'tDnoBeam', 't10', 'floorBoardT', 'tRaskosina', 't9', 't11']),
      fine(['skid', 'sub', 'endBeam', 'dnoBeam', 'floor', 'frame', 'skin', 'lidBeam']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // III-1 оптимальный - независимая копия III-1 (src/iii1n).
  iii1n: { compute: computeGost10198III1N, sections: { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2, bolts: 0, parchment: 0 }, choice: 'fasteningType',
    fields: [num('L'), num('W'), num('H'), num('MASS'), choice('fasteningType'), flag('removeFloorBoards'), flag('removeSkidBoards'),
      flag('roundBoardWidths'), flag('solidRigidBase'), flag('forkliftLoading'), flag('bulkCargo'), flag('addRaskosina'),
      flag('xRaskosina'), flag('addParchment'),
      num('torecPostCount'), num('bokPostCount'), num('lidCrossBeamCount'), num('lidCrossBeamAxis'), thicknesses(),
      overrides(['skinValue', 'tTorFrame', 'tBokFrame', 'tLidBeam', 'tDnoBeam', 't10', 'floorBoardT', 'tRaskosina', 't9', 't11']),
      fine(['skid', 'sub', 'endBeam', 'dnoBeam', 'floor', 'frame', 'skin', 'lidBeam']),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // ГОСТ 2991-85, тип I.
  g2991i: { compute: computeGost2991I, sections: { dno: 1, kryshka: 1, torec: 2, bokovoy: 2 },
    fields: [num('L'), num('W'), num('H'), num('MASS'), species, flag('packet'), flag('concentrated'), flag('noLid'),
      flag('roundBoardWidths'), thicknesses(G2991_THICKNESS_OPTIONS), widths(G2991_WIDTH_OPTIONS), num('mainWidth'),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
  // ГОСТ 2991-85, тип II-1.
  g2991ii1: { compute: computeGost2991II1, sections: { dno: 1, kryshka: 1, torec: 2, bokovoy: 2 },
    fields: [num('L'), num('W'), num('H'), num('MASS'), species, flag('packet'), flag('concentrated'), flag('noLid'),
      flag('verticalEnd'), flag('roundBoardWidths'), thicknesses(G2991_THICKNESS_OPTIONS), widths(G2991_WIDTH_OPTIONS), num('mainWidth'),
      num('baseProductivity'), num('woodDensity'), num('timeCoeff')] },
};

// Расчёты - только после входа и в пределах лимита подписки.
// Не больше 60 расчётов в минуту с одного IP (сверх - ожидание, см. throttle.js).
app.post('/api/:type/calculate', makeThrottle(), calcQuota, (req, res, next) => {
  const type = Object.hasOwn(CALC_TYPES, req.params.type) ? CALC_TYPES[req.params.type] : null;
  if (!type) return next();
  const b = req.body || {};
  if (type.choice && !SKID_CHOICE.includes(b[type.choice])) {
    return res.status(400).json({ error: `${type.choice} должен быть "skid" или "floor_boards".` });
  }
  const input = {};
  type.fields.forEach(([k, parse]) => { input[k] = parse(b); });
  res.json(withTableEdits(type.compute(input), b.tableEdits, type.sections, input));
});

// Очистка хранилища аккаунтов от устаревших записей - при запуске и раз в
// сутки (store.cleanup).
const accountStore = require('./src/auth/store');
function runCleanup() {
  try {
    const n = accountStore.cleanup(Date.now());
    if (n) console.log(`[очистка] удалено устаревших записей: ${n}`);
  } catch (e) { console.error('[очистка] ошибка:', e); }
}
runCleanup();
setInterval(runCleanup, 24 * 3600 * 1000).unref();

// Письма-напоминания об автопродлении (за 3 дня до окончания подписки) -
// раз в час; пока автопродление выключено (AUTO_RENEW_ENABLED), ничего не
// делает (src/auth/auto-renew.js).
const { sendDueNotices } = require('./src/auth/auto-renew');
function runAutoRenewNotices() {
  sendDueNotices(Date.now()).then(n => { if (n) console.log(`[автопродление] напоминаний отправлено: ${n}`); })
    .catch(e => console.error('[автопродление] ошибка:', e));
}
setTimeout(runAutoRenewNotices, 60 * 1000).unref();
setInterval(runAutoRenewNotices, 3600 * 1000).unref();

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(FRONTEND_DIR));

// Ошибки: посетителю - короткий текст без подробностей (без стека и путей
// к файлам), подробности - только в журнал сервера.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Неверный формат запроса.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Слишком большой запрос.' });
  console.error(`[ошибка] ${req.method} ${req.originalUrl}:`, err);
  res.status(err.status && err.status < 500 ? err.status : 500).json({ error: 'Ошибка сервера. Попробуйте ещё раз.' });
});

// Самопинг (по указанию пользователя): бесплатный Render усыпляет сервис
// без входящих запросов ~15 минут - раз в 10 минут сервер сам обращается к
// своему внешнему адресу. Адрес - KEEPALIVE_URL или RENDER_EXTERNAL_URL
// (Render задаёт его сам); на своём сервере (VPS) их нет - самопинга нет.
// KEEPALIVE=0 - отключить.
const KEEPALIVE_BASE = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL || '';
if (KEEPALIVE_BASE && process.env.KEEPALIVE !== '0') {
  const url = KEEPALIVE_BASE.replace(/\/+$/, '') + '/api/health';
  setInterval(() => {
    fetch(url, { signal: AbortSignal.timeout(15000) }).catch(e => console.error(`[самопинг] ${url}: ${e.message}`));
  }, 10 * 60 * 1000).unref();
  console.log(`[самопинг] каждые 10 минут: ${url}`);
}

// HOST - адрес, на котором слушает сервер: на VPS за nginx - 127.0.0.1
// (см. deploy/), без него - все адреса (как на Render).
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || undefined;
app.listen(PORT, HOST, () => {
  console.log(`GOST 10198-91 backend listening on ${HOST || '*'}:${PORT}`);
});
