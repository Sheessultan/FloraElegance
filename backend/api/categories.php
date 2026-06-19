<?php
// backend/api/categories.php

require_once "../config/db.php";
require_once "../config/jwt.php";

// SELF-HEALING DATABASE MIGRATION FOR CATEGORIES (show_on_home)
try {
    $stmt = $conn->query("SHOW COLUMNS FROM categories LIKE 'show_on_home'");
    $columnExists = $stmt->fetch();
    if (!$columnExists) {
        $conn->exec("ALTER TABLE categories ADD COLUMN show_on_home TINYINT DEFAULT 0");
    }
} catch (PDOException $e) {
    // Fail silently
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $stmt = $conn->query("SELECT * FROM categories ORDER BY id ASC");
            $categories = $stmt->fetchAll();
            echo json_encode([
                "success" => true,
                "data" => $categories
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error fetching categories: " . $e->getMessage()
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
        if (empty($input['name'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Category name is required."
            ]);
            exit();
        }

        try {
            $showOnHome = isset($input['show_on_home']) ? intval($input['show_on_home']) : 0;
            $stmt = $conn->prepare("INSERT INTO categories (name, description, image_url, show_on_home) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $input['name'],
                isset($input['description']) ? $input['description'] : null,
                isset($input['image_url']) ? $input['image_url'] : null,
                $showOnHome
            ]);
            echo json_encode([
                "success" => true,
                "message" => "Category created successfully.",
                "id" => $conn->lastInsertId()
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to create category: " . $e->getMessage()
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
                "message" => "Invalid or missing Category ID."
            ]);
            exit();
        }

        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input['name'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Category name is required."
            ]);
            exit();
        }

        try {
            $showOnHome = isset($input['show_on_home']) ? intval($input['show_on_home']) : 0;
            $stmt = $conn->prepare("UPDATE categories SET name = ?, description = ?, image_url = ?, show_on_home = ? WHERE id = ?");
            $stmt->execute([
                $input['name'],
                isset($input['description']) ? $input['description'] : null,
                isset($input['image_url']) ? $input['image_url'] : null,
                $showOnHome,
                $id
            ]);
            echo json_encode([
                "success" => true,
                "message" => "Category updated successfully."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to update category: " . $e->getMessage()
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
                "message" => "Invalid or missing Category ID."
            ]);
            exit();
        }

        try {
            $stmt = $conn->prepare("DELETE FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode([
                "success" => true,
                "message" => "Category deleted successfully."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to delete category: " . $e->getMessage()
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
