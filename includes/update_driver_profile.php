<?php
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/session.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }

    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = $_POST;

    $users = $db->users;
    $vehicles = $db->vehicles ?? null;

    $userUpdate = [];
    foreach (['name','email','phoneNo','picture','gender'] as $key) {
        if (isset($input[$key])) {
            $userUpdate[$key] = $input[$key];
        }
    }

    if ($userUpdate) {
        $users->updateOne(['userID' => $userId], ['$set' => $userUpdate]);
    }

    if ($vehicles && isset($input['vehicle']) && is_array($input['vehicle'])) {
        $veh = $input['vehicle'];
        $vehUpdate = [];
        foreach (['carMake','carModel','year','plateNo','cap','isVerified','carPhoto'] as $k) {
            if (isset($veh[$k])) $vehUpdate[$k] = $veh[$k];
        }
        if ($vehUpdate) {
            $vehUpdate['ownerId'] = $userId; // ensure linkage
            $vehicles->updateOne(['ownerId' => $userId], ['$set' => $vehUpdate], ['upsert' => true]);
        }
    }

    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error', 'error' => $e->getMessage()]);
}
?>
