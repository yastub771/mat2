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
let playerState = -1; // -1: unstarted, 0: ended, 1: playing, 2: paused

// Pomodoro Sayacı Durumu
let pomoSeconds = 25 * 60;
let pomoRunning = false;
let pomoInterval = null;

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
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    if (icon) icon.innerText = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    if (icon) icon.innerText = '🌙';
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
  const icon = document.getElementById('theater-icon');
  if (isTheater) {
    body.classList.add('theater-active');
    if (text) text.innerText = 'Daralt';
    if (icon) icon.innerText = '⊟';
  } else {
    body.classList.remove('theater-active');
    if (text) text.innerText = 'Geniş Ekran';
    if (icon) icon.innerText = '⛶';
  }
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

function togglePlayPause() {
  if (playerState === 1) {
    sendYtCommand('pauseVideo');
  } else {
    sendYtCommand('playVideo');
  }
}

function seekRelative(deltaSeconds) {
  const target = Math.max(0, (playerCurrentTime || 0) + deltaSeconds);
  playerCurrentTime = target;
  sendYtCommand('seekTo', [target, true]);
}

window.addEventListener('message', (e) => {
  if (!e.data) return;

  // 1. Tampermonkey Handshake
  if (e.data.type === 'CALCULUS_TAMPERMONKEY_READY') {
    if (!isTampermonkeyReady) {
      isTampermonkeyReady = true;
      const dot = document.getElementById('tm-dot');
      const text = document.getElementById('tm-text');
      const btn = document.getElementById('tm-status-btn');
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      if (text) {
        text.innerText = '3x Aktif (TM)';
        text.className = 'text-[11px] text-emerald-500 font-bold';
      }
      if (btn) btn.className = 'p-1.5 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs transition flex items-center gap-1.5 font-medium';
    }
    setSpeed(currentSpeed);
    return;
  }

  // 2. YouTube IFrame postMessage Events
  if (typeof e.data === 'string') {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event === 'infoDelivery' && msg.info) {
        if (typeof msg.info.currentTime === 'number') {
          playerCurrentTime = msg.info.currentTime;
        }
        if (typeof msg.info.playerState === 'number') {
          handlePlayerStateChange(msg.info.playerState);
        }
      } else if (msg.event === 'onStateChange' && typeof msg.info === 'number') {
        handlePlayerStateChange(msg.info);
      }
    } catch (err) {
      // JSON olmayan mesajları yoksay
    }
  }
});

function handlePlayerStateChange(newState) {
  const prevState = playerState;
  playerState = newState;

  // Video bittiğinde (0 = ended)
  if (newState === 0 && prevState !== 0) {
    const currentVideo = allVideos[activeVideoIndex];
    if (currentVideo && !watchedSet.has(currentVideo.id)) {
      watchedSet.add(currentVideo.id);
      saveWatchedState();
      renderPlaylist();
    }
    if (autoNextEnabled && activeVideoIndex < allVideos.length - 1) {
      setTimeout(() => {
        playNextVideo();
      }, 1200);
    }
  }
}

function setSpeed(rate) {
  currentSpeed = Math.round(rate * 100) / 100;
  saveSpeedState();

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

  // Arayüz güncellemeleri
  const badge = document.getElementById('current-speed-badge');
  const slider = document.getElementById('speed-slider');
  if (badge) badge.innerText = currentSpeed + 'x';
  if (slider) slider.value = currentSpeed;

  document.querySelectorAll('.speed-btn').forEach(btn => {
    const bSpeed = parseFloat(btn.getAttribute('data-speed'));
    if (Math.abs(bSpeed - currentSpeed) < 0.05) {
      btn.className = 'speed-btn px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-fg)] transition shadow-sm';
    } else {
      btn.className = 'speed-btn px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text)] transition';
    }
  });
}

function handleExtendedSpeed(rate) {
  setSpeed(rate);
  if (!isTampermonkeyReady) {
    toggleTmModal();
  }
}

function handleSliderChange(val) {
  setSpeed(val);
  if (val > 2.0 && !isTampermonkeyReady) {
    toggleTmModal();
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
  playerState = -1;

  const v = allVideos[index];
  saveCurrentVideoState(v.id);

  const iframe = document.getElementById('yt-player');
  if (iframe) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${v.yt_id}?enablejsapi=1&autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1`;
    iframe.src = embedUrl;

    setTimeout(() => {
      initYtListening();
      setSpeed(currentSpeed);
    }, 800);
  }

  updateCurrentVideoDetails();
  renderPlaylist();

  setTimeout(() => {
    const activeElem = document.getElementById('item-' + v.id);
    if (activeElem) {
      activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  if (autoNextEnabled) {
    btn.className = 'text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold transition';
    btn.innerText = 'Otomatik Geçiş: Açık';
  } else {
    btn.className = 'text-[11px] px-2 py-0.5 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition';
    btn.innerText = 'Otomatik Geçiş: Kapalı';
  }
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

function toggleWeekWatched() {
  const targetVideos = getFilteredByWeekVideos();
  const allWatched = targetVideos.every(v => watchedSet.has(v.id));
  targetVideos.forEach(v => {
    if (allWatched) watchedSet.delete(v.id);
    else watchedSet.add(v.id);
  });
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
    if (!btn) return;
    if (name === f) {
      btn.className = 'px-2 py-1 rounded-lg text-[11px] font-semibold bg-[var(--primary)] text-[var(--primary-fg)]';
    } else {
      btn.className = 'px-2 py-1 rounded-lg text-[11px] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text)]';
    }
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
  if (txt) txt.innerText = `${pct}% (${watchedCurriculum}/${totalCurr})`;
  if (badge) badge.innerText = `${watchedSet.size} / ${allVideos.length} Toplam`;
}

function updateCurrentVideoDetails() {
  const v = allVideos[activeVideoIndex];
  if (!v) return;

  document.getElementById('current-video-title').innerText = v.title;
  document.getElementById('current-week-title').innerText = v.week_title;
  document.getElementById('current-week-badge').innerText = v.is_bonus ? `Sınav Özel` : `Hafta ${v.week}`;
  document.getElementById('current-scope-badge').innerText = v.scope;
  document.getElementById('current-no-badge').innerText = v.no;

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

  if (isWatched) {
    markBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 transition flex items-center gap-2';
    markIcon.innerText = '✅';
    markText.innerText = 'İzlendi Olarak İşaretlendi';
  } else {
    markBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text)] transition flex items-center gap-2';
    markIcon.innerText = '⬜';
    markText.innerText = 'İzlendi Olarak İşaretle';
  }

  document.getElementById('prev-video-btn').disabled = (activeVideoIndex === 0);
  document.getElementById('next-video-btn').disabled = (activeVideoIndex === allVideos.length - 1);
}

function initWeekDropdown() {
  const select = document.getElementById('week-select');
  if (!select) return;
  const curriculumCount = allVideos.filter(v => !v.is_bonus).length;
  select.innerHTML = `
    <option value="curriculum">📚 13 Haftalık Ana Müfredat (${curriculumCount} Video)</option>
    <option value="all">🎯 Tüm Videolar + Sınav Hazırlık (${allVideos.length} Video)</option>
  `;
  weeksData.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.week.toString();
    const prefix = w.is_bonus ? '🔥 ' : `Hafta ${w.week}: `;
    opt.innerText = `${prefix}${w.title} (${w.video_count} Video)`;
    select.appendChild(opt);
  });
}

function renderPlaylist() {
  const container = document.getElementById('playlist-container');
  if (!container) return;
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
      <div class="p-8 text-center text-xs text-[var(--muted)]">
        Seçilen filtreye uygun video bulunamadı.
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
    row.className = `p-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-[var(--border)]/40 transition text-xs border-l-2 ${isActive ? 'active-video-item border-l-indigo-500' : 'border-l-transparent'} ${isChecked && !isActive ? 'opacity-60' : ''}`;

    row.onclick = (e) => {
      if (e.target.type !== 'checkbox') {
        playVideoByIndex(globalIdx, true);
      }
    };

    row.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <input 
          type="checkbox" 
          ${isChecked ? 'checked' : ''} 
          onchange="toggleVideoWatched('${v.id}')" 
          class="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
          title="İzlendi işaretle"
        />
        <span class="font-mono text-[11px] font-semibold text-[var(--muted)] shrink-0 w-9">${v.no}</span>
        <div class="min-w-0">
          <p class="font-medium truncate text-[var(--text)] ${isActive ? 'text-indigo-500 font-bold' : ''}">
            ${v.title}
          </p>
          <div class="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
            <span>${v.is_bonus ? 'Sınav Özel' : 'H.' + v.week}</span>
            ${v.category ? `<span>• ${v.category}</span>` : ''}
            ${hasNote ? `<span class="text-amber-500 font-semibold">• 📝 Not</span>` : ''}
          </div>
        </div>
      </div>

      <div class="shrink-0 flex items-center gap-1">
        ${isActive ? `
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500 text-white animate-pulse">
            Oynuyor
          </span>
        ` : ''}
      </div>
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

function togglePomodoro() {
  const btn = document.getElementById('pomo-btn');
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    if (btn) btn.classList.remove('border-emerald-500', 'text-emerald-500');
  } else {
    pomoRunning = true;
    if (btn) btn.classList.add('border-emerald-500', 'text-emerald-500');
    pomoInterval = setInterval(() => {
      if (pomoSeconds > 0) {
        pomoSeconds--;
        updatePomodoroUI();
      } else {
        clearInterval(pomoInterval);
        pomoRunning = false;
        pomoSeconds = 25 * 60;
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
  const btn = document.getElementById('pomo-btn');
  if (btn) btn.classList.remove('border-emerald-500', 'text-emerald-500');
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

window.addEventListener('keydown', (e) => {
  // Input veya Textarea içindeyken kısayolları devre dışı bırak
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  const key = e.key.toLowerCase();
  if (e.code === 'Space') {
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
  } else if (key === 'f') {
    toggleTheaterMode();
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
// 10. UYGULAMA BAŞLATMA (INIT)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  loadStoredState();
  applyTheme(currentTheme);
  applyTheaterMode(isTheater);
  initWeekDropdown();
  updateAutoNextUI();
  updatePomodoroUI();

  if (window.location.protocol === 'file:') {
    const warn = document.getElementById('file-protocol-warning');
    if (warn) warn.classList.remove('hidden');
  }

  updateStats();
  setSpeed(currentSpeed);
  playVideoByIndex(activeVideoIndex, false);
});
