/**
 * ============================================================================
 * PANTALLA DE AUTENTICACIÓN (AUTH SCREEN) - INGRESO Y REGISTRO
 * ============================================================================
 * Pantalla de acceso inicial obligatorio:
 * - Inicio de sesión con usuario/correo y contraseña.
 * - Registro de nuevo catador con PIN numérico de 4 dígitos.
 * - Acceso directo e integración con selector de cuentas de Google.
 * - Recuperación inmediata de contraseña mediante PIN o verificación.
 * - Opciones de acceso como invitado y visita guiada.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronRight,
  X,
  Check,
  CheckCircle2,
  KeyRound,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Mail,
  RotateCcw,
  FlaskConical,
} from "lucide-react";
import { UserProfile } from "../types";
import { VarietaleLogoHorizontal } from "./VarietaleLogo";
import { BrandFooter } from "./BrandFooter";
import { GoogleAccountChooserModal } from "./GoogleAccountChooserModal";
import {
  findAccountByIdentifier,
  saveAccount,
  verifyPin,
  resetPassword,
  accountToUserProfile,
  getLastRememberedIdentifier,
  setLastRememberedIdentifier,
  getStoredAccounts,
  StoredAccount,
  loginAsTestUser,
} from "../data/accountStore";

interface AuthScreenProps {
  /** Callback al completar exitosamente el inicio de sesión o registro */
  onLoginSuccess: (user: UserProfile) => void;
  /** Permite continuar temporalmente en modo invitado */
  onContinueAsGuest: () => void;
  /** Inicia una visita guiada interactiva */
  onStartTour?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
  onStartTour,
}) => {
  const [authMode, setAuthMode] = useState<"login" | "register">(() => {
    const remembered = getLastRememberedIdentifier();
    const accounts = getStoredAccounts();
    return remembered || accounts.length > 0 ? "login" : "register";
  });

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Quick remembered user
  const [rememberedUser, setRememberedUser] = useState<StoredAccount | null>(null);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPin, setRegPin] = useState("1234");
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [regError, setRegError] = useState<string | null>(null);

  // Modals state
  const [showForgotUserModal, setShowForgotUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalMode, setGoogleModalMode] = useState<"login" | "register">("login");

  // Forgot Username State
  const [forgotUserEmail, setForgotUserEmail] = useState("");
  const [foundUsername, setFoundUsername] = useState<StoredAccount | null>(null);
  const [forgotUserError, setForgotUserError] = useState<string | null>(null);

  // Reset Password State (Uses PIN ONLY - no email OTP or security questions)
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetPinInput, setResetPinInput] = useState("");
  const [targetAccount, setTargetAccount] = useState<StoredAccount | null>(null);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Asegurar que la pantalla de autenticación siempre cargue en la parte superior
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [authMode]);

  // Load last remembered identifier on mount
  useEffect(() => {
    const lastId = getLastRememberedIdentifier();
    if (lastId) {
      const acc = findAccountByIdentifier(lastId);
      if (acc) {
        setRememberedUser(acc);
        setLoginIdentifier(acc.email || acc.username);
      }
    }
  }, []);

  // Acceso directo a usuario de prueba para testing
  const handleTestUserLogin = () => {
    const testUser = loginAsTestUser();
    onLoginSuccess(testUser);
  };

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setLoginError("Ingresa tu correo electrónico registrado.");
      return;
    }
    if (!loginPassword.trim() || loginPassword.length < 4) {
      setLoginError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    // Verify account in accountStore
    const account = findAccountByIdentifier(identifier);
    if (!account) {
      setLoginError("No se encontró una cuenta con ese correo. Regístrate o accede con Google.");
      return;
    }

    if (account.password && account.password !== loginPassword.trim()) {
      setLoginError("Contraseña incorrecta. Puedes restablecerla con tu PIN de respaldo.");
      return;
    }

    if (rememberMe) {
      setLastRememberedIdentifier(account.email || account.username);
    } else {
      setLastRememberedIdentifier(null);
    }

    onLoginSuccess(accountToUserProfile(account));
  };

  // Handle Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim()) {
      setRegError("Ingresa tu nombre y apellido.");
      return;
    }
    if (!regUsername.trim()) {
      setRegError("Ingresa un nombre de usuario.");
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setRegError("Tu contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!regPin.trim() || regPin.trim().length !== 4 || !/^\d{4}$/.test(regPin.trim())) {
      setRegError("El PIN de respaldo debe ser de exactamente 4 dígitos numéricos.");
      return;
    }
    if (!acceptTerms) {
      setRegError("Debes aceptar los Términos y Condiciones para crear tu cuenta.");
      return;
    }

    const cleanUserSlug = regUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const emailToUse = regEmail.trim()
      ? regEmail.trim().toLowerCase()
      : `${cleanUserSlug || "catador"}@varietale.com`;

    // Check if user already exists
    const existing = findAccountByIdentifier(cleanUserSlug);
    if (existing) {
      setRegError(`El usuario @${cleanUserSlug} ya está registrado. Intenta iniciar sesión.`);
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
    setLastRememberedIdentifier(newAccount.email || newAccount.username);
    onLoginSuccess(accountToUserProfile(newAccount));
  };

  // Search Username Handler
  const handleSearchUsername = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotUserError(null);
    setFoundUsername(null);

    const query = forgotUserEmail.trim();
    if (!query) {
      setForgotUserError("Ingresa tu correo o número de teléfono registrado.");
      return;
    }

    const match = findAccountByIdentifier(query);
    if (match) {
      setFoundUsername(match);
    } else {
      setForgotUserError("No encontramos una cuenta con ese dato. Revisa el correo o regístrate.");
    }
  };

  // Step 1: Search account for password reset
  const handleStartPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const id = resetIdentifier.trim();
    if (!id) {
      setResetError("Ingresa tu correo electrónico registrado.");
      return;
    }

    const acc = findAccountByIdentifier(id);
    if (!acc) {
      setResetError("No se encontró ninguna cuenta asociada a este correo o usuario.");
      return;
    }

    setTargetAccount(acc);
    setIsIdentityVerified(false);
  };

  // Step 2: Verify Backup PIN (NO security questions needed)
  const handleVerifyBackupSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!targetAccount) return;

    if (!resetPinInput.trim() || resetPinInput.trim().length !== 4) {
      setResetError("Ingresa tu PIN de 4 dígitos.");
      return;
    }
    if (verifyPin(targetAccount.username, resetPinInput.trim())) {
      setIsIdentityVerified(true);
      setResetError(null);
    } else {
      setResetError("PIN incorrecto. Revisa los 4 dígitos que definiste en tu registro.");
    }
  };

  // Step 3: Complete Password Reset
  const handleCompletePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!targetAccount) return;

    if (!newPassword.trim() || newPassword.length < 6) {
      setResetError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Las contraseñas no coinciden.");
      return;
    }

    const success = resetPassword(targetAccount.username, newPassword.trim());
    if (success) {
      setResetSuccessMessage("¡Contraseña restablecida con éxito! Ingresando a tu Bitácora...");
      setTimeout(() => {
        const updatedAcc = findAccountByIdentifier(targetAccount.username) || targetAccount;
        setShowResetPasswordModal(false);
        onLoginSuccess(accountToUserProfile(updatedAcc));
      }, 1200);
    } else {
      setResetError("Hubo un error al actualizar la contraseña. Intenta nuevamente.");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#FAF6F2] via-white to-[#F2ECE4] flex flex-col justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-8 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto safe-pb selection:bg-[#00D9B4]/30 selection:text-[#01374C]">
      {/* Top Brand Bar */}
      <header className="flex items-center justify-end pb-3 border-b border-[#E8EDF1]">
        <VarietaleLogoHorizontal primaryColor="#01374C" showTagline={false} />
      </header>

      {/* Main Container Card */}
      <main className="my-auto py-3 sm:py-5">
        {/* Hero Title & Description */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-[#01374C] tracking-tight leading-snug">
            {authMode === "login" ? "Bienvenid@ a tu Bitácora de catación." : "Crea una cuenta en Tu Bitácora"}
          </h1>
          <p className="text-sm sm:text-base text-[#4A5D68] mt-2.5 max-w-lg mx-auto leading-relaxed font-normal">
            {authMode === "login"
              ? "Aprende de forma divertida a catar tus cafés con diferentes métodos de filtrado, define tus preferidos y lleva el registro exacto de tus catas."
              : "Aprende a catar, disfrutar, comparar y guardar tus cafés y métodos de preparación favoritos con Tu Bitácora de Varietale."}
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-[#01374C]/5 border border-[#E8EDF1]">
          {/* Tabs selector */}
          <div className="flex bg-[#F5F8FA] p-1.5 rounded-2xl mb-4 border border-[#E8EDF1]">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setLoginError(null);
              }}
              className={`flex-1 min-h-[48px] py-2.5 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer flex items-center justify-center ${
                authMode === "login"
                  ? "bg-white text-[#01374C] shadow-xs"
                  : "text-[#889DA7] hover:text-[#01374C]"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setRegError(null);
              }}
              className={`flex-1 min-h-[48px] py-2.5 rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer flex items-center justify-center ${
                authMode === "register"
                  ? "bg-white text-[#01374C] shadow-xs"
                  : "text-[#889DA7] hover:text-[#01374C]"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Google Sign In / Register Button */}
          <div className="mb-4">
            <button
              id="google-login-btn"
              type="button"
              onClick={() => {
                setGoogleModalMode(authMode);
                setShowGoogleModal(true);
              }}
              className="w-full min-h-[50px] py-3.5 px-4 rounded-2xl border border-[#DDC1AB] bg-white hover:bg-[#FAF6F2] active:scale-[0.99] text-[#01374C] font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer group"
            >
              {/* Official Google G Logo SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                {authMode === "register" ? "Registrarse con Google" : "Iniciar sesión con Google"}
              </span>
              <span className="text-[10px] uppercase font-black bg-[#EBFBFA] text-[#00897B] px-2 py-0.5 rounded-full border border-[#00D9B4]/30 ml-auto hidden sm:inline-block">
                Elegir cuenta
              </span>
            </button>

            {/* Separator */}
            <div className="relative flex py-3 items-center">
              <div className="grow border-t border-[#E8EDF1]"></div>
              <span className="shrink mx-3 text-xs font-semibold text-[#889DA7] uppercase tracking-wider">
                O con tu correo
              </span>
              <div className="grow border-t border-[#E8EDF1]"></div>
            </div>
          </div>

          {/* 1. Login Mode Form */}
          {authMode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {loginError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Quick Reminder Pill if account is remembered */}
              {rememberedUser && (
                <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-5 h-5 rounded-full bg-[#01374C] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {rememberedUser.name.charAt(0)}
                    </div>
                    <span className="text-[#01374C] font-semibold truncate">
                      ¿Eres {rememberedUser.name} (@{rememberedUser.username})?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginIdentifier(rememberedUser.email || rememberedUser.username);
                      if (rememberedUser.password) {
                        setLoginPassword(rememberedUser.password);
                      }
                    }}
                    className="text-[11px] font-bold text-[#00897B] hover:text-[#01374C] shrink-0 underline ml-2 cursor-pointer"
                  >
                    Rellenar
                  </button>
                </div>
              )}

              {/* Email Input + Quick Reminder Link */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C]">
                    Correo Electrónico
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotUserModal(true);
                      setForgotUserError(null);
                      setFoundUsername(null);
                    }}
                    className="text-xs font-bold text-[#00897B] hover:underline cursor-pointer py-1 px-1"
                  >
                    ¿Olvidaste tu cuenta?
                  </button>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
                  <input
                    id="login-username-input"
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3 py-3 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                  />
                </div>
              </div>

              {/* Password Input + Reset Password Link */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C]">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(loginIdentifier.trim());
                      setTargetAccount(findAccountByIdentifier(loginIdentifier.trim()));
                      setIsIdentityVerified(false);
                      setResetPinInput("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setResetError(null);
                      setResetSuccessMessage(null);
                      setShowResetPasswordModal(true);
                    }}
                    className="text-xs font-bold text-[#00897B] hover:underline cursor-pointer flex items-center gap-1 py-1 px-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>¿Olvidaste tu clave?</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
                  <input
                    id="login-password-input"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center text-[#889DA7] hover:text-[#01374C] cursor-pointer"
                    aria-label={showLoginPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none group min-h-[44px] py-1">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150 ${
                        rememberMe
                          ? "bg-[#01374C] border-[#01374C] text-[#00D9B4] shadow-xs"
                          : "bg-[#FAF6F2] border-[#DDC1AB] group-hover:border-[#01374C]/60"
                      }`}
                    >
                      {rememberMe && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-[#6A7B85] group-hover:text-[#01374C] transition-colors">
                    Recordarme en este dispositivo
                  </span>
                </label>
              </div>

              {/* Submit CTA */}
              <button
                id="submit-login-main-btn"
                type="submit"
                className="w-full min-h-[50px] py-3.5 rounded-2xl bg-[#01374C] hover:bg-[#002636] active:scale-[0.98] text-white font-black text-sm sm:text-base transition-all shadow-md shadow-[#01374C]/25 flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <span>Entrar en Mi Bitácora</span>
                <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
              </button>

              {/* Switch to Register */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setRegError(null);
                  }}
                  className="min-h-[44px] inline-flex items-center justify-center text-xs sm:text-sm text-[#6A7B85] hover:text-[#01374C] transition-colors cursor-pointer py-1 px-3"
                >
                  <span>
                    ¿No tienes una cuenta aún?{" "}
                    <span className="font-bold text-[#01374C] underline decoration-[#00D9B4] underline-offset-2">
                      Crear Cuenta
                    </span>
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* 2. Register Mode Form with PIN ONLY */}
          {authMode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {regError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                  Nombre y Apellido *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
                  <input
                    id="register-name-input"
                    type="text"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (!regUsername) {
                        setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, "."));
                      }
                    }}
                    placeholder="Nombre y Apellido"
                    autoComplete="name"
                    required
                    className="w-full pl-10 pr-3 py-3 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
                  <input
                    id="register-username-input"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="ej: carlos.catador"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-3 py-3 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                  Correo Electrónico (Opcional para login)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
                  <input
                    id="register-email-input"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3 py-3 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                  Contraseña * (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3.5" />
                  <input
                    id="register-password-input"
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-11 py-3 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center text-[#889DA7] hover:text-[#01374C] cursor-pointer"
                    aria-label={showRegPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Backup Security Section (PIN ONLY - No questions) */}
              <div className="p-3.5 bg-[#FAF6F2] rounded-2xl border border-[#DDC1AB] space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00897B]" />
                  <span className="text-xs sm:text-sm font-black text-[#01374C]">
                    PIN de Respaldo (Sin correos ni códigos)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#52646E] leading-relaxed">
                  Define un PIN de 4 dígitos para recuperar o restablecer tu contraseña al instante si la olvidas.
                </p>

                {/* 4-Digit PIN */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1">
                    PIN de Respaldo (4 dígitos) *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="w-full min-h-[46px] text-center tracking-widest text-lg font-black px-3 py-2.5 bg-white border border-[#DDC1AB] rounded-xl text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                    required
                  />
                </div>
              </div>

              {/* Accept Terms */}
              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none group min-h-[44px] py-1">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150 ${
                        acceptTerms
                          ? "bg-[#01374C] border-[#01374C] text-[#00D9B4] shadow-xs"
                          : "bg-[#FAF6F2] border-[#DDC1AB] group-hover:border-[#01374C]/60"
                      }`}
                    >
                      {acceptTerms && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-[#6A7B85] leading-snug">
                    Acepto los términos y el registro seguro de mis catas en Varietale.
                  </span>
                </label>
              </div>

              {/* Submit Register CTA - Color ajustado al azul corporativo #01374C */}
              <button
                id="submit-register-btn"
                type="submit"
                className="w-full min-h-[50px] py-3.5 rounded-2xl bg-[#01374C] hover:bg-[#002636] active:scale-[0.98] text-white font-black text-sm sm:text-base transition-all shadow-md shadow-[#01374C]/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Crear Cuenta y Comenzar</span>
                <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
              </button>

              {/* Switch to Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setLoginError(null);
                  }}
                  className="min-h-[44px] inline-flex items-center justify-center text-xs sm:text-sm text-[#6A7B85] hover:text-[#01374C] transition-colors cursor-pointer py-1 px-3"
                >
                  <span>
                    ¿Ya tienes cuenta?{" "}
                    <span className="font-bold text-[#01374C] underline decoration-[#00D9B4] underline-offset-2">
                      Iniciar Sesión
                    </span>
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Guided Tour & Discreet Test User Icon */}
        <div className="text-center mt-4 flex flex-col items-center justify-center gap-1.5">
          <button
            id="continue-as-guest-btn"
            type="button"
            onClick={onStartTour || onContinueAsGuest}
            className="min-h-[44px] text-xs sm:text-sm font-bold text-[#01374C] hover:text-[#002636] underline underline-offset-4 py-2 px-3.5 rounded-lg hover:bg-black/5 transition-all inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Hacer visita guiada</span>
            <ChevronRight className="w-4 h-4 text-[#00D9B4]" />
          </button>

          {/* Acceso discreto a usuario de prueba (ubicado debajo, solo ícono con baja opacidad) */}
          <button
            id="test-user-footer-btn"
            type="button"
            onClick={handleTestUserLogin}
            title="Perfil de pruebas"
            aria-label="Acceso a perfil de pruebas"
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-25 hover:opacity-100 text-[#00897B] hover:bg-black/5 transition-all cursor-pointer"
          >
            <FlaskConical className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="pt-2 text-center">
        <BrandFooter className="p-0" />
      </footer>

      {/* MODAL 1: GOOGLE ACCOUNT CHOOSER (LOGIN & REGISTRATION) */}
      <GoogleAccountChooserModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        mode={googleModalMode}
        onSelectAccount={(user) => {
          setLastRememberedIdentifier(user.username || user.email || null);
          onLoginSuccess(user);
        }}
      />

      {/* MODAL 2: FORGOT USERNAME (RECORDATORIO RÁPIDO) */}
      <AnimatePresence>
        {showForgotUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-[#E8EDF1]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF1]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00897B]" />
                  <h3 className="text-sm sm:text-base font-black text-[#01374C]">
                    Recordatorio Rápido de Cuenta
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotUserModal(false)}
                  className="p-1 rounded-full text-[#889DA7] hover:text-[#01374C] hover:bg-black/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <p className="text-xs sm:text-sm text-[#52646E] leading-relaxed">
                  Ingresa tu correo o teléfono registrado para recordarte de inmediato tu nombre de usuario:
                </p>

                {forgotUserError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
                    {forgotUserError}
                  </div>
                )}

                {!foundUsername ? (
                  <form onSubmit={handleSearchUsername} className="space-y-3">
                    <input
                      type="text"
                      value={forgotUserEmail}
                      onChange={(e) => setForgotUserEmail(e.target.value)}
                      placeholder="Correo o teléfono (+57)"
                      className="w-full px-3 py-2.5 min-h-[46px] bg-[#FAF6F2]/50 text-sm border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="w-full min-h-[46px] py-2.5 rounded-xl bg-[#01374C] text-white text-xs sm:text-sm font-black hover:bg-[#002636] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#00D9B4]" />
                      <span>Buscar mi Cuenta</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-3.5 bg-[#EBFBFA] rounded-2xl border border-[#00D9B4]/40 text-center space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#00897B] tracking-wider block">
                      ¡Cuenta Localizada!
                    </span>
                    <div className="text-base font-black text-[#01374C]">
                      @{foundUsername.username}
                    </div>
                    <div className="text-xs sm:text-sm text-[#52646E]">
                      Nombre: <strong>{foundUsername.name}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginIdentifier(foundUsername.email || foundUsername.username);
                        setShowForgotUserModal(false);
                      }}
                      className="w-full min-h-[46px] mt-2 py-2 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5 text-[#00D9B4]" />
                      <span>Usar este correo en el login</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: RESTABLECER CONTRASEÑA (CON PIN EXCLUSIVAMENTE - SIN PREGUNTAS NI CORREO OTP) */}
      <AnimatePresence>
        {showResetPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-[#E8EDF1] max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF1]">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#00897B]" />
                  <h3 className="text-sm font-black text-[#01374C]">
                    Restablecer Contraseña
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="p-1 rounded-full text-[#889DA7] hover:text-[#01374C] hover:bg-black/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3 space-y-3">
                {resetSuccessMessage ? (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-xs font-bold text-center flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span>{resetSuccessMessage}</span>
                  </div>
                ) : (
                  <>
                    {resetError && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center flex items-center justify-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    {/* FASE 1: Buscar cuenta */}
                    {!targetAccount && (
                      <form onSubmit={handleStartPasswordReset} className="space-y-3">
                        <p className="text-xs text-[#52646E]">
                          Ingresa tu correo electrónico registrado para verificar tu identidad con tu PIN:
                        </p>
                        <input
                          type="text"
                          value={resetIdentifier}
                          onChange={(e) => setResetIdentifier(e.target.value)}
                          placeholder="tucorreo@ejemplo.com"
                          className="w-full px-3 py-2.5 bg-[#FAF6F2]/50 text-xs sm:text-sm border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                          autoFocus
                          required
                        />
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-[#01374C] text-white text-xs font-black hover:bg-[#002636] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Continuar</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#00D9B4]" />
                        </button>
                      </form>
                    )}

                    {/* FASE 2: Validar por PIN (SOLO PIN) */}
                    {targetAccount && !isIdentityVerified && (
                      <form onSubmit={handleVerifyBackupSecurity} className="space-y-3">
                        <div className="p-2.5 bg-[#FAF6F2] rounded-xl border border-[#DDC1AB]/60 text-xs">
                          <span className="text-[#52646E] block text-[11px]">Cuenta a restablecer:</span>
                          <span className="font-black text-[#01374C]">
                            {targetAccount.name} (@{targetAccount.username})
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#01374C] mb-1">
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
                            className="w-full text-center tracking-widest text-base font-black px-3 py-2.5 bg-[#FAF6F2]/50 border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                            autoFocus
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-[#01374C] text-white text-xs font-black hover:bg-[#002636] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#00D9B4]" />
                          <span>Verificar PIN</span>
                        </button>
                      </form>
                    )}

                    {/* FASE 3: Definir Nueva Contraseña */}
                    {targetAccount && isIdentityVerified && (
                      <form onSubmit={handleCompletePasswordReset} className="space-y-3">
                        <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <span>Identidad confirmada con tu PIN. Define tu nueva contraseña:</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#01374C] mb-1">
                            Nueva Contraseña * (mínimo 6 caracteres)
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-10 pr-10 py-2.5 bg-[#FAF6F2]/50 text-xs sm:text-sm border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                              required
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-2.5 text-[#889DA7] hover:text-[#01374C] p-0.5"
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#01374C] mb-1">
                            Confirmar Nueva Contraseña *
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-10 pr-10 py-2.5 bg-[#FAF6F2]/50 text-xs sm:text-sm border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 rounded-2xl bg-[#01374C] hover:bg-[#002636] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#01374C]/25"
                        >
                          <RotateCcw className="w-4 h-4 text-[#00D9B4]" />
                          <span>Guardar Contraseña e Ingresar</span>
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
