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
2. **Облачный сервер (VPS)**: Ubuntu 26.04 LTS (или 24.04 LTS), тариф
   Std C1-M1-D10 (1 ядро, 1 ГБ памяти, 10 ГБ диска) - для начала хватит с
   запасом. **Регион - Москва** (данные пользователей должны храниться в
   России). При создании вставить в поле «SSH-ключ» открытый ключ (шаг 3.0).
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

### 3.0. SSH-ключ (на своём компьютере, один раз)

PowerShell (Windows) или терминал (Mac, Linux):

```sh
ssh-keygen -t ed25519 -C "taraplus"
type $env:USERPROFILE\.ssh\id_ed25519.pub     # Windows; Mac/Linux: cat ~/.ssh/id_ed25519.pub
```

Строка `ssh-ed25519 ...` - открытый ключ: её вставляют в панель рег.ру.
Файл `id_ed25519` без `.pub` - секретный, никому не передавать.

Подключиться: `ssh root@IP_сервера`. Если ключ при создании сервера не
добавлен - войти по паролю из письма рег.ру и добавить ключ:

```sh
mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys      # вставить строку ssh-ed25519 ..., сохранить
chmod 600 ~/.ssh/authorized_keys
```

Дальше команды по порядку:

```sh
# обновления и нужные программы
apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx ufw

# Node.js 22 (LTS); если скрипт NodeSource не поддерживает версию Ubuntu -
# из репозитория Ubuntu: apt install -y nodejs npm (нужна версия 18 и выше,
# проверить: node -v)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# файл подкачки 1 ГБ (на сервере с 1 ГБ памяти - запас при обновлениях)
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# вход только по SSH-ключу (сначала убедиться, что вход по ключу работает -
# в новом окне: ssh root@IP_сервера - без вопроса о пароле)
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\n' > /etc/ssh/sshd_config.d/10-taraplus.conf
systemctl reload ssh

# журналы nginx (IP посетителей) - 30 дней, потом удаляются (так написано
# в политике обработки персональных данных, п. 5.2)
sed -i 's/^\s*rotate .*/\trotate 30/; s/^\s*weekly/\tdaily/' /etc/logrotate.d/nginx
grep -E 'daily|rotate' /etc/logrotate.d/nginx     # должно быть: daily и rotate 30

# журнал сайта (systemd) - тоже не дольше 30 дней
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nMaxRetentionSec=30day\n' > /etc/systemd/journald.conf.d/30days.conf
systemctl restart systemd-journald

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

## 5а. Защита nginx

Скрыть версию nginx и ограничить поток запросов к API с одного IP
(`deploy/nginx-security.conf`, пояснения - в самом файле):

```sh
cp /opt/taraplus/deploy/nginx-security.conf /etc/nginx/conf.d/taraplus-security.conf
nginx -t && systemctl reload nginx
```

Если `nginx -t` пишет `"server_tokens" directive is duplicate` - строка
`server_tokens` уже есть в `/etc/nginx/nginx.conf` (в Ubuntu 26.04 -
`server_tokens build;`, версия видна): там поставить `off`, а из
`/etc/nginx/conf.d/taraplus-security.conf` строку удалить, затем повторить:

```sh
sed -i 's/^\(\s*\)server_tokens build;/\1server_tokens off;/' /etc/nginx/nginx.conf
sed -i '/^server_tokens off;/d' /etc/nginx/conf.d/taraplus-security.conf
nginx -t && systemctl reload nginx
```

## 5б. Вход на сервер не под root

Работать под отдельным пользователем с `sudo`, вход под root по SSH -
запретить. **Окно с текущим входом под root не закрывать**, пока вход
под новым пользователем не проверен.

```sh
adduser --gecos "" tara            # придумать пароль - он для sudo
usermod -aG sudo tara
mkdir -p /home/tara/.ssh && cp /root/.ssh/authorized_keys /home/tara/.ssh/
chown -R tara:tara /home/tara/.ssh && chmod 700 /home/tara/.ssh && chmod 600 /home/tara/.ssh/authorized_keys
```

В новом окне PowerShell: `ssh tara@<IP сервера>`, затем `sudo whoami` -
должно быть `root`. Только после этого (в окне root):

```sh
printf 'PermitRootLogin no\n' > /etc/ssh/sshd_config.d/20-noroot.conf
sshd -t && systemctl reload ssh
```

Проверка: `sshd -T -C user=root,host=x,addr=1.2.3.4 | grep -iE "permitrootlogin|passwordauthentication"`
- должно быть `no` и `no`. В образе Рег.облака есть
`/etc/ssh/sshd_config.d/99-qemu.conf` с блоком `Match User root`, который
разрешает root вход **и по паролю** (перекрывает настройки выше) - его
убрать: `mv /etc/ssh/sshd_config.d/99-qemu.conf /root/99-qemu.conf.bak`,
затем `sshd -t && systemctl reload ssh`. Консоль в панели Рег.облака и
сброс пароля root из панели работают и без него.

Дальше вход - `ssh tara@<IP>`, команды администрирования - через `sudo`
(например, `sudo sh /opt/taraplus/deploy/update.sh`). Консоль в панели
Рег.облака по-прежнему пускает под root по паролю root.

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

## 8а. Оплата: ЮKassa

Пока в `/etc/taraplus/env` не заданы shopId и секретный ключ, оплаты на
сайте нет (на странице подписок кнопки «Скоро»).

1. Кабинет ЮKassa ([yookassa.ru/my](https://yookassa.ru/my)):
   - **Интеграция → HTTP-уведомления**: URL
     `https://taraplus.site/api/pay/result`, события `payment.succeeded` и
     `payment.canceled`;
   - **Интеграция → Ключи API**: выпустить секретный ключ, shopId - там же;
   - для проверки - **тестовый магазин** (переключатель магазинов вверху
     кабинета): у него свои shopId, ключ и такие же HTTP-уведомления.
   Страницу возврата после оплаты сайт передаёт сам (`pay-success.html`).
   HTTP-уведомления желательны, но не обязательны: если их нет в кабинете,
   сайт раз в минуту сам сверяет неоплаченные счета с ЮKassa, и подписка
   подключается в течение минуты после оплаты.
2. На сервере (из PowerShell: `ssh tara@<IP сервера>`, затем `sudo -i`)
   добавить строки настроек, если их ещё нет, и вписать shopId и ключ
   (ключ не виден при вводе):

```sh
grep -q '^YOOKASSA_' /etc/taraplus/env || grep YOOKASSA /opt/taraplus/deploy/env.example >> /etc/taraplus/env
read -r  SID && sed -i "s|^YOOKASSA_SHOP_ID=.*|YOOKASSA_SHOP_ID=$SID|" /etc/taraplus/env
read -rs KEY && sed -i "s|^YOOKASSA_SECRET_KEY=.*|YOOKASSA_SECRET_KEY=$KEY|" /etc/taraplus/env
unset SID KEY; systemctl restart taraplus
```

3. Сначала `YOOKASSA_TEST=1` и shopId и ключ **тестового** магазина:
   оплата проходит без списания денег (тестовые карты - в документации
   ЮKassa, например `5555 5555 5555 4477`). В тестовом режиме кнопки оплаты
   видят только администраторы (`ADMIN_EMAILS`), остальным - «Скоро».
   Проверить покупку, затем вписать shopId и ключ боевого магазина,
   поставить `YOOKASSA_TEST=` (пусто) и `systemctl restart taraplus`.
4. Самозанятому чеки 54-ФЗ не нужны (`YOOKASSA_VAT_CODE` пустой): доход в
   «Мой налог» ЮKassa передаёт сама, если это включено в кабинете.
5. Журнал оплат: `journalctl -u taraplus | grep оплата`.
6. Старые строки `ROBOKASSA_*` в `/etc/taraplus/env` больше не нужны - можно
   удалить: `sed -i '/^ROBOKASSA_/d' /etc/taraplus/env`.

## 8в. Автопродление (сохранение карты)

1. ЮKassa должна разрешить магазину **автоплатежи** (сохранение способа
   оплаты): заявка через менеджера или поддержку в кабинете. В тестовом
   магазине проверить можно сразу.
2. На сервере (`sudo -i`):

```sh
grep -q '^AUTO_RENEW_ENABLED=' /etc/taraplus/env || echo 'AUTO_RENEW_ENABLED=' >> /etc/taraplus/env
sed -i 's|^AUTO_RENEW_ENABLED=.*|AUTO_RENEW_ENABLED=1|' /etc/taraplus/env
systemctl restart taraplus
```

3. В окне оплаты появится галочка «Продлевать автоматически», в
   «Настройки → Аккаунт» - карта и «Отвязать карту». Журнал:
   `journalctl -u taraplus | grep автопродление`.
4. Выключить: `AUTO_RENEW_ENABLED=` (пусто) и перезапуск - списания
   прекращаются, сохранённые карты остаются на случай повторного включения.

## 8б. Проверка защиты сервера

Скрипт только читает настройки и печатает OK / ВНИМАНИЕ по каждому пункту
(сайт за nginx, права на файл настроек, SSH, брандмауэр, HTTPS,
обновления, копии); пароли и ключи не показывает:

```sh
sudo sh /opt/taraplus/deploy/check-security.sh
```

## 9. Полезное

- Журнал сайта (в т.ч. коды подтверждения, пока почта не настроена):
  `journalctl -u taraplus -f`
- Перезапуск: `systemctl restart taraplus`
- Сайт запускается **в одном экземпляре** (данные - один файл; два процесса
  мешали бы друг другу). Так и настроено в `taraplus.service`.

## 10. Юридическое (до запуска)

- Реквизиты владельца сайта (он же оператор персональных данных и продавец
  подписок) и компаний, которым поручена обработка (хостинг, сервис писем,
  почта поддержки, платёжный сервис), - в
  `frontend/public/js/legal-config.js`; подставляются во все документы и в
  подвал сайта.
- Адрес ЦОД, где стоит сервер, - запросить у поддержки рег.ру (тикет) для
  уведомления в Роскомнадзор.
- Подать **уведомление в Роскомнадзор** (заполнить на pd.rkn.gov.ru,
  распечатать, подписать, отправить заказным письмом с описью и уведомлением
  о вручении) - до начала обработки данных пользователей. Регистрацию для
  людей открывать после вручения письма.
- Письменное согласие законного представителя владельца сайта (п. 6.5
  соглашения) - до начала приёма оплаты.
- Автопродление - раздел 8в (до разрешения автоплатежей в ЮKassa не
  включать: пользователи увидят обещание списаний, которые не пройдут).
- Новая редакция документов: поменять дату в `legal-config.js`,
  `LEGAL_VERSION` в `backend/src/auth/legal.js` и текст `LEGAL_UPDATE_NOTE`
  в `frontend/public/js/common-account.js` - вошедшие пользователи увидят
  окно «Мы обновили документы».
- Сервер, данные и резервные копии - в России. Почтовый сервис для писем с
  кодами - тоже российский (Unisender Go); шрифты - со своего сервера, без
  обращений к зарубежным сервисам.
