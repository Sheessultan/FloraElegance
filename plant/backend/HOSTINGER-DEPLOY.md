# FloraElegance — Hostinger Deployment Guide

**Live URL:** `https://floraelegance.codewavestudio.space`  
**Subdomain:** `floraelegance.codewavestudio.space` (under `codewavestudio.space` on Hostinger)

This guide uploads the React frontend + PHP backend to your Hostinger subdomain document root.

For local XAMPP development, see: `../../DEPLOY.md`

---

## 1. What you need

| Item | Details |
|------|---------|
| **Hostinger account** | hPanel access for `codewavestudio.space` |
| **Subdomain** | `floraelegance` → document root (e.g. `public_html/floraelegance`) |
| **MySQL database** | Create in hPanel → Databases → MySQL Databases |
| **SSL** | Enable free SSL for the subdomain in hPanel → SSL |
| **Node.js (local PC)** | Only to run `npm run build` before upload |

---

## 2. Live URLs (after deployment)

| Page | URL |
|------|-----|
| **Website (home)** | `https://floraelegance.codewavestudio.space/` |
| **Admin panel** | `https://floraelegance.codewavestudio.space/admin` |
| **Shop** | `https://floraelegance.codewavestudio.space/shop` |
| **API test** | `https://floraelegance.codewavestudio.space/backend/api/settings.php` |

---

## 3. Folder structure on Hostinger

Upload files so your **subdomain document root** looks like this:

```
public_html/floraelegance/          ← subdomain root (Hostinger hPanel)
├── index.html                      ← from frontend/dist/
├── .htaccess                       ← from frontend/dist/ (SPA routing)
├── assets/                         ← from frontend/dist/assets/
├── icons.svg                       ← from frontend/dist/
├── backend/
│   ├── .env                        ← create on server (see Step 4)
│   ├── .htaccess                   ← protects .env
│   ├── api/                        ← all PHP API files
│   ├── config/
│   ├── uploads/                    ← writable; product images stored here
│   └── database.sql                ← import once in phpMyAdmin
```

> **Important:** Frontend `dist/` contents go in the **root** of the subdomain — not inside a `frontend/` subfolder.

---

## 4. Step-by-step deployment

### Step 1 — Create subdomain in Hostinger

1. Log in to **hPanel** → **Domains** → **Subdomains**
2. Create subdomain: `floraelegance`
3. Document root: `public_html/floraelegance` (default is fine)
4. Wait 5–15 minutes for DNS to propagate

### Step 2 — Enable SSL

1. hPanel → **SSL** → select `floraelegance.codewavestudio.space`
2. Install **free SSL** (Let's Encrypt)
3. Turn on **Force HTTPS** if available

### Step 3 — Create MySQL database

1. hPanel → **Databases** → **MySQL Databases**
2. Create database (e.g. `u123456789_floraelegance`)
3. Create database user + strong password
4. Add user to database with **All Privileges**
5. Note down: **DB_HOST**, **DB_NAME**, **DB_USER**, **DB_PASS**

### Step 4 — Backend `.env` on server

1. Upload the entire `backend/` folder to `public_html/floraelegance/backend/`
2. Copy `backend/.env.hostinger.example` → `backend/.env` on the server
3. Fill in your real Hostinger database credentials and Razorpay **live** keys:

```env
DB_HOST=localhost
DB_NAME=u123456789_floraelegance
DB_USER=u123456789_florauser
DB_PASS=your_real_password

JWT_SECRET=use_a_long_random_string_here
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_live_secret
```

> Never commit `backend/.env` to Git. It stays only on the server.

### Step 5 — Import database

1. hPanel → **phpMyAdmin**
2. Select your new database
3. **Import** → choose `backend/database.sql` → **Go**
4. Confirm tables exist: `users`, `products`, `orders`, `site_settings`, etc.

### Step 6 — Build frontend (on your PC)

Production settings are already in `frontend/.env.production`:

```env
VITE_BASE_PATH=/
VITE_API_BASE_URL=https://floraelegance.codewavestudio.space/backend/api
VITE_RAZORPAY_KEY_ID=rzp_test_w3hP8z2jN1245A
```

Replace `VITE_RAZORPAY_KEY_ID` with your **live** Razorpay key before going live.

Build:

```powershell
cd C:\xampp\htdocs\FloraElegance\FloraElegance\plant\frontend
npm install
npm run build
```

This creates `frontend/dist/` with `index.html`, `assets/`, and `.htaccess`.

### Step 7 — Upload frontend to subdomain root

Upload **everything inside** `frontend/dist/` to:

```
public_html/floraelegance/
```

Use **File Manager** or **FTP** (FileZilla). Do **not** upload the `dist` folder itself — only its contents.

### Step 8 — Set folder permissions

In File Manager, set permissions:

| Folder | Permission |
|--------|------------|
| `backend/uploads/` | **755** or **775** (must be writable by PHP) |

### Step 9 — Test the live site

1. API: open `https://floraelegance.codewavestudio.space/backend/api/settings.php`  
   → should return JSON with `"success": true`
2. Website: open `https://floraelegance.codewavestudio.space/`
3. Admin: `https://floraelegance.codewavestudio.space/admin`  
   → `admin@ugaoo.com` / `admin123` (change password after first login)
4. Refresh `/admin` or `/shop` — should not 404 (`.htaccess` SPA routing)

---

## 5. Test accounts (after database import)

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@ugaoo.com` | `admin123` |
| **Customer** | `jane@example.com` | `admin123` |

Change these passwords immediately on a live site.

---

## 6. Razorpay (live payments)

1. Complete Razorpay business KYC
2. Switch to **Live mode** in Razorpay Dashboard → API Keys
3. Update on server:
   - `backend/.env` → `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`
4. Rebuild frontend with live key in `.env.production`:
   - `VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx`
   - Run `npm run build` again and re-upload `dist/` contents

---

## 7. Updating the site later

| Change type | What to do |
|-------------|------------|
| **Frontend (design, pages)** | `npm run build` → re-upload `dist/` contents |
| **Backend PHP** | Upload changed files in `backend/api/` or `backend/config/` |
| **Database** | phpMyAdmin or run migration via `backend/api/migrate.php` |
| **New images** | Auto-saved to `backend/uploads/` — no extra config |

---

## 8. Common problems

| Problem | Solution |
|---------|----------|
| Blank page / 404 on `/admin` | Ensure `.htaccess` is in subdomain root; Apache `mod_rewrite` enabled |
| API returns 500 | Check `backend/.env` DB credentials; verify database imported |
| Database connection failed | Hostinger uses `localhost` as DB_HOST; confirm DB user has privileges |
| Images not uploading | Set `backend/uploads/` permission to 755 or 775 |
| Mixed content / API blocked | Site must use `https://`; API URL in `.env.production` must be `https://` |
| CORS errors | Backend already allows `*` in `config/db.php` — check API URL is correct |
| Old localhost links in build | Re-run `npm run build` with `.env.production` (not `.env`) |

---

## 9. Quick checklist

- [ ] Subdomain `floraelegance.codewavestudio.space` created
- [ ] SSL enabled (HTTPS)
- [ ] MySQL database created and `database.sql` imported
- [ ] `backend/.env` on server with real credentials
- [ ] `backend/uploads/` writable
- [ ] `npm run build` done with `.env.production`
- [ ] `dist/` contents uploaded to subdomain root
- [ ] API test URL returns JSON OK
- [ ] Admin login works
- [ ] Razorpay live keys set (for real payments)

---

## 10. Summary

| Question | Answer |
|----------|--------|
| Live site URL | `https://floraelegance.codewavestudio.space/` |
| API URL | `https://floraelegance.codewavestudio.space/backend/api` |
| Frontend upload location | Subdomain document root (`public_html/floraelegance/`) |
| Backend upload location | `public_html/floraelegance/backend/` |
| Build command | `cd plant/frontend && npm run build` |
| Env file for build | `frontend/.env.production` |
| Env file on server | `backend/.env` (from `.env.hostinger.example`) |
