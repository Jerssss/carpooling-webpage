<?php
require __DIR__ . '/../vendor/autoload.php'; // MongoDB PHP library

// Establish MongoDB connection. Be sure MongoDB server is on!
$client = new MongoDB\Client("mongodb://localhost:27017/");

// Select the databases and collections
$ridesCollection = $client->carpooling_data->rides;
$usersCollection = $client->carpooling_data->users;

// QUERYING. Imagine niyo 'to as a "Prepared Statement" like in SQL

// Use aggregation to "join" rides with users. SQL equivalent of pipile: left join on
$pipeline = [
    [
        // Lookup is equivalent to JOIN in SQL
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

// Execute aggregation pipeline
$results = $ridesCollection->aggregate($pipeline);

$carpools = [];

// Fetch the required data to generate dynamic content
foreach ($results as $ride) {
    $carpools[] = [

        // Extract driver info from users collection
        'name' => $ride['driverInfo']['name'],
        'email' => $ride['driverInfo']['email'],
        'role' => ucfirst($ride['driverInfo']['role']),

        // Extract ride info from rides collection
        'vehicle' => isset($ride['carId']) ? $ride['carId'] : 'Unknown Vehicle',
        'availableSeats' => $ride['availableSeats'],
        'status' => ucfirst($ride['status']),

        // Formating the time
        'leavingTime' => date("g:i A", strtotime($ride['departureTime'])),

        'photo' => 'images/sample-pfp.png' // placeholder photo
    ];
}


// Return JSON to frontend (Javascript will then give it to the html file as dynamic content)
header('Content-Type: application/json');
echo json_encode($carpools); // Converts PHP array to JSON String
?>