<?php
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

try {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    $driverId = $_SESSION['user_id'];

    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $historyIds = $data['historyIds'] ?? [];
    if (!$historyIds || !is_array($historyIds)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing historyIds']);
        exit;
    }

    $historyCol = $db->history;
    $ridesCol   = $db->rides; 

    // Fetch matching history records for this driver
    $historyDocs = $historyCol->find([
        'historyId' => ['$in' => $historyIds],
        'driverId'  => $driverId
    ])->toArray();

    if (count($historyDocs) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'No matching history records found for this driver']);
        exit;
    }

    // Extract rideIds from history
    $rideIds = [];
    foreach ($historyDocs as $h) {
        if (!empty($h['rideId'])) {
            $rideIds[] = $h['rideId'];
        }
    }

    $historyUpdate = $historyCol->updateMany(
        [
            'historyId' => ['$in' => $historyIds],
            'driverId'  => $driverId
        ],
        [
            '$set' => ['status' => 'completed']
        ]
    );

    $ridesUpdate = null;
    if (!empty($rideIds)) {
        $ridesUpdate = $ridesCol->updateMany(
            [
                'rideId'   => ['$in' => $rideIds],
                'driverId' => $driverId
            ],
            [
                '$set' => ['status' => 'inactive']
            ]
        );
    }

    echo json_encode([
        'ok' => true,
        'updatedHistoryCount' => $historyUpdate->getModifiedCount(),
        'updatedRideCount'    => $ridesUpdate ? $ridesUpdate->getModifiedCount() : 0,
        'message' => 'Ride marked as completed and set to inactive'
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}
?>
