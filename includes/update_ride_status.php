<?php
// includes/update_ride_status.php
// Updates the ride status (driver must own ride) and triggers notifications.

set_include_path(__DIR__ . '/../'); // ensure vendor/autoload.php can be found
ob_start();
require 'db_connect.php';
ob_end_clean();

header('Content-Type: application/json');

$rideId   = $_POST['rideId']   ?? $_GET['rideId']   ?? null;
$driverId = $_POST['driverId'] ?? $_GET['driverId'] ?? null;
$newStatus= $_POST['newStatus']?? $_GET['newStatus'] ?? null;

if (!$rideId || !$driverId || !$newStatus) {
    echo json_encode(["error" => "Missing rideId, driverId, or newStatus"]);
    exit;
}

$validStatuses = ['on_the_way', 'arrived'];
if (!in_array($newStatus, $validStatuses)) {
    echo json_encode(["error" => "Invalid status value"]);
    exit;
}

$rides = $db->rides;

// Validate this ride belongs to this driver
$ride = $rides->findOne(['rideId' => $rideId, 'driverId' => $driverId]);
if (!$ride) {
    echo json_encode(["error" => "Ride not found or not owned by this driver"]);
    exit;
}

// Ensure ride document has carId (some datasets use carId)
if (!isset($ride['carId']) && isset($ride['carID'])) {
    $ride['carId'] = $ride['carID'];
}

// Update ride status in DB
$updateRes = $rides->updateOne(
    ['rideId' => $rideId],
    ['$set' => ['status' => $newStatus]]
);

// Trigger notifications: include the insert function and call it
require_once __DIR__ . '/insert_notifications.php';
insertNotificationForRide($db, $ride, $newStatus);

echo json_encode([
    "success" => true,
    "message" => "Ride status updated and notifications sent",
    "modifiedCount" => $updateRes->getModifiedCount()
]);
exit;
?>
