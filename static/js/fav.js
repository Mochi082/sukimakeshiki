/* ── Drawer ── */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

/* ── お気に入り解除（Ajax、画面遷移なし） ── */
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('.fav-form');
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

    const card = form.closest('.fav-card');
    if (card) {
      card.classList.add('removing');
      card.addEventListener('transitionend', () => {
        card.remove();
        updateFavCountAfterRemoval();
      }, { once: true });
    }
  } catch (err) {
    console.error(err);
    if (btn) btn.disabled = false;
  }
});

function updateFavCountAfterRemoval() {
  const favContent = document.getElementById('favContent');
  const remaining = favContent.querySelectorAll('.fav-card').length;

  const badge = document.getElementById('favCountBadge');
  if (badge) badge.textContent = `${remaining} 件`;

  if (remaining === 0) {
    favContent.innerHTML = `
      <div class="fav-empty">
        <i class="fa fa-bookmark fav-empty-icon"></i>
        <div class="fav-empty-title">お気に入りがまだありません</div>
        <div class="fav-empty-sub">スポット一覧のブックマークアイコンをタップして<br>お気に入りに追加しましょう</div>
        <a class="fav-empty-btn" href="/spots">スポットを探す</a>
      </div>`;
  }
}

