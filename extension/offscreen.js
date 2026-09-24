// offscreen.js — mantiene WebSocket persistente (MV3 no permite WebSocket estable en service worker)
const WS_URL = 'ws://127.0.0.1:8765';
let ws = null;
let reconnectTimer = null;
let pendingQueue = [];
let lastVideoChange = null;

function connect() {
  ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    console.log('[yt-ticker offscreen] Conectado a Electron');
    if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = null; }
    if (pendingQueue.length > 0) {
      for (const m of pendingQueue) try { ws.send(JSON.stringify(m)); } catch {}
      pendingQueue = [];
    } else if (lastVideoChange) {
      try { ws.send(JSON.stringify(lastVideoChange)); } catch {}
    }
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STATUS', connected: true }).catch(()=>{});
  };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      // reenvía a background para log/popup
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_MSG', msg }).catch(()=>{});
    } catch {}
  };
  ws.onclose = () => {
    console.warn('[yt-ticker offscreen] WS desconectado, reintentando...');
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STATUS', connected: false }).catch(()=>{});
    scheduleReconnect();
  };
  ws.onerror = () => { try { ws.close(); } catch {} };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    if (!ws || ws.readyState === WebSocket.CLOSED) connect();
  }, 2000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OFFSCREEN_SEND') {
    if (msg.payload?.type === 'VIDEO_CHANGE') lastVideoChange = msg.payload;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg.payload));
    } else {
      if (msg.payload?.type === 'VIDEO_CHANGE') pendingQueue = [msg.payload];
    }
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'OFFSCREEN_PING') {
    sendResponse({ connected: ws && ws.readyState === WebSocket.OPEN, pending: pendingQueue.length });
    return true;
  }
});

connect();
