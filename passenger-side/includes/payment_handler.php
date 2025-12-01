<?php
// Use the shared root includes DB connector
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'passenger') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

use MongoDB\BSON\UTCDateTime;

header('Content-Type: application/json');

$paymentsCollection = $db->payments;
$ridesCollection = $db->rides;
$notificationsCollection = $db->notifications;

// Ensure upload directory exists
$uploadDir = __DIR__ . '/../../images/payments/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$method = $_POST['method'] ?? 'GCash';
$screenshotPath = '';

// Allowed image MIME types
$allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
];

// Allowed file extensions (secondary validation)
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Only require a screenshot for GCash payments
if (strcasecmp($method, 'GCash') === 0) {
    if (isset($_FILES['proofScreenshot'])) {
        if ($_FILES['proofScreenshot']['error'] !== UPLOAD_ERR_OK) {
            $err = (int)$_FILES['proofScreenshot']['error'];
            $map = [
                UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the server upload_max_filesize.',
                UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.',
                UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded.',
                UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder on server.',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
                UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload.'
            ];
            $hint = sprintf(
                ' (upload_max_filesize=%s, post_max_size=%s)',
                ini_get('upload_max_filesize') ?: 'unknown',
                ini_get('post_max_size') ?: 'unknown'
            );
            echo json_encode(['success' => false, 'message' => ($map[$err] ?? 'Upload error code ' . $err) . $hint]);
            exit;
        }

        $fileTmp  = $_FILES['proofScreenshot']['tmp_name'];
        $fileName = $_FILES['proofScreenshot']['name'];
        $fileSize = $_FILES['proofScreenshot']['size'];
        $fileExt  = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        // Check extension
        if (!in_array($fileExt, $allowedExtensions)) {
            echo json_encode(['success' => false, 'message' => 'Invalid file type. Only images are allowed.']);
            exit;
        }

        // Check MIME type using PHP's finfo
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $fileTmp);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedMimeTypes)) {
            echo json_encode(['success' => false, 'message' => 'Invalid image format detected.']);
            exit;
        }

        // Limit max file size to 5MB
        if ($fileSize > 5 * 1024 * 1024) {
            echo json_encode(['success' => false, 'message' => 'File too large. Maximum size is 5MB.']);
            exit;
        }

        // If valid, generate new filename
        $newFileName = uniqid('gcash_', true) . '.' . $fileExt;
        $targetPath = $uploadDir . $newFileName;

        if (move_uploaded_file($fileTmp, $targetPath)) {
            // Public path used by frontend (relative to passenger-side pages)
            $screenshotPath = '../images/payments/' . $newFileName;
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save uploaded file.']);
            exit;
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'No file uploaded. Please attach a GCash screenshot.']);
        exit;
    }
}

// Build payment data
// Build base payment data
$paymentData = [
    'paymentId' => uniqid('P'),
    'rideId' => $_POST['rideId'] ?? '',
    'userId' => $_SESSION['user_id'],
    'name'   => $_POST['name'] ?? ($_SESSION['name'] ?? ''),
    'idNumber' => $_POST['idNumber'] ?? ($_SESSION['idNumber'] ?? ''),
    'email'  => $_POST['email'] ?? ($_SESSION['email'] ?? ''),
    'pickupType' => $_POST['pickupType'] ?? '',
    'pickupTime' => $_POST['pickupTime'] ?? '',
    'pickupLocation' => $_POST['pickupLocation'] ?? '',
    'gcashRefNumber' => $_POST['referenceNumber'] ?? '',
    'screenshot' => $screenshotPath,
    'amount' => (float)($_POST['amount'] ?? 0),
    'method' => $method,
    'status' => 'Pending',
    'timestamp' => new UTCDateTime()
];

// Optional pickup coordinates from map picker
if (isset($_POST['pickupLat']) && isset($_POST['pickupLng']) && $_POST['pickupLat'] !== '' && $_POST['pickupLng'] !== '') {
    $paymentData['pickupLocationCoords'] = [
        'lat' => (float)$_POST['pickupLat'],
        'lng' => (float)$_POST['pickupLng']
    ];
}

// Try to insert in DB
try {
    $paymentsCollection->insertOne($paymentData);

    // Build and insert a success booking notification
    $rideDoc = null;
    if (!empty($paymentData['rideId'])) {
        $rideDoc = $ridesCollection->findOne(['rideId' => $paymentData['rideId']]);
    }

    $notifMessage = 'Successful booking';
    if ($rideDoc) {
        $dest = $rideDoc['destination'] ?? '';
        $time = $rideDoc['departureTime'] ?? '';
        // Try to get driver name for message formatting
        $driverName = null;
        try {
            $usersCol = $db->users ?? null;
            if ($usersCol && !empty($rideDoc['driverId'])) {
                $uDoc = $usersCol->findOne(['userID' => $rideDoc['driverId']]);
                if ($uDoc && isset($uDoc['name'])) $driverName = $uDoc['name'];
            }
        } catch (Exception $e) {
            // ignore driver lookup failures silently
        }
        if ($driverName) {
            $notifMessage = "Successful booking for Driver {$driverName} bound to {$dest} at {$time}";
        } else {
            $notifMessage = "Successful booking for {$dest} ({$time})";
        }
    }

    // Build passenger-facing notification (for the booking passenger)
    $passengerNotification = [
        'rideId' => $paymentData['rideId'],
        'driverId' => $rideDoc['driverId'] ?? null,
        'passengerId' => $paymentData['userId'],
        'carId' => $rideDoc['carId'] ?? null,
        'type' => 'booking',
        'message' => $notifMessage,
        'timestamp' => new UTCDateTime(),
        'isRead' => false
    ];

    // Build driver-facing notification (inform the driver who booked)
    $passengerName = $paymentData['name'] ?? 'A passenger';
    $driverMsg = "New booking by {$passengerName} bound to {$dest} at {$time}";
    $driverNotification = [
        'rideId' => $paymentData['rideId'],
        'driverId' => $rideDoc['driverId'] ?? null,
        'passengerId' => $paymentData['userId'],
        'carId' => $rideDoc['carId'] ?? null,
        'type' => 'booking',
        'message' => $driverMsg,
        'timestamp' => new UTCDateTime(),
        'isRead' => false
    ];

    try {
        // De-duplicate passenger notification
        $existsP = $notificationsCollection->findOne([
            'rideId' => $passengerNotification['rideId'],
            'passengerId' => $passengerNotification['passengerId'],
            'message' => $passengerNotification['message']
        ]);
        if (!$existsP) {
            $notificationsCollection->insertOne($passengerNotification);
        }

        // De-duplicate driver notification
        $existsD = $notificationsCollection->findOne([
            'rideId' => $driverNotification['rideId'],
            'driverId' => $driverNotification['driverId'],
            'passengerId' => $driverNotification['passengerId'],
            'message' => $driverNotification['message']
        ]);
        if (!$existsD) {
            $notificationsCollection->insertOne($driverNotification);
        }
    } catch (Exception $e) {
        // If notification insert fails, do not block payment success
        error_log('Notification insert failed: ' . $e->getMessage());
    }

    // Append to history collection for reporting/archives
    try {
        $historyCol = $db->history;
        $historyDoc = [
            'historyId' => uniqid('H'),
            'carId' => $rideDoc['carId'] ?? null,
            'driverId' => $rideDoc['driverId'] ?? null,
            'name' => $driverName ?? null,
            'passengerId' => $paymentData['userId'],
            'pickupLocation' => $paymentData['pickupLocation'] ?? ($rideDoc['stationedAt'] ?? ''),
            'dropoffLocation' => $rideDoc['destination'] ?? '',
            'date' => $rideDoc['date'] ?? '',
            'time' => $rideDoc['departureTime'] ?? '',
            'fare' => $paymentData['amount'] ?? 0,
            'status' => strtolower($paymentData['status'] ?? 'pending'),
            'createdAt' => new UTCDateTime()
        ];
        // Deduplicate per (rideId, passengerId)
        $existsH = $historyCol->findOne([
            'passengerId' => $historyDoc['passengerId'],
            'date' => $historyDoc['date'],
            'time' => $historyDoc['time'],
            'dropoffLocation' => $historyDoc['dropoffLocation']
        ]);
        if (!$existsH) {
            $historyCol->insertOne($historyDoc);
        }
    } catch (Exception $e) {
        // Don't block on history failures
        error_log('History append failed: ' . $e->getMessage());
    }

    echo json_encode(['success' => true, 'message' => 'Payment saved successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error saving payment: ' . $e->getMessage()]);
}
