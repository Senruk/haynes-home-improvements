(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = () => window.gsap && window.ScrollTrigger;

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduce && finePointer && window.Lenis) {
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
    if (open) setTimeout(() => $('[data-nav] a').focus(), 50);
  };
  header.addEventListener('focusout', (e) => {
    if (header.classList.contains('is-open') && !header.contains(e.relatedTarget)) setNav(false);
  });
  toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('[data-nav] a').forEach((a) => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setNav(false); toggle.focus(); }
  });

  /* ---------- Hero headline: split into words for the reveal ---------- */
  const title = $('[data-split]');
  if (title && !title.querySelector('.w')) {
    const text = title.textContent.trim();
    const words = text.split(/\s+/);
    title.innerHTML = `<span class="sr-only">${text}</span>` + words.map((w) =>
      `<span class="w" aria-hidden="true"><span>${w}</span></span>`
    ).join(' ');
  }

  /* ---------- Pause motion (WCAG 2.2.2): stops the video, marquee and pulsing effects ---------- */
  const motionBtn = $('[data-motion-toggle]');
  const motionPaused = () => document.documentElement.classList.contains('motion-paused');
  if (motionBtn) {
    if (reduce) motionBtn.hidden = true;
    motionBtn.addEventListener('click', () => {
      const paused = !motionPaused();
      document.documentElement.classList.toggle('motion-paused', paused);
      motionBtn.setAttribute('aria-pressed', String(paused));
      $('[data-motion-label]').textContent = paused ? 'Play motion' : 'Pause motion';
      const v = $('[data-hero-video]');
      if (v && v.src) { if (paused) v.pause(); else v.play().catch(() => {}); }
    });
  }

  /* ---------- Hero video: 8 s loop of a kitchen being built, portrait cut on phones ---------- */
  const heroVideo = $('[data-hero-video]');
  const conn = navigator.connection || {};
  const saveData = conn.saveData || /(^|-)2g$|3g/.test(conn.effectiveType || '');
  const webm = heroVideo && heroVideo.canPlayType('video/webm; codecs="vp9"');
  const mp4 = heroVideo && heroVideo.canPlayType('video/mp4; codecs="avc1.640028"');
  if (heroVideo && !reduce && !saveData && (webm || mp4)) {
    const startVideo = () => {
    const portrait = matchMedia('(max-aspect-ratio: 4/5)').matches;
    // WebM has the seamless dissolve loop; the MP4 is the original clip for browsers without VP9.
    heroVideo.src = !webm ? heroVideo.dataset.srcMp4 : portrait ? heroVideo.dataset.srcMobile : heroVideo.dataset.srcDesktop;
    heroVideo.preload = 'auto';
    heroVideo.addEventListener('playing', () => {
      heroVideo.classList.add('is-playing');
      $('.hero').classList.add('has-video');
    }, { once: true });
    if (!motionPaused()) heroVideo.play().catch(() => { /* autoplay blocked: the photo stays */ });
    // Pause while the hero is off screen to save battery.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !motionPaused()) heroVideo.play().catch(() => {}); else heroVideo.pause();
      }).observe($('.hero'));
    }
    };
    // Load the video only after the page itself has finished loading, so it never competes with the first paint.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    const kick = () => idle(startVideo, { timeout: 1500 });
    if (document.readyState === 'complete') kick(); else window.addEventListener('load', kick, { once: true });
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
  const moreBtn = $('[data-gallery-more]');
  const LABELS = { wardrobes: 'fitted wardrobe', dressing: 'dressing room', media: 'media wall', loft: 'loft and eaves', office: 'home office', kitchens: 'kitchen' };
  let collapsed = true;
  let currentFilter = 'all';
  const collapse = () => {
    const limit = matchMedia('(max-width: 560px)').matches ? 6 : 9;
    const on = collapsed && currentFilter === 'all';
    items.forEach((li, i) => li.classList.toggle('is-extra', on && i >= limit));
    if (moreBtn) moreBtn.hidden = !on;
  };
  moreBtn?.addEventListener('click', () => {
    collapsed = false; collapse();
    const first = items.find((li, i) => i >= (matchMedia('(max-width: 560px)').matches ? 6 : 9));
    first && $('.tile', first).focus({ preventScroll: true });
    if (hasGsap()) window.ScrollTrigger.refresh();
  });
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
    currentFilter = f;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
    moveGlider();
    items.forEach((li, i) => {
      const show = f === 'all' || li.dataset.cat === f;
      li.hidden = !show;
      li.classList.remove('is-in');
      if (show && !reduce) { li.style.animationDelay = `${Math.min(i, 10) * 35}ms`; void li.offsetWidth; li.classList.add('is-in'); }
    });
    collapse();
    if (hasGsap()) window.ScrollTrigger.refresh();
    const n = visible().length;
    filterStatus.textContent = f === 'all' ? `Showing all ${n} projects` : `Showing ${n} ${LABELS[f] || ''} project${n === 1 ? '' : 's'}`;
  };
  buttons.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
  $$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => applyFilter(a.dataset.filterLink)));
  window.addEventListener('resize', () => { moveGlider(); collapse(); });
  collapse();
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
    lbCap.innerHTML = '';
    lbCap.append($('.tile-cap', tile).textContent, Object.assign(document.createElement('span'), { className: 'sr-only', textContent: ` (${current + 1} of ${list.length})` }));
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
      status.textContent = 'Thanks, your quote request has been sent. We’ll be in touch to arrange a visit.';
    } catch {
      status.classList.add('is-err');
      status.textContent = 'Your quote request didn’t send. Please try again, or call us free on 0800 302 9909.';
    } finally {
      submit.removeAttribute('aria-disabled');
      submitLabel.textContent = 'Send my quote request';
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

  /* ---------- Sticky action bar: always there on phones, except at the quote form and footer ---------- */
  const bar = $('[data-action-bar]');
  if (bar) {
    bar.classList.add('is-shown');
    if ('IntersectionObserver' in window) {
      let atQuote = false;
      let atFooter = false;
      const update = () => bar.classList.toggle('is-shown', !atQuote && !atFooter);
      new IntersectionObserver(([e]) => { atQuote = e.isIntersecting; update(); }, { threshold: 0.15 }).observe($('#quote'));
      new IntersectionObserver(([e]) => { atFooter = e.isIntersecting; update(); }).observe($('.site-footer'));
    }
  }

  /* ---------- Coverage map (UK-wide): load Leaflet only when the section is near ---------- */
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
    const office = [51.5205, -0.1437];            // 167-169 Great Portland Street, London
    const map = L.map(mapEl, {
      zoomControl: true, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false,
      attributionControl: true, zoomSnap: 0.25,
    });
    const uk = L.latLngBounds([49.9, -6.4], [58.7, 1.8]);
    const fit = () => map.fitBounds(uk, { padding: [8, 8] });
    fit();
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12, minZoom: 4,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    // Main cities, linked back to the office: "we come to you", wherever you are.
    const cities = [
      [52.486, -1.890], [53.481, -2.242], [53.801, -1.549], [53.408, -2.991], [51.455, -2.588],
      [51.481, -3.179], [54.978, -1.618], [53.381, -1.470], [52.954, -1.158], [50.909, -1.404],
      [52.630, 1.297], [55.864, -4.252], [55.953, -3.188], [50.718, -3.533], [52.205, 0.122],
      [51.752, -1.258], [50.822, -0.137], [54.597, -5.930],
    ];
    cities.forEach((c) => {
      L.polyline([office, c], { color: '#3f5247', weight: 1.8, opacity: 0.7, dashArray: '5 6', interactive: false }).addTo(map);
      L.circleMarker(c, { radius: 4.5, color: '#3f5247', weight: 2, fillColor: '#efe4cf', fillOpacity: 1, interactive: false }).addTo(map);
    });
    L.marker(office, {
      icon: L.divIcon({ className: '', html: '<div class="map-home"><b></b><b></b><i></i><span>London office</span></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      keyboard: false, interactive: false,
    }).addTo(map);
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
    }, { rootMargin: '1500px 0px' });
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
    .from('.hero-lede, .hero-actions', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.55);

  // Facts strip rises in as it scrolls into view.
  gsap.from('.facts-list li', {
    y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: '.facts', start: 'top 85%', once: true },
  });

  // Hero image drifts slower than the page.
  gsap.to('[data-hero-media] img, [data-hero-media] video', {
    yPercent: -10, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Bento tiles assemble as they enter.
  gsap.from('.bento-tile', {
    y: 60, opacity: 0, scale: 0.96, duration: 1.1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity',
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
