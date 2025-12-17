<?php
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

// Restore and verify session; allow passenger via roles or role field
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// MongoDB Collections 
$bookingsCol = $db->bookings;
$ridesCol = $db->rides;
$usersCol = $db->users;
$paymentsCol = $db->payments;
$historyCol = $db->history;

// Verify user has passenger role
if (($_SESSION['role'] ?? '') !== 'passenger') {
    try {
        $u = $usersCol->findOne(
            ['userID' => $_SESSION['user_id']], 
            ['projection' => ['roles' => 1, 'role' => 1]]
        );
        
        $hasPassenger = false;
        if ($u) {
            if (isset($u['roles']) && is_array($u['roles'])) {
                foreach ($u['roles'] as $r) {
                    if (strtolower((string)$r) === 'passenger') {
                        $hasPassenger = true;
                        break;
                    }
                }
            }
            if (!$hasPassenger && isset($u['role']) && strtolower((string)$u['role']) === 'passenger') {
                $hasPassenger = true;
            }
        }
        
        if (!$hasPassenger) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: passenger role required']);
            exit;
        }
    } catch (Throwable $e) {
        error_log('Role check failed: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
        exit;
    }
}

try {
    $userId = $_SESSION['user_id'];
    $upcoming = [];
    $finished = [];
    
    // FETCH FROM HISTORY COLLECTION
    $historyDocs = $historyCol->find(
        ['passengerId' => $userId],
        ['sort' => ['createdAt' => -1]]
    )->toArray();
    
    foreach ($historyDocs as $h) {
        $status = strtolower($h['status'] ?? 'pending');
        
        // Format createdAt
        $createdAt = null;
        if (isset($h['createdAt'])) {
            if ($h['createdAt'] instanceof MongoDB\BSON\UTCDateTime) {
                $createdAt = $h['createdAt']->toDateTime()->format(DATE_ATOM);
            }
        }
        
        $item = [
            'rideId' => $h['rideId'] ?? '',
            'bookingId' => $h['bookingId'] ?? '',
            'stationedAt' => '',
            'destination' => $h['dropoffLocation'] ?? '',
            'price' => $h['fare'] ?? 0,
            'date' => $h['date'] ?? '',
            'departureTime' => $h['time'] ?? '',
            'name' => $h['driverName'] ?? 'Unknown',
            'pickupLocation' => $h['pickupLocation'] ?? '',
            'status' => [$status],
            'createdAt' => $createdAt,
            'driverId' => $h['driverId'] ?? '',
        ];
        
        // Categorize by status
        if (in_array($status, ['pending', 'accepted', 'scheduled', 'ongoing'], true)) {
            $upcoming[] = $item;
        } else if (in_array($status, ['completed', 'cancelled', 'finished'], true)) {
            $finished[] = $item;
        } else {
            $upcoming[] = $item; // Unknown statuses default to upcoming
        }
    }
    
    // FALLBACK: FETCH FROM BOOKINGS IF NO HISTORY
    if (empty($historyDocs)) {
        $bookingDocs = $bookingsCol->find(
            ['passengerId' => $userId],
            ['sort' => ['timestamp' => -1]]
        )->toArray();
        
        foreach ($bookingDocs as $b) {
            $rideId = $b['rideId'] ?? '';
            $driverId = $b['driverId'] ?? '';
            
            // Get ride details
            $rideDoc = null;
            if ($rideId) {
                $rideDoc = $ridesCol->findOne(['rideId' => $rideId]);
            }
            
            // Get driver name
            $driverName = 'Unknown';
            if ($driverId) {
                $driverUser = $usersCol->findOne(['userID' => $driverId]);
                if ($driverUser && isset($driverUser['name'])) {
                    $driverName = $driverUser['name'];
                }
            }
            
            $status = strtolower($b['status'] ?? 'pending');
            
            // Format timestamp
            $createdAt = null;
            if (isset($b['timestamp']) && $b['timestamp'] instanceof MongoDB\BSON\UTCDateTime) {
                $createdAt = $b['timestamp']->toDateTime()->format(DATE_ATOM);
            }
            
            $item = [
                'rideId' => $rideId,
                'bookingId' => $b['bookingId'] ?? '',
                'stationedAt' => $rideDoc['stationedAt'] ?? '',
                'destination' => $rideDoc['destination'] ?? '',
                'price' => $rideDoc['price'] ?? 0,
                'date' => $rideDoc['date'] ?? '',
                'departureTime' => $rideDoc['departureTime'] ?? '',
                'name' => $driverName,
                'pickupLocation' => $b['pickupLocation'] ?? '',
                'status' => [$status],
                'createdAt' => $createdAt,
                'driverId' => $driverId,
            ];
            
            // Categorize by status
            if (in_array($status, ['pending', 'accepted', 'scheduled', 'ongoing'], true)) {
                $upcoming[] = $item;
            } else {
                $finished[] = $item;
            }
        }
    }
    
    // SORT BY CREATION DATE
    $sortFn = function($a, $b) {
        return strcmp(($b['createdAt'] ?? ''), ($a['createdAt'] ?? ''));
    };
    
    usort($upcoming, $sortFn);
    usort($finished, $sortFn);
    
    echo json_encode([
        'upcoming' => $upcoming,
        'finished' => $finished
    ]);

} catch (Throwable $e) {
    error_log('Fetch history error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
?>