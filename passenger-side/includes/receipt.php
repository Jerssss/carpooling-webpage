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
    // Fetch passenger info from users collection
    $passenger = $db->users->findOne(['userID' => $_SESSION['user_id']]);
    $passenger = $passenger ? json_decode(json_encode($passenger), true) : null;

    // Fetch booking info for pickup details (prefer by bookingId, fallback by rideId+passengerId)
    $booking = null;
    if (!empty($payment['bookingId'])) {
        $booking = $db->bookings->findOne(['bookingId' => $payment['bookingId']]);
    }
    if (!$booking) {
        // Prefer newest by timestamp when available
        $booking = $db->bookings->findOne(
            [
                'rideId' => $rideId,
                'passengerId' => $_SESSION['user_id']
            ],
            [ 'sort' => ['timestamp' => -1, '_id' => -1] ]
        );
    }
    $booking = $booking ? json_decode(json_encode($booking), true) : null;


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

    // Helpers to normalize possible BSON/array date shapes to ISO 8601 string
    $normalizeDate = function($val) {
        // Native BSON type
        if ($val instanceof \MongoDB\BSON\UTCDateTime) {
            return $val->toDateTime()->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
        }
        // Already a PHP DateTime
        if ($val instanceof \DateTimeInterface) {
            return $val->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
        }
        // Extended JSON forms
        if (is_array($val)) {
            // Common: { "$date": "2025-12-17T09:04:59.620Z" }
            if (isset($val['$date']) && is_string($val['$date'])) {
                return $val['$date'];
            }
            // Canonical: { "$date": { "$numberLong": "1734426299620" } }
            if (isset($val['$date']) && is_array($val['$date']) && isset($val['$date']['$numberLong'])) {
                $ms = (int)$val['$date']['$numberLong'];
                $sec = (int) floor($ms / 1000);
                $dt = (new \DateTimeImmutable('@' . $sec))->setTimezone(new \DateTimeZone('UTC'));
                return $dt->format(DATE_ATOM);
            }
            // Sometimes directly { "$numberLong": "..." }
            if (isset($val['$numberLong'])) {
                $ms = (int)$val['$numberLong'];
                $sec = (int) floor($ms / 1000);
                $dt = (new \DateTimeImmutable('@' . $sec))->setTimezone(new \DateTimeZone('UTC'));
                return $dt->format(DATE_ATOM);
            }
            // Rare: { date: "..." }
            if (isset($val['date']) && is_string($val['date'])) {
                return $val['date'];
            }
        }
        // Plain string
        if (is_string($val)) {
            return $val;
        }
        return null;
    };

    // pickupTime should come from rides.departureTime
    $pickupTime = $ride ? ($ride['departureTime'] ?? null) : null;
    $pickupTime = $normalizeDate($pickupTime) ?: 'N/A';

    // bookingTime should come from bookings.timestamp
    $bookingTime = 'N/A';
    if ($booking) {
        $bookingTime = $normalizeDate($booking['timestamp'] ?? null) ?: $bookingTime;
    }

    // Prepare receipt data
    $driverName = $driver['name'] ?? 'N/A';
    $receiptData = [
        'method' => $payment['method'] ?? 'N/A',
        'rideId' => $rideId,
        'pickupTime' => $pickupTime,
        'bookingTime' => $bookingTime,
        'pickupType' => $payment['pickupType'] ?? 'N/A',
        'pickupLocation' => $booking['pickupLocation'] ?? 'N/A',
        'paymentId' => $payment['paymentId'] ?? 'N/A',
        'destination' => $ride['destination'] ?? 'N/A',
        'driverName' => $driverName,
        // Passenger details for left panel
        'name' => $passenger['name'] ?? 'N/A',
        'idNumber' => $passenger['userID'] ?? 'N/A',
        'email' => $passenger['email'] ?? 'N/A',
        'discount' => $discount,
        'subtotal' => $subtotal,
        'total' => $total,
        'status' => $payment['status'] ?? 'N/A',
        'gcashRefNumber' => $payment['gcashRefNumber'] ?? 'N/A',
        'timestamp' => $normalizeDate($payment['timestamp'] ?? null)
    ];

    // Output JSON response
    echo json_encode([
        'success' => true,
        'data' => $receiptData
    ]);
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
