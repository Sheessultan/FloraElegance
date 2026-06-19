<?php
// backend/api/mega_menu.php

require_once "../config/db.php";
require_once "../config/jwt.php";

// SELF-HEALING DATABASE MIGRATION FOR MEGA MENU LINKS
try {
    // Check if `mega_menu_links` table exists
    $tableExists = false;
    try {
        $result = $conn->query("SELECT 1 FROM mega_menu_links LIMIT 1");
        $tableExists = true;
    } catch (Exception $e) {
        $tableExists = false;
    }

    if (!$tableExists) {
        // Create table
        $conn->exec("CREATE TABLE `mega_menu_links` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(100) NOT NULL,
            `url` VARCHAR(255) NOT NULL,
            `category_group` VARCHAR(100) NOT NULL DEFAULT 'Categories',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Seed premium default links for mega menu columns
        $stmt = $conn->prepare("INSERT INTO mega_menu_links (title, url, category_group) VALUES (?, ?, ?)");
        
        // Shop by Category Group
        $stmt->execute(["Indoor Plants", "/shop", "Shop by Category"]);
        $stmt->execute(["Outdoor Plants", "/shop", "Shop by Category"]);
        $stmt->execute(["Low Light Plants", "/shop", "Shop by Category"]);
        $stmt->execute(["Bonsai Collection", "/shop", "Shop by Category"]);

        // Curated Collections Group
        $stmt->execute(["Best Sellers", "/shop", "Curated Collections"]);
        $stmt->execute(["New Arrivals", "/shop", "Curated Collections"]);
        $stmt->execute(["Premium Rare Specs", "/shop", "Curated Collections"]);
        $stmt->execute(["Discount Offers", "/shop", "Curated Collections"]);

        // Care & Lifestyle Group
        $stmt->execute(["Easy to Care", "/shop", "Care & Lifestyle"]);
        $stmt->execute(["NASA Air Purifying", "/shop", "Care & Lifestyle"]);
        $stmt->execute(["Pet-Friendly Plants", "/shop", "Care & Lifestyle"]);
        $stmt->execute(["Desk & Office Plants", "/shop", "Care & Lifestyle"]);
    }
} catch (PDOException $e) {
    // Fail silently or log error
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $stmt = $conn->query("SELECT * FROM mega_menu_links ORDER BY category_group ASC, id ASC");
            $links = $stmt->fetchAll();
            echo json_encode([
                "success" => true,
                "data" => $links
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
        if (empty($input['title']) || empty($input['url']) || empty($input['category_group'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Title, URL, and Category Group are required fields."
            ]);
            exit();
        }

        try {
            $stmt = $conn->prepare("INSERT INTO mega_menu_links (title, url, category_group) VALUES (?, ?, ?)");
            $stmt->execute([
                $input['title'],
                $input['url'],
                $input['category_group']
            ]);
            echo json_encode([
                "success" => true,
                "message" => "Mega menu link added successfully.",
                "id" => $conn->lastInsertId()
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to add menu link: " . $e->getMessage()
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
                "message" => "Link ID is required for editing."
            ]);
            exit();
        }

        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input['title']) || empty($input['url']) || empty($input['category_group'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Title, URL, and Category Group are required fields."
            ]);
            exit();
        }

        try {
            $stmt = $conn->prepare("UPDATE mega_menu_links SET title = ?, url = ?, category_group = ? WHERE id = ?");
            $stmt->execute([
                $input['title'],
                $input['url'],
                $input['category_group'],
                $id
            ]);
            echo json_encode([
                "success" => true,
                "message" => "Mega menu link updated successfully."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to update menu link: " . $e->getMessage()
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
        $categoryGroup = isset($_GET['category_group']) ? $_GET['category_group'] : '';

        if ($id <= 0 && empty($categoryGroup)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Invalid parameters. Either Link ID or Category Group is required."
            ]);
            exit();
        }

        try {
            if (!empty($categoryGroup)) {
                $stmt = $conn->prepare("DELETE FROM mega_menu_links WHERE category_group = ?");
                $stmt->execute([$categoryGroup]);
                echo json_encode([
                    "success" => true,
                    "message" => "Category group column and all its child links deleted successfully."
                ]);
            } else {
                $stmt = $conn->prepare("DELETE FROM mega_menu_links WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode([
                    "success" => true,
                    "message" => "Menu link deleted successfully."
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to perform deletion: " . $e->getMessage()
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
