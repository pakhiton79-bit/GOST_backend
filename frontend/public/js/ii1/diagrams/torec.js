// ГОСТ 10198-91, тип II-1: чертёж «Щит торцевой». Перенесено из
// src/ii1/diagrams.js исходного репозитория pakhiton79-bit/GOST_10198-91 -
// 3 готовые схемы по числу стоек (2/3/4, т.е. 1/2/3 раскосины), только для 1
// этажа (см. TOREC_VARIANTS/nearestTorecVariant ниже) - при 2 этажах или
// другом числе стоек берётся ближайшая доступная, с предупреждением (тот же
// приём, что и у Крышки, kryshka.js). Геометрия - НЕ единая формула на все
// схемы, а собственная разметка КАЖДОЙ схемы, присланная пользователем
// отдельно для каждого фото (тот же принцип, что и у KRYSHKA_VARIANTS -
// независимые записи per-схема, в натуральных пикселях именно этого фото).
// Во всех 3 схемах одна и та же структура из 4 групп подписей:
// - A (только если longbeamVal>0 - режим "поперечное" расположение досок
//   крышки; при "продольном" бруса нет, группа не рисуется): толщина
//   внутреннего продольного бруса крышки (сидит НАД щитом).
// - B: ширина щита (наружный край левой стойки до наружного края правой) =
//   W + толщина стойки*2 (k31 - длина "Горизонтального бруса" в таблице).
// - C: толщина досок обшивки бока (skin.value) - отступ слева от щита.
// - D: высота щита БЕЗ бруса крышки (ширина стойки*2 + длина стойки) =
//   100*2 + torecFrame.len.
function diagramTorec(count, longbeamVal, widthVal, skinVal, heightVal, widthPxOverride){
  const variant = nearestTorecVariant(count);
  const v = TOREC_VARIANTS[variant.count];
  const records = v.records(Math.round(longbeamVal), Math.round(widthVal), Math.round(skinVal), Math.round(heightVal));
  return renderDiagram(v.img, 'Щит торцевой - схема расположения деталей', v.IW, v.IH, records, widthPxOverride, photoStrokeScale(v.IW));
}

const TOREC_IMG_2POSTS_B64 = "/images/torec_ii1_1floor_2posts.jpg"; // 1 раскосина
const TOREC_IMG_3POSTS_B64 = "/images/torec_ii1_1floor_3posts.jpg"; // 2 раскосины
const TOREC_IMG_4POSTS_B64 = "/images/torec_ii1_1floor_4posts.jpg"; // 3 раскосины

const TOREC_VARIANTS = {
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
};
const TOREC_POST_OPTIONS = [2, 3, 4];

// Готовых фото только для 1 этажа и 2/3/4 стоек (1/2/3 раскосины) - при
// другом числе стоек (5+) или 2 этажах берётся ближайшая доступная схема по
// числу стоек (этажность не учитывается вовсе, доступных фото для 2 этажей
// ещё нет) - тот же приём, что и у Крышки (nearestKryshkaVariant выше).
function nearestTorecVariant(count){
  const best = TOREC_POST_OPTIONS.reduce((a,b)=> Math.abs(b-count)<Math.abs(a-count) ? b : a);
  return {count: best, exact: best===count};
}
