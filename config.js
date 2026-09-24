const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  fontSize: 34, // px — opciones: 28,31,34,38,42
  fontColor: '#ffffff', // blanco, amarillo, cyan, verde, naranja
  fontFamily: 'Segoe UI', // Segoe UI, Arial, Roboto, Inter, Verdana
  bgOpacity: 0, // 0,20,40,60,80 (%)
  position: 'left', // left, center, right
  advanceSec: 0, // 0,0.5,1.0,1.6,2.0
  widthPct: 75, // 60,75,90,100
};

function getConfigPath() {
  try { return path.join(app.getPath('userData'), 'config.json'); } 
  catch { return path.join(__dirname, 'config.json'); }
}

function loadConfig() {
  const p = getConfigPath();
  try {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { ...DEFAULTS, ...data };
    }
  } catch (e) { console.error('[config] load error', e.message); }
  return { ...DEFAULTS };
}

function saveConfig(cfg) {
  const p = getConfigPath();
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) { console.error('[config] save error', e.message); }
}

module.exports = { DEFAULTS, loadConfig, saveConfig, getConfigPath };
