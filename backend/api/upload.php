<?php
// backend/api/upload.php

require_once '../config/cors.php';
require_once '../config/jwt.php';
applyCors();
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit();
}

$userData = JWT::authenticate();
if (!$userData) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please log in to upload images."
    ]);
    exit();
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "No image file uploaded or upload error occurred."
    ]);
    exit();
}

$file = $_FILES['image'];
$tempPath = $file['tmp_name'];
$fileSize = $file['size'];

$maxSize = 5 * 1024 * 1024;
if ($fileSize > $maxSize) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "File is too large. Maximum size allowed is 5MB."
    ]);
    exit();
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedType = finfo_file($finfo, $tempPath);
finfo_close($finfo);

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
];

if (!isset($allowedTypes[$detectedType])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid file format. Allowed formats: JPG, JPEG, PNG, GIF, WEBP."
    ]);
    exit();
}

$uploadDir = __DIR__ . '/../uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext = $allowedTypes[$detectedType];
$uniqueName = uniqid('img_', true) . '.' . $ext;
$destination = $uploadDir . $uniqueName;

if (move_uploaded_file($tempPath, $destination)) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $backendBase = dirname(dirname($script));
    $publicPath = rtrim($backendBase, '/') . '/uploads/' . $uniqueName;
    $baseUrl = $protocol . '://' . $host . $publicPath;

    echo json_encode([
        "success" => true,
        "message" => "File uploaded successfully.",
        "url" => $baseUrl
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to save uploaded file."
    ]);
}
?>
