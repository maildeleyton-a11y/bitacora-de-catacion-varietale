/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - COMPONENTE RAÍZ (APP)
 * ============================================================================
 * Coordina el ciclo de vida de la aplicación:
 * - Autenticación y gestión de sesión activa (sessionStorage).
 * - Partición y persistencia de cataciones por usuario en localStorage.
 * - Sincronización en segundo plano con el catálogo oficial de varietale.com.
 * - Enrutamiento reactivo de pantallas (Auth, Inicio, Registro, Rueda, Bitácora).
 * - Barra de navegación táctil móvil y modales de celebración/guía.
 */

import { useState, useEffect, useRef } from "react";
import {
  Coffee,
  BookOpen,
  Plus,
  User,
  Compass,
  FlaskConical,
  Sparkles,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import {
  TastingRecord,
  CoffeeInfo,
  BrewMethod,
  QualityChecklist,
  BodyLevel,
  FlavorSelection,
  UserProfile,
} from "./types";
import {
  VARIETALE_SAMPLE_COFFEES,
  BREW_METHODS,
  EMPTY_COFFEE,
  computeSensorySpiderProfile,
} from "./data/coffeeData";
import {
  loginAsTestUser,
  seedTestUser20Tastings,
  clearTestUserTastings,
  getTestUserTastings,
} from "./data/accountStore";
import { HomeScreen } from "./components/HomeScreen";
import { RegistrationScreen } from "./components/RegistrationScreen";
import { InteractiveFlavorWheel } from "./components/InteractiveFlavorWheel";
import { LogbookScreen } from "./components/LogbookScreen";
import { CataCelebrationModal } from "./components/CataCelebrationModal";
import { OnboardingGuideModal } from "./components/OnboardingGuideModal";
import { UserAuthModal } from "./components/UserAuthModal";
import { AuthScreen } from "./components/AuthScreen";
import { LaunchSequence } from "./components/LaunchSequence";
import {
  InstallPwaModal,
  InstallPwaPromptModal,
  checkIsAppInstalled,
} from "./components/InstallPwaModal";
import { AdminPortalScreen } from "./components/AdminPortalScreen";
import { FloatingShareTab } from "./components/FloatingShareTab";
import { LiveVisualEditorOverlay } from "./components/LiveVisualEditorOverlay";
import {
  isAdminSessionActive,
  setAdminSessionActive,
  recordUserSessionActivity,
  triggerWebhookInBackground,
} from "./data/adminStore";
import {
  isVisualEditModeActive,
  setVisualEditModeActive,
  syncUiCmsFromServer,
  applyCmsOverridesToMasterData,
} from "./data/uiCmsStore";

// ============================================================================
// 1. CONSTANTES DE PERSISTENCIA Y SESIÓN
// ============================================================================

/** Clave de control para mostrar la guía interactiva solo la primera vez */
const GUIDE_STORAGE_KEY = "varietale_onboarding_guide_seen_v1";

/**
 * La sesión del usuario activo se mantiene en sessionStorage:
 * - Persiste durante la navegación y recarga de página dentro de la misma pestaña.
 * - Se destruye automáticamente al cerrar el navegador o la pestaña, o al pulsar 'Cerrar sesión'.
 */
const SESSION_USER_KEY = "varietale_session_user";

// ============================================================================
// 2. UTILIDADES DE PERSISTENCIA POR USUARIO
// ============================================================================

/**
 * Genera una clave de almacenamiento aislada y única para cada usuario catador,
 * garantizando que las cataciones nunca se mezclen entre diferentes cuentas.
 */
export const getUserTastingsKey = (user: UserProfile | null): string => {
  if (!user) return "varietale_user_tastings_guest";
  const userIdentifier = user.username || user.email || user.id;
  const cleanId = userIdentifier.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `varietale_user_tastings_${cleanId}`;
};

/**
 * Carga de forma segura las catas persistidas del usuario especificado.
 * Todo usuario nuevo inicia limpiamente con 0 cataciones (sin datos prefabricados).
 */
const loadUserTastings = (user: UserProfile | null): TastingRecord[] => {
  if (!user) return [];
  try {
    const key = getUserTastingsKey(user);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Fallo al leer cataciones del usuario en localStorage:", e);
  }
  return [];
};

// ============================================================================
// 3. COMPONENTE PRINCIPAL
// ============================================================================

export default function App() {
  // --------------------------------------------------------------------------
  // A. Secuencia de Inicio / Bienvenida Líquida
  // --------------------------------------------------------------------------
  const [showLaunchSequence, setShowLaunchSequence] = useState<boolean>(true);
  const [launchSequenceKey, setLaunchSequenceKey] = useState<number>(0);
  const [launchPreviewFrozen, setLaunchPreviewFrozen] = useState<boolean>(false);

  const triggerLaunchSequence = () => {
    setLaunchPreviewFrozen(false);
    setLaunchSequenceKey((prev) => prev + 1);
    setShowLaunchSequence(true);
  };

  const handleCompleteLaunchSequence = () => {
    setLaunchPreviewFrozen(false);
    setShowLaunchSequence(false);
  };

  // --------------------------------------------------------------------------
  // B. Estado de Autenticación y Sesión del Usuario
  // --------------------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      // Purga cualquier clave heredada de prueba previa
      localStorage.removeItem("varietale_current_user_v2");
      localStorage.removeItem("varietale_current_user_v1");
      localStorage.removeItem("varietale_current_user");

      const sessionSaved = sessionStorage.getItem(SESSION_USER_KEY);
      if (sessionSaved) {
        const parsed: UserProfile = JSON.parse(sessionSaved);
        if (parsed && parsed.id && parsed.id !== "user-test-dev") {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Fallo al leer usuario activo desde sessionStorage:", e);
    }
    // Inicia sin sesión para que la pantalla inicial sea obligatoriamente la de ingreso/registro
    return null;
  });

  // --------------------------------------------------------------------------
  // C. Enrutamiento Interno de Pantallas
  // "auth" | "home" | "registration" | "wheel" | "logbook" | "admin"
  // --------------------------------------------------------------------------
  const [currentScreen, setCurrentScreen] = useState<
    "auth" | "home" | "registration" | "wheel" | "logbook" | "admin"
  >(() => {
    try {
      if (isAdminSessionActive()) {
        return "admin";
      }
      const sessionSaved = sessionStorage.getItem(SESSION_USER_KEY);
      if (sessionSaved) {
        const parsed: UserProfile = JSON.parse(sessionSaved);
        if (parsed && parsed.id && parsed.id !== "user-test-dev") {
          return "home";
        }
      }
    } catch {}
    return "auth";
  });

  // Asegura que al cambiar de pantalla siempre se posicione el scroll arriba
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 30);
    return () => clearTimeout(timer);
  }, [currentScreen]);

  // Ejecuta la animación de bienvenida cada vez que se llega a la página de login o registro (excepto durante Edición Visual en Vivo)
  const prevScreenRef = useRef<string>(currentScreen);
  useEffect(() => {
    if (
      currentScreen === "auth" &&
      prevScreenRef.current !== "auth" &&
      !isVisualEditModeActive()
    ) {
      triggerLaunchSequence();
    }
    prevScreenRef.current = currentScreen;
  }, [currentScreen]);

  // Modal lateral/flotante de información de perfil
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Modal de instalación PWA y evento diferido de instalación nativa
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);

  const triggerInstallPromptIfEligible = () => {
    if (!checkIsAppInstalled()) {
      setShowInstallPrompt(true);
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Al estar en la pantalla principal (sea tras login o recarga), invitar a instalar si no está en el teléfono
  useEffect(() => {
    try {
      localStorage.removeItem("varietale_pwa_banner_dismissed_until");
    } catch {}

    if (currentScreen === "home" && !isVisualEditModeActive()) {
      const timer = setTimeout(() => {
        triggerInstallPromptIfEligible();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // --------------------------------------------------------------------------
  // D. Historial de Catas Particionado por Usuario
  // --------------------------------------------------------------------------
  const [tastings, setTastings] = useState<TastingRecord[]>(() => {
    return loadUserTastings(currentUser);
  });

  // Sincroniza los cambios en las catas con el almacenamiento del usuario activo
  useEffect(() => {
    if (!currentUser) return;
    try {
      const key = getUserTastingsKey(currentUser);
      localStorage.setItem(key, JSON.stringify(tastings));
    } catch (e) {
      console.warn("Fallo al guardar catas del usuario en localStorage:", e);
    }
  }, [tastings, currentUser]);

  // --------------------------------------------------------------------------
  // E. Controladores de Autenticación (Login, Invitado, Logout)
  // --------------------------------------------------------------------------
  const handleLogin = (user: UserProfile) => {
    if (user.id === "user-test-dev") {
      return;
    }
    recordUserSessionActivity(user);
    setCurrentUser(user);
    try {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      localStorage.removeItem("varietale_current_user_v2");
    } catch (e) {
      console.warn("Fallo al guardar sesión de usuario:", e);
    }
    const userTastings = loadUserTastings(user);
    setTastings(userTastings);
    setCurrentScreen("home");

    // Disparar siempre después del signin si la app no está instalada en el dispositivo
    setTimeout(() => {
      triggerInstallPromptIfEligible();
    }, 600);
  };

  const handleContinueAsGuest = () => {
    const guestUser: UserProfile = {
      id: "guest-user",
      name: "Catador Invitado",
      username: "invitado",
      email: "invitado@varietale.com",
      experienceLevel: "principiante",
      favoriteStore: "Varietale Chapinero - Carrera 4a #57-02",
      memberSince: "Hoy",
      avatarColor: "#889DA7",
      authProvider: "guest",
      verified: false,
    };
    setCurrentUser(guestUser);
    try {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(guestUser));
      localStorage.removeItem("varietale_current_user_v2");
    } catch (e) {
      console.warn("Fallo al guardar sesión de invitado:", e);
    }
    const guestTastings = loadUserTastings(guestUser);
    setTastings(guestTastings);
    setCurrentScreen("home");

    // Disparar siempre después del signin si la app no está instalada en el dispositivo
    setTimeout(() => {
      triggerInstallPromptIfEligible();
    }, 600);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem("varietale_current_user_v2");
      localStorage.removeItem("varietale_current_user");
    } catch (e) {
      console.warn("Fallo al limpiar sesión de usuario:", e);
    }
    setTastings([]);
    setIsAuthOpen(false);
    setCurrentScreen("auth");
  };

  /**
   * Inicia sesión directa en modo de prueba desde el Panel de Administración.
   */
  const handleEnterTestUserMode = () => {
    const testUser = loginAsTestUser();
    setCurrentUser(testUser);
    try {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(testUser));
    } catch (e) {
      console.warn("Fallo al guardar sesión de usuario de prueba:", e);
    }
    const userTastings = getTestUserTastings();
    setTastings(userTastings);
    setCurrentScreen("home");
  };

  /**
   * Cierra la sesión del usuario de prueba y regresa inmediatamente al Panel de Administración.
   */
  const handleReturnToAdminFromTestUser = () => {
    try {
      sessionStorage.removeItem(SESSION_USER_KEY);
    } catch {}
    setCurrentUser(null);
    setAdminSessionActive(true);
    setCurrentScreen("admin");
  };

  /**
   * Genera 20 cataciones aleatorias simuladas dentro del perfil del usuario de prueba.
   */
  const handleSeed20TestTastings = () => {
    const newTastings = seedTestUser20Tastings();
    setTastings(newTastings);
  };

  /**
   * Limpia y vacía las cataciones del usuario de prueba.
   */
  const handleClearTestTastings = () => {
    clearTestUserTastings();
    setTastings([]);
  };

  const isTestUserActive =
    Boolean(currentUser) &&
    (currentUser?.username === "catador.prueba" || currentUser?.id === "test-user-catador");

  // --------------------------------------------------------------------------
  // F. Guía de Inicio (Onboarding Modal)
  // --------------------------------------------------------------------------
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem(GUIDE_STORAGE_KEY);
      return seen !== "true";
    } catch {
      return true;
    }
  });

  const handleCloseGuide = () => {
    setIsGuideOpen(false);
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, "true");
    } catch (e) {
      console.warn("Fallo al registrar estado de guía en localStorage:", e);
    }
  };

  const handleStartFromGuide = () => {
    handleCloseGuide();
    handleStartNewCata();
  };

  const handleStartTour = () => {
    const tourUser: UserProfile = {
      id: "guest-tour",
      name: "Catador en Visita",
      username: "visitante",
      email: "visita@varietale.com",
      experienceLevel: "principiante",
      favoriteStore: "Varietale Chapinero - Carrera 4a #57-02",
      memberSince: "Hoy",
      avatarColor: "#01374C",
      authProvider: "guest",
      verified: false,
    };
    handleLogin(tourUser);
    setIsGuideOpen(true);
  };

  // --------------------------------------------------------------------------
  // G. Catálogo en Vivo Sincronizado con www.varietale.com
  // --------------------------------------------------------------------------
  const [liveCoffees, setLiveCoffees] = useState<CoffeeInfo[]>(() => {
    try {
      const saved = localStorage.getItem("varietale_live_catalog_cache");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Utiliza muestra de respaldo si falla el almacenamiento
    }
    return VARIETALE_SAMPLE_COFFEES;
  });
  const [isSyncingCatalog, setIsSyncingCatalog] = useState<boolean>(false);

  const refreshLiveCatalog = async (force: boolean = false) => {
    try {
      setIsSyncingCatalog(true);
      const res = await fetch(`/api/varietale-coffees${force ? "?refresh=true" : ""}`);
      if (res.ok) {
        const json = await res.json();
        if (json.coffees && json.coffees.length > 0) {
          setLiveCoffees(json.coffees);
          try {
            localStorage.setItem("varietale_live_catalog_cache", JSON.stringify(json.coffees));
          } catch {
            // Ignorar errores de cuota de localStorage
          }
        }
      }
    } catch (err) {
      console.warn("No se pudo sincronizar catálogo de varietale.com:", err);
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  useEffect(() => {
    refreshLiveCatalog();
    const interval = setInterval(() => {
      refreshLiveCatalog();
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------------------------------
  // H. Estado del Borrador de Cata en Progreso
  // --------------------------------------------------------------------------
  const [draftCoffee, setDraftCoffee] = useState<CoffeeInfo>(() => ({ ...EMPTY_COFFEE }));
  const [draftMethod, setDraftMethod] = useState<BrewMethod>("v60");
  const [draftQuality, setDraftQuality] = useState<QualityChecklist>({
    waterFiltered: true,
    grindCorrect: true,
    waterNotBoiling: true,
  });
  const [draftBody, setDraftBody] = useState<BodyLevel>(2);
  const [draftFlavors, setDraftFlavors] = useState<FlavorSelection[]>([]);
  const [draftRating, setDraftRating] = useState<number>(4);
  const [draftNotes, setDraftNotes] = useState<string>("");
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);

  // ID de la cata en edición (null si es una cata nueva)
  const [editingCataId, setEditingCataId] = useState<string | null>(null);
  const [editingCataCreatedAt, setEditingCataCreatedAt] = useState<string | null>(null);

  // Modal de celebración al completar y guardar una cata
  const [celebrationCata, setCelebrationCata] = useState<TastingRecord | null>(null);

  // --------------------------------------------------------------------------
  // I. Acciones del Flujo de Cata
  // --------------------------------------------------------------------------

  /**
   * Inicia una nueva cata limpia con valores por defecto y sin datos ficticios.
   */
  const handleStartNewCata = (presetCoffee?: CoffeeInfo | unknown, presetMethod?: BrewMethod | unknown) => {
    setEditingCataId(null);
    setEditingCataCreatedAt(null);

    // Valida estrictamente que presetCoffee sea un objeto de información de café y no un evento del click (MouseEvent / SyntheticEvent)
    const isValidCoffee =
      presetCoffee &&
      typeof presetCoffee === "object" &&
      "coffeeName" in (presetCoffee as object) &&
      typeof (presetCoffee as { coffeeName?: unknown }).coffeeName === "string" &&
      !("nativeEvent" in (presetCoffee as object));

    const sample: CoffeeInfo = isValidCoffee
      ? { ...(presetCoffee as CoffeeInfo) }
      : { ...EMPTY_COFFEE };

    setDraftCoffee(sample);
    const validMethod = typeof presetMethod === "string" ? (presetMethod as BrewMethod) : "v60";
    setDraftMethod(validMethod);
    setDraftQuality({
      waterFiltered: true,
      grindCorrect: true,
      waterNotBoiling: true,
    });
    setDraftBody(2);
    setDraftFlavors([]);
    setDraftRating(4);
    setDraftNotes("");
    setDraftPhoto(null);
    setCurrentScreen("registration");
    triggerLaunchSequence();
  };

  /**
   * Carga una cata existente del historial para entrar en ella y modificarla.
   */
  const handleEditCata = (record: TastingRecord) => {
    setEditingCataId(record.id);
    setEditingCataCreatedAt(record.createdAt);
    setDraftCoffee({
      coffeeName: record.coffeeName,
      brand: record.brand || "VARIETALE",
      farmName: record.farmName || "",
      farmerName: record.farmerName || "",
      country: record.country || "Colombia",
      department: record.department || "",
      origin: record.origin,
      variety: record.variety,
      process: record.process,
      altitude: record.altitude,
      imageUrl: record.photoUrl,
    });
    setDraftMethod(record.brewMethod);
    setDraftQuality(record.qualityChecklist || {
      waterFiltered: true,
      grindCorrect: true,
      waterNotBoiling: true,
    });
    setDraftBody(record.bodyLevel || 2);
    setDraftFlavors(record.selectedFlavors || []);
    setDraftRating(record.rating || 4);
    setDraftNotes(record.userNotes || "");
    setDraftPhoto(record.photoUrl || null);
    setCurrentScreen("registration");
  };

  /**
   * Guarda de forma permanente la cata finalizada o modificada en el historial del usuario.
   */
  const handleSaveCata = () => {
    const spiderProfile = computeSensorySpiderProfile(draftFlavors, draftBody);
    const recordId = editingCataId || `cata-${Date.now()}`;
    const createdAt = editingCataCreatedAt || new Date().toISOString();

    const finalPhoto = draftPhoto || draftCoffee.imageUrl || "/icon-192.png";

    const savedRecord: TastingRecord = {
      id: recordId,
      createdAt,
      coffeeName: draftCoffee.coffeeName.trim() || `Café ${(draftCoffee.brand || "VARIETALE").trim()}`,
      brand: draftCoffee.brand?.trim() || "VARIETALE",
      farmName: draftCoffee.farmName?.trim() || undefined,
      farmerName: draftCoffee.farmerName?.trim() || undefined,
      country: draftCoffee.country?.trim() || undefined,
      department: draftCoffee.department?.trim() || undefined,
      origin: draftCoffee.origin?.trim() || "",
      variety: draftCoffee.variety?.trim() || "",
      process: draftCoffee.process?.trim() || "",
      altitude: draftCoffee.altitude?.trim() || "",
      brewMethod: draftMethod,
      qualityChecklist: draftQuality,
      bodyLevel: draftBody,
      selectedFlavors: draftFlavors,
      spiderProfile,
      rating: draftRating,
      userNotes: draftNotes.trim(),
      photoUrl: finalPhoto,
    };

    let updated: TastingRecord[];
    const isNewCata = !editingCataId;
    if (editingCataId) {
      // Modifica la cata existente en su misma posición en la bitácora
      updated = tastings.map((t) => (t.id === editingCataId ? savedRecord : t));
    } else {
      // Agrega nueva cata al inicio
      updated = [savedRecord, ...tastings];
    }

    setTastings(updated);
    if (currentUser) {
      try {
        const key = getUserTastingsKey(currentUser);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (err) {
        console.warn("Fallo al persistir cata guardada:", err);
      }

      if (isNewCata) {
        triggerWebhookInBackground("new_tasting", {
          user: currentUser,
          tasting: savedRecord,
        });
      }
    }

    setEditingCataId(null);
    setEditingCataCreatedAt(null);
    setCelebrationCata(savedRecord);
  };

  /**
   * Elimina un registro de cata de la bitácora del usuario activo.
   */
  const handleDeleteCata = (id: string) => {
    const updated = tastings.filter((t) => t.id !== id);
    setTastings(updated);
    try {
      const key = getUserTastingsKey(currentUser);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn("Fallo al persistir eliminación de cata:", err);
    }
  };

  // --------------------------------------------------------------------------
  // I2. Estado de Edición Visual en Vivo y Sincronización CMS (Textos y Rueda SCA)
  // --------------------------------------------------------------------------
  const [isVisualEditMode, setIsVisualEditMode] = useState<boolean>(() =>
    isVisualEditModeActive()
  );
  const [cmsVersionTick, setCmsVersionTick] = useState<number>(0);

  useEffect(() => {
    applyCmsOverridesToMasterData();
    syncUiCmsFromServer().then((changed) => {
      if (changed) setCmsVersionTick((t) => t + 1);
    });

    const handleCmsUpdated = () => {
      applyCmsOverridesToMasterData();
      setCmsVersionTick((t) => t + 1);
    };
    window.addEventListener("varietale-ui-cms-updated", handleCmsUpdated);
    return () => {
      window.removeEventListener("varietale-ui-cms-updated", handleCmsUpdated);
    };
  }, []);

  const ensurePreviewUserForVisualEdit = () => {
    if (!currentUser) {
      const previewUser: UserProfile = {
        id: "admin-preview-user",
        name: "Vista Previa Admin",
        username: "admin.vista",
        email: "admin@varietale.com",
        experienceLevel: "aficionado",
        favoriteStore: "Varietale Chapinero - Carrera 4a #57-02",
        memberSince: "Hoy",
        avatarColor: "#01374C",
        authProvider: "email",
        verified: true,
      };
      setCurrentUser(previewUser);
    }
  };

  const handleStartVisualEditMode = () => {
    ensurePreviewUserForVisualEdit();
    setVisualEditModeActive(true);
    setIsVisualEditMode(true);
    setShowLaunchSequence(false);
    setCurrentScreen("home");
  };

  const currentMethodName =
    BREW_METHODS.find((m) => m.id === draftMethod)?.name || "V60";

  // --------------------------------------------------------------------------
  // J. Renderizado de la Interfaz
  // --------------------------------------------------------------------------
  return (
    <div
      className="min-h-screen bg-white text-[#01374C] flex flex-col font-sans selection:bg-[#00D9B4]/30 selection:text-[#01374C]"
      data-cms-version={cmsVersionTick}
    >
      {/* Overlay de Edición Visual en Vivo + Sincronizador de Textos del Administrador */}
      <LiveVisualEditorOverlay
        isVisualEditMode={isVisualEditMode}
        onExitVisualEditMode={() => {
          setLaunchPreviewFrozen(false);
          setShowLaunchSequence(false);
          setVisualEditModeActive(false);
          setIsVisualEditMode(false);
        }}
        onCloseVisualEditMode={() => {
          setLaunchPreviewFrozen(false);
          setShowLaunchSequence(false);
          setVisualEditModeActive(false);
          setIsVisualEditMode(false);
        }}
        currentScreen={showLaunchSequence ? "launch" : currentScreen}
        onNavigateScreen={(screen) => {
          setIsGuideOpen(false);
          setShowInstallPrompt(false);
          setIsInstallModalOpen(false);
          setIsAuthOpen(false);
          setCelebrationCata(null);
          window.dispatchEvent(
            new CustomEvent("varietale-cms-open-submodal", {
              detail: { modalId: "close_all" },
            })
          );

          if (screen === "launch") {
            setLaunchPreviewFrozen(true);
            setShowLaunchSequence(true);
            return;
          }

          setLaunchPreviewFrozen(false);
          setShowLaunchSequence(false);

          if (screen === "admin") {
            setAdminSessionActive(true);
            setCurrentScreen("admin");
            return;
          }

          if (screen !== "auth") {
            ensurePreviewUserForVisualEdit();
          }
          setCurrentScreen(screen);
        }}
        onOpenPopup={(popup) => {
          setLaunchPreviewFrozen(false);
          setShowLaunchSequence(false);
          setIsGuideOpen(false);
          setShowInstallPrompt(false);
          setIsInstallModalOpen(false);
          setIsAuthOpen(false);
          setCelebrationCata(null);
          window.dispatchEvent(
            new CustomEvent("varietale-cms-open-submodal", {
              detail: { modalId: "close_all" },
            })
          );

          if (
            popup === "admin_login" ||
            popup === "admin_recover" ||
            popup === "google_chooser" ||
            popup === "forgot_user" ||
            popup === "reset_password"
          ) {
            setCurrentScreen("auth");
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("varietale-cms-open-submodal", {
                  detail: { modalId: popup },
                })
              );
            }, 70);
            return;
          }

          if (popup === "redirect_audit") {
            setCurrentScreen("admin");
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("varietale-cms-open-submodal", {
                  detail: { modalId: popup },
                })
              );
            }, 70);
            return;
          }

          if (popup === "welcome_gift") {
            ensurePreviewUserForVisualEdit();
            setCurrentScreen("registration");
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("varietale-cms-open-submodal", {
                  detail: { modalId: popup },
                })
              );
            }, 70);
            return;
          }

          if (popup === "flavor_intensity") {
            ensurePreviewUserForVisualEdit();
            setCurrentScreen("wheel");
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("varietale-cms-open-submodal", {
                  detail: { modalId: popup },
                })
              );
            }, 70);
            return;
          }

          if (popup === "delete_cata") {
            ensurePreviewUserForVisualEdit();
            setCurrentScreen("logbook");
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("varietale-cms-open-submodal", {
                  detail: { modalId: popup },
                })
              );
            }, 70);
            return;
          }

          ensurePreviewUserForVisualEdit();
          if (currentScreen === "admin") {
            setCurrentScreen("home");
          }

          if (popup === "share") {
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("varietale-cms-open-submodal", {
                  detail: { modalId: "share" },
                })
              );
            }, 70);
            return;
          }

          setIsGuideOpen(popup === "guide");
          setShowInstallPrompt(popup === "install_prompt");
          setIsInstallModalOpen(popup === "install_guide");
          setIsAuthOpen(popup === "auth_modal");
          if (popup === "celebration") {
            setCelebrationCata(
              tastings[0] || {
                id: "preview-celebration",
                createdAt: new Date().toISOString(),
                coffeeName: "Geisha Reserva Especial (Vista Previa)",
                brand: "VARIETALE",
                origin: "Huila, Colombia",
                variety: "Geisha",
                process: "Lavado",
                altitude: "1850 msnm",
                brewMethod: "v60",
                qualityChecklist: {
                  waterFiltered: true,
                  grindCorrect: true,
                  waterNotBoiling: true,
                },
                bodyLevel: 2,
                selectedFlavors: [
                  {
                    descriptorId: "jasmine",
                    name: "Jazmín",
                    macro: "Floral",
                    subcategory: "Flores blancas",
                    intensity: 5,
                    color: "#EC407A",
                  },
                  {
                    descriptorId: "peach",
                    name: "Durazno",
                    macro: "Frutal",
                    subcategory: "Fruta de hueso",
                    intensity: 4,
                    color: "#FB8C00",
                  },
                ],
                spiderProfile: {
                  frutal: 80,
                  dulce: 75,
                  tostado: 30,
                  floral: 90,
                  cuerpo: 65,
                  acidez: 85,
                  balance: 85,
                },
                rating: 5,
                userNotes: "Vista previa para editar los textos del pop-up.",
              }
            );
          }
        }}
        onMasterDataChanged={() => setCmsVersionTick((t) => t + 1)}
        onReturnToAdminPanel={() => {
          setLaunchPreviewFrozen(false);
          setShowLaunchSequence(false);
          setVisualEditModeActive(false);
          setIsVisualEditMode(false);
          setAdminSessionActive(true);
          setCurrentScreen("admin");
        }}
      />

      {/* Contenedor Principal de Pantallas */}
      <main className="flex-1">
        {/* Contenedor raíz de todas las pantallas, Pop-ups y Panel Admin (observado por el Editor de Textos y Sabores) */}
        <div id="user-app-root">
          {/* Pantalla de Administración (Portal del Administrador) */}
          {currentScreen === "admin" && (
            <AdminPortalScreen
              liveCoffees={liveCoffees}
              isSyncingCatalog={isSyncingCatalog}
              onForceRefreshCatalog={() => refreshLiveCatalog(true)}
              onExitAdmin={() => {
                setAdminSessionActive(false);
                setCurrentScreen(currentUser ? "home" : "auth");
              }}
              onStartVisualEditMode={handleStartVisualEditMode}
              onLoginAsTestUser={handleEnterTestUserMode}
            />
          )}

          {/* Barra Superior Fija del Modo Usuario de Prueba */}
          {isTestUserActive && currentScreen !== "admin" && (
            <aside
              data-cms-locked="true"
              aria-label="Barra de herramientas de usuario de prueba"
              className="sticky top-0 z-40 bg-[#002636] text-white border-b-2 border-cyan-400 px-3 py-2 shadow-lg"
            >
              <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-400/30">
                    <FlaskConical className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-black text-cyan-300 block leading-tight">
                      Modo Usuario de Prueba • catador.prueba
                    </span>
                    <span className="text-[10px] text-white/70 block">
                      {tastings.length} catas en bitácora • Métricas reales 100% aisladas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleSeed20TestTastings}
                    className="min-h-[32px] px-2.5 sm:px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#002636] text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Simular 20 cataciones aleatorias de cafés colombianos con descriptores SCA y notas para probar la Bitácora"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simular 20 Catas</span>
                  </button>

                  {tastings.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearTestTastings}
                      className="min-h-[32px] px-2 sm:px-2.5 py-1 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 border border-white/20 hover:border-rose-400 text-white/90 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Vaciar las cataciones de prueba"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Limpiar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleReturnToAdminFromTestUser}
                    className="min-h-[32px] px-3 py-1 rounded-xl bg-[#00D9B4] hover:bg-[#00c4a3] text-[#01374C] text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Cerrar la sesión de prueba y regresar al Panel de Administración"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Volver al Panel Admin</span>
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Pantalla 0: Autenticación Obligatoria (si no hay sesión ni está en Admin) */}
          {currentScreen !== "admin" && (currentScreen === "auth" || !currentUser) && (
            <AuthScreen
              onLoginSuccess={handleLogin}
              onContinueAsGuest={handleContinueAsGuest}
              onStartTour={handleStartTour}
              onAdminLoginSuccess={() => setCurrentScreen("admin")}
            />
          )}

          {/* Pantalla 1: Inicio / Hub del Catador */}
          {currentUser && currentScreen === "home" && (
            <HomeScreen
              tastings={tastings}
              currentUser={currentUser}
              onStartNewCata={handleStartNewCata}
              onOpenLogbook={() => setCurrentScreen("logbook")}
              onOpenGuide={() => setIsGuideOpen(true)}
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenInstall={() => setIsInstallModalOpen(true)}
              liveCoffees={liveCoffees}
              isSyncing={isSyncingCatalog}
              onRefreshCatalog={() => refreshLiveCatalog(true)}
            />
          )}

          {/* Pantalla 2: Registro del Café y Parámetros del Método */}
          {currentUser && currentScreen === "registration" && (
            <RegistrationScreen
              coffeeInfo={draftCoffee}
              onCoffeeInfoChange={setDraftCoffee}
              selectedMethod={draftMethod}
              onMethodChange={setDraftMethod}
              qualityChecklist={draftQuality}
              onQualityChecklistChange={setDraftQuality}
              photoUrl={draftPhoto}
              onPhotoChange={setDraftPhoto}
              onProceedToWheel={() => setCurrentScreen("wheel")}
              onCancel={() => {
                if (editingCataId) {
                  setEditingCataId(null);
                  setEditingCataCreatedAt(null);
                  setCurrentScreen("logbook");
                } else {
                  setCurrentScreen("home");
                }
              }}
              liveCoffees={liveCoffees}
              isEditing={Boolean(editingCataId)}
              hasZeroTastings={tastings.length === 0}
            />
          )}

          {/* Pantalla 3: Rueda de Sabores Interactiva Táctil */}
          {currentUser && currentScreen === "wheel" && (
            <InteractiveFlavorWheel
              coffeeName={draftCoffee.coffeeName}
              origin={draftCoffee.origin}
              imageUrl={draftCoffee.imageUrl || draftPhoto || undefined}
              brewMethodName={currentMethodName}
              bodyLevel={draftBody}
              onBodyChange={setDraftBody}
              selectedFlavors={draftFlavors}
              onFlavorsChange={setDraftFlavors}
              rating={draftRating}
              onRatingChange={setDraftRating}
              userNotes={draftNotes}
              onNotesChange={setDraftNotes}
              onSaveCata={handleSaveCata}
              onBack={() => setCurrentScreen("registration")}
              isEditing={Boolean(editingCataId)}
            />
          )}

          {/* Pantalla 4: Bitácora de Catación (Historial, Comparador y Exploración) */}
          {currentUser && currentScreen === "logbook" && (
            <LogbookScreen
              tastings={tastings}
              onStartNewCata={handleStartNewCata}
              onEditCata={handleEditCata}
              onDeleteCata={handleDeleteCata}
              onBackToHome={() => setCurrentScreen("home")}
            />
          )}

          {/* Pestaña Lateral Vertical Fija para Compartir la App (Margen Derecho) */}
          {currentScreen !== "admin" && <FloatingShareTab />}

          {/* Barra de Navegación Inferior Móvil (Visible en Inicio y Bitácora) */}
          {currentUser && (currentScreen === "home" || currentScreen === "logbook") && (
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-[#E8EDF1] pt-2 px-3 sm:px-6 z-30 shadow-[0_-4px_25px_rgba(1,55,76,0.08)] safe-nav-pb">
              <div className="max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-between relative px-2 sm:px-4">
                {/* 1. Inicio */}
                <button
                  id="nav-home-btn"
                  onClick={() => setCurrentScreen("home")}
                  className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 transition-all active:scale-95 cursor-pointer ${
                    currentScreen === "home"
                      ? "text-[#01374C] font-black"
                      : "text-[#889DA7] hover:text-[#01374C]"
                  }`}
                >
                  <Coffee className={`w-5.5 h-5.5 ${currentScreen === "home" ? "text-[#01374C]" : "text-[#889DA7]"}`} />
                  <span className="text-xs sm:text-sm mt-1 font-bold">Inicio</span>
                </button>

                {/* 2. Guía */}
                <button
                  id="nav-guide-btn"
                  onClick={() => setIsGuideOpen(true)}
                  className="flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 text-[#889DA7] hover:text-[#01374C] transition-all active:scale-95 cursor-pointer"
                  title="Visita Guiada"
                >
                  <Compass className="w-5.5 h-5.5 text-[#889DA7]" />
                  <span className="text-xs sm:text-sm mt-1 font-bold">Guía</span>
                </button>

                {/* 3. Botón Flotante Central: Nueva Cata */}
                <div className="flex-1 flex justify-center -mt-6">
                  <button
                    id="nav-new-cata-btn"
                    onClick={() => handleStartNewCata()}
                    className="flex items-center justify-center bg-[#01374C] text-white w-14 h-14 min-w-[56px] min-h-[56px] rounded-full shadow-lg shadow-[#01374C]/35 hover:bg-[#002636] transition-all active:scale-90 border-3 border-white cursor-pointer"
                    title="Nueva Cata"
                    aria-label="Nueva Cata"
                  >
                    <Plus className="w-6 h-6 text-[#00D9B4] stroke-[3]" />
                  </button>
                </div>

                {/* 4. Bitácora con Contador de Catas */}
                <button
                  id="nav-logbook-btn"
                  onClick={() => setCurrentScreen("logbook")}
                  className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 transition-all active:scale-95 relative cursor-pointer ${
                    currentScreen === "logbook"
                      ? "text-[#01374C] font-black"
                      : "text-[#889DA7] hover:text-[#01374C]"
                  }`}
                >
                  <div className="relative">
                    <BookOpen className={`w-5.5 h-5.5 ${currentScreen === "logbook" ? "text-[#01374C]" : "text-[#889DA7]"}`} />
                    {tastings.length > 0 && (
                      <span
                        data-cms-locked="true"
                        className="absolute -top-1.5 -right-2.5 bg-[#01374C] text-[#00D9B4] text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white tabular-nums"
                      >
                        {tastings.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm mt-1 font-bold">Bitácora</span>
                </button>

                {/* 5. Perfil de Catador */}
                <button
                  id="nav-profile-btn"
                  onClick={() => setIsAuthOpen(true)}
                  className="flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 text-[#889DA7] hover:text-[#01374C] transition-all active:scale-95 cursor-pointer"
                >
                  {currentUser ? (
                    <span
                      data-cms-locked="true"
                      className="w-5.5 h-5.5 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center text-[11px] font-black relative"
                    >
                      {currentUser.name.charAt(0).toUpperCase()}
                      {currentUser.authProvider === "google" && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#4285F4] ring-1 ring-white" />
                      )}
                    </span>
                  ) : (
                    <User className="w-5.5 h-5.5 text-[#889DA7]" />
                  )}
                  <span
                    data-cms-locked={currentUser ? "true" : undefined}
                    className="text-xs sm:text-sm mt-1 font-bold max-w-[75px] truncate"
                  >
                    {currentUser ? currentUser.name.split(" ")[0] : "Ingresar"}
                  </span>
                </button>
              </div>
            </nav>
          )}

          {/* Modal de Revelación y Celebración al Guardar Cata */}
          {celebrationCata && (
            <CataCelebrationModal
              cata={celebrationCata}
              onGoToLogbook={() => {
                setCelebrationCata(null);
                setCurrentScreen("logbook");
              }}
              onClose={() => {
                setCelebrationCata(null);
                setCurrentScreen("home");
              }}
            />
          )}

          {/* Modal Interactivo de Visita Guiada (Onboarding) */}
          {currentUser && (
            <OnboardingGuideModal
              isOpen={isGuideOpen}
              onClose={handleCloseGuide}
              onStartFirstCata={handleStartFromGuide}
            />
          )}

          {/* Modal de Perfil de Usuario y Gestión de Cuenta */}
          <UserAuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            tastings={tastings}
            onOpenInstall={() => setIsInstallModalOpen(true)}
            onReturnToAdmin={handleReturnToAdminFromTestUser}
          />

          {/* Popup centrado de invitación a instalar la app (aparece siempre tras sign-in si no está instalada) */}
          <InstallPwaPromptModal
            isOpen={showInstallPrompt}
            onClose={() => setShowInstallPrompt(false)}
            onOpenGuide={() => setIsInstallModalOpen(true)}
          />

          {/* Modal interactivo con guía visual para agregar a inicio en iOS y Android */}
          <InstallPwaModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
            deferredPrompt={deferredPrompt}
            onInstallSuccess={() => setDeferredPrompt(null)}
          />

          {/* Secuencia de Lanzamiento Líquida Inicial */}
          {showLaunchSequence && (
            <LaunchSequence
              key={launchSequenceKey}
              onComplete={handleCompleteLaunchSequence}
              freezePreview={isVisualEditMode && launchPreviewFrozen}
            />
          )}
        </div>
      </main>
    </div>
  );
}
