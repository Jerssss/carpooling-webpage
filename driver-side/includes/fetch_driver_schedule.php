<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'driver') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$ridesCol    = $db->rides;
$usersCol    = $db->users;
$historyCol  = $db->history;

try {
    $driverId = $_SESSION['user_id'];

    // Fetch all rides for this driver where status = 'available'
    $rideDocs = $ridesCol->find([
        'driverId' => $driverId,
        'status' => 'available'
    ])->toArray();

    $schedule = [];

    foreach ($rideDocs as $ride) {
        // Fetch all pending history records for this ride & driver
        $historyDocs = $historyCol->find([
            'rideId'   => $ride['rideId'],
            'driverId' => $driverId,
            'status'   => 'pending'
        ])->toArray();

        $passengers = [];

        foreach ($historyDocs as $history) {
            // Exclude driver if booked as passenger
            if ($history['passengerId'] === $driverId) continue;

            $user = $usersCol->findOne(['userID' => $history['passengerId']]);
            if (!$user) continue;

            $passengers[] = [
                'historyId'      => $history['historyId'], // needed for completion
                'userId'         => $user['userID'],
                'name'           => $user['name'],
                'phone'          => $user['phoneNo'],
                'picture'        => $user['picture'] ?? null,
                'pickupLocation' => $history['pickupLocation'] ?? $ride['stationedAt'],
                'seatNumber'     => $history['seatNumber'] ?? null
            ];
        }

        if (count($passengers) === 0) continue;

        $schedule[] = [
            'rideId'     => $ride['rideId'],
            'date'       => $ride['date'],
            'time'       => $ride['departureTime'],
            'from'       => $ride['stationedAt'],
            'to'         => $ride['destination'],
            'historyIds' => array_column($passengers, 'historyId'), // all passenger historyIds
            'passengers' => $passengers
        ];
    }

    echo json_encode([
        'driver_id' => $driverId,
        'rides'     => array_values($schedule)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
