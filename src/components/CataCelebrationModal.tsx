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
import { Sparkles, Check, ArrowRight, Star } from "lucide-react";
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
    } catch (e) {
      console.log(e);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-[#E8EDF1] max-h-[90vh] overflow-y-auto"
      >
        {/* Header Icon */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#DDC1AB] text-[#01374C] flex items-center justify-center relative shadow-xs">
            <Sparkles className="w-7 h-7 text-[#00D9B4]" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#01374C] text-white flex items-center justify-center text-[10px]">
              <Check className="w-3 h-3 text-[#00D9B4]" />
            </div>
          </div>
        </div>

        <div className="text-center mb-4">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#01374C] bg-[#EBFBFA] px-2.5 py-0.5 rounded-full inline-block mb-1 border border-[#00D9B4]/30">
            Cata Guardada
          </span>
          <h2 className="text-lg font-black text-[#01374C] leading-tight">
            {cata.coffeeName}
          </h2>
          <p className="text-xs text-[#6A7B85] mt-0.5 flex items-center justify-center gap-1 font-semibold">
            <BrewMethodIcon type={cata.brewMethod} className="w-3.5 h-3.5 text-[#00D9B4]" />
            <span>Método: {cata.brewMethod.toUpperCase()}</span>
          </p>
        </div>

        {/* Perceived Flavors vs Radar Chart Preview */}
        <div className="bg-white p-3 rounded-2xl border border-[#E8EDF1] mb-4 shadow-xs">
          <span className="text-[10px] font-bold text-[#6A7B85] uppercase tracking-wide block mb-1">
            Tus descriptores percibidos ({cata.selectedFlavors.length}):
          </span>
          <div className="flex flex-wrap gap-1 mb-3">
            {cata.selectedFlavors.map((f) => (
              <span
                key={f.descriptorId}
                className="text-[11px] font-semibold bg-[#EBFBFA] text-[#01374C] px-2.5 py-0.5 rounded-full border border-[#00D9B4]/40"
              >
                {f.name} (★{f.intensity})
              </span>
            ))}
          </div>

          <div className="flex justify-center my-1">
            <RadarChart primaryProfile={cata.spiderProfile} size={150} showLabels={false} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            id="go-to-logbook-btn"
            onClick={onGoToLogbook}
            className="w-full py-3 px-4 rounded-xl bg-[#01374C] hover:bg-[#002636] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.99]"
          >
            <span>Ver en Mi Bitácora</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#00D9B4]" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FAF6F2] text-[#6A7B85] font-semibold text-xs border border-[#E8EDF1]"
          >
            Cerrar y Volver a Inicio
          </button>
        </div>

        <BrandFooter className="pt-2 border-t border-[#E8EDF1] mt-3" />
      </motion.div>
    </div>
  );
};
