<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'passenger') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$ridesCol = $db->rides;
$usersCol = $db->users;
$paymentsCol = $db->payments;
$historyCol = $db->history;

try {
    // Build history primarily from the history collection (status-driven)
    $userId = $_SESSION['user_id'];

    $historyDocs = $historyCol->find(
        ['passengerId' => $userId],
        ['sort' => ['_id' => -1]]
    )->toArray();

    $upcoming = [];
    $finished = [];

    foreach ($historyDocs as $h) {
        $status = strtolower($h['status'] ?? 'pending');
        $item = [
            'rideId' => $h['rideId'] ?? '',
            'stationedAt' => '',
            'destination' => $h['dropoffLocation'] ?? '',
            'price' => $h['fare'] ?? 0,
            'date' => $h['date'] ?? '',
            'departureTime' => $h['time'] ?? '',
            'name' => $h['name'] ?? 'Unknown',
            'pickupLocation' => $h['pickupLocation'] ?? '',
            'status' => [$status]
        ];

        if ($status === 'pending') {
            $upcoming[] = $item;
        } else if ($status === 'completed' || $status === 'cancelled') {
            $finished[] = $item;
        } else {
            $finished[] = $item; // default to finished for any other status
        }
    }

    // Fallback: if no history yet
    if (empty($historyDocs)) {
        $paymentDocs = $paymentsCol->find(
            ['userId' => $userId],
            ['sort' => ['_id' => -1]]
        )->toArray();

        $latestByRide = [];
        foreach ($paymentDocs as $p) {
            $rid = $p['rideId'] ?? null;
            if (!$rid) continue;
            if (!isset($latestByRide[$rid])) {
                $latestByRide[$rid] = $p;
            }
        }

        $rideIds = array_keys($latestByRide);
        $rideMap = [];
        if (!empty($rideIds)) {
            $cursor = $ridesCol->find(['rideId' => ['$in' => $rideIds]]);
            foreach ($cursor as $r) {
                $rideMap[$r['rideId']] = $r;
            }
        }

        foreach ($latestByRide as $rid => $payment) {
            $ride = $rideMap[$rid] ?? null;
            if (!$ride) continue;
            $driverName = 'Unknown driver';
            if (isset($ride['driverId'])) {
                $u = $usersCol->findOne(['userID' => $ride['driverId']]);
                if ($u && isset($u['name'])) $driverName = $u['name'];
            }
            $status = strtolower($payment['status'] ?? 'pending');
            $upcoming[] = [
                'rideId' => $rid,
                'stationedAt' => $ride['stationedAt'] ?? '',
                'destination' => $ride['destination'] ?? '',
                'price' => $ride['price'] ?? 0,
                'date' => $ride['date'] ?? '',
                'departureTime' => $ride['departureTime'] ?? '',
                'name' => $driverName,
                'pickupLocation' => $payment['pickupLocation'] ?? ($ride['stationedAt'] ?? ''),
                'status' => [$status]
            ];
        }
    }

    echo json_encode(['upcoming' => $upcoming, 'finished' => $finished]);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
