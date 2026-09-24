// Service that fetches transcript — con caché en disco y manejo de 429
const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs');
const path = require('path');

function getCacheDir() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'transcript-cache');
  } catch {
    return path.join(__dirname, 'transcript-cache');
  }
}

function getCachePath(videoId, lang) {
  const safeLang = (lang || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getCacheDir(), `${videoId}_${safeLang}.json`);
}

function loadFromCache(videoId, lang) {
  try {
    const p = getCachePath(videoId, lang);
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      // caché válida 7 días
      if (Date.now() - stat.mtimeMs < 7 * 24 * 60 * 60 * 1000) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(data) && data.length > 0) return data;
      }
    }
  } catch {}
  // también probar sin lang
  try {
    const p2 = getCachePath(videoId, 'default');
    if (fs.existsSync(p2)) {
      const stat = fs.statSync(p2);
      if (Date.now() - stat.mtimeMs < 7 * 24 * 60 * 60 * 1000) {
        const data = JSON.parse(fs.readFileSync(p2, 'utf-8'));
        if (Array.isArray(data) && data.length > 0) return data;
      }
    }
  } catch {}
  return null;
}

function saveToCache(videoId, lang, captions) {
  try {
    const dir = getCacheDir();
    fs.mkdirSync(dir, { recursive: true });
    const p = getCachePath(videoId, lang || 'default');
    fs.writeFileSync(p, JSON.stringify(captions), 'utf-8');
  } catch {}
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getTranscriptSafe(videoId, hintLang) {
  // 1) intenta caché primero (evita 429)
  const cached = loadFromCache(videoId, hintLang) || loadFromCache(videoId, 'en') || loadFromCache(videoId, 'es');
  if (cached) {
    // normalizar por si viene de caché vieja en ms
    return cached.map(c => {
      // si start > 1000, probablemente estaba en ms y ya lo convertimos antes? mantenemos
      return c;
    });
  }

  const attempts = [];
  attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' }));
  attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en-US' }));
  attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en-GB' }));
  if (hintLang && hintLang.toLowerCase().startsWith('es')) {
    attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' }));
    attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'es-419' }));
  } else if (hintLang && hintLang.toLowerCase().startsWith('de')) {
    attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'de' }));
  }
  attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' }));
  attempts.push(() => YoutubeTranscript.fetchTranscript(videoId, { lang: 'es-419' }));
  attempts.push(() => YoutubeTranscript.fetchTranscript(videoId));

  let lastError = null;
  let firstSuccess = null;

  for (let i = 0; i < attempts.length; i++) {
    const fn = attempts[i];
    try {
      const transcript = await fn();
      if (!transcript || transcript.length === 0) throw new Error('Transcript vacío');
      const captions = transcript.map(item => {
        const startMs = item.offset ?? item.start ?? 0;
        const durationMs = item.duration ?? 2000;
        const start = Number(startMs) / 1000;
        const duration = Number(durationMs) / 1000;
        return {
          start,
          end: start + duration,
          text: (item.text || '').trim(),
          lang: item.lang || null
        };
      }).filter(c => c.text.length > 0);
      if (captions.length > 0) {
        if (!firstSuccess) firstSuccess = captions;
        const fnStr = fn.toString();
        if (fnStr.includes("'en'") || fnStr.includes("'es'")) {
          saveToCache(videoId, hintLang || 'en', captions);
          return captions;
        }
      }
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      if (msg.includes('Transcript is disabled')) {
        throw new Error('Transcripción desactivada por YouTube en este video (muchos videos musicales oficiales la desactivan). Prueba con otro video como https://www.youtube.com/watch?v=dQw4w9WgXcQ)');
      }
      if (msg.includes('Too Many') || msg.includes('429') || msg.includes('captcha') || msg.includes('too many')) {
        // backoff 2s y reintenta siguiente intento (no todo el flujo)
        console.warn(`[captions] 429 Too Many Requests, esperando 3s antes de reintentar...`);
        await delay(3000);
        // no tirar, continúa con siguiente intento
        continue;
      }
      // No transcripts available in <lang> -> probar siguiente sin delay
    }
    // pequeño delay entre intentos para no gatillar 429
    if (i < attempts.length - 1) await delay(400);
  }
  if (firstSuccess) {
    saveToCache(videoId, hintLang || 'default', firstSuccess);
    return firstSuccess;
  }
  // Si era 429, dar mensaje más claro
  if (lastError && (lastError.message.includes('Too Many') || lastError.message.includes('429'))) {
    throw new Error('YouTube bloqueó temporalmente por demasiadas solicitudes (429). Espera 1 minuto y cambia de video. El caché evitará reintentos.');
  }
  throw lastError || new Error('Transcript not available');
}

module.exports = { getTranscript: getTranscriptSafe };
