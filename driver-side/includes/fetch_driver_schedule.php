<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING); // prevent warnings breaking JSON

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'driver') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$ridesCol = $db->rides;
$usersCol = $db->users;
$bookingsCol = $db->bookings;

try {
    $driverId = $_SESSION['user_id'];

    // Fetch all rides for this driver where status = 'available'
    $rideDocs = $ridesCol->find([
        'driverId' => $driverId,
        'status' => 'available'
    ])->toArray();

    $schedule = [];

    foreach ($rideDocs as $ride) {
        // Fetch bookings for this ride BUT exclude driver if he booked as passenger
        $bookingDocs = $bookingsCol->find([
            'rideId' => $ride['rideId'],
            'passengerId' => ['$ne' => $driverId]
        ])->toArray();

        $passengers = [];

        foreach ($bookingDocs as $b) {
            $user = $usersCol->findOne(['userID' => $b['passengerId']]);
            if ($user) {
                $passengers[] = [
                    'userId' => $user['userID'],
                    'name' => $user['name'],
                    'phone' => $user['phoneNo'],
                    'picture' => $user['picture'],
                    'pickupLocation' => $ride['stationedAt'],
                    'seatNumber' => $b['seatNumber'] ?? $b['seatNo'] ?? null
                ];
            }
        }

        $schedule[] = [
            'rideId' => $ride['rideId'],
            'date' => $ride['date'],
            'time' => $ride['departureTime'],
            'from' => $ride['stationedAt'],
            'to' => $ride['destination'],
            'passengers' => $passengers
        ];
    }

    // Return as an object with key 'rides' so JS can do data.rides.forEach
    echo json_encode([
        'driver_id' => $driverId,
        'rides' => array_values($schedule)
    ]);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
