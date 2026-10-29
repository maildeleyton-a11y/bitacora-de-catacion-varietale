/**
 * ============================================================================
 * PESTAÑA DE GESTIÓN DE TEXTOS, RUEDA SCA Y MÉTODOS (ADMIN UI CMS TAB)
 * ============================================================================
 * Permite al Administrador y al Maestro Tostador:
 * 1. Modificar cualquier texto de cajas, formularios, placeholders, títulos
 *    y botones organizado por pantallas o mediante buscador.
 * 2. Ajustar los 85+ descriptores de la Rueda de Sabores SCA (nombre,
 *    referencia sensorial, subcategoría, guía/explicación de cata y color)
 *    así como las descripciones de las 9 Familias Macro.
 * 3. Ajustar las 11 fichas de los Métodos de Preparación (nombre, ratio,
 *    molienda, tiempo y notas de perfil en taza).
 * 4. Lanzar en 1 clic el Modo Edición Visual en Vivo directamente sobre la App.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Edit3,
  Search,
  RotateCcw,
  Check,
  Sparkles,
  Coffee,
  MousePointerClick,
  Plus,
  Filter,
  Info,
  X,
} from "lucide-react";
import {
  UI_TEXT_CATALOG,
  UiTextCatalogItem,
  getUiCmsState,
  setUiTextOverride,
  setFlavorDescriptorOverride,
  setMacroFamilyOverride,
  setBrewMethodOverride,
  resetAllUiCmsToFactory,
  isProtectedOrDynamicText,
  DEFAULT_FLAVOR_DESCRIPTORS,
  DEFAULT_BREW_METHODS,
  DEFAULT_MACRO_THEMES,
} from "../data/uiCmsStore";
import { FLAVOR_DESCRIPTORS } from "../data/wheelDescriptors";
import { BREW_METHODS, MACRO_THEMES, normalizeMacro } from "../data/coffeeData";

const InfoHint: React.FC<{ title: string; text: string }> = ({ title, text }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={`Información sobre: ${title}`}
        aria-label={`Información sobre ${title}`}
        className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-[#EBFBFA] hover:bg-[#00D9B4]/30 text-[#00897B] border border-[#00D9B4]/40 transition-colors cursor-pointer shrink-0"
      >
        <Info className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 sm:left-auto sm:right-0 top-7 z-40 w-68 sm:w-76 p-3.5 rounded-2xl bg-[#01374C] text-white shadow-xl border border-[#00D9B4]/40 text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#00D9B4]">
              {title}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-white/95 leading-relaxed font-normal">{text}</p>
        </div>
      )}
    </div>
  );
};

interface AdminUiCmsTabProps {
  /** Activa el Modo Edición Visual en Vivo y lleva al Admin a la App */
  onLaunchVisualEditMode: () => void;
}

type CmsSubTab = "interface_texts" | "flavor_wheel" | "brew_methods";

const CANONICAL_MACROS = [
  "Frutal",
  "Floral",
  "Dulce",
  "Frutos secos / cacao",
  "Especias",
  "Tostado",
  "Verde / vegetal",
  "Ácido / fermentado",
  "Otros",
];

export const AdminUiCmsTab: React.FC<AdminUiCmsTabProps> = ({
  onLaunchVisualEditMode,
}) => {
  const [subTab, setSubTab] = useState<CmsSubTab>("interface_texts");
  const [cmsTick, setCmsTick] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  // Filtros para Sub-pestaña 1: Textos de la Interfaz
  const [textSearch, setTextSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [onlyModifiedTexts, setOnlyModifiedTexts] = useState(false);
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});

  // Nuevo reemplazo manual rápido
  const [newOriginalPhrase, setNewOriginalPhrase] = useState("");
  const [newCustomPhrase, setNewCustomPhrase] = useState("");

  // Filtros para Sub-pestaña 2: Rueda de Sabores SCA (Maestro Tostador)
  const [flavorSearch, setFlavorSearch] = useState("");
  const [flavorMacroFilter, setFlavorMacroFilter] = useState<string>("all");
  const [onlyModifiedFlavors, setOnlyModifiedFlavors] = useState(false);
  const [editingDescriptorId, setEditingDescriptorId] = useState<string | null>(null);
  const [flavorDraft, setFlavorDraft] = useState<{
    name: string;
    reference: string;
    subcategory: string;
    hint: string;
    color: string;
  } | null>(null);

  // Edición de descripciones de las 9 Familias Macro
  const [macroDrafts, setMacroDrafts] = useState<Record<string, string>>({});

  // Edición de Sub-pestaña 3: Métodos de Preparación
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [methodDraft, setMethodDraft] = useState<{
    name: string;
    shortDesc: string;
    idealProfile: string;
    ratio: string;
    grind: string;
    time: string;
    highlightsText: string;
  } | null>(null);

  useEffect(() => {
    const handleUpdate = () => setCmsTick((t) => t + 1);
    window.addEventListener("varietale-ui-cms-updated", handleUpdate);
    return () => window.removeEventListener("varietale-ui-cms-updated", handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const cmsState = useMemo(() => getUiCmsState(), [cmsTick]);

  // Combinar catálogo estructurado + textos descubiertos en vivo
  const allTextItems: UiTextCatalogItem[] = useMemo(() => {
    const existingDefaults = new Set(
      UI_TEXT_CATALOG.map((i) => i.defaultText.trim())
    );
    const extra = cmsState.discoveredItems.filter(
      (d) => !existingDefaults.has(d.defaultText.trim())
    );
    return [...extra, ...UI_TEXT_CATALOG];
  }, [cmsState.discoveredItems]);

  const filteredTextItems = useMemo(() => {
    return allTextItems.filter((item) => {
      const orig = item.defaultText.trim();
      const customVal = cmsState.textOverridesByOriginal[orig];
      const isModified = customVal !== undefined && customVal !== orig;

      if (onlyModifiedTexts && !isModified) return false;
      if (sectionFilter !== "all" && item.section !== sectionFilter) return false;
      if (typeFilter !== "all" && item.elementType !== typeFilter) return false;

      if (textSearch.trim()) {
        const q = textSearch.toLowerCase();
        const matchLabel = item.label.toLowerCase().includes(q);
        const matchOrig = orig.toLowerCase().includes(q);
        const matchCustom = (customVal || "").toLowerCase().includes(q);
        return matchLabel || matchOrig || matchCustom;
      }
      return true;
    });
  }, [
    allTextItems,
    cmsState.textOverridesByOriginal,
    onlyModifiedTexts,
    sectionFilter,
    typeFilter,
    textSearch,
  ]);

  // Filtrado de los 85+ Descriptores de la Rueda SCA
  const filteredDescriptors = useMemo(() => {
    return FLAVOR_DESCRIPTORS.filter((desc) => {
      const isMod = Boolean(cmsState.flavorOverrides[desc.id]);
      if (onlyModifiedFlavors && !isMod) return false;

      if (
        flavorMacroFilter !== "all" &&
        normalizeMacro(desc.macro) !== normalizeMacro(flavorMacroFilter)
      ) {
        return false;
      }

      if (flavorSearch.trim()) {
        const q = flavorSearch.toLowerCase();
        return (
          desc.name.toLowerCase().includes(q) ||
          (desc.reference || "").toLowerCase().includes(q) ||
          desc.subcategory.toLowerCase().includes(q) ||
          (desc.hint || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    cmsState.flavorOverrides,
    onlyModifiedFlavors,
    flavorMacroFilter,
    flavorSearch,
    cmsTick,
  ]);

  const modifiedTextsCount = Object.keys(cmsState.textOverridesByOriginal).length;
  const modifiedFlavorsCount =
    Object.keys(cmsState.flavorOverrides).length +
    Object.keys(cmsState.macroOverrides).length;
  const modifiedMethodsCount = Object.keys(cmsState.methodOverrides).length;

  return (
    <div className="space-y-5">
      {/* Notificación flotante de guardado */}
      {toastMsg && (
        <div className="bg-[#01374C] text-white px-4 py-3 rounded-2xl shadow-md border border-[#00D9B4]/40 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#00D9B4]" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Cabecera Principal + Lanzador del Modo Edición Visual en Vivo */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E8EDF1]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EBFBFA] text-[#00897B] border border-[#00D9B4]/40">
              Personalización Sin Código • Textos y Maestro Tostador
            </span>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-lg sm:text-xl font-black text-[#01374C]">
                Editor de Textos de Interfaz, Pop-ups, Rueda SCA y Métodos
              </h2>
              <InfoHint
                title="Editor de Textos y Sabores"
                text="Edita textos de cajas, formularios, botones, pop-ups y los 85 sabores de la Rueda SCA. Por seguridad, el pie Mr. Bite / Varietale, los contadores dinámicos y las reseñas de usuarios están protegidos."
              />
            </div>
            <p className="text-xs sm:text-sm text-[#6A7B85] mt-0.5">
              Modifica cualquier texto de cajas, formularios, botones o pop-ups, o ajusta los sabores y guías de cata del Maestro Tostador.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onLaunchVisualEditMode}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-md border border-[#00D9B4]/40"
            >
              <MousePointerClick className="w-4 h-4 text-[#00D9B4]" />
              <span>🎯 Editar en Vivo sobre la App</span>
            </button>

            {(modifiedTextsCount > 0 ||
              modifiedFlavorsCount > 0 ||
              modifiedMethodsCount > 0) && (
              <button
                type="button"
                onClick={() => setConfirmResetAll(true)}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Todo de Fábrica</span>
              </button>
            )}
          </div>
        </div>

        {/* Selector de las 3 Áreas de Edición */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setSubTab("interface_texts")}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              subTab === "interface_texts"
                ? "bg-[#01374C] text-white border-[#01374C] shadow-xs"
                : "bg-[#FAF6F2]/70 text-[#01374C] border-[#DDC1AB] hover:bg-[#FAF6F2]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Edit3
                className={`w-5 h-5 ${
                  subTab === "interface_texts" ? "text-[#00D9B4]" : "text-[#01374C]"
                }`}
              />
              <div>
                <div className="text-xs sm:text-sm font-black">
                  1. Textos, Cajas y Botones
                </div>
                <div
                  className={`text-[11px] ${
                    subTab === "interface_texts" ? "text-white/80" : "text-[#6A7B85]"
                  }`}
                >
                  Formularios, títulos y ayudas
                </div>
              </div>
            </div>
            <span
              data-cms-locked="true"
              className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                subTab === "interface_texts"
                  ? "bg-[#00D9B4] text-[#01374C]"
                  : "bg-white text-[#01374C] border border-[#DDC1AB]"
              }`}
            >
              {modifiedTextsCount} mod.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("flavor_wheel")}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              subTab === "flavor_wheel"
                ? "bg-[#01374C] text-white border-[#01374C] shadow-xs"
                : "bg-[#FAF6F2]/70 text-[#01374C] border-[#DDC1AB] hover:bg-[#FAF6F2]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles
                className={`w-5 h-5 ${
                  subTab === "flavor_wheel" ? "text-[#00D9B4]" : "text-[#01374C]"
                }`}
              />
              <div>
                <div className="text-xs sm:text-sm font-black">
                  2. Rueda de Sabores SCA
                </div>
                <div
                  className={`text-[11px] ${
                    subTab === "flavor_wheel" ? "text-white/80" : "text-[#6A7B85]"
                  }`}
                >
                  Ajustes del Maestro Tostador (85 notas)
                </div>
              </div>
            </div>
            <span
              data-cms-locked="true"
              className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                subTab === "flavor_wheel"
                  ? "bg-[#00D9B4] text-[#01374C]"
                  : "bg-white text-[#01374C] border border-[#DDC1AB]"
              }`}
            >
              {modifiedFlavorsCount} mod.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("brew_methods")}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              subTab === "brew_methods"
                ? "bg-[#01374C] text-white border-[#01374C] shadow-xs"
                : "bg-[#FAF6F2]/70 text-[#01374C] border-[#DDC1AB] hover:bg-[#FAF6F2]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Coffee
                className={`w-5 h-5 ${
                  subTab === "brew_methods" ? "text-[#00D9B4]" : "text-[#01374C]"
                }`}
              />
              <div>
                <div className="text-xs sm:text-sm font-black">
                  3. Métodos de Preparación
                </div>
                <div
                  className={`text-[11px] ${
                    subTab === "brew_methods" ? "text-white/80" : "text-[#6A7B85]"
                  }`}
                >
                  Ratios, moliendas y perfil (11 métodos)
                </div>
              </div>
            </div>
            <span
              data-cms-locked="true"
              className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                subTab === "brew_methods"
                  ? "bg-[#00D9B4] text-[#01374C]"
                  : "bg-white text-[#01374C] border border-[#DDC1AB]"
              }`}
            >
              {modifiedMethodsCount} mod.
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-PESTAÑA 1: TEXTOS DE LA INTERFAZ (CAJAS, FORMULARIOS Y BOTONES)
          ===================================================================== */}
      {subTab === "interface_texts" && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-5">
          {/* Barra de Filtros y Buscador */}
          <div className="p-4 rounded-2xl bg-[#F5F8FA] border border-[#E8EDF1] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  placeholder="Buscar texto, botón, etiqueta de formulario o pantalla..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs sm:text-sm text-[#01374C]"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                >
                  <option value="all">Todas las pantallas y pop-ups</option>
                  <option value="auth">Acceso y Registro (Login)</option>
                  <option value="home">Pantalla de Inicio (Home)</option>
                  <option value="registration">Paso 1: Café y Preparación</option>
                  <option value="wheel">Paso 2: Rueda y Calificación</option>
                  <option value="logbook">Mi Bitácora y Comparador</option>
                  <option value="popups">Pop-ups y Ventanas Emergentes</option>
                  <option value="admin_panel">Panel de Administración</option>
                  <option value="live_custom">Editados en Vivo</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8EDF1] text-xs font-bold text-[#01374C]"
                >
                  <option value="all">Todos los elementos</option>
                  <option value="boton">Botones y Pestañas</option>
                  <option value="formulario">Etiquetas de Formulario</option>
                  <option value="placeholder">Placeholders (Ayudas internas)</option>
                  <option value="caja">Cajas e Instrucciones</option>
                  <option value="titulo">Títulos y Encabezados</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-extrabold text-[#01374C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyModifiedTexts}
                  onChange={(e) => setOnlyModifiedTexts(e.target.checked)}
                  className="w-4 h-4 accent-[#01374C]"
                />
                <span>
                  <span>Mostrar únicamente textos modificados</span>{" "}
                  <span data-cms-locked="true" className="tabular-nums">({modifiedTextsCount})</span>
                </span>
              </label>

              <span className="text-xs text-[#6A7B85]">
                <span>Mostrando</span>{" "}
                <strong data-cms-locked="true" className="tabular-nums">{filteredTextItems.length}</strong>{" "}
                <span>elementos editables •</span>{" "}
                <strong className="text-[#01374C]">
                  🔒 Protegidos: Pie Mr. Bite / Varietale, contadores dinámicos y reseñas de BD
                </strong>
              </span>
            </div>
          </div>

          {/* Agregar reemplazo de cualquier otra frase exacta de la interfaz */}
          <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#01374C]">
              <Plus className="w-4 h-4 text-[#00897B]" />
              <span>
                ¿Quieres reemplazar cualquier otro texto puntual de la app o pop-ups? Escríbelo aquí (o usa "Editar en Vivo sobre la App"):
              </span>
            </div>
            <div data-cms-locked="true" className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <input
                type="text"
                value={newOriginalPhrase}
                onChange={(e) => setNewOriginalPhrase(e.target.value)}
                placeholder="Texto actual exacto en la app (ej: Cerrar)"
                className="md:col-span-5 px-3 py-2 rounded-xl bg-white border border-[#DDC1AB] text-xs font-semibold text-[#01374C]"
              />
              <input
                type="text"
                value={newCustomPhrase}
                onChange={(e) => setNewCustomPhrase(e.target.value)}
                placeholder="Nuevo texto que deseas mostrar (ej: Volver al inicio)"
                className="md:col-span-5 px-3 py-2 rounded-xl bg-white border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newOriginalPhrase.trim() || !newCustomPhrase.trim()) return;
                  if (isProtectedOrDynamicText(newOriginalPhrase.trim())) {
                    showToast(
                      "🔒 Ese elemento está protegido (autoría Mr. Bite / Varietale o contador automático)."
                    );
                    return;
                  }
                  setUiTextOverride(
                    newOriginalPhrase.trim(),
                    newCustomPhrase.trim()
                  );
                  setNewOriginalPhrase("");
                  setNewCustomPhrase("");
                  showToast("¡Reemplazo de texto aplicado en toda la app!");
                }}
                className="md:col-span-2 py-2 px-3 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-black cursor-pointer"
              >
                Aplicar Texto
              </button>
            </div>
          </div>

          {/* Listado de Textos Editables (Bloqueado para que los textos "Original de fábrica" nunca muten el DOM propio) */}
          <div data-cms-locked="true" className="space-y-3">
            {filteredTextItems.map((item) => {
              const orig = item.defaultText.trim();
              const savedCustom = cmsState.textOverridesByOriginal[orig];
              const isModified = savedCustom !== undefined && savedCustom !== orig;
              const currentVal =
                draftTexts[item.id] !== undefined
                  ? draftTexts[item.id]
                  : savedCustom !== undefined
                  ? savedCustom
                  : item.defaultText;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isModified
                      ? "bg-[#EBFBFA]/50 border-[#00D9B4]"
                      : "bg-[#F5F8FA]/70 border-[#E8EDF1]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#01374C] text-[#00D9B4]">
                        {item.sectionLabel}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-[#DDC1AB] text-[#01374C]">
                        {item.elementType}
                      </span>
                      <strong className="text-xs sm:text-sm font-black text-[#01374C]">
                        {item.label}
                      </strong>
                    </div>

                    {isModified && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#00D9B4] text-[#01374C]">
                        ✓ Personalizado
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-[#6A7B85] mb-2">
                    Original de fábrica:{" "}
                    <span className="font-semibold text-[#52646E]">
                      "{item.defaultText}"
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) =>
                        setDraftTexts({
                          ...draftTexts,
                          [item.id]: e.target.value,
                        })
                      }
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#DDC1AB] text-xs sm:text-sm font-bold text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setUiTextOverride(orig, currentVal, {
                            label: item.label,
                            elementType: item.elementType,
                          });
                          showToast(`Texto "${item.label}" actualizado.`);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-[#00D9B4]" />
                        <span>Guardar</span>
                      </button>

                      {isModified && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextDrafts = { ...draftTexts };
                            delete nextDrafts[item.id];
                            setDraftTexts(nextDrafts);
                            setUiTextOverride(orig, orig);
                            showToast(`Texto "${item.label}" restaurado al original.`);
                          }}
                          className="px-2.5 py-2 rounded-xl bg-white hover:bg-[#FAF6F2] text-[#01374C] border border-[#DDC1AB] text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Restaurar texto original"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Original</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-PESTAÑA 2: RUEDA DE SABORES SCA (MAESTRO TOSTADOR - 85 SABORES)
          ===================================================================== */}
      {subTab === "flavor_wheel" && (
        <div className="space-y-5">
          {/* Bloque A: Las 9 Familias Principales de la Rueda */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#01374C]">
                  Descripciones de las 9 Familias Principales de la Rueda SCA
                </h3>
                <InfoHint
                  title="9 Familias Principales SCA"
                  text="Modifica el subtítulo pedagógico que aparece bajo cada una de las 9 familias al seleccionarla en la rueda de sabores."
                />
              </div>
              <p className="text-xs text-[#6A7B85]">
                Ajusta el subtítulo descriptivo que aparece al seleccionar cada familia en la rueda.
              </p>
            </div>

            <div data-cms-locked="true" className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CANONICAL_MACROS.map((macroKey) => {
                const theme = (MACRO_THEMES as Record<string, any>)[macroKey];
                const def = DEFAULT_MACRO_THEMES[macroKey];
                const isMod = Boolean(cmsState.macroOverrides[macroKey]);
                const val =
                  macroDrafts[macroKey] !== undefined
                    ? macroDrafts[macroKey]
                    : theme?.description || "";

                return (
                  <div
                    key={macroKey}
                    className="p-3.5 rounded-2xl bg-[#FAF6F2]/70 border border-[#DDC1AB]/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: theme?.color }}
                        />
                        <strong className="text-xs sm:text-sm font-black text-[#01374C]">
                          {macroKey}
                        </strong>
                      </div>
                      {isMod && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...macroDrafts };
                            delete copy[macroKey];
                            setMacroDrafts(copy);
                            setMacroFamilyOverride(macroKey, null);
                            showToast(`Familia ${macroKey} restaurada.`);
                          }}
                          className="text-[11px] font-bold text-rose-600 underline cursor-pointer"
                        >
                          Restaurar
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setMacroDrafts({
                          ...macroDrafts,
                          [macroKey]: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs text-[#01374C]"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#6A7B85] truncate max-w-[180px]">
                        Orig: {def?.description}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMacroFamilyOverride(macroKey, { description: val });
                          showToast(`Descripción de ${macroKey} guardada.`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#01374C] text-white text-[11px] font-black cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloque B: Los 85+ Descriptores de Sabor y Pistas del Maestro Tostador */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E8EDF1]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-[#01374C]">
                    Descriptores de Sabor y Notas del Maestro Tostador (
                    {filteredDescriptors.length})
                  </h3>
                  <InfoHint
                    title="85 Descriptores del Maestro Tostador"
                    text="Permite al Maestro Tostador ajustar el nombre de cualquier sabor, su referencia sensorial en el botón, su subcategoría, color y la guía pedagógica de cata."
                  />
                </div>
                <p className="text-xs text-[#6A7B85]">
                  Modifica el nombre del sabor, su referencia sensorial, subcategoría, color o la explicación de cata que guía al usuario.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-extrabold text-[#01374C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyModifiedFlavors}
                  onChange={(e) => setOnlyModifiedFlavors(e.target.checked)}
                  className="w-4 h-4 accent-[#01374C]"
                />
                <span>Solo sabores modificados</span>
              </label>
            </div>

            {/* Filtros por Familia SCA + Buscador */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFlavorMacroFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                  flavorMacroFilter === "all"
                    ? "bg-[#01374C] text-[#00D9B4]"
                    : "bg-[#F5F8FA] text-[#52646E] hover:bg-[#E8EDF1]"
                }`}
              >
                Todas las familias ({FLAVOR_DESCRIPTORS.length})
              </button>
              {CANONICAL_MACROS.map((m) => {
                const active = flavorMacroFilter === m;
                const theme = (MACRO_THEMES as Record<string, any>)[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFlavorMacroFilter(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? "bg-[#01374C] text-white"
                        : "bg-[#F5F8FA] text-[#01374C] hover:bg-[#E8EDF1]"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: theme?.color }}
                    />
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#889DA7] absolute left-3.5 top-3" />
              <input
                type="text"
                value={flavorSearch}
                onChange={(e) => setFlavorSearch(e.target.value)}
                placeholder="Buscar sabor por nombre (ej. Mora, Panela, Jazmín), subcategoría o palabra en la guía..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F5F8FA] border border-[#E8EDF1] text-xs sm:text-sm text-[#01374C]"
              />
            </div>

            {/* Grilla de Sabores */}
            <div data-cms-locked="true" className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredDescriptors.map((desc) => {
                const isEditing = editingDescriptorId === desc.id;
                const isMod = Boolean(cmsState.flavorOverrides[desc.id]);
                const def = DEFAULT_FLAVOR_DESCRIPTORS.find((d) => d.id === desc.id);

                return (
                  <div
                    key={desc.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isMod
                        ? "bg-[#EBFBFA]/50 border-[#00D9B4]"
                        : "bg-[#FAF6F2]/60 border-[#E8EDF1]"
                    }`}
                  >
                    {!isEditing ? (
                      <>
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full shrink-0 border border-black/15"
                                style={{ backgroundColor: desc.color }}
                              />
                              <div>
                                <span className="text-[10px] font-black uppercase text-[#6A7B85] block">
                                  {desc.macro} • {desc.subcategory}
                                </span>
                                <h4 className="text-sm sm:text-base font-black text-[#01374C]">
                                  {desc.name}{" "}
                                  {desc.reference && desc.reference !== desc.name && (
                                    <span className="text-xs font-bold text-[#00897B]">
                                      (Ref: {desc.reference})
                                    </span>
                                  )}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isMod && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00D9B4] text-[#01374C]">
                                  Editado
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDescriptorId(desc.id);
                                  setFlavorDraft({
                                    name: desc.name,
                                    reference: desc.reference || desc.name,
                                    subcategory: desc.subcategory,
                                    hint: desc.hint || "",
                                    color: desc.color,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#01374C] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3 text-[#00D9B4]" />
                                <span>Editar</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-[#52646E] italic bg-white p-2.5 rounded-xl border border-[#E8EDF1] leading-relaxed">
                            "{desc.hint}"
                          </p>
                        </div>

                        {isMod && def && (
                          <div className="flex items-center justify-between text-[11px] text-[#6A7B85] pt-1 border-t border-[#DDC1AB]/50">
                            <span>Original: {def.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFlavorDescriptorOverride(desc.id, null);
                                showToast(`Sabor "${def.name}" restaurado al original.`);
                              }}
                              className="font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurar original</span>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      flavorDraft && (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                                Nombre del Sabor
                              </label>
                              <input
                                type="text"
                                value={flavorDraft.name}
                                onChange={(e) =>
                                  setFlavorDraft({
                                    ...flavorDraft,
                                    name: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-black text-[#01374C]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                                Referencia Sensorial
                              </label>
                              <input
                                type="text"
                                value={flavorDraft.reference}
                                onChange={(e) =>
                                  setFlavorDraft({
                                    ...flavorDraft,
                                    reference: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                                Subcategoría
                              </label>
                              <input
                                type="text"
                                value={flavorDraft.subcategory}
                                onChange={(e) =>
                                  setFlavorDraft({
                                    ...flavorDraft,
                                    subcategory: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                                Color (HEX)
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={flavorDraft.color}
                                  onChange={(e) =>
                                    setFlavorDraft({
                                      ...flavorDraft,
                                      color: e.target.value,
                                    })
                                  }
                                  className="w-7 h-7 rounded border border-[#DDC1AB] cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={flavorDraft.color}
                                  onChange={(e) =>
                                    setFlavorDraft({
                                      ...flavorDraft,
                                      color: e.target.value,
                                    })
                                  }
                                  className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-mono text-[#01374C]"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                              Guía / Explicación de Cata del Maestro Tostador
                            </label>
                            <textarea
                              rows={3}
                              value={flavorDraft.hint}
                              onChange={(e) =>
                                setFlavorDraft({
                                  ...flavorDraft,
                                  hint: e.target.value,
                                })
                              }
                              className="w-full p-2.5 rounded-lg bg-white border border-[#DDC1AB] text-xs text-[#01374C]"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDescriptorId(null);
                                setFlavorDraft(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#52646E] cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFlavorDescriptorOverride(desc.id, {
                                  name: flavorDraft.name.trim(),
                                  reference: flavorDraft.reference.trim(),
                                  subcategory: flavorDraft.subcategory.trim(),
                                  hint: flavorDraft.hint.trim(),
                                  color: flavorDraft.color.trim(),
                                });
                                setEditingDescriptorId(null);
                                setFlavorDraft(null);
                                showToast(
                                  `Sabor "${flavorDraft.name}" actualizado en la Rueda SCA.`
                                );
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-[#01374C] text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 text-[#00D9B4]" />
                              <span>Guardar Sabor</span>
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-PESTAÑA 3: FICHAS DE LOS 11 MÉTODOS DE PREPARACIÓN
          ===================================================================== */}
      {subTab === "brew_methods" && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EDF1] shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#01374C]">
                Fichas Técnicas y Pedagógicas de los 11 Métodos de Preparación
              </h3>
              <InfoHint
                title="11 Métodos de Preparación"
                text="Ajusta el nombre, descripción corta, proporción agua/café, molienda recomendada, tiempo de extracción y notas de impacto en taza de cada método."
              />
            </div>
            <p className="text-xs text-[#6A7B85]">
              Ajusta las recetas recomendadas (proporción agua/café, molienda, tiempo y notas de impacto en taza).
            </p>
          </div>

          <div data-cms-locked="true" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BREW_METHODS.map((method) => {
              const isEditing = editingMethodId === method.id;
              const isMod = Boolean(cmsState.methodOverrides[method.id]);
              const def = DEFAULT_BREW_METHODS.find((m) => m.id === method.id);

              return (
                <div
                  key={method.id}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isMod
                      ? "bg-[#EBFBFA]/50 border-[#00D9B4]"
                      : "bg-[#FAF6F2]/70 border-[#DDC1AB]"
                  }`}
                >
                  {!isEditing ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-black text-[#01374C]">
                            {method.name}
                          </h4>
                          <span className="text-xs font-bold text-[#00897B]">
                            {method.shortDesc}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isMod && (
                            <button
                              type="button"
                              onClick={() => {
                                setBrewMethodOverride(method.id, null);
                                showToast(
                                  `Método "${def?.name || method.name}" restaurado.`
                                );
                              }}
                              className="px-2 py-1 rounded-lg bg-white border border-[#DDC1AB] text-[11px] font-bold text-rose-600 cursor-pointer"
                            >
                              Restaurar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMethodId(method.id);
                              setMethodDraft({
                                name: method.name,
                                shortDesc: method.shortDesc,
                                idealProfile: method.idealProfile,
                                ratio: method.ratio || "",
                                grind: method.grind || "",
                                time: method.time || "",
                                highlightsText: (method.highlights || []).join("\n"),
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#01374C] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-[#00D9B4]" />
                            <span>Editar Ficha</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-xl border border-[#E8EDF1]">
                        <div>
                          <span className="text-[10px] font-bold text-[#6A7B85] block">
                            Proporción:
                          </span>
                          <strong className="text-[#01374C]">{method.ratio}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#6A7B85] block">
                            Molienda:
                          </span>
                          <strong className="text-[#01374C]">{method.grind}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#6A7B85] block">
                            Tiempo:
                          </span>
                          <strong className="text-[#01374C]">{method.time}</strong>
                        </div>
                      </div>

                      {method.highlights && method.highlights.length > 0 && (
                        <ul className="text-xs text-[#4A5D68] space-y-1 pl-2">
                          {method.highlights.map((h, i) => (
                            <li key={i}>• {h}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    methodDraft && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                              Nombre del Método
                            </label>
                            <input
                              type="text"
                              value={methodDraft.name}
                              onChange={(e) =>
                                setMethodDraft({ ...methodDraft, name: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-black text-[#01374C]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                              Descripción Corta
                            </label>
                            <input
                              type="text"
                              value={methodDraft.shortDesc}
                              onChange={(e) =>
                                setMethodDraft({
                                  ...methodDraft,
                                  shortDesc: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                              Proporción (Ratio)
                            </label>
                            <input
                              type="text"
                              value={methodDraft.ratio}
                              onChange={(e) =>
                                setMethodDraft({ ...methodDraft, ratio: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                              Molienda Recomendada
                            </label>
                            <input
                              type="text"
                              value={methodDraft.grind}
                              onChange={(e) =>
                                setMethodDraft({ ...methodDraft, grind: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                            Tiempo y Temperatura
                          </label>
                          <input
                            type="text"
                            value={methodDraft.time}
                            onChange={(e) =>
                              setMethodDraft({ ...methodDraft, time: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#01374C]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-[#01374C] mb-0.5">
                            Puntos Clave en Taza (1 por línea)
                          </label>
                          <textarea
                            rows={3}
                            value={methodDraft.highlightsText}
                            onChange={(e) =>
                              setMethodDraft({
                                ...methodDraft,
                                highlightsText: e.target.value,
                              })
                            }
                            className="w-full p-2 rounded-lg bg-white border border-[#DDC1AB] text-xs text-[#01374C]"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMethodId(null);
                              setMethodDraft(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#DDC1AB] text-xs font-bold text-[#52646E] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const lines = methodDraft.highlightsText
                                .split("\n")
                                .map((l) => l.trim())
                                .filter(Boolean);
                              setBrewMethodOverride(method.id, {
                                name: methodDraft.name.trim(),
                                shortDesc: methodDraft.shortDesc.trim(),
                                idealProfile: methodDraft.idealProfile.trim(),
                                ratio: methodDraft.ratio.trim(),
                                grind: methodDraft.grind.trim(),
                                time: methodDraft.time.trim(),
                                highlights: lines,
                              });
                              setEditingMethodId(null);
                              setMethodDraft(null);
                              showToast(
                                `Ficha del método "${methodDraft.name}" actualizada.`
                              );
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-[#01374C] text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-[#00D9B4]" />
                            <span>Guardar Método</span>
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Restaurar Todo de Fábrica */}
      {confirmResetAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#E8EDF1] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-[#01374C]">
              ¿Restaurar todos los textos y sabores de fábrica?
            </h3>
            <p className="text-xs text-[#52646E] leading-relaxed">
              Se revertirán los cambios manuales en textos de la interfaz, descriptores de la Rueda SCA y métodos de preparación a su versión original.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetAll(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF6F2] text-[#01374C] font-bold text-xs border border-[#DDC1AB] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllUiCmsToFactory();
                  setDraftTexts({});
                  setMacroDrafts({});
                  setConfirmResetAll(false);
                  showToast("Todos los textos y sabores volvieron a su estado original.");
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer"
              >
                Sí, restaurar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
