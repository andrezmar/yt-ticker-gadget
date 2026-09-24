# Contribuir a yt-ticker-gadget

Gracias por querer mejorar el proyecto.

## Flujo recomendado (fork + PR)
1. Haz fork del repo `andrezmar/yt-ticker-gadget` → `tuuser/yt-ticker-gadget`
2. Clona tu fork:
   ```powershell
   git clone https://github.com/tuuser/yt-ticker-gadget.git
   cd yt-ticker-gadget
   npm install
   ```
3. Crea rama: `git checkout -b feat/mi-mejora`
4. Prueba en dev: `npm start` + cargar `extension` en `brave://extensions`
5. Asegura `node --check main.js` y que `http://127.0.0.1:8765/health` responda
6. Commit: `git commit -m "feat: describe cambio"`
7. Push: `git push origin feat/mi-mejora`
8. Abre Pull Request hacia `andrezmar:main` con descripción, video/gif si es UI

## Reglas
- No pushes directos a `main` (protegida)
- Un PR = una feature/fix
- Describe cómo probar
- respeta estilo: `preload.js` con `contextIsolation`, no `nodeIntegration`
- No incluyas `dist/`, `node_modules/`, `yt-ticker-extension.zip`, `transcript-cache/`

## Reportar bugs
Usa `Issues` con template Bug Report (incluye `http://127.0.0.1:8765/health`, versión Brave, videoId).

## Ideas para ampliar
- Soporte Spotify/otros (reconocimiento audio)
- Traducción automática
- Más idiomas (pt, fr)
- Temas del ticker
