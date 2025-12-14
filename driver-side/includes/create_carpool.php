<?php
// Return JSON responses from this endpoint
header('Content-Type: application/json');

try {
    // Boot up session and database connection
    require_once __DIR__ . '/../../includes/session.php';
    require_once __DIR__ . '/../../includes/db_connect.php';

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    // Grab the logged-in user's id from session
    $currentUserId = $_SESSION['user_id'];

    try {
        // If the user role isn't a driver, block the request
        if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'driver') {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: driver role required']);
            exit;
        }
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Role check failed']);
        exit;
    }

    // Read and decode the JSON request body
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload']);
        exit;
    }

    // Extract user-supplied fields; keep simple defaults for validation below
    $startLocation     = trim($data['startLocation'] ?? '');
    $destination       = trim($data['destination'] ?? '');
    $seats             = isset($data['seats']) ? (int)$data['seats'] : 0;
    $cost              = isset($data['cost']) ? (float)$data['cost'] : 0.0;
    $departure         = trim($data['departure'] ?? ''); // ISO datetime (first slot)
    $departureDisplay  = trim($data['departureTimeDisplay'] ?? ''); // "hh:mm AM/PM - hh:mm AM/PM"
    $destLat       = $data['destLat'] ?? null;
    $destLng       = $data['destLng'] ?? null;

    // Basic field checks to avoid inserting broken documents
    if (
        $startLocation === '' ||
        $destination === '' ||
        $seats < 1 ||
        $cost < 0 ||
        $departure === ''
    ) {
        http_response_code(422);
        echo json_encode(['error' => 'Missing or invalid fields']);
        exit;
    }

    // Parse ISO datetime from the first time slot; used for date + overlap checks
    $newStart = DateTime::createFromFormat('Y-m-d\TH:i', $departure);
    if (!$newStart) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid departure datetime format']);
        exit;
    }

    // Default duration window used for overlap checks (30 minutes)
    $newEnd = clone $newStart;
    $newEnd->modify('+30 minutes');

    // Normalize ride date (YYYY-MM-DD) for grouping and conflict detection
    $rideDate = $newStart->format('Y-m-d');

    // Find the current user's rides on the same date that aren't completed
    $ridesColl = $db->selectCollection('rides');
    $existingRides = $ridesColl->find([
        'driverId' => $currentUserId,
        'date'     => $rideDate,
        'status'   => ['$ne' => 'completed']
    ]);

    foreach ($existingRides as $ride) {
        if (!isset($ride['departureTime'])) continue;

        // Convert stored time (H:i) into a DateTime for overlap checking
        $existingStart = DateTime::createFromFormat(
            'Y-m-d H:i',
            $rideDate . ' ' . $ride['departureTime']
        );

        if (!$existingStart) continue;

        $existingEnd = clone $existingStart;
        $existingEnd->modify('+30 minutes');

        // Simple overlap check: windows intersect
        if ($newStart < $existingEnd && $existingStart < $newEnd) {
            http_response_code(409);
            echo json_encode([
                'error' => 'You already have a carpool scheduled at ' . $ride['departureTime']
            ]);
            exit;
        }
    }

    // Try to pick a verified vehicle for the driver, else fall back to first available
    $carId = null;
    try {
        $vehColl = $db->selectCollection('vehicles');
        $cursor = $vehColl->find(['ownerId' => $currentUserId]);

        foreach ($cursor as $veh) {
            if (!empty($veh['isVerified']) && isset($veh['carId'])) {
                $carId = $veh['carId'];
                break;
            }
            if (!$carId && isset($veh['carId'])) {
                $carId = $veh['carId'];
            }
        }
    } catch (Throwable $e) {
    }

    // Simple ride id generator; replace with a stronger scheme if needed
    $rideId = 'R' . str_pad((string)rand(1, 999999), 4, '0', STR_PAD_LEFT);

    // Assemble the ride document for insertion
    $doc = [
        'rideId'         => $rideId,
        'carId'          => $carId,
        'driverId'       => $currentUserId,
        'date'           => $rideDate,
        // Store the two-slot display string when provided; fallback to HH:MM
        'departureTime'  => ($departureDisplay !== '' ? $departureDisplay : $newStart->format('H:i')),
        'stationedAt'    => $startLocation,
        'destination'    => $destination,
        'availableSeats' => $seats,
        'bookedSeats'    => 0,
        'status'         => 'available',
        'passengers'     => [],
        'price'          => $cost
    ];

    if ($destLat !== null && $destLng !== null) {
        $doc['destinationLocation'] = [
            'lat' => (float)$destLat,
            'lng' => (float)$destLng
        ];
    }

    // Insert the ride into the database
    $collection = $db->selectCollection('rides');
    $result = $collection->insertOne($doc);

    try {
        // Create a simple driver notification confirming creation (deduped)
        $notifColl = $db->selectCollection('notifications');
        $notif = [
            'rideId'      => $rideId,
            'driverId'    => $currentUserId,
            'passengerId' => null,
            'carId'       => $carId,
            'type'        => 'carpool_created',
            'audience'    => 'driver',
            'message'     => "Carpool created: {$startLocation} → {$destination} at {$doc['departureTime']}",
            'timestamp'   => new MongoDB\BSON\UTCDateTime(),
            'isRead'      => false
        ];

        $exists = $notifColl->findOne([
            'driverId' => $currentUserId,
            'rideId'   => $rideId,
            'type'     => 'carpool_created'
        ]);

        if (!$exists) {
            $notifColl->insertOne($notif);
        }
    } catch (Throwable $e) {
        // Notifications are best-effort; ignore failures
    }

    // Success response with ids for client reference
    echo json_encode([
        'ok' => true,
        'rideId' => $rideId,
        'insertedId' => (string)$result->getInsertedId()
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
