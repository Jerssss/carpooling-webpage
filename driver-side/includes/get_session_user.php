<?php
header('Content-Type: application/json; charset=utf-8');

// Turn off HTML errors for JSON endpoints
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

// Ensure session exists
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'not_logged_in']);
    exit;
}

try {
    $users = $db->selectCollection('users');

    $user = $users->findOne(
        ['userID' => $_SESSION['user_id']],
        ['projection' => [
            'userID'  => 1,
            'name'    => 1,
            'role'    => 1,
            'picture' => 1
        ]]
    );

    if (!$user) {
        echo json_encode(['error' => 'user_not_found']);
        exit;
    }

    echo json_encode([
        'user_id' => (string)$user['userID'],
        'name'    => $user['name'] ?? '',
        "role" => $_SESSION['role'] ?? '',
        'picture' => $user['picture'] ?? null
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server_error']);
}
