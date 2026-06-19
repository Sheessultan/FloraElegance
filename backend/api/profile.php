<?php
// backend/api/profile.php

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

// Self-healing database structure: Ensure columns exist
try {
    // Check if phone column exists
    $check = $conn->query("SHOW COLUMNS FROM `users` LIKE 'phone'");
    if ($check->rowCount() == 0) {
        $conn->exec("ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) DEFAULT NULL AFTER `role`");
    }
    
    // Check if address column exists
    $check = $conn->query("SHOW COLUMNS FROM `users` LIKE 'address'");
    if ($check->rowCount() == 0) {
        $conn->exec("ALTER TABLE `users` ADD COLUMN `address` TEXT DEFAULT NULL AFTER `phone`");
    }
    
    // Check if city column exists
    $check = $conn->query("SHOW COLUMNS FROM `users` LIKE 'city'");
    if ($check->rowCount() == 0) {
        $conn->exec("ALTER TABLE `users` ADD COLUMN `city` VARCHAR(100) DEFAULT NULL AFTER `address`");
    }
    
    // Check if zip column exists
    $check = $conn->query("SHOW COLUMNS FROM `users` LIKE 'zip'");
    if ($check->rowCount() == 0) {
        $conn->exec("ALTER TABLE `users` ADD COLUMN `zip` VARCHAR(20) DEFAULT NULL AFTER `city`");
    }

    // Check for billing fields
    $check = $conn->query("SHOW COLUMNS FROM `users` LIKE 'billing_address'");
    if ($check->rowCount() == 0) {
        $conn->exec("ALTER TABLE `users` ADD COLUMN `billing_address` TEXT DEFAULT NULL AFTER `zip`");
        $conn->exec("ALTER TABLE `users` ADD COLUMN `billing_city` VARCHAR(100) DEFAULT NULL AFTER `billing_address`");
        $conn->exec("ALTER TABLE `users` ADD COLUMN `billing_zip` VARCHAR(20) DEFAULT NULL AFTER `billing_city`");
    }
} catch (PDOException $e) {
    // Columns already exist or database driver doesn't support SHOW COLUMNS.
}

switch ($method) {
    case 'GET':
        try {
            $stmt = $conn->prepare("SELECT id, name, email, role, phone, address, city, zip, billing_address, billing_city, billing_zip, created_at FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            if (!$user) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "User profile not found."]);
                exit();
            }
            
            echo json_encode([
                "success" => true,
                "data" => $user
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error loading profile: " . $e->getMessage()]);
        }
        break;
        
    case 'POST':
    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input['name'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Name is a required field."]);
            exit();
        }
        
        $name = trim($input['name']);
        $phone = isset($input['phone']) ? trim($input['phone']) : null;
        
        try {
            $conn->beginTransaction();
            
            // Check if password change is requested
            if (!empty($input['new_password'])) {
                if (empty($input['current_password'])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Current password is required to change password."]);
                    $conn->rollBack();
                    exit();
                }
                
                // Retrieve current password hash
                $pwdStmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
                $pwdStmt->execute([$userId]);
                $userPwd = $pwdStmt->fetchColumn();
                
                if (!password_verify($input['current_password'], $userPwd)) {
                    http_response_code(401);
                    echo json_encode(["success" => false, "message" => "Incorrect current password."]);
                    $conn->rollBack();
                    exit();
                }
                
                // Hash new password and update
                $newHash = password_hash($input['new_password'], PASSWORD_BCRYPT);
                $updatePwdStmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                $updatePwdStmt->execute([$newHash, $userId]);
            }
            
            // Update profile info (shipping addresses live in user_addresses table)
            $updateStmt = $conn->prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?");
            $updateStmt->execute([$name, $phone, $userId]);

            try {
                $sync = $conn->prepare("UPDATE user_addresses SET name = ?, phone = ? WHERE user_id = ? AND is_default = 1");
                $sync->execute([$name, $phone, $userId]);
            } catch (PDOException $e) { /* optional */ }
            
            $conn->commit();
            
            // Fetch updated user details
            $stmt = $conn->prepare("SELECT id, name, email, role, phone, address, city, zip, billing_address, billing_city, billing_zip FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $updatedUser = $stmt->fetch();
            
            echo json_encode([
                "success" => true,
                "message" => "Profile updated successfully!",
                "data" => $updatedUser
            ]);
        } catch (Exception $e) {
            $conn->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to update profile: " . $e->getMessage()]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method " . $method . " not allowed."]);
}
?>
