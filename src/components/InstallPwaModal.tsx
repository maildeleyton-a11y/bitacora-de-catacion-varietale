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

/**
 * Logotipo oficial vectorial de Apple (Silueta de la manzana mordida)
 */
export const AppleLogo: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    viewBox="0 0 170 170"
    fill="currentColor"
    className={className}
    aria-label="Apple"
  >
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.73-7.94-12.14-14.57-6.08-9.16-10.88-20.09-14.41-32.8-3.52-12.7-5.28-24.81-5.28-36.33 0-14.7 3.59-26.68 10.76-35.94 7.18-9.26 16.27-13.99 27.28-14.19 4.8 0 10.22 1.3 16.28 3.89 6.06 2.6 9.87 3.94 11.45 4.04 1.95-.1 5.92-1.49 11.91-4.14 5.99-2.65 11.36-3.9 16.11-3.75 12.08.64 21.64 5.16 28.67 13.56-10.42 6.32-15.51 15.11-15.27 26.36.24 8.78 3.57 16.26 10 22.44 6.43 6.18 14.19 9.68 23.27 10.5-2.07 6.46-4.66 13.06-7.77 19.8M119.22 31.84c0-7.22 2.65-13.9 7.95-20.04 5.3-6.14 11.83-9.97 19.59-11.48.24 1.13.36 2.22.36 3.28 0 7.33-2.73 14.15-8.19 20.46-5.46 6.31-12.04 10.08-19.71 11.31-.24-1.03-.36-2.12-.36-3.28z" />
  </svg>
);

/**
 * Logotipo oficial vectorial de Android (Bugdroid)
 */
export const AndroidLogo: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Android"
  >
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4111 13.8533 8.083 12 8.083c-1.8534 0-3.5902.328-5.1367.8667L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
  </svg>
);

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
            <div className="w-13 h-13 rounded-2xl bg-[#002636] p-1.5 shadow-md shrink-0 flex items-center justify-center border border-white/20">
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
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                Sigue estos 3 sencillos pasos:
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Plataforma: Logotipos oficiales de Apple y Android */}
        <div className="p-2.5 bg-[#FAF6F2] border-b border-[#E8EDF1] flex gap-2">
          <button
            onClick={() => setPlatform("ios")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platform === "ios"
                ? "bg-[#01374C] text-white shadow-xs"
                : "bg-white text-[#4A5D68] hover:text-[#01374C] border border-[#E8EDF1]"
            }`}
          >
            <AppleLogo
              className={`w-4 h-4 shrink-0 ${
                platform === "ios" ? "text-white" : "text-[#01374C]"
              }`}
            />
            <span>iPhone / iPad (iOS)</span>
          </button>
          <button
            onClick={() => setPlatform("android")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platform === "android"
                ? "bg-[#01374C] text-white shadow-xs"
                : "bg-white text-[#4A5D68] hover:text-[#01374C] border border-[#E8EDF1]"
            }`}
          >
            <AndroidLogo
              className={`w-4 h-4 shrink-0 ${
                platform === "android" ? "text-[#00D9B4]" : "text-[#3DDC84]"
              }`}
            />
            <span>Android / Chrome</span>
          </button>
        </div>

        {/* Contenido Desplazable con los Pasos Visuales Cómodos de Leer */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-sm text-[#24333C] flex-1">
          {isStandalone ? (
            <div className="p-4 bg-[#EBFBFA] border border-[#00D9B4]/60 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-9 h-9 text-[#00897B] mx-auto" />
              <strong className="block text-base font-black text-[#01374C]">
                ¡Ya estás usando la App instalada!
              </strong>
              <p className="text-xs sm:text-sm text-[#52646E] leading-relaxed">
                Tienes acceso directo a pantalla completa sin barras de navegador.
              </p>
            </div>
          ) : platform === "ios" ? (
            /* GUÍA PARA IOS (SAFARI) */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB]/70 text-xs sm:text-sm text-[#01374C] leading-relaxed font-medium">
                Abre este enlace en el navegador <strong>Safari</strong> para poder agregarla a tu pantalla de inicio:
              </div>

              {/* Paso 1 */}
              <div className="flex items-start gap-3.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs sm:text-sm shrink-0 mt-0.5 shadow-2xs">
                  1
                </div>
                <div>
                  <strong className="text-sm sm:text-base font-bold text-[#01374C] block">
                    Toca Compartir
                  </strong>
                  <span className="text-xs sm:text-sm text-[#475A65] block mt-1 leading-relaxed">
                    En la barra inferior de Safari, presiona el botón <strong>Compartir</strong>{" "}
                    <span className="inline-flex items-center align-middle px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-blue-600 font-bold text-xs">
                      <Share className="w-3.5 h-3.5 inline mr-1" /> Compartir
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs sm:text-sm shrink-0 mt-0.5 shadow-2xs">
                  2
                </div>
                <div>
                  <strong className="text-sm sm:text-base font-bold text-[#01374C] block">
                    Elige "Agregar a inicio"
                  </strong>
                  <span className="text-xs sm:text-sm text-[#475A65] block mt-1 leading-relaxed">
                    Desliza las opciones y selecciona{" "}
                    <span className="inline-flex items-center align-middle px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-gray-800 font-bold text-xs">
                      <PlusSquare className="w-3.5 h-3.5 inline mr-1 text-[#01374C]" /> Agregar a pantalla de inicio
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs sm:text-sm shrink-0 mt-0.5 shadow-2xs">
                  3
                </div>
                <div>
                  <strong className="text-sm sm:text-base font-bold text-[#01374C] block">
                    Confirma tocando "Agregar"
                  </strong>
                  <span className="text-xs sm:text-sm text-[#475A65] block mt-1 leading-relaxed">
                    Toca <strong>Agregar</strong> arriba a la derecha. El ícono oficial de Varietale aparecerá junto a tus otras aplicaciones.
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
                    className="w-full py-3 px-4 rounded-xl bg-[#00897B] hover:bg-[#007064] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Aplicación Ahora</span>
                  </button>
                  <p className="text-xs text-[#889DA7]">
                    O si prefieres, sigue los pasos manuales de Chrome:
                  </p>
                </div>
              ) : null}

              {/* Paso 1 Android */}
              <div className="flex items-start gap-3.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs sm:text-sm shrink-0 mt-0.5 shadow-2xs">
                  1
                </div>
                <div>
                  <strong className="text-sm sm:text-base font-bold text-[#01374C] block">
                    Abre el menú
                  </strong>
                  <span className="text-xs sm:text-sm text-[#475A65] block mt-1 leading-relaxed">
                    Toca los tres puntos (<strong>⋮</strong>) en la esquina superior de Chrome.
                  </span>
                </div>
              </div>

              {/* Paso 2 Android */}
              <div className="flex items-start gap-3.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs sm:text-sm shrink-0 mt-0.5 shadow-2xs">
                  2
                </div>
                <div>
                  <strong className="text-sm sm:text-base font-bold text-[#01374C] block">
                    Instalar aplicación
                  </strong>
                  <span className="text-xs sm:text-sm text-[#475A65] block mt-1 leading-relaxed">
                    Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                  </span>
                </div>
              </div>

              {/* Paso 3 Android */}
              <div className="flex items-start gap-3.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs sm:text-sm shrink-0 mt-0.5 shadow-2xs">
                  3
                </div>
                <div>
                  <strong className="text-sm sm:text-base font-bold text-[#01374C] block">
                    Confirmar
                  </strong>
                  <span className="text-xs sm:text-sm text-[#475A65] block mt-1 leading-relaxed">
                    Presiona <strong>Instalar</strong> para integrarla en tu teléfono como app nativa.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Compartir Aplicación */}
          <div className="pt-3 border-t border-[#E8EDF1] space-y-2">
            <span className="text-xs sm:text-sm font-bold text-[#6D8390] uppercase tracking-wide block text-center mb-1">
              ¿Quieres compartir la Bitácora?
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleShareApp}
                className="flex-1 py-3 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Compartir aplicación</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="py-3 px-3.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] border border-[#DDC1AB] text-[#01374C] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#00897B]" />
                    <span className="text-xs text-[#00897B] font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#01374C]" />
                    <span className="text-xs">Copiar</span>
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
            className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-[#01374C] text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-[#002636] transition-colors cursor-pointer"
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
