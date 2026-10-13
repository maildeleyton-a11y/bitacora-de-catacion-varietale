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

import React, { useState, useEffect } from "react";
import { Coffee, BookOpen, Plus, User, Compass } from "lucide-react";
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
import { HomeScreen } from "./components/HomeScreen";
import { RegistrationScreen } from "./components/RegistrationScreen";
import { InteractiveFlavorWheel } from "./components/InteractiveFlavorWheel";
import { LogbookScreen } from "./components/LogbookScreen";
import { CataCelebrationModal } from "./components/CataCelebrationModal";
import { OnboardingGuideModal } from "./components/OnboardingGuideModal";
import { UserAuthModal } from "./components/UserAuthModal";
import { AuthScreen } from "./components/AuthScreen";
import { LaunchSequence } from "./components/LaunchSequence";

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

/** Intervalo para volver a mostrar la animación líquida de inicio (2 horas) */
const TWO_HOURS_MS = 7200000;
const LAST_SPLASH_KEY = "last_splash_seen";

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
  const [showLaunchSequence, setShowLaunchSequence] = useState<boolean>(() => {
    try {
      const lastSeen = localStorage.getItem(LAST_SPLASH_KEY);
      if (lastSeen) {
        const timeElapsed = Date.now() - Number(lastSeen);
        if (timeElapsed >= 0 && timeElapsed < TWO_HOURS_MS) {
          return false; // Menos de 2 horas desde la última visita: omitir splash
        }
      }
    } catch {
      return true;
    }
    return true;
  });

  const handleCompleteLaunchSequence = () => {
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
  // "auth" | "home" | "registration" | "wheel" | "logbook"
  // --------------------------------------------------------------------------
  const [currentScreen, setCurrentScreen] = useState<
    "auth" | "home" | "registration" | "wheel" | "logbook"
  >(() => {
    try {
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

  // Modal lateral/flotante de información de perfil
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

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
  const handleStartNewCata = (presetCoffee?: CoffeeInfo, presetMethod?: BrewMethod) => {
    setEditingCataId(null);
    setEditingCataCreatedAt(null);
    const sample = presetCoffee ? { ...presetCoffee } : { ...EMPTY_COFFEE };
    setDraftCoffee(sample);
    setDraftMethod(presetMethod || "v60");
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
  };

  /**
   * Carga una cata existente del historial para entrar en ella y modificarla.
   */
  const handleEditCata = (record: TastingRecord) => {
    setEditingCataId(record.id);
    setEditingCataCreatedAt(record.createdAt);
    setDraftCoffee({
      coffeeName: record.coffeeName,
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

    const savedRecord: TastingRecord = {
      id: recordId,
      createdAt,
      coffeeName: draftCoffee.coffeeName.trim(),
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
      photoUrl: draftPhoto || draftCoffee.imageUrl || undefined,
    };

    let updated: TastingRecord[];
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

  const currentMethodName =
    BREW_METHODS.find((m) => m.id === draftMethod)?.name || "V60";

  // --------------------------------------------------------------------------
  // J. Renderizado de la Interfaz
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white text-[#01374C] flex flex-col font-sans selection:bg-[#00D9B4]/30 selection:text-[#01374C]">
      {/* Contenedor Principal de Pantallas */}
      <main className="flex-1">
        {/* Pantalla 0: Autenticación Obligatoria (si no hay sesión) */}
        {(currentScreen === "auth" || !currentUser) && (
          <AuthScreen
            onLoginSuccess={handleLogin}
            onContinueAsGuest={handleContinueAsGuest}
            onStartTour={handleStartTour}
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
      </main>

      {/* Barra de Navegación Inferior Móvil (Visible en Inicio y Bitácora) */}
      {currentUser && (currentScreen === "home" || currentScreen === "logbook") && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-[#E8EDF1] pt-2 px-3 sm:px-4 z-30 shadow-[0_-4px_25px_rgba(1,55,76,0.08)] safe-nav-pb">
          <div className="max-w-md mx-auto flex items-center justify-between relative px-1 sm:px-2">
            {/* 1. Inicio */}
            <button
              id="nav-home-btn"
              onClick={() => setCurrentScreen("home")}
              className={`flex-1 min-h-[46px] flex flex-col items-center justify-center py-1 transition-all active:scale-95 cursor-pointer ${
                currentScreen === "home"
                  ? "text-[#01374C] font-black"
                  : "text-[#889DA7] hover:text-[#01374C]"
              }`}
            >
              <Coffee className={`w-5 h-5 ${currentScreen === "home" ? "text-[#01374C]" : "text-[#889DA7]"}`} />
              <span className="text-[11px] mt-1 font-bold">Inicio</span>
            </button>

            {/* 2. Guía */}
            <button
              id="nav-guide-btn"
              onClick={() => setIsGuideOpen(true)}
              className="flex-1 min-h-[46px] flex flex-col items-center justify-center py-1 text-[#889DA7] hover:text-[#01374C] transition-all active:scale-95 cursor-pointer"
              title="Visita Guiada"
            >
              <Compass className="w-5 h-5 text-[#889DA7]" />
              <span className="text-[11px] mt-1 font-bold">Guía</span>
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
              className={`flex-1 min-h-[46px] flex flex-col items-center justify-center py-1 transition-all active:scale-95 relative cursor-pointer ${
                currentScreen === "logbook"
                  ? "text-[#01374C] font-black"
                  : "text-[#889DA7] hover:text-[#01374C]"
              }`}
            >
              <div className="relative">
                <BookOpen className={`w-5 h-5 ${currentScreen === "logbook" ? "text-[#01374C]" : "text-[#889DA7]"}`} />
                {tastings.length > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#01374C] text-[#00D9B4] text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                    {tastings.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 font-bold">Bitácora</span>
            </button>

            {/* 5. Perfil de Catador */}
            <button
              id="nav-profile-btn"
              onClick={() => setIsAuthOpen(true)}
              className="flex-1 min-h-[46px] flex flex-col items-center justify-center py-1 text-[#889DA7] hover:text-[#01374C] transition-all active:scale-95 cursor-pointer"
            >
              {currentUser ? (
                <span className="w-5 h-5 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center text-[10px] font-black relative">
                  {currentUser.name.charAt(0).toUpperCase()}
                  {currentUser.authProvider === "google" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#4285F4] ring-1 ring-white" />
                  )}
                </span>
              ) : (
                <User className="w-5 h-5 text-[#889DA7]" />
              )}
              <span className="text-[11px] mt-1 font-bold max-w-[65px] truncate">
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
      />

      {/* Secuencia de Lanzamiento Líquida Inicial */}
      {showLaunchSequence && (
        <LaunchSequence onComplete={handleCompleteLaunchSequence} />
      )}
    </div>
  );
}
