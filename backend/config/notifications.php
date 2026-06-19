<?php
// Transactional email notifications (mirrors in-app notification events)

require_once __DIR__ . '/mail.php';

function notifySettingEnabled($conn, $key, $default = '1')
{
    try {
        $stmt = $conn->prepare("SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1");
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        if ($val === false) {
            return $default === '1';
        }
        return $val === '1' || $val === 1;
    } catch (PDOException $e) {
        return $default === '1';
    }
}

function notifyAdminEmail($conn)
{
    $cfg = MailService::getConfig($conn);
    return $cfg['admin_email'] ?: $cfg['from_email'];
}

function notifyDispatch($conn, $to, $subject, $title, $bodyHtml, $settingKey = null)
{
    if ($settingKey && !notifySettingEnabled($conn, $settingKey)) {
        return true;
    }
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $html = MailService::wrapTemplate($title, $bodyHtml, $conn);
    return MailService::send($to, $subject, $html, null, $conn);
}

function notifyWelcome($conn, $name, $email)
{
    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">Welcome to FloraElegance! Your email has been verified and your account is ready.</p>'
        . '<p style="margin:0 0 16px;">Explore our curated collection of premium plants, enjoy secure checkout, and track your orders from your dashboard.</p>'
        . MailService::button('Start Shopping', 'https://floraelegance.pages.dev/shop');

    return notifyDispatch($conn, $email, 'Welcome to FloraElegance 🌿', 'Welcome aboard!', $body, 'email_notify_security');
}

function notifyOrderDetails($conn, $orderId)
{
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
    $stmt->execute([(int) $orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$order) {
        return false;
    }

    $itemsStmt = $conn->prepare("
        SELECT oi.quantity, oi.price, p.name
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
    ");
    $itemsStmt->execute([(int) $orderId]);
    $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

    $rows = '';
    foreach ($items as $item) {
        $line = floatval($item['price']) * (int) $item['quantity'];
        $rows .= '<tr>'
            . '<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;">' . htmlspecialchars($item['name'], ENT_QUOTES, 'UTF-8') . ' × ' . (int) $item['quantity'] . '</td>'
            . '<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;font-weight:600;">₹' . number_format($line, 2) . '</td>'
            . '</tr>';
    }

    return [
        'order' => $order,
        'items_html' => $rows,
        'order_number' => 'ORD-' . str_pad((string) $order['id'], 6, '0', STR_PAD_LEFT),
    ];
}

function notifyOrderPlacedCustomer($conn, $orderId, $isCod = false)
{
    if (!notifySettingEnabled($conn, 'email_notify_orders')) {
        return true;
    }
    $data = notifyOrderDetails($conn, $orderId);
    if (!$data) {
        return false;
    }
    $order = $data['order'];
    $paymentLabel = $isCod ? 'Cash on Delivery' : 'Online Payment';
    $statusNote = $isCod
        ? 'Your order is confirmed. Please keep ₹' . number_format((float) $order['total_amount'], 2) . ' ready for delivery.'
        : 'Your payment was successful and your order is confirmed.';

    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($order['name'], ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 20px;">' . $statusNote . '</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">'
        . MailService::infoRow('Order ID', $data['order_number'])
        . MailService::infoRow('Payment', $paymentLabel)
        . MailService::infoRow('Total', '₹' . number_format((float) $order['total_amount'], 2))
        . MailService::infoRow('Status', ucfirst($order['status']))
        . '</table>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">' . $data['items_html'] . '</table>'
        . MailService::button('Track Your Order', 'https://floraelegance.pages.dev/track-order');

    return notifyDispatch(
        $conn,
        $order['email'],
        'Order Confirmed — ' . $data['order_number'],
        'Order Confirmed 🎉',
        $body
    );
}

function notifyOrderPlacedAdmin($conn, $orderId)
{
    if (!notifySettingEnabled($conn, 'email_notify_admin')) {
        return true;
    }
    $data = notifyOrderDetails($conn, $orderId);
    if (!$data) {
        return false;
    }
    $order = $data['order'];
    $body = '<p style="margin:0 0 16px;">A new order has been placed on FloraElegance.</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
        . MailService::infoRow('Order ID', $data['order_number'])
        . MailService::infoRow('Customer', $order['name'])
        . MailService::infoRow('Email', $order['email'])
        . MailService::infoRow('Phone', $order['phone'])
        . MailService::infoRow('Total', '₹' . number_format((float) $order['total_amount'], 2))
        . MailService::infoRow('Payment', strtoupper($order['payment_method'] ?? 'online'))
        . '</table>';

    return notifyDispatch(
        $conn,
        notifyAdminEmail($conn),
        '[New Order] ' . $data['order_number'] . ' — ₹' . number_format((float) $order['total_amount'], 2),
        'New Order Alert 📦',
        $body
    );
}

function notifyOrderStatus($conn, $orderId, $newStatus)
{
    if (!notifySettingEnabled($conn, 'email_notify_status')) {
        return true;
    }
    $data = notifyOrderDetails($conn, $orderId);
    if (!$data) {
        return false;
    }
    $order = $data['order'];
    $statusLabels = [
        'paid' => 'Payment Received',
        'shipped' => 'Shipped — On the way!',
        'delivered' => 'Delivered Successfully',
        'failed' => 'Payment Failed',
        'pending' => 'Order Pending',
    ];
    $label = $statusLabels[$newStatus] ?? ucfirst($newStatus);

    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($order['name'], ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">Your order <strong>' . $data['order_number'] . '</strong> status has been updated.</p>'
        . '<div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;text-align:center;margin:20px 0;">'
        . '<span style="font-size:18px;font-weight:700;color:#15803d;">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</span>'
        . '</div>'
        . MailService::button('View Order Details', 'https://floraelegance.pages.dev/dashboard');

    return notifyDispatch(
        $conn,
        $order['email'],
        'Order Update — ' . $data['order_number'] . ' (' . $label . ')',
        'Order Status Updated',
        $body
    );
}

function notifyOrderTracking($conn, $orderId, $trackingNumber, $carrier, $trackingStatus)
{
    if (!notifySettingEnabled($conn, 'email_notify_tracking')) {
        return true;
    }
    $data = notifyOrderDetails($conn, $orderId);
    if (!$data) {
        return false;
    }
    $order = $data['order'];

    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($order['name'], ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">Tracking details for order <strong>' . $data['order_number'] . '</strong> have been updated.</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
        . MailService::infoRow('AWB / Tracking #', $trackingNumber ?: '—')
        . MailService::infoRow('Carrier', $carrier ?: '—')
        . MailService::infoRow('Status', $trackingStatus ?: '—')
        . '</table>'
        . MailService::button('Track Package', 'https://floraelegance.pages.dev/track-order');

    return notifyDispatch(
        $conn,
        $order['email'],
        'Tracking Updated — ' . $data['order_number'],
        'Package Tracking Update 🚚',
        $body
    );
}

function notifyInquiryCustomer($conn, $name, $email, $subject)
{
    if (!notifySettingEnabled($conn, 'email_notify_inquiries')) {
        return true;
    }
    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">Thank you for contacting FloraElegance. We have received your inquiry regarding:</p>'
        . '<p style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-radius:10px;font-weight:600;">' . htmlspecialchars($subject, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p style="margin:0;">Our botanical support team will respond within 24–48 business hours.</p>';

    return notifyDispatch($conn, $email, 'We received your inquiry — FloraElegance', 'Inquiry Received', $body);
}

function notifyInquiryAdmin($conn, $name, $email, $subject, $message, $inquiryId)
{
    if (!notifySettingEnabled($conn, 'email_notify_admin')) {
        return true;
    }
    $body = '<p style="margin:0 0 16px;">New contact inquiry #' . (int) $inquiryId . '</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
        . MailService::infoRow('Name', $name)
        . MailService::infoRow('Email', $email)
        . MailService::infoRow('Subject', $subject)
        . '</table>'
        . '<p style="margin:16px 0 8px;font-size:13px;color:#64748b;">Message:</p>'
        . '<div style="background:#f8fafc;border-radius:10px;padding:16px;white-space:pre-wrap;">' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</div>';

    return notifyDispatch(
        $conn,
        notifyAdminEmail($conn),
        '[New Inquiry] ' . $subject,
        'New Contact Inquiry 📩',
        $body
    );
}

function notifyReviewAdmin($conn, $productName, $userName, $rating, $comment, $reviewId)
{
    if (!notifySettingEnabled($conn, 'email_notify_reviews')) {
        return true;
    }
    $body = '<p style="margin:0 0 16px;">A new product review is awaiting moderation.</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
        . MailService::infoRow('Product', $productName)
        . MailService::infoRow('Customer', $userName)
        . MailService::infoRow('Rating', $rating . ' / 5')
        . MailService::infoRow('Review ID', '#' . (int) $reviewId)
        . '</table>'
        . '<p style="margin:16px 0 8px;font-size:13px;color:#64748b;">Comment:</p>'
        . '<div style="background:#f8fafc;border-radius:10px;padding:16px;">' . htmlspecialchars($comment, ENT_QUOTES, 'UTF-8') . '</div>';

    return notifyDispatch(
        $conn,
        notifyAdminEmail($conn),
        '[New Review] ' . $productName . ' — ' . $rating . '★',
        'New Product Review ⭐',
        $body
    );
}

function notifyAccountBanned($conn, $userId, $reason)
{
    if (!notifySettingEnabled($conn, 'email_notify_security')) {
        return true;
    }
    $stmt = $conn->prepare("SELECT name, email FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([(int) $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        return false;
    }

    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">Your FloraElegance account has been restricted by our team.</p>'
        . '<p style="margin:0 0 16px;padding:12px 16px;background:#fef2f2;border-radius:10px;color:#991b1b;"><strong>Reason:</strong> ' . htmlspecialchars($reason, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p style="margin:0;">If you believe this is a mistake, please contact our support team.</p>';

    return notifyDispatch($conn, $user['email'], 'Account Restricted — FloraElegance', 'Account Notice', $body);
}

function notifyPasswordChanged($conn, $userId)
{
    if (!notifySettingEnabled($conn, 'email_notify_security')) {
        return true;
    }
    $stmt = $conn->prepare("SELECT name, email FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([(int) $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        return false;
    }

    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">Your account password was changed successfully on ' . date('M j, Y \a\t g:i A') . '.</p>'
        . '<p style="margin:0;font-size:13px;color:#64748b;">If you did not make this change, contact support immediately.</p>';

    return notifyDispatch($conn, $user['email'], 'Password Changed — FloraElegance', 'Security Alert 🔒', $body);
}

function notifyLoginAlert($conn, $name, $email)
{
    if (!notifySettingEnabled($conn, 'email_notify_security')) {
        return true;
    }
    $body = '<p style="margin:0 0 12px;">Hello <strong>' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
        . '<p style="margin:0 0 16px;">You signed in to your FloraElegance account using email OTP on ' . date('M j, Y \a\t g:i A') . '.</p>'
        . '<p style="margin:0;font-size:13px;color:#64748b;">If this wasn\'t you, please contact support immediately.</p>';

    return notifyDispatch($conn, $email, 'New Sign-In — FloraElegance', 'Sign-In Alert', $body);
}
