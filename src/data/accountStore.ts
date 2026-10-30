/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - GESTIÓN Y ALMACENAMIENTO DE CUENTAS
 * ============================================================================
 * Este módulo gestiona de forma segura el almacenamiento local de cuentas
 * registradas, credenciales, PINs de seguridad, preferencias y sesiones.
 * Incluye funciones para recuperar contraseñas mediante PIN o preguntas de
 * seguridad, y para extraer nombres amigables de correos de Google.
 */

import {
  UserProfile,
  TastingRecord,
  BrewMethod,
  BodyLevel,
  FlavorSelection,
  MacroProfile,
} from "../types";
import { computeSensorySpiderProfile } from "./coffeeData";

// ============================================================================
// 1. ESTRUCTURAS DE DATOS Y CONSTANTES DE ALMACENAMIENTO
// ============================================================================

/**
 * Cuenta registrada almacenada en localStorage.
 */
export interface StoredAccount {
  /** Identificador único permanente de la cuenta */
  id: string;
  /** Nombre completo o de pila visible */
  name: string;
  /** Nombre de usuario único (@usuario) */
  username: string;
  /** Correo electrónico único */
  email: string;
  /** Teléfono de contacto opcional */
  phone?: string;
  /** Contraseña de la cuenta (opcional si proviene de Google) */
  password?: string;
  /** PIN numérico de seguridad de 4 dígitos para recuperación inmediata */
  securityPin: string;
  /** Pregunta de seguridad configurada para recuperación de respaldo */
  securityQuestion: string;
  /** Respuesta a la pregunta de seguridad */
  securityAnswer: string;
  /** Color distintivo para el avatar del catador */
  avatarColor: string;
  /** Nivel de experiencia en café de especialidad */
  experienceLevel?: string;
  /** Sede de Varietale preferida */
  favoriteStore?: string;
  /** Año o fecha de vinculación */
  memberSince?: string;
  /** Estado de verificación de la cuenta */
  verified?: boolean;
  /** Método de autenticación registrado ("email" o "google") */
  authProvider: "email" | "google";
  /** Fecha de registro en formato legible o ISO */
  createdAt: string;
}

/** Clave de almacenamiento principal para las cuentas registradas */
export const ACCOUNTS_STORAGE_KEY = "varietale_registered_accounts";

/** Clave para recordar el último identificador ingresado en el dispositivo */
export const LAST_USER_KEY = "varietale_last_remembered_identifier";

/** Clave para control de versiones y purga limpia de esquemas antiguos */
export const DB_WIPE_VERSION_KEY = "varietale_db_wipe_clean_v3";

/**
 * Preguntas de seguridad predeterminadas inspiradas en la cultura cafetera.
 */
export const PRESET_SECURITY_QUESTIONS: string[] = [
  "¿Cuál es tu método de filtrado o preparación preferido?",
  "¿Cuál es tu varietal o café favorito (ej: Geisha, Borbón, Caturra)?",
  "¿En qué sede o ciudad probaste tu primer café Varietale?",
  "¿Cuál es el nombre de tu primera mascota o apodo de infancia?",
  "¿Qué aroma en taza te recuerda a los momentos en familia?",
];

// ============================================================================
// 2. UTILIDADES DE PARSEO Y FORMATEO
// ============================================================================

/**
 * Extrae el primer nombre legible asociado a una cuenta de correo electrónico o nombre completo.
 * Limpia prefijos comunes en correos (como "mailde", "correode", "soyel") y números finales.
 *
 * @param email Correo electrónico del usuario
 * @param existingFullName Nombre completo existente si está disponible
 * @returns Primer nombre con mayúscula inicial
 */
export const extractGoogleFirstName = (email: string, existingFullName?: string): string => {
  if (existingFullName && existingFullName.trim()) {
    const firstWord = existingFullName.trim().split(/\s+/)[0];
    if (firstWord && !["catador", "usuario", "invitado"].includes(firstWord.toLowerCase())) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    }
  }

  if (!email) return "Catador";
  const prefix = email.split("@")[0].toLowerCase();

  // Limpia prefijos habituales en nombres de buzones personales
  let cleaned = prefix.replace(/^(mailde|correode|soyel|contacto|hola)\.?/i, "");
  if (!cleaned) cleaned = prefix;

  // Separa por signos de puntuación
  const tokens = cleaned.split(/[._-]/);
  const firstToken = tokens[0] || cleaned;

  // Remueve números al final (ej: leyton123 -> leyton, carlos99 -> carlos)
  const withoutDigits = firstToken.replace(/\d+$/, "");
  const result = withoutDigits.length >= 2 ? withoutDigits : firstToken;

  return result ? result.charAt(0).toUpperCase() + result.slice(1) : "Catador";
};

// ============================================================================
// 3. MANTENIMIENTO Y PURGA DE BASE DE DATOS
// ============================================================================

/**
 * Purga completamente la base de datos de usuarios y claves de sesión residuales.
 */
export const wipeAllAccountsDatabase = (): void => {
  try {
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(LAST_USER_KEY);
    localStorage.removeItem("varietale_current_user");
    localStorage.removeItem("varietale_current_user_v1");
    localStorage.removeItem("varietale_current_user_v2");
    sessionStorage.removeItem("varietale_session_user");
  } catch (e) {
    console.warn("Error borrando base de datos de usuarios:", e);
  }
};

// Garantiza la limpieza inicial de sesiones residuales de prueba
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("varietale_current_user_v2");
    localStorage.removeItem("varietale_current_user_v1");
    localStorage.removeItem("varietale_current_user");

    if (!localStorage.getItem(DB_WIPE_VERSION_KEY)) {
      wipeAllAccountsDatabase();
      localStorage.setItem(DB_WIPE_VERSION_KEY, "true");
    }
  } catch {
    // Entorno no navegador o localStorage deshabilitado
  }
}

// ============================================================================
// 4. OPERACIONES CRUD DE CUENTAS
// ============================================================================

/**
 * Obtiene la lista de cuentas reales registradas en el navegador,
 * excluyendo cuentas de prueba o mock de desarrollo.
 */
export const getStoredAccounts = (): StoredAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];

    const accounts: StoredAccount[] = JSON.parse(raw);
    if (!Array.isArray(accounts)) return [];

    // Filtra cualquier usuario ficticio residual antiguo
    return accounts.filter((a) => a.id !== "user-test-dev");
  } catch (e) {
    console.warn("Error leyendo cuentas registradas:", e);
    return [];
  }
};

/**
 * Perfil de usuario preconfigurado para pruebas rápidas de la aplicación.
 */
export const TEST_USER_PROFILE: UserProfile = {
  id: "test-user-catador",
  name: "Catador de Prueba",
  username: "catador.prueba",
  email: "prueba@varietale.com",
  experienceLevel: "entusiasta",
  favoriteStore: "Varietale Chapinero - Carrera 4a #57-02",
  memberSince: "Modo Test",
  avatarColor: "#00897B",
  authProvider: "email",
  verified: true,
};

/**
 * Cuenta registrada de prueba con credenciales predefinidas.
 * Correo: prueba@varietale.com | Contraseña: password123 | PIN: 1234
 */
export const TEST_USER_ACCOUNT: StoredAccount = {
  id: "test-user-catador",
  name: "Catador de Prueba",
  username: "catador.prueba",
  email: "prueba@varietale.com",
  password: "password123",
  securityPin: "1234",
  securityQuestion: "¿Cuál es tu método de filtrado o preparación preferido?",
  securityAnswer: "V60",
  avatarColor: "#00897B",
  authProvider: "email",
  createdAt: "Modo Test",
};

/**
 * Registra o asegura la existencia de la cuenta de prueba y retorna el perfil de sesión.
 */
export const loginAsTestUser = (): UserProfile => {
  try {
    saveAccount(TEST_USER_ACCOUNT);
  } catch (e) {
    console.warn("No se pudo guardar la cuenta de prueba:", e);
  }
  return TEST_USER_PROFILE;
};

// ============================================================================
// SIMULACIÓN DE 20 CATACIONES PARA EL PERFIL DE PRUEBAS
// ============================================================================

export const TEST_USER_TASTINGS_STORAGE_KEY = "varietale_user_tastings_catador_prueba";

/**
 * Obtiene las cataciones del usuario de prueba.
 */
export const getTestUserTastings = (): TastingRecord[] => {
  try {
    const raw = localStorage.getItem(TEST_USER_TASTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Auto-migración retroactiva: asegura que toda cata previa tenga coffeeForm y grindSize válidos
        return parsed.map((t, idx) => {
          const isMolido = t.coffeeForm === "molido" || (!t.coffeeForm && idx % 3 === 1);
          const coffeeForm = isMolido ? "molido" : "grano";
          let grindSize = t.grindSize;
          if (!grindSize) {
            if (t.brewMethod === "espresso" || t.brewMethod === "moka") grindSize = "fina";
            else if (t.brewMethod === "prensa" || t.brewMethod === "coldbrew") grindSize = "gruesa";
            else grindSize = "media";
          }
          return { ...t, coffeeForm, grindSize };
        });
      }
    }
  } catch (e) {
    console.warn("Error leyendo catas del usuario de prueba:", e);
  }
  return [];
};

/**
 * Limpia las catas del usuario de prueba, dejándolo en 0 catas limpias.
 */
export const clearTestUserTastings = (): void => {
  try {
    localStorage.removeItem(TEST_USER_TASTINGS_STORAGE_KEY);
  } catch (e) {
    console.warn("Error eliminando catas de prueba:", e);
  }
};

/**
 * Verifica si el usuario de prueba tiene cataciones registradas.
 */
export const hasTestUserTastings = (): boolean => {
  return getTestUserTastings().length > 0;
};

/**
 * Genera 20 cataciones aleatorias y variadas con cafés colombianos de especialidad,
 * métodos de filtrado y preparación diversos, notas sensoriales de la rueda SCA,
 * calificaciones de 3★ a 5★ y notas de cata detalladas.
 * Se guardan directamente en el espacio aislado del usuario de prueba.
 */
export const seedTestUser20Tastings = (): TastingRecord[] => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const mockSpecs: {
    coffeeName: string;
    department: string;
    origin: string;
    farmName: string;
    farmerName: string;
    variety: string;
    process: string;
    altitude: string;
    brewMethod: BrewMethod;
    bodyLevel: BodyLevel;
    rating: number;
    daysAgo: number;
    notes: string;
    flavors: {
      descriptorId: string;
      name: string;
      macro: MacroProfile;
      subcategory?: string;
      intensity: number;
    }[];
  }[] = [
    {
      coffeeName: "Palermo",
      department: "Huila",
      origin: "Palermo, Huila",
      farmName: "",
      farmerName: "",
      variety: "Castillo y Borbón",
      process: "Lavado Tradicional",
      altitude: "900 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 1,
      notes: "Aroma dulce muy marcado con notas a miel, limón fresco y acidez cítrica brillante. Cuerpo sedoso y balanceado.",
      flavors: [
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_lemon", name: "Limón", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_caramel", name: "Caramelo", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Las Hortensias",
      department: "Santander",
      origin: "Pinchote, Santander",
      farmName: "",
      farmerName: "Juan Pablo García",
      variety: "Castillo Rojo",
      process: "Lavado Tradicional",
      altitude: "1.600 msnm",
      brewMethod: "chemex",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 2,
      notes: "Primer café 100% orgánico certificado de Varietale. Taza limpia y dulce con notas a caña, cacao suave y frutos secos tostados.",
      flavors: [
        { descriptorId: "desc_roasted_cereal", name: "Cereal tostado", macro: "Tostado", intensity: 4 },
        { descriptorId: "desc_cocoa_milk_chocolate", name: "Chocolate con leche", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 5 },
      ],
    },
    {
      coffeeName: "Bourbon Papayo",
      department: "Huila",
      origin: "Acevedo, Huila",
      farmName: "",
      farmerName: "",
      variety: "Borbón Papayo",
      process: "Natural (88 pts SCA)",
      altitude: "1.750 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 3,
      notes: "Explosión aromática a frutas tropicales maduras, papaya fresca, mango dulce y final limpio con 88 puntos SCA.",
      flavors: [
        { descriptorId: "desc_fruity_papaya", name: "Papaya", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_fruity_peach", name: "Melocotón / Durazno", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 5 },
      ],
    },
    {
      coffeeName: "Mezcla de la Casa",
      department: "Huila",
      origin: "Colombia (Huila, Cundinamarca y Tolima)",
      farmName: "",
      farmerName: "",
      variety: "Castillo, Caturra y Colombia",
      process: "Lavado Tradicional",
      altitude: "1.750 msnm",
      brewMethod: "espresso",
      bodyLevel: 3,
      rating: 5,
      daysAgo: 4,
      notes: "El clásico de Varietale. Crema densa y avellanada, aroma a cacao, notas a caramelo fundido y frutas con acidez moderada.",
      flavors: [
        { descriptorId: "desc_cocoa_dark_chocolate", name: "Chocolate oscuro", macro: "Frutos secos / cacao", intensity: 5 },
        { descriptorId: "desc_sweet_caramel", name: "Caramelo", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_blackberry", name: "Mora", macro: "Frutal", intensity: 3 },
      ],
    },
    {
      coffeeName: "San Antonio",
      department: "Cundinamarca",
      origin: "Bituima, Cundinamarca",
      farmName: "",
      farmerName: "",
      variety: "Castillo",
      process: "Lavado Tradicional",
      altitude: "1.650 msnm",
      brewMethod: "aeropress",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 5,
      notes: "Café exótico del centro de Colombia. Notas a avellanas, melado de caña, ralladura de lima y especias dulces.",
      flavors: [
        { descriptorId: "desc_nut_hazelnut", name: "Avellana tostada", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_fruity_lime", name: "Lima", macro: "Frutal", intensity: 3 },
      ],
    },
    {
      coffeeName: "La Laguna",
      department: "Huila",
      origin: "La Laguna, Huila",
      farmName: "",
      farmerName: "",
      variety: "Castillo",
      process: "Semilavado",
      altitude: "1.700 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 6,
      notes: "Proceso semilavado que potencia la pureza y balance. Notas a fruta madura, acidez málica, almendras y fondo vinoso.",
      flavors: [
        { descriptorId: "desc_fruity_apple", name: "Manzana roja", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_nut_almond", name: "Almendra", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sour_winey", name: "Vinoso", macro: "Ácido / fermentado", intensity: 3 },
      ],
    },
    {
      coffeeName: "San José",
      department: "Huila",
      origin: "San José de Isnos, Huila",
      farmName: "",
      farmerName: "",
      variety: "Castillo",
      process: "Lavado Tradicional",
      altitude: "1.650 msnm",
      brewMethod: "moka",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 7,
      notes: "Beneficio lavado en origen. Notas dulces de caña y dulce de leche con toque afrutado de arándano y acidez fresca.",
      flavors: [
        { descriptorId: "desc_sweet_caramel", name: "Caramelo", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_blueberry", name: "Arándano", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Mesetas",
      department: "Meta",
      origin: "Mesetas, Meta (Comunidad Nasa)",
      farmName: "",
      farmerName: "Comunidad Indígena Nasa",
      variety: "Castillo",
      process: "Semilavado",
      altitude: "1.000 msnm",
      brewMethod: "prensa",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 8,
      notes: "Cultivado por la Comunidad Indígena Nasa con proceso semilavado. Perfil cremoso con notas a fruta seca y limón sutil.",
      flavors: [
        { descriptorId: "desc_fruity_dried_fruit", name: "Fruta seca", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_fruity_lemon", name: "Limón", macro: "Frutal", intensity: 3 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Bruselas",
      department: "Huila",
      origin: "Bruselas, Huila",
      farmName: "",
      farmerName: "",
      variety: "Caturra",
      process: "Lavado Tradicional",
      altitude: "1.650 msnm",
      brewMethod: "chemex",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 9,
      notes: "Selección de pequeños productores de Bruselas, Huila. Alta dulzura a caramelo, dátiles y cacao con acidez cítrica brillante.",
      flavors: [
        { descriptorId: "desc_sweet_caramel", name: "Caramelo", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_date", name: "Dátil", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_cocoa_milk_chocolate", name: "Chocolate con leche", macro: "Frutos secos / cacao", intensity: 4 },
      ],
    },
    {
      coffeeName: "La Argelia",
      department: "Cauca",
      origin: "Inzá (Tierradentro), Cauca",
      farmName: "Finca La Argelia",
      farmerName: "Alejandro Ariza",
      variety: "Caturra",
      process: "Lavado Tradicional",
      altitude: "1.640 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 10,
      notes: "Producido por Alejandro Ariza en la finca La Argelia. Sabor a panela, arándano silvestre, caña dulce y cuerpo jugoso.",
      flavors: [
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_blueberry", name: "Arándano", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_floral_coffee_blossom", name: "Flor de café", macro: "Floral", intensity: 3 },
      ],
    },
    {
      coffeeName: "Sans (Descafeinado)",
      department: "Quindío",
      origin: "Montañas del Quindío",
      farmName: "",
      farmerName: "",
      variety: "Castillo y Caturra",
      process: "EA Sugar Cane (Descafeinado)",
      altitude: "1.750 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 11,
      notes: "Descafeinización natural con acetato de caña de azúcar. Gran dulzura a miel y panela con notas suaves a chocolate.",
      flavors: [
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_cocoa_dark_chocolate", name: "Chocolate oscuro", macro: "Frutos secos / cacao", intensity: 3 },
      ],
    },
    {
      coffeeName: "Papayo Enmielado",
      department: "Huila",
      origin: "Palestina, Huila",
      farmName: "",
      farmerName: "",
      variety: "Borbón Papayo",
      process: "Red Honey",
      altitude: "1.900 msnm",
      brewMethod: "siphon",
      bodyLevel: 3,
      rating: 5,
      daysAgo: 12,
      notes: "Proceso Red Honey en Palestina, Huila a 1.900 msnm. Notas a lima dulce, caramelo espeso y sutiles especias cálidas.",
      flavors: [
        { descriptorId: "desc_fruity_lime", name: "Lima", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_sweet_caramel", name: "Caramelo", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_spices_cinnamon", name: "Canela", macro: "Especias", intensity: 4 },
      ],
    },
    {
      coffeeName: "Pitalito",
      department: "Huila",
      origin: "Pitalito, Huila",
      farmName: "",
      farmerName: "Jhohan Becerra",
      variety: "Caturra, Colombia y Castillo",
      process: "Lavado Tradicional",
      altitude: "1.500 msnm",
      brewMethod: "aeropress",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 13,
      notes: "Producido por Jhohan Becerra. Gran balance con notas marcadas a frutos rojos, chocolate y cuerpo redondo.",
      flavors: [
        { descriptorId: "desc_fruity_strawberry", name: "Fresa / Frutos rojos", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_cocoa_milk_chocolate", name: "Chocolate con leche", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Bourbon Papayo",
      department: "Huila",
      origin: "Acevedo, Huila",
      farmName: "",
      farmerName: "",
      variety: "Borbón Papayo",
      process: "Natural (88 pts SCA)",
      altitude: "1.750 msnm",
      brewMethod: "chemex",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 14,
      notes: "Extracción muy limpia en Chemex. Brillan las notas de mango y papaya madura con dulzura prolongada a miel.",
      flavors: [
        { descriptorId: "desc_fruity_papaya", name: "Papaya", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_floral_jasmine", name: "Jazmín", macro: "Floral", intensity: 4 },
      ],
    },
    {
      coffeeName: "Mezcla de la Casa",
      department: "Huila",
      origin: "Colombia (Huila, Cundinamarca y Tolima)",
      farmName: "",
      farmerName: "",
      variety: "Castillo, Caturra y Colombia",
      process: "Lavado Tradicional",
      altitude: "1.750 msnm",
      brewMethod: "prensa",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 15,
      notes: "En prensa francesa resalta un cuerpo muy denso y achocolatado con notas de panela oscura y nuez.",
      flavors: [
        { descriptorId: "desc_cocoa_dark_chocolate", name: "Chocolate oscuro", macro: "Frutos secos / cacao", intensity: 5 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_nut_walnut", name: "Nuez", macro: "Frutos secos / cacao", intensity: 4 },
      ],
    },
    {
      coffeeName: "Palermo",
      department: "Huila",
      origin: "Palermo, Huila",
      farmName: "",
      farmerName: "",
      variety: "Castillo y Borbón",
      process: "Lavado Tradicional",
      altitude: "900 msnm",
      brewMethod: "aeropress",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 16,
      notes: "Preparación corta con aeropress: acidez cítrica muy agradable y dulzura sedosa a miel de abejas.",
      flavors: [
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_lemon", name: "Limón", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Las Hortensias",
      department: "Santander",
      origin: "Pinchote, Santander",
      farmName: "",
      farmerName: "Juan Pablo García",
      variety: "Castillo Rojo",
      process: "Lavado Tradicional",
      altitude: "1.600 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 17,
      notes: "Gran pureza orgánica cultivada por Juan Pablo García. Caramelo suave, notas de avellana tostada y final limpio.",
      flavors: [
        { descriptorId: "desc_roasted_cereal", name: "Cereal tostado", macro: "Tostado", intensity: 4 },
        { descriptorId: "desc_nut_hazelnut", name: "Avellana tostada", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_caramel", name: "Caramelo", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "La Argelia",
      department: "Cauca",
      origin: "Inzá (Tierradentro), Cauca",
      farmName: "Finca La Argelia",
      farmerName: "Alejandro Ariza",
      variety: "Caturra",
      process: "Lavado Tradicional",
      altitude: "1.640 msnm",
      brewMethod: "espresso",
      bodyLevel: 3,
      rating: 5,
      daysAgo: 18,
      notes: "En espresso sorprende su acidez de frutos rojos combinada con panela espesa. Crema dorada y persistente.",
      flavors: [
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_blueberry", name: "Arándano", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_cocoa_dark_chocolate", name: "Chocolate oscuro", macro: "Frutos secos / cacao", intensity: 4 },
      ],
    },
    {
      coffeeName: "San Antonio",
      department: "Cundinamarca",
      origin: "Bituima, Cundinamarca",
      farmName: "",
      farmerName: "",
      variety: "Castillo",
      process: "Lavado Tradicional",
      altitude: "1.650 msnm",
      brewMethod: "chemex",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 19,
      notes: "Taza cristalina en Chemex. Melado de caña, notas herbales sutiles y fondo de avellana.",
      flavors: [
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_nut_hazelnut", name: "Avellana tostada", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_fruity_lime", name: "Lima", macro: "Frutal", intensity: 3 },
      ],
    },
    {
      coffeeName: "Pitalito",
      department: "Huila",
      origin: "Pitalito, Huila",
      farmName: "",
      farmerName: "Jhohan Becerra",
      variety: "Caturra, Colombia y Castillo",
      process: "Lavado Tradicional",
      altitude: "1.500 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 20,
      notes: "Café de Jhohan Becerra filtrado en V60. Resalta la acidez jugosa de fresa con un retrogusto a chocolate con leche.",
      flavors: [
        { descriptorId: "desc_fruity_strawberry", name: "Fresa / Frutos rojos", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_cocoa_milk_chocolate", name: "Chocolate con leche", macro: "Frutos secos / cacao", intensity: 5 },
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 4 },
      ],
    },
  ];

  const tastings: TastingRecord[] = mockSpecs.map((spec, index) => {
    const fullFlavors: FlavorSelection[] = spec.flavors.map((f) => ({
      descriptorId: f.descriptorId,
      name: f.name,
      macro: f.macro,
      subcategory: f.subcategory || f.macro,
      intensity: f.intensity,
    }));
    const spider = computeSensorySpiderProfile(fullFlavors, spec.bodyLevel);
    const isMolido = (index % 3) === 1;
    const coffeeForm: "grano" | "molido" = isMolido ? "molido" : "grano";
    let grindSize: "fina" | "media" | "gruesa" = "media";
    if (spec.brewMethod === "espresso" || spec.brewMethod === "moka") {
      grindSize = "fina";
    } else if (spec.brewMethod === "prensa" || spec.brewMethod === "coldbrew") {
      grindSize = "gruesa";
    } else {
      grindSize = "media";
    }
    return {
      id: `test-user-cata-${String(index + 1).padStart(2, "0")}`,
      createdAt: new Date(now - spec.daysAgo * dayMs).toISOString(),
      coffeeName: spec.coffeeName,
      brand: "VARIETALE",
      farmName: spec.farmName,
      farmerName: spec.farmerName,
      country: "Colombia",
      department: spec.department,
      origin: spec.origin,
      variety: spec.variety,
      process: spec.process,
      altitude: spec.altitude,
      coffeeForm,
      grindSize,
      brewMethod: spec.brewMethod,
      qualityChecklist: {
        waterFiltered: true,
        grindCorrect: true,
        waterNotBoiling: true,
      },
      bodyLevel: spec.bodyLevel,
      selectedFlavors: fullFlavors,
      spiderProfile: spider,
      rating: spec.rating,
      userNotes: spec.notes,
      photoUrl: undefined,
    };
  });

  try {
    localStorage.setItem(
      TEST_USER_TASTINGS_STORAGE_KEY,
      JSON.stringify(tastings)
    );
  } catch (e) {
    console.error("Error guardando 20 catas simuladas del usuario de prueba:", e);
  }

  return tastings;
};

/**
 * Obtiene las cuentas vinculadas con Google.
 */
export const getGoogleAccounts = (): StoredAccount[] => {
  const accounts = getStoredAccounts();
  return accounts.filter((a) => a.authProvider === "google" || (a.email && a.email.includes("@")));
};

/**
 * Guarda o actualiza una cuenta en el almacenamiento local.
 */
export const saveAccount = (account: StoredAccount): void => {
  try {
    const accounts = getStoredAccounts();
    const index = accounts.findIndex(
      (a) =>
        a.id === account.id ||
        (account.username && a.username.toLowerCase() === account.username.toLowerCase()) ||
        (account.email && a.email && a.email.toLowerCase() === account.email.toLowerCase())
    );

    if (index >= 0) {
      accounts[index] = { ...accounts[index], ...account };
    } else {
      accounts.push(account);
    }
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Error guardando cuenta:", e);
  }
};

/**
 * Busca una cuenta por su nombre de usuario, correo electrónico o identificador único.
 */
export const findAccountByIdentifier = (identifier: string): StoredAccount | null => {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const accounts = getStoredAccounts();

  return (
    accounts.find(
      (a) =>
        a.username.toLowerCase() === clean ||
        (a.email && a.email.toLowerCase() === clean) ||
        a.id.toLowerCase() === clean
    ) || null
  );
};

// ============================================================================
// 5. VALIDACIÓN DE SEGURIDAD Y RESTABLECIMIENTO
// ============================================================================

/**
 * Valida el PIN de seguridad de 4 dígitos de una cuenta.
 */
export const verifyPin = (identifier: string, pin: string): boolean => {
  const account = findAccountByIdentifier(identifier);
  if (!account) return false;
  return account.securityPin?.trim() === pin.trim();
};

/**
 * Valida la respuesta a la pregunta de seguridad de una cuenta.
 */
export const verifySecurityAnswer = (identifier: string, answer: string): boolean => {
  const account = findAccountByIdentifier(identifier);
  if (!account || !account.securityAnswer) return false;
  return account.securityAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
};

/**
 * Restablece la contraseña de una cuenta identificada.
 */
export const resetPassword = (identifier: string, newPassword: string): boolean => {
  const accounts = getStoredAccounts();
  const clean = identifier.trim().toLowerCase();
  const index = accounts.findIndex(
    (a) =>
      a.username.toLowerCase() === clean ||
      (a.email && a.email.toLowerCase() === clean) ||
      a.id.toLowerCase() === clean
  );

  if (index >= 0) {
    accounts[index].password = newPassword;
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    return true;
  }
  return false;
};

// ============================================================================
// 6. RECORDAR IDENTIFICADOR DE USUARIO
// ============================================================================

/**
 * Obtiene el último identificador recordado en el dispositivo.
 */
export const getLastRememberedIdentifier = (): string | null => {
  try {
    const id = localStorage.getItem(LAST_USER_KEY);
    if (
      id &&
      (id === "catador.prueba" ||
        id === "prueba@varietale.com" ||
        id === "user-test-dev")
    ) {
      localStorage.removeItem(LAST_USER_KEY);
      return null;
    }
    return id;
  } catch {
    return null;
  }
};

/**
 * Guarda o elimina el último identificador recordado.
 */
export const setLastRememberedIdentifier = (identifier: string | null): void => {
  try {
    if (identifier) {
      localStorage.setItem(LAST_USER_KEY, identifier);
    } else {
      localStorage.removeItem(LAST_USER_KEY);
    }
  } catch {}
};

// ============================================================================
// 7. TRANSFORMACIÓN A PERFIL DE SESIÓN
// ============================================================================

/**
 * Convierte un registro persistido StoredAccount al formato UserProfile en tiempo de ejecución.
 */
export const accountToUserProfile = (account: StoredAccount): UserProfile => {
  const firstName = extractGoogleFirstName(account.email, account.name);
  const effectiveUsername = account.username || firstName.toLowerCase();
  const effectiveName = account.name || firstName;

  return {
    id: account.id,
    name: effectiveName,
    username: effectiveUsername,
    email: account.email,
    experienceLevel: "entusiasta",
    favoriteStore: "Varietale Chapinero - Carrera 4a #57-02",
    memberSince: account.createdAt || "2024",
    avatarColor: account.avatarColor || (account.authProvider === "google" ? "#EA4335" : "#01374C"),
    authProvider: account.authProvider || "email",
    verified: true,
  };
};
