<?php
// Shared MongoDB connection for passenger-side.
// Adjusted path after project restructure (HTML/PHP moved under passenger-side/).
require_once __DIR__ . '/../../vendor/autoload.php';

use MongoDB\Client;

try {
    $mongoClient = new Client(getenv('MONGODB_URI') ?: 'mongodb://localhost:27017/');
    $db = $mongoClient->carpooling_data;
    // Ping to validate connection; suppress output to keep JSON endpoints clean.
    $db->command(['ping' => 1]);
} catch (Throwable $e) {
    // Fail hard early so downstream scripts can catch via include failure if desired.
    http_response_code(500);
    die('MongoDB connection failed: ' . $e->getMessage());
}
?>
