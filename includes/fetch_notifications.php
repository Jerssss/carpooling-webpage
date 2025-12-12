<?php
// includes/fetch_notifications.php
// Returns notifications for the logged-in user (newest first).

session_start();
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    // Restore session from cookies if needed
    if (!isset($_SESSION['user_id']) && isset($_COOKIE['user_id'])) {
        $_SESSION['user_id'] = $_COOKIE['user_id'];
    }

    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }

    // Use shared $db from db_connect.php
    if (!isset($db)) {
        throw new Exception('Database connection not initialized');
    }

    // Determine user roles (supports role or roles[] schemas)
    $usersCol = $db->selectCollection('users');
    // Note: users dataset uses 'userID'
    $userDoc = $usersCol->findOne(['userID' => $userId]);
    $roles = [];
    if ($userDoc) {
        if (!empty($userDoc['roles']) && is_array($userDoc['roles'])) {
            $roles = array_map('strtolower', $userDoc['roles']);
        } elseif (!empty($userDoc['role']) && is_string($userDoc['role'])) {
            $roles = [strtolower($userDoc['role'])];
        }
    }
    $isDriver = in_array('driver', $roles, true);
    $isPassenger = in_array('passenger', $roles, true);

    $notificationsCol = $db->selectCollection('notifications');

    // Query notifications where current user is involved
    $baseQuery = [
        '$or' => [
            ['driverId' => $userId],
            ['passengerId' => $userId],
        ],
    ];

    $cursor = $notificationsCol->find($baseQuery);

    $results = [];
    foreach ($cursor as $doc) {
        $audience = $doc['audience'] ?? null;

        // Filter by audience only if user does not have both roles
        if ($audience === 'driver' && !$isDriver && $isPassenger) {
            continue;
        }
        if ($audience === 'passenger' && !$isPassenger && $isDriver) {
            continue;
        }

        // Normalize timestamp variants: ISO string, Mongo UTCDateTime, or {$date}
        $tsIso = null;
        if (isset($doc['timestamp'])) {
            $ts = $doc['timestamp'];
            if ($ts instanceof MongoDB\BSON\UTCDateTime) {
                $tsIso = $ts->toDateTime()->format(DATE_ATOM);
            } elseif (is_array($ts) && isset($ts['$date'])) {
                $dt = new DateTime(is_array($ts['$date']) ? ($ts['$date']['$numberLong'] ?? '') : $ts['$date']);
                $tsIso = $dt->format(DATE_ATOM);
            } elseif (is_string($ts)) {
                $tsIso = (new DateTime($ts))->format(DATE_ATOM);
            }
        }

        $results[] = [
            '_id' => isset($doc['_id']) ? (string) $doc['_id'] : null,
            'rideId' => $doc['rideId'] ?? null,
            'driverId' => $doc['driverId'] ?? null,
            'passengerId' => $doc['passengerId'] ?? null,
            'carId' => $doc['carId'] ?? null,
            'paymentId' => $doc['paymentId'] ?? null,
            'type' => $doc['type'] ?? null,
            'audience' => $audience,
            'message' => $doc['message'] ?? '',
            'timestamp' => $tsIso,
            'isRead' => (bool) ($doc['isRead'] ?? false),
        ];
    }

    // Sort by timestamp descending
    usort($results, function ($a, $b) {
        return strcmp(($b['timestamp'] ?? ''), ($a['timestamp'] ?? ''));
    });

    echo json_encode(['success' => true, 'notifications' => $results]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error', 'details' => $e->getMessage()]);
}
