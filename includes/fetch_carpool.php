<?php
require __DIR__ . '/../vendor/autoload.php'; // MongoDB PHP library

// Establish MongoDB connection. Note: Ensure that MongoDB compass server is on
$client = new MongoDB\Client("mongodb://localhost:27017/");

// Select the databases and collections
$ridesCollection = $client->carpooling_data->rides;
$usersCollection = $client->carpooling_data->users;

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
    if ($seat >= 4) {
        $match['availableSeats'] = ['$gte' => 4];
    } else {
        $match['availableSeats'] = $seat;
    }
}

if (!empty($_GET['booked'])) {
    if ($_GET['booked'] === 'empty') {
        $match['bookedSeats'] = 0;
    } elseif ($_GET['booked'] === 'partial') {
        $match['$expr'] = [
            '$and' => [
                ['$gt' => ['$bookedSeats', 0]],
                ['$lt' => ['$bookedSeats', '$availableSeats']]
            ]
        ];
    } elseif ($_GET['booked'] === 'full') {
        $match['$expr'] = [
            '$eq' => ['$bookedSeats', '$availableSeats']
        ];
    }
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
    $carpools[] = [
        // Extract driver info from users collection
        'rideId' => $ride['rideId'], // To be used for the "View carpool details" feature
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
        'photo' => $ride['driverInfo']['picture'] ?? 'images/profile_pics/default-pic.png'
    ];
}


// Return JSON to frontend (Javascript will then give it to the html file as dynamic content)
header('Content-Type: application/json');
echo json_encode($carpools); // Converts PHP array to JSON String
?>