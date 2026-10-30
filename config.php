<?php
declare(strict_types=1);

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => getenv('DB_PORT') ?: '8889',
        'name' => getenv('DB_NAME') ?: 'db_northwind',
        'user' => getenv('DB_USER') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: 'root',
        'charset' => 'utf8mb4',
    ],
    'jwt_secret' => getenv('JWT_SECRET') ?: 'yZDnvgBNLgfiZ7EJI7DrFMHneiAigLLqQlCIWC+A5iU=',
    'token_ttl' => 60 * 60 * 8,
];
