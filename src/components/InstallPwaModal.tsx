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
    const shareUrl = window.location.href || window.location.origin || "https://varietale.com";
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
    const shareUrl = window.location.href || window.location.origin || "https://varietale.com";
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
        {/* Encabezado con Icono de App y Textos Ampliados */}
        <div className="bg-[#01374C] p-5 sm:p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pr-8">
            <div className="w-14 h-14 rounded-2xl bg-[#002636] p-1.5 shadow-md shrink-0 flex items-center justify-center border border-white/20">
              <img
                src="./icon-192.png"
                alt="Bitácora Varietale"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black leading-tight text-white">
                Cómo agregar a tu pantalla de inicio
              </h3>
              <p className="text-sm text-white/90 mt-1 font-medium">
                Sigue estos 3 sencillos pasos:
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Plataforma: Textos en Negrita, Grandes y de Alto Contraste */}
        <div className="p-3 bg-[#FAF6F2] border-b border-[#E8EDF1] flex gap-2.5">
          <button
            onClick={() => setPlatform("ios")}
            className={`flex-1 py-3 px-3.5 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center text-center transition-all cursor-pointer ${
              platform === "ios"
                ? "bg-[#01374C] text-white shadow-sm ring-2 ring-[#01374C]"
                : "bg-white text-[#4A5D68] hover:text-[#01374C] border border-[#DDC1AB]"
            }`}
          >
            iPhone / iPad (iOS)
          </button>
          <button
            onClick={() => setPlatform("android")}
            className={`flex-1 py-3 px-3.5 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center text-center transition-all cursor-pointer ${
              platform === "android"
                ? "bg-[#01374C] text-white shadow-sm ring-2 ring-[#01374C]"
                : "bg-white text-[#4A5D68] hover:text-[#01374C] border border-[#DDC1AB]"
            }`}
          >
            Android (Chrome)
          </button>
        </div>

        {/* Contenido Desplazable con Pasos Grandes y Cómodos de Leer */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-base text-[#24333C] flex-1">
          {isStandalone ? (
            <div className="p-5 bg-[#EBFBFA] border-2 border-[#00D9B4]/60 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#00897B] mx-auto" />
              <strong className="block text-lg font-black text-[#01374C]">
                ¡Ya estás usando la App instalada!
              </strong>
              <p className="text-sm sm:text-base text-[#52646E] leading-relaxed font-medium">
                Tienes acceso directo a pantalla completa sin barras de navegador.
              </p>
            </div>
          ) : platform === "ios" ? (
            /* GUÍA PARA IOS (SAFARI) CON TIPOGRAFÍA GRANDE */
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] text-sm sm:text-base text-[#01374C] leading-relaxed font-semibold">
                Abre este enlace en el navegador <strong>Safari</strong> para poder agregarla a tu pantalla de inicio:
              </div>

              {/* Paso 1 */}
              <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-sm sm:text-base shrink-0 mt-0.5 shadow-2xs">
                  1
                </div>
                <div>
                  <strong className="text-base sm:text-lg font-black text-[#01374C] block">
                    Toca Compartir
                  </strong>
                  <span className="text-sm sm:text-base text-[#3A4D57] block mt-1 leading-relaxed font-medium">
                    En la barra inferior de Safari, presiona el botón <strong>Compartir</strong>{" "}
                    <span className="inline-flex items-center align-middle px-2.5 py-0.5 rounded-lg bg-gray-100 border border-gray-300 text-blue-600 font-bold text-xs sm:text-sm">
                      <Share className="w-4 h-4 inline mr-1" /> Compartir
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-sm sm:text-base shrink-0 mt-0.5 shadow-2xs">
                  2
                </div>
                <div>
                  <strong className="text-base sm:text-lg font-black text-[#01374C] block">
                    Elige "Agregar a inicio"
                  </strong>
                  <span className="text-sm sm:text-base text-[#3A4D57] block mt-1 leading-relaxed font-medium">
                    Desliza las opciones y selecciona{" "}
                    <span className="inline-flex items-center align-middle px-2.5 py-0.5 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 font-bold text-xs sm:text-sm">
                      <PlusSquare className="w-4 h-4 inline mr-1 text-[#01374C]" /> Agregar a pantalla de inicio
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-sm sm:text-base shrink-0 mt-0.5 shadow-2xs">
                  3
                </div>
                <div>
                  <strong className="text-base sm:text-lg font-black text-[#01374C] block">
                    Confirma tocando "Agregar"
                  </strong>
                  <span className="text-sm sm:text-base text-[#3A4D57] block mt-1 leading-relaxed font-medium">
                    Toca <strong>Agregar</strong> arriba a la derecha. El ícono oficial de Varietale aparecerá junto a tus otras aplicaciones.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* GUÍA PARA ANDROID CON TIPOGRAFÍA GRANDE */
            <div className="space-y-3.5">
              {deferredPrompt ? (
                <div className="text-center space-y-2.5 py-1">
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#00897B] hover:bg-[#007064] text-white font-black text-base flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Instalar Aplicación Ahora</span>
                  </button>
                  <p className="text-sm text-[#6D8390] font-medium">
                    O si prefieres, sigue los pasos manuales de Chrome:
                  </p>
                </div>
              ) : null}

              {/* Paso 1 Android */}
              <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-sm sm:text-base shrink-0 mt-0.5 shadow-2xs">
                  1
                </div>
                <div>
                  <strong className="text-base sm:text-lg font-black text-[#01374C] block">
                    Abre el menú
                  </strong>
                  <span className="text-sm sm:text-base text-[#3A4D57] block mt-1 leading-relaxed font-medium">
                    Toca los tres puntos (<strong>⋮</strong>) en la esquina superior de Chrome.
                  </span>
                </div>
              </div>

              {/* Paso 2 Android */}
              <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-sm sm:text-base shrink-0 mt-0.5 shadow-2xs">
                  2
                </div>
                <div>
                  <strong className="text-base sm:text-lg font-black text-[#01374C] block">
                    Instalar aplicación
                  </strong>
                  <span className="text-sm sm:text-base text-[#3A4D57] block mt-1 leading-relaxed font-medium">
                    Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                  </span>
                </div>
              </div>

              {/* Paso 3 Android */}
              <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-sm sm:text-base shrink-0 mt-0.5 shadow-2xs">
                  3
                </div>
                <div>
                  <strong className="text-base sm:text-lg font-black text-[#01374C] block">
                    Confirmar
                  </strong>
                  <span className="text-sm sm:text-base text-[#3A4D57] block mt-1 leading-relaxed font-medium">
                    Presiona <strong>Instalar</strong> para integrarla en tu teléfono como app nativa.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Compartir Aplicación */}
          <div className="pt-4 border-t border-[#E8EDF1] space-y-2.5">
            <span className="text-xs sm:text-sm font-black text-[#6D8390] uppercase tracking-wider block text-center mb-1">
              ¿Quieres compartir la Bitácora?
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={handleShareApp}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Compartir aplicación</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="py-3 px-4 rounded-2xl bg-[#FAF6F2] hover:bg-[#F2ECE4] border border-[#DDC1AB] text-[#01374C] font-black text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#00897B]" />
                    <span className="text-[#00897B] font-black">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#01374C]" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pie con botón de cierre */}
        <div className="p-4 bg-[#FAF6F2] border-t border-[#E8EDF1] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[#01374C] text-white text-sm sm:text-base font-black shadow-xs hover:bg-[#002636] transition-colors cursor-pointer text-center"
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
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          aria-label="Cerrar aviso"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo oficial de la PWA */}
        <div className="w-18 h-18 rounded-2xl bg-[#01374C] p-2.5 mx-auto shadow-md flex items-center justify-center mb-3.5 border border-[#DDC1AB]/50">
          <img
            src="./icon-192.png"
            alt="Bitácora Varietale"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        {/* Etiqueta superior */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00D9B4]/15 text-[#00897B] text-xs font-black uppercase tracking-wider mx-auto mb-2.5">
          <Sparkles className="w-4 h-4 text-[#00897B]" />
          <span>Experiencia Móvil Recomendada</span>
        </div>

        {/* Título Grande y Destacado */}
        <h3 className="text-xl sm:text-2xl font-black text-[#01374C] leading-snug mb-3">
          ¿Quieres instalar la Bitácora en tu celular?
        </h3>

        {/* Descripción exacta solicitada con tipografía cómoda */}
        <p className="text-sm sm:text-base text-[#3A4D57] leading-relaxed mb-6 px-1 font-medium">
          Te permitirá usar Tu Bitácora VARIETALE con carga instantánea y tus cataciones siempre a la mano.
        </p>

        {/* Botón Principal exacto solicitado con tamaño amplio */}
        <button
          onClick={() => {
            onClose();
            onOpenGuide();
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#01374C] hover:bg-[#002636] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer mb-3"
        >
          <Download className="w-5 h-5 text-[#00D9B4]" />
          <span>Ver cómo instalarla ahora - 100% Seguro</span>
        </button>

        {/* Botón secundario */}
        <button
          onClick={onClose}
          className="w-full py-2 text-sm font-bold text-[#889DA7] hover:text-[#01374C] transition-colors cursor-pointer"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
};

// Alias para compatibilidad de importaciones
export const InstallPwaBanner = InstallPwaPromptModal;
