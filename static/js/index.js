document.querySelectorAll('.btn-auth').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    this.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  });
});

function countUp(el, target, duration) {
  const fmt = { 2434:'2,434+', 16384:'16,384+', 8192:'8,192+' };
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target).toLocaleString() + '+';
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = fmt[target] || target.toLocaleString() + '+';
  }
  requestAnimationFrame(step);
}

function goHome() {
  document.getElementById('login-page').style.transition = 'opacity 0.4s ease';
  document.getElementById('login-page').style.opacity = '0';
  setTimeout(() => { window.location.href = window.INDEX_CONFIG.dashboardUrl; }, 400);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelectorAll('.stat-number[data-target]').forEach(el => {
      countUp(el, parseInt(el.dataset.target), 1800);
    });
  }, 1000);
});
