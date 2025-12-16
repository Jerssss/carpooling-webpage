<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

// Ensure user is logged in and has 'driver' role
if (!isset($_SESSION['user_id']) || !isset($_SESSION['roles']) || !in_array('driver', $_SESSION['roles'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized', 'session_roles' => $_SESSION['roles'] ?? null]);
    exit;
}

$historyCol = $db->history;
$usersCol   = $db->users;
$reviewsCol = $db->reviews;

try {
    $driverId = trim($_SESSION['user_id']); // Remove any extra whitespace

    // Fetch all completed history rides for this driver
    $historyDocs = $historyCol->find([
        'driverId' => $driverId,
        'status'   => 'completed'
    ])->toArray();

    $history = [];

    foreach ($historyDocs as $h) {
        // Fetch passenger info
        $user = $usersCol->findOne(['userID' => $h['passengerId']]);
        $passengerName = $user['name'] ?? 'Unknown';
        $passengerPicture = $user['picture'] ?? 'images/profile_pics/default.png';

        // Fetch review if exists
        $review = $reviewsCol->findOne([
            'rideId' => $h['rideId'],
            'passengerId' => $h['passengerId'],
            'driverId' => $driverId
        ]);

        $history[] = [
            'historyId'       => $h['historyId'],
            'rideId'          => $h['rideId'],
            'date'            => $h['date'],
            'time'            => $h['time'],
            'from'            => $h['pickupLocation'],
            'to'              => $h['dropoffLocation'],
            'fare'            => $h['fare'],
            'passengerName'   => $passengerName,
            'passengerPicture'=> $passengerPicture,
            'rating'          => $review['rating'] ?? 'No rating',
            'comment'         => $review['comment'] ?? 'No comment',
            'car'             => $h['carId'] ?? 'Unknown'
        ];
    }

    echo json_encode(['history' => array_values($history)]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
