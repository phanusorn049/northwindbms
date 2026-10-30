<?php
declare(strict_types=1);
$config = require __DIR__ . '/config.php';
if (empty($config['jwt_secret'])) {
    http_response_code(503);
}
?><!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f0f4f8">
  <title>Northwind | Business Management</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <link href="assets/css/app.css?v=4" rel="stylesheet">
  <link href="assets/css/northwind-theme.css?v=4" rel="stylesheet">
</head>
<body>
<div id="toast-container" class="toast-container position-fixed top-0 end-0 p-3"></div>
<main id="app">
  <div class="page-loading"><span class="spinner-border text-primary" aria-label="กำลังโหลด"></span></div>
</main>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="assets/js/app.js?v=9"></script>
</body>
</html>
