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
  if (vbtn) vbtn.addEventListener('click', () => {
    if (vid.paused) { vid.play(); setPaused(false); } else { vid.pause(); setPaused(true); }
  });
}
