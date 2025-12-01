<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

header('Content-Type: application/json; charset=utf-8');

// Return the logged-in user's info
$user = $db->users->findOne(['userID' => $_SESSION['user_id']]);

if ($user) {
    echo json_encode([
        "user_id" => $user['userID'],
        "name" => $user['name'],
        "role" => $user['role'],
        "picture" => $user['picture']
    ]);
} else {
    echo json_encode(["error" => "User not found"]);
}
?>
