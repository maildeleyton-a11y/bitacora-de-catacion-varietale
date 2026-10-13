/**
 * ============================================================================
 * GUÍA DE INSTALACIÓN PWA (INSTALL PWA MODAL & BANNER)
 * ============================================================================
 * Ventana emergente y guía visual interactiva para instalar la Bitácora en:
 * - Dispositivos iOS (Safari: Menú compartir -> Agregar a pantalla de inicio).
 * - Dispositivos Android (Prompt nativo de Chrome / Menú 3 puntos).
 * - Compartir ficha oficial por WhatsApp.
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
  ExternalLink,
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

  // Compartir por WhatsApp con mensaje y URL oficial
  const handleShareWhatsApp = () => {
    const shareUrl = window.location.origin || "https://varietale.com";
    const message = `¡Te comparto la *Bitácora de Catación Varietale*! ☕✨\n\nUna aplicación interactiva para aprender a catar café de especialidad con métodos de filtrado y rueda sensorial SCA:\n${shareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    if (navigator.share) {
      navigator
        .share({
          title: "Bitácora de Catación Varietale",
          text: "Aprende a catar café de especialidad, explora métodos y registra tus notas sensoriales.",
          url: shareUrl,
        })
        .catch(() => {
          window.open(whatsappUrl, "_blank");
        });
    } else {
      window.open(whatsappUrl, "_blank");
    }
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
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/icon-192.png"
                alt="Bitácora Varietale"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00D9B4]/20 text-[#00D9B4] text-[10px] font-black uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Aplicación Nativa</span>
              </div>
              <h3 className="text-base sm:text-lg font-black leading-tight text-white">
                Instalar en tu Celular
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                Bitácora Varietale a pantalla completa
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Plataforma: iOS vs Android */}
        <div className="p-3 bg-[#FAF6F2] border-b border-[#E8EDF1] flex gap-2">
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#3B2212] flex-1">
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
            <div className="space-y-3.5">
              <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/60 text-xs text-[#01374C]">
                <strong>Nota:</strong> En dispositivos Apple (iPhone/iPad), abre este enlace en el navegador <strong>Safari</strong> para agregarla:
              </div>

              {/* Paso 1 */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs shrink-0">
                  1
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold">
                    Toca el botón Compartir
                  </strong>
                  <span className="text-[#4A5D68] block mt-0.5 leading-relaxed">
                    En la barra inferior de Safari, pulsa el icono de compartir{" "}
                    <span className="inline-flex items-center align-middle px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-blue-600 font-bold text-[11px]">
                      <Share className="w-3.5 h-3.5 inline mr-1" /> Compartir
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs shrink-0">
                  2
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold">
                    Elige "Agregar al inicio"
                  </strong>
                  <span className="text-[#4A5D68] block mt-0.5 leading-relaxed">
                    Desliza hacia abajo en el menú y selecciona{" "}
                    <span className="inline-flex items-center align-middle px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-bold text-[11px]">
                      <PlusSquare className="w-3.5 h-3.5 inline mr-1 text-[#01374C]" /> Agregar a pantalla de inicio
                    </span>
                  </span>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs shrink-0">
                  3
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold">
                    Confirma tocando "Agregar"
                  </strong>
                  <span className="text-[#4A5D68] block mt-0.5 leading-relaxed">
                    En la esquina superior derecha, toca <strong>Agregar</strong>. ¡El ícono oficial de Varietale se creará en tu pantalla!
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* GUÍA PARA ANDROID */
            <div className="space-y-3.5">
              {deferredPrompt ? (
                <div className="text-center space-y-2 py-2">
                  <p className="text-xs text-[#52646E]">
                    Tu dispositivo es compatible con la instalación directa con un toque:
                  </p>
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-3 px-4 rounded-xl bg-[#00897B] hover:bg-[#007064] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Aplicación Ahora</span>
                  </button>
                </div>
              ) : null}

              {/* Paso 1 Android */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs shrink-0">
                  1
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold">
                    Abre el menú de opciones
                  </strong>
                  <span className="text-[#4A5D68] block mt-0.5 leading-relaxed">
                    Toca el botón de tres puntos (<strong>⋮</strong>) en la esquina superior derecha de Google Chrome.
                  </span>
                </div>
              </div>

              {/* Paso 2 Android */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs shrink-0">
                  2
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold">
                    Selecciona "Instalar aplicación"
                  </strong>
                  <span className="text-[#4A5D68] block mt-0.5 leading-relaxed">
                    Toca en <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                  </span>
                </div>
              </div>

              {/* Paso 3 Android */}
              <div className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-[#01374C] text-[#00D9B4] flex items-center justify-center font-black text-xs shrink-0">
                  3
                </div>
                <div>
                  <strong className="text-[#01374C] block font-bold">
                    Confirma la instalación
                  </strong>
                  <span className="text-[#4A5D68] block mt-0.5 leading-relaxed">
                    Toca <strong>Instalar</strong>. La aplicación se integrará con el cajón de aplicaciones de tu teléfono como una app nativa.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Compartir por WhatsApp */}
          <div className="pt-2 border-t border-[#E8EDF1]">
            <span className="text-[11px] font-bold text-[#889DA7] uppercase block mb-2 text-center">
              ¿Quieres compartirla con amigos o baristas?
            </span>
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Compartir en WhatsApp (con tarjeta oficial)</span>
            </button>
          </div>
        </div>

        {/* Pie con botón de cierre */}
        <div className="p-3 bg-[#FAF6F2] border-t border-[#E8EDF1] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#01374C] text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-[#002636] transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Banner discreto y elegante en la parte superior que invita a instalar la app
 * si el usuario no la ha instalado todavía en su dispositivo móvil.
 */
export const InstallPwaBanner: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si ya está ejecutándose como app nativa instalada, no mostrar banner
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Verificar si el usuario lo descartó recientemente
    const dismissedUntil = localStorage.getItem("varietale_pwa_banner_dismissed_until");
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // Esperar 2.5s para no entorpecer la carga inicial
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    // Descartar por 5 días para respetar la decisión del usuario
    localStorage.setItem(
      "varietale_pwa_banner_dismissed_until",
      (Date.now() + 5 * 86400000).toString()
    );
  };

  if (!visible) return null;

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-40 animate-in slide-in-from-top-3 duration-300">
      <div
        onClick={onOpenModal}
        className="bg-[#01374C] text-white p-3 rounded-2xl shadow-xl border border-[#00D9B4]/40 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#002b3c] transition-all group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/icon-192.png"
            alt="App"
            className="w-8 h-8 rounded-lg bg-white p-0.5 shrink-0 object-contain shadow-xs"
          />
          <div className="min-w-0">
            <span className="text-xs font-black block leading-tight truncate">
              📲 Instala la App en tu Celular
            </span>
            <span className="text-[11px] text-[#00D9B4] block leading-tight mt-0.5 font-bold">
              Toca para ver cómo agregarla
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] bg-[#00D9B4] text-[#01374C] font-black px-2 py-1 rounded-lg">
            Instalar
          </span>
          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

