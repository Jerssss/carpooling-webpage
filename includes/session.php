<?php
session_start(); // Start PHP session

// Optional: enforce timeout (e.g., 30 min)
$timeout = 30 * 60; // 30 minutes
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time'] > $timeout)) {
    session_unset();
    session_destroy();
    header("HTTP/1.1 401 Unauthorized");
    echo json_encode(['error' => 'Session expired']);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    header("HTTP/1.1 401 Unauthorized");
    echo json_encode(['error' => 'You must be logged in']);
    exit;
}

// Provide user info globally
$user = $_SESSION['user']; // ['userID','name','email','role']
?>
