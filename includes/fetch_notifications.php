<?php
// includes/fetch_notifications.php
// Returns notifications for a passenger (newest first). Supports filter=unread.

require_once __DIR__ . '/db_connect.php';
header('Content-Type: application/json; charset=utf-8');

$userId = $_GET['userId'] ?? null;
$filter = $_GET['filter'] ?? 'all'; // 'all' or 'unread'

if (!$userId) {
    echo json_encode(['error' => 'Missing userId']);
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
        'status' => $n['status'] ?? '',
        'isRead' => isset($n['isRead']) ? (bool)$n['isRead'] : false,
        'timestamp' => $n['timestamp'] ?? null
    ];
}

echo json_encode($notifications);
exit;
?>
