/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - DEFINICIONES DE TIPOS Y MODELOS DE DATOS
 * ============================================================================
 * Este archivo centraliza todas las interfaces TypeScript y tipos de dominio
 * utilizados en la aplicación: métodos de preparación, rueda de sabores SCA,
 * perfiles de usuario, catálogo de cafés y registros de la bitácora.
 */

// ============================================================================
// 1. MÉTODOS DE PREPARACIÓN Y EXTRACCIÓN
// ============================================================================

/**
 * Identificadores de los métodos de preparación disponibles en Varietale.
 */
export type BrewMethod =
  | "goteo"
  | "moka"
  | "prensa"
  | "v60"
  | "chemex"
  | "aeropress"
  | "espresso"
  | "coldbrew"
  | "siphon"
  | "hermistone"
  | "silverton";

/**
 * Ficha técnica y pedagógica de cada método de preparación.
 */
export interface BrewMethodInfo {
  /** Identificador único del método */
  id: BrewMethod;
  /** Nombre visible para el usuario (ej: "V60", "Chemex") */
  name: string;
  /** Descripción corta del principio de extracción */
  shortDesc: string;
  /** Tipo de icono para renderizado visual */
  iconType: string;
  /** Perfil en taza ideal que produce este método */
  idealProfile: string;
  /** Proporción recomendada café / agua (ratio) */
  ratio?: string;
  /** Tamaño de molienda sugerido */
  grind?: string;
  /** Tiempo y temperatura estimada de extracción */
  time?: string;
  /** Puntos destacados sensoriales y recomendaciones */
  highlights?: string[];
}

/**
 * Lista de verificación de calidad previa a la preparación.
 * Asegura condiciones óptimas de extracción.
 */
export interface QualityChecklist {
  /** Indica si se utilizó agua filtrada de mineralización adecuada */
  waterFiltered: boolean;
  /** Indica si la granulometría de molienda es la correcta para el método */
  grindCorrect: boolean;
  /** Indica si la temperatura del agua se controló (sin hervir agresivamente) */
  waterNotBoiling: boolean;
}

/**
 * Nivel de cuerpo o sensación táctil en boca percibida en la infusión.
 * 1: Ligero / acuoso, 2: Medio / sedoso, 3: Denso / cremoso.
 */
export type BodyLevel = 1 | 2 | 3;

// ============================================================================
// 2. RUEDA DE SABORES Y PERFILES SENSORIALES SCA
// ============================================================================

/**
 * Macro-familias oficiales de la Rueda de Sabores de la Specialty Coffee Association (SCA),
 * incluyendo variantes normalizadas.
 */
export type MacroProfile =
  | "Floral"
  | "Frutal"
  | "Ácido / fermentado"
  | "Verde / vegetal"
  | "Otros"
  | "Tostado"
  | "Especias"
  | "Frutos secos / cacao"
  | "Dulce"
  | "Agrio/Fermentado"
  | "Verde/Vegetal"
  | "Nueces/Cacao";

/**
 * Descriptor sensorial individual perteneciente a la rueda de sabores.
 */
export interface FlavorDescriptor {
  /** Identificador único jerárquico (ej: "fruity__berry__blackberry") */
  id: string;
  /** Nombre del descriptor en español (ej: "Mora") */
  name: string;
  /** Subcategoría a la que pertenece (ej: "Bayas") */
  subcategory: string;
  /** Macro-familia principal (ej: "Frutal") */
  macro: MacroProfile;
  /** Código de color hexadecimal oficial SCA */
  color: string;
  /** Guía sensorial y pista de cata para el usuario */
  hint: string;
  /** Alimento o aroma de referencia en el mundo real */
  reference?: string;
  /** Nombre del descriptor en inglés (estándar SCA internacional) */
  nameEn?: string;
}

/**
 * Selección de sabor registrada por el usuario durante una cata.
 */
export interface FlavorSelection {
  /** Identificador del descriptor */
  descriptorId: string;
  /** Nombre visible */
  name: string;
  /** Macro-familia a la que pertenece */
  macro: MacroProfile;
  /** Subcategoría específica */
  subcategory: string;
  /** Intensidad percibida (escala de 1 a 5) */
  intensity: number;
}

/**
 * Perfil sensorial multidimensional computado (Gráfico de Radar).
 * Contiene los porcentajes de intensidad (0 a 100) en cada eje de la rueda SCA
 * más los atributos táctiles y de balance de taza.
 */
export interface SensorySpiderProfile {
  // Las 9 categorías oficiales de la rueda SCA:
  floral: number;
  frutal: number;
  acido?: number;
  verde?: number;
  otros?: number;
  tostado: number;
  especias?: number;
  nueces?: number;
  dulce: number;
  // Atributos táctiles y de balance:
  cuerpo?: number;
  acidez?: number;
  balance?: number;
}

// ============================================================================
// 3. PERFIL DE USUARIO Y AUTENTICACIÓN
// ============================================================================

/**
 * Perfil activo de catador en sesión de la aplicación.
 */
export interface UserProfile {
  /** Identificador único del usuario */
  id: string;
  /** Nombre o nombre de pila para la interfaz */
  name: string;
  /** Nombre de usuario único (handle, ej: @leyton) */
  username?: string;
  /** Teléfono de contacto opcional */
  phone?: string;
  /** Correo electrónico registrado */
  email?: string;
  /** Nivel de experiencia en café de especialidad */
  experienceLevel?: "principiante" | "aficionado" | "profesional" | "entusiasta" | "barista";
  /** Sede de Varietale preferida */
  favoriteStore: string;
  /** Año o fecha de vinculación */
  memberSince: string;
  /** Color distintivo para el avatar */
  avatarColor?: string;
  /** URL opcional de foto de perfil */
  avatarUrl?: string;
  /** Proveedor de autenticación utilizado */
  authProvider?: "google" | "email" | "guest";
  /** Estado de verificación de la cuenta */
  verified?: boolean;
}

// ============================================================================
// 4. CATÁLOGO DE CAFÉS DE ESPECIALIDAD
// ============================================================================

/**
 * Información botánica, geográfica y comercial de un café de especialidad.
 */
export interface CoffeeInfo {
  /** Nombre comercial o nombre de lote del café */
  coffeeName: string;
  /** Origen geográfico (municipio, departamento, finca) */
  origin: string;
  /** Variedad botánica (ej: Geisha, Borbón Papayo, Caturra) */
  variety: string;
  /** Método de beneficio (ej: Lavado, Honey, Natural) */
  process: string;
  /** Altura de cultivo sobre el nivel del mar */
  altitude?: string;
  /** Descripción sensorial u origen de la etiqueta */
  description?: string;
  /** Macro-perfil predominante sugerido */
  suggestedMacro?: MacroProfile;
  /** Fotografía del producto o bolsa */
  imageUrl?: string;
  /** Clasificación comercial (ej: Café Especial, Edición Limitada, Café Exótico) */
  productType?: string;
  /** Precio formateado en pesos colombianos */
  price?: string;
  /** Enlace a la ficha oficial en la tienda web de Varietale */
  url?: string;
  /** Handle único para la URL del producto */
  handle?: string;
}

// ============================================================================
// 5. REGISTROS DE LA BITÁCORA DE CATACIÓN
// ============================================================================

/**
 * Registro completo e inmutable de una sesión de catación guardada por el usuario.
 */
export interface TastingRecord {
  /** Identificador único del registro */
  id: string;
  /** Fecha y hora de creación en formato ISO */
  createdAt: string;
  /** Nombre del café evaluado */
  coffeeName: string;
  /** Origen del café */
  origin: string;
  /** Variedad botánica */
  variety: string;
  /** Proceso de beneficio */
  process: string;
  /** Altura sobre el nivel del mar */
  altitude?: string;
  /** Método de preparación empleado */
  brewMethod: BrewMethod;
  /** Verificación de parámetros de preparación */
  qualityChecklist: QualityChecklist;
  /** Nivel de cuerpo táctil percibido */
  bodyLevel: BodyLevel;
  /** Descriptores de sabor seleccionados con su intensidad */
  selectedFlavors: FlavorSelection[];
  /** Perfil de radar computado */
  spiderProfile: SensorySpiderProfile;
  /** Calificación global del catador (1 a 5 estrellas) */
  rating: number;
  /** Apuntes personales o sensaciones del catador */
  userNotes: string;
  /** Foto de la bolsa o de la taza */
  photoUrl?: string;
}
