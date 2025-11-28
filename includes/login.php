<?php
require __DIR__ . '/../vendor/autoload.php';
session_start();

try {
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $usersCollection = $client->carpooling_data->users;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'passenger';

        $user = $usersCollection->findOne([
            'email' => $email,
            'roles' => $role
        ]);

        if (!$user) {
            echo "No user found.";
            exit;
        }

        if (!password_verify($password, $user->password)) {
            echo "Incorrect password.";
            exit;
        }

        // SESSION HANDLING (PROFESSOR-APPROVED)
        $_SESSION['user_id'] = $user->userID;
        $_SESSION['name']    = $user->name;
        $_SESSION['email']   = $user->email;
        $_SESSION['role']    = $role;

        // optional grouping
        $_SESSION['user'] = [
            'userID' => $user->userID,
            'name'   => $user->name,
            'email'  => $user->email,
            'role'   => $role
        ];

        $_SESSION['login_time'] = time();

        // Redirect
        if ($role === 'passenger') {
            header("Location: ../passenger-side/index.html");
        } elseif ($role === 'driver') {
            header("Location: ../driver-side/driver-landing.html");
        }
        exit;
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
