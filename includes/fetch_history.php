<?php
require __DIR__ . '/../vendor/autoload.php';
header('Content-Type: application/json');

try {
    // MongoDB connection
    $client = new MongoDB\Client("mongodb://localhost:27017/");
    $collection = $client->carpooling_data->history;

    // Fetch all history records sorted by date (newest first)
    $cursor = $collection->find([], ['sort' => ['date' => -1]]);

    $historyRecords = [];

    foreach ($cursor as $doc) {
        // Convert BSONDocument to associative array properly
        $record = json_decode(json_encode($doc), true);

        // Push only the fields that exist in your JSON
        $historyRecords[] = [
            'carModel'        => $record['carModel'] ?? '',
            'name'            => $record['name'] ?? '', // driver name
            'pickup'          => $record['pickupLocation'] ?? '',
            'dropoff'         => $record['dropoffLocation'] ?? '',
            'distance'        => $record['distance'] ?? '',
            'date'            => $record['date'] ?? '',
            'time'            => $record['time'] ?? '',
            'fare'            => $record['fare'] ?? 0,
            'status'          => $record['status'] ?? '',
        ];
    }

    echo json_encode($historyRecords, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
