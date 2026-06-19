<?php
require_once "../config/db.php";
require_once "../config/jwt.php";
require_once "../config/commerce.php";
require_once "../config/notifications.php";

commerceEnsureSchema($conn);

$userData = JWT::authenticate();
if (!$userData || $userData['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && isset($_GET['action'])) {
    $input = json_decode(file_get_contents("php://input"), true);
    $userId = isset($input['user_id']) ? intval($input['user_id']) : 0;
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID required.']);
        exit();
    }

    if ($_GET['action'] === 'ban') {
        $reason = trim($input['reason'] ?? 'Blocked by admin');
        $stmt = $conn->prepare("UPDATE users SET is_banned = 1, ban_reason = ?, banned_at = NOW() WHERE id = ? AND role = 'customer'");
        $stmt->execute([$reason, $userId]);
        notifyAccountBanned($conn, $userId, $reason);
        echo json_encode(['success' => true, 'message' => 'Customer blocked.']);
        exit();
    }

    if ($_GET['action'] === 'unban') {
        $stmt = $conn->prepare("UPDATE users SET is_banned = 0, ban_reason = NULL, banned_at = NULL WHERE id = ?");
        $stmt->execute([$userId]);
        echo json_encode(['success' => true, 'message' => 'Customer unblocked.']);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
    exit();
}

if ($method === 'GET') {
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $sql = "
        SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
            COALESCE(u.is_banned, 0) AS is_banned,
            u.ban_reason, u.banned_at,
            COUNT(DISTINCT o.id) AS total_orders,
            COALESCE(SUM(CASE WHEN o.status IN ('paid','shipped','delivered') THEN o.total_amount ELSE 0 END), 0) AS total_spend,
            MAX(o.created_at) AS last_order_at
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE u.role = 'customer'
    ";
    $params = [];
    if ($search !== '') {
        $sql .= " AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?) ";
        $like = '%' . $search . '%';
        $params = [$like, $like, $like];
    }
    $sql .= " GROUP BY u.id ORDER BY total_spend DESC, u.id DESC ";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
