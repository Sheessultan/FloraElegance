<?php
// SMTP mail service + HTML templates (no Composer dependency)

require_once __DIR__ . '/env.php';

class MailService
{
    private static $lastError = '';

    public static function getLastError()
    {
        return self::$lastError;
    }

    /** @return array<string, mixed> */
    public static function getConfig($conn = null)
    {
        $settings = [];
        if ($conn) {
            try {
                $stmt = $conn->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'smtp_%' OR setting_key LIKE 'email_%' OR setting_key IN ('contact_email','invoice_company_name')");
                $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
            } catch (PDOException $e) { /* defaults */ }
        }

        return [
            'enabled' => self::pick($settings, 'smtp_enabled', env('SMTP_ENABLED', '1')) === '1',
            'host' => self::pick($settings, 'smtp_host', env('SMTP_HOST', 'smtp.hostinger.com')),
            'port' => (int) self::pick($settings, 'smtp_port', env('SMTP_PORT', '587')),
            'encryption' => strtolower(self::pick($settings, 'smtp_encryption', env('SMTP_ENCRYPTION', 'tls'))),
            'username' => self::pick($settings, 'smtp_username', env('SMTP_USER', '')),
            'password' => self::pick($settings, 'smtp_password', env('SMTP_PASS', '')),
            'from_email' => self::pick($settings, 'smtp_from_email', env('SMTP_FROM_EMAIL', env('SMTP_USER', 'noreply@floraelegance.com'))),
            'from_name' => self::pick($settings, 'smtp_from_name', env('SMTP_FROM_NAME', 'FloraElegance')),
            'reply_to' => self::pick($settings, 'smtp_reply_to', env('SMTP_REPLY_TO', '')),
            'admin_email' => self::pick($settings, 'contact_email', env('ADMIN_EMAIL', 'support@floraelegance.com')),
            'brand_name' => self::pick($settings, 'invoice_company_name', 'FloraElegance'),
        ];
    }

    private static function pick($settings, $key, $default)
    {
        if (isset($settings[$key]) && $settings[$key] !== '') {
            return $settings[$key];
        }
        return $default;
    }

    public static function isConfigured($conn = null)
    {
        $cfg = self::getConfig($conn);
        return $cfg['enabled'] && $cfg['host'] !== '' && $cfg['username'] !== '' && $cfg['password'] !== '' && $cfg['from_email'] !== '';
    }

    public static function send($to, $subject, $htmlBody, $textBody = null, $conn = null)
    {
        self::$lastError = '';
        $to = trim((string) $to);
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            self::$lastError = 'Invalid recipient email.';
            return false;
        }

        $cfg = self::getConfig($conn);
        if (!$cfg['enabled']) {
            self::$lastError = 'Email notifications are disabled.';
            return false;
        }
        if ($cfg['host'] === '' || $cfg['username'] === '' || $cfg['password'] === '') {
            self::$lastError = 'SMTP is not configured. Add credentials in Admin → Settings → Email & SMTP.';
            return false;
        }

        $textBody = $textBody ?: strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</tr>'], "\n", $htmlBody));
        $fromEmail = $cfg['from_email'];
        $fromName = $cfg['from_name'];
        $replyTo = $cfg['reply_to'] !== '' ? $cfg['reply_to'] : $fromEmail;

        try {
            $smtp = new SmtpTransport($cfg);
            return $smtp->send($fromEmail, $fromName, $to, $replyTo, $subject, $htmlBody, $textBody);
        } catch (Exception $e) {
            self::$lastError = $e->getMessage();
            return false;
        }
    }

    public static function wrapTemplate($title, $bodyHtml, $conn = null, $footerNote = '')
    {
        $cfg = self::getConfig($conn);
        $brand = htmlspecialchars($cfg['brand_name'], ENT_QUOTES, 'UTF-8');
        $year = date('Y');
        $footer = $footerNote !== ''
            ? htmlspecialchars($footerNote, ENT_QUOTES, 'UTF-8')
            : 'This is an automated message from ' . $brand . '. Please do not reply directly unless instructed.';

        return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
            . '<body style="margin:0;padding:0;background:#f1f5f9;font-family:DM Sans,Segoe UI,Arial,sans-serif;color:#0f172a;">'
            . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center">'
            . '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);">'
            . '<tr><td style="background:linear-gradient(135deg,#15803d,#16a34a);padding:28px 32px;text-align:center;">'
            . '<div style="font-size:28px;line-height:1;">🌿</div>'
            . '<h1 style="margin:12px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1>'
            . '<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">' . $brand . '</p>'
            . '</td></tr>'
            . '<tr><td style="padding:32px;font-size:15px;line-height:1.65;color:#334155;">' . $bodyHtml . '</td></tr>'
            . '<tr><td style="padding:20px 32px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;line-height:1.5;">'
            . '<p style="margin:0 0 8px;">' . $footer . '</p>'
            . '<p style="margin:0;">&copy; ' . $year . ' ' . $brand . '. All rights reserved.</p>'
            . '</td></tr></table></td></tr></table></body></html>';
    }

    public static function otpBlock($otp, $minutes = 10)
    {
        $otp = htmlspecialchars($otp, ENT_QUOTES, 'UTF-8');
        return '<p style="margin:0 0 16px;">Use the verification code below to continue. This code expires in <strong>' . (int) $minutes . ' minutes</strong>.</p>'
            . '<div style="text-align:center;margin:28px 0;">'
            . '<span style="display:inline-block;background:#f0fdf4;border:2px dashed #16a34a;border-radius:16px;padding:18px 36px;font-size:32px;font-weight:800;letter-spacing:10px;color:#15803d;">' . $otp . '</span>'
            . '</div>'
            . '<p style="margin:0;font-size:13px;color:#64748b;">If you did not request this code, you can safely ignore this email. Never share your OTP with anyone.</p>';
    }

    public static function button($label, $url)
    {
        $label = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
        $url = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
        return '<p style="text-align:center;margin:28px 0;">'
            . '<a href="' . $url . '" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">' . $label . '</a>'
            . '</p>';
    }

    public static function infoRow($label, $value)
    {
        return '<tr>'
            . '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;width:38%;">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">' . htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8') . '</td>'
            . '</tr>';
    }
}

class SmtpTransport
{
    private $cfg;
    private $socket;

    public function __construct(array $cfg)
    {
        $this->cfg = $cfg;
    }

    public function send($fromEmail, $fromName, $to, $replyTo, $subject, $htmlBody, $textBody)
    {
        $host = $this->cfg['host'];
        $port = (int) $this->cfg['port'];
        $enc = $this->cfg['encryption'];

        $remote = ($enc === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
        $this->socket = @stream_socket_client($remote, $errno, $errstr, 30, STREAM_CLIENT_CONNECT);
        if (!$this->socket) {
            throw new Exception("SMTP connection failed: {$errstr} ({$errno})");
        }
        stream_set_timeout($this->socket, 30);

        $this->expect(220);
        $this->cmd('EHLO floraelegance.local', 250);

        if ($enc === 'tls') {
            $this->cmd('STARTTLS', 220);
            if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception('SMTP STARTTLS negotiation failed.');
            }
            $this->cmd('EHLO floraelegance.local', 250);
        }

        $this->cmd('AUTH LOGIN', 334);
        $this->cmd(base64_encode($this->cfg['username']), 334);
        $this->cmd(base64_encode($this->cfg['password']), 235);

        $this->cmd('MAIL FROM:<' . $fromEmail . '>', 250);
        $this->cmd('RCPT TO:<' . $to . '>', 250);
        $this->cmd('DATA', 354);

        $boundary = 'fe_' . bin2hex(random_bytes(8));
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $fromHeader = 'From: ' . $this->encodeAddress($fromName, $fromEmail);
        $replyHeader = 'Reply-To: ' . $replyTo;
        $headers = [
            'MIME-Version: 1.0',
            $fromHeader,
            $replyHeader,
            'To: ' . $to,
            'Subject: ' . $encodedSubject,
            'Date: ' . date('r'),
            'Message-ID: <' . time() . '.' . bin2hex(random_bytes(6)) . '@floraelegance>',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];

        $body = "--{$boundary}\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($textBody)) . "\r\n"
            . "--{$boundary}\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($htmlBody)) . "\r\n"
            . "--{$boundary}--";

        $payload = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.";
        fwrite($this->socket, $payload . "\r\n");
        $this->expect(250);
        $this->cmd('QUIT', 221);
        fclose($this->socket);
        return true;
    }

    private function encodeAddress($name, $email)
    {
        if ($name === '') {
            return $email;
        }
        return '=?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>';
    }

    private function cmd($command, $expectCode)
    {
        fwrite($this->socket, $command . "\r\n");
        $this->expect($expectCode);
    }

    private function expect($code)
    {
        $response = '';
        while ($line = fgets($this->socket, 515)) {
            $response .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        if ((int) substr($response, 0, 3) !== (int) $code) {
            throw new Exception('SMTP error: ' . trim($response));
        }
    }
}

function mailEnsureSchema($conn)
{
    try {
        $conn->exec("CREATE TABLE IF NOT EXISTS email_otps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            purpose ENUM('signup','login') NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            expires_at DATETIME NOT NULL,
            verified_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email_otp_lookup (email, purpose, expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        try {
            $conn->exec("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0");
        } catch (PDOException $e) { /* exists */ }
    } catch (PDOException $e) { /* ignore */ }
}

function mailEnsureSettings($conn)
{
    $defaults = [
        'smtp_enabled' => '1',
        'smtp_host' => env('SMTP_HOST', 'smtp.hostinger.com'),
        'smtp_port' => env('SMTP_PORT', '587'),
        'smtp_encryption' => env('SMTP_ENCRYPTION', 'tls'),
        'smtp_username' => env('SMTP_USER', ''),
        'smtp_password' => env('SMTP_PASS', ''),
        'smtp_from_email' => env('SMTP_FROM_EMAIL', env('SMTP_USER', '')),
        'smtp_from_name' => env('SMTP_FROM_NAME', 'FloraElegance'),
        'smtp_reply_to' => env('SMTP_REPLY_TO', ''),
        'email_notify_orders' => '1',
        'email_notify_inquiries' => '1',
        'email_notify_reviews' => '1',
        'email_notify_admin' => '1',
        'email_notify_status' => '1',
        'email_notify_tracking' => '1',
        'email_notify_security' => '1',
    ];
    foreach ($defaults as $key => $value) {
        try {
            $stmt = $conn->prepare("INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)");
            $stmt->execute([$key, $value]);
        } catch (PDOException $e) { /* table missing */ }
    }
}
