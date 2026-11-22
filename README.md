# AmberMail (tempmails)

Temp mail web app built with Next.js. This guide deploys it on your own VPS (Ubuntu 22.04 / 24.04).
Each command below is in its own box, so you can tap the copy button and paste it.

## Before you start

- A VPS with root access
- A domain whose **A record** points to the VPS IP (in Cloudflare, set it to **DNS only / grey cloud** until SSL is installed)
- Ports **80** and **443** open in the VPS provider firewall
- A free Upstash Redis database (so data is kept after restarts)

## 1. Install

Connect to your VPS, then install git:

```bash
apt update && apt install -y git
```

Download the project:

```bash
git clone https://github.com/noelrubio143/tempmails.git
```

Go into the folder:

```bash
cd tempmails
```

Run the automatic setup (replace `yourdomain.com` and `you@email.com`):

```bash
sudo bash deploy/setup.sh yourdomain.com you@email.com
```

This installs Node, pnpm, pm2 and nginx, builds the app, starts it, and sets up HTTPS.

## 2. Add your keys

Open the settings file:

```bash
nano .env
```

Fill in these values, then save (`Ctrl + O`, `Enter`, `Ctrl + X`):

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_SECRET_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
DISCORD_WEBHOOK_URL=
```

`ADMIN_SECRET_KEY` is created automatically by the setup. Keep it as is, or change it to your own.

Restart the app so it reads the new values:

```bash
pm2 restart ambermail
```

## 3. Open the site

- Website: `https://yourdomain.com`
- Admin panel: `https://yourdomain.com/ops-vault`

The admin panel password is your `ADMIN_SECRET_KEY`. To see it:

```bash
grep ADMIN_SECRET_KEY .env
```

## Update the app later

After you push new code to GitHub, run this on the VPS:

```bash
cd ~/tempmails && bash deploy/update.sh
```

## Useful commands

Check if the app is running:

```bash
pm2 status
```

See logs (use this when something breaks):

```bash
pm2 logs ambermail
```

Restart the app:

```bash
pm2 restart ambermail
```

Retry HTTPS if it failed the first time:

```bash
sudo certbot --nginx -d yourdomain.com
```

Test and reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Cloudflare tips

- After HTTPS works, you can turn the cloud **orange** (proxied).
- In Cloudflare go to **SSL/TLS** and choose **Full (strict)**.
- Turn on DNSSEC in Cloudflare, then add the DS record in your domain registrar.

## Notes

- Mail comes from outside services (mail.tm / Guerrilla Mail), so port 25 is not needed.
- If you skip Upstash, data is kept in memory only and is lost on every restart.
- On a VPS with 1 GB RAM, the setup adds 2 GB swap so the build does not fail.
- Never upload your `.env` file to GitHub. It is already in `.gitignore`.
