<?php
// Use the shared root includes DB connector
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'passenger') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}


function normalize_asset_path($path, $default) {
    if (!is_string($path) || $path === '') return $default;
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
    if (strpos($path, '../') === 0) return $path;
    if (strpos($path, 'images/') === 0) return '../' . $path;
    return $path;
}

// Reuse existing DB handle
$ridesCollection = $db->rides;
$usersCollection = $db->users;


// Use aggregation to "join" rides db with users db. SQL equivalent of pipline: left join on
$pipeline = [
    [
        // Lookup is equivalent to JOIN in SQL
        '$lookup' => [
            'from' => 'users', // Target collection name
            'localField' => 'driverId', // Field from rides
            'foreignField' => 'userID', // Field from users
            'as' => 'driverInfo' // driverInfo contains all the aggregated data
        ]
    ],
    [
        '$unwind' => '$driverInfo' // Flatten array (each ride has one driver)
    ]
];


$match = [];


if (!empty($_GET['search'])) {
    $search = $_GET['search'];
    $match['$or'] = [
        ['driverInfo.name' => ['$regex' => $search, '$options' => 'i']],
        ['stationedAt' => ['$regex' => $search, '$options' => 'i']],
        ['destination' => ['$regex' => $search, '$options' => 'i']],
    ];
}


if (!empty($_GET['for'])) {
    $match['for'] = $_GET['for'];
}


if (!empty($_GET['seat'])) {
    $seat = (int) $_GET['seat'];
    if ($seat >= 3) {
        $match['availableSeats'] = ['$gte' => 3];
    } else {
        $match['availableSeats'] = $seat;
    }
}

if (!empty($_GET['role'])) { 
    $role = strtolower($_GET['role']); 
    $match['driverInfo.occupation'] = $role; 
}


if (!empty($match)) {
    $pipeline[] = ['$match' => $match];
}
// Execute aggregation pipeline
$results = $ridesCollection->aggregate($pipeline);


// Store the fetched data here
$carpools = [];


// Fetch the required data to generate dynamic content
foreach ($results as $ride) {
    $photo = $ride['driverInfo']['picture'] ?? null;
    $photo = normalize_asset_path($photo, '../images/profile_pics/default-pic.png');

    $carpools[] = [
        // Extract driver info from users collection
        'rideId' => $ride['rideId'], // To be used for the "View carpool details" feature
        'driverId' => $ride['driverInfo']['userID'],
        'name' => $ride['driverInfo']['name'],
        'email' => $ride['driverInfo']['email'],
        'occupation' => ucfirst($ride['driverInfo']['occupation']),


        // Extract ride info from rides collection
        'stationedAt' => isset($ride['stationedAt']) ? $ride['stationedAt'] : 'Unknown Location',
        'availableSeats' => $ride['availableSeats'],
        'destination' => $ride['destination'],
        'status' => ucfirst($ride['status']),
        'for' => $ride['for'],


        // Since ung format ng date and time sa db cannot be parsed, saka nalang muna ung date formatting
        // 'leavingTime' => date("g:i A", strtotime($ride['departureTime'])),
        'leavingTime' => $ride['departureTime'], // No date parsing


        // Get photopath from mongoDB
        'photo' => $photo
    ];
}




// Return JSON to frontend (Javascript will then give it to the html file as dynamic content)
header('Content-Type: application/json');
echo json_encode($carpools); // Converts PHP array to JSON String
?>
