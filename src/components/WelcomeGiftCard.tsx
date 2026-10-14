import React, { useState } from "react";
import { Gift, Tag, Copy, Check, ArrowRight } from "lucide-react";

interface WelcomeGiftCardProps {
  className?: string;
}

export const WelcomeGiftCard: React.FC<WelcomeGiftCardProps> = ({ className = "" }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText("Experienciafiltrados");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback si no hay permisos de portapapeles
    }
  };

  return (
    <div
      className={`bg-[#01374C] text-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between border border-[#00D9B4]/30 ${className}`}
    >
      <div className="flex flex-col gap-4">
        {/* Cabecera con Icono de Regalo Más Notorio y Título */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-[#00D9B4] text-[#01374C] flex items-center justify-center font-black shrink-0 shadow-lg shadow-[#00D9B4]/30 ring-4 ring-[#00D9B4]/20 animate-pulse">
            <Gift className="w-8 h-8 sm:w-9 sm:h-9 text-[#01374C] stroke-[2.4]" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#00D9B4] block mb-1">
              OBSEQUIO DE BIENVENIDA
            </span>
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-tight">
              Disfrútalo antes de iniciar, solo por hoy y por una única vez
            </h3>
          </div>
        </div>

        {/* Texto Conciso y Directo */}
        <p className="text-sm sm:text-base text-white/95 leading-snug">
          Descubre nuestras selecciones de{" "}
          <strong className="text-[#00D9B4]">Cafés Especiales</strong>,{" "}
          <strong className="text-[#00D9B4]">Edición Limitada</strong> y{" "}
          <strong className="text-[#00D9B4]">Exóticos</strong> en{" "}
          <span className="font-bold underline decoration-[#00D9B4]">varietale.com</span>.
        </p>

        {/* Caja del Cupón 10% OFF Destacada con Mayor Jerarquía */}
        <div className="bg-[#002636] border-2 border-[#00D9B4] rounded-2xl p-3.5 sm:p-5 shadow-lg relative overflow-hidden">
          {/* Cabecera de 10% de Cortesía con Alta Jerarquía Visual */}
          <div className="flex items-center justify-between gap-3 mb-3.5 pb-3 border-b border-[#00D9B4]/25">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#00D9B4] text-[#01374C] flex items-center justify-center font-black shadow-md shadow-[#00D9B4]/30 shrink-0">
                <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-[#01374C] stroke-[2.6]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-lg sm:text-xl md:text-2xl font-black text-[#00D9B4] tracking-tight leading-none uppercase">
                  10% de Cortesía
                </h4>
                <span className="text-xs sm:text-sm text-white/85 font-medium block mt-1 leading-tight">
                  En la compra de tu primer café desde la App
                </span>
              </div>
            </div>

            <span className="text-2xs sm:text-xs font-black uppercase tracking-wider bg-[#00D9B4]/20 border border-[#00D9B4]/60 text-[#00D9B4] px-2.5 py-1 rounded-full shrink-0 hidden xs:inline-block">
              Primer Café
            </span>
          </div>

          <p className="text-xs sm:text-sm text-white/80 leading-snug mb-3">
            Aplica este código en el carrito de varietale.com:
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#01374C] border border-[#00D9B4]/40 rounded-xl p-3">
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[10px] sm:text-xs text-[#00D9B4] uppercase font-bold tracking-wider mb-0.5">
                Código del cupón:
              </span>
              <code className="text-sm xs:text-[15px] sm:text-base md:text-lg font-black text-white tracking-tight sm:tracking-normal font-mono select-all whitespace-nowrap">
                Experienciafiltrados
              </code>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#00D9B4] hover:bg-[#00c4a3] active:scale-95 text-[#01374C] text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 w-full sm:w-auto"
              title="Copiar cupón de descuento"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#01374C] stroke-[3]" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#01374C] stroke-[2.5]" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <a
        id="cta-welcome-gift-link"
        href="https://varietale.com/discount/Experienciafiltrados?redirect=%2Fcollections%2Fcafes"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full mt-4 py-4 px-5 rounded-2xl bg-[#00D9B4] hover:bg-[#00c4a3] active:scale-[0.98] text-[#01374C] font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-lg min-h-[52px] cursor-pointer"
      >
        <span>Ir a la Tienda con 10% OFF</span>
        <ArrowRight className="w-5 h-5 text-[#01374C] stroke-[2.5]" />
      </a>

      {/* Textos Legales */}
      <div className="mt-3.5 pt-2.5 border-t border-white/10 flex flex-col gap-1 text-[10px] sm:text-[11px] text-white/70 leading-normal">
        <span>*Válido únicamente para el territorio nacional de Colombia</span>
        <span>
          *Se aplican términos y condiciones de{" "}
          <a
            href="https://varietale.com/policies/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00D9B4] hover:text-white underline underline-offset-2 decoration-[#00D9B4]/50 hover:decoration-white font-bold transition-colors"
          >
            VARIETALE.com
          </a>
        </span>
      </div>
    </div>
  );
};
