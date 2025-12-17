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
$rides    = $db->rides;
$history  = $db->history;

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
