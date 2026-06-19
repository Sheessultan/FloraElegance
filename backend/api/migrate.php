<?php
// Migration endpoint disabled for security — use database.sql import in phpMyAdmin instead.
http_response_code(403);
header('Content-Type: application/json; charset=UTF-8');
echo json_encode([
    'success' => false,
    'message' => 'Migration endpoint is disabled. Import backend/database.sql via phpMyAdmin.'
]);
exit();
