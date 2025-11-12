<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// MongoDB connection
require_once 'vendor/autoload.php'; 

try {
    // Connect to MongoDB
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $db = $client->your_database_name; // Change to your database name
    
    // Get paymentId from query parameter
    $paymentId = $_GET['paymentId'] ?? null;
    
    if (!$paymentId) {
        echo json_encode(['error' => 'Payment ID is required']);
        exit;
    }
    
    // Fetch payment data
    $payment = $db->payments->findOne(['paymentId' => $paymentId]);
    
    if (!$payment) {
        echo json_encode(['error' => 'Payment not found']);
        exit;
    }
    
    // Fetch ride data
    $ride = $db->rides->findOne(['rideId' => $payment['rideId']]);
    
    // Fetch driver data
    $driver = null;
    if ($ride) {
        $driver = $db->users->findOne(['userID' => $ride['driverId']]);
    }
    
    // Calculate discount and subtotal
    $subtotal = $payment['amount'];
    $discount = 0; // Add your discount logic here
    $total = $subtotal - $discount;
    
    // Prepare receipt data
    $receiptData = [
        'paymentType' => $payment['method'] ?? 'N/A',
        'carpoolDriver' => $driver ? $driver['name'] : 'N/A',
        'bookingTime' => $payment['pickupTime'] ?? 'N/A',
        'transactionId' => $payment['paymentId'] ?? 'N/A',
        'destination' => $ride ? $ride['destination'] : 'N/A',
        'discount' => $discount,
        'subtotal' => $subtotal,
        'total' => $total,
        'status' => $payment['status'] ?? 'N/A',
        'gcashRefNumber' => $payment['gcashRefNumber'] ?? null,
        'timestamp' => $payment['timestamp'] ?? null
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $receiptData
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>