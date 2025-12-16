<?php
// Use the shared root includes DB connector
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/cookies.php';
require_once __DIR__ . '/../../includes/db_connect.php';

function normalize_asset_path($path, $default) {
    if (!is_string($path) || $path === '') return $default;
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
    if (strpos($path, '../') === 0) return $path;
    if (strpos($path, 'images/') === 0) return '../' . $path;
    return $path;
}

// Get rideId from URL parameter
$rideId = $_GET['rideId'] ?? null;

// For proper error handling in the case that the car pool's ride ID cannot be found
if (!$rideId) {
    http_response_code(400);
    echo json_encode(['error' => 'No ride ID has been found']);
    exit;
}

// Store last viewed ride - to remember which ride the user last viewed
set_app_cookie('last_viewed_ride', $rideId);

// Collections
$ridesCollection = $db->rides;
$usersCollection = $db->users;
$vehiclesCollection = $db->vehicles;

// Aggregation pipeline to join the databases: rides, users, and vehicles
$pipeline = [
    [
        '$match' => ['rideId' => $rideId] // This is where rideId wll be used. Ride ID varies on which car pool card has been clicked
    ],
    [
        '$lookup' => [
            'from' => 'users',
            'localField' => 'driverId',
            'foreignField' => 'userID',
            'as' => 'driverInfo'
        ]
    ],
    [
        '$unwind' => '$driverInfo'
    ],
    [
        '$lookup' => [
            'from' => 'vehicles',
            'localField' => 'carId',
            'foreignField' => 'carId',
            'as' => 'vehicleInfo'
        ]
    ],
    [
        '$unwind' => '$vehicleInfo'
    ]
];

$result = $ridesCollection->aggregate($pipeline)->toArray();


// Error handling
if (empty($result)) {
    http_response_code(404);
    echo json_encode(['error' => 'Ride not found']);
    exit;
}

$ride = $result[0];

// Extract time range
$timeRange = $ride['departureTime'] ?? '00:00';

// Formatting the response
$driverPhoto = normalize_asset_path($ride['driverInfo']['picture'] ?? null, '../images/profile_pics/default-pic.png');
$carPhoto = normalize_asset_path($ride['vehicleInfo']['carPhoto'] ?? null, '../images/car_pics/default_car.png');

$rideDetails = [
    'rideId' => $ride['rideId'],
    
    // Driver info
    'driverId' => $ride['driverInfo']['userID'],
    'driverName' => $ride['driverInfo']['name'],
    'driverEmail' => $ride['driverInfo']['email'],
    'driverPhone' => $ride['driverInfo']['phoneNo'],
    'driverRating' => $ride['driverInfo']['rating'] ?? 'N/A',
    'driverPhoto' => $driverPhoto,
    
    // Vehicle info
    'carMake' => $ride['vehicleInfo']['carMake'],
    'carModel' => $ride['vehicleInfo']['carModel'],
    'plateNo' => $ride['vehicleInfo']['plateNo'],
    'carYear' => $ride['vehicleInfo']['year'],
    'carPhoto' => $carPhoto,
    
    // Ride info
    'stationedAt' => $ride['stationedAt'],
    'destination' => $ride['destination'],
    'departureTime' => $timeRange,
    'availableSeats' => $ride['availableSeats'],
    'bookedSeats' => $ride['bookedSeats'] ?? 0,
    'status' => ucfirst($ride['status']),
    'price' => $ride['price'], 
    'meetupType' => $ride['for'] ?? 'pickup',
];

header('Content-Type: application/json');
echo json_encode($rideDetails);
?>