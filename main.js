const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const { getTranscript } = require('./captionsService');
const { loadConfig, saveConfig } = require('./config');

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let wss = null;
let wsClients = new Set();
let currentCaptions = null;
let currentVideoId = null;
let lastCaptionIndex = -1;
let pendingFetch = null;
let lastFetchVideoId = null;
let lastFetchTime = 0;
let config = loadConfig();
let moveModeTimer = null;

function applyPositionAndSize() {
  if (!mainWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  const pct = config.widthPct || 75;
  const windowWidth = Math.min(1600, Math.floor(workArea.width * pct / 100));
  const windowHeight = 48;
  let x;
  if (config.position === 'left') x = workArea.x + 8;
  else if (config.position === 'right') x = workArea.x + workArea.width - windowWidth - 8;
  else x = workArea.x + Math.floor((workArea.width - windowWidth) / 2);
  const y = workArea.y + workArea.height - windowHeight - 6;
  mainWindow.setBounds({ x, y, width: windowWidth, height: windowHeight });
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  const pct = config.widthPct || 75;
  const windowWidth = Math.min(1600, Math.floor(workArea.width * pct / 100));
  const windowHeight = 48;
  let x;
  if (config.position === 'left') x = workArea.x + 8;
  else if (config.position === 'right') x = workArea.x + workArea.width - windowWidth - 8;
  else x = workArea.x + Math.floor((workArea.width - windowWidth) / 2);
  const y = workArea.y + workArea.height - windowHeight - 6;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('config-update', config);
  });

  return mainWindow;
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 520,
    height: 640,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Configuración — YouTube Ticker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  settingsWindow.loadFile('settings.html');
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function createTray() {
  try {
    // Icono visible (cuadrado azul 16x16) — createEmpty es invisible en Windows
    const size = 16;
    const buf = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      buf[i*4] = 0x1E; buf[i*4+1] = 0x88; buf[i*4+2] = 0xE5; buf[i*4+3] = 0xFF;
    }
    const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
    tray = new Tray(icon);
    tray.setToolTip('YouTube Ticker — clic derecho: Configuración');
    const menu = Menu.buildFromTemplate([
      { label: 'Mostrar ticker (Ctrl+Shift+Q)', click: () => showTickerWindow() },
      { label: 'Ocultar ticker (Ctrl+Shift+W)', click: () => hideTickerWindow() },
      { label: 'Mover gadget (Ctrl+Shift+R)', click: () => enableMoveMode() },
      { type: 'separator' },
      { label: 'Configuración... (Ctrl+Shift+E)', click: () => createSettingsWindow() },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() }
    ]);
    tray.setContextMenu(menu);
    tray.on('click', () => createSettingsWindow());
    tray.on('double-click', () => createSettingsWindow());
  } catch (e) {
    console.error('[tray] no se pudo crear', e.message);
  }
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  try {
    const okQ = globalShortcut.register('CommandOrControl+Shift+Q', () => showTickerWindow());
    const okW = globalShortcut.register('CommandOrControl+Shift+W', () => hideTickerWindow());
    const okR = globalShortcut.register('CommandOrControl+Shift+R', () => enableMoveMode());
    const okE = globalShortcut.register('CommandOrControl+Shift+E', () => createSettingsWindow());
    console.log(`[yt-ticker] Atajos registrados Q:${okQ} W:${okW} R:${okR} E:${okE} (si false, otro programa los usa)`);
  } catch (e) {
    console.error('[shortcuts] error', e.message);
  }
}

function showTickerWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    if (currentCaptions && currentVideoId) {
      mainWindow.webContents.send('ticker-show', `Ticker activado — ${currentCaptions.length} líneas`);
      setTimeout(() => mainWindow.webContents.send('ticker-hide'), 2000);
    }
  }
}

function hideTickerWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}

function enableMoveMode() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.webContents.send('move-mode', true);
  if (moveModeTimer) clearTimeout(moveModeTimer);
  moveModeTimer = setTimeout(() => {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('move-mode', false);
  }, 6000);
  console.log('[yt-ticker] Modo mover activado 6s — arrastra el gadget');
}

function startWebSocketServer() {
  let WebSocket;
  try { WebSocket = require('ws'); } catch (e) {
    console.error('[yt-ticker] Falta ws. npm install ws');
    return null;
  }
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true, videoId: currentVideoId, captions: currentCaptions?.length || 0, clients: wsClients.size, lastCaption: lastCaptionIndex }));
    } else if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('yt-ticker WS en ws://127.0.0.1:8765');
    } else { res.writeHead(404); res.end(); }
  });

  wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log(`[yt-ticker] Extensión conectada (${wsClients.size})`);
    if (currentVideoId && currentCaptions) {
      ws.send(JSON.stringify({ type: 'TRANSCRIPT_READY', videoId: currentVideoId, count: currentCaptions.length }));
    }
    ws.on('message', async (data) => {
      try { await handleExtensionMessage(JSON.parse(data.toString()), ws); } catch (err) { console.error('[yt-ticker] Mensaje inválido', err); }
    });
    ws.on('close', () => { wsClients.delete(ws); console.log(`[yt-ticker] Desconectada (${wsClients.size})`); });
    ws.on('error', (e) => console.error('[yt-ticker] WS error', e.message));
  });

  const PORT = 8765;
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[yt-ticker] WebSocket listo en ws://127.0.0.1:${PORT}`);
  });
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') console.error(`[yt-ticker] Puerto ${PORT} en uso.`);
    else console.error('[yt-ticker] Server error', e);
  });
  return server;
}

function sendToTicker(type, data) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // si está oculta por W, mostrarla al llegar subtítulo
  if (!mainWindow.isVisible()) mainWindow.show();
  if (type === 'SHOW_TICKER') mainWindow.webContents.send('ticker-show', data.text);
  if (type === 'HIDE_TICKER') mainWindow.webContents.send('ticker-hide');
}

async function handleExtensionMessage(msg, ws) {
  switch (msg.type) {
    case 'VIDEO_CHANGE': {
      const { videoId, language } = msg;
      const now = Date.now();
      if (videoId === currentVideoId && currentCaptions && now - lastFetchTime < 1000) return;
      if (videoId === lastFetchVideoId && now - lastFetchTime < 1000) return;
      if (pendingFetch && lastFetchVideoId === videoId) return;

      console.log(`[yt-ticker] VIDEO_CHANGE ${videoId}`);
      lastFetchVideoId = videoId;
      lastFetchTime = now;

      const doFetch = (attempt) => getTranscript(videoId, language).then(captions => {
        currentVideoId = videoId;
        currentCaptions = captions;
        lastCaptionIndex = -1;
        console.log(`[yt-ticker] Transcript OK: ${captions.length} líneas para ${videoId}${attempt>0?' (retry '+attempt+')':''}`);
        ws.send(JSON.stringify({ type: 'TRANSCRIPT_READY', videoId, count: captions.length }));
        sendToTicker('SHOW_TICKER', { text: `Subtítulos cargados: ${captions.length} líneas` });
        setTimeout(() => sendToTicker('HIDE_TICKER'), 2200);
      }).catch(err => {
        const isDisabled = err.message.includes('desactivada');
        const isNetwork = err.message.includes('fetch') || err.message.includes('network') || err.message.includes('ETIMEDOUT') || err.message.includes('Transcript not available');
        if (!isDisabled && isNetwork && attempt === 0) {
          console.warn(`[yt-ticker] Transcript FAIL ${videoId} (intento 1): ${err.message} — reintentando en 2s...`);
          return new Promise(res => setTimeout(res, 2000)).then(() => doFetch(1));
        }
        console.error(`[yt-ticker] Transcript FAIL ${videoId}:`, err.message);
        currentVideoId = videoId;
        currentCaptions = null;
        lastCaptionIndex = -1;
        ws.send(JSON.stringify({ type: 'ERROR', error: err.message }));
        const short = isDisabled ? 'Sin subtítulos en este video' : 'Sin subtítulos disponibles';
        sendToTicker('SHOW_TICKER', { text: short });
        setTimeout(() => sendToTicker('HIDE_TICKER'), 3500);
      });

      pendingFetch = doFetch(0).finally(() => { pendingFetch = null; });

      await pendingFetch;
      break;
    }
    case 'TIME_UPDATE': {
      if (!currentCaptions || msg.videoId !== currentVideoId) return;
      const t = Number(msg.currentTime) + (config.advanceSec || 0);
      let idx = -1;
      for (let i = 0; i < currentCaptions.length; i++) {
        if (t >= currentCaptions[i].start && t < currentCaptions[i].end) { idx = i; break; }
      }
      if (idx !== -1 && idx !== lastCaptionIndex) {
        lastCaptionIndex = idx;
        sendToTicker('SHOW_TICKER', { text: currentCaptions[idx].text });
      }
      break;
    }
    case 'PING': ws.send(JSON.stringify({ type: 'PONG' })); break;
  }
}

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  registerShortcuts();
  startWebSocketServer();

  // IPC config
  ipcMain.handle('get-config', () => config);
  ipcMain.handle('set-config', (e, newCfg) => {
    config = { ...config, ...newCfg };
    saveConfig(config);
    applyPositionAndSize();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('config-update', config);
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('config-update', config);
    return config;
  });
  ipcMain.on('open-settings', () => createSettingsWindow());

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createOverlayWindow(); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => {
  if (wss) try { wss.close(); } catch {}
  if (process.platform !== 'darwin') app.quit();
});
