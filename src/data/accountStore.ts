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
      if (Array.isArray(parsed)) return parsed;
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
      coffeeName: "Geisha Lavado - Finca El Paraíso",
      department: "Cauca",
      origin: "Piendamó, Cauca",
      farmName: "Finca El Paraíso",
      farmerName: "Diego Samuel Bermúdez",
      variety: "Geisha",
      process: "Lavado",
      altitude: "1.930 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 1,
      notes: "Taza excepcional. Notas florales muy intensas a jazmín y durazno con una acidez málica brillante y final sedoso a miel.",
      flavors: [
        { descriptorId: "desc_floral_jasmine", name: "Jazmín", macro: "Floral", intensity: 5 },
        { descriptorId: "desc_fruity_peach", name: "Melocotón / Durazno", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 5 },
      ],
    },
    {
      coffeeName: "Bourbon Rosado - Finca Las Flores",
      department: "Huila",
      origin: "Acevedo, Huila",
      farmName: "Finca Las Flores",
      farmerName: "Jhoan Vergara",
      variety: "Bourbon Rosado",
      process: "Lavado",
      altitude: "1.750 msnm",
      brewMethod: "chemex",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 2,
      notes: "Dulzura envolvente a panela y flor de café. En boca se siente jugo de cereza fresca con una textura muy elegante.",
      flavors: [
        { descriptorId: "desc_sweet_panela", name: "Panela / Azúcar de caña", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_fruity_cherry", name: "Cereza", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_floral_coffee_blossom", name: "Flor de café", macro: "Floral", intensity: 4 },
      ],
    },
    {
      coffeeName: "Castillo Honey - Finca La Esmeralda",
      department: "Quindío",
      origin: "Genoa, Quindío",
      farmName: "Finca La Esmeralda",
      farmerName: "Carlos Alberto Marín",
      variety: "Castillo",
      process: "Honey Amarillo",
      altitude: "1.680 msnm",
      brewMethod: "aeropress",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 3,
      notes: "Cuerpo medio-alto muy sedoso. Se aprecian notas claras a miel de caña, manzana roja y un toque de canela al enfriar.",
      flavors: [
        { descriptorId: "desc_sweet_cane_honey", name: "Miel de caña", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_fruity_apple", name: "Manzana roja", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_spices_cinnamon", name: "Canela", macro: "Especias", intensity: 3 },
      ],
    },
    {
      coffeeName: "Tabi Natural - Finca Buena Vista",
      department: "Tolima",
      origin: "Planadas, Tolima",
      farmName: "Finca Buena Vista",
      farmerName: "Esperanza Gómez",
      variety: "Tabi",
      process: "Natural",
      altitude: "1.820 msnm",
      brewMethod: "prensa",
      bodyLevel: 3,
      rating: 5,
      daysAgo: 5,
      notes: "En prensa francesa resalta un cuerpo licoroso impresionante. Mucha mora silvestre madura, vino tinto dulce y chocolate negro.",
      flavors: [
        { descriptorId: "desc_fruity_blackberry", name: "Mora", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_cocoa_dark_chocolate", name: "Chocolate oscuro", macro: "Frutos secos / cacao", intensity: 5 },
        { descriptorId: "desc_sweet_panela", name: "Panela", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Caturra Chiroso - Finca La Loma",
      department: "Antioquia",
      origin: "Urrao, Antioquia",
      farmName: "Finca La Loma",
      farmerName: "José Arcadio Henao",
      variety: "Caturra Chiroso",
      process: "Lavado",
      altitude: "1.980 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 6,
      notes: "Fragancia que inunda la sala: hierbaluisa, mandarina dulce y flor de azahar. Taza súper limpia y cristalina.",
      flavors: [
        { descriptorId: "desc_citrus_mandarin", name: "Mandarina", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_green_lemon_verbena", name: "Hierbaluisa / Lemongrass", macro: "Floral", intensity: 4 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Wush Wush Natural - Finca El Diamante",
      department: "Nariño",
      origin: "Buesaco, Nariño",
      farmName: "Finca El Diamante",
      farmerName: "María Mercedes Rosero",
      variety: "Wush Wush",
      process: "Natural Anaeróbico",
      altitude: "2.050 msnm",
      brewMethod: "v60",
      bodyLevel: 3,
      rating: 5,
      daysAgo: 8,
      notes: "Perfil sumamente exótico. Notas tropicales a mango maduro, maracuyá y nibs de cacao con un retrogusto largo.",
      flavors: [
        { descriptorId: "desc_fruity_mango", name: "Mango", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_fruity_passion_fruit", name: "Maracuyá", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_cocoa_nibs", name: "Nibs de cacao", macro: "Frutos secos / cacao", intensity: 4 },
      ],
    },
    {
      coffeeName: "Maragogype Lavado - Finca Santa Bárbara",
      department: "Santander",
      origin: "San Gil, Santander",
      farmName: "Finca Santa Bárbara",
      farmerName: "Gustavo Valderrama",
      variety: "Maragogype",
      process: "Lavado Clásico",
      altitude: "1.600 msnm",
      brewMethod: "prensa",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 9,
      notes: "Granos elefante espectaculares. Taza balanceada con chocolate con leche, avellanas tostadas y toque de vainilla.",
      flavors: [
        { descriptorId: "desc_cocoa_milk_chocolate", name: "Chocolate con leche", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_nut_hazelnut", name: "Avellana tostada", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_vanilla", name: "Vainilla natural", macro: "Dulce", intensity: 3 },
      ],
    },
    {
      coffeeName: "Sudan Rume - Finca Inmaculada",
      department: "Valle del Cauca",
      origin: "Pichindé, Cali",
      farmName: "Finca Las Nubes",
      farmerName: "Familia Holguín",
      variety: "Sudan Rume",
      process: "Lavado Prolongado",
      altitude: "1.850 msnm",
      brewMethod: "chemex",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 11,
      notes: "Increíble complejidad botánica. Cardamomo dulce, eucalipto fresco y miel de azahar con acidez sedosa.",
      flavors: [
        { descriptorId: "desc_spices_cardamom", name: "Cardamomo", macro: "Especias", intensity: 5 },
        { descriptorId: "desc_green_eucalyptus", name: "Eucalipto", macro: "Verde / vegetal", intensity: 3 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Pacamara Natural - Finca El Roble",
      department: "Cundinamarca",
      origin: "Sasaima, Cundinamarca",
      farmName: "Finca El Roble",
      farmerName: "Fernando Benavides",
      variety: "Pacamara",
      process: "Natural",
      altitude: "1.700 msnm",
      brewMethod: "aeropress",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 13,
      notes: "Cuerpo untuoso. Sabores a ciruela pasa madura, nueces y chocolate amargo con acidez suave de frutos negros.",
      flavors: [
        { descriptorId: "desc_fruity_plum", name: "Ciruela pasa", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_nut_walnut", name: "Nuez", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_cocoa_dark_chocolate", name: "Chocolate oscuro", macro: "Frutos secos / cacao", intensity: 4 },
      ],
    },
    {
      coffeeName: "Sidra Anaeróbico - Finca Villa Rosita",
      department: "Risaralda",
      origin: "Santa Rosa de Cabal, Risaralda",
      farmName: "Finca Villa Rosita",
      farmerName: "Rodrigo Sánchez",
      variety: "Sidra",
      process: "Anaeróbico 72h",
      altitude: "1.900 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 14,
      notes: "Manzana verde ácida y fresca, sidra dulce y un final especiado a canela y azúcar morena de caña.",
      flavors: [
        { descriptorId: "desc_fruity_green_apple", name: "Manzana verde", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_sour_cider", name: "Sidra", macro: "Ácido / fermentado", intensity: 4 },
        { descriptorId: "desc_spices_cinnamon", name: "Canela", macro: "Especias", intensity: 4 },
      ],
    },
    {
      coffeeName: "Papayo Lavado - Finca San José",
      department: "Huila",
      origin: "San Agustín, Huila",
      farmName: "Finca San José",
      farmerName: "Arnulfo Leguízamo",
      variety: "Papayo",
      process: "Lavado Tradicional",
      altitude: "1.890 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 16,
      notes: "Acidez cítrica vivaz tipo grosella roja y bergamota con un cuerpo ligero y final limpio a té negro floral.",
      flavors: [
        { descriptorId: "desc_fruity_currant", name: "Grosella", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_roasted_black_tea", name: "Té negro", macro: "Tostado", intensity: 4 },
        { descriptorId: "desc_citrus_mandarin", name: "Mandarina", macro: "Frutal", intensity: 4 },
      ],
    },
    {
      coffeeName: "Typica Mejorado - Finca Las Acacias",
      department: "Caldas",
      origin: "Chinchiná, Caldas",
      farmName: "Finca Las Acacias",
      farmerName: "Hernán Botero",
      variety: "Typica",
      process: "Lavado",
      altitude: "1.650 msnm",
      brewMethod: "chemex",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 18,
      notes: "El perfil clásico colombiano por excelencia: panela de trapiche, naranja dulce madura y almendras tostadas.",
      flavors: [
        { descriptorId: "desc_citrus_orange", name: "Naranja dulce", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela", macro: "Dulce", intensity: 5 },
        { descriptorId: "desc_nut_almond", name: "Almendras", macro: "Frutos secos / cacao", intensity: 4 },
      ],
    },
    {
      coffeeName: "Bourbon Amarillo - Finca Alto de la Paz",
      department: "Boyacá",
      origin: "Moniquirá, Boyacá",
      farmName: "Finca Alto de la Paz",
      farmerName: "Rosaura Pedraza",
      variety: "Bourbon Amarillo",
      process: "Honey Blanco",
      altitude: "1.780 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 19,
      notes: "Frutas amarillas muy dulces, piña almibarada y miel de abeja con cuerpo suave y redondo.",
      flavors: [
        { descriptorId: "desc_fruity_pineapple", name: "Piña madura", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_sweet_caramel", name: "Caramelo suave", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Geisha Natural Experimental",
      department: "Cauca",
      origin: "Inzá, Tierradentro, Cauca",
      farmName: "Finca Vista Hermosa",
      farmerName: "Albeiro Medina",
      variety: "Geisha",
      process: "Natural Doble Fermentación",
      altitude: "1.950 msnm",
      brewMethod: "aeropress",
      bodyLevel: 3,
      rating: 5,
      daysAgo: 21,
      notes: "Perfume embriagador a litchi, flor de azahar y azúcar morena. Una taza memorable de principio a fin.",
      flavors: [
        { descriptorId: "desc_fruity_lychee", name: "Litchi", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_floral_orange_blossom", name: "Azahar", macro: "Floral", intensity: 4 },
        { descriptorId: "desc_sweet_brown_sugar", name: "Azúcar morena", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Castillo Lavado Tradicional",
      department: "Tolima",
      origin: "Ibague, Cañón del Combeima",
      farmName: "Finca San Antonio",
      farmerName: "Javier Moreno",
      variety: "Castillo",
      process: "Lavado 24h",
      altitude: "1.580 msnm",
      brewMethod: "chemex",
      bodyLevel: 3,
      rating: 3,
      daysAgo: 22,
      notes: "Taza reconfortante y hogareña: chocolate tradicional, caña y notas a nuez. Buena acidez media.",
      flavors: [
        { descriptorId: "desc_cocoa_cocoa", name: "Chocolate clásico", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_nut_walnut", name: "Nuez", macro: "Frutos secos / cacao", intensity: 3 },
      ],
    },
    {
      coffeeName: "San Bernardo - Finca El Cedro",
      department: "Quindío",
      origin: "Filandia, Quindío",
      farmName: "Finca El Cedro",
      farmerName: "Orlando Giraldo",
      variety: "San Bernardo (Bourbon Enano)",
      process: "Lavado",
      altitude: "1.720 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 24,
      notes: "Gran balance. Mucha fruta silvestre tipo mora y frambuesa con acidez málica agradable y posgusto dulce.",
      flavors: [
        { descriptorId: "desc_fruity_berries", name: "Frutos del bosque", macro: "Frutal", intensity: 5 },
        { descriptorId: "desc_fruity_blackberry", name: "Mora", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_honey", name: "Miel", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Colombia Honey Cítrico",
      department: "Antioquia",
      origin: "Jericó, Antioquia",
      farmName: "Finca El Jardín",
      farmerName: "Lucía Tamayo",
      variety: "Variedad Colombia",
      process: "Honey Rojo",
      altitude: "1.820 msnm",
      brewMethod: "chemex",
      bodyLevel: 2,
      rating: 4,
      daysAgo: 25,
      notes: "Cítricos vibrantes a pomelo rosado y mandarina combinados con caramelo derretido y flor blanca.",
      flavors: [
        { descriptorId: "desc_citrus_grapefruit", name: "Pomelo", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_citrus_mandarin", name: "Mandarina", macro: "Frutal", intensity: 4 },
        { descriptorId: "desc_sweet_caramel", name: "Caramelo suave", macro: "Dulce", intensity: 4 },
      ],
    },
    {
      coffeeName: "Catuai Rojo - Finca El Mirador",
      department: "Nariño",
      origin: "La Unión, Nariño",
      farmName: "Finca El Mirador",
      farmerName: "Guillermo Coral",
      variety: "Catuai Rojo",
      process: "Lavado Frío",
      altitude: "1.920 msnm",
      brewMethod: "prensa",
      bodyLevel: 3,
      rating: 4,
      daysAgo: 27,
      notes: "Taza cremosa y envolvente con chocolate con leche, toffee y un sutil fondo de vainilla.",
      flavors: [
        { descriptorId: "desc_cocoa_milk_chocolate", name: "Chocolate con leche", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_vanilla", name: "Vainilla natural", macro: "Dulce", intensity: 4 },
        { descriptorId: "desc_sweet_caramel", name: "Caramelo suave", macro: "Dulce", intensity: 3 },
      ],
    },
    {
      coffeeName: "Java Lavado - Finca La Florida",
      department: "Valle del Cauca",
      origin: "Trujillo, Valle del Cauca",
      farmName: "Finca La Florida",
      farmerName: "Eduardo Caicedo",
      variety: "Java",
      process: "Lavado",
      altitude: "1.790 msnm",
      brewMethod: "v60",
      bodyLevel: 2,
      rating: 5,
      daysAgo: 28,
      notes: "Delicadeza y distinción: notas a pimienta dulce, jazmín blanco y ciruela amarilla con acidez sedosa.",
      flavors: [
        { descriptorId: "desc_spices_sweet_pepper", name: "Pimienta dulce", macro: "Especias", intensity: 4 },
        { descriptorId: "desc_floral_jasmine", name: "Jazmín", macro: "Floral", intensity: 5 },
        { descriptorId: "desc_fruity_peach", name: "Melocotón / Durazno", macro: "Frutal", intensity: 4 },
      ],
    },
    {
      coffeeName: "Blend Especial de la Casa Varietale",
      department: "Cundinamarca",
      origin: "Varietale Café de Especialidad - Bogotá",
      farmName: "Orígenes Selectos Varietale",
      farmerName: "Maestro Tostador Varietale",
      variety: "Geisha + Bourbon Rosado + Caturra",
      process: "Blend de la Casa",
      altitude: "1.800 msnm promedio",
      brewMethod: "espresso",
      bodyLevel: 3,
      rating: 5,
      daysAgo: 30,
      notes: "El espresso insigne de Varietale: crema dorada y espesa, notas intensas a chocolate suizo, almendras tostadas y final dulce prolongado.",
      flavors: [
        { descriptorId: "desc_cocoa_dark_chocolate", name: "Chocolate oscuro", macro: "Frutos secos / cacao", intensity: 5 },
        { descriptorId: "desc_nut_almond", name: "Almendras", macro: "Frutos secos / cacao", intensity: 4 },
        { descriptorId: "desc_sweet_panela", name: "Panela", macro: "Dulce", intensity: 5 },
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
