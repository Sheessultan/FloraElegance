<?php
// Email OTP API — send & resend verification codes

require_once "../config/db.php";
require_once "../config/otp.php";

mailEnsureSchema($conn);
mailEnsureSettings($conn);

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit();
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$action = trim($input['action'] ?? 'send');
$purpose = trim($input['purpose'] ?? '');
$email = otpNormalizeEmail($input['email'] ?? '');
$name = trim($input['name'] ?? '');

if (!in_array($purpose, ['signup', 'login'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid purpose. Use signup or login.']);
    exit();
}

if ($email === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email address is required.']);
    exit();
}

if ($action === 'send' || $action === 'resend') {
    $result = otpCreateAndSend($conn, $email, $purpose, $name);
    if (!$result['success']) {
        http_response_code($result['message'] === 'Email is already registered. Please sign in instead.' ? 409 : 400);
    }
    echo json_encode($result);
    exit();
}

http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Invalid action. Use send or resend.']);
