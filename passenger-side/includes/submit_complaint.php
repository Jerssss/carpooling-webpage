<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

// Set JSON header
header('Content-Type: application/json; charset=utf-8');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized. Please log in.']);
    exit;
}

// Check if user is a passenger
$userId = $_SESSION['user_id'];
$usersCol = $db->users;

try {
    $user = $usersCol->findOne(['userID' => $userId]);
    if (!$user) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'User not found.']);
        exit;
    }
    
    // Check if user has passenger role
    $hasPassenger = false;
    if (isset($user['roles']) && is_array($user['roles'])) {
        foreach ($user['roles'] as $role) {
            if (strtolower((string)$role) === 'passenger') {
                $hasPassenger = true;
                break;
            }
        }
    }
    if (!$hasPassenger && isset($user['role']) && strtolower((string)$user['role']) === 'passenger') {
        $hasPassenger = true;
    }
    
    if (!$hasPassenger) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Only passengers can submit complaints.']);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to verify user.']);
    exit;
}

// Check if request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

// Get POST data
$rideId = trim($_POST['rideId'] ?? '');
$driverId = trim($_POST['driverId'] ?? '');
$complaintMessage = trim($_POST['complaintMessage'] ?? '');

// Validation
if (empty($rideId)) {
    echo json_encode(['success' => false, 'error' => 'Ride ID is required.']);
    exit;
}

if (empty($driverId)) {
    echo json_encode(['success' => false, 'error' => 'Driver ID is required.']);
    exit;
}

if (empty($complaintMessage)) {
    echo json_encode(['success' => false, 'error' => 'Please describe what happened.']);
    exit;
}

if (strlen($complaintMessage) < 10) {
    echo json_encode(['success' => false, 'error' => 'Please provide more details (at least 10 characters).']);
    exit;
}

if (strlen($complaintMessage) > 1000) {
    echo json_encode(['success' => false, 'error' => 'Complaint message is too long (max 1000 characters).']);
    exit;
}

try {
    $complaintsCol = $db->complaints;
    
    // Generate unique complaint ID
    $lastComplaint = $complaintsCol->findOne(
        [],
        ['sort' => ['complaintId' => -1], 'projection' => ['complaintId' => 1]]
    );
    
    if ($lastComplaint && isset($lastComplaint['complaintId'])) {
        // Extract number from COM0001 format
        $lastNum = (int) preg_replace('/\D/', '', $lastComplaint['complaintId']);
        $newNum = $lastNum + 1;
    } else {
        $newNum = 1;
    }
    
    $complaintId = 'COM' . str_pad($newNum, 4, '0', STR_PAD_LEFT);
    
    // Prepare complaint document
    $complaint = [
        'complaintId' => $complaintId,
        'rideId' => $rideId,
        'driverId' => $driverId,
        'passengerId' => $userId,
        'complaintMessage' => $complaintMessage,
        'status' => 'pending',
        'createdAt' => new MongoDB\BSON\UTCDateTime(),
        'updatedAt' => new MongoDB\BSON\UTCDateTime()
    ];
    
    // Insert complaint
    $result = $complaintsCol->insertOne($complaint);
    
    if ($result->getInsertedCount() === 1) {
        echo json_encode([
            'success' => true,
            'message' => 'Complaint submitted successfully.',
            'complaintId' => $complaintId
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to submit complaint.']);
    }
    
} catch (MongoDB\Driver\Exception\Exception $e) {
    error_log("MongoDB Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error occurred.']);
} catch (Throwable $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An unexpected error occurred.']);
}
?>