<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'driver') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['rideId'])) {
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$rides = $db->rides;

$result = $rides->deleteOne([
    'rideId' => $data['rideId'],
    'driverId' => $_SESSION['user_id']
]);

echo json_encode(['success' => $result->getDeletedCount() > 0]);
