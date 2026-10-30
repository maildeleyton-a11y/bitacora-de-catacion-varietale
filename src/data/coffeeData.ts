/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - DATOS MAESTROS Y CÁLCULOS SENSORIALES
 * ============================================================================
 * Centraliza los datos canónicos de la aplicación:
 * - Fichas pedagógicas de los 11 métodos de preparación.
 * - Temas cromáticos oficiales SCA para las 9 macro-familias.
 * - Ubicaciones físicas de las tiendas oficiales Varietale.
 * - Catálogo de muestra sincronizado con www.varietale.com.
 * - Algoritmo matemático para el perfil sensorial SCA (gráfico de radar).
 */

import {
  BrewMethodInfo,
  MacroProfile,
  TastingRecord,
  CoffeeInfo,
  UserProfile,
  FlavorSelection,
  BodyLevel,
  SensorySpiderProfile,
} from "../types";

// ============================================================================
// 1. MÉTODOS DE PREPARACIÓN CALIBRADOS PARA CAFÉ DE ESPECIALIDAD
// ============================================================================

export const BREW_METHODS: BrewMethodInfo[] = [
  {
    id: "v60",
    name: "V60",
    shortDesc: "Goteo cónico",
    iconType: "v60",
    idealProfile: "Da una taza muy limpia y ligera, donde brillan los aromas florales y la frescura de las frutas.",
    ratio: "1:15 a 1:16 (ej. 15g café / 240g agua)",
    grind: "Molienda media-fina (similar a sal de mesa)",
    time: "2:30 – 3:00 min (92°C - 94°C)",
    highlights: [
      "En taza: Fresco, brillante y con notas florales y frutales muy claras.",
      "Sensación: Ligero, suave y muy cristalino.",
      "Recomendado para: Cafés suaves, aromáticos y de sabores delicados.",
    ],
  },
  {
    id: "chemex",
    name: "Chemex",
    shortDesc: "Filtro triple espesor",
    iconType: "chemex",
    idealProfile: "Su filtro grueso retiene la mayoría de aceites, logrando una taza cristalina y muy suave.",
    ratio: "1:16 (ej. 30g café / 480g agua)",
    grind: "Molienda media-gruesa (como sal marina)",
    time: "3:30 – 4:30 min (93°C - 95°C)",
    highlights: [
      "En taza: Sabor muy limpio, dulce y sin asperezas ni amargor.",
      "Sensación: Delicado y sedoso, casi como tomar una infusión de té.",
      "Recomendado para: Cafés con aromas florales, cítricos o notas herbales sutiles.",
    ],
  },
  {
    id: "siphon",
    name: "Siphon",
    shortDesc: "Vacío e inmersión",
    iconType: "siphon",
    idealProfile: "Prepara el café con calor y vacío; el resultado es una taza caliente, muy aromática y con buen cuerpo.",
    ratio: "1:14 a 1:15 (ej. 20g café / 300g agua)",
    grind: "Molienda media (entre V60 y Chemex)",
    time: "1:30 – 2:00 min en globo superior (94°C)",
    highlights: [
      "En taza: Aromas muy intensos y sabor agradable y duradero.",
      "Sensación: Textura cremosa y envolvente en el paladar.",
      "Recomendado para: Cafés aromáticos y dulces que quieras disfrutar bien calientes.",
    ],
  },
  {
    id: "hermistone",
    name: "Hermistone",
    shortDesc: "Filtro plano de acero",
    iconType: "hermistone",
    idealProfile: "Su filtro de acero deja pasar los aceites naturales del café, dando una taza con cuerpo y gran dulzura.",
    ratio: "1:15 (ej. 18g café / 270g agua)",
    grind: "Molienda media-fina uniforme",
    time: "2:45 – 3:15 min (92°C)",
    highlights: [
      "En taza: Dulce y acaramelado, con notas a frutas maduras y panela.",
      "Sensación: Buen cuerpo y textura rica sin llegar a sentirse pesado.",
      "Recomendado para: Cafés colombianos tradicionales con notas dulces y achocolatadas.",
    ],
  },
  {
    id: "silverton",
    name: "Silverton",
    shortDesc: "Híbrido con válvula",
    iconType: "silverton",
    idealProfile: "Permite que el café repose en el agua antes de caer, logrando un balance delicioso entre frescura y dulzura.",
    ratio: "1:15 a 1:16 (ej. 20g café / 300g agua)",
    grind: "Molienda media",
    time: "3:00 – 3:30 min (reposo y goteo)",
    highlights: [
      "En taza: Muy balanceado, con dulzura suave y toques frutales agradables.",
      "Sensación: Redondo, suave y muy fácil de disfrutar.",
      "Recomendado para: Cafés especiales con notas exóticas o afrutadas.",
    ],
  },
  {
    id: "aeropress",
    name: "Aeropress",
    shortDesc: "Inmersión a presión manual",
    iconType: "aeropress",
    idealProfile: "Combina infusión rápida con una presión suave de mano; resalta la dulzura y el sabor a fruta fresca.",
    ratio: "1:12 a 1:14 (ej. 16g café / 220g agua)",
    grind: "Molienda media-fina",
    time: "1:45 – 2:15 min (88°C - 92°C)",
    highlights: [
      "En taza: Sabor jugoso, vivo y con una dulzura muy marcada.",
      "Sensación: Cuerpo medio, agradable y con buena presencia en boca.",
      "Recomendado para: Quienes buscan una taza rápida, expresiva y con buen sabor.",
    ],
  },
  {
    id: "prensa",
    name: "Prensa Francesa",
    shortDesc: "Inmersión total clásica",
    iconType: "prensa",
    idealProfile: "El café se sumerge completamente en agua caliente, dejando una taza densa, reconfortante y achocolatada.",
    ratio: "1:14 a 1:15 (ej. 25g café / 350g agua)",
    grind: "Molienda gruesa uniforme",
    time: "4:00 min de infusión (92°C - 94°C)",
    highlights: [
      "En taza: Notas a chocolate, frutos secos, caramelo y tostado.",
      "Sensación: Espeso, cremoso y con mucho cuerpo.",
      "Recomendado para: Quienes aman el café con textura fuerte y sabores clásicos.",
    ],
  },
  {
    id: "moka",
    name: "Moka Italiana",
    shortDesc: "Cafetera italiana",
    iconType: "moka",
    idealProfile: "Usa el vapor del agua para subir a través del café, dando una taza fuerte, densa y concentrada.",
    ratio: "1:8 a 1:10 (llenar canasta sin prensar)",
    grind: "Molienda fina",
    time: "3:00 – 4:00 min a fuego medio-bajo",
    highlights: [
      "En taza: Sabor intenso con notas a cacao oscuro y caramelo tostado.",
      "Sensación: Fuerte y licoroso, parecido a un espresso casero.",
      "Recomendado para: Amantes del café concentrado o para acompañar con leche.",
    ],
  },
  {
    id: "espresso",
    name: "Espresso",
    shortDesc: "Extracción en máquina",
    iconType: "espresso",
    idealProfile: "Extracción rápida bajo presión de máquina; produce una bebida corta, muy concentrada y con crema suave.",
    ratio: "1:2 (ej. 18g café / 36g bebida)",
    grind: "Molienda muy fina de precisión",
    time: "25 – 30 segundos (93°C)",
    highlights: [
      "En taza: Explosión de sabor, dulzura intensa y larga permanencia en boca.",
      "Sensación: Muy denso, con crema suave y espesa.",
      "Recomendado para: Disfrutar en pocos sorbos o como base de capuchinos.",
    ],
  },
  {
    id: "coldbrew",
    name: "Cold Brew",
    shortDesc: "Maceración en frío 16h",
    iconType: "coldbrew",
    idealProfile: "Se prepara con agua fría durante varias horas; no tiene nada de amargor agresivo y es naturalmente muy dulce.",
    ratio: "1:8 a 1:10 (concentrado con agua fría)",
    grind: "Molienda extra gruesa",
    time: "16 – 24 horas en frío (4°C - 18°C)",
    highlights: [
      "En taza: Dulzura suave con notas a chocolate, vainilla y caramelo.",
      "Sensación: Muy refrescante, sedoso y ligero para tomar con hielo.",
      "Recomendado para: Días calurosos o para quienes prefieren un café suave con el estómago.",
    ],
  },
  {
    id: "goteo",
    name: "Goteo Eléctrica",
    shortDesc: "Cafetera de filtro",
    iconType: "goteo",
    idealProfile: "La cafetera tradicional de filtro casero; produce una taza pareja, reconfortante y lista para compartir.",
    ratio: "1:16 (ej. 60g café / 1000g agua)",
    grind: "Molienda media",
    time: "4:00 – 6:00 min",
    highlights: [
      "En taza: Sabor clásico, limpio y con dulzura constante.",
      "Sensación: Ligero y fácil de beber en cualquier momento del día.",
      "Recomendado para: El café del desayuno o para servir varias tazas a la vez.",
    ],
  },
];

// ============================================================================
// 2. TEMAS CROMÁTICOS OFICIALES DE LA RUEDA DE SABORES SCA
// ============================================================================

export const MACRO_THEMES: Record<MacroProfile, {
  name: string;
  color: string;
  accent: string;
  bgLight: string;
  border: string;
  description: string;
}> = {
  Floral: {
    name: "Floral",
    color: "#DA0D68", // Magenta SCA Oficial
    accent: "#B00750",
    bgLight: "#FDF2F7",
    border: "#F9D0E3",
    description: "Jazmín, flor de cafeto, azahar, té negro, rosa y manzanilla.",
  },
  Frutal: {
    name: "Frutal",
    color: "#DA1D23", // Rojo Frutal SCA Oficial
    accent: "#B31217",
    bgLight: "#FEF3F3",
    border: "#FCD3D4",
    description: "Cítricos, bayas, frutos rojos, frutas tropicales, de hueso y secas.",
  },
  "Ácido / fermentado": {
    name: "Ácido / fermentado",
    color: "#EBB40D", // Amarillo Ácido SCA Oficial
    accent: "#B88B06",
    bgLight: "#FEFDF0",
    border: "#FAEDB3",
    description: "Ácidos cítrico, málico y acético, notas vinosas, whisky y fermentación.",
  },
  "Agrio/Fermentado": {
    name: "Ácido / fermentado",
    color: "#EBB40D", // Amarillo Ácido SCA Oficial
    accent: "#B88B06",
    bgLight: "#FEFDF0",
    border: "#FAEDB3",
    description: "Ácidos cítrico, málico y acético, notas vinosas, whisky y fermentación.",
  },
  "Verde / vegetal": {
    name: "Verde / vegetal",
    color: "#197A2F", // Verde Vegetal SCA Oficial
    accent: "#125D23",
    bgLight: "#F0F8F2",
    border: "#C6E7CE",
    description: "Herbal, hojas oscuras, heno, grano crudo y aceite de oliva.",
  },
  "Verde/Vegetal": {
    name: "Verde / vegetal",
    color: "#197A2F", // Verde Vegetal SCA Oficial
    accent: "#125D23",
    bgLight: "#F0F8F2",
    border: "#C6E7CE",
    description: "Herbal, hojas oscuras, heno, grano crudo y aceite de oliva.",
  },
  Otros: {
    name: "Otros",
    color: "#0AA3B5", // Cian / Azul Otros SCA Oficial
    accent: "#077A88",
    bgLight: "#EFFBFD",
    border: "#B6ECF3",
    description: "Papel, humedad, terroso, fenólico, salado, notas medicinales y químicas.",
  },
  Tostado: {
    name: "Tostado",
    color: "#C94930", // Naranja Tostado SCA Oficial
    accent: "#9A3420",
    bgLight: "#FDF5F3",
    border: "#F7D5CE",
    description: "Cereales, malta tostada, pan horneado, tabaco noble y ahumado.",
  },
  Especias: {
    name: "Especias",
    color: "#AD213E", // Granate Especias SCA Oficial
    accent: "#82152B",
    bgLight: "#FDF2F4",
    border: "#F6CCD4",
    description: "Canela, nuez moscada, clavo de olor, anís estrellado y pimienta.",
  },
  "Frutos secos / cacao": {
    name: "Frutos secos / cacao",
    color: "#A87B64", // Cacao / Nuez SCA Oficial
    accent: "#7D5844",
    bgLight: "#FAF6F4",
    border: "#E8DCD4",
    description: "Chocolate oscuro, cacao puro, avellana, almendra y maní.",
  },
  "Nueces/Cacao": {
    name: "Frutos secos / cacao",
    color: "#A87B64", // Cacao / Nuez SCA Oficial
    accent: "#7D5844",
    bgLight: "#FAF6F4",
    border: "#E8DCD4",
    description: "Chocolate oscuro, cacao puro, avellana, almendra y maní.",
  },
  Dulce: {
    name: "Dulce",
    color: "#E65832", // Rojo Coral Dulce SCA Oficial
    accent: "#BD3F1D",
    bgLight: "#FEF5F2",
    border: "#FCD9CE",
    description: "Panela colombiana, mieles, caramelo toffee, vainilla y sirope de arce.",
  },
};

// ============================================================================
// 3. NORMALIZACIÓN DE CATEGORÍAS SENSORIALES
// ============================================================================

/**
 * Normaliza etiquetas de categorías sensoriales para armonizar acentos,
 * barras inclinadas y variantes ortográficas entre ruedas SCA y datos legados.
 */
export function normalizeMacro(macro: string): MacroProfile {
  if (macro === "Agrio/Fermentado" || macro === "Ácido / fermentado" || macro === "Acido / fermentado") return "Ácido / fermentado";
  if (macro === "Verde/Vegetal" || macro === "Verde / vegetal") return "Verde / vegetal";
  if (macro === "Nueces/Cacao" || macro === "Frutos secos / cacao") return "Frutos secos / cacao";
  return macro as MacroProfile;
}

export {
  FLAVOR_DESCRIPTORS,
  getDescriptorDisplay,
  type DescriptorDisplayInfo,
} from "./wheelDescriptors";

// ============================================================================
// 4. SEDES FÍSICAS Y PUNTOS DE VENTA OFICIALES VARIETALE
// ============================================================================

export interface VarietaleStoreLocation {
  id: string;
  name: string;
  address: string;
  category: "Tienda Principal" | "Tienda Universitaria" | "Aeropuerto" | "Online";
  city: string;
}

/**
 * Directorio de sedes físicas oficiales de Varietale en Colombia.
 */
export const VARIETALE_STORES: VarietaleStoreLocation[] = [
  {
    id: "chapinero",
    name: "Varietale Chapinero",
    address: "Carrera 4a #57-02 (Tostador & Convento)",
    category: "Tienda Principal",
    city: "Bogotá",
  },
  {
    id: "javeriana",
    name: "Varietale Javeriana",
    address: "Calle 41 #8-43",
    category: "Tienda Principal",
    city: "Bogotá",
  },
  {
    id: "candelaria",
    name: "Varietale Candelaria",
    address: "Calle 12 #1-20",
    category: "Tienda Principal",
    city: "Bogotá",
  },
  {
    id: "virrey",
    name: "Varietale Virrey",
    address: "Carrera 18 #85-71",
    category: "Tienda Principal",
    city: "Bogotá",
  },
  {
    id: "san_patricio",
    name: "Varietale San Patricio",
    address: "Carrera 15 #102-27",
    category: "Tienda Principal",
    city: "Bogotá",
  },
  {
    id: "mall_plaza",
    name: "Varietale Mall Plaza",
    address: "Calle 19 con Carrera 30 (NQS)",
    category: "Tienda Principal",
    city: "Bogotá",
  },
  {
    id: "aeropuerto",
    name: "Varietale Aeropuerto El Dorado",
    address: "Muelle D - Salidas Nacionales",
    category: "Aeropuerto",
    city: "Bogotá",
  },
  {
    id: "uniandes",
    name: "Varietale U. de Los Andes",
    address: "Edificio Santo Domingo (Piso 7) & Ed. Alberto Lleras",
    category: "Tienda Universitaria",
    city: "Bogotá",
  },
  {
    id: "unacional",
    name: "Varietale U. Nacional",
    address: "Auditorio León de Greiff",
    category: "Tienda Universitaria",
    city: "Bogotá",
  },
  {
    id: "urosario",
    name: "Varietale U. del Rosario",
    address: "Sede Quinta de Mutis",
    category: "Tienda Universitaria",
    city: "Bogotá",
  },
  {
    id: "online",
    name: "Tienda Online / Envíos Colombia",
    address: "www.varietale.com (Envíos a todo el país)",
    category: "Online",
    city: "Nacional",
  },
];

export const DEFAULT_USER: UserProfile = {
  id: "user-leyton",
  name: "Leyton",
  username: "leyton",
  email: "maildeleyton@gmail.com",
  experienceLevel: "aficionado",
  favoriteStore: "Varietale Chapinero - Carrera 4a #57-02",
  memberSince: "2024",
  avatarColor: "#01374C",
};

// ============================================================================
// 5. CONSEJOS SENSORIALES Y CATÁLOGO DE MUESTRA VARIETALE
// ============================================================================

export const SOMMELIER_TIPS = [
  "¿Sientes una chispa brillante en los costados de la lengua como de naranja? Eso es acidez cítrica viva.",
  "¿Notas una sensación sedosa y envolvente al deslizar el café? El slider de cuerpo te pide subir a 'Denso'.",
  "¿Se percibe una dulzura profunda y redonda como de aguapanela con limón? Marca Panela en la categoría Dulce.",
  "¿Percibes un aroma etéreo que recuerda a flores blancas o jardín primaveral? Explora la sección Floral (Jazmín / Azahar).",
  "Al enfriarse la taza unos minutos, los sabores se vuelven más nítidos. ¡Pruébalo ahora!",
  "El método influye mucho: Chemex resalta la claridad floral, mientras que Prensa Francesa magnifica el cuerpo achocolatado.",
  "En cafés lavados colombianos, la fruta fresca y las notas florales brillan con pureza cristalina.",
];

/**
 * Catálogo canónico de cafés de especialidad de Varietale sincronizado con www.varietale.com.
 * Utilizado como fallback offline inmediato y actualizado automáticamente en segundo plano.
 */
export const VARIETALE_SAMPLE_COFFEES: CoffeeInfo[] = [
  {
    coffeeName: "Palermo",
    brand: "VARIETALE",
    origin: "Palermo, Huila",
    variety: "Castillo y Borbón",
    process: "Lavado Tradicional",
    altitude: "900 msnm",
    description: "Una magnífica selección de granos de Palermo, Huila. Perfil de aroma dulce, sabor a miel y limón, acidez brillante y cuerpo sedoso.",
    suggestedMacro: "Dulce",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/Palermo300.jpg?v=1775249823",
    productType: "Café Especial",
    url: "https://varietale.com/products/palermo",
    handle: "palermo",
    available: true,
  },
  {
    coffeeName: "Las Hortensias",
    brand: "VARIETALE",
    origin: "Pinchote, Santander",
    variety: "Castillo Rojo",
    process: "Lavado Tradicional",
    altitude: "1.600 msnm",
    description: "Primer café 100% orgánico con certificación CERES de Varietale, cultivado en Pinchote, Santander por Juan Pablo García.",
    suggestedMacro: "Tostado",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/LAS_HORTENSIAS_500g.jpg?v=1773834051",
    productType: "Edición Limitada (Orgánico)",
    url: "https://varietale.com/products/las-hortensias",
    handle: "las-hortensias",
    available: true,
  },
  {
    coffeeName: "Bourbon Papayo",
    brand: "VARIETALE",
    origin: "Acevedo, Huila",
    variety: "Borbón Papayo",
    process: "Natural (88 pts SCA)",
    altitude: "1.750 msnm",
    description: "Proveniente de Acevedo, Huila. Proceso natural con 88 puntos SCA que potencia una explosión aromática frutal única.",
    suggestedMacro: "Frutal",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/BourbonPapayo300gWEB.jpg?v=1783963225",
    productType: "Café Exótico",
    url: "https://varietale.com/products/borbon-papayo",
    handle: "borbon-papayo",
    available: true,
  },
  {
    coffeeName: "Mezcla de la Casa",
    brand: "VARIETALE",
    origin: "Colombia (Huila, Cundinamarca y Tolima)",
    variety: "Castillo, Caturra y Colombia",
    process: "Lavado Tradicional",
    altitude: "1.750 msnm",
    description: "Deliciosa combinación de las variedades Castillo, Caturra y Colombia con aroma a cacao, cuerpo cremoso, caramelo y frutas.",
    suggestedMacro: "Dulce",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/ETIQUETAMEZCLADELACASA300g.jpg?v=1757358960",
    productType: "Café Especial",
    url: "https://varietale.com/products/mezcla-de-la-casa",
    handle: "mezcla-de-la-casa",
    available: true,
  },
  {
    coffeeName: "San Antonio",
    brand: "VARIETALE",
    origin: "Bituima, Cundinamarca",
    variety: "Castillo",
    process: "Lavado Tradicional",
    altitude: "1.650 msnm",
    description: "Café Exótico del centro del país con notas de avellanas, melado, lima y especias dulces.",
    suggestedMacro: "Dulce",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/SANANTONIO300gWEB.jpg?v=1784800235",
    productType: "Café Exótico",
    url: "https://varietale.com/products/san-antonio",
    handle: "san-antonio",
    available: true,
  },
  {
    coffeeName: "La Laguna",
    brand: "VARIETALE",
    origin: "La Laguna, Huila",
    variety: "Castillo",
    process: "Semilavado",
    altitude: "1.700 msnm",
    description: "Proceso semilavado en finca que resalta su pureza y balance con notas de fruta madura, almendras y fondo vinoso.",
    suggestedMacro: "Frutal",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/LA_LAGUNA_2025_300G.jpg?v=1755212494",
    productType: "Edición Limitada",
    url: "https://varietale.com/products/la-laguna",
    handle: "la-laguna",
    available: true,
  },
  {
    coffeeName: "San José",
    brand: "VARIETALE",
    origin: "San José de Isnos, Huila",
    variety: "Castillo",
    process: "Lavado Tradicional",
    altitude: "1.650 msnm",
    description: "Beneficio en finca con proceso lavado. Notas dulces de caña y dulce de leche con toque afrutado de arándano y acidez brillante.",
    suggestedMacro: "Dulce",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/SanJose2025.jpg?v=1740936094",
    productType: "Edición Limitada",
    url: "https://varietale.com/products/san-jose",
    handle: "san-jose",
    available: true,
  },
  {
    coffeeName: "Mesetas",
    brand: "VARIETALE",
    origin: "Mesetas, Meta (Comunidad Nasa)",
    variety: "Castillo",
    process: "Semilavado",
    altitude: "1.000 msnm",
    description: "Cultivado a 1.000 msnm por la Comunidad Indígena Nasa con proceso semilavado. Perfil cremoso con notas a fruta seca y limón.",
    suggestedMacro: "Dulce",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/Mesetas_2025.jpg?v=1762534306",
    productType: "Edición Limitada",
    url: "https://varietale.com/products/mesetas",
    handle: "mesetas",
    available: true,
  },
  {
    coffeeName: "Bruselas",
    brand: "VARIETALE",
    origin: "Bruselas, Huila",
    variety: "Caturra",
    process: "Lavado Tradicional",
    altitude: "1.650 msnm",
    description: "Magnífica selección de pequeños productores de Bruselas, Huila. Carácter clásico: dulzura alta, acidez cítrica brillante y cuerpo sedoso.",
    suggestedMacro: "Especias",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/ETIQUETA_BRUSELAS_300g.jpg?v=1788269295",
    productType: "Café Especial",
    url: "https://varietale.com/products/bruselas",
    handle: "bruselas",
    available: true,
  },
  {
    coffeeName: "La Argelia",
    brand: "VARIETALE",
    origin: "Inzá (Tierradentro), Cauca",
    variety: "Caturra",
    process: "Lavado Tradicional",
    altitude: "1.640 msnm",
    description: "Producido por Alejandro Ariza en la finca La Argelia, en Inzá, Cauca. Perfil de sabor a panela, arándano, caña y cuerpo jugoso.",
    suggestedMacro: "Floral",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/LAARGELIAWEB300g_22d7431a-ee93-4744-8efa-0bfbc2a1ca7b.jpg?v=1783962775",
    productType: "Café Especial",
    url: "https://varietale.com/products/la-argelia",
    handle: "la-argelia",
    available: true,
  },
  {
    coffeeName: "Sans (Descafeinado)",
    brand: "VARIETALE",
    origin: "Montañas del Quindío",
    variety: "Castillo y Caturra",
    process: "EA Sugar Cane (Descafeinado)",
    altitude: "1.750 msnm",
    description: "Toda la esencia del café de especialidad sin cafeína mediante descafeinización natural EA Sugar Cane con acetato de caña de azúcar.",
    suggestedMacro: "Dulce",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/SANS_Descafeinado_300g_WEB_v2_copia.jpg?v=1786362626",
    productType: "Café Especial",
    url: "https://varietale.com/products/descafeinado-quindio",
    handle: "descafeinado-quindio",
    available: true,
  },
  {
    coffeeName: "Papayo Enmielado",
    brand: "VARIETALE",
    origin: "Palestina, Huila",
    variety: "Borbón Papayo",
    process: "Red Honey",
    altitude: "1.900 msnm",
    description: "Café Exótico de Palestina, Huila cultivado a 1.900 msnm. Proceso Red Honey con perfil sensorial de lima, notas cítricas y especias.",
    suggestedMacro: "Frutal",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/BourbonPapayo300gWEB.jpg?v=1783963225",
    productType: "Café Exótico",
    url: "https://varietale.com/products/papayo-enmielado",
    handle: "papayo-enmielado",
    available: true,
  },
  {
    coffeeName: "Pitalito",
    brand: "VARIETALE",
    origin: "Pitalito, Huila",
    variety: "Caturra, Colombia y Castillo",
    process: "Lavado Tradicional",
    altitude: "1.500 msnm",
    description: "Producido por Jhohan Becerra en Pitalito, Huila. Mezcla las variedades Caturra, Colombia y Castillo con notas a frutos rojos y chocolate.",
    suggestedMacro: "Frutal",
    imageUrl: "https://cdn.shopify.com/s/files/1/0572/5965/5242/files/Palermo300.jpg?v=1775249823",
    productType: "Café Especial",
    url: "https://varietale.com/products/pitalito",
    handle: "pitalito",
    available: true,
  },
];

export const EMPTY_COFFEE: CoffeeInfo = {
  coffeeName: "",
  brand: "VARIETALE",
  farmName: "",
  farmerName: "",
  country: "Colombia",
  department: "",
  origin: "",
  variety: "",
  process: "",
  altitude: "",
  description: "",
  coffeeForm: "grano",
  grindSize: "media",
};

// ============================================================================
// 5.1 LISTAS MAESTRAS ASISTIDAS PARA REGISTRO MANUAL O DE OTRAS MARCAS
// ============================================================================

export const COFFEE_PRODUCING_COUNTRIES = [
  "Colombia",
  "Etiopía",
  "Kenia",
  "Guatemala",
  "Costa Rica",
  "Panamá",
  "Brasil",
  "Perú",
  "Honduras",
  "México",
  "El Salvador",
  "Ecuador",
  "Ruanda",
  "Indonesia",
];

export const COLOMBIAN_DEPARTMENTS = [
  "Huila",
  "Cauca",
  "Nariño",
  "Tolima",
  "Antioquia",
  "Quindío",
  "Caldas",
  "Risaralda",
  "Santander",
  "Cundinamarca",
  "Valle del Cauca",
  "Sierra Nevada / Magdalena",
  "Cesar",
  "Boyacá",
  "Meta",
  "Casanare",
  "Norte de Santander",
];

export const COFFEE_MAIN_VARIETIES = [
  "Castillo",
  "Caturra",
  "Borbón (Bourbon)",
  "Borbón Rosado (Pink Bourbon)",
  "Geisha",
  "Typica",
  "Tabi",
  "Chiroso",
  "Maragogipe",
  "Cenicafé 1",
  "Colombia",
  "Pacamara",
  "SL28",
  "Wush Wush",
  "Catuaí",
];

export const COFFEE_MAIN_PROCESSES = [
  "Lavado",
  "Natural",
  "Honey",
  "Semilavado",
  "Anaeróbico",
  "Fermentación Extendida",
  "Maceración Carbónica",
  "Koji",
  "Descafeinado (EA Sugar Cane)",
];

// Every new user starts with 0 tastings (no fake or pre-seeded tastings)
export const INITIAL_TASTINGS: TastingRecord[] = [];

// ============================================================================
// 6. CÁLCULO ALGORÍTMICO DEL PERFIL SENSORIAL SCA (GRÁFICO DE RADAR)
// ============================================================================

/**
 * Calcula el perfil sensorial multidimensional oficial SCA (9 ejes + cuerpo, acidez, balance)
 * de forma unificada para toda la aplicación.
 *
 * - Si no hay notas seleccionadas, todos los ejes inician limpiamente en 0%.
 * - Cada descriptor aporta su intensidad (1-5) a su macro-familia.
 * - El cuerpo se escala a partir del nivel táctil (1=35%, 2=65%, 3=95%).
 * - La acidez viva se calcula de forma orgánica a partir de notas frutales, cítricas y florales.
 * - El balance armónico evalúa la coherencia de la taza según variedad y distribución.
 */
export function computeSensorySpiderProfile(
  flavors: FlavorSelection[],
  bodyLevel: BodyLevel
): SensorySpiderProfile {
  // Si no se han seleccionado notas de sabor todavía, todo inicia limpiamente en 0%
  if (!flavors || flavors.length === 0) {
    return {
      floral: 0,
      frutal: 0,
      acido: 0,
      verde: 0,
      otros: 0,
      tostado: 0,
      especias: 0,
      nueces: 0,
      dulce: 0,
      cuerpo: 0,
      acidez: 0,
      balance: 0,
    };
  }

  const macroWeights: Record<string, number> = {
    Floral: 0,
    Frutal: 0,
    "Ácido / fermentado": 0,
    "Verde / vegetal": 0,
    Otros: 0,
    Tostado: 0,
    Especias: 0,
    "Frutos secos / cacao": 0,
    Dulce: 0,
  };

  flavors.forEach((f) => {
    const norm = normalizeMacro(f.macro);
    macroWeights[norm] = (macroWeights[norm] || 0) + f.intensity;
  });

  const scale = (val: number) => (val > 0 ? Math.min(100, Math.round(val * 16)) : 0);

  const floralScore = scale(macroWeights.Floral || 0);
  const frutalScore = scale(macroWeights.Frutal || 0);
  const acidoScore = scale(macroWeights["Ácido / fermentado"] || 0);
  const verdeScore = scale(macroWeights["Verde / vegetal"] || 0);
  const otrosScore = scale(macroWeights.Otros || 0);
  const tostadoScore = scale(macroWeights.Tostado || 0);
  const especiasScore = scale(macroWeights.Especias || 0);
  const nuecesScore = scale(macroWeights["Frutos secos / cacao"] || 0);
  const dulceScore = scale(macroWeights.Dulce || 0);

  // El cuerpo se activa al seleccionar notas y configurar el nivel de cuerpo
  const cuerpoScore = bodyLevel === 1 ? 35 : bodyLevel === 2 ? 65 : 95;

  // Acidez computada de manera proporcional a partir de notas frutales, ácidas y florales
  const acidityDrivers = frutalScore * 0.45 + acidoScore * 0.45 + floralScore * 0.1;
  const acidezScore = acidityDrivers > 0
    ? Math.min(95, Math.max(20, Math.round(acidityDrivers + 15)))
    : 0;

  const activeScores = [
    floralScore,
    frutalScore,
    acidoScore,
    verdeScore,
    otrosScore,
    tostadoScore,
    especiasScore,
    nuecesScore,
    dulceScore,
  ].filter((s) => s > 0);

  const avg = activeScores.length
    ? activeScores.reduce((a, b) => a + b, 0) / activeScores.length
    : 0;

  const varietyBonus = Math.min(20, activeScores.length * 5);
  const balanceScore = activeScores.length > 0
    ? Math.min(95, Math.max(30, Math.round(avg * 0.6 + 20 + varietyBonus)))
    : 0;

  return {
    floral: floralScore,
    frutal: frutalScore,
    acido: acidoScore,
    verde: verdeScore,
    otros: otrosScore,
    tostado: tostadoScore,
    especias: especiasScore,
    nueces: nuecesScore,
    dulce: dulceScore,
    cuerpo: cuerpoScore,
    acidez: acidezScore,
    balance: balanceScore,
  };
}
