<?php
// includes/fetch_notifications.php
// Returns notifications for the logged-in user (newest first). Supports filter=unread.

require_once __DIR__ . '/session.php';
require_once __DIR__ . '/db_connect.php';
header('Content-Type: application/json; charset=utf-8');

// Prefer session user; fallback to explicit userId (for dev/testing)
$sessionUserId = $_SESSION['user_id'] ?? null;
$sessionRole = $_SESSION['role'] ?? null; // 'passenger' or 'driver'
$paramUserId = $_GET['userId'] ?? null;
$userId = $sessionUserId ?: $paramUserId;
$filter = $_GET['filter'] ?? 'all'; // 'all' or 'unread'

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$collection = $db->notifications;

$q = [];
if ($sessionRole === 'driver') {
    $q['driverId'] = $userId;
} else {
    $q['passengerId'] = $userId;
}
if ($filter === 'unread') {
    $q['isRead'] = false;
}

// Sort by timestamp descending (ISO strings sort lexicographically)
$cursor = $collection->find($q, ['sort' => ['timestamp' => -1]]);

$notifications = [];
foreach ($cursor as $n) {
    // Normalize timestamp to ISO string
    $ts = null;
    if (isset($n['timestamp'])) {
        $t = $n['timestamp'];
        if ($t instanceof MongoDB\BSON\UTCDateTime) {
            $ts = $t->toDateTime()->format('c');
        } elseif (is_array($t) && isset($t['$date'])) {
            $ts = $t['$date'];
        } elseif (is_string($t)) {
            $ts = $t; // fallback for legacy string timestamps
        }
    }

    // Filter by audience: drivers see only driver-audience items; passengers see only passenger-audience items.
    $audience = $n['audience'] ?? null;
    $type = $n['type'] ?? null;
    if ($sessionRole === 'driver') {
        // Include only explicit driver-audience notifications.
        if ($audience && $audience !== 'driver') {
            continue;
        }
        // If audience is missing (legacy), include only safe driver-side types.
        if (!$audience && !in_array($type, ['carpool_created'], true)) {
            continue;
        }
    } else {
        // Passenger role: include only explicit passenger-audience or legacy (no audience) items.
        if ($audience && $audience !== 'passenger') {
            continue;
        }
    }

    $notifications[] = [
        'id' => (string)($n['_id'] ?? ''),
        'rideId' => $n['rideId'] ?? null,
        'driverId' => $n['driverId'] ?? null,
        'carId' => $n['carId'] ?? null,
        'message' => $n['message'] ?? '',
        'isRead' => isset($n['isRead']) ? (bool)$n['isRead'] : false,
        'timestamp' => $ts
    ];
}

echo json_encode($notifications);
exit;
