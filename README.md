# ГОСТ 10198-91 — бэкенд-версия калькулятора

Полный продукт (фронтенд + бэкенд) для расчёта дощатых ящиков по ГОСТ
10198-91: тип I-1 и тип I-3 (обе комплектации — крепление за полозья и
крепление к доскам дна). Это отдельная, серверная версия того же
калькулятора, что развивается в репозитории
[`pakhiton79-bit/GOST_10198-91`](https://github.com/pakhiton79-bit/GOST_10198-91)
(там расчёт выполняется полностью в браузере, единым статическим HTML-файлом
на калькулятор). Здесь расчётные формулы вынесены на сервер (Node.js +
Express) и отдаются фронтенду через HTTP API — старый репозиторий при этом
не менялся и продолжает работать как раньше.

## Структура

```
backend/            Express-сервер: расчётный API + раздача фронтенда
  server.js
  src/
    helpers.js       общие утилиты (roundup, vol, fillBoards, округление "в наличии")
    i3/              тип I-3: табличные данные (Табл.19, Табл.4, Табл.14, п.1.6.x) + расчёт
    i1/              тип I-1: формулы + расчёт
frontend/public/     статический фронтенд (HTML/CSS/JS, отдаётся Express'ом как есть)
  index.html          список ГОСТов
  gost-10198-91.html  список типов тары
  i3-skid.html        калькулятор I-3, крепление за полозья
  i3-floor.html       калькулятор I-3, крепление к доскам дна
  i1.html             калькулятор I-1
  css/, js/, images/
```

## Запуск локально

```
cd backend
npm install
npm start
```

Сервер поднимается на `http://localhost:3000` (порт настраивается переменной
окружения `PORT`) и сразу отдаёт и API, и фронтенд — открывайте
`http://localhost:3000/index.html`.

## API

### `POST /api/i3/calculate`

Тело запроса:
```json
{
  "variant": "skid",
  "L": 3000, "W": 1200, "H": 1000, "MASS": 3000,
  "optimizeSizes": false, "removeFloorBoards": false, "removeSkidBoards": false,
  "roundBoardWidths": false, "solidRigidBase": false, "forkliftLoading": false,
  "availableThicknesses": []
}
```
`variant` — `"skid"` (крепление за полозья) или `"floor_boards"` (крепление
к доскам дна). Ответ — объект с итоговыми размерами/объёмом/нормой времени,
таблицами деталей (`dno`, `kryshka`, `endPanel`, `bokovoy`) и параметрами для
отрисовки чертежей, либо `{"error": "..."}`, если входные данные не прошли
проверку по ГОСТу.

### `POST /api/i1/calculate`

Тело запроса:
```json
{
  "L": 2000, "W": 1000, "H": 900, "MASS": 500,
  "skidEnabled": true, "skidThicknessRaw": 50,
  "roundBoardWidths": false, "availableThicknesses": []
}
```
Ответ — аналогичный объект с таблицами `dno`/`kryshka`/`bokovoy`/`torec`.

## Деплой на Render

Один Web Service:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Фронтенд раздаётся тем же сервисом (Express `express.static`), отдельного
статического хостинга не требуется.
