/**
 * ============================================================================
 * BITÁCORA DE CATACIÓN VARIETALE - GESTIÓN Y ALMACENAMIENTO DE CUENTAS
 * ============================================================================
 * Este módulo gestiona de forma segura el almacenamiento local de cuentas
 * registradas, credenciales, PINs de seguridad, preferencias y sesiones.
 * Incluye funciones para recuperar contraseñas mediante PIN o preguntas de
 * seguridad, y para extraer nombres amigables de correos de Google.
 */

import { UserProfile } from "../types";

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
