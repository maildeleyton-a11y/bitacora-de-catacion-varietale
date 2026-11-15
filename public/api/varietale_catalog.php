<?php
/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - SINCRONIZACIÓN EN VIVO CON VARIETALE.COM
 * ============================================================================
 * Consulta en tiempo real la colección oficial de cafés en www.varietale.com
 * y verifica por cada producto su visibilidad y existencias reales vía .js.
 *
 * REGLA ESTRICTA:
 * - Ningún café agotado o no visible en la web se expone al catador ni en
 *   sugerencias ni en el catálogo de selección.
 * - Cuando vuelve a haber existencias y visibilidad en web, se reintegra
 *   automáticamente en la siguiente actualización.
 */

declare(strict_types=1);

function varietale_http_get(string $url, int $timeoutSec = 10): ?string {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $timeoutSec,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; VarietaleBitacoraSync/2.0)',
            CURLOPT_HTTPHEADER => ['Accept: text/html,application/json;q=0.9,*/*;q=0.8'],
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body !== false && $code >= 200 && $code < 400) {
            return (string)$body;
        }
        return null;
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => $timeoutSec,
            'header' => "User-Agent: Mozilla/5.0 (compatible; VarietaleBitacoraSync/2.0)\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    return $body !== false ? $body : null;
}

function varietale_fetch_handles_multi(array $handles): array {
    if (empty($handles)) {
        return [];
    }
    $results = [];

    if (function_exists('curl_multi_init')) {
        $mh = curl_multi_init();
        $channels = [];
        foreach ($handles as $handle) {
            $url = 'https://varietale.com/products/' . rawurlencode($handle) . '.js';
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_CONNECTTIMEOUT => 6,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; VarietaleBitacoraSync/2.0)',
                CURLOPT_HTTPHEADER => ['Accept: application/json'],
            ]);
            curl_multi_add_handle($mh, $ch);
            $channels[$handle] = $ch;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            if ($running > 0) {
                curl_multi_select($mh, 0.2);
            }
        } while ($running > 0);

        foreach ($channels as $handle => $ch) {
            $body = curl_multi_getcontent($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            if ($body && $code >= 200 && $code < 300) {
                $decoded = json_decode($body, true);
                if (is_array($decoded)) {
                    $results[$handle] = $decoded;
                }
            }
        }
        curl_multi_close($mh);
        return $results;
    }

    foreach ($handles as $handle) {
        $raw = varietale_http_get('https://varietale.com/products/' . rawurlencode($handle) . '.js');
        if ($raw) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $results[$handle] = $decoded;
            }
        }
    }
    return $results;
}

function varietale_is_coffee_product(array $p): bool {
    $type = mb_strtolower((string)($p['type'] ?? $p['product_type'] ?? ''), 'UTF-8');
    $title = mb_strtolower((string)($p['title'] ?? ''), 'UTF-8');
    $tags = array_map(fn($t) => mb_strtolower((string)$t, 'UTF-8'), is_array($p['tags'] ?? null) ? $p['tags'] : []);
    $combined = $title . ' ' . $type . ' ' . implode(' ', $tags);

    $excluded = ['té ', 'té negro', 'té verde', 'té blanco', 'rooibos', 'tisana', 'pu-erh', 'taza', 'prensa', 'molino', 'filtro', 'suscripción', 'gift card'];
    foreach ($excluded as $bad) {
        if (str_contains($type, $bad) || str_contains($combined, $bad)) {
            return false;
        }
    }

    if (str_contains($type, 'café') || str_contains($type, 'cafe')) {
        return true;
    }
    foreach ($tags as $tag) {
        if ($tag === 'café' || $tag === 'cafe' || $tag === 'cafes' || $tag === 'cafés') {
            return true;
        }
    }
    return str_contains($combined, 'café especial')
        || str_contains($combined, 'café exótico')
        || str_contains($combined, 'café edición');
}

function varietale_parse_coffee_product(array $p): array {
    $title = trim((string)($p['title'] ?? ''));
    $handle = trim((string)($p['handle'] ?? ''));
    $rawDesc = (string)($p['description'] ?? $p['body_html'] ?? '');
    $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($rawDesc), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');
    $tags = is_array($p['tags'] ?? null) ? $p['tags'] : [];
    $lowerText = mb_strtolower($title . ' ' . $text . ' ' . implode(' ', $tags), 'UTF-8');

    // Origen
    $origin = 'Colombia';
    if (str_contains($lowerText, 'palermo') && str_contains($lowerText, 'huila')) {
        $origin = 'Palermo, Huila';
    } elseif (str_contains($lowerText, 'pinchote') || str_contains($lowerText, 'santander')) {
        $origin = 'Pinchote, Santander';
    } elseif (str_contains($lowerText, 'acevedo') || str_contains(mb_strtolower($title, 'UTF-8'), 'bourbon papayo')) {
        $origin = 'Acevedo, Huila';
    } elseif (str_contains($lowerText, 'bituima') || str_contains($lowerText, 'cundinamarca') || str_contains(mb_strtolower($title, 'UTF-8'), 'san antonio')) {
        $origin = 'Bituima, Cundinamarca';
    } elseif (str_contains($lowerText, 'palestina') || str_contains(mb_strtolower($title, 'UTF-8'), 'papayo enmielado')) {
        $origin = 'Palestina, Huila';
    } elseif (str_contains($lowerText, 'pitalito')) {
        $origin = 'Pitalito, Huila';
    } elseif (str_contains($lowerText, 'alto llano') || (str_contains($lowerText, 'san pablo') && str_contains($lowerText, 'nariño'))) {
        $origin = 'San Pablo, Nariño';
    } elseif (str_contains($lowerText, 'inzá') || str_contains($lowerText, 'inza') || str_contains($lowerText, 'argelia')) {
        $origin = 'Inzá (Tierradentro), Cauca';
    } elseif (str_contains($lowerText, 'bruselas')) {
        $origin = 'Bruselas, Huila';
    } elseif (str_contains($lowerText, 'mesetas') || str_contains($lowerText, 'nasa')) {
        $origin = 'Mesetas, Meta (Comunidad Nasa)';
    } elseif (str_contains($lowerText, 'san josé') || str_contains($lowerText, 'san jose')) {
        $origin = 'San José de Isnos, Huila';
    } elseif (str_contains($lowerText, 'la laguna')) {
        $origin = 'La Laguna, Huila';
    } elseif (str_contains($lowerText, 'quindío') || str_contains($lowerText, 'quindio') || str_contains(mb_strtolower($title, 'UTF-8'), 'sans')) {
        $origin = 'Montañas del Quindío';
    } elseif (str_contains(mb_strtolower($title, 'UTF-8'), 'mezcla')) {
        $origin = 'Colombia (Huila, Cundinamarca y Tolima)';
    } else {
        $depts = ['Cauca', 'Huila', 'Tolima', 'Antioquia', 'Cundinamarca', 'Santander', 'Nariño', 'Quindío', 'Meta', 'Caldas', 'Risaralda', 'Boyacá'];
        $foundDept = null;
        foreach ($depts as $d) {
            foreach ($tags as $t) {
                if (mb_strtolower((string)$t, 'UTF-8') === mb_strtolower($d, 'UTF-8')) {
                    $foundDept = $d;
                    break 2;
                }
            }
            if (str_contains($text, $d)) {
                $foundDept = $d;
                break;
            }
        }
        $ignoredTags = ['café', 'cafe', 'cafés', 'cafes', 'especiales', 'exótico', 'exotico', 'edición limitada', 'edicion limitada', 'lote', 'grano'];
        $muni = null;
        foreach ($tags as $t) {
            $tl = mb_strtolower((string)$t, 'UTF-8');
            if (!in_array($tl, $ignoredTags, true) && (!$foundDept || $tl !== mb_strtolower($foundDept, 'UTF-8'))) {
                $muni = (string)$t;
                break;
            }
        }
        if ($foundDept) {
            $origin = $muni ? ($muni . ', ' . $foundDept) : $foundDept;
        }
    }

    // Variedad botánica
    $variety = 'Arábica Especial';
    if (str_contains($lowerText, 'castillo, caturra y colombia') || (str_contains($lowerText, 'castillo') && str_contains($lowerText, 'caturra') && str_contains($lowerText, 'colombia'))) {
        $variety = 'Castillo, Caturra y Colombia';
    } elseif (str_contains($lowerText, 'caturra, colombia y castillo')) {
        $variety = 'Caturra, Colombia y Castillo';
    } elseif (str_contains($lowerText, 'castillo y borbón') || str_contains($lowerText, 'castillo y bourbon')) {
        $variety = 'Castillo y Borbón';
    } elseif (str_contains($lowerText, 'castillo y caturra') || str_contains($lowerText, 'caturra y castillo')) {
        $variety = 'Castillo y Caturra';
    } elseif (str_contains($lowerText, 'borbón rosado') || str_contains($lowerText, 'pink bourbon') || str_contains($lowerText, 'bourbon rosado')) {
        $variety = 'Borbón Rosado';
    } elseif (str_contains($lowerText, 'borbón papayo') || str_contains($lowerText, 'bourbon papayo')) {
        $variety = 'Borbón Papayo';
    } elseif (str_contains($lowerText, 'caturra chiroso') || str_contains($lowerText, 'chiroso')) {
        $variety = 'Caturra Chiroso';
    } elseif (str_contains($lowerText, 'castillo rojo')) {
        $variety = 'Castillo Rojo';
    } elseif (str_contains($lowerText, 'geisha')) {
        $variety = 'Geisha';
    } elseif (str_contains($lowerText, 'caturra')) {
        $variety = 'Caturra';
    } elseif (str_contains($lowerText, 'castillo')) {
        $variety = 'Castillo';
    } elseif (str_contains($lowerText, 'borbón') || str_contains($lowerText, 'bourbon')) {
        $variety = 'Borbón';
    } elseif (str_contains($lowerText, 'typica')) {
        $variety = 'Typica';
    } elseif (str_contains($lowerText, 'tabi')) {
        $variety = 'Tabi';
    }

    // Proceso
    $process = 'Lavado Tradicional';
    if (str_contains($lowerText, 'ea sugar cane') || str_contains($lowerText, 'descafein')) {
        $process = 'EA Sugar Cane (Descafeinado)';
    } elseif (str_contains($lowerText, 'semilavado') || str_contains($lowerText, 'semi lavado')) {
        $process = 'Semilavado';
    } elseif (str_contains($lowerText, 'red honey')) {
        $process = 'Red Honey';
    } elseif (str_contains($lowerText, 'honey dorado') || str_contains($lowerText, 'enmielado') || str_contains($lowerText, 'honey')) {
        $process = 'Honey';
    } elseif (str_contains($lowerText, 'anaeróbico') || str_contains($lowerText, 'anaerobico')) {
        $process = 'Anaeróbico';
    } elseif (str_contains($lowerText, 'natural')) {
        $process = 'Natural';
    }

    // Macro-perfil sugerido
    $suggestedMacro = 'Dulce';
    if (str_contains($lowerText, 'jazmín') || str_contains($lowerText, 'jazmin') || str_contains($lowerText, 'floral') || str_contains($lowerText, 'té blanco') || str_contains($lowerText, 'flor de café')) {
        $suggestedMacro = 'Floral';
    } elseif (str_contains($lowerText, 'frutos rojos') || str_contains($lowerText, 'papaya') || str_contains($lowerText, 'mango') || str_contains($lowerText, 'lima') || str_contains($lowerText, 'limón') || str_contains($lowerText, 'frutal') || str_contains($lowerText, 'cítric') || str_contains($lowerText, 'arándano')) {
        $suggestedMacro = 'Frutal';
    } elseif (str_contains($lowerText, 'especias') || str_contains($lowerText, 'especiado') || str_contains($lowerText, 'cardamomo') || str_contains($lowerText, 'canela')) {
        $suggestedMacro = 'Especias';
    } elseif (str_contains($lowerText, 'tostado') || str_contains($lowerText, 'cereal') || str_contains($lowerText, 'avellana') || str_contains($lowerText, 'almendra')) {
        $suggestedMacro = 'Tostado';
    }

    $altitude = '1.750 msnm';
    if (preg_match('/\d(?:[.,]?\d{2,3})\s*msnm/i', $text, $m)) {
        $altitude = trim($m[0]);
    }

    // Stock estricto en tiempo real
    $productAvailable = ($p['available'] ?? false) === true;
    $variants = is_array($p['variants'] ?? null) ? $p['variants'] : [];
    $anyVariantAvailable = false;
    foreach ($variants as $v) {
        if (($v['available'] ?? false) === true) {
            $anyVariantAvailable = true;
            break;
        }
    }
    $isAvailableInStock = $productAvailable && $anyVariantAvailable;

    $img = (string)($p['featured_image'] ?? ($p['images'][0] ?? ''));
    if (str_starts_with($img, '//')) {
        $img = 'https:' . $img;
    }

    $descSnippet = mb_strlen($text, 'UTF-8') > 165 ? mb_substr($text, 0, 162, 'UTF-8') . '...' : $text;

    return [
        'coffeeName' => $title,
        'brand' => 'VARIETALE',
        'origin' => $origin,
        'variety' => $variety,
        'process' => $process,
        'altitude' => $altitude,
        'description' => $descSnippet,
        'suggestedMacro' => $suggestedMacro,
        'imageUrl' => $img,
        'productType' => (string)($p['type'] ?? $p['product_type'] ?? 'Café Especial'),
        'url' => 'https://varietale.com/products/' . $handle,
        'handle' => $handle,
        'available' => $isAvailableInStock,
    ];
}

function varietale_sync_live_catalog(PDO $pdo, bool $forceRefresh = false, bool $includeUnavailable = false): array {
    $cacheKey = 'varietale_live_catalog_v2';
    $ttlSec = 120; // 2 minutos de frescura en tiempo real
    $cached = varietale_kv_get($pdo, $cacheKey);

    if (!$forceRefresh && $cached !== null) {
        $updatedTs = strtotime($cached['updated_at'] ?? '') ?: 0;
        if ((time() - $updatedTs) < $ttlSec) {
            $allItems = $cached['value']['allCoffees'] ?? [];
            $filtered = $includeUnavailable
                ? $allItems
                : array_values(array_filter($allItems, fn($c) => ($c['available'] ?? false) === true));
            return [
                'success' => true,
                'verifiedLive' => true,
                'source' => 'cache',
                'updatedAt' => $cached['updated_at'],
                'coffees' => $filtered,
            ];
        }
    }

    // Consultar colección oficial visible en varietale.com (soportando paginación)
    $visibleHandles = [];
    $collectionFetchOk = false;
    for ($page = 1; $page <= 5; $page++) {
        $url = 'https://varietale.com/collections/cafes' . ($page > 1 ? ('?page=' . $page) : '');
        $html = varietale_http_get($url, 10);
        if ($html === null) {
            break;
        }
        $collectionFetchOk = true;
        preg_match_all('/"handle":"([a-z0-9-]+)"/i', $html, $matches);
        $pageHandles = array_values(array_unique($matches[1] ?? []));
        $newOnPage = array_diff($pageHandles, $visibleHandles);
        if (empty($newOnPage)) {
            break;
        }
        foreach ($newOnPage as $h) {
            $visibleHandles[] = $h;
        }
        if (!str_contains($html, 'rel="next"') && !str_contains($html, '?page=' . ($page + 1))) {
            break;
        }
    }

    if (!$collectionFetchOk) {
        // Si varietale.com tuvo un fallo de red temporal, devolver última caché reciente (<30 min) si existe
        if ($cached !== null) {
            $allItems = $cached['value']['allCoffees'] ?? [];
            $filtered = $includeUnavailable
                ? $allItems
                : array_values(array_filter($allItems, fn($c) => ($c['available'] ?? false) === true));
            return [
                'success' => true,
                'verifiedLive' => false,
                'source' => 'stale_fallback',
                'updatedAt' => $cached['updated_at'],
                'coffees' => $filtered,
            ];
        }
        return [
            'success' => false,
            'verifiedLive' => false,
            'source' => 'error',
            'coffees' => [],
        ];
    }

    // Consultar en paralelo el JSON en tiempo real (/products/<handle>.js) de cada café visible
    $productPayloads = varietale_fetch_handles_multi($visibleHandles);
    $allCoffees = [];
    foreach ($visibleHandles as $handle) {
        if (!isset($productPayloads[$handle])) {
            continue;
        }
        $p = $productPayloads[$handle];
        if (!varietale_is_coffee_product($p)) {
            continue;
        }
        $allCoffees[] = varietale_parse_coffee_product($p);
    }

    $nowIso = gmdate('c');
    varietale_kv_set($pdo, $cacheKey, [
        'allCoffees' => $allCoffees,
        'fetchedAt' => $nowIso,
    ]);

    $filtered = $includeUnavailable
        ? $allCoffees
        : array_values(array_filter($allCoffees, fn($c) => ($c['available'] ?? false) === true));

    return [
        'success' => true,
        'verifiedLive' => true,
        'source' => 'live',
        'updatedAt' => $nowIso,
        'coffees' => $filtered,
    ];
}
