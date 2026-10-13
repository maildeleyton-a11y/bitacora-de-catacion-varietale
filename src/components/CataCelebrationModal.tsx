/**
 * ============================================================================
 * MODAL DE CELEBRACIÓN DE CATA (CATA CELEBRATION MODAL)
 * ============================================================================
 * Se despliega inmediatamente tras guardar con éxito una sesión de cata:
 * - Confeti festivo con los colores oficiales de marca Varietale.
 * - Revelación del perfil sensorial de radar recién generado.
 * - Resumen del café, método e intensidad de descriptores sin sesgos.
 * - Acceso directo a la bitácora o retorno al inicio.
 */

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { TastingRecord } from "../types";
import { RadarChart } from "./RadarChart";
import { BrewMethodIcon } from "./BrewMethodIcons";
import { BrandFooter } from "./BrandFooter";

interface CataCelebrationModalProps {
  /** Registro de cata recién completado y guardado */
  cata: TastingRecord;
  /** Navega directamente a la bitácora para revisar el historial */
  onGoToLogbook: () => void;
  /** Cierra el modal y regresa a la pantalla de inicio */
  onClose: () => void;
}

export const CataCelebrationModal: React.FC<CataCelebrationModalProps> = ({
  cata,
  onGoToLogbook,
  onClose,
}) => {
  useEffect(() => {
    // Fire celebratory confetti with Varietale brand colors: dark blue, mint accent, warm honey, coffee
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#01374C", "#00D9B4", "#DDC1AB", "#3B2212"],
      });
    } catch {
      // Ignorar fallo no crítico de confeti
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl p-5 sm:p-6 max-w-md sm:max-w-lg w-full shadow-2xl border border-[#E8EDF1] max-h-[90vh] overflow-y-auto"
      >
        {/* Header Icon */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#DDC1AB] text-[#01374C] flex items-center justify-center relative shadow-xs">
            <Sparkles className="w-7 h-7 text-[#00D9B4]" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#01374C] text-white flex items-center justify-center text-[10px]">
              <Check className="w-3.5 h-3.5 text-[#00D9B4]" />
            </div>
          </div>
        </div>

        <div className="text-center mb-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#01374C] bg-[#EBFBFA] px-3 py-1 rounded-full inline-block mb-1.5 border border-[#00D9B4]/30">
            Cata Guardada
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#01374C] leading-tight">
            {cata.coffeeName}
          </h2>
          <p className="text-xs sm:text-sm text-[#6A7B85] mt-1 flex items-center justify-center gap-1.5 font-semibold">
            <BrewMethodIcon type={cata.brewMethod} className="w-4 h-4 text-[#00D9B4]" />
            <span>Método: {cata.brewMethod.toUpperCase()}</span>
          </p>
        </div>

        {/* Perceived Flavors vs Radar Chart Preview */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8EDF1] mb-4 shadow-xs">
          <span className="text-xs font-bold text-[#6A7B85] uppercase tracking-wide block mb-2">
            Tus descriptores percibidos ({cata.selectedFlavors.length}):
          </span>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cata.selectedFlavors.map((f) => (
              <span
                key={f.descriptorId}
                className="text-xs sm:text-sm font-semibold bg-[#EBFBFA] text-[#01374C] px-3 py-1 rounded-full border border-[#00D9B4]/40"
              >
                {f.name} (★{f.intensity})
              </span>
            ))}
          </div>

          <div className="flex justify-center my-2">
            <RadarChart primaryProfile={cata.spiderProfile} size={165} showLabels={false} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            id="go-to-logbook-btn"
            onClick={onGoToLogbook}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
          >
            <span>Ver en Mi Bitácora</span>
            <ArrowRight className="w-4 h-4 text-[#00D9B4]" />
          </button>

          <button
            onClick={onClose}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-white hover:bg-[#FAF6F2] text-[#6A7B85] font-bold text-xs sm:text-sm border border-[#E8EDF1] transition-colors cursor-pointer"
          >
            Cerrar y Volver a Inicio
          </button>
        </div>

        <BrandFooter className="pt-2 border-t border-[#E8EDF1] mt-3" />
      </motion.div>
    </div>
  );
};
