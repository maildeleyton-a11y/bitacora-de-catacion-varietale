/**
 * ============================================================================
 * ICONOS DE MÉTODOS DE EXTRACCIÓN (BREW METHOD ICONS)
 * ============================================================================
 * Conjunto de iconos vectoriales SVG limpios y geométricos que representan
 * cada método de extracción de café de especialidad:
 * - V60, Chemex, Aeropress, Prensa Francesa, Siphon, Hermistone,
 *   Silverton, Moka Italiana, Espresso, Cold Brew y Goteo Eléctrica.
 */

import React from "react";

interface BrewIconProps {
  /** Tipo o identificador del método */
  type: string;
  /** Clases CSS de tamaño y color */
  className?: string;
}

export const BrewMethodIcon: React.FC<BrewIconProps> = ({
  type,
  className = "w-6 h-6",
}) => {
  switch (type) {
    case "v60":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* V60 Cone & Ribs */}
          <path d="M4 4h16l-5 13H9L4 4z" />
          <path d="M12 4v13" />
          <path d="M8 8l4 9" />
          <path d="M16 8l-4 9" />
          <path d="M7 21h10" />
          <path d="M19 8c1.5 0 2 1 2 2.5s-.8 2.5-2 2.5" />
        </svg>
      );
    case "chemex":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Chemex Hourglass shape with collar */}
          <path d="M6 3h12l-4 8 4 10H6l4-10-4-8z" />
          <path d="M8 11h8" />
          <path d="M8 13h8" />
          <line x1="14" y1="12" x2="16" y2="14" />
        </svg>
      );
    case "aeropress":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Aeropress Chamber and Plunger */}
          <rect x="7" y="8" width="10" height="11" rx="1" />
          <rect x="9" y="3" width="6" height="5" rx="0.5" />
          <line x1="6" y1="3" x2="18" y2="3" />
          <line x1="5" y1="19" x2="19" y2="19" />
          <line x1="8" y1="21" x2="16" y2="21" />
        </svg>
      );
    case "prensa":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* French Press Beaker, Plunger and Handle */}
          <rect x="7" y="6" width="10" height="15" rx="1.5" />
          <line x1="12" y1="2" x2="12" y2="13" />
          <circle cx="12" cy="2" r="1.5" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <path d="M17 9h2.5a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H17" />
          <line x1="6" y1="21" x2="18" y2="21" />
        </svg>
      );
    case "moka":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Moka Pot Octagonal form */}
          <path d="M7 4h10l-2 7H9L7 4z" />
          <path d="M9 11l-3 9h12l-3-9" />
          <circle cx="12" cy="2" r="1" />
          <path d="M16 7h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3" />
          <line x1="5" y1="4" x2="7" y2="7" />
        </svg>
      );
    case "espresso":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Demitasse Cup and Crema waves */}
          <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
          <path d="M16 11h2.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H16" />
          <line x1="2" y1="21" x2="18" y2="21" />
          <path d="M6 5c1-1 2-1 3 0" />
          <path d="M10 5c1-1 2-1 3 0" />
        </svg>
      );
    case "goteo":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Electric Drip Coffee Maker */}
          <path d="M6 3h12v4H6V3z" />
          <path d="M7 7h10l-1 5H8L7 7z" />
          <path d="M8 13h8v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-6z" />
          <line x1="5" y1="22" x2="19" y2="22" />
          <circle cx="12" cy="10" r="0.5" fill="currentColor" />
        </svg>
      );
    case "siphon":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Upper globe & lower globe connected */}
          <circle cx="12" cy="7" r="4.5" />
          <path d="M12 11.5v3.5" />
          <circle cx="12" cy="18" r="3.5" />
          <path d="M7 22h10" />
          <path d="M10 2h4" />
        </svg>
      );
    case "hermistone":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Hermistone Flat-bottom Dripper */}
          <path d="M5 5h14l-2 10H7L5 5z" />
          <path d="M4 5h16" />
          <path d="M7 15h10v4H7v-4z" />
          <line x1="9" y1="8" x2="9" y2="12" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="15" y1="8" x2="15" y2="12" />
          <line x1="5" y1="21" x2="19" y2="21" />
        </svg>
      );
    case "silverton":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Yama Silverton Stand + Cone + Valve + Carafe */}
          <path d="M6 3h12l-4 7H10L6 3z" />
          <circle cx="12" cy="11.5" r="1.5" />
          <path d="M8 15h8l2 6H6l2-6z" />
          <line x1="4" y1="22" x2="20" y2="22" />
          <path d="M19 6v12" />
        </svg>
      );
    case "coldbrew":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Cold brew jar with ice & drop */}
          <rect x="6" y="5" width="12" height="15" rx="2" />
          <path d="M8 2h8v3H8z" />
          <line x1="9" y1="10" x2="12" y2="10" />
          <line x1="12" y1="10" x2="12" y2="13" />
          <circle cx="12" cy="16" r="1.5" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={className}
        >
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      );
  }
};
