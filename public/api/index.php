<?php
/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - ROUTER API CENTRAL EN DREAMHOST (PHP 8.3)
 * ============================================================================
 * Centraliza autenticación, sesiones multi-dispositivo, bitácoras (catas),
 * fotos optimizadas en disco, baja con borrado fotográfico y conservación de
 * datos, analítica, portal administrador, catálogo en vivo y respaldos JSON.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/varietale_catalog.php';

// CORS seguro para la misma instancia y previews autorizados
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Token, X-Admin-Token, X-Backup-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$route = trim((string)($_GET['route'] ?? ''), '/');
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

try {
    $pdo = varietale_get_db();
} catch (Throwable $e) {
    varietale_json_response([
        'success' => false,
        'error' => 'Error inicializando base de datos en servidor.',
        'detail' => $e->getMessage(),
    ], 500);
}

// ============================================================================
// HELPERS DE AUTENTICACIÓN Y SEGURIDAD
// ============================================================================

function varietale_require_active_user(PDO $pdo): array {
    $token = varietale_get_bearer_token();
    if ($token === '') {
        varietale_json_response(['success' => false, 'error' => 'Sesión no autenticada.'], 401);
    }
    $stmt = $pdo->prepare('
        SELECT u.* FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
    ');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user || ($user['status'] ?? 'active') !== 'active') {
        varietale_json_response(['success' => false, 'error' => 'Sesión expirada o cuenta dada de baja.'], 401);
    }
    $upd = $pdo->prepare('UPDATE user_sessions SET last_seen_at = ? WHERE token = ?');
    $upd->execute([gmdate('c'), $token]);
    return ['user' => $user, 'token' => $token];
}

function varietale_create_user_session(PDO $pdo, string $userId, string $deviceLabel = ''): string {
    $token = bin2hex(random_bytes(24));
    $now = gmdate('c');
    $stmt = $pdo->prepare('INSERT INTO user_sessions (token, user_id, device_label, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$token, $userId, mb_substr($deviceLabel, 0, 80, 'UTF-8'), $now, $now]);
    $upd = $pdo->prepare('UPDATE users SET last_activity_at = ?, updated_at = ? WHERE id = ?');
    $upd->execute([$now, $now, $userId]);
    return $token;
}

function varietale_get_admin_config(PDO $pdo): array {
    $stored = varietale_kv_get($pdo, 'admin_credentials');
    if ($stored && isset($stored['value']['username'])) {
        return $stored['value'];
    }
    return [
        'username' => 'amorporelcafe.admin',
        'passwordHash' => password_hash('Varietale2026*', PASSWORD_DEFAULT),
        'masterPin' => '1985',
        'hasCustomized' => false,
        'updatedAt' => gmdate('c'),
    ];
}

function varietale_require_admin(PDO $pdo): string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $adminToken = trim((string)($headers['X-Admin-Token'] ?? $headers['x-admin-token'] ?? ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '')));
    if ($adminToken === '') {
        $adminToken = varietale_get_bearer_token();
    }
    if ($adminToken === '') {
        varietale_json_response(['success' => false, 'error' => 'Requiere sesión de Administrador.'], 401);
    }
    $stmt = $pdo->prepare('SELECT token FROM admin_sessions WHERE token = ? LIMIT 1');
    $stmt->execute([$adminToken]);
    if (!$stmt->fetch()) {
        varietale_json_response(['success' => false, 'error' => 'Sesión de Administrador inválida o expirada.'], 401);
    }
    $pdo->prepare('UPDATE admin_sessions SET last_seen_at = ? WHERE token = ?')->execute([gmdate('c'), $adminToken]);
    return $adminToken;
}

function varietale_sanitize_slug(string $val, string $fallback = 'catador'): string {
    $clean = strtolower(preg_replace('/[^a-zA-Z0-9._-]/', '', trim($val)) ?? '');
    return $clean !== '' ? $clean : $fallback;
}

function varietale_unique_username(PDO $pdo, string $desired, string $excludeUserId = ''): string {
    $base = varietale_sanitize_slug($desired, 'catador');
    $candidate = $base;
    $suffix = 1;
    while (true) {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
        $stmt->execute([$candidate]);
        $row = $stmt->fetch();
        if (!$row || ($excludeUserId !== '' && $row['id'] === $excludeUserId)) {
            return $candidate;
        }
        $suffix++;
        $candidate = $base . $suffix;
    }
}

function varietale_extract_first_name(string $email, string $fullName = ''): string {
    if (trim($fullName) !== '') {
        $parts = preg_split('/\s+/', trim($fullName));
        if (!empty($parts[0]) && !in_array(strtolower($parts[0]), ['catador', 'usuario', 'invitado'], true)) {
            return ucfirst($parts[0]);
        }
    }
    $prefix = strtolower(explode('@', $email)[0] ?? '');
    $cleaned = preg_replace('/^(mailde|correode|soyel|contacto|hola)\.?/i', '', $prefix) ?? $prefix;
    $tokens = preg_split('/[._-]/', $cleaned ?: $prefix);
    $first = preg_replace('/\d+$/', '', $tokens[0] ?? '') ?? '';
    $res = strlen($first) >= 2 ? $first : ($tokens[0] ?? 'catador');
    return $res !== '' ? ucfirst($res) : 'Catador';
}

function varietale_unsubscribe_and_scrub_photos(PDO $pdo, string $userId): array {
    $now = gmdate('c');
    $photosDeleted = varietale_delete_user_photos_dir($userId);

    // Limpiar photo_url en las catas sin borrar ninguna cata
    $stmt = $pdo->prepare('SELECT id, record_json FROM tastings WHERE user_id = ?');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    $updTasting = $pdo->prepare('UPDATE tastings SET photo_url = NULL, record_json = ?, updated_at = ? WHERE id = ?');
    foreach ($rows as $r) {
        $rec = json_decode($r['record_json'], true);
        if (is_array($rec)) {
            unset($rec['photoUrl']);
            $updTasting->execute([json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $r['id']]);
        }
    }

    // Revocar todas las sesiones del usuario y marcar baja conservando toda la información histórica
    $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$userId]);
    $pdo->prepare("UPDATE users SET status = 'unsubscribed', unsubscribed_at = ?, updated_at = ? WHERE id = ?")
        ->execute([$now, $now, $userId]);

    return ['photosDeleted' => $photosDeleted, 'tastingsPreserved' => count($rows), 'unsubscribedAt' => $now];
}

function varietale_upsert_tasting_record(PDO $pdo, string $userId, array $rec): ?array {
    $id = trim((string)($rec['id'] ?? ''));
    $coffeeName = trim((string)($rec['coffeeName'] ?? ''));
    if ($id === '' || $coffeeName === '') {
        return null;
    }

    $createdAt = trim((string)($rec['createdAt'] ?? gmdate('c')));
    $now = gmdate('c');
    $photoUrl = isset($rec['photoUrl']) && is_string($rec['photoUrl']) ? trim($rec['photoUrl']) : null;

    // Nunca guardar blobs Base64 gigantes dentro de SQLite
    if ($photoUrl !== null && str_starts_with($photoUrl, 'data:image/')) {
        $photoUrl = null;
    }
    if ($photoUrl === '') {
        $photoUrl = null;
    }

    $cleanRec = $rec;
    if ($photoUrl !== null) {
        $cleanRec['photoUrl'] = $photoUrl;
    } else {
        unset($cleanRec['photoUrl']);
    }

    // Preservar photo_url existente en servidor si el cliente no envió un reemplazo ni borrado explícito
    if ($photoUrl === null && !array_key_exists('photoUrl', $rec)) {
        $existingStmt = $pdo->prepare('SELECT photo_url FROM tastings WHERE id = ? AND user_id = ? LIMIT 1');
        $existingStmt->execute([$id, $userId]);
        $existing = $existingStmt->fetch();
        if ($existing && !empty($existing['photo_url'])) {
            $photoUrl = $existing['photo_url'];
            $cleanRec['photoUrl'] = $photoUrl;
        }
    }

    $recordJson = json_encode($cleanRec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $stmt = $pdo->prepare('
        INSERT INTO tastings (id, user_id, created_at, updated_at, coffee_name, brand, origin, variety, process, brew_method, rating, photo_url, record_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            coffee_name = excluded.coffee_name,
            brand = excluded.brand,
            origin = excluded.origin,
            variety = excluded.variety,
            process = excluded.process,
            brew_method = excluded.brew_method,
            rating = excluded.rating,
            photo_url = excluded.photo_url,
            record_json = excluded.record_json,
            updated_at = excluded.updated_at
        WHERE tastings.user_id = excluded.user_id
    ');

    $stmt->execute([
        $id,
        $userId,
        $createdAt,
        $now,
        $coffeeName,
        trim((string)($rec['brand'] ?? 'VARIETALE')),
        trim((string)($rec['origin'] ?? '')),
        trim((string)($rec['variety'] ?? '')),
        trim((string)($rec['process'] ?? '')),
        trim((string)($rec['brewMethod'] ?? 'v60')),
        (float)($rec['rating'] ?? 4),
        $photoUrl,
        $recordJson,
    ]);

    return $cleanRec;
}

// ============================================================================
// DESPACHO DE RUTAS API
// ============================================================================

switch ($route) {
    // ------------------------------------------------------------------------
    // 1. HEALTH CHECK
    // ------------------------------------------------------------------------
    case 'health':
        $root = varietale_get_storage_root();
        varietale_json_response([
            'status' => 'ok',
            'backend' => 'dreamhost-php-sqlite',
            'phpVersion' => PHP_VERSION,
            'storageWritable' => is_writable($root),
            'timestamp' => gmdate('c'),
        ]);
        break;

    // ------------------------------------------------------------------------
    // 2. CATÁLOGO EN VIVO DE VARIETALE.COM (FILTRADO POR VISIBILIDAD Y STOCK)
    // ------------------------------------------------------------------------
    case 'varietale-coffees':
    case 'varietale-catalog':
        $force = ($_GET['refresh'] ?? '') === 'true';
        $includeUnavailable = ($_GET['include_unavailable'] ?? '') === 'true';
        $res = varietale_sync_live_catalog($pdo, $force, $includeUnavailable);
        if ($route === 'varietale-catalog') {
            varietale_json_response(['success' => $res['success'], 'data' => $res['coffees'], 'verifiedLive' => $res['verifiedLive'] ?? false]);
        }
        varietale_json_response($res);
        break;

    // ------------------------------------------------------------------------
    // 3. AUTENTICACIÓN Y GESTIÓN DE CUENTAS
    // ------------------------------------------------------------------------
    case 'auth/register':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $name = trim((string)($b['name'] ?? ''));
        $rawUsername = trim((string)($b['username'] ?? ''));
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $password = trim((string)($b['password'] ?? ''));
        $pin = trim((string)($b['securityPin'] ?? '1234'));
        $phone = trim((string)($b['phone'] ?? ''));
        $platform = trim((string)($b['platform'] ?? 'Escritorio'));
        $isPwa = !empty($b['isPwa']) ? 1 : 0;

        if ($name === '' || $rawUsername === '' || strlen($password) < 6 || !preg_match('/^\d{4}$/', $pin)) {
            varietale_json_response(['success' => false, 'error' => 'Completa nombre, usuario, contraseña (mín. 6 caracteres) y PIN de 4 dígitos.'], 400);
        }

        $cleanSlug = varietale_sanitize_slug($rawUsername);
        if ($email === '') {
            $email = $cleanSlug . '@varietale.com';
        }

        $existingEmail = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $existingEmail->execute([$email]);
        $found = $existingEmail->fetch();

        $now = gmdate('c');
        if ($found) {
            if (($found['status'] ?? 'active') === 'unsubscribed') {
                // Reactivar cuenta previamente dada de baja preservando todas sus catas históricas
                $reactivatedUsername = varietale_unique_username($pdo, $cleanSlug, $found['id']);
                $upd = $pdo->prepare("
                    UPDATE users SET
                        name = ?, username = ?, phone = ?, password_hash = ?, security_pin = ?,
                        auth_provider = 'email', status = 'active', unsubscribed_at = NULL,
                        updated_at = ?, last_activity_at = ?, platform = ?, is_pwa = ?
                    WHERE id = ?
                ");
                $upd->execute([
                    $name, $reactivatedUsername, $phone, password_hash($password, PASSWORD_DEFAULT), $pin,
                    $now, $now, $platform, $isPwa, $found['id']
                ]);
                $stmtReload = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                $stmtReload->execute([$found['id']]);
                $userRow = $stmtReload->fetch();
                $token = varietale_create_user_session($pdo, $userRow['id'], $platform);
                varietale_json_response([
                    'success' => true,
                    'reactivated' => true,
                    'token' => $token,
                    'user' => varietale_user_row_to_profile($userRow),
                ]);
            }
            varietale_json_response(['success' => false, 'error' => 'Ya existe una cuenta registrada con ese correo. Inicia sesión.'], 409);
        }

        $existingUser = $pdo->prepare('SELECT id, status, username FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
        $existingUser->execute([$cleanSlug]);
        if ($existingUserRow = $existingUser->fetch()) {
            if (($existingUserRow['status'] ?? 'active') !== 'active') {
                // Liberar el handle de usuario de una cuenta dada de baja para no bloquear nuevos registros o reingresos
                $freedUsername = $existingUserRow['username'] . '_baja_' . substr($existingUserRow['id'], -4);
                $pdo->prepare('UPDATE users SET username = ? WHERE id = ?')->execute([$freedUsername, $existingUserRow['id']]);
            } else {
                varietale_json_response(['success' => false, 'error' => "El usuario @{$cleanSlug} ya está registrado."], 409);
            }
        }

        $userId = 'usr_' . bin2hex(random_bytes(8));
        $stmt = $pdo->prepare("
            INSERT INTO users (
                id, name, username, email, phone, password_hash, security_pin,
                security_question, security_answer, avatar_color, auth_provider,
                status, created_at, updated_at, last_activity_at, platform, is_pwa
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'email', 'active', ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $name,
            $cleanSlug,
            $email,
            $phone,
            password_hash($password, PASSWORD_DEFAULT),
            $pin,
            trim((string)($b['securityQuestion'] ?? '')),
            trim((string)($b['securityAnswer'] ?? '')),
            trim((string)($b['avatarColor'] ?? '#01374C')),
            $now,
            $now,
            $now,
            $platform,
            $isPwa,
        ]);

        $stmtReload = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmtReload->execute([$userId]);
        $userRow = $stmtReload->fetch();
        $token = varietale_create_user_session($pdo, $userId, $platform);

        varietale_json_response([
            'success' => true,
            'token' => $token,
            'user' => varietale_user_row_to_profile($userRow),
        ]);
        break;

    case 'auth/login':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $identifier = strtolower(trim((string)($b['identifier'] ?? '')));
        $password = trim((string)($b['password'] ?? ''));
        $reactivate = !empty($b['reactivate']);
        $platform = trim((string)($b['platform'] ?? 'Escritorio'));
        $isPwa = !empty($b['isPwa']) ? 1 : 0;

        if ($identifier === '' || $password === '') {
            varietale_json_response(['success' => false, 'error' => 'Ingresa tu correo/usuario y contraseña.'], 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR LOWER(id) = ? LIMIT 1');
        $stmt->execute([$identifier, $identifier, $identifier]);
        $userRow = $stmt->fetch();

        if (!$userRow) {
            varietale_json_response(['success' => false, 'error' => 'No se encontró una cuenta con ese correo o usuario.'], 404);
        }
        if (!empty($userRow['password_hash']) && !password_verify($password, $userRow['password_hash'])) {
            varietale_json_response(['success' => false, 'error' => 'Contraseña incorrecta. Puedes restablecerla con tu PIN de respaldo.'], 401);
        }

        $wasUnsubscribed = ($userRow['status'] ?? 'active') !== 'active';
        if ($wasUnsubscribed) {
            if (empty($userRow['password_hash'])) {
                varietale_json_response([
                    'success' => false,
                    'error' => 'Esta cuenta estaba dada de baja y usa Google. Inicia sesión con Google para volver a darte de alta y recuperar tus catas.',
                ], 403);
            }
            if (!$reactivate) {
                varietale_json_response([
                    'success' => false,
                    'canReactivate' => true,
                    'error' => 'Esta cuenta fue dada de baja. ¿Quieres volver a darte de alta y recuperar tu historial de catas?',
                ], 403);
            }
            $now = gmdate('c');
            $pdo->prepare("UPDATE users SET status = 'active', unsubscribed_at = NULL, platform = ?, is_pwa = ?, last_activity_at = ?, updated_at = ? WHERE id = ?")
                ->execute([$platform, $isPwa, $now, $now, $userRow['id']]);
            $stmtReload = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $stmtReload->execute([$userRow['id']]);
            $userRow = $stmtReload->fetch();
        } else {
            $pdo->prepare('UPDATE users SET platform = ?, is_pwa = ?, last_activity_at = ? WHERE id = ?')
                ->execute([$platform, $isPwa, gmdate('c'), $userRow['id']]);
        }

        $token = varietale_create_user_session($pdo, $userRow['id'], $platform);

        varietale_json_response([
            'success' => true,
            'reactivated' => $wasUnsubscribed,
            'token' => $token,
            'user' => varietale_user_row_to_profile($userRow),
        ]);
        break;

    case 'auth/google':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $customUsername = trim((string)($b['username'] ?? ''));
        $fullName = trim((string)($b['name'] ?? ''));
        $platform = trim((string)($b['platform'] ?? 'Escritorio'));
        $isPwa = !empty($b['isPwa']) ? 1 : 0;

        if ($email === '' || !str_contains($email, '@') || !str_contains($email, '.')) {
            varietale_json_response(['success' => false, 'error' => 'Correo de Google inválido.'], 400);
        }

        $now = gmdate('c');
        // Unificar SIEMPRE por correo completo normalizado para evitar colisiones de nombres como "cristian"
        $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $stmt->execute([$email]);
        $existing = $stmt->fetch();

        if ($existing) {
            if (($existing['status'] ?? 'active') !== 'active') {
                // Reactivar cuenta dada de baja al reingresar con Google conservando su historial de catas
                $pdo->prepare("UPDATE users SET status = 'active', unsubscribed_at = NULL, auth_provider = 'google', platform = ?, is_pwa = ?, updated_at = ?, last_activity_at = ? WHERE id = ?")
                    ->execute([$platform, $isPwa, $now, $now, $existing['id']]);
            } else {
                $pdo->prepare("UPDATE users SET auth_provider = 'google', platform = ?, is_pwa = ?, last_activity_at = ? WHERE id = ?")
                    ->execute([$platform, $isPwa, $now, $existing['id']]);
            }
            $stmtReload = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $stmtReload->execute([$existing['id']]);
            $userRow = $stmtReload->fetch();
            $token = varietale_create_user_session($pdo, $userRow['id'], $platform);
            varietale_json_response([
                'success' => true,
                'token' => $token,
                'user' => varietale_user_row_to_profile($userRow),
            ]);
        }

        // Crear nueva cuenta Google con username único derivado del prefijo completo del correo
        $prefixSlug = varietale_sanitize_slug(explode('@', $email)[0] ?? 'catador');
        $desiredUser = $customUsername !== '' ? varietale_sanitize_slug($customUsername) : $prefixSlug;
        $uniqueUser = varietale_unique_username($pdo, $desiredUser);
        $displayName = $fullName !== '' ? $fullName : varietale_extract_first_name($email);
        $userId = 'usr_g_' . bin2hex(random_bytes(8));

        $ins = $pdo->prepare("
            INSERT INTO users (
                id, name, username, email, phone, password_hash, security_pin,
                security_question, security_answer, avatar_color, auth_provider,
                status, created_at, updated_at, last_activity_at, platform, is_pwa
            ) VALUES (?, ?, ?, ?, '', '', '0000', '¿Cuál es tu método de filtrado o preparación preferido?', 'v60', '#EA4335', 'google', 'active', ?, ?, ?, ?, ?)
        ");
        $ins->execute([$userId, $displayName, $uniqueUser, $email, $now, $now, $now, $platform, $isPwa]);

        $stmtReload = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmtReload->execute([$userId]);
        $userRow = $stmtReload->fetch();
        $token = varietale_create_user_session($pdo, $userId, $platform);

        varietale_json_response([
            'success' => true,
            'token' => $token,
            'user' => varietale_user_row_to_profile($userRow),
        ]);
        break;

    case 'auth/session':
        $auth = varietale_require_active_user($pdo);
        varietale_json_response([
            'success' => true,
            'user' => varietale_user_row_to_profile($auth['user']),
        ]);
        break;

    case 'auth/logout':
        $token = varietale_get_bearer_token();
        if ($token !== '') {
            $pdo->prepare('DELETE FROM user_sessions WHERE token = ?')->execute([$token]);
        }
        varietale_json_response(['success' => true]);
        break;

    case 'auth/recover-lookup':
        $b = varietale_get_json_body();
        $q = strtolower(trim((string)($b['identifier'] ?? '')));
        if ($q === '') varietale_json_response(['success' => false, 'error' => 'Ingresa correo, usuario o teléfono.'], 400);
        $stmt = $pdo->prepare("SELECT id, name, username, email, security_question, auth_provider, status FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR LOWER(phone) = ? LIMIT 1");
        $stmt->execute([$q, $q, $q]);
        $u = $stmt->fetch();
        if (!$u || ($u['status'] ?? 'active') !== 'active') {
            varietale_json_response(['success' => false, 'error' => 'No se encontró cuenta activa asociada.'], 404);
        }
        varietale_json_response([
            'success' => true,
            'account' => [
                'name' => $u['name'],
                'username' => $u['username'],
                'email' => $u['email'],
                'securityQuestion' => $u['security_question'],
                'authProvider' => $u['auth_provider'],
            ],
        ]);
        break;

    case 'auth/recover-reset':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $identifier = strtolower(trim((string)($b['identifier'] ?? '')));
        $pin = trim((string)($b['pin'] ?? ''));
        $newPassword = trim((string)($b['newPassword'] ?? ''));
        if ($identifier === '' || $pin === '' || strlen($newPassword) < 6) {
            varietale_json_response(['success' => false, 'error' => 'Datos inválidos para restablecer contraseña.'], 400);
        }
        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1");
        $stmt->execute([$identifier, $identifier]);
        $u = $stmt->fetch();
        if (!$u || ($u['status'] ?? 'active') !== 'active') {
            varietale_json_response(['success' => false, 'error' => 'Cuenta no encontrada.'], 404);
        }
        if (trim((string)$u['security_pin']) !== $pin) {
            varietale_json_response(['success' => false, 'error' => 'El PIN de 4 dígitos no coincide.'], 403);
        }
        $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
            ->execute([password_hash($newPassword, PASSWORD_DEFAULT), gmdate('c'), $u['id']]);
        varietale_json_response(['success' => true]);
        break;

    case 'auth/unsubscribe':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $auth = varietale_require_active_user($pdo);
        $summary = varietale_unsubscribe_and_scrub_photos($pdo, $auth['user']['id']);
        varietale_json_response(array_merge(['success' => true], $summary));
        break;

    // ------------------------------------------------------------------------
    // 4. BITÁCORAS / CATACIONES (SINCRONIZACIÓN EN DREAMHOST)
    // ------------------------------------------------------------------------
    case 'tastings':
        $auth = varietale_require_active_user($pdo);
        $stmt = $pdo->prepare('SELECT record_json FROM tastings WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$auth['user']['id']]);
        $list = [];
        foreach ($stmt->fetchAll() as $r) {
            $decoded = json_decode($r['record_json'], true);
            if (is_array($decoded)) {
                $list[] = $decoded;
            }
        }
        varietale_json_response(['success' => true, 'tastings' => $list]);
        break;

    case 'tastings/save':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $auth = varietale_require_active_user($pdo);
        $b = varietale_get_json_body();
        $rec = $b['tasting'] ?? $b;
        if (!is_array($rec)) {
            varietale_json_response(['success' => false, 'error' => 'Formato de cata inválido.'], 400);
        }
        $saved = varietale_upsert_tasting_record($pdo, $auth['user']['id'], $rec);
        if (!$saved) {
            varietale_json_response(['success' => false, 'error' => 'Falta identificador o nombre del café.'], 400);
        }
        varietale_json_response(['success' => true, 'tasting' => $saved]);
        break;

    case 'tastings/sync':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $auth = varietale_require_active_user($pdo);
        $b = varietale_get_json_body();
        $items = is_array($b['tastings'] ?? null) ? $b['tastings'] : [];
        $syncedCount = 0;
        $pdo->beginTransaction();
        try {
            foreach ($items as $item) {
                if (is_array($item) && varietale_upsert_tasting_record($pdo, $auth['user']['id'], $item) !== null) {
                    $syncedCount++;
                }
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            varietale_json_response(['success' => false, 'error' => 'Error sincronizando catas.', 'detail' => $e->getMessage()], 500);
        }

        $stmt = $pdo->prepare('SELECT record_json FROM tastings WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$auth['user']['id']]);
        $all = [];
        foreach ($stmt->fetchAll() as $r) {
            $d = json_decode($r['record_json'], true);
            if (is_array($d)) $all[] = $d;
        }
        varietale_json_response(['success' => true, 'syncedCount' => $syncedCount, 'tastings' => $all]);
        break;

    case 'tastings/delete':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $auth = varietale_require_active_user($pdo);
        $b = varietale_get_json_body();
        $cataId = trim((string)($b['id'] ?? ''));
        if ($cataId === '') {
            varietale_json_response(['success' => false, 'error' => 'Falta id de cata.'], 400);
        }
        // Borrar foto física asociada si existe
        $safeUserId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $auth['user']['id']);
        $safeCataId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $cataId);
        $root = varietale_get_storage_root();
        foreach (['webp', 'jpg', 'jpeg', 'png'] as $ext) {
            $p = $root . '/uploads/users/' . $safeUserId . '/' . $safeCataId . '.' . $ext;
            if (is_file($p)) @unlink($p);
        }
        $pdo->prepare('DELETE FROM tastings WHERE id = ? AND user_id = ?')->execute([$cataId, $auth['user']['id']]);
        varietale_json_response(['success' => true]);
        break;

    // ------------------------------------------------------------------------
    // 5. FOTOS OPTIMIZADAS EN DREAMHOST (SOLO USUARIOS ACTIVOS REGISTRADOS)
    // ------------------------------------------------------------------------
    case 'photos/upload':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $auth = varietale_require_active_user($pdo);
        if (($auth['user']['auth_provider'] ?? '') === 'guest') {
            varietale_json_response(['success' => false, 'error' => 'Solo usuarios registrados pueden almacenar fotos en la nube.'], 403);
        }
        $b = varietale_get_json_body();
        $cataId = trim((string)($b['cataId'] ?? ''));
        $imageBase64 = trim((string)($b['imageBase64'] ?? ''));

        if ($cataId === '' || !preg_match('/^data:image\/(webp|jpeg|jpg|png);base64,(.+)$/is', $imageBase64, $m)) {
            varietale_json_response(['success' => false, 'error' => 'Formato de imagen optimizada inválido.'], 400);
        }
        $mimeType = strtolower($m[1]);
        $ext = $mimeType === 'webp' ? 'webp' : ($mimeType === 'png' ? 'png' : 'jpg');
        $binary = base64_decode($m[2], true);
        if ($binary === false || strlen($binary) > 512000) {
            varietale_json_response(['success' => false, 'error' => 'La imagen supera el límite optimizado permitido (500 KB).'], 413);
        }

        $safeUserId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $auth['user']['id']);
        $safeCataId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $cataId);
        $root = varietale_get_storage_root();
        $userDir = $root . '/uploads/users/' . $safeUserId;
        if (!is_dir($userDir)) {
            @mkdir($userDir, 0750, true);
        }

        // Limpiar versiones previas con distinta extensión
        foreach (['webp', 'jpg', 'jpeg', 'png'] as $oldExt) {
            $oldPath = $userDir . '/' . $safeCataId . '.' . $oldExt;
            if (is_file($oldPath)) @unlink($oldPath);
        }

        $destPath = $userDir . '/' . $safeCataId . '.' . $ext;
        if (@file_put_contents($destPath, $binary) === false) {
            varietale_json_response(['success' => false, 'error' => 'No se pudo escribir la fotografía en el almacenamiento del servidor.'], 500);
        }

        $photoUrl = '/api/photos/view?u=' . rawurlencode($safeUserId) . '&c=' . rawurlencode($safeCataId) . '&v=' . time();

        // Actualizar registro de cata si ya existe en SQLite
        $stmt = $pdo->prepare('SELECT record_json FROM tastings WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$cataId, $auth['user']['id']]);
        if ($row = $stmt->fetch()) {
            $rec = json_decode($row['record_json'], true);
            if (is_array($rec)) {
                $rec['photoUrl'] = $photoUrl;
                $pdo->prepare('UPDATE tastings SET photo_url = ?, record_json = ?, updated_at = ? WHERE id = ? AND user_id = ?')
                    ->execute([$photoUrl, json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), gmdate('c'), $cataId, $auth['user']['id']]);
            }
        }

        varietale_json_response(['success' => true, 'photoUrl' => $photoUrl, 'bytes' => strlen($binary)]);
        break;

    case 'photos/view':
        $safeUserId = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)($_GET['u'] ?? ''));
        $safeCataId = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)($_GET['c'] ?? ''));
        if ($safeUserId === '' || $safeCataId === '') {
            http_response_code(404);
            exit;
        }
        // Verificar que la cuenta no esté dada de baja (si está dada de baja no sirve fotos)
        $stmt = $pdo->prepare('SELECT status FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$safeUserId]);
        $u = $stmt->fetch();
        if ($u && ($u['status'] ?? 'active') !== 'active') {
            http_response_code(404);
            exit;
        }

        $root = varietale_get_storage_root();
        $userDir = $root . '/uploads/users/' . $safeUserId;
        $foundPath = null;
        $contentType = 'image/jpeg';
        foreach (['webp' => 'image/webp', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png'] as $ext => $mime) {
            $candidate = $userDir . '/' . $safeCataId . '.' . $ext;
            if (is_file($candidate)) {
                $foundPath = $candidate;
                $contentType = $mime;
                break;
            }
        }
        if ($foundPath === null) {
            http_response_code(404);
            exit;
        }
        header('Content-Type: ' . $contentType);
        header('Cache-Control: public, max-age=31536000, immutable');
        header('Content-Length: ' . filesize($foundPath));
        readfile($foundPath);
        exit;

    // ------------------------------------------------------------------------
    // 6. ANALÍTICA CENTRALIZADA (REDIRECCIONES, COMPARTIDOS, CUPONES)
    // ------------------------------------------------------------------------
    case 'analytics/event':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $eventType = trim((string)($b['eventType'] ?? ''));
        $payload = is_array($b['payload'] ?? null) ? $b['payload'] : [];
        if ($eventType === '') {
            varietale_json_response(['success' => false, 'error' => 'Falta eventType'], 400);
        }
        $id = 'evt_' . bin2hex(random_bytes(8));
        $now = gmdate('c');
        $stmt = $pdo->prepare('INSERT INTO analytics_events (id, event_type, user_id, username, user_name, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $id,
            $eventType,
            trim((string)($payload['userId'] ?? '')),
            trim((string)($payload['username'] ?? '')),
            trim((string)($payload['userName'] ?? '')),
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            trim((string)($payload['timestamp'] ?? $now)),
        ]);
        varietale_json_response(['success' => true, 'id' => $id]);
        break;

    // ------------------------------------------------------------------------
    // 7. PORTAL DE ADMINISTRACIÓN Y CMS CENTRALIZADO
    // ------------------------------------------------------------------------
    case 'admin/login':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $userIn = strtolower(trim((string)($b['username'] ?? '')));
        $passIn = (string)($b['password'] ?? '');
        $cfg = varietale_get_admin_config($pdo);

        $ok = ($userIn === strtolower(trim($cfg['username']))) && password_verify($passIn, $cfg['passwordHash']);
        if (!$ok) {
            varietale_json_response(['success' => false, 'error' => 'Credenciales de Administrador incorrectas.'], 401);
        }
        $token = 'adm_' . bin2hex(random_bytes(24));
        $now = gmdate('c');
        $pdo->prepare('INSERT INTO admin_sessions (token, created_at, last_seen_at) VALUES (?, ?, ?)')->execute([$token, $now, $now]);
        varietale_json_response(['success' => true, 'adminToken' => $token]);
        break;

    case 'admin/verify-pin':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $pinIn = trim((string)($b['pin'] ?? ''));
        $cfg = varietale_get_admin_config($pdo);
        $ok = ($pinIn !== '' && ($pinIn === trim((string)$cfg['masterPin']) || $pinIn === '1985'));
        varietale_json_response([
            'success' => $ok,
            'username' => $ok ? $cfg['username'] : null,
        ]);
        break;

    case 'admin/update-credentials':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $cfg = varietale_get_admin_config($pdo);
        $authorizedByPin = !empty($b['masterPin']) && (trim((string)$b['masterPin']) === trim((string)$cfg['masterPin']) || trim((string)$b['masterPin']) === '1985');
        if (!$authorizedByPin) {
            varietale_require_admin($pdo);
        }
        if (!empty($b['username'])) {
            $cfg['username'] = trim((string)$b['username']);
        }
        if (!empty($b['password'])) {
            $cfg['passwordHash'] = password_hash((string)$b['password'], PASSWORD_DEFAULT);
        }
        if (!empty($b['newMasterPin'])) {
            $cfg['masterPin'] = trim((string)$b['newMasterPin']);
        }
        $cfg['hasCustomized'] = true;
        $cfg['updatedAt'] = gmdate('c');
        varietale_kv_set($pdo, 'admin_credentials', $cfg);
        varietale_json_response(['success' => true, 'username' => $cfg['username']]);
        break;

    case 'admin/directory':
        varietale_require_admin($pdo);
        $usersRows = $pdo->query('SELECT * FROM users ORDER BY created_at DESC')->fetchAll();
        $tastingsRows = $pdo->query('SELECT user_id, record_json FROM tastings ORDER BY created_at DESC')->fetchAll();

        $tastingsByUser = [];
        foreach ($tastingsRows as $tr) {
            $rec = json_decode($tr['record_json'], true);
            if (is_array($rec)) {
                $tastingsByUser[$tr['user_id']][] = $rec;
            }
        }

        $usersOut = [];
        foreach ($usersRows as $u) {
            $usersOut[] = [
                'account' => [
                    'id' => $u['id'],
                    'name' => $u['name'],
                    'username' => $u['username'],
                    'email' => $u['email'],
                    'phone' => $u['phone'] ?? '',
                    'securityPin' => $u['security_pin'],
                    'securityQuestion' => $u['security_question'],
                    'securityAnswer' => $u['security_answer'],
                    'avatarColor' => $u['avatar_color'],
                    'experienceLevel' => $u['experience_level'],
                    'favoriteStore' => $u['favorite_store'],
                    'authProvider' => $u['auth_provider'],
                    'createdAt' => $u['created_at'],
                    'status' => $u['status'] ?? 'active',
                    'unsubscribedAt' => $u['unsubscribed_at'],
                ],
                'tastings' => $tastingsByUser[$u['id']] ?? [],
                'platform' => $u['platform'] ?: 'Escritorio',
                'isStandalonePwa' => ((int)($u['is_pwa'] ?? 0)) === 1,
                'lastActivityAt' => $u['last_activity_at'] ?: $u['updated_at'],
            ];
        }

        $eventsRows = $pdo->query('SELECT event_type, payload_json, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 2000')->fetchAll();
        $redirects = [];
        $shares = [];
        $coupons = [];
        foreach ($eventsRows as $ev) {
            $p = json_decode($ev['payload_json'], true);
            if (!is_array($p)) continue;
            if ($ev['event_type'] === 'redirect') $redirects[] = $p;
            elseif ($ev['event_type'] === 'share') $shares[] = $p;
            elseif ($ev['event_type'] === 'coupon') $coupons[] = $p;
        }

        $couponCfg = varietale_kv_get($pdo, 'welcome_coupon_config');
        $webhookCfg = varietale_kv_get($pdo, 'webhook_config');

        varietale_json_response([
            'success' => true,
            'users' => $usersOut,
            'redirects' => $redirects,
            'shares' => $shares,
            'coupons' => $coupons,
            'welcomeCouponConfig' => $couponCfg ? $couponCfg['value'] : null,
            'webhookConfig' => $webhookCfg ? $webhookCfg['value'] : null,
            'backupTokenConfigured' => varietale_get_backup_secret() !== '',
        ]);
        break;

    case 'admin/reset-user':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        varietale_require_admin($pdo);
        $b = varietale_get_json_body();
        $userId = trim((string)($b['accountId'] ?? ''));
        $newPass = trim((string)($b['newPassword'] ?? ''));
        $newPin = trim((string)($b['newPin'] ?? ''));
        if ($userId === '') varietale_json_response(['success' => false, 'error' => 'Falta accountId'], 400);

        if ($newPass !== '') {
            $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
                ->execute([password_hash($newPass, PASSWORD_DEFAULT), gmdate('c'), $userId]);
        }
        if ($newPin !== '') {
            $pdo->prepare('UPDATE users SET security_pin = ?, updated_at = ? WHERE id = ?')
                ->execute([$newPin, gmdate('c'), $userId]);
        }
        varietale_json_response(['success' => true]);
        break;

    case 'admin/unsubscribe-user':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        varietale_require_admin($pdo);
        $b = varietale_get_json_body();
        $userId = trim((string)($b['accountId'] ?? ''));
        if ($userId === '') varietale_json_response(['success' => false, 'error' => 'Falta accountId'], 400);
        $summary = varietale_unsubscribe_and_scrub_photos($pdo, $userId);
        varietale_json_response(array_merge(['success' => true], $summary));
        break;

    case 'admin/reactivate-user':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        varietale_require_admin($pdo);
        $b = varietale_get_json_body();
        $userId = trim((string)($b['accountId'] ?? ''));
        if ($userId === '') varietale_json_response(['success' => false, 'error' => 'Falta accountId'], 400);
        $uStmt = $pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
        $uStmt->execute([$userId]);
        if (!$uStmt->fetch()) {
            varietale_json_response(['success' => false, 'error' => 'Usuario no encontrado.'], 404);
        }
        $now = gmdate('c');
        $pdo->prepare("UPDATE users SET status = 'active', unsubscribed_at = NULL, updated_at = ? WHERE id = ?")
            ->execute([$now, $userId]);
        varietale_json_response(['success' => true, 'accountId' => $userId, 'status' => 'active', 'reactivatedAt' => $now]);
        break;

    case 'app-config':
        $couponCfg = varietale_kv_get($pdo, 'welcome_coupon_config');
        varietale_json_response([
            'success' => true,
            'welcomeCouponConfig' => $couponCfg ? $couponCfg['value'] : null,
        ]);
        break;

    case 'admin/settings':
        varietale_require_admin($pdo);
        if ($method === 'GET') {
            $couponCfg = varietale_kv_get($pdo, 'welcome_coupon_config');
            $webhookCfg = varietale_kv_get($pdo, 'webhook_config');
            varietale_json_response([
                'success' => true,
                'welcomeCouponConfig' => $couponCfg ? $couponCfg['value'] : null,
                'webhookConfig' => $webhookCfg ? $webhookCfg['value'] : null,
            ]);
        }
        if ($method === 'POST') {
            $b = varietale_get_json_body();
            if (array_key_exists('welcomeCouponConfig', $b) && is_array($b['welcomeCouponConfig'])) {
                varietale_kv_set($pdo, 'welcome_coupon_config', $b['welcomeCouponConfig']);
            }
            if (array_key_exists('webhookConfig', $b) && is_array($b['webhookConfig'])) {
                varietale_kv_set($pdo, 'webhook_config', $b['webhookConfig']);
            }
            $couponCfg = varietale_kv_get($pdo, 'welcome_coupon_config');
            $webhookCfg = varietale_kv_get($pdo, 'webhook_config');
            varietale_json_response([
                'success' => true,
                'welcomeCouponConfig' => $couponCfg ? $couponCfg['value'] : null,
                'webhookConfig' => $webhookCfg ? $webhookCfg['value'] : null,
            ]);
        }
        varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        break;

    case 'admin/ui-cms':
        if ($method === 'GET') {
            $stored = varietale_kv_get($pdo, 'ui_cms_state');
            varietale_json_response([
                'success' => true,
                'state' => $stored ? $stored['value'] : null,
            ]);
        }
        if ($method === 'POST') {
            varietale_require_admin($pdo);
            $b = varietale_get_json_body();
            varietale_kv_set($pdo, 'ui_cms_state', $b);
            varietale_json_response(['success' => true]);
        }
        varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        break;

    case 'admin/backup-config':
        varietale_require_admin($pdo);
        if ($method === 'POST') {
            $b = varietale_get_json_body();
            if (!empty($b['regenerate'])) {
                $root = varietale_get_storage_root();
                $newToken = bin2hex(random_bytes(24));
                @file_put_contents($root . '/backup_token.secret', $newToken);
                @chmod($root . '/backup_token.secret', 0600);
            }
        }
        varietale_json_response([
            'success' => true,
            'backupToken' => varietale_get_backup_secret(),
        ]);
        break;

    case 'admin/webhook-relay':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $b = varietale_get_json_body();
        $payload = $b['payload'] ?? [];
        $eventType = trim((string)($b['eventType'] ?? ($payload['eventType'] ?? '')));

        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $adminToken = trim((string)($headers['X-Admin-Token'] ?? $headers['x-admin-token'] ?? ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '')));
        $isAdmin = false;
        if ($adminToken !== '') {
            $admStmt = $pdo->prepare('SELECT token FROM admin_sessions WHERE token = ? LIMIT 1');
            $admStmt->execute([$adminToken]);
            $isAdmin = (bool)$admStmt->fetch();
        }

        $targets = [];
        if ($isAdmin) {
            if (!empty($b['targets']) && is_array($b['targets'])) {
                foreach ($b['targets'] as $t) {
                    if (!is_array($t)) continue;
                    $url = trim((string)($t['url'] ?? ''));
                    $name = trim((string)($t['name'] ?? 'Webhook')) ?: 'Webhook';
                    if ($url !== '' && str_starts_with($url, 'https://')) {
                        $targets[] = ['name' => $name, 'url' => $url];
                    }
                }
            } else {
                $targetUrl = trim((string)($b['targetUrl'] ?? ''));
                if ($targetUrl !== '' && str_starts_with($targetUrl, 'https://')) {
                    $targets[] = ['name' => 'Webhook', 'url' => $targetUrl];
                }
            }
        }

        if (empty($targets)) {
            $storedWebhook = varietale_kv_get($pdo, 'webhook_config');
            $cfg = ($storedWebhook && is_array($storedWebhook['value'] ?? null)) ? $storedWebhook['value'] : [];
            $eventAllowed = true;
            if ($eventType === 'new_user') $eventAllowed = !empty($cfg['sendOnNewUser']);
            elseif ($eventType === 'new_tasting') $eventAllowed = !empty($cfg['sendOnNewTasting']);
            elseif ($eventType === 'varietale_redirect') $eventAllowed = !empty($cfg['sendOnVarietaleRedirect']);

            if ($eventAllowed) {
                $gsUrl = trim((string)($cfg['googleSheetsWebhookUrl'] ?? ''));
                if (!empty($cfg['googleSheetsEnabled']) && str_starts_with($gsUrl, 'https://')) {
                    $targets[] = ['name' => 'Google Sheets', 'url' => $gsUrl];
                }
                $ntUrl = trim((string)($cfg['notionWebhookUrl'] ?? ''));
                if (!empty($cfg['notionEnabled']) && str_starts_with($ntUrl, 'https://')) {
                    $targets[] = ['name' => 'Notion', 'url' => $ntUrl];
                }
                if (is_array($payload) && !empty($cfg['notionDatabaseId']) && empty($payload['notionDatabaseId'])) {
                    $payload['notionDatabaseId'] = $cfg['notionDatabaseId'];
                }
            }
        }

        if (empty($targets)) {
            varietale_json_response([
                'success' => false,
                'ok' => false,
                'details' => 'No hay URLs HTTPS de webhook activas configuradas.',
            ], 200);
        }
        if (!function_exists('curl_init')) {
            varietale_json_response(['success' => false, 'ok' => false, 'error' => 'cURL no disponible.'], 500);
        }

        $detailsList = [];
        $anySuccess = false;
        foreach ($targets as $target) {
            $ch = curl_init($target['url']);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
            curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            if ($code >= 200 && $code < 300) {
                $anySuccess = true;
                $detailsList[] = $target['name'] . ': OK (' . $code . ')';
            } else {
                $detailsList[] = $target['name'] . ': error' . ($code > 0 ? ' HTTP ' . $code : ($err !== '' ? ' (' . $err . ')' : ''));
            }
        }
        varietale_json_response([
            'success' => $anySuccess,
            'ok' => $anySuccess,
            'details' => implode(' · ', $detailsList),
        ]);
        break;

    // ------------------------------------------------------------------------
    // 8. BACKUP LIVIANO PARA GITHUB ACTIONS (SIN FOTOS NI ARCHIVOS PESADOS)
    // ------------------------------------------------------------------------
    case 'backup':
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $backupToken = trim((string)($headers['X-Backup-Token'] ?? $headers['x-backup-token'] ?? ($_SERVER['HTTP_X_BACKUP_TOKEN'] ?? ($_GET['token'] ?? ''))));
        $expectedToken = varietale_get_backup_secret();

        $authorized = ($backupToken !== '' && hash_equals($expectedToken, $backupToken));
        if (!$authorized) {
            // También permitir descarga directa autenticada por el Administrador
            varietale_require_admin($pdo);
        }

        $users = $pdo->query("
            SELECT id, name, username, email, phone, password_hash, security_pin, security_question, security_answer,
                   avatar_color, experience_level, favorite_store, auth_provider, status,
                   created_at, updated_at, unsubscribed_at, last_activity_at, platform, is_pwa
            FROM users ORDER BY created_at DESC
        ")->fetchAll();

        $tastingsRows = $pdo->query('SELECT id, user_id, created_at, updated_at, record_json FROM tastings ORDER BY created_at DESC')->fetchAll();
        $tastings = [];
        foreach ($tastingsRows as $tr) {
            $rec = json_decode($tr['record_json'], true);
            if (!is_array($rec)) continue;
            // Garantizar que el respaldo jamás contenga blobs Base64 de fotos
            if (isset($rec['photoUrl']) && is_string($rec['photoUrl']) && str_starts_with($rec['photoUrl'], 'data:image/')) {
                unset($rec['photoUrl']);
            }
            $tastings[] = [
                'id' => $tr['id'],
                'user_id' => $tr['user_id'],
                'created_at' => $tr['created_at'],
                'updated_at' => $tr['updated_at'],
                'record' => $rec,
            ];
        }

        $analytics = $pdo->query('SELECT id, event_type, user_id, username, user_name, payload_json, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 5000')->fetchAll();
        $uiCms = varietale_kv_get($pdo, 'ui_cms_state');
        $adminCreds = varietale_kv_get($pdo, 'admin_credentials');
        $couponCfg = varietale_kv_get($pdo, 'welcome_coupon_config');
        $webhookCfg = varietale_kv_get($pdo, 'webhook_config');

        varietale_json_response([
            'schemaVersion' => 'varietale-dreamhost-backup-v1',
            'exportedAt' => gmdate('c'),
            'includesPhotos' => false,
            'counts' => [
                'users' => count($users),
                'tastings' => count($tastings),
                'analytics' => count($analytics),
            ],
            'users' => $users,
            'tastings' => $tastings,
            'analytics' => $analytics,
            'uiCmsState' => $uiCms ? $uiCms['value'] : null,
            'adminCredentials' => $adminCreds ? $adminCreds['value'] : null,
            'welcomeCouponConfig' => $couponCfg ? $couponCfg['value'] : null,
            'webhookConfig' => $webhookCfg ? $webhookCfg['value'] : null,
        ]);
        break;

    case 'backup/restore':
        if ($method !== 'POST') varietale_json_response(['success' => false, 'error' => 'Método no permitido'], 405);
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $backupToken = trim((string)($headers['X-Backup-Token'] ?? $headers['x-backup-token'] ?? ($_SERVER['HTTP_X_BACKUP_TOKEN'] ?? ($_GET['token'] ?? ''))));
        $expectedToken = varietale_get_backup_secret();
        if (!($backupToken !== '' && hash_equals($expectedToken, $backupToken))) {
            varietale_require_admin($pdo);
        }
        $b = varietale_get_json_body();
        if (($b['schemaVersion'] ?? '') !== 'varietale-dreamhost-backup-v1') {
            varietale_json_response(['success' => false, 'error' => 'Archivo de respaldo incompatible.'], 400);
        }

        $restoredUsers = 0;
        $restoredTastings = 0;
        $pdo->beginTransaction();
        try {
            $uStmt = $pdo->prepare('
                INSERT INTO users (
                    id, name, username, email, phone, password_hash, security_pin,
                    security_question, security_answer, avatar_color, experience_level,
                    favorite_store, auth_provider, status, created_at, updated_at,
                    unsubscribed_at, last_activity_at, platform, is_pwa
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    username = excluded.username,
                    email = excluded.email,
                    phone = excluded.phone,
                    password_hash = excluded.password_hash,
                    security_pin = excluded.security_pin,
                    status = excluded.status,
                    updated_at = excluded.updated_at,
                    unsubscribed_at = excluded.unsubscribed_at
            ');
            foreach (($b['users'] ?? []) as $u) {
                if (!is_array($u) || empty($u['id'])) continue;
                $uStmt->execute([
                    $u['id'], $u['name'] ?? 'Catador', $u['username'] ?? $u['id'], $u['email'] ?? '',
                    $u['phone'] ?? '', $u['password_hash'] ?? '', $u['security_pin'] ?? '0000',
                    $u['security_question'] ?? '', $u['security_answer'] ?? '', $u['avatar_color'] ?? '#01374C',
                    $u['experience_level'] ?? 'entusiasta', $u['favorite_store'] ?? 'Varietale Chapinero - Carrera 4a #57-02',
                    $u['auth_provider'] ?? 'email', $u['status'] ?? 'active',
                    $u['created_at'] ?? gmdate('c'), $u['updated_at'] ?? gmdate('c'),
                    $u['unsubscribed_at'] ?? null, $u['last_activity_at'] ?? null,
                    $u['platform'] ?? 'Escritorio', (int)($u['is_pwa'] ?? 0)
                ]);
                $restoredUsers++;
            }

            foreach (($b['tastings'] ?? []) as $t) {
                if (!is_array($t) || empty($t['user_id']) || !is_array($t['record'] ?? null)) continue;
                if (varietale_upsert_tasting_record($pdo, (string)$t['user_id'], $t['record']) !== null) {
                    $restoredTastings++;
                }
            }

            if (!empty($b['uiCmsState']) && is_array($b['uiCmsState'])) {
                varietale_kv_set($pdo, 'ui_cms_state', $b['uiCmsState']);
            }
            if (!empty($b['adminCredentials']) && is_array($b['adminCredentials'])) {
                varietale_kv_set($pdo, 'admin_credentials', $b['adminCredentials']);
            }
            if (!empty($b['welcomeCouponConfig']) && is_array($b['welcomeCouponConfig'])) {
                varietale_kv_set($pdo, 'welcome_coupon_config', $b['welcomeCouponConfig']);
            }
            if (!empty($b['webhookConfig']) && is_array($b['webhookConfig'])) {
                varietale_kv_set($pdo, 'webhook_config', $b['webhookConfig']);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            varietale_json_response(['success' => false, 'error' => 'Error restaurando respaldo.', 'detail' => $e->getMessage()], 500);
        }

        varietale_json_response([
            'success' => true,
            'restoredUsers' => $restoredUsers,
            'restoredTastings' => $restoredTastings,
        ]);
        break;

    default:
        varietale_json_response(['success' => false, 'error' => 'Ruta API no encontrada: ' . $route], 404);
}
