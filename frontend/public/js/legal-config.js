// Реквизиты - подставляются в юридические документы (privacy.html,
// consent.html, terms.html, marketing.html) на место <span data-legal="...">.
// Заполнить один раз здесь; пустое значение показывается в документах как
// «[укажите ...]». Роли (по указанию пользователя - это два разных человека):
//   - Администрация и оператор персональных данных - владелец сайта
//     (operator ... address);
//   - Исполнитель по платным подпискам - принимает оплату и выдаёт чек
//     (seller ...), обрабатывает почту и сведения об оплате по поручению
//     оператора.
const LEGAL = {
  operator: '',        // ФИО индивидуального предпринимателя / самозанятого или наименование организации
  status: '',          // например: «индивидуальный предприниматель», «плательщик НПД (самозанятый)», «ООО»
  inn: '',             // ИНН
  ogrn: '',            // ОГРН / ОГРНИП (для самозанятого - не нужен, оставить пустым)
  address: '',         // адрес (для ИП и самозанятых - можно город и почтовый адрес для обращений)
  email: 'taraplus.help@yandex.com', // почта для обращений по персональным данным и вопросам по сайту
  seller: '',          // ФИО Исполнителя по платным подпискам (получателя оплаты)
  sellerStatus: 'плательщик налога на профессиональный доход (самозанятый)',
  sellerInn: '',       // ИНН Исполнителя
  site: 'Тара+',       // название сайта
  version: '10.10.2026', // дата редакции документов (при изменении текста - поменять и LEGAL_VERSION на сервере)
};
const LEGAL_HINTS = {
  operator: 'ФИО или наименование оператора', status: 'статус оператора', inn: 'ИНН', ogrn: 'ОГРН / ОГРНИП',
  address: 'адрес оператора', email: 'почту для обращений', site: 'название сайта', version: 'дату редакции',
  seller: 'ФИО Исполнителя', sellerStatus: 'статус Исполнителя', sellerInn: 'ИНН Исполнителя',
};

function fillLegal(){
  document.querySelectorAll('[data-legal]').forEach(el => {
    const k = el.dataset.legal, v = LEGAL[k];
    if(v && k === 'email'){
      // Почта - ссылкой, по нажатию открывается письмо (по указанию пользователя).
      const a = document.createElement('a');
      a.href = 'mailto:' + v;
      a.textContent = v;
      el.replaceChildren(a);
      el.classList.remove('legal-missing');
    }
    else if(v){ el.textContent = v; el.classList.remove('legal-missing'); }
    else if(k === 'ogrn'){ el.closest('.legal-ogrn') && (el.closest('.legal-ogrn').hidden = true); }
    else { el.textContent = '[укажите ' + (LEGAL_HINTS[k] || k) + ']'; el.classList.add('legal-missing'); }
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillLegal);
else fillLegal();
