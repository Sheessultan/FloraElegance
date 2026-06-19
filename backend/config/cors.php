<?php
// backend/config/cors.php — CORS for split deploy (Cloudflare frontend + Hostinger API)

require_once __DIR__ . '/env.php';

function applyCors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = trim((string) env('ALLOWED_ORIGINS', '*'));

    if ($allowed === '' || $allowed === '*') {
        header('Access-Control-Allow-Origin: *');
    } else {
        $list = array_values(array_filter(array_map('trim', explode(',', $allowed))));
        if ($origin !== '' && in_array($origin, $list, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        } elseif ($origin === '' && count($list) === 1) {
            header('Access-Control-Allow-Origin: ' . $list[0]);
        }
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 3600');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}
