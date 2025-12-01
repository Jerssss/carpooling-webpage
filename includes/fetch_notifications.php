<?php
// includes/fetch_notifications.php
// Returns notifications for the logged-in user (newest first). Supports filter=unread.

require_once __DIR__ . '/session.php';
require_once __DIR__ . '/db_connect.php';
header('Content-Type: application/json; charset=utf-8');

// Prefer session user; fallback to explicit userId (for dev/testing)
$sessionUserId = $_SESSION['user_id'] ?? null;
$paramUserId = $_GET['userId'] ?? null;
$userId = $sessionUserId ?: $paramUserId;
$filter = $_GET['filter'] ?? 'all'; // 'all' or 'unread'

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$collection = $db->notifications;

$q = ['passengerId' => $userId];
if ($filter === 'unread') {
    $q['isRead'] = false;
}

// Sort by timestamp descending (ISO strings sort lexicographically)
$cursor = $collection->find($q, ['sort' => ['timestamp' => -1]]);

$notifications = [];
foreach ($cursor as $n) {
    $notifications[] = [
        'id' => (string)($n['_id'] ?? ''),
        'rideId' => $n['rideId'] ?? null,
        'driverId' => $n['driverId'] ?? null,
        'carId' => $n['carId'] ?? null,
        'message' => $n['message'] ?? '',
        'isRead' => isset($n['isRead']) ? (bool)$n['isRead'] : false,
        'timestamp' => $n['timestamp'] ?? null
    ];
}

echo json_encode($notifications);
exit;
