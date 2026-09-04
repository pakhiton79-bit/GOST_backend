// ГОСТ 10198-91, тип II-1: чертёж «Щит боковой». Перенесено из
// src/ii1/diagrams.js исходного репозитория pakhiton79-bit/GOST_10198-91.
// Та же схема группировки, что и у Щита торцевого (torec.js): собственная
// разметка КАЖДОЙ схемы, сгруппированная по этажности (BOK_VARIANTS[floors][count]).
// Группы подписей на 1-этажных схемах:
// - A (только если longbeamVal>0 - режим "поперечное" расположение досок
//   крышки): толщина внутреннего продольного бруса крышки (сидит НАД щитом,
//   тот же приём, что и у Щита торцевого).
// - длина груза (lengthVal = L) - должна визуально совпадать с длиной
//   горизонтального бруса бока (k43 в src/ii1/calc.js).
// - высота щита БЕЗ бруса крышки (ширина стойки*2 + длина стойки) =
//   panelHeightFull при floors=1 (heightVal) - та же величина, что и у
//   Щита торцевого (общий H и panelHeightFull для обоих щитов).
function diagramBok(count, floors, longbeamVal, lengthVal, skinVal, heightVal, floorHeightVal, widthPxOverride){
  const variant = nearestBokVariant(count, floors);
  const v = BOK_VARIANTS[variant.floors][variant.count];
  const records = v.records(Math.round(longbeamVal), Math.round(lengthVal), Math.round(skinVal), Math.round(heightVal), Math.round(floorHeightVal));
  return renderDiagram(v.img, 'Щит боковой - схема расположения деталей', v.IW, v.IH, records, widthPxOverride, photoStrokeScale(v.IW));
}

const BOK_IMG_1FLOOR_2POSTS_B64 = "/images/bok_ii1_1floor_2posts.jpg"; // 1 раскосина

const BOK_VARIANTS = {
  1: {
    // «2 стойки» (1 раскосина) - по разметке пользователя.
    2: { img: BOK_IMG_1FLOOR_2POSTS_B64, IW: 1120, IH: 801,
      records: function(longbeamVal, lengthVal, skinVal, heightVal) {
        const records = [];
        records.push(
          {type:'line', x1:12, y1:702, x2:11, y2:912},
          {type:'line', x1:1107, y1:701, x2:1108, y2:911},
          {type:'double', x1:12, y1:881, x2:1109, y2:882, lx:561, ly:896, text:lengthVal+' мм'}
        );
        records.push(
          {type:'line', x1:1019, y1:790, x2:1257, y2:790},
          {type:'line', x1:1018, y1:84, x2:1273, y2:83},
          {type:'double', x1:1225, y1:83, x2:1227, y2:790, lx:1258, ly:438, text:heightVal+' мм', vertical:true}
        );
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:1020, y1:15, x2:1277, y2:16},
            {type:'line', x1:1180, y1:17, x2:1180, y2:84},
            {type:'single', x1:1008, y1:-158, x2:1179, y2:52, lx:1006, ly:-166, text:longbeamVal+' мм'}
          );
        }
        return records;
      }
    },
  },
};

// Тот же приём, что и у nearestTorecVariant: сперва ближайшая доступная
// этажность, затем ближайшее число стоек внутри неё.
function nearestBokVariant(count, floors){
  const floorsAvailable = Object.keys(BOK_VARIANTS).map(Number);
  const bestFloors = floorsAvailable.includes(floors) ? floors
    : floorsAvailable.reduce((a,b)=> Math.abs(b-floors)<Math.abs(a-floors) ? b : a);
  const countOptions = Object.keys(BOK_VARIANTS[bestFloors]).map(Number);
  const bestCount = countOptions.reduce((a,b)=> Math.abs(b-count)<Math.abs(a-count) ? b : a);
  return {count: bestCount, floors: bestFloors, exact: bestCount===count && bestFloors===floors};
}
