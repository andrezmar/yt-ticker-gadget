# Configuración

Abre con `Tray` clic derecho → `Configuración...` o `Ctrl+Shift+E`.

## Grupos (cada uno 5 opciones salvo ancho)

| Grupo | Opciones | Default | Código |
|-------|----------|---------|--------|
| Tamaño fuente | 28 / 31 / **34** / 38 / 42 px | 34 | `config.js:6` |
| Color fuente | Blanco `#fff` / Amarillo `#ffeb3b` / Cyan `#00e5ff` / Verde `#69f0ae` / Naranja `#ff9100` | Blanco | `renderer.js:13` |
| Tipografía | Segoe UI / Arial / Roboto / Inter / Verdana | Segoe UI | `config.js:8` |
| Opacidad fondo | 0% transp. / 20% / 40% / 60% / 80% | 0% | `renderer.js:16` |
| Ancho gadget | 60% / 75% / 90% / 100% de `workArea` | 75% (~1450px) | `main.js:26` |

Posición fija `left` (`main.js:29`) y adelanto `0s` (`config.js:11`).

Persistencia en `%APPDATA%\yt-ticker\config.json` (`config.js:15`). Ejemplo:
```json
{ "fontSize": 34, "fontColor": "#ffffff", "fontFamily": "Segoe UI", "bgOpacity": 0, "widthPct": 75 }
```

## Atajos
- `Ctrl+Shift+Q` Mostrar
- `Ctrl+Shift+W` Ocultar
- `Ctrl+Shift+R` Mover 6s (borde cyan, `webkitAppRegion: drag` `renderer.js:58`)
- `Ctrl+Shift+E` Configuración

Registrados en `main.js:134` vía `globalShortcut`. Si un atajo da `false` en log, otro programa lo usa.

## Mover
`main.js:163` quita `setIgnoreMouseEvents` 6s. Arrastra desde el ticker.

## Vista previa
`settings.html` muestra preview con `preview-text` en `#111`.
