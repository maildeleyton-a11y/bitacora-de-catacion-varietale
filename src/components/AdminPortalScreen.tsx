/**
 * ============================================================================
 * ÁREA DEL ADMINISTRADOR (ADMIN PORTAL SCREEN) - MI BITÁCORA VARIETALE
 * ============================================================================
 * Panel ejecutivo de control, inteligencia de negocio, CRM y gestión:
 * 1. Dashboard General (KPIs, Tráfico a varietale.com, Top Usuarios, Sabores
 *    más percibidos y mejor calificados, Cafés, Competencia, Métodos, Cupón,
 *    Recompra y Viralidad) con iconos de información contextual (ⓘ).
 * 2. Directorio de Catadores (CRM con filtro multicriterio completo, selección
 *    individual/grupal con checkboxes, exportación selectiva o total en .CSV y
 *    .XLS Excel, paginación personalizable 10/25/30/50/Todos, expediente de
 *    catas y soporte de PIN/contraseña).
 * 3. Muro de Reseñas y Comentarios Reales (con filtro de bajas calificaciones
 *    1★, 2★, 3★, altas 4★, 5★, marca y ordenamiento).
 * 4. Verificador del Catálogo Automático Sincronizado con varietale.com
 *    (cuántos y cuáles cafés están activos + forzar actualización).
 * 5. Gestor del Cupón de Bienvenida, Integraciones (Google Sheets y Notion),
 *    Copia de Seguridad JSON y Seguridad de Credenciales del Administrador.
 * 6. Instructivo / Mesa de Ayuda integrada para el Administrador.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart3,
  Users,
  Coffee,
  MessageSquareText,
  Settings,
  RefreshCw,
  ExternalLink,
  Download,
  Upload,
  Search,
  Star,
  Trophy,
  Share2,
  Gift,
  ShoppingBag,
  ShieldCheck,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Link2,
  ArrowLeft,
  FlaskConical,
  Info,
  HelpCircle,
  Filter,
  FileSpreadsheet,
  CheckSquare,
  Square,
  RotateCcw,
  Edit3,
  MousePointerClick,
  Calendar,
} from "lucide-react";
import { CoffeeInfo } from "../types";
import { MACRO_THEMES } from "../data/coffeeData";
import {
  computeAdminDashboardStats,
  getEnrichedUsersDirectory,
  EnrichedUserRecord,
  adminResetClientCredentials,
  adminDeleteUserAccount,
  exportUsersDirectoryToCsv,
  exportUsersDirectoryToExcel,
  exportAllTastingsToCsv,
  exportAllTastingsToExcel,
  exportFullDatabaseBackupJson,
  importFullDatabaseBackupJson,
  getWelcomeCouponConfig,
  saveWelcomeCouponConfig,
  WelcomeCouponConfig,
  getWebhookConfig,
  saveWebhookConfig,
  WebhookIntegrationsConfig,
  triggerWebhookInBackground,
  getAdminCredentials,
  saveAdminCredentials,
  isSimulationDataLoaded,
  seedSimulatedAdminData,
  clearSimulatedAdminData,
  formatReadableDate,
  RedirectDateRangeType,
  RedirectSourceType,
  filterRedirectEvents,
  computeRedirectStatsForEvents,
  exportRedirectEventsToCsv,
  exportRedirectEventsToExcel,
  formatRedirectSourceLabel,
  getVarietaleRedirectEvents,
} from "../data/adminStore";
import { BrandFooter } from "./BrandFooter";
import { AdminUiCmsTab } from "./AdminUiCmsTab";

interface AdminPortalScreenProps {
  /** Catálogo de cafés sincronizado actualmente con varietale.com */
  liveCoffees: CoffeeInfo[];
  /** Indica si el catálogo está sincronizando en este instante */
  isSyncingCatalog: boolean;
  /** Fuerza una re-sincronización inmediata con varietale.com */
  onForceRefreshCatalog: () => void;
  /** Cierra la vista de administrador y regresa a la aplicación */
  onExitAdmin: () => void;
  /** Activa el modo de edición visual interactiva directamente sobre la app en vivo */
  onStartVisualEditMode?: () => void;
  /** Inicia sesión como usuario de prueba y abre la app para validar la experiencia de catador */
  onLoginAsTestUser?: () => void;
}

type AdminTab = "dashboard" | "reviews" | "catalog" | "users" | "texts" | "settings";

/**
 * Icono de información contextual (ⓘ) corto, preciso y claro para cada módulo.
 */
const InfoHint: React.FC<{
  title: string;
  text: string;
  variant?: "light" | "dark";
}> = ({ title, text, variant = "light" }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={`Información sobre: ${title}`}
        aria-label={`Información sobre ${title}`}
        className={`w-5 h-5 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
          variant === "dark"
            ? "bg-white/15 hover:bg-white/25 text-[#00D9B4]"
            : "bg-[#EBFBFA] hover:bg-[#00D9B4]/30 text-[#00897B] border border-[#00D9B4]/40"
        }`}
      >
        <Info className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 sm:left-auto sm:right-0 top-7 z-40 w-68 sm:w-76 p-3.5 rounded-2xl bg-[#01374C] text-white shadow-xl border border-[#00D9B4]/40 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#00D9B4]">
              {title}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-white/95 leading-relaxed font-normal">{text}</p>
        </div>
      )}
    </div>
  );
};

const SCA_MACRO_OPTIONS = [
  "Frutal",
  "Floral",
  "Dulce",
  "Chocolatoso",
  "Nueces",
  "Especiado",
  "Tostado",
  "Acidez / Fermento",
  "Vegetal / Herbal",
];

const HELP_DESK_SECTIONS = [
  {
    id: "dashboard",
    badge: "1. Dashboard General",
    title: "Cómo interpretar las métricas y la Rueda de Sabores",
    summary:
      "Vista ejecutiva en tiempo real del uso de Mi Bitácora Varietale, tráfico hacia la tienda web y preferencias sensoriales.",
    bullets: [
      "KPIs Superiores: Muestran el total de catadores registrados, clics enviados a varietale.com, cataciones guardadas y calificación promedio global.",
      "Filtro Temporal y Auditoría de Redirecciones (KPI 2): Puedes alternar las métricas de tráfico web entre 'Todo' (histórico), 'Hoy' (tiempo real), '7d', '30d', 'Trimestre' y 'Año'. Además, al pulsar el icono [↗] se abre el Expediente de Auditoría Completa con calendario personalizado (Desde / Hasta), filtro por canal y descarga directa en Excel (.XLS) y .CSV.",
      "Ranking y Nivel de Actividad: Identifica a tus clientes más fieles (+4 catas), usuarios en exploración (1 a 3 catas) y quienes solo se han registrado (0 catas).",
      "Rueda de Sabores SCA (% y ★): Muestra qué familias y descriptores específicos detectan más los usuarios y cuáles reciben mejor calificación en estrellas.",
      "Varietale vs. Otras Marcas: Compara qué porcentaje de catas son cafés oficiales de Varietale frente a otras marcas del mercado ingresadas manualmente.",
    ],
  },
  {
    id: "crm",
    badge: "2. Directorio de Catadores (CRM)",
    title: "Cómo filtrar, seleccionar grupos, paginar y descargar en CSV o Excel",
    summary:
      "Explora tu base de usuarios combinando múltiples criterios y exporta toda la base o solo los perfiles seleccionados.",
    bullets: [
      "Filtros Multicriterio: Filtra por nivel de actividad, método de acceso (Google/Correo), visitas a varietale.com, compartidos, dispositivo (PWA/Navegador), marca catada o familia de sabor favorita.",
      "Visitas a varietale.com: Muestra el total de clics a la tienda por usuario. Para auditar las fechas, horas y productos específicos cliqueados por cualquier catador, abre la 'Auditoría de Redirecciones' desde el Dashboard.",
      "Selección Individual o por Grupos: Marca las casillas a la izquierda de cada catador (o la casilla superior para marcar todos los filtrados) para activar la barra de exportación grupal.",
      "Descarga en .CSV o .XLS (Excel): Puedes descargar tanto el directorio de usuarios como sus catas detalladas en formato .CSV o en libro de Excel (.XLS).",
      "Paginación Personalizable: Elige en la esquina inferior o superior si deseas ver 10, 25, 30, 50 o Todos los registros por página.",
    ],
  },
  {
    id: "support",
    badge: "3. Soporte a Clientes",
    title: "Cómo recuperar el PIN o restablecer la contraseña de un usuario",
    summary:
      "Asistencia inmediata cuando un cliente olvida tanto su contraseña como su PIN personal de 4 dígitos.",
    bullets: [
      "En la pestaña 'Catadores', ubica al usuario mediante el buscador por su nombre, @usuario o correo.",
      "Haz clic en el botón 'PIN / Clave' a la derecha de su fila.",
      "Verás en pantalla su PIN actual de 4 dígitos para informárselo, o podrás escribirle una nueva contraseña temporal en un clic.",
    ],
  },
  {
    id: "reviews",
    badge: "4. Muro de Reseñas (1★ a 5★)",
    title: "Cómo auditar comentarios y detectar calificaciones bajas (1★, 2★, 3★)",
    summary:
      "Lee las notas de cata reales escritas por los clientes para control de calidad y testimonios.",
    bullets: [
      "Filtro de Menor Calificación: Usa los botones rápidos o el selector para ver 'Menor calificación (1★ a 3★)', 'Críticas (1★ a 2★)' o exactamente 'Solo 1★', 'Solo 2★' o 'Solo 3★'.",
      "Ordenamiento: Ordena las reseñas por 'Menor calificación primero (1★ → 5★)' para atender primero cualquier novedad de tueste o preparación.",
      "Filtro por Marca: Separa comentarios sobre cafés oficiales de VARIETALE frente a cafés de otras marcas.",
    ],
  },
  {
    id: "catalog",
    badge: "5. Catálogo Web Automático",
    title: "Cómo verificar los cafés sincronizados desde varietale.com",
    summary:
      "Confirma cuántos y cuáles cafés están activos hoy en el selector de la aplicación.",
    bullets: [
      "El catálogo se alimenta automáticamente desde varietale.com (vía /api/varietale-coffees).",
      "Cada tarjeta muestra foto, origen, variedad, beneficio, precio y el botón 'Verificar en web' para compararlo con la tienda oficial.",
      "Si acabas de subir o actualizar un café en Shopify/varietale.com, pulsa 'Forzar Actualización Ahora' para sincronizar al instante.",
    ],
  },
  {
    id: "settings",
    badge: "6. Cupón, Google Sheets / Notion y Seguridad",
    title: "Cómo automatizar envíos y administrar tus credenciales",
    summary:
      "Configura incentivos comerciales, conectores en tiempo real y respaldos completos.",
    bullets: [
      "Cupón de Bienvenida: Activa, oculta o cambia el código promocional (ej. BIENVENIDOVARIETALE10) y el enlace hacia la tienda.",
      "Conectores Google Sheets y Notion: Pega la URL de tu Webhook, marca qué eventos enviar y usa 'Probar Conexión' o 'Sincronizar Todo' (envío libre de bloqueos CORS a través del servidor).",
      "Backup JSON y Credenciales: Descarga una copia completa (.JSON) de toda la base de datos o actualiza tu usuario, contraseña y PIN Maestro del Administrador.",
    ],
  },
  {
    id: "simulation",
    badge: "7. Simulación Funcional de 20 Usuarios",
    title: "Cómo probar el panel con datos reales simulados y limpiarlos",
    summary:
      "Valida todas las gráficas, filtros, descargas en Excel/CSV y reseñas antes o durante la operación.",
    bullets: [
      "El botón 'Simular 20 Usuarios' inyecta 20 cuentas reales de prueba con 68 catas completas (con descriptores de las 9 familias de la rueda SCA, calificaciones de 1★ a 5★, clics a varietale.com y compartidos).",
      "Puedes filtrar, abrir expedientes, cambiar claves y exportar en Excel/CSV sobre esos 20 usuarios igual que con usuarios reales.",
      "Al terminar tu validación, pulsa 'Borrar Simulación' y se eliminarán únicamente los 20 usuarios de prueba, conservando intactos los registros reales.",
    ],
  },
  {
    id: "texts_cms",
    badge: "8. Editor de Textos, Pop-ups, Ingreso Admin, Panel Admin y Rueda SCA",
    title: "Cómo editar textos de la App, Pop-ups, Ingreso Admin y del propio Panel (y qué está protegido)",
    summary:
      "Modifica sin código cualquier texto de la interfaz, pop-ups (como Instalar App), ingreso de administrador, el propio Panel Admin, métodos o sabores de la Rueda SCA.",
    bullets: [
      "Por Lista o Buscador: En la pestaña 'Textos y Sabores (Editor)', filtra por sección ('Acceso y Registro', 'Pop-ups y Ventanas Emergentes', 'Panel de Administración', etc.) para editar títulos, etiquetas, placeholders, botones, las pestañas laterales flotantes ('Compartir' e 'Ir a VARIETALE.com') y los textos del modal de 'Auditoría de Redirecciones'.",
      "Modo '🎯 Editar en Vivo': Activa la barra superior flotante (siempre visible sobre cualquier ventana) para saltar en 1 clic a cualquier pantalla —incluyendo '✨ Animación Inicial' y '🛡️ Panel Admin'— y tocar cualquier texto o etiqueta del radar/rueda para cambiarlo al instante.",
      "Pop-ups e Ingreso Admin en 1 Clic: Desde la segunda fila de la barra en vivo abre directamente '📲 Pop-up Instalar App', '📱 Guía iOS / Android', '🔐 Ingreso Admin', '🔑 PIN Maestro Admin', '🌐 Login Google', '🔎 Olvidé Cuenta', '🔄 Restablecer Clave', '🎁 Pop-up Obsequio', '⭐ Pop-up Intensidad', '🎉 Pop-up Cata Guardada', '🗑️ Eliminar Cata', '🔗 Pop-up Compartir' o '📈 Auditoría Web'.",
      "Maestro Tostador (Rueda SCA y Métodos): Ajusta los +85 sabores de la rueda (nombre, referencia sensorial, explicación y color), las 9 familias macro y las 11 fichas de métodos.",
      "🔒 Elementos Protegidos (No Editables): Están bloqueados el pie de autoría inferior (Mr. Bite® y VARIETALE®), todos los contadores que arrancan en 0 o son variables automáticas (KPIs, números, % del radar, pasos 1/4, @usuario) y los registros de base de datos (reseñas escritas, filas de usuarios y catálogo sincronizado de varietale.com).",
      "Restauración en 1 Clic: Restaura cualquier elemento individual a su texto original o pulsa 'Restaurar Todo de Fábrica'.",
    ],
  },
  {
    id: "test_user_mode",
    badge: "9. Modo Usuario de Prueba y 20 Catas Simuladas (Cero Contaminación de Métricas)",
    title: "Cómo probar la aplicación como cliente y simular 20 cataciones sin afectar las métricas reales",
    summary:
      "Accede desde el panel a la cuenta de prueba oficial para vivir la experiencia del catador, generar 20 catas aleatorias y regresar al panel de control en cualquier momento.",
    bullets: [
      "Acceso Exclusivo desde el Panel: En la barra superior pulsa 'Probar como Usuario'. El antiguo icono de matraz en la pantalla de login fue retirado para garantizar que solo el Administrador pueda ingresar a este modo.",
      "Barra Superior de Pruebas: Al entrar verás una barra superior fija con tres opciones rápidas: '⚡ Simular 20 Catas Aleatorias', '🗑️ Limpiar Catas' y '🛡️ Volver al Panel Admin'.",
      "Simulación de 20 Cataciones Reales: Llena instantáneamente la Bitácora con 20 cafés colombianos auténticos (Geisha, Bourbon Rosado, Caturra Chiroso, Tabi, Wush Wush, etc.), diferentes métodos (V60, Chemex, Aeropress, Prensa Francesa, Espresso), notas de la rueda SCA y calificaciones.",
      "Validación de Funcionalidades: Prueba la gráfica de radar, el comparador de tazas, el historial de cataciones y los filtros de la Bitácora exactamente como lo haría un usuario activo.",
      "🛡️ Aislamiento Total de Métricas (Cero Contaminación): Ni la cuenta de prueba ni sus 20 cataciones se mezclan jamás con las métricas del negocio. El Panel Admin, los KPIs generales, el ranking de catadores y las exportaciones en Excel/CSV excluyen estrictamente estos registros de prueba.",
      "Retorno Inmediato al Panel Admin: Pulsa '🛡️ Volver al Panel Admin' desde la barra superior o desde el modal de perfil para regresar instantáneamente a tu panel de control.",
    ],
  },
];

export const AdminPortalScreen: React.FC<AdminPortalScreenProps> = ({
  liveCoffees,
  isSyncingCatalog,
  onForceRefreshCatalog,
  onExitAdmin,
  onStartVisualEditMode,
  onLoginAsTestUser,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Modal de Mesa de Ayuda / Instructivo del Administrador
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState("");

  // Estado para filtro de sabores en Dashboard (Por frecuencia vs Por mejor calificación)
  const [flavorSortMode, setFlavorSortMode] = useState<"count" | "rating">("count");

  // Estado para Muro de Reseñas (incluyendo bajas calificaciones 1★, 2★, 3★)
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewBrandFilter, setReviewBrandFilter] = useState<"all" | "varietale" | "other">("all");
  const [reviewRatingFilter, setReviewRatingFilter] = useState<
    | "all"
    | "low_1_3"
    | "low_1_2"
    | "exact_1"
    | "exact_2"
    | "exact_3"
    | "exact_4"
    | "exact_5"
    | "high_4_5"
  >("all");
  const [reviewSortOrder, setReviewSortOrder] = useState<"newest" | "lowest" | "highest">(
    "newest"
  );

  // Estado para Verificador de Catálogo
  const [catalogSearch, setCatalogSearch] = useState("");
  const [lastCatalogRefreshTime, setLastCatalogRefreshTime] = useState<string>(() =>
    new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
  );

  // Estado para Directorio de Catadores (CRM) - Filtros Multicriterio, Selección y Paginación
  const [userSearch, setUserSearch] = useState("");
  const [userActivityFilter, setUserActivityFilter] = useState<
    "all" | "zero" | "exploring" | "frequent"
  >("all");
  const [userAuthFilter, setUserAuthFilter] = useState<"all" | "google" | "email">("all");
  const [userRedirectFilter, setUserRedirectFilter] = useState<"all" | "visited" | "none">("all");
  const [userShareFilter, setUserShareFilter] = useState<"all" | "shared" | "none">("all");
  const [userDeviceFilter, setUserDeviceFilter] = useState<"all" | "pwa" | "browser">("all");
  const [userBrandFilter, setUserBrandFilter] = useState<"all" | "varietale" | "competitor">(
    "all"
  );
  const [userMacroFilter, setUserMacroFilter] = useState<string>("all");
  const [userSortBy, setUserSortBy] = useState<
    | "most_tastings"
    | "newest"
    | "oldest"
    | "most_redirects"
    | "highest_rating"
    | "lowest_rating"
  >("most_tastings");

  // Selección individual y por grupos en el CRM
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Paginación personalizable del CRM (10, 25, 30, 50 o Todos = 0)
  const [usersPerPage, setUsersPerPage] = useState<number>(25);
  const [currentUserPage, setCurrentUserPage] = useState<number>(1);

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [supportModalUser, setSupportModalUser] = useState<EnrichedUserRecord | null>(null);
  const [supportNewPassword, setSupportNewPassword] = useState("");
  const [supportNewPin, setSupportNewPin] = useState("");
  const [supportFeedback, setSupportFeedback] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<EnrichedUserRecord | null>(null);

  // Estado para Configuración (Cupón, Webhooks, Backup y Credenciales Admin)
  const [couponForm, setCouponForm] = useState<WelcomeCouponConfig>(() =>
    getWelcomeCouponConfig()
  );
  const [couponSavedMsg, setCouponSavedMsg] = useState<string | null>(null);

  const [webhookForm, setWebhookForm] = useState<WebhookIntegrationsConfig>(() =>
    getWebhookConfig()
  );
  const [webhookStatusMsg, setWebhookStatusMsg] = useState<string | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  const [adminCredsForm, setAdminCredsForm] = useState(() => {
    const c = getAdminCredentials();
    return {
      username: c.username,
      password: c.password,
      masterPin: c.masterPin,
    };
  });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminCredsSavedMsg, setAdminCredsSavedMsg] = useState<string | null>(null);

  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileInputBackupRef = useRef<HTMLInputElement>(null);

  // Estado de Simulación Temporal de 20 Usuarios
  const [simBannerMsg, setSimBannerMsg] = useState<string | null>(null);
  const isSimActive = useMemo(() => isSimulationDataLoaded(), [refreshTick]);

  // Recalcular analíticas en vivo
  const stats = useMemo(() => computeAdminDashboardStats(), [refreshTick]);
  const usersDirectory = useMemo(() => getEnrichedUsersDirectory(), [refreshTick]);

  // ============================================================================
  // ANALÍTICA TEMPORAL Y AUDITORÍA DE REDIRECCIONES A VARIETALE.COM
  // ============================================================================
  const [kpi2TimeRange, setKpi2TimeRange] = useState<RedirectDateRangeType>("all");
  const [isRedirectAuditModalOpen, setIsRedirectAuditModalOpen] = useState(false);
  const [auditRange, setAuditRange] = useState<RedirectDateRangeType>("all");
  const [auditCustomStart, setAuditCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [auditCustomEnd, setAuditCustomEnd] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [auditSpecificYear, setAuditSpecificYear] = useState<number>(() =>
    new Date().getFullYear()
  );
  const [auditSource, setAuditSource] = useState<RedirectSourceType | "all">("all");
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize] = useState<number>(10);

  // Escuchar apertura desde la barra de edición en vivo (Live Visual Editor)
  useEffect(() => {
    const handleCmsSubmodal = (ev: Event) => {
      const modalId = (ev as CustomEvent<{ modalId?: string }>).detail?.modalId;
      if (modalId === "redirect_audit") {
        setIsRedirectAuditModalOpen(true);
      } else if (modalId === "close_all") {
        setIsRedirectAuditModalOpen(false);
      }
    };
    window.addEventListener("varietale-cms-open-submodal", handleCmsSubmodal);
    return () => {
      window.removeEventListener("varietale-cms-open-submodal", handleCmsSubmodal);
    };
  }, []);

  // Todos los eventos de redirección almacenados en memoria
  const allRawRedirectEvents = useMemo(() => {
    return getVarietaleRedirectEvents();
  }, [refreshTick]);

  // Clics filtrados para la tarjeta de KPI 2 en el Dashboard
  const kpi2FilteredEvents = useMemo(() => {
    return filterRedirectEvents(allRawRedirectEvents, { range: kpi2TimeRange });
  }, [allRawRedirectEvents, kpi2TimeRange]);

  const kpi2Stats = useMemo(() => {
    return computeRedirectStatsForEvents(kpi2FilteredEvents);
  }, [kpi2FilteredEvents]);

  // Eventos filtrados para el Modal de Auditoría
  const auditFilteredEvents = useMemo(() => {
    return filterRedirectEvents(allRawRedirectEvents, {
      range: auditRange,
      customStartDate: auditCustomStart,
      customEndDate: auditCustomEnd,
      specificYear: auditSpecificYear,
      source: auditSource,
      searchQuery: auditSearch,
    });
  }, [
    allRawRedirectEvents,
    auditRange,
    auditCustomStart,
    auditCustomEnd,
    auditSpecificYear,
    auditSource,
    auditSearch,
  ]);

  const auditStats = useMemo(() => {
    let days = 1;
    if (auditRange === "today") days = 1;
    else if (auditRange === "7d") days = 7;
    else if (auditRange === "30d") days = 30;
    else if (auditRange === "quarter") days = 90;
    else if (auditRange === "year_trailing") days = 365;
    else if (auditRange === "custom" && auditCustomStart && auditCustomEnd) {
      const diffMs =
        new Date(auditCustomEnd).getTime() - new Date(auditCustomStart).getTime();
      days = Math.max(1, Math.round(diffMs / (24 * 3600 * 1000)) + 1);
    }
    return computeRedirectStatsForEvents(auditFilteredEvents, days);
  }, [auditFilteredEvents, auditRange, auditCustomStart, auditCustomEnd]);

  const auditTotalPages = Math.max(1, Math.ceil(auditFilteredEvents.length / auditPageSize));
  const paginatedAuditEvents = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return auditFilteredEvents.slice(start, start + auditPageSize);
  }, [auditFilteredEvents, auditPage, auditPageSize]);

  useEffect(() => {
    setAuditPage(1);
  }, [
    auditRange,
    auditCustomStart,
    auditCustomEnd,
    auditSpecificYear,
    auditSource,
    auditSearch,
    auditPageSize,
  ]);

  const getAuditRangeLabel = (range: RedirectDateRangeType): string => {
    switch (range) {
      case "all":
        return "Histórico (Total)";
      case "today":
        return "Hoy (Tiempo Real)";
      case "7d":
        return "Últimos 7 Días";
      case "30d":
        return "Últimos 30 Días";
      case "quarter":
        return "Último Trimestre";
      case "year_trailing":
        return "Último Año";
      case "specific_year":
        return `Año ${auditSpecificYear}`;
      case "custom":
        return `Rango ${auditCustomStart || "inicio"} a ${auditCustomEnd || "fin"}`;
      default:
        return "Personalizado";
    }
  };

  const handleExportAuditExcel = () => {
    const label = getAuditRangeLabel(auditRange);
    exportRedirectEventsToExcel(auditFilteredEvents, label);
  };

  const handleExportAuditCsv = () => {
    const label = getAuditRangeLabel(auditRange);
    exportRedirectEventsToCsv(auditFilteredEvents, label);
  };

  // Auto-reparación transparente si había una simulación previa sin descriptores de rueda o sin reseñas 1★-2★
  useEffect(() => {
    if (isSimulationDataLoaded()) {
      const hasEmptyWheel = stats.macroFamiliesStats.every((m) => m.count === 0);
      const hasLowReviews = stats.allReviewsWithNotes.some(
        (r) => (r.tasting.rating || 0) <= 2
      );
      if (hasEmptyWheel || !hasLowReviews) {
        seedSimulatedAdminData();
        setRefreshTick((t) => t + 1);
      }
    }
  }, [stats.macroFamiliesStats, stats.allReviewsWithNotes]);

  const handleManualRefresh = () => {
    setRefreshTick((t) => t + 1);
  };

  const handleLoadSimulation = () => {
    const res = seedSimulatedAdminData();
    setRefreshTick((t) => t + 1);
    setSimBannerMsg(
      `✅ Simulación funcional activa: ${res.usersCreated} usuarios, ${res.tastingsCreated} catas completas (con rueda SCA y reseñas de 1★ a 5★), ${res.redirectsCreated} visitas a varietale.com y ${res.sharesCreated} compartidos.`
    );
    setTimeout(() => setSimBannerMsg(null), 6500);
  };

  const handleRemoveSimulation = () => {
    const res = clearSimulatedAdminData();
    setSelectedUserIds([]);
    setRefreshTick((t) => t + 1);
    setSimBannerMsg(
      `🧹 Simulación eliminada (${res.usersRemoved} usuarios de prueba borrados). El panel volvió a sus datos reales.`
    );
    setTimeout(() => setSimBannerMsg(null), 5000);
  };

  // Filtrado y Ordenamiento del Muro de Reseñas (1★ a 5★)
  const filteredReviews = useMemo(() => {
    const list = stats.allReviewsWithNotes.filter(({ tasting, userName, username }) => {
      const r = Math.round(Number(tasting.rating) || 0);
      if (reviewRatingFilter === "low_1_3" && (r < 1 || r > 3)) return false;
      if (reviewRatingFilter === "low_1_2" && (r < 1 || r > 2)) return false;
      if (reviewRatingFilter === "high_4_5" && r < 4) return false;
      if (reviewRatingFilter === "exact_1" && r !== 1) return false;
      if (reviewRatingFilter === "exact_2" && r !== 2) return false;
      if (reviewRatingFilter === "exact_3" && r !== 3) return false;
      if (reviewRatingFilter === "exact_4" && r !== 4) return false;
      if (reviewRatingFilter === "exact_5" && r !== 5) return false;

      const rawBrand = (tasting.brand || "VARIETALE").toUpperCase();
      const isVar = rawBrand.includes("VARIETALE");
      if (reviewBrandFilter === "varietale" && !isVar) return false;
      if (reviewBrandFilter === "other" && isVar) return false;

      if (reviewSearch.trim()) {
        const q = reviewSearch.toLowerCase();
        const matchCoffee = (tasting.coffeeName || "").toLowerCase().includes(q);
        const matchNote = (tasting.userNotes || "").toLowerCase().includes(q);
        const matchUser =
          userName.toLowerCase().includes(q) || username.toLowerCase().includes(q);
        const matchBrand = (tasting.brand || "").toLowerCase().includes(q);
        return matchCoffee || matchNote || matchUser || matchBrand;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (reviewSortOrder === "lowest") {
        return (a.tasting.rating || 0) - (b.tasting.rating || 0);
      }
      if (reviewSortOrder === "highest") {
        return (b.tasting.rating || 0) - (a.tasting.rating || 0);
      }
      return (b.tasting.createdAt || "").localeCompare(a.tasting.createdAt || "");
    });
  }, [
    stats.allReviewsWithNotes,
    reviewSearch,
    reviewBrandFilter,
    reviewRatingFilter,
    reviewSortOrder,
  ]);

  // Contadores rápidos por estrella para el Muro de Reseñas
  const reviewCountsByStar = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, low1to3: 0 };
    stats.allReviewsWithNotes.forEach(({ tasting }) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(tasting.rating) || 0))) as
        | 1
        | 2
        | 3
        | 4
        | 5;
      counts[r] = (counts[r] || 0) + 1;
      if (r <= 3) counts.low1to3 += 1;
    });
    return counts;
  }, [stats.allReviewsWithNotes]);

  // Filtrado del Catálogo Automático
  const filteredLiveCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return liveCoffees;
    const q = catalogSearch.toLowerCase();
    return liveCoffees.filter(
      (c) =>
        (c.coffeeName || "").toLowerCase().includes(q) ||
        (c.origin || "").toLowerCase().includes(q) ||
        (c.variety || "").toLowerCase().includes(q) ||
        (c.process || "").toLowerCase().includes(q) ||
        (c.productType || "").toLowerCase().includes(q)
    );
  }, [liveCoffees, catalogSearch]);

  // Filtrado Multicriterio y Ordenamiento del Directorio de Usuarios (CRM)
  const filteredUsers = useMemo(() => {
    const list = usersDirectory.filter((u) => {
      // 1. Nivel de actividad
      if (userActivityFilter === "zero" && u.tastingsCount !== 0) return false;
      if (
        userActivityFilter === "exploring" &&
        (u.tastingsCount < 1 || u.tastingsCount > 3)
      )
        return false;
      if (userActivityFilter === "frequent" && u.tastingsCount < 4) return false;

      // 2. Proveedor de acceso
      if (userAuthFilter === "google" && u.account.authProvider !== "google") return false;
      if (userAuthFilter === "email" && u.account.authProvider === "google") return false;

      // 3. Visitas a varietale.com
      if (userRedirectFilter === "visited" && u.redirectsCount < 1) return false;
      if (userRedirectFilter === "none" && u.redirectsCount > 0) return false;

      // 4. Compartidos
      if (userShareFilter === "shared" && u.sharesCount < 1) return false;
      if (userShareFilter === "none" && u.sharesCount > 0) return false;

      // 5. Dispositivo / PWA
      if (userDeviceFilter === "pwa" && !u.isPwaInstalled) return false;
      if (userDeviceFilter === "browser" && u.isPwaInstalled) return false;

      // 6. Marca catada (Varietale vs Otras Marcas)
      if (userBrandFilter === "varietale") {
        const hasVar = u.tastings.some((t) =>
          (t.brand || "VARIETALE").toUpperCase().includes("VARIETALE")
        );
        if (!hasVar) return false;
      }
      if (userBrandFilter === "competitor") {
        const hasComp = u.tastings.some(
          (t) => !(t.brand || "VARIETALE").toUpperCase().includes("VARIETALE")
        );
        if (!hasComp) return false;
      }

      // 7. Familia de sabor favorita (Rueda SCA)
      if (userMacroFilter !== "all" && u.favoriteMacro !== userMacroFilter) {
        return false;
      }

      // 8. Búsqueda de texto libre
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const matchBasic =
          u.account.name.toLowerCase().includes(q) ||
          u.account.username.toLowerCase().includes(q) ||
          u.account.email.toLowerCase().includes(q) ||
          (u.account.phone || "").toLowerCase().includes(q);
        const matchTastingCoffee = u.tastings.some(
          (t) =>
            (t.coffeeName || "").toLowerCase().includes(q) ||
            (t.brand || "").toLowerCase().includes(q)
        );
        return matchBasic || matchTastingCoffee;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (userSortBy === "most_tastings") {
        return b.tastingsCount - a.tastingsCount || b.redirectsCount - a.redirectsCount;
      }
      if (userSortBy === "newest") {
        return (b.account.createdAt || "").localeCompare(a.account.createdAt || "");
      }
      if (userSortBy === "oldest") {
        return (a.account.createdAt || "").localeCompare(b.account.createdAt || "");
      }
      if (userSortBy === "most_redirects") {
        return b.redirectsCount - a.redirectsCount || b.tastingsCount - a.tastingsCount;
      }
      if (userSortBy === "highest_rating") {
        return b.avgRating - a.avgRating || b.tastingsCount - a.tastingsCount;
      }
      if (userSortBy === "lowest_rating") {
        const rA = a.avgRating > 0 ? a.avgRating : 99;
        const rB = b.avgRating > 0 ? b.avgRating : 99;
        return rA - rB;
      }
      return 0;
    });
  }, [
    usersDirectory,
    userSearch,
    userActivityFilter,
    userAuthFilter,
    userRedirectFilter,
    userShareFilter,
    userDeviceFilter,
    userBrandFilter,
    userMacroFilter,
    userSortBy,
  ]);

  // Reiniciar a la página 1 cuando cambian los filtros del directorio
  useEffect(() => {
    setCurrentUserPage(1);
  }, [
    userSearch,
    userActivityFilter,
    userAuthFilter,
    userRedirectFilter,
    userShareFilter,
    userDeviceFilter,
    userBrandFilter,
    userMacroFilter,
    userSortBy,
    usersPerPage,
  ]);

  const activeUserFiltersCount = useMemo(() => {
    let c = 0;
    if (userSearch.trim()) c++;
    if (userActivityFilter !== "all") c++;
    if (userAuthFilter !== "all") c++;
    if (userRedirectFilter !== "all") c++;
    if (userShareFilter !== "all") c++;
    if (userDeviceFilter !== "all") c++;
    if (userBrandFilter !== "all") c++;
    if (userMacroFilter !== "all") c++;
    return c;
  }, [
    userSearch,
    userActivityFilter,
    userAuthFilter,
    userRedirectFilter,
    userShareFilter,
    userDeviceFilter,
    userBrandFilter,
    userMacroFilter,
  ]);

  const resetAllUserFilters = () => {
    setUserSearch("");
    setUserActivityFilter("all");
    setUserAuthFilter("all");
    setUserRedirectFilter("all");
    setUserShareFilter("all");
    setUserDeviceFilter("all");
    setUserBrandFilter("all");
    setUserMacroFilter("all");
    setUserSortBy("most_tastings");
    setCurrentUserPage(1);
  };

  // Cálculo de Paginación Personalizable
  const totalUserPages = useMemo(() => {
    if (usersPerPage <= 0 || filteredUsers.length === 0) return 1;
    return Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  }, [filteredUsers.length, usersPerPage]);

  const safeCurrentPage = Math.min(currentUserPage, totalUserPages);

  const paginatedUsers = useMemo(() => {
    if (usersPerPage <= 0) return filteredUsers;
    const start = (safeCurrentPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, safeCurrentPage, usersPerPage]);

  // Objetos de usuarios seleccionados
  const selectedUserRecords = useMemo(() => {
    const setIds = new Set(selectedUserIds);
    return usersDirectory.filter((u) => setIds.has(u.account.id));
  }, [usersDirectory, selectedUserIds]);

  const areAllFilteredSelected = useMemo(() => {
    if (filteredUsers.length === 0) return false;
    const setIds = new Set(selectedUserIds);
    return filteredUsers.every((u) => setIds.has(u.account.id));
  }, [filteredUsers, selectedUserIds]);

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (areAllFilteredSelected) {
      const filteredSet = new Set(filteredUsers.map((u) => u.account.id));
      setSelectedUserIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([
        ...selectedUserIds,
        ...filteredUsers.map((u) => u.account.id),
      ]);
      setSelectedUserIds(Array.from(merged));
    }
  };

  // Filtrado del Instructivo / Mesa de Ayuda
  const filteredHelpSections = useMemo(() => {
    if (!helpSearch.trim()) return HELP_DESK_SECTIONS;
    const q = helpSearch.toLowerCase();
    return HELP_DESK_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.badge.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.bullets.some((b) => b.toLowerCase().includes(q))
    );
  }, [helpSearch]);

  // Guardar Cupón
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    saveWelcomeCouponConfig(couponForm);
    setCouponSavedMsg("¡Configuración del Cupón de Bienvenida actualizada!");
    setTimeout(() => setCouponSavedMsg(null), 3000);
  };

  // Guardar Webhooks
  const handleSaveWebhooks = (e: React.FormEvent) => {
    e.preventDefault();
    saveWebhookConfig(webhookForm);
    setWebhookStatusMsg("¡Configuración de integraciones guardada!");
    setTimeout(() => setWebhookStatusMsg(null), 3000);
  };

  // Probar conexión Webhook
  const handleTestWebhook = async () => {
    saveWebhookConfig(webhookForm);
    setIsSendingWebhook(true);
    setWebhookStatusMsg("Enviando evento de prueba...");
    const res = await triggerWebhookInBackground("test_ping", {
      mensaje: "Prueba de conexión exitosa desde el Panel de Administración Varietale",
      fecha: new Date().toISOString(),
    });
    setIsSendingWebhook(false);
    setWebhookStatusMsg(
      res.ok ? `✅ Prueba enviada (${res.details})` : `⚠️ ${res.details}`
    );
  };

  // Sincronizar todos los registros actuales hacia Google Sheets / Notion
  const handleBulkSyncWebhook = async () => {
    saveWebhookConfig(webhookForm);
    setIsSendingWebhook(true);
    setWebhookStatusMsg("Sincronizando base de datos completa...");
    const res = await triggerWebhookInBackground("bulk_sync", {
      totalUsers: usersDirectory.length,
      users: usersDirectory.map((u) => ({
        id: u.account.id,
        name: u.account.name,
        username: u.account.username,
        email: u.account.email,
        phone: u.account.phone || "",
        authProvider: u.account.authProvider,
        createdAt: u.account.createdAt,
        tastingsCount: u.tastingsCount,
        avgRating: u.avgRating,
        redirectsCount: u.redirectsCount,
      })),
    });
    setIsSendingWebhook(false);
    setWebhookStatusMsg(
      res.ok
        ? `✅ Sincronización masiva enviada (${res.details})`
        : `⚠️ ${res.details}`
    );
  };

  // Guardar Credenciales de Administrador
  const handleSaveAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCredsForm.username.trim()) return;
    if (adminCredsForm.password.trim().length < 4) return;
    if (adminCredsForm.masterPin.trim().length < 4) return;

    saveAdminCredentials({
      username: adminCredsForm.username.trim(),
      password: adminCredsForm.password.trim(),
      masterPin: adminCredsForm.masterPin.trim(),
    });
    setAdminCredsSavedMsg("¡Tus accesos de Administrador han sido actualizados!");
    setTimeout(() => setAdminCredsSavedMsg(null), 3500);
  };

  // Soporte a cliente: actualizar clave / PIN
  const handleApplyClientSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportModalUser) return;
    const ok = adminResetClientCredentials(
      supportModalUser.account.id,
      supportNewPassword.trim() || undefined,
      supportNewPin.trim() || undefined
    );
    if (ok) {
      setSupportFeedback("¡Credenciales del usuario actualizadas con éxito!");
      setRefreshTick((t) => t + 1);
      setTimeout(() => {
        setSupportFeedback(null);
        setSupportModalUser(null);
        setSupportNewPassword("");
        setSupportNewPin("");
      }, 1500);
    } else {
      setSupportFeedback(
        "Revisa que la clave tenga al menos 4 caracteres o el PIN 4 dígitos."
      );
    }
  };

  // Importar archivo JSON de respaldo
  const handleImportBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        const result = importFullDatabaseBackupJson(content);
        setBackupMsg(result.message);
        if (result.ok) {
          setRefreshTick((t) => t + 1);
          setCouponForm(getWelcomeCouponConfig());
          setWebhookForm(getWebhookConfig());
        }
        setTimeout(() => setBackupMsg(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F5F8FA] pb-28 text-[#01374C]">
      {/* Barra Superior Institucional del Administrador */}
      <header className="bg-[#01374C] text-white border-b border-[#00D9B4]/30 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00D9B4] text-[#01374C] flex items-center justify-center font-black shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest bg-[#00D9B4]/20 text-[#00D9B4] border border-[#00D9B4]/40 px-2 py-0.5 rounded-full">
                  Modo Administrador
                </span>
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-black text-white leading-tight mt-0.5">
                Panel de Control • Mi Bitácora Varietale
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón de Instructivo / Mesa de Ayuda Integrada */}
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#00D9B4]/15 hover:bg-[#00D9B4]/25 border border-[#00D9B4]/40 text-[#00D9B4] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Abrir instructivo rápido de uso del panel de administrador"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Instructivo / Ayuda</span>
            </button>

            {/* Botón de Modo Edición Visual en Vivo sobre la App */}
            {onStartVisualEditMode && (
              <button
                type="button"
                onClick={onStartVisualEditMode}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-300/50 text-emerald-200 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Abrir la aplicación con el Modo de Edición Visual en Vivo para tocar y editar cualquier texto, botón o sabor en pantalla"
              >
                <MousePointerClick className="w-4 h-4 text-[#00D9B4] shrink-0" />
                <span>Editar en Vivo</span>
              </button>
            )}

            {/* Botón de Acceso a Modo Usuario de Prueba */}
            {onLoginAsTestUser && (
              <button
                type="button"
                onClick={onLoginAsTestUser}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Ingresar como Usuario de Prueba (catador.prueba) para validar la experiencia de catación, simular 20 catas y probar la Bitácora sin afectar métricas"
              >
                <FlaskConical className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span>Probar como Usuario</span>
              </button>
            )}

            {/* Botón de Simulación Temporal de 20 Usuarios */}
            {!isSimActive ? (
              <button
                type="button"
                onClick={handleLoadSimulation}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cargar temporalmente 20 usuarios y 68 catas reales de prueba para validar el panel"
              >
                <FlaskConical className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Simular 20 Usuarios</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRemoveSimulation}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Eliminar los 20 usuarios simulados y volver a los datos reales"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Borrar Simulación (20 Usuarios)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleManualRefresh}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Actualizar métricas en vivo"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00D9B4]" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#00D9B4] hover:bg-[#00c4a3] text-[#01374C] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Salir a la App</span>
            </button>
          </div>
        </div>

        {/* Barra de Pestañas del Administrador */}
        <div className="bg-[#002636] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
            {[
              { id: "dashboard", label: "Dashboard General", icon: BarChart3 },
              {
                id: "users",
                label: "Catadores",
                count: stats.totalUsers,
                icon: Users,
              },
              {
                id: "reviews",
                label: "Reseñas",
                count: stats.allReviewsWithNotes.length,
                icon: MessageSquareText,
              },
              {
                id: "catalog",
                label: "Catálogo Web",
                count: liveCoffees.length,
                icon: Coffee,
              },
              {
                id: "texts",
                label: "Textos y Sabores (Editor)",
                icon: Edit3,
              },
              {
                id: "settings",
                label: "Cupón, Integraciones y Seguridad",
                icon: Settings,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[#00D9B4] text-[#01374C] shadow-xs"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span data-cms-locked="true" className="tabular-nums">
                      ({tab.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Notificación de acción del simulador */}
        {simBannerMsg && (
          <div className="bg-[#01374C] text-white px-4 py-3 rounded-2xl shadow-md border border-[#00D9B4]/40 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold">
            <span>{simBannerMsg}</span>
            <button
              type="button"
              onClick={() => setSimBannerMsg(null)}
              className="text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner de Estado de Simulación Activa */}
        {isSimActive && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/25 text-amber-800 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-amber-950">
                  Modo Simulación Funcional Activo (20 Usuarios y 68 Catas Reales de Prueba)
                </p>
                <p className="text-xs text-amber-800">
                  Todos los módulos, filtros, descargas (.CSV / .XLS), rueda de sabores SCA y reseñas (1★ a 5★) operan con datos reales en memoria. Al terminar tu revisión, límpialos en un clic.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveSimulation}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar Simulación Ahora</span>
            </button>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 1: DASHBOARD DE INFORMACIÓN GENERAL
            =================================================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* BLOQUE A: KPIs Ejecutivos Superiores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Usuarios Registrados */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#6A7B85]">
                      Catadores Registrados
                    </span>
                    <InfoHint
                      title="Catadores Registrados"
                      text="Total de cuentas creadas en la aplicación, altas de los últimos 7 y 30 días, y desglose por método de registro (Google vs. Correo)."
                    />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#EBFBFA] text-[#00897B] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="my-1">
                  <strong data-cms-locked="true" className="text-3xl sm:text-4xl font-black text-[#01374C] tabular-nums">
                    {stats.totalUsers}
                  </strong>
                  <span data-cms-locked="true" className="text-xs font-bold text-[#00897B] ml-2">
                    +{stats.usersLast7Days} (últ. 7 días)
                  </span>
                </div>
                <div className="pt-2.5 mt-2 border-t border-[#E8EDF1] flex items-center justify-between text-xs text-[#52646E]">
                  <span>
                    <span>Google:</span>{" "}
                    <strong data-cms-locked="true">{stats.googleUsersCount}</strong>
                  </span>
                  <span>
                    <span>Correo:</span>{" "}
                    <strong data-cms-locked="true">{stats.emailUsersCount}</strong>
                  </span>
                  <span>
                    <span>30d:</span>{" "}
                    <strong data-cms-locked="true">+{stats.usersLast30Days}</strong>
                  </span>
                </div>
              </div>

              {/* KPI 2: Tráfico enviado a varietale.com */}
              <div className="bg-[#01374C] text-white rounded-2xl p-5 border border-[#00D9B4]/30 shadow-md flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#00D9B4]">
                      Redirecciones a varietale.com
                    </span>
                    <InfoHint
                      variant="dark"
                      title="Tráfico a varietale.com"
                      text="Cuenta cuántas veces los usuarios se han redirigido a la tienda web varietale.com. Filtra por período con las píldoras o abre el expediente de auditoría completa con descargas."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditRange(kpi2TimeRange);
                      setIsRedirectAuditModalOpen(true);
                    }}
                    title="Abrir Auditoría y Detalle de Redirecciones (con descargas en Excel y CSV)"
                    className="w-8 h-8 rounded-xl bg-[#00D9B4]/20 hover:bg-[#00D9B4]/35 text-[#00D9B4] flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {/* Selector de Rango Temporal Rápido en la Tarjeta */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 no-scrollbar">
                  {(
                    [
                      { id: "all", label: "Todo" },
                      { id: "today", label: "Hoy" },
                      { id: "7d", label: "7d" },
                      { id: "30d", label: "30d" },
                      { id: "quarter", label: "Trimestre" },
                      { id: "year_trailing", label: "Año" },
                    ] as const
                  ).map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setKpi2TimeRange(pill.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                        kpi2TimeRange === pill.id
                          ? "bg-[#00D9B4] text-[#01374C] shadow-xs"
                          : "bg-white/10 hover:bg-white/20 text-white/80"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="my-1 flex items-baseline justify-between">
                  <div>
                    <strong data-cms-locked="true" className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                      {kpi2Stats.totalClicks}
                    </strong>
                    <span className="text-xs font-semibold text-[#00D9B4] ml-2">
                      clics hacia tienda web
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditRange(kpi2TimeRange);
                      setIsRedirectAuditModalOpen(true);
                    }}
                    className="text-[11px] text-[#00D9B4] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    Auditoría
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="pt-2.5 mt-2 border-t border-white/15 grid grid-cols-2 gap-1 text-[11px] text-white/85">
                  <span>
                    <span>Inicio:</span>{" "}
                    <strong data-cms-locked="true">{kpi2Stats.redirectsBySource.home_store_btn}</strong>
                  </span>
                  <span>
                    <span>Cupón 10%:</span>{" "}
                    <strong data-cms-locked="true">{kpi2Stats.redirectsBySource.welcome_coupon_btn}</strong>
                  </span>
                  <span>
                    <span>Recompra:</span>{" "}
                    <strong data-cms-locked="true">{kpi2Stats.redirectsBySource.rebuy_recommendation}</strong>
                  </span>
                  <span>
                    <span>Pestaña Lateral:</span>{" "}
                    <strong data-cms-locked="true">{kpi2Stats.redirectsBySource.floating_varietale_btn || 0}</strong>
                  </span>
                  <span className="col-span-2">
                    <span>Footer/Catálogo:</span>{" "}
                    <strong data-cms-locked="true">
                      {kpi2Stats.redirectsBySource.footer_link +
                        kpi2Stats.redirectsBySource.catalog_product}
                    </strong>
                  </span>
                </div>
              </div>

              {/* KPI 3: Total de Cataciones Realizadas */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#6A7B85]">
                      Cataciones Realizadas
                    </span>
                    <InfoHint
                      title="Cataciones Realizadas"
                      text="Suma total de bitácoras de cata guardadas por todos los usuarios y promedio de catas hechas por cada catador registrado."
                    />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6F2] text-[#01374C] flex items-center justify-center border border-[#DDC1AB]">
                    <Coffee className="w-5 h-5" />
                  </div>
                </div>
                <div className="my-1">
                  <strong data-cms-locked="true" className="text-3xl sm:text-4xl font-black text-[#01374C] tabular-nums">
                    {stats.totalTastings}
                  </strong>
                  <span className="text-xs font-bold text-[#6A7B85] ml-2">
                    catas guardadas
                  </span>
                </div>
                <div className="pt-2.5 mt-2 border-t border-[#E8EDF1] flex items-center justify-between text-xs text-[#52646E]">
                  <span>Promedio por usuario:</span>
                  <strong data-cms-locked="true" className="text-[#01374C] font-black">
                    {stats.avgTastingsPerUser} catas
                  </strong>
                </div>
              </div>

              {/* KPI 4: Calificación Promedio Global & Viralidad */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#6A7B85]">
                      Calificación & Viralidad
                    </span>
                    <InfoHint
                      title="Calificación y Viralidad"
                      text="Promedio general en estrellas (1★ a 5★) de todas las catas registradas y número de veces que los usuarios han compartido la app."
                    />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-200">
                    <Star className="w-5 h-5 fill-amber-400" />
                  </div>
                </div>
                <div className="my-1 flex items-baseline gap-2">
                  <strong data-cms-locked="true" className="text-3xl sm:text-4xl font-black text-[#01374C] tabular-nums">
                    {stats.globalAvgRating > 0 ? `${stats.globalAvgRating} ★` : "—"}
                  </strong>
                  <span className="text-xs font-bold text-[#6A7B85]">de 5.0 ★</span>
                </div>
                <div className="pt-2.5 mt-2 border-t border-[#E8EDF1] flex items-center justify-between text-xs text-[#52646E]">
                  <span>Veces compartida la App:</span>
                  <strong data-cms-locked="true" className="text-[#00897B] font-black">
                    {stats.sharesTotal} veces
                  </strong>
                </div>
              </div>
            </div>

            {/* BLOQUE B: Ranking de Usuarios que Más Usan Mi Bitácora + Fidelización */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Ranking Top Catadores */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E8EDF1]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                          Ranking de Usuarios que Más Usan Mi Bitácora
                        </h2>
                        <InfoHint
                          title="Ranking de Catadores"
                          text="Muestra los usuarios más activos ordenados por su número de catas hechas, cafés distintos probados y visitas hacia varietale.com."
                        />
                      </div>
                      <p className="text-xs text-[#6A7B85]">
                        Ordenado por número de catas hechas y actividad hacia varietale.com
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("users")}
                    className="text-xs font-bold text-[#00897B] hover:text-[#01374C] underline cursor-pointer self-start sm:self-center"
                  >
                    Ver directorio completo →
                  </button>
                </div>

                {stats.topActiveUsers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#6A7B85] bg-[#FAF6F2]/60 rounded-xl border border-dashed border-[#DDC1AB]">
                    Aún no hay usuarios reales registrados en este dispositivo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[#E8EDF1] text-[#6A7B85] uppercase text-[11px] font-extrabold">
                          <th className="py-2.5 pr-2">#</th>
                          <th className="py-2.5 px-2">Catador</th>
                          <th className="py-2.5 px-2 text-center">Catas Hechas</th>
                          <th className="py-2.5 px-2 text-center">Cafés Únicos</th>
                          <th className="py-2.5 px-2 text-center">Promedio ★</th>
                          <th className="py-2.5 pl-2 text-center">Visitas a varietale.com</th>
                        </tr>
                      </thead>
                      <tbody data-cms-locked="true" className="divide-y divide-[#E8EDF1]">
                        {stats.topActiveUsers.slice(0, 8).map((u, index) => (
                          <tr
                            key={u.account.id}
                            className="hover:bg-[#FAF6F2]/60 transition-colors"
                          >
                            <td className="py-3 pr-2 font-black">
                              <span
                                className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs ${
                                  index === 0
                                    ? "bg-amber-400 text-[#01374C]"
                                    : index === 1
                                    ? "bg-slate-200 text-[#01374C]"
                                    : index === 2
                                    ? "bg-amber-700/20 text-amber-900"
                                    : "bg-[#F5F8FA] text-[#6A7B85]"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="font-black text-[#01374C]">
                                {u.account.name}
                              </div>
                              <div className="text-xs text-[#6A7B85]">
                                @{u.account.username}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-full bg-[#01374C] text-[#00D9B4] font-black text-xs">
                                {u.tastingsCount} catas
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-[#01374C]">
                              {u.uniqueCoffeesCount}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-amber-600">
                              {u.avgRating > 0 ? `${u.avgRating} ★` : "—"}
                            </td>
                            <td className="py-3 pl-2 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EBFBFA] text-[#00897B] font-extrabold text-xs border border-[#00D9B4]/30">
                                {u.redirectsCount} clics
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Embudo de Fidelización y Actividad Reciente */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-black text-[#01374C]">
                      Nivel de Actividad de Usuarios
                    </h3>
                    <InfoHint
                      title="Nivel de Actividad"
                      text="Segmenta a los usuarios según su hábito: frecuentes (+4 catas), en exploración (1 a 3 catas) o registrados que aún no han hecho su primera cata (0 catas)."
                    />
                  </div>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60 flex items-center justify-between">
                      <span className="font-semibold text-[#4A5D68]">
                        Catadores frecuentes (+4 catas)
                      </span>
                      <strong data-cms-locked="true" className="text-base font-black text-[#00897B] tabular-nums">
                        {stats.retentionFunnel.fourPlusTastings}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60 flex items-center justify-between">
                      <span className="font-semibold text-[#4A5D68]">
                        En exploración (1 a 3 catas)
                      </span>
                      <strong data-cms-locked="true" className="text-base font-black text-[#01374C] tabular-nums">
                        {stats.retentionFunnel.oneToThreeTastings}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60 flex items-center justify-between">
                      <span className="font-semibold text-[#4A5D68]">
                        Solo registrados (0 catas)
                      </span>
                      <strong data-cms-locked="true" className="text-base font-black text-[#6A7B85] tabular-nums">
                        {stats.retentionFunnel.zeroTastings}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Últimas Catas en Vivo */}
                <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-black text-[#01374C]">
                      Últimas Catas Registradas
                    </h3>
                    <InfoHint
                      title="Últimas Catas"
                      text="Muestra las últimas 6 catas guardadas en la app con su autor, método de preparación y calificación."
                    />
                  </div>
                  {stats.recentTastings.length === 0 ? (
                    <p className="text-xs text-[#6A7B85] py-4 text-center">
                      Sin catas recientes.
                    </p>
                  ) : (
                    <div data-cms-locked="true" className="space-y-2.5">
                      {stats.recentTastings.map(({ tasting, userName }) => (
                        <div
                          key={tasting.id}
                          className="p-2.5 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-black text-[#01374C] truncate">
                              {tasting.coffeeName}
                            </div>
                            <div className="text-[#6A7B85] truncate">
                              Por {userName} • {tasting.brewMethod.toUpperCase()}
                            </div>
                          </div>
                          <span className="shrink-0 font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {tasting.rating} ★
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BLOQUE C: Inteligencia Sensorial (Sabores Más Percibidos Y Mejor Calificados) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Las 9 Familias de la Rueda SCA */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs">
                <div className="mb-4 pb-3 border-b border-[#E8EDF1]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                      Familias de la Rueda SCA: Frecuencia y Calificación
                    </h2>
                    <InfoHint
                      title="Familias de la Rueda SCA"
                      text="Muestra el porcentaje (%) de veces que los catadores perciben cada una de las 9 familias sensoriales y la calificación promedio en estrellas (★) de las catas donde aparece esa familia."
                    />
                  </div>
                  <p className="text-xs text-[#6A7B85] mt-0.5">
                    Qué familias detectan más los usuarios y qué calificación promedio (★) obtienen
                  </p>
                </div>

                <div data-cms-locked="true" className="space-y-3">
                  {stats.macroFamiliesStats.map((item) => {
                    const theme = MACRO_THEMES[item.macro] || MACRO_THEMES.Frutal;
                    return (
                      <div key={item.macro} className="space-y-1">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: theme.color }}
                            />
                            <span className="font-black text-[#01374C]">{item.macro}</span>
                            <span className="text-xs text-[#6A7B85]">
                              ({item.count} menciones)
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-black text-[#01374C]">
                              {item.percentage}%
                            </span>
                            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              {item.avgRating > 0 ? `${item.avgRating} ★` : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-[#F5F8FA] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(item.percentage, item.count > 0 ? 4 : 0)}%`,
                              backgroundColor: theme.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Sabores Específicos (de los 85 de la rueda) */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E8EDF1]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                          Top Sabores Específicos de la Rueda
                        </h2>
                        <InfoHint
                          title="Top Sabores Específicos"
                          text="Alterna entre 'Más Percibidos' (los sabores que más veces eligen los usuarios) y 'Mejor Calificados ★' (los sabores asociados a las catas con mayor puntaje)."
                        />
                      </div>
                      <p className="text-xs text-[#6A7B85] mt-0.5">
                        Descriptores individuales más detectados y mejor calificados
                      </p>
                    </div>
                    <div className="flex bg-[#F5F8FA] p-1 rounded-xl border border-[#E8EDF1] self-start">
                      <button
                        type="button"
                        onClick={() => setFlavorSortMode("count")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          flavorSortMode === "count"
                            ? "bg-[#01374C] text-white"
                            : "text-[#6A7B85] hover:text-[#01374C]"
                        }`}
                      >
                        Más Percibidos
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlavorSortMode("rating")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          flavorSortMode === "rating"
                            ? "bg-[#01374C] text-white"
                            : "text-[#6A7B85] hover:text-[#01374C]"
                        }`}
                      >
                        Mejor Calificados ★
                      </button>
                    </div>
                  </div>

                  {(flavorSortMode === "count"
                    ? stats.topSpecificFlavorsByCount
                    : stats.topSpecificFlavorsByRating
                  ).length === 0 ? (
                    <div className="text-center py-8 text-sm text-[#6A7B85] bg-[#FAF6F2]/60 rounded-xl border border-dashed border-[#DDC1AB]">
                      Se poblará automáticamente a medida que los usuarios seleccionen sabores en la rueda.
                    </div>
                  ) : (
                    <div data-cms-locked="true" className="space-y-2">
                      {(flavorSortMode === "count"
                        ? stats.topSpecificFlavorsByCount
                        : stats.topSpecificFlavorsByRating
                      ).map((flv, idx) => (
                        <div
                          key={flv.id}
                          className="p-2.5 rounded-xl bg-[#FAF6F2]/70 border border-[#E8EDF1] flex items-center justify-between gap-2 text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xs font-black text-[#6A7B85] w-4">
                              {idx + 1}.
                            </span>
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: flv.color }}
                            />
                            <div className="min-w-0">
                              <span className="font-black text-[#01374C] truncate block">
                                {flv.label}
                              </span>
                              <span className="text-[11px] text-[#6A7B85]">
                                Familia: {flv.macro} • Intensidad media: {flv.avgIntensity}/5
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#DDC1AB] font-extrabold text-xs text-[#01374C]">
                              {flv.count} catas
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 font-black text-xs text-amber-700">
                              {flv.avgRating} ★
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BLOQUE D: Cafés Más Catados, Cuota de Marca (Varietale vs Competencia) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Cafés Más Catados y Mejor Calificados */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                    Top Cafés Más Catados y su Calificación
                  </h2>
                  <InfoHint
                    title="Top Cafés Más Catados"
                    text="Lista los cafés con mayor cantidad de catas registradas, indicando su marca y su calificación promedio en estrellas."
                  />
                </div>
                <p className="text-xs text-[#6A7B85] mb-4 pb-3 border-b border-[#E8EDF1]">
                  Ranking de cafés evaluados por los usuarios y su promedio en estrellas
                </p>

                {stats.topCoffees.length === 0 ? (
                  <p className="text-xs text-[#6A7B85] py-6 text-center">
                    Aún no hay cafés evaluados.
                  </p>
                ) : (
                  <div data-cms-locked="true" className="space-y-2.5">
                    {stats.topCoffees.map((c, idx) => (
                      <div
                        key={`${c.coffeeName}-${idx}`}
                        className="p-3 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] flex items-center justify-between gap-2 text-xs sm:text-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-[#01374C] truncate">
                              {idx + 1}. {c.coffeeName}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                c.brand === "VARIETALE"
                                  ? "bg-[#01374C] text-[#00D9B4]"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {c.brand}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-[#4A5D68]">{c.count} catas</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 font-black text-amber-700">
                            {c.avgRating} ★
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cuota de Marca: VARIETALE vs. Otras Marcas (Competencia) */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                    VARIETALE vs. Otras Marcas (Competencia)
                  </h2>
                  <InfoHint
                    title="Cuota de Marca y Competencia"
                    text="Compara el porcentaje de catas de cafés oficiales de Varietale frente a otras marcas ingresadas manualmente por los usuarios, junto con la calificación de cada marca competidora."
                  />
                </div>
                <p className="text-xs text-[#6A7B85] mb-4 pb-3 border-b border-[#E8EDF1]">
                  Comparativa entre cafés oficiales de Varietale y otras marcas ingresadas manualmente
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-2xl bg-[#01374C] text-white">
                    <span className="text-[11px] uppercase font-black text-[#00D9B4] block">
                      Marca VARIETALE
                    </span>
                    <strong data-cms-locked="true" className="text-2xl sm:text-3xl font-black block mt-1 tabular-nums">
                      {stats.brandShare.varietalePct}%
                    </strong>
                    <span data-cms-locked="true" className="text-xs text-white/80 block mt-1">
                      {stats.brandShare.varietaleCount} catas • Promedio:{" "}
                      <strong>{stats.brandShare.varietaleAvgRating || "—"} ★</strong>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] text-[#01374C]">
                    <span className="text-[11px] uppercase font-black text-[#6A7B85] block">
                      Otras Marcas
                    </span>
                    <strong data-cms-locked="true" className="text-2xl sm:text-3xl font-black block mt-1 tabular-nums">
                      {stats.brandShare.otherBrandsPct}%
                    </strong>
                    <span data-cms-locked="true" className="text-xs text-[#52646E] block mt-1">
                      {stats.brandShare.otherBrandsCount} catas • Promedio:{" "}
                      <strong>{stats.brandShare.otherBrandsAvgRating || "—"} ★</strong>
                    </span>
                  </div>
                </div>

                <span className="text-xs font-extrabold uppercase tracking-wider text-[#6A7B85] block mb-2">
                  Otras marcas registradas por los usuarios:
                </span>
                {stats.brandShare.competitorBrandsList.length === 0 ? (
                  <p className="text-xs text-[#6A7B85] bg-[#F5F8FA] p-3 rounded-xl">
                    Aún no se han registrado cafés de otras marcas.
                  </p>
                ) : (
                  <div data-cms-locked="true" className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {stats.brandShare.competitorBrandsList.map((comp) => (
                      <div
                        key={comp.brand}
                        className="p-2.5 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] flex items-center justify-between text-xs"
                      >
                        <strong className="text-[#01374C]">{comp.brand}</strong>
                        <div className="flex items-center gap-2">
                          <span className="text-[#6A7B85]">{comp.count} catas</span>
                          <span className="font-black text-amber-700">
                            {comp.avgRating} ★
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preferencias de Mercado: Variedades, Beneficios, Orígenes y Métodos de Preparación */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Variedades Botánicas */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E8EDF1]">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#01374C]">
                    🌱 Variedades Preferidas
                  </h3>
                  <InfoHint
                    title="Variedades Preferidas"
                    text="Variedades botánicas (Geisha, Castillo, Pink Bourbon, etc.) con más catas y su calificación media."
                  />
                </div>
                {stats.topVarieties.length === 0 ? (
                  <p className="text-xs text-[#6A7B85]">Sin datos aún</p>
                ) : (
                  <div data-cms-locked="true" className="space-y-2 text-xs">
                    {stats.topVarieties.map((v) => (
                      <div key={v.name} className="flex items-center justify-between">
                        <span className="font-bold text-[#01374C] truncate pr-2">
                          {v.name}
                        </span>
                        <span className="shrink-0 text-[#6A7B85]">
                          {v.count} ({v.avgRating}★)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Procesos de Beneficio */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E8EDF1]">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#01374C]">
                    🍒 Beneficios Preferidos
                  </h3>
                  <InfoHint
                    title="Beneficios Preferidos"
                    text="Procesos post-cosecha (Lavado, Natural, Honey, etc.) más catados y mejor valorados por tus clientes."
                  />
                </div>
                {stats.topProcesses.length === 0 ? (
                  <p className="text-xs text-[#6A7B85]">Sin datos aún</p>
                ) : (
                  <div data-cms-locked="true" className="space-y-2 text-xs">
                    {stats.topProcesses.map((p) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <span className="font-bold text-[#01374C] truncate pr-2">
                          {p.name}
                        </span>
                        <span className="shrink-0 text-[#6A7B85]">
                          {p.count} ({p.avgRating}★)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Orígenes / Departamentos */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E8EDF1]">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#01374C]">
                    ⛰️ Orígenes Más Catados
                  </h3>
                  <InfoHint
                    title="Orígenes Más Catados"
                    text="Regiones o departamentos de origen que más registran los usuarios en sus catas."
                  />
                </div>
                {stats.topOrigins.length === 0 ? (
                  <p className="text-xs text-[#6A7B85]">Sin datos aún</p>
                ) : (
                  <div data-cms-locked="true" className="space-y-2 text-xs">
                    {stats.topOrigins.map((o) => (
                      <div key={o.name} className="flex items-center justify-between">
                        <span className="font-bold text-[#01374C] truncate pr-2">
                          {o.name}
                        </span>
                        <span className="shrink-0 text-[#6A7B85]">
                          {o.count} ({o.avgRating}★)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Métodos de Preparación y Cuerpo */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8EDF1] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E8EDF1]">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#01374C]">
                      ☕ Métodos Favoritos
                    </h3>
                    <InfoHint
                      title="Métodos y Cuerpo"
                      text="Métodos de preparación más usados por los catadores (V60, Chemex, Prensa, Espresso, etc.) y cuerpo percibido en taza."
                    />
                  </div>
                  {stats.brewMethodsRanking.length === 0 ? (
                    <p className="text-xs text-[#6A7B85]">Sin datos aún</p>
                  ) : (
                    <div data-cms-locked="true" className="space-y-2 text-xs">
                      {stats.brewMethodsRanking.slice(0, 5).map((m) => (
                        <div
                          key={m.methodId}
                          className="flex items-center justify-between"
                        >
                          <span className="font-bold text-[#01374C]">{m.methodName}</span>
                          <span className="text-[#00897B] font-extrabold">
                            {m.percentage}% ({m.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#E8EDF1] text-[11px] flex items-center justify-between text-[#52646E]">
                  <span>Cuerpo:</span>
                  <span>
                    <span>Ligero:</span>{" "}
                    <strong data-cms-locked="true">{stats.bodyDistribution.ligero}</strong>
                  </span>
                  <span>
                    <span>Medio:</span>{" "}
                    <strong data-cms-locked="true">{stats.bodyDistribution.medio}</strong>
                  </span>
                  <span>
                    <span>Denso:</span>{" "}
                    <strong data-cms-locked="true">{stats.bodyDistribution.denso}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* BLOQUE E: Rendimiento del Cupón, Motor de Recompra y Viralidad / PWA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cupón de Bienvenida */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EBFBFA] text-[#00897B] flex items-center justify-center">
                      <Gift className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#01374C]">
                        Cupón de Bienvenida
                      </h3>
                      <span className="text-[11px] text-[#6A7B85]">
                        <span>Código activo:</span>{" "}
                        <strong data-cms-locked="true">{couponForm.couponCode}</strong>
                      </span>
                    </div>
                  </div>
                  <InfoHint
                    title="Cupón de Bienvenida"
                    text="Contabiliza cuántas veces los usuarios han copiado el código de descuento y cuántos clics han hecho hacia la tienda desde la tarjeta del cupón."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60">
                    <strong data-cms-locked="true" className="text-xl font-black text-[#01374C] block tabular-nums">
                      {stats.couponCopiesCount}
                    </strong>
                    <span className="text-[11px] text-[#52646E]">Veces copiado</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60">
                    <strong data-cms-locked="true" className="text-xl font-black text-[#00897B] block tabular-nums">
                      {stats.couponClicksCount}
                    </strong>
                    <span className="text-[11px] text-[#52646E]">Clics a tienda 10%</span>
                  </div>
                </div>
              </div>

              {/* Motor de Recomendación de Recompra */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center">
                      <ShoppingBag className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#01374C]">
                        Recompra Inteligente
                      </h3>
                      <span className="text-[11px] text-[#6A7B85]">
                        <span>Total clics en recomendaciones:</span>{" "}
                        <strong data-cms-locked="true" className="tabular-nums">{stats.rebuyRecommendationsClicks}</strong>
                      </span>
                    </div>
                  </div>
                  <InfoHint
                    title="Recompra Inteligente"
                    text="Mide cuántos clics a varietale.com genera la sugerencia personalizada de café al finalizar cada cata."
                  />
                </div>
                {stats.rebuyByCoffee.length === 0 ? (
                  <p className="text-xs text-[#6A7B85] bg-[#F5F8FA] p-3 rounded-xl text-center">
                    Sin clics en cafés recomendados aún.
                  </p>
                ) : (
                  <div data-cms-locked="true" className="space-y-1.5 text-xs">
                    {stats.rebuyByCoffee.slice(0, 3).map((item) => (
                      <div
                        key={item.coffeeName}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F5F8FA]"
                      >
                        <span className="font-bold text-[#01374C] truncate">
                          {item.coffeeName}
                        </span>
                        <strong className="text-[#00897B]">{item.clicks} clics</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Viralidad (Compartidos) y Dispositivos PWA */}
              <div className="bg-white rounded-2xl p-5 border border-[#E8EDF1] shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EBFBFA] text-[#00897B] flex items-center justify-center">
                      <Share2 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#01374C]">
                        Viralidad & Uso en Celular
                      </h3>
                      <span className="text-[11px] text-[#6A7B85]">
                        <span>Total compartidos:</span>{" "}
                        <strong data-cms-locked="true" className="tabular-nums">{stats.sharesTotal}</strong>
                      </span>
                    </div>
                  </div>
                  <InfoHint
                    title="Viralidad y Dispositivos"
                    text="Veces que han compartido la app desde la pestaña lateral (WhatsApp, link copiado u otras apps) y cuántos usuarios usan la app instalada en su celular (PWA) frente al navegador."
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs mb-2.5">
                  <div className="p-2 rounded-xl bg-[#F5F8FA]">
                    <strong data-cms-locked="true" className="font-black text-[#01374C] block tabular-nums">
                      {stats.sharesByChannel.whatsapp}
                    </strong>
                    <span className="text-[10px] text-[#6A7B85]">WhatsApp</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#F5F8FA]">
                    <strong data-cms-locked="true" className="font-black text-[#01374C] block tabular-nums">
                      {stats.sharesByChannel.copy_link}
                    </strong>
                    <span className="text-[10px] text-[#6A7B85]">Link copiado</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#F5F8FA]">
                    <strong data-cms-locked="true" className="font-black text-[#01374C] block tabular-nums">
                      {stats.sharesByChannel.native_share}
                    </strong>
                    <span className="text-[10px] text-[#6A7B85]">Otras Apps</span>
                  </div>
                </div>
                <div className="text-[11px] text-[#52646E] flex items-center justify-between pt-2 border-t border-[#E8EDF1]">
                  <span>
                    <span>App instalada (PWA):</span>{" "}
                    <strong data-cms-locked="true" className="tabular-nums">{stats.pwaInstalledUsersCount}</strong>
                  </span>
                  <span>
                    <span>Navegador:</span>{" "}
                    <strong data-cms-locked="true" className="tabular-nums">{stats.browserUsersCount}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 2: DIRECTORIO DE CATADORES (CRM, FILTROS, GRUPOS Y EXPORTACIÓN)
            =================================================================== */}
        {activeTab === "users" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4">
              {/* Encabezado y Botones Globales de Descarga (.CSV y .XLS Excel) */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E8EDF1]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-[#01374C]">
                      <span>Directorio de Catadores Registrados</span>{" "}
                      <span data-cms-locked="true" className="tabular-nums">
                        ({filteredUsers.length} de {usersDirectory.length})
                      </span>
                    </h2>
                    <InfoHint
                      title="Directorio de Catadores (CRM)"
                      text="Explora y filtra a tus usuarios por cualquier característica, márcalos individualmente o en grupo con las casillas y descarga sus datos o catas en formato .CSV o Excel (.XLS)."
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-[#6A7B85] mt-0.5">
                    Filtra por actividad o perfil sensorial, selecciona catadores para exportar individualmente o en grupo, y gestiona soporte de acceso.
                  </p>
                </div>

                {/* Botones de Descarga Directa (.CSV y .XLS Excel) para los registros filtrados/totales */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-xl bg-[#01374C] p-1 shadow-xs">
                    <span className="px-2.5 text-[11px] font-extrabold text-[#00D9B4] flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      <span>Usuarios</span>
                      <span data-cms-locked="true" className="tabular-nums">
                        ({filteredUsers.length}):
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        exportUsersDirectoryToCsv(
                          filteredUsers,
                          activeUserFiltersCount > 0 ? "filtrados" : "todos"
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-colors cursor-pointer"
                      title="Descargar listado de usuarios en formato .CSV"
                    >
                      .CSV
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        exportUsersDirectoryToExcel(
                          filteredUsers,
                          activeUserFiltersCount > 0 ? "filtrados" : "todos"
                        )
                      }
                      className="ml-1 px-2.5 py-1.5 rounded-lg bg-[#00D9B4] hover:bg-[#00c4a3] text-[#01374C] text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                      title="Descargar listado de usuarios en libro de Excel (.XLS)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.XLS)</span>
                    </button>
                  </div>

                  <div className="inline-flex items-center rounded-xl bg-[#FAF6F2] border border-[#DDC1AB] p-1">
                    <span className="px-2.5 text-[11px] font-extrabold text-[#01374C] flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5" />
                      Catas:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        exportAllTastingsToCsv(
                          filteredUsers,
                          activeUserFiltersCount > 0 ? "filtrados" : "todas"
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] text-xs font-black transition-colors cursor-pointer"
                      title="Descargar historial de catas en formato .CSV"
                    >
                      .CSV
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        exportAllTastingsToExcel(
                          filteredUsers,
                          activeUserFiltersCount > 0 ? "filtrados" : "todas"
                        )
                      }
                      className="ml-1 px-2.5 py-1.5 rounded-lg bg-[#01374C] hover:bg-[#002636] text-[#00D9B4] text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                      title="Descargar historial de catas en libro de Excel (.XLS)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.XLS)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel Completo de Filtros Multicriterio */}
              <div className="p-4 rounded-2xl bg-[#F5F8FA] border border-[#E8EDF1] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#00897B]" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#01374C]">
                      Filtros de Exploración de Catadores
                    </span>
                    <InfoHint
                      title="Filtros Multicriterio"
                      text="Combina varios filtros al mismo tiempo (ej. Catadores frecuentes + Que visitaron varietale.com + Familia Frutal). Luego puedes marcar los resultados y exportarlos en CSV o Excel."
                    />
                    {activeUserFiltersCount > 0 && (
                      <span data-cms-locked="true" className="px-2 py-0.5 rounded-full bg-[#00D9B4] text-[#01374C] text-[10px] font-black">
                        {activeUserFiltersCount} filtro(s) activo(s)
                      </span>
                    )}
                  </div>

                  {activeUserFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={resetAllUserFilters}
                      className="text-xs font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpiar todos los filtros</span>
                    </button>
                  )}
                </div>

                {/* Buscador de texto */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre, @usuario, correo, teléfono o nombre de café catado..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs sm:text-sm text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                  />
                </div>

                {/* Grilla de selectores de variantes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* 1. Nivel de actividad */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Nivel de Actividad (Catas)
                    </label>
                    <select
                      value={userActivityFilter}
                      onChange={(e) => setUserActivityFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="all">Todos los niveles</option>
                      <option value="frequent">Frecuentes (+4 catas)</option>
                      <option value="exploring">En exploración (1 a 3 catas)</option>
                      <option value="zero">Solo registrados (0 catas)</option>
                    </select>
                  </div>

                  {/* 2. Visitas a varietale.com */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Visitas a varietale.com
                    </label>
                    <select
                      value={userRedirectFilter}
                      onChange={(e) => setUserRedirectFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="all">Todas las visitas</option>
                      <option value="visited">Con clics a tienda (≥ 1 visita)</option>
                      <option value="none">Sin clics a tienda (0 visitas)</option>
                    </select>
                  </div>

                  {/* 3. Marca catada */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Marca Catada
                    </label>
                    <select
                      value={userBrandFilter}
                      onChange={(e) => setUserBrandFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="all">Cualquier marca</option>
                      <option value="varietale">Ha catado VARIETALE</option>
                      <option value="competitor">Ha catado Otras Marcas</option>
                    </select>
                  </div>

                  {/* 4. Familia de Sabor Favorita */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Familia Sensorial Favorita (SCA)
                    </label>
                    <select
                      value={userMacroFilter}
                      onChange={(e) => setUserMacroFilter(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="all">Todas las familias SCA</option>
                      {SCA_MACRO_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          Familia: {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Método de Registro */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Tipo de Acceso
                    </label>
                    <select
                      value={userAuthFilter}
                      onChange={(e) => setUserAuthFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="all">Todos (Google + Correo)</option>
                      <option value="google">Solo Google</option>
                      <option value="email">Solo Correo y Clave</option>
                    </select>
                  </div>

                  {/* 6. Viralidad / Compartidos */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Ha Compartido la App
                    </label>
                    <select
                      value={userShareFilter}
                      onChange={(e) => setUserShareFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="all">Todos</option>
                      <option value="shared">Sí ha compartido (≥ 1 vez)</option>
                      <option value="none">No ha compartido (0)</option>
                    </select>
                  </div>

                  {/* 7. Dispositivo (PWA vs Navegador) */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Dispositivo / Instalación
                    </label>
                    <select
                      value={userDeviceFilter}
                      onChange={(e) => setUserDeviceFilter(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="all">Todos los dispositivos</option>
                      <option value="pwa">App Instalada en Celular (PWA)</option>
                      <option value="browser">Navegador Web</option>
                    </select>
                  </div>

                  {/* 8. Ordenar por */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-[#6A7B85] mb-1">
                      Ordenar Listado Por
                    </label>
                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                    >
                      <option value="most_tastings">Más catas hechas</option>
                      <option value="most_redirects">Más visitas a varietale.com</option>
                      <option value="highest_rating">Mayor calificación promedio ★</option>
                      <option value="lowest_rating">Menor calificación promedio ★</option>
                      <option value="newest">Fecha de registro (Más recientes)</option>
                      <option value="oldest">Fecha de registro (Más antiguos)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Barra Contextual de Selección Individual / Grupal */}
              {selectedUserIds.length > 0 && (
                <div className="p-3.5 sm:px-5 rounded-2xl bg-[#01374C] text-white border border-[#00D9B4]/50 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span data-cms-locked="true" className="px-3 py-1 rounded-full bg-[#00D9B4] text-[#01374C] font-black text-xs">
                      {selectedUserIds.length} seleccionado(s)
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white/90">
                      Exporta únicamente los catadores señalados o sus cataciones:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        exportUsersDirectoryToCsv(
                          selectedUserRecords,
                          `seleccion_${selectedUserRecords.length}`
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#00D9B4]" />
                      <span>Usuarios (.CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportUsersDirectoryToExcel(
                          selectedUserRecords,
                          `seleccion_${selectedUserRecords.length}`
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#00D9B4] hover:bg-[#00c4a3] text-[#01374C] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Usuarios (Excel .XLS)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportAllTastingsToCsv(
                          selectedUserRecords,
                          `seleccion_${selectedUserRecords.length}`
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>Catas del Grupo (.CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportAllTastingsToExcel(
                          selectedUserRecords,
                          `seleccion_${selectedUserRecords.length}`
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-400 text-[#01374C] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Catas del Grupo (Excel .XLS)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="px-2.5 py-1.5 rounded-xl text-white/75 hover:text-white text-xs font-bold underline cursor-pointer"
                    >
                      Desmarcar todos
                    </button>
                  </div>
                </div>
              )}

              {/* Controles Superiores de Selección Rápida y Paginación Personalizable */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#52646E]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    {areAllFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#00897B]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#6A7B85]" />
                    )}
                    <span>
                      <span>
                        {areAllFilteredSelected
                          ? "Desmarcar filtrados"
                          : "Seleccionar todos los filtrados"}
                      </span>{" "}
                      <span data-cms-locked="true" className="tabular-nums">
                        ({filteredUsers.length})
                      </span>
                    </span>
                  </button>

                  {selectedUserIds.length > 0 && (
                    <span data-cms-locked="true" className="font-bold text-[#00897B]">
                      • {selectedUserIds.length} catador(es) marcado(s)
                    </span>
                  )}
                </div>

                {/* Selector de Paginación Personalizable */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="font-bold text-[#01374C]">Mostrar por página:</span>
                  {[
                    { label: "10", value: 10 },
                    { label: "25", value: 25 },
                    { label: "30", value: 30 },
                    { label: "50", value: 50 },
                    { label: "Todos", value: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setUsersPerPage(opt.value)}
                      className={`px-2.5 py-1 rounded-lg font-black text-xs transition-colors cursor-pointer ${
                        usersPerPage === opt.value
                          ? "bg-[#01374C] text-[#00D9B4]"
                          : "bg-[#F5F8FA] text-[#52646E] hover:bg-[#E8EDF1]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-sm text-[#6A7B85] bg-[#FAF6F2]/50 rounded-2xl border border-dashed border-[#DDC1AB]">
                  No se encontraron catadores con esa combinación de filtros.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#E8EDF1] text-[#6A7B85] uppercase text-[11px] font-extrabold">
                        <th className="py-3 pr-2 w-9 text-center">
                          <input
                            type="checkbox"
                            checked={areAllFilteredSelected}
                            onChange={toggleSelectAllFiltered}
                            title="Seleccionar o desmarcar todos los usuarios filtrados"
                            className="w-4 h-4 accent-[#01374C] cursor-pointer"
                          />
                        </th>
                        <th className="py-3 pr-2">Catador / Perfil</th>
                        <th className="py-3 px-2">Contacto</th>
                        <th className="py-3 px-2 text-center">Acceso / Alta</th>
                        <th className="py-3 px-2 text-center">Catas / Sabor</th>
                        <th className="py-3 px-2 text-center">Visitas Web</th>
                        <th className="py-3 px-2 text-center">Compartidos</th>
                        <th className="py-3 pl-2 text-right">Acciones / Exportar</th>
                      </tr>
                    </thead>
                    <tbody data-cms-locked="true" className="divide-y divide-[#E8EDF1]">
                      {paginatedUsers.map((u) => {
                        const isExpanded = expandedUserId === u.account.id;
                        const isSelected = selectedUserIds.includes(u.account.id);
                        return (
                          <React.Fragment key={u.account.id}>
                            <tr
                              className={`transition-colors ${
                                isSelected
                                  ? "bg-[#EBFBFA]/70 hover:bg-[#EBFBFA]"
                                  : "hover:bg-[#FAF6F2]/50"
                              }`}
                            >
                              <td className="py-3.5 pr-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectUser(u.account.id)}
                                  className="w-4 h-4 accent-[#01374C] cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 pr-2">
                                <div className="font-black text-[#01374C] flex items-center gap-1.5">
                                  <span>{u.account.name}</span>
                                  {u.isPwaInstalled && (
                                    <span
                                      className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#EBFBFA] text-[#00897B] border border-[#00D9B4]/40"
                                      title="Usa la App instalada en el celular (PWA)"
                                    >
                                      PWA
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#6A7B85]">
                                  @{u.account.username}
                                </div>
                              </td>
                              <td className="py-3.5 px-2">
                                <div className="text-[#01374C] font-medium">
                                  {u.account.email}
                                </div>
                                {u.account.phone && (
                                  <div className="text-xs text-[#00897B] font-bold">
                                    Tel: {u.account.phone}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-2 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    u.account.authProvider === "google"
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-[#F5F8FA] text-[#01374C] border border-[#E8EDF1]"
                                  }`}
                                >
                                  {u.account.authProvider === "google"
                                    ? "Google"
                                    : "Correo"}
                                </span>
                                <div className="text-[11px] text-[#6A7B85] mt-0.5">
                                  {formatReadableDate(u.account.createdAt)}
                                </div>
                              </td>
                              <td className="py-3.5 px-2 text-center">
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#01374C] text-[#00D9B4] font-black text-xs">
                                  {u.tastingsCount}
                                </span>
                                {u.avgRating > 0 && (
                                  <span className="block text-[11px] text-amber-600 font-bold mt-0.5">
                                    Prom: {u.avgRating} ★
                                  </span>
                                )}
                                {u.favoriteMacro !== "—" && (
                                  <span className="block text-[10px] text-[#52646E] font-semibold">
                                    {u.favoriteMacro}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-2 text-center">
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EBFBFA] text-[#00897B] font-black text-xs border border-[#00D9B4]/30">
                                  {u.redirectsCount}
                                </span>
                              </td>
                              <td className="py-3.5 px-2 text-center font-bold text-[#01374C]">
                                {u.sharesCount}
                              </td>
                              <td className="py-3.5 pl-2 text-right">
                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedUserId(isExpanded ? null : u.account.id)
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    title="Ver expediente de catas y exportar individualmente"
                                  >
                                    <span>Catas</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      exportUsersDirectoryToExcel([u], u.account.username)
                                    }
                                    className="p-1.5 rounded-lg bg-[#F5F8FA] hover:bg-[#E8EDF1] text-[#01374C] border border-[#E8EDF1] cursor-pointer"
                                    title={`Exportar ficha de ${u.account.name} en Excel (.XLS)`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSupportModalUser(u);
                                      setSupportNewPassword("");
                                      setSupportNewPin("");
                                      setSupportFeedback(null);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#EBFBFA] hover:bg-[#d5f6f3] text-[#01374C] border border-[#00D9B4]/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    title="Ver PIN de 4 dígitos o restablecer contraseña"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-[#00897B]" />
                                    <span>PIN / Clave</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setUserToDelete(u)}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Eliminar cuenta"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expediente desplegable de catas del usuario + Exportación individual */}
                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="bg-[#FAF6F2]/70 p-4 border-b border-[#DDC1AB]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div className="text-xs font-black uppercase text-[#01374C]">
                                      Expediente de Catas de {u.account.name} (
                                      {u.tastings.length}):
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          exportAllTastingsToCsv([u], u.account.username)
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F8FA] text-[#01374C] border border-[#DDC1AB] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Descargar sus catas (.CSV)</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          exportAllTastingsToExcel([u], u.account.username)
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-[#01374C] text-[#00D9B4] text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                      >
                                        <FileSpreadsheet className="w-3 h-3" />
                                        <span>Descargar sus catas (Excel .XLS)</span>
                                      </button>
                                    </div>
                                  </div>

                                  {u.tastings.length === 0 ? (
                                    <p className="text-xs text-[#6A7B85]">
                                      Este usuario aún no ha guardado ninguna cata.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                      {u.tastings.map((t) => (
                                        <div
                                          key={t.id}
                                          className="bg-white p-3 rounded-xl border border-[#E8EDF1] text-xs space-y-1"
                                        >
                                          <div className="flex items-center justify-between">
                                            <strong className="text-[#01374C] text-sm">
                                              {t.coffeeName} ({t.brand || "VARIETALE"})
                                            </strong>
                                            <span className="font-black text-amber-600">
                                              {t.rating} ★
                                            </span>
                                          </div>
                                          <div className="text-[#6A7B85]">
                                            Método:{" "}
                                            <strong>{t.brewMethod.toUpperCase()}</strong> •{" "}
                                            {[t.origin, t.variety, t.process]
                                              .filter(Boolean)
                                              .join(" • ")}
                                          </div>
                                          {t.selectedFlavors &&
                                            t.selectedFlavors.length > 0 && (
                                              <div className="flex flex-wrap gap-1 pt-1">
                                                {t.selectedFlavors.map((f) => (
                                                  <span
                                                    key={f.descriptorId}
                                                    className="px-2 py-0.5 rounded-full bg-[#EBFBFA] text-[#01374C] text-[10px] font-bold"
                                                  >
                                                    {f.name} ({f.intensity}★)
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          {t.userNotes && (
                                            <p className="italic text-[#52646E] pt-1 border-t border-[#E8EDF1]">
                                              "{t.userNotes}"
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Barra Inferior de Paginación Personalizable */}
              {filteredUsers.length > 0 && (
                <div className="pt-4 border-t border-[#E8EDF1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#52646E]">
                  <div>
                    <span>Mostrando</span>{" "}
                    <strong data-cms-locked="true" className="text-[#01374C] tabular-nums">
                      {usersPerPage <= 0
                        ? 1
                        : (safeCurrentPage - 1) * usersPerPage + 1}
                    </strong>{" "}
                    <span>a</span>{" "}
                    <strong data-cms-locked="true" className="text-[#01374C] tabular-nums">
                      {usersPerPage <= 0
                        ? filteredUsers.length
                        : Math.min(safeCurrentPage * usersPerPage, filteredUsers.length)}
                    </strong>{" "}
                    <span>de</span>{" "}
                    <strong data-cms-locked="true" className="text-[#01374C] tabular-nums">{filteredUsers.length}</strong>{" "}
                    <span>catadores filtrados</span>
                  </div>

                  {usersPerPage > 0 && totalUserPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentUserPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1.5 rounded-lg bg-[#F5F8FA] hover:bg-[#E8EDF1] text-[#01374C] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Anterior</span>
                      </button>

                      {Array.from({ length: totalUserPages }, (_, idx) => idx + 1).map(
                        (pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentUserPage(pageNum)}
                            className={`w-8 h-8 rounded-lg font-black text-xs transition-colors cursor-pointer ${
                              safeCurrentPage === pageNum
                                ? "bg-[#01374C] text-[#00D9B4]"
                                : "bg-[#F5F8FA] text-[#52646E] hover:bg-[#E8EDF1]"
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalUserPages}
                        onClick={() =>
                          setCurrentUserPage((p) => Math.min(totalUserPages, p + 1))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#F5F8FA] hover:bg-[#E8EDF1] text-[#01374C] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                      >
                        <span>Siguiente</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 3: MURO DE RESEÑAS Y COMENTARIOS REALES DE LOS CATADORES
            =================================================================== */}
        {activeTab === "reviews" && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#E8EDF1]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-[#01374C]">
                    <span>Muro de Reseñas y Comentarios Reales</span>{" "}
                    <span data-cms-locked="true" className="tabular-nums">
                      ({filteredReviews.length})
                    </span>
                  </h2>
                  <InfoHint
                    title="Muro de Reseñas (1★ a 5★)"
                    text="Explora todas las opiniones escritas por los catadores. Puedes filtrar las de menor calificación (1★, 2★ o 3★) para detectar cafés o preparaciones con oportunidades de mejora, o las de 4★ y 5★."
                  />
                </div>
                <p className="text-xs sm:text-sm text-[#6A7B85]">
                  Apuntes sensoriales y opiniones escritas por los catadores en sus bitácoras (filtra desde 1 ★ hasta 5 ★).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reviewBrandFilter}
                  onChange={(e) => setReviewBrandFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                >
                  <option value="all">Todas las marcas</option>
                  <option value="varietale">Solo VARIETALE</option>
                  <option value="other">Otras marcas</option>
                </select>

                <select
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                >
                  <option value="all">Todas las calificaciones (1★ a 5★)</option>
                  <option value="low_1_3">
                    ⚠️ Menor calificación (1 ★, 2 ★ y 3 ★)
                  </option>
                  <option value="low_1_2">Críticas / Bajas (1 ★ y 2 ★)</option>
                  <option data-cms-locked="true" value="exact_1">Solo 1 ★ ({reviewCountsByStar[1]})</option>
                  <option data-cms-locked="true" value="exact_2">Solo 2 ★ ({reviewCountsByStar[2]})</option>
                  <option data-cms-locked="true" value="exact_3">Solo 3 ★ ({reviewCountsByStar[3]})</option>
                  <option data-cms-locked="true" value="exact_4">Solo 4 ★ ({reviewCountsByStar[4]})</option>
                  <option data-cms-locked="true" value="exact_5">Solo 5 ★ ({reviewCountsByStar[5]})</option>
                  <option value="high_4_5">Destacadas (4 ★ y 5 ★)</option>
                </select>

                <select
                  value={reviewSortOrder}
                  onChange={(e) => setReviewSortOrder(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                >
                  <option value="newest">Más recientes primero</option>
                  <option value="lowest">Menor calificación primero (1★ → 5★)</option>
                  <option value="highest">Mayor calificación primero (5★ → 1★)</option>
                </select>
              </div>
            </div>

            {/* Botones rápidos de filtro por estrellas (incluyendo 1★, 2★, 3★) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                {
                  id: "all",
                  label: "Todas",
                  count: stats.allReviewsWithNotes.length,
                },
                {
                  id: "low_1_3",
                  label: "⚠️ Menor calificación 1★ a 3★",
                  count: reviewCountsByStar.low1to3,
                },
                { id: "exact_1", label: "1 ★", count: reviewCountsByStar[1], lockedLabel: true },
                { id: "exact_2", label: "2 ★", count: reviewCountsByStar[2], lockedLabel: true },
                { id: "exact_3", label: "3 ★", count: reviewCountsByStar[3], lockedLabel: true },
                { id: "exact_4", label: "4 ★", count: reviewCountsByStar[4], lockedLabel: true },
                { id: "exact_5", label: "5 ★", count: reviewCountsByStar[5], lockedLabel: true },
              ].map((pill) => {
                const active = reviewRatingFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setReviewRatingFilter(pill.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                      active
                        ? "bg-[#01374C] text-[#00D9B4] shadow-xs"
                        : "bg-[#F5F8FA] text-[#52646E] hover:bg-[#E8EDF1]"
                    }`}
                  >
                    <span data-cms-locked={pill.lockedLabel ? "true" : undefined}>{pill.label}</span>
                    <span data-cms-locked="true" className="tabular-nums">({pill.count})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                placeholder="Buscar en comentarios por café, palabra clave o nombre de usuario..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] text-sm text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
              />
            </div>

            {filteredReviews.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#6A7B85] bg-[#FAF6F2]/50 rounded-2xl border border-dashed border-[#DDC1AB]">
                No hay reseñas escritas que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div data-cms-locked="true" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReviews.map(({ tasting, userName, username }) => {
                  const ratingNum = Number(tasting.rating) || 0;
                  const isLowRating = ratingNum <= 2;
                  const isMidRating = ratingNum === 3;
                  return (
                    <div
                      key={tasting.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                        isLowRating
                          ? "bg-rose-50/40 border-rose-200"
                          : isMidRating
                          ? "bg-amber-50/40 border-amber-200"
                          : "bg-[#FAF6F2]/70 border-[#DDC1AB]/80"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#01374C] text-[#00D9B4]">
                              {tasting.brand || "VARIETALE"}
                            </span>
                            <h3 className="text-base font-black text-[#01374C] mt-1">
                              {tasting.coffeeName}
                            </h3>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full font-black text-xs shrink-0 border ${
                              isLowRating
                                ? "bg-rose-100 border-rose-300 text-rose-800"
                                : isMidRating
                                ? "bg-amber-100 border-amber-300 text-amber-800"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}
                          >
                            {tasting.rating} ★
                          </span>
                        </div>

                        <p className="text-sm text-[#01374C] bg-white p-3 rounded-xl border border-[#E8EDF1] italic leading-relaxed">
                          "{tasting.userNotes}"
                        </p>

                        {tasting.selectedFlavors &&
                          tasting.selectedFlavors.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {tasting.selectedFlavors.map((f) => (
                                <span
                                  key={f.descriptorId}
                                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#DDC1AB] text-[#01374C]"
                                >
                                  {f.name} ({f.intensity}★)
                                </span>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="pt-2.5 border-t border-[#DDC1AB]/50 flex items-center justify-between text-xs text-[#6A7B85]">
                        <span>
                          Catador: <strong className="text-[#01374C]">{userName}</strong> (@
                          {username})
                        </span>
                        <span>
                          Método: <strong>{tasting.brewMethod.toUpperCase()}</strong> •{" "}
                          {formatReadableDate(tasting.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 4: VERIFICADOR DEL CATÁLOGO AUTOMÁTICO (VARIETALE.COM)
            =================================================================== */}
        {activeTab === "catalog" && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8EDF1]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00D9B4] animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#00897B]">
                    <span>Sincronización Automática Activa</span>{" "}
                    <span>•</span>{" "}
                    <span>Última verificación:</span>{" "}
                    <span data-cms-locked="true" className="tabular-nums">{lastCatalogRefreshTime}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-lg sm:text-xl font-black text-[#01374C]">
                    <span>Cafés Sincronizados desde varietale.com</span>{" "}
                    <span data-cms-locked="true" className="tabular-nums">
                      ({liveCoffees.length} cafés activos)
                    </span>
                  </h2>
                  <InfoHint
                    title="Verificador de Catálogo Web"
                    text="Muestra cuántos y cuáles cafés están sincronizados actualmente desde varietale.com. Puedes compararlos con la web o pulsar 'Forzar Actualización Ahora' para refrescar al instante."
                  />
                </div>
                <p className="text-xs sm:text-sm text-[#6A7B85]">
                  Verifica exactamente cuáles cafés están apareciendo en la aplicación y compáralos en un clic frente al sitio web oficial.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSyncingCatalog}
                  onClick={() => {
                    onForceRefreshCatalog();
                    setLastCatalogRefreshTime(
                      new Date().toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    );
                  }}
                  className="min-h-[42px] px-4 py-2.5 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-[#00D9B4] ${
                      isSyncingCatalog ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {isSyncingCatalog ? "Sincronizando..." : "Forzar Actualización Ahora"}
                  </span>
                </button>

                <a
                  href="https://www.varietale.com/collections/cafes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[42px] px-3.5 py-2.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all"
                >
                  <span>Abrir varietale.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Buscador dentro del catálogo */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Filtrar por nombre de café, origen, variedad o proceso..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] text-sm text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
              />
            </div>

            {/* Grilla verificable de cafés activos */}
            <div data-cms-locked="true" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLiveCatalog.map((coffee, index) => (
                <div
                  key={`${coffee.coffeeName}-${index}`}
                  className="p-4 rounded-2xl bg-[#FAF6F2]/60 border border-[#E8EDF1] hover:border-[#01374C]/40 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    {coffee.imageUrl ? (
                      <img
                        src={coffee.imageUrl}
                        alt={coffee.coffeeName}
                        className="w-20 h-20 rounded-xl object-contain bg-white p-1 border border-[#E8EDF1] shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0">
                        <Coffee className="w-8 h-8" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#EBFBFA] text-[#01374C] border border-[#00D9B4]/30">
                          #{index + 1} • {coffee.productType || "Café Especial"}
                        </span>
                        {coffee.price && (
                          <span className="text-xs font-black text-[#00897B]">
                            {coffee.price}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-[#01374C] leading-snug">
                        {coffee.coffeeName}
                      </h3>
                      <p className="text-xs text-[#52646E] mt-1">
                        <strong>Origen:</strong> {coffee.origin || "Colombia"}
                      </p>
                      <p className="text-xs text-[#52646E]">
                        <strong>Variedad:</strong> {coffee.variety || "—"} •{" "}
                        <strong>Beneficio:</strong> {coffee.process || "—"}
                      </p>
                      {coffee.altitude && (
                        <p className="text-xs text-[#52646E]">
                          <strong>Altura:</strong> {coffee.altitude}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#E8EDF1] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#6A7B85]">
                      Perfil sugerido:{" "}
                      <strong className="text-[#01374C]">
                        {coffee.suggestedMacro || "Dulce"}
                      </strong>
                    </span>
                    {coffee.url ? (
                      <a
                        href={coffee.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-black text-[#01374C] hover:text-[#00897B] flex items-center gap-1 underline"
                      >
                        <span>Verificar en web</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#889DA7]">Catálogo base</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 5: CUPÓN, INTEGRACIONES (GOOGLE SHEETS / NOTION) Y SEGURIDAD
            =================================================================== */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Cupón de Bienvenida + Seguridad del Admin */}
            <div className="lg:col-span-6 space-y-6">
              {/* 1. Gestor del Cupón de Bienvenida */}
              <form
                onSubmit={handleSaveCoupon}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF1]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                          Gestor del Cupón de Bienvenida
                        </h2>
                        <InfoHint
                          title="Gestor del Cupón"
                          text="Activa, oculta o modifica el código de descuento y la URL de destino que ven los usuarios en su pantalla de inicio."
                        />
                      </div>
                      <p className="text-xs text-[#6A7B85]">
                        Personaliza el código de descuento y enlace hacia varietale.com
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={couponForm.enabled}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, enabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#01374C]"
                    />
                    <span className="text-xs font-black text-[#01374C]">
                      {couponForm.enabled ? "Activo" : "Oculto"}
                    </span>
                  </label>
                </div>

                {couponSavedMsg && (
                  <div className="p-3 rounded-xl bg-[#EBFBFA] border border-[#00D9B4] text-[#01374C] text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00897B]" />
                    <span>{couponSavedMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#01374C] mb-1">
                      Código del Cupón
                    </label>
                    <input
                      type="text"
                      value={couponForm.couponCode}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, couponCode: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-black text-[#01374C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#01374C] mb-1">
                      Título del Beneficio (ej: 10% de Cortesía)
                    </label>
                    <input
                      type="text"
                      value={couponForm.discountTitle}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, discountTitle: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-bold text-[#01374C]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#01374C] mb-1">
                    URL de Redirección con Descuento
                  </label>
                  <input
                    type="url"
                    value={couponForm.targetUrl}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, targetUrl: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs text-[#01374C]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-black text-xs sm:text-sm transition-all cursor-pointer"
                >
                  Guardar Cambios del Cupón
                </button>
              </form>

              {/* 2. Seguridad y Credenciales del Administrador */}
              <form
                onSubmit={handleSaveAdminCredentials}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4"
              >
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8EDF1]">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6F2] text-[#01374C] border border-[#DDC1AB] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                        Accesos y Seguridad del Administrador
                      </h2>
                      <InfoHint
                        title="Credenciales del Admin"
                        text="Actualiza tu nombre de usuario, contraseña o tu PIN Maestro de recuperación para entrar al panel de administración."
                      />
                    </div>
                    <p className="text-xs text-[#6A7B85]">
                      Modifica tu Usuario, Contraseña o tu PIN Maestro de Recuperación
                    </p>
                  </div>
                </div>

                {adminCredsSavedMsg && (
                  <div className="p-3 rounded-xl bg-[#EBFBFA] border border-[#00D9B4] text-[#01374C] text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00897B]" />
                    <span>{adminCredsSavedMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#01374C] mb-1">
                    Usuario de Administrador
                  </label>
                  <input
                    type="text"
                    value={adminCredsForm.username}
                    onChange={(e) =>
                      setAdminCredsForm({ ...adminCredsForm, username: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-bold text-[#01374C]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#01374C] mb-1">
                      Contraseña de Administrador
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        value={adminCredsForm.password}
                        onChange={(e) =>
                          setAdminCredsForm({
                            ...adminCredsForm,
                            password: e.target.value,
                          })
                        }
                        className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-bold text-[#01374C]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-2 top-2.5 text-[#6A7B85] hover:text-[#01374C] cursor-pointer"
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#01374C] mb-1">
                      PIN Maestro de Recuperación
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={adminCredsForm.masterPin}
                      onChange={(e) =>
                        setAdminCredsForm({
                          ...adminCredsForm,
                          masterPin: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-black tracking-widest text-center text-[#01374C]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-black text-xs sm:text-sm transition-all cursor-pointer"
                >
                  Actualizar Credenciales de Administrador
                </button>
              </form>
            </div>

            {/* Columna Derecha: Conectores Google Sheets / Notion + Backup JSON */}
            <div className="lg:col-span-6 space-y-6">
              {/* 3. Conectores en Tiempo Real (Google Sheets y Notion) */}
              <form
                onSubmit={handleSaveWebhooks}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4"
              >
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8EDF1]">
                  <div className="w-9 h-9 rounded-xl bg-[#EBFBFA] text-[#00897B] flex items-center justify-center">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                        Conectores en Tiempo Real (Google Sheets & Notion)
                      </h2>
                      <InfoHint
                        title="Conectores Google Sheets y Notion"
                        text="Pega la URL de tu Webhook de Google Apps Script, Make o Zapier. Cada nuevo registro o cata se enviará automáticamente en segundo plano sin bloqueos CORS."
                      />
                    </div>
                    <p className="text-xs text-[#6A7B85]">
                      Envía automáticamente cada nuevo registro y cata a tu hoja de cálculo o base de Notion
                    </p>
                  </div>
                </div>

                {webhookStatusMsg && (
                  <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB] text-[#01374C] text-xs font-bold">
                    {webhookStatusMsg}
                  </div>
                )}

                {/* Google Sheets */}
                <div className="p-3.5 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-[#01374C]">
                      🟢 Conector Google Sheets (Apps Script / Webhook)
                    </span>
                    <input
                      type="checkbox"
                      checked={webhookForm.googleSheetsEnabled}
                      onChange={(e) =>
                        setWebhookForm({
                          ...webhookForm,
                          googleSheetsEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#01374C]"
                    />
                  </div>
                  <input
                    type="url"
                    value={webhookForm.googleSheetsWebhookUrl}
                    onChange={(e) =>
                      setWebhookForm({
                        ...webhookForm,
                        googleSheetsWebhookUrl: e.target.value,
                      })
                    }
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDC1AB] text-xs text-[#01374C]"
                  />
                </div>

                {/* Notion */}
                <div className="p-3.5 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-[#01374C]">
                      ⚫ Conector Notion (Webhook Make / Zapier / API)
                    </span>
                    <input
                      type="checkbox"
                      checked={webhookForm.notionEnabled}
                      onChange={(e) =>
                        setWebhookForm({
                          ...webhookForm,
                          notionEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#01374C]"
                    />
                  </div>
                  <input
                    type="url"
                    value={webhookForm.notionWebhookUrl}
                    onChange={(e) =>
                      setWebhookForm({
                        ...webhookForm,
                        notionWebhookUrl: e.target.value,
                      })
                    }
                    placeholder="https://hook.us1.make.com/... o URL de integración Notion"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDC1AB] text-xs text-[#01374C]"
                  />
                </div>

                {/* Eventos a enviar */}
                <div className="flex flex-wrap gap-4 pt-1 text-xs font-bold text-[#01374C]">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookForm.sendOnNewUser}
                      onChange={(e) =>
                        setWebhookForm({
                          ...webhookForm,
                          sendOnNewUser: e.target.checked,
                        })
                      }
                      className="accent-[#01374C]"
                    />
                    <span>Nuevos usuarios</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookForm.sendOnNewTasting}
                      onChange={(e) =>
                        setWebhookForm({
                          ...webhookForm,
                          sendOnNewTasting: e.target.checked,
                        })
                      }
                      className="accent-[#01374C]"
                    />
                    <span>Nuevas catas</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookForm.sendOnVarietaleRedirect}
                      onChange={(e) =>
                        setWebhookForm({
                          ...webhookForm,
                          sendOnVarietaleRedirect: e.target.checked,
                        })
                      }
                      className="accent-[#01374C]"
                    />
                    <span>Clics a varietale.com</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <button
                    type="submit"
                    className="min-h-[42px] py-2 px-3 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-black text-xs cursor-pointer"
                  >
                    Guardar Conectores
                  </button>
                  <button
                    type="button"
                    disabled={isSendingWebhook}
                    onClick={handleTestWebhook}
                    className="min-h-[42px] py-2 px-3 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] font-bold text-xs cursor-pointer"
                  >
                    Probar Conexión
                  </button>
                  <button
                    type="button"
                    disabled={isSendingWebhook}
                    onClick={handleBulkSyncWebhook}
                    className="min-h-[42px] py-2 px-3 rounded-xl bg-[#EBFBFA] hover:bg-[#d5f6f3] text-[#01374C] border border-[#00D9B4]/40 font-black text-xs cursor-pointer"
                  >
                    Sincronizar Todo
                  </button>
                </div>
              </form>

              {/* 4. Copia de Seguridad General (Backup & Restore JSON) */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#01374C]">
                      Copia de Seguridad General (Backup & Restauración)
                    </h2>
                    <InfoHint
                      title="Backup y Restauración"
                      text="Descarga un archivo .JSON con todos los usuarios, catas, métricas y configuraciones del panel, o cárgaselo para restaurar una copia previa."
                    />
                  </div>
                  <p className="text-xs text-[#6A7B85] mt-0.5">
                    Descarga un archivo de respaldo con todos los usuarios, catas y analíticas, o restáuralo cuando lo necesites.
                  </p>
                </div>

                {backupMsg && (
                  <div className="p-3 rounded-xl bg-[#EBFBFA] border border-[#00D9B4] text-[#01374C] text-xs font-bold">
                    {backupMsg}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputBackupRef}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImportBackupFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={exportFullDatabaseBackupJson}
                    className="min-h-[44px] py-2.5 px-4 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#00D9B4]" />
                    <span>Descargar Backup (.JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputBackupRef.current?.click()}
                    className="min-h-[44px] py-2.5 px-4 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#01374C]" />
                    <span>Restaurar desde Archivo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 6: EDITOR DE TEXTOS DE INTERFAZ Y RUEDA DE SABORES SCA
            =================================================================== */}
        {activeTab === "texts" && (
          <AdminUiCmsTab
            onLaunchVisualEditMode={() => {
              if (onStartVisualEditMode) {
                onStartVisualEditMode();
              }
            }}
          />
        )}
      </main>

      {/* =====================================================================
          MODAL: INSTRUCTIVO DE USO / MESA DE AYUDA DEL ADMINISTRADOR
          ===================================================================== */}
      {isHelpModalOpen && (
        <div
          onClick={() => setIsHelpModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-[#E8EDF1] overflow-hidden"
          >
            {/* Cabecera del Instructivo */}
            <div className="bg-[#01374C] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-[#00D9B4]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00D9B4] text-[#01374C] flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00D9B4]">
                    Mesa de Ayuda Integrada
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Instructivo Rápido del Panel de Administrador
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador interno del instructivo */}
            <div className="px-5 sm:px-6 py-3 bg-[#F5F8FA] border-b border-[#E8EDF1]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={helpSearch}
                  onChange={(e) => setHelpSearch(e.target.value)}
                  placeholder="Buscar en el instructivo (ej. exportar Excel, PIN, reseñas, simulación, webhook)..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs sm:text-sm text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                />
              </div>
            </div>

            {/* Contenido del Instructivo */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#EBFBFA] border border-[#00D9B4]/40 text-xs text-[#01374C] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#00897B] shrink-0 mt-0.5" />
                <span>
                  <strong>Tip rápido:</strong> Al lado del título de cada tarjeta del panel encontrarás el icono{" "}
                  <strong className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white text-[#00897B] border border-[#00D9B4]/40">
                    ⓘ
                  </strong>
                  . Tócalo o haz clic sobre él en cualquier momento para ver una explicación corta y precisa de ese elemento.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHelpSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-2xl bg-[#FAF6F2]/70 border border-[#DDC1AB]/80 space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#01374C] text-[#00D9B4]">
                        {sec.badge}
                      </span>
                      <h4 className="text-sm sm:text-base font-black text-[#01374C]">
                        {sec.title}
                      </h4>
                      <p className="text-xs text-[#52646E] leading-relaxed">
                        {sec.summary}
                      </p>
                      <ul className="space-y-1.5 pt-1 text-xs text-[#01374C]">
                        {sec.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                            <span className="text-[#00897B] font-black mt-0.5">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie del Instructivo */}
            <div className="px-5 sm:px-6 py-3.5 bg-[#F5F8FA] border-t border-[#E8EDF1] flex items-center justify-between">
              <span className="text-xs text-[#6A7B85]">
                Mi Bitácora Varietale • Guía rápida de administración
              </span>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-black cursor-pointer"
              >
                Entendido, cerrar guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SOPORTE A CLIENTES (VER PIN / RESTABLECER CONTRASEÑA) */}
      {supportModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-[#E8EDF1] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF1]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00897B]">
                  Soporte Rápido a Catador
                </span>
                <h3 data-cms-locked="true" className="text-base sm:text-lg font-black text-[#01374C]">
                  {supportModalUser.account.name} (@{supportModalUser.account.username})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalUser(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6A7B85] hover:bg-[#FAF6F2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] space-y-1.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#52646E] font-medium">Correo registrado:</span>
                <strong data-cms-locked="true" className="text-[#01374C]">
                  {supportModalUser.account.email}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#52646E] font-medium">
                  PIN de respaldo actual (4 dígitos):
                </span>
                <span data-cms-locked="true" className="px-2.5 py-0.5 rounded-lg bg-[#01374C] text-[#00D9B4] font-black tracking-widest">
                  {supportModalUser.account.securityPin || "1234"}
                </span>
              </div>
              {supportModalUser.account.password && (
                <div className="flex items-center justify-between">
                  <span className="text-[#52646E] font-medium">Contraseña actual:</span>
                  <code data-cms-locked="true" className="font-bold text-[#01374C]">
                    {supportModalUser.account.password}
                  </code>
                </div>
              )}
            </div>

            {supportFeedback && (
              <div className="p-2.5 rounded-xl bg-[#EBFBFA] border border-[#00D9B4] text-[#01374C] text-xs font-bold text-center">
                {supportFeedback}
              </div>
            )}

            <form onSubmit={handleApplyClientSupport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Asignar Nueva Contraseña Temporal (opcional)
                </label>
                <input
                  type="text"
                  value={supportNewPassword}
                  onChange={(e) => setSupportNewPassword(e.target.value)}
                  placeholder="Ej: varietale123"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm text-[#01374C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Asignar Nuevo PIN de 4 dígitos (opcional)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={supportNewPin}
                  onChange={(e) =>
                    setSupportNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="Ej: 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-black tracking-widest text-center text-[#01374C]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSupportModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#FAF6F2] text-[#01374C] font-bold text-xs border border-[#DDC1AB] cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#01374C] text-white font-black text-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR USUARIO */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#E8EDF1] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 data-cms-locked="true" className="text-base font-black text-[#01374C]">
              ¿Eliminar a {userToDelete.account.name}?
            </h3>
            <p className="text-xs text-[#52646E] leading-relaxed">
              <span>Se eliminará la cuenta</span>{" "}
              <strong data-cms-locked="true">@{userToDelete.account.username}</strong>{" "}
              <span>y sus</span>{" "}
              <strong data-cms-locked="true">{userToDelete.tastingsCount} catas registradas</strong>.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF6F2] text-[#01374C] font-bold text-xs border border-[#DDC1AB] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  adminDeleteUserAccount(userToDelete.account.id);
                  setSelectedUserIds((prev) =>
                    prev.filter((id) => id !== userToDelete.account.id)
                  );
                  setUserToDelete(null);
                  setRefreshTick((t) => t + 1);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL / EXPEDIENTE: AUDITORÍA Y ANALÍTICA DE REDIRECCIONES           */}
      {/* ==================================================================== */}
      {isRedirectAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E8EDF1] space-y-4 overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E8EDF1] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0 shadow-xs">
                  <ExternalLink className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00897B] bg-[#EBFBFA] px-2 py-0.5 rounded-md">
                      Analítica de Tráfico Web
                    </span>
                    <span className="text-[10px] font-extrabold text-[#6A7B85]">
                      {auditFilteredEvents.length} registro(s) encontrado(s)
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-[#01374C] leading-snug">
                    Auditoría de Redirecciones a varietale.com
                  </h3>
                  <p className="text-xs text-[#6A7B85] hidden sm:block">
                    Monitorea el tráfico hacia la tienda web, evalúa conversiones por campaña y descarga reportes en Excel o CSV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRedirectAuditModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6A7B85] hover:text-[#01374C] hover:bg-[#FAF6F2] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido desplazable */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Barra de Filtros de Período y Botones de Descarga */}
              <div className="bg-[#FAF6F2] p-4 rounded-2xl border border-[#DDC1AB]/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#01374C] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00897B]" />
                    Rango Temporal de Consulta:
                  </span>

                  {/* Botones de Descarga */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportAuditExcel}
                      className="px-3 py-1.5 rounded-xl bg-[#00897B] hover:bg-[#007065] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Descargar datos filtrados en formato de libro Excel (.XLS)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Descargar Excel (.XLS)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportAuditCsv}
                      className="px-3 py-1.5 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Descargar datos filtrados en archivo separado por comas .CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar .CSV</span>
                    </button>
                  </div>
                </div>

                {/* Botones píldora de rango */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "all", label: "Histórico (Total)" },
                      { id: "today", label: "Hoy (Tiempo Real)" },
                      { id: "7d", label: "Última Semana (7d)" },
                      { id: "30d", label: "Último Mes (30d)" },
                      { id: "quarter", label: "Último Trimestre (90d)" },
                      { id: "year_trailing", label: "Último Año (365d)" },
                      { id: "specific_year", label: "Por Año" },
                      { id: "custom", label: "📅 Calendario Personalizado" },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAuditRange(r.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        auditRange === r.id
                          ? "bg-[#01374C] text-[#00D9B4] shadow-xs ring-1 ring-[#00D9B4]"
                          : "bg-white hover:bg-[#F2ECE4] border border-[#DDC1AB]/80 text-[#52646E]"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Selector específico por año */}
                {auditRange === "specific_year" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#DDC1AB]/50">
                    <span className="text-xs font-bold text-[#01374C]">Seleccionar año:</span>
                    <select
                      value={auditSpecificYear}
                      onChange={(e) => setAuditSpecificYear(Number(e.target.value))}
                      className="px-3 py-1 bg-white border border-[#DDC1AB] rounded-xl text-xs font-extrabold text-[#01374C] focus:outline-none focus:ring-1 focus:ring-[#00897B]"
                    >
                      {[2026, 2025, 2024, 2023].map((y) => (
                        <option key={y} value={y}>
                          Año {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Selector de calendario personalizado (Desde - Hasta) */}
                {auditRange === "custom" && (
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#DDC1AB]/50 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#01374C]">Desde:</span>
                      <input
                        type="date"
                        value={auditCustomStart}
                        onChange={(e) => setAuditCustomStart(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-[#DDC1AB] rounded-xl font-bold text-[#01374C] focus:outline-none focus:ring-1 focus:ring-[#00897B]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#01374C]">Hasta:</span>
                      <input
                        type="date"
                        value={auditCustomEnd}
                        onChange={(e) => setAuditCustomEnd(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-[#DDC1AB] rounded-xl font-bold text-[#01374C] focus:outline-none focus:ring-1 focus:ring-[#00897B]"
                      />
                    </div>
                    <span className="text-[11px] text-[#6A7B85] italic">
                      Filtra exactamente los clics ocurridos entre ambas fechas.
                    </span>
                  </div>
                )}

                {/* Filtro por Canal de Origen y Buscador por Catador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#DDC1AB]/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#01374C] shrink-0">Canal:</span>
                    <select
                      value={auditSource}
                      onChange={(e) => setAuditSource(e.target.value as RedirectSourceType | "all")}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#DDC1AB] rounded-xl text-xs font-semibold text-[#01374C] focus:outline-none focus:ring-1 focus:ring-[#00897B]"
                    >
                      <option value="all">Todos los canales ({allRawRedirectEvents.length})</option>
                      <option value="floating_varietale_btn">Pestaña Lateral Flotante</option>
                      <option value="home_store_btn">Botón Pantalla de Inicio</option>
                      <option value="welcome_coupon_btn">Cupón de Bienvenida 10%</option>
                      <option value="rebuy_recommendation">Recomendación de Recompra</option>
                      <option value="catalog_product">Catálogo de Cafés</option>
                      <option value="footer_link">Pie de Página / Hipervínculo</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#889DA7] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por catador (@usuario), café..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#DDC1AB] rounded-xl text-xs text-[#01374C] placeholder-[#889DA7] focus:outline-none focus:ring-1 focus:ring-[#00897B]"
                    />
                  </div>
                </div>
              </div>

              {/* 4 Tarjetas Resumen del Período */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#EBFBFA] border border-[#00D9B4]/40 rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00897B] block">
                    Total Clics
                  </span>
                  <strong data-cms-locked="true" className="text-2xl font-black text-[#01374C] tabular-nums">
                    {auditStats.totalClicks}
                  </strong>
                  <span className="text-[10px] text-[#6A7B85] block mt-0.5">en el período filtrado</span>
                </div>

                <div className="bg-white border border-[#E8EDF1] rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6A7B85] block">
                    Catadores Registrados
                  </span>
                  <strong data-cms-locked="true" className="text-2xl font-black text-[#01374C] tabular-nums">
                    {auditStats.registeredClicksCount}
                  </strong>
                  <span className="text-[10px] text-[#6A7B85] block mt-0.5">
                    ({auditStats.uniqueUsersCount} usuarios únicos)
                  </span>
                </div>

                <div className="bg-white border border-[#E8EDF1] rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6A7B85] block">
                    Invitados Anónimos
                  </span>
                  <strong data-cms-locked="true" className="text-2xl font-black text-[#01374C] tabular-nums">
                    {auditStats.guestClicksCount}
                  </strong>
                  <span className="text-[10px] text-[#6A7B85] block mt-0.5">sin iniciar sesión</span>
                </div>

                <div className="bg-white border border-[#E8EDF1] rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6A7B85] block">
                    Canal Principal
                  </span>
                  <strong data-cms-locked="true" className="text-xs sm:text-sm font-black text-[#01374C] block truncate">
                    {auditStats.topSource.label}
                  </strong>
                  <span className="text-[10px] text-[#00897B] font-extrabold block mt-0.5">
                    {auditStats.topSource.count} clics ({auditStats.topSource.pct}%)
                  </span>
                </div>
              </div>

              {/* Tabla Detallada de Clics */}
              <div className="border border-[#E8EDF1] rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#01374C] text-white">
                        <th className="py-2.5 px-3 font-extrabold uppercase text-[10px] tracking-wider">Fecha y Hora</th>
                        <th className="py-2.5 px-3 font-extrabold uppercase text-[10px] tracking-wider">Catador</th>
                        <th className="py-2.5 px-3 font-extrabold uppercase text-[10px] tracking-wider">Canal de Origen</th>
                        <th className="py-2.5 px-3 font-extrabold uppercase text-[10px] tracking-wider">Detalle / Producto</th>
                        <th className="py-2.5 px-3 font-extrabold uppercase text-[10px] tracking-wider">URL Destino</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EDF1]">
                      {paginatedAuditEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#6A7B85] text-xs">
                            No se encontraron eventos de redirección para los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedAuditEvents.map((evt, idx) => {
                          const isEven = idx % 2 === 0;
                          return (
                            <tr
                              key={evt.id}
                              className={`hover:bg-[#F2ECE4]/40 transition-colors ${
                                isEven ? "bg-white" : "bg-[#FAF6F2]/30"
                              }`}
                            >
                              <td className="py-2 px-3 text-[#52646E] whitespace-nowrap font-medium">
                                {formatReadableDate(evt.timestamp, true)}
                              </td>
                              <td className="py-2 px-3 font-bold text-[#01374C] whitespace-nowrap">
                                <div>{evt.userName || "Invitado"}</div>
                                {evt.username && (
                                  <span className="text-[10px] font-normal text-[#6A7B85]">
                                    @{evt.username}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    evt.source === "floating_varietale_btn"
                                      ? "bg-[#EBFBFA] text-[#00897B] border border-[#00D9B4]/40"
                                      : evt.source === "welcome_coupon_btn"
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : evt.source === "rebuy_recommendation"
                                      ? "bg-purple-50 text-purple-800 border border-purple-200"
                                      : "bg-slate-100 text-[#01374C] border border-slate-200"
                                  }`}
                                >
                                  {formatRedirectSourceLabel(evt.source)}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-[#01374C] font-medium max-w-[180px] truncate">
                                {evt.label || "Tienda Oficial"}
                              </td>
                              <td className="py-2 px-3 text-[#007B8A] font-mono text-[10px] max-w-[160px] truncate">
                                <a
                                  href={evt.targetUrl || "https://www.varietale.com"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-1"
                                >
                                  <span>{evt.targetUrl || "varietale.com"}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación de la Tabla */}
                {auditTotalPages > 1 && (
                  <div className="p-3 bg-[#FAF6F2] border-t border-[#E8EDF1] flex items-center justify-between text-xs text-[#52646E]">
                    <span>
                      Página <strong>{auditPage}</strong> de <strong>{auditTotalPages}</strong> ({auditFilteredEvents.length} clics)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        disabled={auditPage === 1}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DDC1AB] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F2ECE4] cursor-pointer"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                        disabled={auditPage === auditTotalPages}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DDC1AB] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F2ECE4] cursor-pointer"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="pt-2 border-t border-[#E8EDF1] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#889DA7] italic hidden sm:block">
                🛡️ Los clics del usuario de prueba están estrictamente excluidos de esta auditoría.
              </span>
              <button
                type="button"
                onClick={() => setIsRedirectAuditModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

      <BrandFooter className="mt-8" />
    </div>
  );
};
