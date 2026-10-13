/**
 * ============================================================================
 * GUÍA INTERACTIVA DE INICIO (ONBOARDING GUIDE MODAL)
 * ============================================================================
 * Experiencia pedagógica paso a paso para catadores principiantes y aficionados:
 * - Paso 1: Introducción a la filosofía del café de especialidad y Varietale.
 * - Paso 2: Funcionamiento de la Rueda de Sabores y selección por familias.
 * - Paso 3: Atributos táctiles (cuerpo en boca) y acidez viva.
 * - Paso 4: Lectura e interpretación del gráfico de radar y la bitácora personal.
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sliders,
  CheckCircle2,
  X,
  BookOpen,
  Coffee,
  Disc3,
  Activity,
  Check,
} from "lucide-react";
import { RadarChart } from "./RadarChart";
import { BrandFooter } from "./BrandFooter";

interface OnboardingGuideModalProps {
  /** Indica si la guía se encuentra abierta */
  isOpen: boolean;
  /** Acción para cerrar la guía */
  onClose: () => void;
  /** Disparador para iniciar la primera cata guiada */
  onStartFirstCata: () => void;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  isOpen,
  onClose,
  onStartFirstCata,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const totalSteps = 4;

  const handleClose = () => {
    setCurrentStep(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    onClose();
  };

  // Al abrir o cerrar la visita guiada, volver siempre al paso 1 y arriba
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  // Al pasar de paso a paso, asegurar que la pantalla siempre cargue en la parte superior
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" });
      scrollContainerRef.current.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Perfil estático para la simulación visual del Paso 4
  const sampleRadarProfile = {
    frutal: 85,
    dulce: 75,
    tostado: 40,
    floral: 65,
    cuerpo: 70,
    acidez: 85,
    balance: 80,
  };

  const stepsMetadata = [
    {
      num: "1",
      title: "1. Selecciona tu café y el método de filtrado.",
      icon: Coffee,
      badge: "Paso 1 de 4",
    },
    {
      num: "2",
      title: "2. Cata con la rueda de sabores.",
      icon: Disc3,
      badge: "Paso 2 de 4",
    },
    {
      num: "3",
      title: "3. Asigna la intensidad por sabor.",
      icon: Sliders,
      badge: "Paso 3 de 4",
    },
    {
      num: "4",
      title: "4. Visualiza el perfil y guardalo en tu bitácora.",
      icon: Activity,
      badge: "Paso 4 de 4",
    },
  ];

  const currentMeta = stepsMetadata[currentStep];
  const StepIcon = currentMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        className="bg-white rounded-3xl p-5 sm:p-6 md:p-7 max-w-lg md:max-w-xl lg:max-w-2xl w-full shadow-2xl border border-[#E8EDF1] max-h-[92vh] flex flex-col justify-between overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E8EDF1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#01374C] text-white flex items-center justify-center text-sm font-black">
              V
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#00897B] block leading-none">
                Visita Guiada
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#01374C] leading-tight mt-0.5">
                Bitácora de Catación Varietale
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#01374C] bg-[#FAF6F2] border border-[#DDC1AB] px-3 py-1 rounded-full">
              {currentStep + 1} / {totalSteps}
            </span>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-[#FAF6F2] hover:bg-[#F2ECE4] border border-[#DDC1AB] text-[#01374C] transition-colors cursor-pointer"
              aria-label="Cerrar guía"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Header Indicator - Título solicitado sin subtítulo */}
        <div className="mt-3.5 mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBFBFA] border border-[#00D9B4]/40 text-[#01374C] flex items-center justify-center font-black text-sm shrink-0">
              <StepIcon className="w-4 h-4 text-[#00897B]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#01374C] leading-snug">
                {currentMeta.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Dynamic Slide Content */}
        <div ref={scrollContainerRef} className="my-2 overflow-y-auto pr-1 flex-1">
          <AnimatePresence mode="wait">
            {/* PASO 1: SELECCIONA TU CAFÉ Y EL MÉTODO DE FILTRADO */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Texto descriptivo amigable */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF6F2] border border-[#E8DCD4] text-xs sm:text-sm text-[#01374C] leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#01374C]">
                    <Sparkles className="w-3.5 h-3.5 text-[#00D9B4]" />
                    <span>Primer paso: Tu café y tu método</span>
                  </div>
                  <p>
                    Comienza eligiendo tu café favorito de Varietale, escaneando el empaque con tu cámara o escribiendo sus datos de origen. Luego, indica el método de filtrado que vas a preparar para que tu receta quede lista antes de empezar a degustar.
                  </p>
                </div>

                {/* Simulación visual no interactiva idéntica a la app */}
                <div className="pointer-events-none select-none bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E8EDF1] pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#00897B] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00897B]" />
                      Ejemplo:
                    </span>
                    <span className="text-[10px] font-bold text-[#52646E] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#E8EDF1]">
                      Café y Método
                    </span>
                  </div>

                  {/* 1. Café Seleccionado en la app */}
                  <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB]/70 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0 shadow-xs">
                      <Coffee className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#00897B] bg-[#EBFBFA] px-1.5 py-0.2 rounded border border-[#00D9B4]/30">
                          Seleccionado ✓
                        </span>
                        <span className="text-[10px] text-[#6A7B85] font-medium">Varietale Oficial</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-[#01374C] truncate mt-0.5">
                        Geisha - La Palma & El Tucán
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#52646E] mt-0.5">
                        <span>📍 Cundinamarca</span>
                        <span>•</span>
                        <span>🌱 Natural</span>
                        <span>•</span>
                        <span>⛰️ 1,750 msnm</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Método de filtrado preparado */}
                  <div>
                    <span className="text-[11px] font-extrabold text-[#01374C] uppercase tracking-wider block mb-1.5">
                      Método de Preparación.
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="p-2 sm:p-2.5 rounded-xl text-center border bg-[#01374C] text-white border-[#01374C] shadow-sm">
                        <span className="text-xs font-black block">V60 ✓</span>
                        <span className="text-[9px] block text-white/85 leading-tight mt-0.5">Brillante</span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl text-center border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-70">
                        <span className="text-xs font-bold block">Chemex</span>
                        <span className="text-[9px] block text-[#6A7B85] leading-tight mt-0.5">Limpio</span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl text-center border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-70">
                        <span className="text-xs font-bold block">Aeropress</span>
                        <span className="text-[9px] block text-[#6A7B85] leading-tight mt-0.5">Cuerpo</span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl text-center border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-70">
                        <span className="text-xs font-bold block">Prensa</span>
                        <span className="text-[9px] block text-[#6A7B85] leading-tight mt-0.5">Denso</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Control de Calidad */}
                  <div className="p-2.5 rounded-xl bg-[#FDFCFB] border border-[#E8EDF1] flex items-center justify-between text-[11px] text-[#01374C]">
                    <div className="flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D9B4]" />
                      <span>Agua filtrada (92°C)</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D9B4]" />
                      <span>Molienda media</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D9B4]" />
                      <span>Cata a ciegas</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASO 2: CATA CON LA RUEDA DE SABORES */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Texto descriptivo amigable */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF6F2] border border-[#E8DCD4] text-xs sm:text-sm text-[#01374C] leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#01374C]">
                    <Sparkles className="w-3.5 h-3.5 text-[#00D9B4]" />
                    <span>Segundo paso: Encuentra los aromas y sabores</span>
                  </div>
                  <p>
                    Acércate a tu taza, inhala su fragancia y prueba un sorbo. Explora las familias sensoriales de la rueda (frutal, dulce, etc.) y toca aquellas notas que sientas florecer en tu paladar.
                  </p>
                </div>

                {/* Simulación visual no interactiva idéntica a la rueda de la app */}
                <div className="pointer-events-none select-none bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E8EDF1] pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#00897B] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00897B]" />
                      Ejemplo:
                    </span>
                    <span className="text-[10px] font-bold text-[#52646E] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#E8EDF1]">
                      Rueda SCA y Descriptores
                    </span>
                  </div>

                  {/* Familias sensoriales (Frutal destacada como en la app) */}
                  <div>
                    <span className="text-[11px] font-extrabold text-[#01374C] uppercase tracking-wider block mb-1.5">
                      Familias sensoriales de la rueda:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="p-1.5 rounded-xl text-center bg-[#01374C] text-white border border-[#01374C] shadow-xs">
                        <span className="text-sm block">🍓</span>
                        <span className="text-[11px] font-bold block leading-tight mt-0.5">Frutal ✓</span>
                      </div>
                      <div className="p-1.5 rounded-xl text-center bg-[#FAF6F2] text-[#01374C] border border-[#E8EDF1] opacity-75">
                        <span className="text-sm block">🌸</span>
                        <span className="text-[11px] font-bold block leading-tight mt-0.5">Floral</span>
                      </div>
                      <div className="p-1.5 rounded-xl text-center bg-[#FAF6F2] text-[#01374C] border border-[#E8EDF1] opacity-75">
                        <span className="text-sm block">🍯</span>
                        <span className="text-[11px] font-bold block leading-tight mt-0.5">Dulce</span>
                      </div>
                    </div>
                  </div>

                  {/* Descriptores de la familia Frutal tal como se ven en la app */}
                  <div className="p-3 rounded-xl bg-[#FAF6F2] border border-[#E8DCD4]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-[#01374C] uppercase tracking-wider">
                        Subcategoría: Frutas rojas & Cítricos
                      </span>
                      <span className="text-[10px] font-bold text-[#00897B] bg-white px-2 py-0.5 rounded-full border border-[#00D9B4]/30">
                        Toca para seleccionar
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {/* Fresa seleccionada */}
                      <div className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-white text-[#01374C] border-2 border-[#E53935] shadow-xs flex items-center gap-1.5 ring-2 ring-[#E53935]/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E53935] shrink-0" />
                        <strong className="font-bold">Fresa</strong>
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full text-white bg-[#E53935]">
                          ★ 4
                        </span>
                      </div>
                      {/* Manzana verde seleccionada */}
                      <div className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-white text-[#01374C] border-2 border-[#7CB342] shadow-xs flex items-center gap-1.5 ring-2 ring-[#7CB342]/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7CB342] shrink-0" />
                        <strong className="font-bold">Manzana verde</strong>
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full text-white bg-[#7CB342]">
                          ★ 3
                        </span>
                      </div>
                      {/* Descriptores disponibles sin seleccionar */}
                      <div className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-white text-[#01374C] border border-[#DDC1AB] flex items-center gap-1.5 opacity-80">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FDD835] shrink-0" />
                        <span>Limón</span>
                      </div>
                      <div className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-white text-[#01374C] border border-[#DDC1AB] flex items-center gap-1.5 opacity-80">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8E24AA] shrink-0" />
                        <span>Mora silvestre</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen inferior de notas */}
                  <div className="flex items-center justify-between text-[11px] text-[#4A5D68] px-1">
                    <span>Notas añadidas a tu cata:</span>
                    <span className="font-extrabold text-[#01374C] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#DDC1AB]">
                      2 notas registradas
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASO 3: ASIGNA LA INTENSIDAD POR SABOR */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Texto descriptivo amigable */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF6F2] border border-[#E8DCD4] text-xs sm:text-sm text-[#01374C] leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#01374C]">
                    <Sparkles className="w-3.5 h-3.5 text-[#00D9B4]" />
                    <span>Tercer paso: Calibra la intensidad y el cuerpo</span>
                  </div>
                  <p>
                    Al tocar cada nota, ajusta qué tan presente la sientes, desde un toque sutil hasta un sabor dominante. Además, describe la sensación táctil del café en boca: ligero como un té, jugoso o con cuerpo denso y cremoso.
                  </p>
                </div>

                {/* Simulación visual no interactiva del Pop-up de Intensidad y Cuerpo */}
                <div className="pointer-events-none select-none bg-white p-3.5 sm:p-4 rounded-2xl border border-[#01374C]/25 shadow-md space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E53935]" />

                  <div className="flex items-center justify-between border-b border-[#E8EDF1] pb-2 pt-0.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#00897B] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00897B]" />
                      Ejemplo:
                    </span>
                    <span className="text-[10px] font-bold text-[#52646E] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#E8EDF1]">
                      Sabores y Sensación.
                    </span>
                  </div>

                  {/* Cabecera del pop-up */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#E53935] shadow-xs" />
                      <div>
                        <span className="text-[10px] font-bold text-[#6A7B85] uppercase tracking-wider block">
                          Frutal • Frutas rojas
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-[#01374C] leading-none mt-0.5">
                          Fresa fresca
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#01374C] text-white shadow-xs">
                      ★ 4 / 5 Intenso
                    </span>
                  </div>

                  {/* 5 botones de nivel de intensidad (Nivel 4 destacado) */}
                  <div>
                    <span className="text-[10px] font-bold text-[#4A5D68] uppercase tracking-wider block mb-1.5">
                      Escala de intensidad (1 a 5):
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      <div className="py-1.5 rounded-xl text-center border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-60">
                        <div className="text-xs font-black">1</div>
                        <div className="text-[9px] font-semibold text-[#6A7B85]">Sutil</div>
                      </div>
                      <div className="py-1.5 rounded-xl text-center border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-60">
                        <div className="text-xs font-black">2</div>
                        <div className="text-[9px] font-semibold text-[#6A7B85]">Suave</div>
                      </div>
                      <div className="py-1.5 rounded-xl text-center border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-60">
                        <div className="text-xs font-black">3</div>
                        <div className="text-[9px] font-semibold text-[#6A7B85]">Marcado</div>
                      </div>
                      <div className="py-1.5 rounded-xl text-center border bg-[#01374C] text-white border-[#01374C] shadow-sm ring-2 ring-[#00D9B4]/50">
                        <div className="text-xs font-black">4 ★</div>
                        <div className="text-[9px] font-black text-[#00D9B4]">Intenso</div>
                      </div>
                      <div className="py-1.5 rounded-xl text-center border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-60">
                        <div className="text-xs font-black">5</div>
                        <div className="text-[9px] font-semibold text-[#6A7B85]">Dominante</div>
                      </div>
                    </div>
                  </div>

                  {/* Sensación táctil de Cuerpo */}
                  <div className="pt-2 border-t border-[#E8EDF1]">
                    <span className="text-[10px] font-bold text-[#4A5D68] uppercase tracking-wider block mb-1.5">
                      Sensación táctil de Cuerpo (Paso 1 del examen táctil):
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="py-1.5 px-1 rounded-xl text-center text-xs font-bold border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-60">
                        Ligero (Té)
                      </div>
                      <div className="py-1.5 px-1 rounded-xl text-center text-xs font-black border bg-[#01374C] text-white border-[#01374C] shadow-xs">
                        Medio (Jugoso) ✓
                      </div>
                      <div className="py-1.5 px-1 rounded-xl text-center text-xs font-bold border bg-[#FAF6F2] text-[#01374C] border-[#E8EDF1] opacity-60">
                        Denso (Cremoso)
                      </div>
                    </div>
                  </div>

                  {/* Botón de guardar nota simulado */}
                  <div className="pt-1">
                    <div className="w-full py-2 px-3 rounded-xl bg-[#01374C] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs">
                      <Check className="w-3.5 h-3.5 text-[#00D9B4]" />
                      <span>Confirmar Nota: Fresa fresca (★ 4 Intenso)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASO 4: VISUALIZA EL PERFIL Y GUÁRDALO EN TU BITÁCORA */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Texto descriptivo amigable */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF6F2] border border-[#E8DCD4] text-xs sm:text-sm text-[#01374C] leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#01374C]">
                    <Sparkles className="w-3.5 h-3.5 text-[#00D9B4]" />
                    <span>Cuarto paso: Tu perfil sensorial y bitácora</span>
                  </div>
                  <p>
                    Observa cómo la gráfica cobra vida visualmente con el perfil de tu café en tiempo real. Para terminar, dale tu puntuación con estrellas, escribe tus notas o impresiones personales y guárdalo en tu bitácora para revivir esta experiencia siempre que quieras.
                  </p>
                </div>

                {/* Simulación visual no interactiva del Perfil Radar y Guardado */}
                <div className="pointer-events-none select-none bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E8EDF1] pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#00897B] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00897B]" />
                      Ejemplo:
                    </span>
                    <span className="text-[10px] font-bold text-[#52646E] bg-[#FAF6F2] px-2 py-0.5 rounded-full border border-[#E8EDF1]">
                      Gráfica de Perfil y Bitácora.
                    </span>
                  </div>

                  {/* Radar Chart */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-[#01374C]">
                        Perfil Sensorial SCA en Tiempo Real
                      </span>
                      <span className="text-[10px] font-bold text-[#00897B] bg-[#EBFBFA] px-2 py-0.5 rounded-full border border-[#00D9B4]/30">
                        ● Equilibrado
                      </span>
                    </div>

                    <div className="w-[170px] h-[170px] my-1 flex items-center justify-center">
                      <RadarChart
                        primaryProfile={sampleRadarProfile}
                        size={170}
                        showLabels={true}
                      />
                    </div>
                  </div>

                  {/* Puntuación y notas personales */}
                  <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#E8DCD4] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-[#01374C] uppercase tracking-wider">
                        Calificación del catador:
                      </span>
                      <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                        <span>★ ★ ★ ★ ★</span>
                        <span className="text-[#01374C] font-black ml-1">4.5</span>
                      </div>
                    </div>
                    <p className="text-[11px] italic text-[#4A5D68] leading-tight">
                      «Fragancia floral embriagadora, notas vivas a fresa y dulce acidez cítrica.»
                    </p>
                  </div>

                  {/* Botón de guardar idéntico a la app */}
                  <div className="w-full py-2.5 px-3 rounded-xl bg-[#01374C] text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs">
                    <Check className="w-4 h-4 text-[#00D9B4] stroke-[2.5]" />
                    <span>Guardar Cata en Mi Bitácora (3 notas)</span>
                  </div>
                </div>

                {/* Lo que obtienes al guardar */}
                <div className="p-3.5 rounded-2xl bg-[#01374C] text-white space-y-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-[#00D9B4] flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>En Mi Bitácora podrás:</span>
                  </h4>
                  <ul className="text-[11px] sm:text-xs text-white/90 space-y-1 leading-relaxed">
                    <li>• Comparar el mismo café con 2 métodos en una sola gráfica.</li>
                    <li>• Guardar tus impresiones y calificación personal de cada taza.</li>
                    <li>• Acumular tu mapa de territorio sensorial explorado.</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Pagination & Navigation */}
        <div className="pt-3.5 border-t border-[#E8EDF1] space-y-2.5">
          {/* Progress Indicators */}
          <div className="flex justify-center gap-1.5 mb-2">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={`guide-dot-${idx}`}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentStep === idx
                    ? "w-6 bg-[#01374C]"
                    : "w-2 bg-[#DDE4E8] hover:bg-[#9FB2BC]"
                }`}
                title={`Ir al paso ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="min-h-[48px] py-3 px-4 rounded-xl border border-[#DDC1AB] text-sm sm:text-base font-bold text-[#01374C] hover:bg-[#FAF6F2] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            )}

            {currentStep < totalSteps - 1 ? (
              <button
                id="onboarding-next-btn"
                onClick={handleNext}
                className="flex-1 min-h-[48px] py-3.5 px-4 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <span>Siguiente paso</span>
                <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
              </button>
            ) : (
              <button
                id="onboarding-start-cata-btn"
                onClick={() => {
                  handleClose();
                  onStartFirstCata();
                }}
                className="flex-1 min-h-[48px] py-3.5 px-4 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white text-sm sm:text-base font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#00D9B4]" />
                <span>¡Comenzar mi primera cata!</span>
                <ArrowRight className="w-4 h-4 text-white/80" />
              </button>
            )}
          </div>

          <BrandFooter className="pt-2 border-t border-[#E8EDF1] mt-1 text-xs" />
        </div>
      </motion.div>
    </div>
  );
};
