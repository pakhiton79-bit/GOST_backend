// Аккаунты: отправка кодов подтверждения на почту.
//
// Пока - тестовый режим: письма не отправляются, код пишется в журнал
// сервера (логи Render). Отправку через Brevo отключили по указанию
// пользователя (Brevo не дал зарегистрироваться); настоящая отправка
// подключается здесь же, когда будет выбран сервис или свой почтовый ящик
// (на бесплатном Render почтовые порты закрыты - только через HTTP API).
const PURPOSE_TEXT = {
  register: 'подтверждение почты',
  reset: 'восстановление пароля',
};

async function sendCode(email, code, purpose) {
  console.log(`[почта, тестовый режим] ${email}: код ${code} (${PURPOSE_TEXT[purpose] || purpose})`);
}

// Заявка на внутренний стандарт завода (standards.js). Пока тестовый режим:
// письмо не отправляется, заявка - в журнале сервера (и в хранилище).
async function sendStandardRequest(rec) {
  console.log(`[заявка на стандарт, тестовый режим] ${rec.userEmail}: ${rec.company} / ${rec.standard}\n  ${rec.details}`);
}

module.exports = { sendCode, sendStandardRequest };
