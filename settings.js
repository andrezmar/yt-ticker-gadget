const defs = {
  fontSize: [
    { v: 28, label: '28px', sub: 'Pequeño' },
    { v: 31, label: '31px', sub: '' },
    { v: 34, label: '34px', sub: 'Actual' },
    { v: 38, label: '38px', sub: '' },
    { v: 42, label: '42px', sub: 'Grande' },
  ],
  fontColor: [
    { v: '#ffffff', label: 'Blanco', sw: '#ffffff' },
    { v: '#ffeb3b', label: 'Amarillo', sw: '#ffeb3b' },
    { v: '#00e5ff', label: 'Cyan', sw: '#00e5ff' },
    { v: '#69f0ae', label: 'Verde', sw: '#69f0ae' },
    { v: '#ff9100', label: 'Naranja', sw: '#ff9100' },
  ],
  fontFamily: [
    { v: 'Segoe UI', label: 'Segoe UI' },
    { v: 'Arial', label: 'Arial' },
    { v: 'Roboto', label: 'Roboto' },
    { v: 'Inter', label: 'Inter' },
    { v: 'Verdana', label: 'Verdana' },
  ],
  bgOpacity: [
    { v: 0, label: '0%' }, { v: 20, label: '20%' }, { v: 40, label: '40%' }, { v: 60, label: '60%' }, { v: 80, label: '80%' },
  ],
  widthPct: [
    { v: 60, label: '60%' }, { v: 75, label: '75%' }, { v: 90, label: '90%' }, { v: 100, label: '100%' },
  ],
};

let current = null;

function renderGroup(key, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const opts = defs[key];
  opts.forEach(o => {
    const div = document.createElement('div');
    div.className = 'opt' + (current[key] === o.v ? ' active' : '');
    if (key === 'fontColor') {
      div.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${o.sw};border:1px solid #ccc;vertical-align:middle;margin-right:4px"></span>${o.label}`;
    } else {
      div.innerHTML = `${o.label}${o.sub ? `<small>${o.sub}</small>` : ''}`;
    }
    if (key === 'fontFamily') div.style.fontFamily = o.v;
    div.onclick = async () => {
      current[key] = o.v;
      await window.tickerAPI.setConfig({ [key]: o.v });
      refresh();
    };
    container.appendChild(div);
  });
}

function refresh() {
  Object.keys(defs).forEach(k => {
    const id = 'opt-' + k;
    if (document.getElementById(id)) renderGroup(k, id);
  });
  // preview
  const pv = document.getElementById('preview-text');
  const prevBox = document.getElementById('preview');
  pv.style.fontFamily = current.fontFamily;
  pv.style.fontSize = current.fontSize + 'px';
  pv.style.color = current.fontColor;
  pv.style.textShadow = '0 0 3px #000, 0 0 6px #000, 2px 2px 4px rgba(0,0,0,0.85)';
  const op = current.bgOpacity || 0;
  if (op === 0) prevBox.style.background = '#111';
  else {
    const a = Math.round(op * 2.55).toString(16).padStart(2,'0');
    prevBox.style.background = `#000000${a}`;
    // show with checker if transparent? just dark
  }
}

async function init() {
  current = await window.tickerAPI.getConfig();
  refresh();
  window.tickerAPI.onConfig((cfg) => { current = cfg; refresh(); });
}

init();
