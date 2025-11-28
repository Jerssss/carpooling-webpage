<?php
require __DIR__ . '/../vendor/autoload.php';
session_start();

try {
    // Connect to MongoDB
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $usersCollection = $client->carpooling_data->users;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'passenger'; // role from the login form

        // Find user with matching email and role
        $user = $usersCollection->findOne([
            'email' => $email,
            'roles' => $role
        ]);

        if (!$user) {
            echo "No user found for email '$email' with role '$role'";
        } else {
            if (password_verify($password, $user->password)) {
                // Session handling
                $_SESSION['user'] = [
                    'userID' => $user->userID,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $role
                ];
                $_SESSION['login_time'] = time(); // for timeout

                // Redirect based on role
                if ($role === 'passenger') {
                    header("Location: ../passenger-side/index.html"); // passenger dashboard
                } elseif ($role === 'driver') {
                    header("Location: ../driver-side/driver-landing.html"); // driver dashboard
                } 
                exit();
            } else {
                echo "Password incorrect!";
            }
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
