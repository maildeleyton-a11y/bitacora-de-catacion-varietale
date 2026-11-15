<?php
/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - CAPA DE BASE DE DATOS Y ALMACENAMIENTO
 * ============================================================================
 * Opera 100% en DreamHost usando PHP 8.3 + SQLite aislado.
 * - Prefiere guardar SQLite y fotos fuera del webroot (../bitacora_storage)
 *   para ser inmune a despliegues rsync --delete.
 * - Si el hosting restringe el directorio padre, usa ./storage protegido con .htaccess.
 */

declare(strict_types=1);

function varietale_get_storage_root(): string {
    static $root = null;
    if ($root !== null) {
        return $root;
    }

    // 1. Intentar carpeta hermana fuera de bitacora.varietale.com (ideal en DreamHost)
    $parentDir = dirname(__DIR__, 2); // /home/usuario
    $externalDir = $parentDir . '/bitacora_storage';
    if (is_dir($externalDir) && is_writable($externalDir)) {
        $root = $externalDir;
        varietale_ensure_dirs($root);
        return $root;
    }
    if (is_writable($parentDir) && @mkdir($externalDir, 0750, true)) {
        $root = $externalDir;
        varietale_ensure_dirs($root);
        return $root;
    }

    // 2. Fallback protegido dentro de api/storage
    $internalDir = __DIR__ . '/storage';
    if (!is_dir($internalDir)) {
        @mkdir($internalDir, 0750, true);
    }
    $htaccessPath = $internalDir . '/.htaccess';
    if (!file_exists($htaccessPath)) {
        @file_put_contents($htaccessPath, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    }
    $root = $internalDir;
    varietale_ensure_dirs($root);
    return $root;
}

function varietale_ensure_dirs(string $root): void {
    $uploads = $root . '/uploads/users';
    if (!is_dir($uploads)) {
        @mkdir($uploads, 0750, true);
    }
    $htaccess = $root . '/.htaccess';
    if (!file_exists($htaccess)) {
        @file_put_contents($htaccess, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    }
}

function varietale_get_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $root = varietale_get_storage_root();
    $dbPath = $root . '/bitacora.sqlite';

    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA busy_timeout = 5000;');
    $pdo->exec('PRAGMA foreign_keys = ON;');
    $pdo->exec('PRAGMA journal_mode = WAL;');

    varietale_init_schema($pdo);
    return $pdo;
}

function varietale_init_schema(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            phone TEXT DEFAULT '',
            password_hash TEXT DEFAULT '',
            security_pin TEXT DEFAULT '0000',
            security_question TEXT DEFAULT '',
            security_answer TEXT DEFAULT '',
            avatar_color TEXT DEFAULT '#01374C',
            experience_level TEXT DEFAULT 'entusiasta',
            favorite_store TEXT DEFAULT 'Varietale Chapinero - Carrera 4a #57-02',
            auth_provider TEXT DEFAULT 'email',
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            unsubscribed_at TEXT DEFAULT NULL,
            last_activity_at TEXT DEFAULT NULL,
            platform TEXT DEFAULT 'Escritorio',
            is_pwa INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

        CREATE TABLE IF NOT EXISTS user_sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            device_label TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

        CREATE TABLE IF NOT EXISTS tastings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            coffee_name TEXT NOT NULL,
            brand TEXT DEFAULT 'VARIETALE',
            origin TEXT DEFAULT '',
            variety TEXT DEFAULT '',
            process TEXT DEFAULT '',
            brew_method TEXT NOT NULL,
            rating REAL DEFAULT 4,
            photo_url TEXT DEFAULT NULL,
            record_json TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tastings_user ON tastings(user_id);
        CREATE INDEX IF NOT EXISTS idx_tastings_created ON tastings(created_at DESC);

        CREATE TABLE IF NOT EXISTS analytics_events (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            user_id TEXT DEFAULT '',
            username TEXT DEFAULT '',
            user_name TEXT DEFAULT '',
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);

        CREATE TABLE IF NOT EXISTS kv_store (
            k TEXT PRIMARY KEY,
            v TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS admin_sessions (
            token TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL
        );
    ");
}

function varietale_json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function varietale_get_json_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function varietale_get_bearer_token(): string {
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/Bearer\s+([a-zA-Z0-9._-]+)/i', $auth, $m)) {
        return $m[1];
    }
    $custom = $headers['X-Session-Token'] ?? $headers['x-session-token'] ?? ($_SERVER['HTTP_X_SESSION_TOKEN'] ?? '');
    if ($custom !== '') {
        return trim($custom);
    }
    return trim((string)($_GET['token'] ?? ''));
}

function varietale_get_backup_secret(): string {
    $env = getenv('VARIETALE_BACKUP_TOKEN');
    if (is_string($env) && trim($env) !== '') {
        return trim($env);
    }
    $root = varietale_get_storage_root();
    $secretFile = $root . '/backup_token.secret';
    if (file_exists($secretFile)) {
        $val = trim((string)@file_get_contents($secretFile));
        if ($val !== '') {
            return $val;
        }
    }
    // Generar token aleatorio seguro en la primera ejecución en DreamHost
    $generated = bin2hex(random_bytes(24));
    @file_put_contents($secretFile, $generated);
    @chmod($secretFile, 0600);
    return $generated;
}

function varietale_delete_user_photos_dir(string $userId): int {
    $safeUserId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $userId);
    if ($safeUserId === '') {
        return 0;
    }
    $root = varietale_get_storage_root();
    $userDir = $root . '/uploads/users/' . $safeUserId;
    if (!is_dir($userDir)) {
        return 0;
    }
    $deletedCount = 0;
    $items = @scandir($userDir);
    if (is_array($items)) {
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $userDir . '/' . $item;
            if (is_file($path) && @unlink($path)) {
                $deletedCount++;
            }
        }
    }
    @rmdir($userDir);
    return $deletedCount;
}

function varietale_kv_get(PDO $pdo, string $key): ?array {
    $stmt = $pdo->prepare('SELECT v, updated_at FROM kv_store WHERE k = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $decoded = json_decode($row['v'], true);
    return is_array($decoded) ? ['value' => $decoded, 'updated_at' => $row['updated_at']] : null;
}

function varietale_kv_set(PDO $pdo, string $key, array $value): void {
    $now = gmdate('c');
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt = $pdo->prepare('INSERT INTO kv_store (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at');
    $stmt->execute([$key, $json, $now]);
}

function varietale_user_row_to_profile(array $row): array {
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'username' => $row['username'],
        'email' => $row['email'],
        'phone' => $row['phone'] ?? '',
        'experienceLevel' => $row['experience_level'] ?: 'entusiasta',
        'favoriteStore' => $row['favorite_store'] ?: 'Varietale Chapinero - Carrera 4a #57-02',
        'memberSince' => $row['created_at'],
        'avatarColor' => $row['avatar_color'] ?: '#01374C',
        'authProvider' => $row['auth_provider'] ?: 'email',
        'verified' => true,
        'status' => $row['status'] ?? 'active',
        'unsubscribedAt' => $row['unsubscribed_at'] ?? null,
    ];
}
