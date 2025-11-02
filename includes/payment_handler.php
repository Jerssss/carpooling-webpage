<?php
require __DIR__ . '/../vendor/autoload.php';
header('Content-Type: application/json');

$client = new MongoDB\Client("mongodb://localhost:27017/");
$paymentsCollection = $client->carpooling_data->payments;

// Ensure the directory for screenshots exists
$uploadDir = __DIR__ . '/../images/payments/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Handle file upload
$screenshotPath = '';
if (isset($_FILES['proofScreenshot']) && $_FILES['proofScreenshot']['error'] === UPLOAD_ERR_OK) {
    $fileTmp = $_FILES['proofScreenshot']['tmp_name'];
    $fileName = uniqid('gcash_', true) . '.' . pathinfo($_FILES['proofScreenshot']['name'], PATHINFO_EXTENSION);
    $targetPath = $uploadDir . $fileName;
    
    if (move_uploaded_file($fileTmp, $targetPath)) {
        $screenshotPath = 'images/payments/' . $fileName;
    }
}

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

try {
    $paymentsCollection->insertOne($paymentData);
    echo json_encode(['success' => true, 'message' => 'Payment saved successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error saving payment: ' . $e->getMessage()]);
}
?>
