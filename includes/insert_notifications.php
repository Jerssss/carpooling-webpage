<?php
// includes/insert_notifications.php
// Reusable function to insert notifications for passengers of a ride.
// Assumes $db (MongoDB\Database) is passed in.

function insertNotificationForRide($db, $rideData, $status)
{
    $notifications = $db->notifications;
    $bookings = $db->bookings;
    $users = $db->users;
    $vehicles = $db->vehicles;

    // Get all bookings for this ride
    $passengerBookings = $bookings->find(['rideId' => $rideData['rideId']]);

    // Get driver info
    $driver = $users->findOne(['userID' => $rideData['driverId']]);
    // rideData should contain carId (from rides collection)
    $vehicle = $vehicles->findOne(['carId' => $rideData['carId']]);

    // If no driver or vehicle info, still proceed with fallbacks
    $driverName = $driver['name'] ?? 'Driver';
    $destination = $rideData['destination'] ?? 'destination';
    $plateNo = $vehicle['plateNo'] ?? 'N/A';
    $rideId = $rideData['rideId'] ?? null;
    $driverId = $rideData['driverId'] ?? null;
    $carId = $rideData['carId'] ?? null;

    $messages = [
        'on_the_way' => "Driver {$driverName} bound to {$destination} is on the way, with plate no. {$plateNo}",
        'arrived'    => "Driver {$driverName} bound to {$destination} has arrived, with plate no. {$plateNo}"
    ];

    $message = $messages[$status] ?? ("Driver {$driverName} update: {$status}");

    // Current timestamp in ISO 8601 Zulu (e.g. 2025-11-03T06:30:00Z)
    $isoTs = gmdate('Y-m-d\TH:i:s\Z');

    foreach ($passengerBookings as $b) {
        // booking documents in your DB have passengerId field
        $passengerId = $b['passengerId'] ?? ($b['userId'] ?? null);
        if (!$passengerId) continue;

        $doc = [
            'rideId'     => $rideId,
            'driverId'   => $driverId,
            'carId'      => $carId,
            'passengerId'=> $passengerId,
            'status'     => $status,
            'message'    => $message,
            'timestamp'  => $isoTs,
            'isRead'     => false
        ];

        $notifications->insertOne($doc);
    }
}
