/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN (LOGBOOK SCREEN) - HISTORIAL Y COMPARADOR
 * ============================================================================
 * Pantalla que permite al catador:
 * 1. Historial: Explorar todas sus catas registradas con ficha sensorial,
 *    descriptores, notas y opción de eliminación con confirmación modal.
 * 2. Comparador: Comparar dos cataciones lado a lado en un gráfico de radar superpuesto.
 * 3. Exploración: Ver el perfil sensorial acumulado y recomendaciones de cafés.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Plus,
  GitCompare,
  Compass,
  Star,
  Calendar,
  Layers,
  ShoppingBag,
  ExternalLink,
  Trash2,
  Share2,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Edit3,
} from "lucide-react";
import { TastingRecord, SensorySpiderProfile } from "../types";
import { RadarChart, RADAR_AXES } from "./RadarChart";
import { BrewMethodIcon } from "./BrewMethodIcons";
import { BREW_METHODS, computeSensorySpiderProfile } from "../data/coffeeData";
import { BrandFooter } from "./BrandFooter";

interface LogbookScreenProps {
  /** Lista de catas del usuario activo */
  tastings: TastingRecord[];
  /** Acción para iniciar una nueva cata */
  onStartNewCata: () => void;
  /** Acción para editar/modificar una cata existente */
  onEditCata?: (cata: TastingRecord) => void;
  /** Acción para eliminar una cata por su ID */
  onDeleteCata: (id: string) => void;
  /** Regresa a la pantalla de inicio */
  onBackToHome: () => void;
}

export const LogbookScreen: React.FC<LogbookScreenProps> = ({
  tastings,
  onStartNewCata,
  onEditCata,
  onDeleteCata,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<"historial" | "comparador" | "exploracion">("historial");

  // Asegurar que la bitácora siempre cargue en la parte superior y al cambiar de pestaña
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);
  const [expandedCataId, setExpandedCataId] = useState<string | null>(null);
  const [cataToDelete, setCataToDelete] = useState<TastingRecord | null>(null);

  // Comparison State
  const [compCataAId, setCompCataAId] = useState<string>(tastings[0]?.id || "");
  const [compCataBId, setCompCataBId] = useState<string>(tastings[1]?.id || tastings[0]?.id || "");

  // Detect candidates for comparison (e.g. same coffee with different methods)
  const sameCoffeeMultiMethods = useMemo(() => {
    const coffeeGroups: Record<string, TastingRecord[]> = {};
    tastings.forEach((t) => {
      if (!coffeeGroups[t.coffeeName]) coffeeGroups[t.coffeeName] = [];
      coffeeGroups[t.coffeeName].push(t);
    });

    const candidates: { coffeeName: string; records: TastingRecord[] }[] = [];
    Object.entries(coffeeGroups).forEach(([coffeeName, records]) => {
      if (records.length >= 2) {
        candidates.push({ coffeeName, records });
      }
    });
    return candidates;
  }, [tastings]);

  // Compute cumulative exploration profile from all tastings
  const explorationProfile: SensorySpiderProfile = useMemo(() => {
    if (tastings.length === 0) {
      return {
        floral: 0,
        frutal: 0,
        acido: 0,
        verde: 0,
        otros: 0,
        tostado: 0,
        especias: 0,
        nueces: 0,
        dulce: 0,
        cuerpo: 0,
        acidez: 0,
        balance: 0,
      };
    }

    // Garantiza que cada cata tenga su perfil de 9 familias correctamente calculado
    const profiles = tastings.map((t) => {
      if (
        t.spiderProfile &&
        typeof t.spiderProfile.dulce === "number" &&
        typeof t.spiderProfile.frutal === "number" &&
        typeof t.spiderProfile.nueces === "number"
      ) {
        return t.spiderProfile;
      }
      return computeSensorySpiderProfile(t.selectedFlavors || [], t.bodyLevel || 2);
    });

    const n = profiles.length;
    let sumFloral = 0;
    let sumFrutal = 0;
    let sumAcido = 0;
    let sumVerde = 0;
    let sumOtros = 0;
    let sumTostado = 0;
    let sumEspecias = 0;
    let sumNueces = 0;
    let sumDulce = 0;
    let sumCuerpo = 0;
    let sumAcidez = 0;
    let sumBalance = 0;

    profiles.forEach((p) => {
      sumFloral += p.floral || 0;
      sumFrutal += p.frutal || 0;
      sumAcido += p.acido || 0;
      sumVerde += p.verde || 0;
      sumOtros += p.otros || 0;
      sumTostado += p.tostado || 0;
      sumEspecias += p.especias || 0;
      sumNueces += p.nueces || 0;
      sumDulce += p.dulce || 0;
      sumCuerpo += p.cuerpo || 50;
      sumAcidez += p.acidez || 50;
      sumBalance += p.balance || 50;
    });

    return {
      floral: Math.round(sumFloral / n),
      frutal: Math.round(sumFrutal / n),
      acido: Math.round(sumAcido / n),
      verde: Math.round(sumVerde / n),
      otros: Math.round(sumOtros / n),
      tostado: Math.round(sumTostado / n),
      especias: Math.round(sumEspecias / n),
      nueces: Math.round(sumNueces / n),
      dulce: Math.round(sumDulce / n),
      cuerpo: Math.round(sumCuerpo / n),
      acidez: Math.round(sumAcidez / n),
      balance: Math.round(sumBalance / n),
    };
  }, [tastings]);

  // Dynamic Rebuy CTA recommendation
  const recommendation = useMemo(() => {
    const { floral, frutal, tostado, dulce, nueces, especias, acido } = explorationProfile;
    const catalogOptions = [
      {
        val: floral,
        title: "Te falta explorar cafés con perfil Floral",
        coffee: "La Argelia",
        url: "https://varietale.com/products/la-argelia",
        ctaText: "Ver La Argelia en varietale.com",
      },
      {
        val: frutal,
        title: "Te falta explorar cafés con perfil Frutal y Tropical",
        coffee: "Bourbon Papayo",
        url: "https://varietale.com/products/borbon-papayo",
        ctaText: "Ver Bourbon Papayo en varietale.com",
      },
      {
        val: tostado,
        title: "Te falta explorar cafés con perfil Tostado y Especiado",
        coffee: "Las Hortensias (Orgánico)",
        url: "https://varietale.com/products/las-hortensias",
        ctaText: "Ver Las Hortensias en varietale.com",
      },
      {
        val: dulce,
        title: "Te falta explorar cafés con perfil Dulce y Achocolatado",
        coffee: "San Antonio",
        url: "https://varietale.com/products/san-antonio",
        ctaText: "Ver San Antonio en varietale.com",
      },
      {
        val: nueces ?? 0,
        title: "Te falta explorar cafés con notas de Cacao y Frutos Secos",
        coffee: "Café Especial Varietale",
        url: "https://varietale.com/collections/cafes",
        ctaText: "Explorar cafés en varietale.com",
      },
      {
        val: especias ?? 0,
        title: "Te falta explorar cafés con notas Especiadas y Cálidas",
        coffee: "Las Hortensias (Orgánico)",
        url: "https://varietale.com/products/las-hortensias",
        ctaText: "Ver Las Hortensias en varietale.com",
      },
      {
        val: acido ?? 0,
        title: "Te falta explorar cafés con perfil Ácido y Cítrico",
        coffee: "Bourbon Papayo",
        url: "https://varietale.com/products/borbon-papayo",
        ctaText: "Ver Bourbon Papayo en varietale.com",
      },
    ];

    catalogOptions.sort((a, b) => a.val - b.val);
    return catalogOptions[0];
  }, [explorationProfile]);

  const cataA = tastings.find((t) => t.id === compCataAId) || tastings[0];
  const cataB = tastings.find((t) => t.id === compCataBId) || tastings[1] || tastings[0];

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Reciente";
    }
  };

  const getMethodName = (id: string) => {
    const found = BREW_METHODS.find((m) => m.id === id);
    return found ? found.name : id;
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 pt-4 px-4 sm:px-6 md:px-8 max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E8EDF1]">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-[#01374C] bg-white border border-[#DDC1AB] shadow-xs hover:bg-[#FAF6F2] transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Inicio</span>
        </button>

        <button
          id="new-cata-from-logbook-btn"
          onClick={onStartNewCata}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#01374C] text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-[#002636] transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-[#00D9B4]" />
          <span>Nueva Cata</span>
        </button>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#01374C] tracking-tight">
          Mi Bitácora de Catación
        </h1>
        <p className="text-sm sm:text-base text-[#6A7B85] mt-1">
          {tastings.length} {tastings.length === 1 ? "cata registrada" : "catas registradas"} con perfil sensorial y rueda de sabores.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#E8EDF1] p-1.5 rounded-2xl mb-6">
        <button
          id="tab-historial-btn"
          onClick={() => setActiveTab("historial")}
          className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "historial"
              ? "bg-[#01374C] text-white shadow-xs"
              : "text-[#4A5D68] hover:text-[#01374C]"
          }`}
        >
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Historial ({tastings.length})</span>
        </button>
        <button
          id="tab-comparador-btn"
          onClick={() => setActiveTab("comparador")}
          className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "comparador"
              ? "bg-[#01374C] text-white shadow-xs"
              : "text-[#4A5D68] hover:text-[#01374C]"
          }`}
        >
          <GitCompare className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Comparador</span>
        </button>
        <button
          id="tab-exploracion-btn"
          onClick={() => setActiveTab("exploracion")}
          className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "exploracion"
              ? "bg-[#01374C] text-white shadow-xs"
              : "text-[#4A5D68] hover:text-[#01374C]"
          }`}
        >
          <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Exploración</span>
        </button>
      </div>

      {/* TAB 1: HISTORIAL DE TARJETAS */}
      {activeTab === "historial" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {/* Empty state when user has 0 catas */}
          {tastings.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-8 sm:p-12 border border-[#E8EDF1] text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] flex items-center justify-center mx-auto mb-4 text-[#01374C]">
                <BookOpen className="w-8 h-8 text-[#00D9B4]" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#01374C]">
                Aún no tienes catas registradas
              </h3>
              <p className="text-sm sm:text-base text-[#4A5D68] mt-2 max-w-sm mx-auto leading-relaxed">
                Cada cata que realices con tus notas y rueda de sabores se guardará aquí en tu historial personal.
              </p>
              <button
                onClick={onStartNewCata}
                className="mt-5 px-6 py-3 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-sm sm:text-base font-bold shadow-xs transition-all inline-flex items-center gap-2.5 cursor-pointer min-h-[48px]"
              >
                <Plus className="w-5 h-5 text-[#00D9B4]" />
                <span>Iniciar mi primera cata</span>
              </button>
            </div>
          )}

          {/* Quick Notice about Same Coffee Comparison if exists */}
          {sameCoffeeMultiMethods.length > 0 && (
            <div className="col-span-full bg-[#EBFBFA] border border-[#00D9B4]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-[#01374C] uppercase tracking-wider block">
                  Modo Comparativo Disponible
                </span>
                <p className="text-sm sm:text-base text-[#01374C] font-semibold mt-0.5">
                  Cataste "{sameCoffeeMultiMethods[0].coffeeName}" con diferentes métodos.
                </p>
              </div>
              <button
                onClick={() => {
                  setCompCataAId(sameCoffeeMultiMethods[0].records[0].id);
                  setCompCataBId(sameCoffeeMultiMethods[0].records[1].id);
                  setActiveTab("comparador");
                }}
                className="shrink-0 text-xs sm:text-sm font-bold bg-[#01374C] text-white px-4 py-2.5 rounded-xl hover:bg-[#002636] cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Comparar →
              </button>
            </div>
          )}

          {tastings.map((cata) => {
            const isExpanded = expandedCataId === cata.id;
            return (
              <div
                key={cata.id}
                id={`cata-card-${cata.id}`}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8EDF1] shadow-xs transition-all hover:border-[#DDC1AB] flex flex-col justify-between"
              >
                {/* Contenido principal de la tarjeta */}
                <div>
                  {/* 1. Barra Superior: Origen / Distintivo + Calificación y Acciones Rápidas */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E8EDF1]">
                    {/* Origen Tag en Azul Corporativo Varietale #01374C con punto menta #00D9B4 */}
                    {cata.origin ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-[#01374C] text-white px-2.5 py-1 rounded-full shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00D9B4]" />
                        <span>{cata.origin}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider bg-[#FAF6F2] text-[#01374C] px-2.5 py-1 rounded-full border border-[#DDC1AB]">
                        <span>Café Varietale</span>
                      </span>
                    )}

                    {/* Estrellas y Botones de Acción */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 bg-[#FAF6F2] px-2 py-1 rounded-xl border border-[#DDC1AB]/60">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={`star-${cata.id}-${star}`}
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                              cata.rating >= star
                                ? "fill-[#00D9B4] text-[#00D9B4]"
                                : "text-[#DDE4E8]"
                            }`}
                          />
                        ))}
                      </div>
                      {onEditCata && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCata(cata);
                          }}
                          className="p-1.5 rounded-lg border border-[#DDC1AB] hover:border-[#01374C] text-[#01374C] bg-white hover:bg-[#FAF6F2] transition-colors cursor-pointer flex items-center justify-center"
                          title="Modificar esta cata"
                          aria-label="Modificar cata"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#01374C]" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCataToDelete(cata);
                        }}
                        className="p-1.5 rounded-lg border border-transparent hover:border-red-200 text-[#889DA7] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center"
                        title="Eliminar esta cata"
                        aria-label="Eliminar cata"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Nombre del Café: 100% de ancho sin cortes de palabras */}
                  <div className="pt-3">
                    <h3 className="text-lg sm:text-xl font-black text-[#01374C] leading-snug break-words">
                      {cata.coffeeName}
                    </h3>

                    {/* Ficha técnica: Método, Varietal, Beneficio y Fecha (con puntos indivisibles) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-[#4A5D68] mt-1.5 font-medium">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#01374C] bg-[#FAF6F2] px-2 py-0.5 rounded-md border border-[#DDC1AB]/50">
                        <BrewMethodIcon type={cata.brewMethod} className="w-3.5 h-3.5 text-[#00D9B4]" />
                        <span>{getMethodName(cata.brewMethod)}</span>
                      </span>
                      {cata.variety ? (
                        <span className="inline-flex items-center gap-1 text-[#52646E] before:content-['•'] before:text-[#DDC1AB] before:mr-1">
                          <span>{cata.variety}</span>
                        </span>
                      ) : null}
                      {cata.process ? (
                        <span className="inline-flex items-center gap-1 text-[#52646E] before:content-['•'] before:text-[#DDC1AB] before:mr-1">
                          <span>{cata.process}</span>
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 text-[#889DA7] before:content-['•'] before:text-[#DDC1AB] before:mr-1">
                        <span>{formatDate(cata.createdAt)}</span>
                      </span>
                    </div>
                  </div>

                  {/* 3. Radar y Resumen de Sabores */}
                  <div className="mt-3.5 flex items-center gap-3.5 bg-[#FAF6F2]/40 p-3 sm:p-3.5 rounded-xl border border-[#E8EDF1]">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
                      <RadarChart
                        primaryProfile={cata.spiderProfile}
                        size={105}
                        showLabels={false}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] sm:text-xs font-bold text-[#6A7B85] uppercase tracking-wider block mb-1.5">
                        Sabores Percibidos:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cata.selectedFlavors.slice(0, 4).map((f) => (
                          <span
                            key={f.descriptorId}
                            className="text-xs font-semibold bg-white text-[#01374C] px-2.5 py-0.5 rounded-full border border-[#DDC1AB] shadow-2xs"
                          >
                            {f.name} ({f.intensity}★)
                          </span>
                        ))}
                        {cata.selectedFlavors.length > 4 && (
                          <span className="text-xs font-bold text-[#01374C] bg-[#E8EDF1] px-2 py-0.5 rounded-full">
                            +{cata.selectedFlavors.length - 4} más
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs sm:text-sm text-[#4A5D68] flex items-center gap-1">
                        <span>Cuerpo: </span>
                        <strong className="text-[#01374C] font-bold">
                          {cata.bodyLevel === 1 ? "Ligero" : cata.bodyLevel === 2 ? "Medio" : "Denso"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expand / Collapse Details */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-[#E8EDF1] space-y-3.5">
                    {/* User Notes */}
                    {cata.userNotes && (
                      <div className="bg-white p-3.5 rounded-xl border border-[#DDC1AB]">
                        <span className="text-xs sm:text-sm font-bold text-[#4A5D68] uppercase block mb-1">
                          Tus Apuntes Sensoriales:
                        </span>
                        <p className="text-sm sm:text-base text-[#01374C] italic leading-relaxed">
                          "{cata.userNotes}"
                        </p>
                      </div>
                    )}

                    {/* All perceived flavors list */}
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#4A5D68] uppercase block mb-2">
                        Todos los descriptores y dominancia:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {cata.selectedFlavors.map((f) => (
                          <span
                            key={`full-${f.descriptorId}`}
                            className="text-xs sm:text-sm font-semibold bg-[#EBFBFA] text-[#01374C] px-3.5 py-1.5 rounded-full border border-[#00D9B4]/30 flex items-center gap-2"
                          >
                            <span>{f.name}</span>
                            <span className="bg-[#01374C] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                              {f.intensity}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Compare, Edit and Delete actions */}
                    <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setCompCataAId(cata.id);
                          setActiveTab("comparador");
                        }}
                        className="text-xs sm:text-sm font-bold text-[#01374C] hover:text-[#00D9B4] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <GitCompare className="w-4 h-4 text-[#00D9B4]" />
                        <span>Comparar este café con otro método</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {onEditCata && (
                          <button
                            type="button"
                            onClick={() => onEditCata(cata)}
                            className="text-xs sm:text-sm text-[#01374C] hover:bg-[#FAF6F2] px-3 py-1.5 rounded-lg border border-[#DDC1AB] cursor-pointer flex items-center gap-1.5 font-bold transition-colors"
                            title="Modificar cata"
                          >
                            <Edit3 className="w-4 h-4 text-[#01374C]" />
                            <span>Entrar y Modificar cata</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setCataToDelete(cata)}
                          className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 cursor-pointer flex items-center gap-1.5 font-bold transition-colors"
                          title="Eliminar cata"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedCataId(isExpanded ? null : cata.id)}
                  className="w-full mt-3 pt-2.5 border-t border-[#E8EDF1] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#4A5D68] hover:text-[#01374C] transition-colors cursor-pointer"
                >
                  <span>{isExpanded ? "Ocultar detalle" : "Ver detalle completo"}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            );
          })}

          {/* Tarjeta de invitación para registrar otra cata (cuando hay 1 o 2 catas) */}
          {tastings.length > 0 && tastings.length <= 2 && (
            <div
              onClick={onStartNewCata}
              className="rounded-2xl border-2 border-dashed border-[#DDC1AB] hover:border-[#01374C] bg-[#FAF6F2]/40 hover:bg-[#FAF6F2] p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[220px] group shadow-2xs"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#DDC1AB] flex items-center justify-center text-[#01374C] group-hover:bg-[#01374C] group-hover:text-white transition-all shadow-xs mb-3">
                <Plus className="w-6 h-6 text-[#00D9B4]" />
              </div>
              <h4 className="text-base font-black text-[#01374C]">
                Registrar otra Cata
              </h4>
              <p className="text-xs sm:text-sm text-[#6A7B85] mt-1.5 max-w-xs leading-relaxed">
                Catando 2 o más cafés o métodos desbloquearás la comparación sensorial lado a lado.
              </p>
              <span className="mt-4 px-4 py-2 rounded-xl bg-white text-[#01374C] text-xs font-bold border border-[#DDC1AB] group-hover:bg-[#01374C] group-hover:text-white transition-all inline-flex items-center gap-1.5 shadow-2xs">
                <span>Nueva cata</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#00D9B4]" />
              </span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODO COMPARATIVO */}
      {activeTab === "comparador" && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 md:p-8 border border-[#E8EDF1] shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <GitCompare className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D9B4]" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[#01374C]">
              Comparación Sensorial Lado a Lado
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D68] mb-6 leading-relaxed max-w-2xl">
            Compara cómo un mismo grano (o dos orígenes distintos) expresan acidez, dulzura y cuerpo según el método de extracción.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Columna Izquierda: Selectores y Radar Superpuesto */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              {/* Selectors for Cata A and Cata B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#FAF6F2]/80 p-3 rounded-2xl border border-[#DDC1AB]/60">
                  <label className="text-xs font-black uppercase text-[#01374C] block mb-1.5 tracking-wider">
                    ● Cata A (Azul Primario)
                  </label>
                  <select
                    value={compCataAId}
                    onChange={(e) => setCompCataAId(e.target.value)}
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                  >
                    {tastings.map((t) => (
                      <option key={`opt-a-${t.id}`} value={t.id}>
                        {t.coffeeName} ({getMethodName(t.brewMethod)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-[#EBFBFA]/80 p-3 rounded-2xl border border-[#00D9B4]/40">
                  <label className="text-xs font-black uppercase text-[#00897B] block mb-1.5 tracking-wider">
                    ● Cata B (Acento Menta)
                  </label>
                  <select
                    value={compCataBId}
                    onChange={(e) => setCompCataBId(e.target.value)}
                    className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                  >
                    {tastings.map((t) => (
                      <option key={`opt-b-${t.id}`} value={t.id}>
                        {t.coffeeName} ({getMethodName(t.brewMethod)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Overlaid Radar Chart */}
              <div className="flex justify-center bg-white p-4 sm:p-6 rounded-2xl border border-[#E8EDF1] shadow-2xs">
                <div className="w-full max-w-[min(92vw,380px)] sm:max-w-[440px] md:max-w-[500px] aspect-square flex items-center justify-center mx-auto">
                  <RadarChart
                    primaryProfile={cataA.spiderProfile}
                    primaryLabel={`${cataA.coffeeName} (${getMethodName(cataA.brewMethod)})`}
                    secondaryProfile={cataB.spiderProfile}
                    secondaryLabel={`${cataB.coffeeName} (${getMethodName(cataB.brewMethod)})`}
                    responsive={true}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjetas de detalles sensoriales de Cata A y Cata B */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F2]/80 border-2 border-[#01374C]/30 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-black text-[#01374C] uppercase tracking-wider">
                    ● Cata A: {cataA.coffeeName}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#01374C] text-white">
                    {getMethodName(cataA.brewMethod)}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[#4A5D68] mt-1">
                  Cuerpo: <strong className="text-[#01374C]">{cataA.bodyLevel === 1 ? "Ligero" : cataA.bodyLevel === 2 ? "Medio" : "Denso"}</strong>
                </p>
                <div className="mt-3 pt-3 border-t border-[#DDC1AB]/60">
                  <span className="text-xs sm:text-sm font-bold text-[#4A5D68] block mb-1.5">Notas dominantes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cataA.selectedFlavors.map((f) => (
                      <span key={`comp-a-flv-${f.descriptorId}`} className="text-xs sm:text-sm font-semibold bg-white text-[#01374C] px-3 py-1 rounded-full border border-[#DDC1AB] shadow-2xs">
                        {f.name} ({f.intensity}★)
                      </span>
                    ))}
                  </div>
                </div>
                {cataA.userNotes && (
                  <p className="text-xs sm:text-sm text-[#52646E] italic mt-3 pt-2.5 border-t border-[#DDC1AB]/40">
                    "{cataA.userNotes}"
                  </p>
                )}
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#EBFBFA]/80 border-2 border-[#00D9B4]/60 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-black text-[#00897B] uppercase tracking-wider">
                    ● Cata B: {cataB.coffeeName}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#00D9B4] text-[#01374C]">
                    {getMethodName(cataB.brewMethod)}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[#4A5D68] mt-1">
                  Cuerpo: <strong className="text-[#01374C]">{cataB.bodyLevel === 1 ? "Ligero" : cataB.bodyLevel === 2 ? "Medio" : "Denso"}</strong>
                </p>
                <div className="mt-3 pt-3 border-t border-[#00D9B4]/30">
                  <span className="text-xs sm:text-sm font-bold text-[#4A5D68] block mb-1.5">Notas dominantes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cataB.selectedFlavors.map((f) => (
                      <span key={`comp-b-flv-${f.descriptorId}`} className="text-xs sm:text-sm font-semibold bg-white text-[#01374C] px-3 py-1 rounded-full border border-[#00D9B4]/50 shadow-2xs">
                        {f.name} ({f.intensity}★)
                      </span>
                    ))}
                  </div>
                </div>
                {cataB.userNotes && (
                  <p className="text-xs sm:text-sm text-[#52646E] italic mt-3 pt-2.5 border-t border-[#00D9B4]/20">
                    "{cataB.userNotes}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAPA DE EXPLORACIÓN Y RECOMPRA */}
      {activeTab === "exploracion" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Mapa Acumulativo */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 border border-[#E8EDF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#00D9B4]" />
                <h2 className="text-base sm:text-lg md:text-xl font-black text-[#01374C]">
                  Mapa de Exploración Sensorial
                </h2>
              </div>
              <span className="text-xs font-bold text-[#01374C] bg-[#EBFBFA] px-3.5 py-1 rounded-full border border-[#00D9B4]/30">
                Acumulado ({tastings.length} catas)
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#4A5D68] mb-4 leading-relaxed">
              Muestra el territorio sensorial de la rueda de sabores que has recorrido a través de tus cataciones.
            </p>

            <div className="flex justify-center my-3 bg-white p-4 rounded-2xl border border-[#E8EDF1]">
              <div className="w-full max-w-[min(92vw,360px)] sm:max-w-[440px] md:max-w-[500px] aspect-square flex items-center justify-center mx-auto">
                <RadarChart primaryProfile={explorationProfile} responsive={true} className="w-full h-full" />
              </div>
            </div>

            {/* Porcentajes de las 9 categorías oficiales de la Rueda Sensorial SCA */}
            <div className="mt-4 pt-4 border-t border-[#E8EDF1]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-[#4A5D68] uppercase tracking-wider">
                  Territorio Explorado por Familia (Rueda SCA)
                </span>
                <span className="text-xs font-bold text-[#00897B] bg-[#EBFBFA] px-2.5 py-0.5 rounded-full border border-[#00D9B4]/30">
                  9 categorías oficiales
                </span>
              </div>

              {/* Grid responsivo de las 9 familias sensoriales alineadas con el Radar */}
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-2 text-center text-xs">
                {RADAR_AXES.map((axis) => {
                  const val = explorationProfile[axis.key] ?? 0;
                  const isExplored = val > 0;
                  return (
                    <div
                      key={axis.key}
                      className={`p-2.5 sm:p-3 rounded-xl bg-white border transition-all flex flex-col justify-between ${
                        isExplored
                          ? "shadow-2xs ring-1 ring-black/5"
                          : "opacity-75"
                      }`}
                      style={{
                        borderColor: isExplored ? `${axis.color}70` : "#E8EDF1",
                      }}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: axis.color }}
                        />
                        <span
                          className="text-xs sm:text-sm font-black truncate leading-tight"
                          style={{ color: isExplored ? axis.color : "#4A5D68" }}
                          title={axis.label}
                        >
                          {axis.label}
                        </span>
                      </div>
                      <strong className="text-base sm:text-lg font-black text-[#01374C] mt-0.5">
                        {val}%
                      </strong>
                    </div>
                  );
                })}
              </div>

              {/* Métricas Organolépticas de Taza: Acidez, Cuerpo, Balance */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-3 pt-3 border-t border-[#E8EDF1]/80 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#F0E6DD]">
                  <span className="text-xs text-[#6A7B85] block font-semibold mb-0.5">Acidez</span>
                  <strong className="text-sm sm:text-base font-black text-[#01374C]">
                    {explorationProfile.acidez}%
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#F0E6DD]">
                  <span className="text-xs text-[#6A7B85] block font-semibold mb-0.5">Cuerpo</span>
                  <strong className="text-sm sm:text-base font-black text-[#01374C]">
                    {explorationProfile.cuerpo}%
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#F0E6DD]">
                  <span className="text-xs text-[#6A7B85] block font-semibold mb-0.5">Balance</span>
                  <strong className="text-sm sm:text-base font-black text-[#01374C]">
                    {explorationProfile.balance}%
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* CTA DE RECOMPRA PERSONALIZADA */}
          <div className="lg:col-span-5 bg-[#01374C] text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00D9B4] text-[#01374C] flex items-center justify-center font-black shrink-0">
                  <ShoppingBag className="w-6 h-6 text-[#01374C]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#00D9B4] block">
                    Recomendación Varietale
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white leading-snug mt-1">
                    {recommendation.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm sm:text-base text-white/90 leading-relaxed mb-6">
                Según tu mapa de exploración, expande tu paladar descubriendo nuestro café de especialidad{" "}
                <strong className="text-[#00D9B4] font-black">{recommendation.coffee}</strong>.
              </p>
            </div>

            <a
              id="cta-recompra-link"
              href={recommendation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-5 rounded-2xl bg-[#00D9B4] hover:bg-[#00c4a3] text-[#01374C] font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] min-h-[50px]"
            >
              <span>{recommendation.ctaText}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar cata (sin depender de window.confirm) */}
      {cataToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#E8EDF1] text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-3 border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#01374C] mb-1">
              ¿Eliminar esta cata?
            </h3>
            <p className="text-xs sm:text-sm text-[#4A5D68] mb-4 leading-relaxed">
              Esta acción borrará de forma permanente el registro de{" "}
              <strong className="text-[#01374C] font-extrabold">{cataToDelete.coffeeName}</strong>{" "}
              de tu historial de catación.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCataToDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] font-bold text-xs sm:text-sm border border-[#DDC1AB] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = cataToDelete.id;
                  setCataToDelete(null);
                  onDeleteCata(id);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Brand Footer */}
      <BrandFooter className="mt-4" />
    </div>
  );
};
