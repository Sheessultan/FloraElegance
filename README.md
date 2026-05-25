# FloraElegance — Complete  E-Commerce Website 

**Product name:** FloraElegance (Plant / Nursery E-Commerce Platform)  
**Type:** Full online plant shop with customer storefront + secure admin control panel  
**Version:** Production-ready (2026)  
**Prepared for:** Client handover & documentation  

---

## 1. What is this website?

FloraElegance is a **complete e-commerce website** for selling live plants online. Customers can browse plants, add to cart, apply discount coupons, pay online (Razorpay) or choose Cash on Delivery (COD), track orders, and manage their account.  

Business owners use a **powerful Admin Panel** to manage products, orders, inventory, customers, coupons, shipping rules, invoices, and all website content — **without writing code**.

---

## 2. Technology (simple overview)


| Layer                    | Technology                                  |
| ------------------------ | ------------------------------------------- |
| Customer & Admin screens | React (modern fast website)                 |
| Server / APIs            | PHP (works on XAMPP local & Hostinger live) |
| Database                 | MySQL                                       |
| Payments                 | Razorpay (UPI, Card, Netbanking)            |
| Hosting                  | Hostinger (or any PHP + MySQL host)         |


---

## 3. Customer website — all pages & features

### 3.1 Home page (`/`)

- Hero image slider (admin configurable)
- Featured / bestseller plants
- Category highlights
- Promotional offer bar (text + optional countdown — admin controlled)
- Modern, mobile-friendly design

### 3.2 Shop / Product listing (`/shop`)

- Browse all plants
- **Filters:** category, price range, size (Small / Medium / Large), care level (Easy / Moderate / Expert)
- Search by plant name
- Sort: newest, price low→high, price high→low, rating
- Sale price support (MRP + discounted selling price)

### 3.3 Categories page (`/categories`)

- Visual grid of all plant categories
- Click to open filtered shop

### 3.4 Product detail page (`/product/:id`)

Each plant can have **rich content**:

- Main image + **image gallery**
- Price, discount, stock status, rating
- Tabs: **Description**, **Care Guide**, **Shipping**
- Dimensions (height, pot size, visual scale chart)
- Biological specification table (custom rows per product)
- **Custom content sections** (admin can add extra tabs per product — FAQ, bullet lists, HTML text — useful when every plant is different)
- Add to cart (quantity selector)
- Add to **Wishlist** (logged-in users)
- **Customer reviews** (star rating + comment + optional photo)
- Related products from same category

### 3.5 Shopping cart (`/cart`)

- View all items, update quantity, remove items
- **Secure Shipping** fee shown (rules set in admin)
- Free shipping message when cart crosses threshold
- **Coupon code** field — apply discount (e.g. GREEN10)
- Order summary: subtotal, discount, shipping, **grand total**
- Proceed to checkout (login required)

### 3.6 Checkout (`/checkout`) — login required

- Shipping form: name, email, phone, address, city, PIN
- Order summary with coupon + shipping
- **Payment methods:**
  - **Pay Online** — Razorpay secure popup (UPI, cards, etc.)
  - **Cash on Delivery (COD)** — if enabled in admin and order meets minimum amount
- Order saved in database; stock updated after successful payment

### 3.7 Track your order (`/track-order`) — **no login required**

- Enter **Order ID** (e.g. ORD-000042) + **email used at checkout**
- See: order status timeline, delivery address, items, total, courier tracking (when admin adds AWB)
- Link in navbar and footer

### 3.8 Customer account (`/dashboard`) — login required

**Tabs:**


| Tab               | Features                                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**      | Quick stats, recent activity                                                                                                                                                |
| **My Orders**     | All orders, filters, status badges (Pending / Paid / Shipped / Delivered / Failed), COD vs Online, **Inspect Package** modal with full details + **download/print invoice** |
| **Profile**       | Update name, email, phone                                                                                                                                                   |
| **Addresses**     | **Multiple shipping addresses**, set default, add/edit/delete                                                                                                               |
| **Notifications** | Browser alerts for order updates (optional, user allows permission)                                                                                                         |


### 3.9 Wishlist (`/wishlist`) — login required

- Save favourite plants
- Move to cart later

### 3.9 Authentication (`/auth`)

- Customer **Sign up** & **Login**
- Secure session (JWT token, 7-day validity)
- Redirect to checkout after login if needed
- **Banned customers** cannot login (admin block)

### 3.10 Contact page (`/contact`)

- Contact form → saved in admin **Inquiries**
- Shows address, phone, email, working hours, Google Map (all editable in admin)

### 3.11 Policy & help pages


| Page                | Purpose                    |
| ------------------- | -------------------------- |
| `/faqs`             | Frequently asked questions |
| `/shipping-policy`  | Shipping & delivery policy |
| `/terms-conditions` | Terms of use               |
| `/privacy-policy`   | Privacy policy             |


### 3.12 Footer & navigation

- **Mega menu** — grouped shop links (editable in admin)
- Footer: two link groups, social links, contact, **Track your order** button
- All contact/footer content controlled from **Admin → Website Settings**

---

## 4. Admin control panel (`/admin`) — full features

**Access:** Admin login only (role: admin).  
**Design:** Dedicated full-screen layout, **Dark mode / Light mode** toggle (preference saved in browser).

### 4.1 Dashboard (Overview)

- Total sales revenue (paid/shipped/delivered orders)
- Total orders count + pending payments
- Product count + low stock alerts
- Sales chart (last 7 days)
- Order status breakdown
- Category sales share
- Low stock product list with quick edit
- Desktop notifications for new orders, inquiries, reviews (optional)

### 4.2 Orders

- Full order list with **advanced filters:**
  - Status, date range, price range, payment type (Online / COD / Failed)
  - Search by order ID, customer name, email
- **Smart tags** on orders (e.g. high value, new customer, COD risk hints)
- **Bulk actions** — update status for multiple orders at once
- **Export to CSV** for accounting
- **Order detail modal:**
  - Customer & shipping address
  - Payment method & Razorpay IDs
  - Line items with images
  - **Delivery tracking** — AWB number, carrier name, tracking status
  - **Print / PDF invoice** (fully customizable text & branding in settings)
- Update order status: Pending → Paid → Shipped → Delivered (or Failed)

### 4.3 Products

- Add / edit / delete plants
- Fields: name, category, MRP, **sale price**, stock, images (URL or **upload**), size, care level, rating
- **Show on homepage** bestsellers toggle
- **Active / hidden** — hide from shop without deleting
- Gallery images (comma-separated URLs)
- Dimensions & care: height, pot size, sun, water, toxins, care guide, delivery info
- **Biological specs** — add unlimited label/value rows
- **Product page content sections** — per-product custom tabs (text, HTML, bullet list, FAQ) for unique plants
- Product table shows stock alerts (low / out of stock)

### 4.4 Categories

- Create categories with name, description, image
- Show on home page toggle
- Used in shop filters and mega menu

### 4.5 Inventory management

- **Total stock** across all SKUs
- Low stock count, out-of-stock count, hidden products count
- Quick **stock update** per product from one screen
- Toggle **shop visibility** (active/inactive)
- Threshold & auto-hide rules configured in Settings

### 4.6 Customer management

- List all registered customers (serial number, name, email, phone)
- **Total orders** per customer
- **Total lifetime spend**
- Last order date
- **Block / Unblock** customer (blocked users cannot login or checkout)
- Search by name, email, phone

### 4.7 Coupons & discounts

- Create discount codes:
  - **Percentage** or **fixed ₹** off
  - Minimum order amount
  - Maximum discount cap (for % coupons)
  - Usage limit
  - Active / inactive
- Default sample: **GREEN10** (10% off, min ₹499)
- Customers apply codes on **Cart page**

### 4.8 Contact inquiries

- All messages from contact form
- Mark read / unread
- View full message
- Delete inquiry

### 4.9 Product reviews

- See all customer reviews
- **Approve**, **hide**, or **delete**
- Moderation before public display (if set to pending)

### 4.10 Shop mega menu

- Manage navbar dropdown link groups
- Title, URL, column group name
- Add custom groups (e.g. Quick Links)

### 4.11 Website settings (full site control)


| Section             | What admin can change                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Secure shipping** | Enable/disable, label name, standard fee, free shipping above ₹X, delivery estimate text, COD extra fee, insurance fee, zones note |
| **COD checkout**    | Enable/disable COD, minimum order for COD                                                                                          |
| **Inventory**       | Low stock alert level, auto-hide product when stock = 0                                                                            |
| **Contact**         | Email, phone, address, hours, Google Maps embed                                                                                    |
| **Footer**          | Social links, two footer menus (label + link per line)                                                                             |
| **Shop filters**    | Care levels & sizes shown in shop                                                                                                  |
| **Offer bar**       | Show/hide, promotional text, countdown                                                                                             |
| **Invoice**         | Company name, tagline, headings, footer text, support lines, brand color, GST note — used on customer & admin invoices             |
| **Hero slider**     | Comma-separated image URLs for homepage                                                                                            |


---

## 5. Payments & order money flow

### Online payment (Razorpay)

1. Customer places order → server creates order (status: **pending**)
2. Razorpay payment window opens
3. On success → server verifies signature → status **paid**, stock reduced, cart cleared
4. Admin can then mark **shipped** → **delivered**

### Cash on Delivery (COD)

1. Customer selects COD at checkout (if allowed)
2. Order created as **pending** (payment on delivery)
3. Admin marks **paid** when cash collected → stock reduced
4. Then shipped / delivered as normal

### Order totals (automatic)

- **Subtotal** — sum of product prices (sale price if set)
- **Coupon discount** — if valid code applied
- **Shipping** — from admin shipping rules
- **Grand total** — charged on Razorpay / shown on COD

---

## 6. Security & access


| Feature            | Description                                      |
| ------------------ | ------------------------------------------------ |
| Password hashing   | Bcrypt — passwords never stored plain text       |
| JWT login tokens   | Secure API access for customers & admin          |
| Admin-only routes  | `/admin` protected — only admin role             |
| Customer ban       | Block abusive accounts                           |
| Public track order | Email + order ID verification — no password leak |
| Payment verify     | Razorpay signature checked on server             |


**Important for client:** Change default admin password immediately on live site.

---

## 7. Database tables (what is stored)


| Table               | Stores                                          |
| ------------------- | ----------------------------------------------- |
| `users`             | Customers & admin accounts, ban status          |
| `categories`        | Plant categories                                |
| `products`          | Full plant catalog + content                    |
| `coupons`           | Discount codes                                  |
| `cart`              | Logged-in user shopping bags                    |
| `wishlist`          | Saved favourites                                |
| `orders`            | Orders with shipping, coupon, payment, tracking |
| `order_items`       | Products in each order                          |
| `user_addresses`    | Multiple shipping addresses per customer        |
| `product_reviews`   | Ratings & comments                              |
| `contact_inquiries` | Contact form messages                           |
| `mega_menu_links`   | Navigation menu items                           |
| `site_settings`     | All website & business settings                 |


**Install file:** `backend/database.sql` (import once in MySQL)

---

## 8. Default login (after fresh database install)


| Role            | Email              | Password   |
| --------------- | ------------------ | ---------- |
| **Admin**       | `admin@ugaoo.com`  | `admin123` |
| Sample customer | `jane@example.com` | `admin123` |


**Must change admin password before going live.**

---

---

## 9. What the client can do without a developer

- Add / edit / remove plants and categories  
- Change prices, sales, stock  
- Manage orders and tracking numbers  
- Create coupon campaigns  
- Block customers  
- Edit contact info, footer, shipping fees, COD rules  
- Customize invoice text  
- Moderate reviews and contact messages  
- Upload product images via admin

## 10. What needs a developer (optional future)

- Change visual design / branding heavily  
- Email/SMS automatic order notifications (not built-in)  
- SMS OTP login  
- Multi-vendor marketplace

---

## 11. Third-party services required (live business)


| Service         | Purpose                 | Action                                |
| --------------- | ----------------------- | ------------------------------------- |
| **Hostinger**   | Website + MySQL hosting | Buy plan, upload files, SSL           |
| **Domain**      | yourbrand.com           | Connect to Hostinger                  |
| **Razorpay**    | Online payments         | Business KYC, live API keys in `.env` |
| **SSL (HTTPS)** | Secure checkout         | Enable in Hostinger (free)            |


---

## 12. Quick feature checklist (for demo to client)

**Storefront**

- Browse & search plants  
- Product detail with reviews & wishlist  
- Cart + coupons + dynamic shipping  
- Razorpay + COD checkout  
- Guest order tracking  
- Customer dashboard + multiple addresses  
- Invoices  
- Contact form & policy pages

**Admin**

- Sales dashboard  
- Orders (filter, bulk, CSV, tracking, invoice)  
- Products (full editor + custom sections)  
- Inventory management  
- Customer list + ban  
- Coupon system  
- Reviews & inquiries  
- Mega menu & full site settings  
- Dark mode admin UI

---

