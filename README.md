# yt-ticker-gadget

> **Gadget para Windows 11** que muestra los subtítulos de la música que reproduces en tu navegador con **YouTube**. Ideal para practicar inglés (y español) mientras trabajas en otras ventanas.

![Windows 11](https://img.shields.io/badge/Windows-11-0078D6) ![Electron 30](https://img.shields.io/badge/Electron-30-47848F) ![License MIT](https://img.shields.io/badge/License-MIT-green) ![YouTube](https://img.shields.io/badge/YouTube-Premium-red)

**Demo:** Ventana overlay transparente, `alwaysOnTop`, click-through, anclada justo encima de la barra de tareas a la izquierda. Texto 34px centrado-izquierda, sin animación de desplazamiento.

---

## ✨ Ventajas

- **Sin costo / sin API key personal** — usa `youtube-transcript` directo a `youtube.com/api/timedtext` (endpoint público, sin key)
- **Funciona con tu navegador real + YouTube** — no embebe player, detecta `videoId/currentTime` vía extensión Brave/Chrome
- **Bilingüe inteligente** — `captionsService.js:8` prioriza `en → es → default`, evita que el default alemán tape al español original (`jZGpkLElSu8` 70 líneas `es` vs 58 `de`)
- **Caché 7 días** en `%APPDATA%/yt-ticker/transcript-cache/` — evita 429 de YouTube tras muchos cambios de playlist
- **Configuración en vivo** — tamaño, color, tipografía, opacidad, ancho sin reiniciar (`config.js:5`, `settings.html`)
- **Atajos globales** — `Ctrl+Shift+Q/W/R/E` y bandeja (tray) con icono azul
- **Soporta listas/radio/autoplay** — `content.js:69` detecta cambio vía `getVideoData` + `MutationObserver`

## ⚠️ Desventajas / Limitaciones

- **Solo YouTube** (`youtube.com`, `music.youtube.com` — `extension/manifest.json:7`), no Spotify/otros
- **Solo videos con subtítulos** en YouTube — si `Transcript is disabled` muestra `Sin subtítulos en este video`
- **Rate-limit de YouTube (429)** — tras ~30-50 fetches seguidos YouTube bloquea 1-2 min (`Too Many Requests`). La caché lo mitiga, pero videos nuevos sin caché pueden fallar temporalmente
- **Requiere Brave/Chrome + app Electron corriendo** — si abres YouTube antes que el `.exe`, el primer `VIDEO_CHANGE` se encola y se flushea al conectar (`background.js: pendingQueue`, `offscreen.js`)
- **No es traductor** — muestra el idioma original (en para inglés, es para español), no traduce
- **No offline** — necesita internet para `youtubei/v1/player`
- **Windows only probado** — no testeado en macOS/Linux

---

## 🚀 Instalación

### Opción A — Usuario (sin compilar, recomendado)
1. Ve a **Releases** → `v1.0.0` → descarga `YouTube Ticker Setup 1.0.0.exe` y `yt-ticker-extension.zip`
2. Instala el `.exe` (NSIS, permite elegir carpeta, crea acceso directo)
3. Descomprime el zip en carpeta permanente (ej `C:\yt-ticker-extension`)
4. Brave → `brave://extensions` → Modo desarrollador → **Cargar descomprimida** → selecciona esa carpeta
5. Ejecuta `YouTube Ticker` desde menú inicio → verás cuadrado azul en bandeja (al lado del reloj, en `^` si está oculto)
6. Abre YouTube, reproduce un tema con CC (ej `dQw4w9WgXcQ`) → ticker aparece arriba a la izquierda de la taskbar

Verifica: `http://127.0.0.1:8765/health` → `{"ok":true,"videoId":"...","captions":61}` y popup de la extensión (clic en icono) → `✓ Electron conectado`

### Opción B — Desarrollador
```powershell
git clone https://github.com/andrezmar/yt-ticker-gadget.git
cd yt-ticker-gadget
npm install
npm start          # modo dev, abre gadget
# en Brave: brave://extensions → Cargar descomprimida → .\extension
npm run dist       # genera dist/YouTube Ticker Setup 1.0.0.exe (sin firma)
# zip extensión: Compress-Archive -Path extension\* -DestinationPath yt-ticker-extension.zip -Force
```

Ver `docs/INSTALL.md` para detalles de build y troubleshooting (signtool, `spawn UNKNOWN`).

---

## ⚙️ Configuración (cuando ya está instalado)

Abre **Configuración**: `Tray` clic derecho → `Configuración...` o `Ctrl+Shift+E` (también `Ctrl+Shift+Q/W/R` para mostrar/ocultar/mover).

| Grupo | Opciones (5) | Default |
|-------|--------------|---------|
| **1. Tamaño fuente** | 28 / 31 / **34** / 38 / 42 px | 34 |
| **2. Color fuente** | Blanco `#fff` / Amarillo `#ffeb3b` / Cyan `#00e5ff` / Verde `#69f0ae` / Naranja `#ff9100` | Blanco |
| **3. Tipografía** | `Segoe UI` / `Arial` / `Roboto` / `Inter` / `Verdana` | `Segoe UI` |
| **4. Opacidad fondo** | 0% (transparente) / 20% / 40% / 60% / 80% negro | 0% |
| **5. Ancho gadget** | 60% / **75%** / 90% / 100% del `workArea` | 75% (~1450px en 24") |

Posición fija `left` (izquierda) y adelanto `0s` sincronizado (antes configurables, ahora fijos). Persistencia en `%APPDATA%\yt-ticker\config.json` (`config.js:15`). Ver `docs/CONFIGURATION.md`.

**Atajos globales (registrados en `main.js:134`):**
- `Ctrl+Shift+Q` Mostrar ticker
- `Ctrl+Shift+W` Ocultar ticker
- `Ctrl+Shift+R` Modo mover 6s (borde cyan punteado, arrastra)
- `Ctrl+Shift+E` Abrir Configuración

**Mover:** `Ctrl+Shift+R` → `main.js:163` quita `setIgnoreMouseEvents` + `renderer.js:51` pone `webkitAppRegion: drag` 6s.

Ver `docs/ARCHITECTURE.md` para flujo `content.js → background/offscreen → ws://127.0.0.1:8765 → main.js → renderer`.

---

## 📄 Licencia

MIT — ver `LICENSE`. Puedes usar, modificar y distribuir libremente con atribución.

## 🤝 Contribuir

Ver `CONTRIBUTING.md`. PRs vía fork, `SECURITY.md` para reportes privados a `andrezmar@gmail.com`.

## 🔒 Seguridad

No subas `transcript-cache/` ni credenciales. Habilitado Dependabot + CodeQL. Reporta vulnerabilidades en privado (ver `SECURITY.md`).
