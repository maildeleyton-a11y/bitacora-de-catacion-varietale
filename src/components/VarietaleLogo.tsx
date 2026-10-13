/**
 * ============================================================================
 * IDENTIDAD VISUAL Y LOGOTIPOS VARIETALE (VARIETALE LOGO)
 * ============================================================================
 * Vectores oficiales extraídos de los manuales de identidad de Varietale:
 * - VarietaleBrandIcon: Isotipo simétrico de dos hojas / grano con V central.
 * - VarietaleLogoHorizontal: Logotipo horizontal con tipografía institucional.
 * - VarietaleIsotipo: Sello e isotipo de marca.
 */

import React from "react";

interface VarietaleLogoProps {
  variant?: "horizontal" | "vertical" | "icon" | "sello";
  className?: string;
  color?: string; // default #01374C
  accentColor?: string; // default #00D9B4
  size?: "sm" | "md" | "lg";
}

/**
 * Isotipo oficial de Varietale (emblema de dos hojas y corazón de cafeto).
 */
export const VarietaleBrandIcon: React.FC<{
  className?: string;
  color?: string;
}> = ({ className = "w-7 h-7", color = "#01374C" }) => (
  <svg
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 284.5 204.4"
    className={className}
  >
    <path
      fill={color === "currentColor" ? "currentColor" : color}
      d="M79,110.3c3.8,42.6,7.7,85.2,59.7,91.7C66.2,217.7,0,153.2,0,78.4C0,24.8,32.8,0,68.9,0 c26.9,0,55.9,14.2,73.3,41.1C159.7,14.2,188.7,0,215.6,0c36.1,0,68.9,24.8,68.9,78.4c0,74.8-66.2,139.3-138.7,123.6 c52.1-6.5,55.9-49.1,59.7-91.7c3-37,6.2-73.9,39.6-87.8c-55.6-4.7-65.4,38.7-69.8,84c-4.1,43.5-3.5,87.8-33.1,93.2 c-29.6-5.3-29-49.7-33.1-93.2c-4.4-45.3-14.2-88.7-69.8-84C72.8,36.4,76,73.3,79,110.3"
    />
  </svg>
);

/**
 * Official Varietale Horizontal Logo ([VARIETALE] LOGOTIPO-03.svg)
 * Exact vectors from Adobe Illustrator source
 */
export const VarietaleLogoHorizontal: React.FC<{
  className?: string;
  svgClassName?: string;
  primaryColor?: string;
  showTagline?: boolean;
}> = ({
  className = "",
  svgClassName = "h-[18px] sm:h-7 w-auto block",
  primaryColor = "#01374C",
  showTagline = false,
}) => (
  <div className={`inline-flex flex-col items-start select-none ${className}`}>
    <svg
      viewBox="0 0 1271.2 192.2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={svgClassName}
      style={{ color: primaryColor }}
      aria-label="VARIETALE"
    >
      <g fill={primaryColor || "currentColor"}>
        {/* Frame around VARIETALE and right brand symbol */}
        <path d="M8.8,0H0v8.8v174.7v8.8h8.8h1262.4V0H8.8z M1039.3,183.4H8.8V8.8h1030.6V183.4z M1157.9,155.4 c30.6-3.8,32.9-28.9,35.1-53.9c1.7-21.7,3.7-43.5,23.3-51.7c-32.7-2.8-38.5,22.8-41.1,49.4c-2.4,25.6-2.1,51.7-19.5,54.8 c-17.4-3.1-17.1-29.2-19.5-54.8c-2.6-26.6-8.4-52.2-41.1-49.4c19.7,8.2,21.6,29.9,23.3,51.7c2.3,25.1,4.5,50.1,35.1,53.9 c-42.6,9.2-81.6-28.7-81.6-72.7c0-31.5,19.3-46.1,40.5-46.1c15.8,0,32.9,8.4,43.1,24.2c10.3-15.8,27.3-24.2,43.1-24.2 c21.2,0,40.5,14.6,40.5,46.1C1239.5,126.7,1200.5,164.6,1157.9,155.4" />
        {/* Letter V */}
        <path d="M63.9,164.3h58.9l27.7-106.3c2.5-9.7,5.2-19.6,10.5-29.2h-51.7c-0.2,9.5-1.9,20.3-3.7,30.6l-7.6,38.7 l-4.6,36.6l-4.6-36.6l-7.6-38.7c-1.7-10.3-3.5-21.1-3.7-30.6H25.7c5.2,9.7,7.9,19.6,10.5,29.2L63.9,164.3z" />
        {/* Letter A */}
        <path d="M194.3,164.3c0.2-5.4,0.4-11.2,1-17h33.3c0.6,5.8,0.8,11.6,1,17h51.9c-10.1-25-15.3-44.5-21.5-68.1 l-18.2-67.4h-59.6L164,96.2c-6.2,23.6-11.4,43.2-21.5,68.1H194.3z M205,95c2.9-13.4,4.6-26.9,7-40.5c2.3,13.6,4.1,27.1,7,40.5 l4.8,23.2h-23.6L205,95z" />
        {/* Letter R */}
        <path d="M283.8,164.3h53.4c-3.9-4.1-4.5-23.4-4.5-37.2V121c4.5,0.2,7.5,2.1,9.5,6.6l10.3,23.4 c2.1,4.8,3.7,9.3,3.9,13.4h57.5c-3.9-4.1-8.5-9.5-13-18.6l-11.2-24c-1.9-4.5-3.5-7.6-6-10.1c6.6-4.8,16.3-15.1,16.3-34.3 c0-34.7-28.3-48.6-62-48.6h-54.2c3.9,4.1,4.5,23.4,4.5,37.2v61.2C288.2,140.9,287.7,160.3,283.8,164.3 M332.8,63.3h6.8 c9.1,0,15.1,5,15.1,18.2c0,13-6,18.6-14.7,18.6h-7.2V63.3z" />
        {/* Letter I */}
        <path d="M419.3,164.3h53.4c-3.9-4.1-4.5-23.4-4.5-37.2V66c0-13.7,0.6-33.1,4.5-37.2h-53.4c3.9,4.1,4.5,23.4,4.5,37.2 v61.2C423.8,140.9,423.2,160.3,419.3,164.3" />
        {/* Letter E */}
        <path d="M485.3,142.7c0,20.1,0,21.7,25.9,21.7h67.4V126c-12,1.7-19.9,1.9-30,1.9h-18.8v-20.1h33.5V85h-33.5V65.2 h16.8c10.1,0,16.1,0.2,28.1,1.9V28.8h-93.9c3.9,4.1,4.5,23.4,4.5,37.2V142.7z" />
        {/* Letter T */}
        <path d="M615,127.2c0,17.6-0.6,33.1-4.5,37.2H664c-3.9-4.1-4.5-19.6-4.5-37.2v-62c8.7,0,17.6,0.4,28.1,1.9V28.8H587 v38.3c9.9-1.4,19.4-1.7,28.1-1.9V127.2z" />
        {/* Letter A */}
        <path d="M729.3,164.3c0.2-5.4,0.4-11.2,1-17h33.3c0.6,5.8,0.8,11.6,1,17h51.9c-10.1-25-15.3-44.5-21.5-68.1 l-18.2-67.4h-59.6l-18.2,67.4c-6.2,23.6-11.4,43.2-21.5,68.1H729.3z M739.9,95c2.9-13.4,4.6-26.9,7-40.5 c2.3,13.6,4.1,27.1,7,40.5l4.8,23.2h-23.6L739.9,95z" />
        {/* Letter L */}
        <path d="M823.1,140.3c0,19.9,0.6,24,26.5,24h57.1V126c-9.9,1.4-24,1.7-37.6,1.9V66c0-13.7,0.6-33.1,4.5-37.2h-55 c3.9,4.1,4.5,23.4,4.5,37.2V140.3z" />
        {/* Letter E */}
        <path d="M918.4,142.7c0,20.1,0,21.7,25.9,21.7h67.4V126c-12,1.7-19.9,1.9-30,1.9h-18.8v-20.1h33.5V85h-33.5V65.2 h16.8c10.1,0,16.1,0.2,28.1,1.9V28.8h-93.9c3.9,4.1,4.5,23.4,4.5,37.2V142.7z" />
      </g>
    </svg>

    {showTagline && (
      <span
        className="text-[9px] font-semibold tracking-[0.24em] lowercase mt-0.5 pl-0.5"
        style={{ color: primaryColor, opacity: 0.85 }}
      >
        cafés y tés
      </span>
    )}
  </div>
);

/**
 * Official Varietale Sello Cafés y Tés (Page 17)
 */
export const VarietaleSello: React.FC<{
  size?: number;
  color?: string;
  accent?: string;
}> = ({ size = 72, color = "#01374C", accent = "#00D9B4" }) => (
  <div
    className="relative flex items-center justify-center rounded-full"
    style={{ width: size, height: size }}
  >
    {/* Circular text simulation */}
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full animate-[spin_30s_linear_infinite]"
    >
      <path
        id="circlePath"
        d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
        fill="none"
      />
      <text
        fill={color}
        fontSize="10"
        fontWeight="800"
        letterSpacing="3.5"
        className="uppercase"
      >
        <textPath href="#circlePath" startOffset="0%">
          CAFÉS Y TÉS • VARIETALE •
        </textPath>
      </text>
    </svg>
    <div className="z-10">
      <VarietaleBrandIcon color={color} className="w-8 h-8" />
    </div>
  </div>
);
