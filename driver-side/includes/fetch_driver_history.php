<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json; charset=utf-8');

// Ensure user is logged in and has 'driver' role
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Unauthorized', 
        'session_user_id' => $_SESSION['user_id'] ?? null,
        'session_roles' => $_SESSION['roles'] ?? null
    ]);
    exit;
}

// Check if user has driver role
$isDriver = false;

// Check 'role' string
if (isset($_SESSION['role']) && strtolower($_SESSION['role']) === 'driver') {
    $isDriver = true;
}

// Check 'roles' array (fallback)
if (!$isDriver && isset($_SESSION['roles']) && is_array($_SESSION['roles'])) {
    if (in_array('driver', array_map('strtolower', $_SESSION['roles']))) {
        $isDriver = true;
    }
}

if (!$isDriver) {
    http_response_code(403);
    echo json_encode([
        'error' => 'Forbidden - Not a driver',
        'session_role' => $_SESSION['role'] ?? null,
        'session_roles' => $_SESSION['roles'] ?? null
    ]);
    exit;
}

$historyCol  = $db->history;
$usersCol    = $db->users;
$reviewsCol  = $db->reviews;
$vehiclesCol = $db->vehicles;
$ridesCol    = $db->rides; 

try {
    $driverId = trim($_SESSION['user_id']);

    // Debug logs
    error_log("Searching for driverId: " . $driverId);

    $allDocs = $historyCol->find()->toArray();
    error_log("Total history documents: " . count($allDocs));

    if (count($allDocs) > 0) {
        error_log("Sample document driverId: " . ($allDocs[0]['driverId'] ?? 'NOT SET'));
        error_log("Sample document status: " . ($allDocs[0]['status'] ?? 'NOT SET'));
    }

    // Fetch completed rides for driver
    $historyDocs = $historyCol->find([
        'driverId' => $driverId,
        'status'   => 'completed'
    ])->toArray();

    error_log("Matched documents: " . count($historyDocs));

    $history = [];

    foreach ($historyDocs as $h) {

        // Fetch passenger info
        $user = $usersCol->findOne(['userID' => $h['passengerId']]);
        $passengerName = $user['name'] ?? 'Unknown';
        $passengerPicture = $user['picture'] ?? '../images/profile_pics/default.png';

        // Fetch review if exists
        $rideId = $h['rideId'] ?? null;
        $review = null;

        if ($rideId) {
            $review = $reviewsCol->findOne([
                'rideId' => $rideId,
                'passengerId' => $h['passengerId'],
                'driverId' => $driverId
            ]);
        }

        $ridePrice = 0;
        if (!empty($h['rideId'])) {
            $rideDoc = $ridesCol->findOne(['rideId' => $h['rideId']]);
            if ($rideDoc && isset($rideDoc['price'])) {
                $ridePrice = $rideDoc['price'];
            }
        }

        $history[] = [
            'historyId'        => $h['historyId'] ?? '',
            'rideId'           => $h['rideId'] ?? '',
            'date'             => $h['date'] ?? '',
            'time'             => $h['time'] ?? '',
            'from'             => $h['pickupLocation'] ?? '',
            'to'               => $h['dropoffLocation'] ?? '',
            'fare'             => $ridePrice ?: ($h['fare'] ?? 0), 
            'passengerName'    => $passengerName,
            'passengerPicture' => $passengerPicture,
            'rating'           => $review['rating'] ?? 'No rating',
            'comment'          => $review['comment'] ?? 'No comment',
            'carId'            => $h['carId'] ?? '',
            'carMake'          => '',
            'carModel'         => '',
            'plateNo'          => '',
            'car'              => ($h['carId'] ?? 'Unknown'),
            'carPhoto'         => $h['carPhoto'] ?? ($h['vehicleInfo']['carPhoto'] ?? ($h['vehiclePhoto'] ?? ''))
        ];

        if (!empty($h['carId'])) {
            try {
                $veh = $vehiclesCol->findOne(['carId' => $h['carId']]);
                if ($veh) {
                    $idx = count($history) - 1;

                    $history[$idx]['carMake'] = $veh['carMake'] ?? '';
                    $history[$idx]['carModel'] = $veh['carModel'] ?? '';
                    $history[$idx]['plateNo']  = $veh['plateNo'] ?? '';

                    $friendly = trim($history[$idx]['carMake'] . ' ' . $history[$idx]['carModel']);
                    if (!empty($history[$idx]['plateNo'])) {
                        $friendly .= ' — ' . $history[$idx]['plateNo'];
                    }
                    $history[$idx]['car'] = $friendly ?: ($h['carId'] ?? 'Unknown');

                    if (empty($history[$idx]['carPhoto'])) {
                        $history[$idx]['carPhoto'] = $veh['carPhoto'] ?? '';
                    }
                }
            } catch (Throwable $e) {
                error_log("Vehicle lookup failed for carId: " . ($h['carId'] ?? ''));
            }
        }
    }

    echo json_encode([
        'success' => true,
        'history' => array_values($history),
        'debug' => [
            'searchedDriverId' => $driverId,
            'totalHistoryDocs' => count($allDocs),
            'matchedDocs' => count($historyDocs)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
