/**
 * ============================================================================
 * SERVIDOR BACKEND PRINCIPAL - BITÁCORA DE CATACIÓN VARIETALE
 * ============================================================================
 * Servidor Express con middleware de desarrollo Vite y rutas API para:
 * 1. Health check de la aplicación.
 * 2. Reconocimiento óptico de caracteres (OCR) de bolsas de café con Google GenAI.
 * 3. Sincronización en tiempo real con el catálogo oficial de cafés de www.varietale.com.
 */

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ============================================================================
// 1. INICIALIZACIÓN DEL CLIENTE GEMINI AI
// ============================================================================

let aiClient: GoogleGenAI | null = null;

/**
 * Obtiene o instancia el cliente Google GenAI si la API Key está configurada.
 */
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.warn("Fallo al inicializar cliente GoogleGenAI:", e);
    }
  }
  return aiClient;
}

// ============================================================================
// 2. CONFIGURACIÓN DEL SERVIDOR EXPRESS Y RUTAS API
// ============================================================================

async function startServer(): Promise<void> {
  const app = express();
  const PORT = 3000;

  // Límite amplio para recibir fotos de bolsas en base64 de alta resolución
  app.use(express.json({ limit: "15mb" }));

  // --------------------------------------------------------------------------
  // RUTA: Verificación de estado del servidor
  // --------------------------------------------------------------------------
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --------------------------------------------------------------------------
  // RUTA: OCR inteligente de bolsas o etiquetas de café
  // Analiza la imagen estrictamente sin inventar datos no visibles
  // --------------------------------------------------------------------------
  app.post("/api/ocr-bag", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: "No se proporcionó imagen de la bolsa.",
        });
      }

      const ai = getAi();
      if (!ai) {
        return res.status(503).json({
          success: false,
          error: "Servicio de análisis de imagen no configurado temporalmente.",
        });
      }

      // Normaliza la cadena base64 removiendo prefijos Data URL
      const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;
      const detectedMime = mimeType || "image/jpeg";

      const prompt = `Analiza con precisión esta fotografía de la bolsa o etiqueta de café.
Extrae ÚNICAMENTE la información que esté claramente legible y visible en la foto.
Devuelve un objeto JSON con exactamente las siguientes propiedades:
- coffeeName: nombre del café, marca o lote visible. Si no es legible, dejar como "".
- origin: origen, municipio, departamento o país visible. Si no aparece, dejar como "".
- variety: variedad botánica de café explícita (ej: "Geisha", "Castillo", "Caturra", etc.). Si no aparece, dejar como "".
- process: método de beneficio explícito (ej: "Lavado", "Honey", "Natural", etc.). Si no aparece, dejar como "".
- altitude: altura sobre el nivel del mar si aparece en la etiqueta. Si no aparece, dejar como "".
- description: breve texto descriptivo impreso en la bolsa si aparece. Si no aparece, dejar como "".
- suggestedMacro: categoría dominante si es evidente ("Frutal", "Dulce", "Tostado", "Floral"), o "".

REGLAS CRÍTICAS:
1. NO INVENTES CAFÉS NI DATOS FICTICIOS.
2. Si un campo no está explícitamente escrito en la foto, déjalo como cadena vacía "".
3. NO completes información que no esté en la imagen.
4. Devuelve ÚNICAMENTE un objeto JSON válido, sin explicaciones ni markdown.`;

      // Estrategia de multi-modelo: primero gemini-3.1-flash-lite, luego gemini-3.8-flash de respaldo
      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
      let responseText = "{}";
      let usedModel = "";

      for (const model of candidateModels) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout de 8s en modelo ${model}`)), 8000)
          );

          const generatePromise = ai.models.generateContent({
            model,
            contents: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);
          if (response && response.text) {
            responseText = response.text;
            usedModel = model;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Intento OCR con ${model} falló o expiró:`, modelErr?.message || modelErr);
        }
      }

      // Parseo seguro del JSON
      let parsedData: Record<string, unknown> = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      }

      const result = {
        coffeeName: typeof parsedData.coffeeName === "string" ? parsedData.coffeeName.trim() : "",
        origin: typeof parsedData.origin === "string" ? parsedData.origin.trim() : "",
        variety: typeof parsedData.variety === "string" ? parsedData.variety.trim() : "",
        process: typeof parsedData.process === "string" ? parsedData.process.trim() : "",
        altitude: typeof parsedData.altitude === "string" ? parsedData.altitude.trim() : "",
        description: typeof parsedData.description === "string" ? parsedData.description.trim() : "",
        suggestedMacro: typeof parsedData.suggestedMacro === "string" ? parsedData.suggestedMacro.trim() : "",
      };

      return res.json({ success: true, data: result, source: `gemini-ocr-${usedModel}` });
    } catch (err: any) {
      console.error("Error en /api/ocr-bag:", err);
      return res.status(500).json({
        success: false,
        error: "No se pudo leer la información de la bolsa.",
        errorMsg: err.message,
      });
    }
  });

  // --------------------------------------------------------------------------
  // SINCRONIZACIÓN EN VIVO CON EL CATÁLOGO OFICIAL DE WWW.VARIETALE.COM
  // --------------------------------------------------------------------------
  interface SyncedCoffee {
    coffeeName: string;
    origin: string;
    variety: string;
    process: string;
    altitude: string;
    description: string;
    suggestedMacro: string;
    imageUrl: string;
    productType: string;
    price?: string;
    url: string;
    handle: string;
    available: boolean;
  }

  let cachedCoffees: SyncedCoffee[] | null = null;
  let lastFetchTime = 0;
  const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos de caché para catálogo siempre fresco

  async function fetchLiveCoffeesFromVarietale(): Promise<SyncedCoffee[]> {
    let rawProducts: any[] = [];

    // Intento 1: Colección oficial 'cafes'
    try {
      const colRes = await fetch("https://varietale.com/collections/cafes/products.json?limit=250", {
        headers: {
          "User-Agent": "VarietaleBitacoraApp/1.0",
          Accept: "application/json",
        },
      });
      if (colRes.ok) {
        const colData: any = await colRes.json();
        if (Array.isArray(colData.products) && colData.products.length > 0) {
          rawProducts = colData.products;
        }
      }
    } catch (err) {
      console.warn("Fallo al obtener /collections/cafes, usando fallback:", err);
    }

    // Intento 2: Endpoint general de productos si la colección estaba vacía
    if (rawProducts.length === 0) {
      const allRes = await fetch("https://varietale.com/products.json?limit=250", {
        headers: {
          "User-Agent": "VarietaleBitacoraApp/1.0",
          Accept: "application/json",
        },
      });
      if (allRes.ok) {
        const allData: any = await allRes.json();
        rawProducts = allData.products || [];
      }
    }

    // Filtra exclusivamente cafés de especialidad (descarta tés, tazas, prensas, molinos)
    const coffees: SyncedCoffee[] = rawProducts
      .filter((p: any) => {
        const type = (p.product_type || "").toLowerCase();
        const text = (p.title + " " + type + " " + (p.tags || []).join(" ")).toLowerCase();
        if (
          type.includes("té") ||
          type.includes("rooibos") ||
          type.includes("tisana") ||
          type.includes("pu-erh") ||
          text.includes("té negro") ||
          text.includes("té verde") ||
          text.includes("taza") ||
          text.includes("prensa") ||
          text.includes("molino") ||
          text.includes("filtro")
        ) {
          return false;
        }
        return (
          type.includes("café") ||
          text.includes("café especial") ||
          text.includes("café exótico") ||
          text.includes("café edición") ||
          text.includes("café de especialidad") ||
          (p.tags || []).some((t: string) => t.toLowerCase() === "café" || t.toLowerCase() === "cafes")
        );
      })
      .map((p: any) => {
        const text = (p.body_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const tags: string[] = p.tags || [];

        // Análisis de departamento y municipio de origen en Colombia
        const depts = ["Cauca", "Huila", "Tolima", "Antioquia", "Cundinamarca", "Santander", "Nariño", "Quindío", "Meta", "Caldas"];
        const foundDept = depts.find((d) => tags.some((t) => t.toLowerCase() === d.toLowerCase()) || text.includes(d));
        const muni = tags.find((t) => !depts.includes(t) && !["café", "Especiales", "Exótico", "Edición Limitada", "Lote", "Grano", "cafés"].includes(t));
        const origin = foundDept ? (muni ? `${muni}, ${foundDept}` : foundDept) : "Colombia";

        // Variedad botánica
        let variety = "Arábica Especial";
        const lowerText = (p.title + " " + text).toLowerCase();
        if (lowerText.includes("borbón papayo") || lowerText.includes("bourbon papayo")) variety = "Borbón Papayo";
        else if (lowerText.includes("caturra chiroso") || lowerText.includes("chiroso")) variety = "Caturra Chiroso";
        else if (lowerText.includes("caturra")) variety = "Caturra";
        else if (lowerText.includes("castillo")) variety = "Castillo";
        else if (lowerText.includes("geisha")) variety = "Geisha";
        else if (lowerText.includes("borbón") || lowerText.includes("bourbon")) variety = "Borbón";

        // Proceso de beneficio
        let process = "Lavado";
        if (lowerText.includes("semilavado")) process = "Semilavado";
        else if (lowerText.includes("lavado anaeróbico") || lowerText.includes("anaeróbico")) process = "Lavado Anaeróbico";
        else if (lowerText.includes("honey dorado") || lowerText.includes("honey")) process = "Honey Dorado";
        else if (lowerText.includes("natural")) process = "Natural";
        else if (lowerText.includes("ea sugar cane") || lowerText.includes("descafein")) process = "EA Sugar Cane (Descafeinado)";

        // Macro-perfil sugerido según notas organolépticas
        let suggestedMacro = "Frutal";
        if (lowerText.includes("jazmín") || lowerText.includes("floral") || lowerText.includes("té blanco") || lowerText.includes("flor de café")) {
          suggestedMacro = "Floral";
        } else if (lowerText.includes("chocolate") || lowerText.includes("cacao") || lowerText.includes("caramelo") || lowerText.includes("panela") || lowerText.includes("dulce")) {
          suggestedMacro = "Dulce";
        } else if (lowerText.includes("especias") || lowerText.includes("especiado") || lowerText.includes("cardamomo") || lowerText.includes("canela")) {
          suggestedMacro = "Especias";
        } else if (lowerText.includes("tostado") || lowerText.includes("frutos secos") || lowerText.includes("avellana")) {
          suggestedMacro = "Tostado";
        }

        const altMatch = text.match(/\d{3,4}\s*msnm/i);
        const altitude = altMatch ? altMatch[0] : "1.750 msnm";

        const priceNum = p.variants?.[0]?.price ? Number(p.variants[0].price) : undefined;
        const price = priceNum ? `$${priceNum.toLocaleString("es-CO")}` : undefined;
        const available = p.variants?.some((v: any) => v.available !== false) ?? true;

        return {
          coffeeName: p.title,
          origin,
          variety,
          process,
          altitude,
          description: text.slice(0, 160) + (text.length > 160 ? "..." : ""),
          suggestedMacro,
          imageUrl: p.images?.[0]?.src || "",
          productType: p.product_type || "Café Especial",
          price,
          url: `https://varietale.com/products/${p.handle}`,
          handle: p.handle,
          available,
        };
      });

    return coffees;
  }

  // Pre-carga inicial al arrancar el servidor
  fetchLiveCoffeesFromVarietale()
    .then((c) => {
      if (c && c.length > 0) {
        cachedCoffees = c;
        lastFetchTime = Date.now();
        console.log(`[Varietale Sync] Inicializado con ${c.length} cafés de www.varietale.com`);
      }
    })
    .catch((err) => console.warn("[Varietale Sync] Error en pre-carga inicial:", err));

  // Actualización automática en segundo plano cada 4 minutos
  setInterval(async () => {
    try {
      const c = await fetchLiveCoffeesFromVarietale();
      if (c && c.length > 0) {
        cachedCoffees = c;
        lastFetchTime = Date.now();
        console.log(`[Varietale Sync] Auto-sincronización exitosa (${c.length} cafés actualizados).`);
      }
    } catch (e) {
      console.warn("[Varietale Sync] Error en auto-sincronización periódica:", e);
    }
  }, 4 * 60 * 1000);

  // Endpoint: Catálogo de cafés en vivo
  app.get("/api/varietale-coffees", async (req: Request, res: Response) => {
    const forceRefresh = req.query.refresh === "true";
    const now = Date.now();

    if (!forceRefresh && cachedCoffees && now - lastFetchTime < CACHE_TTL_MS) {
      return res.json({
        success: true,
        coffees: cachedCoffees,
        source: "cache",
        updatedAt: new Date(lastFetchTime).toISOString(),
      });
    }

    try {
      const coffees = await fetchLiveCoffeesFromVarietale();
      if (coffees && coffees.length > 0) {
        cachedCoffees = coffees;
        lastFetchTime = now;
      }
      return res.json({
        success: true,
        coffees: cachedCoffees || coffees,
        source: "live",
        updatedAt: new Date(now).toISOString(),
      });
    } catch (err: any) {
      console.error("Error obteniendo cafés en vivo de varietale.com:", err);
      return res.json({
        success: true,
        coffees: cachedCoffees || [],
        source: "fallback",
        error: err.message,
      });
    }
  });

  // Endpoint rápido del catálogo preconfigurado
  app.get("/api/varietale-catalog", (_req: Request, res: Response) => {
    res.json({ success: true, data: cachedCoffees || [] });
  });

  // --------------------------------------------------------------------------
  // INTEGRACIÓN CON VITE (DEV) Y ARCHIVOS ESTÁTICOS (PRODUCCIÓN)
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --------------------------------------------------------------------------
  // ARRANQUE DEL SERVIDOR
  // --------------------------------------------------------------------------
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bitácora Varietale running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
