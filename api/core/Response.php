<?php
declare(strict_types=1);

final class Response
{
    public static function json(array $payload, int $statusCode = 200): never
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            http_response_code(500);
            echo json_encode([
                'status' => false,
                'message' => 'JSON encoding failed: ' . json_last_error_msg(),
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo $json;
        exit;
    }

    public static function success(array $data, int $status = 200, ?string $message = null): never
    {
        $response = ['status' => true];
        if ($message !== null) {
            $response['message'] = $message;
        }
        self::json($response + $data, $status);
    }

    public static function error(string $message, int $status = 400, array $details = []): never
    {
        self::json(['status' => false, 'message' => $message] + ($details ? ['errors' => $details] : []), $status);
    }

    public static function validationError(array $errors): never
    {
        self::error('ข้อมูลไม่ผ่านการตรวจสอบ', 422, $errors);
    }

    public static function notFound(string $message = 'Endpoint not found.'): never
    {
        self::error($message, 404);
    }
}
