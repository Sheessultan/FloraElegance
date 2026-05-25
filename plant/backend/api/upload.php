<?php
// backend/api/upload.php

// CORS and options headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit();
}

// Check if file is uploaded
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
$fileName = basename($file['name']);
$fileSize = $file['size'];
$fileType = $file['type'];

// Validate file type is image
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($fileType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid file format. Allowed formats: JPG, JPEG, PNG, GIF, WEBP."
    ]);
    exit();
}

// Validate file size (max 5MB)
$maxSize = 5 * 1024 * 1024;
if ($fileSize > $maxSize) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "File is too large. Maximum size allowed is 5MB."
    ]);
    exit();
}

// Ensure uploads folder exists
$uploadDir = __DIR__ . '/../uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate secure unique filename
$ext = pathinfo($fileName, PATHINFO_EXTENSION);
$uniqueName = uniqid('img_', true) . '.' . $ext;
$destination = $uploadDir . $uniqueName;

if (move_uploaded_file($tempPath, $destination)) {
    // Public URL: /.../backend/uploads/ — derived from script path so it works outside /plant/
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $backendBase = dirname($script);            // .../backend/api
    $backendBase = dirname($backendBase);       // .../backend
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
