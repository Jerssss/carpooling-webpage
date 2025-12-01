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

$historyCol = $db->history;

try {
    $driverId = $_SESSION['user_id'];

    $historyDocs = $historyCol->find([
        'driverId' => $driverId,
        'status' => 'completed'
    ])->toArray();

    $history = [];

    foreach ($historyDocs as $h) {
        $history[] = [
            'historyId' => $h['historyId'],
            'date' => $h['date'],
            'time' => $h['time'],
            'from' => $h['pickupLocation'],
            'to' => $h['dropoffLocation'],
            'fare' => $h['fare'],
            'passengerName' => $h['name'],
            'rating' => $h['rating']
        ];
    }

    // Wrap in an object to match schedule format: { rides: [...] } style
    echo json_encode(['history' => array_values($history)]);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
