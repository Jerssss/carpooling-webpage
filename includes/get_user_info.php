<?php
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/session.php';

header('Content-Type: application/json');

// Collections
$usersCollection = $db->users;
$ridesCollection = $db->rides;

// Get user ID from query string
$userId = $_SESSION['user_id'] ?? null;
$rideId = $_GET['rideId'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'No user ID provided']);
    exit;
}

// Get user info
$user = $usersCollection->findOne(['userID' => $userId]);
if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

// Default response
$response = [
    'success' => true,
    'user' => (array)$user,
];

// Get ride info (if rideId provided)
if ($rideId) {
    $ride = $ridesCollection->findOne(['rideId' => $rideId]);
    if ($ride && isset($ride['departureTime'])) {
        $response['departureTime'] = $ride['departureTime'];
    }
}

echo json_encode($response);
?>
