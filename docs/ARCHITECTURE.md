# Arquitectura

```
[ youtube.com / music.youtube.com ]
        │
        │ content.js: detecta v= + ytInitialPlayerResponse.captionTracks + currentTime (400ms)
        ▼
background.js / offscreen.js  ──ws://127.0.0.1:8765──►  main.js (Electron)
        │                                              │  - getTranscript(videoId, hintLang) captionsService.js
        │                                              │  - caché 7d transcript-cache/
        │                                              │  - debounce 1s + pendingFetch
        │                                              ▼
        │                                         renderer.js (overlay)
        │                                         ticker left 75% workArea, 48px, alwaysOnTop
```

## Flujo
1. `extension/content.js:45` `VIDEO_CHANGE` → `background.js: pendingQueue` → `offscreen.js` si existe
2. `offscreen.js` mantiene `WebSocket` persistente (MV3 service worker no permite WS estable)
3. `main.js:224` `VIDEO_CHANGE` → `captionsService.js:8` fetch `en → es → default` → `transcript-cache/`
4. `content.js:69` polling `getCurrentTime()` → `TIME_UPDATE` cada 400ms
5. `main.js:261` busca `t >= start && t < end` + `config.advanceSec`
6. `renderer.js:27` `ticker-show` con fade, `applyConfig` para estilo en vivo

## Puertos
- `ws://127.0.0.1:8765` (main.js:205) y `http://127.0.0.1:8765/health`

## Archivos clave
- `main.js:36` `BrowserWindow` frameless transparent
- `preload.js:3` `contextBridge` `tickerAPI`
- `captionsService.js:36` normaliza `offset/duration` ms→s
