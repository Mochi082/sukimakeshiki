function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

function showToast(msg, type) {
  const toast = document.getElementById('settingsToast');
  toast.textContent = msg;
  toast.className = 'settings-toast show' + (type === 'error' ? ' error' : '');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ── バイク種類カスタムドロップダウン ── */
function toggleBikeTypeDropdown() {
  const panel = document.getElementById('bikeTypeDropdownPanel');
  const chevron = document.getElementById('bikeTypeChevron');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  chevron.classList.toggle('open', isOpen);
}

function selectBikeType(e, value) {
  e.stopPropagation();
  document.getElementById('bikeTypeInput').value = value;
  document.getElementById('bikeTypeValue').textContent = value;
  document.querySelectorAll('#bikeTypeDropdownPanel .settings-dropdown-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.value === value);
  });
  toggleBikeTypeDropdown();
}

/* ── 活動時間カスタムドロップダウン ── */
function toggleActivityTimeDropdown() {
  const panel = document.getElementById('activityTimeDropdownPanel');
  const chevron = document.getElementById('activityTimeChevron');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  chevron.classList.toggle('open', isOpen);
}

function selectActivityTime(e, value, label) {
  e.stopPropagation();
  document.getElementById('activityTimeInput').value = value;
  document.getElementById('activityTimeValue').textContent = label;
  document.querySelectorAll('#activityTimeDropdownPanel .settings-dropdown-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.value === value);
  });
  toggleActivityTimeDropdown();
}

/* フラッシュメッセージ → トースト */
(window.SETTINGS_CONFIG?.flashMessages || []).forEach(({ message, category }) => {
  showToast(message, category);
});
