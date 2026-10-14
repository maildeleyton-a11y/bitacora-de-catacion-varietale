/**
 * ============================================================================
 * MODAL DE PERFIL Y AUTENTICACIÓN (USER AUTH MODAL)
 * ============================================================================
 * Ventana modal para:
 * 1. Consultar y editar el perfil de catador en sesión activa.
 * 2. Cambiar de cuenta o registrar un nuevo usuario sin abandonar la app.
 * 3. Recuperar contraseña mediante PIN numérico de 4 dígitos.
 * 4. Cerrar sesión de manera segura.
 */

import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  User,
  Lock,
  LogOut,
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { UserProfile, TastingRecord } from "../types";
import { GoogleAccountChooserModal } from "./GoogleAccountChooserModal";
import {
  findAccountByIdentifier,
  saveAccount,
  verifyPin,
  resetPassword,
  accountToUserProfile,
  StoredAccount,
} from "../data/accountStore";

interface UserAuthModalProps {
  /** Indica si el modal se encuentra visible */
  isOpen: boolean;
  /** Acción para cerrar el modal */
  onClose: () => void;
  /** Usuario activo en sesión */
  currentUser: UserProfile | null;
  /** Callback al iniciar sesión exitosamente */
  onLogin: (user: UserProfile) => void;
  /** Callback al cerrar sesión */
  onLogout: () => void;
  /** Catas registradas por el catador */
  tastings: TastingRecord[];
  /** Acción para abrir el modal de instalación PWA */
  onOpenInstall?: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  tastings,
  onOpenInstall,
}) => {
  const [activeTab, setActiveTab] = useState<
    "register" | "login" | "profile" | "resetPassword" | "quickReminder"
  >(currentUser ? "profile" : "login");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Al abrir la ventana o cambiar de pestaña, posicionar siempre arriba
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" });
      scrollContainerRef.current.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [activeTab, isOpen]);

  // Google modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleMode, setGoogleMode] = useState<"login" | "register">("login");

  // Registration states
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPin, setRegPin] = useState("1234");
  const [regError, setRegError] = useState<string | null>(null);

  // Login states
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Quick reminder states
  const [reminderQuery, setReminderQuery] = useState("");
  const [foundAccount, setFoundAccount] = useState<StoredAccount | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  // Reset password states (Uses PIN ONLY)
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [targetAccount, setTargetAccount] = useState<StoredAccount | null>(null);
  const [resetPinInput, setResetPinInput] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle new user registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim()) {
      setRegError("Por favor ingresa tu nombre y apellido");
      return;
    }
    if (!regUsername.trim()) {
      setRegError("Por favor ingresa un nombre de usuario");
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setRegError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (!regPin.trim() || regPin.length !== 4) {
      setRegError("El PIN de respaldo debe ser de 4 dígitos");
      return;
    }

    const cleanUserSlug = regUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const emailToUse = regEmail.trim()
      ? regEmail.trim().toLowerCase()
      : `${cleanUserSlug || "catador"}@varietale.com`;

    const existing = findAccountByIdentifier(cleanUserSlug);
    if (existing) {
      setRegError(`El usuario @${cleanUserSlug} ya existe. Intenta con otro o inicia sesión.`);
      return;
    }

    const newAccount: StoredAccount = {
      id: `user-${cleanUserSlug || Date.now().toString(36)}`,
      name: regName.trim(),
      username: cleanUserSlug,
      email: emailToUse,
      password: regPassword.trim(),
      securityPin: regPin.trim(),
      securityQuestion: "",
      securityAnswer: "",
      avatarColor: "#01374C",
      authProvider: "email",
      createdAt: new Date().toLocaleDateString("es-CO", {
        month: "long",
        year: "numeric",
      }),
    };

    saveAccount(newAccount);
    onLogin(accountToUserProfile(newAccount));
    onClose();
  };

  // Handle login submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const idInput = loginIdentifier.trim();
    if (!idInput) {
      setLoginError("Por favor ingresa tu correo electrónico registrado");
      return;
    }

    const acc = findAccountByIdentifier(idInput);
    if (!acc) {
      setLoginError("No se encontró una cuenta con ese dato. Regístrate o ingresa con Google.");
      return;
    }

    if (acc.password && acc.password !== loginPassword.trim()) {
      setLoginError("Contraseña incorrecta. Puedes restablecerla con tu PIN de respaldo.");
      return;
    }

    onLogin(accountToUserProfile(acc));
    onClose();
  };

  // Quick Reminder Search
  const handleReminderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setReminderError(null);
    setFoundAccount(null);

    const q = reminderQuery.trim();
    if (!q) {
      setReminderError("Ingresa tu correo o teléfono");
      return;
    }

    const acc = findAccountByIdentifier(q);
    if (acc) {
      setFoundAccount(acc);
    } else {
      setReminderError("No se encontró cuenta asociada. Revisa el dato o regístrate.");
    }
  };

  // Password reset step 1
  const handleStartReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const acc = findAccountByIdentifier(resetIdentifier.trim());
    if (!acc) {
      setResetError("Cuenta no encontrada. Revisa tu correo o usuario.");
      return;
    }
    setTargetAccount(acc);
    setIsVerified(false);
  };

  // Password reset step 2: Verify PIN ONLY
  const handleVerifyReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!targetAccount) return;

    if (!resetPinInput.trim() || resetPinInput.trim().length !== 4) {
      setResetError("Ingresa tu PIN de 4 dígitos.");
      return;
    }

    if (verifyPin(targetAccount.username, resetPinInput.trim())) {
      setIsVerified(true);
    } else {
      setResetError("PIN incorrecto. Revisa tus 4 dígitos de respaldo.");
    }
  };

  // Password reset step 3: Set new password
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!targetAccount) return;

    if (!newPassword.trim() || newPassword.length < 6) {
      setResetError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Las contraseñas no coinciden");
      return;
    }

    resetPassword(targetAccount.username, newPassword.trim());
    setResetSuccess("¡Contraseña actualizada!");
    setTimeout(() => {
      const updated = findAccountByIdentifier(targetAccount.username) || targetAccount;
      onLogin(accountToUserProfile(updated));
      onClose();
    }, 1000);
  };

  // Calculate user cata stats
  const totalCatas = tastings.length;
  const methodsUsed = new Set(tastings.map((t) => t.brewMethod)).size;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white rounded-3xl p-5 sm:p-6 max-w-md md:max-w-lg w-full shadow-2xl border border-[#E8EDF1] max-h-[92vh] flex flex-col justify-between overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E8EDF1]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#01374C] flex items-center justify-center shadow-xs border border-[#00D9B4]/30 shrink-0">
                <User className="w-5 h-5 text-[#00D9B4] stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#01374C] leading-none">
                  {currentUser ? "Perfil de Catador" : "Registro & Acceso"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF6F2] hover:bg-[#F2ECE4] border border-[#DDC1AB] text-[#01374C] text-xs sm:text-sm font-black transition-all shadow-xs active:scale-95 cursor-pointer"
              aria-label="Cerrar ventana"
            >
              <span className="w-4 h-4 rounded-full bg-[#01374C] text-white flex items-center justify-center text-[10px] font-black leading-none">
                ✕
              </span>
              <span>Cerrar</span>
            </button>
          </div>

          {/* Tab Navigation if not logged in */}
          {!currentUser && (
            <div className="flex gap-2 p-1.5 bg-[#F5F8FA] rounded-2xl my-3 border border-[#E8EDF1]">
              <button
                onClick={() => {
                  setActiveTab("login");
                  setLoginError(null);
                }}
                className={`flex-1 min-h-[44px] py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white text-[#01374C] shadow-xs border border-[#E8EDF1]"
                    : "text-[#52646E]"
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("register");
                  setRegError(null);
                }}
                className={`flex-1 min-h-[44px] py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "register"
                    ? "bg-white text-[#01374C] shadow-xs border border-[#E8EDF1]"
                    : "text-[#52646E]"
                }`}
              >
                <UserPlus className="w-4 h-4 text-[#00D9B4]" />
                <span>Crear Cuenta</span>
              </button>
            </div>
          )}

          {/* Content Area */}
          <div ref={scrollContainerRef} className="my-2 overflow-y-auto pr-1 flex-1">
            {/* GOOGLE QUICK SIGN-IN (When not logged in) */}
            {!currentUser && activeTab !== "profile" && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setGoogleMode(activeTab === "register" ? "register" : "login");
                    setShowGoogleModal(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#DDC1AB] bg-white hover:bg-[#FAF6F2] text-[#01374C] font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {activeTab === "register" ? "Registrarse con Google" : "Continuar con Google"}
                  </span>
                </button>
                <div className="relative flex py-2 items-center">
                  <div className="grow border-t border-[#E8EDF1]"></div>
                  <span className="shrink mx-2 text-[10px] text-[#889DA7] uppercase">O</span>
                  <div className="grow border-t border-[#E8EDF1]"></div>
                </div>
              </div>
            )}

            {/* TAB 1: LOGIN */}
            {!currentUser && activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {loginError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium text-center">
                    {loginError}
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-[#01374C]">
                      Correo Electrónico
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("quickReminder")}
                      className="text-xs font-bold text-[#00897B] hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu cuenta?
                    </button>
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#9FB2BC] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full pl-10 pr-3 py-2.5 min-h-[46px] bg-white text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-[#01374C]">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetIdentifier(loginIdentifier);
                        setTargetAccount(findAccountByIdentifier(loginIdentifier));
                        setIsVerified(false);
                        setActiveTab("resetPassword");
                      }}
                      className="text-xs font-bold text-[#00897B] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>¿Olvidaste tu contraseña?</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9FB2BC] absolute left-3.5 top-3.5" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 min-h-[46px] bg-white text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-[#889DA7] hover:text-[#01374C] cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] py-3 bg-[#01374C] text-white text-sm sm:text-base font-black rounded-xl hover:bg-[#002636] transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-1"
                >
                  <span>Entrar a Mi Bitácora</span>
                  <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER */}
            {!currentUser && activeTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {regError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium text-center">
                    {regError}
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="ej: Leyton Silva"
                    className="w-full px-3.5 py-2.5 min-h-[46px] bg-white text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="ej: leyton"
                    className="w-full px-3.5 py-2.5 min-h-[46px] bg-white text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                    Correo Electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ej: correo@gmail.com"
                    className="w-full px-3.5 py-2.5 min-h-[46px] bg-white text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                    Contraseña * (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-11 py-2.5 min-h-[46px] bg-white text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-3 text-[#889DA7] hover:text-[#01374C] cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Respaldo: PIN ÚNICAMENTE */}
                <div className="p-3.5 bg-[#FAF6F2] rounded-2xl border border-[#DDC1AB] space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00897B]" />
                    <span className="text-xs sm:text-sm font-black text-[#01374C]">
                      PIN de Respaldo (Sin correos ni códigos)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#52646E] leading-relaxed">
                    Define un PIN de 4 dígitos para restablecer tu contraseña al instante si la olvidas.
                  </p>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1">
                      PIN de 4 dígitos *
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full min-h-[46px] text-center font-black tracking-widest px-3 py-2.5 text-base bg-white border border-[#DDC1AB] rounded-xl text-[#01374C]"
                      required
                    />
                  </div>
                </div>

                {/* Botón de registro con color azul corporativo #01374C */}
                <button
                  type="submit"
                  className="w-full min-h-[48px] py-3 bg-[#01374C] hover:bg-[#002636] text-white text-sm sm:text-base font-black rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-1"
                >
                  <span>Registrarse e Ingresar</span>
                  <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
                </button>
              </form>
            )}

            {/* TAB 3: RECORDATORIO RÁPIDO DE USUARIO */}
            {!currentUser && activeTab === "quickReminder" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#01374C]">
                    Recordatorio Rápido de Cuenta
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-[11px] text-[#00897B] font-bold underline cursor-pointer"
                  >
                    Volver al Login
                  </button>
                </div>

                {reminderError && (
                  <div className="p-2 rounded-lg bg-red-50 text-red-700 text-xs text-center">
                    {reminderError}
                  </div>
                )}

                <form onSubmit={handleReminderSearch} className="space-y-2">
                  <input
                    type="text"
                    value={reminderQuery}
                    onChange={(e) => setReminderQuery(e.target.value)}
                    placeholder="Correo registrado o teléfono"
                    className="w-full px-3 py-2 text-xs border border-[#DDC1AB] rounded-xl"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#01374C] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Consultar mi Cuenta
                  </button>
                </form>

                {foundAccount && (
                  <div className="p-3 bg-[#EBFBFA] border border-[#00D9B4]/50 rounded-2xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-black text-[#00897B] block">
                      ¡Cuenta Encontrada!
                    </span>
                    <div className="text-sm font-black text-[#01374C]">
                      @{foundAccount.username}
                    </div>
                    <div className="text-xs text-[#52646E]">{foundAccount.name}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginIdentifier(foundAccount.email || foundAccount.username);
                        setActiveTab("login");
                      }}
                      className="mt-2 w-full py-1.5 bg-[#01374C] hover:bg-[#002636] text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Usar este correo en el login</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: RESTABLECER CONTRASEÑA (CON PIN EXCLUSIVAMENTE) */}
            {!currentUser && activeTab === "resetPassword" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#01374C]">
                    Restablecer Contraseña con PIN
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-[11px] text-[#00897B] font-bold underline cursor-pointer"
                  >
                    Volver al Login
                  </button>
                </div>

                {resetError && (
                  <div className="p-2 rounded-lg bg-red-50 text-red-700 text-xs text-center">
                    {resetError}
                  </div>
                )}

                {resetSuccess ? (
                  <div className="p-3 bg-green-50 text-green-800 rounded-xl text-xs font-bold text-center">
                    {resetSuccess}
                  </div>
                ) : !targetAccount ? (
                  <form onSubmit={handleStartReset} className="space-y-2">
                    <p className="text-xs text-[#52646E]">
                      Ingresa tu correo o usuario para validar tu PIN de respaldo:
                    </p>
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="Correo o usuario"
                      className="w-full px-3 py-2 text-xs border border-[#DDC1AB] rounded-xl"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#01374C] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Continuar
                    </button>
                  </form>
                ) : !isVerified ? (
                  <form onSubmit={handleVerifyReset} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#01374C] mb-1">
                        Ingresa tu PIN de Respaldo (4 dígitos):
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={resetPinInput}
                        onChange={(e) =>
                          setResetPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        placeholder="••••"
                        className="w-full text-center tracking-widest px-3 py-2 text-sm font-black border border-[#DDC1AB] rounded-xl"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#01374C] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Verificar PIN
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSaveNewPassword} className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#01374C] mb-1">
                        Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs border border-[#DDC1AB] rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#01374C] mb-1">
                        Confirmar Contraseña
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs border border-[#DDC1AB] rounded-xl"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#01374C] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Actualizar Contraseña</span>
                      <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 5: PROFILE VIEW (WHEN LOGGED IN) */}
            {currentUser && (
              <div className="space-y-4">
                <div className="p-4 bg-linear-to-br from-[#01374C] to-[#002636] rounded-2xl text-white shadow-md relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl border border-white/20">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <h3 className="text-base font-black truncate">{currentUser.name}</h3>
                      <p className="text-xs text-[#00D9B4] truncate">
                        {currentUser.username ? `@${currentUser.username}` : currentUser.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#DDC1AB]/60">
                    <span className="text-lg font-black text-[#01374C] block">{totalCatas}</span>
                    <span className="text-[11px] text-[#52646E]">Catas Registradas</span>
                  </div>
                  <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#DDC1AB]/60">
                    <span className="text-lg font-black text-[#01374C] block">{methodsUsed}</span>
                    <span className="text-[11px] text-[#52646E]">Métodos Explorados</span>
                  </div>
                </div>

                {/* Opción de instalación de App PWA en móvil */}
                {onOpenInstall && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenInstall();
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#EBFBFA] border border-[#00D9B4]/60 text-[#00897B] hover:bg-[#d6f7f4] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Smartphone className="w-4 h-4 text-[#00897B]" />
                    <span>Instalar App en el Celular (PWA)</span>
                  </button>
                )}

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Google Account Chooser Modal */}
      <GoogleAccountChooserModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        mode={googleMode}
        onSelectAccount={(user) => {
          onLogin(user);
          onClose();
        }}
      />
    </>
  );
};
