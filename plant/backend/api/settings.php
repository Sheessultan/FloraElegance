<?php
// backend/api/settings.php

require_once "../config/db.php";
require_once "../config/jwt.php";

// SELF-HEALING DATABASE MIGRATION FOR SITE SETTINGS
try {
    $tableExists = false;
    try {
        $result = $conn->query("SELECT 1 FROM site_settings LIMIT 1");
        $tableExists = true;
    } catch (Exception $e) {
        $tableExists = false;
    }

    if (!$tableExists) {
        $conn->exec("CREATE TABLE `site_settings` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `setting_key` VARCHAR(100) UNIQUE NOT NULL,
            `setting_value` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Seed default parameters
        $stmt = $conn->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->execute(["contact_email", "support@floraelegance.com"]);
        $stmt->execute(["contact_phone", "+91 98765 43210"]);
        $stmt->execute(["contact_address", "Greenhouse Tower, Level 4, Outer Ring Road, Bengaluru, Karnataka, 560103"]);
        $stmt->execute(["contact_working_hours", "Monday - Saturday: 09:00 AM - 07:00 PM"]);
        $stmt->execute(["contact_map_iframe", '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.001696423072!2d77.5945626!3d12.9715987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" width="100%" height="450" style="border:0; border-radius: 24px;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>']);
        
        $stmt->execute(["footer_social_facebook", "#"]);
        $stmt->execute(["footer_social_instagram", "#"]);
        $stmt->execute(["footer_social_twitter", "#"]);
        
        $stmt->execute(["footer_group1_title", "Shop Categories"]);
        $stmt->execute(["footer_group1_links", "Indoor Plants|/shop?category_id=1\nBalcony & Patios|/shop?category_id=2\nFlowering Blooms|/shop?category_id=3\nBonsai & Rare Collectors|/shop?category_id=4"]);
        
        $stmt->execute(["footer_group2_title", "Botanical Guides"]);
        $stmt->execute(["footer_group2_links", "Watering Schedules|#\nSunlight Optimization|#\nPotting & Soils|#\nNASA Purifying Guide|#"]);
    }
} catch (PDOException $e) {
    // Fail silently
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $stmt = $conn->query("SELECT setting_key, setting_value FROM site_settings");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            // Self-healing check for new shop filters settings
            $defaults = [
                "shop_care_levels" => "Easy,Moderate,Expert",
                "shop_sizes" => "Small,Medium,Large",
                "offer_bar_show" => "1",
                "offer_bar_text" => "🌱 Free Delivery above ₹499 | 🎁 Flat 10% OFF - Code: GREEN10",
                "offer_bar_countdown" => "",
                "cod_enabled" => "1",
                "cod_min_order" => "499",
                "invoice_company_name" => "Flora Elegance",
                "invoice_tagline" => "Premium Botanical Boutique",
                "invoice_title" => "TAX INVOICE",
                "invoice_billed_heading" => "Billed To (Customer Details)",
                "invoice_ship_heading" => "Shipping Destination",
                "invoice_table_heading" => "Item Description",
                "invoice_footer_thanks" => "Thank you for choosing Flora Elegance!",
                "invoice_footer_support" => "For support, contact support@floraelegance.com or call +91-9876543210",
                "invoice_footer_legal" => "This is a computer-generated invoice and does not require a physical signature.",
                "invoice_support_email" => "support@floraelegance.com",
                "invoice_support_phone" => "+91-9876543210",
                "invoice_gst_note" => "",
                "invoice_primary_color" => "#059669",
                "shipping_enabled" => "1",
                "shipping_label" => "Secure Shipping",
                "shipping_fee" => "99",
                "shipping_free_threshold" => "999",
                "shipping_estimated_days" => "3-7 business days",
                "shipping_zones_note" => "Pan-India delivery with live plant-safe packaging.",
                "shipping_insurance_enabled" => "1",
                "shipping_insurance_fee" => "0",
                "shipping_cod_extra_fee" => "0",
                "shipping_min_order" => "0",
                "low_stock_threshold" => "5",
                "auto_disable_out_of_stock" => "1",
                "inventory_show_out_of_stock" => "0"
            ];
            foreach ($defaults as $k => $v) {
                if (!isset($rows[$k])) {
                    $ins = $conn->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)");
                    $ins->execute([$k, $v]);
                    $rows[$k] = $v;
                }
            }
            
            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'POST':
        // Verify Admin Authorization
        $userData = JWT::authenticate();
        if (!$userData || $userData['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Access denied. Admin authorization required."
            ]);
            exit();
        }

        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "No settings payload supplied."
            ]);
            exit();
        }

        try {
            $conn->beginTransaction();
            $stmt = $conn->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
            
            foreach ($input as $key => $value) {
                // Safely sanitize key and value
                $stmt->execute([$key, $value, $value]);
            }
            
            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Website settings saved successfully."
            ]);
        } catch (PDOException $e) {
            $conn->rollBack();
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to update configurations: " . $e->getMessage()
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "Method " . $method . " not allowed."
        ]);
}
?>
