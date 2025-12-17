<?php
// ----------------------------
// fetch_carpool.php
// ----------------------------

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/cookies.php';
require_once __DIR__ . '/../../includes/db_connect.php';

// ----------------------------
// Check session
// ----------------------------
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];

// Allow only passengers
if (($_SESSION['role'] ?? '') !== 'passenger') {
    try {
        $u = $db->users->findOne(
            ['userID' => $_SESSION['user_id']], 
            ['projection' => ['roles' => 1, 'role' => 1]]
        );

        $hasPassenger = false;
        if ($u) {
            if (!empty($u['roles']) && is_array($u['roles'])) {
                foreach ($u['roles'] as $r) {
                    if (strtolower((string)$r) === 'passenger') { 
                        $hasPassenger = true; 
                        break; 
                    }
                }
            }
            if (
                !$hasPassenger &&
                isset($u['role']) &&
                strtolower((string)$u['role']) === 'passenger'
            ) {
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

// ----------------------------
// Helpers
// ----------------------------
function normalize_asset_path($path, $default) {
    if (!is_string($path) || $path === '') return $default;
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
    if (strpos($path, '../') === 0) return $path;
    if (strpos($path, 'images/') === 0) return '../' . $path;
    return $path;
}

function computeDestType($stationedAt, $destination) {
    $stationedAtLower = strtolower($stationedAt ?? '');
    $destinationLower = strtolower($destination ?? '');
    if (strpos($destinationLower, 'maryheights campus') !== false) return 'to_maryheights';
    if (strpos($stationedAtLower, 'maryheights campus') !== false) return 'from_maryheights';
    return 'other';
}

// ----------------------------
// Collections
// ----------------------------
$ridesCollection = $db->rides;

// ----------------------------
// Filters from GET
// ----------------------------
$search         = $_GET['search'] ?? '';
$seatFilter     = $_GET['seat'] ?? '';
$roleFilter     = $_GET['role'] ?? '';
$destTypeFilter = $_GET['dest_type'] ?? '';
$dateFilter     = $_GET['date'] ?? '';

// Save search & seat to cookies
if ($search) set_app_cookie('last_search', $search);
if ($seatFilter) set_app_cookie('last_seat', $seatFilter);

// ----------------------------
// Get all unique seats (for dropdown) BEFORE filtering
// ----------------------------
$allSeatsCursor = $ridesCollection->find(
    ['driverId' => ['$ne' => $_SESSION['user_id']]],
    ['projection' => ['availableSeats' => 1]]
);

$allSeats = [];
foreach ($allSeatsCursor as $r) {
    $seat = $r['availableSeats'] ?? 0;
    if (!in_array($seat, $allSeats)) $allSeats[] = $seat;
}
sort($allSeats);

// ----------------------------
// Aggregation pipeline
// ----------------------------
$pipeline = [
    ['$lookup' => [
        'from' => 'users',
        'localField' => 'driverId',
        'foreignField' => 'userID',
        'as' => 'driverInfo'
    ]],
    ['$unwind' => '$driverInfo'],
    ['$addFields' => [
        'isBooked' => [
            '$in' => [
                $userId,
                '$passengers.userId'
            ]
        ]
    ]]
];

// ----------------------------
// MATCH FILTERS
// ----------------------------
$match = [];

// exclude own rides
$match['driverId'] = ['$ne' => $_SESSION['user_id']];

// ✅ EXCLUDE INACTIVE RIDES
$match['status'] = ['$ne' => 'inactive'];

if ($search) {
    $match['$or'] = [
        ['driverInfo.name' => ['$regex' => $search, '$options' => 'i']],
        ['stationedAt' => ['$regex' => $search, '$options' => 'i']],
        ['destination' => ['$regex' => $search, '$options' => 'i']],
    ];
}

if ($seatFilter) {
    $seat = (int)$seatFilter;
    $match['availableSeats'] = $seat >= 3 ? ['$gte' => 3] : $seat;
}

if ($roleFilter) {
    $match['driverInfo.occupation'] = strtolower($roleFilter);
}

$pipeline[] = ['$match' => $match];

// ----------------------------
// Execute query
// ----------------------------
$results = $ridesCollection->aggregate($pipeline);

// ----------------------------
// Build response
// ----------------------------
$carpools = [];
foreach ($results as $ride) {
    $destType = computeDestType($ride['stationedAt'], $ride['destination']);

    if ($destTypeFilter && $destType !== $destTypeFilter) continue;
    if ($dateFilter && ($ride['date'] ?? '') !== $dateFilter) continue;

    $photo = normalize_asset_path(
        $ride['driverInfo']['picture'] ?? null,
        '../images/profile_pics/default-pic.png'
    );

    $isBooked = $ride['isBooked'] ?? false;

    $carpools[] = [
        'rideId' => $ride['rideId'],
        'driverId' => $ride['driverInfo']['userID'],
        'name' => $ride['driverInfo']['name'],
        'email' => $ride['driverInfo']['email'],
        'occupation' => ucfirst($ride['driverInfo']['occupation']),
        'stationedAt' => $ride['stationedAt'] ?? 'Unknown Location',
        'availableSeats' => $ride['availableSeats'] ?? 0,
        'destination' => $ride['destination'],
        'status' => ucfirst($ride['status']),
        'dest_type' => $destType,
        'date' => $ride['date'] ?? '',
        'leavingTime' => $ride['departureTime'],
        'photo' => $photo,
        'isBooked' => $isBooked,
        'bookingStatus' => $isBooked ? 'Already booked' : null
    ];
}

// ----------------------------
// Return JSON
// ----------------------------
echo json_encode([
    'carpools' => $carpools,
    'seatOptions' => $allSeats
]);
