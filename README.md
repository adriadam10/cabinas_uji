# Cabinas UJI

## ¿Qué es esto?
Este programa sirve para ver **rápidamente** la disponibilidad de las cabinas de estudio de la Biblioteca de la UJI.

En lugar de tener que entrar enlace por enlace en la web oficial para comprobar si una cabina está libre, esta aplicación te muestra un mapa visual de todas las cabinas (por plantas) indicando cuáles están disponibles en este momento. Es una herramienta pensada para ahorrar tiempo a los estudiantes que buscan sitio para estudiar.

## Ejecución Técnica

### En Local (Recomendado)
Para ejecutar este proyecto en tu ordenador necesitas tener instalado [Node.js](https://nodejs.org/).

1. **Instalar dependencias**:
   Abre una terminal en la carpeta del proyecto y ejecuta:
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

3. **Ver la aplicación**:
   Abre tu navegador y entra en [http://localhost:3000](http://localhost:3000).

### Docker (Experimental)
El proyecto incluye configuración para Docker, pero **actualmente no funciona correctamente**.

> ⚠️ **Aviso Importante**: La imagen de Docker tiene problemas de estabilidad debido a **Puppeteer** (la herramienta que simula el navegador para obtener los datos). Al ejecutarlo en un contenedor, Puppeteer no consigue renderizar correctamente la página web de la biblioteca (que usa tecnología GWT antigua), lo que provoca que las cabinas aparezcan incorrectamente como "Disponibles" o que el servicio se bloquee.

Si aun así quieres probarlo:

1. **Construir la imagen**:
   ```bash
   docker compose build
   ```

2. **Arrancar el contenedor**:
   ```bash
   docker compose up
   ```
