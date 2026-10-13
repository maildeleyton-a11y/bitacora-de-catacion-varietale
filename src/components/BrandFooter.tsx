/**
 * ============================================================================
 * PIE DE MARCA INSTITUCIONAL (BRAND FOOTER)
 * ============================================================================
 * Muestra los créditos oficiales de autoría y propiedad:
 * "Ideado y Creado por Mr. Bite® para VARIETALE® - 2026"
 */

import React from "react";
import { Copyright } from "lucide-react";

interface BrandFooterProps {
  /** Clases CSS adicionales para espaciado y márgenes */
  className?: string;
}

export const BrandFooter: React.FC<BrandFooterProps> = ({ className = "" }) => {
  return (
    <footer className={`text-center py-2.5 px-3 ${className}`}>
      <p className="text-xs sm:text-sm text-[#52646E] leading-relaxed flex items-center justify-center flex-wrap gap-x-1.5 gap-y-1">
        <span>Ideado y Creado por</span>
        <a
          href="https://www.mrbite.agency"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#01374C] hover:text-[#00D9B4] underline decoration-[#00D9B4]/50 underline-offset-2 transition-colors"
        >
          Mr. Bite®
        </a>
        <span className="inline-flex items-center" title="Todos los derechos reservados">
          <Copyright className="w-3.5 h-3.5 text-[#52646E] shrink-0" aria-label="Todos los derechos reservados" />
        </span>
        <span>para</span>
        <a
          href="https://www.varietale.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-extrabold text-[#01374C] hover:text-[#00D9B4] underline decoration-[#01374C]/30 underline-offset-2 transition-colors"
        >
          VARIETALE®
        </a>
        <span>- 2026</span>
      </p>
    </footer>
  );
};
