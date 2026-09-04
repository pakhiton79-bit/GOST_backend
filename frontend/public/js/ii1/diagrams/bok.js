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
const BOK_IMG_1FLOOR_3POSTS_B64 = "/images/bok_ii1_1floor_3posts.jpg"; // 2 раскосины
const BOK_IMG_1FLOOR_4POSTS_B64 = "/images/bok_ii1_1floor_4posts.jpg"; // 3 раскосины

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
    // «3 стойки» (2 раскосины) - по разметке пользователя.
    3: { img: BOK_IMG_1FLOOR_3POSTS_B64, IW: 1456, IH: 601,
      records: function(longbeamVal, lengthVal, skinVal, heightVal) {
        const records = [];
        records.push(
          {type:'line', x1:1448, y1:526, x2:1448, y2:688},
          {type:'line', x1:8, y1:690, x2:8, y2:525},
          {type:'double', x1:8, y1:664, x2:1447, y2:664, lx:728, ly:664, text:lengthVal+' мм'}
        );
        records.push(
          {type:'line', x1:1382, y1:593, x2:1553, y2:593},
          {type:'line', x1:1383, y1:60, x2:1560, y2:60},
          {type:'double', x1:1513, y1:60, x2:1513, y2:591, lx:1513, ly:326, text:heightVal+' мм', vertical:true}
        );
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:1381, y1:8, x2:1560, y2:8},
            {type:'line', x1:1530, y1:59, x2:1530, y2:8},
            {type:'single', x1:1350, y1:-113, x2:1530, y2:41, lx:1440, ly:-36, text:longbeamVal+' мм'}
          );
        }
        return records;
      }
    },
    // «4 стойки» (3 раскосины) - геометрия снята с самого фото (без готовой
    // пользовательской разметки, замерена по пиксельным границам рамки/стоек),
    // группы высоты/продольного бруса взяты из TOREC_VARIANTS[1][4]
    // (torec_ii1_1floor_4posts.jpg, 2222x644 - тот же масштаб, что и у этого
    // фото 2220x646). См. подробный комментарий в src/ii1/diagrams.js
    // исходного репозитория.
    4: { img: BOK_IMG_1FLOOR_4POSTS_B64, IW: 2220, IH: 646,
      records: function(longbeamVal, lengthVal, skinVal, heightVal) {
        const records = [];
        records.push(
          {type:'line', x1:6, y1:562, x2:6, y2:802},
          {type:'line', x1:2211, y1:562, x2:2211, y2:802},
          {type:'double', x1:6, y1:743, x2:2211, y2:743, lx:1108, ly:801, text:lengthVal+' мм'}
        );
        records.push(
          {type:'line', x1:2069, y1:636, x2:2369, y2:635},
          {type:'line', x1:2063, y1:66, x2:2365, y2:64},
          {type:'double', x1:2316, y1:64, x2:2317, y2:636, lx:2324, ly:346, text:heightVal+' мм', vertical:true}
        );
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:2062, y1:10, x2:2364, y2:6},
            {type:'line', x1:2275, y1:7, x2:2277, y2:65},
            {type:'single', x1:2022, y1:-120, x2:2278, y2:36, lx:2008, ly:-132, text:longbeamVal+' мм'}
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
