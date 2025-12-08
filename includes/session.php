<?php
// ALWAYS start the session first (NO OUTPUT BEFORE THIS)
session_start();

// Optional timeout (30 minutes)
$timeout = 30 * 60;
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time'] > $timeout)) {
    session_unset();
    session_destroy();
    http_response_code(401);
    echo json_encode(['error' => 'Session expired']);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'You must be logged in']);
    exit;
}

// Optional: role check
// if ($_SESSION['role'] !== 'passenger') {
//     http_response_code(403);
//     echo json_encode(['error' => 'Forbidden']);
//     exit;
// }
?>