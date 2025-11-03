<<<<<<< HEAD
<?php
require __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json');

// Connect to MongoDB
$client = new MongoDB\Client("mongodb://localhost:27017/");
$usersCollection = $client->carpooling_data->users;

// Get user ID from query string
$userId = $_GET['userId'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'No user ID provided']);
    exit;
}

$user = $usersCollection->findOne(['userID' => $userId]);

if ($user) {
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'message' => 'User not found']);
}
?>
