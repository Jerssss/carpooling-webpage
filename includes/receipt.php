<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../vendor/autoload.php'; 

try {
    // Connect to MongoDB
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $db = $client->carpooling_data;

    // Get rideId from URL parameter
    $rideId = $_GET['rideId'] ?? null;
    if (!$rideId) {
        http_response_code(400);
        echo json_encode(['error' => 'Ride ID is required']);
        exit;
    }

    // Find payment based on rideId
    $payment = $db->payments->findOne(['rideId' => $rideId]);
    if (!$payment) {
        echo json_encode(['error' => 'No payment found for this ride ID']);
        exit;
    }

    // Convert BSON to PHP array
    $payment = json_decode(json_encode($payment), true);

    // Fetch ride info
    $ride = $db->rides->findOne(['rideId' => $rideId]);
    $ride = $ride ? json_decode(json_encode($ride), true) : null;

    // Fetch driver info
    $driver = null;
    if ($ride && isset($ride['driverId'])) {
        $driver = $db->users->findOne(['userID' => $ride['driverId']]);
        $driver = $driver ? json_decode(json_encode($driver), true) : null;
    }

    // Calculate totals
    $subtotal = $payment['amount'] ?? 0;
    $discount = 0; // Add your discount logic here if needed
    $total = $subtotal - $discount;

    // Prepare receipt data
    $receiptData = [
        'method' => $payment['method'] ?? 'N/A',
        'rideId' => $rideId,
        'pickupTime' => $payment['pickupTime'] ?? 'N/A',
        'paymentId' => $payment['paymentId'] ?? 'N/A',
        'destination' => $ride['destination'] ?? 'N/A',
        'discount' => $discount,
        'subtotal' => $subtotal,
        'total' => $total,
        'status' => $payment['status'] ?? 'N/A',
        'gcashRefNumber' => $payment['gcashRefNumber'] ?? 'N/A',
        'timestamp' => $payment['timestamp']['$date'] ?? null
    ];

    // Output JSON response
    echo json_encode([
        'success' => true,
        'data' => $receiptData
    ]);

} catch (Exception $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
