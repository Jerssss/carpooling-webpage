<?php
// JSON endpoint to create a driver carpool ride
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../../includes/db_connect.php';

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload']);
        exit;
    }

    $startLocation = trim($data['startLocation'] ?? '');
    $destination = trim($data['destination'] ?? '');
    $seats = isset($data['seats']) ? (int)$data['seats'] : 0;
    $cost = isset($data['cost']) ? (float)$data['cost'] : 0.0;
    $departure = trim($data['departure'] ?? '');
    $destLat = isset($data['destLat']) ? $data['destLat'] : null;
    $destLng = isset($data['destLng']) ? $data['destLng'] : null;

    if ($startLocation === '' || $destination === '' || $seats < 1 || $cost < 0 || $departure === '') {
        http_response_code(422);
        echo json_encode(['error' => 'Missing or invalid fields']);
        exit;
    }

    // Build ride document following reference schema
    $rideId = 'R' . str_pad(strval(rand(1, 999999)), 4, '0', STR_PAD_LEFT);
    $datePart = substr($departure, 0, 10); // YYYY-MM-DD
    $timePart = substr($departure, 11); // HH:MM

    $doc = [
        'rideId' => $rideId,
        'carId' => null, // TODO: set from session/user context if available
        'driverId' => null, // TODO: set from session/user context if available
        'date' => $datePart,
        'departureTime' => $timePart,
        'stationedAt' => $startLocation,
        'destination' => $destination,
        'availableSeats' => $seats,
        'bookedSeats' => 0,
        'status' => 'available',
        'passengers' => [],
        'for' => 'pickup',
        'price' => $cost,
    ];

    if ($destLat !== null && $destLng !== null) {
        $doc['destinationLocation'] = [ 'lat' => (float)$destLat, 'lng' => (float)$destLng ];
    }

    // Insert into MongoDB
    $collection = $db->selectCollection('rides');
    $result = $collection->insertOne($doc);

    echo json_encode(['ok' => true, 'rideId' => $rideId, 'insertedId' => (string)$result->getInsertedId()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
