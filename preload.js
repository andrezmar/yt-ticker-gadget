const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tickerAPI', {
  onShow: (cb) => ipcRenderer.on('ticker-show', (_, text) => cb(text)),
  onHide: (cb) => ipcRenderer.on('ticker-hide', () => cb()),
  onMoveMode: (cb) => ipcRenderer.on('move-mode', (_, active) => cb(active)),
  onConfig: (cb) => ipcRenderer.on('config-update', (_, cfg) => cb(cfg)),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (cfg) => ipcRenderer.invoke('set-config', cfg),
  openSettings: () => ipcRenderer.send('open-settings'),
});
