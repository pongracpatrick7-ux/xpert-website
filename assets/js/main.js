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
  if (calm) { vid.removeAttribute('autoplay'); vid.preload = 'none'; setPaused(true); }
  vid.src = vid.dataset.src;
  if (!calm) vid.play().catch(() => setPaused(true));
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
