<?php
// Use the shared root includes DB connector
require_once __DIR__ . '/../../includes/db_connect.php';
use MongoDB\BSON\UTCDateTime;
header('Content-Type: application/json');

$paymentsCollection = $db->payments;

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
$paymentData = [
    'paymentId' => uniqid('P'),
    'rideId' => $_POST['rideId'] ?? '',
    'userId' => $_POST['userId'] ?? '',
    'name' => $_POST['fullName'] ?? '',
    'idNumber' => $_POST['idNumber'] ?? '',
    'email' => $_POST['email'] ?? '',
    'pickupType' => $_POST['pickupType'] ?? ($_POST['cashPickupType'] ?? ''),
    'pickupTime' => $_POST['pickupTime'] ?? '',
    'pickupLocation' => $_POST['pickupLocation'] ?? ($_POST['cashPickupLocation'] ?? ''),
    'gcashRefNumber' => $_POST['referenceNumber'] ?? '',
    'screenshot' => $screenshotPath,
    'amount' => (float)($_POST['amount'] ?? 0),
    'method' => $method,
    'status' => 'Pending',
    'timestamp' => date('c')
];

// Try to insert in DB
try {
    $paymentsCollection->insertOne($paymentData);
    echo json_encode(['success' => true, 'message' => 'Payment saved successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error saving payment: ' . $e->getMessage()]);
}
?>
