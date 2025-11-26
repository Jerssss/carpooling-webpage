<?php
// Use the shared root includes DB connector
require_once __DIR__ . '/../../includes/db_connect.php';
header('Content-Type: application/json');

try {
    $collection = $db->history;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $historyId = $data['historyId'] ?? null;

        if (!$historyId) {
            echo json_encode(["success" => false, "error" => "Missing historyId"]);
            exit;
        }

        // Handle rating update
        if (isset($data['rating'])) {
            $rating = (int)$data['rating'];
            $collection->updateOne(
                ['historyId' => $historyId],
                ['$set' => ['rating' => $rating]]
            );
            echo json_encode(["success" => true, "rating" => $rating]);
            exit;
        }

        // Handle report_description update
        if (isset($data['report_description'])) {
            $description = trim($data['report_description']);
            $collection->updateOne(
                ['historyId' => $historyId],
                ['$set' => ['report_description' => $description]]
            );
            echo json_encode(["success" => true, "report_description" => $description]);
            exit;
        }
    }

    // Fetch history records (GET)
    $cursor = $collection->find([], ['sort' => ['date' => -1]]);
    $historyRecords = [];

    foreach ($cursor as $doc) {
        $record = json_decode(json_encode($doc), true);
        $historyRecords[] = [
            'historyId'          => $record['historyId'] ?? '',
            'carModel'           => $record['carModel'] ?? '',
            'name'               => $record['name'] ?? '',
            'pickup'             => $record['pickupLocation'] ?? '',
            'dropoff'            => $record['dropoffLocation'] ?? '',
            'distance'           => $record['distance'] ?? '',
            'date'               => $record['date'] ?? '',
            'time'               => $record['time'] ?? '',
            'fare'               => $record['fare'] ?? 0,
            'status'             => $record['status'] ?? '',
            'rating'             => $record['rating'] ?? 0,
            'report_description' => $record['report_description'] ?? ''
        ];
    }

    echo json_encode($historyRecords, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
