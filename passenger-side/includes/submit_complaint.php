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

    // Store roles in session if not already set
    if (!isset($_SESSION['roles']) || $_SESSION['roles'] === null) {
        if (isset($user['roles'])) {
            $_SESSION['roles'] = $user['roles'];
        } else {
            $_SESSION['roles'] = [];
        }
    }
    
    // Check if user has passenger role
    $hasPassenger = false;

    if (isset($user['roles'])) {
        // Convert MongoDB BSON Array to regular PHP array
        $rolesArray = is_array($user['roles']) ? $user['roles'] : iterator_to_array($user['roles']);
        
        foreach ($rolesArray as $role) {
            $roleStr = is_object($role) ? (string)$role : $role;
            if (strtolower(trim($roleStr)) === 'passenger') {
                $hasPassenger = true;
                break;
            }
        }
    }

    // Fallback: check singular 'role' field (if exists)
    if (!$hasPassenger && isset($user['role'])) {
        $roleStr = is_object($user['role']) ? (string)$user['role'] : $user['role'];
        if (strtolower(trim($roleStr)) === 'passenger') {
            $hasPassenger = true;
        }
    }

    // Fallback: check session roles
    if (!$hasPassenger && isset($_SESSION['roles'])) {
        $sessionRolesArray = is_array($_SESSION['roles']) ? $_SESSION['roles'] : iterator_to_array($_SESSION['roles']);
        
        foreach ($sessionRolesArray as $role) {
            $roleStr = is_object($role) ? (string)$role : $role;
            if (strtolower(trim($roleStr)) === 'passenger') {
                $hasPassenger = true;
                break;
            }
        }
    }

    if (!$hasPassenger) {
        // Debug information
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Only passengers can submit complaints.',
            'debug' => [
                'userId' => $userId,
                'userRoles' => $user['roles'] ?? null,
                'sessionRoles' => $_SESSION['roles'] ?? null,
                'hasRoleField' => isset($user['role'])
            ]
        ]);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Failed to verify user.',
        'debug' => $e->getMessage()
    ]);
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
    
    $complaintId = 'COM' . str_pad($newNum, 7, '0', STR_PAD_LEFT);
    
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