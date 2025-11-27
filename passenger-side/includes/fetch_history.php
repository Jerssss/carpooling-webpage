<?php
require_once __DIR__ . '/../../includes/db_connect.php';
header('Content-Type: application/json; charset=utf-8');

$ridesCol = $db->rides;
$bookingsCol = $db->bookings;
$paymentsCol = $db->payments;

try {
    // Fetch all bookings for the user (currently all bookings)
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

    $now = new DateTime();

    foreach ($rideDocs as $ride) {
        $rideDateStr = rtrim($ride['date'], ': ');
        $startTimeStr = explode(' - ', $ride['departureTime'])[0];
        $rideDateTime = DateTime::createFromFormat('Y-m-d h:i A', "$rideDateStr $startTimeStr");

        $paymentsForRide = $ridePaymentsMap[$ride['rideId']] ?? [];

        // Determine if this ride is upcoming: any payment pending
        $statuses = array_map(fn($p) => strtolower($p['status'] ?? ''), $paymentsForRide);
        $isUpcoming = in_array('pending', $statuses);

        // Take the pickupLocation from the first payment if exists
        $pickupLocation = $paymentsForRide[0]['pickupLocation'] ?? '';

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
