function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

window.addEventListener('load', () => {
  document.querySelectorAll('.info-row').forEach((row, i) => {
    setTimeout(() => row.classList.add('visible'), i * 80);
  });
});
