<?php
session_start();
require_once __DIR__ . '/../../includes/db_connect.php';

header("Content-Type: application/json");

if (!isset($_SESSION['email'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if (!isset($users)) {
    http_response_code(500);
    echo json_encode(['error' => 'Users collection not initialized']);
    exit;
}

$email = $_SESSION['email'];
$action = $_GET['action'] ?? '';

$ALLOWED_UPDATES = ['name', 'phoneNo', 'occupation', 'picture'];

if ($action === 'get') {
    $user = $users->findOne(
        ['email' => $email],
        ['projection' => ['password' => 0]]
    );

    echo json_encode($user);
    exit;
}

if ($action === 'update') {
    $data = json_decode(file_get_contents("php://input"), true);

    $safeData = [];
    foreach ($ALLOWED_UPDATES as $field) {
        if (isset($data[$field])) {
            $safeData[$field] = $data[$field];
        }
    }

    $users->updateOne(
        ['email' => $email],
        ['$set' => $safeData]
    );

    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['error' => 'Invalid action']);
?>