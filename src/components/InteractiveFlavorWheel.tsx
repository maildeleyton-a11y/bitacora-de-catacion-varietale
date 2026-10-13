/**
 * ============================================================================
 * RUEDA DE SABORES INTERACTIVA (INTERACTIVE FLAVOR WHEEL) - PASO 2 DE CATA
 * ============================================================================
 * Experiencia táctil y sensorial para identificar descriptores SCA:
 * 1. Rueda cromática oficial giratoria con las 9 macro-familias.
 * 2. Exploración por subcategorías y selección de descriptores específicos.
 * 3. Selector de intensidad (1 a 5) y referencias aromáticas reales.
 * 4. Slider de cuerpo táctil en boca (Ligero, Medio, Denso).
 * 5. Gráfico de radar sensorial en tiempo real.
 * 6. Calificación global de la taza (estrellas) y notas personales del catador.
 * 7. Guardado final con celebración y cero sesgos.
 */

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sliders,
  Check,
  Star,
  Coffee,
  X,
} from "lucide-react";
import {
  MacroProfile,
  FlavorSelection,
  BodyLevel,
  SensorySpiderProfile,
  FlavorDescriptor,
} from "../types";
import {
  MACRO_THEMES,
  FLAVOR_DESCRIPTORS,
  normalizeMacro,
  getDescriptorDisplay,
  computeSensorySpiderProfile,
} from "../data/coffeeData";
import { RadarChart } from "./RadarChart";
import { BrandFooter } from "./BrandFooter";

interface InteractiveFlavorWheelProps {
  /** Nombre del café en evaluación */
  coffeeName: string;
  /** Origen geográfico del café */
  origin: string;
  /** Imagen opcional de la bolsa o taza */
  imageUrl?: string;
  /** Nombre del método de preparación utilizado */
  brewMethodName: string;
  /** Nivel de cuerpo táctil en boca (1 a 3) */
  bodyLevel: BodyLevel;
  /** Modificador del nivel de cuerpo */
  onBodyChange: (level: BodyLevel) => void;
  /** Descriptores de sabor seleccionados */
  selectedFlavors: FlavorSelection[];
  /** Modificador de la lista de sabores seleccionados */
  onFlavorsChange: (flavors: FlavorSelection[]) => void;
  /** Calificación en estrellas otorgada por el catador (1 a 5) */
  rating: number;
  /** Modificador de la calificación */
  onRatingChange: (rating: number) => void;
  /** Apuntes y reflexiones sensoriales del catador */
  userNotes: string;
  /** Modificador de las notas */
  onNotesChange: (notes: string) => void;
  /** Acción para finalizar y guardar la cata */
  onSaveCata: () => void;
  /** Regresa al paso anterior (Registro del café) */
  onBack: () => void;
  /** Indica si se está modificando una cata existente */
  isEditing?: boolean;
}

export const InteractiveFlavorWheel: React.FC<InteractiveFlavorWheelProps> = ({
  coffeeName,
  origin,
  imageUrl,
  brewMethodName,
  bodyLevel,
  onBodyChange,
  selectedFlavors,
  onFlavorsChange,
  rating,
  onRatingChange,
  userNotes,
  onNotesChange,
  onSaveCata,
  onBack,
  isEditing = false,
}) => {
  // Asegurar que la pantalla siempre cargue en la parte superior
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const [activeMacro, setActiveMacro] = useState<MacroProfile>("Frutal");
  const [hoveredMacro, setHoveredMacro] = useState<MacroProfile | null>(null);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [activeDescriptorForIntensity, setActiveDescriptorForIntensity] =
    useState<FlavorDescriptor | null>(null);

  // Filter descriptors by active macro (normalizing family names)
  const currentDescriptors = useMemo(() => {
    const target = normalizeMacro(activeMacro);
    return FLAVOR_DESCRIPTORS.filter(
      (d) => normalizeMacro(d.macro) === target
    );
  }, [activeMacro]);

  // Group by subcategory
  const subcategories = useMemo(() => {
    const groups: { [key: string]: FlavorDescriptor[] } = {};
    currentDescriptors.forEach((d) => {
      if (!groups[d.subcategory]) groups[d.subcategory] = [];
      groups[d.subcategory].push(d);
    });
    return groups;
  }, [currentDescriptors]);

  // Calculate live spider profile using unified SCA profile formula
  const liveSpiderProfile: SensorySpiderProfile = useMemo(() => {
    return computeSensorySpiderProfile(selectedFlavors, bodyLevel);
  }, [selectedFlavors, bodyLevel]);

  // Handle flavor selection and intensity
  const handleSelectDescriptor = (descriptor: FlavorDescriptor) => {
    const existing = selectedFlavors.find(
      (f) => f.descriptorId === descriptor.id
    );
    if (existing) {
      // open intensity tweak or remove if user wants
      setActiveDescriptorForIntensity(descriptor);
    } else {
      const display = getDescriptorDisplay(descriptor);
      // Add with default intensity 3 (Marcado)
      const newSelection: FlavorSelection = {
        descriptorId: descriptor.id,
        name: display.fullLabel,
        macro: descriptor.macro,
        subcategory: descriptor.subcategory,
        intensity: 3,
      };
      onFlavorsChange([...selectedFlavors, newSelection]);
      setActiveDescriptorForIntensity(descriptor);
    }
  };

  const updateIntensity = (descriptorId: string, intensity: number) => {
    if (intensity <= 0) {
      onFlavorsChange(
        selectedFlavors.filter((f) => f.descriptorId !== descriptorId)
      );
      setActiveDescriptorForIntensity(null);
    } else {
      onFlavorsChange(
        selectedFlavors.map((f) =>
          f.descriptorId === descriptorId ? { ...f, intensity } : f
        )
      );
    }
  };

  const removeFlavor = (descriptorId: string) => {
    onFlavorsChange(
      selectedFlavors.filter((f) => f.descriptorId !== descriptorId)
    );
    if (activeDescriptorForIntensity?.id === descriptorId) {
      setActiveDescriptorForIntensity(null);
    }
  };

  const bodyDescriptions: Record<
    BodyLevel,
    { label: string; text: string; sub: string }
  > = {
    1: {
      label: "Ligero",
      text: "Acuoso y refrescante",
      sub: "Sensación sedosa y limpia como infusión de hierbas o té negro.",
    },
    2: {
      label: "Medio",
      text: "Redondo y envolvente",
      sub: "Textura equilibrada como néctar de durazno o leche entera.",
    },
    3: {
      label: "Denso",
      text: "Untuoso y carnoso",
      sub: "Permanencia prolongada en el paladar, crema espesa o chocolate.",
    },
  };

  // Wheel sectors definition (9 official SCA categories, 40° each)
  const macroSlices: {
    macro: MacroProfile;
    angle: number;
    color: string;
    label: string;
    shortLabel: string;
    lines: string[];
  }[] = [
    { macro: "Floral", angle: 0, color: MACRO_THEMES.Floral.color, label: "Floral", shortLabel: "Floral", lines: ["Floral"] },
    { macro: "Frutal", angle: 40, color: MACRO_THEMES.Frutal.color, label: "Frutal", shortLabel: "Frutal", lines: ["Frutal"] },
    { macro: "Ácido / fermentado", angle: 80, color: MACRO_THEMES["Ácido / fermentado"].color, label: "Ácido / fermentado", shortLabel: "Ácido / Ferm.", lines: ["Ácido", "Ferm."] },
    { macro: "Verde / vegetal", angle: 120, color: MACRO_THEMES["Verde / vegetal"].color, label: "Verde / vegetal", shortLabel: "Verde / Veg.", lines: ["Verde", "Veg."] },
    { macro: "Otros", angle: 160, color: MACRO_THEMES.Otros.color, label: "Otros", shortLabel: "Otros", lines: ["Otros"] },
    { macro: "Tostado", angle: 200, color: MACRO_THEMES.Tostado.color, label: "Tostado", shortLabel: "Tostado", lines: ["Tostado"] },
    { macro: "Especias", angle: 240, color: MACRO_THEMES.Especias.color, label: "Especias", shortLabel: "Especias", lines: ["Especias"] },
    { macro: "Frutos secos / cacao", angle: 280, color: MACRO_THEMES["Frutos secos / cacao"].color, label: "Frutos secos / cacao", shortLabel: "Nuez / Cacao", lines: ["Nuez", "Cacao"] },
    { macro: "Dulce", angle: 320, color: MACRO_THEMES.Dulce.color, label: "Dulce", shortLabel: "Dulce", lines: ["Dulce"] },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 pt-3 px-3.5 sm:px-6 lg:px-8 max-w-lg md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full safe-pb">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          id="back-to-input-btn"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-[#01374C] bg-white border border-[#DDC1AB] shadow-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>← {isEditing ? "Modificar Datos del Grano" : "Cambiar Método / Café"}</span>
        </button>
        <div className="flex items-center gap-2">
          {isEditing && (
            <span className="text-xs uppercase font-extrabold tracking-wider bg-[#01374C] text-white px-2.5 py-1 rounded-full shadow-xs">
              Modificando
            </span>
          )}
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#01374C] bg-[#EBFBFA] px-3 py-1 rounded-full border border-[#00D9B4]/30">
            Paso 2/2
          </span>
        </div>
      </div>

      {/* Top Section: Coffee Context & Control 1 (Sensación de Cuerpo) */}
      <div className="flex flex-col gap-3 sm:gap-3.5 mb-2.5 sm:mb-3 w-full">
        {/* Información del Café Seleccionado (Ancho completo) */}
        <div className="w-full bg-[#01374C] text-white rounded-2xl p-3.5 sm:p-4 border border-[#002636] shadow-sm flex flex-col justify-center relative overflow-hidden">
          {/* Subtle soft decorative background glow */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#00D9B4]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 relative z-10">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={coffeeName || "Café"}
                className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-xl object-contain bg-white p-1 border border-white/20 shrink-0 shadow-md transition-transform hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Coffee className="w-9 h-9 sm:w-10 sm:h-10 text-[#00D9B4]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {origin && origin.trim() ? (
                <span className="text-xs sm:text-sm font-black text-[#00D9B4] uppercase tracking-wider block truncate mb-0.5">
                  {origin}
                </span>
              ) : null}
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-snug break-words">
                {coffeeName}
              </h1>
              <p className="text-sm sm:text-base text-[#D1DFE6] mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00D9B4] shrink-0 shadow-xs" />
                <span>
                  Método:{" "}
                  <strong className="text-white font-bold">
                    {brewMethodName}
                  </strong>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Control 1: Sensación de Cuerpo (Debajo en ancho completo) */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-[#E8EDF1] shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#01374C] flex items-baseline">
                <span className="text-base sm:text-lg font-black text-[#01374C] mr-1.5">1.</span>
                <span>Sensación de Cuerpo</span>
                <span className="text-xs sm:text-sm font-normal text-[#4A5D68] ml-2 hidden sm:inline">(Táctil en Boca)</span>
              </h2>
              <p className="text-sm text-[#4A5D68] mt-1 leading-relaxed">
                Elige la densidad y textura que percibes en tu paladar.
              </p>
            </div>
            <span className="self-start sm:self-center text-xs sm:text-sm font-bold px-3.5 py-1 rounded-full bg-[#EBFBFA] text-[#01374C] border border-[#00D9B4]/30 whitespace-nowrap">
              Nivel: {bodyDescriptions[bodyLevel].label}
            </span>
          </div>

          {/* 3-Step Tactile Slider Buttons */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-1.5">
            {([1, 2, 3] as BodyLevel[]).map((level) => {
              const isSelected = bodyLevel === level;
              return (
                <button
                  key={`body-${level}`}
                  id={`body-btn-${level}`}
                  onClick={() => onBodyChange(level)}
                  className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-center border transition-all cursor-pointer min-h-[48px] ${
                    isSelected
                      ? "bg-[#01374C] text-white border-[#01374C] shadow-xs"
                      : "bg-white text-[#01374C] border-[#E8EDF1] hover:bg-[#FAF6F2]"
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      isSelected
                        ? "bg-[#00D9B4]"
                        : level === 1
                        ? "bg-[#DDC1AB]"
                        : level === 2
                        ? "bg-[#9FB2BC]"
                        : "bg-[#3B2212]"
                    }`}
                  />
                  <span className="text-sm sm:text-base font-bold leading-tight">
                    {bodyDescriptions[level].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control 2: RUEDA TÁCTIL Y ROTATIVA */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-[#E8EDF1] shadow-sm mb-5">
        <div className="mb-3.5">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#01374C] flex items-baseline">
            <span className="text-lg md:text-xl font-black text-[#01374C] mr-1.5">2.</span>
            <span>Rueda de Sabores Varietale</span>
          </h2>
          <p className="text-sm sm:text-base text-[#4A5D68] mt-0.5 leading-relaxed">
            Toca una categoría para centrarla y explorar los 85 descriptores oficiales SCA.
          </p>
        </div>

        {/* Macro-perfil: 9 SCA Categories - Cuadrícula limpia 3x3 centrada con texto completo legible */}
        <div className="w-full max-w-2xl mx-auto mb-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
            {macroSlices.map((slice) => {
              const macro = slice.macro;
              const active = normalizeMacro(activeMacro) === normalizeMacro(macro);
              const theme = MACRO_THEMES[normalizeMacro(macro)];
              const countForMacro = selectedFlavors.filter(
                (f) => normalizeMacro(f.macro) === normalizeMacro(macro)
              ).length;

              return (
                <button
                  key={`macro-btn-${macro}`}
                  id={`macro-btn-${macro.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                  onClick={() => {
                    setActiveMacro(macro);
                    setRotationDeg(-slice.angle - 20 - 90);
                  }}
                  className={`py-2.5 px-2.5 sm:px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all border cursor-pointer min-h-[46px] hover:scale-[1.02] active:scale-95 ${
                    active
                      ? "shadow-md scale-[1.02] ring-2 ring-offset-1 ring-[#01374C]"
                      : "bg-white hover:bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] hover:border-[#DDC1AB]"
                  }`}
                  style={{
                    backgroundColor: active ? theme.color : undefined,
                    color: active
                      ? macro === "Ácido / fermentado" || macro === "Agrio/Fermentado"
                        ? "#01374C"
                        : "#FFFFFF"
                      : undefined,
                    borderColor: active ? theme.color : undefined,
                  }}
                >
                  {!active && (
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                      style={{ backgroundColor: theme.color }}
                    />
                  )}
                  <span className="whitespace-nowrap tracking-tight font-extrabold">{slice.shortLabel}</span>
                  {countForMacro > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black shrink-0 ${
                        active
                          ? "bg-white text-[#01374C]"
                          : "bg-[#01374C] text-white"
                      }`}
                    >
                      {countForMacro}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* The Rotating Wheel Graphic (Centrada y aprovechando el ancho de pantalla de cada dispositivo) */}
        <div className="flex flex-col items-center justify-center my-2 select-none w-full">
          <div className="w-[min(94vw,390px)] h-[min(94vw,390px)] sm:w-[470px] sm:h-[470px] md:w-[530px] md:h-[530px] lg:w-[580px] lg:h-[580px] xl:w-[620px] xl:h-[620px] relative rounded-full flex items-center justify-center shadow-xl md:shadow-2xl bg-white border-4 sm:border-8 border-[#FAF6F2] mx-auto overflow-hidden">
            {/* Rotating Wheel Ring (ONLY THIS ROTATES!) */}
            <motion.div
              animate={{ rotate: rotationDeg }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="w-full h-full cursor-grab active:cursor-grabbing rounded-full"
            >
              <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
                <defs>
                  {/* Sombra para sector activo - resalta sin alterar el color */}
                  <filter id="active-slice-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#01374C" floodOpacity="0.45" />
                  </filter>
                  {/* Sombra suave para hover */}
                  <filter id="hover-slice-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#01374C" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Outer circle slices for the 9 SCA macro categories - render active slice last for clear elevation */}
                {[...macroSlices]
                  .sort((a, b) => {
                    const aActive = normalizeMacro(activeMacro) === normalizeMacro(a.macro);
                    const bActive = normalizeMacro(activeMacro) === normalizeMacro(b.macro);
                    return (aActive ? 1 : 0) - (bActive ? 1 : 0);
                  })
                  .map((slice) => {
                    const isActive = normalizeMacro(activeMacro) === normalizeMacro(slice.macro);
                    const isHovered = hoveredMacro && normalizeMacro(hoveredMacro) === normalizeMacro(slice.macro) && !isActive;
                    const angleStep = 40;
                    const startAngle = (slice.angle * Math.PI) / 180;
                    const endAngle = ((slice.angle + angleStep) * Math.PI) / 180;
                    const rOuter = 116;
                    const rInner = 48;

                    const x1 = 120 + rOuter * Math.cos(startAngle);
                    const y1 = 120 + rOuter * Math.sin(startAngle);
                    const x2 = 120 + rOuter * Math.cos(endAngle);
                    const y2 = 120 + rOuter * Math.sin(endAngle);

                    const x3 = 120 + rInner * Math.cos(endAngle);
                    const y3 = 120 + rInner * Math.sin(endAngle);
                    const x4 = 120 + rInner * Math.cos(startAngle);
                    const y4 = 120 + rInner * Math.sin(startAngle);

                    const d = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;

                    const midAngleDeg = slice.angle + angleStep / 2;
                    const midAngleRad = (midAngleDeg * Math.PI) / 180;
                    const textX = 120 + 82 * Math.cos(midAngleRad);
                    const textY = 120 + 82 * Math.sin(midAngleRad);

                    const textRotation =
                      midAngleDeg > 90 && midAngleDeg < 270
                        ? midAngleDeg + 180
                        : midAngleDeg;

                    const textColor =
                      slice.macro === "Ácido / fermentado" || slice.macro === "Agrio/Fermentado"
                        ? "#01374C"
                        : "#FFFFFF";

                    return (
                      <g
                        key={`slice-${slice.macro}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMacro(slice.macro);
                          setRotationDeg(-slice.angle - 20 - 90);
                        }}
                        onMouseEnter={() => setHoveredMacro(slice.macro)}
                        onMouseLeave={() => setHoveredMacro(null)}
                        className="cursor-pointer transition-transform duration-200 ease-out"
                        style={{
                          transformOrigin: "120px 120px",
                          transform: isActive
                            ? "scale(1.045)"
                            : isHovered
                            ? "scale(1.025)"
                            : undefined,
                          filter: isActive
                            ? "url(#active-slice-shadow)"
                            : isHovered
                            ? "url(#hover-slice-shadow)"
                            : undefined,
                          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease",
                        }}
                      >
                        <path
                          d={d}
                          fill={slice.color}
                          stroke="#FFFFFF"
                          strokeWidth={isActive ? "2.8" : isHovered ? "2.2" : "1.6"}
                          strokeLinejoin="round"
                          className="transition-all duration-200"
                        />
                        {slice.lines.length === 1 ? (
                          <text
                            x={textX}
                            y={textY}
                            fill={textColor}
                            fontSize="11"
                            fontWeight={isActive ? "900" : "800"}
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                            className="select-none pointer-events-none"
                          >
                            {slice.lines[0]}
                          </text>
                        ) : (
                          <text
                            x={textX}
                            y={textY}
                            fill={textColor}
                            fontSize="9.8"
                            fontWeight={isActive ? "900" : "800"}
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                            className="select-none pointer-events-none"
                          >
                            <tspan x={textX} dy="-5">{slice.lines[0]}</tspan>
                            <tspan x={textX} dy="10.5">{slice.lines[1]}</tspan>
                          </text>
                        )}
                      </g>
                    );
                  })}
              </svg>
            </motion.div>

            {/* STATIC Center Hub (NEVER ROTATES - stays always perfectly upright and clean in the center) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
              <div className="w-[37%] h-[37%] rounded-full bg-white border-[3px] border-[#DDC1AB] shadow-lg flex flex-col items-center justify-center p-1.5 text-center">
                <span className="text-xs sm:text-sm md:text-base uppercase font-extrabold text-[#6A7B85] tracking-tight text-center px-1 truncate max-w-full leading-tight">
                  {macroSlices.find((s) => normalizeMacro(s.macro) === normalizeMacro(activeMacro))?.shortLabel || activeMacro}
                </span>
                <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[#01374C] leading-none my-0.5">
                  {selectedFlavors.length}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#00D9B4] leading-tight">
                  notas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Descriptors Chips Bar under Wheel */}
        {selectedFlavors.length > 0 && (
          <div className="w-full max-w-4xl mx-auto mt-4 pt-3.5 border-t border-[#E8EDF1]">
            <span className="text-sm sm:text-base font-bold text-[#01374C] block mb-2.5 text-center sm:text-left">
              Sabores percibidos ({selectedFlavors.length}):
            </span>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {selectedFlavors.map((f) => {
                const descObj = FLAVOR_DESCRIPTORS.find(
                  (d) => d.id === f.descriptorId
                );
                const chipColor = descObj?.color || "#00D9B4";
                const display = descObj ? getDescriptorDisplay(descObj) : { primary: f.name, secondary: undefined };
                return (
                  <div
                    key={`selected-${f.descriptorId}`}
                    onClick={() => {
                      if (descObj) setActiveDescriptorForIntensity(descObj);
                    }}
                    className="bg-[#01374C] hover:bg-[#002636] text-white text-xs sm:text-sm pl-3.5 pr-2.5 py-1.5 rounded-full flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                    title="Toca para ver información y calificar intensidad"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs border border-white/30"
                      style={{ backgroundColor: chipColor }}
                    />
                    <span className="font-bold">{display.primary}</span>
                    {display.secondary && (
                      <span className="text-xs font-normal text-white/80">
                        ({display.secondary})
                      </span>
                    )}
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full text-white shadow-2xs"
                      style={{ backgroundColor: chipColor }}
                    >
                      ★ {f.intensity}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFlavor(f.descriptorId);
                      }}
                      className="hover:text-red-300 ml-0.5 cursor-pointer p-0.5"
                      title="Quitar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Descriptors Zoom: Subcategorías y Descriptores del Macro Activo a ancho completo */}
        <div
          className="w-full p-4 sm:p-6 rounded-2xl border transition-all mt-6"
          style={{
            backgroundColor: MACRO_THEMES[activeMacro].bgLight,
            borderColor: MACRO_THEMES[activeMacro].border,
          }}
        >
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b"
            style={{ borderColor: `${MACRO_THEMES[activeMacro].color}30` }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full shadow-2xs shrink-0 ring-2 ring-white"
                style={{ backgroundColor: MACRO_THEMES[activeMacro].color }}
              />
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-black text-[#01374C] leading-tight">
                  Descriptores: {activeMacro}
                </h3>
                <span className="text-xs sm:text-sm text-[#4A5D68] font-medium block">
                  {MACRO_THEMES[activeMacro].description}
                </span>
              </div>
            </div>
            <span className="self-start sm:self-center text-xs sm:text-sm text-[#01374C] font-extrabold bg-white px-3 py-1 rounded-full border border-[#DDC1AB]/60 shadow-2xs">
              Toca para calificar (1 a 5 ★)
            </span>
          </div>

          {/* Cuadrícula de subcategorías aprovechando el ancho de pantalla */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Object.entries(subcategories).map(([subcategory, descriptors]) => (
              <div key={subcategory} className="bg-white/85 p-3.5 rounded-xl border border-white/70 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-sm sm:text-base font-extrabold text-[#01374C] uppercase tracking-wider block mb-3 pb-1 border-b border-[#01374C]/10">
                    {subcategory}
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {descriptors.map((desc) => {
                      const selection = selectedFlavors.find(
                        (f) => f.descriptorId === desc.id
                      );
                      const isSelected = !!selection;
                      const display = getDescriptorDisplay(desc);

                      return (
                        <button
                          key={desc.id}
                          id={`flavor-btn-${desc.id}`}
                          onClick={() => handleSelectDescriptor(desc)}
                          className={`min-h-[46px] text-sm sm:text-base font-bold px-4 py-2.5 rounded-full border transition-all duration-200 flex items-center gap-2 cursor-pointer hover:scale-[1.03] hover:shadow-md active:scale-100 ${
                            isSelected
                              ? "bg-white text-[#01374C] shadow-md scale-[1.02] ring-2 ring-offset-1"
                              : "bg-white text-[#01374C] border-[#DDC1AB] hover:border-[#01374C] shadow-2xs"
                          }`}
                          style={{
                            borderColor: isSelected ? desc.color : undefined,
                            boxShadow: isSelected ? `0 3px 10px ${desc.color}35` : undefined,
                          }}
                        >
                          <span
                            className="w-3 h-3 rounded-full inline-block shrink-0 shadow-2xs border border-black/10"
                            style={{ backgroundColor: desc.color }}
                          />
                          <span className="font-extrabold text-[#01374C]">{display.primary}</span>
                          {display.secondary && (
                            <span className="text-xs sm:text-sm font-medium text-[#52646E]">
                              ({display.secondary})
                            </span>
                          )}
                          {isSelected && (
                            <span
                              className="text-xs font-black px-2 py-0.5 rounded-full text-white shadow-2xs ml-1"
                              style={{ backgroundColor: desc.color }}
                            >
                              ★ {selection.intensity}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Controls: Spider Chart (Paso 3) and Rating/Notes (Paso 4) stacked vertically */}
      <div className="flex flex-col gap-5 mb-6 w-full">
        {/* Control 3: VISTA PREVIA DEL PERFIL DE SABOR (SPIDER CHART) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#E8EDF1] shadow-sm flex flex-col justify-between w-full">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#01374C] flex items-baseline">
                  <span className="text-lg md:text-xl font-black text-[#01374C] mr-1.5">3.</span>
                  <span>Perfil Sensorial al Instante</span>
                </h2>
                <p className="text-sm sm:text-base text-[#4A5D68] mt-0.5 leading-relaxed">
                  Puntos coloreados según las 9 categorías principales de la rueda en tiempo real.
                </p>
              </div>
              <span className="self-start sm:self-center text-xs sm:text-sm font-bold text-[#01374C] bg-[#EBFBFA] px-3.5 py-1 rounded-full border border-[#00D9B4]/30">
                ● En vivo
              </span>
            </div>

            {/* Spider Chart centrado y maximizando el ancho de pantalla de cada dispositivo */}
            <div className="flex justify-center my-4 sm:my-6 w-full">
              <div className="w-full max-w-[min(96vw,450px)] sm:max-w-[560px] md:max-w-[660px] lg:max-w-[760px] xl:max-w-[840px] aspect-square flex items-center justify-center mx-auto">
                <RadarChart
                  primaryProfile={liveSpiderProfile}
                  responsive={true}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto w-full grid grid-cols-3 gap-2.5 sm:gap-4 mt-4 pt-5 border-t border-[#E8EDF1] text-center text-xs sm:text-sm">
            <div className="p-3 sm:p-4 rounded-xl bg-[#FAF6F2] border border-[#F0E6DD]/70 transition-colors">
              <span className="text-xs sm:text-sm text-[#4A5D68] block font-semibold mb-0.5">Acidez</span>
              <strong className="text-[#01374C] font-black text-lg sm:text-2xl">
                {liveSpiderProfile.acidez}%
              </strong>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-[#FAF6F2] border border-[#F0E6DD]/70 transition-colors">
              <span className="text-xs sm:text-sm text-[#4A5D68] block font-semibold mb-0.5">Cuerpo</span>
              <strong className="text-[#01374C] font-black text-lg sm:text-2xl">
                {liveSpiderProfile.cuerpo}%
              </strong>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-[#FAF6F2] border border-[#F0E6DD]/70 transition-colors">
              <span className="text-xs sm:text-sm text-[#4A5D68] block font-semibold mb-0.5">Balance</span>
              <strong className="text-[#01374C] font-black text-lg sm:text-2xl">
                {liveSpiderProfile.balance}%
              </strong>
            </div>
          </div>
        </div>

        {/* Control 4: TU CALIFICACIÓN GENERAL Y ANOTACIONES */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#E8EDF1] shadow-sm flex flex-col justify-between w-full">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#01374C] flex items-baseline mb-1">
              <span className="text-lg md:text-xl font-black text-[#01374C] mr-1.5">4.</span>
              <span>Tu Calificación General y Anotaciones</span>
            </h2>
            <p className="text-sm sm:text-base text-[#4A5D68] mb-3 leading-relaxed">
              Evalúa la impresión global de tu café y guarda tus notas de cata.
            </p>

            {/* 5-Star Rating */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 my-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={`star-${star}`}
                  id={`star-btn-${star}`}
                  onClick={() => onRatingChange(star)}
                  className="min-h-[48px] min-w-[48px] p-2 flex items-center justify-center text-2xl sm:text-3xl transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                  aria-label={`Calificar con ${star} estrellas`}
                >
                  <Star
                    className={`w-8 h-8 sm:w-10 sm:h-10 ${
                      rating >= star
                        ? "fill-[#00D9B4] text-[#00D9B4]"
                        : "text-[#DDE4E8]"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm sm:text-base font-semibold text-[#01374C] mb-4">
              {rating === 5
                ? "¡Excepcional! Taza memorable de concurso."
                : rating === 4
                ? "Muy bueno. Taza compleja y placentera."
                : rating === 3
                ? "Buen café. Balance correcto para el día a día."
                : rating === 2
                ? "Aceptable, pero le faltó claridad o dulzor."
                : "Desbalanceado o con defectos de extracción."}
            </p>

            {/* Notes input */}
            <textarea
              id="tasting-notes-input"
              value={userNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Apuntes personales: ¿cómo se sintió la primera taza caliente vs tibia? ¿qué postgusto quedó?..."
              rows={4}
              className="w-full text-base p-3.5 sm:p-4 rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C] placeholder:text-[#889DA7] leading-relaxed min-h-[110px]"
            />
          </div>
        </div>
      </div>

      {/* Global Brand Footer */}
      <BrandFooter className="mt-6 mb-2" />

      {/* Primary Save CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] border-t border-[#E8EDF1] z-20 shadow-[0_-4px_20px_rgba(1,55,76,0.06)]">
        <div className="max-w-lg md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto flex items-center gap-2">
          <button
            id="save-cata-btn"
            onClick={onSaveCata}
            disabled={selectedFlavors.length === 0}
            className={`flex-1 min-h-[52px] py-4 px-5 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] ${
              selectedFlavors.length > 0
                ? "bg-[#01374C] text-white hover:bg-[#002636] cursor-pointer"
                : "bg-[#E8EDF1] text-[#9FB2BC] cursor-not-allowed"
            }`}
          >
            <Check className="w-5 h-5 text-[#00D9B4] stroke-[2.5]" />
            {isEditing
              ? `Actualizar Cata en Mi Bitácora (${selectedFlavors.length} notas)`
              : `Guardar Cata en Mi Bitácora (${selectedFlavors.length} notas)`}
          </button>
        </div>
      </div>

      {/* Pop-up Modal for Flavor Descriptor Details & Intensity (1 a 5) */}
      <AnimatePresence>
        {activeDescriptorForIntensity && (() => {
          const display = getDescriptorDisplay(activeDescriptorForIntensity);
          const currentSelection = selectedFlavors.find(
            (f) => f.descriptorId === activeDescriptorForIntensity.id
          );
          const currentVal = currentSelection ? currentSelection.intensity : 3;
          const themeColor =
            activeDescriptorForIntensity.color ||
            MACRO_THEMES[normalizeMacro(activeDescriptorForIntensity.macro)]?.color ||
            "#01374C";

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
              onClick={() => setActiveDescriptorForIntensity(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 14 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-[#E8EDF1] relative overflow-hidden"
              >
                {/* Decorative Top Accent Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{ backgroundColor: themeColor }}
                />

                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3 pt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-5 h-5 rounded-full shrink-0 shadow-xs border-2 border-white ring-1 ring-black/10"
                      style={{ backgroundColor: themeColor }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#4A5D68] uppercase tracking-wider block">
                        {activeDescriptorForIntensity.macro} • {activeDescriptorForIntensity.subcategory}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[#01374C] leading-tight mt-0.5">
                        {display.primary}
                        {display.secondary && (
                          <span className="text-sm sm:text-base font-normal text-[#52646E] ml-1.5">
                            ({display.secondary})
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveDescriptorForIntensity(null)}
                    className="p-2 rounded-full bg-[#FAF6F2] hover:bg-[#F2ECE4] text-[#01374C] border border-[#DDC1AB] transition-colors cursor-pointer shrink-0"
                    aria-label="Cerrar ventana"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sensory Reference & Official Descriptor Pills */}
                <div className="flex flex-wrap gap-2 mb-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#01374C] bg-[#FAF6F2] border border-[#DDC1AB] px-3.5 py-1.5 rounded-lg">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: themeColor }}
                    />
                    <span className="text-[#4A5D68]">Referencia sensorial:</span>
                    <strong className="text-[#01374C]">{display.primary}</strong>
                  </span>
                  {display.secondary && (
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#01374C] bg-[#FAF6F2] border border-[#DDC1AB] px-3.5 py-1.5 rounded-lg">
                      <span className="text-[#4A5D68]">Descriptor SCA:</span>
                      <strong className="text-[#01374C]">{display.secondary}</strong>
                    </span>
                  )}
                </div>

                {/* Hint/Description */}
                {activeDescriptorForIntensity.hint && (
                  <div className="bg-[#FAF6F2]/80 rounded-xl p-3.5 sm:p-4 border border-[#E8DCD4] mb-4">
                    <p className="text-sm sm:text-base text-[#3B2212] leading-relaxed italic">
                      "{activeDescriptorForIntensity.hint}"
                    </p>
                  </div>
                )}

                {/* Intensity Selector Section */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs sm:text-sm font-bold text-[#01374C] flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#00D9B4]" />
                      <span>Calificar Intensidad (1 - 5):</span>
                    </label>
                    <span
                      className="text-xs sm:text-sm font-black px-3.5 py-1 rounded-full text-white shadow-2xs"
                      style={{ backgroundColor: themeColor }}
                    >
                      {currentVal === 1
                        ? "1 • Sutil"
                        : currentVal === 2
                        ? "2 • Suave"
                        : currentVal === 3
                        ? "3 • Marcado"
                        : currentVal === 4
                        ? "4 • Intenso"
                        : "5 • Dominante"}
                    </span>
                  </div>

                  {/* 5-Level Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((lvl) => {
                      const isSelectedLvl = currentVal === lvl;
                      return (
                        <button
                          key={`popup-lvl-${lvl}`}
                          id={`intensity-popup-${lvl}-btn`}
                          onClick={() => updateIntensity(activeDescriptorForIntensity.id, lvl)}
                          className={`min-h-[50px] py-2.5 rounded-xl text-center font-black transition-all cursor-pointer border ${
                            isSelectedLvl
                              ? "text-white shadow-md scale-102 ring-2 ring-offset-1 ring-[#01374C]"
                              : "bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] hover:bg-[#F2ECE4]"
                          }`}
                          style={{
                            backgroundColor: isSelectedLvl ? themeColor : undefined,
                            borderColor: isSelectedLvl ? themeColor : undefined,
                          }}
                        >
                          <div className="text-base sm:text-lg font-black">{lvl}</div>
                          <div className="text-[11px] sm:text-xs font-semibold opacity-90 truncate px-0.5 mt-0.5">
                            {lvl === 1 ? "Sutil" : lvl === 2 ? "Suave" : lvl === 3 ? "Medio" : lvl === 4 ? "Alto" : "Puro"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons: Quitar y Listo */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#E8EDF1]">
                  <button
                    onClick={() => removeFlavor(activeDescriptorForIntensity.id)}
                    className="min-h-[46px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                  >
                    Quitar Sabor
                  </button>
                  <button
                    onClick={() => setActiveDescriptorForIntensity(null)}
                    className="flex-1 min-h-[46px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#01374C] hover:bg-[#002636] transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-[#00D9B4]" />
                    <span>Listo</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
