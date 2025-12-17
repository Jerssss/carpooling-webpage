<?php
// Use the shared root includes DB connector
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/cookies.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'passenger') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

use MongoDB\BSON\UTCDateTime;

header('Content-Type: application/json');

$paymentsCollection = $db->payments;
$bookingsCollection = $db->bookings;
$ridesCollection = $db->rides;
$usersCollection = $db->users;
$historyCollection = $db->history;
$notificationsCollection = $db->notifications;

// Ensure upload directory exists
$uploadDir = __DIR__ . '/../../images/payments/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Prevent rapid multiple submissions using a cookie lock
if (isset($_COOKIE['payment_lock'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Payment already in progress. Please wait.'
    ]);
    exit;
}

// Lock payments for 30 seconds
set_app_cookie('payment_lock', '1', 0.01);

// BOOKING AND PAYMENT LOGIC
try {
    // FIRST, GET USER AND RIDE INFORMATION
    $userId = $_SESSION['user_id'];
    $rideId = $_POST['rideId'] ?? '';
    $method = $_POST['method'] ?? 'Cash';
    
    if (empty($rideId)) {
        throw new Exception('Ride ID is required');
    }
    
    // Get user info
    $userDoc = $usersCollection->findOne(['userID' => $userId]);
    if (!$userDoc) {
        throw new Exception('User not found');
    }
    
    // Get ride info
    $rideDoc = $ridesCollection->findOne(['rideId' => $rideId]);
    if (!$rideDoc) {
        throw new Exception('Ride not found');
    }

    $price = (float)($rideDoc['price'] ?? 0);
    
    // Get driver info for notifications
    $driverId = $rideDoc['driverId'] ?? '';
    $driverDoc = null;
    $driverName = 'Unknown Driver';
    if ($driverId) {
        $driverDoc = $usersCollection->findOne(['userID' => $driverId]);
        if ($driverDoc && isset($driverDoc['name'])) {
            $driverName = $driverDoc['name'];
        }
    }
    
    // SECOND, HANDLE FILE UPLOAD (GCASH ONLY)
    $screenshotPath = '';
    $gcashRefNumber = '';
    
    if (strcasecmp($method, 'GCash') === 0) {
        // Validate GCash reference number
        $gcashRefNumber = $_POST['referenceNumber'] ?? '';
        if (empty($gcashRefNumber)) {
            throw new Exception('GCash reference number is required');
        }
        
        // Handle file upload
        if (!isset($_FILES['proofScreenshot']) || $_FILES['proofScreenshot']['error'] === UPLOAD_ERR_NO_FILE) {
            throw new Exception('GCash screenshot is required');
        }
        
        if ($_FILES['proofScreenshot']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload error occurred');
        }
        
        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        $fileTmp = $_FILES['proofScreenshot']['tmp_name'];
        $fileName = $_FILES['proofScreenshot']['name'];
        $fileSize = $_FILES['proofScreenshot']['size'];
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        // Validate extension
        if (!in_array($fileExt, $allowedExtensions)) {
            throw new Exception('Invalid file type. Only images are allowed');
        }
        
        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $fileTmp);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedMimeTypes)) {
            throw new Exception('Invalid image format detected');
        }
        
        // Validate file size (5MB max)
        if ($fileSize > 5 * 1024 * 1024) {
            throw new Exception('File too large. Maximum size is 5MB');
        }
        
        // Save file
        $newFileName = uniqid('gcash_', true) . '.' . $fileExt;
        $targetPath = $uploadDir . $newFileName;
        
        if (!move_uploaded_file($fileTmp, $targetPath)) {
            throw new Exception('Failed to save uploaded file');
        }
        
        $screenshotPath = '../images/payments/' . $newFileName;
    }
    
    // THIRD, CREATE THE ACTUAL BOOKING (Added duplicate check for validation)
    // Generate booking ID

    // Check if user already has a booking for this ride
    $existingBooking = $bookingsCollection->findOne([
        'passengerId' => $userId,
        'rideId' => $rideId,
        'status' => ['$in' => ['pending', 'accepted', 'completed']]
    ]);
    
    if ($existingBooking) {
        throw new Exception('You have already booked this ride');
    }

    // Generate booking ID
    $lastBooking = $bookingsCollection->findOne(
        [],
        ['sort' => ['bookingId' => -1], 'projection' => ['bookingId' => 1]]
    );
    
    // Ensure no duplicate booking ID
    if ($lastBooking && isset($lastBooking['bookingId'])) {
        $lastNum = (int) preg_replace('/\D/', '', $lastBooking['bookingId']);
        $newNum = $lastNum + 1;
    } else {
        $newNum = 1;
    }
    
    // Generate a unique booking ID
    $bookingId = 'B' . str_pad($newNum, 7, '0', STR_PAD_LEFT);
    
    // Get pickup location and coordinates
    $pickupLocation = $_POST['pickupLocation'] ?? '';
    $pickupType = $_POST['pickupType'] ?? 'pickup';
    $pickupCoords = null;
    
    if (isset($_POST['pickupLat']) && isset($_POST['pickupLng']) && 
        $_POST['pickupLat'] !== '' && $_POST['pickupLng'] !== '') {
        $pickupCoords = [
            'lat' => (float)$_POST['pickupLat'],
            'lng' => (float)$_POST['pickupLng']
        ];
    }

    // Determine seat number
    $currentPassengers = $rideDoc['passengers'] ?? [];
    $seatNumber = count($currentPassengers) + 1;

    // Check if ride has available seats
    $availableSeats = $rideDoc['availableSeats'] ?? 0;
    $bookedSeats = $rideDoc['bookedSeats'] ?? 0;

    // Avoid overbooking 
    if ($bookedSeats >= $availableSeats) {
        throw new Exception('No available seats for this ride');
    }
    
    // Determine initial booking status
    // Cash = pending (needs driver confirmation). TODO: Implement a driver confirmation logic on the driver's side
    // GCash = pending (needs payment verification first)
    $bookingStatus = 'pending';
    $paymentStatus = ($method === 'Cash') ? 'pending' : 'pending';
    
    // Create booking document for the bookings collection
    $bookingData = [
        'bookingId' => $bookingId,
        'passengerId' => $userId,
        'driverId' => $driverId,
        'rideId' => $rideId,
        'seatNumber' => $seatNumber,
        'status' => $bookingStatus,
        'paymentStatus' => $paymentStatus,
        'pickupLocation' => $pickupLocation,
        'pickupType' => $pickupType,
        'timestamp' => new UTCDateTime()
    ];
    
    if ($pickupCoords) {
        $bookingData['pickupLocationCoords'] = $pickupCoords;
    }
    
    // Insert booking
    $bookingsCollection->insertOne($bookingData);

    // Update the rides collection with the booked passenger info. Add a passenger in the "passengers" object
    $passengerEntry = [
        'userId' => $userId,
        'bookingTime' => new UTCDateTime(),
        'seatNumber' => $seatNumber
    ];

    // Update ride. Add passenger to array and increment bookedSeats
    $updateResult = $ridesCollection->updateOne(
        ['rideId' => $rideId],
        [
            '$push' => ['passengers' => $passengerEntry],
            '$inc' => ['bookedSeats' => 1]
        ]
    );

    if ($updateResult->getModifiedCount() === 0) {
        error_log("Warning: Failed to update ride {$rideId} with passenger {$userId}");
    } else {
        error_log("Successfully added passenger {$userId} to ride {$rideId}, seat {$seatNumber}");
    }
    
    // FOURTH, CREATE PAYMENT
    // Generate payment ID
    $paymentId = uniqid('P');
    
    // Create payment document for the payments collection
    $paymentData = [
        'paymentId' => $paymentId,
        'bookingId' => $bookingId,
        'rideId' => $rideId,
        'userId' => $userId,
        'method' => $method,
        'amount' => $price,
        'status' => 'pending', // pending/verified/failed
        'timestamp' => new UTCDateTime()
    ];
    
    // Add GCash-specific fields
    if ($method === 'GCash') {
        $paymentData['gcashRefNumber'] = $gcashRefNumber;
        $paymentData['screenshot'] = $screenshotPath;
    }
    
    // Insert payment
    $paymentsCollection->insertOne($paymentData);
    
    // FIFTH, CREATE HISTORY ENTRY
    try {
        $historyDoc = [
            'historyId' => uniqid('H'),
            'bookingId' => $bookingId,
            'rideId' => $rideId,
            'carId' => $rideDoc['carId'] ?? null,
            'driverId' => $driverId,
            'driverName' => $driverName,
            'passengerId' => $userId,
            'pickupLocation' => $pickupLocation,
            'dropoffLocation' => $rideDoc['destination'] ?? '',
            'date' => $rideDoc['date'] ?? '',
            'time' => $rideDoc['departureTime'] ?? '',
            'fare' => $paymentData['amount'],
            'status' => 'pending',
            'createdAt' => new UTCDateTime()
        ];
        
        // Check for duplicates
        $existsH = $historyCollection->findOne([
            'bookingId' => $bookingId
        ]);
        
        if (!$existsH) {
            $historyCollection->insertOne($historyDoc);
        }
    } catch (Exception $e) {
        error_log('History insert failed: ' . $e->getMessage());
    }
    
    // SIXTH, CREATE NOTIFICATIONS
    try {
        $destination = $rideDoc['destination'] ?? '';
        $departureTime = $rideDoc['departureTime'] ?? '';
        $passengerName = $userDoc['name'] ?? 'A passenger';

        // Current timestamp
        $now = new UTCDateTime();
        
        // Passenger notification
        $passengerNotification = [
            'bookingId' => $bookingId,
            'rideId' => $rideId,
            'driverId' => $driverId,
            'passengerId' => $userId,
            'carId' => $rideDoc['carId'] ?? null,
            'paymentId' => $paymentId,
            'type' => 'booking',
            'audience' => 'passenger',
            'message' => "Booking successful for {$driverName} to {$destination} at {$departureTime}",
            'timestamp' => new UTCDateTime(),
            'isRead' => false
        ];
        
        // Driver notification
        $driverNotification = [
            'bookingId' => $bookingId,
            'rideId' => $rideId,
            'driverId' => $driverId,
            'passengerId' => $userId,
            'carId' => $rideDoc['carId'] ?? null,
            'paymentId' => $paymentId,
            'type' => 'booking',
            'audience' => 'driver',
            'message' => "New booking from {$passengerName} to {$destination} at {$departureTime}",
            'timestamp' => new UTCDateTime(),
            'isRead' => false
        ];

        // Calculate 2 minutes ago for deduplication
        $nowTimestamp = $now->toDateTime()->getTimestamp();
        $twoMinAgoTimestamp = ($nowTimestamp - 120) * 1000; // Convert to milliseconds
        $twoMinAgo = new UTCDateTime($twoMinAgoTimestamp);
        
        // Insert notifications (with deduplication)
        $now = new UTCDateTime();
        $twoMinAgo = new UTCDateTime(($now->toDateTime()->getTimestamp() - 120) * 1000);
        
        $existsP = $notificationsCollection->findOne([
            'bookingId' => $bookingId, // Check by bookingId instead
            'audience' => 'passenger'
        ]);
        
        if (!$existsP) {
            $resultP = $notificationsCollection->insertOne($passengerNotification);
            error_log("Passenger notification inserted: " . ($resultP->getInsertedCount() > 0 ? "SUCCESS" : "FAILED"));
        } else {
            error_log("Passenger notification already exists, skipped");
        }
        
        // Insert driver notification (with deduplication)
        $existsD = $notificationsCollection->findOne([
            'bookingId' => $bookingId, // Check by bookingId instead
            'audience' => 'driver'
        ]);
        
        if (!$existsD) {
            $resultD = $notificationsCollection->insertOne($driverNotification);
            error_log("Driver notification inserted: " . ($resultD->getInsertedCount() > 0 ? "SUCCESS" : "FAILED"));
        } else {
            error_log("Driver notification already exists, skipped");
        }
        
    } catch (Exception $e) {
        error_log('Notification insert failed: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
    }
    
    // SEVENTH, SUCCESS RESPONSE
    delete_app_cookie('payment_lock');
    
    echo json_encode([
        'success' => true,
        'message' => 'Booking and payment created successfully',
        'bookingId' => $bookingId,
        'paymentId' => $paymentId
    ]);
    
} catch (Exception $e) {
    delete_app_cookie('payment_lock');
    error_log('Payment handler error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>