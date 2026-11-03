/**
 * Calculus 2 Öğrenim Portalı - Ana Uygulama Mantığı (js/app.js)
 *
 * Modüller:
 * 1. Durum Yönetimi (LocalStorage: İzlenenler, Hız, Tema, Sinema Modu, Video Notları)
 * 2. YouTube IFrame & Tampermonkey 3x Köprüsü (postMessage API)
 * 3. Oynatma Listesi, Arama & Filtreleme
 * 4. Kişisel Video Ders Notları
 * 5. Pomodoro Çalışma Sayacı
 * 6. Klavye Kısayolları (QWERTY Hız & Navigasyon)
 */

const { weeksData, allVideos } = window.CALCULUS_DATA || { weeksData: [], allVideos: [] };

// LocalStorage Anahtarları (Geriye dönük uyumluluk için v1 korundu)
const STORAGE_KEY = 'calculus2_watched_videos_v1';
const SPEED_KEY = 'calculus2_player_speed_v1';
const CURRENT_VID_KEY = 'calculus2_current_video_id';
const THEME_KEY = 'calculus2_theme_preference';
const THEATER_KEY = 'calculus2_theater_mode';
const NOTES_KEY = 'calculus2_video_notes_v1';
const AUTONEXT_KEY = 'calculus2_autonext_v1';

// Uygulama Durumu (State)
let watchedSet = new Set();
let videoNotes = {};
let currentSpeed = 1.0;
let activeVideoIndex = 0;
let selectedWeek = 'curriculum'; // 'curriculum' (1-13), 'all' (1-15), veya hafta numarası
let currentFilter = 'all'; // 'all', 'unwatched', 'watched', 'noted'
let searchQuery = '';
let isTampermonkeyReady = false;
let autoNextEnabled = true;

// YouTube Player Anlık Durumu
let playerCurrentTime = 0;
let playerDuration = 0;
let playerState = -1; // -1: unstarted, 0: ended, 1: playing, 2: paused
let playerLoadedFraction = 0;
let playerVolume = 100;
let playerMuted = false;
let nativeControls = false;   // Overlay bağlanamazsa YouTube'un kendi kontrollerine dönülür
let ytConnected = false;      // YouTube iframe 'listening' el sıkışması tamamlandı mı?
let ytHandshakeTimer = null;
let endHandledForId = null;   // Bitiş olayının aynı video için iki kez işlenmesini engeller
let videoLoadStartedAt = 0;

// Pomodoro Sayacı Durumu
let pomoSeconds = 25 * 60;
let pomoRunning = false;
let pomoInterval = null;

// Arayüzde dinamik olarak değişen ikonlar (Lucide tarzı, currentColor ile temaya uyar)
const svgIcon = (body, cls = 'w-4 h-4', filled = false) =>
  `<svg class="${cls}" viewBox="0 0 24 24" ${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;
const SPEAKER = '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>';
const ICONS = {
  play: svgIcon('<polygon points="6 3 20 12 6 21 6 3"/>', 'w-[18px] h-[18px]', true),
  pause: svgIcon('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', 'w-[18px] h-[18px]', true),
  volume: svgIcon(SPEAKER + '<path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>', 'w-[18px] h-[18px]'),
  muted: svgIcon(SPEAKER + '<line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>', 'w-[18px] h-[18px]'),
  maximize: svgIcon('<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>', 'w-[18px] h-[18px]'),
  minimize: svgIcon('<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>', 'w-[18px] h-[18px]'),
  checkCircle: svgIcon('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  circle: svgIcon('<circle cx="12" cy="12" r="10"/>'),
  sun: svgIcon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
  moon: svgIcon('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
  note: svgIcon('<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>', 'w-3 h-3')
};

// ==========================================
// 1. BAŞLANGIÇ VERİLERİNİ YÜKLEME & KAYDETME
// ==========================================

function loadStoredState() {
  try {
    const savedWatched = localStorage.getItem(STORAGE_KEY);
    if (savedWatched) watchedSet = new Set(JSON.parse(savedWatched));
  } catch (e) { console.error('İzlenen videolar yüklenemedi:', e); }

  try {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    if (savedNotes) videoNotes = JSON.parse(savedNotes) || {};
  } catch (e) { console.error('Notlar yüklenemedi:', e); }

  try {
    const savedSpeed = localStorage.getItem(SPEED_KEY);
    if (savedSpeed) currentSpeed = parseFloat(savedSpeed) || 1.0;
  } catch (e) { console.error(e); }

  try {
    const savedAutoNext = localStorage.getItem(AUTONEXT_KEY);
    if (savedAutoNext !== null) autoNextEnabled = savedAutoNext === 'true';
  } catch (e) { console.error(e); }

  try {
    const savedVidId = localStorage.getItem(CURRENT_VID_KEY);
    if (savedVidId) {
      const idx = allVideos.findIndex(v => v.id === savedVidId);
      if (idx !== -1) activeVideoIndex = idx;
    }
  } catch (e) { console.error(e); }
}

function saveWatchedState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(watchedSet)));
  } catch (e) { console.error(e); }
  updateStats();
  updateCurrentVideoDetails();
}

function saveNotesState() {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(videoNotes));
  } catch (e) { console.error(e); }
}

function saveSpeedState() {
  try {
    localStorage.setItem(SPEED_KEY, currentSpeed.toString());
  } catch (e) { console.error(e); }
}

function saveCurrentVideoState(id) {
  try {
    localStorage.setItem(CURRENT_VID_KEY, id);
  } catch (e) { console.error(e); }
}

// ==========================================
// 2. TEMA & SİNEMA MODU YÖNETİMİ
// ==========================================

let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
function applyTheme(theme) {
  currentTheme = theme;
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    if (icon) icon.innerHTML = ICONS.sun;
    if (label) label.innerText = 'Aydınlık tema';
  } else {
    document.documentElement.classList.remove('dark');
    if (icon) icon.innerHTML = ICONS.moon;
    if (label) label.innerText = 'Karanlık tema';
  }
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

let isTheater = localStorage.getItem(THEATER_KEY) === 'true';
function applyTheaterMode(state) {
  isTheater = state;
  const body = document.body;
  const text = document.getElementById('theater-text');
  const btn = document.getElementById('theater-btn');
  body.classList.toggle('theater-active', isTheater);
  if (text) text.innerText = isTheater ? 'Daralt' : 'Geniş';
  if (btn) btn.setAttribute('aria-pressed', String(isTheater));
  localStorage.setItem(THEATER_KEY, isTheater.toString());
}

function toggleTheaterMode() {
  applyTheaterMode(!isTheater);
}

// ==========================================
// 3. YOUTUBE IFRAME & TAMPERMONKEY KÖPRÜSÜ
// ==========================================

function sendYtCommand(func, args = []) {
  const iframe = document.getElementById('yt-player');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(JSON.stringify({
      event: 'command',
      func: func,
      args: args
    }), '*');
  }
}

function initYtListening() {
  const iframe = document.getElementById('yt-player');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(JSON.stringify({
      event: 'listening',
      id: 1,
      channel: 'widget'
    }), '*');
  }
}

// iframe her yüklendiğinde YouTube'a 'listening' mesajı, cevap gelene kadar tekrar tekrar gönderilir.
// (Tek seferlik sabit gecikme, yavaş bağlantılarda iframe hazır olmadan gönderilip boşa gidiyordu.)
function startYtHandshake() {
  clearInterval(ytHandshakeTimer);
  let tries = 0;
  initYtListening();
  ytHandshakeTimer = setInterval(() => {
    if (ytConnected) {
      clearInterval(ytHandshakeTimer);
      return;
    }
    if (++tries > 60) {
      // ~15 sn içinde bağlantı kurulamadı: özel kontroller çalışmaz, YouTube'un kendi kontrollerine dön
      clearInterval(ytHandshakeTimer);
      enableNativeControls();
      return;
    }
    initYtListening();
  }, 250);
}

function enableNativeControls() {
  if (nativeControls) return;
  nativeControls = true;
  const shell = document.getElementById('player-shell');
  if (shell) shell.classList.add('native-controls');
  const iframe = document.getElementById('yt-player');
  const v = allVideos[activeVideoIndex];
  if (iframe && v) iframe.src = buildEmbedUrl(v.yt_id, false);
}

function onPlayerFrameLoad() {
  ytConnected = false;
  startYtHandshake();
}

function buildEmbedUrl(ytId, autoPlay) {
  let url = `https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;
  // Kontroller sayfanın kendi overlay'inde; YouTube'unkiler gizlenir (bağlantı kurulamazsa geri açılır)
  url += nativeControls ? '&controls=1' : '&controls=0&disablekb=1';
  if (window.location.protocol.startsWith('http')) {
    url += `&origin=${encodeURIComponent(window.location.origin)}`;
  }
  return url;
}

function isPlayingState() {
  return playerState === 1 || playerState === 3; // oynuyor veya arabelleğe alıyor
}

function togglePlayPause() {
  if (isPlayingState()) {
    sendYtCommand('pauseVideo');
  } else {
    sendYtCommand('playVideo');
  }
}

function seekRelative(deltaSeconds) {
  let target = Math.max(0, (playerCurrentTime || 0) + deltaSeconds);
  if (playerDuration > 0) target = Math.min(target, playerDuration);
  seekTo(target);
}

function seekTo(seconds) {
  playerCurrentTime = seconds;
  // Videonun sonundan geri sarıldıysa, tekrar bittiğinde otomatik geçiş yeniden çalışsın
  if (playerDuration > 0 && seconds < playerDuration - 1) endHandledForId = null;
  sendYtCommand('seekTo', [seconds, true]);
  updatePlayerUI();
}

window.addEventListener('message', (e) => {
  if (!e.data) return;

  // 1. Tampermonkey Handshake
  if (e.data.type === 'CALCULUS_TAMPERMONKEY_READY') {
    if (!isTampermonkeyReady) {
      isTampermonkeyReady = true;
      const text = document.getElementById('tm-text');
      const btn = document.getElementById('tm-status-btn');
      if (text) text.innerText = '3x hazır';
      if (btn) btn.classList.add('is-ready');
    }
    setSpeed(currentSpeed);
    return;
  }

  // 2. YouTube IFrame postMessage Events
  if (typeof e.data === 'string' && /^https:\/\/([a-z0-9-]+\.)*youtube(-nocookie)?\.com$/.test(e.origin)) {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch (err) {
      return; // JSON olmayan mesajları yoksay
    }
    if (!msg || !msg.event) return;

    // İlk YouTube cevabı: el sıkışma tamam, hızı uygula
    if (!ytConnected) {
      ytConnected = true;
      clearInterval(ytHandshakeTimer);
      applySpeedToPlayer();
    }

    if ((msg.event === 'infoDelivery' || msg.event === 'initialDelivery') && msg.info) {
      if (typeof msg.info.duration === 'number' && msg.info.duration > 0) {
        playerDuration = msg.info.duration;
      }
      if (typeof msg.info.videoLoadedFraction === 'number') {
        playerLoadedFraction = msg.info.videoLoadedFraction;
      }
      if (typeof msg.info.volume === 'number') playerVolume = msg.info.volume;
      if (typeof msg.info.muted === 'boolean') playerMuted = msg.info.muted;
      if (typeof msg.info.playerState === 'number') {
        handlePlayerStateChange(msg.info.playerState);
      }
      if (typeof msg.info.currentTime === 'number') {
        playerCurrentTime = msg.info.currentTime;
        // Yedek bitiş algılama: 'ended' durumu kaçırılırsa videonun sonuna gelindiğini yakala
        if (playerState === 1 && playerDuration > 0 &&
            Date.now() - videoLoadStartedAt > 3000 &&
            playerCurrentTime >= playerDuration - 0.3) {
          handleVideoEnded();
        }
      }
    } else if (msg.event === 'onStateChange' && typeof msg.info === 'number') {
      handlePlayerStateChange(msg.info);
    }
    updatePlayerUI();
  }
});

function handlePlayerStateChange(newState) {
  const prevState = playerState;
  playerState = newState;

  // Video oynamaya başladığında seçili hızı yeniden uygula (yeni videoda YouTube hızı sıfırlayabiliyor)
  if (newState === 1 && prevState !== 1) {
    applySpeedToPlayer();
  }

  // Video bittiğinde (0 = ended)
  if (newState === 0 && prevState !== 0) {
    handleVideoEnded();
  }
}

// Biten videoyu izlendi olarak işaretler ve (açıksa) sıradaki videoya geçer
function handleVideoEnded() {
  const currentVideo = allVideos[activeVideoIndex];
  if (!currentVideo || endHandledForId === currentVideo.id) return;
  endHandledForId = currentVideo.id;

  if (!watchedSet.has(currentVideo.id)) {
    watchedSet.add(currentVideo.id);
    saveWatchedState();
    renderPlaylist();
  }

  if (autoNextEnabled && activeVideoIndex < allVideos.length - 1) {
    const endedIndex = activeVideoIndex;
    setTimeout(() => {
      // Bu sırada kullanıcı başka videoya geçtiyse atlama
      if (activeVideoIndex === endedIndex) playNextVideo();
    }, 1200);
  }
}

function applySpeedToPlayer() {
  // 1. Resmi YouTube API komutu (0.25x - 2.0x)
  sendYtCommand('setPlaybackRate', [currentSpeed]);

  // 2. Tampermonkey Userscript köprüsü (2.5x, 3.0x vb.)
  const iframe = document.getElementById('yt-player');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'CALCULUS_SPEED_OVERRIDE',
      speed: currentSpeed
    }, '*');
  }
}

function setSpeed(rate) {
  currentSpeed = Math.round(rate * 100) / 100;
  saveSpeedState();
  applySpeedToPlayer();

  // Arayüz güncellemeleri
  const badge = document.getElementById('current-speed-badge');
  const slider = document.getElementById('speed-slider');
  const step = document.getElementById('speed-step-value');
  if (badge) badge.innerText = currentSpeed + 'x';
  if (step) step.innerText = currentSpeed + 'x';
  if (slider) slider.value = currentSpeed;

  document.querySelectorAll('.speed-opt').forEach(btn => {
    const bSpeed = parseFloat(btn.getAttribute('data-speed'));
    btn.classList.toggle('is-active', Math.abs(bSpeed - currentSpeed) < 0.05);
  });
}

// Hız menüsünden seçim: seçimi uygula ve menüyü kapat
function selectSpeed(rate) {
  closeDropdowns();
  if (rate > 2.0) handleExtendedSpeed(rate);
  else setSpeed(rate);
}

function handleExtendedSpeed(rate) {
  setSpeed(rate);
  if (!isTampermonkeyReady) {
    openModal('tm-modal');
  }
}

function handleSliderChange(val) {
  setSpeed(val);
  if (val > 2.0 && !isTampermonkeyReady) {
    openModal('tm-modal');
  }
}

function adjustSpeed(delta) {
  let newSpeed = Math.round((currentSpeed + delta) * 100) / 100;
  if (newSpeed < 0.5) newSpeed = 0.5;
  if (newSpeed > 3.0) newSpeed = 3.0;
  if (newSpeed > 2.0) {
    handleExtendedSpeed(newSpeed);
  } else {
    setSpeed(newSpeed);
  }
}

// ==========================================
// 4. VİDEO OYNATMA & NAVİGASYON
// ==========================================

function playVideoByIndex(index, autoPlay = true) {
  if (index < 0 || index >= allVideos.length) return;
  activeVideoIndex = index;
  playerCurrentTime = 0;
  playerDuration = 0;
  playerLoadedFraction = 0;
  playerState = -1;
  endHandledForId = null;
  videoLoadStartedAt = Date.now();
  updatePlayerUI();

  const v = allVideos[index];
  saveCurrentVideoState(v.id);

  const iframe = document.getElementById('yt-player');
  if (iframe) {
    if (ytConnected) {
      // Oynatıcı hazırsa iframe'i yeniden yüklemeden videoyu değiştir:
      // bağlantı korunur ve tarayıcının otomatik oynatma engeline takılmaz.
      sendYtCommand(autoPlay ? 'loadVideoById' : 'cueVideoById', [v.yt_id, 0]);
    } else {
      // İlk yükleme: iframe 'load' olayında el sıkışma otomatik başlar (onPlayerFrameLoad)
      iframe.src = buildEmbedUrl(v.yt_id, autoPlay);
    }
  }

  updateCurrentVideoDetails();
  renderPlaylist();

  setTimeout(() => {
    // Sadece liste kutusunu kaydır (scrollIntoView tüm sayfayı da kaydırıyordu; mobilde sayfa listeye atlıyordu)
    const activeElem = document.getElementById('item-' + v.id);
    const list = document.getElementById('playlist-container');
    if (activeElem && list) {
      const top = activeElem.offsetTop - list.offsetTop;
      const bottom = top + activeElem.offsetHeight;
      if (top < list.scrollTop) {
        list.scrollTo({ top, behavior: 'smooth' });
      } else if (bottom > list.scrollTop + list.clientHeight) {
        list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' });
      }
    }
  }, 100);
}

function playNextVideo() {
  if (activeVideoIndex < allVideos.length - 1) {
    playVideoByIndex(activeVideoIndex + 1, true);
  }
}

function playPrevVideo() {
  if (activeVideoIndex > 0) {
    playVideoByIndex(activeVideoIndex - 1, true);
  }
}

function toggleAutoNext() {
  autoNextEnabled = !autoNextEnabled;
  localStorage.setItem(AUTONEXT_KEY, autoNextEnabled.toString());
  updateAutoNextUI();
}

function updateAutoNextUI() {
  const btn = document.getElementById('autonext-btn');
  if (!btn) return;
  btn.setAttribute('aria-checked', String(autoNextEnabled));
  btn.title = autoNextEnabled ? 'Video bitince sıradakine geçilir' : 'Otomatik geçiş kapalı';
}

// ==========================================
// 5. İZLEME DURUMU & KİŞİSEL NOTLAR
// ==========================================

function toggleCurrentVideoWatched() {
  const v = allVideos[activeVideoIndex];
  if (!v) return;
  if (watchedSet.has(v.id)) {
    watchedSet.delete(v.id);
  } else {
    watchedSet.add(v.id);
  }
  saveWatchedState();
  renderPlaylist();
}

function toggleVideoWatched(id) {
  if (watchedSet.has(id)) {
    watchedSet.delete(id);
  } else {
    watchedSet.add(id);
  }
  saveWatchedState();
  renderPlaylist();
}

// "Bölümü İşaretle" hangi haftaya uygulanacak?
// Belirli bir hafta seçiliyse o hafta; genel görünümdeyse (Ana Müfredat / Tümü) şu an oynayan videonun haftası.
// (Önceden genel görünümde tüm 394/486 videoyu birden işaretliyordu.)
function getMarkTargetWeek() {
  if (selectedWeek !== 'all' && selectedWeek !== 'curriculum') return parseInt(selectedWeek);
  const v = allVideos[activeVideoIndex];
  return v ? v.week : null;
}

function getWeekShortLabel(week) {
  const w = weeksData.find(x => x.week === week);
  return w && w.is_bonus ? 'Bölüm' : `H.${week}`;
}

function updateWeekMarkButton() {
  const btn = document.getElementById('mark-week-btn');
  if (!btn) return;
  const week = getMarkTargetWeek();
  if (week == null) return;
  const weekVideos = allVideos.filter(v => v.week === week);
  const allWatched = weekVideos.length > 0 && weekVideos.every(v => watchedSet.has(v.id));
  const label = getWeekShortLabel(week);
  btn.innerText = allWatched ? `${label} · İşaretleri kaldır` : `${label} · Tümünü işaretle`;
  const w = weeksData.find(x => x.week === week);
  btn.title = `${w ? w.title : 'Hafta ' + week} (${weekVideos.length} video)`;
}

function toggleWeekWatched() {
  const week = getMarkTargetWeek();
  if (week == null) return;
  const targetVideos = allVideos.filter(v => v.week === week);
  if (targetVideos.length === 0) return;

  const allWatched = targetVideos.every(v => watchedSet.has(v.id));
  if (allWatched) {
    const w = weeksData.find(x => x.week === week);
    if (!confirm(`"${w ? w.title : 'Hafta ' + week}" bölümündeki ${targetVideos.length} videonun izlendi işareti kaldırılacak. Emin misiniz?`)) return;
    targetVideos.forEach(v => watchedSet.delete(v.id));
  } else {
    targetVideos.forEach(v => watchedSet.add(v.id));
  }
  saveWatchedState();
  renderPlaylist();
}

function resetAllProgress() {
  if (confirm('Tüm video izleme geçmişinizi sıfırlamak istediğinize emin misiniz?')) {
    watchedSet.clear();
    saveWatchedState();
    renderPlaylist();
  }
}

function handleNoteInput(value) {
  const v = allVideos[activeVideoIndex];
  if (!v) return;
  const trimmed = value.trim();
  if (trimmed) {
    videoNotes[v.id] = value;
  } else {
    delete videoNotes[v.id];
  }
  saveNotesState();
  const statusEl = document.getElementById('note-save-status');
  if (statusEl) {
    statusEl.innerText = '✓ Kaydedildi';
    setTimeout(() => { statusEl.innerText = 'Otomatik kaydedilir'; }, 1500);
  }
  renderPlaylist();
}

// ==========================================
// 6. YEDEKLEME (EXPORT / IMPORT JSON)
// ==========================================

function exportData() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    watched: Array.from(watchedSet),
    notes: videoNotes,
    speed: currentSpeed
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "calculus2_ilerleme_ve_notlar.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      // v1 formatı (sadece dizi) veya v2 formatı (nesne) desteği
      if (Array.isArray(imported)) {
        watchedSet = new Set(imported);
      } else if (imported && typeof imported === 'object') {
        if (Array.isArray(imported.watched)) watchedSet = new Set(imported.watched);
        if (imported.notes && typeof imported.notes === 'object') {
          videoNotes = { ...videoNotes, ...imported.notes };
          saveNotesState();
        }
        if (typeof imported.speed === 'number') {
          setSpeed(imported.speed);
        }
      }
      saveWatchedState();
      updateCurrentVideoDetails();
      renderPlaylist();
      alert('İlerlemeniz ve ders notlarınız başarıyla yüklendi!');
    } catch (err) {
      alert('Geçersiz yedek dosyası formatı!');
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 7. FİLTRELEME, ARAMA & ARAYÜZ GÜNCELLEME
// ==========================================

function getFilteredByWeekVideos() {
  if (selectedWeek === 'all') {
    return allVideos;
  }
  if (selectedWeek === 'curriculum') {
    return allVideos.filter(v => !v.is_bonus);
  }
  return allVideos.filter(v => v.week === parseInt(selectedWeek));
}

function handleWeekSelect(val) {
  selectedWeek = val;
  updateStats();
  renderPlaylist();
}

function handleSearch(val) {
  searchQuery = val.toLowerCase().trim();
  renderPlaylist();
}

function setFilter(f) {
  currentFilter = f;
  ['all', 'unwatched', 'watched', 'noted'].forEach(name => {
    const btn = document.getElementById('filter-' + name);
    if (btn) btn.classList.toggle('is-active', name === f);
  });
  renderPlaylist();
}

function updateStats() {
  // Ana müfredat (Hafta 1-13) veya seçili kapsam bazlı ilerleme
  const curriculumVideos = allVideos.filter(v => !v.is_bonus);
  const watchedCurriculum = curriculumVideos.filter(v => watchedSet.has(v.id)).length;
  const totalCurr = curriculumVideos.length;
  const pct = totalCurr === 0 ? 0 : Math.round((watchedCurriculum / totalCurr) * 100);

  const bar = document.getElementById('top-progress-bar');
  const txt = document.getElementById('top-progress-text');
  const badge = document.getElementById('playlist-count-badge');

  if (bar) bar.style.width = pct + '%';
  if (txt) txt.innerText = `${pct}% · ${watchedCurriculum}/${totalCurr}`;
  if (badge) badge.innerText = `${watchedSet.size}/${allVideos.length}`;
}

function updateCurrentVideoDetails() {
  const v = allVideos[activeVideoIndex];
  if (!v) return;

  document.getElementById('current-video-title').innerText = v.title;
  document.getElementById('current-week-title').innerText = v.week_title;
  const weekLabel = v.is_bonus ? 'Sınav Özel' : `Hafta ${v.week}`;
  document.getElementById('current-week-badge').innerText = weekLabel;
  document.getElementById('current-scope-badge').innerText = v.scope;
  document.getElementById('current-no-badge').innerText = v.no;

  // Üst bar hiyerarşisi: Calculus II › Hafta N › Ders
  const crumbWeek = document.getElementById('crumb-week');
  const crumbTitle = document.getElementById('crumb-title');
  if (crumbWeek) crumbWeek.innerText = weekLabel;
  if (crumbTitle) {
    crumbTitle.innerText = v.title;
    crumbTitle.title = v.title;
  }
  document.title = `${v.title} · Calculus II`;

  const directLink = document.getElementById('direct-yt-link');
  if (directLink) directLink.href = v.url;

  // Not alanı güncellemesi
  const noteInput = document.getElementById('video-note-input');
  if (noteInput) {
    noteInput.value = videoNotes[v.id] || '';
  }

  const isWatched = watchedSet.has(v.id);
  const markBtn = document.getElementById('mark-watched-btn');
  const markIcon = document.getElementById('mark-watched-icon');
  const markText = document.getElementById('mark-watched-text');

  markBtn.classList.toggle('is-on', isWatched);
  markIcon.innerHTML = isWatched ? ICONS.checkCircle : ICONS.circle;
  markText.innerText = isWatched ? 'İzlendi' : 'İzlendi olarak işaretle';

  document.getElementById('prev-video-btn').disabled = (activeVideoIndex === 0);
  document.getElementById('next-video-btn').disabled = (activeVideoIndex === allVideos.length - 1);
}

function initWeekDropdown() {
  const select = document.getElementById('week-select');
  if (!select) return;
  const curriculumCount = allVideos.filter(v => !v.is_bonus).length;
  select.innerHTML = `
    <option value="curriculum">13 haftalık müfredat · ${curriculumCount}</option>
    <option value="all">Tüm videolar + sınav hazırlık · ${allVideos.length}</option>
  `;
  weeksData.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.week.toString();
    const title = w.is_bonus ? w.title.replace(/^Sınav Hazırlık:\s*/, 'Sınav · ') : `Hafta ${w.week} · ${w.title}`;
    opt.innerText = `${title} · ${w.video_count}`;
    select.appendChild(opt);
  });
}

function renderPlaylist() {
  const container = document.getElementById('playlist-container');
  if (!container) return;
  updateWeekMarkButton();
  container.innerHTML = '';

  let list = getFilteredByWeekVideos();

  if (currentFilter === 'watched') {
    list = list.filter(v => watchedSet.has(v.id));
  } else if (currentFilter === 'unwatched') {
    list = list.filter(v => !watchedSet.has(v.id));
  } else if (currentFilter === 'noted') {
    list = list.filter(v => Boolean(videoNotes[v.id]));
  }

  if (searchQuery) {
    list = list.filter(v => {
      const noteText = (videoNotes[v.id] || '').toLowerCase();
      return v.title.toLowerCase().includes(searchQuery) ||
             v.no.toLowerCase().includes(searchQuery) ||
             v.category.toLowerCase().includes(searchQuery) ||
             noteText.includes(searchQuery);
    });
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="px-6 py-12 text-center text-sm text-[var(--muted)]">
        Bu filtreye uyan ders yok.
      </div>
    `;
    return;
  }

  list.forEach(v => {
    const globalIdx = allVideos.findIndex(x => x.id === v.id);
    const isActive = (globalIdx === activeVideoIndex);
    const isChecked = watchedSet.has(v.id);
    const hasNote = Boolean(videoNotes[v.id]);

    const row = document.createElement('div');
    row.id = 'item-' + v.id;
    row.className = `playlist-row flex items-start gap-3 py-3 px-3 cursor-pointer transition-colors ${isActive ? 'active-video-item' : ''}`;
    if (isActive) row.setAttribute('aria-current', 'true');

    row.onclick = (e) => {
      if (e.target.type !== 'checkbox') {
        playVideoByIndex(globalIdx, true);
      }
    };

    const titleColor = isActive
      ? 'text-[var(--text-strong)]'
      : (isChecked ? 'text-[var(--muted)]' : 'text-[var(--text)]');

    row.innerHTML = `
      <input
        type="checkbox"
        ${isChecked ? 'checked' : ''}
        onchange="toggleVideoWatched('${v.id}')"
        class="cbx"
        title="İzlendi işaretle"
        aria-label="İzlendi işaretle"
      />
      <span class="font-mono text-xs text-[var(--muted)] tabular-nums shrink-0 w-9 pt-px">${v.no}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium leading-snug line-clamp-2 ${titleColor}">${v.title}</p>
        <div class="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span>${v.is_bonus ? 'Sınav' : 'H.' + v.week}</span>
          ${v.category ? `<span class="text-[var(--faint)]">·</span><span class="truncate">${v.category}</span>` : ''}
          ${hasNote ? `<span class="text-[var(--faint)]">·</span><span class="inline-flex items-center gap-1" title="Bu derste notunuz var">${ICONS.note}Not</span>` : ''}
        </div>
      </div>
      ${isActive ? `<span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" title="Oynatılıyor"></span>` : ''}
    `;

    container.appendChild(row);
  });
}

// ==========================================
// 8. POMODORO ÇALIŞMA SAYACI
// ==========================================

function updatePomodoroUI() {
  const mins = String(Math.floor(pomoSeconds / 60)).padStart(2, '0');
  const secs = String(pomoSeconds % 60).padStart(2, '0');
  const el = document.getElementById('pomo-time');
  if (el) el.innerText = `${mins}:${secs}`;
}

function setPomodoroRunningUI(running) {
  const pill = document.getElementById('pomo-pill');
  if (pill) pill.classList.toggle('is-running', running);
}

function togglePomodoro() {
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    setPomodoroRunningUI(false);
  } else {
    pomoRunning = true;
    setPomodoroRunningUI(true);
    pomoInterval = setInterval(() => {
      if (pomoSeconds > 0) {
        pomoSeconds--;
        updatePomodoroUI();
      } else {
        clearInterval(pomoInterval);
        pomoRunning = false;
        pomoSeconds = 25 * 60;
        setPomodoroRunningUI(false);
        updatePomodoroUI();
        alert('🍅 25 dakikalık Pomodoro çalışma süreniz tamamlandı! 5 dakika mola verebilirsiniz.');
      }
    }, 1000);
  }
}

function resetPomodoro(e) {
  if (e) e.stopPropagation();
  clearInterval(pomoInterval);
  pomoRunning = false;
  pomoSeconds = 25 * 60;
  setPomodoroRunningUI(false);
  updatePomodoroUI();
}

// ==========================================
// 9. MODALLAR & KLAVYE KISAYOLLARI
// ==========================================

function toggleTmModal() {
  const modal = document.getElementById('tm-modal');
  if (modal) modal.classList.toggle('hidden');
}

function toggleShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) modal.classList.toggle('hidden');
}

function openModal(id) {
  closeDropdowns();
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// --- Açılır menüler (hız menüsü, üst bar menüsü) ---
// NOT: 'togglePopover' / 'showPopover' / 'hidePopover' adları KULLANILMAMALI. Bunlar tarayıcının
// yerleşik Popover API metotlarıdır; satır içi onclick'te butonun kendi metodu çağrılır ve
// bizim fonksiyonumuz hiç çalışmaz (hız menüsü bu yüzden açılmıyordu).
function toggleDropdown(id, e) {
  if (e) e.stopPropagation();
  const pop = document.getElementById(id);
  if (!pop) return;
  const willOpen = pop.classList.contains('hidden');
  closeDropdowns();
  if (willOpen) {
    pop.classList.remove('hidden');
    document.querySelectorAll(`[data-popover-trigger="${id}"]`).forEach(t => t.setAttribute('aria-expanded', 'true'));
  }
}

function closeDropdowns() {
  document.querySelectorAll('[data-popover]').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('[data-popover-trigger]').forEach(t => t.setAttribute('aria-expanded', 'false'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-popover], [data-popover-trigger]')) closeDropdowns();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDropdowns();
    closeModals();
    return;
  }

  // Input veya Textarea içindeyken kısayolları devre dışı bırak
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return; // tarayıcı kısayollarını (Ctrl+R vb.) engelleme

  const key = e.key.toLowerCase();
  if (e.key === '?') {
    toggleShortcutsModal();
  } else if (e.code === 'Space') {
    e.preventDefault();
    togglePlayPause();
  } else if (key === 'q') {
    setSpeed(1.0);
  } else if (key === 'w') {
    setSpeed(1.25);
  } else if (key === 'e') {
    setSpeed(1.5);
  } else if (key === 'r') {
    setSpeed(2.0);
  } else if (key === 't') {
    handleExtendedSpeed(3.0);
  } else if (key === 'y') {
    toggleTheaterMode();
  } else if (key === 'f') {
    toggleFullscreen();
  } else if (key === 'n') {
    playNextVideo();
  } else if (key === 'p') {
    playPrevVideo();
  } else if (key === 'm') {
    toggleCurrentVideoWatched();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    seekRelative(-10);
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    seekRelative(10);
  } else if (e.key === '>') {
    adjustSpeed(0.25);
  } else if (e.key === '<') {
    adjustSpeed(-0.25);
  }
});

// ==========================================
// 10. OYNATICI ARAYÜZÜ (OVERLAY, SCRUBBER, SES, TAM EKRAN)
// ==========================================

let scrubDragging = false;
let scrubPreview = 0;
let overlayHideTimer = null;
let lastSurfacePointer = 'mouse';

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function updatePlayerUI() {
  const shell = document.getElementById('player-shell');
  if (!shell) return;

  const playing = isPlayingState();
  shell.classList.toggle('is-paused', !playing);

  const playBtn = document.getElementById('ov-play');
  if (playBtn && playBtn.dataset.playing !== String(playing)) {
    playBtn.dataset.playing = String(playing);
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    playBtn.setAttribute('aria-label', playing ? 'Durdur' : 'Oynat');
  }

  const muteBtn = document.getElementById('ov-mute');
  const silent = playerMuted || playerVolume === 0;
  if (muteBtn && muteBtn.dataset.muted !== String(silent)) {
    muteBtn.dataset.muted = String(silent);
    muteBtn.innerHTML = silent ? ICONS.muted : ICONS.volume;
    muteBtn.setAttribute('aria-label', silent ? 'Sesi aç' : 'Sesi kapat');
  }
  const volRange = document.getElementById('ov-volume');
  if (volRange && document.activeElement !== volRange) {
    volRange.value = playerMuted ? 0 : playerVolume;
  }

  renderScrubber();
}

function renderScrubber() {
  const t = scrubDragging ? scrubPreview : playerCurrentTime;
  const d = playerDuration;
  const pct = d > 0 ? Math.min(100, (t / d) * 100) : 0;

  const fill = document.getElementById('scrubber-fill');
  const knob = document.getElementById('scrubber-knob');
  const buffer = document.getElementById('scrubber-buffer');
  if (fill) fill.style.width = pct + '%';
  if (knob) knob.style.left = pct + '%';
  if (buffer) buffer.style.width = Math.min(100, playerLoadedFraction * 100) + '%';

  const cur = document.getElementById('time-current');
  const dur = document.getElementById('time-duration');
  const ovTime = document.getElementById('ov-time');
  if (cur) cur.textContent = formatTime(t);
  if (dur) dur.textContent = formatTime(d);
  if (ovTime) ovTime.textContent = `${formatTime(t)} / ${formatTime(d)}`;

  const scrubber = document.getElementById('scrubber');
  if (scrubber) {
    scrubber.setAttribute('aria-valuemax', String(Math.floor(d)));
    scrubber.setAttribute('aria-valuenow', String(Math.floor(t)));
    scrubber.setAttribute('aria-valuetext', `${formatTime(t)} / ${formatTime(d)}`);
  }
}

function initScrubber() {
  const el = document.getElementById('scrubber');
  const tip = document.getElementById('scrubber-tip');
  if (!el) return;

  const ratioAt = (clientX) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0;
  };

  el.addEventListener('pointerdown', (e) => {
    if (!playerDuration) return;
    scrubDragging = true;
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
    scrubPreview = ratioAt(e.clientX) * playerDuration;
    renderScrubber();
  });

  el.addEventListener('pointermove', (e) => {
    const ratio = ratioAt(e.clientX);
    if (tip) {
      tip.style.left = (ratio * 100) + '%';
      tip.textContent = formatTime(ratio * playerDuration);
    }
    if (scrubDragging) {
      scrubPreview = ratio * playerDuration;
      renderScrubber();
    }
  });

  const finish = () => {
    if (!scrubDragging) return;
    scrubDragging = false;
    el.classList.remove('dragging');
    seekTo(scrubPreview);
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', finish);
}

// Overlay: fare hareket edince görünür, oynarken 2.5 sn hareketsizlikte gizlenir
function showPlayerControls() {
  const shell = document.getElementById('player-shell');
  if (!shell) return;
  shell.classList.add('controls-visible');
  shell.classList.remove('idle');
  clearTimeout(overlayHideTimer);
  overlayHideTimer = setTimeout(() => {
    if (isPlayingState() && !shell.querySelector('.player-bar:hover')) {
      shell.classList.remove('controls-visible');
      shell.classList.add('idle');
    }
  }, 2500);
}

function hidePlayerControls() {
  const shell = document.getElementById('player-shell');
  if (!shell || !isPlayingState()) return;
  clearTimeout(overlayHideTimer);
  shell.classList.remove('controls-visible');
}

function initPlayerOverlay() {
  const shell = document.getElementById('player-shell');
  const surface = document.getElementById('player-surface');
  if (!shell || !surface) return;

  shell.addEventListener('mousemove', showPlayerControls);
  shell.addEventListener('mouseleave', hidePlayerControls);

  surface.addEventListener('pointerdown', (e) => { lastSurfacePointer = e.pointerType; });
  surface.addEventListener('click', () => {
    // Dokunmatikte ilk dokunuş sadece kontrolleri gösterir
    if (lastSurfacePointer === 'touch' && isPlayingState() && !shell.classList.contains('controls-visible')) {
      showPlayerControls();
      return;
    }
    togglePlayPause();
    showPlayerControls();
  });
  surface.addEventListener('dblclick', toggleFullscreen);

  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  updateFullscreenIcon();
  updatePlayerUI();
}

function toggleMute() {
  if (playerMuted || playerVolume === 0) {
    sendYtCommand('unMute');
    if (playerVolume === 0) {
      playerVolume = 50;
      sendYtCommand('setVolume', [50]);
    }
    playerMuted = false;
  } else {
    sendYtCommand('mute');
    playerMuted = true;
  }
  updatePlayerUI();
}

function setPlayerVolume(val) {
  playerVolume = val;
  sendYtCommand('setVolume', [val]);
  if (val > 0 && playerMuted) {
    sendYtCommand('unMute');
    playerMuted = false;
  }
  updatePlayerUI();
}

function toggleFullscreen() {
  const shell = document.getElementById('player-shell');
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  try {
    if (fsEl) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    } else if (shell) {
      const req = shell.requestFullscreen || shell.webkitRequestFullscreen;
      const p = req ? req.call(shell) : null;
      if (p && p.catch) p.catch(() => {});
    }
  } catch (err) {
    console.error('Tam ekran açılamadı:', err);
  }
}

function updateFullscreenIcon() {
  const btn = document.getElementById('ov-fs');
  if (!btn) return;
  const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  btn.innerHTML = isFs ? ICONS.minimize : ICONS.maximize;
  btn.setAttribute('aria-label', isFs ? 'Tam ekrandan çık' : 'Tam ekran');
}

// ==========================================
// 11. UYGULAMA BAŞLATMA (INIT)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  loadStoredState();
  applyTheme(currentTheme);
  applyTheaterMode(isTheater);
  initWeekDropdown();
  updateAutoNextUI();
  updatePomodoroUI();

  const playerFrame = document.getElementById('yt-player');
  if (playerFrame) playerFrame.addEventListener('load', onPlayerFrameLoad);
  initPlayerOverlay();
  initScrubber();

  if (window.location.protocol === 'file:') {
    const warn = document.getElementById('file-protocol-warning');
    if (warn) warn.classList.remove('hidden');
  }

  updateStats();
  setSpeed(currentSpeed);
  playVideoByIndex(activeVideoIndex, false);
});
