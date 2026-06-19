<?php
// backend/config/jwt.php

class JWT {
    // Secret key helper
    private static function getSecret() {
        require_once __DIR__ . "/env.php";
        $secret = env('JWT_SECRET', '');
        if ($secret === '' || $secret === 'ugaoo_premium_gardening_secret_key_987654321') {
            return 'ugaoo_premium_gardening_secret_key_987654321';
        }
        return $secret;
    }

    /**
     * Encode payload into a JWT
     */
    public static function encode($payload) {
        $header = json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    /**
     * Decode and verify a JWT. Returns payload array on success, false on failure.
     */
    public static function decode($jwt) {
        $tokenParts = explode('.', $jwt);
        if (count($tokenParts) !== 3) {
            return false;
        }

        $base64UrlHeader = $tokenParts[0];
        $base64UrlPayload = $tokenParts[1];
        $signatureProvided = $tokenParts[2];

        // Recalculate signature to verify
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        // Verify signature integrity
        if (!hash_equals($base64UrlSignature, $signatureProvided)) {
            return false;
        }

        $payload = json_decode(base64_decode(self::base64UrlDecode($base64UrlPayload)), true);

        // Check if token has expired
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false; // Token expired
        }

        return $payload;
    }

    /**
     * Helper to get JWT token from Authorization header and authenticate user
     */
    public static function authenticate() {
        $authHeader = '';

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $name => $value) {
                    if (strcasecmp($name, 'Authorization') === 0) {
                        $authHeader = $value;
                        break;
                    }
                }
            }
        }

        if ($authHeader === '' && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if ($authHeader === '' && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if ($authHeader === '') {
            return false;
        }

        // Bearer <token>
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $jwt = $matches[1];
            return self::decode($jwt);
        }

        return false;
    }

    private static function base64UrlEncode($text) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
    }

    private static function base64UrlDecode($text) {
        $base64 = str_replace(['-', '_'], ['+', '/'], $text);
        $padding = strlen($base64) % 4;
        if ($padding) {
            $base64 .= str_repeat('=', 4 - $padding);
        }
        return $base64;
    }
}
?>
