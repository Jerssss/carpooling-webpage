<?php
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/cookies.php';

session_start();

try {
    // Use centralized DB connection
    $usersCollection = $db->users;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        $email    = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $role     = $_POST['role'] ?? 'passenger';
        $selectedRole = $_POST['role']; // driver or passenger

        // Find user by email AND check if selected role exists in roles array
        $user = $usersCollection->findOne([
            'email' => $email,
            'roles' => ['$in' => [$role]]
        ]);
        
        if (!$user) {
            header("Location: ../login.html?error=user_not_found");
            exit;
        }
        
        // VERIFIED CHECK — FROM DB ONLY
        if (empty($user->isVerified) || $user->isVerified !== true) {
            header("Location: ../login.html?error=user_not_verified");
            exit;
        }
        
        // PASSWORD CHECK
        if (!password_verify($password, $user->password)) {
            header("Location: ../login.html?error=incorrect_password");
            exit;
        }

        // SESSION HANDLING 
        $_SESSION['user_id'] = $user->userID;
        $_SESSION['name']    = $user->name;
        $_SESSION['email']   = $user->email;
        $_SESSION['role']    = $selectedRole;

        // optional grouping
        $_SESSION['user'] = [
            'userID' => $user->userID,
            'name'   => $user->name,
            'email'  => $user->email,
            'role'   => $selectedRole
        ];

        // NON-SENSITIVE cookies
        set_app_cookie('user_id', $user->userID);
        set_app_cookie('user_role', $role);

        $_SESSION['login_time'] = time();

        // Redirect based on role
        if ($role === 'passenger') {
            header("Location: ../passenger-side/index.html");
        } elseif ($role === 'driver') {
            header("Location: ../driver-side/driver-landing.html");
        }
        exit;
    }
} catch (Exception $e) {
    header("Location: ../login.html?error=server_error");
    exit;
}
