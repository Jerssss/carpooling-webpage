<?php
require __DIR__ . '/../vendor/autoload.php'; // MongoDB PHP library

// Establish MongoDB connection
$client = new MongoDB\Client("mongodb://localhost:27017/");

// Select the databases and collections
$ridesCollection = $client->carpooling_data->rides;
$usersCollection = $client->carpooling_data->users;

// QUERYING. Imagine niyo 'to as a "Prepared Statement" like in SQL
// Use aggregation to "join" rides with users
$pipeline = [
    [
        '$lookup' => [
            'from' => 'users', // target collection name
            'localField' => 'driverId', // field from rides
            'foreignField' => 'userID', // field from users
            'as' => 'driverInfo' // alias for joined data
        ]
    ],
    [
        '$unwind' => '$driverInfo' // flatten array (each ride has one driver)
    ]
];

$results = $ridesCollection->aggregate($pipeline);

$carpools = [];

// Fetch the required data to generate dynamic content
foreach ($results as $ride) {
    $carpools[] = [
        'name' => $ride['driverInfo']['name'],
        'email' => $ride['driverInfo']['email'],
        'role' => ucfirst($ride['driverInfo']['role']),
        'vehicle' => isset($ride['carId']) ? $ride['carId'] : 'Unknown Vehicle',
        'availableSeats' => $ride['availableSeats'],
        'status' => ucfirst($ride['status']),
        'leavingTime' => date("g:i A", strtotime($ride['departureTime'])),
        'photo' => 'images/sample-pfp.png' // placeholder photo
    ];
}
// Return JSON to frontend
header('Content-Type: application/json');
echo json_encode($carpools);
?>