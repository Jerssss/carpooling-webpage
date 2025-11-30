<?php
// Shared session & DB
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json');

// Only allow drivers
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'driver') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$driverId = $_SESSION['user_id'];

try {
    $reviewsCollection = $db->reviews;
    $usersCollection   = $db->users;

    $reviewsCursor = $reviewsCollection->find(['driverId' => $driverId]);
    $result = [];

    foreach ($reviewsCursor as $review) {
        $passenger = $usersCollection->findOne(['userID' => $review['passengerId']]);

        $result[] = [
            'date' => $review['date'],
            'rating' => $review['rating'],
            'comment' => $review['comment'],
            'passengerName' => $passenger['name'] ?? $review['passengerId'],
            'passengerPicture' => $passenger['picture'] ?? null
        ];
    }

    if (empty($result)) {
        echo json_encode([]);
    } else {
        echo json_encode($result);
    }

} catch (Exception $e) {
    echo json_encode(['error' => 'Error fetching feedbacks: ' . $e->getMessage()]);
}
