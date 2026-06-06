# cPanel Deploy — One Command

## একবারের সেটআপ

1. **cPanel → SSH Access → Manage SSH Keys**
   - Generate বা আপনার লোকাল `~/.ssh/id_rsa.pub` import করুন
   - Authorize করুন

2. লোকাল মেশিনে test:
   ```bash
   ssh -p 22 USERNAME@dubaiborkahouse.com
   ```
   (cPanel-এ অনেক সময় port `21098` — cPanel → SSH Access থেকে দেখে নিন)

3. স্ক্রিপ্টের উপরের `CPANEL_USER` বদলান, অথবা প্রতিবার env দিয়ে দিন।

## প্রতিবার deploy

```bash
chmod +x scripts/deploy-cpanel.sh

CPANEL_USER=yourcpaneluser \
CPANEL_HOST=dubaiborkahouse.com \
CPANEL_PORT=21098 \
./scripts/deploy-cpanel.sh
```

স্ক্রিপ্ট নিজে থেকেই:
- `npm install` + `npm run build`
- `dist/.htaccess` লেখে (SPA + HTTPS + cache + gzip)
- `dist-<timestamp>.zip` বানায়
- cPanel-এ upload + extract
- পুরোনো ফাইল backup (`~/backups/public_html-*.tar.gz`, শেষ ৫টা রাখে)
- `public_html/images/` ফোল্ডারে হাত দেয় না (আপনার প্রোডাক্ট ছবি নিরাপদ)

## Rollback

```bash
ssh -p 21098 USER@dubaiborkahouse.com
cd ~/public_html
find . -mindepth 1 -maxdepth 1 ! -name images -exec rm -rf {} +
tar -xzf ~/backups/public_html-YYYYMMDD-HHMMSS.tar.gz
```

## নোট

- **Backend (DB, Auth, Edge Functions, AI)** Lovable Cloud-এ থাকবে — cPanel-এ deploy হয় না।
- `.env`-এ `VITE_SUPABASE_*` ভেরিয়েবল build-time এ bundle হয়ে যায়, তাই cPanel-এ আলাদা env দরকার নেই।
- নতুন domain হলে Lovable Cloud → Auth → URL Configuration-এ `https://dubaiborkahouse.com` redirect URL হিসেবে যোগ করুন।
