# Documentación Técnica - Cabinas UJI

Este documento describe la arquitectura, funcionamiento interno y despliegue del proyecto **Cabinas UJI**.

## 🏗 Arquitectura

El proyecto es una aplicación web construida con **Next.js 15** (App Router) que sirve como interfaz visual para consultar la disponibilidad de cabinas de la biblioteca de la UJI.

### Stack Tecnológico

- **Frontend/Backend**: Next.js 15 (React 19)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4
- **Scraping**: Puppeteer (Chrome Headless)
- **Base de Datos/Cache**: En memoria (con persistencia básica en JSON para desarrollo local)

### Estructura de Directorios

- `src/app`: Rutas y páginas de la aplicación (Next.js App Router).
- `src/components`: Componentes React reutilizables (UI con Radix/Shadcn).
- `src/lib`: Lógica de negocio y utilidades.
  - `browser-service.ts`: Singleton para gestionar la instancia de Puppeteer.
  - `availability.ts`: Lógica principal de scraping.
  - `availability-cache.ts`: Sistema de caché para evitar peticiones excesivas.

---

## 🕷️ Funcionamiento del Scraping

La parte central de la aplicación es la lógica que extrae datos de disponibilidad de la web de la biblioteca (que utiliza tecnología GWT antigua).

### Lógica (`src/lib/availability.ts`)

1. **Inicialización**: Se lanza una instancia de navegador Chromium optimizado a través de `BrowserService`.
2. **Navegación**:
   - Se interceptan y bloquean recursos innecesarios (imágenes, fuentes) para acelerar la carga.
   - Se navega a la URL del recurso específico en `cataleg.uji.es`.
3. **Interacción con GWT**:
   - La web de la biblioteca carga un calendario dinámico complejo.
   - El script detecta la posición horizontal (`left` CSS) de la columna del día solicitado.
   - Si la fecha solicitada no está visible, automatiza los clics en los botones de "Siguiente mes" o selección de día en el mini-calendario.
4. **Extracción**:
   - Se buscan elementos `.dv-appointment` (citas/reservas) que coincidan verticalmente con la columna del día.
   - Se parsea el texto de cada cita para obtener horas de inicio y fin.
5. **Caché**: Los resultados se almacenan temporalmente para reducir la carga en los servidores de la UJI y mejorar la velocidad.

---

## 🐳 Entorno de Desarrollo (Docker)

Para facilitar el desarrollo y evitar problemas con dependencias de sistema (como librerías de Chromium), se ha configurado un entorno Docker.

### Archivos de Configuración

- **`Dockerfile.dev`**: Imagen basada en `node:20-alpine` que instala manualmente Chromium y sus dependencias de sistema (nss, freetype, harfbuzz, etc.). Configura Puppeteer para usar este Chromium instalado en lugar de descargar uno propio.
- **`docker-compose.dev.yml`**: Orquestación para levantar el servicio.
  - Monta el código local (`.:/app`) para permitir **Hot-Reloading**.
  - Persiste la carpeta `data` y `node_modules`.

### Cómo ejecutar

1. **Construir y levantar**:

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

2. **Acceder**:
   La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

3. **Detener**:

   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

### Notas sobre Puppeteer en Docker

Ejecutar navegadores en contenedores es complejo. Hemos configurado:

- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`: Para usar el Chromium de Alpine.
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`: Indicando dónde está el ejecutable.
- Flags: `--no-sandbox`, `--disable-dev-shm-usage` para evitar crasheos por falta de memoria compartida.
