<?php
require_once "../config/db.php";
require_once "../config/jwt.php";

// Auto-create reviews table if missing
try {
    $conn->exec("CREATE TABLE IF NOT EXISTS `product_reviews` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `product_id` INT NOT NULL,
        `user_id` INT DEFAULT NULL,
        `user_name` VARCHAR(100) NOT NULL,
        `user_image` VARCHAR(500) DEFAULT NULL,
        `rating` TINYINT NOT NULL DEFAULT 5,
        `comment` TEXT NOT NULL,
        `status` ENUM('pending','approved','hidden') DEFAULT 'approved',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { /* already exists */ }

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        $productId = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;
        $adminMode  = isset($_GET['admin']) && $_GET['admin'] === '1';

        try {
            if ($adminMode) {
                // Admin: fetch ALL reviews across all products
                $userData = JWT::authenticate();
                if (!$userData || $userData['role'] !== 'admin') {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Admin required."]);
                    exit();
                }
                $stmt = $conn->prepare("
                    SELECT r.*, p.name AS product_name, p.image_url AS product_image
                    FROM product_reviews r
                    LEFT JOIN products p ON r.product_id = p.id
                    ORDER BY r.created_at DESC
                ");
                $stmt->execute();
            } elseif ($productId > 0) {
                // Public: only approved reviews for a specific product
                $stmt = $conn->prepare("SELECT * FROM product_reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC");
                $stmt->execute([$productId]);
            } else {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "product_id required."]);
                exit();
            }
            $reviews = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $reviews]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);

        if (empty($input['product_id']) || empty($input['comment']) || empty($input['rating'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "product_id, rating and comment are required."]);
            exit();
        }

        $userData = JWT::authenticate();
        if (!$userData) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Please log in to submit a review."]);
            exit();
        }

        $userId   = $userData['id'];
        $userName = $userData['name'] ?? 'Customer';
        $userImage = $input['user_image'] ?? null;

        try {
            $stmt = $conn->prepare("INSERT INTO product_reviews (product_id, user_id, user_name, user_image, rating, comment, status) VALUES (?,?,?,?,?,?,'pending')");
            $stmt->execute([
                intval($input['product_id']),
                $userId,
                $userName,
                $userImage,
                min(5, max(1, intval($input['rating']))),
                $input['comment']
            ]);
            echo json_encode(["success" => true, "message" => "Review submitted successfully.", "id" => $conn->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Admin: update review status (approved / hidden)
        $userData = JWT::authenticate();
        if (!$userData || $userData['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin required."]);
            exit();
        }
        $id    = isset($_GET['id']) ? intval($_GET['id']) : 0;
        $input = json_decode(file_get_contents("php://input"), true);
        if ($id <= 0 || empty($input['status'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Review ID and status required."]);
            exit();
        }
        $allowedStatuses = ['pending', 'approved', 'hidden'];
        if (!in_array($input['status'], $allowedStatuses, true)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status. Use pending, approved, or hidden."]);
            exit();
        }
        try {
            $stmt = $conn->prepare("UPDATE product_reviews SET status = ? WHERE id = ?");
            $stmt->execute([$input['status'], $id]);
            echo json_encode(["success" => true, "message" => "Review status updated."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $userData = JWT::authenticate();
        if (!$userData || $userData['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin required."]);
            exit();
        }
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Review ID required."]);
            exit();
        }
        try {
            $stmt = $conn->prepare("DELETE FROM product_reviews WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true, "message" => "Review permanently deleted."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;
}
