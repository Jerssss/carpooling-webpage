<?php
// includes/mark_read.php
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json; charset=utf-8');

$notifId = $_POST['notifId'] ?? $_GET['notifId'] ?? null;
if (!$notifId) {
    echo json_encode(['error' => 'Missing notifId']);
    exit;
}

try {
    $collection = $db->notifications;
    $oid = new MongoDB\BSON\ObjectId($notifId);
    $res = $collection->updateOne(['_id' => $oid], ['$set' => ['isRead' => true]]);
    echo json_encode(['success' => true, 'modified' => $res->getModifiedCount()]);
} catch (Throwable $e) {
    // Docker-safe: return JSON without extra debug output
    echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
}
exit;
?>
