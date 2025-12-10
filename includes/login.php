<?php
require __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../includes/cookies.php';

try {
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $usersCollection = $client->carpooling_data->users;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'passenger';

        $user = $usersCollection->findOne([
            'email' => $email,
            'roles' => ['$in' => [$role]] // search the roles array using $in operator
        ]);

        if (!$user) {
            echo "No user found.";
            exit;
        }
        var_dump($user);
        echo "Password hash from DB: " . $user->password . "\n";
        echo "Password typed: " . $password . "\n";


        if (!password_verify($password, $user->password)) {
            echo "Incorrect password.";
            exit;
        }

        // SESSION HANDLING 
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

        // NON-SENSITIVE cookie
        set_app_cookie('user_id', $user->userID);
        set_app_cookie('user_role', $role);

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
