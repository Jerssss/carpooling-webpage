<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$email = strtolower(trim($_POST['email'] ?? ''));
$password = $_POST['password'] ?? '';
$roleType = strtolower(trim($_POST['roleType'] ?? ''));

$name = trim($_POST['fullname'] ?? '');
$phone = trim($_POST['contact'] ?? '');
$occupation = trim($_POST['occupation'] ?? '');

if (!$email || !$password || !$roleType || !$name || !$phone || !$occupation) {
    echo json_encode(['success'=>false, 'message'=>'Missing fields']);
    exit;
}

// Determine roles FIRST 
$roles = [];
if ($roleType === 'both') {
    $roles = ['passenger', 'driver'];
} else {
    $roles = [$roleType];
}

// Driver document upload 
// register_user.php is inside project root
$driverSideRoot = realpath(__DIR__ . '/driver-side');

// Absolute filesystem path (for move_uploaded_file)
$absoluteDir = $driverSideRoot . '/images/driver_documents/';

// Public path (stored in MongoDB)
$publicDir = 'driver-side/images/driver_documents/';

$licensePath = null;
$vehicleRegPath = null;

if (in_array('driver', $roles)) {

    if (!is_dir($absoluteDir)) {
        mkdir($absoluteDir, 0777, true);
    }

    if (!empty($_FILES['license']) && $_FILES['license']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['license']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('license_') . '.' . $ext;

        move_uploaded_file(
            $_FILES['license']['tmp_name'],
            $absoluteDir . $filename
        );

        $licensePath = $publicDir . $filename;
    }

    if (!empty($_FILES['vehicle-reg']) && $_FILES['vehicle-reg']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['vehicle-reg']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('vehreg_') . '.' . $ext;

        move_uploaded_file(
            $_FILES['vehicle-reg']['tmp_name'],
            $absoluteDir . $filename
        );

        $vehicleRegPath = $publicDir . $filename;
    }
}

$users = $db->users;

// Prevent duplicate email 
if ($users->findOne(['email' => $email])) {
    echo json_encode(['success'=>false, 'message'=>'Email already registered']);
    exit;
}

// Create user 
$newUser = [
    'userID' => uniqid('U'),
    'name' => $name,
    'email' => $email,
    'phoneNo' => $phone,
    'occupation' => $occupation,
    'roles' => $roles,
    'password' => password_hash($password, PASSWORD_BCRYPT),
    'isVerified' => false,
    'createdAt' => new MongoDB\BSON\UTCDateTime()
];

// Attach driver docs ONLY if driver 
if (in_array('driver', $roles)) {
    $newUser['driverDocs'] = [
        'licenseImage' => $licensePath,
        'vehicleRegImage' => $vehicleRegPath
    ];
}

$users->insertOne($newUser);

echo json_encode([
    'success' => true,
    'message' => 'Registration successful'
]);
