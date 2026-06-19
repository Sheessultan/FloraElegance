<?php
// Email OTP generation, storage, and verification

require_once __DIR__ . '/mail.php';

define('OTP_LENGTH', 6);
define('OTP_EXPIRY_MINUTES', 10);
define('OTP_MAX_ATTEMPTS', 5);
define('OTP_RESEND_SECONDS', 60);

function otpGenerateCode()
{
    return str_pad((string) random_int(0, 999999), OTP_LENGTH, '0', STR_PAD_LEFT);
}

function otpNormalizeEmail($email)
{
    return strtolower(trim((string) $email));
}

function otpCanResend($conn, $email, $purpose)
{
    $stmt = $conn->prepare("
        SELECT created_at FROM email_otps
        WHERE email = ? AND purpose = ? AND verified_at IS NULL
        ORDER BY id DESC LIMIT 1
    ");
    $stmt->execute([$email, $purpose]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return ['allowed' => true];
    }
    $elapsed = time() - strtotime($row['created_at']);
    if ($elapsed < OTP_RESEND_SECONDS) {
        return [
            'allowed' => false,
            'wait' => OTP_RESEND_SECONDS - $elapsed,
            'message' => 'Please wait ' . (OTP_RESEND_SECONDS - $elapsed) . ' seconds before requesting a new code.',
        ];
    }
    return ['allowed' => true];
}

function otpCreateAndSend($conn, $email, $purpose, $recipientName = '')
{
    mailEnsureSchema($conn);
    mailEnsureSettings($conn);

    $email = otpNormalizeEmail($email);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => 'Invalid email address.'];
    }

    $resend = otpCanResend($conn, $email, $purpose);
    if (!$resend['allowed']) {
        return ['success' => false, 'message' => $resend['message'], 'wait_seconds' => $resend['wait']];
    }

    if ($purpose === 'signup') {
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => 'Email is already registered. Please sign in instead.'];
        }
    } elseif ($purpose === 'login') {
        $stmt = $conn->prepare("SELECT id, name, role, is_banned FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            return ['success' => false, 'message' => 'No account found with this email. Please sign up first.'];
        }
        if (isset($user['is_banned']) && (int) $user['is_banned'] === 1) {
            return ['success' => false, 'message' => 'Your account has been restricted. Contact support.'];
        }
        if ($recipientName === '' && !empty($user['name'])) {
            $recipientName = $user['name'];
        }
    } else {
        return ['success' => false, 'message' => 'Invalid OTP purpose.'];
    }

    $code = otpGenerateCode();
    $hash = password_hash($code, PASSWORD_BCRYPT);
    $expires = date('Y-m-d H:i:s', time() + (OTP_EXPIRY_MINUTES * 60));

    $conn->prepare("DELETE FROM email_otps WHERE email = ? AND purpose = ? AND verified_at IS NULL")
        ->execute([$email, $purpose]);

    $stmt = $conn->prepare("INSERT INTO email_otps (email, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)");
    $stmt->execute([$email, $hash, $purpose, $expires]);

    $greeting = $recipientName !== '' ? htmlspecialchars($recipientName, ENT_QUOTES, 'UTF-8') : 'there';
    $purposeLabel = $purpose === 'signup' ? 'account registration' : 'secure sign-in';
    $body = '<p style="margin:0 0 12px;">Hello <strong>' . $greeting . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">We received a request to verify your email for <strong>' . $purposeLabel . '</strong> at FloraElegance.</p>'
        . MailService::otpBlock($code, OTP_EXPIRY_MINUTES);

    $html = MailService::wrapTemplate('Your Verification Code', $body, $conn);
    $subject = $purpose === 'signup'
        ? 'Verify your email — FloraElegance Registration'
        : 'Your sign-in code — FloraElegance';

    if (!MailService::send($email, $subject, $html, null, $conn)) {
        return ['success' => false, 'message' => 'Failed to send OTP email: ' . MailService::getLastError()];
    }

    return [
        'success' => true,
        'message' => 'Verification code sent to your email. Check your inbox (and spam folder).',
        'expires_in' => OTP_EXPIRY_MINUTES * 60,
    ];
}

function otpVerify($conn, $email, $purpose, $code)
{
    mailEnsureSchema($conn);

    $email = otpNormalizeEmail($email);
    $code = trim((string) $code);

    if (!preg_match('/^\d{' . OTP_LENGTH . '}$/', $code)) {
        return ['success' => false, 'message' => 'Enter a valid ' . OTP_LENGTH . '-digit verification code.'];
    }

    $stmt = $conn->prepare("
        SELECT * FROM email_otps
        WHERE email = ? AND purpose = ? AND verified_at IS NULL
        ORDER BY id DESC LIMIT 1
    ");
    $stmt->execute([$email, $purpose]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        return ['success' => false, 'message' => 'No active verification code found. Please request a new one.'];
    }

    if (strtotime($row['expires_at']) < time()) {
        return ['success' => false, 'message' => 'Verification code has expired. Please request a new one.'];
    }

    if ((int) $row['attempts'] >= OTP_MAX_ATTEMPTS) {
        return ['success' => false, 'message' => 'Too many failed attempts. Please request a new code.'];
    }

    if (!password_verify($code, $row['otp_hash'])) {
        $conn->prepare("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?")->execute([$row['id']]);
        $remaining = OTP_MAX_ATTEMPTS - ((int) $row['attempts'] + 1);
        return [
            'success' => false,
            'message' => $remaining > 0
                ? "Invalid verification code. {$remaining} attempt(s) remaining."
                : 'Too many failed attempts. Please request a new code.',
        ];
    }

    $conn->prepare("UPDATE email_otps SET verified_at = NOW() WHERE id = ?")->execute([$row['id']]);

    return ['success' => true, 'message' => 'Email verified successfully.', 'otp_id' => (int) $row['id']];
}

function otpWasRecentlyVerified($conn, $email, $purpose, $withinMinutes = 15)
{
    $email = otpNormalizeEmail($email);
    $stmt = $conn->prepare("
        SELECT id FROM email_otps
        WHERE email = ? AND purpose = ? AND verified_at IS NOT NULL
          AND verified_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ORDER BY verified_at DESC LIMIT 1
    ");
    $stmt->execute([$email, $purpose, $withinMinutes]);
    return (bool) $stmt->fetch();
}
