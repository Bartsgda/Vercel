<?php
header('Content-Type: application/json');

$jsonFile = '../data/events.json';

// Get raw POST data
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (!$data || !isset($data['events'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data format']);
    exit;
}

// Security: Optional structure check here
// For now, we trust the client as it's a local tool

if (file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['status' => 'success', 'message' => 'Data saved successfully']);
}
else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write to file']);
}
