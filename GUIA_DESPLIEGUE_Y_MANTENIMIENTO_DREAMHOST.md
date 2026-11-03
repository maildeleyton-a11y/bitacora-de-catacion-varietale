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
> **Garantía para el Cliente (Varietale):**
> 1. La aplicación **NO reemplaza, borra ni modifica** ningún archivo existente en el hosting de Varietale.
> 2. En DreamHost, al crear un nuevo sitio web/subdominio, el panel crea **una carpeta dedicada e independiente** (por ejemplo: `/home/usuario/bitacora.varietale.com/`).
> 3. No utiliza ni comparte bases de datos existentes de MySQL o WordPress de Varietale, lo que elimina cualquier posibilidad de conflicto o lentitud en el sitio principal.
> 4. Los datos de las catas registradas por los usuarios se gestionan mediante almacenamiento local cifrado en sus propios navegadores (`HTML5 LocalStorage`).

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
   - **Tipo:** `CNAME`
   - **Nombre:** `bitacora`
   - **Valor / Destino:** El hostname asignado por DreamHost (o si se usa registro tipo `A`, la IP de DreamHost).
   - **TTL:** 1 hora (o predeterminado).
4. Guardar cambios.

---

### 5. Paso a Paso en Hostinger Colombia (DNS de `mrbite.agency`)

1. Iniciar sesión en el panel de **Hostinger**.
2. Ir a **Dominios** > Seleccionar `mrbite.agency` > **DNS / Servidores de Nombres**.
3. Añadir un registro en la Zona DNS:
   - **Tipo:** `CNAME`
   - **Nombre:** `varietale` (o `bitacora`)
   - **Apunta a:** `bitacora.varietale.com`
   - **TTL:** 14400 (o predeterminado).
4. Guardar cambios.

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
    ├── .htaccess                  <-- Reglas de redirección SPA y optimización de caché
    ├── LEEME_INFO_BITACORA.txt    <-- Identificador técnico para Varietale y desarrolladores
    ├── index.html                 <-- Punto de entrada principal
    ├── manifest.json              <-- Manifiesto PWA para instalación móvil
    ├── sw.js                      <-- Service Worker para modo offline
    └── assets/                    <-- Archivos JS, CSS, logos y fotografías optimizadas
```

---

### 8. Registro de Contacto y Soporte
- **Agencia de Desarrollo:** Mr. Bite
- **Repositorio de Código:** Privado en GitHub (`maildeleyton-a11y/bitacora-de-catacion-varietale`)
- **Fecha de Creación:** Noviembre 2026
