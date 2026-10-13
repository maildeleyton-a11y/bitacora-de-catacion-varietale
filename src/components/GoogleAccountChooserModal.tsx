/**
 * ============================================================================
 * SELECTOR DE CUENTAS DE GOOGLE (GOOGLE ACCOUNT CHOOSER MODAL)
 * ============================================================================
 * Experiencia de selección y vinculación de cuentas de Google:
 * - Lista de cuentas previamente vinculadas en el dispositivo.
 * - Opción de ingresar o vincular una nueva cuenta de Google (ej: @gmail.com).
 * - Extracción automática del primer nombre para un saludo cálido y personalizado.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, UserPlus, ArrowRight, ShieldCheck, Plus, LogIn } from "lucide-react";
import { UserProfile } from "../types";
import {
  getGoogleAccounts,
  findAccountByIdentifier,
  saveAccount,
  accountToUserProfile,
  extractGoogleFirstName,
  StoredAccount,
} from "../data/accountStore";

interface GoogleAccountChooserModalProps {
  /** Controla si el modal se encuentra abierto */
  isOpen: boolean;
  /** Acción para cerrar el modal */
  onClose: () => void;
  /** Callback al seleccionar o vincular una cuenta */
  onSelectAccount: (user: UserProfile) => void;
  /** Modo de apertura ("login" o "register") */
  mode?: "login" | "register";
}

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  mode = "login",
}) => {
  const [existingAccounts, setExistingAccounts] = useState<StoredAccount[]>([]);
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [customUsername, setCustomUsername] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const googleAccs = getGoogleAccounts();
      setExistingAccounts(googleAccs);
      // If there are no saved Google accounts, open the custom account form by default
      if (googleAccs.length === 0) {
        setShowAddCustom(true);
      } else {
        setShowAddCustom(false);
      }
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectExisting = (acc: StoredAccount) => {
    const profile = accountToUserProfile(acc);
    onSelectAccount(profile);
    onClose();
  };

  const handleCreateOrSelectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = customEmail.trim().toLowerCase();
    if (!email || !email.includes("@") || !email.includes(".")) {
      setError("Ingresa una dirección de correo de Google válida (ej: tucorreo@gmail.com).");
      return;
    }

    // Determine username and display name
    // Only use customUsername if explicitly entered in register mode; otherwise use Google first name!
    const rawUser = mode === "register"
      ? customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
      : "";
    const googleFirstName = extractGoogleFirstName(email);
    const cleanUser = rawUser || googleFirstName.toLowerCase();
    const formattedName = googleFirstName;

    // Check if account already exists
    const existing = findAccountByIdentifier(email);
    if (existing) {
      // Existing account selected
      const updated: StoredAccount = {
        ...existing,
        username: rawUser || existing.username || googleFirstName.toLowerCase(),
        name: existing.name || formattedName,
        authProvider: "google",
      };
      saveAccount(updated);
      onSelectAccount(accountToUserProfile(updated));
      onClose();
      return;
    }

    // New Google account creation
    const newGoogleAccount: StoredAccount = {
      id: `user-google-${cleanUser}-${Date.now().toString(36)}`,
      name: formattedName,
      username: cleanUser,
      email: email,
      securityPin: "0000",
      securityQuestion: "¿Cuál es tu método de filtrado o preparación preferido?",
      securityAnswer: "v60",
      avatarColor: "#EA4335",
      authProvider: "google",
      createdAt: new Date().toLocaleDateString("es-CO", {
        month: "long",
        year: "numeric",
      }),
    };

    saveAccount(newGoogleAccount);
    onSelectAccount(accountToUserProfile(newGoogleAccount));
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl p-5 sm:p-6 max-w-md sm:max-w-lg w-full shadow-2xl border border-[#E8EDF1] max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#E8EDF1]">
            <div className="flex items-center gap-3">
              {/* Official Google G SVG */}
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8EDF1] shadow-xs flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#01374C]">
                  {mode === "register" ? "Registrarse con Google" : "Iniciar sesión con Google"}
                </h3>
                <p className="text-xs sm:text-sm text-[#52646E]">
                  para continuar en Tu Bitácora Varietale
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#889DA7] hover:text-[#01374C] hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4 space-y-4">
            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold text-center">
                {error}
              </div>
            )}

            {/* List of existing Google accounts if any */}
            {existingAccounts.length > 0 && !showAddCustom && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#889DA7] uppercase tracking-wider block">
                  Cuentas guardadas en este dispositivo:
                </span>
                <div className="space-y-2">
                  {existingAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectExisting(acc)}
                      className="p-3 sm:p-3.5 rounded-2xl border border-[#DDC1AB] hover:border-[#00897B] bg-white hover:bg-[#FAF6F2] flex items-center justify-between cursor-pointer transition-all shadow-xs group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-9 h-9 rounded-full bg-[#EA4335] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate text-left">
                          <div className="text-xs sm:text-sm font-black text-[#01374C] group-hover:text-[#00897B] transition-colors truncate">
                            {acc.name}
                          </div>
                          <div className="text-xs text-[#52646E] truncate">
                            {acc.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#00897B] opacity-0 group-hover:opacity-100 transition-opacity">
                        Elegir →
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCustom(true)}
                  className="w-full min-h-[46px] py-2.5 px-3 rounded-xl border border-dashed border-[#889DA7]/60 hover:border-[#01374C] text-[#01374C] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-black/5 transition-colors cursor-pointer mt-3"
                >
                  <Plus className="w-4 h-4 text-[#00897B]" />
                  <span>Usar otra cuenta de Google</span>
                </button>
              </div>
            )}

            {/* Add / Choose any Google account form */}
            {showAddCustom && (
              <form onSubmit={handleCreateOrSelectCustom} className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] space-y-1">
                  <div className="text-xs sm:text-sm font-black text-[#01374C] flex items-center gap-1.5">
                    {mode === "register" ? (
                      <UserPlus className="w-4 h-4 text-[#00897B]" />
                    ) : (
                      <LogIn className="w-4 h-4 text-[#00897B]" />
                    )}
                    <span>
                      {mode === "register"
                        ? "Ingresa tu cuenta de Google para registrarte:"
                        : "Ingresa tu correo de Google para iniciar sesión:"}
                    </span>
                  </div>
                  <p className="text-xs text-[#52646E]">
                    Puedes usar tu cuenta personal de Gmail o de Google Workspace.
                  </p>
                </div>

                {/* Nombre de usuario opcional: SOLO EN EL REGISTRO */}
                {mode === "register" && (
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                      Nombre de usuario que quieres asignar (Opcional)
                    </label>
                    <input
                      type="text"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value)}
                      placeholder="ej: mi_usuario (opcional)"
                      className="w-full px-3.5 py-2.5 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                    />
                  </div>
                )}

                {/* Correo de Google con placeholder tucorreo@gmail.com */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#01374C] mb-1.5">
                    Correo Electrónico de Google *
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="tucorreo@gmail.com"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 min-h-[46px] bg-[#FAF6F2]/50 text-base border border-[#DDC1AB] rounded-xl text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                  />
                </div>

                {existingAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(false)}
                    className="text-xs sm:text-sm text-[#00897B] font-bold underline cursor-pointer"
                  >
                    ← Volver a mis cuentas guardadas
                  </button>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full min-h-[48px] py-3 rounded-2xl bg-[#01374C] text-white text-sm sm:text-base font-black hover:bg-[#002636] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#01374C]/20 transition-all"
                  >
                    <span>
                      {mode === "register"
                        ? "Registrarse con Google"
                        : "Ingresar con Google"}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
                  </button>
                </div>
              </form>
            )}

            {/* Google privacy disclaimer */}
            <div className="pt-2 border-t border-[#E8EDF1] flex items-center gap-2 text-[10px] text-[#889DA7] leading-tight">
              <ShieldCheck className="w-4 h-4 text-[#00897B] shrink-0" />
              <span>
                Para continuar, Google compartirá tu nombre y correo con Varietale para crear tu perfil y registrar tus catas de forma segura.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
