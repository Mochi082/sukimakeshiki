
/* ============================
   PREF — ピン位置から都県を自動判定
   ============================ */
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

const PREF_LABELS = {
  tokyo:    '東京都',
  kanagawa: '神奈川県',
  saitama:  '埼玉県',
  chiba:    '千葉県',
  ibaraki:  '茨城県',
  tochigi:  '栃木県',
  gunma:    '群馬県',
};

/* ============================
   写真アップロード
   ============================ */
const photos = [];

function handleFiles(files) {
  if (!files.length) return;
  const f = files[0];
  const reader = new FileReader();
  reader.onload = e => {
    photos[0] = e.target.result;
    renderPhotoGrid();
    updatePreviewImg();
  };
  reader.readAsDataURL(f);
}

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadArea').classList.add('drag-over');
}
function handleDragLeave() {
  document.getElementById('uploadArea').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadArea').classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '';
  photos.forEach((src, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.innerHTML = `
      <img src="${src}" alt="">
      <div class="photo-thumb-del" onclick="removePhoto(${i})"><i class="fa fa-times"></i></div>
    `;
    grid.appendChild(thumb);
  });
  if (photos.length === 0) {
    const add = document.createElement('div');
    add.className = 'photo-add-btn';
    add.innerHTML = '<i class="fa fa-plus"></i>';
    add.onclick = () => document.getElementById('photoInput').click();
    grid.appendChild(add);
  }
}

function removePhoto(i) {
  photos.splice(i, 1);
  document.getElementById('photoInput').value = '';
  renderPhotoGrid();
  updatePreviewImg();
}

function updatePreviewImg() {
  const wrap = document.getElementById('previewImgWrap');
  wrap.innerHTML = photos.length > 0
    ? `<img src="${photos[0]}" alt="">`
    : '<div class="preview-img-placeholder"><i class="fa fa-image"></i></div>';
}

/* ============================
   位置情報 — 場所検索
   ============================ */
let searchTimer = null;

function onLocSearchInput() {
  const val = document.getElementById('locSearchInput').value.trim();
  document.getElementById('locSearchClear').style.display = val ? '' : 'none';
  clearTimeout(searchTimer);
  if (!val) { closeSuggestions(); return; }
  // 300ms デバウンスで候補を取得
  searchTimer = setTimeout(() => fetchSuggestions(val), 300);
}

async function fetchSuggestions(query) {
  try {
    const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=jp&accept-language=ja`;
    const res  = await fetch(url);
    const data = await res.json();
    renderSuggestions(data);
  } catch {
    closeSuggestions();
  }
}

function renderSuggestions(results) {
  const box = document.getElementById('locSuggestions');
  if (!results.length) {
    box.innerHTML = '<div class="loc-sug-empty">候補が見つかりませんでした</div>';
    box.classList.add('open');
    return;
  }
  box.innerHTML = results.map((r, i) => {
    const parts = r.display_name.split(',');
    const name   = parts[0].trim();
    const detail = parts.slice(1, 4).join(',').trim();
    return `
      <div class="loc-suggestion-item" onclick="selectSuggestion(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g, "\\'")}')">
        <i class="fa fa-map-marker-alt sug-icon"></i>
        <div class="sug-body">
          <div class="sug-name">${name}</div>
          <div class="sug-detail">${detail}</div>
        </div>
      </div>`;
  }).join('');
  box.classList.add('open');
}

function selectSuggestion(lat, lng, displayName) {
  closeSuggestions();
  document.getElementById('locSearchInput').value = displayName.split(',')[0].trim();
  document.getElementById('locSearchClear').style.display = '';
  flyAndPin(parseFloat(lat), parseFloat(lng), displayName);
}

async function doLocSearch() {
  const query = document.getElementById('locSearchInput').value.trim();
  if (!query) return;

  const btn = document.getElementById('locSearchBtn');
  btn.classList.add('loading');
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  closeSuggestions();

  try {
    const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=jp&accept-language=ja`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.length) {
      renderSuggestions([]);
    } else if (data.length === 1) {
      selectSuggestion(data[0].lat, data[0].lon, data[0].display_name);
    } else {
      renderSuggestions(data);
    }
  } catch {
    /* 無視 */
  }

  btn.classList.remove('loading');
  btn.innerHTML = '<i class="fa fa-search-location"></i>';
}

function clearLocSearch() {
  document.getElementById('locSearchInput').value = '';
  document.getElementById('locSearchClear').style.display = 'none';
  closeSuggestions();
}

function closeSuggestions() {
  document.getElementById('locSuggestions').classList.remove('open');
}

// マップを飛ばしてピンを立てる（検索結果から呼ぶ）
function flyAndPin(lat, lng, displayName) {
  if (locMap) locMap.flyTo([lat, lng], 14, { duration: 0.8 });
  placePinAt(lat, lng);
  // リバースジオコードは省略してそのまま表示名を使う
  document.getElementById('locationName').textContent = displayName;
}

// 候補以外をクリックしたら閉じる
document.addEventListener('click', e => {
  if (!e.target.closest('#locSuggestions') && !e.target.closest('#locSearchWrap')) {
    closeSuggestions();
  }
});

/* ============================
   位置情報 — クリックでピン設置
   ============================ */
let locMap    = null;
let locMarker = null;
let locLatLng = null;   // { lat, lng } — 投稿データに使用

const pinIcon = () => L.divIcon({
  className: '',
  html: '<div class="loc-pin-inner"></div>',
  iconSize:    [22, 22],
  iconAnchor:  [11, 22],
  popupAnchor: [0, -26],
});

function initLocMap() {
  locMap = L.map('locationMap', {
    center:            [36.0, 139.6],   // 関東中心
    zoom:              9,
    zoomControl:       true,
    attributionControl: false,
  });

  // CartoDB ダークタイル（main.html と同じ）
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd',
  }).addTo(locMap);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd',
  }).addTo(locMap);

  // マップクリック → ピン設置
  locMap.on('click', e => {
    placePinAt(e.latlng.lat, e.latlng.lng);
  });
}

function placePinAt(lat, lng) {
  locLatLng = { lat, lng };

  if (!locMarker) {
    locMarker = L.marker([lat, lng], {
      icon:      pinIcon(),
      draggable: true,
    }).addTo(locMap);

    // ドラッグで微調整
    locMarker.on('dragend', e => {
      const { lat: la, lng: lo } = e.target.getLatLng();
      locLatLng = { lat: la, lng: lo };
      writeLocationInputs(la, lo);
      updateRangeError(la, lo);
      updatePreview();
      reverseGeocode(la, lo);
    });
  } else {
    locMarker.setLatLng([lat, lng]);
  }

  // ヒントオーバーレイを隠す
  document.getElementById('pickHint').classList.add('hidden');

  // 確認バーを表示
  document.getElementById('locationConfirm').classList.add('show');
  document.getElementById('locationName').textContent = '取得中…';
  writeLocationInputs(lat, lng);
  updateRangeError(lat, lng);
  updatePreview();

  // リバースジオコーディング
  reverseGeocode(lat, lng);
}

function updateRangeError(lat, lng) {
  const outOfRange = !detectPref(lat, lng);
  document.getElementById('locRangeError').style.display = outOfRange ? 'flex' : 'none';
}

function writeLocationInputs(lat, lng) {
  document.getElementById('latInput').value  = lat;
  document.getElementById('lngInput').value  = lng;
  document.getElementById('prefInput').value = detectPref(lat, lng) || '';
}

async function reverseGeocode(lat, lng) {
  try {
    const url  = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`;
    const res  = await fetch(url);
    const data = await res.json();
    const name = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById('locationName').textContent = name;
  } catch {
    document.getElementById('locationName').textContent =
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  document.getElementById('addressInput').value = document.getElementById('locationName').textContent;
  updatePreview();
}

function resetLocation() {
  locLatLng = null;
  if (locMarker) { locMap.removeLayer(locMarker); locMarker = null; }
  document.getElementById('pickHint').classList.remove('hidden');
  document.getElementById('locationConfirm').classList.remove('show');
  document.getElementById('locationName').textContent = '取得中…';
  document.getElementById('locRangeError').style.display = 'none';
  document.getElementById('latInput').value  = '';
  document.getElementById('lngInput').value  = '';
  document.getElementById('prefInput').value = '';
  document.getElementById('addressInput').value = '';
  locMap.setView([36.0, 139.6], 9);
  updatePreview();
}

/* ============================
   プレビュー更新
   ============================ */
function updatePreview() {
  const name   = document.getElementById('spotName').value.trim();
  const nameEl = document.getElementById('previewName');
  nameEl.textContent = name || 'スポット名が入ります';
  nameEl.classList.toggle('empty', !name);

  const prefLabel = locLatLng ? PREF_LABELS[detectPref(locLatLng.lat, locLatLng.lng)] : null;
  document.getElementById('previewPrefText').textContent = prefLabel || '場所未選択';
  document.getElementById('previewLoc').classList.toggle('empty', !prefLabel);

  const desc   = document.getElementById('spotDesc').value.trim();
  const descEl = document.getElementById('previewDesc');
  descEl.textContent = desc || '説明が入ります';
  descEl.classList.toggle('empty', !desc);

  const timeVal   = document.getElementById('timeSelect').value;
  const timeTagEl = document.getElementById('previewTimeTag');
  timeTagEl.textContent = timeVal || 'おすすめ時間帯未選択';
  timeTagEl.classList.toggle('empty', !timeVal);

  const levelTagEl = document.getElementById('previewLevelTag');
  levelTagEl.textContent = starVal > 0 ? DIFF_LABELS[starVal] : '難易度未評価';
  levelTagEl.classList.toggle('empty', starVal === 0);

  const selectedFacilities = getSelectedFacilities();
  document.querySelectorAll('#previewAccess .access-icon').forEach(icon => {
    const has = selectedFacilities.includes(icon.dataset.fac);
    icon.classList.toggle('ok', has);
    icon.classList.toggle('ng', !has);
  });
}

/* ============================
   文字数カウント
   ============================ */
function countChars(el, counterId, max) {
  const len = el.value.length;
  const counter = document.getElementById(counterId);
  counter.textContent = `${len} / ${max}`;
  counter.classList.toggle('warn', len >= max * 0.85);
}

/* ============================
   道の難易度評価
   ============================ */
const DIFF_LABELS = ['', '初級', '初中級', '中級', '上級', 'エキスパート'];
let starVal = 0;
function setStars(v) {
  starVal = v;
  const labels = ['', '★ 初級', '★★ 初中級', '★★★ 中級', '★★★★ 上級', '★★★★★ エキスパート'];
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.textContent = parseInt(btn.dataset.v) <= v ? '★' : '☆';
    btn.classList.toggle('active', parseInt(btn.dataset.v) <= v);
  });
  document.getElementById('starLabel').textContent = labels[v] || '未評価';
  document.getElementById('difficultyInput').value = v;
  updatePreview();
}

/* ============================
   フィールドフラッシュ（バリデーション）
   ============================ */
function flashField(id) {
  const el = document.getElementById(id);
  el.style.borderColor = 'rgba(255,80,80,0.7)';
  el.style.boxShadow   = '0 0 0 3px rgba(255,80,80,0.12)';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1800);
}

/* ── 設備トグル ── */
function toggleFacility(btn) {
  btn.classList.toggle('active');
  document.getElementById('facilitiesInput').value = getSelectedFacilities().join(',');
  updatePreview();
}

function getSelectedFacilities() {
  return [...document.querySelectorAll('.facility-btn.active')]
    .map(btn => btn.dataset.fac);
}

/* ============================
   投稿（フォーム送信前チェック）
   ============================ */
function validatePost() {
  // name / time は input[required] / select[required] のブラウザ標準バリデーションに任せる
  const outOfRange = locLatLng && !detectPref(locLatLng.lat, locLatLng.lng);
  if (!locLatLng || outOfRange) {
    // マップカードをフラッシュ & スクロール
    const mapWrap = document.querySelector('.pick-map-wrap');
    mapWrap.style.outline = '2px solid rgba(255,80,80,0.6)';
    mapWrap.style.boxShadow = '0 0 0 4px rgba(255,80,80,0.1)';
    mapWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { mapWrap.style.outline = ''; mapWrap.style.boxShadow = ''; }, 1800);
    if (outOfRange) document.getElementById('locRangeError').style.display = 'flex';
    return false;
  }
  return true;
}

/* ============================
   ドロワー
   ============================ */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

/* ============================
   初期化
   ============================ */
window.addEventListener('load', () => {
  initLocMap();

  const editPost = window.POST_CONFIG && window.POST_CONFIG.editPost;
  if (editPost && editPost.lat != null && editPost.lng != null) {
    locMap.setView([editPost.lat, editPost.lng], 13);
    placePinAt(editPost.lat, editPost.lng);

    if (editPost.difficulty) setStars(editPost.difficulty);

    (editPost.facilities || []).forEach(fac => {
      const btn = document.querySelector(`.facility-btn[data-fac="${fac}"]`);
      if (btn) btn.classList.add('active');
    });
    document.getElementById('facilitiesInput').value = (editPost.facilities || []).join(',');

    if (editPost.photo) {
      photos[0] = editPost.photo;
      renderPhotoGrid();
      updatePreviewImg();
    }

    countChars(document.getElementById('spotName'), 'nameCount', 30);
    countChars(document.getElementById('spotDesc'), 'descCount', 150);
    updatePreview();
  }
});
