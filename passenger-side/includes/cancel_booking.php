<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$bookingId = $data['bookingId'] ?? null;
$rideId    = $data['rideId'] ?? null;
$userId   = $_SESSION['user_id'];

if (!$bookingId || !$rideId) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$bookings = $db->bookings;
$rides = $db->rides;
$history = $db->history;
$users = $db->users;
$notifications = $db->notifications;

/* Validate booking */
$booking = $bookings->findOne([
    'bookingId'   => $bookingId,
    'rideId'      => $rideId,
    'passengerId' => $userId,
    'status'      => ['$ne' => 'cancelled']
]);

if (!$booking) {
    http_response_code(404);
    echo json_encode(['error' => 'Booking not found or already cancelled']);
    exit;
}

$driverId    = $booking['driverId'] ?? null;
$passengerId = $booking['passengerId'] ?? null;
$carId       = $booking['carId'] ?? null;

/* Fetch user names */
$driver = $users->findOne(
    ['userID' => $driverId],
    ['projection' => ['name' => 1]]
);

$passenger = $users->findOne(
    ['userID' => $passengerId],
    ['projection' => ['name' => 1]]
);

$driverName    = $driver['name'] ?? 'Driver';
$passengerName = $passenger['name'] ?? 'Passenger';

$now = new MongoDB\BSON\UTCDateTime();
$timeStr = date('h:i A');


/* Update bookings */
$bookings->updateOne(
    ['bookingId' => $bookingId],
    ['$set' => ['status' => 'cancelled']]
);

/* Remove passenger from ride */
$rides->updateOne(
    ['rideId' => $rideId],
    [
        '$pull' => ['passengers' => ['userId' => $userId]],
        '$inc'  => ['availableSeats' => 1, 'bookedSeats' => -1]
    ]
);

/* Update history */
$history->updateOne(
    [
        'bookingId'   => $bookingId,
        'passengerId' => $userId
    ],
    ['$set' => ['status' => 'cancelled']]
);

echo json_encode(['success' => true]);

// Insert notification to driver
$notifications->insertOne([
    'bookingId'   => $bookingId,
    'rideId'      => $rideId,
    'driverId'    => $driverId,
    'passengerId' => $passengerId,
    'carId'       => $carId,
    'type'        => 'cancelling',
    'audience'    => 'driver',
    'message'     => "Booking from {$passengerName} has been cancelled at {$timeStr}",
    'timestamp'   => $now,
    'isRead'      => false
]);

// Insert notification to passenger
$notifications->insertOne([
    'bookingId'   => $bookingId,
    'rideId'      => $rideId,
    'driverId'    => $driverId,
    'passengerId' => $passengerId,
    'carId'       => $carId,
    'type'        => 'cancelling',
    'audience'    => 'passenger',
    'message'     => "Booking for {$driverName} has been cancelled",
    'timestamp'   => $now,
    'isRead'      => false
]);


