<?php
// Start session at the very top
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Unset all session variables
$_SESSION = [];

// Destroy session cookies if any
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
}

// Destroy the session
session_destroy();

// Expire app-specific cookies
$expire = time() - 3600;
setcookie('user_id', '', $expire, '/');
setcookie('user_role', '', $expire, '/');
setcookie('role', '', $expire, '/');

// Send JSON response only (Docker-safe)
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => true]);
exit();
