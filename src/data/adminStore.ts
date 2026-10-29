/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - ALMACÉN Y MOTOR DE ADMINISTRACIÓN (ADMIN STORE)
 * ============================================================================
 * Centraliza toda la lógica de negocio, telemetría, analítica, CRM, integraciones
 * y seguridad para el Área del Administrador de Mi Bitácora Varietale:
 *
 * 1. Autenticación de Administrador y recuperación con PIN Maestro.
 * 2. Rastreo de redirecciones hacia varietale.com por usuario y por origen.
 * 3. Rastreo de viralidad (compartidos por WhatsApp, link copiado, menú nativo).
 * 4. Rastreo y configuración dinámica del Cupón de Bienvenida.
 * 5. Consolidación de usuarios reales y sus cataciones (excluyendo sesiones de prueba).
 * 6. Cálculo de métricas del Dashboard General (sabores, cafés, marcas, métodos, recompra).
 * 7. Conectores Webhook para Google Sheets y Notion + Exportación CSV/Excel y JSON.
 */

import {
  UserProfile,
  TastingRecord,
  MacroProfile,
  BrewMethod,
} from "../types";
import {
  ACCOUNTS_STORAGE_KEY,
  StoredAccount,
  getStoredAccounts,
} from "./accountStore";
import {
  FLAVOR_DESCRIPTORS,
  normalizeMacro,
  getDescriptorDisplay,
  BREW_METHODS,
  computeSensorySpiderProfile,
} from "./coffeeData";

// ============================================================================
// 1. CREDENCIALES Y SEGURIDAD DEL ADMINISTRADOR
// ============================================================================

export interface AdminCredentials {
  username: string;
  password: string;
  masterPin: string;
  updatedAt: string;
  hasCustomized?: boolean;
}

const ADMIN_CREDENTIALS_KEY = "varietale_admin_credentials_v1";
const ADMIN_SESSION_KEY = "varietale_admin_active_session";

/** Credenciales de fábrica definidas por el propietario */
export const FACTORY_ADMIN_CREDENTIALS: AdminCredentials = {
  username: "amorporelcafe.admin",
  password: "Varietale2026*",
  masterPin: "1985",
  updatedAt: new Date().toISOString(),
  hasCustomized: false,
};

export const getAdminCredentials = (): AdminCredentials => {
  try {
    const raw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username && parsed.password && parsed.masterPin) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error leyendo credenciales de administrador:", e);
  }
  return { ...FACTORY_ADMIN_CREDENTIALS };
};

export const saveAdminCredentials = (creds: Partial<AdminCredentials>): AdminCredentials => {
  const current = getAdminCredentials();
  const updated: AdminCredentials = {
    username: (creds.username ?? current.username).trim(),
    password: creds.password ?? current.password,
    masterPin: (creds.masterPin ?? current.masterPin).trim(),
    updatedAt: new Date().toISOString(),
    hasCustomized: true,
  };
  try {
    localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error guardando credenciales de administrador:", e);
  }
  return updated;
};

export const verifyAdminLogin = (usernameInput: string, passwordInput: string): boolean => {
  const current = getAdminCredentials();
  const cleanUser = usernameInput.trim().toLowerCase();

  // Verifica contra las credenciales activas o las credenciales de fábrica si no han sido personalizadas
  const matchesCurrent =
    cleanUser === current.username.trim().toLowerCase() &&
    passwordInput === current.password;

  const matchesFactory =
    !current.hasCustomized &&
    cleanUser === FACTORY_ADMIN_CREDENTIALS.username.toLowerCase() &&
    passwordInput === FACTORY_ADMIN_CREDENTIALS.password;

  return matchesCurrent || matchesFactory;
};

export const verifyAdminMasterPin = (pinInput: string): boolean => {
  const current = getAdminCredentials();
  const cleanPin = pinInput.trim();
  // Acepta el PIN actual configurado o el PIN maestro de fábrica (1985) como llave de emergencia
  return (
    cleanPin === current.masterPin.trim() ||
    cleanPin === FACTORY_ADMIN_CREDENTIALS.masterPin
  );
};

export const isAdminSessionActive = (): boolean => {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
  } catch {
    return false;
  }
};

export const setAdminSessionActive = (active: boolean): void => {
  try {
    if (active) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {}
};

// ============================================================================
// 2. CONFIGURACIÓN DINÁMICA DEL CUPÓN DE BIENVENIDA
// ============================================================================

export interface WelcomeCouponConfig {
  enabled: boolean;
  badgeText: string;
  discountTitle: string;
  subtitle: string;
  couponCode: string;
  targetUrl: string;
  buttonText: string;
}

const WELCOME_COUPON_CONFIG_KEY = "varietale_welcome_coupon_config_v1";

export const DEFAULT_WELCOME_COUPON_CONFIG: WelcomeCouponConfig = {
  enabled: true,
  badgeText: "OBSEQUIO DE BIENVENIDA",
  discountTitle: "10% de Cortesía",
  subtitle: "En la compra de tu primer café desde la App",
  couponCode: "Experienciafiltrados",
  targetUrl: "https://varietale.com/discount/Experienciafiltrados?redirect=%2Fcollections%2Fcafes",
  buttonText: "Ir a la Tienda con 10% OFF",
};

export const getWelcomeCouponConfig = (): WelcomeCouponConfig => {
  try {
    const raw = localStorage.getItem(WELCOME_COUPON_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.couponCode === "string") {
        return { ...DEFAULT_WELCOME_COUPON_CONFIG, ...parsed };
      }
    }
  } catch {}
  return { ...DEFAULT_WELCOME_COUPON_CONFIG };
};

export const saveWelcomeCouponConfig = (config: WelcomeCouponConfig): WelcomeCouponConfig => {
  try {
    localStorage.setItem(WELCOME_COUPON_CONFIG_KEY, JSON.stringify(config));
  } catch {}
  return config;
};

// ============================================================================
// 3. TELEMETRÍA: REDIRECCIONES A VARIETALE.COM, CUPÓN Y COMPARTIDOS
// ============================================================================

export type RedirectSourceType =
  | "home_store_btn"
  | "welcome_coupon_btn"
  | "rebuy_recommendation"
  | "catalog_product"
  | "footer_link"
  | "terms_link"
  | "floating_varietale_btn";

export interface VarietaleRedirectEvent {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userName: string;
  source: RedirectSourceType;
  targetUrl: string;
  label?: string;
}

export type RedirectDateRangeType =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "quarter"
  | "year_trailing"
  | "specific_year"
  | "custom";

export interface RedirectFilterOptions {
  range: RedirectDateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  specificYear?: number;
  source?: RedirectSourceType | "all";
  searchQuery?: string;
}

export interface RedirectEventsStats {
  totalClicks: number;
  uniqueUsersCount: number;
  registeredClicksCount: number;
  guestClicksCount: number;
  topSource: { source: RedirectSourceType | "none"; label: string; count: number; pct: number };
  dailyAvg: number;
  redirectsBySource: Record<RedirectSourceType, number>;
}

export type ShareChannelType = "whatsapp" | "copy_link" | "native_share";

export interface AppShareEvent {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userName: string;
  channel: ShareChannelType;
}

export interface CouponCopyEvent {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  couponCode: string;
}

export interface UserDeviceMeta {
  userId: string;
  isStandalonePwa: boolean;
  platform: "iOS" | "Android" | "Escritorio";
  lastSeenAt: string;
  phone?: string;
}

const REDIRECT_EVENTS_KEY = "varietale_telemetry_redirects_v1";
const SHARE_EVENTS_KEY = "varietale_telemetry_shares_v1";
const COUPON_EVENTS_KEY = "varietale_telemetry_coupon_copies_v1";
const USER_META_KEY = "varietale_telemetry_user_meta_v1";

/** Determina si un usuario pertenece a una sesión ficticia o de prueba */
export const isTestOrTourUser = (
  userId?: string | null,
  username?: string | null,
  email?: string | null
): boolean => {
  if (!userId && !username && !email) return false;
  const id = (userId || "").toLowerCase();
  const u = (username || "").toLowerCase();
  const e = (email || "").toLowerCase();
  return (
    id === "user-test-dev" ||
    id === "guest-tour" ||
    id === "test-user-catador" ||
    id === "guest-user" ||
    u === "catador.prueba" ||
    u === "visitante" ||
    u.includes("catador.prueba") ||
    e === "prueba@varietale.com" ||
    e.includes("prueba@varietale.com")
  );
};

/** Obtiene el usuario actualmente en sesión desde sessionStorage */
const getActiveSessionUser = (): UserProfile | null => {
  try {
    const raw = sessionStorage.getItem("varietale_session_user");
    if (raw) {
      return JSON.parse(raw) as UserProfile;
    }
  } catch {}
  return null;
};

/** Detecta el sistema operativo y si corre como PWA instalada */
export const detectCurrentDeviceEnv = (): {
  isStandalonePwa: boolean;
  platform: "iOS" | "Android" | "Escritorio";
} => {
  if (typeof window === "undefined") {
    return { isStandalonePwa: false, platform: "Escritorio" };
  }
  const isStandalonePwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  const ua = window.navigator.userAgent.toLowerCase();
  let platform: "iOS" | "Android" | "Escritorio" = "Escritorio";
  if (/iphone|ipad|ipod/.test(ua)) {
    platform = "iOS";
  } else if (/android/.test(ua)) {
    platform = "Android";
  }
  return { isStandalonePwa, platform };
};

/** Registra metadatos de dispositivo y última actividad del usuario */
export const recordUserSessionActivity = (user: UserProfile | null): void => {
  if (!user || isTestOrTourUser(user.id, user.username, user.email) || user.id === "guest-user") return;
  try {
    const raw = localStorage.getItem(USER_META_KEY);
    const map: Record<string, UserDeviceMeta> = raw ? JSON.parse(raw) : {};
    const env = detectCurrentDeviceEnv();
    const cleanKey = (user.username || user.email || user.id).toLowerCase();
    map[cleanKey] = {
      userId: user.id,
      isStandalonePwa: env.isStandalonePwa || Boolean(map[cleanKey]?.isStandalonePwa),
      platform: env.platform,
      lastSeenAt: new Date().toISOString(),
      phone: user.phone || map[cleanKey]?.phone,
    };
    localStorage.setItem(USER_META_KEY, JSON.stringify(map));
  } catch {}
};

export const getUserDeviceMetaMap = (): Record<string, UserDeviceMeta> => {
  try {
    const raw = localStorage.getItem(USER_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/**
 * Registra una redirección hacia varietale.com desde cualquier punto de Mi Bitácora.
 */
export const recordVarietaleRedirect = (
  source: RedirectSourceType,
  targetUrl: string,
  label?: string
): void => {
  const activeUser = getActiveSessionUser();
  if (activeUser && isTestOrTourUser(activeUser.id, activeUser.username, activeUser.email)) {
    return; // No contaminar analíticas con el usuario de pruebas
  }

  const event: VarietaleRedirectEvent = {
    id: `redir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: activeUser?.id || "guest-user",
    username: activeUser?.username || activeUser?.email || "invitado",
    userName: activeUser?.name || "Visitante",
    source,
    targetUrl,
    label,
  };

  try {
    const existing = getVarietaleRedirectEvents();
    const updated = [event, ...existing];
    localStorage.setItem(REDIRECT_EVENTS_KEY, JSON.stringify(updated));
    triggerWebhookInBackground("varietale_redirect", event);
  } catch (e) {
    console.warn("No se pudo registrar evento de redirección:", e);
  }
};

export const getVarietaleRedirectEvents = (): VarietaleRedirectEvent[] => {
  try {
    const raw = localStorage.getItem(REDIRECT_EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

/**
 * Traduce el código de origen de redirección a una etiqueta amigable y comercial.
 */
export const formatRedirectSourceLabel = (source: RedirectSourceType): string => {
  switch (source) {
    case "floating_varietale_btn":
      return "Pestaña Lateral Flotante";
    case "home_store_btn":
      return "Botón Pantalla de Inicio";
    case "welcome_coupon_btn":
      return "Cupón de Bienvenida 10%";
    case "rebuy_recommendation":
      return "Recomendación de Recompra";
    case "catalog_product":
      return "Catálogo de Cafés";
    case "footer_link":
      return "Pie de Página / Hipervínculo";
    case "terms_link":
      return "Términos y Condiciones";
    default:
      return source;
  }
};

/**
 * Filtra eventos de redirección por rango de tiempo, canal de origen y texto de búsqueda.
 * Excluye estrictamente eventos de usuarios de prueba.
 */
export const filterRedirectEvents = (
  events: VarietaleRedirectEvent[],
  options: RedirectFilterOptions
): VarietaleRedirectEvent[] => {
  const now = new Date();
  const nowMs = now.getTime();

  // Inicio de hoy (00:00:00.000 local)
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ms7Days = 7 * 24 * 60 * 60 * 1000;
  const ms30Days = 30 * 24 * 60 * 60 * 1000;
  const ms90Days = 90 * 24 * 60 * 60 * 1000;
  const ms365Days = 365 * 24 * 60 * 60 * 1000;

  let minMs = 0;
  let maxMs = Number.MAX_SAFE_INTEGER;

  switch (options.range) {
    case "today":
      minMs = startOfTodayMs;
      break;
    case "7d":
      minMs = nowMs - ms7Days;
      break;
    case "30d":
      minMs = nowMs - ms30Days;
      break;
    case "quarter":
      minMs = nowMs - ms90Days;
      break;
    case "year_trailing":
      minMs = nowMs - ms365Days;
      break;
    case "specific_year": {
      const year = options.specificYear || now.getFullYear();
      minMs = new Date(year, 0, 1).getTime();
      maxMs = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
      break;
    }
    case "custom": {
      if (options.customStartDate) {
        const parsedStart = new Date(`${options.customStartDate}T00:00:00`).getTime();
        if (!isNaN(parsedStart)) minMs = parsedStart;
      }
      if (options.customEndDate) {
        const parsedEnd = new Date(`${options.customEndDate}T23:59:59.999`).getTime();
        if (!isNaN(parsedEnd)) maxMs = parsedEnd;
      }
      break;
    }
    case "all":
    default:
      minMs = 0;
      maxMs = Number.MAX_SAFE_INTEGER;
      break;
  }

  const query = (options.searchQuery || "").trim().toLowerCase();
  const sourceFilter = options.source && options.source !== "all" ? options.source : null;

  return events
    .filter((e) => {
      if (isTestOrTourUser(e.userId, e.username)) return false;

      const eventMs = Date.parse(e.timestamp);
      if (isNaN(eventMs)) return false;

      if (eventMs < minMs || eventMs > maxMs) return false;
      if (sourceFilter && e.source !== sourceFilter) return false;

      if (query) {
        const inUser = (e.userName || "").toLowerCase().includes(query);
        const inUsername = (e.username || "").toLowerCase().includes(query);
        const inLabel = (e.label || "").toLowerCase().includes(query);
        const inTarget = (e.targetUrl || "").toLowerCase().includes(query);
        const inSource = formatRedirectSourceLabel(e.source).toLowerCase().includes(query);
        if (!inUser && !inUsername && !inLabel && !inTarget && !inSource) return false;
      }

      return true;
    })
    .sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
};

/**
 * Calcula métricas resumidas para un conjunto de eventos de redirección filtrados.
 */
export const computeRedirectStatsForEvents = (
  filteredEvents: VarietaleRedirectEvent[],
  rangeDays?: number
): RedirectEventsStats => {
  const redirectsBySource: Record<RedirectSourceType, number> = {
    home_store_btn: 0,
    welcome_coupon_btn: 0,
    rebuy_recommendation: 0,
    catalog_product: 0,
    footer_link: 0,
    terms_link: 0,
    floating_varietale_btn: 0,
  };

  const uniqueUsers = new Set<string>();
  let registeredClicksCount = 0;
  let guestClicksCount = 0;

  filteredEvents.forEach((e) => {
    if (e.source in redirectsBySource) {
      redirectsBySource[e.source]++;
    }
    if (e.userId && e.userId !== "guest-user" && !e.userId.startsWith("guest-")) {
      uniqueUsers.add(e.userId);
      registeredClicksCount++;
    } else {
      guestClicksCount++;
    }
  });

  const totalClicks = filteredEvents.length;

  let topSourceKey: RedirectSourceType | "none" = "none";
  let topSourceCount = 0;
  (Object.keys(redirectsBySource) as RedirectSourceType[]).forEach((s) => {
    if (redirectsBySource[s] > topSourceCount) {
      topSourceCount = redirectsBySource[s];
      topSourceKey = s;
    }
  });

  const days = Math.max(1, rangeDays || 1);
  const dailyAvg = Number((totalClicks / days).toFixed(1));

  const topSourcePct =
    totalClicks > 0 ? Math.round((topSourceCount / totalClicks) * 100) : 0;

  return {
    totalClicks,
    uniqueUsersCount: uniqueUsers.size,
    registeredClicksCount,
    guestClicksCount,
    topSource: {
      source: topSourceKey,
      label:
        topSourceKey !== "none"
          ? formatRedirectSourceLabel(topSourceKey)
          : "Sin clics en el rango",
      count: topSourceCount,
      pct: topSourcePct,
    },
    dailyAvg,
    redirectsBySource,
  };
};

/**
 * Exporta el historial de eventos de redirección a archivo .CSV con soporte UTF-8.
 */
export const exportRedirectEventsToCsv = (
  events: VarietaleRedirectEvent[],
  rangeLabel: string = "Personalizado"
): void => {
  const cleanEvents = events.filter((e) => !isTestOrTourUser(e.userId, e.username));

  const headers = [
    "ID Evento",
    "Fecha y Hora (Colombia)",
    "ID Catador",
    "Nombre Catador",
    "Usuario (@handle)",
    "Canal de Origen",
    "Detalle / Café",
    "URL de Destino",
  ];

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? "").replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = cleanEvents.map((e) => [
    escapeCsv(e.id),
    escapeCsv(formatReadableDate(e.timestamp, true)),
    escapeCsv(e.userId || "guest-user"),
    escapeCsv(e.userName || "Invitado"),
    escapeCsv(e.username ? `@${e.username}` : "—"),
    escapeCsv(formatRedirectSourceLabel(e.source)),
    escapeCsv(e.label || "Tienda Oficial"),
    escapeCsv(e.targetUrl || "https://www.varietale.com"),
  ]);

  const csvContent =
    "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanLabel = rangeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.download = `varietale-auditoria-redirecciones-${cleanLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exporta el historial de eventos de redirección a libro de cálculo Excel (.XLS) con estilos y resumen ejecutivo.
 */
export const exportRedirectEventsToExcel = (
  events: VarietaleRedirectEvent[],
  rangeLabel: string = "Personalizado"
): void => {
  const cleanEvents = events.filter((e) => !isTestOrTourUser(e.userId, e.username));

  const escapeHtml = (val: unknown): string =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rowsHtml = cleanEvents
    .map(
      (e, idx) => `
      <tr style="background-color:${idx % 2 === 0 ? "#FFFFFF" : "#F5F8FA"};">
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(e.id)}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(formatReadableDate(e.timestamp, true))}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(e.userId || "guest-user")}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;font-weight:bold;">${escapeHtml(e.userName || "Invitado")}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(e.username ? `@${e.username}` : "—")}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;font-weight:bold;color:#01374C;">${escapeHtml(formatRedirectSourceLabel(e.source))}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(e.label || "Tienda Oficial")}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;color:#007B8A;">${escapeHtml(e.targetUrl || "https://www.varietale.com")}</td>
      </tr>`
    )
    .join("");

  const stats = computeRedirectStatsForEvents(cleanEvents);

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Auditoría Redirecciones</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family:Arial,sans-serif;color:#01374C;background:#FFFFFF;">
        <h2 style="color:#01374C;margin-bottom:4px;">Bitácora de Catación Varietale — Auditoría de Redirecciones a varietale.com</h2>
        <p style="color:#52646E;font-size:12px;margin-top:0;">Período Auditado: <strong>${escapeHtml(rangeLabel)}</strong> | Fecha de Emisión: <strong>${formatReadableDate(new Date().toISOString(), true)}</strong></p>
        
        <table style="margin-bottom:16px;border-collapse:collapse;font-size:12px;">
          <tr>
            <th style="padding:8px 12px;background:#01374C;color:#FFFFFF;border:1px solid #01374C;">Total Clics</th>
            <th style="padding:8px 12px;background:#01374C;color:#FFFFFF;border:1px solid #01374C;">Catadores Registrados</th>
            <th style="padding:8px 12px;background:#01374C;color:#FFFFFF;border:1px solid #01374C;">Invitados</th>
            <th style="padding:8px 12px;background:#01374C;color:#FFFFFF;border:1px solid #01374C;">Canal Principal</th>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #D5DFE5;font-weight:bold;text-align:center;">${stats.totalClicks}</td>
            <td style="padding:8px 12px;border:1px solid #D5DFE5;text-align:center;">${stats.registeredClicksCount}</td>
            <td style="padding:8px 12px;border:1px solid #D5DFE5;text-align:center;">${stats.guestClicksCount}</td>
            <td style="padding:8px 12px;border:1px solid #D5DFE5;text-align:center;">${escapeHtml(stats.topSource.label)} (${stats.topSource.count})</td>
          </tr>
        </table>

        <table style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead>
            <tr style="background-color:#01374C;color:#FFFFFF;text-align:left;">
              <th style="padding:8px 10px;border:1px solid #01374C;">ID Evento</th>
              <th style="padding:8px 10px;border:1px solid #01374C;">Fecha y Hora</th>
              <th style="padding:8px 10px;border:1px solid #01374C;">ID Catador</th>
              <th style="padding:8px 10px;border:1px solid #01374C;">Nombre Catador</th>
              <th style="padding:8px 10px;border:1px solid #01374C;">Usuario (@handle)</th>
              <th style="padding:8px 10px;border:1px solid #01374C;">Canal de Origen</th>
              <th style="padding:8px 10px;border:1px solid #01374C;">Detalle / Producto</th>
              <th style="padding:8px 10px;border:1px solid #01374C;">URL Destino</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="padding:12px;text-align:center;color:#6A7B85;">No hay clics registrados en este rango.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanLabel = rangeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.download = `varietale-auditoria-redirecciones-${cleanLabel}-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Registra cada vez que un usuario comparte la aplicación o copia su link.
 */
export const recordAppShare = (channel: ShareChannelType): void => {
  const activeUser = getActiveSessionUser();
  if (activeUser && isTestOrTourUser(activeUser.id, activeUser.username, activeUser.email)) {
    return;
  }

  const event: AppShareEvent = {
    id: `share-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: activeUser?.id || "guest-user",
    username: activeUser?.username || activeUser?.email || "invitado",
    userName: activeUser?.name || "Visitante",
    channel,
  };

  try {
    const existing = getAppShareEvents();
    const updated = [event, ...existing];
    localStorage.setItem(SHARE_EVENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("No se pudo registrar evento de compartido:", e);
  }
};

export const getAppShareEvents = (): AppShareEvent[] => {
  try {
    const raw = localStorage.getItem(SHARE_EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

/**
 * Registra cuando un usuario copia el código del cupón de bienvenida.
 */
export const recordCouponCopy = (couponCode: string): void => {
  const activeUser = getActiveSessionUser();
  if (activeUser && isTestOrTourUser(activeUser.id, activeUser.username, activeUser.email)) {
    return;
  }

  const event: CouponCopyEvent = {
    id: `cup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: activeUser?.id || "guest-user",
    username: activeUser?.username || activeUser?.email || "invitado",
    couponCode,
  };

  try {
    const existing = getCouponCopyEvents();
    const updated = [event, ...existing];
    localStorage.setItem(COUPON_EVENTS_KEY, JSON.stringify(updated));
  } catch {}
};

export const getCouponCopyEvents = (): CouponCopyEvent[] => {
  try {
    const raw = localStorage.getItem(COUPON_EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

// ============================================================================
// 4. CONSOLIDACIÓN DE USUARIOS Y CATACIONES + GESTIÓN CRM / SOPORTE
// ============================================================================

export interface EnrichedUserRecord {
  account: StoredAccount & { phone?: string };
  tastings: TastingRecord[];
  tastingsCount: number;
  uniqueCoffeesCount: number;
  avgRating: number;
  redirectsCount: number;
  sharesCount: number;
  isStandalonePwa: boolean;
  isPwaInstalled?: boolean;
  favoriteMacro?: string;
  platform: "iOS" | "Android" | "Escritorio";
  lastActivityAt: string;
}

/** Genera la clave de almacenamiento de catas para una cuenta */
export const getTastingsKeyForAccount = (acc: {
  id: string;
  username?: string;
  email?: string;
}): string => {
  const userIdentifier = acc.username || acc.email || acc.id;
  const cleanId = userIdentifier.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `varietale_user_tastings_${cleanId}`;
};

/** Carga las catas asociadas a una cuenta registrada */
export const loadTastingsForAccount = (acc: {
  id: string;
  username?: string;
  email?: string;
}): TastingRecord[] => {
  try {
    const key = getTastingsKeyForAccount(acc);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

/**
 * Obtiene todos los usuarios registrados reales (excluyendo el usuario de pruebas)
 * enriquecidos con sus cataciones, redirecciones a varietale.com y compartidos.
 */
export const getEnrichedUsersDirectory = (): EnrichedUserRecord[] => {
  const accounts = getStoredAccounts().filter(
    (a) => !isTestOrTourUser(a.id, a.username, a.email)
  );
  const redirects = getVarietaleRedirectEvents();
  const shares = getAppShareEvents();
  const deviceMeta = getUserDeviceMetaMap();

  return accounts.map((acc) => {
    const tastings = loadTastingsForAccount(acc);
    const cleanUsername = (acc.username || "").toLowerCase();
    const cleanEmail = (acc.email || "").toLowerCase();

    const userRedirects = redirects.filter(
      (r) =>
        r.userId === acc.id ||
        r.username.toLowerCase() === cleanUsername ||
        (cleanEmail && r.username.toLowerCase() === cleanEmail)
    );

    const userShares = shares.filter(
      (s) =>
        s.userId === acc.id ||
        s.username.toLowerCase() === cleanUsername ||
        (cleanEmail && s.username.toLowerCase() === cleanEmail)
    );

    const avgRating =
      tastings.length > 0
        ? Number(
            (
              tastings.reduce((accSum, t) => accSum + (t.rating || 0), 0) /
              tastings.length
            ).toFixed(2)
          )
        : 0;

    const uniqueCoffeesCount = new Set(
      tastings.map((t) => (t.coffeeName || "").trim().toLowerCase()).filter(Boolean)
    ).size;

    const meta =
      deviceMeta[cleanUsername] ||
      deviceMeta[cleanEmail] ||
      deviceMeta[acc.id.toLowerCase()];

    const latestTastingDate = tastings[0]?.createdAt || acc.createdAt;

    const macroCounts: Record<string, number> = {};
    tastings.forEach((t) => {
      (t.selectedFlavors || []).forEach((f) => {
        if (f.macro) {
          macroCounts[f.macro] = (macroCounts[f.macro] || 0) + 1;
        }
      });
    });
    let favoriteMacro = "—";
    let maxMacroCount = 0;
    Object.entries(macroCounts).forEach(([m, c]) => {
      if (c > maxMacroCount) {
        maxMacroCount = c;
        favoriteMacro = m;
      }
    });

    return {
      account: {
        ...acc,
        phone: (acc as any).phone || meta?.phone || "",
      },
      tastings,
      tastingsCount: tastings.length,
      uniqueCoffeesCount,
      avgRating,
      redirectsCount: userRedirects.length,
      sharesCount: userShares.length,
      isStandalonePwa: Boolean(meta?.isStandalonePwa),
      isPwaInstalled: Boolean(meta?.isStandalonePwa),
      favoriteMacro,
      platform: meta?.platform || "Escritorio",
      lastActivityAt: meta?.lastSeenAt || latestTastingDate,
    };
  });
};

/**
 * Permite al Administrador restablecer la contraseña y/o el PIN de 4 dígitos
 * de cualquier usuario registrado para brindarle soporte inmediato.
 */
export const adminResetClientCredentials = (
  accountId: string,
  newPassword?: string,
  newPin?: string
): boolean => {
  try {
    const accounts = getStoredAccounts();
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) return false;

    if (newPassword && newPassword.trim().length >= 4) {
      accounts[idx].password = newPassword.trim();
    }
    if (newPin && /^\d{4}$/.test(newPin.trim())) {
      accounts[idx].securityPin = newPin.trim();
    }
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    return true;
  } catch {
    return false;
  }
};

/**
 * Permite al Administrador eliminar una cuenta de usuario y sus catas asociadas
 * (por ejemplo, para limpiar cuentas de prueba creadas manualmente).
 */
export const adminDeleteUserAccount = (accountId: string): boolean => {
  try {
    const accounts = getStoredAccounts();
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return false;

    const key = getTastingsKeyForAccount(target);
    localStorage.removeItem(key);

    const remaining = accounts.filter((a) => a.id !== accountId);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(remaining));
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// 5. MOTOR DE ANALÍTICA DEL DASHBOARD GENERAL
// ============================================================================

export interface AdminDashboardStats {
  // Bloque A: KPIs Superiores
  totalUsers: number;
  usersLast7Days: number;
  usersLast30Days: number;
  googleUsersCount: number;
  emailUsersCount: number;
  totalTastings: number;
  avgTastingsPerUser: number;
  globalAvgRating: number;
  totalRedirects: number;
  redirectsBySource: {
    home_store_btn: number;
    welcome_coupon_btn: number;
    rebuy_recommendation: number;
    catalog_product: number;
    footer_link: number;
    terms_link: number;
    floating_varietale_btn: number;
  };

  // Bloque B: Fidelización y Top Usuarios
  topActiveUsers: EnrichedUserRecord[];
  retentionFunnel: {
    zeroTastings: number;
    oneToThreeTastings: number;
    fourPlusTastings: number;
  };
  recentUsers: EnrichedUserRecord[];
  recentTastings: {
    tasting: TastingRecord;
    userName: string;
    username: string;
  }[];

  // Bloque C: Inteligencia Sensorial (Rueda SCA)
  macroFamiliesStats: {
    macro: MacroProfile;
    count: number;
    percentage: number;
    avgRating: number;
  }[];
  topSpecificFlavorsByCount: {
    id: string;
    label: string;
    macro: string;
    color: string;
    count: number;
    avgRating: number;
    avgIntensity: number;
  }[];
  topSpecificFlavorsByRating: {
    id: string;
    label: string;
    macro: string;
    color: string;
    count: number;
    avgRating: number;
    avgIntensity: number;
  }[];

  // Bloque D: Producto, Competencia y Preparación
  topCoffees: {
    coffeeName: string;
    brand: string;
    count: number;
    avgRating: number;
  }[];
  brandShare: {
    varietaleCount: number;
    varietalePct: number;
    varietaleAvgRating: number;
    otherBrandsCount: number;
    otherBrandsPct: number;
    otherBrandsAvgRating: number;
    competitorBrandsList: {
      brand: string;
      count: number;
      avgRating: number;
    }[];
  };
  topVarieties: { name: string; count: number; avgRating: number }[];
  topProcesses: { name: string; count: number; avgRating: number }[];
  topOrigins: { name: string; count: number; avgRating: number }[];
  brewMethodsRanking: {
    methodId: BrewMethod;
    methodName: string;
    count: number;
    percentage: number;
    avgRating: number;
  }[];
  bodyDistribution: {
    ligero: number;
    medio: number;
    denso: number;
  };

  // Bloque E: Cupón, Recompra y Viralidad / PWA
  couponCopiesCount: number;
  couponClicksCount: number;
  rebuyRecommendationsClicks: number;
  rebuyByCoffee: { coffeeName: string; clicks: number }[];
  sharesTotal: number;
  sharesByChannel: {
    whatsapp: number;
    copy_link: number;
    native_share: number;
  };
  pwaInstalledUsersCount: number;
  browserUsersCount: number;

  // Muro de Reseñas Reales
  allReviewsWithNotes: {
    tasting: TastingRecord;
    userName: string;
    username: string;
  }[];
}

export const computeAdminDashboardStats = (): AdminDashboardStats => {
  const users = getEnrichedUsersDirectory();
  const redirects = getVarietaleRedirectEvents();
  const shares = getAppShareEvents();
  const couponCopies = getCouponCopyEvents();

  const now = Date.now();
  const ms7Days = 7 * 24 * 60 * 60 * 1000;
  const ms30Days = 30 * 24 * 60 * 60 * 1000;

  let usersLast7Days = 0;
  let usersLast30Days = 0;
  let googleUsersCount = 0;
  let emailUsersCount = 0;

  users.forEach((u) => {
    if (u.account.authProvider === "google") googleUsersCount++;
    else emailUsersCount++;

    const createdMs = Date.parse(u.account.createdAt);
    if (!isNaN(createdMs)) {
      if (now - createdMs <= ms7Days) usersLast7Days++;
      if (now - createdMs <= ms30Days) usersLast30Days++;
    }
  });

  // Todas las cataciones de usuarios registrados
  const allTastingsWithUser: {
    tasting: TastingRecord;
    userName: string;
    username: string;
  }[] = [];

  users.forEach((u) => {
    u.tastings.forEach((t) => {
      allTastingsWithUser.push({
        tasting: t,
        userName: u.account.name,
        username: u.account.username,
      });
    });
  });

  // Ordenar catas por fecha descendente
  allTastingsWithUser.sort((a, b) => {
    const tA = Date.parse(a.tasting.createdAt) || 0;
    const tB = Date.parse(b.tasting.createdAt) || 0;
    return tB - tA;
  });

  const totalUsers = users.length;
  const totalTastings = allTastingsWithUser.length;
  const avgTastingsPerUser =
    totalUsers > 0 ? Number((totalTastings / totalUsers).toFixed(1)) : 0;

  const globalAvgRating =
    totalTastings > 0
      ? Number(
          (
            allTastingsWithUser.reduce((s, item) => s + (item.tasting.rating || 0), 0) /
            totalTastings
          ).toFixed(2)
        )
      : 0;

  // Desglose de redirecciones
  const redirectsBySource = {
    home_store_btn: 0,
    welcome_coupon_btn: 0,
    rebuy_recommendation: 0,
    catalog_product: 0,
    footer_link: 0,
    terms_link: 0,
    floating_varietale_btn: 0,
  };

  const rebuyCoffeeMap: Record<string, number> = {};

  redirects.forEach((r) => {
    if (r.source in redirectsBySource) {
      redirectsBySource[r.source]++;
    }
    if (r.source === "rebuy_recommendation" && r.label) {
      rebuyCoffeeMap[r.label] = (rebuyCoffeeMap[r.label] || 0) + 1;
    }
  });

  const rebuyByCoffee = Object.entries(rebuyCoffeeMap)
    .map(([coffeeName, clicks]) => ({ coffeeName, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  // Ranking de usuarios más activos
  const topActiveUsers = [...users].sort((a, b) => {
    if (b.tastingsCount !== a.tastingsCount) return b.tastingsCount - a.tastingsCount;
    return b.redirectsCount - a.redirectsCount;
  });

  // Embudo de fidelización
  const retentionFunnel = {
    zeroTastings: users.filter((u) => u.tastingsCount === 0).length,
    oneToThreeTastings: users.filter(
      (u) => u.tastingsCount >= 1 && u.tastingsCount <= 3
    ).length,
    fourPlusTastings: users.filter((u) => u.tastingsCount >= 4).length,
  };

  const recentUsers = [...users]
    .sort((a, b) => {
      const dA = Date.parse(a.account.createdAt) || 0;
      const dB = Date.parse(b.account.createdAt) || 0;
      return dB - dA;
    })
    .slice(0, 5);

  const recentTastings = allTastingsWithUser.slice(0, 5);

  // Bloque C: Inteligencia Sensorial (9 Macro-familias y 85 Descriptores)
  const canonicalMacros: MacroProfile[] = [
    "Frutal",
    "Dulce",
    "Frutos secos / cacao",
    "Floral",
    "Especias",
    "Tostado",
    "Ácido / fermentado",
    "Verde / vegetal",
    "Otros",
  ];

  const macroMap: Record<string, { count: number; ratingSum: number }> = {};
  canonicalMacros.forEach((m) => {
    macroMap[m] = { count: 0, ratingSum: 0 };
  });

  const descriptorStatsMap: Record<
    string,
    {
      id: string;
      label: string;
      macro: string;
      color: string;
      count: number;
      ratingSum: number;
      intensitySum: number;
    }
  > = {};

  let totalFlavorSelections = 0;

  allTastingsWithUser.forEach(({ tasting }) => {
    const cataRating = tasting.rating || 4;
    (tasting.selectedFlavors || []).forEach((flv) => {
      totalFlavorSelections++;
      const normMacro = normalizeMacro(flv.macro);
      if (!macroMap[normMacro]) {
        macroMap[normMacro] = { count: 0, ratingSum: 0 };
      }
      macroMap[normMacro].count++;
      macroMap[normMacro].ratingSum += cataRating;

      const descObj = FLAVOR_DESCRIPTORS.find((d) => d.id === flv.descriptorId);
      const displayLabel = descObj
        ? getDescriptorDisplay(descObj).fullLabel
        : flv.name;

      if (!descriptorStatsMap[flv.descriptorId]) {
        descriptorStatsMap[flv.descriptorId] = {
          id: flv.descriptorId,
          label: displayLabel,
          macro: normMacro,
          color: descObj?.color || "#01374C",
          count: 0,
          ratingSum: 0,
          intensitySum: 0,
        };
      }
      descriptorStatsMap[flv.descriptorId].count++;
      descriptorStatsMap[flv.descriptorId].ratingSum += cataRating;
      descriptorStatsMap[flv.descriptorId].intensitySum += flv.intensity || 3;
    });
  });

  const macroFamiliesStats = canonicalMacros
    .map((macro) => {
      const entry = macroMap[macro] || { count: 0, ratingSum: 0 };
      const percentage =
        totalFlavorSelections > 0
          ? Math.round((entry.count / totalFlavorSelections) * 100)
          : 0;
      const avgRating =
        entry.count > 0
          ? Number((entry.ratingSum / entry.count).toFixed(2))
          : 0;
      return {
        macro,
        count: entry.count,
        percentage,
        avgRating,
      };
    })
    .sort((a, b) => b.count - a.count);

  const allDescriptorsArray = Object.values(descriptorStatsMap).map((d) => ({
    id: d.id,
    label: d.label,
    macro: d.macro,
    color: d.color,
    count: d.count,
    avgRating: Number((d.ratingSum / d.count).toFixed(2)),
    avgIntensity: Number((d.intensitySum / d.count).toFixed(1)),
  }));

  const topSpecificFlavorsByCount = [...allDescriptorsArray]
    .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating)
    .slice(0, 10);

  const topSpecificFlavorsByRating = [...allDescriptorsArray]
    .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count)
    .slice(0, 10);

  // Bloque D: Cafés, Marcas, Variedades, Procesos, Orígenes y Métodos
  const coffeeStatsMap: Record<
    string,
    { coffeeName: string; brand: string; count: number; ratingSum: number }
  > = {};

  let varietaleCount = 0;
  let varietaleRatingSum = 0;
  let otherBrandsCount = 0;
  let otherBrandsRatingSum = 0;
  const competitorMap: Record<string, { count: number; ratingSum: number }> = {};

  const varietyMap: Record<string, { count: number; ratingSum: number }> = {};
  const processMap: Record<string, { count: number; ratingSum: number }> = {};
  const originMap: Record<string, { count: number; ratingSum: number }> = {};
  const methodMap: Record<string, { count: number; ratingSum: number }> = {};
  const bodyDistribution = { ligero: 0, medio: 0, denso: 0 };

  allTastingsWithUser.forEach(({ tasting }) => {
    const rating = tasting.rating || 4;
    const rawBrand = (tasting.brand || "VARIETALE").trim();
    const isVarietale =
      rawBrand.toUpperCase() === "VARIETALE" ||
      rawBrand.toUpperCase().includes("VARIETALE");

    if (isVarietale) {
      varietaleCount++;
      varietaleRatingSum += rating;
    } else {
      otherBrandsCount++;
      otherBrandsRatingSum += rating;
      const compKey = rawBrand;
      if (!competitorMap[compKey]) competitorMap[compKey] = { count: 0, ratingSum: 0 };
      competitorMap[compKey].count++;
      competitorMap[compKey].ratingSum += rating;
    }

    // Café
    const cName = (tasting.coffeeName || "Café Especial").trim();
    const cKey = `${cName.toLowerCase()}__${rawBrand.toLowerCase()}`;
    if (!coffeeStatsMap[cKey]) {
      coffeeStatsMap[cKey] = {
        coffeeName: cName,
        brand: isVarietale ? "VARIETALE" : rawBrand,
        count: 0,
        ratingSum: 0,
      };
    }
    coffeeStatsMap[cKey].count++;
    coffeeStatsMap[cKey].ratingSum += rating;

    // Variedad (soporta blends separados por coma o +)
    if (tasting.variety && tasting.variety.trim()) {
      const parts = tasting.variety
        .split(/[,+/]/)
        .map((s) => s.trim())
        .filter(Boolean);
      parts.forEach((v) => {
        if (!varietyMap[v]) varietyMap[v] = { count: 0, ratingSum: 0 };
        varietyMap[v].count++;
        varietyMap[v].ratingSum += rating;
      });
    }

    // Beneficio
    if (tasting.process && tasting.process.trim()) {
      const p = tasting.process.trim();
      if (!processMap[p]) processMap[p] = { count: 0, ratingSum: 0 };
      processMap[p].count++;
      processMap[p].ratingSum += rating;
    }

    // Origen (Departamento o Origen)
    const orig = (tasting.department || tasting.origin || tasting.country || "").trim();
    if (orig) {
      if (!originMap[orig]) originMap[orig] = { count: 0, ratingSum: 0 };
      originMap[orig].count++;
      originMap[orig].ratingSum += rating;
    }

    // Método
    const m = tasting.brewMethod || "v60";
    if (!methodMap[m]) methodMap[m] = { count: 0, ratingSum: 0 };
    methodMap[m].count++;
    methodMap[m].ratingSum += rating;

    // Cuerpo
    if (tasting.bodyLevel === 1) bodyDistribution.ligero++;
    else if (tasting.bodyLevel === 3) bodyDistribution.denso++;
    else bodyDistribution.medio++;
  });

  const topCoffees = Object.values(coffeeStatsMap)
    .map((c) => ({
      coffeeName: c.coffeeName,
      brand: c.brand,
      count: c.count,
      avgRating: Number((c.ratingSum / c.count).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating)
    .slice(0, 10);

  const competitorBrandsList = Object.entries(competitorMap)
    .map(([brand, data]) => ({
      brand,
      count: data.count,
      avgRating: Number((data.ratingSum / data.count).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count);

  const toRankedArray = (map: Record<string, { count: number; ratingSum: number }>) =>
    Object.entries(map)
      .map(([name, d]) => ({
        name,
        count: d.count,
        avgRating: Number((d.ratingSum / d.count).toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating)
      .slice(0, 8);

  const brewMethodsRanking = Object.entries(methodMap)
    .map(([methodId, d]) => {
      const info = BREW_METHODS.find((b) => b.id === methodId);
      return {
        methodId: methodId as BrewMethod,
        methodName: info?.name || methodId.toUpperCase(),
        count: d.count,
        percentage:
          totalTastings > 0 ? Math.round((d.count / totalTastings) * 100) : 0,
        avgRating: Number((d.ratingSum / d.count).toFixed(2)),
      };
    })
    .sort((a, b) => b.count - a.count);

  // Compartidos por canal
  const sharesByChannel = {
    whatsapp: shares.filter((s) => s.channel === "whatsapp").length,
    copy_link: shares.filter((s) => s.channel === "copy_link").length,
    native_share: shares.filter((s) => s.channel === "native_share").length,
  };

  const pwaInstalledUsersCount = users.filter((u) => u.isStandalonePwa).length;
  const browserUsersCount = Math.max(0, totalUsers - pwaInstalledUsersCount);

  const allReviewsWithNotes = allTastingsWithUser.filter(
    (item) => item.tasting.userNotes && item.tasting.userNotes.trim().length > 0
  );

  return {
    totalUsers,
    usersLast7Days,
    usersLast30Days,
    googleUsersCount,
    emailUsersCount,
    totalTastings,
    avgTastingsPerUser,
    globalAvgRating,
    totalRedirects: redirects.length,
    redirectsBySource,
    topActiveUsers,
    retentionFunnel,
    recentUsers,
    recentTastings,
    macroFamiliesStats,
    topSpecificFlavorsByCount,
    topSpecificFlavorsByRating,
    topCoffees,
    brandShare: {
      varietaleCount,
      varietalePct:
        totalTastings > 0 ? Math.round((varietaleCount / totalTastings) * 100) : 100,
      varietaleAvgRating:
        varietaleCount > 0
          ? Number((varietaleRatingSum / varietaleCount).toFixed(2))
          : 0,
      otherBrandsCount,
      otherBrandsPct:
        totalTastings > 0 ? Math.round((otherBrandsCount / totalTastings) * 100) : 0,
      otherBrandsAvgRating:
        otherBrandsCount > 0
          ? Number((otherBrandsRatingSum / otherBrandsCount).toFixed(2))
          : 0,
      competitorBrandsList,
    },
    topVarieties: toRankedArray(varietyMap),
    topProcesses: toRankedArray(processMap),
    topOrigins: toRankedArray(originMap),
    brewMethodsRanking,
    bodyDistribution,
    couponCopiesCount: couponCopies.length,
    couponClicksCount: redirectsBySource.welcome_coupon_btn,
    rebuyRecommendationsClicks: redirectsBySource.rebuy_recommendation,
    rebuyByCoffee,
    sharesTotal: shares.length,
    sharesByChannel,
    pwaInstalledUsersCount,
    browserUsersCount,
    allReviewsWithNotes,
  };
};

// ============================================================================
// 6. INTEGRACIONES WEBHOOK (GOOGLE SHEETS & NOTION) Y EXPORTACIÓN
// ============================================================================

export interface WebhookIntegrationsConfig {
  googleSheetsWebhookUrl: string;
  googleSheetsEnabled: boolean;
  notionWebhookUrl: string;
  notionDatabaseId?: string;
  notionEnabled: boolean;
  sendOnNewUser: boolean;
  sendOnNewTasting: boolean;
  sendOnVarietaleRedirect: boolean;
  lastSyncAt?: string;
}

const WEBHOOK_CONFIG_KEY = "varietale_admin_webhooks_config_v1";

export const DEFAULT_WEBHOOK_CONFIG: WebhookIntegrationsConfig = {
  googleSheetsWebhookUrl: "",
  googleSheetsEnabled: false,
  notionWebhookUrl: "",
  notionDatabaseId: "",
  notionEnabled: false,
  sendOnNewUser: true,
  sendOnNewTasting: true,
  sendOnVarietaleRedirect: false,
};

export const getWebhookConfig = (): WebhookIntegrationsConfig => {
  try {
    const raw = localStorage.getItem(WEBHOOK_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_WEBHOOK_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_WEBHOOK_CONFIG };
};

export const saveWebhookConfig = (
  config: WebhookIntegrationsConfig
): WebhookIntegrationsConfig => {
  try {
    localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(config));
  } catch {}
  return config;
};

/**
 * Envía un evento en segundo plano a los Webhooks configurados (Google Sheets / Notion).
 */
export const triggerWebhookInBackground = async (
  eventType: "new_user" | "new_tasting" | "varietale_redirect" | "test_ping" | "bulk_sync",
  payload: unknown
): Promise<{ ok: boolean; details: string }> => {
  const config = getWebhookConfig();

  if (eventType === "new_user" && !config.sendOnNewUser) {
    return { ok: false, details: "Envío de nuevos usuarios desactivado." };
  }
  if (eventType === "new_tasting" && !config.sendOnNewTasting) {
    return { ok: false, details: "Envío de nuevas catas desactivado." };
  }
  if (eventType === "varietale_redirect" && !config.sendOnVarietaleRedirect) {
    return { ok: false, details: "Envío de redirecciones desactivado." };
  }

  const targets: { name: string; url: string }[] = [];
  if (config.googleSheetsEnabled && config.googleSheetsWebhookUrl.trim()) {
    targets.push({ name: "Google Sheets", url: config.googleSheetsWebhookUrl.trim() });
  }
  if (config.notionEnabled && config.notionWebhookUrl.trim()) {
    targets.push({ name: "Notion", url: config.notionWebhookUrl.trim() });
  }

  if (targets.length === 0) {
    return { ok: false, details: "No hay URLs de Webhook activas configuradas." };
  }

  const envelope = {
    app: "Bitácora de Catación Varietale",
    eventType,
    timestamp: new Date().toISOString(),
    notionDatabaseId: config.notionDatabaseId || undefined,
    data: payload,
  };

  // Primero intenta enviar a través del puente backend (/api/admin/webhook-relay) para evitar bloqueos CORS
  try {
    const relayRes = await fetch("/api/admin/webhook-relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets, payload: envelope }),
    });
    if (relayRes.ok) {
      const json = await relayRes.json();
      if (json.ok) {
        saveWebhookConfig({ ...config, lastSyncAt: new Date().toISOString() });
      }
      return { ok: Boolean(json.ok), details: json.details || "Enviado por servidor" };
    }
  } catch {
    // Fallback a envío directo desde el navegador si el servidor no responde
  }

  const results: string[] = [];
  let anySuccess = false;

  for (const target of targets) {
    try {
      await fetch(target.url, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(envelope),
      });
      anySuccess = true;
      results.push(`${target.name}: enviado`);
    } catch (e) {
      results.push(`${target.name}: error de red`);
    }
  }

  if (anySuccess) {
    saveWebhookConfig({ ...config, lastSyncAt: new Date().toISOString() });
  }

  return { ok: anySuccess, details: results.join(" | ") };
};

/** Formatea una fecha ISO a formato legible dd/mm/aaaa hh:mm */
export const formatReadableDate = (isoOrStr?: string, includeTime = false): string => {
  if (!isoOrStr) return "—";
  const ms = Date.parse(isoOrStr);
  if (isNaN(ms)) return isoOrStr;
  const d = new Date(ms);
  const datePart = d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (!includeTime) return datePart;
  const timePart = d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}, ${timePart}`;
};

/**
 * Descarga el Directorio de Catadores (completo, filtrado o seleccionados) en formato CSV compatible con Excel.
 */
export const exportUsersDirectoryToCsv = (
  targetUsers?: EnrichedUserRecord[],
  suffixLabel: string = "Completo"
): void => {
  const users = targetUsers ?? getEnrichedUsersDirectory();
  const headers = [
    "ID Usuario",
    "Nombre Completo",
    "Usuario (@handle)",
    "Correo Electrónico",
    "Teléfono Móvil",
    "Método de Registro",
    "Fecha de Registro",
    "Total Catas Hechas",
    "Cafés Únicos Probados",
    "Calificación Promedio (Estrellas)",
    "Visitas a varietale.com",
    "Veces que Compartió la App",
    "Dispositivo",
    "Instalada como App (PWA)",
  ];

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? "").replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = users.map((u) => [
    escapeCsv(u.account.id),
    escapeCsv(u.account.name),
    escapeCsv(`@${u.account.username}`),
    escapeCsv(u.account.email),
    escapeCsv(u.account.phone || ""),
    escapeCsv(u.account.authProvider === "google" ? "Google" : "Correo"),
    escapeCsv(formatReadableDate(u.account.createdAt, true)),
    escapeCsv(u.tastingsCount),
    escapeCsv(u.uniqueCoffeesCount),
    escapeCsv(u.avgRating),
    escapeCsv(u.redirectsCount),
    escapeCsv(u.sharesCount),
    escapeCsv(u.platform),
    escapeCsv(u.isStandalonePwa ? "Sí" : "No"),
  ]);

  const csvContent =
    "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Catadores_Varietale_${suffixLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Descarga el Directorio de Catadores (completo, filtrado o seleccionados) como libro nativo de Excel (.xls) con tabla estilizada.
 */
export const exportUsersDirectoryToExcel = (
  targetUsers?: EnrichedUserRecord[],
  suffixLabel: string = "Completo"
): void => {
  const users = targetUsers ?? getEnrichedUsersDirectory();
  const escapeHtml = (val: unknown): string =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rowsHtml = users
    .map(
      (u, idx) => `
      <tr style="background-color:${idx % 2 === 0 ? "#FFFFFF" : "#F5F8FA"};">
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(u.account.id)}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;font-weight:bold;">${escapeHtml(u.account.name)}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">@${escapeHtml(u.account.username)}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(u.account.email)}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;mso-number-format:'\\@';">${escapeHtml(u.account.phone || "—")}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${u.account.authProvider === "google" ? "Google" : "Correo"}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(formatReadableDate(u.account.createdAt, true))}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;font-weight:bold;">${u.tastingsCount}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;">${u.uniqueCoffeesCount}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;">${u.avgRating || 0}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;">${u.redirectsCount}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;">${u.sharesCount}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(u.platform)}</td>
        <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;">${u.isStandalonePwa ? "Sí" : "No"}</td>
      </tr>`
    )
    .join("");

  const excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Directorio Catadores</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  </head>
  <body style="font-family:Arial,sans-serif;font-size:12px;color:#01374C;">
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead>
        <tr style="background-color:#01374C;color:#FFFFFF;font-weight:bold;">
          <th style="padding:8px 12px;">ID Usuario</th>
          <th style="padding:8px 12px;">Nombre Completo</th>
          <th style="padding:8px 12px;">Usuario (@handle)</th>
          <th style="padding:8px 12px;">Correo Electrónico</th>
          <th style="padding:8px 12px;">Teléfono Móvil</th>
          <th style="padding:8px 12px;">Método Registro</th>
          <th style="padding:8px 12px;">Fecha de Registro</th>
          <th style="padding:8px 12px;">Catas Hechas</th>
          <th style="padding:8px 12px;">Cafés Únicos</th>
          <th style="padding:8px 12px;">Promedio (★)</th>
          <th style="padding:8px 12px;">Visitas a varietale.com</th>
          <th style="padding:8px 12px;">Compartidos</th>
          <th style="padding:8px 12px;">Dispositivo</th>
          <th style="padding:8px 12px;">App Instalada (PWA)</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </body>
</html>`;

  const blob = new Blob(["\uFEFF" + excelHtml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Catadores_Varietale_${suffixLabel}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Descarga las Cataciones registradas (de todos los usuarios o de los seleccionados) en formato CSV.
 */
export const exportAllTastingsToCsv = (
  targetUsers?: EnrichedUserRecord[],
  suffixLabel: string = "Completo"
): void => {
  const users = targetUsers ?? getEnrichedUsersDirectory();
  const headers = [
    "ID Cata",
    "Fecha",
    "Catador",
    "Usuario",
    "Marca",
    "Nombre del Café",
    "País",
    "Departamento / Origen",
    "Finca",
    "Caficultor",
    "Variedad",
    "Beneficio",
    "Altura",
    "Método de Preparación",
    "Cuerpo",
    "Calificación (Estrellas)",
    "Sabores Percibidos",
    "Notas / Comentarios del Catador",
  ];

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? "").replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[][] = [];
  users.forEach((u) => {
    u.tastings.forEach((t) => {
      const flavorsText = (t.selectedFlavors || [])
        .map((f) => `${f.name} (${f.intensity}★)`)
        .join("; ");
      const bodyText =
        t.bodyLevel === 1 ? "Ligero" : t.bodyLevel === 3 ? "Denso" : "Medio";

      rows.push([
        escapeCsv(t.id),
        escapeCsv(formatReadableDate(t.createdAt, true)),
        escapeCsv(u.account.name),
        escapeCsv(`@${u.account.username}`),
        escapeCsv(t.brand || "VARIETALE"),
        escapeCsv(t.coffeeName),
        escapeCsv(t.country || "Colombia"),
        escapeCsv(t.department || t.origin || ""),
        escapeCsv(t.farmName || ""),
        escapeCsv(t.farmerName || ""),
        escapeCsv(t.variety || ""),
        escapeCsv(t.process || ""),
        escapeCsv(t.altitude || ""),
        escapeCsv(t.brewMethod.toUpperCase()),
        escapeCsv(bodyText),
        escapeCsv(t.rating),
        escapeCsv(flavorsText),
        escapeCsv(t.userNotes || ""),
      ]);
    });
  });

  const csvContent =
    "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Cataciones_Varietale_${suffixLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Descarga las Cataciones registradas (de todos los usuarios o de los seleccionados) como libro nativo de Excel (.xls).
 */
export const exportAllTastingsToExcel = (
  targetUsers?: EnrichedUserRecord[],
  suffixLabel: string = "Completo"
): void => {
  const users = targetUsers ?? getEnrichedUsersDirectory();
  const escapeHtml = (val: unknown): string =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rowsHtmlList: string[] = [];
  let rowIndex = 0;

  users.forEach((u) => {
    u.tastings.forEach((t) => {
      const flavorsText = (t.selectedFlavors || [])
        .map((f) => `${f.name} (${f.intensity}★)`)
        .join(", ");
      const bodyText =
        t.bodyLevel === 1 ? "Ligero" : t.bodyLevel === 3 ? "Denso" : "Medio";
      const bg = rowIndex % 2 === 0 ? "#FFFFFF" : "#F5F8FA";
      rowIndex++;

      rowsHtmlList.push(`
        <tr style="background-color:${bg};">
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.id)}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(formatReadableDate(t.createdAt, true))}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;font-weight:bold;">${escapeHtml(u.account.name)}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">@${escapeHtml(u.account.username)}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;font-weight:bold;">${escapeHtml(t.brand || "VARIETALE")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.coffeeName)}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.country || "Colombia")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.department || t.origin || "")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.farmName || "")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.farmerName || "")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.variety || "")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.process || "")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.altitude || "")}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;">${escapeHtml(t.brewMethod.toUpperCase())}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;">${escapeHtml(bodyText)}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;text-align:center;font-weight:bold;">${t.rating}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(flavorsText)}</td>
          <td style="padding:6px 10px;border:1px solid #D5DFE5;">${escapeHtml(t.userNotes || "")}</td>
        </tr>`);
    });
  });

  const excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8" />
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Historial Cataciones</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  </head>
  <body style="font-family:Arial,sans-serif;font-size:12px;color:#01374C;">
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead>
        <tr style="background-color:#01374C;color:#FFFFFF;font-weight:bold;">
          <th style="padding:8px 12px;">ID Cata</th>
          <th style="padding:8px 12px;">Fecha</th>
          <th style="padding:8px 12px;">Catador</th>
          <th style="padding:8px 12px;">Usuario</th>
          <th style="padding:8px 12px;">Marca</th>
          <th style="padding:8px 12px;">Nombre del Café</th>
          <th style="padding:8px 12px;">País</th>
          <th style="padding:8px 12px;">Departamento / Origen</th>
          <th style="padding:8px 12px;">Finca</th>
          <th style="padding:8px 12px;">Caficultor</th>
          <th style="padding:8px 12px;">Variedad</th>
          <th style="padding:8px 12px;">Beneficio</th>
          <th style="padding:8px 12px;">Altura</th>
          <th style="padding:8px 12px;">Método</th>
          <th style="padding:8px 12px;">Cuerpo</th>
          <th style="padding:8px 12px;">Calificación (★)</th>
          <th style="padding:8px 12px;">Sabores Percibidos</th>
          <th style="padding:8px 12px;">Notas del Catador</th>
        </tr>
      </thead>
      <tbody>${rowsHtmlList.join("")}</tbody>
    </table>
  </body>
</html>`;

  const blob = new Blob(["\uFEFF" + excelHtml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Cataciones_Varietale_${suffixLabel}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Descarga una copia de seguridad completa (Backup JSON) de toda la base de datos de Mi Bitácora.
 */
export const exportFullDatabaseBackupJson = (): void => {
  const users = getEnrichedUsersDirectory();
  let uiCmsState: unknown = null;
  try {
    const rawCms = localStorage.getItem("varietale_admin_ui_cms_v1");
    if (rawCms) uiCmsState = JSON.parse(rawCms);
  } catch {}

  const backupData = {
    app: "Bitácora de Catación Varietale",
    backupVersion: "1.1",
    exportedAt: new Date().toISOString(),
    accounts: getStoredAccounts(),
    userTastings: Object.fromEntries(
      users.map((u) => [getTastingsKeyForAccount(u.account), u.tastings])
    ),
    telemetry: {
      redirects: getVarietaleRedirectEvents(),
      shares: getAppShareEvents(),
      couponCopies: getCouponCopyEvents(),
      deviceMeta: getUserDeviceMetaMap(),
    },
    welcomeCouponConfig: getWelcomeCouponConfig(),
    webhookConfig: getWebhookConfig(),
    uiCmsState,
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Backup_Bitacora_Varietale_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Restaura una copia de seguridad completa desde un archivo JSON.
 */
export const importFullDatabaseBackupJson = (jsonString: string): {
  ok: boolean;
  message: string;
} => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.accounts)) {
      return { ok: false, message: "El archivo no tiene un formato de respaldo válido." };
    }

    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(parsed.accounts));

    if (parsed.userTastings && typeof parsed.userTastings === "object") {
      Object.entries(parsed.userTastings).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          localStorage.setItem(key, JSON.stringify(val));
        }
      });
    }

    if (parsed.telemetry) {
      if (Array.isArray(parsed.telemetry.redirects)) {
        localStorage.setItem(REDIRECT_EVENTS_KEY, JSON.stringify(parsed.telemetry.redirects));
      }
      if (Array.isArray(parsed.telemetry.shares)) {
        localStorage.setItem(SHARE_EVENTS_KEY, JSON.stringify(parsed.telemetry.shares));
      }
      if (Array.isArray(parsed.telemetry.couponCopies)) {
        localStorage.setItem(COUPON_EVENTS_KEY, JSON.stringify(parsed.telemetry.couponCopies));
      }
      if (parsed.telemetry.deviceMeta) {
        localStorage.setItem(USER_META_KEY, JSON.stringify(parsed.telemetry.deviceMeta));
      }
    }

    if (parsed.welcomeCouponConfig) {
      saveWelcomeCouponConfig(parsed.welcomeCouponConfig);
    }
    if (parsed.webhookConfig) {
      saveWebhookConfig(parsed.webhookConfig);
    }
    if (parsed.uiCmsState && typeof parsed.uiCmsState === "object") {
      localStorage.setItem("varietale_admin_ui_cms_v1", JSON.stringify(parsed.uiCmsState));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("varietale-ui-cms-updated"));
      }
    }

    return {
      ok: true,
      message: `Respaldo restaurado con éxito (${parsed.accounts.length} cuentas recuperadas).`,
    };
  } catch (e) {
    return { ok: false, message: "Error al leer el archivo JSON de respaldo." };
  }
};

// ============================================================================
// 11. SIMULADOR TEMPORAL DE 20 USUARIOS Y CATACIONES (FUNCIONAMIENTO REAL)
// ============================================================================

/**
 * Verifica si actualmente hay datos de la simulación temporal cargados en localStorage.
 */
export const isSimulationDataLoaded = (): boolean => {
  try {
    const accounts = getStoredAccounts();
    return accounts.some((acc) => acc.id.startsWith("sim-user-"));
  } catch {
    return false;
  }
};

/**
 * Elimina únicamente los 20 usuarios simulados, sus catas y sus eventos de telemetría,
 * conservando intacto cualquier usuario real o configuración del administrador.
 */
export const clearSimulatedAdminData = (): { usersRemoved: number } => {
  try {
    const accounts = getStoredAccounts();
    const simAccounts = accounts.filter((acc) => acc.id.startsWith("sim-user-"));
    const realAccounts = accounts.filter((acc) => !acc.id.startsWith("sim-user-"));

    // 1. Eliminar las catas almacenadas de cada usuario simulado
    simAccounts.forEach((acc) => {
      const key = getTastingsKeyForAccount(acc);
      localStorage.removeItem(key);
    });

    // 2. Guardar solo cuentas reales
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(realAccounts));

    // 3. Limpiar metadatos de dispositivo de los usuarios simulados
    const metaMap = getUserDeviceMetaMap();
    const simUsernames = new Set(simAccounts.map((a) => (a.username || "").toLowerCase()));
    const simEmails = new Set(simAccounts.map((a) => (a.email || "").toLowerCase()));
    Object.keys(metaMap).forEach((key) => {
      const entry = metaMap[key];
      if (
        key.startsWith("sim-user-") ||
        simUsernames.has(key) ||
        simEmails.has(key) ||
        (entry && entry.userId && entry.userId.startsWith("sim-user-"))
      ) {
        delete metaMap[key];
      }
    });
    localStorage.setItem(USER_META_KEY, JSON.stringify(metaMap));

    // 4. Filtrar eventos de telemetría simulados
    const redirects = getVarietaleRedirectEvents().filter(
      (ev) => !ev.id.startsWith("sim-")
    );
    localStorage.setItem(REDIRECT_EVENTS_KEY, JSON.stringify(redirects));

    const shares = getAppShareEvents().filter((ev) => !ev.id.startsWith("sim-"));
    localStorage.setItem(SHARE_EVENTS_KEY, JSON.stringify(shares));

    const coupons = getCouponCopyEvents().filter((ev) => !ev.id.startsWith("sim-"));
    localStorage.setItem(COUPON_EVENTS_KEY, JSON.stringify(coupons));

    return { usersRemoved: simAccounts.length };
  } catch (e) {
    console.error("Error limpiando datos simulados:", e);
    return { usersRemoved: 0 };
  }
};

/**
 * Genera 20 cuentas de usuario 100% funcionales en localStorage, 68 cataciones reales
 * (con descriptores reales de FLAVOR_DESCRIPTORS en las 9 familias SCA, métodos oficiales,
 * calificaciones desde 1★ hasta 5★ con reseñas escritas, cafés Varietale y competencia)
 * y eventos de telemetría reales para validar cada módulo del Panel de Administración.
 */
export const seedSimulatedAdminData = (): {
  usersCreated: number;
  tastingsCreated: number;
  redirectsCreated: number;
  sharesCreated: number;
} => {
  // Limpia cualquier simulación previa para evitar duplicados
  clearSimulatedAdminData();

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const simProfiles: {
    id: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    pin: string;
    provider: "google" | "email";
    daysAgoCreated: number;
    tastingsCount: number;
    isPwa: boolean;
    platform: "iOS" | "Android" | "Escritorio";
    avatarColor: string;
  }[] = [
    { id: "sim-user-01", name: "Camila Restrepo", username: "camila.restrepo", email: "camila.restrepo@gmail.com", phone: "+57 310 452 8910", pin: "4821", provider: "google", daysAgoCreated: 26, tastingsCount: 9, isPwa: true, platform: "iOS", avatarColor: "#01374C" },
    { id: "sim-user-02", name: "Santiago Mejía", username: "santi.mejia", email: "santiago.mejia@outlook.com", phone: "+57 315 892 3341", pin: "9014", provider: "email", daysAgoCreated: 24, tastingsCount: 8, isPwa: true, platform: "Android", avatarColor: "#006B5B" },
    { id: "sim-user-03", name: "Valentina Gómez", username: "valen.gomez", email: "valen.gomez@gmail.com", phone: "+57 300 712 4590", pin: "3318", provider: "google", daysAgoCreated: 21, tastingsCount: 7, isPwa: true, platform: "iOS", avatarColor: "#9B1B47" },
    { id: "sim-user-04", name: "Andrés Felipe Toro", username: "andres.toro", email: "andres.toro@uniandes.edu.co", phone: "+57 311 634 7822", pin: "7742", provider: "google", daysAgoCreated: 19, tastingsCount: 6, isPwa: true, platform: "iOS", avatarColor: "#1E4D6B" },
    { id: "sim-user-05", name: "Laura Daniela Vélez", username: "laura.velez", email: "laura.velez@gmail.com", phone: "+57 320 519 6023", pin: "5590", provider: "email", daysAgoCreated: 18, tastingsCount: 5, isPwa: true, platform: "Android", avatarColor: "#B35900" },
    { id: "sim-user-06", name: "Juan Pablo Ospina", username: "jp.ospina", email: "jpospina@gmail.com", phone: "+57 314 290 1184", pin: "1209", provider: "google", daysAgoCreated: 16, tastingsCount: 5, isPwa: false, platform: "Escritorio", avatarColor: "#3D2B56" },
    { id: "sim-user-07", name: "Natalia Arango", username: "nati.arango", email: "natalia.arango@hotmail.com", phone: "+57 318 441 9087", pin: "6403", provider: "email", daysAgoCreated: 15, tastingsCount: 4, isPwa: true, platform: "iOS", avatarColor: "#007A78" },
    { id: "sim-user-08", name: "Mateo Londoño", username: "mateo.londono", email: "mateo.londono@gmail.com", phone: "+57 301 998 2345", pin: "8155", provider: "google", daysAgoCreated: 14, tastingsCount: 4, isPwa: true, platform: "Android", avatarColor: "#5C3A21" },
    { id: "sim-user-09", name: "Carolina Botero", username: "caro.botero", email: "carolina.botero@gmail.com", phone: "+57 312 876 5432", pin: "2940", provider: "google", daysAgoCreated: 12, tastingsCount: 3, isPwa: false, platform: "iOS", avatarColor: "#2C5E3B" },
    { id: "sim-user-10", name: "Sebastián Cardona", username: "sebas.cardona", email: "sebas.cardona@yahoo.com", phone: "+57 316 334 5567", pin: "7081", provider: "email", daysAgoCreated: 10, tastingsCount: 3, isPwa: true, platform: "Android", avatarColor: "#8C2D19" },
    { id: "sim-user-11", name: "Mariana Salazar", username: "mariana.salazar", email: "mariana.salazar@gmail.com", phone: "+57 304 567 8901", pin: "4112", provider: "google", daysAgoCreated: 9, tastingsCount: 3, isPwa: false, platform: "Escritorio", avatarColor: "#01374C" },
    { id: "sim-user-12", name: "Daniel Alejandro Ruiz", username: "dani.ruiz", email: "daniel.ruiz@gmail.com", phone: "+57 317 654 3210", pin: "9923", provider: "email", daysAgoCreated: 7, tastingsCount: 2, isPwa: false, platform: "Android", avatarColor: "#4A4E69" },
    { id: "sim-user-13", name: "Juliana Vargas", username: "juli.vargas", email: "juliana.vargas@gmail.com", phone: "+57 313 221 4455", pin: "5376", provider: "google", daysAgoCreated: 6, tastingsCount: 2, isPwa: true, platform: "iOS", avatarColor: "#7F4F24" },
    { id: "sim-user-14", name: "Alejandro Morales", username: "alejo.morales", email: "alejo.morales@outlook.com", phone: "+57 321 789 0123", pin: "6689", provider: "email", daysAgoCreated: 5, tastingsCount: 2, isPwa: false, platform: "Escritorio", avatarColor: "#005F73" },
    { id: "sim-user-15", name: "Paula Andrea Castro", username: "paula.castro", email: "paula.castro@gmail.com", phone: "+57 302 345 6789", pin: "1844", provider: "google", daysAgoCreated: 4, tastingsCount: 2, isPwa: true, platform: "iOS", avatarColor: "#9B2226" },
    { id: "sim-user-16", name: "Nicolás Hernández", username: "nico.hernandez", email: "nico.hernandez@gmail.com", phone: "+57 319 876 1234", pin: "3075", provider: "google", daysAgoCreated: 3, tastingsCount: 1, isPwa: false, platform: "Android", avatarColor: "#386641" },
    { id: "sim-user-17", name: "Isabella Quintero", username: "isa.quintero", email: "isabella.q@gmail.com", phone: "+57 310 991 8822", pin: "8561", provider: "email", daysAgoCreated: 2, tastingsCount: 1, isPwa: false, platform: "iOS", avatarColor: "#6D597A" },
    { id: "sim-user-18", name: "Esteban Jaramillo", username: "esteban.j", email: "esteban.jaramillo@gmail.com", phone: "+57 315 112 3344", pin: "2468", provider: "google", daysAgoCreated: 2, tastingsCount: 0, isPwa: false, platform: "Android", avatarColor: "#355070" },
    { id: "sim-user-19", name: "Gabriela Patiño", username: "gaby.patino", email: "gabriela.patino@gmail.com", phone: "+57 300 445 6677", pin: "7531", provider: "google", daysAgoCreated: 1, tastingsCount: 0, isPwa: true, platform: "iOS", avatarColor: "#B56576" },
    { id: "sim-user-20", name: "Tomás Echeverri", username: "tomas.echeverri", email: "tomas.echeverri@hotmail.com", phone: "+57 311 889 7766", pin: "1593", provider: "email", daysAgoCreated: 0, tastingsCount: 0, isPwa: false, platform: "Escritorio", avatarColor: "#01374C" },
  ];

  // Pool de cafés (Varietale oficiales + marcas competidoras para probar la comparativa)
  const coffeePool = [
    { coffeeName: "Varietale Geisha Especial", brand: "VARIETALE", department: "Tolima", origin: "Planadas, Tolima", farmName: "Finca La Cristalina", farmerName: "Don Hernando Rojas", variety: "Geisha", process: "Lavado", altitude: "1950 msnm", isVarietale: true },
    { coffeeName: "Varietale Bourbon Rosado", brand: "VARIETALE", department: "Huila", origin: "Palestina, Huila", farmName: "Finca El Mirador", farmerName: "Familia Meneses", variety: "Bourbon Rosado", process: "Honey", altitude: "1850 msnm", isVarietale: true },
    { coffeeName: "Varietale Tabi Natural", brand: "VARIETALE", department: "Huila", origin: "Pitalito, Huila", farmName: "Finca Las Flores", farmerName: "Jhonatan Gasca", variety: "Tabi", process: "Natural", altitude: "1800 msnm", isVarietale: true },
    { coffeeName: "Varietale Caturra Chiroso", brand: "VARIETALE", department: "Antioquia", origin: "Urrao, Antioquia", farmName: "Finca El Roble", farmerName: "Carlos Caro", variety: "Caturra", process: "Lavado", altitude: "2000 msnm", isVarietale: true },
    { coffeeName: "Varietale Pacamara Honey", brand: "VARIETALE", department: "Caldas", origin: "Manizales, Caldas", farmName: "Hacienda Venecia", farmerName: "Juan Guillermo", variety: "Pacamara", process: "Honey", altitude: "1780 msnm", isVarietale: true },
    { coffeeName: "Varietale Castillo de Origen", brand: "VARIETALE", department: "Quindío", origin: "Génova, Quindío", farmName: "Finca Buenos Aires", farmerName: "Luis Fernando Giraldo", variety: "Castillo", process: "Lavado", altitude: "1720 msnm", isVarietale: true },
    { coffeeName: "Varietale Blend de la Casa", brand: "VARIETALE", department: "Cundinamarca", origin: "Viotá, Cundinamarca", farmName: "Finca Santa Helena", farmerName: "Asociación Viotá", variety: "Caturra", process: "Lavado", altitude: "1650 msnm", isVarietale: true },
    { coffeeName: "Varietale Wush Wush Exótico", brand: "VARIETALE", department: "Huila", origin: "Acevedo, Huila", farmName: "Finca El Diviso", farmerName: "Néstor Lasso", variety: "Wush Wush", process: "Natural", altitude: "1900 msnm", isVarietale: true },
    // Competencia (~20% de las catas)
    { coffeeName: "Reserva Especial Quindío", brand: "San Alberto", department: "Quindío", origin: "Buenavista, Quindío", farmName: "Hacienda San Alberto", farmerName: "", variety: "Caturra", process: "Lavado", altitude: "1700 msnm", isVarietale: false },
    { coffeeName: "Rocko Mountain Natural", brand: "Libertario Coffee", department: "Huila", origin: "San Agustín, Huila", farmName: "Finca El Paraíso", farmerName: "", variety: "Castillo", process: "Natural", altitude: "1750 msnm", isVarietale: false },
    { coffeeName: "Lote Especial Tolima", brand: "Amor Perfecto", department: "Tolima", origin: "Ibagué, Tolima", farmName: "Finca La Pradera", farmerName: "", variety: "Tabi", process: "Honey", altitude: "1800 msnm", isVarietale: false },
    { coffeeName: "Loma Verde Caicedo", brand: "Pergamino Café", department: "Antioquia", origin: "Caicedo, Antioquia", farmName: "Finca Loma Verde", farmerName: "", variety: "Bourbon", process: "Lavado", altitude: "1850 msnm", isVarietale: false },
    { coffeeName: "Pedregal Cauca", brand: "Colo Coffee", department: "Cauca", origin: "Inzá, Cauca", farmName: "Finca El Pedregal", farmerName: "", variety: "Caturra", process: "Lavado", altitude: "1900 msnm", isVarietale: false },
  ];

  // Agrupamos los descriptores reales de FLAVOR_DESCRIPTORS por su Macro-familia normalizada
  // para garantizar que el 100% de las selecciones tengan IDs canónicos válidos
  const descriptorsByMacro: Record<string, typeof FLAVOR_DESCRIPTORS> = {};
  FLAVOR_DESCRIPTORS.forEach((d) => {
    const m = normalizeMacro(d.macro);
    if (!descriptorsByMacro[m]) descriptorsByMacro[m] = [];
    descriptorsByMacro[m].push(d);
  });

  const pickDesc = (macro: string, indexOffset: number) => {
    const list = descriptorsByMacro[macro] || FLAVOR_DESCRIPTORS;
    return list[indexOffset % list.length];
  };

  // Perfiles de combinación de sabores reales de la rueda SCA (con diferentes frecuencias y calificaciones)
  const buildRealFlavorCombo = (comboIndex: number, seed: number) => {
    const patterns: { macro: string; offset: number; intensity: number }[][] = [
      // Perfil 0: Frutal + Floral + Dulce (Geisha / Bourbon Rosado - Alta calificación)
      [
        { macro: "Frutal", offset: 0, intensity: 5 }, // Mora
        { macro: "Frutal", offset: 11, intensity: 4 }, // Durazno / Cítrico
        { macro: "Floral", offset: 1, intensity: 5 }, // Jazmín / Rosa
        { macro: "Dulce", offset: 3, intensity: 5 }, // Miel / Caramelo
      ],
      // Perfil 1: Dulce + Frutos secos / cacao + Frutal (Balanceado)
      [
        { macro: "Dulce", offset: 0, intensity: 5 },
        { macro: "Dulce", offset: 2, intensity: 4 },
        { macro: "Frutos secos / cacao", offset: 5, intensity: 5 },
        { macro: "Frutal", offset: 3, intensity: 4 },
      ],
      // Perfil 2: Frutos secos / cacao + Especias + Tostado (Cuerpo denso / Prensa)
      [
        { macro: "Frutos secos / cacao", offset: 4, intensity: 5 },
        { macro: "Frutos secos / cacao", offset: 1, intensity: 4 },
        { macro: "Especias", offset: 2, intensity: 4 },
        { macro: "Tostado", offset: 3, intensity: 3 },
      ],
      // Perfil 3: Frutal + Ácido / fermentado + Dulce (Naturales / Exóticos)
      [
        { macro: "Frutal", offset: 1, intensity: 5 },
        { macro: "Frutal", offset: 7, intensity: 5 },
        { macro: "Ácido / fermentado", offset: 1, intensity: 4 },
        { macro: "Dulce", offset: 1, intensity: 4 },
      ],
      // Perfil 4: Floral + Dulce + Frutal (Lavados de altura)
      [
        { macro: "Floral", offset: 0, intensity: 5 },
        { macro: "Floral", offset: 2, intensity: 4 },
        { macro: "Dulce", offset: 4, intensity: 5 },
        { macro: "Frutal", offset: 14, intensity: 4 },
      ],
      // Perfil 5: Tostado + Otros + Verde / vegetal (Para catas de baja calificación 1★ a 2★)
      [
        { macro: "Tostado", offset: 0, intensity: 4 },
        { macro: "Verde / vegetal", offset: 1, intensity: 3 },
        { macro: "Otros", offset: 2, intensity: 3 },
      ],
    ];

    const chosenPattern = patterns[comboIndex % patterns.length];
    const usedIds = new Set<string>();
    return chosenPattern
      .map((item, i) => {
        const d = pickDesc(item.macro, item.offset + (seed % 3) + i);
        if (!d || usedIds.has(d.id)) return null;
        usedIds.add(d.id);
        return {
          descriptorId: d.id,
          name: d.name,
          macro: d.macro,
          subcategory: d.subcategory,
          intensity: item.intensity,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  };

  // Reseñas de 5★ y 4★
  const highRatingNotesVarietale = [
    "Increíble fragancia floral desde la molienda. En V60 resaltan muchísimo las notas a jazmín, durazno y miel limpia.",
    "Mi café favorito de Varietale hasta ahora. Dulzor a caramelo y frutos rojos súper balanceado al enfriar.",
    "Preparado en Chemex quedó con una claridad impresionante. La acidez cítrica a mandarina es brillante y sedosa.",
    "Cuerpo medio-denso delicioso en Prensa Francesa, mucho chocolate oscuro y avellana tostada en el retrogusto.",
    "Un lote espectacular del Huila. Se sienten notas claras a mora, fresa madura y panela dulce.",
    "Lo probé en Aeropress siguiendo la receta de la guía y el resultado fue redondo, dulce y muy aromático.",
    "Sorprendente complejidad aromática, sabe a flor de azahar con un final prolongado a miel de abejas.",
    "Excelente café para todos los días, muy consistente y con ese perfil achocolatado que nunca cansa.",
    "Acidez jugosa como a maracuyá y frutos amarillos. Definitivamente volveré a pedir otra bolsa en varietale.com.",
    "En Sifón se abrió toda la parte floral y de té negro. Una taza limpia, elegante y súper dulce.",
  ];

  // Reseñas de 3★ (calificación media)
  const midRatingNotes = [
    "Buen café de origen aunque hoy la molienda me quedó un poco fina y se sintió algo más amargo de lo normal.",
    "Taza correcta con notas a chocolate y nuez, agradable para la mañana pero esperaba un poco más de acidez frutal.",
    "Lo compré para comparar en casa con mi V60; tiene buen cuerpo pero menos complejidad aromática que el Geisha.",
  ];

  // Reseñas de 1★ y 2★ (calificación baja para probar el filtro de 1, 2 y 3 estrellas)
  const lowRatingNotes = [
    "El tueste de esta bolsa de otra marca estaba demasiado alto, predominaron notas ahumadas y amargas sobre la fruta.",
    "No me convenció este lote en particular; sentí una nota herbal y astringente al final. Prefiero los lavados de Varietale.",
    "Se me pasó el tiempo de extracción a más de 5 minutos con agua muy caliente y quedó sobre-extraído y seco en boca.",
    "Esperaba notas más dulces pero lo sentí plano y con poco aroma porque la bolsa ya llevaba abierta varias semanas.",
  ];

  const officialMethods: BrewMethod[] = [
    "v60",
    "chemex",
    "prensa",
    "aeropress",
    "siphon",
    "goteo",
    "moka",
    "espresso",
    "coldbrew",
  ];

  const existingAccounts = getStoredAccounts();
  const newSimAccounts: StoredAccount[] = [];
  const metaMap = getUserDeviceMetaMap();

  let totalTastingsCreated = 0;

  simProfiles.forEach((p, idx) => {
    const createdDate = new Date(now - p.daysAgoCreated * dayMs - idx * 3600000);
    const lastActiveDate = new Date(
      Math.min(now - idx * 1800000, createdDate.getTime() + (p.daysAgoCreated > 0 ? dayMs : 0))
    );

    const account: StoredAccount = {
      id: p.id,
      name: p.name,
      username: p.username,
      email: p.email,
      phone: p.phone,
      password: `Varietale${p.pin}*`,
      securityPin: p.pin,
      securityQuestion: "¿Cuál es tu café favorito?",
      securityAnswer: "Varietale",
      experienceLevel: p.tastingsCount >= 5 ? "avanzado" : p.tastingsCount >= 2 ? "intermedio" : "principiante",
      favoriteStore: "Varietale",
      memberSince: createdDate.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      avatarColor: p.avatarColor,
      authProvider: p.provider,
      verified: true,
      createdAt: createdDate.toISOString(),
    };

    newSimAccounts.push(account);

    // Registrar deviceMeta bajo username en minúsculas (como hace recordUserSessionActivity)
    const metaEntry: UserDeviceMeta = {
      userId: p.id,
      isStandalonePwa: p.isPwa,
      platform: p.platform,
      lastSeenAt: lastActiveDate.toISOString(),
      phone: p.phone,
    };
    metaMap[p.username.toLowerCase()] = metaEntry;
    metaMap[p.id.toLowerCase()] = metaEntry;

    // Generar las catas de este usuario
    const userTastings: TastingRecord[] = [];
    for (let c = 0; c < p.tastingsCount; c++) {
      const globalIndex = totalTastingsCreated;
      // ~80% Varietale, ~20% otras marcas
      const useCompetitor = (idx + c) % 5 === 3;
      const varietaleList = coffeePool.filter((cf) => cf.isVarietale);
      const competitorList = coffeePool.filter((cf) => !cf.isVarietale);

      const chosenCoffee = useCompetitor
        ? competitorList[(idx + c) % competitorList.length]
        : varietaleList[(idx * 3 + c) % varietaleList.length];

      // Distribución realista de estrellas (incluyendo 1★, 2★, 3★, 4★ y 5★)
      let rating = 5;
      if (useCompetitor) {
        const rRoll = (idx + c) % 4;
        rating = rRoll === 0 ? 1 : rRoll === 1 ? 2 : rRoll === 2 ? 3 : 4;
      } else {
        const rRoll = (idx * 2 + c) % 10;
        rating = rRoll === 0 ? 2 : rRoll === 1 ? 3 : rRoll <= 4 ? 4 : 5;
      }

      const comboType = rating <= 2 ? 5 : (idx + c) % 5;
      const selectedFlavors = buildRealFlavorCombo(comboType, globalIndex);

      const bodyLevel: 1 | 2 | 3 = ((idx + c) % 3 === 0 ? 1 : (idx + c) % 3 === 1 ? 2 : 3) as 1 | 2 | 3;
      const brewMethod = officialMethods[(idx + c) % officialMethods.length];

      const hasNote = c % 2 === 0 || rating <= 3;
      let userNotes = "";
      if (hasNote) {
        if (rating <= 2) {
          userNotes = lowRatingNotes[globalIndex % lowRatingNotes.length];
        } else if (rating === 3) {
          userNotes = midRatingNotes[globalIndex % midRatingNotes.length];
        } else {
          userNotes = highRatingNotesVarietale[globalIndex % highRatingNotesVarietale.length];
        }
      }

      const cataTime = new Date(
        createdDate.getTime() +
          ((now - createdDate.getTime()) * (c + 1)) / (p.tastingsCount + 1)
      );

      const record: TastingRecord = {
        id: `sim-cata-${p.id}-${c + 1}`,
        createdAt: cataTime.toISOString(),
        coffeeName: chosenCoffee.coffeeName,
        brand: chosenCoffee.brand,
        farmName: chosenCoffee.farmName,
        farmerName: chosenCoffee.farmerName,
        country: "Colombia",
        department: chosenCoffee.department,
        origin: chosenCoffee.origin,
        variety: chosenCoffee.variety,
        process: chosenCoffee.process,
        altitude: chosenCoffee.altitude,
        brewMethod,
        qualityChecklist: {
          waterFiltered: rating >= 3,
          grindCorrect: rating >= 3,
          waterNotBoiling: rating >= 2,
        },
        bodyLevel,
        selectedFlavors,
        spiderProfile: computeSensorySpiderProfile(selectedFlavors, bodyLevel),
        rating,
        userNotes,
        photoUrl: "/icon-192.png",
      };

      userTastings.push(record);
      totalTastingsCreated++;
    }

    // Ordenar de más reciente a más antigua y guardar en su clave aislada real
    userTastings.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const tastingsKey = getTastingsKeyForAccount(account);
    localStorage.setItem(tastingsKey, JSON.stringify(userTastings));
  });

  localStorage.setItem(
    ACCOUNTS_STORAGE_KEY,
    JSON.stringify([...existingAccounts, ...newSimAccounts])
  );
  localStorage.setItem(USER_META_KEY, JSON.stringify(metaMap));

  // Generar Eventos de Redirección a varietale.com (para alimentar KPI, fuentes y recompra)
  const simRedirects: VarietaleRedirectEvent[] = [];
  const rebuyCoffees = [
    "Varietale Geisha Especial",
    "Varietale Bourbon Rosado",
    "Varietale Tabi Natural",
    "Varietale Caturra Chiroso",
    "Varietale Pacamara Honey",
  ];

  // Algunos usuarios tienen visitas a varietale.com y algunos 0 visitas para poder probar el filtro "Sin visitas"
  simProfiles.forEach((p, idx) => {
    const visitsCount = idx >= 16 ? 0 : Math.max(1, Math.floor(p.tastingsCount * 0.8) + (idx % 3));
    for (let v = 0; v < visitsCount; v++) {
      const sourceRoll = (idx + v) % 6;
      const source: RedirectSourceType =
        sourceRoll === 0
          ? "home_store_btn"
          : sourceRoll === 1
          ? "welcome_coupon_btn"
          : sourceRoll === 2
          ? "rebuy_recommendation"
          : sourceRoll === 3
          ? "catalog_product"
          : sourceRoll === 4
          ? "footer_link"
          : "floating_varietale_btn";

      const coffeeLabel =
        source === "rebuy_recommendation"
          ? rebuyCoffees[(idx + v) % rebuyCoffees.length]
          : source === "floating_varietale_btn"
          ? "Pestaña Flotante: Ir a VARIETALE.com"
          : "Tienda Oficial Varietale";

      // Distribución temporal realista para validar filtros de tiempo:
      // v === 0 -> Hoy (hace 1 a 12 horas)
      // v === 1 -> Última semana (hace 2 a 5 días)
      // v === 2 -> Último mes (hace 10 a 25 días)
      // v === 3 -> Último trimestre (hace 35 a 75 días)
      // v >= 4  -> Hace 4 a 9 meses
      const hourOffset =
        v === 0
          ? (idx % 12) + 1
          : v === 1
          ? (idx % 4 + 2) * 24
          : v === 2
          ? (idx % 15 + 10) * 24
          : v === 3
          ? (idx % 40 + 35) * 24
          : (idx * 15 + 120) * 24;

      simRedirects.push({
        id: `sim-red-${p.id}-${v}`,
        timestamp: new Date(now - hourOffset * 3600000).toISOString(),
        userId: p.id,
        username: p.username,
        userName: p.name,
        source,
        targetUrl: "https://varietale.com",
        label: coffeeLabel,
      });
    }
  });

  const currentRedirects = getVarietaleRedirectEvents();
  localStorage.setItem(
    REDIRECT_EVENTS_KEY,
    JSON.stringify([...simRedirects, ...currentRedirects])
  );

  // Generar Eventos de Copia de Cupón de Bienvenida
  const simCouponCopies: CouponCopyEvent[] = simProfiles.slice(0, 14).map((p, idx) => ({
    id: `sim-cup-${p.id}`,
    timestamp: new Date(now - idx * 12 * 3600000).toISOString(),
    userId: p.id,
    username: p.username,
    couponCode: "Experienciafiltrados",
  }));
  const currentCoupons = getCouponCopyEvents();
  localStorage.setItem(
    COUPON_EVENTS_KEY,
    JSON.stringify([...simCouponCopies, ...currentCoupons])
  );

  // Generar Eventos de Compartir la App (WhatsApp, Link Copiado, Nativo)
  const simShares: AppShareEvent[] = [];
  simProfiles.slice(0, 13).forEach((p, idx) => {
    const shareCount = idx < 4 ? 3 : idx < 9 ? 2 : 1;
    for (let s = 0; s < shareCount; s++) {
      const channel: ShareChannelType =
        (idx + s) % 3 === 0
          ? "whatsapp"
          : (idx + s) % 3 === 1
          ? "copy_link"
          : "native_share";
      simShares.push({
        id: `sim-shr-${p.id}-${s}`,
        timestamp: new Date(now - (idx * 5 + s * 2) * 3600000).toISOString(),
        userId: p.id,
        username: p.username,
        userName: p.name,
        channel,
      });
    }
  });
  const currentShares = getAppShareEvents();
  localStorage.setItem(
    SHARE_EVENTS_KEY,
    JSON.stringify([...simShares, ...currentShares])
  );

  return {
    usersCreated: simProfiles.length,
    tastingsCreated: totalTastingsCreated,
    redirectsCreated: simRedirects.length,
    sharesCreated: simShares.length,
  };
};


