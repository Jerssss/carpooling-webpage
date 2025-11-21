<?php
require_once __DIR__ . '/db_connect.php';

function normalize_asset_path($path, $default) {
    if (!is_string($path) || $path === '') return $default;
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
    if (strpos($path, '../') === 0) return $path;
    if (strpos($path, 'images/') === 0) return '../' . $path;
    return $path;
}

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
        header('Content-Type: application/json');
        echo json_encode(["error" => "Driver not found"]);
        exit;
    }

    // Build normalized driver info
    $driverInfo = [
        'userID' => $driver['userID'] ?? '',
        'name' => $driver['name'] ?? '',
        'email' => $driver['email'] ?? '',
        'nickname' => $driver['nickname'] ?? '',
        'phoneNo' => $driver['phoneNo'] ?? '',
        'altPhoneNo' => $driver['altPhoneNo'] ?? '',
        'gender' => $driver['gender'] ?? '',
        'role' => $driver['role'] ?? ($driver['occupation'] ?? ''),
        'rating' => $driver['rating'] ?? null,
        'picture' => normalize_asset_path($driver['picture'] ?? null, '../images/default-driver.png'),
    ];

    // Vehicles owned by driver (simplified)
    $vehicleDocs = $vehicles->find(['ownerId' => $driverId]);
    $driverVehicles = [];
    foreach ($vehicleDocs as $v) {
        $driverVehicles[] = [
            'carMake' => $v['carMake'] ?? '',
            'carModel' => $v['carModel'] ?? '',
            'color' => $v['color'] ?? '',
            'plateNo' => $v['plateNo'] ?? '',
            'carPhoto' => normalize_asset_path($v['carPhoto'] ?? null, '../images/car_pics/default_car.png'),
        ];
    }

    // Optionally include rides/reviews/bookings if needed later
    $driverRides = [];
    $driverReviews = [];
    $driverBookings = [];

    $driverProfile = [
        "driver_info" => $driverInfo,
        "vehicles" => $driverVehicles,
        "rides" => $driverRides,
        "reviews" => $driverReviews,
        "bookings" => $driverBookings
    ];

    header("Content-Type: application/json");
    echo json_encode($driverProfile);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
