# AmberMail (tempmails)

Temp mail web app built with Next.js. This guide deploys it on your own VPS (Ubuntu 22.04 / 24.04).
Each command below is in its own box, so you can tap the copy button and paste it.

## Before you start

- A VPS with root access
- A domain whose **A record** points to the VPS IP (in Cloudflare, set it to **DNS only / grey cloud** until SSL is installed)
- Ports **80** and **443** open in the VPS provider firewall

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

Run the automatic setup (replace `you@email.com` with your email, used for the HTTPS certificate):

```bash
sudo bash deploy/setup.sh amberss.site you@email.com
```

This installs Node, pnpm, pm2 and nginx, builds the app, starts it, and sets up HTTPS.

## 2. Add your keys

Open the settings file:

```bash
nano .env
```

Add your values if you have any, then save (`Ctrl + O`, `Enter`, `Ctrl + X`):

```
```

`ADMIN_SECRET_KEY` is created automatically by the setup. Keep it as is, or change it to your own.

Restart the app so it reads the new values:

```bash
pm2 restart ambermail
```

## 3. Open the site

- Website: `https://amberss.site`
- Admin panel: `https://amberss.site/ops-vault`
- If the site shows **ASTRXY DEFENSE GATE**, enter the Master Admin Key (see below)

## Master Admin Key (don't forget!)

The "Enter Master Admin Key" screen (ASTRXY DEFENSE GATE) does **not** use `.env`.
Its passcode is hardcoded in the code: the SHA-256 hash `b3933c5b...767a` in `app/page.tsx` (`handleUnlockGate`, `MASTER_ADMIN_HASHES`, `ADMIN_KEY_HASHES`) and `MASTER_PASS_HASH` in `app/api/chat/route.ts`.
That hash is the hash of the passcode `torres0811@`.

To change the passcode, get the hash of the new one:

```bash
printf 'NEWKEY' | sha256sum
```

Then replace the old hash in the 3 places above, push, and run `pnpm build && pm2 restart ambermail`.
(`ADMIN_SECRET_KEY` in `.env` is only used to sign admin sessions, not for this gate.)

Never share the passcode.

## If port 80/443 is already used (gomux on this VPS)

On this VPS, `gomux` (pid 495) already uses ports 80 and 443 for the VPN services, so nginx cannot start on them.
Check who uses the ports:

```bash
ss -tlnp | grep -E ':80 |:443 '
```

Fix used: nginx listens on port **8080** instead.

```bash
sed -i -E 's/listen (\[::\]:)?80( |;)/listen \18080\2/' /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*
nginx -t && systemctl restart nginx
```

Open the site at `http://amberss.site:8080` (allow port 8080 in the firewall).
For `https://amberss.site` without the port, use Cloudflare: orange cloud + Origin Rule rewriting the destination port to 8080 + SSL mode Flexible.
Certbot will not work on port 8080.

## Update the app later

After you push new code to GitHub, run this on the VPS:

```bash
cd ~/tempmails && bash deploy/update.sh
```

## Restart the site (quick commands)

After any code change (pull the update, rebuild, restart):

```bash
cd ~/tempmails && git pull && pnpm build && pm2 restart ambermail
```

Rebuild and restart without pulling:

```bash
cd ~/tempmails && pnpm build && pm2 restart ambermail
```

Only restart (no code change):

```bash
pm2 restart ambermail
```

Check if it is running:

```bash
pm2 status
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

If pm2 shows `errored` with "Could not find a production build", build first:

```bash
cd ~/tempmails && pnpm build && pm2 restart ambermail
```

Retry HTTPS if it failed the first time:

```bash
sudo certbot --nginx -d amberss.site
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
- On a VPS with 1 GB RAM, the setup adds 2 GB swap so the build does not fail.
- Never upload your `.env` file to GitHub. It is already in `.gitignore`.

## Update from a ZIP (GitHub Release)

Upload a `.zip` as an asset of the GitHub Release tagged `assets` (Releases -> edit the release -> attach file -> Update release).
The workflow `.github/workflows/unpack-zip.yml` downloads it, unpacks it into the repo, commits, then deletes the zip from the release.

- Normal zip: files are added or overwritten, everything else stays.
- Zip name contains `full` (example `tempmails-full.zip`): the repo is replaced by the zip, old files not in the zip are deleted.
- A `DELETE.txt` inside the zip: every path listed (one per line) is deleted.

`.github`, `.env` and `node_modules` are never touched by a zip.
You can also run it by hand: Actions -> Unpack ZIP from Release -> Run workflow.
`cleanup.yml` deletes old workflow runs daily and after each update, keeping the newest 5.
