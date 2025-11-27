<?php
require_once __DIR__ . '/../../includes/db_connect.php';
header('Content-Type: application/json; charset=utf-8');

$ridesCol = $db->rides;
$bookingsCol = $db->bookings;
$paymentsCol = $db->payments;

try {
    // Fetch all bookings (you may filter by userId if needed)
    $bookingDocs = $bookingsCol->find()->toArray();
    $rideIds = array_map(fn($b) => $b['rideId'], $bookingDocs);

    if (empty($rideIds)) {
        echo json_encode(['upcoming' => [], 'finished' => []]);
        exit;
    }

    // Fetch rides
    $rideDocs = $ridesCol->find(['rideId' => ['$in' => $rideIds]])->toArray();

    // Fetch payments
    $paymentDocs = $paymentsCol->find(['rideId' => ['$in' => $rideIds]])->toArray();

    // Map rideId to all payments
    $ridePaymentsMap = [];
    foreach ($paymentDocs as $p) {
        $ridePaymentsMap[$p['rideId']][] = $p;
    }

    $upcoming = [];
    $finished = [];

    foreach ($rideDocs as $ride) {
        $paymentsForRide = $ridePaymentsMap[$ride['rideId']] ?? [];

        // Collect statuses and pickupLocations
        $statuses = array_map(fn($p) => strtolower($p['status'] ?? ''), $paymentsForRide);
        $pickupLocations = array_map(fn($p) => $p['pickupLocation'] ?? $ride['stationedAt'], $paymentsForRide);

        // Determine if ride is upcoming: any pending payment
        $isUpcoming = in_array('pending', $statuses);

        // Use the **first pickupLocation** (or fallback)
        $pickupLocation = $pickupLocations[0] ?? $ride['stationedAt'];

        $rideData = [
            'rideId' => $ride['rideId'],
            'stationedAt' => $ride['stationedAt'],
            'destination' => $ride['destination'],
            'price' => $ride['price'],
            'date' => $ride['date'],
            'departureTime' => $ride['departureTime'],
            'pickupLocation' => $pickupLocation,
            'status' => $statuses,
        ];

        if ($isUpcoming) {
            $upcoming[] = $rideData;
        } else {
            $finished[] = $rideData;
        }
    }

    echo json_encode([
        'upcoming' => $upcoming,
        'finished' => $finished
    ]);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
