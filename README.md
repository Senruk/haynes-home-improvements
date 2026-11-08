# Haynes Home Improvements

Website for Haynes Home Improvements: bespoke fitted furniture (fitted wardrobes, walk-in wardrobes and dressing rooms, loft and eaves storage, home offices and kitchens). The business is based in Bedford and covers London to Birmingham.

A static site with no build step: `index.html`, `styles.css` and `script.js`, plus images in `assets/`.

## Run locally

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## What's in it

- A sage green and beige design (the client's chosen colours), using the logo's sage.
- A hero image with a slot ready for a looping video (see the commented `<video>` in `index.html`).
- Service tiles, and a filterable gallery of 23 project photos with a full-size viewer.
- A four-step "How it works" section and a real coverage map (Leaflet with OpenStreetMap tiles tinted sage) centred on Bedford. If the map can't load, a drawn map is shown instead.
- A FAQ section with FAQPage structured data.
- A quote form set up for Netlify Forms, with a spam honeypot and client-side checks.
- A sticky Call / WhatsApp / Quote bar on phones.
- GSAP and Lenis for motion, loaded from CDNs, with reduced-motion respected throughout.
- Two components adapted from 21st.dev: Border Beam and Accordion.

## Before launch

- [ ] Hero video: add `assets/video/hero.mp4` and uncomment the `<video>` block.
- [x] Real phone number, WhatsApp and emails (added 2026-11-08).
- [ ] Live domain: replace `www.example.com` in `index.html` (canonical, Open Graph, JSON-LD), `robots.txt` and `sitemap.xml`.
- [ ] Add the Google Business Profile link to `sameAs` in the JSON-LD (Facebook and Instagram are in).
- [ ] Ask the client to confirm the process steps and the FAQ answers.
- [ ] Deploy to Netlify so the quote form delivers enquiries.
