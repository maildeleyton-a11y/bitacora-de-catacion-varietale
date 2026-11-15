# Guía Oficial de Despliegue y Mantenimiento en DreamHost
## Bitácora de Catación Varietale ("Amor por el Café")

> **Propósito del Documento:** Esta guía documenta con total claridad la arquitectura, configuración en hosting y pasos de actualización para que tanto el equipo técnico de **Mr. Bite** como el equipo de **Varietale** comprendan cómo está instalada la aplicación, dónde residen sus archivos y cómo se gestiona sin interferir con otros servicios.

---

### 1. Resumen de la Arquitectura

```
                        ┌───────────────────────────────────────────────────────────┐
                        │              TU MAC (DESARROLLO LOCAL)                    │
                        │   bun server.ts (localhost:3000)                          │
                        │   Control de Versiones en GitHub (maildeleyton-a11y)      │
                        └─────────────────────────────┬─────────────────────────────┘
                                                      │ Compilación & Despliegue
                                                      ▼
                        ┌───────────────────────────────────────────────────────────┐
                        │           DREAMHOST (HOSTING OFICIAL VARIETALE)           │
                        │   Directorio aislado: /home/usuario/bitacora.varietale.com │
                        │   - No toca WordPress, Shopify ni archivos existentes     │
                        │   - Certificados SSL Gratuitos (HTTPS Let's Encrypt)       │
                        │   - Enrutamiento SPA con .htaccess optimizado              │
                        └──────────────────────┬─────────────┬──────────────────────┘
                                               │             │
                    Subdominio Oficial         │             │   Subdominio Portafolio
                    (DNS en GoDaddy)           │             │   (DNS en Hostinger)
                                               ▼             ▼
                      https://bitacora.varietale.com     https://varietale.mrbite.agency
```

---

### 2. Principio de Aislamiento y Seguridad (Riesgo Cero)

> [!IMPORTANT]
> **Datos Confirmados en Producción (DreamHost):**
> - **Servidor:** VPS Basic `vps31414` (Ashburn, Virginia)
> - **Dirección IP Asignada:** `173.236.200.69`
> - **Usuario del Servidor:** `bitacoravarietale_app`
> - **Ruta Web del Subdominio:** `/home/bitacoravarietale_app/bitacora.varietale.com/`
> - **Versión de PHP:** 8.3
> - **Garantía:** Cero contacto con `/home/.../varietale.com/` (sitio corporativo intacto).

---

### 3. Paso a Paso en el Panel de DreamHost

1. **Iniciar sesión** en [panel.dreamhost.com](https://panel.dreamhost.com).
2. Dirigirse al menú lateral izquierdo: **Websites** > **Manage Websites**.
3. Hacer clic en el botón superior derecho: **Add Website** (o *Add Domain / Subdomain*).
4. Seleccionar la opción para añadir un dominio existente o subdominio:
   - **Domain to add:** `bitacora.varietale.com`
   - **Hosting type:** *Fully Hosted*
   - **Web directory:** DreamHost propondrá automáticamente `/home/usuario/bitacora.varietale.com`. Mantener este nombre para que esté claramente identificado.
5. **Configurar el subdominio de la Agencia (Mr. Bite):**
   - En la misma sección de Websites, puedes añadir `varietale.mrbite.agency` como un **Mirror (Espejo)** que apunte a `bitacora.varietale.com`.
6. **Activar Certificados de Seguridad SSL (HTTPS):**
   - En **Websites** > **Manage Websites**, ubicar `bitacora.varietale.com` y hacer clic en **Security** o **SSL Certificate**.
   - Seleccionar **Let's Encrypt (Gratuito)** y confirmar. Repetir para el alias si aplica.
7. **Obtener la dirección IP del servidor:**
   - En la vista de información del sitio web, anotar la **IP del servidor** (ejemplo: `173.236.xxx.xxx`) o el CNAME asignado por DreamHost. Se usará para los registros DNS.

---

### 4. Paso a Paso en GoDaddy (DNS de `varietale.com`)

1. Iniciar sesión en GoDaddy y entrar al **Administrador de Dominios**.
2. Buscar `varietale.com` y hacer clic en **Administrar DNS** (o *Zona DNS*).
3. Añadir el nuevo registro:
   - **Tipo:** `A`
   - **Nombre:** `bitacora`
   - **Valor / Datos:** `173.236.200.69`
   - **TTL:** 1/2 hora o 1 hora (predeterminado).
4. Guardar cambios.

---

### 5. Configuración DNS de Mr. Bite (cPanel de Hostinger)

1. Iniciar sesión en el **cPanel** de `mrbite.agency` (`cpl16.main-hosting.eu`).
2. Abrir la herramienta **Zone Editor** (Editor de Zona DNS).
3. En la fila de `mrbite.agency`, hacer clic en **`+ A Record`**:
   - **Name:** `bitacora-varietale` (cPanel lo completa a `bitacora-varietale.mrbite.agency.`)
   - **Address (IP):** `173.236.200.69`
   - **TTL:** 14400
4. Guardar cambios.
5. En DreamHost: Subdominio agregado como **Dominio Espejo (Mirror)** hacia `bitacora.varietale.com` con certificado SSL Let's Encrypt.

---

### 6. Subida de Archivos y Futuras Actualizaciones

Cada vez que se desee publicar una nueva versión de la aplicación:

1. **En tu Mac (Terminal local):**
   ```bash
   cd "/Users/andres/Trabajo en Proceso/1 BITÁCORA DE CATACIÓN VARIETALE/GESTIÓN GOOGLE AI STUDIO/bitácora-de-catación-varietale"
   bun --bun run build
   ```
   Esto generará en cuestión de milisegundos la carpeta compilada `dist/` que ya incluye:
   - Todos los componentes y pantallas optimizadas de React.
   - La configuración `.htaccess` para Apache.
   - El archivo descriptivo `LEEME_INFO_BITACORA.txt`.
   - Los iconos PWA y Service Worker.

2. **Subida a DreamHost:**
   - **Opción A (Recomendada y visual):** Abrir el Administrador de Archivos en el panel de DreamHost (o mediante FileZilla / Cyberduck vía SFTP con el usuario de DreamHost) y subir el contenido de la carpeta local `dist/` dentro de `/home/usuario/bitacora.varietale.com/`.
   - **Opción B (Automática por terminal):**
     ```bash
     rsync -avz --delete dist/ usuario@servidor.dreamhost.com:/home/usuario/bitacora.varietale.com/
     ```

---

### 7. Estructura de Carpetas en el Servidor DreamHost

```
/home/usuario/
│
├── varietale.com/                 <-- SITIO PRINCIPAL EXISTENTE (INTACTO, NUNCA SE TOCA)
│   ├── wp-content/
│   └── ...
│
└── bitacora.varietale.com/         <-- CARPETA DEDICADA DE LA BITÁCORA (NUEVA)
    ├── .htaccess                  <-- Reglas de redirección SPA, seguridad SQLite y ruteo /api/*
    ├── LEEME_INFO_BITACORA.txt    <-- Identificador técnico para Varietale y desarrolladores
    ├── index.html                 <-- Punto de entrada principal
    ├── manifest.json              <-- Manifiesto PWA para instalación móvil
    ├── sw.js                      <-- Service Worker para modo offline
    ├── api/                       <-- Backend centralizado PHP 8.3 (SQLite, Auth, Catas, Fotos, Catálogo)
    │   ├── index.php
    │   ├── db.php
    │   └── varietale_catalog.php
    └── assets/                    <-- Archivos JS, CSS y recursos estáticos

├── bitacora_storage/              <-- CARPETA AISLADA DE DATOS EN DREAMHOST (FUERA DEL WEBROOT)
    ├── bitacora.sqlite            <-- Base de datos central (usuarios, sesiones, catas, analítica, CMS)
    ├── backup_token.secret        <-- Token privado para respaldo automático GitHub Actions
    └── uploads/                   <-- Fotos optimizadas de clientes activos (se borran al darse de baja)
```

---

### 8. Backend Centralizado PHP 8.3 + SQLite en DreamHost y Respaldos en GitHub

1. **Aislamiento total de datos frente a despliegues (`rsync`):**
   - El backend PHP almacena la base SQLite (`bitacora.sqlite`) y las fotografías optimizadas (`uploads/`) en `/home/bitacoravarietale_app/bitacora_storage/` (directorio hermano **fuera** de `bitacora.varietale.com/`).
   - Al actualizar código con `rsync`, usar siempre exclusiones de seguridad:
     ```bash
     npm run build
     rsync -avz --delete \
       --exclude 'api/storage/bitacora.sqlite*' \
       --exclude 'api/storage/uploads/' \
       --exclude 'api/storage/*.secret' \
       dist/ bitacoravarietale_app@173.236.200.69:/home/bitacoravarietale_app/bitacora.varietale.com/
     ```
2. **Fotos optimizadas y ciclo de vida al darse de baja:**
   - Las fotografías subidas por usuarios registrados se comprimen automáticamente en el navegador (~720px WebP/JPEG) y se sirven desde DreamHost en `/api/photos/view`.
   - Cuando un usuario se da de baja (o el administrador lo da de baja), **todos sus archivos fotográficos físicos se eliminan de inmediato en DreamHost**, mientras se conserva el 100% de su perfil e historial completo de catas en `bitacora.sqlite`.
3. **Respaldo automático en la nube (GitHub Actions -> Rama `backups`, sin fotos):**
   - Entra al **Portal Admin -> Configuración -> Copia de Seguridad General** en `https://bitacora.varietale.com` y copia el **Token de Respaldo Automático (`DREAMHOST_BACKUP_TOKEN`)**.
   - Agrégalo en GitHub (`maildeleyton-a11y/bitacora-de-catacion-varietale` -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`) con el nombre `DREAMHOST_BACKUP_TOKEN`.
   - El workflow `.github/workflows/backup-db.yml` descargará cada 6 horas el archivo JSON liviano (sin fotos) a la rama `backups` (`backups/varietale-db-latest.json`).
4. **Recuperación rápida ante fallos (Disaster Recovery):**
   - **Código:** `deploy.yml` publica compilación en GitHub Pages (`main`) y el código completo está en GitHub sin depender del computador local.
   - **Datos:** Descarga `backups/varietale-db-latest.json` desde la rama `backups` de GitHub y súbelo desde **Portal Admin -> Restaurar desde Archivo** o mediante:
     ```bash
     curl -X POST https://bitacora.varietale.com/api/backup/restore \
       -H "Content-Type: application/json" \
       -H "X-Backup-Token: $DREAMHOST_BACKUP_TOKEN" \
       --data-binary @varietale-db-latest.json
     ```

---

### 9. Registro de Contacto y Soporte
- **Agencia de Desarrollo:** Mr. Bite
- **Repositorio de Código:** Privado en GitHub (`maildeleyton-a11y/bitacora-de-catacion-varietale`)
- **Fecha de Creación:** Noviembre 2026
