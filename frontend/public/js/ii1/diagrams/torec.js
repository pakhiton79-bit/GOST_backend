// ГОСТ 10198-91, тип II-1: чертёж «Щит торцевой». Перенесено из
// src/ii1/diagrams.js исходного репозитория pakhiton79-bit/GOST_10198-91.
// Геометрия - НЕ единая формула на все схемы, а собственная разметка
// КАЖДОЙ схемы, присланная пользователем отдельно для каждого фото (тот же
// принцип, что и у KRYSHKA_VARIANTS - независимые записи per-схема, в
// натуральных пикселях именно этого фото). Схемы сгруппированы по этажности
// (TOREC_VARIANTS[floors][count]) - геометрия/пропорции у 1-этажных и
// 2-этажных щитов принципиально разные (два яруса раскосин), поэтому при
// floors=2 fallback ищет ближайшее число стоек ТОЛЬКО среди готовых
// 2-этажных схем, не подменяя их 1-этажным фото (см. nearestTorecVariant
// ниже).
// В 1-этажных схемах структура из 4 групп подписей:
// - A (только если longbeamVal>0 - режим "поперечное" расположение досок
//   крышки; при "продольном" бруса нет, группа не рисуется): толщина
//   внутреннего продольного бруса крышки (сидит НАД щитом).
// - B: ширина щита (наружный край левой стойки до наружного края правой) =
//   W + толщина стойки*2 (k31 - длина "Горизонтального бруса" в таблице).
// - C: толщина досок обшивки бока (skin.value) - отступ слева от щита.
// - D: высота щита БЕЗ бруса крышки (ширина стойки*2 + длина стойки) =
//   100*2 + torecFrame.len = panelHeightFull при floors=1 (см. heightVal).
// В 2-этажных схемах группа D показывает ПОЛНУЮ высоту щита (ширина
// стойки*3 + длина стойки*2 = panelHeightFull при floors=2), плюс
// добавляется своя группа E (floorHeightVal = ширина стойки + длина
// стойки, высота ОДНОГО этажа) - на 1-этажных схемах группы E нет.
function diagramTorec(count, floors, longbeamVal, widthVal, skinVal, heightVal, floorHeightVal, widthPxOverride){
  const variant = nearestTorecVariant(count, floors);
  const v = TOREC_VARIANTS[variant.floors][variant.count];
  const records = v.records(Math.round(longbeamVal), Math.round(widthVal), Math.round(skinVal), Math.round(heightVal), Math.round(floorHeightVal));
  return renderDiagram(v.img, 'Щит торцевой - схема расположения деталей', v.IW, v.IH, records, widthPxOverride, photoStrokeScale(v.IW));
}

const TOREC_IMG_2POSTS_B64 = "/images/torec_ii1_1floor_2posts.jpg"; // 1 раскосина
const TOREC_IMG_3POSTS_B64 = "/images/torec_ii1_1floor_3posts.jpg"; // 2 раскосины
const TOREC_IMG_4POSTS_B64 = "/images/torec_ii1_1floor_4posts.jpg"; // 3 раскосины
const TOREC_IMG_2FLOOR_2POSTS_B64 = "/images/torec_ii1_2floor_2posts.jpg"; // 2 этажа, 2 раскосины
const TOREC_IMG_2FLOOR_3POSTS_B64 = "/images/torec_ii1_2floor_3posts.jpg"; // 2 этажа, 4 раскосины

const TOREC_VARIANTS = {
  1: {
    // «2 стойки» (1 раскосина) - по исходной разметке пользователя.
    2: { img: TOREC_IMG_2POSTS_B64, IW: 1116, IH: 796,
      records: function(longbeamVal, widthVal, skinVal, heightVal) {
        const records = [];
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:877, y1:12, x2:1193, y2:12},
            {type:'line', x1:1153, y1:12, x2:1153, y2:80},
            {type:'single', x1:1008, y1:-124, x2:1153, y2:44, lx:973, ly:-145, text:longbeamVal+' мм'}
          );
        }
        records.push(
          {type:'line', x1:109, y1:698, x2:108, y2:920},
          {type:'line', x1:1011, y1:697, x2:1011, y2:932},
          {type:'double', x1:1011, y1:886, x2:107, y2:886, lx:562, ly:906, text:widthVal+' мм'}
        );
        records.push(
          {type:'line', x1:12, y1:700, x2:11, y2:863},
          {type:'line', x1:12, y1:824, x2:109, y2:824},
          {type:'single', x1:-90, y1:924, x2:62, y2:824, lx:-93, ly:945, text:skinVal+' мм'}
        );
        records.push(
          {type:'line', x1:879, y1:80, x2:1285, y2:80},
          {type:'line', x1:879, y1:696, x2:1285, y2:696},
          {type:'double', x1:1225, y1:80, x2:1225, y2:696, lx:1236, ly:388, text:heightVal+' мм', vertical:true}
        );
        return records;
      }
    },
    // «3 стойки» (2 раскосины) - по разметке пользователя.
    3: { img: TOREC_IMG_3POSTS_B64, IW: 1460, IH: 605,
      records: function(longbeamVal, widthVal, skinVal, heightVal) {
        const records = [];
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:1313, y1:13, x2:1603, y2:11},
            {type:'line', x1:1530, y1:12, x2:1530, y2:62},
            {type:'single', x1:1211, y1:-120, x2:1531, y2:40, lx:1182, ly:-136, text:longbeamVal+' мм'}
          );
        }
        records.push(
          {type:'line', x1:1379, y1:734, x2:1377, y2:530},
          {type:'double', x1:11, y1:712, x2:1377, y2:712, lx:694, ly:735, text:widthVal+' мм'}
        );
        records.push(
          {type:'line', x1:82, y1:528, x2:82, y2:662},
          {type:'line', x1:10, y1:530, x2:10, y2:731},
          {type:'line', x1:10, y1:620, x2:82, y2:619},
          {type:'single', x1:-77, y1:716, x2:46, y2:620, lx:-83, ly:744, text:skinVal+' мм'}
        );
        records.push(
          {type:'line', x1:1311, y1:598, x2:1603, y2:596},
          {type:'line', x1:1603, y1:62, x2:1312, y2:64},
          {type:'double', x1:1561, y1:64, x2:1562, y2:597, lx:1572, ly:331, text:heightVal+' мм', vertical:true}
        );
        return records;
      }
    },
    // «4 стойки» (3 раскосины) - по разметке пользователя.
    4: { img: TOREC_IMG_4POSTS_B64, IW: 2222, IH: 644,
      records: function(longbeamVal, widthVal, skinVal, heightVal) {
        const records = [];
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:2062, y1:10, x2:2364, y2:6},
            {type:'line', x1:2275, y1:7, x2:2277, y2:65},
            {type:'single', x1:2022, y1:-120, x2:2278, y2:36, lx:2008, ly:-132, text:longbeamVal+' мм'}
          );
        }
        records.push(
          {type:'line', x1:2135, y1:567, x2:2138, y2:802},
          {type:'double', x1:7, y1:744, x2:2135, y2:743, lx:1112, ly:801, text:widthVal+' мм'}
        );
        records.push(
          {type:'line', x1:78, y1:565, x2:78, y2:729},
          {type:'line', x1:8, y1:564, x2:8, y2:788},
          {type:'line', x1:9, y1:679, x2:78, y2:678},
          {type:'single', x1:-108, y1:532, x2:44, y2:679, lx:-109, ly:499, text:skinVal+' мм'}
        );
        records.push(
          {type:'line', x1:2069, y1:636, x2:2369, y2:635},
          {type:'line', x1:2063, y1:66, x2:2365, y2:64},
          {type:'double', x1:2316, y1:64, x2:2317, y2:636, lx:2324, ly:346, text:heightVal+' мм', vertical:true}
        );
        return records;
      }
    },
  },
  2: {
    // «2 стойки, 2 этажа» (2 раскосины, по 1 на этаж) - по разметке
    // пользователя. heightVal - полная высота щита (ширина стойки*3 +
    // длина стойки*2 = panelHeightFull), floorHeightVal - высота ОДНОГО
    // этажа (ширина стойки + длина стойки) - своя, отдельная от 1-этажных
    // схем группа E.
    2: { img: TOREC_IMG_2FLOOR_2POSTS_B64, IW: 833, IH: 1041,
      records: function(longbeamVal, widthVal, skinVal, heightVal, floorHeightVal) {
        const records = [];
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:679, y1:28, x2:984, y2:30},
            {type:'line', x1:680, y1:78, x2:989, y2:78},
            {type:'line', x1:934, y1:79, x2:934, y2:30},
            {type:'single', x1:715, y1:-127, x2:934, y2:56, lx:642, ly:-136, text:longbeamVal+' мм'}
          );
        }
        records.push(
          {type:'line', x1:682, y1:1026, x2:1002, y2:1024},
          {type:'double', x1:909, y1:82, x2:910, y2:1024, lx:955, ly:552, text:heightVal+' мм', vertical:true}
        );
        records.push(
          {type:'line', x1:163, y1:584, x2:-107, y2:585},
          {type:'line', x1:163, y1:1026, x2:-115, y2:1028},
          {type:'double', x1:-61, y1:586, x2:-61, y2:1027, lx:-93, ly:805, text:floorHeightVal+' мм', vertical:true}
        );
        records.push(
          {type:'line', x1:100, y1:966, x2:99, y2:1130},
          {type:'line', x1:745, y1:963, x2:746, y2:1130},
          {type:'double', x1:100, y1:1096, x2:746, y2:1095, lx:424, ly:1116, text:widthVal+' мм'}
        );
        return records;
      }
    },
    // «3 стойки, 2 этажа» (4 раскосины, по 2 на этаж) - по разметке
    // пользователя. В отличие от схемы «2 стойки» выше, здесь есть своя
    // группа skinVal (толщина досок обшивки бока) - на схеме «2 стойки» её
    // не было вовсе.
    3: { img: TOREC_IMG_2FLOOR_3POSTS_B64, IW: 1473, IH: 1088,
      records: function(longbeamVal, widthVal, skinVal, heightVal, floorHeightVal) {
        const records = [];
        if(longbeamVal > 0){
          records.push(
            {type:'line', x1:1317, y1:20, x2:1653, y2:20},
            {type:'line', x1:1317, y1:73, x2:1654, y2:73},
            {type:'line', x1:1593, y1:20, x2:1593, y2:72},
            {type:'single', x1:1369, y1:-114, x2:1593, y2:47, lx:1317, ly:-119, text:longbeamVal+' мм'}
          );
        }
        records.push(
          {type:'line', x1:1316, y1:1072, x2:1667, y2:1071},
          {type:'double', x1:1570, y1:73, x2:1570, y2:1070, lx:1597, ly:582, text:heightVal+' мм', vertical:true}
        );
        records.push(
          {type:'line', x1:152, y1:606, x2:-75, y2:605},
          {type:'line', x1:151, y1:1072, x2:-91, y2:1072},
          {type:'double', x1:-57, y1:607, x2:-56, y2:1073, lx:-77, ly:844, text:floorHeightVal+' мм', vertical:true}
        );
        records.push(
          {type:'line', x1:1382, y1:1005, x2:1382, y2:1180},
          {type:'line', x1:86, y1:1005, x2:85, y2:1167},
          {type:'double', x1:1382, y1:1148, x2:86, y2:1149, lx:735, ly:1164, text:widthVal+' мм'}
        );
        records.push(
          {type:'line', x1:14, y1:1009, x2:14, y2:1167},
          {type:'line', x1:14, y1:1107, x2:86, y2:1106},
          {type:'single', x1:-97, y1:1222, x2:52, y2:1106, lx:-102, ly:1234, text:skinVal+' мм'}
        );
        return records;
      }
    },
  },
};
const TOREC_POST_OPTIONS = [2, 3, 4];

// Готовых фото - 1 этаж (2/3/4 стойки, т.е. 1/2/3 раскосины) и пока только
// начало 2-этажных схем (2 стойки, ещё пришлют 3/4 позже - см. комментарий у
// TOREC_VARIANTS выше). Если для расчётной этажности нет НИ ОДНОЙ готовой
// схемы у нужного числа стоек - берём ближайшее число стоек СРЕДИ схем ТОЙ
// ЖЕ этажности (не подменяя другой этажностью - геометрия слишком разная);
// если для расчётной этажности готовых схем нет вовсе - используем схемы
// доступной этажности (тот же приём, что и у Крышки, nearestKryshkaVariant,
// но с дополнительным измерением "этаж").
function nearestTorecVariant(count, floors){
  const floorsAvailable = Object.keys(TOREC_VARIANTS).map(Number);
  const bestFloors = floorsAvailable.includes(floors) ? floors
    : floorsAvailable.reduce((a,b)=> Math.abs(b-floors)<Math.abs(a-floors) ? b : a);
  const countOptions = Object.keys(TOREC_VARIANTS[bestFloors]).map(Number);
  const bestCount = countOptions.reduce((a,b)=> Math.abs(b-count)<Math.abs(a-count) ? b : a);
  return {count: bestCount, floors: bestFloors, exact: bestCount===count && bestFloors===floors};
}
