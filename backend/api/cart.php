<?php
// backend/api/cart.php

require_once "../config/db.php";
require_once "../config/jwt.php";

// Authenticate user
$userData = JWT::authenticate();
if (!$userData) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please login to manage your cart."
    ]);
    exit();
}

$userId = $userData['id'];
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Fetch cart items joined with product metadata
        try {
            $stmt = $conn->prepare("
                SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.selling_price, p.stock, p.image_url, p.size, p.care_level 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ? 
                ORDER BY c.id DESC
            ");
            $stmt->execute([$userId]);
            $cartItems = $stmt->fetchAll();
            echo json_encode([
                "success" => true,
                "data" => $cartItems
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to retrieve cart: " . $e->getMessage()
            ]);
        }
        break;

    case 'POST':
        // Add item to cart or increment quantity
        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input['product_id'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Product ID is required."
            ]);
            exit();
        }

        $productId = intval($input['product_id']);
        $quantity = isset($input['quantity']) ? intval($input['quantity']) : 1;

        if ($quantity <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Quantity must be greater than zero."
            ]);
            exit();
        }

        try {
            // Verify product exists and check stock limits
            $stmt = $conn->prepare("SELECT stock, name FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1");
            $stmt->execute([$productId]);
            $product = $stmt->fetch();
            
            if (!$product) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "message" => "Product not found."
                ]);
                exit();
            }

            if ($product['stock'] <= 0) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Sorry, " . $product['name'] . " is currently out of stock."
                ]);
                exit();
            }

            // Check if product already exists in user's cart
            $stmt = $conn->prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$userId, $productId]);
            $existingItem = $stmt->fetch();

            if ($existingItem) {
                $newQuantity = $existingItem['quantity'] + $quantity;
                // Cap quantity at product stock limits
                if ($newQuantity > $product['stock']) {
                    $newQuantity = $product['stock'];
                }
                
                $updateStmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE id = ?");
                $updateStmt->execute([$newQuantity, $existingItem['id']]);
                
                echo json_encode([
                    "success" => true,
                    "message" => "Updated quantity in cart.",
                    "quantity" => $newQuantity
                ]);
            } else {
                // Insert new item
                if ($quantity > $product['stock']) {
                    $quantity = $product['stock'];
                }
                
                $insertStmt = $conn->prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)");
                $insertStmt->execute([$userId, $productId, $quantity]);
                
                echo json_encode([
                    "success" => true,
                    "message" => "Product added to cart successfully."
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to add item to cart: " . $e->getMessage()
            ]);
        }
        break;

    case 'PUT':
        // Update item quantity directly (from cart inputs)
        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input['product_id']) || !isset($input['quantity'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Product ID and quantity are required."
            ]);
            exit();
        }

        $productId = intval($input['product_id']);
        $quantity = intval($input['quantity']);

        // Auto-delete item if quantity is set to 0 or less
        if ($quantity <= 0) {
            try {
                $stmt = $conn->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
                $stmt->execute([$userId, $productId]);
                echo json_encode([
                    "success" => true,
                    "message" => "Product removed from cart."
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Failed to remove item: " . $e->getMessage()
                ]);
            }
            exit();
        }

        try {
            // Verify stock
            $stmt = $conn->prepare("SELECT stock, name FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1");
            $stmt->execute([$productId]);
            $product = $stmt->fetch();
            
            if (!$product) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "message" => "Product not found."
                ]);
                exit();
            }

            if ($quantity > $product['stock']) {
                $quantity = $product['stock']; // Cap at maximum stock
            }

            $stmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$quantity, $userId, $productId]);
            
            echo json_encode([
                "success" => true,
                "message" => "Cart quantity updated successfully.",
                "quantity" => $quantity
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to update cart: " . $e->getMessage()
            ]);
        }
        break;

    case 'DELETE':
        // Delete item or clear entire cart
        $productId = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;

        try {
            if ($productId > 0) {
                // Delete single product
                $stmt = $conn->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
                $stmt->execute([$userId, $productId]);
                echo json_encode([
                    "success" => true,
                    "message" => "Product removed from cart successfully."
                ]);
            } else {
                // Clear entire cart
                $stmt = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
                $stmt->execute([$userId]);
                echo json_encode([
                    "success" => true,
                    "message" => "Cart cleared successfully."
                ]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to modify cart: " . $e->getMessage()
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
