<?php
require __DIR__ . '/../vendor/autoload.php'; // MongoDB PHP library
header('Content-Type: application/json');

try {
    $client = new MongoDB\Client("mongodb://localhost:27017/");
    $historyCollection = $client->carpooling_data->history;

    $results = $historyCollection->find([], [
        'sort' => ['date' => -1] // or timestamp if you have
    ]);

    $historyRecords = [];

    foreach ($results as $record) {
        $historyRecords[] = [
            'historyId'      => $record['historyId'] ?? '',
            'rideId'         => $record['rideId'] ?? '',
            'driverId'       => $record['driverId'] ?? '',
            'passengerId'    => $record['passengerId'] ?? '',
            'pickupLocation' => $record['pickupLocation'] ?? '',
            'dropoffLocation'=> $record['dropoffLocation'] ?? '',
            'date'           => $record['date'] ?? '',
            'time'           => $record['time'] ?? '',
            'fare'           => $record['fare'] ?? 0,
            'status'         => $record['status'] ?? 'pending'
        ];
    }

    echo json_encode($historyRecords);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
