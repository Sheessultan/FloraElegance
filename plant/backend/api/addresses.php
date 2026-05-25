<?php
// backend/api/addresses.php — customer shipping addresses

require_once "../config/db.php";
require_once "../config/jwt.php";

$userData = JWT::authenticate();
if (!$userData) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized."]);
    exit();
}

$userId = (int) $userData['id'];
$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn->exec("CREATE TABLE IF NOT EXISTS `user_addresses` (
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
        INDEX (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (PDOException $e) { /* exists */ }

// One-time: copy legacy users.address into first saved address
try {
    $cnt = $conn->prepare("SELECT COUNT(*) FROM user_addresses WHERE user_id = ?");
    $cnt->execute([$userId]);
    if ((int) $cnt->fetchColumn() === 0) {
        $u = $conn->prepare("SELECT name, phone, address, city, zip FROM users WHERE id = ?");
        $u->execute([$userId]);
        $row = $u->fetch();
        if ($row && !empty(trim($row['address'] ?? ''))) {
            $ins = $conn->prepare("INSERT INTO user_addresses (user_id, label, name, phone, address, city, zip, is_default) VALUES (?,?,?,?,?,?,?,1)");
            $ins->execute([
                $userId,
                'Home',
                $row['name'] ?? 'Customer',
                $row['phone'],
                trim($row['address']),
                $row['city'] ?? '',
                $row['zip'] ?? '',
            ]);
        }
    }
} catch (PDOException $e) { /* ignore */ }

function clearOtherDefaults($conn, $userId, $exceptId = null) {
    if ($exceptId) {
        $stmt = $conn->prepare("UPDATE user_addresses SET is_default = 0 WHERE user_id = ? AND id != ?");
        $stmt->execute([$userId, $exceptId]);
    } else {
        $stmt = $conn->prepare("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?");
        $stmt->execute([$userId]);
    }
}

switch ($method) {
    case 'GET':
        try {
            $stmt = $conn->prepare("SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC");
            $stmt->execute([$userId]);
            echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true) ?: [];

        if (isset($_GET['action']) && $_GET['action'] === 'set_default') {
            $id = isset($input['id']) ? (int) $input['id'] : 0;
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Address ID required."]);
                exit();
            }
            try {
                $check = $conn->prepare("SELECT id FROM user_addresses WHERE id = ? AND user_id = ?");
                $check->execute([$id, $userId]);
                if (!$check->fetch()) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Address not found."]);
                    exit();
                }
                clearOtherDefaults($conn, $userId, $id);
                $conn->prepare("UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?")->execute([$id, $userId]);
                echo json_encode(["success" => true, "message" => "Default shipping address updated."]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
            exit();
        }

        if (empty($input['name']) || empty($input['address']) || empty($input['city']) || empty($input['zip'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Name, street, city and zip are required."]);
            exit();
        }
        try {
            $isDefault = !empty($input['is_default']) ? 1 : 0;
            $countStmt = $conn->prepare("SELECT COUNT(*) FROM user_addresses WHERE user_id = ?");
            $countStmt->execute([$userId]);
            if ((int) $countStmt->fetchColumn() === 0) {
                $isDefault = 1;
            }
            if ($isDefault) {
                clearOtherDefaults($conn, $userId);
            }
            $stmt = $conn->prepare("INSERT INTO user_addresses (user_id, label, name, phone, address, city, zip, is_default) VALUES (?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $userId,
                trim($input['label'] ?? 'Home'),
                trim($input['name']),
                isset($input['phone']) ? trim($input['phone']) : null,
                trim($input['address']),
                trim($input['city']),
                trim($input['zip']),
                $isDefault,
            ]);
            echo json_encode([
                "success" => true,
                "message" => "Shipping address added.",
                "id" => (int) $conn->lastInsertId(),
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true) ?: [];
        $id = isset($_GET['id']) ? (int) $_GET['id'] : (int) ($input['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Address ID required."]);
            exit();
        }
        try {
            $check = $conn->prepare("SELECT id FROM user_addresses WHERE id = ? AND user_id = ?");
            $check->execute([$id, $userId]);
            if (!$check->fetch()) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Address not found."]);
                exit();
            }
            $isDefault = !empty($input['is_default']) ? 1 : 0;
            if ($isDefault) {
                clearOtherDefaults($conn, $userId, $id);
            }
            $stmt = $conn->prepare("UPDATE user_addresses SET label=?, name=?, phone=?, address=?, city=?, zip=?, is_default=? WHERE id=? AND user_id=?");
            $stmt->execute([
                trim($input['label'] ?? 'Home'),
                trim($input['name'] ?? ''),
                isset($input['phone']) ? trim($input['phone']) : null,
                trim($input['address'] ?? ''),
                trim($input['city'] ?? ''),
                trim($input['zip'] ?? ''),
                $isDefault,
                $id,
                $userId,
            ]);
            echo json_encode(["success" => true, "message" => "Address updated."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Address ID required."]);
            exit();
        }
        try {
            $stmt = $conn->prepare("DELETE FROM user_addresses WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Address not found."]);
                exit();
            }
            $def = $conn->prepare("SELECT id FROM user_addresses WHERE user_id = ? AND is_default = 1 LIMIT 1");
            $def->execute([$userId]);
            if (!$def->fetch()) {
                $first = $conn->prepare("SELECT id FROM user_addresses WHERE user_id = ? ORDER BY id ASC LIMIT 1");
                $first->execute([$userId]);
                $fid = $first->fetchColumn();
                if ($fid) {
                    $conn->prepare("UPDATE user_addresses SET is_default = 1 WHERE id = ?")->execute([$fid]);
                }
            }
            echo json_encode(["success" => true, "message" => "Address removed."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed."]);
}
