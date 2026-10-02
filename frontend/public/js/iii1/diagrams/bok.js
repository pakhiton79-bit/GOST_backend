// ГОСТ 10198-91, тип III-1: чертёж «Щит боковой» - щит на всю наружную
// длину ящика, высотой с груз (общий генератор - panel.js).
function diagramBokIII1(calc, widthPx){
  return diagramPanelIII1('Щит боковой - схема расположения деталей', calc.outerL, calc.H, calc.bokFrame,
    calc.xRaskosina, widthPx, III1_PANEL_LABEL_SCALE);
}
