<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

// BASIC INPUTS
$email = strtolower(trim($_POST['email'] ?? ''));
$password = $_POST['password'] ?? '';
$roleType = strtolower(trim($_POST['roleType'] ?? ''));

$name = trim($_POST['fullname'] ?? '');
$phone = trim($_POST['contact'] ?? '');
$occupation = trim($_POST['occupation'] ?? '');

if (!$email || !$password || !$roleType || !$name || !$phone || !$occupation) {
    echo json_encode(['success' => false, 'message' => 'Missing fields']);
    exit;
}


// DETERMINE ROLES
if ($roleType === 'both') {
    $roles = ['passenger', 'driver'];
} else {
    $roles = [$roleType];
}

// INIT COLLECTIONS
$users    = $db->users;
$vehicles = $db->vehicles;

// DUPLICATE EMAIL CHECK
if ($users->findOne(['email' => $email])) {
    echo json_encode(['success' => false, 'message' => 'Email already registered']);
    exit;
}

// EARLY VEHICLE VALIDATION
if (in_array('driver', $roles)) {
    if (
        empty($_POST['car-make']) ||
        empty($_POST['car-model']) ||
        empty($_POST['year-model']) ||
        empty($_POST['plate-number']) ||
        empty($_FILES['car-photo'])
    ) {
        echo json_encode([
            'success' => false,
            'message' => 'Vehicle details and car photo are required for drivers'
        ]);
        exit;
    }
}

// DRIVER DOCUMENT UPLOADS
$licensePath = null;
$vehicleRegPath = null;

if (in_array('driver', $roles)) {

    $driverSideRoot = realpath(__DIR__ . '/driver-side');
    $docAbsDir = $driverSideRoot . '/images/driver_documents/';
    $docPublicDir = 'driver-side/images/driver_documents/';

    if (!is_dir($docAbsDir)) {
        mkdir($docAbsDir, 0777, true);
    }

    // License
    if (!empty($_FILES['license']) && $_FILES['license']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['license']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('license_') . '.' . $ext;
        move_uploaded_file($_FILES['license']['tmp_name'], $docAbsDir . $filename);
        $licensePath = $docPublicDir . $filename;
    }

    // Vehicle Registration
    if (!empty($_FILES['vehicle-reg']) && $_FILES['vehicle-reg']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['vehicle-reg']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('vehreg_') . '.' . $ext;
        move_uploaded_file($_FILES['vehicle-reg']['tmp_name'], $docAbsDir . $filename);
        $vehicleRegPath = $docPublicDir . $filename;
    }
}

// CAR PHOTO UPLOAD
$carPhotoPath = null;

if (in_array('driver', $roles)) {

    $carPhotoAbsDir = realpath(__DIR__ . '/driver-side') . '/images/car_pics/';
    $carPhotoPublicDir = 'driver-side/images/car_pics/';

    if (!is_dir($carPhotoAbsDir)) {
        mkdir($carPhotoAbsDir, 0777, true);
    }

    if (!empty($_FILES['car-photo']) && $_FILES['car-photo']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['car-photo']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('car_') . '.' . $ext;
        move_uploaded_file($_FILES['car-photo']['tmp_name'], $carPhotoAbsDir . $filename);
        $carPhotoPath = $carPhotoPublicDir . $filename;
    }
}

// CREATE USER
$userID = uniqid('U');

$newUser = [
    'userID' => $userID,
    'name' => $name,
    'email' => $email,
    'phoneNo' => $phone,
    'occupation' => $occupation,
    'roles' => $roles,
    'password' => password_hash($password, PASSWORD_BCRYPT),
    'isVerified' => false,
    'createdAt' => new MongoDB\BSON\UTCDateTime()
];

if (in_array('driver', $roles)) {
    $newUser['driverDocs'] = [
        'licenseImage' => $licensePath,
        'vehicleRegImage' => $vehicleRegPath
    ];
}

$users->insertOne($newUser);

// CREATE VEHICLE RECORD
if (in_array('driver', $roles)) {

    $newVehicle = [
        'carId' => uniqid('C'),
        'ownerId' => $userID,
        'carMake' => trim($_POST['car-make']),
        'carModel' => trim($_POST['car-model']),
        'year' => (int) $_POST['year-model'],
        'plateNo' => trim($_POST['plate-number']),
        'cap' => 4,
        'isVerified' => false,
        'carPhoto' => $carPhotoPath,
        'createdAt' => new MongoDB\BSON\UTCDateTime()
    ];

    $vehicles->insertOne($newVehicle);
}

// RESPONSE
echo json_encode([
    'success' => true,
    'message' => 'Registration successful'
]);
