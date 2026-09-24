# Política de Seguridad

## Versiones soportadas
| Versión | Soportada |
|---------|-----------|
| 1.0.x   | ✅        |

## Reportar vulnerabilidad
**No abras un Issue público.**

Envía email privado a **andrezmar@gmail.com** con:
- Descripción
- Pasos para reproducir
- VideoId / log de `http://127.0.0.1:8765/health` si aplica

Responderé en 7 días. Si es válida, coordinamos fix y disclosure responsable.
Favor no hacer `npm audit fix --force` sin revisar.

## Qué no subir
- No subas `transcript-cache/`, tokens, ni `config.json` de `%APPDATA%\yt-ticker`
- Dependencias con vulnerabilidades: revisa `npm audit` antes de PR
