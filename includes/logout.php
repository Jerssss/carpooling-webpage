<?php
// Clear session and auth cookies, then redirect or return JSON
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Unset all session variables and destroy session
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
}
session_destroy();

// Expire app cookies
$expire = time() - 3600;
// Primary auth cookies
setcookie('user_id', '', $expire, '/');
setcookie('user_role', '', $expire, '/');
// Legacy/fallback cookie keys
setcookie('role', '', $expire, '/');

// Respond with JSON (or change to header redirect if preferred)
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => true]);
?><?php
session_start();
session_unset();
session_destroy();
header("Location: ../../login.html?message=Logged out successfully");
exit();
