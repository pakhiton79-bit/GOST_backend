// ГОСТ 10198-91, тип I-2: «Доля промежутков между досками» обшивки - ползунок
// (10-50% с шагом 5) и поле для любого целого от 10 до 50. Обязательна (по
// указанию пользователя): значения по умолчанию нет, пока его не выбрали,
// расчёт блокируется (ошибку выдаёт сервер, поле подсвечивается, см.
// errorFieldsFor в calc-i2.js). Доски - по 100 мм, крайние по краям
// щита, остальные равномерно между ними, промежутки - не больше этой доли
// поверхности щита. Значение запоминается в localStorage при каждом
// изменении.
const BOARD_GAP_MIN = 10, BOARD_GAP_MAX = 50;
const BOARD_GAP_STEPS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
const BOARD_GAP_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'boardGapPercent';
let boardGapPercent = null; // null - не выбрано

function readBoardGapPercent(){
  return boardGapPercent;
}
function setBoardGapPercent(v, fromSlider){
  boardGapPercent = v;
  const sliderEl = document.getElementById('boardGapSlider');
  sliderEl.classList.toggle('jump-slider-empty', v === null);
  if(!fromSlider && v !== null) boardGapSlider.setValue(v);
  try{ localStorage.setItem(BOARD_GAP_STORAGE_KEY, v === null ? '' : String(v)); }catch(e){}
  invalidateCalc();
}
function onBoardGapInputChange(){
  const v = parseInt(document.getElementById('boardGapInput').value, 10);
  setBoardGapPercent(v >= BOARD_GAP_MIN && v <= BOARD_GAP_MAX ? v : null, false);
}

const boardGapSlider = createJumpSlider(document.getElementById('boardGapSlider'), BOARD_GAP_STEPS, v=>{
  document.getElementById('boardGapInput').value = v;
  setBoardGapPercent(v, true);
});

// Щелчок по ползунку без выбранного значения в его же текущую точку (10%)
// ползунок не считает изменением - значение берётся из него явно.
document.getElementById('boardGapSlider').addEventListener('pointerdown', ()=>{
  setTimeout(()=>{
    if(boardGapPercent !== null) return;
    const v = Number(document.getElementById('boardGapSlider').getAttribute('aria-valuenow'));
    document.getElementById('boardGapInput').value = v;
    setBoardGapPercent(v, true);
  }, 0);
});

// Восстановление при открытии страницы; не выбрано - ползунок без бегунка.
(function(){
  let saved = null;
  try{ const raw = localStorage.getItem(BOARD_GAP_STORAGE_KEY); if(raw) saved = parseInt(raw, 10); }catch(e){}
  if(saved >= BOARD_GAP_MIN && saved <= BOARD_GAP_MAX){
    boardGapPercent = saved;
    document.getElementById('boardGapInput').value = saved;
    boardGapSlider.setValue(saved);
  } else {
    document.getElementById('boardGapSlider').classList.add('jump-slider-empty');
  }
})();
