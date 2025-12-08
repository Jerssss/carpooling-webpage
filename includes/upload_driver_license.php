<?php
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/session.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }

    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit;
    }

    if (!isset($_FILES['licenseImage'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file provided']);
        exit;
    }

    $file = $_FILES['licenseImage'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Upload error']);
        exit;
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    if (strpos($mime, 'image/') !== 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Only image files are allowed']);
        exit;
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    if (!$ext) {
        // derive common ext by mime
        $ext = $mime === 'image/png' ? 'png' : ($mime === 'image/jpeg' ? 'jpg' : 'img');
    }

    $targetDir = realpath(__DIR__ . '/../images/driver_docs');
    if ($targetDir === false) {
        $targetDir = __DIR__ . '/../images/driver_docs';
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }
    }

    $targetRel = 'images/driver_docs/' . $userId . '_license.' . $ext;
    $targetAbs = __DIR__ . '/../' . $targetRel;

    if (!move_uploaded_file($file['tmp_name'], $targetAbs)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save file']);
        exit;
    }

    // Update user document
    $db->users->updateOne(
        ['userID' => $userId],
        ['$set' => ['driverDocs.licenseImage' => $targetRel]],
        ['upsert' => false]
    );

    echo json_encode(['success' => true, 'path' => $targetRel]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error', 'error' => $e->getMessage()]);
}
?>
