// ГОСТ 10198-91, тип III-1: чертёж «Щит торцевой» - щит по ширине груза,
// высотой с груз (общий генератор - panel.js).
function diagramTorecIII1(calc, widthPx){
  return diagramPanelIII1('Щит торцевой - схема расположения деталей', calc.W, calc.H, calc.torecFrame,
    calc.xRaskosina, widthPx, III1_PANEL_LABEL_SCALE);
}
