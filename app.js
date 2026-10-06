const $ = id => document.getElementById(id);
let currentPage = 0;
let fullscreenActive = false;
let fullscreenNative = false;
let returnFocus = null;
function setFullscreen(active) {
  fullscreenActive = active;
  $('reader').classList.toggle('is-fullscreen', active);
  document.body.classList.toggle('reading-fullscreen', active);
  $('fullscreen-toggle').textContent = active ? '退出全螢幕' : '放大・全螢幕';
  $('fullscreen-toggle').setAttribute('aria-pressed', String(active));
  if (active) $('fullscreen-toggle').focus();
  else if (returnFocus?.isConnected) returnFocus.focus();
}
async function toggleFullscreen() {
  if (fullscreenActive) {
    setFullscreen(false);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    fullscreenNative = false;
    return;
  }
  returnFocus = document.activeElement;
  setFullscreen(true);
  if ($('reader').requestFullscreen) {
    try { await $('reader').requestFullscreen(); fullscreenNative = true; }
    catch { /* 保留鋪滿視窗的閱讀模式。 */ }
  }
}
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement === $('reader')) fullscreenNative = true;
  else if (fullscreenNative) { fullscreenNative = false; setFullscreen(false); }
});
$('fullscreen-toggle').addEventListener('click', toggleFullscreen);
$('cover').src = book.pages[0].src;
book.pages.forEach((page, index) => {
  const option = document.createElement('option');
  option.value = index;
  option.textContent = `${index + 1} · ${page.label}`;
  $('page-select').append(option);
  const button = document.createElement('button');
  button.className = 'thumbnail';
  button.setAttribute('aria-label', `第 ${index + 1} 頁，${page.label}`);
  const image = document.createElement('img');
  image.src = page.src; image.alt = ''; image.loading = 'lazy';
  const label = document.createElement('span');
  label.textContent = `${index + 1} · ${page.label}`;
  button.append(image, label);
  button.addEventListener('click', () => showPage(index));
  $('thumbnails').append(button);
});
book.originals.forEach(page => {
  const figure = document.createElement('figure');
  const image = document.createElement('img');
  image.src = page.src; image.alt = page.label; image.loading = 'lazy';
  const caption = document.createElement('figcaption');
  caption.textContent = page.label;
  figure.append(image, caption); $('originals').append(figure);
});
function showPage(index, updateHash = true) {
  currentPage = Math.max(0, Math.min(book.pages.length - 1, index));
  const page = book.pages[currentPage];
  $('load-error').hidden = true;
  $('page-image').src = page.src;
  $('page-image').alt = `為什麼ㄅㄆㄇ，第 ${currentPage + 1} 頁：${page.label}，圖文／備課抱佛腳`;
  $('caption').textContent = page.label;
  $('page-count').textContent = `${currentPage + 1} / ${book.pages.length}`;
  $('fullscreen-count').textContent = `${page.label} · ${currentPage + 1} / ${book.pages.length}`;
  $('page-select').value = currentPage;
  $('previous').disabled = currentPage === 0;
  $('next').disabled = currentPage === book.pages.length - 1;
  [...$('thumbnails').children].forEach((button, i) => button.setAttribute('aria-current', String(i === currentPage)));
  if (updateHash) history.replaceState(null, '', `#read-${currentPage + 1}`);
  if (book.pages[currentPage + 1]) { const preload = new Image(); preload.src = book.pages[currentPage + 1].src; }
}
function openBook(index = 0) {
  $('shelf').hidden = true; $('reader').hidden = false;
  showPage(index); window.scrollTo({top: 0});
}
function route() {
  const match = location.hash.match(/^#read-(\d+)$/);
  if (match) openBook(Number(match[1]) - 1);
  else {
    if (fullscreenActive) { setFullscreen(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
    $('shelf').hidden = false; $('reader').hidden = true;
  }
}
$('start').addEventListener('click', () => openBook());
$('cover-start').addEventListener('click', () => openBook());
$('back').addEventListener('click', () => { location.hash = ''; route(); window.scrollTo({top: 0}); });
$('previous').addEventListener('click', () => showPage(currentPage - 1));
$('next').addEventListener('click', () => showPage(currentPage + 1));
$('page-select').addEventListener('change', event => showPage(Number(event.target.value)));
$('thumb-toggle').addEventListener('click', () => { const expanded = $('thumbnails').hidden; $('thumbnails').hidden = !expanded; $('thumb-toggle').setAttribute('aria-expanded', String(expanded)); });
$('page-image').addEventListener('error', () => { $('load-error').hidden = false; });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && fullscreenActive) { toggleFullscreen(); return; }
  if ($('reader').hidden || ['SELECT','INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPage(currentPage - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showPage(currentPage + 1); }
});
let touchStart = null;
$('page-image').addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY} : null; }, {passive: true});
$('page-image').addEventListener('touchcancel', () => { touchStart = null; });
$('page-image').addEventListener('touchend', event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showPage(currentPage + (dx < 0 ? 1 : -1));
  touchStart = null;
}, {passive: true});
let dragStart = null;
$('page-image').addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  dragStart = {x: event.clientX, y: event.clientY};
  $('page-image').setPointerCapture(event.pointerId);
});
$('page-image').addEventListener('pointerup', event => {
  if (!dragStart) return;
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showPage(currentPage + (dx < 0 ? 1 : -1));
  dragStart = null;
});
$('page-image').addEventListener('pointercancel', () => { dragStart = null; });
window.addEventListener('hashchange', route);
route();
