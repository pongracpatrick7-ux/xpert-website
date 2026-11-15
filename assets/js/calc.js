// Price calculator, room explorer and request form.
// All prices and texts live in this file: change them here.
(() => {
  const root = document.getElementById('calc');
  if (!root) return;
  const en = document.documentElement.lang === 'en';
  const money = new Intl.NumberFormat(en ? 'en-IE' : 'de-DE', { style: 'currency', currency: 'EUR' });
  const eur = (n) => money.format(n);
  const IMG = (en ? '../' : '') + 'assets/img/raeume/';

  // ---------- Prices ----------
  const APT = { s1: 85, s2: 105, s3: 130, s4: null };            // one-time cleaning
  const FREQ = { once: 0, monthly: 0.10, biweekly: 0.15, weekly: 0.20 }; // discount
  const MOVE_PLUS = 0.25;                                          // deep cleaning: +25 %
  const OFFICE = { perM2: 1.19, min: 80 };
  const STAIRS = { base: 70, baseFloors: 3, perExtraFloor: 20, maxFloors: 6 };
  const STAIRS_FREQ = { weekly: 0, twice: 0.15, monthly: 0.20, once: 0.40 }; // surcharge

  // ---------- Texts ----------
  const T = en ? {
    tabs: { apt: 'Apartment', office: 'Office', move: 'Moving in / out', stairs: 'Building & stairwell', hotel: 'Hotel & Airbnb', special: 'Special request' },
    size: 'Size of your apartment', sizeHint: 'Kitchen, hallway and 1 bathroom included',
    sizes: { s1: ['Small apartment', '1 room / studio'], s2: ['2 rooms', ''], s3: ['3 rooms', ''], s4: ['4+ rooms', 'on request'] },
    freq: 'How often?',
    freqs: { once: 'One-off', monthly: 'Once a month', biweekly: 'Every 2 weeks', weekly: 'Once a week' },
    area: 'Area to be cleaned', areaUnit: 'm²', perM2: 'per m²', minOrder: 'Minimum order',
    officeHint: 'Move the slider or type the area. Regular office cleaning: tell us the rhythm you want in the form.',
    when: 'When?', whens: { before: 'Before moving in', after: 'After moving out' },
    moveHint: 'Deep cleaning of the whole apartment, so it is ready for handover or for your first day.',
    floors: 'Floors', floorsUpTo: 'up to 3', floorsMore: '7+', floorsHint: 'Stairs, railings, landings and entrance area.',
    sfreqs: { weekly: 'Once a week', twice: 'Twice a month', monthly: 'Once a month', once: 'One-off / deep cleaning' },
    hotelTitle: 'Hotel rooms & Airbnb', hotelText: 'For hotel rooms and holiday rentals we offer a special price that depends on how often we clean. Request an on-site meeting and you get a fixed price for every changeover.',
    specialTitle: 'Special requests', specialText: 'Commercial cleaning, deep cleaning, business premises or anything that does not fit above: send us a request and we will contact you within 24 hours.',
    sum: 'Your price', perVisit: 'per visit', oneOff: 'one-off', perClean: 'per cleaning', instead: 'instead of',
    onRequest: 'On request', individual: 'Individual price',
    note: 'Fixed price. No VAT charged (§ 19 UStG).',
    cta: 'Request cleaning', ctaMeeting: 'Request on-site meeting', ctaSend: 'Send request',
    service: 'Service', lSize: 'Size', lFreq: 'Rhythm', lArea: 'Area', lWhen: 'When', lFloors: 'Floors', lDiscount: 'Discount', lSurcharge: 'Surcharge',
    floorsN: (n) => (n <= 3 ? 'up to 3 floors' : n + ' floors'),
    roomsTitle: 'What we clean in every room', roomsLead: 'Move over the points: you see the spot clean and what we do there.',
    demo: 'Sample picture',
    yourChoice: 'Your selection',
    sending: 'Sending …', failed: 'Sorry, that did not work. Please email us directly at contact@xpertreinigung.de.',
    doneTitle: 'Thank you!', doneText: 'Your request has arrived. One of our team members will contact you within 24 hours.',
    doneMail: 'Your email program is opening with your request. Please send that email, and one of our team members will contact you within 24 hours.',
    close: 'Close',
    rooms: {
      bad: ['Bathroom', [['Toilet', 'Cleaned and disinfected, inside and out.'], ['Basin & taps', 'Limescale removed and polished.'], ['Shower / bathtub', 'Walls, glass and fittings cleaned.'], ['Mirror', 'Streak-free.'], ['Floor', 'Vacuumed and mopped, including corners.']]],
      flur: ['Hallway', [['Wardrobe & shoes', 'Tidied and neatly arranged.'], ['Doors & handles', 'Doors, handles and light switches wiped.'], ['Mirror', 'Streak-free.'], ['Floor', 'Vacuumed and mopped.']]],
      schlaf: ['Bedroom', [['Surfaces', 'Dust removed from all free surfaces.'], ['Bed', 'Made up. Fresh linen on request.'], ['Sills & radiators', 'Window sills, radiators and skirting boards wiped.'], ['Mirrors & glass', 'Streak-free.'], ['Floor', 'Vacuumed and mopped, also under the bed where reachable.']]],
      kueche: ['Kitchen', [['Worktop & sink', 'Cleaned and polished.'], ['Hob', 'Hob and extractor hood degreased on the outside.'], ['Fronts & appliances', 'Cabinet fronts and appliances wiped on the outside.'], ['Rubbish', 'Bins emptied, new bag in.'], ['Floor', 'Vacuumed and mopped.']]],
    },
  } : {
    tabs: { apt: 'Wohnung', office: 'Büro', move: 'Einzug / Auszug', stairs: 'Gebäude & Treppenhaus', hotel: 'Hotel & Airbnb', special: 'Sonderanfrage' },
    size: 'Größe Ihrer Wohnung', sizeHint: 'Küche, Flur und 1 Bad inklusive',
    sizes: { s1: ['Kleine Wohnung', '1 Zimmer / Studio'], s2: ['2 Zimmer', ''], s3: ['3 Zimmer', ''], s4: ['4+ Zimmer', 'auf Anfrage'] },
    freq: 'Wie oft?',
    freqs: { once: 'Einmalig', monthly: '1× im Monat', biweekly: 'Alle 2 Wochen', weekly: '1× pro Woche' },
    area: 'Fläche, die gereinigt wird', areaUnit: 'm²', perM2: 'pro m²', minOrder: 'Mindestauftrag',
    officeHint: 'Regler bewegen oder Fläche eintippen. Regelmäßige Büroreinigung: Den gewünschten Rhythmus geben Sie im Formular an.',
    when: 'Wann?', whens: { before: 'Vor dem Einzug', after: 'Nach dem Auszug' },
    moveHint: 'Grundreinigung der ganzen Wohnung – bereit für die Übergabe oder für Ihren ersten Tag.',
    floors: 'Etagen', floorsUpTo: 'bis 3', floorsMore: '7+', floorsHint: 'Treppen, Geländer, Podeste und Eingangsbereich.',
    sfreqs: { weekly: '1× pro Woche', twice: '2× im Monat', monthly: '1× im Monat', once: 'Einmalig / Grundreinigung' },
    hotelTitle: 'Hotelzimmer & Airbnb', hotelText: 'Für Hotelzimmer und Ferienwohnungen bieten wir einen Sonderpreis – abhängig davon, wie oft wir reinigen. Fragen Sie einen Vor-Ort-Termin an und Sie erhalten einen Festpreis für jeden Wechsel.',
    specialTitle: 'Sonderanfragen', specialText: 'Gewerbereinigung, Grundreinigung, Geschäftsräume oder alles, was oben nicht passt: Senden Sie uns eine Anfrage – wir melden uns innerhalb von 24 Stunden.',
    sum: 'Ihr Preis', perVisit: 'pro Termin', oneOff: 'einmalig', perClean: 'pro Reinigung', instead: 'statt',
    onRequest: 'Auf Anfrage', individual: 'Individueller Preis',
    note: 'Festpreis. Gemäß § 19 UStG ohne Umsatzsteuer.',
    cta: 'Reinigung anfragen', ctaMeeting: 'Vor-Ort-Termin anfragen', ctaSend: 'Anfrage senden',
    service: 'Leistung', lSize: 'Größe', lFreq: 'Rhythmus', lArea: 'Fläche', lWhen: 'Wann', lFloors: 'Etagen', lDiscount: 'Rabatt', lSurcharge: 'Zuschlag',
    floorsN: (n) => (n <= 3 ? 'bis 3 Etagen' : n + ' Etagen'),
    roomsTitle: 'Das reinigen wir in jedem Raum', roomsLead: 'Fahren Sie über die Punkte: Sie sehen die Stelle sauber – und was wir dort tun.',
    demo: 'Beispielbild',
    yourChoice: 'Ihre Auswahl',
    sending: 'Wird gesendet …', failed: 'Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an contact@xpertreinigung.de.',
    doneTitle: 'Vielen Dank!', doneText: 'Ihre Anfrage ist angekommen. Ein Mitglied unseres Teams meldet sich innerhalb von 24 Stunden bei Ihnen.',
    doneMail: 'Ihr E-Mail-Programm öffnet sich mit Ihrer Anfrage. Bitte senden Sie diese E-Mail ab – ein Mitglied unseres Teams meldet sich dann innerhalb von 24 Stunden.',
    close: 'Schließen',
    rooms: {
      bad: ['Bad', [['Toilette', 'Innen und außen gereinigt und desinfiziert.'], ['Waschbecken & Armaturen', 'Entkalkt und poliert.'], ['Dusche / Badewanne', 'Wände, Glas und Armaturen gereinigt.'], ['Spiegel', 'Streifenfrei.'], ['Boden', 'Gesaugt und gewischt – auch in den Ecken.']]],
      flur: ['Flur', [['Garderobe & Schuhe', 'Aufgeräumt und ordentlich hingestellt.'], ['Türen & Griffe', 'Türen, Griffe und Lichtschalter abgewischt.'], ['Spiegel', 'Streifenfrei.'], ['Boden', 'Gesaugt und gewischt.']]],
      schlaf: ['Schlafzimmer', [['Oberflächen', 'Staub von allen freien Flächen entfernt.'], ['Bett', 'Gemacht. Frische Bettwäsche auf Wunsch.'], ['Fensterbänke & Heizkörper', 'Fensterbänke, Heizkörper und Sockelleisten abgewischt.'], ['Spiegel & Glas', 'Streifenfrei.'], ['Boden', 'Gesaugt und gewischt – auch unter dem Bett, wo erreichbar.']]],
      kueche: ['Küche', [['Arbeitsplatte & Spüle', 'Gereinigt und poliert.'], ['Kochfeld', 'Kochfeld und Dunstabzug außen entfettet.'], ['Fronten & Geräte', 'Schrankfronten und Geräte außen abgewischt.'], ['Müll', 'Eimer geleert, neuer Beutel eingesetzt.'], ['Boden', 'Gesaugt und gewischt.']]],
    },
  };

  // Pictures per room: [dirty, clean, hotspot positions in % (x, y) in the order of the texts above, sample flag].
  const ROOM_IMG = {
    bad: ['bad-vorher.webp', 'bad-nachher.webp', [[15, 70], [49, 53], [71, 50], [48, 29], [50, 93]], false],
    flur: ['flur-vorher.webp', 'flur-nachher.webp', [[25, 70], [45, 48], [82, 46], [62, 90]], false],
    schlaf: ['schlafzimmer-vorher.webp', 'schlafzimmer-nachher.webp', [[13, 56], [53, 62], [84, 58], [34, 48], [50, 92]], false],
    kueche: ['kueche-vorher.webp', 'kueche-nachher.webp', [[47, 50], [23, 70], [69, 40], [85, 58], [66, 86]], false],
  };

  const state = { tab: 'apt', apt: { size: 's1', freq: 'once' }, office: { m2: 100 }, move: { size: 's1', when: 'after' }, stairs: { floors: 3, freq: 'weekly' }, room: 'bad' };
  const round2 = (n) => Math.round(n * 100) / 100;
  const pct = (n) => Math.round(n * 100) + ' %';

  // ---------- Calculation ----------
  function calc() {
    const s = state;
    if (s.tab === 'apt') {
      const base = APT[s.apt.size], d = FREQ[s.apt.freq];
      const lines = [[T.service, T.tabs.apt], [T.lSize, T.sizes[s.apt.size][0]], [T.lFreq, T.freqs[s.apt.freq]]];
      if (base == null) return { lines, price: null, word: T.onRequest, cta: T.ctaSend };
      if (d) lines.push([T.lDiscount, '−' + pct(d)]);
      return { lines, price: round2(base * (1 - d)), old: d ? base : null, unit: s.apt.freq === 'once' ? T.oneOff : T.perVisit, cta: T.cta };
    }
    if (s.tab === 'office') {
      const raw = round2(s.office.m2 * OFFICE.perM2), min = raw < OFFICE.min;
      const lines = [[T.service, T.tabs.office], [T.lArea, s.office.m2 + ' m²'], [eur(OFFICE.perM2) + ' ' + T.perM2, eur(raw)]];
      if (min) lines.push([T.minOrder, eur(OFFICE.min)]);
      return { lines, price: min ? OFFICE.min : raw, unit: T.perClean, cta: T.cta };
    }
    if (s.tab === 'move') {
      const base = APT[s.move.size];
      const lines = [[T.service, T.tabs.move], [T.lSize, T.sizes[s.move.size][0]], [T.lWhen, T.whens[s.move.when]]];
      if (base == null) return { lines, price: null, word: T.onRequest, cta: T.ctaSend };
      return { lines, price: round2(base * (1 + MOVE_PLUS)), unit: T.oneOff, cta: T.cta };
    }
    if (s.tab === 'stairs') {
      const f = s.stairs.floors, up = STAIRS_FREQ[s.stairs.freq];
      const lines = [[T.service, T.tabs.stairs], [T.lFloors, f > STAIRS.maxFloors ? T.floorsMore : T.floorsN(f)], [T.lFreq, T.sfreqs[s.stairs.freq]]];
      if (f > STAIRS.maxFloors) return { lines, price: null, word: T.onRequest, cta: T.ctaSend };
      const base = STAIRS.base + Math.max(0, f - STAIRS.baseFloors) * STAIRS.perExtraFloor;
      if (up) lines.push([T.lSurcharge, '+' + pct(up)]);
      return { lines, price: round2(base * (1 + up)), unit: T.perVisit, cta: T.cta };
    }
    if (s.tab === 'hotel') return { lines: [[T.service, T.tabs.hotel]], price: null, word: T.individual, cta: T.ctaMeeting };
    return { lines: [[T.service, T.tabs.special]], price: null, word: T.individual, cta: T.ctaSend };
  }

  // ---------- Building blocks ----------
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function chips(name, legend, options, value, hint) {
    return `<fieldset class="opt"><legend>${esc(legend)}</legend>${hint ? `<p class="opt-hint">${esc(hint)}</p>` : ''}<div class="chips">` +
      options.map(([v, label, sub, badge]) => `<label class="chip"><input type="radio" name="${name}" value="${v}"${String(v) === String(value) ? ' checked' : ''}><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}${badge ? `<i>${esc(badge)}</i>` : ''}</span></label>`).join('') +
      '</div></fieldset>';
  }
  const sizeOpts = () => Object.keys(APT).map((k) => [k, T.sizes[k][0], T.sizes[k][1]]);

  // Office pictures: [from this many m², file]. The slider fades to the matching one.
  const OFFICE_IMG = [[0, 'buero-80.webp'], [150, 'buero-300.webp']];
  const officeIdx = (m2) => OFFICE_IMG.reduce((best, [from], i) => (m2 >= from ? i : best), 0);
  function officePic(m2) {
    const on = officeIdx(m2);
    return OFFICE_IMG.map(([, f], i) => `<img src="${IMG}${f}" alt="" width="1400" height="781"${i === on ? ' class="on"' : ''}>`).join('') + `<span class="office-m2">${m2} m²</span>`;
  }
  function officeUpdate(m2) {
    const pic = optsEl.querySelector('#office-pic'); if (!pic) return;
    const on = officeIdx(m2);
    pic.querySelectorAll('img').forEach((im, i) => im.classList.toggle('on', i === on));
    pic.querySelector('.office-m2').textContent = m2 + ' m²';
  }

  function options() {
    const s = state;
    if (s.tab === 'apt') return chips('size', T.size, sizeOpts(), s.apt.size, T.sizeHint) +
      chips('freq', T.freq, Object.keys(FREQ).map((k) => [k, T.freqs[k], '', FREQ[k] ? '−' + pct(FREQ[k]) : '']), s.apt.freq);
    if (s.tab === 'office') return `<fieldset class="opt"><legend>${T.area}</legend><p class="opt-hint">${T.officeHint}</p>
      <div class="office"><div class="office-pic" id="office-pic">${officePic(s.office.m2)}</div>
      <div class="office-ctrl"><input type="range" id="m2r" min="20" max="400" step="5" value="${s.office.m2}" aria-label="${T.area}">
      <label class="m2box"><input type="number" id="m2n" min="10" max="2000" step="1" value="${s.office.m2}" inputmode="numeric" aria-label="${T.area}"><span>m²</span></label></div></div></fieldset>`;
    if (s.tab === 'move') return chips('size', T.size, sizeOpts(), s.move.size, T.moveHint) +
      chips('when', T.when, Object.keys(T.whens).map((k) => [k, T.whens[k]]), s.move.when);
    if (s.tab === 'stairs') {
      const fl = [[3, T.floorsUpTo]]; for (let i = 4; i <= STAIRS.maxFloors; i++) fl.push([i, String(i)]); fl.push([STAIRS.maxFloors + 1, T.floorsMore, T.sizes.s4[1]]);
      return chips('floors', T.floors, fl, s.stairs.floors, T.floorsHint) +
        chips('sfreq', T.freq, Object.keys(STAIRS_FREQ).map((k) => [k, T.sfreqs[k], '', STAIRS_FREQ[k] ? '+' + pct(STAIRS_FREQ[k]) : '']), s.stairs.freq);
    }
    const [title, text] = s.tab === 'hotel' ? [T.hotelTitle, T.hotelText] : [T.specialTitle, T.specialText];
    return `<div class="opt info"><h3>${title}</h3><p>${text}</p></div>`;
  }

  function summary() {
    const r = calc();
    const price = r.price == null ? `<strong class="word">${r.word}</strong>` :
      `${r.old ? `<s>${T.instead} ${eur(r.old)}</s>` : ''}<strong>${eur(r.price)}</strong><small>${r.unit}</small>`;
    return `<div class="kicker">${T.sum}</div><dl>${r.lines.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      <div class="sum-price" aria-live="polite">${price}</div><p class="sum-note">${T.note}</p>
      <button type="button" class="btn" id="calc-cta">${r.cta}</button>`;
  }

  // ---------- Render ----------
  root.innerHTML = `<div class="calc-tabs" role="tablist">${Object.keys(T.tabs).map((k) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === state.tab}">${T.tabs[k]}</button>`).join('')}</div>
    <div class="calc-body"><div class="calc-opts" id="calc-opts"></div><aside class="calc-sum" id="calc-sum"></aside></div>`;
  const optsEl = root.querySelector('#calc-opts'), sumEl = root.querySelector('#calc-sum');
  const formWrap = document.getElementById('anfrage'), form = document.getElementById('calc-form');
  const roomsEl = document.getElementById('rooms');

  function syncForm() {
    if (!form) return;
    const r = calc();
    const text = r.lines.map(([a, b]) => `${a}: ${b}`).join(' · ');
    const price = r.price == null ? r.word : `${eur(r.price)} ${r.unit}`;
    form.querySelector('[name=auswahl]').value = text;
    form.querySelector('[name=preis]').value = price;
    const box = form.querySelector('.choice');
    if (box) box.innerHTML = `<b>${T.yourChoice}</b><span>${esc(text)}</span><strong>${esc(price)}</strong>`;
    const btn = form.querySelector('button[type=submit]');
    if (btn) btn.textContent = r.cta;
  }
  function renderSum() { sumEl.innerHTML = summary(); syncForm(); }
  function render() {
    root.querySelectorAll('[role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === state.tab));
    optsEl.innerHTML = options();
    renderSum();
    if (roomsEl) roomsEl.hidden = !(state.tab === 'apt' || state.tab === 'move');
  }

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[role=tab]');
    if (tab) { state.tab = tab.dataset.tab; render(); return; }
    if (e.target.closest('#calc-cta')) openForm(true);
  });
  optsEl.addEventListener('change', (e) => {
    const { name, value, id } = e.target;
    if (name === 'size') state[state.tab].size = value;
    else if (name === 'freq') state.apt.freq = value;
    else if (name === 'when') state.move.when = value;
    else if (name === 'floors') state.stairs.floors = Number(value);
    else if (name === 'sfreq') state.stairs.freq = value;
    else if (id === 'm2n') return setM2(value, 'm2n');
    else return;
    renderSum();
  });
  optsEl.addEventListener('input', (e) => { if (e.target.id === 'm2r') setM2(e.target.value, 'm2r'); });
  function setM2(v, from) {
    const m2 = Math.min(2000, Math.max(10, Math.round(Number(v) || 0)));
    state.office.m2 = m2;
    const r = optsEl.querySelector('#m2r'), n = optsEl.querySelector('#m2n');
    if (from !== 'm2r' && r) r.value = Math.min(400, m2);
    if (n && (from !== 'm2n' || Number(n.value) !== m2)) n.value = m2;
    officeUpdate(m2);
    renderSum();
  }

  // ---------- Request form ----------
  function openForm(scroll) {
    if (!formWrap) return;
    formWrap.hidden = false;
    syncForm();
    if (scroll) { formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); const f = form.querySelector('input:not([type=hidden]):not(.hp)'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 500); }
  }
  document.querySelectorAll('a[href$="#anfrage"]').forEach((a) => a.addEventListener('click', () => openForm(false)));
  if (location.hash === '#anfrage') openForm(false);

  const dlg = document.getElementById('calc-done');
  function done(mail) {
    if (!dlg) return;
    dlg.querySelector('h3').textContent = T.doneTitle;
    dlg.querySelector('p').textContent = mail ? T.doneMail : T.doneText;
    dlg.querySelector('button').textContent = T.close;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  if (dlg) dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('button')) dlg.close(); });

  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.botcheck && form.botcheck.checked) return;
    const status = form.querySelector('.form-status');
    const data = new FormData(form);
    const key = data.get('access_key');
    if (!key || key.startsWith('WEB3FORMS')) {
      const fields = ['auswahl', 'preis', 'vorname', 'nachname', 'email', 'telefon', 'strasse', 'ort', 'wunschtermin', 'nachricht'];
      const body = fields.map((k) => `${k}: ${data.get(k) || '-'}`).join('\n');
      window.location.href = 'mailto:contact@xpertreinigung.de?subject=' + encodeURIComponent('Anfrage über die Website') + '&body=' + encodeURIComponent(body);
      done(true);
      return;
    }
    status.textContent = T.sending;
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      status.textContent = '';
      form.reset(); syncForm();
      done(false);
    } catch (err) { status.textContent = T.failed; }
  });

  // ---------- Room explorer ----------
  function renderRooms() {
    if (!roomsEl) return;
    const [name, items] = T.rooms[state.room];
    const [dirty, clean, pos, demo] = ROOM_IMG[state.room];
    roomsEl.innerHTML = `<div class="rooms-head"><h3>${T.roomsTitle}</h3><p>${T.roomsLead}</p></div>
      <div class="room-tabs" role="tablist">${Object.keys(T.rooms).map((k) => `<button type="button" role="tab" data-room="${k}" aria-selected="${k === state.room}">${T.rooms[k][0]}</button>`).join('')}</div>
      <div class="room-grid"><div class="room-stage">
        <img src="${IMG}${dirty}" alt="${esc(name)}" loading="lazy" width="1600" height="893">
        <img class="room-clean" src="${IMG}${clean}" alt="" loading="lazy" width="1600" height="893" aria-hidden="true">
        ${demo ? `<span class="room-demo">${T.demo}</span>` : ''}
        ${items.map(([t], i) => `<button type="button" class="spot" data-i="${i}" style="left:${pos[i][0]}%;top:${pos[i][1]}%" aria-label="${esc(t)}"><span></span></button>`).join('')}
        <div class="room-tip" hidden></div>
      </div>
      <ol class="room-list">${items.map(([t, d], i) => `<li data-i="${i}" tabindex="0"><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol></div>`;
  }
  function spot(i) {
    const stage = roomsEl.querySelector('.room-stage'), tip = stage.querySelector('.room-tip');
    stage.querySelectorAll('.spot').forEach((b) => b.classList.toggle('on', b.dataset.i === String(i)));
    roomsEl.querySelectorAll('.room-list li').forEach((li) => li.classList.toggle('on', li.dataset.i === String(i)));
    if (i == null) { stage.classList.remove('show'); tip.hidden = true; return; }
    const [x, y] = ROOM_IMG[state.room][2][i], [t, d] = T.rooms[state.room][1][i];
    stage.style.setProperty('--x', x + '%'); stage.style.setProperty('--y', y + '%');
    stage.classList.add('show');
    tip.innerHTML = `<b>${esc(t)}</b>${esc(d)}`;
    tip.style.left = Math.min(72, Math.max(28, x)) + '%';
    tip.style.top = y + '%';
    tip.classList.toggle('below', y < 45);
    tip.hidden = false;
  }
  if (roomsEl) {
    const pick = (e) => { const el = e.target.closest('[data-i]'); return el ? Number(el.dataset.i) : null; };
    roomsEl.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-room]');
      if (tab) { state.room = tab.dataset.room; renderRooms(); return; }
      const i = pick(e); spot(i);
    });
    roomsEl.addEventListener('mouseover', (e) => { const i = pick(e); if (i != null) spot(i); });
    roomsEl.addEventListener('mouseout', (e) => { if (e.target.closest('[data-i]') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-i]'))) spot(null); });
    roomsEl.addEventListener('focusin', (e) => { const i = pick(e); if (i != null) spot(i); });
    roomsEl.addEventListener('focusout', (e) => { if (e.target.closest('[data-i]')) spot(null); });
    renderRooms();
  }
  render();
})();
