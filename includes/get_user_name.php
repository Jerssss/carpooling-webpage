<?php
require_once __DIR__ . '/db_connect.php';

// For now, fixed user
$userID = "U0004";

$user = $db->users->findOne(['userID' => $userID]);
echo $user['name'] ?? "Guest";
?>
