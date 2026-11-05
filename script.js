(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = () => window.gsap && window.ScrollTrigger;

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
    if (hasGsap()) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollToHash = (hash) => {
    const el = hash === '#top' ? document.body : $(hash);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: hash === '#top' ? 0 : -90 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (el !== document.body) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const h = a.getAttribute('href');
    if (h.length < 2) return;
    e.preventDefault();
    scrollToHash(h);
    history.replaceState(null, '', h);
  }));

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);

  const toggle = $('[data-nav-toggle]');
  const setNav = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('[data-nav] a').forEach((a) => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setNav(false); toggle.focus(); }
  });

  /* ---------- Hero headline: split into words for the reveal ---------- */
  const title = $('[data-split]');
  if (title) {
    const text = title.textContent.trim();
    const words = text.split(/\s+/);
    title.innerHTML = `<span class="sr-only">${text}</span>` + words.map((w) =>
      `<span class="w" aria-hidden="true"><span>${w}</span></span>`
    ).join(' ');
  }

  /* ---------- Spotlight follow on tiles and form ---------- */
  if (finePointer) {
    $$('[data-spot]').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Gallery filters with sliding indicator ---------- */
  const filters = $('[data-filters]');
  const glider = $('[data-glider]');
  const items = $$('[data-gallery] li');
  const buttons = $$('[data-filter]');
  const filterStatus = $('[data-filter-status]');
  const visible = () => items.filter((li) => !li.hidden);
  buttons.forEach((b) => {
    const f = b.dataset.filter;
    const n = f === 'all' ? items.length : items.filter((li) => li.dataset.cat === f).length;
    $('.count', b).textContent = n;
  });
  const moveGlider = () => {
    const active = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    if (!active || !glider) return;
    filters.classList.add('has-glider');
    glider.style.width = `${active.offsetWidth}px`;
    glider.style.height = `${active.offsetHeight}px`;
    glider.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
  };
  const applyFilter = (f) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
    moveGlider();
    items.forEach((li, i) => {
      const show = f === 'all' || li.dataset.cat === f;
      li.hidden = !show;
      li.classList.remove('is-in');
      if (show && !reduce) { li.style.animationDelay = `${Math.min(i, 10) * 35}ms`; void li.offsetWidth; li.classList.add('is-in'); }
    });
    if (hasGsap()) window.ScrollTrigger.refresh();
    filterStatus.textContent = `Showing ${visible().length} projects`;
  };
  buttons.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
  $$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => applyFilter(a.dataset.filterLink)));
  window.addEventListener('resize', moveGlider);
  document.fonts?.ready.then(moveGlider);
  moveGlider();

  /* ---------- Lightbox ---------- */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]');
  const lbCap = $('[data-lb-cap]');
  const lbCount = $('[data-lb-count]');
  const webp = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  let current = 0;
  let opener = null;
  const show = (i) => {
    const list = visible();
    current = (i + list.length) % list.length;
    const tile = $('.tile', list[current]);
    lbImg.src = `assets/img/full/${tile.dataset.full}.${webp ? 'webp' : 'jpg'}`;
    lbImg.alt = $('img', tile).alt;
    lbCap.textContent = `${$('.tile-cap', tile).textContent} (${current + 1} of ${list.length})`;
    lbCount.textContent = `${current + 1} of ${list.length}`;
  };
  items.forEach((li) => $('.tile', li).addEventListener('click', (e) => {
    opener = e.currentTarget;
    show(visible().indexOf(li));
    lb.showModal();
    lenis?.stop();
  }));
  $('[data-lb-prev]').addEventListener('click', () => show(current - 1));
  $('[data-lb-next]').addEventListener('click', () => show(current + 1));
  $('[data-lb-close]').addEventListener('click', () => lb.close());
  lb.addEventListener('close', () => { lbImg.removeAttribute('src'); lenis?.start(); opener?.focus(); });
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  let sx = null;
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    sx = null;
  });

  /* ---------- Quote form ---------- */
  const form = $('[data-form]');
  const status = $('[data-form-status]');
  const submit = $('[data-submit]');
  const submitLabel = $('[data-submit-label]');
  const rules = {
    'f-name': (v) => v.trim().length > 1,
    'f-phone': (v) => v.replace(/\D/g, '').length >= 10,
    'f-postcode': (v) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(v.trim()),
    'f-email': (v) => v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  };
  const check = (id) => {
    const input = document.getElementById(id);
    const ok = rules[id](input.value);
    const err = document.getElementById(`${id}-err`);
    input.setAttribute('aria-invalid', String(!ok));
    if (ok) input.removeAttribute('aria-describedby'); else input.setAttribute('aria-describedby', `${id}-err`);
    err.hidden = ok;
    return ok;
  };
  Object.keys(rules).forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener('blur', () => { if (input.value) check(id); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') check(id); });
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';
    const bad = Object.keys(rules).filter((id) => !check(id));
    if (bad.length) { document.getElementById(bad[0]).focus(); return; }
    if (submit.getAttribute('aria-disabled') === 'true') return;
    submit.setAttribute('aria-disabled', 'true');
    submitLabel.textContent = 'Sending…';
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.classList.add('is-ok');
      status.textContent = 'Thanks, your enquiry has been sent. We’ll be in touch within two working days to arrange a visit.';
    } catch {
      status.classList.add('is-err');
      status.textContent = 'Your enquiry didn’t send. Please try again, or call or email us using the details on this page.';
    } finally {
      submit.removeAttribute('aria-disabled');
      submitLabel.textContent = 'Send my enquiry';
    }
  });

  /* ---------- FAQ accordion: one open at a time, arrow keys move between questions ---------- */
  const faqBtns = $$('.faq-q');
  const setFaq = (btn, open) => {
    btn.setAttribute('aria-expanded', String(open));
    document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('is-open', open);
  };
  faqBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      faqBtns.forEach((b) => { if (b !== btn) setFaq(b, false); });
      setFaq(btn, open);
      if (hasGsap()) setTimeout(() => window.ScrollTrigger.refresh(), 500);
    });
    btn.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: faqBtns.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      faqBtns[(keys[e.key] + faqBtns.length) % faqBtns.length].focus();
    });
  });

  /* ---------- Sticky action bar: appears after the hero, hides at the quote form ---------- */
  const bar = $('[data-action-bar]');
  if (bar && 'IntersectionObserver' in window) {
    let pastHero = false;
    let atQuote = false;
    const update = () => bar.classList.toggle('is-shown', pastHero && !atQuote);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); }).observe($('.hero'));
    new IntersectionObserver(([e]) => { atQuote = e.isIntersecting; update(); }, { threshold: 0.15 }).observe($('#quote'));
  }

  /* ---------- Coverage map: load Leaflet only when the section is near ---------- */
  const mapEl = $('[data-coverage-map]');
  const loadCss = (href) => new Promise((ok, bad) => {
    const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href, onload: ok, onerror: bad });
    document.head.appendChild(l);
  });
  const loadJs = (src) => new Promise((ok, bad) => {
    const s = Object.assign(document.createElement('script'), { src, onload: ok, onerror: bad });
    document.head.appendChild(s);
  });
  const buildMap = () => {
    const L = window.L;
    const bedford = [52.136, -0.467];
    const map = L.map(mapEl, {
      zoomControl: true, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false,
      attributionControl: true, zoomSnap: 0.25,
    });
    const area = L.latLng(bedford).toBounds(290000);   // show the whole 115 km ring with room around it
    const fit = () => map.fitBounds(area, { padding: [12, 12] });
    fit();
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 13, minZoom: 6,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    L.circle(bedford, {
      radius: 115000, color: '#3f5247', weight: 2.5, opacity: 0.85, dashArray: '10 8', fillColor: '#6d7e74', fillOpacity: 0.16,
    }).addTo(map);
    L.marker(bedford, {
      icon: L.divIcon({ className: '', html: '<div class="map-home"><b></b><b></b><i></i><span>Bedford</span></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      keyboard: false, interactive: false,
    }).addTo(map);
    const towns = [
      ['London', 51.507, -0.128, true, 'bottom'], ['Birmingham', 52.486, -1.89, true, 'top'],
      ['Milton Keynes', 52.04, -0.76, false, 'left'], ['Northampton', 52.24, -0.902, false, 'left'],
      ['Luton', 51.879, -0.417, false, 'right'], ['Cambridge', 52.205, 0.122, false, 'right'],
      ['Oxford', 51.752, -1.258, false, 'left'], ['Coventry', 52.407, -1.512, false, 'bottom'],
      ['Leicester', 52.637, -1.134, false, 'top'], ['Peterborough', 52.573, -0.243, false, 'right'],
      ['St Albans', 51.752, -0.336, false, 'right'],
    ];
    towns.forEach(([name, lat, lng, city, dir]) => {
      const marker = L.circleMarker([lat, lng], {
        radius: city ? 7 : 5, color: '#3f5247', weight: 2, fillColor: '#efe4cf', fillOpacity: 1, interactive: false,
      }).addTo(map);
      // The map already prints town names, so only the two end points get our own labels.
      if (city) marker.bindTooltip(name, { permanent: true, direction: dir, offset: [0, dir === 'top' ? -8 : 8], className: 'map-label is-city' });
    });
    $('[data-map-frame]').classList.add('is-live');
    window.addEventListener('resize', fit);
  };
  if (mapEl && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      Promise.all([
        loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'),
        loadJs('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'),
      ]).then(buildMap).catch((err) => { console.warn('Map unavailable, showing the drawn map instead.', err); });
    }, { rootMargin: '600px 0px' });
    io.observe(mapEl);
  }

  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Motion (GSAP). Content is visible without it. ---------- */
  if (reduce || !hasGsap()) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  // Page-load sequence: headline words rise, then badge, copy, buttons, facts.
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('[data-hero-media] img, [data-hero-media] video', { scale: 1.15, duration: 2.2 }, 0)
    .from('.hero-title .w > span', { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.15)
    .from('.hero-badge', { y: 16, opacity: 0, duration: 0.8 }, 0.1)
    .from('.hero-lede, .hero-actions', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.55)
    .from('.hero-facts', { y: 30, opacity: 0, duration: 1 }, 0.8);

  // Hero image drifts slower than the page.
  gsap.to('[data-hero-media] img, [data-hero-media] video', {
    yPercent: -10, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Bento tiles assemble as they enter.
  gsap.from('.bento-tile', {
    y: 60, opacity: 0, scale: 0.96, duration: 1.1, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: '.bento', start: 'top 80%', once: true },
  });

  // Process: the gold line draws as you scroll through the steps.
  const vertical = matchMedia('(max-width: 900px)').matches;
  gsap.fromTo('[data-steps-fill]', { [vertical ? 'scaleY' : 'scaleX']: 0 }, {
    [vertical ? 'scaleY' : 'scaleX']: 1, ease: 'none',
    scrollTrigger: { trigger: '.steps-wrap', start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
  });
  gsap.from('.step', {
    y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: '.steps-wrap', start: 'top 80%', once: true },
  });

  // Map frame rises into place.
  gsap.from('.map-frame', {
    y: 40, opacity: 0, scale: 0.97, duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: '.map-frame', start: 'top 85%', once: true },
  });
})();
