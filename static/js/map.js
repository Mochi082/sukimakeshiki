/* =====================================================
   データ定義
   ===================================================== */
const PREF_DATA = {
  gunma:    { name:'群馬県',  spots:143, posts:1089, riders:1567, routes:48,  color:'#3d5a6e' },
  tochigi:  { name:'栃木県',  spots:112, posts:845,  riders:1389, routes:38,  color:'#3d6e5a' },
  ibaraki:  { name:'茨城県',  spots:98,  posts:734,  riders:1203, routes:32,  color:'#5a6e3d' },
  saitama:  { name:'埼玉県',  spots:134, posts:987,  riders:1654, routes:44,  color:'#6e5a3d' },
  tokyo:    { name:'東京都',  spots:245, posts:1832,  riders:3241, routes:86,  color:'#b8943a' },
  chiba:    { name:'千葉県',  spots:156, posts:1124,  riders:1872, routes:52,  color:'#5a3d6e' },
  kanagawa: { name:'神奈川県', spots:189, posts:1456,  riders:2103, routes:62,  color:'#3d4d6e' },
};

/* =====================================================
   状態管理（サーバー連携）
   ===================================================== */
let selectedId = null;

function loadUnlocked() {
  return window.MAP_CONFIG.unlocked;
}
function loadCheckins() {
  return window.MAP_CONFIG.checkins;
}

/* =====================================================
   マップ描画
   ===================================================== */
function renderMap() {
  const unlocked = loadUnlocked();

  Object.keys(PREF_DATA).forEach(id => {
    const path  = document.getElementById('path-' + id);
    const label = document.getElementById('label-' + id);
    const lock  = document.getElementById('lock-' + id);

    if (!path) return;
    const isUnlocked = unlocked.includes(id);

    if (isUnlocked) {
      path.classList.remove('locked');
      path.classList.add('unlocked');
      path.style.fill = PREF_DATA[id].color;
      if (label) {
        label.classList.remove('locked-label');
      }
      if (lock) lock.style.display = 'none';
    } else {
      path.classList.add('locked');
      path.classList.remove('unlocked');
      path.style.fill = '';
      if (label) label.classList.add('locked-label');
      if (lock) lock.style.display = '';
    }

    // 選択状態
    if (id === selectedId) {
      path.classList.add('selected');
    } else {
      path.classList.remove('selected');
    }
  });

  updateProgress();
}

/* =====================================================
   進捗バー
   ===================================================== */
function updateProgress() {
  const unlocked = loadUnlocked();
  const count = unlocked.length;
  const total = Object.keys(PREF_DATA).length;
  const pct   = Math.round(count / total * 100);

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent =
    count + ' / ' + total + ' エリア解除';
}

/* =====================================================
   エリア選択
   ===================================================== */
function selectPref(id) {
  selectedId = id;
  renderMap();
  showDetail(id);
}

function showDetail(id) {
  const data     = PREF_DATA[id];
  const unlocked = loadUnlocked();
  const checkins = loadCheckins();
  const isUnlocked = unlocked.includes(id);

  document.getElementById('selectHint').style.display  = 'none';
  const detail = document.getElementById('prefDetail');
  detail.style.display = 'flex';

  // 名前
  document.getElementById('detailName').textContent = data.name;

  // ステータスバッジ
  const statusEl = document.getElementById('detailStatus');
  if (isUnlocked) {
    statusEl.className = 'pref-status unlocked';
    statusEl.innerHTML = '<i class="fa fa-check"></i> 解除済み';
  } else {
    statusEl.className = 'pref-status locked';
    statusEl.innerHTML = '<i class="fa fa-lock"></i> 未解除';
  }

  // 統計（未解除はぼかす）
  const blur = !isUnlocked;
  ['Spots','Posts','Riders','Routes'].forEach(k => {
    document.getElementById('stat' + k).classList.toggle('blurred', blur);
  });
  document.getElementById('valSpots').textContent  = data.spots.toLocaleString();
  document.getElementById('valPosts').textContent  = data.posts.toLocaleString();
  document.getElementById('valRiders').textContent = data.riders.toLocaleString();
  document.getElementById('valRoutes').textContent = data.routes.toLocaleString();

  // チェックインボタン
  const btn   = document.getElementById('btnCheckin');
  const icon  = document.getElementById('checkinIcon');
  const label = document.getElementById('checkinLabel');
  const dateEl= document.getElementById('checkinDate');

  if (isUnlocked) {
    btn.className = 'btn-checkin done';
    icon.className = 'fa fa-check';
    label.textContent = 'チェックイン済み';
    btn.disabled = true;
    if (checkins[id]) {
      dateEl.textContent = 'チェックイン日: ' + checkins[id];
    } else {
      dateEl.textContent = '';
    }
  } else if ((window.MAP_CONFIG.ticketCount || 0) < 1) {
    btn.className = 'btn-checkin';
    btn.disabled = true;
    icon.className = 'fa fa-ticket';
    label.textContent = 'チケットが足りません';
    dateEl.textContent = '';
  } else {
    btn.className = 'btn-checkin available';
    btn.disabled = false;
    icon.className = 'fa fa-location-arrow';
    label.textContent = 'このエリアにチェックイン';
    dateEl.textContent = '';
  }
}

/* =====================================================
   チェックイン（解除）
   ===================================================== */
async function doCheckin() {
  if (!selectedId) return;
  const unlocked = loadUnlocked();
  if (unlocked.includes(selectedId)) return;

  const res = await fetch('/map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `pref=${encodeURIComponent(selectedId)}`,
  });
  const data = await res.json();

  if (!res.ok) {
    if (data.error === 'no_ticket') showToast('🎫 チケットが足りません');
    return;
  }

  // 解除状態を反映
  window.MAP_CONFIG.unlocked.push(selectedId);
  window.MAP_CONFIG.checkins[selectedId] = data.date;
  updateTicketBadge(data.ticket_count);

  // アニメーション
  const path = document.getElementById('path-' + selectedId);
  if (path) {
    path.classList.add('unlocking');
    setTimeout(() => path.classList.remove('unlocking'), 1200);
  }

  // 画面更新
  renderMap();
  showDetail(selectedId);
  showToast('🎉 ' + PREF_DATA[selectedId].name + ' を解除しました！');
}

function updateTicketBadge(count) {
  if (count == null) return;
  window.MAP_CONFIG.ticketCount = count;
  const countEl = document.getElementById('drawerTicketCount');
  if (countEl) countEl.textContent = count;
}

/* =====================================================
   トースト通知
   ===================================================== */
function showToast(msg) {
  const toast = document.getElementById('unlockToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* =====================================================
   駅名・地名検索
   ===================================================== */

/* 都県の大まかなバウンディングボックス [南, 北, 西, 東] */
const PREF_BOUNDS = {
  tokyo:    [35.50, 35.90, 138.94, 139.92],
  kanagawa: [35.10, 35.70, 138.94, 139.78],
  saitama:  [35.75, 36.35, 138.72, 139.92],
  chiba:    [34.90, 36.10, 139.72, 140.92],
  ibaraki:  [35.72, 36.85, 139.67, 140.92],
  tochigi:  [36.18, 37.20, 139.32, 140.34],
  gunma:    [36.10, 37.00, 138.40, 139.55],
};

function detectPref(lat, lng) {
  for (const [id, [s, n, w, e]] of Object.entries(PREF_BOUNDS)) {
    if (lat >= s && lat <= n && lng >= w && lng <= e) return id;
  }
  return null;
}

let areaSearchTimer = null;

function onAreaSearchInput() {
  const val = document.getElementById('areaSearchInput').value.trim();
  document.getElementById('areaSearchClear').style.display = val ? '' : 'none';
  clearTimeout(areaSearchTimer);
  if (!val) { closeAreaSuggestions(); return; }
  areaSearchTimer = setTimeout(() => fetchAreaSuggestions(val), 300);
}

async function fetchAreaSuggestions(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=jp&accept-language=ja`;
  const res  = await fetch(url);
  const data = await res.json();
  renderAreaSuggestions(data);
}

function renderAreaSuggestions(results) {
  const box = document.getElementById('areaSuggestions');
  if (!results.length) {
    box.innerHTML = '<div class="area-sug-empty">候補が見つかりませんでした</div>';
    box.classList.add('open');
    return;
  }
  box.innerHTML = results.map(r => {
    const parts  = r.display_name.split(',');
    const name   = parts[0].trim();
    const detail = parts.slice(1, 3).join(',').trim();
    return `
      <div class="area-sug-item" onclick="selectAreaSuggestion(${r.lat}, ${r.lon}, '${name.replace(/'/g,"\\'")}')">
        <i class="fa fa-map-marker-alt area-sug-icon"></i>
        <div>
          <div class="area-sug-name">${name}</div>
          <div class="area-sug-detail">${detail}</div>
        </div>
      </div>`;
  }).join('');
  box.classList.add('open');
}

function selectAreaSuggestion(lat, lng, name) {
  closeAreaSuggestions();
  document.getElementById('areaSearchInput').value = name;
  document.getElementById('areaSearchClear').style.display = '';

  const prefId = detectPref(parseFloat(lat), parseFloat(lng));
  if (prefId) {
    selectPref(prefId);
    showToast(`📍 ${name} → ${PREF_DATA[prefId].name}`);
  } else {
    showToast('関東エリア外の場所です');
  }
}

function doAreaSearch() {
  const query = document.getElementById('areaSearchInput').value.trim();
  if (query) fetchAreaSuggestions(query);
}

function clearAreaSearch() {
  document.getElementById('areaSearchInput').value = '';
  document.getElementById('areaSearchClear').style.display = 'none';
  closeAreaSuggestions();
}

function closeAreaSuggestions() {
  document.getElementById('areaSuggestions').classList.remove('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#areaSuggestions') && !e.target.closest('#areaSearchBar')) {
    closeAreaSuggestions();
  }
});

/* =====================================================
   ドロワー
   ===================================================== */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

/* =====================================================
   初期化
   ===================================================== */
window.addEventListener('load', () => {
  renderMap();

  // ドロワーのアクティブリンク
  document.querySelectorAll('.drawer-menu a').forEach(a => {
    if (a.href === location.href) a.classList.add('active');
  });
});
