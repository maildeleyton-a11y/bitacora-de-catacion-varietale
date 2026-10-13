# Bitácora de Catación Varietale ☕
*Amor por el Café*

Aplicación interactiva y progresiva para la catación de café de especialidad de **Varietale**. Permite a los amantes del café, baristas y catadores registrar, explorar y analizar sensorialmente cada taza de café con diferentes métodos de preparación.

---

## 🌟 Características Principales

1. **Secuencia de Bienvenida Líquida Institucional:**
   - Animación de marca con el Key Visual de Varietale y logotipo oficial ("Amor por el Café").
   - Carga reactiva al iniciar la app, al comenzar una nueva cata y al volver a la pantalla de ingreso o registro.

2. **Paso 1/2: Selección de Café y Calibración del Método:**
   - Catálogo en vivo de cafés especiales de Varietale (con opción de café personalizado).
   - Selector con 11 métodos de preparación calibrados (V60, Chemex, Aeropress, Prensa Francesa, Sifón Japonés, Moka Italiana, etc.) con sus parámetros de molienda, proporción agua/café y tiempos recomendados.
   - Checklist de buenas prácticas de preparación (agua filtrada, temperatura y molienda).

3. **Paso 2/2: Evaluación Sensorial Interactiva:**
   - Rueda de sabores SCA oficial organizada por familias aromáticas.
   - Selector de intensidad de cuerpo, acidez y balance de taza.
   - Puntuación general y notas personales del catador con soporte para fotografía de la taza.

4. **Bitácora y Mapa de Exploración Sensorial:**
   - Historial detallado de todas las catas realizadas.
   - Gráfico de radar sensorial que resume el perfil gustativo acumulado.
   - Persistencia segura y particionada por usuario localmente.

5. **Autenticación y Perfil de Catador:**
   - Soporte para registro y login con correo, usuario y PIN de seguridad.
   - Modo de acceso rápido con Google y modo de exploración como invitado.
   - Visita guiada interactiva (*Onboarding*).

---

## 🚀 Puesta en Marcha Local

### Requisitos:
* **Node.js** 18+ o **Bun**

### Instalación:
```bash
npm install
```

### Desarrollo:
```bash
npm run dev
# o con Bun:
bun server.ts
```
La aplicación estará disponible en `http://localhost:3000` y en la IP local de tu red para acceso desde dispositivos móviles.

### Compilación para Producción:
```bash
npm run build
```

---

## 🛠️ Tecnologías Utilizadas
* **React 19** + **TypeScript**
* **Vite** + **Tailwind CSS v4**
* **Express** + **Bun / Node.js**
* **Motion** & **Lucide React**
* **Canvas Confetti**

---
© Varietale — Ideado y Creado por Mr. Bite® para VARIETALE®
