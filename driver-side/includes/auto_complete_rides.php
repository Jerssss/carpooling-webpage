<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'driver') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$driverId = $_SESSION['user_id'];

$db = $client->carpooling_data;
$ridesCol = $db->rides;
$historyCol = $db->history;

function parseRideDateTime($dateStr, $timeRange) {
    $cleanDate = trim(str_replace(':', '', $dateStr));
    $startTime = explode(' - ', $timeRange)[0];
    return strtotime($cleanDate . ' ' . $startTime);
}

try {
    $now = time();

    $rides = $ridesCol->find([
        'driverId' => $driverId,
        'status' => 'available'
    ]);

    foreach ($rides as $ride) {
        $rideTimestamp = parseRideDateTime($ride['date'], $ride['departureTime']);

        if ($rideTimestamp < $now) {

            // 1. Mark ride as completed
            $ridesCol->updateOne(
                ['_id' => $ride['_id']],
                ['$set' => ['status' => 'completed']]
            );

            // 2. Insert into history collection
            $historyCol->insertOne([
                'historyId' => 'H' . time(),
                'carId' => $ride['rideId'],
                'driverId' => $ride['driverId'],
                'date' => trim($ride['date']),
                'time' => explode(' - ', $ride['departureTime'])[0],
                'pickupLocation' => $ride['stationedAt'],
                'dropoffLocation' => $ride['destination'],
                'status' => 'completed'
            ]);
        }
    }

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
