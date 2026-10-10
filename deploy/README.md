# Переезд сайта «Тара+» на VPS рег.ру

Сайт работает на одном сервере: Node.js отвечает на запросы, nginx принимает
их на домене и включает HTTPS, данные (аккаунты, заявки, статистика) лежат в
одном файле на диске сервера. Сервер и данные - в России (152-ФЗ).

Файлы в этой папке:

| Файл | Что это |
|---|---|
| `env.example` | настройки сайта (почта админа, почтовый сервис и т.п.) |
| `taraplus.service` | служба systemd: запуск при старте сервера, перезапуск при падении |
| `nginx-taraplus.conf` | nginx: домен, передача запросов сайту |
| `backup.sh` | ежедневная копия данных, хранятся 30 последних |
| `update.sh` | обновление сайта до последней версии из GitHub |

## 1. Что купить на рег.ру

1. **Домен** (например, `taraplus.ru`).
2. **Облачный сервер (VPS)**: Ubuntu 24.04, 1 ядро, 1-2 ГБ памяти, 10-20 ГБ
   диска - для начала хватит с запасом. **Регион - Москва или
   Санкт-Петербург** (данные пользователей должны храниться в России).
3. По желанию - **резервное копирование сервера** у рег.ру (платная опция,
   снимки диска целиком). Без неё остаются ежедневные копии файла данных
   на самом сервере (шаг 7).

## 2. Домен - на сервер

В панели рег.ру у домена → «DNS-серверы и управление зоной» → добавить
записи (IP - адрес сервера из письма рег.ру):

| Тип | Имя | Значение |
|---|---|---|
| A | @ | IP сервера |
| A | www | IP сервера |

Записи начинают работать от нескольких минут до суток.

## 3. Подготовка сервера

Подключиться: `ssh root@IP_сервера` (пароль - из письма рег.ру). Дальше
команды по порядку:

```sh
# обновления и нужные программы
apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx ufw

# Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# брандмауэр: открыты только SSH и сайт
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# отдельный пользователь для сайта и папка данных
useradd --system --create-home --home-dir /opt/taraplus --shell /usr/sbin/nologin taraplus
mkdir -p /var/lib/taraplus /var/backups/taraplus /etc/taraplus
chown taraplus:taraplus /var/lib/taraplus
chmod 700 /var/lib/taraplus /var/backups/taraplus
```

## 4. Сайт

```sh
# код сайта
rm -rf /opt/taraplus && git clone https://github.com/pakhiton79-bit/GOST_backend.git /opt/taraplus
chown -R taraplus:taraplus /opt/taraplus
cd /opt/taraplus/backend && sudo -u taraplus npm ci --omit=dev

# настройки
cp /opt/taraplus/deploy/env.example /etc/taraplus/env
nano /etc/taraplus/env        # заполнить ADMIN_EMAILS, CAPTCHA_SECRET и т.д.
chmod 600 /etc/taraplus/env

# служба
cp /opt/taraplus/deploy/taraplus.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now taraplus
systemctl status taraplus     # должно быть active (running)
```

Если репозиторий станет закрытым, для `git clone` понадобится ключ доступа
(GitHub → репозиторий → Settings → Deploy keys) - могу расписать отдельно.

## 5. Домен и HTTPS

**Важно:** сайт должен работать только за nginx (в `env` - `HOST=127.0.0.1`).
Ограничение частоты запросов и защита от подбора пароля опираются на
настоящий IP посетителя, который передаёт nginx; если открыть порт 3000
наружу напрямую, IP можно подделать заголовком.

```sh
cp /opt/taraplus/deploy/nginx-taraplus.conf /etc/nginx/sites-available/taraplus
nano /etc/nginx/sites-available/taraplus     # example.ru -> ваш домен (2 места)
ln -s /etc/nginx/sites-available/taraplus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# бесплатный сертификат Let's Encrypt, продлевается сам
certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru --redirect
```

После этого сайт открывается по `https://ваш-домен.ru`.

## 6. Перенос данных с Render (если на Render уже есть пользователи)

На бесплатном Render файл данных стирается при каждом перезапуске, поэтому
переносить обычно нечего: тестовые аккаунты проще зарегистрировать заново
на новом сайте.

## 7. Резервные копии

```sh
chmod +x /opt/taraplus/deploy/backup.sh
echo '30 3 * * * root /opt/taraplus/deploy/backup.sh' > /etc/cron.d/taraplus-backup
```

Каждую ночь в 3:30 - копия данных в `/var/backups/taraplus`, хранятся 30
последних. Копии остаются в России; не выкладывайте их на GitHub, в
зарубежные облака и т.п. (152-ФЗ).

Восстановление из копии:

```sh
systemctl stop taraplus
cp /var/backups/taraplus/accounts-ГГГГ-ММ-ДД.json /var/lib/taraplus/accounts.json
chown taraplus:taraplus /var/lib/taraplus/accounts.json
systemctl start taraplus
```

## 8. Обновление сайта

После того как изменения запушены в GitHub:

```sh
sudo /opt/taraplus/deploy/update.sh
```

Данные при обновлении не затрагиваются (они в `/var/lib/taraplus`, вне папки
проекта).

## 9. Полезное

- Журнал сайта (в т.ч. коды подтверждения, пока почта не настроена):
  `journalctl -u taraplus -f`
- Перезапуск: `systemctl restart taraplus`
- Сайт запускается **в одном экземпляре** (данные - один файл; два процесса
  мешали бы друг другу). Так и настроено в `taraplus.service`.

## 10. Юридическое (до запуска)

- Подать **уведомление в Роскомнадзор** об обработке персональных данных
  (pd.rkn.gov.ru) - до начала сбора данных.
- Заполнить данные оператора и Исполнителя по платным подпискам (ФИО, ИНН)
  в `frontend/public/js/legal-config.js`. Исполнителю - письменное согласие
  законного представителя (п. 6.5 соглашения) до начала приёма оплаты. Затем
  проверить политику конфиденциальности (место хранения - Россия, хостинг -
  рег.ру).
- Сервер, данные и резервные копии - в России. Почтовый сервис для писем с
  кодами - тоже российский (Unisender Go, Яндекс, VK WorkSpace).
