/**
 * ============================================================================
 * PANTALLA DE REGISTRO DE CAFÉ (REGISTRATION SCREEN) - PASO 1 DE CATA
 * ============================================================================
 * Permite capturar los datos del café y los parámetros de extracción:
 * 1. Métodos de ingreso del grano:
 *    - Foto con OCR asistido por Gemini AI (escaneo de bolsa/etiqueta).
 *    - Selección directa desde el catálogo oficial en vivo de Varietale.
 *    - Ingreso manual de ficha técnica (origen, variedad, proceso, altura).
 * 2. Selección del método de extracción (V60, Chemex, Aeropress, Prensa, etc.).
 * 3. Lista de control de calidad previa (agua filtrada, molienda, temperatura).
 * 4. Transición hacia la Rueda de Sabores Interactiva.
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Droplets,
  Layers,
  ListFilter,
  Edit3,
  Coffee,
  X,
  Check,
  Globe,
} from "lucide-react";
import {
  BrewMethod,
  QualityChecklist,
  CoffeeInfo,
} from "../types";
import {
  BREW_METHODS,
  VARIETALE_SAMPLE_COFFEES,
  COFFEE_PRODUCING_COUNTRIES,
  COLOMBIAN_DEPARTMENTS,
  COFFEE_MAIN_VARIETIES,
  COFFEE_MAIN_PROCESSES,
} from "../data/coffeeData";
import { BrewMethodIcon } from "./BrewMethodIcons";
import { BrandFooter } from "./BrandFooter";
import { WelcomeGiftCard } from "./WelcomeGiftCard";
import { VarietaleBrandIcon } from "./VarietaleLogo";

interface RegistrationScreenProps {
  /** Información técnica del café a evaluar */
  coffeeInfo: CoffeeInfo;
  /** Actualizador de la ficha técnica del café */
  onCoffeeInfoChange: (info: CoffeeInfo) => void;
  /** Método de extracción seleccionado */
  selectedMethod: BrewMethod;
  /** Actualizador del método de preparación */
  onMethodChange: (method: BrewMethod) => void;
  /** Parámetros de calidad verificados */
  qualityChecklist: QualityChecklist;
  /** Actualizador de la lista de verificación */
  onQualityChecklistChange: (checklist: QualityChecklist) => void;
  /** Fotografía capturada de la bolsa o preparación */
  photoUrl: string | null;
  /** Actualizador de la foto */
  onPhotoChange: (url: string | null) => void;
  /** Avanza hacia el Paso 2 (Rueda de Sabores) */
  onProceedToWheel: () => void;
  /** Cancela y regresa a la pantalla de inicio o bitácora */
  onCancel: () => void;
  /** Catálogo en vivo sincronizado con varietale.com */
  liveCoffees?: CoffeeInfo[];
  /** Indica si se está editando una cata existente */
  isEditing?: boolean;
  /** Indica si el usuario aún no tiene catas en la bitácora */
  hasZeroTastings?: boolean;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({
  coffeeInfo,
  onCoffeeInfoChange,
  selectedMethod,
  onMethodChange,
  qualityChecklist,
  onQualityChecklistChange,
  photoUrl,
  onPhotoChange,
  onProceedToWheel,
  onCancel,
  liveCoffees: propLiveCoffees,
  isEditing = false,
  hasZeroTastings = false,
}) => {
  const [showGiftModal, setShowGiftModal] = useState<boolean>(
    Boolean(hasZeroTastings && !isEditing)
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2 modos de selección para el Paso 1 (Catálogo Varietale o Ingreso Manual / Otra marca)
  type CoffeeInputMode = "lista" | "asistido";
  const [inputMode, setInputMode] = useState<CoffeeInputMode>(() => {
    if (coffeeInfo.brand && coffeeInfo.brand !== "VARIETALE") return "asistido";
    return "lista";
  });

  // Catálogo en vivo de Varietale
  const [localCatalog, setLocalCatalog] = useState<CoffeeInfo[]>(VARIETALE_SAMPLE_COFFEES);
  const [listCategory, setListCategory] = useState<string>("todos");

  const liveCatalog = propLiveCoffees && propLiveCoffees.length > 0 ? propLiveCoffees : localCatalog;

  // Asegurar que la pantalla siempre cargue en la parte superior
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [inputMode]);

  useEffect(() => {
    if (propLiveCoffees && propLiveCoffees.length > 0) return;
    async function loadCatalog() {
      try {
        const res = await fetch("/api/varietale-coffees");
        if (res.ok) {
          const json = await res.json();
          if (json.coffees && json.coffees.length > 0) {
            setLocalCatalog(json.coffees);
          }
        }
      } catch (err) {
        console.warn("Using sample coffees in registration screen:", err);
      }
    }
    loadCatalog();
  }, [propLiveCoffees]);

  const filteredCatalog = liveCatalog.filter((c) => {
    if (listCategory === "todos") return true;
    const type = (c.productType || "").toLowerCase();
    const name = (c.coffeeName || "").toLowerCase();
    const process = (c.process || "").toLowerCase();
    if (listCategory === "exoticos") return type.includes("exótico") || name.includes("papayo") || name.includes("san antonio");
    if (listCategory === "especiales") return type.includes("especial");
    if (listCategory === "edicion") return type.includes("edición");
    if (listCategory === "descafeinado") return name.includes("descafein") || process.includes("descafein");
    return true;
  });

  // Helper de compresión instantánea en el navegador (reduce de ~10MB a ~180KB en <100ms)
  const compressImageForAnalysis = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => {
        resolve({ base64: "", mimeType: file.type || "image/jpeg" });
      };
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;
        if (!rawDataUrl) {
          resolve({ base64: "", mimeType: file.type || "image/jpeg" });
          return;
        }
        const img = new Image();
        img.onerror = () => {
          resolve({ base64: rawDataUrl, mimeType: file.type || "image/jpeg" });
        };
        img.onload = () => {
          try {
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve({ base64: rawDataUrl, mimeType: file.type || "image/jpeg" });
              return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
            resolve({ base64: compressedDataUrl, mimeType: "image/jpeg" });
          } catch {
            resolve({ base64: rawDataUrl, mimeType: file.type || "image/jpeg" });
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Captura local de imagen sin OCR ni IA (almacenamiento ultra-rápido en cliente)
  const handleImageFile = async (file: File) => {
    if (!file) return;

    try {
      const { base64: optimizedBase64 } = await compressImageForAnalysis(file);
      if (!optimizedBase64) {
        throw new Error("No se pudo leer la imagen.");
      }

      onPhotoChange(optimizedBase64);
      setScanMessage("Foto de la bolsa lista para tu ficha de cata.");
    } catch (err) {
      console.error(err);
      setScanMessage("No se pudo procesar la foto.");
    }
  };

  // --------------------------------------------------------------------------
  // ESTADO Y LÓGICA ASISTIDA (País, Departamento, Variedad Múltiple, Beneficio)
  // --------------------------------------------------------------------------

  // Marca por defecto "VARIETALE"
  const brandValue = coffeeInfo.brand ?? "VARIETALE";

  // País
  const defaultCountry = coffeeInfo.country || "Colombia";
  const isStandardCountry = COFFEE_PRODUCING_COUNTRIES.includes(defaultCountry);
  const [selectedCountry, setSelectedCountry] = useState<string>(
    isStandardCountry ? defaultCountry : "Otro"
  );
  const [customCountry, setCustomCountry] = useState<string>(
    isStandardCountry ? "" : defaultCountry
  );

  // Departamento (solo activo y filtrado si País === Colombia)
  const currentDept = coffeeInfo.department || "";
  const isStandardDept = COLOMBIAN_DEPARTMENTS.includes(currentDept);
  const [selectedDept, setSelectedDept] = useState<string>(() => {
    if (isStandardDept) return currentDept;
    if (currentDept) return "Otro";
    return "";
  });
  const [customDept, setCustomDept] = useState<string>(
    isStandardDept ? "" : currentDept
  );

  // Variedades (selección múltiple para blends/mezclas)
  const initialVarieties = useMemo(() => {
    return (coffeeInfo.variety || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }, [coffeeInfo.variety]);

  const [selectedVarieties, setSelectedVarieties] = useState<string[]>(() => {
    const standard = initialVarieties.filter((v) =>
      COFFEE_MAIN_VARIETIES.includes(v)
    );
    const custom = initialVarieties.filter(
      (v) => !COFFEE_MAIN_VARIETIES.includes(v)
    );
    if (custom.length > 0) {
      standard.push("Otro");
    }
    return standard;
  });

  const [customVariety, setCustomVariety] = useState<string>(() => {
    const custom = initialVarieties.filter(
      (v) => !COFFEE_MAIN_VARIETIES.includes(v)
    );
    return custom.join(", ");
  });

  // Proceso / Beneficio
  const currentProcess = coffeeInfo.process || "";
  const isStandardProc = COFFEE_MAIN_PROCESSES.includes(currentProcess);
  const [selectedProcess, setSelectedProcess] = useState<string>(() => {
    if (isStandardProc) return currentProcess;
    if (currentProcess) return "Otro";
    return "";
  });
  const [customProcess, setCustomProcess] = useState<string>(
    isStandardProc ? "" : currentProcess
  );

  // Sincroniza el origen compuesto geográfico
  const updateOrigin = (countryVal: string, deptVal: string) => {
    const cleanCountry = countryVal.trim();
    const cleanDept = deptVal.trim();
    let computedOrigin = "";
    if (cleanCountry === "Colombia") {
      computedOrigin = cleanDept ? `${cleanDept}, Colombia` : "Colombia";
    } else {
      computedOrigin = cleanDept && cleanCountry ? `${cleanDept}, ${cleanCountry}` : (cleanDept || cleanCountry);
    }
    onCoffeeInfoChange({
      ...coffeeInfo,
      country: cleanCountry,
      department: cleanDept,
      origin: computedOrigin,
    });
  };

  const handleCountryChange = (val: string) => {
    setSelectedCountry(val);
    const resolvedCountry = val === "Otro" ? customCountry : val;
    const resolvedDept = val === "Colombia" ? (selectedDept === "Otro" ? customDept : selectedDept) : customDept;
    updateOrigin(resolvedCountry, resolvedDept);
  };

  const handleCustomCountryChange = (val: string) => {
    setCustomCountry(val);
    const resolvedDept = selectedDept === "Otro" ? customDept : selectedDept;
    updateOrigin(val, resolvedDept);
  };

  const handleDeptChange = (val: string) => {
    setSelectedDept(val);
    const resolvedCountry = selectedCountry === "Otro" ? customCountry : selectedCountry;
    const resolvedDept = val === "Otro" ? customDept : val;
    updateOrigin(resolvedCountry, resolvedDept);
  };

  const handleCustomDeptChange = (val: string) => {
    setCustomDept(val);
    const resolvedCountry = selectedCountry === "Otro" ? customCountry : selectedCountry;
    updateOrigin(resolvedCountry, val);
  };

  const toggleVariety = (varietyName: string) => {
    let next: string[];
    if (selectedVarieties.includes(varietyName)) {
      next = selectedVarieties.filter((v) => v !== varietyName);
      if (varietyName === "Otro") {
        setCustomVariety("");
      }
    } else {
      next = [...selectedVarieties, varietyName];
    }
    setSelectedVarieties(next);

    const activeStandard = next.filter((v) => v !== "Otro");
    const parts = [...activeStandard];
    if (next.includes("Otro") && customVariety.trim()) {
      parts.push(customVariety.trim());
    }
    onCoffeeInfoChange({
      ...coffeeInfo,
      variety: parts.join(", "),
    });
  };

  const handleCustomVarietyChange = (text: string) => {
    setCustomVariety(text);
    const activeStandard = selectedVarieties.filter((v) => v !== "Otro");
    const parts = [...activeStandard];
    if (text.trim()) {
      parts.push(text.trim());
    }
    onCoffeeInfoChange({
      ...coffeeInfo,
      variety: parts.join(", "),
    });
  };

  const handleProcessSelect = (proc: string) => {
    if (selectedProcess === proc) {
      setSelectedProcess("");
      onCoffeeInfoChange({ ...coffeeInfo, process: "" });
      return;
    }
    setSelectedProcess(proc);
    if (proc === "Otro") {
      onCoffeeInfoChange({ ...coffeeInfo, process: customProcess.trim() });
    } else {
      onCoffeeInfoChange({ ...coffeeInfo, process: proc });
    }
  };

  const handleCustomProcessChange = (val: string) => {
    setCustomProcess(val);
    onCoffeeInfoChange({ ...coffeeInfo, process: val });
  };

  const handleSelectSamplePreset = (preset: CoffeeInfo) => {
    onCoffeeInfoChange({
      ...preset,
      brand: "VARIETALE",
      country: "Colombia",
    });
    setScanMessage(`Café seleccionado: ${preset.coffeeName}`);
  };

  // Validación: Marca y/o Nombre del café son obligatorios para continuar
  const isStep1Valid = Boolean(
    (coffeeInfo?.coffeeName || "").trim() || (coffeeInfo?.brand || "").trim()
  );

  const handleProceed = () => {
    if (!isStep1Valid) return;
    if (!(coffeeInfo?.coffeeName || "").trim() && (coffeeInfo?.brand || "").trim()) {
      onCoffeeInfoChange({
        ...coffeeInfo,
        coffeeName: `Café ${(coffeeInfo.brand || "").trim()}`,
      });
    }
    onProceedToWheel();
  };


  const toggleChecklist = (key: keyof QualityChecklist) => {
    onQualityChecklistChange({
      ...qualityChecklist,
      [key]: !qualityChecklist[key],
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 pt-4 px-4 sm:px-6 md:px-8 max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full safe-pb">
      {/* Pop-up Obsequio de Bienvenida en Paso 1/2 si no hay catas registradas */}
      {showGiftModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in"
          onClick={() => setShowGiftModal(false)}
        >
          <div
            className="relative max-w-lg w-full my-auto py-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón flotante para cerrar el modal */}
            <button
              type="button"
              onClick={() => setShowGiftModal(false)}
              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-20 w-9 h-9 rounded-full bg-[#00D9B4] text-[#01374C] hover:bg-[#00c4a3] active:scale-90 flex items-center justify-center font-black shadow-lg transition-all cursor-pointer border-2 border-[#01374C]"
              aria-label="Cerrar ventana de obsequio"
              title="Cerrar y continuar cata"
            >
              <X className="w-5 h-5 stroke-[3]" />
            </button>

            {/* Ficha de Obsequio */}
            <WelcomeGiftCard />

            {/* Botón inferior para continuar con la cata */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowGiftModal(false)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white/90 hover:text-white underline decoration-white/40 hover:decoration-white transition-all py-1 px-3 rounded-lg cursor-pointer"
              >
                <span>Continuar llenando el Paso 1/2 de mi cata →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#E8EDF1]">
        <button
          onClick={onCancel}
          className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FAF6F2] hover:bg-[#F2ECE4] border border-[#DDC1AB] text-xs sm:text-sm font-black text-[#01374C] transition-all shadow-xs active:scale-95 cursor-pointer"
          aria-label={isEditing ? "Cancelar edición" : "Cerrar y cancelar registro"}
        >
          <span className="w-4.5 h-4.5 rounded-full bg-[#01374C] text-white flex items-center justify-center text-[10px] font-black leading-none">
            ✕
          </span>
          <span>{isEditing ? "Cancelar Edición" : "Cerrar"}</span>
        </button>
        <div className="flex items-center gap-2">
          {isEditing && (
            <span className="text-xs uppercase font-extrabold tracking-wider bg-[#01374C] text-white px-2.5 py-1 rounded-full shadow-xs">
              Modificando
            </span>
          )}
          <span className="text-xs uppercase font-bold tracking-wider text-[#01374C] bg-[#EBFBFA] px-3 py-1 rounded-full border border-[#00D9B4]/30">
            Paso 1/2
          </span>
        </div>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#01374C] tracking-tight">
          {isEditing ? "Modificar Ficha del Café" : "Nueva Cata de Café"}
        </h1>
        {isEditing && (
          <p className="text-sm font-semibold text-[#00897B] mt-1">
            Puedes cambiar los datos del grano, método de extracción o lista de control antes de ajustar el perfil sensorial.
          </p>
        )}

        {/* Guía de inicio con jerarquía visual clara */}
        <div className="mt-3.5 p-4 sm:p-5 md:p-6 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] space-y-3 shadow-2xs">
          <p className="text-base sm:text-lg font-black text-[#01374C]">
            Tienes dos opciones para iniciar:
          </p>

          <ul className="space-y-2.5 text-sm sm:text-base text-[#4A5D68]">
            <li className="flex items-start gap-2.5 leading-relaxed">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D9B4] shrink-0 mt-1.5 ring-2 ring-[#00D9B4]/30" />
              <span>
                <strong className="text-[#01374C] font-bold">Selecciona un café de VARIETALE</strong>{" "}
                <span className="text-[#52646E]">en nuestro catálogo oficial (en 1 solo toque).</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5 leading-relaxed">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D9B4] shrink-0 mt-1.5 ring-2 ring-[#00D9B4]/30" />
              <span>
                <strong className="text-[#01374C] font-bold">Ingreso Manual / Otra marca</strong>{" "}
                <span className="text-[#52646E]">con sugerencias rápidas de orígenes, varietales y procesos.</span>
              </span>
            </li>
          </ul>

          <div className="pt-3 border-t border-[#DDC1AB]/70 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#01374C] bg-white px-3.5 py-1.5 rounded-lg border border-[#DDC1AB] shadow-2xs inline-block max-w-full whitespace-normal break-words">
              ☕ CATA CUALQUIER MARCA O FINCA
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-[#00897B] whitespace-normal">
              La foto de tu bolsa es opcional
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: IDENTIFICA TU CAFÉ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-[#E8EDF1] shadow-sm mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D9B4]" />
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#01374C] flex items-baseline">
              <span className="text-lg md:text-xl font-black text-[#01374C] mr-1.5">1.</span>
              <span>Identifica tu Café</span>
            </h2>
          </div>
        </div>

        {/* FOTO DE LA BOLSA (OPCIONAL PARA AMBOS CAMINOS) */}
        <div className="border border-[#DDC1AB]/70 rounded-2xl p-3.5 sm:p-4 bg-[#FAF6F2]/60 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D9B4]" />
              <span className="text-xs sm:text-sm font-bold text-[#01374C] uppercase tracking-wider">
                Foto de tu bolsa de café <span className="text-[#6A7B85] font-normal lowercase">(opcional)</span>
              </span>
            </div>
            {photoUrl && (
              <button
                type="button"
                onClick={() => {
                  onPhotoChange(null);
                  setScanMessage(null);
                }}
                className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Quitar foto</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
            }}
          />

          {photoUrl ? (
            <div className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-[#DDC1AB]">
              <img
                src={photoUrl}
                alt="Foto de la bolsa"
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[#DDC1AB] shrink-0"
              />
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#01374C]">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D9B4]" />
                  <span>Foto adjunta para tu cata</span>
                </div>
                <p className="text-xs sm:text-sm text-[#4A5D68] mt-0.5">
                  Esta foto acompañará tu ficha e historial de catación.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-[#00897B] hover:underline mt-1 cursor-pointer block"
                >
                  Tomar otra foto o cambiar imagen →
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#DDC1AB] hover:border-[#00D9B4] bg-white rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-full bg-[#EBFBFA] flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-[#00D9B4]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#01374C]">
                    Toma o sube una foto de tu bolsa
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs sm:text-sm font-bold bg-[#01374C] text-white px-3.5 py-2 rounded-xl hover:bg-[#002636] transition-colors shadow-2xs">
                Tomar Foto
              </span>
            </div>
          )}

          {scanMessage && (
            <p className="text-xs text-[#01374C] font-semibold mt-2.5 bg-[#EBFBFA] py-1.5 px-3 rounded-lg border border-[#00D9B4]/30 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00D9B4]" />
              <span>{scanMessage}</span>
            </p>
          )}
        </div>

        {/* 2 Opciones principales: Catálogo Varietale o Ingreso Manual / Otra marca */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1.5 sm:p-2 bg-[#FAF6F2] rounded-2xl border border-[#DDC1AB]/60 mb-5">
          <button
            type="button"
            onClick={() => setInputMode("lista")}
            className={`min-h-[58px] py-3 px-3 rounded-xl text-center font-bold text-xs sm:text-sm md:text-base leading-tight flex items-center justify-center gap-2 transition-all cursor-pointer ${
              inputMode === "lista"
                ? "bg-[#01374C] text-white shadow-xs"
                : "text-[#4A5D68] hover:text-[#01374C] hover:bg-white/80"
            }`}
          >
            <ListFilter className={`w-5 h-5 ${inputMode === "lista" ? "text-[#00D9B4]" : "text-[#6A7B85]"}`} />
            <span>Catálogo Varietale</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("asistido")}
            className={`min-h-[58px] py-3 px-3 rounded-xl text-center font-bold text-xs sm:text-sm md:text-base leading-tight flex items-center justify-center gap-2 transition-all cursor-pointer ${
              inputMode === "asistido"
                ? "bg-[#01374C] text-white shadow-xs"
                : "text-[#4A5D68] hover:text-[#01374C] hover:bg-white/80"
            }`}
          >
            <Edit3 className={`w-5 h-5 ${inputMode === "asistido" ? "text-[#00D9B4]" : "text-[#6A7B85]"}`} />
            <span>Ingreso Manual / Otra marca</span>
          </button>
        </div>

        {/* CAMINO 1: Selecciona tu café en el Catálogo Varietale */}
        {inputMode === "lista" && (
          <div className="space-y-3">
            {/* Filtros de Categoría */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {[
                { id: "todos", label: "Todos los Cafés" },
                { id: "exoticos", label: "Exóticos" },
                { id: "especiales", label: "Especiales" },
                { id: "edicion", label: "Edición Limitada" },
                { id: "descafeinado", label: "Descafeinado" },
              ].map((cat) => {
                const isActive = listCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setListCategory(cat.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#01374C] text-white shadow-xs"
                        : "bg-[#FAF6F2] text-[#4A5D68] hover:bg-[#F2ECE4] hover:text-[#01374C] border border-[#E8EDF1]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Listado interactivo de cafés */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
              {filteredCatalog.map((sample) => {
                const isSelected = coffeeInfo.coffeeName === sample.coffeeName;
                return (
                  <button
                    key={sample.coffeeName}
                    type="button"
                    onClick={() => handleSelectSamplePreset(sample)}
                    className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center gap-3 sm:gap-3.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#01374C] text-white border-[#01374C] shadow-md ring-2 ring-[#00D9B4]/60"
                        : "bg-white text-[#01374C] border-[#E8EDF1] hover:border-[#01374C]/40 hover:bg-[#FAF6F2]/60 shadow-2xs"
                    }`}
                  >
                    {sample.imageUrl ? (
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-[#FAF6F2] p-1 shrink-0 border border-black/5 flex items-center justify-center overflow-hidden">
                        <img
                          src={sample.imageUrl}
                          alt={sample.coffeeName}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0">
                        <Coffee className="w-8 h-8" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md inline-block tracking-wider ${
                            isSelected
                              ? "bg-white/20 text-[#00D9B4]"
                              : "bg-[#EBFBFA] text-[#01374C] border border-[#00D9B4]/30"
                          }`}
                        >
                          {sample.productType || sample.suggestedMacro || "Varietale"}
                        </span>
                      </div>
                      <h3 className="font-black text-sm sm:text-base leading-snug block tracking-tight break-words">
                        {sample.coffeeName}
                      </h3>
                      <p
                        className={`text-xs block mt-1 font-medium break-words leading-tight ${
                          isSelected ? "text-white/80" : "text-[#6A7B85]"
                        }`}
                      >
                        {[sample.origin, sample.process].filter(Boolean).join(" • ")}
                      </p>
                      {sample.variety && (
                        <span
                          className={`text-[11px] block mt-0.5 truncate ${
                            isSelected ? "text-white/60" : "text-[#889DA7]"
                          }`}
                        >
                          Varietal: {sample.variety}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#00D9B4] text-[#01374C] flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-5 h-5 text-[#01374C]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CAMINO 2: Ingreso Manual / Otra marca */}
        {inputMode === "asistido" && (
          <div className="space-y-4">
            {/* 1. Marca del Café */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide">
                  Marca del Café *
                </label>
                <span className="text-[11px] text-[#00897B] font-semibold">
                  Preescrito VARIETALE (puedes borrarlo y poner otra marca)
                </span>
              </div>
              <input
                id="coffee-brand-input"
                type="text"
                value={coffeeInfo.brand ?? "VARIETALE"}
                onChange={(e) => onCoffeeInfoChange({ ...coffeeInfo, brand: e.target.value })}
                placeholder="Ej: VARIETALE, Café Devoción, Amor Perfecto..."
                className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
              />
            </div>

            {/* 2. Nombre del Café o Lote */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide">
                  Nombre del Café o Lote *
                </label>
                <span className="text-[11px] text-[#6A7B85] font-normal">
                  Obligatorio Marca y/o Nombre
                </span>
              </div>
              <input
                id="coffee-name-input"
                type="text"
                value={coffeeInfo.coffeeName || ""}
                onChange={(e) => onCoffeeInfoChange({ ...coffeeInfo, coffeeName: e.target.value })}
                placeholder="Ej: Borbón Rosado, Geisha Reserva, Lote 42..."
                className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
              />
            </div>

            {/* 3. Nombre de Finca y Caficultor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide block mb-1.5">
                  Nombre de Finca <span className="text-[11px] text-[#6A7B85] font-normal lowercase">(opcional)</span>
                </label>
                <input
                  id="coffee-farm-input"
                  type="text"
                  value={coffeeInfo.farmName || ""}
                  onChange={(e) => onCoffeeInfoChange({ ...coffeeInfo, farmName: e.target.value })}
                  placeholder="Ej: Finca Las Flores, Hacienda San Alberto..."
                  className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide block mb-1.5">
                  Nombre del Caficultor / Productor <span className="text-[11px] text-[#6A7B85] font-normal lowercase">(opcional)</span>
                </label>
                <input
                  id="coffee-farmer-input"
                  type="text"
                  value={coffeeInfo.farmerName || ""}
                  onChange={(e) => onCoffeeInfoChange({ ...coffeeInfo, farmerName: e.target.value })}
                  placeholder="Ej: Jhoan Vergara, Don Pedro..."
                  className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                />
              </div>
            </div>

            {/* 4. Origen Geográfico (País + Departamento/Región) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#FAF6F2]/70 border border-[#DDC1AB]/70 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00D9B4]" />
                <span className="text-xs font-bold text-[#01374C] uppercase tracking-wider">
                  Origen Geográfico
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Selector de País */}
                <div>
                  <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide block mb-1.5">
                    País
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                  >
                    {COFFEE_PRODUCING_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                    <option value="Otro">Otro país...</option>
                  </select>

                  {selectedCountry === "Otro" && (
                    <input
                      type="text"
                      value={customCountry}
                      onChange={(e) => handleCustomCountryChange(e.target.value)}
                      placeholder="Escribe el nombre del país..."
                      className="mt-2 w-full text-sm font-semibold p-2.5 rounded-lg border border-[#00D9B4] bg-white text-[#01374C] focus:outline-none"
                      autoFocus
                    />
                  )}
                </div>

                {/* Selector de Departamento (solo Colombia) o Región Libre */}
                <div>
                  <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide block mb-1.5">
                    {selectedCountry === "Colombia" ? "Departamento (Colombia)" : "Región / Estado"}
                  </label>

                  {selectedCountry === "Colombia" ? (
                    <>
                      <select
                        value={selectedDept}
                        onChange={(e) => handleDeptChange(e.target.value)}
                        className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C]"
                      >
                        <option value="">Selecciona un departamento...</option>
                        {COLOMBIAN_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        <option value="Otro">Otro departamento / municipio...</option>
                      </select>

                      {selectedDept === "Otro" && (
                        <input
                          type="text"
                          value={customDept}
                          onChange={(e) => handleCustomDeptChange(e.target.value)}
                          placeholder="Escribe el departamento o municipio..."
                          className="mt-2 w-full text-sm font-semibold p-2.5 rounded-lg border border-[#00D9B4] bg-white text-[#01374C] focus:outline-none"
                          autoFocus
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={customDept}
                      onChange={(e) => handleCustomDeptChange(e.target.value)}
                      placeholder="Ej: Yirgacheffe, Boquete, Tarrazú..."
                      className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 5. Altura de Cultivo */}
            <div>
              <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide block mb-1.5">
                Altura de Cultivo (m.s.n.m.) <span className="text-[11px] text-[#6A7B85] font-normal lowercase">(opcional)</span>
              </label>
              <input
                id="coffee-altitude-input"
                type="text"
                value={coffeeInfo.altitude || ""}
                onChange={(e) => onCoffeeInfoChange({ ...coffeeInfo, altitude: e.target.value })}
                placeholder="Ej: 1.750 msnm"
                className="w-full text-base font-semibold p-3 min-h-[46px] rounded-xl border border-[#DDC1AB] bg-white text-[#01374C] focus:outline-none focus:ring-2 focus:ring-[#01374C] transition-all"
              />
            </div>

            {/* 6. Variedad Botánica (Selección Múltiple para Blends + Opción Otro) */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide">
                  Variedad Botánica <span className="text-[11px] text-[#6A7B85] font-normal lowercase">(selección múltiple para mezclas/blends)</span>
                </label>
                {selectedVarieties.length > 0 && (
                  <span className="text-xs font-bold text-[#00897B]">
                    {selectedVarieties.length} seleccionada{selectedVarieties.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Chips interactivos de selección múltiple */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {COFFEE_MAIN_VARIETIES.map((v) => {
                  const isChecked = selectedVarieties.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVariety(v)}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? "bg-[#01374C] text-white shadow-xs ring-2 ring-[#00D9B4]"
                          : "bg-[#FAF6F2] text-[#4A5D68] hover:bg-[#F2ECE4] hover:text-[#01374C] border border-[#DDC1AB]/60"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#00D9B4]" />}
                      <span>{v}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => toggleVariety("Otro")}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedVarieties.includes("Otro")
                      ? "bg-[#01374C] text-white shadow-xs ring-2 ring-[#00D9B4]"
                      : "bg-[#FAF6F2] text-[#4A5D68] hover:bg-[#F2ECE4] hover:text-[#01374C] border border-[#DDC1AB]/60"
                  }`}
                >
                  {selectedVarieties.includes("Otro") && <Check className="w-3.5 h-3.5 text-[#00D9B4]" />}
                  <span>(Otro)</span>
                </button>
              </div>

              {selectedVarieties.includes("Otro") && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customVariety}
                    onChange={(e) => handleCustomVarietyChange(e.target.value)}
                    placeholder="Escribe otra(s) variedad(es) ej: Sudan Rume, Laurina, Eugenioides..."
                    className="w-full text-sm font-semibold p-2.5 rounded-lg border border-[#00D9B4] bg-white text-[#01374C] focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {selectedVarieties.length > 0 && (
                <p className="text-xs text-[#01374C] font-semibold mt-1.5 bg-[#EBFBFA] py-1 px-2.5 rounded-lg border border-[#00D9B4]/30 inline-block">
                  Variedades en ficha: {coffeeInfo.variety || "Ninguna"}
                </p>
              )}
            </div>

            {/* 7. Beneficio / Proceso */}
            <div>
              <label className="text-xs font-bold text-[#01374C] uppercase tracking-wide block mb-1.5">
                Beneficio / Proceso <span className="text-[11px] text-[#6A7B85] font-normal lowercase">(opcional)</span>
              </label>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {COFFEE_MAIN_PROCESSES.map((proc) => {
                  const isSelected = selectedProcess === proc;
                  return (
                    <button
                      key={proc}
                      type="button"
                      onClick={() => handleProcessSelect(proc)}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#01374C] text-white shadow-xs ring-2 ring-[#00D9B4]"
                          : "bg-[#FAF6F2] text-[#4A5D68] hover:bg-[#F2ECE4] hover:text-[#01374C] border border-[#DDC1AB]/60"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00D9B4]" />}
                      <span>{proc}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleProcessSelect("Otro")}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedProcess === "Otro"
                      ? "bg-[#01374C] text-white shadow-xs ring-2 ring-[#00D9B4]"
                      : "bg-[#FAF6F2] text-[#4A5D68] hover:bg-[#F2ECE4] hover:text-[#01374C] border border-[#DDC1AB]/60"
                  }`}
                >
                  {selectedProcess === "Otro" && <Check className="w-3.5 h-3.5 text-[#00D9B4]" />}
                  <span>(Otro)</span>
                </button>
              </div>

              {selectedProcess === "Otro" && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customProcess}
                    onChange={(e) => handleCustomProcessChange(e.target.value)}
                    placeholder="Escribe el proceso ej: Choque Térmico, Inoculación de Levaduras..."
                    className="w-full text-sm font-semibold p-2.5 rounded-lg border border-[#00D9B4] bg-white text-[#01374C] focus:outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ficha Resumen del Café Actual Registrado */}
        {(coffeeInfo.coffeeName || coffeeInfo.brand) && (
          <div className="mt-5 p-3.5 sm:p-4 rounded-xl bg-[#FAF6F2] border border-[#DDC1AB] flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={coffeeInfo.coffeeName || "Foto del café"}
                  className="w-12 h-12 object-cover rounded-lg bg-white border border-[#DDC1AB] shrink-0"
                />
              ) : coffeeInfo.imageUrl ? (
                <img
                  src={coffeeInfo.imageUrl}
                  alt={coffeeInfo.coffeeName || "Foto del café"}
                  className="w-12 h-12 object-contain rounded-lg bg-white p-0.5 border border-[#DDC1AB] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0 p-2">
                  <VarietaleBrandIcon className="w-full h-full text-[#00D9B4]" color="#00D9B4" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs uppercase font-extrabold text-[#00897B] block">
                  {coffeeInfo.brand || "VARIETALE"} • Café listo para catar:
                </span>
                <strong className="text-sm sm:text-base text-[#01374C] block font-black break-words leading-snug">
                  {coffeeInfo.coffeeName || `Café ${coffeeInfo.brand || ""}`}
                </strong>
                <span className="text-xs sm:text-sm text-[#4A5D68] block break-words mt-0.5">
                  {[
                    coffeeInfo.origin,
                    coffeeInfo.variety,
                    coffeeInfo.process,
                    coffeeInfo.altitude,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "Café en registro"}
                </span>
              </div>
            </div>

            <span className="shrink-0 text-xs sm:text-sm font-bold text-[#01374C] bg-white px-3 py-1.5 rounded-lg border border-[#DDC1AB]">
              ✓ Listo
            </span>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: SELECTOR DE MÉTODO */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-[#E8EDF1] shadow-sm mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D9B4]" />
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#01374C] flex items-baseline">
              <span className="text-lg md:text-xl font-black text-[#01374C] mr-1.5">2.</span>
              <span>Elige tu método de Preparación</span>
            </h2>
          </div>
        </div>
        <p className="text-sm sm:text-base text-[#4A5D68] mb-3.5 leading-relaxed">
          El método define la claridad, extracción y cuerpo final en la taza.
        </p>

        {/* 11 Method Grid: 2 columns on small phones, 3 on tablets, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          {BREW_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                id={`method-btn-${method.id}`}
                onClick={() => onMethodChange(method.id)}
                className={`p-3.5 sm:p-4 min-h-[135px] sm:min-h-[145px] rounded-2xl border flex flex-col items-center justify-between text-center transition-all duration-200 cursor-pointer active:scale-[0.97] relative ${
                  isSelected
                    ? "bg-[#01374C] text-white border-[#01374C] shadow-md ring-2 ring-[#00D9B4]/60"
                    : "bg-white text-[#01374C] border-[#E8EDF1] hover:bg-[#FAF6F2] hover:border-[#01374C]/30 shadow-2xs"
                }`}
              >
                {/* Cápsula icónica agrandada y destacada */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-2 transition-all duration-200 shrink-0 ${
                    isSelected
                      ? "bg-[#00D9B4] text-[#01374C] shadow-sm shadow-[#00D9B4]/30"
                      : "bg-[#FAF6F2] text-[#01374C] border border-[#E8DCD4]"
                  }`}
                >
                  <BrewMethodIcon
                    type={method.id}
                    className="w-9 h-9 sm:w-10 sm:h-10 transition-transform"
                  />
                </div>

                {/* Textos del Método */}
                <div className="w-full flex-1 flex flex-col justify-center">
                  <span className="text-sm sm:text-base font-black leading-tight block break-words">
                    {method.name}
                  </span>
                  <span
                    className={`text-[11px] sm:text-xs block leading-tight mt-1 whitespace-normal break-words font-medium ${
                      isSelected ? "text-white/85" : "text-[#6A7B85]"
                    }`}
                  >
                    {method.shortDesc}
                  </span>
                </div>

                {/* Check badge discreto si está seleccionado */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#00D9B4] text-[#01374C] flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#01374C]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Method Profile Explanation with bullet points */}
        {(() => {
          const currentMethod = BREW_METHODS.find(
            (m) => m.id === selectedMethod
          );
          if (!currentMethod) return null;
          return (
            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#FAF6F2] border border-[#DDC1AB] space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDC1AB]/60 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#01374C] text-[#00D9B4] flex items-center justify-center shrink-0 shadow-xs">
                    <BrewMethodIcon type={currentMethod.id} className="w-8 h-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-base sm:text-lg font-black text-[#01374C] block leading-tight break-words">
                      {currentMethod.name}
                    </strong>
                    <span className="text-xs sm:text-sm font-bold text-[#00897B] block mt-0.5 break-words">
                      {currentMethod.shortDesc}
                    </span>
                  </div>
                </div>
                {currentMethod.time && (
                  <div className="self-start sm:self-center shrink-0 max-w-full">
                    <span className="inline-flex items-center flex-wrap gap-1.5 text-xs sm:text-sm font-bold text-[#01374C] bg-white px-3 py-1.5 rounded-lg border border-[#DDC1AB] shadow-2xs max-w-full">
                      <span>⏱️ Tiempo:</span>
                      <strong className="text-[#01374C] break-words">{currentMethod.time.split("(")[0].trim()}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Parámetros clave de calibración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {currentMethod.ratio && (
                  <div className="bg-white p-2.5 rounded-lg border border-[#E8EDF1] min-w-0">
                    <span className="text-[#4A5D68] font-bold block mb-0.5 break-words">Proporción Sugerida - Café/Agua:</span>
                    <strong className="text-[#01374C] font-extrabold text-xs sm:text-sm block break-words">{currentMethod.ratio}</strong>
                  </div>
                )}
                {currentMethod.grind && (
                  <div className="bg-white p-2.5 rounded-lg border border-[#E8EDF1] min-w-0">
                    <span className="text-[#4A5D68] font-bold block mb-0.5 break-words">Molienda recomendada:</span>
                    <strong className="text-[#01374C] font-extrabold text-xs sm:text-sm block break-words">{currentMethod.grind}</strong>
                  </div>
                )}
              </div>

              {/* ¿Cómo se siente en tu taza? con lenguaje cercano y sin tecnicismos */}
              {currentMethod.highlights && currentMethod.highlights.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-sm font-black tracking-normal text-[#01374C] block mb-2">
                    ¿Cómo se siente en tu taza?
                  </span>
                  <ul className="space-y-2">
                    {currentMethod.highlights.map((point, idx) => {
                      const [title, desc] = point.includes(":") ? point.split(/:(.+)/) : ["", point];
                      return (
                        <li key={idx} className="text-sm text-[#3B2212] flex items-start gap-2 leading-relaxed">
                          <span className="text-[#00D9B4] font-black shrink-0 mt-0.5">•</span>
                          <span>
                            {title && <strong className="text-[#01374C] font-bold">{title}: </strong>}
                            <span className="text-[#4A5D68]">{desc || point}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-[#5C4535] leading-relaxed">
                  <strong className="text-[#01374C] font-bold">Impacto en taza: </strong>
                  {currentMethod.idealProfile}
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* SECCIÓN 3: CONSEJOS DE PREPARACIÓN */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-[#E8EDF1] shadow-sm mb-6">
        <div className="mb-2.5">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D9B4]" />
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#01374C] flex items-baseline">
              <span className="text-lg md:text-xl font-black text-[#01374C] mr-1.5">3.</span>
              <span>Consejos de preparación:</span>
            </h2>
          </div>
          <div className="mt-2">
            <span className="text-xs sm:text-sm font-bold text-[#01374C] bg-[#EBFBFA] px-3.5 py-1 rounded-full border border-[#00D9B4]/30 inline-block">
              Buenas Prácticas
            </span>
          </div>
        </div>
        <p className="text-sm sm:text-base text-[#4A5D68] mb-3.5 leading-relaxed">
          Toma en cuenta estos tres útiles consejos para mejorar tu preparación y el sabor de tu café.
        </p>

        <div className="space-y-3">
          {/* Switch 1: Procura utilizar agua filtrada */}
          <div
            onClick={() => toggleChecklist("waterFiltered")}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              qualityChecklist.waterFiltered
                ? "bg-[#EBFBFA] border-[#00D9B4]"
                : "bg-white border-[#E8EDF1]"
            }`}
          >
            <div className="pr-3">
              <span className="text-base font-bold text-[#01374C] block mb-0.5">
                Procura utilizar agua filtrada
              </span>
              <span className="text-sm text-[#4A5D68] leading-relaxed block">
                Prefiere agua libre de cloro, fresca y libre de posibles olores.
              </span>
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                qualityChecklist.waterFiltered
                  ? "bg-[#01374C] text-[#00D9B4]"
                  : "bg-[#E8EDF1] text-transparent"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Switch 2: Utiliza la molienda adecuada */}
          <div
            onClick={() => toggleChecklist("grindCorrect")}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              qualityChecklist.grindCorrect
                ? "bg-[#EBFBFA] border-[#00D9B4]"
                : "bg-white border-[#E8EDF1]"
            }`}
          >
            <div className="pr-3">
              <span className="text-base font-bold text-[#01374C] block mb-0.5">
                Utiliza la molienda adecuada
              </span>
              <span className="text-sm text-[#4A5D68] leading-relaxed block">
                Al seleccionar tu método de filtrado aparecerá el tipo de molienda recomendada para sacarle el mejor partido a tu café.
              </span>
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                qualityChecklist.grindCorrect
                  ? "bg-[#01374C] text-[#00D9B4]"
                  : "bg-[#E8EDF1] text-transparent"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Switch 3: No utilices agua hirviendo (90 - 94°C) */}
          <div
            onClick={() => toggleChecklist("waterNotBoiling")}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              qualityChecklist.waterNotBoiling
                ? "bg-[#EBFBFA] border-[#00D9B4]"
                : "bg-white border-[#E8EDF1]"
            }`}
          >
            <div className="pr-3">
              <span className="text-base font-bold text-[#01374C] block mb-0.5">
                No utilices agua hirviendo (90 - 94°C)
              </span>
              <span className="text-sm text-[#4A5D68] leading-relaxed block">
                Deja reposar el agua 45 segundos tras hervir, para no quemar los aceites aromáticos de tu café.
              </span>
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                qualityChecklist.waterNotBoiling
                  ? "bg-[#01374C] text-[#00D9B4]"
                  : "bg-[#E8EDF1] text-transparent"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Global Brand Footer */}
      <BrandFooter className="mt-6 mb-2" />

      {/* Fixed Bottom Continue CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] border-t border-[#E8EDF1] z-20 shadow-[0_-4px_20px_rgba(1,55,76,0.06)]">
        <div className="max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center gap-2">
          <button
            id="proceed-to-wheel-btn"
            onClick={handleProceed}
            disabled={!isStep1Valid}
            className={`w-full min-h-[52px] py-4 px-5 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] ${
              isStep1Valid
                ? "bg-[#01374C] text-white hover:bg-[#002636] cursor-pointer"
                : "bg-[#E8EDF1] text-[#93A3AB] cursor-not-allowed"
            }`}
          >
            <span>
              {isStep1Valid
                ? "Continuar a la Rueda Sensorial"
                : "Ingresa la Marca o Nombre del café para continuar"}
            </span>
            <ArrowRight className="w-5 h-5 text-[#00D9B4]" />
          </button>
        </div>
      </div>
    </div>
  );
};
