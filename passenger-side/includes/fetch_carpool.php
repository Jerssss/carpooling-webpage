<?php
// Use the shared root includes DB connector
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/cookies.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Allow access if the user has passenger role
if (($_SESSION['role'] ?? '') !== 'passenger') {
    try {
        $u = $db->users->findOne(
            ['userID' => $_SESSION['user_id']], 
            ['projection' => ['roles' => 1, 'role' => 1]]
        );
        $hasPassenger = false;
        if ($u) {
            if (isset($u['roles']) && is_array($u['roles'])) {
                foreach ($u['roles'] as $r) {
                    if (strtolower((string)$r) === 'passenger') { $hasPassenger = true; break; }
                }
            }
            if (!$hasPassenger && isset($u['role']) && strtolower((string)$u['role']) === 'passenger') {
                $hasPassenger = true;
            }
        }
        if (!$hasPassenger) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: passenger role required']);
            exit;
        }
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Role check failed']);
        exit;
    }
}

function normalize_asset_path($path, $default) {
    if (!is_string($path) || $path === '') return $default;
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
    if (strpos($path, '../') === 0) return $path;
    if (strpos($path, 'images/') === 0) return '../' . $path;
    return $path;
}

// Collections
$ridesCollection = $db->rides;
$usersCollection = $db->users;

// Aggregation pipeline to join rides with users
$pipeline = [
    [
        '$lookup' => [
            'from' => 'users',
            'localField' => 'driverId',
            'foreignField' => 'userID',
            'as' => 'driverInfo'
        ]
    ],
    ['$unwind' => '$driverInfo']
];

$match = [];

// --- Exclude rides created by current user ---
$match['driverId'] = ['$ne' => $_SESSION['user_id']];

// Search filters
if (!empty($_GET['search'])) {
    set_app_cookie('last_search', $_GET['search']);
    $search = $_GET['search'];
    $match['$or'] = [
        ['driverInfo.name' => ['$regex' => $search, '$options' => 'i']],
        ['stationedAt' => ['$regex' => $search, '$options' => 'i']],
        ['destination' => ['$regex' => $search, '$options' => 'i']],
    ];
}

if (!empty($_GET['seat'])) {
    set_app_cookie('last_seat', $_GET['seat']);
    $seat = (int) $_GET['seat'];
    $match['availableSeats'] = $seat >= 3 ? ['$gte' => 3] : $seat;
}

if (!empty($_GET['role'])) { 
    $role = strtolower($_GET['role']); 
    $match['driverInfo.occupation'] = $role; 
}

if (!empty($match)) {
    $pipeline[] = ['$match' => $match];
}

// Execute aggregation
$results = $ridesCollection->aggregate($pipeline);

$carpools = [];

// Compute dest_type based on addresses
function computeDestType($stationedAt, $destination) {
    $stationedAtLower = strtolower($stationedAt ?? '');
    $destinationLower = strtolower($destination ?? '');
    if (strpos($destinationLower, 'maryheights campus') !== false) return 'to_maryheights';
    if (strpos($stationedAtLower, 'maryheights campus') !== false) return 'from_maryheights';
    return 'other';
}

// Build carpools array
foreach ($results as $ride) {
    $photo = normalize_asset_path($ride['driverInfo']['picture'] ?? null, '../images/profile_pics/default-pic.png');

    $carpools[] = [
        // Extract driver info from users collection
        'rideId' => $ride['rideId'], // To be used for the "View carpool details" feature
        'driverId' => $ride['driverInfo']['userID'],
        'name' => $ride['driverInfo']['name'],
        'email' => $ride['driverInfo']['email'],
        'occupation' => ucfirst($ride['driverInfo']['occupation']),
        // Extract ride info from rides collection
        'stationedAt' => $ride['stationedAt'] ?? 'Unknown Location',
        'availableSeats' => $ride['availableSeats'],
        'destination' => $ride['destination'],
        'status' => ucfirst($ride['status']),
        'dest_type' => computeDestType($ride['stationedAt'], $ride['destination']),
        
        // Since ung format ng date and time sa db cannot be parsed, saka nalang muna ung date formatting
        // 'leavingTime' => date("g:i A", strtotime($ride['departureTime'])),
        'leavingTime' => $ride['departureTime'],
        'photo' => $photo
    ];
}

header('Content-Type: application/json');
echo json_encode($carpools);
?>
