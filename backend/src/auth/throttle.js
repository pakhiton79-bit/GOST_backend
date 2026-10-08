// Ограничение частоты расчётов и запросов админки (по указанию пользователя,
// после аудита): не больше 60 в минуту с одного IP. Сверх этого запрос не
// отклоняется, а ждёт («пусть подольше грузится»): «ведро» на 60 запросов
// пополняется на 1 в секунду, лишний запрос ждёт свою секунду. Если ждать
// пришлось бы дольше THROTTLE_MAX_WAIT_MS - ответ 429, чтобы очередь не
// росла без конца (защита сервера от перегрузки).
const THROTTLE_MAX = 60;                 // запросов подряд без ожидания
const THROTTLE_REFILL_MS = 1000;         // +1 запрос в секунду (60 в минуту)
const THROTTLE_MAX_WAIT_MS = 30 * 1000;  // дольше не ждём (у nginx таймаут 60 с)

function makeThrottle() {
  const buckets = new Map(); // ip -> { tokens, at }
  setInterval(() => {
    const now = Date.now();
    for (const [ip, b] of buckets) if (b.tokens + (now - b.at) / THROTTLE_REFILL_MS >= THROTTLE_MAX) buckets.delete(ip);
  }, 60 * 1000).unref();

  return function throttle(req, res, next) {
    const now = Date.now();
    const b = buckets.get(req.ip) || { tokens: THROTTLE_MAX, at: now };
    b.tokens = Math.min(THROTTLE_MAX, b.tokens + (now - b.at) / THROTTLE_REFILL_MS);
    b.at = now;
    // Запрос забирает один токен; токенов меньше нуля - очередь (ждать,
    // пока ведро пополнится до нуля).
    const wait = b.tokens >= 1 ? 0 : Math.ceil((1 - b.tokens) * THROTTLE_REFILL_MS);
    if (wait > THROTTLE_MAX_WAIT_MS) {
      buckets.set(req.ip, b);
      return res.status(429).json({ error: 'Слишком много запросов подряд. Подождите минуту и попробуйте снова.' });
    }
    b.tokens -= 1;
    buckets.set(req.ip, b);
    if (wait <= 0) return next();
    setTimeout(next, wait);
  };
}

module.exports = { makeThrottle, THROTTLE_MAX };
