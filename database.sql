
USE `u392636141_floraelegance`;

SET FOREIGN_KEY_CHECKS = 0;


SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- USERS (customers + admin)
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  `phone` VARCHAR(20) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `zip` VARCHAR(20) DEFAULT NULL,
  `billing_address` TEXT DEFAULT NULL,
  `billing_city` VARCHAR(100) DEFAULT NULL,
  `billing_zip` VARCHAR(20) DEFAULT NULL,
  `is_banned` TINYINT(1) NOT NULL DEFAULT 0,
  `ban_reason` VARCHAR(255) DEFAULT NULL,
  `banned_at` TIMESTAMP NULL DEFAULT NULL,
  `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- CATEGORIES
-- -----------------------------------------------------------------------------
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `show_on_home` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- PRODUCTS
-- -----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `selling_price` DECIMAL(10,2) DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `gallery_images` TEXT DEFAULT NULL,
  `size` VARCHAR(50) DEFAULT 'Medium',
  `care_level` VARCHAR(50) DEFAULT 'Easy',
  `rating` DECIMAL(3,2) DEFAULT 4.50,
  `show_on_home` TINYINT(1) NOT NULL DEFAULT 0,
  `biological_specs` TEXT DEFAULT NULL,
  `customer_reviews` TEXT DEFAULT NULL,
  `height_cm` VARCHAR(100) DEFAULT NULL,
  `pot_size` VARCHAR(100) DEFAULT NULL,
  `visual_scale` VARCHAR(100) DEFAULT NULL,
  `care_guide` TEXT DEFAULT NULL,
  `delivery_info` TEXT DEFAULT NULL,
  `perfect_for` VARCHAR(255) DEFAULT NULL,
  `sun_exposure` VARCHAR(255) DEFAULT NULL,
  `hydration` VARCHAR(255) DEFAULT NULL,
  `toxin_filtration` VARCHAR(255) DEFAULT NULL,
  `content_sections` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
  INDEX `idx_products_active_stock` (`is_active`, `stock`),
  INDEX `idx_products_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- COUPONS
-- -----------------------------------------------------------------------------
CREATE TABLE `coupons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `discount_type` ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
  `discount_value` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `min_order` DECIMAL(10,2) DEFAULT 0,
  `max_discount` DECIMAL(10,2) DEFAULT NULL,
  `usage_limit` INT DEFAULT NULL,
  `used_count` INT NOT NULL DEFAULT 0,
  `starts_at` DATETIME DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- CART
-- -----------------------------------------------------------------------------
CREATE TABLE `cart` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `user_product` (`user_id`, `product_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- WISHLIST
-- -----------------------------------------------------------------------------
CREATE TABLE `wishlist` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `user_product_wishlist` (`user_id`, `product_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ORDERS
-- -----------------------------------------------------------------------------
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `subtotal` DECIMAL(10,2) DEFAULT NULL,
  `shipping_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `coupon_code` VARCHAR(50) DEFAULT NULL,
  `coupon_id` INT DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'paid', 'failed', 'shipped', 'delivered') NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(20) NOT NULL DEFAULT 'online',
  `razorpay_order_id` VARCHAR(100) DEFAULT NULL,
  `razorpay_payment_id` VARCHAR(100) DEFAULT NULL,
  `razorpay_signature` VARCHAR(255) DEFAULT NULL,
  `tracking_number` VARCHAR(100) DEFAULT NULL,
  `tracking_carrier` VARCHAR(80) DEFAULT NULL,
  `tracking_status` VARCHAR(80) DEFAULT NULL,
  `tracking_updated_at` TIMESTAMP NULL DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `zip` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_user` (`user_id`),
  INDEX `idx_orders_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ORDER ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- EMAIL OTP (signup & login verification)
-- -----------------------------------------------------------------------------
CREATE TABLE `email_otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `purpose` ENUM('signup','login') NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `verified_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_otp_lookup` (`email`, `purpose`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- CUSTOMER SHIPPING ADDRESSES (multiple per user)
-- -----------------------------------------------------------------------------
CREATE TABLE `user_addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `label` VARCHAR(80) NOT NULL DEFAULT 'Home',
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `zip` VARCHAR(20) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_addresses_user` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- PRODUCT REVIEWS
-- -----------------------------------------------------------------------------
CREATE TABLE `product_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `user_id` INT DEFAULT NULL,
  `user_name` VARCHAR(100) NOT NULL,
  `user_image` VARCHAR(500) DEFAULT NULL,
  `rating` TINYINT NOT NULL DEFAULT 5,
  `comment` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'hidden') NOT NULL DEFAULT 'approved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reviews_product` (`product_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- CONTACT FORM INQUIRIES
-- -----------------------------------------------------------------------------
CREATE TABLE `contact_inquiries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'unread',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- MEGA MENU (navbar dropdown links)
-- -----------------------------------------------------------------------------
CREATE TABLE `mega_menu_links` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(100) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `category_group` VARCHAR(100) NOT NULL DEFAULT 'Shop by Category',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- SITE SETTINGS (key-value store for CMS-style config)
-- -----------------------------------------------------------------------------
CREATE TABLE `site_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Categories
INSERT INTO `categories` (`id`, `name`, `description`, `image_url`, `show_on_home`) VALUES
(1, 'Indoor Plants', 'Breathe fresh air and elevate your living spaces with gorgeous low-maintenance indoor plants.', 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&w=600&q=80', 1),
(2, 'Outdoor Plants', 'Turn your gardens, balconies, and patios into lush green sanctuaries that thrive in sunshine.', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80', 1),
(3, 'Flowering Plants', 'Add vibrant colors and aromatic fragrances to your home with seasonal blooms.', 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=80', 0),
(4, 'Bonsai & Rare', 'Bold design statement with Bonsai and rare collector plants.', 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80', 0);

-- Products (sample catalog)
INSERT INTO `products` (`id`, `category_id`, `name`, `description`, `price`, `selling_price`, `stock`, `is_active`, `image_url`, `size`, `care_level`, `rating`, `show_on_home`, `perfect_for`) VALUES
(1, 1, 'Monstera Deliciosa', 'Swiss Cheese plant with natural leaf fenestrations — a stunning tropical statement piece.', 899.00, NULL, 25, 1, 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=600&q=80', 'Large', 'Easy', 4.80, 1, 'Office Desk, Gifting, Home Decor'),
(2, 1, 'Snake Plant Laurentii', 'NASA-recommended air purifier. Extremely low maintenance.', 399.00, 349.00, 40, 1, 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=600&q=80', 'Medium', 'Easy', 4.90, 1, 'Bedroom, Office Desk'),
(3, 1, 'Zamioculcas Zamiifolia (ZZ)', 'Glossy leaves, thrives in low light — indestructible desk plant.', 499.00, NULL, 30, 1, 'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?auto=format&fit=crop&w=600&q=80', 'Medium', 'Easy', 4.70, 0, 'Office Desk'),
(4, 1, 'Fiddle Leaf Fig', 'Large violin-shaped leaves — designer favorite for bright rooms.', 1299.00, 1199.00, 15, 1, 'https://images.unsplash.com/photo-1597055181300-e3633a207518?auto=format&fit=crop&w=600&q=80', 'Large', 'Moderate', 4.50, 1, 'Home Decor'),
(5, 2, 'Areca Palm', 'Feathery fronds — natural humidifier for balconies and gardens.', 649.00, NULL, 20, 1, 'https://images.unsplash.com/photo-1588880331543-ef61db729679?auto=format&fit=crop&w=600&q=80', 'Large', 'Easy', 4.60, 0, 'Balcony, Patios'),
(6, 2, 'Golden Pothos Totem', 'Trailing vine on moss pole with gold-splashed leaves.', 549.00, NULL, 18, 1, 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80', 'Medium', 'Easy', 4.70, 0, 'Home Decor'),
(7, 2, 'Boston Fern', 'Arching lacy fronds for humid shady corners.', 299.00, NULL, 22, 1, 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&w=600&q=80', 'Small', 'Moderate', 4.40, 0, 'Balcony'),
(8, 3, 'Peace Lily', 'Elegant white blooms with glossy dark green leaves.', 349.00, NULL, 35, 1, 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=600&q=80', 'Small', 'Easy', 4.80, 0, 'Gifting, Home Decor'),
(9, 3, 'Anthurium Red', 'Glossy crimson spathes — long-lasting blooms.', 799.00, 749.00, 12, 1, 'https://images.unsplash.com/photo-1601662528567-526cd06f6582?auto=format&fit=crop&w=600&q=80', 'Small', 'Moderate', 4.60, 0, 'Gifting'),
(10, 3, 'Adenium Desert Rose', 'Succulent with bright pink trumpet flowers.', 599.00, NULL, 15, 1, 'https://images.unsplash.com/photo-1525498128493-380d1990a112?auto=format&fit=crop&w=600&q=80', 'Small', 'Easy', 4.50, 0, 'Outdoor, Balcony'),
(11, 4, 'Ficus Bonsai (Ginseng)', 'Classic bonsai with thick aerial roots.', 1499.00, NULL, 10, 1, 'https://images.unsplash.com/photo-1512428813824-7b9e29a290a0?auto=format&fit=crop&w=600&q=80', 'Medium', 'Moderate', 4.90, 1, 'Gifting, Office Desk'),
(12, 4, 'Alocasia Polly (African Mask)', 'Dramatic white-veined leaves for collectors.', 699.00, NULL, 8, 1, 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=600&q=80', 'Small', 'Expert', 4.70, 0, 'Home Decor');

-- Default coupon (matches promo bar)
INSERT INTO `coupons` (`code`, `description`, `discount_type`, `discount_value`, `min_order`, `max_discount`, `is_active`) VALUES
('GREEN10', '10% off — minimum order ₹499', 'percent', 10.00, 499.00, 500.00, 1);

-- Users — password for BOTH: admin123 (CHANGE ON LIVE!)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `phone`) VALUES
(1, 'Garden Admin', 'admin@ugaoo.com', '$2y$10$QkXpREj.u.sA/gXlO6rVHeY2N30bNlWJ61L5yR7CgQ31oJzC6i57.', 'admin', '+91 98765 43210'),
(2, 'Jane Doe', 'jane@example.com', '$2y$10$QkXpREj.u.sA/gXlO6rVHeY2N30bNlWJ61L5yR7CgQ31oJzC6i57.', 'customer', '+91 91234 56789');

-- Mega menu links
INSERT INTO `mega_menu_links` (`title`, `url`, `category_group`) VALUES
('Indoor Plants', '/shop?category_id=1', 'Shop by Category'),
('Outdoor Plants', '/shop?category_id=2', 'Shop by Category'),
('Flowering Plants', '/shop?category_id=3', 'Shop by Category'),
('Bonsai & Rare', '/shop?category_id=4', 'Shop by Category'),
('All Plants', '/shop', 'Shop by Category'),
('Track Order', '/track-order', 'Quick Links'),
('Contact Us', '/contact', 'Quick Links');

-- Site settings (all keys used by frontend + admin)
INSERT INTO `site_settings` (`setting_key`, `setting_value`) VALUES
('contact_email', 'support@floraelegance.com'),
('contact_phone', '+91 98765 43210'),
('contact_address', 'Greenhouse Tower, Level 4, Outer Ring Road, Bengaluru, Karnataka, 560103'),
('contact_working_hours', 'Monday - Saturday: 09:00 AM - 07:00 PM'),
('contact_map_iframe', '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.001696423072!2d77.5945626!3d12.9715987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" width="100%" height="450" style="border:0; border-radius: 24px;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'),
('footer_social_facebook', '#'),
('footer_social_instagram', '#'),
('footer_social_twitter', '#'),
('footer_group1_title', 'Shop Categories'),
('footer_group1_links', 'Indoor Plants|/shop?category_id=1\nOutdoor Plants|/shop?category_id=2\nFlowering Plants|/shop?category_id=3\nBonsai & Rare|/shop?category_id=4'),
('footer_group2_title', 'Customer Care'),
('footer_group2_links', 'Track Order|/track-order\nFAQs|/faqs\nShipping Policy|/shipping-policy\nContact|/contact'),
('shop_care_levels', 'Easy,Moderate,Expert'),
('shop_sizes', 'Small,Medium,Large'),
('offer_bar_show', '1'),
('offer_bar_text', '🌱 Free Delivery above ₹999 | 🎁 Flat 10% OFF — Code: GREEN10'),
('offer_bar_countdown', ''),
('cod_enabled', '1'),
('cod_min_order', '499'),
('shipping_enabled', '1'),
('shipping_label', 'Secure Shipping'),
('shipping_fee', '99'),
('shipping_free_threshold', '999'),
('shipping_estimated_days', '3-7 business days'),
('shipping_zones_note', 'Pan-India delivery with live plant-safe packaging.'),
('shipping_insurance_enabled', '1'),
('shipping_insurance_fee', '0'),
('shipping_cod_extra_fee', '0'),
('shipping_min_order', '0'),
('low_stock_threshold', '5'),
('auto_disable_out_of_stock', '1'),
('inventory_show_out_of_stock', '0'),
('invoice_company_name', 'Flora Elegance'),
('invoice_tagline', 'Premium Botanical Boutique'),
('invoice_title', 'TAX INVOICE'),
('invoice_billed_heading', 'Billed To (Customer Details)'),
('invoice_ship_heading', 'Shipping Destination'),
('invoice_table_heading', 'Item Description'),
('invoice_footer_thanks', 'Thank you for choosing Flora Elegance!'),
('invoice_footer_support', 'For support, contact support@floraelegance.com or call +91-9876543210'),
('invoice_footer_legal', 'This is a computer-generated invoice and does not require a physical signature.'),
('invoice_support_email', 'support@floraelegance.com'),
('invoice_support_phone', '+91-9876543210'),
('invoice_gst_note', ''),
('invoice_primary_color', '#059669'),
('smtp_enabled', '1'),
('smtp_host', 'smtp.hostinger.com'),
('smtp_port', '587'),
('smtp_encryption', 'tls'),
('smtp_username', ''),
('smtp_password', ''),
('smtp_from_email', ''),
('smtp_from_name', 'FloraElegance'),
('smtp_reply_to', ''),
('email_notify_orders', '1'),
('email_notify_inquiries', '1'),
('email_notify_reviews', '1'),
('email_notify_admin', '1'),
('email_notify_status', '1'),
('email_notify_tracking', '1'),
('email_notify_security', '1');

-- =============================================================================
-- END OF SCHEMA
-- Default admin login: admin@ugaoo.com / admin123
-- Import on fresh DB only. Existing live DB: backup first before re-import.
-- =============================================================================
