<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/db_connect.php';

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) { throw new Exception('invalid_json'); }

    $rideId    = isset($data['rideId']) ? trim($data['rideId']) : '';
    $driverId  = isset($data['driverId']) ? trim($data['driverId']) : '';
    $ratingVal = isset($data['rating']) ? (int)$data['rating'] : 0;

    if ($rideId === '' || $driverId === '' || $ratingVal < 1 || $ratingVal > 5) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_input']);
        exit;
    }

    $passengerId = $_SESSION['user_id'] ?? null;
    if (!$passengerId) {
        http_response_code(401);
        echo json_encode(['error' => 'not_logged_in']);
        exit;
    }

    $reviews = $db->selectCollection('reviews');

    // Helper: generate next reviewId like REV0000001
    $nextId = function() use ($reviews) {
        $last = $reviews->findOne(
            ['reviewId' => ['$regex' => '^REV\\d+$']],
            [
                'sort' => ['reviewId' => -1],
                'projection' => ['reviewId' => 1]
            ]
        );
        $n = 0;
        if ($last && isset($last['reviewId'])) {
            if (preg_match('/^REV(\d+)$/', (string)$last['reviewId'], $m)) {
                $n = (int)$m[1];
            }
        }
        $n++;
        return 'REV' . str_pad((string)$n, 7, '0', STR_PAD_LEFT);
    };

    // Upsert per (rideId, passengerId)
    $existing = $reviews->findOne(['rideId' => $rideId, 'passengerId' => $passengerId]);

    $nowIso = gmdate('c');
    if ($existing) {
        $reviews->updateOne(
            ['_id' => $existing['_id']],
            ['$set' => [
                'ratingValue' => $ratingVal,
                'driverId'    => $driverId,
                'createdAt'   => $nowIso
            ]]
        );
        $reviewId = (string)$existing['reviewId'];
    } else {
        $reviewId = $nextId();
        $reviews->insertOne([
            'reviewId'    => $reviewId,
            'rideId'      => $rideId,
            'driverId'    => $driverId,
            'passengerId' => $passengerId,
            // Store individual rating for averaging
            'ratingValue' => $ratingVal,
            // rating (average) will be set after computing below
            'rating'      => null,
            'createdAt'   => $nowIso
        ]);
    }

    // Compute average rating for this ride across all passenger reviews
    $cursor = $reviews->aggregate([
        ['$match' => [
            'rideId' => $rideId,
            'ratingValue' => ['$gte' => 1]
        ]],
        ['$group' => [
            '_id' => '$rideId',
            'avg' => ['$avg' => '$ratingValue']
        ]]
    ]);
    $avgDoc = $cursor->toArray();
    $avg = null;
    if ($avgDoc && isset($avgDoc[0]['avg'])) {
        // Round to 1 decimal, format as string like "4.5"
        $avg = number_format((float)$avgDoc[0]['avg'], 1, '.', '');
    }

    // Update the latest (this passenger's) doc's rating field to the current average
    $reviews->updateOne(
        ['rideId' => $rideId, 'passengerId' => $passengerId],
        ['$set' => ['rating' => $avg]]
    );

    echo json_encode([
        'ok' => true,
        'reviewId' => $reviewId,
        'rideId' => $rideId,
        'driverId' => $driverId,
        'passengerId' => $passengerId,
        'ratingAvg' => $avg,
        'createdAt' => $nowIso
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server_error']);
}
?>
