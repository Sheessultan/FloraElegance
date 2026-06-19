<?php
// backend/api/login.php

require_once "../config/db.php";
require_once "../config/jwt.php";
require_once "../config/commerce.php";
require_once "../config/otp.php";
require_once "../config/notifications.php";

mailEnsureSchema($conn);
mailEnsureSettings($conn);

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method " . $method . " not allowed. Use POST."
    ]);
    exit();
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$action = trim($input['action'] ?? 'password');

// Send login OTP
if ($action === 'send_otp') {
    if (empty($input['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is required.']);
        exit();
    }
    $result = otpCreateAndSend($conn, $input['email'], 'login');
    if (!$result['success']) {
        http_response_code(400);
    }
    echo json_encode($result);
    exit();
}

// Login with email OTP
if ($action === 'otp') {
    $email = otpNormalizeEmail($input['email'] ?? '');
    $otp = trim($input['otp'] ?? '');

    if ($email === '' || $otp === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email and verification code are required.']);
        exit();
    }

    $otpResult = otpVerify($conn, $email, 'login', $otp);
    if (!$otpResult['success']) {
        http_response_code(400);
        echo json_encode($otpResult);
        exit();
    }

    try {
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Account not found.']);
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

        $conn->prepare("UPDATE users SET email_verified = 1 WHERE id = ?")->execute([$user['id']]);
        notifyLoginAlert($conn, $user['name'], $user['email']);

        $issuedAt = time();
        $expirationTime = $issuedAt + (3600 * 24 * 7);
        $payload = [
            "id" => $user['id'],
            "name" => $user['name'],
            "email" => $user['email'],
            "role" => $user['role'],
            "iat" => $issuedAt,
            "exp" => $expirationTime
        ];
        $jwt = JWT::encode($payload);

        echo json_encode([
            "success" => true,
            "message" => "Signed in successfully with email verification.",
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
        echo json_encode(['success' => false, 'message' => 'Login failed: ' . $e->getMessage()]);
    }
    exit();
}

// Standard password login
if (empty($input['email']) || empty($input['password'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Email and password are required fields."
    ]);
    exit();
}

$email = otpNormalizeEmail($input['email']);
$password = $input['password'];

try {
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
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

    $issuedAt = time();
    $expirationTime = $issuedAt + (3600 * 24 * 7);

    $payload = [
        "id" => $user['id'],
        "name" => $user['name'],
        "email" => $user['email'],
        "role" => $user['role'],
        "iat" => $issuedAt,
        "exp" => $expirationTime
    ];

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
