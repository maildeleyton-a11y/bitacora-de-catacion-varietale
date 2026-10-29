/**
 * ============================================================================
 * SINCRONIZADOR E INSPECTOR DE EDICIÓN VISUAL EN VIVO (LIVE VISUAL EDITOR)
 * ============================================================================
 * Cumple dos funciones conectadas:
 * 1. Sincronizador Reactivo de Textos (siempre activo): Aplica en tiempo real
 *    todos los textos personalizados por el Administrador sobre los títulos,
 *    cajas, etiquetas, botones y placeholders de la aplicación, recordando
 *    siempre el texto original de fábrica para poder restaurarlo en 0ms.
 * 2. Modo Edición Visual en Vivo (cuando el Admin lo activa): Muestra una barra
 *    superior flotante de control, permite saltar a cualquier pantalla en 1 clic
 *    y permite tocar cualquier texto, caja, botón, método o sabor de la Rueda SCA
 *    directamente sobre la app para editarlo en el acto.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Edit3,
  Check,
  X,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  MousePointerClick,
  Home,
  Coffee,
  Compass,
  BookOpen,
  Lock,
} from "lucide-react";
import {
  getUiCmsState,
  setUiTextOverride,
  setFlavorDescriptorOverride,
  setBrewMethodOverride,
  isProtectedOrDynamicText,
  DEFAULT_FLAVOR_DESCRIPTORS,
  DEFAULT_BREW_METHODS,
} from "../data/uiCmsStore";
import { FLAVOR_DESCRIPTORS } from "../data/wheelDescriptors";
import { BREW_METHODS } from "../data/coffeeData";

// Mapas en memoria para recordar siempre el texto original de fábrica de cada nodo DOM
const originalTextNodeMap = new WeakMap<Text, string>();
const lastAppliedTextNodeMap = new WeakMap<Text, string>();
const originalPlaceholderMap = new WeakMap<HTMLElement, string>();
const lastAppliedPlaceholderMap = new WeakMap<HTMLElement, string>();

/**
 * Determina si un elemento del DOM (o su texto) está protegido contra edición
 * (pie de autoría Mr. Bite / Varietale, contadores dinámicos o datos de base de datos/reseñas).
 */
function isElementLocked(el: Element | null, text?: string): boolean {
  if (!el) return true;
  if (el.closest('[data-cms-locked="true"], [data-cms-dynamic="true"]')) {
    return true;
  }
  if (el.classList.contains("tabular-nums") || el.closest(".tabular-nums")) {
    return true;
  }
  if (text !== undefined && isProtectedOrDynamicText(text)) {
    return true;
  }
  return false;
}

export type EditablePopupId =
  | "guide"
  | "install_prompt"
  | "install_guide"
  | "auth_modal"
  | "celebration"
  | "share"
  | "admin_login"
  | "admin_recover"
  | "google_chooser"
  | "forgot_user"
  | "reset_password"
  | "welcome_gift"
  | "flavor_intensity"
  | "delete_cata"
  | "redirect_audit";

interface LiveVisualEditorOverlayProps {
  /** Indica si el Modo Edición Visual en Vivo está activo */
  isVisualEditMode: boolean;
  /** Desactiva el modo de edición visual */
  onExitVisualEditMode?: () => void;
  onCloseVisualEditMode?: () => void;
  /** Regresa directamente al Panel de Administrador (pestaña Textos y Sabores) */
  onReturnToAdminPanel: () => void;
  /** Permite cambiar de pantalla rápidamente durante la edición en vivo */
  onNavigateScreen: (
    target:
      | "auth"
      | "home"
      | "registration"
      | "wheel"
      | "logbook"
      | "admin"
      | "launch"
  ) => void;
  /** Permite abrir cualquier Pop-up o ventana emergente en 1 clic para editar sus textos */
  onOpenPopup?: (popup: EditablePopupId) => void;
  /** Fuerza re-render de los componentes React al editar sabores o métodos */
  onMasterDataChanged?: () => void;
  currentScreen?: string;
}

export const LiveVisualEditorOverlay: React.FC<LiveVisualEditorOverlayProps> = ({
  isVisualEditMode,
  onExitVisualEditMode,
  onCloseVisualEditMode,
  onReturnToAdminPanel,
  onNavigateScreen,
  onOpenPopup,
  onMasterDataChanged,
}) => {
  const handleExitVisualMode = () => {
    if (onExitVisualEditMode) onExitVisualEditMode();
    if (onCloseVisualEditMode) onCloseVisualEditMode();
  };
  const [cmsTick, setCmsTick] = useState(0);

  // Modal de edición de texto / placeholder en vivo
  const [editingTextModal, setEditingTextModal] = useState<{
    originalText: string;
    currentText: string;
    isPlaceholder: boolean;
    elementTag: string;
    triggerElement: Element | null;
  } | null>(null);

  // Modal de edición de Sabor de la Rueda SCA en vivo (Maestro Tostador)
  const [editingFlavorModal, setEditingFlavorModal] = useState<{
    descriptorId: string;
    name: string;
    reference: string;
    subcategory: string;
    hint: string;
    color: string;
    triggerElement: HTMLElement | null;
  } | null>(null);

  // Modal de edición de Método de Preparación en vivo (Maestro Tostador)
  const [editingMethodModal, setEditingMethodModal] = useState<{
    methodId: string;
    name: string;
    shortDesc: string;
    idealProfile: string;
    ratio: string;
    grind: string;
    time: string;
    highlightsText: string;
    triggerElement: HTMLElement | null;
  } | null>(null);

  const bypassingInterceptRef = useRef(false);

  // Escuchar cambios en el store CMS
  useEffect(() => {
    const handleCmsUpdate = () => {
      setCmsTick((t) => t + 1);
      if (onMasterDataChanged) onMasterDataChanged();
    };
    window.addEventListener("varietale-ui-cms-updated", handleCmsUpdate);
    return () =>
      window.removeEventListener("varietale-ui-cms-updated", handleCmsUpdate);
  }, [onMasterDataChanged]);

  // ==========================================================================
  // 1. SINCRONIZADOR DOM EN TIEMPO REAL (TEXTOS Y PLACEHOLDERS)
  // ==========================================================================
  useEffect(() => {
    const applyAllDomOverrides = () => {
      const root = document.getElementById("user-app-root");
      if (!root) return;

      const cms = getUiCmsState();
      const overrides = cms.textOverridesByOriginal;

      // A. Sincronizar nodos de texto (respetando elementos bloqueados / contadores / BD)
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let currentNode = walker.nextNode();
      while (currentNode) {
        const textNode = currentNode as Text;
        const parentEl = textNode.parentElement;
        const parentTag = parentEl?.tagName;
        if (
          parentEl &&
          parentTag !== "SCRIPT" &&
          parentTag !== "STYLE" &&
          parentTag !== "TEXTAREA"
        ) {
          const currentVal = textNode.nodeValue || "";
          const trimmed = currentVal.trim();
          if (trimmed.length > 0 && !isElementLocked(parentEl, trimmed)) {
            let orig = originalTextNodeMap.get(textNode);
            const lastApplied = lastAppliedTextNodeMap.get(textNode);

            // Si React cambió el contenido dinámico del nodo, actualizar su original
            if (orig === undefined || (lastApplied !== undefined && currentVal !== lastApplied)) {
              orig = trimmed;
              originalTextNodeMap.set(textNode, orig);
            }

            if (!isProtectedOrDynamicText(orig)) {
              const customVal = overrides[orig];
              const targetVal = customVal !== undefined ? customVal : orig;

              if (trimmed !== targetVal) {
                // Preservar espacios laterales si existían
                const leadingSpace = currentVal.match(/^\s*/)?.[0] || "";
                const trailingSpace = currentVal.match(/\s*$/)?.[0] || "";
                const nextFull = `${leadingSpace}${targetVal}${trailingSpace}`;
                textNode.nodeValue = nextFull;
                lastAppliedTextNodeMap.set(textNode, nextFull);
              } else {
                lastAppliedTextNodeMap.set(textNode, currentVal);
              }
            }
          }
        }
        currentNode = walker.nextNode();
      }

      // B. Sincronizar atributos placeholder en inputs y textareas
      const inputs = root.querySelectorAll<HTMLElement>("input[placeholder], textarea[placeholder]");
      inputs.forEach((el) => {
        if (isElementLocked(el)) return;
        const currentPh = el.getAttribute("placeholder") || "";
        const trimmedPh = currentPh.trim();
        if (!trimmedPh) return;

        let origPh = originalPlaceholderMap.get(el);
        const lastAppliedPh = lastAppliedPlaceholderMap.get(el);

        if (origPh === undefined || (lastAppliedPh !== undefined && currentPh !== lastAppliedPh)) {
          origPh = trimmedPh;
          originalPlaceholderMap.set(el, origPh);
        }

        const customPh = overrides[origPh];
        const targetPh = customPh !== undefined ? customPh : origPh;
        if (currentPh !== targetPh) {
          el.setAttribute("placeholder", targetPh);
          lastAppliedPlaceholderMap.set(el, targetPh);
        } else {
          lastAppliedPlaceholderMap.set(el, currentPh);
        }
      });
    };

    applyAllDomOverrides();

    const root = document.getElementById("user-app-root");
    if (!root) return;

    const observer = new MutationObserver(() => {
      applyAllDomOverrides();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [cmsTick]);

  // ==========================================================================
  // 2. INSPECTOR DE CLIC EN VIVO CUANDO EL MODO EDICIÓN VISUAL ESTÁ ACTIVO
  // ==========================================================================
  useEffect(() => {
    if (!isVisualEditMode) return;

    const handleCaptureClick = (ev: MouseEvent) => {
      if (bypassingInterceptRef.current) return;

      const target = ev.target as Element | null;
      if (!target || typeof target.closest !== "function") return;

      // No interceptar clics dentro de la barra flotante ni de los modales del propio editor
      if (target.closest("#live-visual-editor-ui")) return;

      const appRoot = document.getElementById("user-app-root");
      if (!appRoot || !appRoot.contains(target)) return;

      // Si el elemento (o su contenedor) está marcado como bloqueado (Mr. Bite, Varietale,
      // contadores en cero/automáticos o reseñas/datos de base de datos), NO permitir su edición
      if (target.closest('[data-cms-locked="true"], [data-cms-dynamic="true"], .tabular-nums')) {
        return;
      }

      // 1. ¿Hizo clic sobre un botón de Sabor de la Rueda SCA (#flavor-btn-...)?
      const flavorBtn = target.closest<HTMLElement>("[id^='flavor-btn-']");
      if (flavorBtn) {
        const descriptorId = flavorBtn.id.replace("flavor-btn-", "");
        const desc = FLAVOR_DESCRIPTORS.find((d) => d.id === descriptorId);
        if (desc) {
          ev.preventDefault();
          ev.stopPropagation();
          setEditingFlavorModal({
            descriptorId: desc.id,
            name: desc.name,
            reference: desc.reference || desc.name,
            subcategory: desc.subcategory,
            hint: desc.hint || "",
            color: desc.color,
            triggerElement: flavorBtn,
          });
          return;
        }
      }

      // 2. ¿Hizo clic sobre un botón de Método de Preparación (#method-btn-...)?
      const methodBtn = target.closest<HTMLElement>("[id^='method-btn-']");
      if (methodBtn) {
        const methodId = methodBtn.id.replace("method-btn-", "");
        const method = BREW_METHODS.find((m) => m.id === methodId);
        if (method) {
          ev.preventDefault();
          ev.stopPropagation();
          setEditingMethodModal({
            methodId: method.id,
            name: method.name,
            shortDesc: method.shortDesc,
            idealProfile: method.idealProfile,
            ratio: method.ratio || "",
            grind: method.grind || "",
            time: method.time || "",
            highlightsText: (method.highlights || []).join("\n"),
            triggerElement: methodBtn,
          });
          return;
        }
      }

      // 3. ¿Hizo clic sobre un Input o Textarea con placeholder?
      const inputEl = target.closest<HTMLElement>(
        "input[placeholder], textarea[placeholder]"
      );
      if (inputEl && !isElementLocked(inputEl)) {
        ev.preventDefault();
        ev.stopPropagation();
        const origPh =
          originalPlaceholderMap.get(inputEl) ||
          inputEl.getAttribute("placeholder") ||
          "";
        const currentPh = inputEl.getAttribute("placeholder") || origPh;
        setEditingTextModal({
          originalText: origPh.trim(),
          currentText: currentPh,
          isPlaceholder: true,
          elementTag: inputEl.tagName.toLowerCase(),
          triggerElement: inputEl,
        });
        return;
      }

      // 4. Buscar el nodo de texto directo más cercano al elemento tocado (saltando nodos bloqueados)
      const findBestTextNode = (el: Element): Text | null => {
        for (let i = 0; i < el.childNodes.length; i++) {
          const n = el.childNodes[i];
          if (n.nodeType === Node.TEXT_NODE) {
            const val = (n.nodeValue || "").trim();
            if (val.length > 0 && !isElementLocked(el, val)) {
              return n as Text;
            }
          }
        }
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const txt = node as Text;
          const val = (txt.nodeValue || "").trim();
          if (val.length > 0 && !isElementLocked(txt.parentElement, val)) {
            return txt;
          }
          node = walker.nextNode();
        }
        return null;
      };

      const textNode = findBestTextNode(target);
      if (textNode) {
        const currentVal = (textNode.nodeValue || "").trim();
        const origVal = originalTextNodeMap.get(textNode) || currentVal;
        if (isProtectedOrDynamicText(origVal) || isProtectedOrDynamicText(currentVal)) {
          return;
        }

        ev.preventDefault();
        ev.stopPropagation();
        const clickableAncestor =
          target.closest("button, a, label") || target;

        setEditingTextModal({
          originalText: origVal,
          currentText: currentVal,
          isPlaceholder: false,
          elementTag: clickableAncestor.tagName.toLowerCase(),
          triggerElement: clickableAncestor,
        });
      }
    };

    document.addEventListener("click", handleCaptureClick, true);
    return () => document.removeEventListener("click", handleCaptureClick, true);
  }, [isVisualEditMode]);

  // Ejecutar la acción normal de un botón cuando el Admin quiere navegar mientras edita
  const triggerNormalClickOnElement = (el: Element | null) => {
    if (!el) return;
    bypassingInterceptRef.current = true;
    setTimeout(() => {
      if (el instanceof HTMLElement) {
        el.click();
      } else {
        el.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
      }
      setTimeout(() => {
        bypassingInterceptRef.current = false;
      }, 120);
    }, 30);
  };

  const cmsState = getUiCmsState();
  const totalCustomCount =
    Object.keys(cmsState.textOverridesByOriginal).length +
    Object.keys(cmsState.flavorOverrides).length +
    Object.keys(cmsState.macroOverrides).length +
    Object.keys(cmsState.methodOverrides).length;

  if (!isVisualEditMode) {
    return null;
  }

  return (
    <div id="live-visual-editor-ui">
      {/* Estilo global para resaltar elementos editables (excluyendo elementos protegidos y contadores) */}
      <style>{`
        #user-app-root h1:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root h2:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root h3:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root h4:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root p:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root span:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):not(.tabular-nums):hover,
        #user-app-root label:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root button:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root a:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root svg text:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root svg tspan:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root input[placeholder]:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover,
        #user-app-root textarea[placeholder]:not([data-cms-locked="true"]):not([data-cms-locked="true"] *):hover {
          outline: 2px dashed #00D9B4 !important;
          outline-offset: 2px !important;
          cursor: pointer !important;
        }
        #user-app-root [data-cms-locked="true"],
        #user-app-root [data-cms-locked="true"] * {
          outline: none !important;
        }
      `}</style>

      {/* Barra Superior Flotante del Modo Edición Visual en Vivo (z-[105] para superar cualquier pop-up z-50 y la animación z-[100]) */}
      <div className="sticky top-0 z-[105] bg-[#01374C] text-white border-b-2 border-[#00D9B4] shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 space-y-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00D9B4] text-[#01374C] flex items-center justify-center shrink-0 font-black">
                <MousePointerClick className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#00D9B4]/20 text-[#00D9B4] border border-[#00D9B4]/40">
                    Modo Edición Visual en Vivo
                  </span>
                  <span className="text-[11px] font-bold text-amber-300">
                    ({totalCustomCount} ajuste{totalCustomCount === 1 ? "" : "s"} activo
                    {totalCustomCount === 1 ? "" : "s"})
                  </span>
                  <span className="text-[10px] font-bold text-white/75 bg-white/10 px-2 py-0.5 rounded-full">
                    🔒 Protegido: Autoría Mr. Bite / Varietale, contadores y reseñas BD
                  </span>
                </div>
                <p className="text-xs text-white/90 font-semibold mt-0.5">
                  Toca cualquier título, caja, botón, pop-up, rueda/radar o incluso el Panel Admin para editar su texto al instante.
                </p>
              </div>
            </div>

            {/* Botones para saltar de pantalla en 1 clic sin llenar formularios */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-[#00D9B4] mr-1">
                Pantalla:
              </span>
              <button
                type="button"
                onClick={() => onNavigateScreen("launch")}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Congelar la Animación Inicial para editar sus textos"
              >
                <Sparkles className="w-3 h-3 text-[#00D9B4]" />
                <span>Animación Inicial</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen("auth")}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3 h-3 text-[#00D9B4]" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen("home")}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Home className="w-3 h-3 text-[#00D9B4]" />
                <span>Inicio</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen("registration")}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Coffee className="w-3 h-3 text-[#00D9B4]" />
                <span>Paso 1 (Café/Método)</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen("wheel")}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Compass className="w-3 h-3 text-[#00D9B4]" />
                <span>Paso 2 (Rueda SCA)</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen("logbook")}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3 h-3 text-[#00D9B4]" />
                <span>Bitácora</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen("admin")}
                className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                title="Editar en vivo los textos del propio Panel de Administración"
              >
                <ShieldCheck className="w-3 h-3 text-amber-300" />
                <span>Panel Admin</span>
              </button>

              <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={onReturnToAdminPanel}
                className="px-3 py-1.5 rounded-xl bg-[#00D9B4] hover:bg-[#00c4a3] text-[#01374C] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Finalizar edición en vivo y regresar al Panel de Administración"
              >
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Volver al Panel Admin</span>
              </button>

              <button
                type="button"
                onClick={handleExitVisualMode}
                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white text-xs font-bold cursor-pointer"
                title="Salir del modo edición visual"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segunda fila compacta: Abrir cualquier Pop-up en 1 clic para editarlo en vivo */}
          {onOpenPopup && (
            <div className="pt-1.5 border-t border-white/15 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-[#00D9B4] mr-1">
                Abrir Pop-up para editar:
              </span>
              <button
                type="button"
                onClick={() => onOpenPopup("install_prompt")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                📲 Pop-up Instalar App
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("install_guide")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                📱 Guía iOS / Android
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("admin_login")}
                className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-100 text-[11px] font-extrabold cursor-pointer"
              >
                🔐 Ingreso Admin
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("admin_recover")}
                className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-100 text-[11px] font-extrabold cursor-pointer"
              >
                🔑 PIN Maestro Admin
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("guide")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🧭 Visita Guiada
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("auth_modal")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                👤 Pop-up Perfil y PIN
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("google_chooser")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🌐 Login Google
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("forgot_user")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🔎 Olvidé Cuenta
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("reset_password")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🔄 Restablecer Clave
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("welcome_gift")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🎁 Pop-up Obsequio
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("flavor_intensity")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                ⭐ Pop-up Intensidad
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("celebration")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🎉 Pop-up Cata Guardada
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("delete_cata")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🗑️ Eliminar Cata
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("share")}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
              >
                🔗 Pop-up Compartir
              </button>
              <button
                type="button"
                onClick={() => onOpenPopup("redirect_audit")}
                className="px-2.5 py-1 rounded-lg bg-[#00D9B4]/20 hover:bg-[#00D9B4]/30 border border-[#00D9B4]/40 text-[#00D9B4] text-[11px] font-extrabold cursor-pointer"
              >
                📈 Auditoría Web
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: EDICIÓN RÁPIDA DE TEXTO DE INTERFAZ O PLACEHOLDER
          ===================================================================== */}
      {editingTextModal && (
        <div
          onClick={() => setEditingTextModal(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-[#E8EDF1] space-y-4 text-[#01374C]"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E8EDF1]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0">
                  <Edit3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00897B]">
                    {editingTextModal.isPlaceholder
                      ? "Editar Texto de Ayuda (Placeholder)"
                      : "Editar Texto de la Interfaz"}
                  </span>
                  <h3 className="text-base font-black text-[#01374C]">
                    Modificar contenido en pantalla
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTextModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/80 text-xs space-y-1">
              <span className="font-extrabold uppercase text-[10px] text-[#6A7B85] block">
                Texto original de fábrica:
              </span>
              <p className="font-semibold text-[#01374C] select-all">
                "{editingTextModal.originalText}"
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-[#01374C] mb-1.5">
                Nuevo texto a mostrar:
              </label>
              <textarea
                rows={3}
                value={editingTextModal.currentText}
                onChange={(e) =>
                  setEditingTextModal({
                    ...editingTextModal,
                    currentText: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-bold text-[#01374C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                autoFocus
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUiTextOverride(
                    editingTextModal.originalText,
                    editingTextModal.originalText
                  );
                  setEditingTextModal(null);
                }}
                className="px-3 py-2 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Original</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTextModal(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#F5F8FA] text-[#52646E] text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUiTextOverride(
                      editingTextModal.originalText,
                      editingTextModal.currentText,
                      {
                        elementType: editingTextModal.isPlaceholder
                          ? "placeholder"
                          : editingTextModal.elementTag === "button" ||
                            editingTextModal.elementTag === "a"
                          ? "boton"
                          : "caja",
                      }
                    );
                    setEditingTextModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4 text-[#00D9B4]" />
                  <span>Guardar Cambio</span>
                </button>
              </div>
            </div>

            {/* Si el elemento tocado es un botón o pestaña, permitir accionarlo normalmente */}
            {editingTextModal.triggerElement &&
              !editingTextModal.isPlaceholder && (
                <div className="pt-3 border-t border-[#E8EDF1] flex items-center justify-between">
                  <span className="text-[11px] text-[#6A7B85]">
                    ¿Querías pulsar este botón para abrir su sección?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const el = editingTextModal.triggerElement;
                      setEditingTextModal(null);
                      triggerNormalClickOnElement(el);
                    }}
                    className="text-xs font-black text-[#00897B] hover:text-[#01374C] underline cursor-pointer"
                  >
                    Ejecutar clic normal del botón →
                  </button>
                </div>
              )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: EDICIÓN RÁPIDA DE SABOR DE LA RUEDA SCA (MAESTRO TOSTADOR)
          ===================================================================== */}
      {editingFlavorModal && (
        <div
          onClick={() => setEditingFlavorModal(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-[#E8EDF1] space-y-4 text-[#01374C]"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E8EDF1]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs"
                  style={{ backgroundColor: editingFlavorModal.color }}
                >
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00897B]">
                    Ajuste del Maestro Tostador • Rueda SCA
                  </span>
                  <h3 className="text-base font-black text-[#01374C]">
                    Editar Sabor: {editingFlavorModal.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFlavorModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Nombre Oficial del Sabor
                </label>
                <input
                  type="text"
                  value={editingFlavorModal.name}
                  onChange={(e) =>
                    setEditingFlavorModal({
                      ...editingFlavorModal,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-black text-[#01374C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Referencia Sensorial ( Botón / Ficha )
                </label>
                <input
                  type="text"
                  value={editingFlavorModal.reference}
                  onChange={(e) =>
                    setEditingFlavorModal({
                      ...editingFlavorModal,
                      reference: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-bold text-[#01374C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Subcategoría en la Rueda
                </label>
                <input
                  type="text"
                  value={editingFlavorModal.subcategory}
                  onChange={(e) =>
                    setEditingFlavorModal({
                      ...editingFlavorModal,
                      subcategory: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Color del Descriptor (HEX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingFlavorModal.color}
                    onChange={(e) =>
                      setEditingFlavorModal({
                        ...editingFlavorModal,
                        color: e.target.value,
                      })
                    }
                    className="w-9 h-9 rounded-lg border border-[#DDC1AB] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingFlavorModal.color}
                    onChange={(e) =>
                      setEditingFlavorModal({
                        ...editingFlavorModal,
                        color: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs font-mono font-bold text-[#01374C]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#01374C] mb-1">
                Explicación / Guía de Cata del Maestro Tostador:
              </label>
              <textarea
                rows={3}
                value={editingFlavorModal.hint}
                onChange={(e) =>
                  setEditingFlavorModal({
                    ...editingFlavorModal,
                    hint: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs sm:text-sm text-[#01374C] leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFlavorDescriptorOverride(editingFlavorModal.descriptorId, null);
                  setEditingFlavorModal(null);
                }}
                className="px-3 py-2 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Sabor Original</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFlavorDescriptorOverride(editingFlavorModal.descriptorId, {
                    name: editingFlavorModal.name.trim(),
                    reference: editingFlavorModal.reference.trim(),
                    subcategory: editingFlavorModal.subcategory.trim(),
                    hint: editingFlavorModal.hint.trim(),
                    color: editingFlavorModal.color.trim(),
                  });
                  setEditingFlavorModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4 text-[#00D9B4]" />
                <span>Guardar Sabor</span>
              </button>
            </div>

            {editingFlavorModal.triggerElement && (
              <div className="pt-3 border-t border-[#E8EDF1] flex items-center justify-between">
                <span className="text-[11px] text-[#6A7B85]">
                  ¿Quieres abrir la ventana de intensidad (1 a 5 ★) de este sabor?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const el = editingFlavorModal.triggerElement;
                    setEditingFlavorModal(null);
                    triggerNormalClickOnElement(el);
                  }}
                  className="text-xs font-black text-[#00897B] hover:text-[#01374C] underline cursor-pointer"
                >
                  Abrir ventana de intensidad →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: EDICIÓN RÁPIDA DE MÉTODO DE PREPARACIÓN (MAESTRO TOSTADOR)
          ===================================================================== */}
      {editingMethodModal && (
        <div
          onClick={() => setEditingMethodModal(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E8EDF1] space-y-3.5 text-[#01374C]"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E8EDF1]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00897B]">
                  Receta y Ficha Técnica • Método de Preparación
                </span>
                <h3 className="text-base font-black text-[#01374C]">
                  Editar Método: {editingMethodModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMethodModal(null)}
                className="w-8 h-8 rounded-full bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Nombre del Método
                </label>
                <input
                  type="text"
                  value={editingMethodModal.name}
                  onChange={(e) =>
                    setEditingMethodModal({
                      ...editingMethodModal,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-sm font-black text-[#01374C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Descripción Corta (bajo el icono)
                </label>
                <input
                  type="text"
                  value={editingMethodModal.shortDesc}
                  onChange={(e) =>
                    setEditingMethodModal({
                      ...editingMethodModal,
                      shortDesc: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Proporción Sugerida (Café / Agua)
                </label>
                <input
                  type="text"
                  value={editingMethodModal.ratio}
                  onChange={(e) =>
                    setEditingMethodModal({
                      ...editingMethodModal,
                      ratio: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#01374C] mb-1">
                  Molienda Recomendada
                </label>
                <input
                  type="text"
                  value={editingMethodModal.grind}
                  onChange={(e) =>
                    setEditingMethodModal({
                      ...editingMethodModal,
                      grind: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#01374C] mb-1">
                Tiempo y Temperatura
              </label>
              <input
                type="text"
                value={editingMethodModal.time}
                onChange={(e) =>
                  setEditingMethodModal({
                    ...editingMethodModal,
                    time: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#01374C] mb-1">
                Puntos de "¿Cómo se siente en tu taza?" (1 por línea):
              </label>
              <textarea
                rows={3}
                value={editingMethodModal.highlightsText}
                onChange={(e) =>
                  setEditingMethodModal({
                    ...editingMethodModal,
                    highlightsText: e.target.value,
                  })
                }
                className="w-full p-2.5 rounded-xl bg-[#F5F8FA] border border-[#DDC1AB] text-xs text-[#01374C]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBrewMethodOverride(editingMethodModal.methodId, null);
                  setEditingMethodModal(null);
                }}
                className="px-3 py-2 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Método Original</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const lines = editingMethodModal.highlightsText
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean);
                  setBrewMethodOverride(editingMethodModal.methodId, {
                    name: editingMethodModal.name.trim(),
                    shortDesc: editingMethodModal.shortDesc.trim(),
                    idealProfile: editingMethodModal.idealProfile.trim(),
                    ratio: editingMethodModal.ratio.trim(),
                    grind: editingMethodModal.grind.trim(),
                    time: editingMethodModal.time.trim(),
                    highlights: lines,
                  });
                  setEditingMethodModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4 text-[#00D9B4]" />
                <span>Guardar Método</span>
              </button>
            </div>

            {editingMethodModal.triggerElement && (
              <div className="pt-3 border-t border-[#E8EDF1] flex items-center justify-between">
                <span className="text-[11px] text-[#6A7B85]">
                  ¿Quieres seleccionar este método en pantalla para ver su ficha?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const el = editingMethodModal.triggerElement;
                    setEditingMethodModal(null);
                    triggerNormalClickOnElement(el);
                  }}
                  className="text-xs font-black text-[#00897B] hover:text-[#01374C] underline cursor-pointer"
                >
                  Seleccionar método en pantalla →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
