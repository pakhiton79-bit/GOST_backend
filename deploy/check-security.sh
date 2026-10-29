#!/bin/sh
# Проверка защиты сервера (по указанию пользователя, аудит 29.10.2026).
# Только читает настройки и ничего не меняет; значения паролей и ключей не
# показывает. Запуск: sudo sh /opt/taraplus/deploy/check-security.sh
# Итог - строки OK / ВНИМАНИЕ; результат можно переслать целиком.
ENV=/etc/taraplus/env
ok()   { echo "OK        $1"; }
warn() { echo "ВНИМАНИЕ  $1"; }
val()  { grep -E "^$1=" "$ENV" 2>/dev/null | head -1 | cut -d= -f2-; }

echo "== Сайт"
systemctl is-active --quiet taraplus && ok "служба taraplus работает" || warn "служба taraplus не работает"
[ "$(val HOST)" = "127.0.0.1" ] && ok "сайт слушает только 127.0.0.1 (HOST)" || warn "HOST не 127.0.0.1 - сайт доступен в обход nginx, IP можно подделать"
if ss -ltnH 2>/dev/null | awk '{print $4}' | grep -qE '(^|[^0-9.])(0\.0\.0\.0|\*|\[::\]):3000$'; then warn "порт 3000 открыт на всех адресах"; else ok "порт 3000 не открыт наружу"; fi
[ "$(stat -c %a "$ENV" 2>/dev/null)" = "600" ] && ok "$ENV - права 600" || warn "$ENV - права $(stat -c %a "$ENV" 2>/dev/null), нужно 600 (chmod 600 $ENV)"
[ "$(stat -c %U "$ENV" 2>/dev/null)" = "root" ] && ok "$ENV принадлежит root" || warn "$ENV принадлежит $(stat -c %U "$ENV" 2>/dev/null), нужно root"
[ "$(stat -c %a /var/lib/taraplus 2>/dev/null)" = "700" ] && ok "/var/lib/taraplus - права 700" || warn "/var/lib/taraplus - права $(stat -c %a /var/lib/taraplus 2>/dev/null), нужно 700"
[ -n "$(val ADMIN_EMAILS)" ] && ok "ADMIN_EMAILS задан" || warn "ADMIN_EMAILS пустой - админки нет"
[ -n "$(val CAPTCHA_SECRET)" ] && ok "CAPTCHA_SECRET задан" || warn "CAPTCHA_SECRET пустой (работает, но ответы капчи сбрасываются при перезапуске)"
if [ -n "$(val YOOKASSA_SHOP_ID)" ] && [ -n "$(val YOOKASSA_SECRET_KEY)" ]; then
  [ "$(val YOOKASSA_TEST)" = "1" ] && ok "ЮKassa настроена, ТЕСТОВЫЙ режим" || ok "ЮKassa настроена, боевой режим"
  case "$(val YOOKASSA_SECRET_KEY)" in test_*) [ "$(val YOOKASSA_TEST)" = "1" ] || warn "ключ ЮKassa тестовый (test_...), а YOOKASSA_TEST не 1";; esac
else warn "ЮKassa не настроена (оплаты на сайте нет)"; fi
grep -q '^ROBOKASSA_' "$ENV" 2>/dev/null && warn "в $ENV остались строки ROBOKASSA_* - удалить: sed -i '/^ROBOKASSA_/d' $ENV"

echo "== Вход на сервер (SSH)"
S=$(sshd -T -C user=root,host=x,addr=1.2.3.4 2>/dev/null)
echo "$S" | grep -qi '^permitrootlogin no' && ok "вход под root по SSH запрещён" || warn "вход под root по SSH разрешён ($(echo "$S" | grep -i '^permitrootlogin'))"
echo "$S" | grep -qi '^passwordauthentication no' && ok "вход по паролю запрещён (только ключ)" || warn "вход по паролю разрешён - только ключ надёжнее"
[ -f /etc/ssh/sshd_config.d/99-qemu.conf ] && warn "есть /etc/ssh/sshd_config.d/99-qemu.conf (разрешает root по паролю) - см. deploy/README.md, 5б"

echo "== Брандмауэр"
if ufw status 2>/dev/null | grep -q 'Status: active'; then
  ok "ufw включён"
  ufw status | grep -E 'ALLOW' | grep -vE 'OpenSSH|Nginx Full|22|80|443' | sed 's/^/ВНИМАНИЕ  открыто лишнее: /'
else warn "ufw выключен"; fi

echo "== nginx и HTTPS"
nginx -T 2>/dev/null | grep -qE '^\s*server_tokens\s+off' && ok "nginx не показывает версию" || warn "server_tokens не off (deploy/README.md, 5а)"
nginx -T 2>/dev/null | grep -q 'zone=taraplus_api' && ok "лимит запросов к API включён" || warn "нет лимита запросов nginx (deploy/nginx-security.conf)"
nginx -T 2>/dev/null | grep -q 'ssl_certificate ' && ok "HTTPS настроен" || warn "нет сертификата HTTPS (certbot, раздел 5)"
nginx -T 2>/dev/null | grep -qE 'return 301 https' && ok "http перенаправляется на https" || warn "нет перенаправления http -> https"
systemctl list-timers 2>/dev/null | grep -q certbot && ok "сертификат продлевается сам" || warn "нет таймера certbot - сертификат не продлится"

echo "== Обновления и копии"
[ -f /etc/apt/apt.conf.d/20auto-upgrades ] && grep -q 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/20auto-upgrades && ok "обновления безопасности ставятся сами" || warn "автообновления выключены (apt install unattended-upgrades)"
N=$(apt list --upgradable 2>/dev/null | grep -c security)
[ "$N" = "0" ] && ok "нет ожидающих обновлений безопасности" || warn "ожидают обновления безопасности: $N (apt upgrade)"
[ -f /etc/cron.d/taraplus-backup ] && ok "ежедневная копия данных настроена" || warn "нет /etc/cron.d/taraplus-backup (раздел 7)"
L=$(ls -t /var/backups/taraplus 2>/dev/null | head -1)
[ -n "$L" ] && ok "последняя копия: $L" || warn "копий данных ещё нет"
echo "== Node.js: $(node -v 2>/dev/null)"
