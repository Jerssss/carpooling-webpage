<?php
file_put_contents(__DIR__.'/debug.log', print_r($_POST, true));
require_once 'db_connect.php';
header('Content-Type: application/json');

$email = strtolower(trim($_POST['email'] ?? ''));
$password = $_POST['password'] ?? '';
$role = strtolower(trim($_POST['role'] ?? ''));

if (!$email || !$password || !$role) {
    echo json_encode(['success'=>false, 'message'=>'Missing fields']);
    exit;
}

$users = $db->users;

// Query the roles array
$user = $users->findOne([
    'email' => $email,
    'roles' => $role   // matches array members
]);

if (!$user) {
    echo json_encode(['success'=>false, 'message'=>"No user found for email '$email' with role '$role'"]);
    exit;
}

if (!password_verify($password, $user['password'])) {
    echo json_encode(['success'=>false, 'message'=>"Incorrect password"]);
    exit;
}

echo json_encode([
    'success'=>true,
    'message'=>'Login successful',
    'user'=>$user
]);
?>

