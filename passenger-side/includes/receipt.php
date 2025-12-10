<?php
header('Content-Type: application/json');
// Use the shared root DB connector
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/cookies.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'passenger') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    // Connect to MongoDB
    // $db already available from db_connect.php

    // Get rideId from URL parameter
    $rideId = $_GET['rideId'] ?? null;

    // Store last receipt viewed - to remember which receipt the user last viewed
    if ($rideId) {
    set_app_cookie('last_receipt_ride', $rideId);
    }
    
    if (!$rideId) {
        http_response_code(400);
        echo json_encode(['error' => 'Ride ID is required']);
        exit;
    }

    // Find the most recent payment for this rideId and current user
    $payment = $db->payments->findOne(
        [
            'rideId' => $rideId,
            'userId' => $_SESSION['user_id']
        ],
        [
            'sort' => ['_id' => -1]
        ]
    );
    if (!$payment) {
        echo json_encode(['error' => 'No payment found for this ride ID']);
        exit;
    }

    if ($payment['userId'] !== $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
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
    $discount = 0; // May discount ba tayo?
    $total = $subtotal - $discount;

    // Prepare receipt data
    $driverName = $driver['name'] ?? 'N/A';
    $receiptData = [
        'method' => $payment['method'] ?? 'N/A',
        'rideId' => $rideId,
        'pickupTime' => $payment['pickupTime'] ?? 'N/A',
        'pickupType' => $payment['pickupType'] ?? 'N/A',
        'pickupLocation' => $payment['pickupLocation'] ?? 'N/A',
        'paymentId' => $payment['paymentId'] ?? 'N/A',
        'destination' => $ride['destination'] ?? 'N/A',
        'driverName' => $driverName,
        // Passenger details for left panel
        'name' => $payment['name'] ?? 'N/A',
        'idNumber' => $payment['idNumber'] ?? 'N/A',
        'email' => $payment['email'] ?? 'N/A',
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
