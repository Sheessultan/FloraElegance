<?php
require_once "../config/db.php";
require_once "../config/jwt.php";
require_once "../config/commerce.php";

commerceEnsureSchema($conn);
$method = $_SERVER['REQUEST_METHOD'];

// Public validate
if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'validate') {
    $code = isset($_GET['code']) ? $_GET['code'] : '';
    $subtotal = isset($_GET['subtotal']) ? floatval($_GET['subtotal']) : 0;
    $result = commerceValidateCoupon($conn, $code, $subtotal);
    if (!$result['valid']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $result['message']]);
        exit();
    }
    echo json_encode([
        'success' => true,
        'message' => $result['message'],
        'data' => [
            'code' => strtoupper(trim($code)),
            'discount' => $result['discount'],
            'discount_type' => $result['coupon']['discount_type'],
            'discount_value' => floatval($result['coupon']['discount_value']),
        ]
    ]);
    exit();
}

$userData = JWT::authenticate();
if (!$userData || $userData['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit();
}

switch ($method) {
    case 'GET':
        $count = (int) $conn->query("SELECT COUNT(*) FROM coupons")->fetchColumn();
        if ($count === 0) {
            $seed = $conn->prepare("INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_discount, is_active) VALUES (?,?,?,?,?,?,1)");
            $seed->execute(['GREEN10', '10% off sitewide promo', 'percent', 10, 499, 500]);
        }
        $stmt = $conn->query("SELECT * FROM coupons ORDER BY id DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $code = strtoupper(trim($input['code'] ?? ''));
        if ($code === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Coupon code is required.']);
            exit();
        }
        $stmt = $conn->prepare("INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_discount, usage_limit, starts_at, expires_at, is_active) VALUES (?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $code,
            $input['description'] ?? null,
            in_array($input['discount_type'] ?? '', ['percent', 'fixed']) ? $input['discount_type'] : 'percent',
            floatval($input['discount_value'] ?? 0),
            floatval($input['min_order'] ?? 0),
            isset($input['max_discount']) && $input['max_discount'] !== '' ? floatval($input['max_discount']) : null,
            isset($input['usage_limit']) && $input['usage_limit'] !== '' ? intval($input['usage_limit']) : null,
            !empty($input['starts_at']) ? $input['starts_at'] : null,
            !empty($input['expires_at']) ? $input['expires_at'] : null,
            isset($input['is_active']) ? (intval($input['is_active']) ? 1 : 0) : 1,
        ]);
        echo json_encode(['success' => true, 'message' => 'Coupon created.', 'id' => $conn->lastInsertId()]);
        break;

    case 'PUT':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Coupon ID required.']);
            exit();
        }
        $input = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, min_order=?, max_discount=?, usage_limit=?, starts_at=?, expires_at=?, is_active=? WHERE id=?");
        $stmt->execute([
            strtoupper(trim($input['code'] ?? '')),
            $input['description'] ?? null,
            in_array($input['discount_type'] ?? '', ['percent', 'fixed']) ? $input['discount_type'] : 'percent',
            floatval($input['discount_value'] ?? 0),
            floatval($input['min_order'] ?? 0),
            isset($input['max_discount']) && $input['max_discount'] !== '' ? floatval($input['max_discount']) : null,
            isset($input['usage_limit']) && $input['usage_limit'] !== '' ? intval($input['usage_limit']) : null,
            !empty($input['starts_at']) ? $input['starts_at'] : null,
            !empty($input['expires_at']) ? $input['expires_at'] : null,
            isset($input['is_active']) ? (intval($input['is_active']) ? 1 : 0) : 1,
            $id,
        ]);
        echo json_encode(['success' => true, 'message' => 'Coupon updated.']);
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Coupon ID required.']);
            exit();
        }
        $conn->prepare("DELETE FROM coupons WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Coupon deleted.']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
}
