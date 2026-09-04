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
function diagramBok(count, floors, longbeamVal, lengthVal, skinVal, heightVal, floorHeightVal, widthPxOverride, labelScale){
  const variant = nearestBokVariant(count, floors);
  const v = BOK_VARIANTS[variant.floors][variant.count];
  const records = v.records(Math.round(longbeamVal), Math.round(lengthVal), Math.round(skinVal), Math.round(heightVal), Math.round(floorHeightVal));
  return renderDiagram(v.img, 'Щит боковой - схема расположения деталей', v.IW, v.IH, records, widthPxOverride, photoStrokeScale(v.IW), labelScale);
}

const BOK_IMG_1FLOOR_2POSTS_B64 = "/images/bok_ii1_1floor_2posts.jpg"; // 1 раскосина
const BOK_IMG_1FLOOR_3POSTS_B64 = "/images/bok_ii1_1floor_3posts.jpg"; // 2 раскосины
const BOK_IMG_1FLOOR_4POSTS_B64 = "/images/bok_ii1_1floor_4posts.jpg"; // 3 раскосины
const BOK_IMG_2FLOOR_2POSTS_B64 = "/images/bok_ii1_2floor_2posts.jpg"; // 2 этажа, 2 раскосины
const BOK_IMG_2FLOOR_3POSTS_B64 = "/images/bok_ii1_2floor_3posts.jpg"; // 2 этажа, 4 раскосины
const BOK_IMG_2FLOOR_4POSTS_B64 = "/images/bok_ii1_2floor_4posts.jpg"; // 2 этажа, 6 раскосин

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
  2: {
    // «2 стойки, 2 этажа» (2 раскосины, по 1 на этаж) - по разметке
    // пользователя. В отличие от Щита торцевого, здесь пользователь не
    // прислал отдельную группу floorHeightVal (высота одного этажа) - только
    // полную высоту щита, поэтому records() её не использует.
    2: { img: BOK_IMG_2FLOOR_2POSTS_B64, IW: 814, IH: 1022,
      records: function(longbeamVal, lengthVal, skinVal, heightVal) {
        const records = [];
        records.push(
          {type:'line', x1:16, y1:1111, x2:16, y2:948},
          {type:'line', x1:800, y1:949, x2:800, y2:1111},
          {type:'double', x1:16, y1:1085, x2:800, y2:1085, lx:408, ly:1085, text:lengthVal+' мм'}
        );
        records.push(
          {type:'line', x1:737, y1:64, x2:918, y2:62},
          {type:'line', x1:739, y1:1012, x2:917, y2:1012},
          {type:'double', x1:880, y1:63, x2:880, y2:1011, lx:880, ly:537, text:heightVal+' мм', vertical:true}
        );
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:734, y1:13, x2:916, y2:13},
            {type:'line', x1:846, y1:14, x2:846, y2:62},
            {type:'single', x1:613, y1:-120, x2:845, y2:39, lx:615, ly:-141, text:longbeamVal+' мм'}
          );
        }
        return records;
      }
    },
    // «3 стойки, 2 этажа» (4 раскосины) - у пользователя не было готовой
    // разметки для этого фото. Группа длины - свои координаты по фактическим
    // краям этого фото, группы высоты/продольного бруса взяты из
    // TOREC_VARIANTS[2][3] (тот же масштаб фото). См. подробный комментарий в
    // src/ii1/diagrams.js исходного репозитория.
    3: { img: BOK_IMG_2FLOOR_3POSTS_B64, IW: 1455, IH: 1068,
      records: function(longbeamVal, lengthVal, skinVal, heightVal) {
        const records = [];
        records.push(
          {type:'line', x1:6, y1:1005, x2:6, y2:1170},
          {type:'line', x1:1446, y1:1005, x2:1446, y2:1170},
          {type:'double', x1:6, y1:1148, x2:1446, y2:1148, lx:726, ly:1164, text:lengthVal+' мм'}
        );
        records.push(
          {type:'line', x1:1317, y1:73, x2:1654, y2:73},
          {type:'line', x1:1316, y1:1072, x2:1667, y2:1071},
          {type:'double', x1:1570, y1:73, x2:1570, y2:1070, lx:1597, ly:582, text:heightVal+' мм', vertical:true}
        );
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:1317, y1:20, x2:1653, y2:20},
            {type:'line', x1:1593, y1:20, x2:1593, y2:72},
            {type:'single', x1:1369, y1:-114, x2:1593, y2:47, lx:1317, ly:-119, text:longbeamVal+' мм'}
          );
        }
        return records;
      }
    },
    // «4 стойки, 2 этажа» (6 раскосин) - у пользователя не было готовой
    // разметки. Группа длины - свои координаты, группы высоты/продольного
    // бруса взяты из TOREC_VARIANTS[2][4] (практически идентичный масштаб).
    4: { img: BOK_IMG_2FLOOR_4POSTS_B64, IW: 2220, IH: 1160,
      records: function(longbeamVal, lengthVal, skinVal, heightVal) {
        const records = [];
        records.push(
          {type:'line', x1:6, y1:1080, x2:6, y2:1264},
          {type:'line', x1:2211, y1:1080, x2:2211, y2:1264},
          {type:'double', x1:6, y1:1222, x2:2211, y2:1222, lx:1108, ly:1242, text:lengthVal+' мм'}
        );
        records.push(
          {type:'line', x1:2065, y1:78, x2:2390, y2:76},
          {type:'line', x1:2063, y1:1152, x2:2381, y2:1152},
          {type:'double', x1:2298, y1:77, x2:2299, y2:1152, lx:2319, ly:622, text:heightVal+' мм', vertical:true}
        );
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:2062, y1:9, x2:2389, y2:9},
            {type:'line', x1:2317, y1:10, x2:2318, y2:77},
            {type:'single', x1:2037, y1:-141, x2:2317, y2:44, lx:2027, ly:-144, text:longbeamVal+' мм'}
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
