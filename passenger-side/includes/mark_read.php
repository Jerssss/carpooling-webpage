<?php
// includes/mark_read.php
set_include_path(__DIR__ . '/../');
ob_start();
require 'db_connect.php';
ob_end_clean();

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
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
exit;
?>
