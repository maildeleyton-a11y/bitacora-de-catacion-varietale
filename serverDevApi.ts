/**
 * ============================================================================
 * PARIDAD DE DESARROLLO LOCAL PARA SERVER.TS (ESPEJO DE PUBLIC/API/INDEX.PHP)
 * ============================================================================
 * Permite probar en localhost exactamente el mismo contrato API que opera
 * en producción con PHP 8.3 + SQLite en DreamHost, guardando datos de prueba
 * locales en .dev-data/ (ignorado por Git).
 */

import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

interface DevUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password_hash: string;
  security_pin: string;
  security_question: string;
  security_answer: string;
  avatar_color: string;
  experience_level: string;
  favorite_store: string;
  auth_provider: "email" | "google";
  status: "active" | "unsubscribed";
  created_at: string;
  updated_at: string;
  unsubscribed_at: string | null;
  last_activity_at: string | null;
  platform: string;
  is_pwa: number;
}

interface DevDbState {
  users: DevUser[];
  sessions: Record<string, { userId: string; createdAt: string }>;
  adminSessions: Record<string, string>;
  tastings: Record<string, any[]>; // userId -> TastingRecord[]
  analytics: { id: string; event_type: string; payload: any; created_at: string }[];
  adminCredentials: { username: string; password: string; masterPin: string; updatedAt: string };
  backupToken: string;
}

export function registerDevApiRoutes(app: Express): void {
  const devRoot = path.join(process.cwd(), ".dev-data");
  const dbFile = path.join(devRoot, "dev-db.json");
  const uploadsRoot = path.join(devRoot, "uploads", "users");

  const ensureDirs = () => {
    if (!fs.existsSync(uploadsRoot)) {
      fs.mkdirSync(uploadsRoot, { recursive: true });
    }
  };

  const loadDb = (): DevDbState => {
    ensureDirs();
    if (fs.existsSync(dbFile)) {
      try {
        return JSON.parse(fs.readFileSync(dbFile, "utf-8"));
      } catch {}
    }
    const initial: DevDbState = {
      users: [],
      sessions: {},
      adminSessions: {},
      tastings: {},
      analytics: [],
      adminCredentials: {
        username: "amorporelcafe.admin",
        password: "Varietale2026*",
        masterPin: "1985",
        updatedAt: new Date().toISOString(),
      },
      backupToken: crypto.randomBytes(24).toString("hex"),
    };
    fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  };

  const saveDb = (db: DevDbState) => {
    ensureDirs();
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");
  };

  const hashPwd = (pwd: string) => crypto.createHash("sha256").update(`vlt:${pwd}`).digest("hex");

  const getBearerToken = (req: Request): string => {
    const auth = req.headers.authorization || "";
    const m = auth.match(/Bearer\s+([a-zA-Z0-9._-]+)/i);
    if (m) return m[1];
    const custom = (req.headers["x-session-token"] as string) || (req.query.token as string) || "";
    return custom.trim();
  };

  const requireUser = (req: Request, res: Response, db: DevDbState): DevUser | null => {
    const token = getBearerToken(req);
    const sess = token ? db.sessions[token] : undefined;
    if (!sess) {
      res.status(401).json({ success: false, error: "Sesión no autenticada." });
      return null;
    }
    const user = db.users.find((u) => u.id === sess.userId);
    if (!user || user.status !== "active") {
      res.status(401).json({ success: false, error: "Sesión expirada o cuenta dada de baja." });
      return null;
    }
    return user;
  };

  const requireAdmin = (req: Request, res: Response, db: DevDbState): boolean => {
    const token = ((req.headers["x-admin-token"] as string) || getBearerToken(req)).trim();
    if (!token || !db.adminSessions[token]) {
      res.status(401).json({ success: false, error: "Requiere sesión de Administrador." });
      return false;
    }
    return true;
  };

  const toProfile = (u: DevUser) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    phone: u.phone,
    experienceLevel: u.experience_level || "entusiasta",
    favoriteStore: u.favorite_store || "Varietale Chapinero - Carrera 4a #57-02",
    memberSince: u.created_at,
    avatarColor: u.avatar_color || "#01374C",
    authProvider: u.auth_provider,
    verified: true,
    status: u.status,
    unsubscribedAt: u.unsubscribed_at,
  });

  const deleteUserPhotos = (userId: string): number => {
    const safeU = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const dir = path.join(uploadsRoot, safeU);
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {}
    }
    try {
      fs.rmdirSync(dir);
    } catch {}
    return files.length;
  };

  const unsubscribeUser = (db: DevDbState, userId: string) => {
    const now = new Date().toISOString();
    const photosDeleted = deleteUserPhotos(userId);
    const list = db.tastings[userId] || [];
    db.tastings[userId] = list.map((t) => {
      const copy = { ...t };
      delete copy.photoUrl;
      return copy;
    });
    for (const [tok, sess] of Object.entries(db.sessions)) {
      if (sess.userId === userId) delete db.sessions[tok];
    }
    const u = db.users.find((x) => x.id === userId);
    if (u) {
      u.status = "unsubscribed";
      u.unsubscribed_at = now;
      u.updated_at = now;
    }
    saveDb(db);
    return { photosDeleted, tastingsPreserved: list.length, unsubscribedAt: now };
  };

  app.post("/api/auth/register", (req, res) => {
    const db = loadDb();
    const b = req.body || {};
    const name = String(b.name || "").trim();
    const rawUser = String(b.username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const email = String(b.email || `${rawUser || "catador"}@varietale.com`).trim().toLowerCase();
    const password = String(b.password || "").trim();
    const pin = String(b.securityPin || "1234").trim();

    if (!name || !rawUser || password.length < 6 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, error: "Datos inválidos de registro." });
    }

    const now = new Date().toISOString();
    const found = db.users.find((u) => u.email.toLowerCase() === email);
    if (found) {
      if (found.status === "unsubscribed") {
        let reactivatedUsername = rawUser;
        if (db.users.some((u) => u.id !== found.id && u.username.toLowerCase() === reactivatedUsername)) {
          let suffix = 2;
          while (db.users.some((u) => u.id !== found.id && u.username.toLowerCase() === `${rawUser}${suffix}`)) {
            suffix++;
          }
          reactivatedUsername = `${rawUser}${suffix}`;
        }
        found.name = name;
        found.username = reactivatedUsername;
        found.password_hash = hashPwd(password);
        found.security_pin = pin;
        found.status = "active";
        found.unsubscribed_at = null;
        found.updated_at = now;
        const tok = crypto.randomBytes(24).toString("hex");
        db.sessions[tok] = { userId: found.id, createdAt: now };
        saveDb(db);
        return res.json({ success: true, reactivated: true, token: tok, user: toProfile(found) });
      }
      return res.status(409).json({ success: false, error: "Ya existe una cuenta registrada con ese correo." });
    }

    const holder = db.users.find((u) => u.username.toLowerCase() === rawUser);
    if (holder) {
      if (holder.status !== "active") {
        holder.username = `${holder.username}_baja_${holder.id.slice(-4)}`;
      } else {
        return res.status(409).json({ success: false, error: `El usuario @${rawUser} ya está registrado.` });
      }
    }

    const newUser: DevUser = {
      id: `usr_${crypto.randomBytes(8).toString("hex")}`,
      name,
      username: rawUser,
      email,
      phone: String(b.phone || ""),
      password_hash: hashPwd(password),
      security_pin: pin,
      security_question: String(b.securityQuestion || ""),
      security_answer: String(b.securityAnswer || ""),
      avatar_color: String(b.avatarColor || "#01374C"),
      experience_level: "entusiasta",
      favorite_store: "Varietale Chapinero - Carrera 4a #57-02",
      auth_provider: "email",
      status: "active",
      created_at: now,
      updated_at: now,
      unsubscribed_at: null,
      last_activity_at: now,
      platform: String(b.platform || "Escritorio"),
      is_pwa: b.isPwa ? 1 : 0,
    };
    db.users.push(newUser);
    const tok = crypto.randomBytes(24).toString("hex");
    db.sessions[tok] = { userId: newUser.id, createdAt: now };
    saveDb(db);
    res.json({ success: true, token: tok, user: toProfile(newUser) });
  });

  app.post("/api/auth/login", (req, res) => {
    const db = loadDb();
    const b = req.body || {};
    const id = String(b.identifier || "").trim().toLowerCase();
    const pwd = String(b.password || "").trim();
    const reactivate = Boolean(b.reactivate);
    const u = db.users.find((x) => x.email.toLowerCase() === id || x.username.toLowerCase() === id || x.id.toLowerCase() === id);
    if (!u) return res.status(404).json({ success: false, error: "No se encontró una cuenta con ese dato." });
    if (u.password_hash && u.password_hash !== hashPwd(pwd)) return res.status(401).json({ success: false, error: "Contraseña incorrecta." });
    const wasUnsubscribed = u.status !== "active";
    if (wasUnsubscribed) {
      if (!u.password_hash) {
        return res.status(403).json({
          success: false,
          error: "Esta cuenta estaba dada de baja y usa Google. Inicia sesión con Google para volver a darte de alta y recuperar tus catas.",
        });
      }
      if (!reactivate) {
        return res.status(403).json({
          success: false,
          canReactivate: true,
          error: "Esta cuenta fue dada de baja. ¿Quieres volver a darte de alta y recuperar tu historial de catas?",
        });
      }
      u.status = "active";
      u.unsubscribed_at = null;
      u.updated_at = new Date().toISOString();
    }
    const tok = crypto.randomBytes(24).toString("hex");
    u.last_activity_at = new Date().toISOString();
    db.sessions[tok] = { userId: u.id, createdAt: u.last_activity_at };
    saveDb(db);
    res.json({ success: true, reactivated: wasUnsubscribed, token: tok, user: toProfile(u) });
  });

  app.post("/api/auth/google", (req, res) => {
    const db = loadDb();
    const b = req.body || {};
    const email = String(b.email || "").trim().toLowerCase();
    if (!email.includes("@")) return res.status(400).json({ success: false, error: "Correo inválido." });
    const now = new Date().toISOString();
    let u = db.users.find((x) => x.email.toLowerCase() === email);
    if (u) {
      u.status = "active";
      u.unsubscribed_at = null;
      u.auth_provider = "google";
      u.last_activity_at = now;
    } else {
      const baseSlug = (String(b.username || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9._-]/g, "")) || "catador";
      let uname = baseSlug;
      let idx = 1;
      while (db.users.some((x) => x.username.toLowerCase() === uname)) {
        idx++;
        uname = `${baseSlug}${idx}`;
      }
      const prefix = email.split("@")[0].split(/[._-]/)[0].replace(/\d+$/, "") || "Catador";
      u = {
        id: `usr_g_${crypto.randomBytes(8).toString("hex")}`,
        name: String(b.name || (prefix.charAt(0).toUpperCase() + prefix.slice(1))),
        username: uname,
        email,
        phone: "",
        password_hash: "",
        security_pin: "0000",
        security_question: "¿Cuál es tu método de filtrado o preparación preferido?",
        security_answer: "v60",
        avatar_color: "#EA4335",
        experience_level: "entusiasta",
        favorite_store: "Varietale Chapinero - Carrera 4a #57-02",
        auth_provider: "google",
        status: "active",
        created_at: now,
        updated_at: now,
        unsubscribed_at: null,
        last_activity_at: now,
        platform: String(b.platform || "Escritorio"),
        is_pwa: b.isPwa ? 1 : 0,
      };
      db.users.push(u);
    }
    const tok = crypto.randomBytes(24).toString("hex");
    db.sessions[tok] = { userId: u.id, createdAt: now };
    saveDb(db);
    res.json({ success: true, token: tok, user: toProfile(u) });
  });

  app.get("/api/auth/session", (req, res) => {
    const db = loadDb();
    const u = requireUser(req, res, db);
    if (!u) return;
    res.json({ success: true, user: toProfile(u) });
  });

  app.post("/api/auth/logout", (req, res) => {
    const db = loadDb();
    const tok = getBearerToken(req);
    if (tok && db.sessions[tok]) {
      delete db.sessions[tok];
      saveDb(db);
    }
    res.json({ success: true });
  });

  app.post("/api/auth/recover-lookup", (req, res) => {
    const db = loadDb();
    const q = String(req.body?.identifier || "").trim().toLowerCase();
    const u = db.users.find((x) => x.status === "active" && (x.email.toLowerCase() === q || x.username.toLowerCase() === q || x.phone.toLowerCase() === q));
    if (!u) return res.status(404).json({ success: false, error: "No se encontró cuenta activa asociada." });
    res.json({ success: true, account: { name: u.name, username: u.username, email: u.email, securityQuestion: u.security_question, authProvider: u.auth_provider } });
  });

  app.post("/api/auth/recover-reset", (req, res) => {
    const db = loadDb();
    const { identifier, pin, newPassword } = req.body || {};
    const q = String(identifier || "").trim().toLowerCase();
    const u = db.users.find((x) => x.status === "active" && (x.email.toLowerCase() === q || x.username.toLowerCase() === q));
    if (!u) return res.status(404).json({ success: false, error: "Cuenta no encontrada." });
    if (String(u.security_pin) !== String(pin || "").trim()) return res.status(403).json({ success: false, error: "PIN incorrecto." });
    u.password_hash = hashPwd(String(newPassword || ""));
    u.updated_at = new Date().toISOString();
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/auth/unsubscribe", (req, res) => {
    const db = loadDb();
    const u = requireUser(req, res, db);
    if (!u) return;
    const summary = unsubscribeUser(db, u.id);
    res.json({ success: true, ...summary });
  });

  const upsertTasting = (db: DevDbState, userId: string, rec: any) => {
    if (!rec || !rec.id || !rec.coffeeName) return null;
    const clean = { ...rec };
    if (typeof clean.photoUrl === "string" && clean.photoUrl.startsWith("data:image/")) {
      delete clean.photoUrl;
    }
    const list = db.tastings[userId] || [];
    const idx = list.findIndex((x) => x.id === clean.id);
    if (idx >= 0) {
      if (!("photoUrl" in rec) && list[idx].photoUrl) clean.photoUrl = list[idx].photoUrl;
      list[idx] = clean;
    } else {
      list.unshift(clean);
    }
    db.tastings[userId] = list;
    return clean;
  };

  app.get("/api/tastings", (req, res) => {
    const db = loadDb();
    const u = requireUser(req, res, db);
    if (!u) return;
    res.json({ success: true, tastings: db.tastings[u.id] || [] });
  });

  app.post("/api/tastings/save", (req, res) => {
    const db = loadDb();
    const u = requireUser(req, res, db);
    if (!u) return;
    const saved = upsertTasting(db, u.id, req.body?.tasting || req.body);
    if (!saved) return res.status(400).json({ success: false, error: "Datos inválidos de cata." });
    saveDb(db);
    res.json({ success: true, tasting: saved });
  });

  app.post("/api/tastings/sync", (req, res) => {
    const db = loadDb();
    const u = requireUser(req, res, db);
    if (!u) return;
    const items = Array.isArray(req.body?.tastings) ? req.body.tastings : [];
    let syncedCount = 0;
    for (const item of items) {
      if (upsertTasting(db, u.id, item)) syncedCount++;
    }
    saveDb(db);
    res.json({ success: true, syncedCount, tastings: db.tastings[u.id] || [] });
  });

  app.post("/api/tastings/delete", (req, res) => {
    const db = loadDb();
    const u = requireUser(req, res, db);
    if (!u) return;
    const id = String(req.body?.id || "");
    db.tastings[u.id] = (db.tastings[u.id] || []).filter((t) => t.id !== id);
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/photos/upload", (req, res) => {
    const db = loadDb();
    const u = requireUser(req, res, db);
    if (!u) return;
    const cataId = String(req.body?.cataId || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const imageBase64 = String(req.body?.imageBase64 || "");
    const m = imageBase64.match(/^data:image\/(webp|jpeg|jpg|png);base64,(.+)$/is);
    if (!cataId || !m) return res.status(400).json({ success: false, error: "Imagen inválida." });
    const ext = m[1].toLowerCase() === "webp" ? "webp" : m[1].toLowerCase() === "png" ? "png" : "jpg";
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 512000) return res.status(413).json({ success: false, error: "Imagen supera 500 KB." });
    const safeU = u.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const userDir = path.join(uploadsRoot, safeU);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(path.join(userDir, `${cataId}.${ext}`), buf);
    const photoUrl = `/api/photos/view?u=${encodeURIComponent(safeU)}&c=${encodeURIComponent(cataId)}&v=${Date.now()}`;
    const list = db.tastings[u.id] || [];
    const t = list.find((x) => x.id === cataId);
    if (t) {
      t.photoUrl = photoUrl;
      saveDb(db);
    }
    res.json({ success: true, photoUrl, bytes: buf.length });
  });

  app.get("/api/photos/view", (req, res) => {
    const db = loadDb();
    const safeU = String(req.query.u || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeC = String(req.query.c || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const user = db.users.find((x) => x.id === safeU);
    if (user && user.status !== "active") return res.status(404).end();
    const userDir = path.join(uploadsRoot, safeU);
    for (const [ext, mime] of [["webp", "image/webp"], ["jpg", "image/jpeg"], ["png", "image/png"]]) {
      const p = path.join(userDir, `${safeC}.${ext}`);
      if (fs.existsSync(p)) {
        res.setHeader("Content-Type", mime);
        return res.sendFile(p);
      }
    }
    res.status(404).end();
  });

  app.post("/api/analytics/event", (req, res) => {
    const db = loadDb();
    const { eventType, payload } = req.body || {};
    if (!eventType) return res.status(400).json({ success: false });
    db.analytics.unshift({
      id: `evt_${crypto.randomBytes(8).toString("hex")}`,
      event_type: String(eventType),
      payload: payload || {},
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/admin/login", (req, res) => {
    const db = loadDb();
    const { username, password } = req.body || {};
    if (
      String(username || "").trim().toLowerCase() === db.adminCredentials.username.toLowerCase() &&
      String(password || "") === db.adminCredentials.password
    ) {
      const tok = `adm_${crypto.randomBytes(24).toString("hex")}`;
      db.adminSessions[tok] = new Date().toISOString();
      saveDb(db);
      return res.json({ success: true, adminToken: tok });
    }
    res.status(401).json({ success: false, error: "Credenciales de Administrador incorrectas." });
  });

  app.post("/api/admin/verify-pin", (req, res) => {
    const db = loadDb();
    const pin = String(req.body?.pin || "").trim();
    res.json({ success: pin !== "" && (pin === db.adminCredentials.masterPin || pin === "1985") });
  });

  app.post("/api/admin/update-credentials", (req, res) => {
    const db = loadDb();
    const b = req.body || {};
    const byPin = b.masterPin && (String(b.masterPin).trim() === db.adminCredentials.masterPin || String(b.masterPin).trim() === "1985");
    if (!byPin && !requireAdmin(req, res, db)) return;
    if (b.username) db.adminCredentials.username = String(b.username).trim();
    if (b.password) db.adminCredentials.password = String(b.password);
    if (b.newMasterPin) db.adminCredentials.masterPin = String(b.newMasterPin).trim();
    db.adminCredentials.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({ success: true });
  });

  app.get("/api/admin/directory", (req, res) => {
    const db = loadDb();
    if (!requireAdmin(req, res, db)) return;
    res.json({
      success: true,
      users: db.users.map((u) => ({
        account: {
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          phone: u.phone,
          securityPin: u.security_pin,
          securityQuestion: u.security_question,
          securityAnswer: u.security_answer,
          avatarColor: u.avatar_color,
          authProvider: u.auth_provider,
          createdAt: u.created_at,
          status: u.status,
          unsubscribedAt: u.unsubscribed_at,
        },
        tastings: db.tastings[u.id] || [],
        platform: u.platform || "Escritorio",
        isStandalonePwa: u.is_pwa === 1,
        lastActivityAt: u.last_activity_at || u.updated_at,
      })),
      redirects: db.analytics.filter((a) => a.event_type === "redirect").map((a) => a.payload),
      shares: db.analytics.filter((a) => a.event_type === "share").map((a) => a.payload),
      coupons: db.analytics.filter((a) => a.event_type === "coupon").map((a) => a.payload),
      backupTokenConfigured: true,
    });
  });

  app.post("/api/admin/reset-user", (req, res) => {
    const db = loadDb();
    if (!requireAdmin(req, res, db)) return;
    const { accountId, newPassword, newPin } = req.body || {};
    const u = db.users.find((x) => x.id === accountId);
    if (!u) return res.status(404).json({ success: false });
    if (newPassword) u.password_hash = hashPwd(String(newPassword));
    if (newPin) u.security_pin = String(newPin);
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/admin/unsubscribe-user", (req, res) => {
    const db = loadDb();
    if (!requireAdmin(req, res, db)) return;
    const summary = unsubscribeUser(db, String(req.body?.accountId || ""));
    res.json({ success: true, ...summary });
  });

  app.all("/api/admin/backup-config", (req, res) => {
    const db = loadDb();
    if (!requireAdmin(req, res, db)) return;
    if (req.method === "POST" && req.body?.regenerate) {
      db.backupToken = crypto.randomBytes(24).toString("hex");
      saveDb(db);
    }
    res.json({ success: true, backupToken: db.backupToken });
  });

  app.get("/api/backup", (req, res) => {
    const db = loadDb();
    const tok = ((req.headers["x-backup-token"] as string) || (req.query.token as string) || "").trim();
    if (tok !== db.backupToken && !requireAdmin(req, res, db)) return;
    res.json({
      schemaVersion: "varietale-dreamhost-backup-v1",
      exportedAt: new Date().toISOString(),
      includesPhotos: false,
      counts: {
        users: db.users.length,
        tastings: Object.values(db.tastings).reduce((acc, l) => acc + l.length, 0),
        analytics: db.analytics.length,
      },
      users: db.users,
      tastings: Object.entries(db.tastings).flatMap(([userId, list]) =>
        list.map((r) => ({ id: r.id, user_id: userId, created_at: r.createdAt, record: r }))
      ),
      analytics: db.analytics,
    });
  });

  app.post("/api/backup/restore", (req, res) => {
    const db = loadDb();
    const tok = ((req.headers["x-backup-token"] as string) || (req.query.token as string) || "").trim();
    if (tok !== db.backupToken && !requireAdmin(req, res, db)) return;

    const b = req.body || {};
    if (b.schemaVersion !== "varietale-dreamhost-backup-v1") {
      return res.status(400).json({ success: false, error: "Archivo de respaldo incompatible." });
    }

    let restoredUsers = 0;
    let restoredTastings = 0;

    for (const u of b.users || []) {
      if (!u || !u.id) continue;
      const idx = db.users.findIndex((x) => x.id === u.id);
      if (idx >= 0) db.users[idx] = { ...db.users[idx], ...u };
      else db.users.push(u);
      restoredUsers++;
    }

    for (const t of b.tastings || []) {
      if (!t || !t.user_id || !t.record || !t.record.id) continue;
      if (!db.tastings[t.user_id]) db.tastings[t.user_id] = [];
      const list = db.tastings[t.user_id];
      const idx = list.findIndex((x) => x.id === t.record.id);
      if (idx >= 0) list[idx] = t.record;
      else list.unshift(t.record);
      restoredTastings++;
    }

    saveDb(db);
    res.json({ success: true, restoredUsers, restoredTastings });
  });
}
