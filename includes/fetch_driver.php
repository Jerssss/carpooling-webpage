<?php
require __DIR__ . '/../vendor/autoload.php';

use MongoDB\Client;

// Connect to MongoDB
$client = new Client("mongodb://localhost:27017");
$db = $client->carpooling_data;

$users = $db->users;
$vehicles = $db->vehicles;
$rides = $db->rides;
$reviews = $db->reviews;
$bookings = $db->bookings;

// Get driverId from URL
$driverId = $_GET['driverId'] ?? null;

if (!$driverId) {
    echo json_encode(["error" => "Driver ID not provided"]);
    exit;
}

try {
    // Get basic driver info using userID (NOT ObjectId)
    $driver = $users->findOne(['userID' => $driverId]);

    if (!$driver) {
        echo json_encode(["error" => "Driver not found"]);
        exit;
    }

    // Get driver's vehicles (ownerId matches userID)
    $driverVehicles = $vehicles->find(['ownerId' => $driverId])->toArray();

    // Get driver's rides
    $driverRides = $rides->find(['driverId' => $driverId])->toArray();

    // Get reviews for this driver
    $driverReviews = $reviews->find(['driverId' => $driverId])->toArray();

    // Get all bookings where this driver is the driver
    $driverBookings = $bookings->find(['driverId' => $driverId])->toArray();

    // Combine all
    $driverProfile = [
        "driver_info" => $driver,
        "vehicles" => $driverVehicles,
        "rides" => $driverRides,
        "reviews" => $driverReviews,
        "bookings" => $driverBookings
    ];

    header("Content-Type: application/json");
    echo json_encode($driverProfile, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
