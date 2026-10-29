/**
 * ============================================================================
 * GESTOR DE CONTENIDOS Y TEXTOS DE INTERFAZ + RUEDA SCA (UI CMS STORE)
 * ============================================================================
 * Permite al Administrador y al Maestro Tostador modificar manualmente y sin
 * tocar código:
 * 1. Todos los textos de la interfaz (títulos, cajas, etiquetas de formularios,
 *    placeholders y botones) tanto desde el Panel Admin como en Modo Edición
 *    Visual en Vivo (clic directo sobre cualquier elemento en la app).
 * 2. Los 85+ descriptores de la Rueda de Sabores SCA (nombre, referencia
 *    sensorial, subcategoría, guía/explicación de cata 'hint' y color) y las
 *    descripciones de las 9 Familias Macro.
 * 3. Las 11 fichas pedagógicas de los Métodos de Preparación (nombre,
 *    descripción corta, ratio, molienda, tiempo y notas de perfil en taza).
 */

import { FlavorDescriptor, BrewMethodInfo, MacroProfile } from "../types";
import { FLAVOR_DESCRIPTORS } from "./wheelDescriptors";
import { BREW_METHODS, MACRO_THEMES } from "./coffeeData";

export const UI_CMS_STORAGE_KEY = "varietale_admin_ui_cms_v1";
export const UI_CMS_VISUAL_MODE_SESSION_KEY = "varietale_admin_visual_edit_mode";

export type UiTextSectionId =
  | "auth"
  | "home"
  | "registration"
  | "wheel"
  | "logbook"
  | "popups"
  | "admin_panel"
  | "live_custom";

export interface UiTextCatalogItem {
  id: string;
  section: UiTextSectionId;
  sectionLabel: string;
  label: string;
  elementType: "titulo" | "caja" | "formulario" | "placeholder" | "boton";
  defaultText: string;
}

export interface FlavorDescriptorOverride {
  name?: string;
  nameEn?: string;
  subcategory?: string;
  reference?: string;
  hint?: string;
  color?: string;
}

export interface MacroFamilyOverride {
  description?: string;
  color?: string;
}

export interface BrewMethodOverride {
  name?: string;
  shortDesc?: string;
  idealProfile?: string;
  ratio?: string;
  grind?: string;
  time?: string;
  highlights?: string[];
}

export interface UiCmsDataState {
  /** Mapa de texto original exacto -> nuevo texto personalizado */
  textOverridesByOriginal: Record<string, string>;
  /** Lista de textos adicionales editados desde el Modo Visual en Vivo */
  discoveredItems: UiTextCatalogItem[];
  /** Ajustes del Maestro Tostador sobre los 85+ descriptores de la Rueda SCA */
  flavorOverrides: Record<string, FlavorDescriptorOverride>;
  /** Ajustes sobre las 9 familias macro de la Rueda SCA */
  macroOverrides: Record<string, MacroFamilyOverride>;
  /** Ajustes sobre las 11 fichas de métodos de preparación */
  methodOverrides: Record<string, BrewMethodOverride>;
  /** Fecha de última modificación */
  updatedAt: string;
}

// ============================================================================
// 1. COPIAS DE FÁBRICA INMUTABLES (PARA RESTAURACIÓN EN 1 CLIC)
// ============================================================================

export const DEFAULT_FLAVOR_DESCRIPTORS: FlavorDescriptor[] = FLAVOR_DESCRIPTORS.map(
  (d) => ({ ...d })
);

export const DEFAULT_BREW_METHODS: BrewMethodInfo[] = BREW_METHODS.map((m) => ({
  ...m,
  highlights: m.highlights ? [...m.highlights] : undefined,
}));

export const DEFAULT_MACRO_THEMES: Record<
  string,
  { name: string; color: string; description: string }
> = Object.fromEntries(
  Object.entries(MACRO_THEMES).map(([k, v]) => [
    k,
    { name: v.name, color: v.color, description: v.description },
  ])
);

// ============================================================================
// 2. CATÁLOGO ESTRUCTURADO DE TEXTOS DE INTERFAZ POR PANTALLA
// ============================================================================

export const UI_TEXT_CATALOG: UiTextCatalogItem[] = [
  // --- A. PANTALLA DE ACCESO Y REGISTRO (AUTH) ---
  {
    id: "auth_login_title",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Título principal (Modo Iniciar Sesión)",
    elementType: "titulo",
    defaultText: "Bienvenid@ a tu Bitácora de catación.",
  },
  {
    id: "auth_register_title",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Título principal (Modo Crear Cuenta)",
    elementType: "titulo",
    defaultText: "Crea una cuenta en Tu Bitácora",
  },
  {
    id: "auth_login_subtitle",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Descripción de bienvenida (Iniciar Sesión)",
    elementType: "caja",
    defaultText:
      "Aprende de forma divertida a catar tus cafés con diferentes métodos de filtrado, define tus preferidos y lleva el registro exacto de tus catas.",
  },
  {
    id: "auth_register_subtitle",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Descripción de bienvenida (Crear Cuenta)",
    elementType: "caja",
    defaultText:
      "Aprende a catar, disfrutar, comparar y guardar tus cafés y métodos de preparación favoritos con Tu Bitácora de Varietale.",
  },
  {
    id: "auth_tab_login",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pestaña Iniciar Sesión",
    elementType: "boton",
    defaultText: "Iniciar Sesión",
  },
  {
    id: "auth_tab_register",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pestaña Crear Cuenta",
    elementType: "boton",
    defaultText: "Crear Cuenta",
  },
  {
    id: "auth_google_login",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Botón Iniciar sesión con Google",
    elementType: "boton",
    defaultText: "Iniciar sesión con Google",
  },
  {
    id: "auth_google_register",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Botón Registrarse con Google",
    elementType: "boton",
    defaultText: "Registrarse con Google",
  },
  {
    id: "auth_label_email",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta campo Correo Electrónico",
    elementType: "formulario",
    defaultText: "Correo Electrónico",
  },
  {
    id: "auth_label_password",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta campo Contraseña",
    elementType: "formulario",
    defaultText: "Contraseña",
  },
  {
    id: "auth_btn_forgot_pass",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Enlace ¿Olvidaste tu contraseña?",
    elementType: "boton",
    defaultText: "¿Olvidaste tu contraseña?",
  },
  {
    id: "auth_btn_submit_login",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Botón principal Entrar a mi Bitácora",
    elementType: "boton",
    defaultText: "Entrar a mi Bitácora",
  },
  {
    id: "auth_label_fullname",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta Nombre y Apellido (Registro)",
    elementType: "formulario",
    defaultText: "Nombre y Apellido *",
  },
  {
    id: "auth_label_pin",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta PIN de respaldo (4 dígitos)",
    elementType: "formulario",
    defaultText: "PIN de respaldo (4 dígitos) *",
  },
  {
    id: "auth_btn_submit_register",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Botón principal Crear mi Cuenta (Modal Perfil)",
    elementType: "boton",
    defaultText: "Crear mi Cuenta y Comenzar",
  },
  {
    id: "auth_launch_slogan",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Animación Inicial: Frase bajo logo Varietale",
    elementType: "titulo",
    defaultText: "Amor por el Café",
  },
  {
    id: "auth_launch_skip",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Animación Inicial: Botón Omitir",
    elementType: "boton",
    defaultText: "Omitir",
  },
  {
    id: "auth_separator_email",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Separador O con tu correo",
    elementType: "caja",
    defaultText: "O con tu correo",
  },
  {
    id: "auth_btn_forgot_account",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Enlace ¿Olvidaste tu cuenta? (Pantalla Login)",
    elementType: "boton",
    defaultText: "¿Olvidaste tu cuenta?",
  },
  {
    id: "auth_btn_forgot_clave",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Enlace ¿Olvidaste tu clave? (Pantalla Login)",
    elementType: "boton",
    defaultText: "¿Olvidaste tu clave?",
  },
  {
    id: "auth_remember_device",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Casilla Recordarme en este dispositivo",
    elementType: "formulario",
    defaultText: "Recordarme en este dispositivo",
  },
  {
    id: "auth_btn_enter_bitacora",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Botón principal Entrar en Mi Bitácora (Pantalla Login)",
    elementType: "boton",
    defaultText: "Entrar en Mi Bitácora",
  },
  {
    id: "auth_label_username",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta Nombre de Usuario * (Registro)",
    elementType: "formulario",
    defaultText: "Nombre de Usuario *",
  },
  {
    id: "auth_label_email_opt",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta Correo Electrónico (Opcional para login)",
    elementType: "formulario",
    defaultText: "Correo Electrónico (Opcional para login)",
  },
  {
    id: "auth_label_pass_min6",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta Contraseña * (mínimo 6 caracteres)",
    elementType: "formulario",
    defaultText: "Contraseña * (mínimo 6 caracteres)",
  },
  {
    id: "auth_pin_box_desc",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Explicación del PIN de 4 dígitos (Registro)",
    elementType: "caja",
    defaultText:
      "Define un PIN de 4 dígitos para recuperar o restablecer tu contraseña al instante si la olvidas.",
  },
  {
    id: "auth_label_pin_cap",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Etiqueta PIN de Respaldo (4 dígitos) * (Pantalla Registro)",
    elementType: "formulario",
    defaultText: "PIN de Respaldo (4 dígitos) *",
  },
  {
    id: "auth_accept_terms",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Casilla Acepto los términos y el registro seguro",
    elementType: "formulario",
    defaultText:
      "Acepto los términos y el registro seguro de mis catas en Varietale.",
  },
  {
    id: "auth_btn_create_account",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Botón principal Crear Cuenta y Comenzar (Pantalla Registro)",
    elementType: "boton",
    defaultText: "Crear Cuenta y Comenzar",
  },
  {
    id: "auth_btn_guided_visit",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Botón Hacer visita guiada (Pantalla Login)",
    elementType: "boton",
    defaultText: "Hacer visita guiada",
  },
  {
    id: "auth_google_subtitle",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Subtítulo",
    elementType: "caja",
    defaultText: "para continuar en Tu Bitácora Varietale",
  },
  {
    id: "auth_google_saved_list",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Encabezado cuentas guardadas",
    elementType: "caja",
    defaultText: "Cuentas guardadas en este dispositivo:",
  },
  {
    id: "auth_google_use_other",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Botón Usar otra cuenta de Google",
    elementType: "boton",
    defaultText: "Usar otra cuenta de Google",
  },
  {
    id: "auth_google_enter_email",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Instrucción ingresar correo",
    elementType: "caja",
    defaultText: "Ingresa tu correo de Google para iniciar sesión:",
  },
  {
    id: "auth_google_workspace_hint",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Nota Gmail o Workspace",
    elementType: "caja",
    defaultText: "Puedes usar tu cuenta personal de Gmail o de Google Workspace.",
  },
  {
    id: "auth_google_email_label",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Etiqueta Correo Electrónico de Google *",
    elementType: "formulario",
    defaultText: "Correo Electrónico de Google *",
  },
  {
    id: "auth_google_submit_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Botón Ingresar con Google",
    elementType: "boton",
    defaultText: "Ingresar con Google",
  },
  {
    id: "auth_google_privacy",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Google: Aviso de privacidad inferior",
    elementType: "caja",
    defaultText:
      "Para continuar, Google compartirá tu nombre y correo con Varietale para crear tu perfil y registrar tus catas de forma segura.",
  },
  {
    id: "auth_forgot_user_title",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Olvidé Cuenta: Título",
    elementType: "titulo",
    defaultText: "Recordatorio Rápido de Cuenta",
  },
  {
    id: "auth_forgot_user_desc",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Olvidé Cuenta: Instrucción",
    elementType: "caja",
    defaultText:
      "Ingresa tu correo o teléfono registrado para recordarte de inmediato tu nombre de usuario:",
  },
  {
    id: "auth_forgot_user_ph",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Olvidé Cuenta: Placeholder correo o teléfono",
    elementType: "placeholder",
    defaultText: "Correo o teléfono (+57)",
  },
  {
    id: "auth_forgot_user_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Olvidé Cuenta: Botón Buscar mi Cuenta",
    elementType: "boton",
    defaultText: "Buscar mi Cuenta",
  },
  {
    id: "auth_forgot_user_found",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Olvidé Cuenta: Insignia ¡Cuenta Localizada!",
    elementType: "caja",
    defaultText: "¡Cuenta Localizada!",
  },
  {
    id: "auth_forgot_user_use_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Olvidé Cuenta: Botón Usar este correo en el login",
    elementType: "boton",
    defaultText: "Usar este correo en el login",
  },
  {
    id: "auth_reset_pass_title",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Restablecer Clave: Título",
    elementType: "titulo",
    defaultText: "Restablecer Contraseña",
  },
  {
    id: "auth_reset_pass_desc",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Restablecer Clave: Instrucción inicial",
    elementType: "caja",
    defaultText:
      "Ingresa tu correo electrónico registrado para verificar tu identidad con tu PIN:",
  },
  {
    id: "auth_reset_pass_pin_label",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Restablecer Clave: Etiqueta PIN de 4 dígitos",
    elementType: "formulario",
    defaultText: "Ingresa tu PIN de Respaldo (4 dígitos):",
  },
  {
    id: "auth_reset_pass_new_label",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Restablecer Clave: Etiqueta Nueva Contraseña *",
    elementType: "formulario",
    defaultText: "Nueva Contraseña * (mínimo 6 caracteres)",
  },
  {
    id: "auth_reset_pass_confirm_label",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Restablecer Clave: Etiqueta Confirmar Nueva Contraseña *",
    elementType: "formulario",
    defaultText: "Confirmar Nueva Contraseña *",
  },
  {
    id: "auth_reset_pass_save_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Pop-up Restablecer Clave: Botón Guardar Contraseña e Ingresar",
    elementType: "boton",
    defaultText: "Guardar Contraseña e Ingresar",
  },
  {
    id: "auth_admin_login_title",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Título Acceso Administrador",
    elementType: "titulo",
    defaultText: "Acceso Administrador",
  },
  {
    id: "auth_admin_recover_title",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Título Recuperar Acceso Admin",
    elementType: "titulo",
    defaultText: "Recuperar Acceso Admin",
  },
  {
    id: "auth_admin_subtitle",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Subtítulo Mi Bitácora Varietale",
    elementType: "caja",
    defaultText: "Mi Bitácora Varietale",
  },
  {
    id: "auth_admin_user_label",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Etiqueta Usuario de Administrador *",
    elementType: "formulario",
    defaultText: "Usuario de Administrador *",
  },
  {
    id: "auth_admin_user_ph",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Placeholder usuario admin",
    elementType: "placeholder",
    defaultText: "amorporelcafe.admin",
  },
  {
    id: "auth_admin_pass_label",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Etiqueta Contraseña *",
    elementType: "formulario",
    defaultText: "Contraseña *",
  },
  {
    id: "auth_admin_submit_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Botón Entrar al Panel de Administrador",
    elementType: "boton",
    defaultText: "Entrar al Panel de Administrador",
  },
  {
    id: "auth_admin_forgot_link",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Enlace ¿Olvidaste tu usuario o contraseña?",
    elementType: "boton",
    defaultText: "¿Olvidaste tu usuario o contraseña?",
  },
  {
    id: "auth_admin_pin_label",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Etiqueta PIN Maestro *",
    elementType: "formulario",
    defaultText: "PIN Maestro *",
  },
  {
    id: "auth_admin_back_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Botón Volver",
    elementType: "boton",
    defaultText: "Volver",
  },
  {
    id: "auth_admin_verify_pin_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Botón Verificar PIN",
    elementType: "boton",
    defaultText: "Verificar PIN",
  },
  {
    id: "auth_admin_current_user_lbl",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Texto Tu usuario actual de Administrador es",
    elementType: "caja",
    defaultText: "Tu usuario actual de Administrador es:",
  },
  {
    id: "auth_admin_new_pass_lbl",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Etiqueta Nueva Contraseña de Administrador *",
    elementType: "formulario",
    defaultText: "Escribe tu Nueva Contraseña de Administrador *",
  },
  {
    id: "auth_admin_new_pass_ph",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Placeholder nueva contraseña admin",
    elementType: "placeholder",
    defaultText: "Escribe tu nueva contraseña",
  },
  {
    id: "auth_admin_save_enter_btn",
    section: "auth",
    sectionLabel: "Acceso y Registro",
    label: "Ingreso Admin: Botón Guardar Contraseña y Entrar al Panel",
    elementType: "boton",
    defaultText: "Guardar Contraseña y Entrar al Panel",
  },

  // --- B. PANTALLA DE INICIO (HOME) ---
  {
    id: "home_badge_guide",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Etiqueta superior de bienvenida",
    elementType: "caja",
    defaultText: "Guía Sensorial Varietale",
  },
  {
    id: "home_title_line1",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Título de Bienvenida (Línea 1)",
    elementType: "titulo",
    defaultText: "Bienvenido a tu",
  },
  {
    id: "home_title_line2",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Título de Bienvenida (Línea 2)",
    elementType: "titulo",
    defaultText: "Bitácora de Catación",
  },
  {
    id: "home_hero_description",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Párrafo descriptivo de la caja de bienvenida",
    elementType: "caja",
    defaultText:
      "Explora y reconoce cada taza con la rueda de sabor. Tus notas se guardan en tu perfil de catación para tenerlas a la mano, comparar visualmente los cafés que has probado y los métodos de filtrado que has utilizado.",
  },
  {
    id: "home_install_banner",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Franja superior para instalar la App",
    elementType: "boton",
    defaultText: "INSTALA LA APP EN TU DISPOSITIVO",
  },
  {
    id: "home_btn_new_cata",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Botón principal Nueva Cata",
    elementType: "boton",
    defaultText: "Nueva Cata",
  },
  {
    id: "home_btn_guided_tour",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Botón de Visita Guiada",
    elementType: "boton",
    defaultText: "¿Primera vez? Haz una Visita Guiada",
  },
  {
    id: "home_stats_box_title",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Título de la caja de contadores (Tus Cataciones)",
    elementType: "caja",
    defaultText: "Tus Cataciones",
  },
  {
    id: "home_stats_empty_hint",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Mensaje cuando el usuario tiene 0 catas",
    elementType: "caja",
    defaultText: "💡 Tu bitácora iniciará al registrar tu primera cata",
  },
  {
    id: "home_store_link",
    section: "home",
    sectionLabel: "Pantalla de Inicio",
    label: "Botón inferior de enlace a la tienda oficial",
    elementType: "boton",
    defaultText: "Visita la tienda oficial www.varietale.com",
  },

  // --- C. FORMULARIO DE CAFÉ Y PREPARACIÓN (PASO 1/2) ---
  {
    id: "reg_main_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Título principal Paso 1/2",
    elementType: "titulo",
    defaultText: "Nueva Cata de Café",
  },
  {
    id: "reg_intro_box_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Encabezado de caja de instrucciones iniciales",
    elementType: "caja",
    defaultText: "Tienes dos opciones para iniciar:",
  },
  {
    id: "reg_intro_badge",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Insignia de catar cualquier marca o finca",
    elementType: "caja",
    defaultText: "☕ CATA CUALQUIER MARCA O FINCA",
  },
  {
    id: "reg_photo_optional_note",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Nota de foto opcional en caja de introducción",
    elementType: "caja",
    defaultText: "La foto de tu bolsa es opcional",
  },
  {
    id: "reg_sec1_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Título Sección 1 (Identifica tu Café)",
    elementType: "titulo",
    defaultText: "Identifica tu Café",
  },
  {
    id: "reg_photo_drop_text",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Texto de caja para subir foto de la bolsa",
    elementType: "caja",
    defaultText: "Toma o sube una foto de tu bolsa",
  },
  {
    id: "reg_photo_btn",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Botón Tomar Foto",
    elementType: "boton",
    defaultText: "Tomar Foto",
  },
  {
    id: "reg_tab_catalog",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Pestaña Catálogo Varietale",
    elementType: "boton",
    defaultText: "Catálogo Varietale",
  },
  {
    id: "reg_tab_manual",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Pestaña Ingreso Manual / Otra marca",
    elementType: "boton",
    defaultText: "Ingreso Manual / Otra marca",
  },
  {
    id: "reg_label_brand",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Etiqueta campo Marca del Café",
    elementType: "formulario",
    defaultText: "Marca del Café *",
  },
  {
    id: "reg_placeholder_brand",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Placeholder campo Marca del Café",
    elementType: "placeholder",
    defaultText: "Ej: VARIETALE, Café Devoción, Amor Perfecto...",
  },
  {
    id: "reg_label_coffee_name",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Etiqueta campo Nombre del Café o Lote",
    elementType: "formulario",
    defaultText: "Nombre del Café o Lote *",
  },
  {
    id: "reg_placeholder_coffee_name",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Placeholder campo Nombre del Café",
    elementType: "placeholder",
    defaultText: "Ej: Borbón Rosado, Geisha Reserva, Lote 42...",
  },
  {
    id: "reg_placeholder_farm",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Placeholder campo Nombre de Finca",
    elementType: "placeholder",
    defaultText: "Ej: Finca Las Flores, Hacienda San Alberto...",
  },
  {
    id: "reg_placeholder_farmer",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Placeholder campo Nombre del Caficultor",
    elementType: "placeholder",
    defaultText: "Ej: Jhoan Vergara, Don Pedro...",
  },
  {
    id: "reg_sec2_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Título Sección 2 (Elige tu método de Preparación)",
    elementType: "titulo",
    defaultText: "Elige tu método de Preparación",
  },
  {
    id: "reg_sec2_subtitle",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Subtítulo Sección 2 (Método de preparación)",
    elementType: "caja",
    defaultText: "El método define la claridad, extracción y cuerpo final en la taza.",
  },
  {
    id: "reg_sec3_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Título Sección 3 (Consejos de preparación)",
    elementType: "titulo",
    defaultText: "Consejos de preparación:",
  },
  {
    id: "reg_sec3_subtitle",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Descripción de Consejos de preparación",
    elementType: "caja",
    defaultText:
      "Toma en cuenta estos tres útiles consejos para mejorar tu preparación y el sabor de tu café.",
  },
  {
    id: "reg_check1_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Check 1: Título Agua Filtrada",
    elementType: "caja",
    defaultText: "Procura utilizar agua filtrada",
  },
  {
    id: "reg_check1_desc",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Check 1: Explicación Agua Filtrada",
    elementType: "caja",
    defaultText: "Prefiere agua libre de cloro, fresca y libre de posibles olores.",
  },
  {
    id: "reg_check2_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Check 2: Título Molienda Adecuada",
    elementType: "caja",
    defaultText: "Utiliza la molienda adecuada",
  },
  {
    id: "reg_check2_desc",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Check 2: Explicación Molienda Adecuada",
    elementType: "caja",
    defaultText:
      "Al seleccionar tu método de filtrado aparecerá el tipo de molienda recomendada para sacarle el mejor partido a tu café.",
  },
  {
    id: "reg_check3_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Check 3: Título Temperatura del Agua",
    elementType: "caja",
    defaultText: "No utilices agua hirviendo (90 - 94°C)",
  },
  {
    id: "reg_check3_desc",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Check 3: Explicación Temperatura del Agua",
    elementType: "caja",
    defaultText:
      "Deja reposar el agua 45 segundos tras hervir, para no quemar los aceites aromáticos de tu café.",
  },
  {
    id: "reg_btn_continue_wheel",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Botón inferior Continuar a la Rueda Sensorial",
    elementType: "boton",
    defaultText: "Continuar a la Rueda Sensorial",
  },
  {
    id: "reg_btn_disabled_continue",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Botón inferior deshabilitado (falta Marca o Nombre)",
    elementType: "boton",
    defaultText: "Ingresa la Marca o Nombre del café para continuar",
  },
  {
    id: "reg_edit_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Título al modificar una cata existente",
    elementType: "titulo",
    defaultText: "Modificar Ficha del Café",
  },
  {
    id: "reg_edit_subtitle",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Subtítulo al modificar una cata existente",
    elementType: "caja",
    defaultText:
      "Puedes cambiar los datos del grano, método de extracción o lista de control antes de ajustar el perfil sensorial.",
  },
  {
    id: "reg_select_dept_opt",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Selector Departamento: Opción por defecto",
    elementType: "formulario",
    defaultText: "Selecciona un departamento...",
  },
  {
    id: "reg_select_other_country",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Selector País: Opción Otro país",
    elementType: "formulario",
    defaultText: "Otro país...",
  },
  {
    id: "reg_select_other_dept",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Selector Departamento: Opción Otro departamento / municipio",
    elementType: "formulario",
    defaultText: "Otro departamento / municipio...",
  },
  {
    id: "reg_gift_continue_btn",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Pop-up Obsequio: Botón inferior continuar al Paso 1/2",
    elementType: "boton",
    defaultText: "Continuar llenando el Paso 1/2 de mi cata →",
  },
  {
    id: "reg_gift_main_title",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Tarjeta Obsequio: Título principal",
    elementType: "titulo",
    defaultText:
      "Disfrútalo antes de iniciar, solo por hoy y por una única vez",
  },
  {
    id: "reg_gift_first_badge",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Tarjeta Obsequio: Insignia Primer Café",
    elementType: "caja",
    defaultText: "Primer Café",
  },
  {
    id: "reg_gift_apply_cart",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Tarjeta Obsequio: Instrucción aplicar en carrito",
    elementType: "caja",
    defaultText: "Aplica este código en el carrito de varietale.com:",
  },
  {
    id: "reg_gift_code_label",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Tarjeta Obsequio: Etiqueta Código del cupón",
    elementType: "formulario",
    defaultText: "Código del cupón:",
  },
  {
    id: "reg_gift_copy_btn",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Tarjeta Obsequio: Botón Copiar Código",
    elementType: "boton",
    defaultText: "Copiar Código",
  },
  {
    id: "reg_gift_legal_col",
    section: "registration",
    sectionLabel: "Paso 1: Café y Preparación",
    label: "Tarjeta Obsequio: Nota legal Colombia",
    elementType: "caja",
    defaultText:
      "*Válido únicamente para el territorio nacional de Colombia",
  },

  // --- D. PANTALLA DE RUEDA DE SABORES Y CALIFICACIÓN (PASO 2/2) ---
  {
    id: "wheel_sec1_title",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Título 1: Sensación de Cuerpo",
    elementType: "titulo",
    defaultText: "Sensación de Cuerpo",
  },
  {
    id: "wheel_sec1_desc",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Descripción de Sensación de Cuerpo",
    elementType: "caja",
    defaultText: "Elige la densidad y textura que percibes en tu paladar.",
  },
  {
    id: "wheel_sec2_title",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Título 2: Rueda de Sabores Varietale",
    elementType: "titulo",
    defaultText: "Rueda de Sabores Varietale",
  },
  {
    id: "wheel_sec2_desc",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Instrucción de la Rueda de Sabores",
    elementType: "caja",
    defaultText:
      "Toca una categoría para centrarla y explorar los 85 descriptores oficiales SCA.",
  },
  {
    id: "wheel_rate_badge",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Insignia Toca para calificar (1 a 5 ★)",
    elementType: "caja",
    defaultText: "Toca para calificar (1 a 5 ★)",
  },
  {
    id: "wheel_sec3_title",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Título 3: Perfil Sensorial al Instante",
    elementType: "titulo",
    defaultText: "Perfil Sensorial al Instante",
  },
  {
    id: "wheel_sec3_desc",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Descripción del gráfico de radar",
    elementType: "caja",
    defaultText:
      "Puntos coloreados según las 9 categorías principales de la rueda en tiempo real.",
  },
  {
    id: "wheel_sec4_title",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Título 4: Tu Calificación General y Anotaciones",
    elementType: "titulo",
    defaultText: "Tu Calificación General y Anotaciones",
  },
  {
    id: "wheel_sec4_desc",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Descripción de Calificación y Anotaciones",
    elementType: "caja",
    defaultText: "Evalúa la impresión global de tu café y guarda tus notas de cata.",
  },
  {
    id: "wheel_notes_placeholder",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Placeholder de caja de Apuntes Personales de Cata",
    elementType: "placeholder",
    defaultText:
      "Apuntes personales: ¿cómo se sintió la primera taza caliente vs tibia? ¿qué postgusto quedó?...",
  },
  {
    id: "wheel_popup_intensity_label",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Calificar Intensidad (en ventana de sabor)",
    elementType: "formulario",
    defaultText: "Calificar Intensidad (1 - 5):",
  },
  {
    id: "wheel_popup_remove_btn",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Botón Quitar Sabor (en ventana de sabor)",
    elementType: "boton",
    defaultText: "Quitar Sabor",
  },
  {
    id: "wheel_popup_done_btn",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Botón Listo (en ventana de intensidad de sabor)",
    elementType: "boton",
    defaultText: "Listo",
  },
  {
    id: "wheel_popup_ref_label",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Referencia sensorial (en ventana de sabor)",
    elementType: "caja",
    defaultText: "Referencia sensorial:",
  },
  {
    id: "wheel_popup_sca_label",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Descriptor SCA (en ventana de sabor)",
    elementType: "caja",
    defaultText: "Descriptor SCA:",
  },
  {
    id: "wheel_axis_floral",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Rueda / Radar: Floral",
    elementType: "caja",
    defaultText: "Floral",
  },
  {
    id: "wheel_axis_frutal",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Rueda / Radar: Frutal",
    elementType: "caja",
    defaultText: "Frutal",
  },
  {
    id: "wheel_axis_acido",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Radar: Ácido/Ferm.",
    elementType: "caja",
    defaultText: "Ácido/Ferm.",
  },
  {
    id: "wheel_axis_verde",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Radar: Verde/Veg.",
    elementType: "caja",
    defaultText: "Verde/Veg.",
  },
  {
    id: "wheel_axis_otros",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Rueda / Radar: Otros",
    elementType: "caja",
    defaultText: "Otros",
  },
  {
    id: "wheel_axis_tostado",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Rueda / Radar: Tostado",
    elementType: "caja",
    defaultText: "Tostado",
  },
  {
    id: "wheel_axis_especias",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Rueda / Radar: Especias",
    elementType: "caja",
    defaultText: "Especias",
  },
  {
    id: "wheel_axis_nueces",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Radar: Nuez/Cacao",
    elementType: "caja",
    defaultText: "Nuez/Cacao",
  },
  {
    id: "wheel_axis_dulce",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Etiqueta Rueda / Radar: Dulce",
    elementType: "caja",
    defaultText: "Dulce",
  },
  {
    id: "wheel_star_5",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Frase de calificación 5 estrellas",
    elementType: "caja",
    defaultText: "¡Excepcional! Taza memorable de concurso.",
  },
  {
    id: "wheel_star_4",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Frase de calificación 4 estrellas",
    elementType: "caja",
    defaultText: "Muy bueno. Taza compleja y placentera.",
  },
  {
    id: "wheel_star_3",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Frase de calificación 3 estrellas",
    elementType: "caja",
    defaultText: "Buen café. Balance correcto para el día a día.",
  },
  {
    id: "wheel_star_2",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Frase de calificación 2 estrellas",
    elementType: "caja",
    defaultText: "Aceptable, pero le faltó claridad o dulzor.",
  },
  {
    id: "wheel_star_1",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Frase de calificación 1 estrella",
    elementType: "caja",
    defaultText: "Desbalanceado o con defectos de extracción.",
  },
  {
    id: "wheel_btn_save_cata",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Botón inferior Guardar Cata en Mi Bitácora",
    elementType: "boton",
    defaultText: "Guardar Cata en Mi Bitácora",
  },
  {
    id: "wheel_btn_update_cata",
    section: "wheel",
    sectionLabel: "Paso 2: Rueda y Calificación",
    label: "Botón inferior Actualizar Cata en Mi Bitácora",
    elementType: "boton",
    defaultText: "Actualizar Cata en Mi Bitácora",
  },

  // --- E. MI BITÁCORA, COMPARADOR Y PIE DE PÁGINA ---
  {
    id: "logbook_main_title",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Título principal de Mi Bitácora",
    elementType: "titulo",
    defaultText: "Mi Bitácora de Catación",
  },
  {
    id: "logbook_tab_compare",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Pestaña Comparador",
    elementType: "boton",
    defaultText: "Comparador",
  },
  {
    id: "logbook_tab_explore",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Pestaña Exploración",
    elementType: "boton",
    defaultText: "Exploración",
  },
  {
    id: "logbook_empty_title",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Título cuando no hay catas registradas",
    elementType: "titulo",
    defaultText: "Aún no tienes catas registradas",
  },
  {
    id: "logbook_empty_desc",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Descripción cuando no hay catas registradas",
    elementType: "caja",
    defaultText:
      "Cada cata que realices con tus notas y rueda de sabores se guardará aquí en tu historial personal.",
  },
  {
    id: "logbook_empty_btn",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Botón Iniciar mi primera cata",
    elementType: "boton",
    defaultText: "Iniciar mi primera cata",
  },
  {
    id: "logbook_card_flavors_label",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Etiqueta Sabores Percibidos en tarjeta de cata",
    elementType: "caja",
    defaultText: "Sabores Percibidos:",
  },
  {
    id: "logbook_card_notes_label",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Etiqueta Tus Apuntes Sensoriales en tarjeta de cata",
    elementType: "caja",
    defaultText: "Tus Apuntes Sensoriales:",
  },
  {
    id: "logbook_btn_compare_method",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Botón Comparar este café con otro método",
    elementType: "boton",
    defaultText: "Comparar este café con otro método",
  },
  {
    id: "logbook_tab_history",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Pestaña Historial",
    elementType: "boton",
    defaultText: "Historial",
  },
  {
    id: "logbook_explore_territorio",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Subtítulo Territorio Explorado por Familia (Rueda SCA)",
    elementType: "caja",
    defaultText: "Territorio Explorado por Familia (Rueda SCA)",
  },
  {
    id: "logbook_rebuy_badge",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Insignia Recomendación Varietale",
    elementType: "caja",
    defaultText: "Recomendación Varietale",
  },
  {
    id: "logbook_rebuy_prefix",
    section: "logbook",
    sectionLabel: "Mi Bitácora y Comparador",
    label: "Texto introductorio de recomendación personalizada",
    elementType: "caja",
    defaultText:
      "Según tu mapa de exploración, expande tu paladar descubriendo nuestro café de especialidad",
  },

  // --- F. POP-UPS Y VENTANAS EMERGENTES (VISITA GUIADA, INSTALAR APP, PERFIL, COMPARTIR, CELEBRACIÓN) ---
  {
    id: "popup_guide_badge",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Etiqueta superior",
    elementType: "titulo",
    defaultText: "Visita Guiada",
  },
  {
    id: "popup_guide_step1",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Título Paso 1",
    elementType: "titulo",
    defaultText: "1. Selecciona tu café y el método de filtrado",
  },
  {
    id: "popup_guide_step2",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Título Paso 2",
    elementType: "titulo",
    defaultText: "2. Cata con la rueda de sabores",
  },
  {
    id: "popup_guide_step3",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Título Paso 3",
    elementType: "titulo",
    defaultText: "3. Asigna la intensidad por sabor",
  },
  {
    id: "popup_guide_step4",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Título Paso 4",
    elementType: "titulo",
    defaultText: "4. Visualiza el perfil y guárdalo en tu bitácora",
  },
  {
    id: "popup_guide_btn_next",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Botón Siguiente paso",
    elementType: "boton",
    defaultText: "Siguiente paso",
  },
  {
    id: "popup_guide_btn_prev",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Botón Atrás",
    elementType: "boton",
    defaultText: "Atrás",
  },
  {
    id: "popup_guide_btn_start",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada: Botón ¡Comenzar mi primera cata!",
    elementType: "boton",
    defaultText: "¡Comenzar mi primera cata!",
  },
  {
    id: "popup_install_badge",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Instalar App: Insignia superior",
    elementType: "caja",
    defaultText: "Experiencia Móvil Recomendada",
  },
  {
    id: "popup_install_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Instalar App: Título principal",
    elementType: "titulo",
    defaultText: "¿Quieres instalar la Bitácora en tu celular?",
  },
  {
    id: "popup_install_desc",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Instalar App: Texto descriptivo",
    elementType: "caja",
    defaultText:
      "Te permitirá usar Tu Bitácora VARIETALE con carga instantánea y tus cataciones siempre a la mano.",
  },
  {
    id: "popup_install_btn_primary",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Instalar App: Botón principal",
    elementType: "boton",
    defaultText: "Ver cómo instalarla ahora - 100% Seguro",
  },
  {
    id: "popup_install_btn_dismiss",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Instalar App: Botón Ahora no",
    elementType: "boton",
    defaultText: "Ahora no",
  },
  {
    id: "popup_pwa_guide_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Título principal",
    elementType: "titulo",
    defaultText: "Cómo agregar a tu pantalla de inicio",
  },
  {
    id: "popup_pwa_guide_subtitle",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Subtítulo",
    elementType: "caja",
    defaultText: "Sigue estos 3 sencillos pasos:",
  },
  {
    id: "popup_pwa_guide_btn_done",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Botón Entendido",
    elementType: "boton",
    defaultText: "Entendido",
  },
  {
    id: "popup_pwa_guide_btn_understand",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Botón Entendido, ya sé cómo hacerlo",
    elementType: "boton",
    defaultText: "Entendido, ya sé cómo hacerlo",
  },
  {
    id: "popup_celebration_badge",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Cata Guardada: Insignia superior",
    elementType: "titulo",
    defaultText: "Cata Guardada",
  },
  {
    id: "popup_celebration_btn_logbook",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Cata Guardada: Botón Ver en Mi Bitácora",
    elementType: "boton",
    defaultText: "Ver en Mi Bitácora",
  },
  {
    id: "popup_celebration_btn_close",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Cata Guardada: Botón Cerrar y Volver a Inicio",
    elementType: "boton",
    defaultText: "Cerrar y Volver a Inicio",
  },
  {
    id: "popup_profile_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Perfil/PIN: Título Perfil de Catador",
    elementType: "titulo",
    defaultText: "Perfil de Catador",
  },
  {
    id: "popup_profile_pin_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Perfil/PIN: Título PIN de Respaldo",
    elementType: "caja",
    defaultText: "PIN de Respaldo (Sin correos ni códigos)",
  },
  {
    id: "popup_profile_logout_btn",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Perfil/PIN: Botón Cerrar Sesión",
    elementType: "boton",
    defaultText: "Cerrar Sesión",
  },
  {
    id: "popup_share_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Compartir: Título Compartir Bitácora",
    elementType: "titulo",
    defaultText: "Compartir Bitácora",
  },
  {
    id: "popup_share_subtitle",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Compartir: Subtítulo",
    elementType: "caja",
    defaultText: "Invita a otros amantes del café",
  },
  {
    id: "popup_share_btn_copy",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Compartir: Botón Copiar link de la App",
    elementType: "boton",
    defaultText: "Copiar link de la App",
  },
  {
    id: "popup_share_btn_wa",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Compartir: Botón Enviar por WhatsApp",
    elementType: "boton",
    defaultText: "Enviar por WhatsApp",
  },
  {
    id: "popup_share_btn_other",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Compartir: Botón Compartir en otras Apps",
    elementType: "boton",
    defaultText: "Compartir en otras Apps",
  },
  {
    id: "floating_tab_share_label",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pestaña Flotante: Texto Botón Compartir",
    elementType: "boton",
    defaultText: "Compartir",
  },
  {
    id: "floating_tab_store_label",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pestaña Flotante: Texto Botón Ir a VARIETALE.com",
    elementType: "boton",
    defaultText: "Ir a VARIETALE.com",
  },
  {
    id: "floating_tab_store_tooltip",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pestaña Flotante: Tooltip Tienda Varietale",
    elementType: "caja",
    defaultText: "Visitar tienda oficial VARIETALE.com",
  },
  {
    id: "popup_delete_cata_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Eliminar Cata: Título de confirmación",
    elementType: "titulo",
    defaultText: "¿Eliminar esta cata?",
  },
  {
    id: "popup_delete_cata_confirm",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Eliminar Cata: Botón Sí, eliminar",
    elementType: "boton",
    defaultText: "Sí, eliminar",
  },
  {
    id: "popup_delete_cata_cancel",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Eliminar Cata: Botón Cancelar",
    elementType: "boton",
    defaultText: "Cancelar",
  },
  {
    id: "popup_delete_cata_prefix",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Eliminar Cata: Texto inicial de advertencia",
    elementType: "caja",
    defaultText: "Esta acción borrará de forma permanente el registro de",
  },
  {
    id: "popup_delete_cata_suffix",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Pop-up Eliminar Cata: Texto final de advertencia",
    elementType: "caja",
    defaultText: "de tu historial de catación.",
  },
  {
    id: "popup_guide_s1_head",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 1: Subtítulo",
    elementType: "titulo",
    defaultText: "Primer paso: Tu café y tu método",
  },
  {
    id: "popup_guide_s1_body",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 1: Párrafo explicativo",
    elementType: "caja",
    defaultText:
      "Comienza seleccionando tu café del catálogo Varietale, subiendo una foto de tu bolsa y escribiendo los datos de origen de cualquier marca o finca. Luego, elige el método de preparación para que tu receta quede lista antes de degustar.",
  },
  {
    id: "popup_guide_s2_head",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 2: Subtítulo",
    elementType: "titulo",
    defaultText: "Segundo paso: Encuentra los aromas y sabores",
  },
  {
    id: "popup_guide_s2_body",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 2: Párrafo explicativo",
    elementType: "caja",
    defaultText:
      "Acércate a tu taza, inhala su fragancia y prueba un sorbo. Explora las familias sensoriales de la rueda (frutal, dulce, etc.) y toca aquellas notas que sientas florecer en tu paladar.",
  },
  {
    id: "popup_guide_s3_head",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 3: Subtítulo",
    elementType: "titulo",
    defaultText: "Tercer paso: Calibra la intensidad y el cuerpo",
  },
  {
    id: "popup_guide_s3_body",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 3: Párrafo explicativo",
    elementType: "caja",
    defaultText:
      "Al tocar cada nota, ajusta qué tan presente la sientes, desde un toque sutil hasta un sabor dominante. Además, describe la sensación táctil del café en boca: ligero como un té, jugoso o con cuerpo denso y cremoso.",
  },
  {
    id: "popup_guide_s4_head",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 4: Subtítulo",
    elementType: "titulo",
    defaultText: "Cuarto paso: Tu perfil sensorial y bitácora",
  },
  {
    id: "popup_guide_s4_body",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Visita Guiada Paso 4: Párrafo explicativo",
    elementType: "caja",
    defaultText:
      "Observa cómo la gráfica cobra vida visualmente con el perfil de tu café en tiempo real. Para terminar, dale tu puntuación con estrellas, escribe tus notas o impresiones personales y guárdalo en tu bitácora para revivir esta experiencia siempre que quieras.",
  },
  {
    id: "popup_pwa_tab_ios",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Botón pestaña iPhone / iPad (iOS)",
    elementType: "boton",
    defaultText: "iPhone / iPad (iOS)",
  },
  {
    id: "popup_pwa_tab_android",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Botón pestaña Android (Chrome)",
    elementType: "boton",
    defaultText: "Android (Chrome)",
  },
  {
    id: "popup_pwa_ios_s1_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS Paso 1: Título Toca Compartir",
    elementType: "titulo",
    defaultText: "Toca Compartir",
  },
  {
    id: "popup_pwa_ios_s2_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS Paso 2: Título Elige Agregar a inicio",
    elementType: "titulo",
    defaultText: 'Elige "Agregar a inicio"',
  },
  {
    id: "popup_pwa_ios_s3_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS Paso 3: Título Confirma tocando Agregar",
    elementType: "titulo",
    defaultText: 'Confirma tocando "Agregar"',
  },
  {
    id: "popup_pwa_and_s1_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía Android Paso 1: Título Abre el menú",
    elementType: "titulo",
    defaultText: "Abre el menú",
  },
  {
    id: "popup_pwa_and_s2_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía Android Paso 2: Título Instalar aplicación",
    elementType: "titulo",
    defaultText: "Instalar aplicación",
  },
  {
    id: "popup_pwa_and_s3_title",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía Android Paso 3: Título Confirmar",
    elementType: "titulo",
    defaultText: "Confirmar",
  },
  {
    id: "popup_pwa_share_question",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Pregunta ¿Quieres compartir la Bitácora?",
    elementType: "caja",
    defaultText: "¿Quieres compartir la Bitácora?",
  },
  {
    id: "popup_pwa_share_btn",
    section: "popups",
    sectionLabel: "Pop-ups y Ventanas Emergentes",
    label: "Guía iOS/Android: Botón Compartir aplicación",
    elementType: "boton",
    defaultText: "Compartir aplicación",
  },

  // --- G. PANEL DE ADMINISTRACIÓN (ADMIN PANEL) ---
  {
    id: "admin_badge_mode",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Insignia superior Modo Administrador",
    elementType: "caja",
    defaultText: "Modo Administrador",
  },
  {
    id: "admin_audit_redirects_title",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Auditoría Redirecciones: Título Principal",
    elementType: "titulo",
    defaultText: "Auditoría y Analítica de Clics a varietale.com",
  },
  {
    id: "admin_audit_redirects_desc",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Auditoría Redirecciones: Subtítulo Descriptivo",
    elementType: "caja",
    defaultText: "Monitorea el tráfico hacia la tienda web, evalúa conversiones por campaña y descarga reportes en Excel o CSV.",
  },
  {
    id: "admin_audit_redirects_btn_excel",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Auditoría Redirecciones: Botón Descargar Excel",
    elementType: "boton",
    defaultText: "Descargar en Excel (.XLS)",
  },
  {
    id: "admin_audit_redirects_btn_csv",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Auditoría Redirecciones: Botón Descargar CSV",
    elementType: "boton",
    defaultText: "Descargar en CSV (.CSV)",
  },
  {
    id: "admin_audit_redirects_empty",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Auditoría Redirecciones: Mensaje Sin Resultados",
    elementType: "caja",
    defaultText: "No se encontraron eventos de redirección para los filtros seleccionados.",
  },
  {
    id: "admin_header_title",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Título principal del Panel de Control",
    elementType: "titulo",
    defaultText: "Panel de Control • Mi Bitácora Varietale",
  },
  {
    id: "admin_btn_help",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Botón superior Instructivo / Ayuda",
    elementType: "boton",
    defaultText: "Instructivo / Ayuda",
  },
  {
    id: "admin_btn_live_edit",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Botón superior Editar en Vivo",
    elementType: "boton",
    defaultText: "Editar en Vivo",
  },
  {
    id: "admin_btn_sim_start",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Botón superior Simular 20 Usuarios",
    elementType: "boton",
    defaultText: "Simular 20 Usuarios",
  },
  {
    id: "admin_btn_sim_clear",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Botón superior Borrar Simulación (20 Usuarios)",
    elementType: "boton",
    defaultText: "Borrar Simulación (20 Usuarios)",
  },
  {
    id: "admin_btn_refresh",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Botón superior Actualizar",
    elementType: "boton",
    defaultText: "Actualizar",
  },
  {
    id: "admin_btn_exit",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Botón superior Salir a la App",
    elementType: "boton",
    defaultText: "Salir a la App",
  },
  {
    id: "admin_tab_dashboard",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Pestaña 1: Dashboard General",
    elementType: "boton",
    defaultText: "Dashboard General",
  },
  {
    id: "admin_tab_users",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Pestaña 2: Catadores",
    elementType: "boton",
    defaultText: "Catadores",
  },
  {
    id: "admin_tab_reviews",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Pestaña 3: Reseñas",
    elementType: "boton",
    defaultText: "Reseñas",
  },
  {
    id: "admin_tab_catalog",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Pestaña 4: Catálogo Web",
    elementType: "boton",
    defaultText: "Catálogo Web",
  },
  {
    id: "admin_tab_texts",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Pestaña 5: Textos y Sabores (Editor)",
    elementType: "boton",
    defaultText: "Textos y Sabores (Editor)",
  },
  {
    id: "admin_tab_settings",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Pestaña 6: Cupón, Integraciones y Seguridad",
    elementType: "boton",
    defaultText: "Cupón, Integraciones y Seguridad",
  },
  {
    id: "admin_kpi_users",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "KPI 1: Catadores Registrados",
    elementType: "titulo",
    defaultText: "Catadores Registrados",
  },
  {
    id: "admin_kpi_redirects",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "KPI 2: Redirecciones a varietale.com",
    elementType: "titulo",
    defaultText: "Redirecciones a varietale.com",
  },
  {
    id: "admin_kpi_tastings",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "KPI 3: Cataciones Realizadas",
    elementType: "titulo",
    defaultText: "Cataciones Realizadas",
  },
  {
    id: "admin_kpi_rating",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "KPI 4: Calificación & Viralidad",
    elementType: "titulo",
    defaultText: "Calificación & Viralidad",
  },
  {
    id: "admin_card_ranking",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Tarjeta Dashboard: Ranking de Usuarios",
    elementType: "titulo",
    defaultText: "Ranking de Usuarios que Más Usan Mi Bitácora",
  },
  {
    id: "admin_card_activity",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Tarjeta Dashboard: Nivel de Actividad de Usuarios",
    elementType: "titulo",
    defaultText: "Nivel de Actividad de Usuarios",
  },
  {
    id: "admin_card_recent",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Tarjeta Dashboard: Últimas Catas Registradas",
    elementType: "titulo",
    defaultText: "Últimas Catas Registradas",
  },
  {
    id: "admin_card_macros",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Tarjeta Dashboard: Familias de la Rueda SCA",
    elementType: "titulo",
    defaultText: "Familias de la Rueda SCA: Frecuencia y Calificación",
  },
  {
    id: "admin_card_flavors",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Tarjeta Dashboard: Top Sabores Específicos de la Rueda",
    elementType: "titulo",
    defaultText: "Top Sabores Específicos de la Rueda",
  },
  {
    id: "admin_card_coffees",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Tarjeta Dashboard: Top Cafés Más Catados",
    elementType: "titulo",
    defaultText: "Top Cafés Más Catados y su Calificación",
  },
  {
    id: "admin_card_brands",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Tarjeta Dashboard: VARIETALE vs. Otras Marcas",
    elementType: "titulo",
    defaultText: "VARIETALE vs. Otras Marcas (Competencia)",
  },
  {
    id: "admin_crm_title",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "CRM: Título Directorio de Catadores Registrados",
    elementType: "titulo",
    defaultText: "Directorio de Catadores Registrados",
  },
  {
    id: "admin_crm_filters_title",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "CRM: Subtítulo Filtros de Exploración de Catadores",
    elementType: "caja",
    defaultText: "Filtros de Exploración de Catadores",
  },
  {
    id: "admin_reviews_title",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Reseñas: Título Muro de Reseñas y Comentarios Reales",
    elementType: "titulo",
    defaultText: "Muro de Reseñas y Comentarios Reales",
  },
  {
    id: "admin_catalog_title",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Catálogo Web: Título Cafés Sincronizados desde varietale.com",
    elementType: "titulo",
    defaultText: "Cafés Sincronizados desde varietale.com",
  },
  {
    id: "admin_catalog_sync_btn",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Catálogo Web: Botón Forzar Actualización Ahora",
    elementType: "boton",
    defaultText: "Forzar Actualización Ahora",
  },
  {
    id: "admin_settings_coupon",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Configuración: Título Gestor del Cupón de Bienvenida",
    elementType: "titulo",
    defaultText: "Gestor del Cupón de Bienvenida",
  },
  {
    id: "admin_settings_security",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Configuración: Título Accesos y Seguridad del Administrador",
    elementType: "titulo",
    defaultText: "Accesos y Seguridad del Administrador",
  },
  {
    id: "admin_settings_webhooks",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Configuración: Título Conectores Google Sheets & Notion",
    elementType: "titulo",
    defaultText: "Conectores en Tiempo Real (Google Sheets & Notion)",
  },
  {
    id: "admin_settings_backup",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Configuración: Título Copia de Seguridad General",
    elementType: "titulo",
    defaultText: "Copia de Seguridad General (Backup & Restauración)",
  },
  {
    id: "admin_help_badge",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Mesa de Ayuda: Insignia superior",
    elementType: "caja",
    defaultText: "Mesa de Ayuda Integrada",
  },
  {
    id: "admin_help_title",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Mesa de Ayuda: Título principal",
    elementType: "titulo",
    defaultText: "Instructivo Rápido del Panel de Administrador",
  },
  {
    id: "admin_help_close_btn",
    section: "admin_panel",
    sectionLabel: "Panel de Administración",
    label: "Mesa de Ayuda: Botón Entendido, cerrar guía",
    elementType: "boton",
    defaultText: "Entendido, cerrar guía",
  },
];

/**
 * Verifica si un texto corresponde al pie de autoría inmutable (Mr. Bite / VARIETALE)
 * o a un contador numérico automático / variable dinámica que NUNCA debe editarse.
 */
export function isProtectedOrDynamicText(rawText: string): boolean {
  const t = (rawText || "").trim();
  if (!t) return true;

  // 1. Pie de autoría y marca registrada inferior (inmutable por requerimiento)
  const lower = t.toLowerCase();
  if (
    lower.includes("mr. bite") ||
    lower.includes("mr.bite") ||
    lower.includes("ideado y creado por") ||
    lower.includes("para varietale®")
  ) {
    return true;
  }

  // 2. Contadores numéricos puros, porcentajes, pasos ("1 / 4", "Paso 1/2"), métricas KPI ("+5 (últ. 7 días)", "12 catas"), estrellas o handles @usuario
  if (/^[\d.,+%★☆/\s()-]+$/.test(t)) return true;
  if (/^paso\s+\d+(\s*[/de]+\s*\d+)?$/i.test(t)) return true;
  if (/^[+-]?\d+\s*.*(catas?|usuarios?|reseñas?|votos?|min|seg|pts|puntos|días?|dias?|semanas?|meses?)(\s*\))?$/i.test(t)) return true;
  if (/^\(\d+\s*notas?\)$/i.test(t)) return true;
  if (/^@\S+$/.test(t)) return true;

  return false;
}

// ============================================================================
// 3. LECTURA, ESCRITURA Y EVENTOS REACTIVOS
// ============================================================================

const EMPTY_CMS_STATE: UiCmsDataState = {
  textOverridesByOriginal: {},
  discoveredItems: [],
  flavorOverrides: {},
  macroOverrides: {},
  methodOverrides: {},
  updatedAt: new Date().toISOString(),
};

export function getUiCmsState(): UiCmsDataState {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return EMPTY_CMS_STATE;
  }
  try {
    const raw = localStorage.getItem(UI_CMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        textOverridesByOriginal: parsed.textOverridesByOriginal || {},
        discoveredItems: Array.isArray(parsed.discoveredItems)
          ? parsed.discoveredItems
          : [],
        flavorOverrides: parsed.flavorOverrides || {},
        macroOverrides: parsed.macroOverrides || {},
        methodOverrides: parsed.methodOverrides || {},
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn("Error leyendo UI CMS state:", e);
  }
  return { ...EMPTY_CMS_STATE };
}

/**
 * Aplica en memoria todas las personalizaciones del Maestro Tostador sobre
 * FLAVOR_DESCRIPTORS, MACRO_THEMES y BREW_METHODS para que toda la app las refleje al instante.
 */
export function applyCmsOverridesToMasterData(state?: UiCmsDataState): void {
  const cms = state || getUiCmsState();

  // 1. Restaurar y aplicar sobre FLAVOR_DESCRIPTORS
  FLAVOR_DESCRIPTORS.forEach((desc, idx) => {
    const def = DEFAULT_FLAVOR_DESCRIPTORS[idx];
    if (!def) return;
    const ov = cms.flavorOverrides[desc.id];
    desc.name = ov?.name !== undefined && ov.name.trim() !== "" ? ov.name : def.name;
    desc.nameEn =
      ov?.nameEn !== undefined && ov.nameEn.trim() !== "" ? ov.nameEn : def.nameEn;
    desc.subcategory =
      ov?.subcategory !== undefined && ov.subcategory.trim() !== ""
        ? ov.subcategory
        : def.subcategory;
    desc.reference =
      ov?.reference !== undefined ? ov.reference : def.reference;
    desc.hint = ov?.hint !== undefined ? ov.hint : def.hint;
    desc.color =
      ov?.color !== undefined && ov.color.trim() !== "" ? ov.color : def.color;
  });

  // 2. Restaurar y aplicar sobre MACRO_THEMES
  Object.keys(MACRO_THEMES).forEach((macroKey) => {
    const def = DEFAULT_MACRO_THEMES[macroKey];
    if (!def) return;
    const ov = cms.macroOverrides[macroKey];
    const target = MACRO_THEMES[macroKey as MacroProfile];
    if (target) {
      target.description =
        ov?.description !== undefined && ov.description.trim() !== ""
          ? ov.description
          : def.description;
      target.color =
        ov?.color !== undefined && ov.color.trim() !== "" ? ov.color : def.color;
    }
  });

  // 3. Restaurar y aplicar sobre BREW_METHODS
  BREW_METHODS.forEach((method, idx) => {
    const def = DEFAULT_BREW_METHODS[idx];
    if (!def) return;
    const ov = cms.methodOverrides[method.id];
    method.name =
      ov?.name !== undefined && ov.name.trim() !== "" ? ov.name : def.name;
    method.shortDesc =
      ov?.shortDesc !== undefined && ov.shortDesc.trim() !== ""
        ? ov.shortDesc
        : def.shortDesc;
    method.idealProfile =
      ov?.idealProfile !== undefined && ov.idealProfile.trim() !== ""
        ? ov.idealProfile
        : def.idealProfile;
    method.ratio = ov?.ratio !== undefined ? ov.ratio : def.ratio;
    method.grind = ov?.grind !== undefined ? ov.grind : def.grind;
    method.time = ov?.time !== undefined ? ov.time : def.time;
    method.highlights =
      ov?.highlights && ov.highlights.length > 0
        ? [...ov.highlights]
        : def.highlights
        ? [...def.highlights]
        : undefined;
  });
}

// Ejecutar al cargar el módulo por primera vez
applyCmsOverridesToMasterData();

export function saveUiCmsState(
  nextState: UiCmsDataState,
  syncBackend: boolean = true
): void {
  const withTimestamp: UiCmsDataState = {
    ...nextState,
    updatedAt: new Date().toISOString(),
  };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(UI_CMS_STORAGE_KEY, JSON.stringify(withTimestamp));
  }
  applyCmsOverridesToMasterData(withTimestamp);

  // Notificar a toda la aplicación para actualizar textos e interfaz en vivo
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("varietale-ui-cms-updated"));
  }

  if (syncBackend) {
    fetch("/api/admin/ui-cms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withTimestamp),
    }).catch(() => {
      // Silencioso si está offline
    });
  }
}

/**
 * Sincroniza desde el servidor al iniciar la aplicación si existen ajustes guardados.
 */
export async function syncUiCmsFromServer(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/ui-cms");
    if (!res.ok) return false;
    const data = await res.json();
    const remoteState = data?.state || data?.cmsState;
    if (remoteState && remoteState.updatedAt) {
      const local = getUiCmsState();
      const localHasChanges =
        Object.keys(local.textOverridesByOriginal).length > 0 ||
        Object.keys(local.flavorOverrides).length > 0 ||
        Object.keys(local.methodOverrides).length > 0;
      if (!localHasChanges || remoteState.updatedAt > local.updatedAt) {
        saveUiCmsState(remoteState, false);
        return true;
      }
    }
  } catch {
    // Offline fallback
  }
  return false;
}

// ============================================================================
// 4. ACCIONES PUNTUALES DE EDICIÓN Y RESTAURACIÓN
// ============================================================================

/**
 * Guarda o restaura un texto de la interfaz a partir de su texto original de fábrica.
 */
export function setUiTextOverride(
  originalText: string,
  newText: string,
  meta?: {
    label?: string;
    elementType?: UiTextCatalogItem["elementType"];
  }
): void {
  const cleanOriginal = originalText.trim();
  if (!cleanOriginal || isProtectedOrDynamicText(cleanOriginal)) return;

  const state = getUiCmsState();
  const nextOverrides = { ...state.textOverridesByOriginal };
  let nextDiscovered = [...state.discoveredItems];

  if (!newText.trim() || newText.trim() === cleanOriginal) {
    delete nextOverrides[cleanOriginal];
  } else {
    nextOverrides[cleanOriginal] = newText;

    // Si no existe en el catálogo fijo ni en descubiertos, registrarlo para que aparezca en el Panel Admin
    const inCatalog = UI_TEXT_CATALOG.some(
      (item) => item.defaultText.trim() === cleanOriginal
    );
    const inDiscovered = nextDiscovered.some(
      (item) => item.defaultText.trim() === cleanOriginal
    );
    if (!inCatalog && !inDiscovered) {
      nextDiscovered.unshift({
        id: `live_${Date.now().toString(36)}`,
        section: "live_custom",
        sectionLabel: "Editados en Vivo",
        label:
          meta?.label ||
          `Texto en pantalla ("${cleanOriginal.slice(0, 38)}${
            cleanOriginal.length > 38 ? "..." : ""
          }")`,
        elementType: meta?.elementType || "caja",
        defaultText: cleanOriginal,
      });
    }
  }

  saveUiCmsState({
    ...state,
    textOverridesByOriginal: nextOverrides,
    discoveredItems: nextDiscovered,
  });
}

/**
 * Actualiza un descriptor de la Rueda de Sabores SCA (Maestro Tostador).
 */
export function setFlavorDescriptorOverride(
  descriptorId: string,
  override: FlavorDescriptorOverride | null
): void {
  const state = getUiCmsState();
  const nextFlavors = { ...state.flavorOverrides };

  if (!override) {
    delete nextFlavors[descriptorId];
  } else {
    nextFlavors[descriptorId] = {
      ...(nextFlavors[descriptorId] || {}),
      ...override,
    };
  }

  saveUiCmsState({
    ...state,
    flavorOverrides: nextFlavors,
  });
}

/**
 * Actualiza la descripción o color de una Familia Macro de la Rueda SCA.
 */
export function setMacroFamilyOverride(
  macroKey: string,
  override: MacroFamilyOverride | null
): void {
  const state = getUiCmsState();
  const nextMacros = { ...state.macroOverrides };

  if (!override) {
    delete nextMacros[macroKey];
  } else {
    nextMacros[macroKey] = {
      ...(nextMacros[macroKey] || {}),
      ...override,
    };
  }

  saveUiCmsState({
    ...state,
    macroOverrides: nextMacros,
  });
}

/**
 * Actualiza la ficha técnica/pedagógica de un Método de Preparación.
 */
export function setBrewMethodOverride(
  methodId: string,
  override: BrewMethodOverride | null
): void {
  const state = getUiCmsState();
  const nextMethods = { ...state.methodOverrides };

  if (!override) {
    delete nextMethods[methodId];
  } else {
    nextMethods[methodId] = {
      ...(nextMethods[methodId] || {}),
      ...override,
    };
  }

  saveUiCmsState({
    ...state,
    methodOverrides: nextMethods,
  });
}

/**
 * Restaura absolutamente todos los textos, sabores y métodos a sus valores de fábrica.
 */
export function resetAllUiCmsToFactory(): void {
  saveUiCmsState({
    textOverridesByOriginal: {},
    discoveredItems: [],
    flavorOverrides: {},
    macroOverrides: {},
    methodOverrides: {},
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Controla si el Modo de Edición Visual en Vivo está activo en la sesión actual.
 */
export function isVisualEditModeActive(): boolean {
  return sessionStorage.getItem(UI_CMS_VISUAL_MODE_SESSION_KEY) === "true";
}

/**
 * Obtiene el texto personalizado por el administrador desde el CMS,
 * o retorna el texto original por defecto si no ha sido modificado.
 */
export function getUiText(defaultText: string): string {
  try {
    const clean = defaultText.trim();
    const state = getUiCmsState();
    return state.textOverridesByOriginal[clean] || defaultText;
  } catch {
    return defaultText;
  }
}

export function setVisualEditModeActive(active: boolean): void {
  if (active) {
    sessionStorage.setItem(UI_CMS_VISUAL_MODE_SESSION_KEY, "true");
  } else {
    sessionStorage.removeItem(UI_CMS_VISUAL_MODE_SESSION_KEY);
  }
  window.dispatchEvent(new CustomEvent("varietale-visual-edit-mode-changed"));
}
