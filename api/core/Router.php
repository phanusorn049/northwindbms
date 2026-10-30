<?php
declare(strict_types=1);

final class Router
{
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, callable $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function patch(string $pattern, callable $handler): void
    {
        $this->add('PATCH', $pattern, $handler);
    }

    public function delete(string $pattern, callable $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    private function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = ['method' => $method, 'pattern' => trim($pattern, '/'), 'handler' => $handler];
    }

    public function dispatch(string $method, string $uri): void
    {
        $uri = trim((string)(parse_url($uri, PHP_URL_PATH) ?? ''), '/');
        foreach ($this->routes as $route) {
            if ($route['method'] !== strtoupper($method)) {
                continue;
            }
            $params = $this->match($route['pattern'], $uri);
            if ($params !== false) {
                ($route['handler'])(...$params);
                return;
            }
        }
        Response::notFound("ไม่พบ Endpoint: [$method] /$uri");
    }

    private function match(string $pattern, string $uri): array|false
    {
        $patternParts = $pattern === '' ? [] : explode('/', $pattern);
        $uriParts = $uri === '' ? [] : explode('/', $uri);
        if (count($patternParts) !== count($uriParts)) {
            return false;
        }
        $params = [];
        foreach ($patternParts as $index => $part) {
            if (preg_match('/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/', $part)) {
                $params[] = rawurldecode($uriParts[$index]);
            } elseif ($part !== $uriParts[$index]) {
                return false;
            }
        }
        return $params;
    }
}
