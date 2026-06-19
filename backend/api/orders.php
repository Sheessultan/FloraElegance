<?php
// backend/api/orders.php

require_once "../config/db.php";
require_once "../config/jwt.php";
require_once "../config/commerce.php";

// Razorpay Credentials - Safely loaded from environment variables
define('RAZORPAY_KEY_ID', env('RAZORPAY_KEY_ID', 'rzp_test_w3hP8z2jN1245A')); 
define('RAZORPAY_KEY_SECRET', env('RAZORPAY_KEY_SECRET', 'secret_key_from_razorpay')); 


$userData = JWT::authenticate();
if (!$userData) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please log in first."
    ]);
    exit();
}

$userId = isset($userData['id']) ? (int) $userData['id'] : 0;
if ($userId <= 0) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Invalid session. Please log in again."
    ]);
    exit();
}
$method = $_SERVER['REQUEST_METHOD'];

commerceEnsureSchema($conn);

// Self-healing: payment & tracking columns
try {
    $colChecks = [
        'payment_method' => "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'online'",
        'tracking_number' => "ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL",
        'tracking_carrier' => "ALTER TABLE orders ADD COLUMN tracking_carrier VARCHAR(80) DEFAULT NULL",
        'tracking_status' => "ALTER TABLE orders ADD COLUMN tracking_status VARCHAR(80) DEFAULT NULL",
        'tracking_updated_at' => "ALTER TABLE orders ADD COLUMN tracking_updated_at TIMESTAMP NULL DEFAULT NULL",
    ];
    foreach ($colChecks as $sql) {
        try { $conn->exec($sql); } catch (PDOException $e) { /* column exists */ }
    }
} catch (PDOException $e) { /* ignore */ }

function ordersDateRangeClause($range) {
    switch ($range) {
        case 'today':
            return " AND DATE(o.created_at) = CURDATE() ";
        case 'last_7':
            return " AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ";
        case 'this_month':
            return " AND YEAR(o.created_at) = YEAR(CURDATE()) AND MONTH(o.created_at) = MONTH(CURDATE()) ";
        case 'last_month':
            return " AND YEAR(o.created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(o.created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) ";
        case 'this_year':
            return " AND YEAR(o.created_at) = YEAR(CURDATE()) ";
        case 'last_year':
            return " AND YEAR(o.created_at) = YEAR(CURDATE()) - 1 ";
        default:
            return '';
    }
}

function getCodSettings($conn) {
    $enabled = true;
    $minOrder = 0.0;
    try {
        $stmt = $conn->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('cod_enabled','cod_min_order')");
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        if (isset($rows['cod_enabled'])) {
            $enabled = ($rows['cod_enabled'] === '1' || $rows['cod_enabled'] === 1);
        }
        if (isset($rows['cod_min_order'])) {
            $minOrder = floatval($rows['cod_min_order']);
        }
    } catch (PDOException $e) { /* defaults */ }
    return ['enabled' => $enabled, 'min_order' => $minOrder];
}

switch ($method) {
    case 'GET':
        try {
            // Check if user is fetching a specific order details
            if (isset($_GET['id'])) {
                $orderId = intval($_GET['id']);
                
                // If customer, ensure they own the order
                if ($userData['role'] !== 'admin') {
                    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
                    $stmt->execute([$orderId, $userId]);
                } else {
                    $stmt = $conn->prepare("SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?");
                    $stmt->execute([$orderId]);
                }
                
                $order = $stmt->fetch();
                if (!$order) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Order not found."]);
                    exit();
                }

                // Fetch order items
                $itemStmt = $conn->prepare("
                    SELECT oi.*, p.name, p.image_url, p.size 
                    FROM order_items oi 
                    JOIN products p ON oi.product_id = p.id 
                    WHERE oi.order_id = ?
                ");
                $itemStmt->execute([$orderId]);
                $order['items'] = $itemStmt->fetchAll();

                echo json_encode(["success" => true, "data" => $order]);
                exit();
            }

            // Fetch orders list
            if ($userData['role'] === 'admin') {
                $sql = "
                    SELECT o.*, u.name as customer_name,
                    (SELECT COUNT(*) FROM orders o2 WHERE o2.user_id = o.user_id) AS customer_order_count
                    FROM orders o 
                    JOIN users u ON o.user_id = u.id 
                    WHERE 1=1
                ";
                $params = [];

                if (!empty($_GET['status'])) {
                    $sql .= " AND o.status = ? ";
                    $params[] = $_GET['status'];
                }
                if (!empty($_GET['date_range']) && $_GET['date_range'] !== 'all') {
                    $sql .= ordersDateRangeClause($_GET['date_range']);
                }
                if (isset($_GET['min_price']) && $_GET['min_price'] !== '') {
                    $sql .= " AND o.total_amount >= ? ";
                    $params[] = floatval($_GET['min_price']);
                }
                if (isset($_GET['max_price']) && $_GET['max_price'] !== '') {
                    $sql .= " AND o.total_amount <= ? ";
                    $params[] = floatval($_GET['max_price']);
                }
                if (!empty($_GET['payment']) && $_GET['payment'] === 'cod') {
                    $sql .= " AND o.payment_method = 'cod' ";
                }
                if (!empty($_GET['payment']) && $_GET['payment'] === 'online') {
                    $sql .= " AND (o.payment_method IS NULL OR o.payment_method = '' OR o.payment_method = 'online') ";
                }
                if (!empty($_GET['payment']) && $_GET['payment'] === 'failed_tx') {
                    $sql .= " AND o.status = 'failed' ";
                }
                if (!empty($_GET['search'])) {
                    $search = trim($_GET['search']);
                    $orderId = null;
                    if (preg_match('/ORD-0*(\d+)/i', $search, $m)) {
                        $orderId = intval($m[1]);
                    } elseif (ctype_digit($search)) {
                        $orderId = intval($search);
                    }
                    if ($orderId !== null) {
                        $sql .= " AND o.id = ? ";
                        $params[] = $orderId;
                    } else {
                        $sql .= " AND (u.name LIKE ? OR o.name LIKE ? OR o.email LIKE ?) ";
                        $like = '%' . $search . '%';
                        $params[] = $like;
                        $params[] = $like;
                        $params[] = $like;
                    }
                }

                $sql .= " ORDER BY o.id DESC ";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
            } else {
                // Customers can only view their own orders
                $stmt = $conn->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC");
                $stmt->execute([$userId]);
            }

            $orders = $stmt->fetchAll();
            echo json_encode([
                "success" => true,
                "data" => $orders
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error retrieving orders: " . $e->getMessage()
            ]);
        }
        break;

    case 'POST':
        // Handle Payment Signature Verification
        if (isset($_GET['action']) && $_GET['action'] === 'verify') {
            $input = json_decode(file_get_contents("php://input"), true);
            if (empty($input['razorpay_order_id']) || empty($input['razorpay_payment_id']) || empty($input['order_id'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Missing payment credentials."]);
                exit();
            }

            $orderId = intval($input['order_id']);
            $razorpayOrderId = $input['razorpay_order_id'];
            $razorpayPaymentId = $input['razorpay_payment_id'];
            $razorpaySignature = isset($input['razorpay_signature']) ? $input['razorpay_signature'] : '';

            $banMsg = commerceIsUserBanned($conn, $userId);
            if ($banMsg) {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => $banMsg]);
                exit();
            }

            // Load order and ensure it belongs to this user, is online, and matches Razorpay order id
            $orderStmt = $conn->prepare("SELECT id, razorpay_order_id, payment_method, status, coupon_id FROM orders WHERE id = ? AND user_id = ?");
            $orderStmt->execute([$orderId, $userId]);
            $orderRow = $orderStmt->fetch();

            if (!$orderRow || $orderRow['status'] !== 'pending') {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Order could not be confirmed. It may not exist, already be paid, or belong to another account."]);
                exit();
            }

            if ($orderRow['payment_method'] !== 'online') {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "This order does not use online payment."]);
                exit();
            }

            if (empty($orderRow['razorpay_order_id']) || $orderRow['razorpay_order_id'] !== $razorpayOrderId) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Payment does not match this order."]);
                exit();
            }

            $signatureValid = false;

            // Mock signature only for server-generated mock Razorpay orders (never for real order_xxx ids)
            if ($razorpaySignature === 'MOCK_PAYMENT_SIGNATURE') {
                $allowMock = env('ALLOW_MOCK_PAYMENTS', '0') === '1' || strpos(RAZORPAY_KEY_ID, 'rzp_test_') === 0;
                if ($allowMock && strpos($razorpayOrderId, 'order_mock_') === 0) {
                    $signatureValid = true;
                }
            } else {
                $payload = $razorpayOrderId . "|" . $razorpayPaymentId;
                $generatedSignature = hash_hmac('sha256', $payload, RAZORPAY_KEY_SECRET);

                if (hash_equals($generatedSignature, $razorpaySignature)) {
                    $signatureValid = true;
                }
            }

            if ($signatureValid) {
                try {
                    $conn->beginTransaction();

                    $updateStmt = $conn->prepare("
                        UPDATE orders 
                        SET status = 'paid', razorpay_payment_id = ?, razorpay_signature = ? 
                        WHERE id = ? AND user_id = ? AND status = 'pending' AND payment_method = 'online'
                    ");
                    $updateStmt->execute([$razorpayPaymentId, $razorpaySignature, $orderId, $userId]);

                    if ($updateStmt->rowCount() !== 1) {
                        $conn->rollBack();
                        http_response_code(400);
                        echo json_encode([
                            "success" => false,
                            "message" => "Order could not be confirmed. It may have already been processed."
                        ]);
                        exit();
                    }

                    $itemsStmt = $conn->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                    $itemsStmt->execute([$orderId]);
                    $items = $itemsStmt->fetchAll();

                    foreach ($items as $item) {
                        $stockStmt = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");
                        $stockStmt->execute([$item['quantity'], $item['product_id'], $item['quantity']]);
                        if ($stockStmt->rowCount() !== 1) {
                            throw new Exception("Insufficient stock for one or more items.");
                        }
                    }

                    if (!empty($orderRow['coupon_id'])) {
                        $conn->prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?")->execute([intval($orderRow['coupon_id'])]);
                    }

                    $clearStmt = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
                    $clearStmt->execute([$userId]);

                    $conn->commit();
                    echo json_encode([
                        "success" => true,
                        "message" => "Payment verified and order placed successfully!"
                    ]);
                } catch (Exception $e) {
                    if ($conn->inTransaction()) $conn->rollBack();
                    http_response_code(500);
                    echo json_encode(["success" => false, "message" => "Transaction error: " . $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Payment signature verification failed. Potential tampering."
                ]);
            }
            exit();
        }

        // Bulk status update (admin)
        if (isset($_GET['action']) && $_GET['action'] === 'bulk_update') {
            if ($userData['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "Access denied. Admins only."]);
                exit();
            }
            $input = json_decode(file_get_contents("php://input"), true);
            $orderIds = isset($input['order_ids']) && is_array($input['order_ids']) ? $input['order_ids'] : [];
            $status = isset($input['status']) ? $input['status'] : '';
            $validStatuses = ['pending', 'paid', 'failed', 'shipped', 'delivered'];
            if (empty($orderIds) || !in_array($status, $validStatuses)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Invalid bulk update payload."]);
                exit();
            }
            try {
                $conn->beginTransaction();
                $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $updated = 0;
                foreach ($orderIds as $oid) {
                    $oid = intval($oid);
                    if ($oid <= 0) continue;
                    $stmt->execute([$status, $oid]);
                    $updated += $stmt->rowCount();
                }
                $conn->commit();
                echo json_encode([
                    "success" => true,
                    "message" => "Updated {$updated} order(s) to {$status}.",
                    "updated" => $updated
                ]);
            } catch (PDOException $e) {
                $conn->rollBack();
                http_response_code(500);
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
            exit();
        }

        // Update delivery tracking (admin)
        if (isset($_GET['action']) && $_GET['action'] === 'update_tracking') {
            if ($userData['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "Access denied. Admins only."]);
                exit();
            }
            $input = json_decode(file_get_contents("php://input"), true);
            $orderId = isset($input['order_id']) ? intval($input['order_id']) : 0;
            if ($orderId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Order ID required."]);
                exit();
            }
            try {
                $stmt = $conn->prepare("
                    UPDATE orders SET 
                        tracking_number = ?,
                        tracking_carrier = ?,
                        tracking_status = ?,
                        tracking_updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([
                    isset($input['tracking_number']) ? trim($input['tracking_number']) : null,
                    isset($input['tracking_carrier']) ? trim($input['tracking_carrier']) : null,
                    isset($input['tracking_status']) ? trim($input['tracking_status']) : null,
                    $orderId
                ]);
                echo json_encode(["success" => true, "message" => "Tracking details saved."]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
            exit();
        }

        // Handle Admin Updating Order Status
        if (isset($_GET['action']) && $_GET['action'] === 'update_status') {
            if ($userData['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "Access denied. Admins only."]);
                exit();
            }

            $input = json_decode(file_get_contents("php://input"), true);
            $orderId = isset($input['order_id']) ? intval($input['order_id']) : 0;
            $status = isset($input['status']) ? $input['status'] : '';

            $validStatuses = ['pending', 'paid', 'failed', 'shipped', 'delivered'];
            if ($orderId <= 0 || !in_array($status, $validStatuses)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Invalid order ID or status."]);
                exit();
            }

            try {
                $conn->beginTransaction();
                $prevStmt = $conn->prepare("SELECT status, payment_method FROM orders WHERE id = ?");
                $prevStmt->execute([$orderId]);
                $prev = $prevStmt->fetch();

                $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $stmt->execute([$status, $orderId]);

                // Decrement stock when COD moves to paid (cash collected)
                if ($prev && $prev['payment_method'] === 'cod' && $prev['status'] === 'pending' && $status === 'paid') {
                    $itemsStmt = $conn->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                    $itemsStmt->execute([$orderId]);
                    foreach ($itemsStmt->fetchAll() as $item) {
                        $stockStmt = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");
                        $stockStmt->execute([$item['quantity'], $item['product_id'], $item['quantity']]);
                    }
                }

                $conn->commit();
                echo json_encode(["success" => true, "message" => "Order status updated to " . $status]);
            } catch (PDOException $e) {
                if ($conn->inTransaction()) $conn->rollBack();
                http_response_code(500);
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
            exit();
        }

        // 2. Create Order & Generate Razorpay Order ID (or COD)
        $input = json_decode(file_get_contents("php://input"), true);
        if (empty($input['name']) || empty($input['email']) || empty($input['phone']) || empty($input['address']) || empty($input['city']) || empty($input['zip'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "All shipping details are required."]);
            exit();
        }

        $banMsg = commerceIsUserBanned($conn, $userId);
        if ($banMsg) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => $banMsg]);
            exit();
        }

        try {
            $conn->beginTransaction();

            // Ensure the authenticated user exists (stale JWT / deleted account)
            $userCheck = $conn->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
            $userCheck->execute([$userId]);
            if (!$userCheck->fetch()) {
                throw new Exception("Your account was not found. Please log out and sign in again.");
            }

            // Fetch cart items to calculate server-verified total (security best practice)
            $cartStmt = $conn->prepare("
                SELECT c.product_id, c.quantity, p.price, p.selling_price, p.stock, p.name 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ? AND COALESCE(p.is_active, 1) = 1
            ");
            $cartStmt->execute([$userId]);
            $cartItems = $cartStmt->fetchAll();

            if (empty($cartItems)) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Your cart is empty."]);
                exit();
            }

            $subtotal = 0.00;
            $itemsWithActivePrice = [];
            foreach ($cartItems as $item) {
                if ($item['stock'] < $item['quantity']) {
                    throw new Exception("Product " . $item['name'] . " does not have enough stock. Remaining: " . $item['stock']);
                }
                $activePrice = ($item['selling_price'] && floatval($item['selling_price']) > 0 && floatval($item['selling_price']) < floatval($item['price'])) ? floatval($item['selling_price']) : floatval($item['price']);
                $subtotal += $activePrice * intval($item['quantity']);
                $itemsWithActivePrice[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $activePrice
                ];
            }

            $paymentMethod = (isset($input['payment_method']) && $input['payment_method'] === 'cod') ? 'cod' : 'online';
            $commerceSettings = commerceGetSettings($conn);
            $shippingResult = commerceCalcShipping($subtotal, $commerceSettings, $paymentMethod);
            if (!empty($shippingResult['error'])) {
                throw new Exception($shippingResult['error']);
            }
            $shippingAmount = floatval($shippingResult['amount']);

            $discountAmount = 0.0;
            $couponId = null;
            $couponCode = null;
            if (!empty($input['coupon_code'])) {
                $couponCheck = commerceValidateCoupon($conn, $input['coupon_code'], $subtotal, $userId);
                if (!$couponCheck['valid']) {
                    throw new Exception($couponCheck['message']);
                }
                $discountAmount = floatval($couponCheck['discount']);
                $couponId = (int) $couponCheck['coupon']['id'];
                $couponCode = strtoupper(trim($input['coupon_code']));
            }

            $totalAmount = max(0, round($subtotal + $shippingAmount - $discountAmount, 2));

            if ($paymentMethod === 'cod') {
                $codSettings = getCodSettings($conn);
                if (!$codSettings['enabled']) {
                    throw new Exception("Cash on Delivery is currently disabled.");
                }
                if ($totalAmount < $codSettings['min_order']) {
                    throw new Exception("Minimum order for COD is ₹" . number_format($codSettings['min_order'], 0) . ".");
                }
            }

            // Create pending order record in Database
            $insertOrderStmt = $conn->prepare("
                INSERT INTO orders (user_id, total_amount, subtotal, shipping_amount, discount_amount, coupon_code, coupon_id, status, name, email, phone, address, city, zip, payment_method) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
            ");
            $insertOrderStmt->execute([
                $userId,
                $totalAmount,
                $subtotal,
                $shippingAmount,
                $discountAmount,
                $couponCode,
                $couponId,
                trim($input['name']),
                trim($input['email']),
                trim($input['phone']),
                trim($input['address']),
                trim($input['city']),
                trim($input['zip']),
                $paymentMethod
            ]);

            // Capture order id immediately after insert (before any other queries)
            $orderId = (int) $conn->lastInsertId();
            if ($orderId <= 0) {
                throw new Exception("Could not create order record. Please try again.");
            }

            // Insert order items
            $insertItemStmt = $conn->prepare("
                INSERT INTO order_items (order_id, product_id, quantity, price) 
                VALUES (?, ?, ?, ?)
            ");
            foreach ($itemsWithActivePrice as $item) {
                $insertItemStmt->execute([
                    $orderId,
                    (int) $item['product_id'],
                    (int) $item['quantity'],
                    $item['price']
                ]);
            }

            if ($couponId && $paymentMethod === 'cod') {
                $conn->prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?")->execute([$couponId]);
            }

            // COD: skip gateway, clear cart, return success
            if ($paymentMethod === 'cod') {
                $clearStmt = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
                $clearStmt->execute([$userId]);
                $conn->commit();
                echo json_encode([
                    "success" => true,
                    "message" => "COD order placed successfully. Pay when your plants arrive.",
                    "order_id" => $orderId,
                    "amount" => $totalAmount,
                    "subtotal" => $subtotal,
                    "shipping_amount" => $shippingAmount,
                    "discount_amount" => $discountAmount,
                    "payment_method" => "cod",
                    "is_cod" => true
                ]);
                exit();
            }

            // 3. Initiate Razorpay order via cURL
            $razorpayOrderId = '';
            $amountInPaise = intval($totalAmount * 100);

            // Attempt to hit Razorpay API
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/orders');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_POST, 1);
            
            $payloadData = json_encode([
                "amount" => $amountInPaise,
                "currency" => "INR",
                "receipt" => "rcpt_order_" . $orderId,
                "payment_capture" => 1
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadData);
            curl_setopt($ch, CURLOPT_USERPWD, RAZORPAY_KEY_ID . ':' . RAZORPAY_KEY_SECRET);
            
            $headers = array();
            $headers[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            
            $response = curl_exec($ch);
            $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $responseData = json_decode($response, true);

            if ($httpcode === 200 && isset($responseData['id'])) {
                $razorpayOrderId = $responseData['id'];
            } else {
                $allowMock = env('ALLOW_MOCK_PAYMENTS', '0') === '1' || strpos(RAZORPAY_KEY_ID, 'rzp_test_') === 0;
                if (!$allowMock) {
                    throw new Exception("Payment gateway is unavailable. Please try again later or choose Cash on Delivery.");
                }
                $razorpayOrderId = 'order_mock_' . bin2hex(random_bytes(8));
            }

            // Save Razorpay order ID in DB
            $updateOrderStmt = $conn->prepare("UPDATE orders SET razorpay_order_id = ? WHERE id = ?");
            $updateOrderStmt->execute([$razorpayOrderId, $orderId]);

            $conn->commit();

            echo json_encode([
                "success" => true,
                "message" => "Order generated successfully.",
                "order_id" => $orderId,
                "razorpay_order_id" => $razorpayOrderId,
                "amount" => $totalAmount,
                "subtotal" => $subtotal,
                "shipping_amount" => $shippingAmount,
                "discount_amount" => $discountAmount,
                "currency" => "INR",
                "key_id" => RAZORPAY_KEY_ID,
                "name" => trim($input['name']),
                "email" => trim($input['email']),
                "phone" => trim($input['phone']),
                "is_mock" => (strpos($razorpayOrderId, 'order_mock_') === 0)
            ]);

        } catch (Exception $e) {
            $conn->rollBack();
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Failed to initiate order checkout: " . $e->getMessage()
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "Method " . $method . " not allowed."
        ]);
}
?>
