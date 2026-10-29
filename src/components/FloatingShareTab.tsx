/**
 * ============================================================================
 * PESTAÑAS VERTICALES FIJAS LATERALES (COMPARTIR + IR A VARIETALE.COM)
 * ============================================================================
 * Botones compactos, fijos y verticales adheridos al margen derecho final
 * de la ventana durante toda la navegación:
 * 1. Botón Superior: Compartir aplicación (WhatsApp, selector nativo o link copiado).
 * 2. Botón Inferior: Ir a VARIETALE.com (acceso directo a la tienda oficial).
 *
 * Características:
 * - Diseño ultra-delgado (no obstruye la lectura ni controles de la aplicación).
 * - Registra automáticamente cada acción en las métricas del Administrador (telemetría).
 * - Textos totalmente editables desde el Catálogo CMS y el Modo de Edición en Vivo.
 * - Cero interferencia con la navegación inferior o modales.
 */

import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Smartphone,
  X,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { recordAppShare, recordVarietaleRedirect } from "../data/adminStore";
import { isVisualEditModeActive, getUiText } from "../data/uiCmsStore";

export const FloatingShareTab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setCmsTick] = useState(0);

  useEffect(() => {
    const handleCmsSubmodal = (ev: Event) => {
      const modalId = (ev as CustomEvent<{ modalId?: string }>).detail?.modalId;
      if (modalId === "share") {
        setIsOpen(true);
      } else if (modalId === "close_all") {
        setIsOpen(false);
      }
    };
    const handleCmsUpdate = () => setCmsTick((t) => t + 1);

    window.addEventListener("varietale-cms-open-submodal", handleCmsSubmodal);
    window.addEventListener("varietale-ui-cms-updated", handleCmsUpdate);
    return () => {
      window.removeEventListener("varietale-cms-open-submodal", handleCmsSubmodal);
      window.removeEventListener("varietale-ui-cms-updated", handleCmsUpdate);
    };
  }, []);

  const shareLabel = getUiText("Compartir");
  const storeLabel = getUiText("Ir a VARIETALE.com");
  const storeTooltip = getUiText("Visitar tienda oficial VARIETALE.com");

  const getAppShareUrl = (): string => {
    if (typeof window !== "undefined" && window.location.origin) {
      return window.location.href.split("#")[0];
    }
    return "https://www.varietale.com";
  };

  const getShareMessage = (): string => {
    const url = getAppShareUrl();
    return `¡Descubre la *Bitácora de Catación Varietale*! ☕✨\nRegistra tus cafés, explora la rueda de sabores y guarda tus notas de cata:\n${url}`;
  };

  const handleCopyLink = async () => {
    const url = getAppShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    recordAppShare("copy_link");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    recordAppShare("whatsapp");
    const text = getShareMessage();
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleNativeShare = async () => {
    const url = getAppShareUrl();
    const text = `¡Descubre la Bitácora de Catación Varietale! ☕✨ Registra tus cafés y explora la rueda de sabores:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Bitácora de Catación Varietale",
          text,
          url,
        });
        recordAppShare("native_share");
        setIsOpen(false);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    // Si el navegador de escritorio no tiene selector nativo, copia el link y avisa
    await handleCopyLink();
  };

  const handleGoToStore = (e: React.MouseEvent) => {
    if (isVisualEditModeActive()) {
      e.preventDefault();
      return;
    }
    recordVarietaleRedirect(
      "floating_varietale_btn",
      "https://www.varietale.com",
      "Pestaña Flotante: Ir a VARIETALE.com"
    );
    window.open("https://www.varietale.com", "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Contenedor vertical de pestañas fijas al margen derecho final */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 items-end select-none pointer-events-none"
        style={{ touchAction: "manipulation" }}
      >
        {/* Botón 1 (Superior): Compartir Aplicación */}
        <button
          id="floating-vertical-share-btn"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Compartir Mi Bitácora Varietale"
          aria-label={shareLabel}
          className="pointer-events-auto w-[22px] sm:w-[26px] py-3 px-0.5 rounded-l-xl bg-[#01374C]/85 hover:bg-[#01374C] text-white border-l border-y border-[#00D9B4]/50 shadow-md flex flex-col items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-all cursor-pointer"
        >
          <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00D9B4] shrink-0" />
          <span
            className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none text-white whitespace-nowrap"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            {shareLabel}
          </span>
        </button>

        {/* Botón 2 (Inferior): Ir a VARIETALE.com */}
        <button
          id="floating-vertical-store-btn"
          type="button"
          onClick={handleGoToStore}
          title={storeTooltip}
          aria-label={storeLabel}
          className="pointer-events-auto w-[22px] sm:w-[26px] py-3 px-0.5 rounded-l-xl bg-[#01374C]/85 hover:bg-[#01374C] text-white border-l border-y border-[#00D9B4]/50 shadow-md flex flex-col items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-all cursor-pointer"
        >
          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00D9B4] shrink-0" />
          <span
            className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none text-white whitespace-nowrap"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            {storeLabel}
          </span>
        </button>
      </div>

      {/* Menú flotante compacto al pulsar la pestaña de compartir */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Capa invisible para cerrar al tocar afuera */}
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="fixed right-7 sm:right-8 top-1/2 -translate-y-1/2 z-50 w-68 sm:w-76 bg-white rounded-2xl p-4 shadow-2xl border border-[#DDC1AB] text-left"
            >
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E8EDF1]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-[#01374C] leading-tight">
                      Compartir Bitácora
                    </h4>
                    <span className="text-[11px] text-[#6A7B85] block">
                      Invita a otros amantes del café
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#889DA7] hover:text-[#01374C] hover:bg-[#FAF6F2] transition-colors cursor-pointer"
                  aria-label="Cerrar menú de compartir"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Opción 1: Copiar link automáticamente */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`w-full min-h-[42px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between gap-2 transition-all cursor-pointer border ${
                    copied
                      ? "bg-[#EBFBFA] border-[#00D9B4] text-[#01374C]"
                      : "bg-[#FAF6F2] hover:bg-[#F2ECE4] border-[#DDC1AB]/80 text-[#01374C]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {copied ? (
                      <Check className="w-4 h-4 text-[#00897B] stroke-[2.8]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#01374C]" />
                    )}
                    <span>{copied ? "¡Link copiado!" : "Copiar link de la App"}</span>
                  </span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white border border-[#DDC1AB] text-[#01374C]">
                    {copied ? "Listo" : "1 Clic"}
                  </span>
                </button>

                {/* Opción 2: Compartir por WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full min-h-[42px] py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white/20" />
                  <span>Enviar por WhatsApp</span>
                </button>

                {/* Opción 3: Selector de diferentes Apps */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full min-h-[42px] py-2.5 px-3 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-[#00D9B4]" />
                  <span>Compartir en otras Apps</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
