<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'passenger') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$ridesCol = $db->rides;
$bookingsCol = $db->bookings;
$paymentsCol = $db->payments;

try {
    // Fetch ALL bookings for this passenger
    $userId = $_SESSION['user_id'];

    $bookingDocs = $bookingsCol->find([
        'userId' => $userId
    ])->toArray();

    $rideIds = array_map(fn($b) => $b['rideId'], $bookingDocs);

    // No bookings → no history
    if (empty($rideIds)) {
        echo json_encode(['upcoming' => [], 'finished' => []]);
        exit;
    }

    // Fetch rides data
    $rideDocs = $ridesCol->find(['rideId' => ['$in' => $rideIds]])->toArray();

    // Fetch payments for all booked rides
    $paymentDocs = $paymentsCol->find(['rideId' => ['$in' => $rideIds]])->toArray();

    // Map rideId → list of payments
    $ridePaymentsMap = [];
    foreach ($paymentDocs as $p) {
        $ridePaymentsMap[$p['rideId']][] = $p;
    }

    $upcoming = [];
    $finished = [];

    foreach ($rideDocs as $ride) {
        $paymentsForRide = $ridePaymentsMap[$ride['rideId']] ?? [];

        // If no payments exist, treat as pending/upcoming
        if (empty($paymentsForRide)) {
            $rideData = [
                'rideId' => $ride['rideId'],
                'stationedAt' => $ride['stationedAt'],
                'destination' => $ride['destination'],
                'price' => $ride['price'],
                'date' => $ride['date'],
                'departureTime' => $ride['departureTime'],
                'name' => "Unknown", // no payment yet
                'pickupLocation' => $ride['stationedAt'],
                'status' => ['pending']
            ];
            $upcoming[] = $rideData;
            continue;
        }

        // Otherwise, loop through payments
        foreach ($paymentsForRide as $payment) {
            $status = strtolower($payment['status'] ?? '');
            $pickupLocation = $payment['pickupLocation'] ?? $ride['stationedAt'];
            $name = $payment['name'] ?? "Unknown";

            $rideData = [
                'rideId' => $ride['rideId'],
                'stationedAt' => $ride['stationedAt'],
                'destination' => $ride['destination'],
                'price' => $ride['price'],
                'date' => $ride['date'],
                'departureTime' => $ride['departureTime'],
                'name' => $name,
                'pickupLocation' => $pickupLocation,
                'status' => [$status]
            ];

            if ($status === 'pending') {
                $upcoming[] = $rideData;
            } elseif ($status === 'completed') {
                $finished[] = $rideData;
            } else {
                // any other status, treat as finished
                $finished[] = $rideData;
            }
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
