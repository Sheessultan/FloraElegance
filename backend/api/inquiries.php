<?php
// backend/api/inquiries.php

require_once "../config/db.php";
require_once "../config/jwt.php";

// SELF-HEALING DATABASE MIGRATION FOR CONTACT INQUIRIES
try {
    $tableExists = false;
    try {
        $result = $conn->query("SELECT 1 FROM contact_inquiries LIMIT 1");
        $tableExists = true;
    } catch (Exception $e) {
        $tableExists = false;
    }

    if (!$tableExists) {
        $conn->exec("CREATE TABLE `contact_inquiries` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `email` VARCHAR(255) NOT NULL,
            `subject` VARCHAR(255) NOT NULL,
            `message` TEXT NOT NULL,
            `status` VARCHAR(50) DEFAULT 'unread',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    }
} catch (PDOException $e) {
    // Fail silently
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'POST':
        // Publicly accessible to submit inquiry
        $input = json_decode(file_get_contents("php://input"), true);
        
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $subject = trim($input['subject'] ?? '');
        $message = trim($input['message'] ?? '');

        if (!$name || !$email || !$subject || !$message) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "All fields (name, email, subject, message) are strictly required."
            ]);
            exit();
        }

        try {
            $stmt = $conn->prepare("INSERT INTO contact_inquiries (name, email, subject, message, status) VALUES (?, ?, ?, ?, 'unread')");
            $stmt->execute([$name, $email, $subject, $message]);
            
            echo json_encode([
                "success" => true,
                "message" => "Inquiry successfully recorded.",
                "id" => $conn->lastInsertId()
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to save inquiry: " . $e->getMessage()
            ]);
        }
        break;

    case 'GET':
        // Secure Admin auth required to view list
        $userData = JWT::authenticate();
        if (!$userData || $userData['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Access denied. Admin credentials required."
            ]);
            exit();
        }

        try {
            $stmt = $conn->query("SELECT * FROM contact_inquiries ORDER BY created_at DESC");
            $inquiries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode([
                "success" => true,
                "data" => $inquiries
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'PUT':
        // Secure Admin auth to mark read/unread
        $userData = JWT::authenticate();
        if (!$userData || $userData['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Access denied. Admin credentials required."
            ]);
            exit();
        }

        $id = intval($_GET['id'] ?? 0);
        $input = json_decode(file_get_contents("php://input"), true);
        $status = trim($input['status'] ?? 'read');

        if (!$id) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Missing inquiry identification code."
            ]);
            exit();
        }

        try {
            $stmt = $conn->prepare("UPDATE contact_inquiries SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            
            echo json_encode([
                "success" => true,
                "message" => "Inquiry status updated to " . $status
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to modify inquiry: " . $e->getMessage()
            ]);
        }
        break;

    case 'DELETE':
        // Secure Admin auth to delete
        $userData = JWT::authenticate();
        if (!$userData || $userData['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Access denied. Admin credentials required."
            ]);
            exit();
        }

        $id = intval($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Missing inquiry identification code."
            ]);
            exit();
        }

        try {
            $stmt = $conn->prepare("DELETE FROM contact_inquiries WHERE id = ?");
            $stmt->execute([$id]);
            
            echo json_encode([
                "success" => true,
                "message" => "Inquiry permanently deleted."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to delete inquiry: " . $e->getMessage()
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
