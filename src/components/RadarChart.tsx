/**
 * ============================================================================
 * GRÁFICO DE RADAR SENSORIAL (RADAR CHART) - PERFIL SCA MULTIDIMENSIONAL
 * ============================================================================
 * Visualización vectorial SVG de los 9 ejes canónicos de la Rueda SCA:
 * - Soporta visualización simple (una cata) o modo comparativo superpuesto (dos catas).
 * - Ejes rotados uniformemente con polígonos concéntricos y cuadrícula matemática.
 * - Etiquetas cromáticas acordes a la paleta oficial de cada familia de sabor.
 */

import React from "react";
import { SensorySpiderProfile } from "../types";

interface RadarChartProps {
  /** Perfil sensorial principal a graficar */
  primaryProfile?: SensorySpiderProfile;
  /** Etiqueta descriptiva del perfil principal */
  primaryLabel?: string;
  /** Perfil sensorial secundario para modo comparativo superpuesto */
  secondaryProfile?: SensorySpiderProfile;
  /** Etiqueta descriptiva del perfil secundario */
  secondaryLabel?: string;
  /** Tamaño base en píxeles */
  size?: number;
  /** Clases CSS adicionales */
  className?: string;
  /** Determina si se renderizan las etiquetas de texto de cada eje */
  showLabels?: boolean;
  /** Habilita escalado responsivo mediante viewBox */
  responsive?: boolean;
}

// 9 categorías oficiales de la Rueda de Sabores SCA en orden circular
export const RADAR_AXES: {
  key: keyof SensorySpiderProfile;
  label: string;
  color: string;
}[] = [
  { key: "floral", label: "Floral", color: "#DA0D68" },
  { key: "frutal", label: "Frutal", color: "#DA1D23" },
  { key: "acido", label: "Ácido/Ferm.", color: "#EBB40D" },
  { key: "verde", label: "Verde/Veg.", color: "#197A2F" },
  { key: "otros", label: "Otros", color: "#0AA3B5" },
  { key: "tostado", label: "Tostado", color: "#C94930" },
  { key: "especias", label: "Especias", color: "#AD213E" },
  { key: "nueces", label: "Nuez/Cacao", color: "#A87B64" },
  { key: "dulce", label: "Dulce", color: "#E65832" },
];

export const RadarChart: React.FC<RadarChartProps> = ({
  primaryProfile,
  primaryLabel = "Esta Cata",
  secondaryProfile,
  secondaryLabel = "Comparación",
  size = 280,
  className = "",
  showLabels = true,
  responsive = false,
}) => {
  const baseSize = responsive ? 500 : size;
  const center = baseSize / 2;
  const radius = responsive
    ? 180
    : (baseSize / 2) * (showLabels ? (size > 300 ? 0.70 : 0.68) : 0.85);
  const numAxes = RADAR_AXES.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Helper to get value from profile (handling both 9-category keys and legacy fallbacks)
  const getProfileValue = (
    profile: SensorySpiderProfile | undefined | null,
    axisKey: keyof SensorySpiderProfile
  ): number => {
    if (!profile) return 0;
    const val = profile[axisKey];
    if (val !== undefined && val !== null && !isNaN(val)) return val;
    return 0;
  };

  // Calculate polygon points - start strictly from 0 when value is 0
  const getCoordinates = (value: number, index: number, maxRadius = radius) => {
    // start from top (-PI/2)
    const angle = index * angleStep - Math.PI / 2;
    const distance = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    const x = center + distance * Math.cos(angle);
    const y = center + distance * Math.sin(angle);
    return { x, y };
  };

  const getAxisEnd = (index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  };

  const getLabelCoords = (index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const labelDistance = radius + (responsive ? 34 : size > 300 ? 28 : 22);
    const x = center + labelDistance * Math.cos(angle);
    const y = center + labelDistance * Math.sin(angle);
    return { x, y };
  };

  // Concentric levels (25, 50, 75, 100)
  const levels = [25, 50, 75, 100];

  const hasPrimaryData = primaryProfile
    ? RADAR_AXES.some((axis) => getProfileValue(primaryProfile, axis.key) > 0)
    : false;

  const primaryPoints = primaryProfile && hasPrimaryData
    ? RADAR_AXES.map((axis, i) => {
        const val = getProfileValue(primaryProfile, axis.key);
        const { x, y } = getCoordinates(val, i);
        return `${x},${y}`;
      }).join(" ")
    : "";

  const hasSecondaryData = secondaryProfile
    ? RADAR_AXES.some((axis) => getProfileValue(secondaryProfile, axis.key) > 0)
    : false;

  const secondaryPoints = secondaryProfile && hasSecondaryData
    ? RADAR_AXES.map((axis, i) => {
        const val = getProfileValue(secondaryProfile, axis.key);
        const { x, y } = getCoordinates(val, i);
        return `${x},${y}`;
      }).join(" ")
    : null;

  const viewBox = responsive
    ? "-15 -10 530 515"
    : `0 0 ${size} ${size}`;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        {...(!responsive ? { width: size, height: size } : {})}
        viewBox={viewBox}
        className="w-full h-full max-w-full overflow-visible"
        style={responsive ? { aspectRatio: "1 / 1" } : { maxWidth: size, maxHeight: size, aspectRatio: "1 / 1" }}
      >
        {/* Background Grid Lines */}
        {levels.map((level) => {
          const gridPoints = RADAR_AXES.map((_, i) => {
            const { x, y } = getCoordinates(level, i);
            return `${x},${y}`;
          }).join(" ");
          return (
            <polygon
              key={`grid-${level}`}
              points={gridPoints}
              fill={level === 100 ? "#F8FAFC" : "transparent"}
              fillOpacity={level === 100 ? 0.6 : 0}
              stroke="#E2E8F0"
              strokeWidth={level === 100 ? "1.5" : "1"}
              strokeDasharray={level === 100 ? "none" : "3,3"}
            />
          );
        })}

        {/* Axes Radial Spoke Lines (tinted with category color) */}
        {RADAR_AXES.map((axis, i) => {
          const { x, y } = getAxisEnd(i);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={axis.color}
              strokeOpacity="0.25"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Secondary Polygon if in comparison mode */}
        {secondaryPoints && (
          <g className="transition-all duration-500 ease-out">
            <polygon
              points={secondaryPoints}
              fill="#00D9B4"
              fillOpacity="0.22"
              stroke="#00D9B4"
              strokeWidth={size < 120 ? "1.2" : "2"}
              strokeDasharray="4,3"
            />
            {RADAR_AXES.map((axis, i) => {
              const val = getProfileValue(secondaryProfile!, axis.key);
              const { x, y } = getCoordinates(val, i);
              const secRadius = size < 60 ? 1.5 : size < 120 ? 2.5 : size < 240 ? 3.4 : 4.2;
              return (
                <g key={`sec-pt-${i}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={secRadius}
                    fill={axis.color}
                    fillOpacity="0.35"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={secRadius}
                    fill="#FFFFFF"
                    stroke={axis.color}
                    strokeWidth={size < 120 ? "1.2" : "2"}
                  />
                  <title>{`${secondaryLabel} - ${axis.label}: ${Math.round(val)}%`}</title>
                </g>
              );
            })}
          </g>
        )}

        {/* Primary Profile Polygon (Azul Institucional Varietale con transparencia) */}
        {hasPrimaryData && (
          <polygon
            points={primaryPoints}
            fill="#01374C"
            fillOpacity="0.38"
            stroke="#01374C"
            strokeWidth={responsive ? "2.5" : size < 60 ? "1.2" : size < 120 ? "1.8" : "2.4"}
            className="transition-all duration-300 ease-out"
          />
        )}

        {/* Primary Profile Points - Each with the EXACT color of its 9 categories */}
        {RADAR_AXES.map((axis, i) => {
          const val = getProfileValue(primaryProfile, axis.key);
          if (val <= 0) return null; // No saturar el centro si la categoría aún no se ha seleccionado
          const { x, y } = getCoordinates(val, i);
          const ptRadius = responsive
            ? 5.5
            : size < 60 ? 1.8 : size < 120 ? 3.0 : size < 240 ? 4.0 : size > 320 ? 5.8 : 4.8;
          const haloRadius = responsive
            ? ptRadius + 2.5
            : size < 60 ? ptRadius + 0.8 : size < 120 ? ptRadius + 1.8 : ptRadius + 3.2;
          const strokeWidth = responsive
            ? 1.8
            : size < 60 ? 0.8 : size < 120 ? 1.2 : 2;
          return (
            <g key={`pt-${i}`} className="radar-point-group cursor-pointer">
              {/* Outer soft halo in category color */}
              <circle
                cx={x}
                cy={y}
                r={haloRadius}
                fill={axis.color}
                fillOpacity="0.32"
              />
              {/* Main point in category color */}
              <circle
                cx={x}
                cy={y}
                r={ptRadius}
                fill={axis.color}
                stroke="#FFFFFF"
                strokeWidth={strokeWidth}
                className="transition-all duration-300 ease-out shadow-sm"
              />
              <title>{`${axis.label}: ${Math.round(val)}%`}</title>
            </g>
          );
        })}

        {/* Center Origin Dot */}
        <circle
          cx={center}
          cy={center}
          r={responsive ? "3.2" : "2.5"}
          fill="#01374C"
          fillOpacity={hasPrimaryData ? 0.75 : 0.3}
        />

        {/* Axis Labels (colored by category to guide user) */}
        {showLabels &&
          RADAR_AXES.map((axis, i) => {
            const { x, y } = getLabelCoords(i);
            const val = Math.round(getProfileValue(primaryProfile, axis.key));
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={responsive ? "15" : size > 300 ? "13" : "11"}
                fontWeight="800"
                className="select-none pointer-events-none"
                style={{ fontFamily: "inherit" }}
              >
                <tspan fill={axis.color}>
                  {axis.label}
                </tspan>
                {val > 0 && (
                  <tspan
                    dx="4"
                    fontWeight="800"
                    fill={axis.color}
                    fontSize={responsive ? "13.5" : size > 300 ? "12" : "10"}
                  >
                    {val}%
                  </tspan>
                )}
              </text>
            );
          })}
      </svg>

      {/* Legend if comparison active */}
      {secondaryProfile && (
        <div className="mt-3 flex items-center justify-center gap-5 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#01374C]" />
            <span className="font-bold text-[#01374C]">{primaryLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#00D9B4] border border-[#00A387]" />
            <span className="font-bold text-[#01374C]">{secondaryLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};
