<?php
// JSON endpoint to create a driver carpool ride
header('Content-Type: application/json');

try {
    // Session + DB
    require_once __DIR__ . '/../../includes/session.php';
    require_once __DIR__ . '/../../includes/db_connect.php';

    // Require authenticated user and verify driver role from DB
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    $currentUserId = $_SESSION['user_id'];
    try {
        $userDoc = $db->selectCollection('users')->findOne(['userID' => $currentUserId], ['projection' => ['roles' => 1, 'role' => 1]]);
        $roles = isset($userDoc['roles']) && is_array($userDoc['roles']) ? array_map('strtolower', $userDoc['roles']) : [];
        $roleStr = isset($userDoc['role']) ? strtolower((string)$userDoc['role']) : '';
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

    // Resolve driver's carId from vehicles collection (ownerId matches session user)
    $carId = null;
    try {
        $vehColl = $db->selectCollection('vehicles');
        $cursor = $vehColl->find(['ownerId' => $currentUserId]);
        foreach ($cursor as $veh) {
            // Prefer verified vehicles
            if (isset($veh['isVerified']) && $veh['isVerified'] && isset($veh['carId'])) {
                $carId = $veh['carId'];
                break;
            }
            if (!$carId && isset($veh['carId'])) {
                $carId = $veh['carId'];
            }
        }
    } catch (Throwable $e) {
        // Leave carId null if lookup fails
    }

    // Build ride document following reference schema
    $rideId = 'R' . str_pad(strval(rand(1, 999999)), 4, '0', STR_PAD_LEFT);
    $datePart = substr($departure, 0, 10); // YYYY-MM-DD
    $timePart = substr($departure, 11); // HH:MM

    $doc = [
        'rideId' => $rideId,
        'carId' => $carId,
        'driverId' => $currentUserId,
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
        $doc['destinationLocation'] = ['lat' => (float)$destLat, 'lng' => (float)$destLng];
    }

    // Insert into MongoDB
    $collection = $db->selectCollection('rides');
    $result = $collection->insertOne($doc);

    // Insert a driver-facing notification about successful carpool creation
    try {
        $notifColl = $db->selectCollection('notifications');
        $msg = "Carpool created: {$startLocation} → {$destination} at {$timePart}";
        $notif = [
            'rideId' => $rideId,
            'driverId' => $_SESSION['user_id'],
            'passengerId' => null,
            'carId' => $carId,
            'type' => 'carpool_created',
            'audience' => 'driver',
            'message' => $msg,
            'timestamp' => new MongoDB\BSON\UTCDateTime(),
            'isRead' => false
        ];
        // Deduplicate by (driverId, rideId, type)
        $exists = $notifColl->findOne([
            'driverId' => $notif['driverId'],
            'rideId' => $notif['rideId'],
            'type' => $notif['type']
        ]);
        if (!$exists) {
            $notifColl->insertOne($notif);
        }
    } catch (Throwable $e) {
        // Non-fatal
    }

    echo json_encode(['ok' => true, 'rideId' => $rideId, 'insertedId' => (string)$result->getInsertedId()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
