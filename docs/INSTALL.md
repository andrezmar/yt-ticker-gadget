# Instalación detallada

## Requisitos
- Windows 11 (probado en 24"), Node.js 18+, Brave o Chrome

## Dev
```powershell
git clone https://github.com/andrezmar/yt-ticker-gadget.git
cd yt-ticker-gadget
npm install
npm start
# Brave: brave://extensions → Modo desarrollador → Cargar descomprimida → .\extension
# Verifica: http://127.0.0.1:8765/health y popup extensión
```

## Build Release (genera instalador + zip)
```powershell
npm run dist          # dist/YouTube Ticker Setup 1.0.0.exe (sin firma)
npm run dist:dir      # dist/win-unpacked/YouTube Ticker.exe (portable)
Compress-Archive -Path extension\* -DestinationPath yt-ticker-extension.zip -Force
```

### Troubleshooting build
- `spawn UNKNOWN` en `signtool` → ya está desactivado con `forceCodeSigning:false` y `signAndEditExecutable:false` en `package.json:12`. Si persiste, usa `npm run dist:dir`.
- `429 Too Many Requests` en `captionsService` → espera 60s, usa caché `transcript-cache/`.
- `http://127.0.0.1:8765/health` debe dar `{"ok":true}` si Electron está corriendo.

## Instalación usuario final (desde Release)
1. Descarga `YouTube Ticker Setup 1.0.0.exe` y `yt-ticker-extension.zip` del Release `v1.0.0`
2. Ejecuta Setup (NSIS, elige carpeta, crea acceso directo)
3. Descomprime zip en carpeta permanente (ej `C:\yt-ticker-extension`)
4. Brave → `brave://extensions` → Cargar descomprimida → esa carpeta
5. Inicia "YouTube Ticker" desde menú inicio → icono azul en bandeja (en `^` si oculto)
