async function check() {
  const el = document.getElementById('status');
  el.textContent = 'Verificando...';
  el.className = '';
  try {
    const res = await fetch('http://127.0.0.1:8765/health');
    const data = await res.json();
    el.textContent = `✓ Electron conectado — video: ${data.videoId || 'ninguno'} | captions: ${data.captions} | clientes: ${data.clients}`;
    el.className = 'ok';
  } catch (e) {
    el.textContent = '✗ Electron NO conectado — ejecuta `npm start` en R:\\yt-ticker';
    el.className = 'err';
  }
  // también preguntar al background
  try {
    const bg = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (bg && !bg.connected) {
      el.textContent += ' | WS extensión desconectado (recarga Electron)';
    }
  } catch {}
}
document.getElementById('check').onclick = check;
document.getElementById('openHealth').onclick = () => chrome.tabs.create({ url: 'http://127.0.0.1:8765/health' });
check();
