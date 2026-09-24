// content.js — solo el video que se REPRODUCE ahora (debounce 800ms)
let currentVideoId = null;
let timeInterval = null;
let lastSentVideoId = null;
let lastSentTime = 0;
const DEBOUNCE_MS = 800;

function extractVideoId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('v');
  if (fromUrl) return fromUrl;
  try {
    const p = document.querySelector('#movie_player');
    if (p && typeof p.getVideoData === 'function') {
      const d = p.getVideoData();
      if (d && d.video_id) return d.video_id;
    }
  } catch {}
  try {
    const pr = window.ytInitialPlayerResponse;
    if (pr?.videoDetails?.videoId) return pr.videoDetails.videoId;
  } catch {}
  const link = document.querySelector('link[rel="canonical"]');
  if (link) {
    const m = link.href.match(/[?&]v=([^&]+)/);
    if (m) return m[1];
  }
  return null;
}

function findPlayer() {
  return document.querySelector('#movie_player');
}

function getCurrentTime() {
  const p = findPlayer();
  if (p && typeof p.getCurrentTime === 'function') {
    try { return p.getCurrentTime(); } catch { return null; }
  }
  const v = document.querySelector('video.html5-main-video');
  if (v) return v.currentTime;
  return null;
}

function sendVideoChange() {
  const videoId = extractVideoId();
  if (!videoId) return;
  const now = Date.now();
  // Solo ignora si es EXACTAMENTE el mismo video dentro de 800ms
  if (videoId === lastSentVideoId && now - lastSentTime < DEBOUNCE_MS) return;
  // No bloquees por currentVideoId si es video distinto — force real
  let language = 'unknown';
  try {
    const pr = window.ytInitialPlayerResponse;
    const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks?.some(t => (t.languageCode || '').toLowerCase().startsWith('en'))) language = 'en';
    else if (tracks?.[0]?.languageCode) language = tracks[0].languageCode;
    else if (document.documentElement.lang) language = document.documentElement.lang;
  } catch {}

  // Solo envía si es video distinto o pasó debounce
  if (videoId !== currentVideoId || now - lastSentTime >= DEBOUNCE_MS) {
    currentVideoId = videoId;
    lastSentVideoId = videoId;
    lastSentTime = now;
    console.log('[yt-ticker] VIDEO_CHANGE ->', videoId, language);
    try { chrome.runtime.sendMessage({ type: 'VIDEO_CHANGE', videoId, language }); } catch {}
  }
}

function startPolling() {
  if (timeInterval) return;
  timeInterval = setInterval(() => {
    const vid = extractVideoId();
    if (vid && vid !== currentVideoId) {
      sendVideoChange();
      return;
    }
    const t = getCurrentTime();
    if (t !== null && currentVideoId) {
      try { chrome.runtime.sendMessage({ type: 'TIME_UPDATE', videoId: currentVideoId, currentTime: t }); } catch {}
    }
  }, 400);
}

function observeNavigation() {
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(sendVideoChange, 300);
    }
  }).observe(document, { subtree: true, childList: true });

  window.addEventListener('yt-navigate-finish', () => setTimeout(sendVideoChange, 200));
  document.addEventListener('yt-page-data-updated', () => setTimeout(sendVideoChange, 200));
}

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }
  setTimeout(sendVideoChange, 600);
  observeNavigation();
  startPolling();
}

init();
