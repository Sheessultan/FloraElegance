<?php
// backend/api/products.php

require_once "../config/db.php";
require_once "../config/jwt.php";
require_once "../config/commerce.php";

commerceEnsureSchema($conn);

// SELF-HEALING DATABASE MIGRATION FOR PRODUCTS
try {
    $columns = [
        'show_on_home' => "TINYINT DEFAULT 0",
        'gallery_images' => "TEXT DEFAULT NULL",
        'biological_specs' => "TEXT DEFAULT NULL",
        'customer_reviews' => "TEXT DEFAULT NULL",
        'selling_price' => "DECIMAL(10,2) DEFAULT NULL",
        'height_cm' => "VARCHAR(100) DEFAULT NULL",
        'pot_size' => "VARCHAR(100) DEFAULT NULL",
        'visual_scale' => "VARCHAR(100) DEFAULT NULL",
        'care_guide' => "TEXT DEFAULT NULL",
        'delivery_info' => "TEXT DEFAULT NULL",
        'perfect_for' => "VARCHAR(255) DEFAULT NULL",
        'sun_exposure' => "VARCHAR(255) DEFAULT NULL",
        'hydration' => "VARCHAR(255) DEFAULT NULL",
        'toxin_filtration' => "VARCHAR(255) DEFAULT NULL",
        'is_active' => "TINYINT(1) NOT NULL DEFAULT 1",
        'content_sections' => "LONGTEXT DEFAULT NULL"
    ];
    foreach ($columns as $col => $definition) {
        $stmt = $conn->query("SHOW COLUMNS FROM products LIKE '$col'");
        $columnExists = $stmt->fetch();
        if (!$columnExists) {
            $conn->exec("ALTER TABLE products ADD COLUMN `$col` $definition");
        }
    }
} catch (PDOException $e) {
    // Fail silently
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        // 1. Fetch single product detail
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            try {
                $stmt = $conn->prepare("SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?");
                $stmt->execute([$id]);
                $product = $stmt->fetch();
                if ($product) {
                    echo json_encode([
                        "success" => true,
                        "data" => $product
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        "success" => false,
                        "message" => "Product not found."
                    ]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage()
                ]);
            }
            exit();
        }

        // 2. Fetch list of products with dynamic filters
        $isAdminList = isset($_GET['admin']) && $_GET['admin'] === '1';
        if ($isAdminList) {
            $adminData = JWT::authenticate();
            if (!$adminData || ($adminData['role'] ?? '') !== 'admin') {
                http_response_code(403);
                echo json_encode([
                    "success" => false,
                    "message" => "Admin access required."
                ]);
                exit();
            }
        }
        $sql = "SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1";
        $params = [];

        if (!$isAdminList) {
            $sql .= " AND COALESCE(p.is_active, 1) = 1 AND p.stock > 0";
        }

        // Category filter
        if (isset($_GET['category_id']) && !empty($_GET['category_id'])) {
            $sql .= " AND p.category_id = ?";
            $params[] = intval($_GET['category_id']);
        }

        // Keyword Search (Matches name or description)
        if (isset($_GET['search']) && !empty(trim($_GET['search']))) {
            $sql .= " AND (p.name LIKE ? OR p.description LIKE ?)";
            $keyword = "%" . trim($_GET['search']) . "%";
            $params[] = $keyword;
            $params[] = $keyword;
        }

        // Minimum Price filter
        if (isset($_GET['price_min']) && is_numeric($_GET['price_min'])) {
            $sql .= " AND p.price >= ?";
            $params[] = floatval($_GET['price_min']);
        }

        // Maximum Price filter
        if (isset($_GET['price_max']) && is_numeric($_GET['price_max'])) {
            $sql .= " AND p.price <= ?";
            $params[] = floatval($_GET['price_max']);
        }

        // Size filter
        if (isset($_GET['size']) && !empty($_GET['size'])) {
            $sql .= " AND p.size = ?";
            $params[] = $_GET['size'];
        }

        // Care Level filter
        if (isset($_GET['care_level']) && !empty($_GET['care_level'])) {
            $sql .= " AND p.care_level = ?";
            $params[] = $_GET['care_level'];
        }

        // Home Page Bestsellers dynamic filter
        if (isset($_GET['home_only']) && $_GET['home_only'] === 'true') {
            $sql .= " AND p.show_on_home = 1";
        }

        // Sorting options
        $sort = isset($_GET['sort']) ? $_GET['sort'] : 'newest';
        switch ($sort) {
            case 'price_low_high':
                $sql .= " ORDER BY p.price ASC";
                break;
            case 'price_high_low':
                $sql .= " ORDER BY p.price DESC";
                break;
            case 'rating':
                $sql .= " ORDER BY p.rating DESC";
                break;
            case 'newest':
            default:
                $sql .= " ORDER BY p.id DESC";
                break;
        }

        try {
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            $products = $stmt->fetchAll();
            echo json_encode([
                "success" => true,
                "data" => $products
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
        
        // Sensible defaults so nothing is strictly required
        $name = !empty($input['name']) ? $input['name'] : 'New Flora Specimen';
        $categoryId = !empty($input['category_id']) ? intval($input['category_id']) : 1;
        $price = isset($input['price']) ? floatval($input['price']) : 0.00;
        $stock = isset($input['stock']) ? intval($input['stock']) : 0;
        $sellingPrice = (isset($input['selling_price']) && $input['selling_price'] !== '' && is_numeric($input['selling_price'])) ? floatval($input['selling_price']) : null;
        $showOnHome = isset($input['show_on_home']) ? intval($input['show_on_home']) : 0;
        $isActive = isset($input['is_active']) ? intval($input['is_active']) : ($stock > 0 ? 1 : 0);
        $contentSections = isset($input['content_sections']) ? $input['content_sections'] : null;

        try {
            $stmt = $conn->prepare("INSERT INTO products (category_id, name, description, price, stock, image_url, size, care_level, rating, show_on_home, gallery_images, biological_specs, customer_reviews, selling_price, height_cm, pot_size, visual_scale, care_guide, delivery_info, perfect_for, sun_exposure, hydration, toxin_filtration, is_active, content_sections) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $categoryId,
                $name,
                isset($input['description']) ? $input['description'] : null,
                $price,
                $stock,
                isset($input['image_url']) ? $input['image_url'] : null,
                isset($input['size']) ? $input['size'] : 'Medium',
                isset($input['care_level']) ? $input['care_level'] : 'Easy',
                isset($input['rating']) ? floatval($input['rating']) : 4.50,
                $showOnHome,
                isset($input['gallery_images']) ? $input['gallery_images'] : null,
                isset($input['biological_specs']) ? $input['biological_specs'] : null,
                isset($input['customer_reviews']) ? $input['customer_reviews'] : null,
                $sellingPrice,
                isset($input['height_cm']) ? $input['height_cm'] : null,
                isset($input['pot_size']) ? $input['pot_size'] : null,
                isset($input['visual_scale']) ? $input['visual_scale'] : null,
                isset($input['care_guide']) ? $input['care_guide'] : null,
                isset($input['delivery_info']) ? $input['delivery_info'] : null,
                isset($input['perfect_for']) ? $input['perfect_for'] : null,
                isset($input['sun_exposure']) ? $input['sun_exposure'] : null,
                isset($input['hydration']) ? $input['hydration'] : null,
                isset($input['toxin_filtration']) ? $input['toxin_filtration'] : null,
                $isActive,
                $contentSections
            ]);
            $newId = $conn->lastInsertId();
            commerceApplyStockRules($conn, $newId, $stock);
            echo json_encode([
                "success" => true,
                "message" => "Product created successfully.",
                "id" => $newId
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to create product: " . $e->getMessage()
            ]);
        }
        break;

    case 'PUT':
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

        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Invalid or missing Product ID."
            ]);
            exit();
        }

        $input = json_decode(file_get_contents("php://input"), true);
        
        // Sensible defaults so nothing is strictly required
        $name = !empty($input['name']) ? $input['name'] : 'New Flora Specimen';
        $categoryId = !empty($input['category_id']) ? intval($input['category_id']) : 1;
        $price = isset($input['price']) ? floatval($input['price']) : 0.00;
        $stock = isset($input['stock']) ? intval($input['stock']) : 0;
        $sellingPrice = (isset($input['selling_price']) && $input['selling_price'] !== '' && is_numeric($input['selling_price'])) ? floatval($input['selling_price']) : null;
        $showOnHome = isset($input['show_on_home']) ? intval($input['show_on_home']) : 0;
        $isActive = isset($input['is_active']) ? intval($input['is_active']) : ($stock > 0 ? 1 : 0);
        $contentSections = isset($input['content_sections']) ? $input['content_sections'] : null;

        try {
            $stmt = $conn->prepare("UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, image_url = ?, size = ?, care_level = ?, rating = ?, show_on_home = ?, gallery_images = ?, biological_specs = ?, customer_reviews = ?, selling_price = ?, height_cm = ?, pot_size = ?, visual_scale = ?, care_guide = ?, delivery_info = ?, perfect_for = ?, sun_exposure = ?, hydration = ?, toxin_filtration = ?, is_active = ?, content_sections = ? WHERE id = ?");
            $stmt->execute([
                $categoryId,
                $name,
                isset($input['description']) ? $input['description'] : null,
                $price,
                $stock,
                isset($input['image_url']) ? $input['image_url'] : null,
                isset($input['size']) ? $input['size'] : 'Medium',
                isset($input['care_level']) ? $input['care_level'] : 'Easy',
                isset($input['rating']) ? floatval($input['rating']) : 4.50,
                $showOnHome,
                isset($input['gallery_images']) ? $input['gallery_images'] : null,
                isset($input['biological_specs']) ? $input['biological_specs'] : null,
                isset($input['customer_reviews']) ? $input['customer_reviews'] : null,
                $sellingPrice,
                isset($input['height_cm']) ? $input['height_cm'] : null,
                isset($input['pot_size']) ? $input['pot_size'] : null,
                isset($input['visual_scale']) ? $input['visual_scale'] : null,
                isset($input['care_guide']) ? $input['care_guide'] : null,
                isset($input['delivery_info']) ? $input['delivery_info'] : null,
                isset($input['perfect_for']) ? $input['perfect_for'] : null,
                isset($input['sun_exposure']) ? $input['sun_exposure'] : null,
                isset($input['hydration']) ? $input['hydration'] : null,
                isset($input['toxin_filtration']) ? $input['toxin_filtration'] : null,
                $isActive,
                $contentSections,
                $id
            ]);
            commerceApplyStockRules($conn, $id, $stock);
            echo json_encode([
                "success" => true,
                "message" => "Product updated successfully."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to update product: " . $e->getMessage()
            ]);
        }
        break;

    case 'DELETE':
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

        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Invalid or missing Product ID."
            ]);
            exit();
        }

        try {
            $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode([
                "success" => true,
                "message" => "Product deleted successfully."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to delete product: " . $e->getMessage()
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
