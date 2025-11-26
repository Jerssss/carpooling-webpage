<?php
// Shared MongoDB connection (root includes).
// Composer autoload path relative to this file.
require_once __DIR__ . '/../vendor/autoload.php';

use MongoDB\Client;

try {
    $mongoClient = new Client(getenv('MONGODB_URI') ?: 'mongodb://localhost:27017/');
    $db = $mongoClient->carpooling_data;
    // Ping to validate connection; suppress output to keep JSON endpoints clean.
    $db->command(['ping' => 1]);
} catch (Throwable $e) {
    http_response_code(500);
    // Keep output minimal to avoid corrupting JSON responses.
    die('MongoDB connection failed');
}
?>
