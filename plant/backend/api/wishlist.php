<?php
// backend/api/wishlist.php

require_once "../config/db.php";
require_once "../config/jwt.php";

$userData = JWT::authenticate();
if (!$userData) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please log in first."
    ]);
    exit();
}

$userId = $userData['id'];
$method = $_SERVER['REQUEST_METHOD'];

// Self-healing database structure: Ensure wishlist table exists
try {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS `wishlist` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `user_id` INT NOT NULL,
          `product_id` INT NOT NULL,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY `user_product_wishlist` (`user_id`, `product_id`),
          FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
          FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (PDOException $e) {
    // Already exists or DB user has insufficient permissions to create tables
}

switch ($method) {
    case 'GET':
        try {
            $stmt = $conn->prepare("
                SELECT w.id as wishlist_id, w.created_at as added_at, p.* 
                FROM wishlist w
                JOIN products p ON w.product_id = p.id
                WHERE w.user_id = ?
                ORDER BY w.id DESC
            ");
            $stmt->execute([$userId]);
            $wishlistItems = $stmt->fetchAll();
            
            echo json_encode([
                "success" => true,
                "data" => $wishlistItems
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error fetching wishlist: " . $e->getMessage()]);
        }
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input['product_id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Product ID is required."]);
            exit();
        }
        
        $productId = intval($input['product_id']);
        
        try {
            // Check if product exists
            $prodCheck = $conn->prepare("SELECT id FROM products WHERE id = ?");
            $prodCheck->execute([$productId]);
            if ($prodCheck->rowCount() == 0) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Product not found."]);
                exit();
            }
            
            // Insert into wishlist (using INSERT IGNORE or REPLACE to prevent errors on duplicates)
            $stmt = $conn->prepare("INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)");
            $stmt->execute([$userId, $productId]);
            
            echo json_encode([
                "success" => true,
                "message" => "Product added to wishlist successfully!"
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error adding to wishlist: " . $e->getMessage()]);
        }
        break;
        
    case 'DELETE':
        // Get product_id from query parameter first, fallback to JSON body
        $productId = 0;
        if (isset($_GET['product_id'])) {
            $productId = intval($_GET['product_id']);
        } else {
            $input = json_decode(file_get_contents("php://input"), true);
            if (!empty($input['product_id'])) {
                $productId = intval($input['product_id']);
            }
        }
        
        if ($productId <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Valid Product ID is required."]);
            exit();
        }
        
        try {
            $stmt = $conn->prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$userId, $productId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    "success" => true,
                    "message" => "Product removed from wishlist successfully!"
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "message" => "Product was not in wishlist."
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error removing from wishlist: " . $e->getMessage()]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method " . $method . " not allowed."]);
}
?>
