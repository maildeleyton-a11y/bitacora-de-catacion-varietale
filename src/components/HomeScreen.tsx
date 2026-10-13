/**
 * ============================================================================
 * PANTALLA PRINCIPAL (HOME SCREEN) - BITÁCORA DE CATACIÓN VARIETALE
 * ============================================================================
 * Punto de entrada visual del catador:
 * - Cabecera institucional con logotipo oficial Varietale y estado de perfil.
 * - Tarjeta de bienvenida con saludo personalizado.
 * - Contador de progreso del catador (catas, cafés únicos, métodos).
 * - Accesos rápidos a 'Nueva Cata' y 'Visita Guiada'.
 * - Pie de marca oficial.
 */

import React, { useEffect } from "react";
import {
  Plus,
  BookOpen,
  Compass,
  ExternalLink,
  User,
  Smartphone,
} from "lucide-react";
import { TastingRecord, UserProfile, CoffeeInfo, BrewMethod } from "../types";
import { VarietaleLogoHorizontal, VarietaleBrandIcon } from "./VarietaleLogo";
import { BrandFooter } from "./BrandFooter";

interface HomeScreenProps {
  /** Historial de cataciones del usuario activo */
  tastings: TastingRecord[];
  /** Perfil del usuario activo en sesión */
  currentUser: UserProfile | null;
  /** Disparador para comenzar una nueva cata */
  onStartNewCata: (presetCoffee?: CoffeeInfo, presetMethod?: BrewMethod) => void;
  /** Abre la pantalla de bitácora */
  onOpenLogbook: () => void;
  /** Abre el modal de visita guiada */
  onOpenGuide: () => void;
  /** Abre el modal de perfil de usuario / autenticación */
  onOpenAuth: () => void;
  /** Abre la guía modal para instalar la PWA */
  onOpenInstall?: () => void;
  onSelectSampleCata?: (id: string) => void;
  liveCoffees?: CoffeeInfo[];
  isSyncing?: boolean;
  onRefreshCatalog?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  tastings,
  currentUser,
  onStartNewCata,
  onOpenLogbook,
  onOpenGuide,
  onOpenAuth,
  onOpenInstall,
}) => {
  // Asegurar que la pantalla de inicio siempre cargue en la parte superior
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const totalCatas = tastings.length;
  const uniqueMethods = new Set(tastings.map((t) => t.brewMethod)).size;
  const uniqueCoffees = new Set(tastings.map((t) => t.coffeeName)).size;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 pt-3 px-4 sm:px-6 md:px-8 max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full">
      {/* Brand Header with Official Varietale Logo & Quick Actions */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 py-2.5 border-b border-[#E8EDF1] mb-5">
        <div className="shrink-0 flex items-center">
          <VarietaleLogoHorizontal primaryColor="#01374C" showTagline={false} />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User Profile / Registration Trigger */}
          <button
            id="user-auth-header-btn"
            onClick={onOpenAuth}
            className={`min-h-[44px] flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer ${
              currentUser
                ? "bg-[#FAF6F2] border-[#DDC1AB] text-[#01374C] hover:bg-[#F2ECE4]"
                : "bg-[#01374C] text-white border-[#01374C] hover:bg-[#002636]"
            }`}
            title={currentUser ? "Ver mi perfil de catador" : "Registrarse o Iniciar Sesión"}
          >
            {currentUser ? (
              <>
                <span className="w-5.5 h-5.5 rounded-full bg-[#01374C] text-white flex items-center justify-center text-xs font-black relative shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                  {currentUser.authProvider === "google" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#4285F4] ring-1 ring-white" />
                  )}
                </span>
                <span className="max-w-[90px] sm:max-w-[140px] truncate">{currentUser.username ? `@${currentUser.username}` : currentUser.name}</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-[#00D9B4]" />
                <span>Ingresar</span>
              </>
            )}
          </button>

          {/* Bitácora counter button */}
          <button
            onClick={onOpenLogbook}
            className="min-h-[44px] flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white border border-[#DDC1AB] text-xs sm:text-sm font-bold text-[#01374C] shadow-xs hover:bg-[#FAF6F2] active:scale-95 transition-all cursor-pointer"
            title="Ir a mi bitácora"
          >
            <BookOpen className="w-4 h-4 text-[#01374C]" />
            <span className="hidden sm:inline">Bitácora</span>
            <span className="w-5 h-5 rounded-full bg-[#01374C] text-white text-xs flex items-center justify-center font-black">
              {totalCatas}
            </span>
          </button>

          {/* Botón PWA / Instalar en Celular */}
          {onOpenInstall && (
            <button
              onClick={onOpenInstall}
              className="min-h-[44px] flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full bg-[#EBFBFA] border border-[#00D9B4]/60 text-xs font-bold text-[#00897B] shadow-2xs hover:bg-[#d6f7f4] active:scale-95 transition-all cursor-pointer"
              title="Instalar App o Compartir"
            >
              <Smartphone className="w-4 h-4 text-[#00897B]" />
              <span className="hidden md:inline">Instalar App</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Welcome Section: Responsive 2-Column on LG/XL */}
      <div className="bg-gradient-to-b from-[#FAF6F2] to-white rounded-3xl p-5 sm:p-7 md:p-8 border border-[#DDC1AB]/80 shadow-sm mb-6 relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute -right-4 -bottom-4 w-48 h-36 opacity-10 pointer-events-none text-[#01374C]">
          <VarietaleBrandIcon color="#01374C" className="w-full h-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start relative z-10">
          {/* Columna Izquierda: Bienvenida y Contexto */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <span className="text-xs sm:text-sm uppercase font-extrabold tracking-wider text-[#01374C] bg-[#EBFBFA] px-4 py-1.5 rounded-full border border-[#00D9B4]/30 inline-block mb-3.5">
                {currentUser ? `¡Hola, ${currentUser.name}! 👋` : "Guía Sensorial Varietale"}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#01374C] leading-tight mb-3 tracking-tight">
                Bienvenido a Tu Bitácora de Catación
              </h1>
              <p className="text-sm sm:text-base md:text-[17px] text-[#4A5D68] leading-relaxed max-w-xl">
                {currentUser
                  ? "Explora y reconoce cada taza con la rueda de sabor. Tus notas se guardan en tu perfil de catación para comparar cafés y métodos."
                  : "Tu bitácora para aprender a reconocer lo que tus sentidos ya perciben: notas frutales, dulzura acaramelada y acidez viva de los mejores cafés de Colombia."}
              </p>
            </div>

            {/* Guest register banner if not logged in */}
            {!currentUser && (
              <div className="mt-5 p-4 rounded-2xl bg-white border border-[#DDC1AB] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#01374C] text-white flex items-center justify-center text-xs shrink-0">
                    <User className="w-4.5 h-4.5 text-[#00D9B4]" />
                  </div>
                  <span className="text-sm sm:text-base text-[#3B2212] font-semibold">
                    ¿Aún no tienes cuenta? Regístrate para guardar tu historial.
                  </span>
                </div>
                <button
                  id="hero-register-btn"
                  onClick={onOpenAuth}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#01374C] text-white text-xs sm:text-sm font-bold shrink-0 hover:bg-[#002636] transition-colors flex items-center justify-center cursor-pointer"
                >
                  Registrarme
                </button>
              </div>
            )}

            {/* Acciones principales en pantallas grandes debajo de la bienvenida */}
            <div className="hidden lg:flex flex-col gap-3 mt-6">
              <button
                id="start-new-cata-btn-lg"
                onClick={() => onStartNewCata()}
                className="w-full min-h-[54px] py-4 px-6 rounded-2xl bg-[#01374C] text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 hover:bg-[#002636] active:scale-[0.98] transition-all shadow-md shadow-[#01374C]/20 cursor-pointer"
              >
                <span>Nueva Cata</span>
                <Plus className="w-5.5 h-5.5 text-[#00D9B4] stroke-[3]" />
              </button>

              <button
                id="open-guide-hero-btn-lg"
                onClick={onOpenGuide}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl text-sm sm:text-base font-bold text-[#01374C] hover:bg-[#FAF6F2] border border-[#E8EDF1] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-4.5 h-4.5 text-[#00D9B4]" />
                <span>¿Primera vez? Haz una Visita Guiada</span>
              </button>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Progreso del Catador y Acciones Móviles */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-[#E8EDF1] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-4.5 h-4.5 text-[#00D9B4]" />
                  <h2 className="text-xs sm:text-sm font-bold text-[#01374C] uppercase tracking-wider">
                    Tus Cataciones
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="bg-[#FAF6F2]/70 p-3 sm:p-3.5 rounded-xl border border-[#DDC1AB]/60">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums text-[#01374C] block leading-none">
                    {totalCatas}
                  </span>
                  <span className="text-xs sm:text-sm text-[#4A5D68] font-semibold mt-1.5 block">
                    Catas
                  </span>
                </div>
                <div className="bg-[#FAF6F2]/70 p-3 sm:p-3.5 rounded-xl border border-[#DDC1AB]/60">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums text-[#01374C] block leading-none">
                    {uniqueCoffees}
                  </span>
                  <span className="text-xs sm:text-sm text-[#4A5D68] font-semibold mt-1.5 block">
                    Cafés
                  </span>
                </div>
                <div className="bg-[#FAF6F2]/70 p-3 sm:p-3.5 rounded-xl border border-[#DDC1AB]/60">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums text-[#01374C] block leading-none">
                    {uniqueMethods}
                  </span>
                  <span className="text-xs sm:text-sm text-[#4A5D68] font-semibold mt-1.5 block">
                    Métodos
                  </span>
                </div>
              </div>

              {totalCatas > 0 ? (
                <div className="mt-4 pt-3.5 border-t border-[#E8EDF1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-[#4A5D68] truncate max-w-full">
                    Última cata:{" "}
                    <strong className="text-[#01374C]">
                      {tastings[0].coffeeName} ({tastings[0].brewMethod.toUpperCase()})
                    </strong>
                  </span>
                  <button
                    onClick={onOpenLogbook}
                    className="min-h-[44px] py-1 px-1 text-xs sm:text-sm font-bold text-[#01374C] hover:text-[#00D9B4] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    Ver bitácora →
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-[#E8EDF1] flex items-center justify-center gap-1.5 text-xs sm:text-sm text-[#4A5D68]">
                  <span>💡 Tu bitácora iniciará al registrar tu primera cata</span>
                </div>
              )}
            </div>

            {/* Acciones principales en pantallas móviles (ocultas en LG porque están a la izquierda) */}
            <div className="space-y-3 lg:hidden">
              <button
                id="start-new-cata-btn"
                onClick={() => onStartNewCata()}
                className="w-full min-h-[52px] py-4 px-6 rounded-2xl bg-[#01374C] text-white font-black text-base sm:text-lg flex items-center justify-center gap-2.5 hover:bg-[#002636] active:scale-[0.98] transition-all shadow-md shadow-[#01374C]/20 cursor-pointer"
              >
                <span>Nueva Cata</span>
                <Plus className="w-5.5 h-5.5 text-[#00D9B4] stroke-[3]" />
              </button>

              <button
                id="open-guide-hero-btn"
                onClick={onOpenGuide}
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl text-sm sm:text-base font-bold text-[#01374C] hover:bg-[#FAF6F2] border border-[#E8EDF1] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-4.5 h-4.5 text-[#00D9B4]" />
                <span>¿Primera vez? Haz una Visita Guiada</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access to Store */}
      <div className="text-center my-4">
        <a
          href="https://www.varietale.com"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#01374C] hover:text-[#00D9B4] transition-colors py-2 px-4 rounded-full hover:bg-white border border-transparent hover:border-[#E8EDF1]"
        >
          <span>Visita la tienda oficial www.varietale.com</span>
          <ExternalLink className="w-4 h-4 text-[#00D9B4]" />
        </a>
      </div>

      {/* Global Brand Footer */}
      <BrandFooter className="mt-4" />
    </div>
  );
};
