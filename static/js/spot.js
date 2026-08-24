/* サーバー側（DB）から渡されたユーザー投稿一覧 */
const USER_POSTS = window.SPOT_CONFIG.userPosts;

/* ── マップ拡大／縮小 ── */
let leafletMap = null;
const markerMap = {}; // spotId → { marker, sp }

function toggleMapExpand() {
  const panel = document.querySelector('.map-panel');
  const btn   = document.querySelector('.map-expand-btn i');
  const expanded = panel.classList.toggle('expanded');

  btn.className = expanded ? 'fa fa-compress-alt' : 'fa fa-expand-alt';

  // Leaflet にサイズ変更を通知（少し遅らせてDOMが確定してから）
  if (leafletMap) {
    setTimeout(() => leafletMap.invalidateSize(), 50);
  }

  // ESC キーで閉じられるように
  if (expanded) {
    document.addEventListener('keydown', closeOnEsc);
  } else {
    document.removeEventListener('keydown', closeOnEsc);
  }
}

function closeOnEsc(e) {
  if (e.key === 'Escape') toggleMapExpand();
}


/* ── Spots Panel Toggle ── */
function toggleSpotsPanel() {
  const panel = document.getElementById('spotsFloatPanel');
  const btn   = document.getElementById('panelToggleBtn');
  const collapsed = panel.classList.toggle('collapsed');
  btn.classList.toggle('collapsed', collapsed);
  btn.title = collapsed ? 'パネルを開く' : 'パネルを閉じる';
  if (leafletMap) setTimeout(() => leafletMap.invalidateSize(), 360);
}

/* ── Drawer ── */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

/* ── Distance slider ── */
const slider = document.getElementById('distSlider');
const distVal = document.getElementById('distVal');
if (slider) slider.addEventListener('input', () => { distVal.textContent = slider.value; });

/* ── Sort tabs ── */
document.querySelectorAll('.sort-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ── View toggles ── */
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ── エリア解除フィルター ── */
function getUnlocked() {
  return (window.SPOT_CONFIG && window.SPOT_CONFIG.unlocked);
}

const PREF_ID_TO_NAME = {
  gunma: '群馬県', tochigi: '栃木県', ibaraki: '茨城県',
  saitama: '埼玉県', tokyo: '東京都', chiba: '千葉県', kanagawa: '神奈川県',
};

/* カスタムドロップダウン */
let _selectedArea = '';

function buildAreaDropdown() {
  const unlocked = getUnlocked();
  const panel = document.getElementById('areaDropdownPanel');
  if (!panel) return;
  panel.innerHTML = '';

  const all = document.createElement('div');
  all.className = 'area-dropdown-item selected';
  all.dataset.value = '';
  all.innerHTML = '<span class="item-dot"></span>すべて';
  all.onclick = () => selectArea('', 'すべて');
  panel.appendChild(all);

  unlocked.forEach(id => {
    const item = document.createElement('div');
    item.className = 'area-dropdown-item';
    item.dataset.value = id;
    item.innerHTML = `<span class="item-dot"></span>${PREF_ID_TO_NAME[id] || id}`;
    item.onclick = () => selectArea(id, PREF_ID_TO_NAME[id] || id);
    panel.appendChild(item);
  });
}

function selectArea(value, label) {
  _selectedArea = value;
  document.getElementById('areaSelDisplay').textContent = label;
  document.querySelectorAll('.area-dropdown-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.value === value);
  });
  closeAreaDropdown();
  applyAreaFilter();
}

function toggleAreaDropdown(e) {
  e.stopPropagation();
  const panel = document.getElementById('areaDropdownPanel');
  const chevron = document.getElementById('areaChevron');
  const bar = document.getElementById('searchBarWrap');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    closeAreaDropdown();
  } else {
    panel.classList.add('open');
    chevron.classList.add('open');
    bar.classList.add('dropdown-open');
  }
}

function closeAreaDropdown() {
  document.getElementById('areaDropdownPanel')?.classList.remove('open');
  document.getElementById('areaChevron')?.classList.remove('open');
  document.getElementById('searchBarWrap')?.classList.remove('dropdown-open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#areaSelectWrap')) closeAreaDropdown();
});

function applyAreaFilter() {
  const unlocked = getUnlocked();
  const selected = _selectedArea;
  const cards = document.querySelectorAll('.spot-card[data-prefecture]');
  let visibleCount = 0;

  cards.forEach(card => {
    const pref = card.dataset.prefecture;
    const inUnlocked = unlocked.includes(pref);
    const matchesSel = !selected || pref === selected;
    if (inUnlocked && matchesSel) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // 件数更新
  const countEl = document.querySelector('.count-num');
  if (countEl) countEl.textContent = visibleCount;

  // 空状態表示
  const list = document.querySelector('.spot-list');
  let emptyEl = document.getElementById('emptyState');
  if (visibleCount === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.id = 'emptyState';
      emptyEl.innerHTML = `
        <div style="text-align:center;padding:60px 24px;color:rgba(255,255,255,0.35);">
          <div style="font-size:40px;margin-bottom:16px;">🔒</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:10px;">スポットがありません</div>
          <div style="font-size:13px;line-height:1.7;">
            解除済みエリアのスポットのみ表示されます。<br>
            <a href="${window.SPOT_CONFIG.mapUrl}" style="color:rgba(255,255,255,0.6);text-decoration:underline;">エリアを解除する →</a>
          </div>
        </div>`;
      list.prepend(emptyEl);
    }
  } else {
    if (emptyEl) emptyEl.remove();
  }
}

/* ── Card animation ── */
window.addEventListener('load', () => {
  buildAreaDropdown(); // 解除済みエリアのみドロップダウンに表示
  applyAreaFilter(); // エリアフィルターを適用（カード数も更新）
  document.querySelectorAll('.spot-card').forEach((card, i) => {
    if (card.style.display !== 'none') {
      setTimeout(() => card.classList.add('visible'), i * 100);
    }
  });
});

/* 都県名 → 内部ID のマッピング */
const PREF_NAME_MAP = {
  '群馬県': 'gunma',
  '栃木県': 'tochigi',
  '茨城県': 'ibaraki',
  '埼玉県': 'saitama',
  '千葉県': 'chiba',
  '東京都': 'tokyo',
  '神奈川県': 'kanagawa',
};

/* 都県の中心（ロックアイコン表示位置） */
const PREF_CENTERS = {
  gunma:    [36.57, 138.85],
  tochigi:  [36.57, 139.80],
  ibaraki:  [36.28, 140.55],
  saitama:  [36.00, 139.40],
  tokyo:    [35.67, 139.45],
  chiba:    [35.40, 140.35],
  kanagawa: [35.30, 139.38],
};

/* ── Leaflet Map ── */
document.addEventListener('DOMContentLoaded', () => {
  const KANTO_BOUNDS = L.latLngBounds(
    [34.7, 138.0],  // 南西端
    [37.2, 141.2]   // 北東端
  );

  leafletMap = L.map('leaflet-map', {
    center:              [35.68, 139.75],
    zoom:                11,
    minZoom:             8,
    maxZoom:             14,
    maxBounds:           KANTO_BOUNDS,
    maxBoundsViscosity:  1.0,   // 範囲外にスクロール不可
    zoomControl:         true,
  });

  /* ラベル専用ペイン（z-index 350 = オーバーレイ 400 の下） */
  leafletMap.createPane('labelsPane');
  leafletMap.getPane('labelsPane').style.zIndex = 350;
  leafletMap.getPane('labelsPane').style.pointerEvents = 'none';

  /* ベースタイル（ESRI 衛星写真） */
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  }).addTo(leafletMap);

  /* ラベルタイル（日本語）— オーバーレイの下に配置 */
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '',
    maxZoom: 19,
    subdomains: 'abcd',
    pane: 'labelsPane',
  }).addTo(leafletMap);

  const unlocked = getUnlocked();

  /* ロックアイコンを先に配置（GeoJSONと独立） */
  Object.entries(PREF_CENTERS).forEach(([id, center]) => {
    if (unlocked.includes(id)) return;
    L.marker(center, {
      icon: L.divIcon({
        html: `<div class="lock-marker">🔒</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], className: '',
      }),
      interactive: false,
      zIndexOffset: 100,
    }).addTo(leafletMap);
  });

  /* GeoJSON を fetch して
     ① 世界マスク（穴 = 関東都県の実形状）
     ② ロック中都県のオーバーレイ
     を同時に生成                              */
  fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
    .then(r => r.json())
    .then(data => {
      const kantoFeatures = data.features.filter(f =>
        f.properties && PREF_NAME_MAP[f.properties.nam_ja] !== undefined
      );

      /* 世界マスク（関東以外を隠す） */
      const worldRing = [[-90,-180],[-90,180],[90,180],[90,-180]];
      const holes = [];
      kantoFeatures.forEach(f => {
        const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
        polys.forEach(poly => holes.push(poly[0].map(([lng, lat]) => [lat, lng])));
      });
      L.polygon([worldRing, ...holes], {
        color: 'none', fillColor: '#1a2030', fillOpacity: 0.97, interactive: false,
      }).addTo(leafletMap);

      /* 都県境界線 */
      L.geoJSON(
        { type: 'FeatureCollection', features: kantoFeatures },
        {
          style: feature => {
            const id = PREF_NAME_MAP[feature.properties.nam_ja];
            const locked = !unlocked.includes(id);
            return {
              fillOpacity: 0, fillColor: 'transparent',
              color: locked ? 'rgba(100,120,160,0.35)' : 'rgba(0,0,0,0.08)',
              weight: 1,
            };
          },
          interactive: false,
        }
      ).addTo(leafletMap);

      /* ── ロックエリア オーバーレイ ── */
      L.geoJSON(
        { type: 'FeatureCollection', features: kantoFeatures },
        {
          style: feature => {
            const id = PREF_NAME_MAP[feature.properties.nam_ja];
            const locked = !unlocked.includes(id);
            return locked ? {
              fillColor:   '#1a2030',
              fillOpacity: 0.78,
              color:       'rgba(255,255,255,0.15)',
              weight:      1,
            } : {
              fillOpacity: 0,
              color:       'rgba(255,255,255,0.1)',
              weight:      0.5,
            };
          },
          interactive: false,
        }
      ).addTo(leafletMap);
    })
    .catch(() => {
      // フォールバック：近似ポリゴン（ネット接続なし時）
      console.warn('GeoJSON取得失敗 — 近似ポリゴンで代替');
      const worldRing = [[-90,-180],[-90,180],[90,180],[90,-180]];
      const kantoHole = [
        [37.00,138.40],[37.00,140.25],[36.85,140.92],
        [34.90,140.92],[34.90,139.82],[35.12,138.87],
        [35.85,138.55],[36.20,138.40],
      ];
      L.polygon([worldRing, kantoHole], {
        color:'none', fillColor:'#0a0e16', fillOpacity:0.85, interactive:false,
      }).addTo(leafletMap);
    });

  /* ユーザー投稿スポットのマーカーを追加 */
  addUserMarkers(unlocked);
});

/* ============================
   ユーザー投稿 — DB連携（カードはサーバー側でレンダリング済み）
   ============================ */

/* ゴールドのマップピン（ユーザー投稿用） */
function makeUserIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 22 14 22S28 23.63 28 14C28 6.27 21.73 0 14 0z"
            fill="rgba(200,164,90,0.75)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5" fill="#fff"/>
    </svg>`;
  return L.divIcon({ html: svg, iconSize: [28,36], iconAnchor: [14,36], popupAnchor: [0,-38], className: '' });
}

/* マップピンを追加（マップ初期化後に呼ぶ） */
function addUserMarkers(unlocked) {
  if (!leafletMap) return;
  USER_POSTS.forEach(post => {
    if (!unlocked.includes(post.pref_key)) return;
    const marker = L.marker([post.lat, post.lng], { icon: makeUserIcon() }).addTo(leafletMap);
    const isMine = post.user_id === window.SPOT_CONFIG.currentUserId;
    marker.bindPopup(`
      <div class="map-popup">
        <div class="mp-name">${post.name}</div>
        ${isMine ? '<div class="mp-rating" style="color:#c8a45a;">★ 自分の投稿</div>' : ''}
      </div>
    `, { className: 'dark-popup' });

    const spotId = `user-${post.id}`;
    markerMap[spotId] = { marker, sp: post };

    // ピンクリック → 対応カードにスクロール＆フォーカス
    marker.on('click', () => {
      const card = document.querySelector(`.spot-card[data-spot-id="${spotId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        card.classList.add('card-focus');
        setTimeout(() => card.classList.remove('card-focus'), 1200);
      }
    });
  });
}

/* ============================
   マップ内 駅名・地名検索 (Nominatim)
   ============================ */
const KANTO_BOUNDS_BOX = '138.0,34.7,141.2,37.2'; // minLng,minLat,maxLng,maxLat
let mapSearchTimer = null;

function onMapSearchInput() {
  const val = document.getElementById('mapSearchInput').value.trim();
  document.getElementById('mapSearchClear').style.display = val ? '' : 'none';
  clearTimeout(mapSearchTimer);
  if (val.length < 2) {
    closeMapSuggestions();
    return;
  }
  mapSearchTimer = setTimeout(() => fetchMapSuggestions(val), 350);
}

async function fetchMapSuggestions(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=jp&viewbox=${KANTO_BOUNDS_BOX}&bounded=1&accept-language=ja`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'ja' } });
    const data = await res.json();
    renderMapSuggestions(data);
  } catch { closeMapSuggestions(); }
}

function renderMapSuggestions(results) {
  const box = document.getElementById('mapSearchSuggestions');
  if (!results.length) {
    box.innerHTML = `<div class="map-sug-empty">見つかりませんでした</div>`;
    box.classList.add('open');
    return;
  }
  box.innerHTML = results.map((r, i) => {
    const name = r.display_name.split(',')[0];
    const detail = r.display_name.split(',').slice(1, 3).join(',').trim();
    return `<div class="map-sug-item" onclick="selectMapSuggestion(${r.lat},${r.lon},'${name.replace(/'/g,"\\'")}')">
      <i class="fa fa-map-marker-alt map-sug-icon"></i>
      <div><div class="map-sug-name">${name}</div><div class="map-sug-detail">${detail}</div></div>
    </div>`;
  }).join('');
  box.classList.add('open');
}

function selectMapSuggestion(lat, lng, name) {
  if (!leafletMap) return;
  leafletMap.setView([lat, lng], 13);
  document.getElementById('mapSearchInput').value = name;
  document.getElementById('mapSearchClear').style.display = '';
  closeMapSuggestions();
}

function clearMapSearch() {
  document.getElementById('mapSearchInput').value = '';
  document.getElementById('mapSearchClear').style.display = 'none';
  closeMapSuggestions();
}

function closeMapSuggestions() {
  document.getElementById('mapSearchSuggestions').classList.remove('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#mapSearchBar') && !e.target.closest('#mapSearchSuggestions')) {
    closeMapSuggestions();
  }
});

/* ── Spot Detail Modal ── */
let _modalSourceCard = null;

function openSpotModal(cardEl) {
  _modalSourceCard = cardEl;

  const img         = cardEl.querySelector('.card-thumb img');
  const name        = cardEl.querySelector('.card-name')?.textContent || '';
  const locEl       = cardEl.querySelector('.card-location');
  const locText     = locEl ? locEl.textContent.trim() : '';
  const desc        = cardEl.querySelector('.card-desc')?.textContent || '';
  const tagsHTML    = cardEl.querySelector('.card-tags')?.innerHTML || '';
  const metaHTML    = cardEl.querySelector('.card-meta')?.innerHTML || '';
  const accessHTML  = cardEl.querySelector('.card-access')?.innerHTML || '';
  const favActive   = cardEl.querySelector('.fav-btn')?.classList.contains('active');
  const postId      = cardEl.dataset.postId;

  document.getElementById('modalImg').src          = img?.src || '';
  document.getElementById('modalImg').style.display    = img?.src ? '' : 'none';
  document.getElementById('modalNoImg').style.display  = img?.src ? 'none' : '';
  document.getElementById('modalName').textContent = name;
  document.getElementById('modalLoc').innerHTML    = `<i class="fa fa-map-marker-alt"></i> ${locText}`;
  document.getElementById('modalDesc').textContent        = desc;
  document.getElementById('modalTags').innerHTML   = tagsHTML;
  document.getElementById('modalMeta').innerHTML   = metaHTML;
  document.getElementById('modalAccess').innerHTML = accessHTML;
  document.getElementById('modalFav').classList.toggle('active', favActive);
  document.getElementById('modalFavForm').action = `/favorite/toggle/${postId}`;

  document.getElementById('spotModalOverlay').classList.add('open');
  document.getElementById('spotModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSpotModal() {
  document.getElementById('spotModalOverlay').classList.remove('open');
  document.getElementById('spotModal').classList.remove('open');
  document.body.style.overflow = '';
  _modalSourceCard = null;
}

/* ── お気に入りトグル（Ajax、画面遷移なし） ── */
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('.fav-form, #modalFavForm');
  if (!form) return;
  e.preventDefault();

  const btn = form.querySelector('button');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!res.ok) throw new Error('favorite toggle request failed');
    const { favorited } = await res.json();

    if (btn) btn.classList.toggle('active', favorited);

    const card = form.id === 'modalFavForm' ? _modalSourceCard : form.closest('.spot-card');
    card?.querySelector('.fav-btn')?.classList.toggle('active', favorited);

    if (form.id !== 'modalFavForm' && card && card === _modalSourceCard) {
      document.getElementById('modalFav')?.classList.toggle('active', favorited);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (btn) btn.disabled = false;
  }
});

/* ── カード 3D Tilt ── */
document.addEventListener('mousemove', e => {
  const card = e.target.closest('.spot-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  const dx = (e.clientX - cx) / (rect.width  / 2);
  const dy = (e.clientY - cy) / (rect.height / 2);
  const rotY =  dx * 8;
  const rotX = -dy * 5;
  card.style.animation = 'none';
  card.style.opacity   = '1';
  card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(0) scale(1.02)`;
  card.style.boxShadow = `${-rotY * 1.5}px ${rotX * 1.5}px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`;
  card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width  * 100).toFixed(1)}%`);
  card.style.setProperty('--my', `${((e.clientY - rect.top ) / rect.height * 100).toFixed(1)}%`);
});

document.addEventListener('mouseleave', e => {
  const card = e.target.closest?.('.spot-card');
  if (card) resetCard(card);
}, true);

document.addEventListener('mouseout', e => {
  if (!e.currentTarget) return;
  const card = e.target.closest('.spot-card');
  if (card && !card.contains(e.relatedTarget)) resetCard(card);
});

function resetCard(card) {
  card.style.transition = 'transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.45s ease';
  card.style.transform  = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
  card.style.boxShadow  = '';
  setTimeout(() => { card.style.transition = 'border-color 0.15s, box-shadow 0.15s'; }, 460);
}

/* ── カード ↔ マップピン 連動 ── */
document.addEventListener('mouseover', e => {
  const card = e.target.closest('.spot-card[data-spot-id]');
  if (!card) return;
  const { marker } = markerMap[card.dataset.spotId] || {};
  if (marker) {
    const el = marker.getElement();
    if (el) el.style.transform = (el.style.transform || '').replace(/scale\([^)]*\)/, '') + ' scale(1.4)';
    el && (el.style.transition = 'transform 0.2s ease');
    el && (el.style.zIndex = '9999');
  }
});

document.addEventListener('mouseout', e => {
  const card = e.target.closest('.spot-card[data-spot-id]');
  if (!card) return;
  const { marker } = markerMap[card.dataset.spotId] || {};
  if (marker) {
    const el = marker.getElement();
    if (el) {
      el.style.transform = el.style.transform.replace(/scale\([^)]*\)\s*/, '');
      el.style.zIndex = '';
    }
  }
});

/* 詳しく見るボタン — イベント委譲 */
document.addEventListener('click', e => {
  const btn = e.target.closest('.card-detail-btn');
  if (btn) {
    const card = btn.closest('.spot-card');
    if (card) {
      openSpotModal(card);
      // マップをスポット位置にズーム
      const { marker, sp } = markerMap[card.dataset.spotId] || {};
      if (marker && leafletMap) {
        leafletMap.flyTo([sp.lat, sp.lng], 14, { duration: 1.2 });
        setTimeout(() => marker.openPopup(), 1300);
      }
    }
  }
});

/* ESC でモーダルを閉じる */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSpotModal();
});
