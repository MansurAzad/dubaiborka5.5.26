#!/usr/bin/env bash
# =====================================================================
#  cPanel One-Shot Deploy Script  —  dubaiborkahouse.com
# ---------------------------------------------------------------------
#  এই স্ক্রিপ্ট যা করে:
#   1) npm install + npm run build  →  dist/ তৈরি
#   2) dist/ এর ভিতরে .htaccess বসিয়ে দেয় (SPA routing + HTTPS + cache)
#   3) dist-<timestamp>.zip বানায়
#   4) SSH/SCP দিয়ে cPanel-এ আপলোড করে
#   5) সার্ভারে পুরোনো ফাইল ব্যাকআপ → নতুন zip extract → পুরোনো zip ক্লিন
#
#  Prerequisite (একবার):
#   - cPanel-এ SSH Access enable + আপনার public key Authorized Keys-এ
#   - লোকাল মেশিনে: ssh-keygen (যদি না থাকে), ssh-copy-id user@host
#   - cPanel-এ unzip বাইনারি থাকতেই হবে (default থাকে)
#
#  ব্যবহার:
#     chmod +x scripts/deploy-cpanel.sh
#     ./scripts/deploy-cpanel.sh
#
#  অথবা env override:
#     CPANEL_USER=xxx CPANEL_HOST=server.xxx.com ./scripts/deploy-cpanel.sh
# =====================================================================

set -euo pipefail

# -------- CONFIG (প্রয়োজনমতো বদলান) ----------------------------------
CPANEL_USER="${CPANEL_USER:-CHANGE_ME_cpanel_username}"
CPANEL_HOST="${CPANEL_HOST:-dubaiborkahouse.com}"
CPANEL_PORT="${CPANEL_PORT:-22}"        # cPanel often uses 21098
REMOTE_PATH="${REMOTE_PATH:-/home/${CPANEL_USER}/public_html}"
KEEP_IMAGES_DIR="${KEEP_IMAGES_DIR:-images}"  # এই ফোল্ডার ডিলিট হবে না
# ---------------------------------------------------------------------

TS="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="dist-${TS}.zip"

echo "▶ [1/5] Dependencies install..."
npm install --no-audit --no-fund

echo "▶ [2/5] Production build..."
npm run build

echo "▶ [3/5] .htaccess লিখছি dist/ এর ভিতরে..."
cat > dist/.htaccess <<'HTACCESS'
# ---- SPA Routing ----
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # HTTPS force
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Existing file/dir হলে সরাসরি serve
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # বাকি সব রুট index.html-এ
  RewriteRule ^ index.html [L]
</IfModule>

# ---- Gzip ----
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# ---- Cache headers ----
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# index.html সবসময় ফ্রেশ
<FilesMatch "index\.html$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
HTACCESS

echo "▶ [4/5] Zip তৈরি: ${ZIP_NAME}"
( cd dist && zip -qr "../${ZIP_NAME}" . )

echo "▶ [5/5] Upload + extract on ${CPANEL_HOST}..."
SSH="ssh -p ${CPANEL_PORT} -o StrictHostKeyChecking=accept-new ${CPANEL_USER}@${CPANEL_HOST}"
SCP="scp -P ${CPANEL_PORT}"

# Upload zip
${SCP} "${ZIP_NAME}" "${CPANEL_USER}@${CPANEL_HOST}:~/${ZIP_NAME}"

# Remote: backup → clean (except images) → extract → cleanup
${SSH} bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_PATH}"

echo "  • Backup → ~/backups/public_html-${TS}.tar.gz"
mkdir -p ~/backups
tar --exclude='./${KEEP_IMAGES_DIR}' -czf ~/backups/public_html-${TS}.tar.gz . || true

echo "  • Old build clean (keeping ./${KEEP_IMAGES_DIR})"
find . -mindepth 1 -maxdepth 1 ! -name "${KEEP_IMAGES_DIR}" -exec rm -rf {} +

echo "  • Extract new build"
unzip -qo ~/${ZIP_NAME} -d "${REMOTE_PATH}"

echo "  • Remove uploaded zip"
rm -f ~/${ZIP_NAME}

echo "  • Keep only last 5 backups"
ls -1t ~/backups/public_html-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
REMOTE

# Local zip ক্লিন
rm -f "${ZIP_NAME}"

echo ""
echo "✅ Deploy complete → https://${CPANEL_HOST}"
echo "   Backup saved on server: ~/backups/public_html-${TS}.tar.gz"
