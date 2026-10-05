// Аккаунты: отправка кодов подтверждения на почту.
//
// Пока (по указанию пользователя) - тестовый режим: письма не отправляются,
// код пишется в журнал сервера (логи Render). Настоящая отправка подключается
// здесь же при переезде на свой хостинг и домен - режим выбирается
// переменной окружения EMAIL_MODE (сейчас есть только 'log').
const EMAIL_MODE = process.env.EMAIL_MODE || 'log';

const PURPOSE_TEXT = {
  register: 'подтверждение почты',
  reset: 'восстановление пароля',
};

async function sendCode(email, code, purpose) {
  if (EMAIL_MODE === 'log') {
    console.log(`[почта, тестовый режим] ${email}: код ${code} (${PURPOSE_TEXT[purpose] || purpose})`);
    return;
  }
  throw new Error('Неизвестный EMAIL_MODE: ' + EMAIL_MODE);
}

module.exports = { sendCode };
