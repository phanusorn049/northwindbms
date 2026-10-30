<?php
declare(strict_types=1);

final class AuthController
{
    public function __construct(
        private PDO $conn,
        private string $secret,
        private int $tokenTtl
    ) {
    }

    public function status(): void
    {
        $count = (int)$this->conn->query('SELECT COUNT(*) FROM users')->fetchColumn();
        Response::success(['data' => ['setup_required' => $count === 0]]);
    }

    public function setup(): void
    {
        [$username, $password, $name] = $this->registrationData();

        $this->conn->beginTransaction();
        if ($this->conn->query('SELECT id FROM users LIMIT 1 FOR UPDATE')->fetch()) {
            $this->conn->rollBack();
            Response::error('An administrator has already been created.', 409);
        }
        $stmt = $this->conn->prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)');
        $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $name]);
        $id = (int)$this->conn->lastInsertId();
        $this->conn->commit();
        Response::success(['message' => 'Administrator created.', 'data' => [
            'token' => Api::tokenFor($id, $this->secret, $this->tokenTtl),
            'user' => ['id' => $id, 'username' => $username, 'display_name' => $name, 'role' => 'admin'],
        ]], 201);
    }

    public function register(): void
    {
        [$username, $password, $name] = $this->registrationData();
        $stmt = $this->conn->prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)');
        $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $name]);
        Response::success(['message' => 'Administrator account created.', 'data' => [
            'user' => [
                'id' => (int)$this->conn->lastInsertId(),
                'username' => $username,
                'display_name' => $name,
                'role' => 'admin',
            ],
        ]], 201);
    }

    public function login(): void
    {
        $body = Api::input();
        $stmt = $this->conn->prepare('SELECT id, username, display_name, password_hash FROM users WHERE username = ?');
        $stmt->execute([trim((string)($body['username'] ?? ''))]);
        $user = $stmt->fetch();
        if (!$user || !password_verify((string)($body['password'] ?? ''), $user['password_hash'])) {
            Response::error('Username or password is incorrect.', 401);
        }
        Response::success(['data' => [
            'token' => Api::tokenFor((int)$user['id'], $this->secret, $this->tokenTtl),
            'user' => ['id' => (int)$user['id'], 'username' => $user['username'], 'display_name' => $user['display_name'], 'role' => 'admin'],
        ]]);
    }

    public function me(): void
    {
        Response::success(['data' => Api::currentUser($this->conn, $this->secret)]);
    }

    private function registrationData(): array
    {
        $body = Api::input();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $name = trim((string)($body['display_name'] ?? ''));
        if (!preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $username) || strlen($password) < 10 || $name === '') {
            Response::error('Enter a display name, username (3-50 characters), and password (at least 10 characters).', 422);
        }
        return [$username, $password, $name];
    }
}
