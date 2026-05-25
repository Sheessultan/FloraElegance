<?php
// backend/api/login.php

require_once "../config/db.php";
require_once "../config/jwt.php";
require_once "../config/commerce.php";

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method " . $method . " not allowed. Use POST."
    ]);
    exit();
}

$input = json_decode(file_get_contents("php://input"), true);
if (empty($input['email']) || empty($input['password'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Email and password are required fields."
    ]);
    exit();
}

$email = trim($input['email']);
$password = $input['password'];

try {
    // Fetch user details
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Verify user exists and check password hash
    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401); // Unauthorized
        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password."
        ]);
        exit();
    }

    commerceEnsureSchema($conn);
    if (isset($user['is_banned']) && intval($user['is_banned']) === 1) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => !empty($user['ban_reason']) ? $user['ban_reason'] : "Your account has been blocked. Contact support."
        ]);
        exit();
    }

    // Set JWT parameters
    $issuedAt = time();
    $expirationTime = $issuedAt + (3600 * 24 * 7); // Token valid for 7 days
    
    $payload = [
        "id" => $user['id'],
        "name" => $user['name'],
        "email" => $user['email'],
        "role" => $user['role'],
        "iat" => $issuedAt,
        "exp" => $expirationTime
    ];

    // Encode JWT
    $jwt = JWT::encode($payload);

    echo json_encode([
        "success" => true,
        "message" => "Login successful!",
        "token" => $jwt,
        "user" => [
            "id" => $user['id'],
            "name" => $user['name'],
            "email" => $user['email'],
            "role" => $user['role']
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Login failed due to a database error: " . $e->getMessage()
    ]);
}
?>
