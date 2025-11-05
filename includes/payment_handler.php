<?php
require __DIR__ . '/../vendor/autoload.php';
header('Content-Type: application/json');

$client = new MongoDB\Client("mongodb://localhost:27017/");
$paymentsCollection = $client->carpooling_data->payments;

// Ensure upload directory exists
$uploadDir = __DIR__ . '/../images/payments/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

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

if (isset($_FILES['proofScreenshot']) && $_FILES['proofScreenshot']['error'] === UPLOAD_ERR_OK) {
    
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

    // Limit max file size to 5MB here
    if ($fileSize > 5 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'File too large. Maximum size is 5MB.']);
        exit;
    }

    // If valid, generate new filename
    $newFileName = uniqid('gcash_', true) . '.' . $fileExt;
    $targetPath = $uploadDir . $newFileName;

    if (move_uploaded_file($fileTmp, $targetPath)) {
        $screenshotPath = 'images/payments/' . $newFileName;
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save uploaded file.']);
        exit;
    }

} else {
    echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error occurred.']);
    exit;
}

// Build payment data
$paymentData = [
    'paymentId' => uniqid('P'),
    'rideId' => $_POST['rideId'] ?? '',
    'userId' => $_POST['userId'] ?? '',
    'name' => $_POST['fullName'] ?? '',
    'idNumber' => $_POST['idNumber'] ?? '',
    'email' => $_POST['email'] ?? '',
    'pickupType' => $_POST['pickupType'] ?? '',
    'pickupTime' => $_POST['pickupTime'] ?? '',
    'pickupLocation' => $_POST['pickupLocation'] ?? '',
    'gcashRefNumber' => $_POST['referenceNumber'] ?? '',
    'screenshot' => $screenshotPath,
    'amount' => (float)($_POST['amount'] ?? 0),
    'method' => $_POST['method'] ?? 'GCash',
    'status' => 'Pending',
    'timestamp' => new MongoDB\BSON\UTCDateTime()
];

// Try to insert in DB
try {
    $paymentsCollection->insertOne($paymentData);
    echo json_encode(['success' => true, 'message' => 'Payment saved successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error saving payment: ' . $e->getMessage()]);
}
?>
