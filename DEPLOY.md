# FloraElegance — Localhost (XAMPP) Setup Guide

This guide is **for running the project on your local computer only** (`http://localhost`).

For live hosting on Hostinger, see: `backend/HOSTINGER-DEPLOY.md`

---

## 1. Prerequisites (install first)


| Software          | Why you need it                             |
| ----------------- | ------------------------------------------- |
| **XAMPP**         | Apache + MySQL + PHP for the backend API    |
| **Node.js** (LTS) | To run `npm run dev` and build the frontend |
| **npm**           | Comes with Node.js                          |


**Required project path:**

```
C:\xampp\htdocs\plant\
```

> The folder must be named `**plant**` and live inside `htdocs`.  
> If you rename the folder (e.g. to `flora`), update all URLs and `.env` paths below to match.

---

## 2. File renaming — not required (local)

On local XAMPP, **you do not need to rename any project files**.


| File / folder   | What to do locally                         |
| --------------- | ------------------------------------------ |
| `plant/`        | Keep as-is at `htdocs\plant`               |
| `backend/`      | Keep as-is                                 |
| `frontend/`     | Keep as-is                                 |
| `frontend/.env` | Keep as-is (values below)                  |
| `backend/.env`  | **Create** in Step 3 — copy, do not rename |


**Only one copy step:**

```
backend\.env.example   →   copy to   →   backend\.env
```

(This is a duplicate/copy, not a rename.)

---

## 3. First-time setup (step by step)

### Step 1 — Start XAMPP

1. Open **XAMPP Control Panel**.
2. Click **Start** on **Apache**.
3. Click **Start** on **MySQL**.
4. Both should show as running (green).

**Test:** Open `http://localhost` in your browser.

---

### Step 2 — Import the database

1. Open `http://localhost/phpmyadmin`
2. Optional: click **New** → database name `plant_db` → **Create**
  *(Or skip this — importing `database.sql` can create the database automatically.)*
3. Go to the **Import** tab → **Choose file**
  - Select: `C:\xampp\htdocs\plant\backend\database.sql`
4. Click **Go** / **Import** — wait for a success message.

You should now have tables: `users`, `products`, `orders`, `coupons`, `site_settings`, and others.

---

### Step 3 — Backend `.env` (copy, do not rename)

1. Go to: `C:\xampp\htdocs\plant\backend\`
2. If `backend\.env` does **not** exist:
  - Copy `backend\.env.example`
  - Save the copy as: `backend\.env`
3. Use these values in `backend\.env` (default XAMPP):

```env
DB_HOST=localhost
DB_NAME=plant_db
DB_USER=root
DB_PASS=

JWT_SECRET=ugaoo_premium_gardening_secret_key_987654321
RAZORPAY_KEY_ID=rzp_test_w3hP8z2jN1245A
RAZORPAY_KEY_SECRET=your_razorpay_test_secret_here
```


| Setting               | Local value                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `DB_PASS`             | Leave empty if your XAMPP MySQL has no password                                              |
| `RAZORPAY_KEY_SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com) → Test mode → API Keys → **Key Secret** |


> Without a valid Razorpay secret, online payment tests may fail; the rest of the site still works. You can test **COD** without Razorpay.

**API test:** Open in browser:

`http://localhost/plant/backend/api/settings.php`

You should see JSON with `"success": true`.

---

### Step 4 — Frontend `.env` (verify only)

File: `C:\xampp\htdocs\plant\frontend\.env`

For local development it should contain:

```env
VITE_API_BASE_URL=http://localhost/plant/backend/api
VITE_RAZORPAY_KEY_ID=rzp_test_w3hP8z2jN1245A
```

**Do not rename this file.** If your folder is not named `plant`, change `/plant/` in the URL to your folder name.

---

### Step 5 — Install frontend dependencies (first time only)

In PowerShell or CMD:

```powershell
cd C:\xampp\htdocs\plant\frontend
npm install
```

---

## 4. How to run the site locally — two methods

### Method A — Development mode (recommended for daily work)

Hot reload and clear error messages in the terminal.

```powershell
cd C:\xampp\htdocs\plant\frontend
npm run dev
```


| Page               | URL                                 |
| ------------------ | ----------------------------------- |
| **Website (home)** | `http://localhost:5173/`            |
| **Admin panel**    | `http://localhost:5173/admin`       |
| **Shop**           | `http://localhost:5173/shop`        |
| **Track order**    | `http://localhost:5173/track-order` |


**Important:**

- Keep XAMPP **Apache + MySQL** running (the API needs them).
- Do **not** run `npm run dev` from the `plant` root — always from the `**frontend`** folder.

**Stop the dev server:** Press `Ctrl + C` in the terminal.

---

### Method B — Production build (XAMPP URL, like a mini “live” setup)

Use this when you want URLs similar to deployment: `/plant/frontend/dist/`

```powershell
cd C:\xampp\htdocs\plant\frontend
npm run build
```

Then open in the browser:


| Page            | URL                                          |
| --------------- | -------------------------------------------- |
| **Website**     | `http://localhost/plant/frontend/dist/`      |
| **Admin panel** | `http://localhost/plant/frontend/dist/admin` |
| **API**         | `http://localhost/plant/backend/api`         |


`frontend/vite.config.js` already sets production `base` to `/plant/frontend/dist/` — **do not rename this file for local use.**

If refreshing `/admin` gives 404, add `frontend/dist/.htaccess` (optional). See `backend/HOSTINGER-DEPLOY.md` for a template. Apache `mod_rewrite` must be enabled.

---

## 5. Test accounts — Admin & Customer

After importing `database.sql`, these accounts are ready:

### Admin (Admin Panel)


| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| **URL (dev)**   | `http://localhost:5173/admin`                |
| **URL (build)** | `http://localhost/plant/frontend/dist/admin` |
| **Email**       | `admin@ugaoo.com`                            |
| **Password**    | `admin123`                                   |


Use this to manage products, orders, customers, coupons, inventory, and website settings.

---

### Customer (shopper account)


| Field           | Value                                       |
| --------------- | ------------------------------------------- |
| **URL (dev)**   | `http://localhost:5173/auth`                |
| **URL (build)** | `http://localhost/plant/frontend/dist/auth` |
| **Email**       | `jane@example.com`                          |
| **Password**    | `admin123`                                  |


Use this to test shop, cart, checkout, wishlist, and customer dashboard (`/dashboard`).

---

### Create a new customer

1. Go to `/auth`
2. Click **Sign up**
3. Enter your email and password
4. Log in and use the shop

---

### Guest (no login)


| Feature                      | Login required?             |
| ---------------------------- | --------------------------- |
| Browse shop & products       | No                          |
| Track order (`/track-order`) | No — needs Order ID + email |
| Cart & checkout              | Yes — redirects to login    |


---

## 6. Quick test checklist (local)

- XAMPP Apache + MySQL are running  
- `plant_db` exists in phpMyAdmin with all tables  
- `backend\.env` file exists  
- `http://localhost/plant/backend/api/settings.php` returns JSON OK  
- `cd frontend` → `npm run dev` → `http://localhost:5173/` loads  
- Admin login works: `admin@ugaoo.com` / `admin123`  
- Customer login works: `jane@example.com` / `admin123`  
- Add a product to cart and try checkout (COD or Razorpay test)

---

## 7. Common problems (local)


| Problem                                  | Solution                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev` — `package.json` not found | Run `cd frontend` first; do not run npm from `plant` root                        |
| Database connection failed               | Is MySQL running? Was `plant_db` imported? Check `backend\.env` DB name/user     |
| API failed / empty settings              | Confirm folder is `htdocs\plant` and URL is `http://localhost/plant/backend/api` |
| Admin login fails                        | Re-import `database.sql` or use the test emails/passwords above                  |
| Port 5173 already in use                 | Close other dev servers or run `npm run dev -- --port 5174`                      |
| Image upload fails                       | Ensure `backend\uploads\` exists (may be created on first upload)                |


---

## 8. Project file map (local)

```
C:\xampp\htdocs\plant\
├── DEPLOY.md              ← This file (localhost guide)
├── feature.md             ← Full feature list for clients
├── backend\
│   ├── .env               ← Create by copying .env.example
│   ├── .env.example       ← Template (keep this file)
│   ├── database.sql       ← Import in phpMyAdmin
│   ├── api\               ← PHP API endpoints
│   └── uploads\           ← Uploaded images (auto-created)
└── frontend\
    ├── .env               ← Local API URL
    ├── package.json       ← npm scripts live here
    ├── src\               ← React source code
    └── dist\              ← Created after `npm run build` (Method B)
```

---

## 9. Summary


| Question          | Answer (local)                                             |
| ----------------- | ---------------------------------------------------------- |
| Rename any files? | **No** — only copy `backend\.env.example` → `backend\.env` |
| Where to run npm? | `C:\xampp\htdocs\plant\frontend`                           |
| Dev site URL      | `http://localhost:5173/`                                   |
| Built site URL    | `http://localhost/plant/frontend/dist/`                    |
| Admin login       | `admin@ugaoo.com` / `admin123`                             |
| Customer login    | `jane@example.com` / `admin123`                            |


---

