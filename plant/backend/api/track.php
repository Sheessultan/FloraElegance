<?php
// backend/api/track.php — public order tracking (no login required)

require_once "../config/db.php";

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit();
}

$orderInput = isset($_GET['order']) ? trim($_GET['order']) : '';
$email = isset($_GET['email']) ? trim($_GET['email']) : '';

if ($orderInput === '' || $email === '') {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Order ID and email are required to track your package."
    ]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
    exit();
}

$orderId = 0;
if (preg_match('/ORD-0*(\d+)/i', $orderInput, $m)) {
    $orderId = intval($m[1]);
} elseif (ctype_digit($orderInput)) {
    $orderId = intval($orderInput);
}

if ($orderId <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid order ID. Use format ORD-000123 or your order number."
    ]);
    exit();
}

try {
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND LOWER(email) = LOWER(?)");
    $stmt->execute([$orderId, $email]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "No order found. Check your Order ID and email match your checkout details."
        ]);
        exit();
    }

    $itemStmt = $conn->prepare("
        SELECT oi.product_id, oi.quantity, oi.price, p.name, p.image_url, p.size
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    ");
    $itemStmt->execute([$orderId]);
    $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

    // Do not expose payment secrets to public tracker
    unset($order['razorpay_signature']);
    if (!empty($order['razorpay_payment_id'])) {
        $order['razorpay_payment_id'] = substr($order['razorpay_payment_id'], 0, 8) . '••••';
    }

    $order['order_number'] = 'ORD-' . str_pad($order['id'], 6, '0', STR_PAD_LEFT);

    echo json_encode([
        "success" => true,
        "data" => $order
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to load tracking information. Please try again."
    ]);
}
