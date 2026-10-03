// ГОСТ 10198-91, тип I-4: «Наибольший промежуток между досками» обшивки -
// ползунок (10-100 мм с шагом 10) и поле для любого целого от 10 до 100.
// Обязателен (по указанию пользователя): значения по умолчанию нет, пока его
// не выбрали, расчёт блокируется (ошибку выдаёт сервер, поле подсвечивается,
// см. errorFieldsFor в calc-i4.js). Доски - по 100 мм, крайние по краям
// щита, остальные равномерно между ними, промежуток между соседними - не
// больше этого значения. Значение запоминается в localStorage при каждом
// изменении.
const BOARD_GAP_MIN = 10, BOARD_GAP_MAX = 100;
const BOARD_GAP_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const BOARD_GAP_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'boardGapMax';
let boardGapMax = null; // null - не выбрано

function readBoardGapMax(){
  return boardGapMax;
}
function setBoardGapMax(v, fromSlider){
  boardGapMax = v;
  const sliderEl = document.getElementById('boardGapSlider');
  sliderEl.classList.toggle('jump-slider-empty', v === null);
  if(!fromSlider && v !== null) boardGapSlider.setValue(v);
  try{ localStorage.setItem(BOARD_GAP_STORAGE_KEY, v === null ? '' : String(v)); }catch(e){}
  invalidateCalc();
}
function onBoardGapInputChange(){
  const v = parseInt(document.getElementById('boardGapInput').value, 10);
  setBoardGapMax(v >= BOARD_GAP_MIN && v <= BOARD_GAP_MAX ? v : null, false);
}

const boardGapSlider = createJumpSlider(document.getElementById('boardGapSlider'), BOARD_GAP_STEPS, v=>{
  document.getElementById('boardGapInput').value = v;
  setBoardGapMax(v, true);
});

// Щелчок по ползунку без выбранного значения в его же текущую точку (10 мм)
// ползунок не считает изменением - значение берётся из него явно.
document.getElementById('boardGapSlider').addEventListener('pointerdown', ()=>{
  setTimeout(()=>{
    if(boardGapMax !== null) return;
    const v = Number(document.getElementById('boardGapSlider').getAttribute('aria-valuenow'));
    document.getElementById('boardGapInput').value = v;
    setBoardGapMax(v, true);
  }, 0);
});

// Восстановление при открытии страницы; не выбрано - ползунок без бегунка.
(function(){
  let saved = null;
  try{ const raw = localStorage.getItem(BOARD_GAP_STORAGE_KEY); if(raw) saved = parseInt(raw, 10); }catch(e){}
  if(saved >= BOARD_GAP_MIN && saved <= BOARD_GAP_MAX){
    boardGapMax = saved;
    document.getElementById('boardGapInput').value = saved;
    boardGapSlider.setValue(saved);
  } else {
    document.getElementById('boardGapSlider').classList.add('jump-slider-empty');
  }
})();
