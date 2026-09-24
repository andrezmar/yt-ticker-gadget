let hideTimeout = null;
let currentConfig = null;

function applyConfig(cfg) {
  currentConfig = cfg;
  const ticker = document.getElementById('ticker');
  const el = document.getElementById('ticker-text');
  if (!el || !ticker) return;

  // Tipografía, tamaño, color
  el.style.fontFamily = cfg.fontFamily || 'Segoe UI';
  el.style.fontSize = (cfg.fontSize || 34) + 'px';
  el.style.color = cfg.fontColor || '#ffffff';

  // Opacidad de fondo
  const op = cfg.bgOpacity || 0;
  if (op === 0) {
    ticker.style.background = 'transparent';
  } else {
    const alpha = Math.round(op * 2.55); // 0-255
    const hex = alpha.toString(16).padStart(2, '0');
    ticker.style.background = `#000000${hex}`;
    ticker.style.borderRadius = '8px';
  }
}

function showTicker(text) {
  const el = document.getElementById('ticker-text');
  if (!el) return;
  if (hideTimeout) clearTimeout(hideTimeout);
  el.style.transition = 'opacity 180ms ease';
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = text;
    el.style.opacity = '1';
  }, 120);
}

function hideTicker() {
  const el = document.getElementById('ticker-text');
  if (!el) return;
  if (hideTimeout) clearTimeout(hideTimeout);
  el.style.transition = 'opacity 300ms ease';
  el.style.opacity = '0';
  hideTimeout = setTimeout(() => { el.textContent = ''; }, 320);
}

window.tickerAPI.onShow(showTicker);
window.tickerAPI.onHide(hideTicker);
window.tickerAPI.onConfig(applyConfig);
window.tickerAPI.onMoveMode((active) => {
  const ticker = document.getElementById('ticker');
  if (!ticker) return;
  if (active) {
    ticker.style.outline = '2px dashed #00e5ff';
    ticker.style.outlineOffset = '-2px';
    ticker.style.cursor = 'move';
    ticker.style.webkitAppRegion = 'drag';
    document.body.style.webkitAppRegion = 'drag';
  } else {
    ticker.style.outline = 'none';
    ticker.style.cursor = 'default';
    ticker.style.webkitAppRegion = 'no-drag';
    document.body.style.webkitAppRegion = 'no-drag';
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await window.tickerAPI.getConfig();
  applyConfig(cfg);
  showTicker('YouTube Ticker listo — reproduce música en inglés en tu navegador');
});
