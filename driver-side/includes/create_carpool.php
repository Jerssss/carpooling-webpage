<?php
header('Content-Type: application/json');

try {
    // Session + DB
    require_once __DIR__ . '/../../includes/session.php';
    require_once __DIR__ . '/../../includes/db_connect.php';

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    $currentUserId = $_SESSION['user_id'];

    try {
        $userDoc = $db->selectCollection('users')->findOne(
            ['userID' => $currentUserId],
            ['projection' => ['roles' => 1, 'role' => 1]]
        );

        $roles = isset($userDoc['roles']) && is_array($userDoc['roles'])
            ? array_map('strtolower', $userDoc['roles'])
            : [];

        $roleStr = isset($userDoc['role'])
            ? strtolower((string)$userDoc['role'])
            : '';

        if (!(in_array('driver', $roles, true) || $roleStr === 'driver')) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: driver role required']);
            exit;
        }
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Role check failed']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload']);
        exit;
    }

    $startLocation = trim($data['startLocation'] ?? '');
    $destination   = trim($data['destination'] ?? '');
    $seats         = isset($data['seats']) ? (int)$data['seats'] : 0;
    $cost          = isset($data['cost']) ? (float)$data['cost'] : 0.0;
    $departure     = trim($data['departure'] ?? '');
    $destLat       = $data['destLat'] ?? null;
    $destLng       = $data['destLng'] ?? null;

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

    $newStart = DateTime::createFromFormat('Y-m-d\TH:i', $departure);
    if (!$newStart) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid departure datetime format']);
        exit;
    }

    $newEnd = clone $newStart;
    $newEnd->modify('+30 minutes');

    $rideDate = $newStart->format('Y-m-d');

    $ridesColl = $db->selectCollection('rides');
    $existingRides = $ridesColl->find([
        'driverId' => $currentUserId,
        'date'     => $rideDate,
        'status'   => ['$ne' => 'completed']
    ]);

    foreach ($existingRides as $ride) {
        if (!isset($ride['departureTime'])) continue;

        $existingStart = DateTime::createFromFormat(
            'Y-m-d H:i',
            $rideDate . ' ' . $ride['departureTime']
        );

        if (!$existingStart) continue;

        $existingEnd = clone $existingStart;
        $existingEnd->modify('+30 minutes');

        if ($newStart < $existingEnd && $existingStart < $newEnd) {
            http_response_code(409);
            echo json_encode([
                'error' => 'You already have a carpool scheduled at ' . $ride['departureTime']
            ]);
            exit;
        }
    }

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

    $rideId = 'R' . str_pad((string)rand(1, 999999), 4, '0', STR_PAD_LEFT);

    $doc = [
        'rideId'         => $rideId,
        'carId'          => $carId,
        'driverId'       => $currentUserId,
        'date'           => $rideDate,
        'departureTime'  => $newStart->format('H:i'),
        'stationedAt'    => $startLocation,
        'destination'    => $destination,
        'availableSeats' => $seats,
        'bookedSeats'    => 0,
        'status'         => 'available',
        'passengers'     => [],
        'for'            => 'pickup',
        'price'          => $cost
    ];

    if ($destLat !== null && $destLng !== null) {
        $doc['destinationLocation'] = [
            'lat' => (float)$destLat,
            'lng' => (float)$destLng
        ];
    }

    $collection = $db->selectCollection('rides');
    $result = $collection->insertOne($doc);

    try {
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
        // Non-fatal
    }

    echo json_encode([
        'ok' => true,
        'rideId' => $rideId,
        'insertedId' => (string)$result->getInsertedId()
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
