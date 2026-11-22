#!/usr/bin/env bash
# One-shot VPS setup for AstrxyMail (Ubuntu 22.04/24.04)
# Usage (from project folder, as root):  bash deploy/setup.sh yourdomain.com [email-for-ssl]
set -euo pipefail

DOMAIN="${1:-}"
SSL_EMAIL="${2:-}"
APP_NAME="astrxymail"
PORT=3000
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then echo "Run as root (sudo bash deploy/setup.sh DOMAIN)"; exit 1; fi
if [ -z "$DOMAIN" ]; then echo "Usage: bash deploy/setup.sh yourdomain.com [email]"; exit 1; fi

echo "==> Installing packages"
apt-get update -y
apt-get install -y curl git unzip nginx ca-certificates

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm i -g pnpm pm2

# Swap (helps next build on 1GB RAM VPS)
if [ "$(free -m | awk '/Mem:/{print $2}')" -lt 2000 ] && ! swapon --show | grep -q .; then
  echo "==> Adding 2GB swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

cd "$APP_DIR"

echo "==> Preparing .env"
[ -f .env ] || cp .env.example .env
grep -q '^ADMIN_SECRET_KEY=' .env || echo "ADMIN_SECRET_KEY=$(openssl rand -hex 24)" >> .env

echo "==> Install & build"
pnpm install --frozen-lockfile || pnpm install
pnpm build

echo "==> Starting with pm2"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
PORT=$PORT pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> Nginx"
sed "s/__DOMAIN__/$DOMAIN/g; s/__PORT__/$PORT/g" deploy/nginx.conf > "/etc/nginx/sites-available/$APP_NAME"
ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> SSL (needs DNS A record -> this VPS, ports 80/443 open)"
apt-get install -y certbot python3-certbot-nginx
if [ -n "$SSL_EMAIL" ]; then
  certbot --nginx -d "$DOMAIN" -m "$SSL_EMAIL" --agree-tos --non-interactive --redirect || echo "SSL failed: check DNS/firewall then re-run certbot"
else
  certbot --nginx -d "$DOMAIN" --register-unsafely-without-email --agree-tos --non-interactive --redirect || echo "SSL failed: check DNS/firewall then re-run certbot"
fi

echo
echo "DONE -> https://$DOMAIN"
echo "Edit $APP_DIR/.env (Upstash, Resend, Discord) then: pm2 restart $APP_NAME"
