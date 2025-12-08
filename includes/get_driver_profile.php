<?php
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/session.php';

header('Content-Type: application/json');

try {
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit;
    }

    $users = $db->users;
    $vehicles = $db->vehicles ?? null;

    $user = $users->findOne(['userID' => $userId]);
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }

    $profile = [
        'userID' => (string)($user['userID'] ?? ''),
        'name' => (string)($user['name'] ?? ''),
        'email' => (string)($user['email'] ?? ''),
        'phoneNo' => (string)($user['phoneNo'] ?? ''),
        'picture' => (string)($user['picture'] ?? '../images/speed.jpg'),
        'gender' => isset($user['gender']) ? (string)$user['gender'] : '',
        // Optional extras if present
        'role' => (string)($user['role'] ?? ''),
        'rating' => $user['rating'] ?? null,
        'isVerified' => (bool)($user['isVerified'] ?? false),
    ];

    $vehicleData = null;
    if ($vehicles) {
        $vehicleData = $vehicles->findOne(['ownerId' => $userId]);
        if ($vehicleData) {
            $profile['vehicle'] = [
                'carId' => (string)($vehicleData['carId'] ?? ''),
                'carMake' => (string)($vehicleData['carMake'] ?? ''),
                'carModel' => (string)($vehicleData['carModel'] ?? ''),
                'year' => (int)($vehicleData['year'] ?? 0),
                'plateNo' => (string)($vehicleData['plateNo'] ?? ''),
                'cap' => (int)($vehicleData['cap'] ?? 0),
                'isVerified' => (bool)($vehicleData['isVerified'] ?? false),
                'carPhoto' => (string)($vehicleData['carPhoto'] ?? ''),
            ];
        }
    }

    echo json_encode(['success' => true, 'profile' => $profile]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error', 'error' => $e->getMessage()]);
}
?>
