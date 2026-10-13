/**
 * ============================================================================
 * GUÍA DE INSTALACIÓN PWA (INSTALL PWA MODAL & PROMPT CENTRAL)
 * ============================================================================
 * Ventana emergente y guía visual interactiva para instalar la Bitácora en:
 * - Dispositivos iOS (Safari: Menú compartir -> Agregar a pantalla de inicio).
 * - Dispositivos Android (Prompt nativo de Chrome / Menú 3 puntos).
 * - Compartir ficha oficial por Web Share API o WhatsApp.
 */

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Download,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess?: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  // Detección automática de plataforma
  const [platform, setPlatform] = useState<"ios" | "android">(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        return "ios";
      }
    }
    return "android";
  });

  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejo de instalación nativa en Android/Chrome
  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          if (onInstallSuccess) onInstallSuccess();
          onClose();
        }
      } catch (e) {
        console.warn("Fallo al ejecutar prompt nativo de PWA:", e);
      }
    }
  };

  // Compartir mediante Web Share API nativa o fallback a WhatsApp
  const handleShareApp = async () => {
    const shareUrl = window.location.origin || "https://varietale.com";
    const shareTitle = "Bitácora Varietale";
    const shareText = `¡Te comparto la *Bitácora de Catación Varietale*! ☕✨\n\nAprende a catar café de especialidad con métodos de filtrado y rueda sensorial SCA:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback universal a WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCopyLink = () => {
    const shareUrl = window.location.origin || "https://varietale.com";
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#DDC1AB] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Encabezado con Icono de App */}
        <div className="bg-[#01374C] p-4 sm:p-5 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar guía"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-[#002636] p-1.5 shadow-md shrink-0 flex items-center justify-center border border-white/20">
              <img
                src="/icon-192.png"
                alt="Bitácora Varietale"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold leading-tight text-white">
                Cómo agregar a tu pantalla de inicio
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                Sigue estos 3 sencillos pasos:
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Plataforma: iOS vs Android */}
        <div className="p-2.5 bg-[#FAF6F2] border-b border-[#E8EDF1] flex gap-2">
          <button
            onClick={() => setPlatform("ios")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === "ios"
                ? "bg-[#01374C] text-white shadow-xs"
                : "bg-white text-[#4A5D68] hover:text-[#01374C] border border-[#E8EDF1]"
            }`}
          >
            <span>🍏 iPhone / iPad (iOS)</span>
          </button>
          <button
            onClick={() => setPlatform("android")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === "android"
                ? "bg-[#01374C] text-white shadow-xs"
                : "bg-white text-[#4A5D68] hover:text-[#01374C] border border-[#E8EDF1]"
            }`}
          >
            <span>🤖 Android / Chrome</span>
          </button>
        </div>

        {/* Contenido Desplazable con los Pasos Visuales */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm text-[#3B2212] flex-1">
          {isStandalone ? (
            <div className="p-3.5 bg-[#EBFBFA] border border-[#00D9B4]/60 rounded-2xl text-center space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-[#00897B] mx-auto" />
              <strong className="block text-sm font-black text-[#01374C]">
                ¡Ya estás usando la App instalada!
              </strong>
              <p className="text-xs text-[#52646E]">
                Tienes acceso directo a pantalla completa sin barras de navegador.
              </p>
            </div>
          ) : platform === "ios" ? (
            /* GUÍA PARA IOS (SAFARI) */
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60 text-xs text-[#01374C]">
                Abre este enlace en el navegador <strong>Safari</strong> para poder agregarla a tu pantalla de inicio:
              </div>

              {/* Paso 1 */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold text-xs sm:text-sm">
                    Toca Compartir
                  </strong>
                  <span className="text-[#52646E] block mt-0.5 leading-relaxed text-xs">
                    En la barra inferior de Safari, presiona el botón <strong>Compartir</strong>{" "}
                    <span className="inline-flex items-center align-middle px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-blue-600 font-bold text-[11px]">
                      <Share className="w-3 h-3 inline mr-1" /> Compartir
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold text-xs sm:text-sm">
                    Elige "Agregar a inicio"
                  </strong>
                  <span className="text-[#52646E] block mt-0.5 leading-relaxed text-xs">
                    Desliza las opciones y selecciona{" "}
                    <span className="inline-flex items-center align-middle px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-bold text-[11px]">
                      <PlusSquare className="w-3 h-3 inline mr-1 text-[#01374C]" /> Agregar a pantalla de inicio
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold text-xs sm:text-sm">
                    Confirma tocando "Agregar"
                  </strong>
                  <span className="text-[#52646E] block mt-0.5 leading-relaxed text-xs">
                    Toca <strong>Agregar</strong> arriba a la derecha. El ícono oficial aparecerá junto a tus otras apps.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* GUÍA PARA ANDROID */
            <div className="space-y-3">
              {deferredPrompt ? (
                <div className="text-center space-y-2 py-1">
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00897B] hover:bg-[#007064] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Aplicación Ahora</span>
                  </button>
                  <p className="text-[11px] text-[#889DA7]">
                    O si prefieres, sigue los pasos manuales de Chrome:
                  </p>
                </div>
              ) : null}

              {/* Paso 1 Android */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold text-xs sm:text-sm">
                    Abre el menú
                  </strong>
                  <span className="text-[#52646E] block mt-0.5 leading-relaxed text-xs">
                    Toca los tres puntos (<strong>⋮</strong>) en la esquina superior de Chrome.
                  </span>
                </div>
              </div>

              {/* Paso 2 Android */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold text-xs sm:text-sm">
                    Instalar aplicación
                  </strong>
                  <span className="text-[#52646E] block mt-0.5 leading-relaxed text-xs">
                    Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                  </span>
                </div>
              </div>

              {/* Paso 3 Android */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold text-xs sm:text-sm">
                    Confirmar
                  </strong>
                  <span className="text-[#52646E] block mt-0.5 leading-relaxed text-xs">
                    Presiona <strong>Instalar</strong> para integrarla en tu teléfono como app nativa.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Compartir Aplicación */}
          <div className="pt-3 border-t border-[#E8EDF1] space-y-2">
            <span className="text-[11px] font-bold text-[#889DA7] uppercase block text-center">
              ¿Quieres compartir la Bitácora?
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleShareApp}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Compartir aplicación</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] border border-[#DDC1AB] text-[#01374C] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#00897B]" />
                    <span className="text-[11px] text-[#00897B] font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#01374C]" />
                    <span className="text-[11px]">Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pie con botón de cierre */}
        <div className="p-3 bg-[#FAF6F2] border-t border-[#E8EDF1] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-[#01374C] text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-[#002636] transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Verifica si la aplicación ya está instalada y ejecutándose en modo standalone PWA.
 */
export const checkIsAppInstalled = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    (document.referrer && document.referrer.startsWith("android-app://"))
  );
};

interface InstallPwaPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
}

/**
 * ============================================================================
 * POPUP INICIAL DE INVITACIÓN (CENTRADO EN PANTALLA TRAS SIGN-IN)
 * ============================================================================
 * Aparece centrado en pantalla tras iniciar sesión si no está instalada,
 * sin tapar el encabezado superior (logo, usuario, botón a la bitácora).
 */
export const InstallPwaPromptModal: React.FC<InstallPwaPromptModalProps> = ({
  isOpen,
  onClose,
  onOpenGuide,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-[#DDC1AB] overflow-hidden flex flex-col p-6 text-center relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo oficial de la PWA */}
        <div className="w-16 h-16 rounded-2xl bg-[#01374C] p-2 mx-auto shadow-md flex items-center justify-center mb-3 border border-[#DDC1AB]/50">
          <img
            src="/icon-192.png"
            alt="Bitácora Varietale"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        {/* Etiqueta superior */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D9B4]/15 text-[#00897B] text-[10px] font-black uppercase tracking-wider mx-auto mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#00897B]" />
          <span>Experiencia Móvil Recomendada</span>
        </div>

        {/* Título */}
        <h3 className="text-base sm:text-lg font-black text-[#01374C] leading-snug mb-2">
          ¿Quieres instalar la Bitácora en tu celular?
        </h3>

        {/* Descripción exacta solicitada */}
        <p className="text-xs sm:text-sm text-[#52646E] leading-relaxed mb-5 px-1">
          Te permitirá usar Tu Bitácora VARIETALE con carga instantánea y tus cataciones siempre a la mano.
        </p>

        {/* Botón Principal exacto solicitado */}
        <button
          onClick={() => {
            onClose();
            onOpenGuide();
          }}
          className="w-full py-3 px-4 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer mb-2.5"
        >
          <Download className="w-4 h-4 text-[#00D9B4]" />
          <span>Ver cómo instalarla ahora - 100% Seguro</span>
        </button>

        {/* Botón secundario */}
        <button
          onClick={onClose}
          className="w-full py-1.5 text-xs font-semibold text-[#889DA7] hover:text-[#01374C] transition-colors cursor-pointer"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
};

// Alias para compatibilidad de importaciones
export const InstallPwaBanner = InstallPwaPromptModal;
