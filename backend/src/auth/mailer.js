// Аккаунты: отправка кодов подтверждения на почту.
//
// Через Brevo (по указанию пользователя - пока, потом сменит): HTTP API, а не
// SMTP - на бесплатном Render почтовые порты закрыты. Включается, когда в
// окружении (Render → сервис → Environment) заданы:
//   BREVO_API_KEY   - ключ API из кабинета Brevo;
//   EMAIL_FROM      - адрес отправителя, подтверждённый в Brevo (Senders);
//   EMAIL_FROM_NAME - имя отправителя (необязательно, по умолчанию «Тара+»).
// Без них - тестовый режим: письма не отправляются.
//
// Код в любом режиме пишется и в журнал сервера (логи Render), чтобы вход
// не ломался, если письмо не дошло; ошибка отправки - тоже в журнал.
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Тара+';
const BREVO_URL = process.env.BREVO_URL || 'https://api.brevo.com/v3/smtp/email';

const PURPOSE_TEXT = {
  register: { subject: 'подтверждение почты', body: 'Чтобы подтвердить почту и завершить регистрацию, введите этот код на сайте.' },
  reset: { subject: 'восстановление пароля', body: 'Чтобы задать новый пароль, введите этот код на сайте.' },
};

function letter(code, purpose) {
  const p = PURPOSE_TEXT[purpose] || PURPOSE_TEXT.register;
  const subject = `Код ${code} - ${p.subject} - Тара+`;
  const text = `Ваш код: ${code}\n\n${p.body} Код действует 15 минут.\n\nЕсли вы ничего не запрашивали, просто удалите это письмо.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.5">`
    + `<p>Ваш код:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:8px 0 16px">${code}</p>`
    + `<p>${p.body} Код действует 15 минут.</p>`
    + `<p style="color:#666;font-size:13px">Если вы ничего не запрашивали, просто удалите это письмо.</p></div>`;
  return { subject, text, html };
}

async function sendViaBrevo(email, code, purpose) {
  const { subject, text, html } = letter(code, purpose);
  const r = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
      to: [{ email }],
      subject, textContent: text, htmlContent: html,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Brevo ответил ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

async function sendCode(email, code, purpose) {
  const what = (PURPOSE_TEXT[purpose] || PURPOSE_TEXT.register).subject;
  if (!BREVO_API_KEY || !EMAIL_FROM) {
    console.log(`[почта, тестовый режим] ${email}: код ${code} (${what})`);
    return;
  }
  console.log(`[почта] ${email}: код ${code} (${what}), отправка через Brevo`);
  try {
    await sendViaBrevo(email, code, purpose);
    console.log(`[почта] отправлено на ${email}`);
  } catch (e) {
    console.error(`[почта] не отправлено на ${email}: ${e.message}`);
  }
}

if (BREVO_API_KEY && !EMAIL_FROM) {
  console.warn('[почта] задан BREVO_API_KEY, но не задан EMAIL_FROM - письма не отправляются (тестовый режим).');
}

module.exports = { sendCode };
