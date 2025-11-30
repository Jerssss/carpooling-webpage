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

$users = $db->users;

// Prevent duplicate email
$existingUser = $users->findOne(['email' => $email]);
if ($existingUser) {
    echo json_encode(['success'=>false, 'message'=>'Email already registered']);
    exit;
}

// Handle roles
$roles = [];
if ($roleType === 'both') {
    $roles = ['passenger', 'driver'];
} else {
    $roles = [$roleType];
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

// Driver-only fields
if (in_array('driver', $roles)) {
    $newUser['driverDocs'] = [
        'licenseImage' => null,
        'vehicleRegImage' => null
    ];
}
$users->insertOne($newUser);

echo json_encode([
    'success' => true,
    'message' => 'Registration successful'
]);
