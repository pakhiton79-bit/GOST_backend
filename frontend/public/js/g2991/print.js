// ГОСТ 2991-85: содержимое печатной страницы и PDF типа (вызывается из
// printBox/downloadPdf в common-print.js). Как у ГОСТ 10198-91 (II-1): сверху
// общий вид ящика, рядом груз и итог.

const PDF_FILE_NAME = 'gost-2991-85-raschet.pdf';

// Копия спецификации для печати: без редактируемых ячеек и без экранных
// размеров и отступов чертежей (на печати они считаются заново).
function printableBoardTables(){
  const clone = document.getElementById('boardTables').cloneNode(true);
  clone.querySelectorAll('.editable-cell').forEach(cell=>{
    cell.removeAttribute('contenteditable');
    cell.classList.remove('editable-cell');
  });
  clone.querySelectorAll('.part-title, .spec-row-diagram').forEach(el=>{
    el.style.marginTop = '';
    el.style.marginBottom = '';
  });
  clone.querySelectorAll('.diagram-wrap').forEach(wrap=>{
    wrap.style.marginTop = '';
    wrap.style.marginBottom = '';
    wrap.style.marginLeft = '';
    wrap.style.width = '';
    wrap.style.removeProperty('--dk');
  });
  clone.querySelectorAll('.diagram-slot').forEach(slot=>{
    slot.style.width = '';
    slot.style.flexBasis = '';
  });
  return clone;
}

// Узлы спецификации идут парами «заголовок + строка с чертежом» - каждая пара
// в свой неразрывный блок печати.
function printSections(clone){
  let sections = '';
  const children = Array.from(clone.children);
  for(let i=0; i<children.length; i+=2){
    const title = children[i];
    const row   = children[i+1];
    sections += `<div class="print-section">${title.outerHTML}${row ? row.outerHTML : ''}</div>`;
  }
  return sections;
}

function printCommentHtml(){
  const commentRaw = (document.getElementById('userComment').value || '').trim();
  if(!commentRaw) return '';
  const esc = commentRaw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<div class="print-section">
      <div class="part-title">Комментарий</div>
      <div class="print-comment">${esc}</div>
    </div>`;
}

function buildPrintHtml(){
  const L = document.getElementById('L').value;
  const W = document.getElementById('W').value;
  const H = document.getElementById('H').value;
  const M = document.getElementById('M').value;

  const outDimsText = document.getElementById('outDims').textContent.trim();
  const volumeText  = document.getElementById('outVolume').textContent.trim();
  const massText    = document.getElementById('outMass').textContent.trim();
  const timeText    = document.getElementById('outTime').textContent.trim();

  const sections = printSections(printableBoardTables());
  const commentHtml = printCommentHtml();

  return `
    <img class="print-watermark" src="${LOGO_B64}" alt="">

    <h1>ГОСТ 2991-85 · ${G2991_TYPE.title}${boxNameHtml()}</h1>
    <div class="print-subtitle">${G2991_TYPE.subtitle}</div>

    <div class="part-title">Общий вид ящика</div>
    <div class="spec-row-diagram">
      <div class="diagram-slot"><div class="diagram-wrap"><img src="${G2991_TYPE.boxImg}" alt=""></div></div>
      <div class="print-summary-col">
        <div class="print-summary-block">
          <h2>Груз</h2>
          <table class="print-plain-table">
            <tr><td class="k">Размеры, мм</td><td>${L} × ${W} × ${H}</td></tr>
            <tr><td class="k">Масса, кг</td><td>${M}</td></tr>
          </table>
        </div>
        <div class="print-summary-block">
          <h2>Итог</h2>
          <table class="print-plain-table">
            <tr><td class="k">Наружные, мм</td><td>${outDimsText.replace(/\s*мм$/, '')}</td></tr>
            <tr><td class="k">Пиломатериал</td><td>${volumeText}</td></tr>
            <tr><td class="k">Масса ящика</td><td>${massText}</td></tr>
            <tr><td class="k">Норма времени</td><td>${timeText}</td></tr>
          </table>
        </div>
      </div>
    </div>

    ${sections}
    ${commentHtml}
  `;
}
