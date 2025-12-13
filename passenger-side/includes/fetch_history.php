<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

// Restore and verify session; allow passenger via roles or role field
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$ridesCol = $db->rides;
$usersCol = $db->users;
$paymentsCol = $db->payments;
$historyCol = $db->history;

// If session role isn't 'passenger', re-check in DB to allow multi-role users
if (($_SESSION['role'] ?? '') !== 'passenger') {
    try {
        $u = $usersCol->findOne(['userID' => $_SESSION['user_id']], ['projection' => ['roles' => 1, 'role' => 1]]);
        $hasPassenger = false;
        if ($u) {
            if (isset($u['roles']) && is_array($u['roles'])) {
                foreach ($u['roles'] as $r) { if (strtolower((string)$r) === 'passenger') { $hasPassenger = true; break; } }
            }
            if (!$hasPassenger && isset($u['role']) && strtolower((string)$u['role']) === 'passenger') {
                $hasPassenger = true;
            }
        }
        if (!$hasPassenger) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: passenger role required']);
            exit;
        }
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Role check failed']);
        exit;
    }
}

try {
    // Build history primarily from the history collection (status-driven)
    $userId = $_SESSION['user_id'];

    $historyDocs = $historyCol->find(
        ['$or' => [
            ['passengerId' => $userId],
            ['userID' => $userId]
        ]],
        ['sort' => ['_id' => -1]]
    )->toArray();

    $upcoming = [];
    $finished = [];

    foreach ($historyDocs as $h) {
        $status = strtolower($h['status'] ?? 'pending');
        // Normalize odd date strings like "2025-10-25: "
        $date = isset($h['date']) ? trim(str_replace(':', '', (string)$h['date'])) : '';
        $createdAt = null;
        if (isset($h['createdAt'])) {
            if ($h['createdAt'] instanceof MongoDB\BSON\UTCDateTime) {
                $createdAt = $h['createdAt']->toDateTime()->format(DATE_ATOM);
            } elseif (is_array($h['createdAt']) && isset($h['createdAt']['$date'])) {
                $createdAt = (new DateTime(is_array($h['createdAt']['$date']) ? ($h['createdAt']['$date']['$numberLong'] ?? '') : $h['createdAt']['$date']))->format(DATE_ATOM);
            }
        }
        // Get driver ID from history
        $driverId = $h['driverId'] ?? '';

        $item = [
            'rideId' => $h['rideId'] ?? '',
            'stationedAt' => '',
            'destination' => $h['dropoffLocation'] ?? '',
            'price' => $h['fare'] ?? 0,
            'date' => $date,
            'departureTime' => $h['time'] ?? '',
            'name' => $h['name'] ?? 'Unknown',
            'pickupLocation' => $h['pickupLocation'] ?? '',
            'status' => [$status],
            'createdAt' => $createdAt,
            'driverId' => $driverId, // Include driver ID
        ];

        // Normalize statuses to upcoming vs finished buckets
        if (in_array($status, ['pending','booked','scheduled','reserved','ongoing'], true)) {
            $upcoming[] = $item;
        } else if (in_array($status, ['completed','cancelled','finished'], true)) {
            $finished[] = $item;
        } else {
            // Unknown statuses default to upcoming to avoid hiding active bookings
            $upcoming[] = $item;
        }
    }

    // Fallback: if no history yet
    if (empty($historyDocs)) {
        $paymentDocs = $paymentsCol->find(
            ['$or' => [
                ['userId' => $userId],
                ['userID' => $userId]
            ]],
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
            $createdAt = null;
            if (isset($payment['timestamp'])) {
                if ($payment['timestamp'] instanceof MongoDB\BSON\UTCDateTime) {
                    $createdAt = $payment['timestamp']->toDateTime()->format(DATE_ATOM);
                } elseif (is_string($payment['timestamp'])) {
                    try { $createdAt = (new DateTime($payment['timestamp']))->format(DATE_ATOM); } catch (Throwable $e) { $createdAt = null; }
                } elseif (is_array($payment['timestamp']) && isset($payment['timestamp']['$date'])) {
                    $createdAt = (new DateTime(is_array($payment['timestamp']['$date']) ? ($payment['timestamp']['$date']['$numberLong'] ?? '') : $payment['timestamp']['$date']))->format(DATE_ATOM);
                }
            }
            $upcoming[] = [
                'rideId' => $rid,
                'stationedAt' => $ride['stationedAt'] ?? '',
                'destination' => $ride['destination'] ?? '',
                'price' => $ride['price'] ?? 0,
                'date' => $ride['date'] ?? '',
                'departureTime' => $ride['departureTime'] ?? '',
                'name' => $driverName,
                'pickupLocation' => $payment['pickupLocation'] ?? ($ride['stationedAt'] ?? ''),
                'status' => [$status],
                'createdAt' => $createdAt,
                'driverId' => $driverId, // Include driver ID
            ];
        }
    }

    // Second fallback: if still no upcoming and finished, infer from rides where passenger appears
    if (empty($upcoming) && empty($finished)) {
        try {
            $ridesCursor = $ridesCol->find([
                '$or' => [
                    ['passengers' => ['$elemMatch' => ['userID' => $userId]]],
                    ['passengers' => ['$in' => [$userId]]]
                ]
            ], ['sort' => ['_id' => -1]]);

            foreach ($ridesCursor as $ride) {
                $driverName = 'Unknown driver';
                if (isset($ride['driverId'])) {
                    $u = $usersCol->findOne(['userID' => $ride['driverId']]);
                    if ($u && isset($u['name'])) $driverName = $u['name'];
                }
                $status = strtolower($ride['status'] ?? 'pending');
                $createdAt = null;
                if (isset($ride['createdAt']) && $ride['createdAt'] instanceof MongoDB\BSON\UTCDateTime) {
                    $createdAt = $ride['createdAt']->toDateTime()->format(DATE_ATOM);
                }
                $item = [
                    'rideId' => $ride['rideId'] ?? '',
                    'stationedAt' => $ride['stationedAt'] ?? '',
                    'destination' => $ride['destination'] ?? '',
                    'price' => $ride['price'] ?? 0,
                    'date' => $ride['date'] ?? '',
                    'departureTime' => $ride['departureTime'] ?? '',
                    'name' => $driverName,
                    'pickupLocation' => $ride['stationedAt'] ?? '',
                    'status' => [$status],
                    'createdAt' => $createdAt,
                    'driverId' => $driverId, // Include driver ID
                ];
                if (in_array($status, ['pending','booked','scheduled','reserved','ongoing','available'], true)) {
                    $upcoming[] = $item;
                } else {
                    $finished[] = $item;
                }
            }
        } catch (Throwable $e) {
            // ignore
        }
    }

    // Sort both buckets by createdAt desc when available
    $sortFn = function($a, $b) {
        return strcmp(($b['createdAt'] ?? ''), ($a['createdAt'] ?? ''));
    };
    usort($upcoming, $sortFn);
    usort($finished, $sortFn);

    echo json_encode(['upcoming' => $upcoming, 'finished' => $finished]);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
