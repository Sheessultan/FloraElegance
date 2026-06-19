<?php
// backend/api/signup.php

require_once "../config/db.php";

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
if (empty($input['name']) || empty($input['email']) || empty($input['password'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Name, email, and password are required fields."
    ]);
    exit();
}

$name = trim($input['name']);
$email = trim($input['email']);
$password = $input['password'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid email format."
    ]);
    exit();
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Password must be at least 6 characters long."
    ]);
    exit();
}

try {
    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode([
            "success" => false,
            "message" => "Email is already registered. Please log in instead."
        ]);
        exit();
    }

    // Hash password using BCRYPT
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $role = 'customer'; // Default role for signup

    // Insert user into DB
    $stmt = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashedPassword, $role]);

    echo json_encode([
        "success" => true,
        "message" => "User registered successfully! You can now log in."
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Registration failed due to a database error: " . $e->getMessage()
    ]);
}
?>
