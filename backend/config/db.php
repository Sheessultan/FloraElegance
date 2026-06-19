<?php
// backend/config/db.php

require_once __DIR__ . '/cors.php';
applyCors();
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/env.php';

$host = env('DB_HOST', 'localhost');
$db_name = env('DB_NAME', 'plant_db');
$username = env('DB_USER', 'root');
$password = env('DB_PASS', '');


try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $exception) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $exception->getMessage()
    ]);
    exit();
}
?>
