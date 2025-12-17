<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json; charset=utf-8');
// error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

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

// Check if user has driver role (support both 'role' string and 'roles' array)
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


$historyCol = $db->history;
$usersCol   = $db->users;
$reviewsCol = $db->reviews;
$vehiclesCol = $db->vehicles; // vehicles collection (for resolving car make/model/photo)


try {
    $driverId = trim($_SESSION['user_id']); // Remove any extra whitespace using trim

    // Debug: Check user ID
    error_log("Searching for driverId: " . $driverId);

    // Debug: Check all documents in history collection
    $allDocs = $historyCol->find()->toArray();
    error_log("Total history documents: " . count($allDocs));

    // Log the first document to see structure
    if (count($allDocs) > 0) {
        error_log("Sample document driverId: " . ($allDocs[0]['driverId'] ?? 'NOT SET'));
        error_log("Sample document status: " . ($allDocs[0]['status'] ?? 'NOT SET'));
    }

    // Fetch all completed history rides for this driver
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


        $history[] = [
            'historyId'       => $h['historyId'] ?? '',
            'rideId'          => $h['rideId'] ?? '',
            'date'            => $h['date'] ?? '',
            'time'            => $h['time'] ?? '',
            'from'            => $h['pickupLocation'] ?? '',
            'to'              => $h['dropoffLocation'] ?? '',
            'fare'            => $h['fare'] ?? 0,
            'passengerName'   => $passengerName,
            'passengerPicture'=> $passengerPicture,
            'rating'          => $review['rating'] ?? 'No rating',
            'comment'         => $review['comment'] ?? 'No comment',
            // Resolve vehicle details when possible so UI can show make/model/plate and a photo
            'carId'           => $h['carId'] ?? '',
            'carMake'         => '',
            'carModel'        => '',
            'plateNo'         => '',
            'car'             => ($h['carId'] ?? 'Unknown'),
            // Attempt to include a car photo if available in the ride document or vehicles collection
            'carPhoto'        => $h['carPhoto'] ?? ($h['vehicleInfo']['carPhoto'] ?? ($h['vehiclePhoto'] ?? ''))
        ];

        // Try to enrich with vehicle collection data (separate lookup to avoid breaking existing structure)
        if (!empty($h['carId']) && isset($vehiclesCol)) {
            try {
                $veh = $vehiclesCol->findOne(['carId' => $h['carId']]);
                if ($veh) {
                    // Prefer vehicle collection fields when available
                    $history[count($history)-1]['carMake'] = $veh['carMake'] ?? $history[count($history)-1]['carMake'];
                    $history[count($history)-1]['carModel'] = $veh['carModel'] ?? $history[count($history)-1]['carModel'];
                    $history[count($history)-1]['plateNo']  = $veh['plateNo'] ?? $history[count($history)-1]['plateNo'];

                    // Build a friendly car description
                    $friendly = trim(($history[count($history)-1]['carMake'] . ' ' . $history[count($history)-1]['carModel']));
                    if (!empty($history[count($history)-1]['plateNo'])) {
                        $friendly .= ($friendly ? ' — ' : '') . $history[count($history)-1]['plateNo'];
                    }
                    $history[count($history)-1]['car'] = $friendly ?: ($h['carId'] ?? 'Unknown');

                    // Prefer vehicle photo if no carPhoto was set on the ride
                    if (empty($history[count($history)-1]['carPhoto'])) {
                        $history[count($history)-1]['carPhoto'] = $veh['carPhoto'] ?? '';
                    }
                }
            } catch (Throwable $e) {
                // Non-fatal: keep original values and continue
                error_log('Vehicle lookup failed for carId: ' . ($h['carId'] ?? '')); 
            }
        }
    }

    echo json_encode([
        'success' => true,
        'history' => array_values($history),
        'debug' => [
            'searchedDriverId' => $driverId,
            'totalHistoryDocs' => count($allDocs),
            'matchedDocs' => count($historyDocs),
            'sampleDriverIds' => array_slice(array_map(function($doc) {
                return $doc['driverId'] ?? 'NOT SET';
            }, $allDocs), 0, 5)
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
