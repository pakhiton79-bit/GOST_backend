// Почта поддержки в админке (сервер - backend/src/auth/support-mail.js):
// входящие и отправленные ящика поддержки, письмо целиком (только текст -
// HTML письма на страницу не попадает), вложения скачиванием, ответ.
// Пользуется api, esc, el и fmtDate из admin.js.
let mailFolder = 'inbox', mailItems = [], mailTotal = 0, mailOpen = null;
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const mailAddr = a => a ? (a.name ? `${a.name} <${a.address}>` : a.address) : '';
const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ';

function mailMsg(text, ok){
  const m = $('mailMsg');
  m.hidden = !text;
  m.textContent = text || '';
  m.className = 'auth-msg ' + (ok ? 'auth-msg-ok' : 'auth-msg-error');
}

function renderMailList(){
  $('mailList').innerHTML = mailItems.map(m => {
    const who = mailFolder === 'sent' ? 'Кому: ' + mailAddr(m.to) : mailAddr(m.from);
    const tags = (m.account ? ` <span class="admin-tag admin-tag-priority">${esc(m.account.plan)}</span>` : '')
      + (m.answered ? ' <span class="admin-tag admin-tag-ok">отвечено</span>' : '')
      + (m.attachments ? ' <span class="admin-tag">вложение</span>' : '');
    return `<button type="button" class="admin-mail-row${m.seen ? '' : ' admin-mail-unseen'}" data-uid="${m.uid}">
      <span class="admin-mail-who">${esc(who)}</span>
      <span class="admin-mail-subj">${esc(m.subject || '(без темы)')}${tags}</span>
      <span class="admin-mail-date">${esc(fmtDateTime(m.date))}</span>
    </button>`;
  }).join('') || '<p class="admin-empty">Писем нет</p>';
  $('mailMore').hidden = mailItems.length >= mailTotal;
}

async function loadMail(more){
  $('mailRefresh').disabled = true;
  try{
    const d = await api(`mail?folder=${mailFolder}&offset=${more ? mailItems.length : 0}`);
    mailItems = more ? mailItems.concat(d.messages) : d.messages;
    mailTotal = d.total;
    if(mailFolder === 'inbox') $('mailCount').textContent = d.unseen ? `(новых: ${d.unseen})` : '';
    mailMsg('');
    renderMailList();
  }catch(e){
    $('mailList').innerHTML = '';
    $('mailMore').hidden = true;
    if(e.notConfigured) $('mailBar').hidden = true;
    mailMsg(e.message, false);
  }finally{ $('mailRefresh').disabled = false; }
}

function showList(){
  mailOpen = null;
  $('mailView').hidden = true;
  $('mailView').innerHTML = '';
  $('mailList').hidden = false;
  $('mailBar').hidden = false;
  renderMailList();
}

async function openMail(uid){
  mailMsg('');
  $('mailList').hidden = true;
  $('mailMore').hidden = true;
  const view = $('mailView');
  view.hidden = false;
  view.innerHTML = '<p class="admin-empty">Загрузка…</p>';
  try{
    const m = await api(`mail/message?folder=${mailFolder}&uid=${uid}`);
    mailOpen = m;
    const item = mailItems.find(x => x.uid === uid);
    if(item && !item.seen){ item.seen = true; if(mailFolder === 'inbox') loadMailCount(); }
    renderMailView();
  }catch(e){
    view.innerHTML = '<button type="button" class="btn-secondary admin-mail-back">← К списку</button>';
    mailMsg(e.message, false);
  }
}

// Число новых во «Входящих» (после прочтения письма).
async function loadMailCount(){
  try{
    const d = await api('mail?folder=inbox&offset=0');
    $('mailCount').textContent = d.unseen ? `(новых: ${d.unseen})` : '';
  }catch(e){ /* не страшно */ }
}

function renderMailView(){
  const m = mailOpen;
  const row = (label, value) => value ? `<div>${label}: <b>${esc(value)}</b></div>` : '';
  const replyTo = m.replyTo || m.from;
  // «Ответить на» в письме не совпадает с отправителем - так иногда делают
  // мошенники (ответ уйдёт на чужой адрес): предупреждение у кнопки.
  const otherReply = !!(m.replyTo && m.from && m.replyTo.address !== m.from.address);
  const files = m.attachments.map(a => `<a href="/api/admin/mail/attachment?folder=${m.folder}&uid=${m.uid}&i=${a.i}" download="${esc(a.filename)}">${esc(a.filename)}</a> <span class="admin-sub">${fmtSize(a.size)}</span>`);
  $('mailView').innerHTML = `<button type="button" class="btn-secondary admin-mail-back">← К списку</button>
    <h3>${esc(m.subject || '(без темы)')}</h3>
    <div class="admin-mail-meta">
      ${row('От', mailAddr(m.from))}
      ${row('Кому', m.to.map(mailAddr).join(', '))}
      ${row('Копия', m.cc.map(mailAddr).join(', '))}
      ${m.replyTo ? row('Ответ на', mailAddr(m.replyTo)) : ''}
      ${row('Дата', fmtDateTime(m.date))}
      ${m.account ? `<div>Аккаунт сайта: <b>${esc(m.account.plan)}</b>${m.account.blocked ? ' <span class="admin-tag admin-tag-blocked">заблокирован</span>' : ''} · <button type="button" class="admin-mail-acc-link" data-email="${esc(m.account.email)}">показать в аккаунтах</button></div>` : ''}
      ${m.answered ? '<div><span class="admin-tag admin-tag-ok">отвечено</span></div>' : ''}
    </div>
    <div class="admin-mail-text"></div>
    ${files.length ? `<div class="admin-mail-files">${files.map(f => `<span>${f}</span>`).join('')}</div>` : ''}
    ${m.folder === 'inbox' && replyTo ? `<div class="std-field admin-mail-reply">
      <label for="mailReplyText">Ответ</label>
      <textarea id="mailReplyText" maxlength="20000" placeholder="Текст ответа. Исходное письмо добавится ниже цитатой."></textarea>
      <div class="admin-mail-reply-bar"><button type="button" class="btn-secondary admin-mail-send">Отправить</button><span class="admin-mail-reply-to">Получатель: ${esc(replyTo.address)}${otherReply ? ' <span class="admin-tag admin-tag-blocked">не адрес отправителя - проверьте</span>' : ''}</span></div>
    </div>` : ''}`;
  $('mailView').querySelector('.admin-mail-text').textContent = (m.text || '(письмо без текста)') + (m.cut ? '\n\n… (письмо обрезано - полностью в Яндекс Почте)' : '');
}

async function sendReply(btn){
  const ta = $('mailReplyText'), text = ta.value.trim();
  if(!text) return mailMsg('Напишите текст ответа.', false);
  const to = (mailOpen.replyTo || mailOpen.from).address;
  if(!await siteConfirm({ title: 'Отправить ответ?', text: `Получатель: ${to}`, ok: 'Отправить' })) return;
  btn.disabled = true; ta.disabled = true;
  try{
    const d = await api('mail/reply', { uid: mailOpen.uid, text });
    const notes = [d.test ? 'тестовый режим: письмо не отправлено - почта сайта (Unisender) не настроена' : '', d.copied || d.test ? '' : 'копия в «Отправленные» не сохранилась'].filter(Boolean);
    mailMsg(`${d.test ? 'Ответ не отправлен' : 'Ответ отправлен на ' + d.to}.${notes.length ? ' (' + notes.join('; ') + ')' : ''}`, !d.test);
    if(d.test){ btn.disabled = false; ta.disabled = false; return; }
    const item = mailItems.find(x => x.uid === mailOpen.uid);
    if(item) item.answered = true;
    mailOpen.answered = true;
    renderMailView();
  }catch(e){
    mailMsg(e.message, false);
    btn.disabled = false; ta.disabled = false;
  }
}

$('mailCard').addEventListener('click', e => {
  const tab = e.target.closest('.admin-mail-tab');
  if(tab){
    mailFolder = tab.dataset.folder;
    document.querySelectorAll('.admin-mail-tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    showList(); mailItems = []; $('mailList').innerHTML = ''; return loadMail(false);
  }
  if(e.target.closest('#mailRefresh')){ showList(); return loadMail(false); }
  if(e.target.closest('#mailMore')) return loadMail(true);
  const row = e.target.closest('.admin-mail-row');
  if(row) return openMail(Number(row.dataset.uid));
  if(e.target.closest('.admin-mail-back')){ mailMsg(''); return showList(); }
  const send = e.target.closest('.admin-mail-send');
  if(send && !send.disabled) return sendReply(send);
  const acc = e.target.closest('.admin-mail-acc-link');
  if(acc){
    $('adminSearch').value = acc.dataset.email;
    renderUsers();
    $('adminSearch').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

loadMail(false);
