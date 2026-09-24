// background.js — puente content -> offscreen (si Brave soporta offscreen), si no fallback directo
const WS_URL = 'ws://127.0.0.1:8765';
let ws = null;
let reconnectTimer = null;
let pendingQueue = [];
let lastVideoChange = null;
let useOffscreen = typeof chrome.offscreen !== 'undefined' && !!chrome.offscreen.createDocument;

async function ensureOffscreen() {
  if (!useOffscreen) return false;
  try {
    if (await chrome.offscreen.hasDocument()) return true;
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WEB_SOCKET'],
      justification: 'Mantener WebSocket a Electron (127.0.0.1:8765) para subtítulos'
    });
    return true;
  } catch (e) {
    console.warn('[yt-ticker] offscreen no disponible, usando fallback background WebSocket', e.message || e);
    useOffscreen = false;
    return false;
  }
}

// Fallback WebSocket directo en background (para Brave sin offscreen)
function connectDirect() {
  if (useOffscreen) return;
  ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    console.log('[yt-ticker] Conectado a Electron (fallback)');
    if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = null; }
    if (pendingQueue.length > 0) {
      for (const m of pendingQueue) try { ws.send(JSON.stringify(m)); } catch {}
      pendingQueue = [];
    } else if (lastVideoChange) {
      try { ws.send(JSON.stringify(lastVideoChange)); } catch {}
    }
  };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'TRANSCRIPT_READY') console.log('[yt-ticker] Transcript listo:', msg.count);
      if (msg.type === 'ERROR') console.warn('[yt-ticker] Error Electron:', msg.error);
    } catch {}
  };
  ws.onclose = () => {
    if (!useOffscreen) scheduleReconnect();
  };
  ws.onerror = () => { try { ws.close(); } catch {} };
}

function scheduleReconnect() {
  if (useOffscreen) return;
  if (reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    if (!ws || ws.readyState === WebSocket.CLOSED) connectDirect();
  }, 2000);
}

function sendToOffscreenOrDirect(payload) {
  if (payload.type === 'VIDEO_CHANGE') lastVideoChange = payload;
  if (useOffscreen) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_SEND', payload }).catch(() => {
      // si offscreen falló, fallback
      useOffscreen = false;
      sendDirect(payload);
    });
  } else {
    sendDirect(payload);
  }
}

function sendDirect(obj) {
  if (obj.type === 'VIDEO_CHANGE') lastVideoChange = obj;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  } else {
    if (obj.type === 'VIDEO_CHANGE') pendingQueue = [obj];
    if (!ws || ws.readyState === WebSocket.CLOSED) connectDirect();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VIDEO_CHANGE' || message.type === 'TIME_UPDATE') {
    if (useOffscreen) {
      (async () => {
        const ok = await ensureOffscreen();
        if (ok) chrome.runtime.sendMessage({ type: 'OFFSCREEN_SEND', payload: message }).catch(()=>{});
        else sendDirect(message);
      })();
    } else {
      sendDirect(message);
    }
    return false;
  }
  if (message.type === 'GET_STATUS') {
    (async () => {
      if (useOffscreen) {
        const ok = await ensureOffscreen();
        if (ok) {
          const res = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_PING' }).catch(()=>({connected:false}));
          sendResponse(res);
          return;
        }
      }
      sendResponse({ connected: ws && ws.readyState === WebSocket.OPEN, pending: pendingQueue.length });
    })();
    return true;
  }
  if (message.type === 'OFFSCREEN_MSG') {
    if (message.msg?.type === 'TRANSCRIPT_READY') console.log('[yt-ticker] Transcript listo:', message.msg.count);
    if (message.msg?.type === 'ERROR') console.warn('[yt-ticker] Error Electron:', message.msg.error);
    return false;
  }
});

// init
if (useOffscreen) {
  ensureOffscreen().catch(()=>{});
  chrome.runtime.onInstalled.addListener(() => ensureOffscreen());
  chrome.runtime.onStartup.addListener(() => ensureOffscreen());
} else {
  connectDirect();
}
