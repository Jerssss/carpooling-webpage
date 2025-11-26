<?php
require __DIR__ . '/../../vendor/autoload.php';
session_start();

try {
    // Connect to MongoDB
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $usersCollection = $client->carpooling_data->users;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'passenger';

        // DEBUG: Show submitted values
        // echo "Email: $email, Password: $password, Role: $role<br>";

        $user = $usersCollection->findOne(['email' => $email, 'role' => $role]);

        if (!$user) {
            echo "No user found for email '$email' with role '$role'";
        } else {
            // Verify password
            if (password_verify($password, $user->password)) {
                // Login successful
                $_SESSION['user'] = [
                    'userID' => $user->userID,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role
                ];

                // Redirect to dashboard (change path if needed)
                if ($role === 'passenger') {
                    header("Location: ../index.html"); 
                } elseif ($role === 'driver') {
                    header("Location: ../../driver-side/driver-landing.html"); 
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
?>
