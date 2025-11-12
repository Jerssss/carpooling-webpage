<?php
require __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json');

// Connect to MongoDB
$client = new MongoDB\Client("mongodb://localhost:27017/");
$db = $client->carpooling_data;
$usersCollection = $db->users;
$ridesCollection = $db->rides;

// Get user ID from query string
$userId = $_GET['userId'] ?? null;
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
