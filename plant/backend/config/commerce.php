<?php
// Shared commerce helpers: shipping, coupons, inventory

function commerceEnsureSchema($conn) {
    try {
        $userCols = [
            'is_banned' => "ALTER TABLE users ADD COLUMN is_banned TINYINT(1) NOT NULL DEFAULT 0",
            'ban_reason' => "ALTER TABLE users ADD COLUMN ban_reason VARCHAR(255) DEFAULT NULL",
            'banned_at' => "ALTER TABLE users ADD COLUMN banned_at TIMESTAMP NULL DEFAULT NULL",
        ];
        foreach ($userCols as $sql) {
            try { $conn->exec($sql); } catch (PDOException $e) { /* exists */ }
        }

        $productCols = [
            'is_active' => "ALTER TABLE products ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
            'content_sections' => "ALTER TABLE products ADD COLUMN content_sections LONGTEXT DEFAULT NULL",
        ];
        foreach ($productCols as $sql) {
            try { $conn->exec($sql); } catch (PDOException $e) { /* exists */ }
        }

        $orderCols = [
            'subtotal' => "ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT NULL",
            'shipping_amount' => "ALTER TABLE orders ADD COLUMN shipping_amount DECIMAL(10,2) DEFAULT 0",
            'discount_amount' => "ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0",
            'coupon_code' => "ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL",
            'coupon_id' => "ALTER TABLE orders ADD COLUMN coupon_id INT DEFAULT NULL",
        ];
        foreach ($orderCols as $sql) {
            try { $conn->exec($sql); } catch (PDOException $e) { /* exists */ }
        }

        $conn->exec("CREATE TABLE IF NOT EXISTS coupons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            description VARCHAR(255) DEFAULT NULL,
            discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
            discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
            min_order DECIMAL(10,2) DEFAULT 0,
            max_discount DECIMAL(10,2) DEFAULT NULL,
            usage_limit INT DEFAULT NULL,
            used_count INT NOT NULL DEFAULT 0,
            starts_at DATETIME DEFAULT NULL,
            expires_at DATETIME DEFAULT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (PDOException $e) { /* ignore */ }
}

function commerceGetSettings($conn, $keys = null) {
    $defaults = [
        'shipping_enabled' => '1',
        'shipping_label' => 'Secure Shipping',
        'shipping_fee' => '99',
        'shipping_free_threshold' => '999',
        'shipping_estimated_days' => '3-7 business days',
        'shipping_zones_note' => 'Pan-India delivery with live plant-safe packaging.',
        'shipping_insurance_enabled' => '1',
        'shipping_insurance_fee' => '0',
        'shipping_cod_extra_fee' => '0',
        'shipping_min_order' => '0',
        'low_stock_threshold' => '5',
        'auto_disable_out_of_stock' => '1',
        'inventory_show_out_of_stock' => '0',
    ];
    $allKeys = $keys ? array_merge(array_keys($defaults), (array)$keys) : array_keys($defaults);
    $allKeys = array_unique($allKeys);
    $placeholders = implode(',', array_fill(0, count($allKeys), '?'));
    $rows = [];
    try {
        $stmt = $conn->prepare("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ($placeholders)");
        $stmt->execute($allKeys);
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    } catch (PDOException $e) { /* empty */ }
    foreach ($defaults as $k => $v) {
        if (!isset($rows[$k])) $rows[$k] = $v;
    }
    return $rows;
}

function commerceCalcShipping($subtotal, $settings, $paymentMethod = 'online') {
    $enabled = ($settings['shipping_enabled'] ?? '1') === '1';
    $fee = floatval($settings['shipping_fee'] ?? 99);
    $threshold = floatval($settings['shipping_free_threshold'] ?? 999);
    $insurance = ($settings['shipping_insurance_enabled'] ?? '1') === '1'
        ? floatval($settings['shipping_insurance_fee'] ?? 0) : 0;
    $codExtra = ($paymentMethod === 'cod') ? floatval($settings['shipping_cod_extra_fee'] ?? 0) : 0;
    $minOrder = floatval($settings['shipping_min_order'] ?? 0);

    if ($subtotal < $minOrder && $minOrder > 0) {
        return ['amount' => 0, 'error' => 'Minimum order for shipping is ₹' . number_format($minOrder, 0) . '.'];
    }

    if (!$enabled) {
        return ['amount' => 0, 'label' => $settings['shipping_label'] ?? 'Secure Shipping'];
    }

    $base = ($subtotal >= $threshold || $subtotal <= 0) ? 0 : $fee;
    $amount = $base + $insurance + $codExtra;

    return [
        'amount' => round($amount, 2),
        'label' => $settings['shipping_label'] ?? 'Secure Shipping',
        'free_threshold' => $threshold,
        'estimated_days' => $settings['shipping_estimated_days'] ?? '',
    ];
}

function commerceValidateCoupon($conn, $code, $subtotal, $userId = null) {
    $code = strtoupper(trim($code));
    if ($code === '') {
        return ['valid' => false, 'message' => 'Enter a coupon code.'];
    }

    $stmt = $conn->prepare("SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1");
    $stmt->execute([$code]);
    $coupon = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$coupon) {
        return ['valid' => false, 'message' => 'Invalid or expired coupon code.'];
    }

    if ($coupon['starts_at'] && strtotime($coupon['starts_at']) > time()) {
        return ['valid' => false, 'message' => 'This coupon is not active yet.'];
    }
    if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) {
        return ['valid' => false, 'message' => 'This coupon has expired.'];
    }
    if ($coupon['usage_limit'] !== null && intval($coupon['used_count']) >= intval($coupon['usage_limit'])) {
        return ['valid' => false, 'message' => 'This coupon has reached its usage limit.'];
    }
    if (floatval($coupon['min_order']) > 0 && $subtotal < floatval($coupon['min_order'])) {
        return ['valid' => false, 'message' => 'Minimum order ₹' . number_format($coupon['min_order'], 0) . ' required for this coupon.'];
    }

    $discount = 0;
    if ($coupon['discount_type'] === 'percent') {
        $discount = $subtotal * (floatval($coupon['discount_value']) / 100);
        if ($coupon['max_discount'] !== null && $discount > floatval($coupon['max_discount'])) {
            $discount = floatval($coupon['max_discount']);
        }
    } else {
        $discount = floatval($coupon['discount_value']);
    }
    $discount = min($discount, $subtotal);
    $discount = round($discount, 2);

    return [
        'valid' => true,
        'coupon' => $coupon,
        'discount' => $discount,
        'message' => 'Coupon applied successfully.',
    ];
}

function commerceApplyStockRules($conn, $productId, $stock) {
    $settings = commerceGetSettings($conn);
    if (($settings['auto_disable_out_of_stock'] ?? '1') !== '1') return;
    $active = intval($stock) > 0 ? 1 : 0;
    $stmt = $conn->prepare("UPDATE products SET is_active = ? WHERE id = ?");
    $stmt->execute([$active, $productId]);
}

function commerceIsUserBanned($conn, $userId) {
    try {
        $stmt = $conn->prepare("SELECT is_banned, ban_reason FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($u && intval($u['is_banned']) === 1) {
            return $u['ban_reason'] ?: 'Your account has been restricted. Contact support.';
        }
    } catch (PDOException $e) { /* column missing */ }
    return false;
}
