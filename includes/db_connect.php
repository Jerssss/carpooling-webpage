<?php
require 'vendor/autoload.php'; // include Composer autoloader

use MongoDB\Client;

// Local MongoDB connection (Copy connection string)
$mongoClient = new Client("mongodb://localhost:27017/");

// Connecting to the database
$db = $mongoClient->carpooling_data;

// Test connection
try {
    $db->command(['ping' => 1]);
    echo "Connected successfully to MongoDB!";
} catch (Exception $e) {
    die("Failed to connect: " . $e->getMessage());
}
?>
