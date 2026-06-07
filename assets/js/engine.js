/* ============================================================
   THEME ENGINE v4 — engine.js
   Public menu renderer.
   Reads menu.json → injects design tokens into :root →
   applies layout attributes to <body> → renders menu.
   No admin logic. No hidden state.
============================================================ */

const Engine = (() => {

  /* ── State ── */
  let state = { meta: {}, tokens: {}, layout: {}, categories: [], items: [], hero: {}, sections: [] };
  let activeCat = 'all';
  let searchQ   = '';

  /* ── Font catalog (all loadable via Google Fonts) ── */
  const FONT_URLS = {
    'Cormorant Garamond': 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap',
    'Playfair Display':   'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap',
    'DM Serif Display':   'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap',
    'Lora':               'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap',
    'Josefin Sans':       'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&display=swap',
    'Raleway':            'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap',
    'Montserrat':         'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
    'Jost':               'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap',
    'Inter':              'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap',
    'DM Sans':            'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap',
    'Nunito':             'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap',
    'Source Sans 3':      'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600&display=swap',
    'Lato':               'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',
  };

  /* ── Boot ── */
  async function init() {
    // Restore dark mode pref before first token injection to avoid flash
    const savedDark = localStorage.getItem('me_dark');
    if (savedDark !== null) {
      document.documentElement.setAttribute('data-mode', savedDark === 'true' ? 'dark' : 'light');
    }
    await load();
    injectFonts(state.tokens.fonts);
    applyLayoutAttrs(state.layout);
    applyMeta(state.meta);           // sets final data-mode (respects localStorage)
    applyTokens(state.tokens);       // reads data-mode AFTER applyMeta has set it
    buildCatNav();
    renderPageSections();
    render();
    bindEvents();
  }

  /* ── Fetch menu.json ── */
  async function load() {
    showLoading(true);
    try {
      const res  = await fetch(`data/menu.json?v=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d        = await res.json();
      state.meta       = d.meta       || {};
      state.tokens     = d.tokens     || {};
      state.layout     = d.layout     || {};
      state.categories = d.categories || [];
      state.items      = d.items      || [];
      state.hero       = d.hero       || { layout: 'minimal' };
      state.sections   = d.sections   || defaultSections();
    } catch (err) {
      console.error('menu.json load failed:', err);
      toast('Could not load menu — please refresh.', 'error');
    } finally {
      showLoading(false);
    }
  }

  /* ── Default sections config ── */
  function defaultSections() {
    return [
      { id: 'hero',        enabled: true,  order: 0 },
      { id: 'popular',     enabled: true,  order: 1 },
      { id: 'categories',  enabled: true,  order: 2 },
      { id: 'featured',    enabled: true,  order: 3 },
      { id: 'menu',        enabled: true,  order: 4 },
      { id: 'offers',      enabled: false, order: 5 },
      { id: 'reviews',     enabled: false, order: 6 },
      { id: 'contact',     enabled: false, order: 7 },
    ];
  }

  /* ── Page section orchestrator ── */
  function renderPageSections() {
    const container = document.getElementById('page-sections');
    if (!container) return;
    container.innerHTML = '';

    const sections = [...state.sections]
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .filter(s => s.enabled !== false);

    sections.forEach(sec => {
      if (sec.id === 'hero') {
        container.appendChild(renderHero());
      } else if (sec.id === 'popular') {
        const el = renderPopularSection();
        if (el) container.appendChild(el);
      } else if (sec.id === 'categories') {
        const el = renderCategoriesSection();
        if (el) container.appendChild(el);
      } else if (sec.id === 'featured') {
        const el = renderFeaturedSection();
        if (el) container.appendChild(el);
      } else if (sec.id === 'offers') {
        container.appendChild(renderOffersSection());
      } else if (sec.id === 'reviews') {
        container.appendChild(renderReviewsSection());
      } else if (sec.id === 'contact') {
        container.appendChild(renderContactSection());
      }
      // 'menu' section is handled by the existing #menu-content + render()
    });
  }

  /* ── Hero rendering ── */
  function renderHero() {
    const h    = state.hero   || {};
    const meta = state.meta   || {};
    const layout = h.layout   || 'minimal';

    const wrap = document.createElement('section');
    wrap.className = 'menu-hero';
    wrap.id = 'hero-section';

    const title    = meta.heroTitle || meta.name || 'Our Menu';
    const sub      = meta.heroSub   || '';
    const ctaLabel = h.ctaLabel     || 'View Menu';
    const logoImg  = meta.logoImage  || '';
    const name     = meta.name       || 'Maison Élite';

    const ctaBtn = `<button class="hero-cta" onclick="document.getElementById('menu-content').scrollIntoView({behavior:'smooth'})">
      ${ctaLabel} <i class="fa-solid fa-arrow-down"></i>
    </button>`;

    if (layout === 'minimal') {
      wrap.innerHTML = `
        <div class="hero-minimal">
          <div class="hero-noise"></div>
          <div class="hero-ornament">
            <span class="hero-line"></span>
            <i class="fa-solid fa-utensils"></i>
            <span class="hero-line"></span>
          </div>
          <h1 class="hero-title">${title}</h1>
          <p class="hero-sub">${sub}</p>
          <div class="hero-rule"><i class="fa-solid fa-star"></i></div>
        </div>`;

    } else if (layout === 'cover') {
      const imgSrc  = h.coverImage   || '';
      const imgH    = h.imageHeight  || 480;
      const opacity = h.overlayOpacity !== undefined ? h.overlayOpacity : 0.55;
      wrap.innerHTML = `
        <div class="hero-cover" style="min-height:${imgH}px;${imgSrc ? `background-image:url('${imgSrc}')` : ''}">
          <div class="hero-cover-overlay" style="background:linear-gradient(to top,rgba(0,0,0,${opacity}) 0%,rgba(0,0,0,${Math.max(0,opacity-0.4)}) 60%)"></div>
          <div class="hero-logo">
            ${logoImg ? `<img src="${logoImg}" alt="${name}"/>` : `<i class="fa-solid fa-utensils"></i>`}
          </div>
          <div class="hero-inner">
            <h1 class="hero-title">${title}</h1>
            <p class="hero-sub">${sub}</p>
            ${ctaBtn}
          </div>
        </div>`;

    } else if (layout === 'chef') {
      const imgSrc = h.chefImage || '';
      wrap.innerHTML = `
        <div class="hero-chef">
          <div class="hero-chef-card">
            ${imgSrc ? `<img class="hero-chef-img" src="${imgSrc}" alt="Chef"/>` : ''}
            <div class="hero-chef-body">
              <h1 class="hero-title">${title}</h1>
              <p class="hero-sub">${sub}</p>
              ${ctaBtn}
            </div>
          </div>
        </div>`;

    } else if (layout === 'luxury') {
      const imgSrc = h.bgImage || '';
      wrap.innerHTML = `
        <div class="hero-luxury" ${imgSrc ? `style="background-image:url('${imgSrc}')"` : ''}>
          <div class="hero-luxury-overlay"></div>
          <div class="hero-inner">
            <div class="hero-ornament">
              <span class="hero-line"></span>
              <i class="fa-solid fa-crown"></i>
              <span class="hero-line"></span>
            </div>
            <h1 class="hero-title">${title}</h1>
            <p class="hero-sub">${sub}</p>
            <div class="hero-rule"><i class="fa-solid fa-star"></i></div>
            ${ctaBtn}
          </div>
        </div>`;

    } else if (layout === 'dish') {
      // Pick first featured item for the dish hero
      const featured = state.items.find(i => i.featured) || state.items[0];
      const currency = state.meta.currency || 'DA';
      const pos      = state.meta.currencyPosition || 'after';
      const dishImg  = h.dishImage || (featured ? featured.image : '');
      const dishName = h.dishName  || (featured ? featured.name : title);
      const dishDesc = h.dishDesc  || (featured ? featured.description : sub);
      const dishPrice = h.dishPrice !== undefined ? h.dishPrice : (featured ? featured.price : '');
      const priceStr = dishPrice
        ? (pos === 'before' ? `${currency} ${Number(dishPrice).toLocaleString('fr-DZ')}` : `${Number(dishPrice).toLocaleString('fr-DZ')} ${currency}`)
        : '';

      wrap.innerHTML = `
        <div class="hero-dish">
          <div class="hero-dish-img-wrap">
            ${dishImg ? `<img src="${dishImg}" alt="${dishName}"/>` : ''}
          </div>
          <div class="hero-dish-body">
            <div class="hero-dish-eyebrow"><i class="fa-solid fa-star"></i> Featured Dish</div>
            <h1 class="hero-title">${dishName}</h1>
            ${priceStr ? `<div class="hero-dish-price">${priceStr}</div>` : ''}
            <p class="hero-dish-desc">${dishDesc}</p>
            ${ctaBtn}
          </div>
        </div>`;

    } else if (layout === 'video') {
      const videoSrc = h.videoUrl || '';
      wrap.innerHTML = `
        <div class="hero-video">
          ${videoSrc ? `<div class="hero-video-bg"><video autoplay muted loop playsinline src="${videoSrc}"></video></div>` : ''}
          <div class="hero-video-overlay"></div>
          <div class="hero-inner">
            <h1 class="hero-title">${title}</h1>
            <p class="hero-sub">${sub}</p>
            ${ctaBtn}
          </div>
        </div>`;
    }

    return wrap;
  }

  /* ── Section: Popular Today ── */
  function renderPopularSection() {
    const popular = state.items.filter(i => i.featured || i.tag === 'Popular').slice(0, 8);
    if (!popular.length) return null;
    const currency = state.meta.currency || 'DA';
    const pos      = state.meta.currencyPosition || 'after';
    const wrap = document.createElement('div');
    wrap.className = 'page-section section-popular';
    wrap.innerHTML = `
      <div class="section-inner">
        <div class="section-heading">
          <div class="section-heading-accent"></div>
          <div class="section-heading-text">
            <h2>Popular Today</h2>
            <p>Our guests' most-loved dishes this week</p>
          </div>
        </div>
        <div class="popular-scroll">
          ${popular.map(item => {
            const p = pos === 'before'
              ? `${currency} ${Number(item.price).toLocaleString('fr-DZ')}`
              : `${Number(item.price).toLocaleString('fr-DZ')} ${currency}`;
            return `
              <div class="popular-card">
                ${item.image ? `<img class="popular-card-img" src="${item.image}" alt="${item.name}" loading="lazy"/>` : `<div class="popular-card-img"></div>`}
                <div class="popular-card-body">
                  <div class="popular-card-name">${item.name}</div>
                  <div class="popular-card-price">${p}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    return wrap;
  }

  /* ── Section: Categories showcase ── */
  function renderCategoriesSection() {
    const cats = state.categories.filter(c => c.visible !== false)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    if (!cats.length) return null;
    const wrap = document.createElement('div');
    wrap.className = 'page-section section-categories';
    wrap.innerHTML = `
      <div class="section-inner">
        <div class="section-heading">
          <div class="section-heading-accent"></div>
          <div class="section-heading-text">
            <h2>Explore Our Menu</h2>
            <p>Browse dishes by category</p>
          </div>
        </div>
        <div class="categories-showcase">
          ${cats.map(cat => {
            const count = state.items.filter(i => i.category === cat.id).length;
            return `
              <div class="cat-showcase-card"
                   onclick="document.getElementById('cat-${cat.id}')?.scrollIntoView({behavior:'smooth'})">
                <div class="cat-showcase-icon"><i class="fa-solid ${cat.icon}"></i></div>
                <div class="cat-showcase-name">${cat.name}</div>
                <div class="cat-showcase-count">${count} item${count !== 1 ? 's' : ''}</div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    return wrap;
  }

  /* ── Section: Featured Dishes ── */
  function renderFeaturedSection() {
    const items = state.items.filter(i => i.featured);
    if (!items.length) return null;
    const currency = state.meta.currency || 'DA';
    const pos      = state.meta.currencyPosition || 'after';
    const wrap = document.createElement('div');
    wrap.className = 'page-section section-featured';
    wrap.innerHTML = `
      <div class="section-inner">
        <div class="section-heading">
          <div class="section-heading-accent"></div>
          <div class="section-heading-text">
            <h2>Chef's Selections</h2>
            <p>Handpicked signature dishes from our kitchen</p>
          </div>
        </div>
        <div class="featured-grid">
          ${items.map(item => {
            const p = pos === 'before'
              ? `${currency} ${Number(item.price).toLocaleString('fr-DZ')}`
              : `${Number(item.price).toLocaleString('fr-DZ')} ${currency}`;
            return `
              <div class="featured-card">
                ${item.image ? `<img class="featured-card-img" src="${item.image}" alt="${item.name}" loading="lazy"/>` : `<div class="featured-card-img"></div>`}
                <div class="featured-card-body">
                  <div class="featured-badge"><i class="fa-solid fa-star"></i> Featured</div>
                  <div class="featured-name">${item.name}</div>
                  <div class="featured-desc">${item.description || ''}</div>
                  <div class="featured-footer">
                    <div class="featured-price">${p}</div>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    return wrap;
  }

  /* ── Section: Special Offers (placeholder content) ── */
  function renderOffersSection() {
    const offers = state.offers || [
      { tag: 'Weekend Special', title: 'Lunch for Two', desc: 'Two mains + two desserts at a special price every Saturday & Sunday.', badge: 'Save 20%' },
      { tag: 'Happy Hour', title: 'Drinks & Bites', desc: 'Selected starters and beverages at reduced prices, daily 5–7 PM.', badge: 'Every Evening' },
      { tag: 'Chef\'s Table', title: 'Tasting Menu', desc: 'A curated 5-course experience prepared personally by our head chef.', badge: 'By Reservation' },
    ];
    const wrap = document.createElement('div');
    wrap.className = 'page-section section-offers';
    wrap.innerHTML = `
      <div class="section-inner">
        <div class="section-heading">
          <div class="section-heading-accent"></div>
          <div class="section-heading-text">
            <h2>Special Offers</h2>
            <p>Exclusive deals curated for our guests</p>
          </div>
        </div>
        <div class="offers-grid">
          ${offers.map(o => `
            <div class="offer-card">
              <div class="offer-tag">${o.tag}</div>
              <div class="offer-title">${o.title}</div>
              <div class="offer-desc">${o.desc}</div>
              <span class="offer-badge">${o.badge}</span>
            </div>`).join('')}
        </div>
      </div>`;
    return wrap;
  }

  /* ── Section: Reviews (placeholder content) ── */
  function renderReviewsSection() {
    const reviews = state.reviews || [
      { text: 'An absolutely extraordinary dining experience. The ambiance, the service, and every single dish was perfection.', author: 'Sophie M.', date: 'May 2025', stars: 5 },
      { text: 'The Côte de Boeuf alone is worth the trip. Perfectly cooked, incredible flavour. We will be back.', author: 'James R.', date: 'April 2025', stars: 5 },
      { text: 'Elegant and refined. Every detail was thoughtful — from the bread to the desserts. A true gem.', author: 'Nadia K.', date: 'April 2025', stars: 5 },
    ];
    const wrap = document.createElement('div');
    wrap.className = 'page-section section-reviews';
    wrap.innerHTML = `
      <div class="section-inner">
        <div class="section-heading">
          <div class="section-heading-accent"></div>
          <div class="section-heading-text">
            <h2>What Our Guests Say</h2>
            <p>Experiences from the table</p>
          </div>
        </div>
        <div class="reviews-grid">
          ${reviews.map(r => `
            <div class="review-card">
              <div class="review-stars">${'★'.repeat(r.stars)}</div>
              <div class="review-text">"${r.text}"</div>
              <div class="review-author">
                <div class="review-avatar">${r.author.charAt(0)}</div>
                <div>
                  <div class="review-name">${r.author}</div>
                  <div class="review-date">${r.date}</div>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    return wrap;
  }

  /* ── Section: Contact ── */
  function renderContactSection() {
    const meta = state.meta || {};

    // All possible contact fields — only render those with a value AND enabled
    const ALL_FIELDS = [
      { key: 'address',   icon: 'fa-map-pin',       label: 'Address'       },
      { key: 'phone',     icon: 'fa-phone',          label: 'Phone'         },
      { key: 'hours',     icon: 'fa-clock',          label: 'Hours'         },
      { key: 'email',     icon: 'fa-envelope',       label: 'Reservations'  },
      { key: 'website',   icon: 'fa-globe',          label: 'Website'       },
      { key: 'instagram', icon: 'fa-instagram',      label: 'Instagram'     },
      { key: 'facebook',  icon: 'fa-facebook',       label: 'Facebook'      },
      { key: 'whatsapp',  icon: 'fa-whatsapp',       label: 'WhatsApp'      },
    ];

    const contactShow = meta.contactShow || {};
    const visible = ALL_FIELDS.filter(f => {
      const val = meta[f.key];
      if (!val || !val.toString().trim()) return false;             // no value → hidden
      return contactShow[f.key] !== false;                          // explicitly disabled → hidden
    });

    if (!visible.length) {
      // Still render section shell so Studio preview shows something
      visible.push(
        { key: '_placeholder', icon: 'fa-map-pin', label: 'Address',  value: '12 Rue de la Paix, Algiers' },
        { key: '_placeholder', icon: 'fa-phone',   label: 'Phone',    value: '+213 21 XX XX XX' },
        { key: '_placeholder', icon: 'fa-clock',   label: 'Hours',    value: 'Mon–Sat 12:00–23:00' },
      );
    }

    const wrap = document.createElement('div');
    wrap.className = 'page-section section-contact';
    wrap.innerHTML = `
      <div class="section-inner">
        <div class="section-heading">
          <div class="section-heading-accent"></div>
          <div class="section-heading-text">
            <h2>${meta.contactTitle || 'Find Us'}</h2>
            <p>${meta.contactSubtitle || 'We look forward to welcoming you'}</p>
          </div>
        </div>
        <div class="contact-grid">
          ${visible.map(it => {
            const val = it.value || meta[it.key] || '';
            const isSocial = ['instagram','facebook','whatsapp','website'].includes(it.key);
            const isFA = ['fa-instagram','fa-facebook','fa-whatsapp'].includes(it.icon);
            const iconPrefix = isFA ? 'fa-brands' : 'fa-solid';
            return `
            <div class="contact-card">
              <div class="contact-icon"><i class="${iconPrefix} ${it.icon}"></i></div>
              <div class="contact-label">${it.label}</div>
              <div class="contact-value">${isSocial && val.startsWith('http')
                ? `<a href="${val}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${val.replace(/^https?:\/\/(www\.)?/,'')}</a>`
                : val}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    return wrap;
  }

  /* ── Token injection ── */
  /* Takes a tokens object (same shape as menu.json#tokens) and
     writes a :root {} block into <style id="live-tokens">.
     Called by engine on load; called by studio on every change. */
  function applyTokens(tokens) {
    if (!tokens || !tokens.colors) return;

    const isDark = document.documentElement.getAttribute('data-mode') === 'dark';

    // Use explicit dark palette if provided, otherwise use light colours
    const c  = isDark && tokens.darkColors ? tokens.darkColors : tokens.colors;
    const sh = tokens.shadow  || {};
    const r  = tokens.radius  || {};
    const sp = tokens.spacing || {};
    const f  = tokens.fonts   || {};

    const shadowSm = isDark ? '0 2px 8px rgba(0,0,0,.35)'    : (sh.sm || '0 2px 8px rgba(26,24,20,.07)');
    const shadowMd = isDark ? '0 8px 28px rgba(0,0,0,.5)'    : (sh.md || '0 8px 28px rgba(26,24,20,.12)');
    const shadowLg = isDark ? '0 20px 56px rgba(0,0,0,.65)'  : (sh.lg || '0 20px 56px rgba(26,24,20,.18)');

    const vars = {
      '--c-primary':      c.primary      || '#c09a5a',
      '--c-primary-dk':   c.primaryDark  || '#8c6e38',
      '--c-primary-lt':   c.primaryLight || '#d4b278',
      '--c-bg':           c.background   || '#f8f4ee',
      '--c-surface':      c.surface      || '#ffffff',
      '--c-surface-mid':  c.surfaceMid   || '#f0e9dc',
      '--c-surface-deep': c.surfaceDeep  || '#e5d9c7',
      '--c-text':         c.text         || '#1a1814',
      '--c-text-soft':    c.textSoft     || '#6b6058',
      '--c-text-muted':   c.textMuted    || '#9e9488',
      '--c-border':       c.border       || '#ddd4c0',
      '--c-border-lt':    c.borderLight  || '#ece5d8',
      '--sh-sm':          shadowSm,
      '--sh-md':          shadowMd,
      '--sh-lg':          shadowLg,
      '--r-base':         r.base || '14px',
      '--r-card':         r.card || '14px',
      '--r-sm':           r.sm   || '9px',
      '--r-pill':         r.pill || '50px',
      '--sp-section':     sp.sectionGap  || '56px',
      '--sp-card-gap':    sp.cardGap     || '20px',
      '--sp-card-pad':    sp.cardPadding || '18px',
      '--ff-display':     fontStack(f.display, 'Georgia, serif'),
      '--ff-body':        fontStack(f.body,    'system-ui, sans-serif'),
      '--ff-accent':      fontStack(f.accent,  'system-ui, sans-serif'),
      '--hero-bg':        `linear-gradient(160deg, ${c.surfaceMid} 0%, ${c.background} 100%)`,
    };

    const css = `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
    let el = document.getElementById('live-tokens');
    if (!el) {
      el = document.createElement('style');
      el.id = 'live-tokens';
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  function fontStack(name, fallback) {
    if (!name) return fallback;
    return `'${name}', ${fallback}`;
  }

  /* ── Font loading ── */
  function injectFonts(fonts) {
    if (!fonts) return;
    const toLoad = new Set([fonts.display, fonts.body, fonts.accent].filter(Boolean));
    toLoad.forEach(name => {
      const url = FONT_URLS[name];
      if (!url) return;
      const id = `gf-${name.replace(/\s+/g, '-')}`;
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id   = id;
      link.rel  = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /* ── Layout attributes ── */
  function applyLayoutAttrs(layout) {
    if (!layout) return;
    const b = document.body;
    b.setAttribute('data-layout',       layout.mode       || 'grid');
    b.setAttribute('data-columns',      layout.columns    || 3);
    b.setAttribute('data-density',      layout.density    || 'normal');
    b.setAttribute('data-card-style',   layout.cardStyle  || 'shadow');
    b.setAttribute('data-image-ratio',  layout.imageRatio || '4:3');
  }

  /* ── Meta / branding ── */
  function applyMeta(meta) {
    if (!meta) return;
    const name    = meta.name    || 'Maison Élite';
    const tagline = meta.tagline || '';

    document.title = `${name} — Menu`;

    const brandName = document.querySelector('.brand-name');
    const brandSub  = document.querySelector('.brand-sub');
    if (brandName) brandName.textContent = name;
    if (brandSub)  brandSub.textContent  = tagline;

    const brandMark = document.querySelector('.brand-mark');
    if (brandMark) {
      brandMark.innerHTML = meta.logoImage
        ? `<img src="${meta.logoImage}" alt="${name}" class="brand-logo-img"/>`
        : `<i class="fa-solid fa-utensils"></i>`;
    }

    const footer = document.querySelector('.site-footer');
    if (footer) {
      footer.innerHTML = `<strong>${name}</strong> &nbsp;·&nbsp; ${tagline}
        &nbsp;·&nbsp; <span id="yr"></span>`;
      const yr = document.getElementById('yr');
      if (yr) yr.textContent = new Date().getFullYear();
    }

    // Dark mode — localStorage pref takes priority over meta.darkMode
    const savedDark = localStorage.getItem('me_dark');
    const dark = savedDark !== null ? savedDark === 'true' : (meta.darkMode || false);
    document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
    syncDarkIcon(dark);
  }

  function parseHeroTitle(raw) {
    // *word* → <em>word</em>, safe — no other HTML interpretation
    return raw.replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  /* ── Dark mode toggle ── */
  function toggleDark() {
    const isDark = document.documentElement.getAttribute('data-mode') === 'dark';
    const next   = !isDark;
    document.documentElement.setAttribute('data-mode', next ? 'dark' : 'light');
    syncDarkIcon(next);
    localStorage.setItem('me_dark', next);
    // Re-inject tokens so dark colour derivation runs with new mode
    if (state.tokens) applyTokens(state.tokens);
  }
  function syncDarkIcon(dark) {
    document.querySelectorAll('.dark-icon').forEach(i => {
      i.className = `fa-solid ${dark ? 'fa-sun' : 'fa-moon'} dark-icon`;
    });
  }

  /* ── Loading ── */
  function showLoading(on) {
    document.getElementById('menu-loading')?.classList.toggle('hidden', !on);
    const content = document.getElementById('menu-content');
    if (content) content.style.visibility = on ? 'hidden' : 'visible';
  }

  /* ── Category nav ── */
  function buildCatNav() {
    const nav = document.getElementById('cat-nav');
    if (!nav) return;
    nav.innerHTML = '';

    const all = document.createElement('button');
    all.className   = 'cat-pill active';
    all.dataset.cat = 'all';
    all.innerHTML   = `<i class="fa-solid fa-border-all"></i> All`;
    all.addEventListener('click', () => filterCat('all'));
    nav.appendChild(all);

    state.categories
      .filter(c => c.visible !== false)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .forEach(cat => {
        const btn = document.createElement('button');
        btn.className   = 'cat-pill';
        btn.dataset.cat = cat.id;
        btn.innerHTML   = `<i class="fa-solid ${cat.icon}"></i> ${cat.name}`;
        btn.addEventListener('click', () => filterCat(cat.id));
        nav.appendChild(btn);
      });
  }

  function filterCat(cat) {
    activeCat = cat;
    document.querySelectorAll('.cat-pill')
      .forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
    render();
    if (cat !== 'all') {
      const sec = document.getElementById(`cat-${cat}`);
      if (sec) setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ── Render ── */
  function render() {
    const content   = document.getElementById('menu-content');
    const noResults = document.getElementById('no-results');
    if (!content) return;

    content.querySelectorAll('.cat-section').forEach(s => s.remove());
    noResults.classList.add('hidden');

    const cats = state.categories
      .filter(c => c.visible !== false && (activeCat === 'all' || c.id === activeCat))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    const currency = state.meta.currency            || 'DA';
    const pos      = state.meta.currencyPosition    || 'after';
    let   total    = 0;

    cats.forEach(cat => {
      let items = state.items.filter(i => i.category === cat.id);
      if (searchQ) {
        items = items.filter(i =>
          i.name.toLowerCase().includes(searchQ) ||
          (i.description || '').toLowerCase().includes(searchQ)
        );
      }
      if (!items.length) return;
      total += items.length;

      const sec = document.createElement('section');
      sec.className = 'cat-section';
      sec.id        = `cat-${cat.id}`;
      sec.innerHTML = `
        <div class="cat-header">
          <div class="cat-header-left">
            <div class="cat-icon-badge"><i class="fa-solid ${cat.icon}"></i></div>
            <div>
              <h2 class="cat-title">${cat.name}</h2>
              <p class="cat-desc">${cat.description || ''}</p>
            </div>
          </div>
        </div>
        <div class="items-grid">
          ${items.map(item => cardHTML(item, currency, pos)).join('')}
        </div>`;
      content.appendChild(sec);
    });

    if (total === 0) {
      noResults.classList.remove('hidden');
      const st = document.getElementById('search-term');
      if (st) st.textContent = searchQ || activeCat;
    }
  }

  /* ── Card HTML ── */
  function cardHTML(item, currency, pos) {
    // Badge — featured takes priority, then tag
    let badgeHTML = '';
    if (item.featured) {
      badgeHTML = `<span class="card-badge badge-featured">Featured</span>`;
    } else if (item.tag) {
      const cls = { Popular: 'badge-popular', New: 'badge-new', Special: 'badge-special' };
      badgeHTML = `<span class="card-badge ${cls[item.tag] || ''}">${item.tag}</span>`;
    }

    const oosHTML = !item.available
      ? `<div class="oos-overlay"><span class="oos-label"><i class="fa-solid fa-ban"></i> Out of Stock</span></div>`
      : '';

    const price    = Number(item.price).toLocaleString('fr-DZ');
    const priceStr = pos === 'before' ? `${currency} ${price}` : `${price} ${currency}`;

    const imgSrc = item.image || '';

    return `
      <article class="menu-card${!item.available ? ' unavailable' : ''}">
        <div class="card-img-wrap" id="cw-${item.id}">
          <img src="${imgSrc}" alt="${item.name}" loading="lazy"
               onerror="Engine.imgFallback(${item.id})"/>
          <div class="img-fallback">
            <i class="fa-solid fa-image"></i>
            <span>No image</span>
          </div>
          ${badgeHTML}${oosHTML}
        </div>
        <div class="card-body">
          <h3 class="card-name">${item.name}</h3>
          <p class="card-desc">${item.description || ''}</p>
          <div class="card-footer">
            <span class="card-price">${priceStr}</span>
          </div>
        </div>
      </article>`;
  }

  function imgFallback(id) {
    document.getElementById(`cw-${id}`)?.classList.add('no-img');
  }

  /* ── Events ── */
  function bindEvents() {
    const search = document.getElementById('menu-search');
    if (search) {
      search.addEventListener('input', e => {
        searchQ = e.target.value.toLowerCase().trim();
        render();
      });
    }
    window.addEventListener('scroll', () => {
      document.getElementById('site-header')
        ?.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
  }

  /* ── Toast ── */
  function toast(msg, type = 'info') {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    document.getElementById('toast-container')?.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 3400);
  }

  /* ── Public API ── */
  return { init, toggleDark, imgFallback, applyTokens, injectFonts, applyLayoutAttrs, syncDarkIcon, applyMeta, renderPageSections, render };

})();

document.addEventListener('DOMContentLoaded', () => Engine.init());

/* ── Accept live token pushes from parent studio window ── */
window.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'TOKEN_UPDATE') return;

  // 1. Dark mode — must be first so applyTokens reads correct data-mode
  if (e.data.darkMode !== undefined) {
    document.documentElement.setAttribute('data-mode', e.data.darkMode ? 'dark' : 'light');
    Engine.syncDarkIcon?.(e.data.darkMode);
  }

  // 2. Tokens / fonts / layout — pure CSS variable writes, no DOM rebuild
  if (e.data.tokens)        Engine.applyTokens(e.data.tokens);
  if (e.data.tokens?.fonts) Engine.injectFonts(e.data.tokens.fonts);
  if (e.data.layout)        Engine.applyLayoutAttrs(e.data.layout);

  // 3. If meta/hero/sections changed, update state FIRST then re-render
  const needsRender = e.data.hero !== undefined || e.data.sections !== undefined || e.data.meta !== undefined;
  if (needsRender) {
    if (e.data.hero)     state.hero     = e.data.hero;
    if (e.data.sections) state.sections = e.data.sections;
    if (e.data.meta)     state.meta     = { ...state.meta, ...e.data.meta };
    // Apply meta branding (header, footer, title) — state already updated
    Engine.applyMeta?.(state.meta);
    // Re-render all dynamic page sections with fresh state
    Engine.renderPageSections?.();
    // Re-render menu cards (currency symbol / position may have changed)
    Engine.render?.();
  }
});
