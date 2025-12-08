<?php
require __DIR__ . '/../vendor/autoload.php';
use MongoDB\Client;

$client = new Client("mongodb://localhost:27017/");
$db = $client->carpooling_data;

// For now, fixed user
$userID = "U0004";

$user = $db->users->findOne(['userID' => $userID]);
echo $user['name'] ?? "Guest";
?>
