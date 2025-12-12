<?php
// start the session first
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/cookies.php';

// Restore session from cookies if session is empty
if (!isset($_SESSION['user_id']) && isset($_COOKIE['user_id'])) {
    $_SESSION['user_id'] = $_COOKIE['user_id'];
    // Role cookie set by login.php is 'user_role'
    if (isset($_COOKIE['user_role'])) {
        $_SESSION['role'] = $_COOKIE['user_role'];
    } elseif (isset($_COOKIE['role'])) {
        $_SESSION['role'] = $_COOKIE['role'];
    } else {
        $_SESSION['role'] = 'passenger';
    }
    if (!isset($_SESSION['login_time'])) {
        $_SESSION['login_time'] = time();
    }
}

// Optional timeout (30 minutes) — applies only after restoration
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
?>