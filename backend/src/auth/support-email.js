// Почта поддержки - та же, что в юридических документах (поле email в
// frontend/public/js/legal-config.js), без неё - SUPPORT_EMAIL.
const fs = require('fs');
const path = require('path');

const LEGAL_CONFIG = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'js', 'legal-config.js');
function supportEmail() {
  let email = '';
  try {
    const m = fs.readFileSync(LEGAL_CONFIG, 'utf8').match(/^\s*email:\s*'([^']*)'/m);
    if (m) email = m[1].trim();
  } catch (e) { /* нет файла - ниже SUPPORT_EMAIL */ }
  return email || process.env.SUPPORT_EMAIL || '';
}

module.exports = { supportEmail };
