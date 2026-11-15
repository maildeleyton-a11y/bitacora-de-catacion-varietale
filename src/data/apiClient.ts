/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - CLIENTE API CENTRALIZADO Y SINCRONIZACIÓN
 * ============================================================================
 * Conecta el cliente React con el backend central en DreamHost (PHP 8.3 + SQLite)
 * y gestiona:
 * - Sesiones persistentes entre recargas y múltiples dispositivos.
 * - Compresión optimizada de fotos (~40-75 KB WebP/JPEG) antes de subir a DreamHost.
 * - Almacenamiento caché en IndexedDB (libre de límites de 5 MB de localStorage).
 * - Cola offline resiliente por si DreamHost o internet fallan temporalmente.
 * - Migración retroactiva de catas previas atrapadas en localStorage (caso Cristian).
 */

import { TastingRecord, UserProfile } from "../types";

const SESSION_TOKEN_KEY = "varietale_cloud_session_token_v1";
const SESSION_PROFILE_KEY = "varietale_cloud_session_profile_v1";
const ADMIN_TOKEN_KEY = "varietale_admin_cloud_token_v1";
const PENDING_QUEUE_KEY = "varietale_pending_cloud_queue_v1";

export interface PendingSyncItem {
  userId: string;
  action: "upsert" | "delete";
  tasting?: TastingRecord;
  tastingId?: string;
  pendingPhotoBase64?: string;
  queuedAt: string;
}

// ============================================================================
// 1. GESTIÓN DE TOKENS DE SESIÓN PERSISTENTES
// ============================================================================

export const getStoredSessionToken = (): string | null => {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredSessionProfile = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
};

export const setStoredSession = (token: string | null, user: UserProfile | null): void => {
  try {
    if (token && user) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_PROFILE_KEY);
    }
  } catch {}
};

export const getStoredAdminToken = (): string | null => {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredAdminToken = (token: string | null): void => {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {}
};

// ============================================================================
// 2. INDEXEDDB PARA CACHÉ SIN LÍMITE DE 5MB
// ============================================================================

const IDB_NAME = "varietale_cloud_cache_db";
const IDB_VERSION = 1;
const STORE_TASTINGS = "tastings_by_user";

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TASTINGS)) {
        db.createObjectStore(STORE_TASTINGS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSaveUserTastings(userId: string, tastings: TastingRecord[]): Promise<void> {
  try {
    const db = await openCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TASTINGS, "readwrite");
      tx.objectStore(STORE_TASTINGS).put(tastings, userId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

export async function idbLoadUserTastings(userId: string): Promise<TastingRecord[]> {
  try {
    const db = await openCacheDb();
    const res = await new Promise<TastingRecord[]>((resolve) => {
      const tx = db.transaction(STORE_TASTINGS, "readonly");
      const req = tx.objectStore(STORE_TASTINGS).get(userId);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
    db.close();
    return res;
  } catch {
    return [];
  }
}

// ============================================================================
// 3. COMPRESIÓN OPTIMIZADA DE FOTOS PARA DREAMHOST (~40-75 KB)
// ============================================================================

export function optimizeImageDataUrlForCloud(dataUrl: string, maxDim = 720, quality = 0.74): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const webp = canvas.toDataURL("image/webp", quality);
        if (webp.startsWith("data:image/webp") && webp.length < dataUrl.length) {
          resolve(webp);
          return;
        }
        const jpeg = canvas.toDataURL("image/jpeg", quality);
        resolve(jpeg.length < dataUrl.length ? jpeg : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

// ============================================================================
// 4. PETICIONES HTTP SEGURAS AL BACKEND DE DREAMHOST
// ============================================================================

async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {},
  authMode: "user" | "admin" | "none" = "user"
): Promise<{ ok: boolean; status: number; data: T | null; networkError?: boolean }> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (authMode === "user") {
      const tok = getStoredSessionToken();
      if (tok) headers["X-Session-Token"] = tok;
    } else if (authMode === "admin") {
      const admTok = getStoredAdminToken();
      if (admTok) headers["X-Admin-Token"] = admTok;
    }

    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Si el servidor devolvió HTML (ej. GitHub Pages fallback sin PHP), marcar como backend no disponible
      return { ok: false, status: res.status, data: null, networkError: true };
    }
    return { ok: res.ok && parsed?.success !== false, status: res.status, data: parsed };
  } catch {
    return { ok: false, status: 0, data: null, networkError: true };
  }
}

export const detectDeviceMeta = () => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let platform: "iOS" | "Android" | "Escritorio" = "Escritorio";
  if (/iPhone|iPad|iPod/i.test(ua)) platform = "iOS";
  else if (/Android/i.test(ua)) platform = "Android";
  const isPwa =
    typeof window !== "undefined" &&
    ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as any).standalone === true);
  return { platform, isPwa };
};

// ============================================================================
// 5. AUTH & CUENTAS EN DREAMHOST
// ============================================================================

export const apiRegister = async (payload: {
  name: string;
  username: string;
  email: string;
  password: string;
  securityPin: string;
  phone?: string;
}) => {
  const meta = detectDeviceMeta();
  const res = await apiFetch<{ success: boolean; token?: string; user?: UserProfile; error?: string; reactivated?: boolean }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ ...payload, ...meta }),
    },
    "none"
  );
  if (res.ok && res.data?.token && res.data?.user) {
    setStoredSession(res.data.token, res.data.user);
  }
  return res;
};

export const apiLogin = async (identifier: string, password: string, reactivate = false) => {
  const meta = detectDeviceMeta();
  const res = await apiFetch<{
    success: boolean;
    token?: string;
    user?: UserProfile;
    error?: string;
    canReactivate?: boolean;
    reactivated?: boolean;
  }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ identifier, password, reactivate, ...meta }),
    },
    "none"
  );
  if (res.ok && res.data?.token && res.data?.user) {
    setStoredSession(res.data.token, res.data.user);
  }
  return res;
};

export const apiGoogleAuth = async (email: string, username?: string, name?: string) => {
  const meta = detectDeviceMeta();
  const res = await apiFetch<{ success: boolean; token?: string; user?: UserProfile; error?: string }>(
    "/api/auth/google",
    {
      method: "POST",
      body: JSON.stringify({ email, username, name, ...meta }),
    },
    "none"
  );
  if (res.ok && res.data?.token && res.data?.user) {
    setStoredSession(res.data.token, res.data.user);
  }
  return res;
};

export const apiValidateSession = async () => {
  const tok = getStoredSessionToken();
  if (!tok) return { ok: false, status: 401, data: null };
  const res = await apiFetch<{ success: boolean; user?: UserProfile }>("/api/auth/session", { method: "GET" }, "user");
  if (res.ok && res.data?.user) {
    setStoredSession(tok, res.data.user);
  } else if (res.status === 401 || res.status === 403) {
    setStoredSession(null, null);
  }
  return res;
};

export const apiLogout = async () => {
  await apiFetch("/api/auth/logout", { method: "POST" }, "user");
  setStoredSession(null, null);
};

export const apiUnsubscribeSelf = async () => {
  const res = await apiFetch<{ success: boolean; photosDeleted?: number; tastingsPreserved?: number; error?: string }>(
    "/api/auth/unsubscribe",
    { method: "POST" },
    "user"
  );
  if (res.ok) {
    setStoredSession(null, null);
  }
  return res;
};

export const apiRecoverLookup = (identifier: string) =>
  apiFetch<{ success: boolean; account?: any; error?: string }>(
    "/api/auth/recover-lookup",
    { method: "POST", body: JSON.stringify({ identifier }) },
    "none"
  );

export const apiRecoverReset = (identifier: string, pin: string, newPassword: string) =>
  apiFetch<{ success: boolean; error?: string }>(
    "/api/auth/recover-reset",
    { method: "POST", body: JSON.stringify({ identifier, pin, newPassword }) },
    "none"
  );

// ============================================================================
// 6. BITÁCORAS (TASTINGS), FOTOS OPTIMIZADAS Y COLA OFFLINE RESILIENTE
// ============================================================================

export const getPendingSyncQueue = (): PendingSyncItem[] => {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePendingSyncQueue = (items: PendingSyncItem[]): void => {
  try {
    if (items.length === 0) {
      localStorage.removeItem(PENDING_QUEUE_KEY);
    } else {
      // Nunca guardar base64 gigante en localStorage si superara espacio
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(items));
    }
  } catch {
    // Si hay problema de cuota, guardar cola sin foto base64 para nunca perder la cata
    try {
      const stripped = items.map(({ pendingPhotoBase64, ...rest }) => rest);
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(stripped));
    } catch {}
  }
};

export const apiUploadOptimizedPhoto = async (
  cataId: string,
  rawDataUrl: string
): Promise<{ ok: boolean; photoUrl?: string; networkError?: boolean }> => {
  const optimized = await optimizeImageDataUrlForCloud(rawDataUrl, 720, 0.74);
  const res = await apiFetch<{ success: boolean; photoUrl?: string }>(
    "/api/photos/upload",
    {
      method: "POST",
      body: JSON.stringify({ cataId, imageBase64: optimized }),
    },
    "user"
  );
  return {
    ok: res.ok && Boolean(res.data?.photoUrl),
    photoUrl: res.data?.photoUrl,
    networkError: res.networkError,
  };
};

export const apiSaveTastingWithPhoto = async (
  user: UserProfile,
  tasting: TastingRecord
): Promise<{ synced: boolean; savedRecord: TastingRecord }> => {
  let recordToSave: TastingRecord = { ...tasting };
  let pendingPhotoBase64: string | undefined;

  if (
    recordToSave.photoUrl &&
    recordToSave.photoUrl.startsWith("data:image/") &&
    user.authProvider !== "guest"
  ) {
    const optimized = await optimizeImageDataUrlForCloud(recordToSave.photoUrl, 720, 0.74);
    const up = await apiUploadOptimizedPhoto(recordToSave.id, optimized);
    if (up.ok && up.photoUrl) {
      recordToSave.photoUrl = up.photoUrl;
    } else {
      pendingPhotoBase64 = optimized;
      // En local queda la foto comprimida en IndexedDB, pero nunca la mandamos cruda a SQLite
      recordToSave.photoUrl = optimized;
    }
  }

  // Si es invitado, solo se persiste localmente en el dispositivo
  if (user.authProvider === "guest") {
    return { synced: false, savedRecord: recordToSave };
  }

  const res = await apiFetch<{ success: boolean; tasting?: TastingRecord }>(
    "/api/tastings/save",
    {
      method: "POST",
      body: JSON.stringify({ tasting: recordToSave }),
    },
    "user"
  );

  if (res.ok && res.data?.tasting) {
    const serverRecord = res.data.tasting;
    if (pendingPhotoBase64) {
      // Queda la foto pendiente en cola si falló solo la subida de foto
      const q = getPendingSyncQueue().filter((x) => x.tasting?.id !== recordToSave.id);
      q.push({
        userId: user.id,
        action: "upsert",
        tasting: serverRecord,
        pendingPhotoBase64,
        queuedAt: new Date().toISOString(),
      });
      savePendingSyncQueue(q);
    }
    return { synced: !pendingPhotoBase64, savedRecord: serverRecord };
  }

  // Fallback resiliente a cola offline si DreamHost no respondió
  const q = getPendingSyncQueue().filter((x) => x.tasting?.id !== recordToSave.id);
  q.push({
    userId: user.id,
    action: "upsert",
    tasting: recordToSave,
    pendingPhotoBase64,
    queuedAt: new Date().toISOString(),
  });
  savePendingSyncQueue(q);
  return { synced: false, savedRecord: recordToSave };
};

export const apiDeleteTasting = async (userId: string, cataId: string): Promise<boolean> => {
  const res = await apiFetch(
    "/api/tastings/delete",
    { method: "POST", body: JSON.stringify({ id: cataId }) },
    "user"
  );
  if (!res.ok) {
    const q = getPendingSyncQueue().filter((x) => (x.tasting?.id || x.tastingId) !== cataId);
    q.push({ userId, action: "delete", tastingId: cataId, queuedAt: new Date().toISOString() });
    savePendingSyncQueue(q);
  }
  return res.ok;
};

export const apiFetchUserTastings = async (user: UserProfile): Promise<{ fromCloud: boolean; tastings: TastingRecord[] }> => {
  if (user.authProvider === "guest") {
    const local = await idbLoadUserTastings(user.id);
    return { fromCloud: false, tastings: local };
  }

  // Intentar sincronizar cola pendiente primero
  await flushPendingQueueForUser(user.id);

  // Recolectar posibles catas antiguas atrapadas en localStorage del teléfono (migración automática)
  const legacyTastings = collectLegacyLocalTastings(user);
  if (legacyTastings.length > 0) {
    await migrateLegacyTastingsToCloud(user, legacyTastings);
  }

  const res = await apiFetch<{ success: boolean; tastings?: TastingRecord[] }>("/api/tastings", { method: "GET" }, "user");
  if (res.ok && Array.isArray(res.data?.tastings)) {
    await idbSaveUserTastings(user.id, res.data.tastings);
    return { fromCloud: true, tastings: res.data.tastings };
  }

  const cached = await idbLoadUserTastings(user.id);
  return { fromCloud: false, tastings: cached };
};

export async function flushPendingQueueForUser(userId: string): Promise<number> {
  const queue = getPendingSyncQueue();
  const mine = queue.filter((q) => q.userId === userId);
  if (mine.length === 0) return 0;

  let flushed = 0;
  const remaining: PendingSyncItem[] = queue.filter((q) => q.userId !== userId);

  for (const item of mine) {
    if (item.action === "delete" && item.tastingId) {
      const r = await apiFetch("/api/tastings/delete", { method: "POST", body: JSON.stringify({ id: item.tastingId }) }, "user");
      if (r.ok) flushed++;
      else remaining.push(item);
    } else if (item.action === "upsert" && item.tasting) {
      let rec = { ...item.tasting };
      if (item.pendingPhotoBase64) {
        const up = await apiUploadOptimizedPhoto(rec.id, item.pendingPhotoBase64);
        if (up.ok && up.photoUrl) rec.photoUrl = up.photoUrl;
      }
      const r = await apiFetch("/api/tastings/save", { method: "POST", body: JSON.stringify({ tasting: rec }) }, "user");
      if (r.ok) flushed++;
      else remaining.push(item);
    }
  }

  savePendingSyncQueue(remaining);
  return flushed;
}

/**
 * Recolecta de forma segura catas legadas en localStorage pertenecientes al usuario
 * (incluyendo claves truncadas por nombre como varietale_user_tastings_cristian cuando aplique).
 */
export function collectLegacyLocalTastings(user: UserProfile): TastingRecord[] {
  if (typeof window === "undefined" || !user || user.authProvider === "guest") return [];
  const candidates = new Set<string>();
  const addKey = (raw?: string) => {
    if (!raw) return;
    const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (clean) candidates.add(`varietale_user_tastings_${clean}`);
  };
  addKey(user.username);
  addKey(user.email);
  addKey(user.id);
  if (user.email) {
    const first = user.email.split("@")[0]?.split(/[._-]/)[0]?.replace(/\d+$/, "");
    addKey(first);
  }
  if (user.name) {
    addKey(user.name.split(/\s+/)[0]);
  }

  const collected: TastingRecord[] = [];
  const seenIds = new Set<string>();
  const keysToClear: string[] = [];

  for (const key of candidates) {
    if (key === "varietale_user_tastings_catador_prueba" || key === "varietale_user_tastings_guest") continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const t of parsed) {
          if (t && t.id && t.coffeeName && !seenIds.has(t.id)) {
            seenIds.add(t.id);
            collected.push(t);
          }
        }
        keysToClear.push(key);
      }
    } catch {}
  }

  // Solo limpiamos las claves viejas de localStorage una vez se envíen con éxito al servidor
  (collected as any).__legacyKeys = keysToClear;
  return collected;
}

async function migrateLegacyTastingsToCloud(user: UserProfile, items: TastingRecord[]): Promise<void> {
  if (items.length === 0) return;
  const prepared: TastingRecord[] = [];

  for (const t of items) {
    const copy = { ...t };
    if (copy.photoUrl && copy.photoUrl.startsWith("data:image/")) {
      const up = await apiUploadOptimizedPhoto(copy.id, copy.photoUrl);
      if (up.ok && up.photoUrl) {
        copy.photoUrl = up.photoUrl;
      } else {
        delete copy.photoUrl;
      }
    }
    prepared.push(copy);
  }

  const res = await apiFetch<{ success: boolean }>(
    "/api/tastings/sync",
    {
      method: "POST",
      body: JSON.stringify({ tastings: prepared }),
    },
    "user"
  );

  if (res.ok) {
    const keys: string[] = (items as any).__legacyKeys || [];
    for (const k of keys) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
  }
}

// ============================================================================
// 7. ANALÍTICA Y PORTAL ADMIN EN DREAMHOST
// ============================================================================

export const apiTrackAnalyticsEvent = async (
  eventType: "redirect" | "share" | "coupon",
  payload: Record<string, any>
): Promise<void> => {
  await apiFetch("/api/analytics/event", { method: "POST", body: JSON.stringify({ eventType, payload }) }, "none");
};

export const apiAdminLogin = async (username: string, password: string) => {
  const res = await apiFetch<{ success: boolean; adminToken?: string; error?: string }>(
    "/api/admin/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
    "none"
  );
  if (res.ok && res.data?.adminToken) {
    setStoredAdminToken(res.data.adminToken);
  }
  return res;
};

export const apiAdminVerifyPin = (pin: string) =>
  apiFetch<{ success: boolean }>("/api/admin/verify-pin", { method: "POST", body: JSON.stringify({ pin }) }, "none");

export const apiAdminUpdateCredentials = (payload: {
  username?: string;
  password?: string;
  newMasterPin?: string;
  masterPin?: string;
}) => apiFetch<{ success: boolean }>("/api/admin/update-credentials", { method: "POST", body: JSON.stringify(payload) }, "admin");

export const apiFetchPublicAppConfig = () =>
  apiFetch<{
    success: boolean;
    welcomeCouponConfig?: any;
  }>("/api/app-config", { method: "GET" });

export const apiAdminSaveSettings = (payload: {
  welcomeCouponConfig?: any;
  webhookConfig?: any;
}) =>
  apiFetch<{
    success: boolean;
    welcomeCouponConfig?: any;
    webhookConfig?: any;
  }>(
    "/api/admin/settings",
    { method: "POST", body: JSON.stringify(payload) },
    "admin"
  );

export const apiAdminFetchDirectory = () =>
  apiFetch<{
    success: boolean;
    users: any[];
    redirects: any[];
    shares: any[];
    coupons: any[];
    welcomeCouponConfig?: any;
    webhookConfig?: any;
    backupTokenConfigured?: boolean;
  }>("/api/admin/directory", { method: "GET" }, "admin");

export const apiAdminResetUser = (accountId: string, newPassword?: string, newPin?: string) =>
  apiFetch("/api/admin/reset-user", { method: "POST", body: JSON.stringify({ accountId, newPassword, newPin }) }, "admin");

export const apiAdminUnsubscribeUser = (accountId: string) =>
  apiFetch<{ success: boolean; photosDeleted?: number; tastingsPreserved?: number }>(
    "/api/admin/unsubscribe-user",
    { method: "POST", body: JSON.stringify({ accountId }) },
    "admin"
  );

export const apiAdminReactivateUser = (accountId: string) =>
  apiFetch<{ success: boolean; accountId?: string; status?: string; reactivatedAt?: string }>(
    "/api/admin/reactivate-user",
    { method: "POST", body: JSON.stringify({ accountId }) },
    "admin"
  );

export const apiAdminBackupConfig = (regenerate = false) =>
  apiFetch<{ success: boolean; backupToken?: string }>(
    "/api/admin/backup-config",
    { method: regenerate ? "POST" : "GET", body: regenerate ? JSON.stringify({ regenerate: true }) : undefined },
    "admin"
  );

export const apiAdminDownloadBackup = () => apiFetch<any>("/api/backup", { method: "GET" }, "admin");
