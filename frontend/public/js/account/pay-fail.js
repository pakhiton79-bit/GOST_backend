// Страница «Оплата не прошла» (pay-fail.html): почта для вопросов (legal-config.js).
if(typeof LEGAL !== 'undefined' && LEGAL.email){
  const n = document.getElementById('payHelp'), a = document.createElement('a');
  a.href = 'mailto:' + LEGAL.email; a.textContent = LEGAL.email;
  n.append('Если деньги всё же списались, напишите на ', a, ' и укажите номер счёта.');
}
