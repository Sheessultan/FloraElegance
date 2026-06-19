<?php
// backend/api/signup.php

require_once "../config/db.php";
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
$action = trim($input['action'] ?? 'register');

// Step 1: Request OTP for signup
if ($action === 'send_otp') {
    if (empty($input['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is required to send verification code.']);
        exit();
    }
    $result = otpCreateAndSend($conn, $input['email'], 'signup', trim($input['name'] ?? ''));
    if (!$result['success']) {
        http_response_code(strpos($result['message'], 'already registered') !== false ? 409 : 400);
    }
    echo json_encode($result);
    exit();
}

// Step 2: Verify OTP + create account
if (empty($input['name']) || empty($input['email']) || empty($input['password']) || empty($input['otp'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Name, email, password, and verification code are required."
    ]);
    exit();
}

$name = trim($input['name']);
$email = otpNormalizeEmail($input['email']);
$password = $input['password'];
$otp = trim($input['otp']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid email format."]);
    exit();
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Password must be at least 6 characters long."]);
    exit();
}

$otpResult = otpVerify($conn, $email, 'signup', $otp);
if (!$otpResult['success']) {
    http_response_code(400);
    echo json_encode($otpResult);
    exit();
}

try {
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "message" => "Email is already registered. Please log in instead."
        ]);
        exit();
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $role = 'customer';

    $stmt = $conn->prepare("INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 1)");
    $stmt->execute([$name, $email, $hashedPassword, $role]);

    notifyWelcome($conn, $name, $email);

    echo json_encode([
        "success" => true,
        "message" => "Account created successfully! Your email is verified — you can now sign in."
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Registration failed due to a database error: " . $e->getMessage()
    ]);
}
