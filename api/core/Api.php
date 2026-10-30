<?php
declare(strict_types=1);

final class Api
{
    public static function input(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            Response::error('Request body must be valid JSON.', 400);
        }
        return $data;
    }

    public static function tokenFor(int $userId, string $secret, int $ttl): string
    {
        $base64 = static fn(string $value): string => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        $header = $base64((string)json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = $base64((string)json_encode(['sub' => $userId, 'iat' => time(), 'exp' => time() + $ttl]));
        $signature = $base64(hash_hmac('sha256', "$header.$payload", $secret, true));
        return "$header.$payload.$signature";
    }

    public static function currentUser(PDO $db, string $secret): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+([A-Za-z0-9._-]+)$/i', $header, $matches)) {
            Response::error('Authorization token is required.', 401);
        }
        $parts = explode('.', $matches[1]);
        if (count($parts) !== 3) {
            Response::error('Invalid or expired token.', 401);
        }
        [$head, $payload, $signature] = $parts;
        $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "$head.$payload", $secret, true)), '+/', '-_'), '=');
        $decoded = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        if (!hash_equals($expected, $signature) || !is_array($decoded) || (int)($decoded['exp'] ?? 0) < time()) {
            Response::error('Invalid or expired token.', 401);
        }
        $stmt = $db->prepare('SELECT id, username, display_name FROM users WHERE id = ?');
        $stmt->execute([(int)($decoded['sub'] ?? 0)]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('User account no longer exists.', 401);
        }
        $user['role'] = 'admin';
        return $user;
    }

    public static function cleanInput(array $data, array $fields): array
    {
        $clean = [];
        foreach ($fields as $field => $rule) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            if ($value === '' && str_ends_with($rule, '?')) {
                $value = null;
            }
            if ($value !== null && str_starts_with($rule, 'string')) {
                if (!is_string($value) && !is_numeric($value)) {
                    Response::error("Field '$field' must be text.", 422);
                }
                $max = (int)filter_var($rule, FILTER_SANITIZE_NUMBER_INT);
                $value = trim((string)$value);
                if ($value === '' && !str_ends_with($rule, '?')) {
                    Response::error("Field '$field' is required.", 422);
                }
                $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
                if ($max > 0 && $length > $max) {
                    Response::error("Field '$field' exceeds $max characters.", 422);
                }
                if ($field === 'customer_id' && !preg_match('/^[A-Za-z0-9]{5}$/', $value)) {
                    Response::error("Field '$field' must be exactly 5 letters or digits.", 422);
                }
            } elseif ($value !== null && str_starts_with($rule, 'number')) {
                if (!is_numeric($value)) {
                    Response::error("Field '$field' must be numeric.", 422);
                }
                $value = (float)$value;
            } elseif ($value !== null && str_starts_with($rule, 'integer')) {
                if (filter_var($value, FILTER_VALIDATE_INT) === false) {
                    Response::error("Field '$field' must be an integer.", 422);
                }
                $value = (int)$value;
            } elseif ($value !== null && str_starts_with($rule, 'date') && $value !== '') {
                if (!is_string($value)) {
                    Response::error("Field '$field' must be a date string.", 422);
                }
                $date = DateTime::createFromFormat('Y-m-d', $value);
                if (!$date || $date->format('Y-m-d') !== $value) {
                    Response::error("Field '$field' must use YYYY-MM-DD.", 422);
                }
            }
            $clean[$field] = $value;
        }
        return $clean;
    }
}
