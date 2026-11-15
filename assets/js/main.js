const EN = document.documentElement.lang === 'en';
// Mobile menu
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', nav.classList.toggle('open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));
}

// Request form: sent through Web3Forms. Until the access key is set,
// it opens the visitor's email program with the filled-in request instead.
const form = document.getElementById('anfrage-form');
if (form) {
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.botcheck && form.botcheck.checked) return;
    const data = new FormData(form);
    const key = data.get('access_key');
    if (!key || key.startsWith('WEB3FORMS')) {
      const fields = ['vorname', 'nachname', 'email', 'telefon', 'ort', 'reinigungsart', 'haeufigkeit', 'wunschtermin', 'nachricht'];
      const body = fields.map((k) => `${k}: ${data.get(k) || '-'}`).join('\n');
      window.location.href = 'mailto:contact@xpertreinigung.de?subject=' + encodeURIComponent('Anfrage über die Website') + '&body=' + encodeURIComponent(body);
      return;
    }
    status.textContent = EN ? 'Sending …' : 'Wird gesendet …';
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      window.location.href = 'danke/';
    } catch (err) {
      status.textContent = EN ? 'Sorry, that did not work. Please email us directly at contact@xpertreinigung.de.' : 'Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an contact@xpertreinigung.de.';
    }
  });
}

// Hero video: paused for reduced motion / data saver.
const vid = document.querySelector('.hero-video');
const vbtn = document.querySelector('.video-toggle');
if (vid) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData);
  const setPaused = (p) => { if (vbtn) { vbtn.setAttribute('aria-pressed', String(p)); vbtn.setAttribute('aria-label', p ? (EN ? 'Play video' : 'Video abspielen') : (EN ? 'Pause video' : 'Video pausieren')); } };
  const endCard = document.querySelector('.hero-end');
  if (calm) { vid.removeAttribute('autoplay'); vid.preload = 'none'; setPaused(true); if (endCard) endCard.classList.add('on'); }
  vid.muted = true; vid.defaultMuted = true; vid.playsInline = true;
  vid.setAttribute('muted', ''); vid.setAttribute('playsinline', ''); vid.setAttribute('webkit-playsinline', '');
  vid.src = vid.dataset.src;
  if (!calm) {
    // Some phones (battery saver, strict autoplay rules) refuse to start a film on their own.
    // Try again when it is ready, and start it on the visitor's first touch or scroll.
    let userPaused = false;
    const tryPlay = () => { if (userPaused || !vid.paused) return; const p = vid.play(); if (p) p.then(() => setPaused(false)).catch(() => setPaused(true)); };
    const evs = ['touchstart', 'pointerdown', 'click', 'keydown', 'scroll'];
    const kick = () => tryPlay();
    evs.forEach((e) => window.addEventListener(e, kick, { passive: true }));
    vid.addEventListener('playing', () => { setPaused(false); evs.forEach((e) => window.removeEventListener(e, kick)); });
    vid.addEventListener('canplay', tryPlay, { once: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
    if (vbtn) vbtn.addEventListener('click', () => { userPaused = !vid.paused; }, true);
    tryPlay();
  }
  // Captions follow the film; the closing card stays while the last frame is held.
  const caps = [...document.querySelectorAll('.hero-caps [data-from]')];
  let hold = 0;
  const sync = () => {
    const t = vid.currentTime;
    caps.forEach((c) => c.classList.toggle('on', t >= +c.dataset.from && t < (c.dataset.to ? +c.dataset.to : 1e9)));
  };
  const restart = () => { clearTimeout(hold); hold = 0; vid.currentTime = 0; vid.play().catch(() => setPaused(true)); };
  if (!calm) {
    vid.addEventListener('timeupdate', sync);
    vid.addEventListener('playing', sync);
    vid.addEventListener('ended', () => { hold = setTimeout(restart, 6000); });
  }
  if (vbtn) vbtn.addEventListener('click', () => {
    if (calm && !vid.dataset.live) { vid.dataset.live = 1; vid.addEventListener('timeupdate', sync); vid.addEventListener('ended', () => { hold = setTimeout(restart, 6000); }); }
    if (hold) { restart(); setPaused(false); }
    else if (vid.paused) { vid.play(); setPaused(false); } else { vid.pause(); setPaused(true); }
  });
}

// Service tiles open the matching calculator tab.
document.querySelectorAll('[data-tab-go]').forEach((a) => a.addEventListener('click', () => {
  const b = document.querySelector(`.calc-tabs button[data-tab="${a.dataset.tabGo}"]`);
  if (b) b.click();
}));

// Gentle reveal on scroll.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.sec-head, .svc, .steps li, .promise-box, .contact-panel, .map-card').forEach((el, i) => {
    const sib = [...el.parentNode.children].indexOf(el);
    el.style.setProperty('--d', (el.matches('.svc, .steps li') ? sib * 0.08 : 0) + 's');
    el.classList.add('rv'); io.observe(el);
  });
}

// Phone: floating price bar while choosing options (the full summary sits further down).
const calcRoot = document.getElementById('calc');
if (calcRoot && 'IntersectionObserver' in window) {
  const bar = document.createElement('div');
  bar.className = 'mprice';
  bar.innerHTML = `<div><small>${EN ? 'Your price' : 'Ihr Preis'}</small><strong></strong></div><button type="button">${EN ? 'Continue' : 'Weiter'}</button>`;
  document.body.appendChild(bar);
  const out = bar.querySelector('strong');
  let optsIn = false, sumIn = false;
  const show = () => bar.classList.toggle('on', optsIn && !sumIn && !!out.textContent);
  const copy = () => {
    const p = calcRoot.querySelector('.sum-price strong');
    out.textContent = p ? p.textContent : ''; out.className = p && p.classList.contains('word') ? 'word' : '';
    show();
  };
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.target.classList.contains('calc-sum')) sumIn = e.isIntersecting; else optsIn = e.isIntersecting; });
    show();
  }, { rootMargin: '-70px 0px -90px 0px' });
  const watch = () => { io.disconnect(); optsIn = sumIn = false; calcRoot.querySelectorAll('.calc-opts, .calc-sum').forEach((el) => io.observe(el)); copy(); };
  new MutationObserver(() => { clearTimeout(watch.t); watch.t = setTimeout(watch, 60); }).observe(calcRoot, { childList: true, subtree: true, characterData: true });
  bar.querySelector('button').addEventListener('click', () => {
    const s = calcRoot.querySelector('.calc-sum');
    if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
  setTimeout(watch, 400);
}
