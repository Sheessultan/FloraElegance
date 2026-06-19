<?php
// Admin: send test email to verify SMTP configuration

require_once "../config/db.php";
require_once "../config/jwt.php";
require_once "../config/mail.php";

$userData = JWT::authenticate();
if (!$userData || $userData['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit();
}

mailEnsureSchema($conn);
mailEnsureSettings($conn);

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$to = trim($input['email'] ?? $userData['email'] ?? '');

if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valid test email address required.']);
    exit();
}

$body = '<p style="margin:0 0 16px;">This is a test email from your FloraElegance SMTP configuration.</p>'
    . '<p style="margin:0 0 16px;">If you received this message, your email notifications are working correctly.</p>'
    . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
    . MailService::infoRow('Sent at', date('M j, Y g:i A'))
    . MailService::infoRow('SMTP Host', MailService::getConfig($conn)['host'])
    . '</table>';

$html = MailService::wrapTemplate('SMTP Test Successful ✅', $body, $conn);

if (MailService::send($to, 'FloraElegance SMTP Test — Configuration OK', $html, null, $conn)) {
    echo json_encode(['success' => true, 'message' => 'Test email sent to ' . $to]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => MailService::getLastError()]);
}
