/* ============================================================
   THEME ENGINE v4 — studio.js
   Design studio. Single file, no dependencies beyond engine.js.
   State lives entirely in `doc` (mirrors menu.json exactly).
   Every change calls applyLive() → updates preview iframe.
   Export writes the full doc back to menu.json via ZIP.
============================================================ */

const Studio = (() => {

  /* ══════════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════ */

  let doc = {
    meta:       {},
    tokens:     { colors:{}, shadow:{}, radius:{}, spacing:{}, fonts:{} },
    layout:     {},
    categories: [],
    items:      [],
    hero:       { layout: 'minimal' },
    sections:   []
  };

  let uploadedImages = {}; // filename → dataURL
  let editItemId     = null;
  let editCatId      = null;
  let confirmCb      = null;
  let activeTab      = 'design';
  let activeColorTab = 'light';

  /* ── Default sections ── */
  function DEFAULT_SECTIONS() {
    return [
      { id: 'hero',       label: 'Hero',             icon: 'fa-image',          enabled: true,  order: 0 },
      { id: 'popular',    label: 'Popular Today',     icon: 'fa-fire',           enabled: true,  order: 1 },
      { id: 'categories', label: 'Categories',        icon: 'fa-tags',           enabled: true,  order: 2 },
      { id: 'featured',   label: 'Featured Dishes',   icon: 'fa-star',           enabled: true,  order: 3 },
      { id: 'menu',       label: 'Menu Items',        icon: 'fa-bowl-food',      enabled: true,  order: 4 },
      { id: 'offers',     label: 'Special Offers',    icon: 'fa-percent',        enabled: false, order: 5 },
      { id: 'reviews',    label: 'Reviews',           icon: 'fa-comment-dots',   enabled: false, order: 6 },
      { id: 'contact',    label: 'Contact Information', icon: 'fa-map-pin',      enabled: false, order: 7 },
    ];
  }

  /* ── Hero layouts catalog ── */
  const HERO_LAYOUTS = [
    { id: 'minimal', label: 'Minimal',         icon: 'fa-minus',       desc: 'Title · subtitle · ornaments' },
    { id: 'cover',   label: 'Cover Image',     icon: 'fa-image',       desc: 'Full cover · logo · CTA' },
    { id: 'chef',    label: 'Chef Welcome',    icon: 'fa-user-tie',    desc: 'Portrait card · title · CTA' },
    { id: 'luxury',  label: 'Luxury Fullscreen', icon: 'fa-crown',     desc: 'Full-viewport · large type' },
    { id: 'dish',    label: 'Featured Dish',   icon: 'fa-utensils',    desc: 'Split dish image · price · CTA' },
    { id: 'video',   label: 'Video Hero',      icon: 'fa-video',       desc: 'Background video · overlay' },
  ];

  /* ══════════════════════════════════════════════════════════
     PRESETS  (10 themes × color + shadow tokens)
     All other tokens (radius, spacing, fonts) keep their
     current value when switching preset — only colors change.
  ══════════════════════════════════════════════════════════ */

  const PRESETS = {
    gold: {
      label: 'Gold', swatch: '#c09a5a', bg: '#f8f4ee',
      colors: {
        primary:'#c09a5a', primaryDark:'#8c6e38', primaryLight:'#d4b278',
        background:'#f8f4ee', surface:'#ffffff',
        surfaceMid:'#f0e9dc', surfaceDeep:'#e5d9c7',
        text:'#1a1814', textSoft:'#6b6058', textMuted:'#9e9488',
        border:'#ddd4c0', borderLight:'#ece5d8'
      },
      shadow: {
        sm:'0 2px 8px rgba(26,24,20,.07)',
        md:'0 8px 28px rgba(26,24,20,.12)',
        lg:'0 20px 56px rgba(26,24,20,.18)'
      }
    },
    rouge: {
      label: 'Rouge', swatch: '#c0373a', bg: '#fdf5f5',
      colors: {
        primary:'#c0373a', primaryDark:'#8c2224', primaryLight:'#d45a5d',
        background:'#fdf5f5', surface:'#ffffff',
        surfaceMid:'#f7e8e8', surfaceDeep:'#edd8d8',
        text:'#1a0d0d', textSoft:'#6b4444', textMuted:'#9e7878',
        border:'#e8cecd', borderLight:'#f2e2e2'
      },
      shadow: {
        sm:'0 2px 8px rgba(26,13,13,.07)',
        md:'0 8px 28px rgba(26,13,13,.12)',
        lg:'0 20px 56px rgba(26,13,13,.18)'
      }
    },
    foret: {
      label: 'Forêt', swatch: '#3a7a46', bg: '#f4f8f2',
      colors: {
        primary:'#3a7a46', primaryDark:'#285933', primaryLight:'#57a163',
        background:'#f4f8f2', surface:'#ffffff',
        surfaceMid:'#e6f0e3', surfaceDeep:'#d4e5cf',
        text:'#0d1a10', textSoft:'#4a6b50', textMuted:'#7a9e80',
        border:'#c8ddc6', borderLight:'#deeedd'
      },
      shadow: {
        sm:'0 2px 8px rgba(13,26,16,.07)',
        md:'0 8px 28px rgba(13,26,16,.12)',
        lg:'0 20px 56px rgba(13,26,16,.18)'
      }
    },
    ardoise: {
      label: 'Ardoise', swatch: '#3a6494', bg: '#f2f5f8',
      colors: {
        primary:'#3a6494', primaryDark:'#284a70', primaryLight:'#5a86b8',
        background:'#f2f5f8', surface:'#ffffff',
        surfaceMid:'#e3eaf2', surfaceDeep:'#cfdae8',
        text:'#0d1520', textSoft:'#486080', textMuted:'#7898b8',
        border:'#c4d4e8', borderLight:'#dae6f2'
      },
      shadow: {
        sm:'0 2px 8px rgba(13,21,32,.07)',
        md:'0 8px 28px rgba(13,21,32,.12)',
        lg:'0 20px 56px rgba(13,21,32,.18)'
      }
    },
    ivoire: {
      label: 'Ivoire', swatch: '#2c2c2c', bg: '#fafaf8',
      colors: {
        primary:'#2c2c2c', primaryDark:'#111111', primaryLight:'#555555',
        background:'#fafaf8', surface:'#ffffff',
        surfaceMid:'#f2f2ee', surfaceDeep:'#e8e8e2',
        text:'#111111', textSoft:'#444444', textMuted:'#999999',
        border:'#e0e0d8', borderLight:'#ebebea'
      },
      shadow: {
        sm:'0 2px 8px rgba(0,0,0,.05)',
        md:'0 8px 28px rgba(0,0,0,.09)',
        lg:'0 20px 56px rgba(0,0,0,.14)'
      }
    },
    braise: {
      label: 'Braise', swatch: '#c86428', bg: '#fdf6f0',
      colors: {
        primary:'#c86428', primaryDark:'#9a4818', primaryLight:'#e0864a',
        background:'#fdf6f0', surface:'#ffffff',
        surfaceMid:'#f8ece0', surfaceDeep:'#f0dcc8',
        text:'#1a0e06', textSoft:'#6b4828', textMuted:'#9e7858',
        border:'#e8d0b8', borderLight:'#f2e4d0'
      },
      shadow: {
        sm:'0 2px 8px rgba(26,14,6,.07)',
        md:'0 8px 28px rgba(26,14,6,.12)',
        lg:'0 20px 56px rgba(26,14,6,.18)'
      }
    },
    lavande: {
      label: 'Lavande', swatch: '#7048c0', bg: '#f7f4fc',
      colors: {
        primary:'#7048c0', primaryDark:'#50309a', primaryLight:'#9470d8',
        background:'#f7f4fc', surface:'#ffffff',
        surfaceMid:'#ede6f8', surfaceDeep:'#ded4f0',
        text:'#130d20', textSoft:'#5a4878', textMuted:'#9080b0',
        border:'#d8caf0', borderLight:'#ece4f8'
      },
      shadow: {
        sm:'0 2px 8px rgba(19,13,32,.07)',
        md:'0 8px 28px rgba(19,13,32,.12)',
        lg:'0 20px 56px rgba(19,13,32,.18)'
      }
    },
    rose: {
      label: 'Rosé', swatch: '#b84870', bg: '#fdf5f7',
      colors: {
        primary:'#b84870', primaryDark:'#8a3055', primaryLight:'#d06890',
        background:'#fdf5f7', surface:'#ffffff',
        surfaceMid:'#f8e8ed', surfaceDeep:'#f0d4de',
        text:'#1a0d12', textSoft:'#6b4055', textMuted:'#9e7085',
        border:'#eac8d4', borderLight:'#f4dde6'
      },
      shadow: {
        sm:'0 2px 8px rgba(26,13,18,.07)',
        md:'0 8px 28px rgba(26,13,18,.12)',
        lg:'0 20px 56px rgba(26,13,18,.18)'
      }
    },
    minuit: {
      label: 'Minuit', swatch: '#4040a0', bg: '#f0f0f4',
      colors: {
        primary:'#4040a0', primaryDark:'#282878', primaryLight:'#6060c0',
        background:'#f0f0f4', surface:'#ffffff',
        surfaceMid:'#e4e4ec', surfaceDeep:'#d4d4e0',
        text:'#08081a', textSoft:'#404068', textMuted:'#7070a0',
        border:'#c8c8e0', borderLight:'#dcdcee'
      },
      shadow: {
        sm:'0 2px 8px rgba(8,8,26,.07)',
        md:'0 8px 28px rgba(8,8,26,.12)',
        lg:'0 20px 56px rgba(8,8,26,.18)'
      }
    },
    terra: {
      label: 'Terra', swatch: '#a05030', bg: '#faf4ef',
      colors: {
        primary:'#a05030', primaryDark:'#783820', primaryLight:'#c07050',
        background:'#faf4ef', surface:'#ffffff',
        surfaceMid:'#f4e8de', surfaceDeep:'#e8d4c4',
        text:'#1a0e08', textSoft:'#6b4830', textMuted:'#9e7860',
        border:'#e0c8b4', borderLight:'#eedece'
      },
      shadow: {
        sm:'0 2px 8px rgba(26,14,8,.07)',
        md:'0 8px 28px rgba(26,14,8,.12)',
        lg:'0 20px 56px rgba(26,14,8,.18)'
      }
    }
  };


  /* ── Explicit dark palettes for all 10 presets ── */
  const DARK_PALETTES = {
    gold: {
      primary:'#d4b278', primaryDark:'#c09a5a', primaryLight:'#e8cfa0',
      background:'#161410', surface:'#1e1c17', surfaceMid:'#252118', surfaceDeep:'#2e2a20',
      text:'#f0e8d8', textSoft:'#c8b898', textMuted:'#8a7c6a',
      border:'#2e2a22', borderLight:'#3a352a'
    },
    rouge: {
      primary:'#d45a5d', primaryDark:'#c0373a', primaryLight:'#e87a7d',
      background:'#160c0c', surface:'#1e1010', surfaceMid:'#251515', surfaceDeep:'#2e1a1a',
      text:'#f5e8e8', textSoft:'#d4b4b4', textMuted:'#8a6a6a',
      border:'#2e1818', borderLight:'#3a2222'
    },
    foret: {
      primary:'#57a163', primaryDark:'#3a7a46', primaryLight:'#75ba80',
      background:'#0a100c', surface:'#101810', surfaceMid:'#152016', surfaceDeep:'#1a281c',
      text:'#e8f5ea', textSoft:'#b4d4b8', textMuted:'#6a8a6e',
      border:'#1a2c1c', borderLight:'#223826'
    },
    ardoise: {
      primary:'#5a86b8', primaryDark:'#3a6494', primaryLight:'#7aa4d0',
      background:'#09101a', surface:'#0e1826', surfaceMid:'#142030', surfaceDeep:'#1a2a3e',
      text:'#e8f0f8', textSoft:'#b4c8e0', textMuted:'#6a8aaa',
      border:'#182840', borderLight:'#203450'
    },
    ivoire: {
      primary:'#d4d4d4', primaryDark:'#aaaaaa', primaryLight:'#e8e8e8',
      background:'#141414', surface:'#1c1c1c', surfaceMid:'#242424', surfaceDeep:'#2c2c2c',
      text:'#f0f0f0', textSoft:'#c8c8c8', textMuted:'#888888',
      border:'#2c2c2c', borderLight:'#383838'
    },
    braise: {
      primary:'#e0864a', primaryDark:'#c86428', primaryLight:'#f0a470',
      background:'#160a04', surface:'#200e06', surfaceMid:'#2a1408', surfaceDeep:'#341a0a',
      text:'#f8ede0', textSoft:'#d4b898', textMuted:'#8a6a4a',
      border:'#301808', borderLight:'#3e2210'
    },
    lavande: {
      primary:'#9470d8', primaryDark:'#7048c0', primaryLight:'#b090e8',
      background:'#0d0914', surface:'#140e1e', surfaceMid:'#1a1228', surfaceDeep:'#221830',
      text:'#f0eaf8', textSoft:'#c8b8e4', textMuted:'#8070a0',
      border:'#241a38', borderLight:'#302248'
    },
    rose: {
      primary:'#d06890', primaryDark:'#b84870', primaryLight:'#e088aa',
      background:'#14080d', surface:'#1e0e14', surfaceMid:'#28121c', surfaceDeep:'#321826',
      text:'#f8eaf0', textSoft:'#d4b0c4', textMuted:'#8a6070',
      border:'#301020', borderLight:'#3e1a2c'
    },
    minuit: {
      primary:'#6060c0', primaryDark:'#4040a0', primaryLight:'#8080d8',
      background:'#06060e', surface:'#0c0c18', surfaceMid:'#121224', surfaceDeep:'#181830',
      text:'#e8e8f8', textSoft:'#b8b8d8', textMuted:'#7070a0',
      border:'#181830', borderLight:'#22223e'
    },
    terra: {
      primary:'#c07050', primaryDark:'#a05030', primaryLight:'#d89070',
      background:'#140a06', surface:'#1e100a', surfaceMid:'#28160e', surfaceDeep:'#321e14',
      text:'#f8ede4', textSoft:'#d4b8a8', textMuted:'#8a6850',
      border:'#301808', borderLight:'#3e2210'
    },
  };

  /* ── Font presets ── */
  const FONT_PRESETS = {
    elegant:  { label: 'Elegant',  display: 'Cormorant Garamond', body: 'Jost',         accent: 'Jost'         },
    luxury:   { label: 'Luxury',   display: 'Playfair Display',   body: 'Lato',          accent: 'Lato'         },
    modern:   { label: 'Modern',   display: 'Josefin Sans',       body: 'Inter',         accent: 'Inter'        },
    refined:  { label: 'Refined',  display: 'DM Serif Display',   body: 'DM Sans',       accent: 'DM Sans'      },
    warm:     { label: 'Warm',     display: 'Lora',               body: 'Nunito',        accent: 'Nunito'       },
    minimal:  { label: 'Minimal',  display: 'Raleway',            body: 'Source Sans 3', accent: 'Source Sans 3'},
    custom:   { label: 'Custom',   display: '',                   body: '',              accent: ''             }
  };

  const ALL_DISPLAY_FONTS = [
    'Cormorant Garamond','Playfair Display','DM Serif Display','Lora','Josefin Sans','Raleway','Montserrat'
  ];
  const ALL_BODY_FONTS = [
    'Jost','Inter','DM Sans','Nunito','Source Sans 3','Lato','Montserrat'
  ];

  const ICONS = [
    'fa-leaf','fa-fire-flame-curved','fa-bowl-rice','fa-drumstick-bite','fa-wine-glass',
    'fa-cake-candles','fa-burger','fa-fish','fa-seedling','fa-bread-slice','fa-pizza-slice',
    'fa-mug-hot','fa-ice-cream','fa-shrimp','fa-egg','fa-carrot','fa-utensils','fa-star',
    'fa-pepper-hot','fa-lemon','fa-champagne-glasses','fa-beer-mug-empty','fa-bowl-food','fa-bacon'
  ];

  /* ══════════════════════════════════════════════════════════
     SHA-256 / AUTH
  ══════════════════════════════════════════════════════════ */

  async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function ensureCreds() {
    if (!localStorage.getItem('me_creds')) {
      localStorage.setItem('me_creds', JSON.stringify({ user: 'admin', hash: await sha256('admin123') }));
    }
  }

  async function login() {
    const u = $('login-user').value.trim();
    const p = $('login-pass').value;
    const errEl = $('login-error');
    errEl.classList.add('hidden');
    if (!u || !p) { showLoginErr('Enter username and password.'); return; }
    const creds = JSON.parse(localStorage.getItem('me_creds'));
    const hash  = await sha256(p);
    if (u === creds.user && hash === creds.hash) {
      localStorage.setItem('me_session', '1');
      $('login-view').classList.add('hidden');
      $('studio-view').classList.remove('hidden');
      toast('Welcome back.', 'success');
    } else { showLoginErr('Invalid credentials.'); }
  }

  function showLoginErr(msg) {
    const e = $('login-error');
    e.querySelector('span').textContent = msg;
    e.classList.remove('hidden');
  }

  function logout() {
    localStorage.removeItem('me_session');
    $('studio-view').classList.add('hidden');
    $('login-view').classList.remove('hidden');
    toast('Logged out.', 'info');
  }

  async function changePassword() {
    const op = $('old-pass').value, np = $('new-pass').value, cp = $('confirm-pass').value;
    const errEl = $('pass-error');
    errEl.classList.add('hidden');
    const fail = m => { errEl.textContent = m; errEl.classList.remove('hidden'); };
    if (!op||!np||!cp)  return fail('All fields required.');
    if (np.length < 6)  return fail('Min. 6 characters.');
    if (np !== cp)      return fail('Passwords do not match.');
    const creds = JSON.parse(localStorage.getItem('me_creds'));
    if (await sha256(op) !== creds.hash) return fail('Wrong current password.');
    creds.hash = await sha256(np);
    localStorage.setItem('me_creds', JSON.stringify(creds));
    ['old-pass','new-pass','confirm-pass'].forEach(id => $(id).value = '');
    toast('Password updated.', 'success');
  }

  function togglePassVis(inputId, btn) {
    const el = $(inputId);
    const vis = el.type === 'password';
    el.type = vis ? 'text' : 'password';
    btn.querySelector('i').className = vis ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  }

  /* ══════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════ */

  async function init() {
    await ensureCreds();
    await loadData();
    applyLive();
    if (localStorage.getItem('me_session') === '1') {
      $('login-view').classList.add('hidden');
      $('studio-view').classList.remove('hidden');
    }
    switchTab('design');
  }

  async function loadData() {
    // Load from uploaded images cache
    try {
      const ci = localStorage.getItem('me_images');
      if (ci) uploadedImages = JSON.parse(ci);
    } catch {}

    if (window.location.protocol === 'file:') { loadLS(); return; }

    try {
      const res = await fetch(`data/menu.json?v=${Date.now()}`, { cache:'no-store' });
      if (!res.ok) throw new Error();
      doc = await res.json();
      // Ensure all sub-objects exist (backward compat)
      doc.meta       = doc.meta       || {};
      doc.tokens     = doc.tokens     || {};
      doc.tokens.colors  = doc.tokens.colors  || {};
      doc.tokens.shadow  = doc.tokens.shadow  || {};
      doc.tokens.radius  = doc.tokens.radius  || {};
      doc.tokens.spacing = doc.tokens.spacing || {};
      doc.tokens.fonts   = doc.tokens.fonts   || {};
      doc.layout     = doc.layout     || {};
      doc.categories = doc.categories || [];
      doc.items      = doc.items      || [];
      doc.hero       = doc.hero       || { layout: 'minimal' };
      doc.sections   = doc.sections   || DEFAULT_SECTIONS();
      // Seed darkColors from DARK_PALETTES if not already in JSON
      if (!doc.tokens.darkColors && doc.tokens.preset && DARK_PALETTES[doc.tokens.preset]) {
        doc.tokens.darkColors = { ...DARK_PALETTES[doc.tokens.preset] };
      }
      persist();
    } catch { loadLS(); }
  }

  function loadLS() {
    try {
      const s = localStorage.getItem('me_doc');
      if (s) doc = JSON.parse(s);
    } catch {}
  }

  function persist() {
    localStorage.setItem('me_doc', JSON.stringify(doc));
    try { localStorage.setItem('me_images', JSON.stringify(uploadedImages)); } catch {}
  }

  /* ══════════════════════════════════════════════════════════
     LIVE PREVIEW
     Injects tokens + layout attrs into the studio page itself,
     and also updates the preview iframe (if present).
  ══════════════════════════════════════════════════════════ */

  function applyLive() {
    // Inject tokens into this page (admin.html shares the CSS)
    Engine.applyTokens(doc.tokens);
    Engine.injectFonts(doc.tokens.fonts);

    // Layout attrs on body (preview pane uses data attrs)
    const l = doc.layout;
    if (l) {
      Engine.applyLayoutAttrs(l);
    }

    // Update preview iframe
    const frame = $('preview-frame');
    if (frame && frame.contentWindow) {
      try {
        const darkMode = document.documentElement.getAttribute('data-mode') === 'dark';
        frame.contentWindow.postMessage({ type:'TOKEN_UPDATE', tokens: doc.tokens, layout: doc.layout, meta: doc.meta, darkMode, hero: doc.hero, sections: doc.sections }, '*');
      } catch {}
    }
  }

  /* ══════════════════════════════════════════════════════════
     TAB SYSTEM
  ══════════════════════════════════════════════════════════ */

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.studio-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('active', p.id === `panel-${tab}`));

    if (tab === 'design')   renderDesignTab();
    if (tab === 'fonts')    renderFontsTab();
    if (tab === 'layout')   renderLayoutTab();
    if (tab === 'content')  renderContentTab();
    if (tab === 'hero')     renderHeroTab();
    if (tab === 'sections') renderSectionsTab();
    if (tab === 'export')   {}
  }

  /* ══════════════════════════════════════════════════════════
     TAB 1 — DESIGN (colors, radius, shadows, spacing)
  ══════════════════════════════════════════════════════════ */

  function renderDesignTab() {
    renderPresetGrid();
    renderColorTokens();
    renderShapeTokens();
  }

  /* Preset grid */
  function renderPresetGrid() {
    const grid = $('preset-grid');
    if (!grid) return;
    grid.innerHTML = Object.entries(PRESETS).map(([id, p]) => `
      <button class="preset-swatch${doc.tokens.preset === id ? ' active' : ''}"
              onclick="Studio.applyPreset('${id}')"
              title="${p.label}"
              style="--sw-primary:${p.swatch};--sw-bg:${p.bg}">
        <span class="preset-chip"></span>
        <span class="preset-name">${p.label}</span>
      </button>`).join('');
  }

  function applyPreset(id) {
    const p = PRESETS[id];
    if (!p) return;
    doc.tokens.preset      = id;
    doc.tokens.colors      = { ...p.colors };
    doc.tokens.shadow      = { ...p.shadow };
    doc.tokens.darkColors  = DARK_PALETTES[id] ? { ...DARK_PALETTES[id] } : undefined;
    persist();
    renderDesignTab();
    applyLive();
    toast(`Preset: ${p.label}`, 'success');
  }

  /* Color token inputs */
  const COLOR_FIELDS = [
    { key:'primary',      label:'Primary Accent' },
    { key:'primaryDark',  label:'Accent Dark' },
    { key:'primaryLight', label:'Accent Light' },
    { key:'background',   label:'Page Background' },
    { key:'surface',      label:'Card Surface' },
    { key:'surfaceMid',   label:'Surface Mid' },
    { key:'surfaceDeep',  label:'Surface Deep' },
    { key:'text',         label:'Text' },
    { key:'textSoft',     label:'Text Soft' },
    { key:'textMuted',    label:'Text Muted' },
    { key:'border',       label:'Border' },
    { key:'borderLight',  label:'Border Light' },
  ];

  function setColorTab(tab) {
    activeColorTab = tab;
    document.getElementById('color-tab-light')?.classList.toggle('active', tab === 'light');
    document.getElementById('color-tab-dark')?.classList.toggle('active', tab === 'dark');
    renderColorTokens();
  }

  function renderColorTokens() {
    const el = $('color-tokens');
    if (!el) return;
    // Ensure darkColors exists
    if (!doc.tokens.darkColors) {
      doc.tokens.darkColors = doc.tokens.preset && DARK_PALETTES[doc.tokens.preset]
        ? { ...DARK_PALETTES[doc.tokens.preset] }
        : { ...doc.tokens.colors };
    }
    const c = activeColorTab === 'dark' ? doc.tokens.darkColors : doc.tokens.colors;
    el.innerHTML = COLOR_FIELDS.map(f => `
      <div class="token-row">
        <label class="token-label">${f.label}</label>
        <div class="token-inputs">
          <input type="color" class="color-picker"
                 value="${c[f.key] || '#000000'}"
                 oninput="Studio.setColor('${f.key}',this.value);Studio.syncHex('${f.key}',this.value)"/>
          <input type="text" class="hex-input" id="hex-${f.key}"
                 value="${c[f.key] || '#000000'}" maxlength="7" spellcheck="false"
                 oninput="Studio.setHex('${f.key}',this.value)"/>
        </div>
      </div>`).join('');
  }

  function setColor(key, val) {
    if (activeColorTab === 'dark') {
      if (!doc.tokens.darkColors) doc.tokens.darkColors = {};
      doc.tokens.darkColors[key] = val;
    } else {
      doc.tokens.colors[key] = val;
      doc.tokens.preset = 'custom';
    }
    persist();
    applyLive();
    renderPresetGrid();
  }

  function syncHex(key, val) {
    const el = $(`hex-${key}`);
    if (el) el.value = val;
  }

  function setHex(key, val) {
    if (!/^#[0-9a-fA-F]{6}$/.test(val)) return;
    if (activeColorTab === 'dark') {
      if (!doc.tokens.darkColors) doc.tokens.darkColors = {};
      doc.tokens.darkColors[key] = val;
    } else {
      doc.tokens.colors[key] = val;
      doc.tokens.preset = 'custom';
    }
    // sync color picker
    const row = document.querySelector(`#hex-${key}`)?.closest('.token-row');
    if (row) {
      const picker = row.querySelector('.color-picker');
      if (picker) picker.value = val;
    }
    persist();
    applyLive();
    renderPresetGrid();
  }

  /* Shape tokens (radius + spacing) */
  const RADIUS_FIELDS = [
    { key:'base', label:'Global Radius' },
    { key:'card', label:'Card Radius' },
    { key:'sm',   label:'Small Radius' },
    { key:'pill', label:'Pill Radius' },
  ];
  const SPACING_FIELDS = [
    { key:'sectionGap',  label:'Section Gap' },
    { key:'cardGap',     label:'Card Gap' },
    { key:'cardPadding', label:'Card Padding' },
  ];

  function renderShapeTokens() {
    const re = $('radius-tokens');
    const se = $('spacing-tokens');
    if (!re || !se) return;

    const r = doc.tokens.radius;
    re.innerHTML = RADIUS_FIELDS.map(f => `
      <div class="token-row">
        <label class="token-label">${f.label}</label>
        <input type="text" class="shape-input" value="${r[f.key]||'14px'}"
               oninput="Studio.setRadius('${f.key}',this.value)"/>
      </div>`).join('');

    const s = doc.tokens.spacing;
    se.innerHTML = SPACING_FIELDS.map(f => `
      <div class="token-row">
        <label class="token-label">${f.label}</label>
        <input type="text" class="shape-input" value="${s[f.key]||'20px'}"
               oninput="Studio.setSpacing('${f.key}',this.value)"/>
      </div>`).join('');
  }

  function setRadius(key, val) {
    doc.tokens.radius[key] = val;
    persist(); applyLive();
  }
  function setSpacing(key, val) {
    doc.tokens.spacing[key] = val;
    persist(); applyLive();
  }

  /* ══════════════════════════════════════════════════════════
     TAB 2 — FONTS
  ══════════════════════════════════════════════════════════ */

  function renderFontsTab() {
    renderFontPresets();
    renderFontSelectors();
  }

  function renderFontPresets() {
    const grid = $('font-preset-grid');
    if (!grid) return;
    const cur = doc.tokens.fonts?.preset || 'elegant';
    grid.innerHTML = Object.entries(FONT_PRESETS).map(([id, p]) => `
      <button class="font-preset-btn${cur === id ? ' active' : ''}"
              onclick="Studio.applyFontPreset('${id}')">
        <span class="fp-label" style="font-family:'${p.display||'inherit'}',serif">${p.label}</span>
        <span class="fp-sample" style="font-family:'${p.display||'inherit'}',serif">Aa</span>
        <span class="fp-pair">${p.display || '—'} / ${p.body || '—'}</span>
      </button>`).join('');
  }

  function applyFontPreset(id) {
    const p = FONT_PRESETS[id];
    if (!p) return;
    doc.tokens.fonts = { preset: id, display: p.display, body: p.body, accent: p.accent };
    persist(); renderFontsTab(); applyLive();
    toast(`Font: ${p.label}`, 'success');
  }

  function renderFontSelectors() {
    const dc = $('font-display-sel');
    const bc = $('font-body-sel');
    if (!dc || !bc) return;
    const f = doc.tokens.fonts;

    dc.innerHTML = ALL_DISPLAY_FONTS.map(name =>
      `<option value="${name}"${f.display===name?' selected':''}>${name}</option>`
    ).join('');
    bc.innerHTML = ALL_BODY_FONTS.map(name =>
      `<option value="${name}"${f.body===name?' selected':''}>${name}</option>`
    ).join('');
  }

  function setDisplayFont(val) {
    doc.tokens.fonts.display = val;
    doc.tokens.fonts.preset  = 'custom';
    persist(); renderFontPresets(); applyLive();
  }
  function setBodyFont(val) {
    doc.tokens.fonts.body   = val;
    doc.tokens.fonts.accent = val;
    doc.tokens.fonts.preset = 'custom';
    persist(); renderFontPresets(); applyLive();
  }

  /* ══════════════════════════════════════════════════════════
     TAB 3 — LAYOUT
  ══════════════════════════════════════════════════════════ */

  function renderLayoutTab() {
    const l = doc.layout;
    setRadio('mode',       l.mode       || 'grid');
    setRadio('cardStyle',  l.cardStyle  || 'shadow');
    setRadio('imageRatio', l.imageRatio || '4:3');
    setRadio('density',    l.density    || 'normal');

    const colEl = $('col-range');
    if (colEl) { colEl.value = l.columns || 3; updateColLabel(l.columns || 3); }
  }

  function setRadio(name, val) {
    document.querySelectorAll(`input[name="${name}"]`)
      .forEach(r => r.checked = r.value === val);
  }

  function onLayoutChange() {
    const get = name => {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : null;
    };
    doc.layout.mode       = get('mode')       || 'grid';
    doc.layout.cardStyle  = get('cardStyle')  || 'shadow';
    doc.layout.imageRatio = get('imageRatio') || '4:3';
    doc.layout.density    = get('density')    || 'normal';
    const colEl = $('col-range');
    if (colEl) doc.layout.columns = parseInt(colEl.value) || 3;
    persist(); applyLive();
  }

  function updateColLabel(val) {
    const el = $('col-label');
    if (el) el.textContent = val;
  }

  /* ══════════════════════════════════════════════════════════
     TAB 5 — HERO LAYOUT
  ══════════════════════════════════════════════════════════ */

  function renderHeroTab() {
    const panel = $('panel-hero');
    if (!panel) return;

    const h = doc.hero || {};
    const current = h.layout || 'minimal';

    // Layout selector grid
    const layoutGrid = panel.querySelector('#hero-layout-grid');
    if (layoutGrid) {
      layoutGrid.innerHTML = HERO_LAYOUTS.map(l => `
        <button class="hero-layout-btn${current === l.id ? ' active' : ''}"
                onclick="Studio.setHeroLayout('${l.id}')">
          <i class="fa-solid ${l.icon}"></i>
          <strong>${l.label}</strong>
          <span>${l.desc}</span>
        </button>`).join('');
    }

    // Per-layout settings
    const settingsEl = panel.querySelector('#hero-settings');
    if (!settingsEl) return;

    let html = '';

    if (current === 'minimal') {
      html = `<div class="info-note"><i class="fa-solid fa-circle-info"></i>
        Minimal hero uses the restaurant name, hero title, and subtitle from the <strong>Content → Identity</strong> tab.
        No extra settings needed.</div>`;

    } else if (current === 'cover') {
      html = `
        <div class="field">
          <label>Cover Image</label>
          ${heroImgZone('coverImage', h.coverImage)}
        </div>
        <div class="field">
          <label>Image Height (px)</label>
          <div style="display:flex;gap:12px;align-items:center">
            <input type="range" min="300" max="700" step="20"
                   value="${h.imageHeight||480}"
                   oninput="this.nextElementSibling.textContent=this.value+'px';Studio.saveHeroField('imageHeight',parseInt(this.value))"
                   style="flex:1;accent-color:var(--c-primary)"/>
            <span style="font-size:.84rem;color:var(--c-primary);font-weight:700;min-width:48px">${h.imageHeight||480}px</span>
          </div>
        </div>
        <div class="field">
          <label>Overlay Opacity</label>
          <div style="display:flex;gap:12px;align-items:center">
            <input type="range" min="0" max="90" step="5"
                   value="${Math.round((h.overlayOpacity||.55)*100)}"
                   oninput="this.nextElementSibling.textContent=this.value+'%';Studio.saveHeroField('overlayOpacity',this.value/100)"
                   style="flex:1;accent-color:var(--c-primary)"/>
            <span style="font-size:.84rem;color:var(--c-primary);font-weight:700;min-width:32px">${Math.round((h.overlayOpacity||.55)*100)}%</span>
          </div>
        </div>
        <div class="field">
          <label>CTA Button Label</label>
          <input type="text" class="input" id="hero-cta-label"
                 value="${h.ctaLabel||'View Menu'}" placeholder="View Menu"
                 oninput="Studio.saveHeroField('ctaLabel',this.value)"/>
        </div>`;

    } else if (current === 'chef') {
      html = `
        <div class="field">
          <label>Chef / Restaurant Image</label>
          ${heroImgZone('chefImage', h.chefImage)}
        </div>
        <div class="field">
          <label>CTA Button Label</label>
          <input type="text" class="input"
                 value="${h.ctaLabel||'View Menu'}" placeholder="View Menu"
                 oninput="Studio.saveHeroField('ctaLabel',this.value)"/>
        </div>`;

    } else if (current === 'luxury') {
      html = `
        <div class="field">
          <label>Background Image</label>
          ${heroImgZone('bgImage', h.bgImage)}
        </div>
        <div class="field">
          <label>CTA Button Label</label>
          <input type="text" class="input"
                 value="${h.ctaLabel||'View Menu'}" placeholder="View Menu"
                 oninput="Studio.saveHeroField('ctaLabel',this.value)"/>
        </div>`;

    } else if (current === 'dish') {
      const featuredItems = doc.items.filter(i => i.featured);
      html = `
        <div class="field">
          <label>Dish Image <small style="text-transform:none;color:var(--c-text-muted);font-weight:400">(or auto-uses first featured item)</small></label>
          ${heroImgZone('dishImage', h.dishImage)}
        </div>
        <div class="field">
          <label>Dish Name Override</label>
          <input type="text" class="input"
                 value="${h.dishName||''}" placeholder="Auto from featured item"
                 oninput="Studio.saveHeroField('dishName',this.value)"/>
        </div>
        <div class="field">
          <label>Price Override</label>
          <input type="number" class="input"
                 value="${h.dishPrice||''}" placeholder="Auto from featured item"
                 oninput="Studio.saveHeroField('dishPrice',this.value?parseFloat(this.value):undefined)"/>
        </div>
        <div class="field">
          <label>Description Override</label>
          <textarea class="input" rows="2"
                    oninput="Studio.saveHeroField('dishDesc',this.value)"
                    placeholder="Auto from featured item">${h.dishDesc||''}</textarea>
        </div>
        <div class="field">
          <label>CTA Button Label</label>
          <input type="text" class="input"
                 value="${h.ctaLabel||'View Menu'}" placeholder="View Menu"
                 oninput="Studio.saveHeroField('ctaLabel',this.value)"/>
        </div>
        ${featuredItems.length === 0 ? `<div class="info-note"><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b"></i>
          No featured items found. Mark at least one menu item as featured in Content → Menu Items.</div>` : ''}`;

    } else if (current === 'video') {
      html = `
        <div class="field">
          <label>Video URL <small style="text-transform:none;color:var(--c-text-muted);font-weight:400">.mp4 recommended</small></label>
          <input type="text" class="input"
                 value="${h.videoUrl||''}" placeholder="https://... or assets/videos/..."
                 oninput="Studio.saveHeroField('videoUrl',this.value)"/>
        </div>
        <div class="field">
          <label>CTA Button Label</label>
          <input type="text" class="input"
                 value="${h.ctaLabel||'View Menu'}" placeholder="View Menu"
                 oninput="Studio.saveHeroField('ctaLabel',this.value)"/>
        </div>
        <div class="info-note"><i class="fa-solid fa-circle-info"></i>
          Host your video file at a publicly accessible URL or within the <code>assets/</code> folder. Autoplay only works when muted.</div>`;
    }

    settingsEl.innerHTML = html;
  }

  /* ── Hero image drop zone builder ── */
  function heroImgZone(fieldKey, currentSrc) {
    const resolvedSrc = uploadedImages[currentSrc?.split('/').pop() || ''] || currentSrc || '';
    const zoneId    = `hero-zone-${fieldKey}`;
    const fileId    = `hero-file-${fieldKey}`;
    const previewId = `hero-prev-${fieldKey}`;
    // Wire up drag+drop after a tick (HTML hasn't rendered yet)
    setTimeout(() => {
      const zone = document.getElementById(zoneId);
      if (!zone) return;
      zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) Studio.handleHeroImgFile(fieldKey, file);
      });
    }, 0);
    return `
      <div id="${zoneId}" class="hero-img-zone${resolvedSrc ? ' has-img' : ''}"
           onclick="document.getElementById('${fileId}').click()">
        <input type="file" id="${fileId}" accept="image/*" style="display:none"
               onchange="Studio.handleHeroImgFile('${fieldKey}', this.files[0])"/>
        ${resolvedSrc
          ? `<img id="${previewId}" class="hero-img-preview" src="${resolvedSrc}" alt="hero"/>
             <button class="hero-img-remove" onclick="event.stopPropagation();Studio.removeHeroImg('${fieldKey}')"
                     title="Remove image"><i class="fa-solid fa-xmark"></i></button>`
          : `<div class="hero-img-placeholder">
               <i class="fa-solid fa-cloud-arrow-up"></i>
               <p>Click or drag &amp; drop</p>
               <span>JPG · PNG · WEBP · max 5 MB</span>
             </div>`}
      </div>`;
  }

  function handleHeroImgFile(fieldKey, file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Max 5 MB.', 'error'); return; }
    const ext  = file.name.split('.').pop().toLowerCase();
    const slug = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `hero-${fieldKey}-${Date.now()}-${slug}.${ext}`;
    const reader = new FileReader();
    reader.onload = e => {
      uploadedImages[filename] = e.target.result;
      doc.hero[fieldKey] = `assets/images/${filename}`;
      persist();
      applyLive();
      renderHeroTab(); // re-render to show preview
    };
    reader.readAsDataURL(file);
  }

  function removeHeroImg(fieldKey) {
    doc.hero[fieldKey] = '';
    persist(); applyLive(); renderHeroTab();
  }

  function setHeroLayout(id) {
    doc.hero = { ...doc.hero, layout: id };
    persist(); renderHeroTab(); applyLive();
    toast(`Hero: ${HERO_LAYOUTS.find(l=>l.id===id)?.label}`, 'success');
  }

  function saveHeroField(key, val) {
    doc.hero[key] = val;
    persist(); applyLive();
  }

  /* ══════════════════════════════════════════════════════════
     TAB 6 — SECTION MANAGER
  ══════════════════════════════════════════════════════════ */

  function renderSectionsTab() {
    const el = $('sections-list');
    if (!el) return;

    // Ensure all default sections exist in doc.sections
    const defaults = DEFAULT_SECTIONS();
    defaults.forEach(def => {
      if (!doc.sections.find(s => s.id === def.id)) {
        doc.sections.push({ ...def });
      }
    });
    // Sync labels/icons from defaults
    doc.sections.forEach(s => {
      const def = defaults.find(d => d.id === s.id);
      if (def) { s.label = def.label; s.icon = def.icon; }
    });

    const sorted = [...doc.sections].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    el.innerHTML = sorted.map(sec => `
      <div class="content-row" draggable="true" data-sid="${sec.id}">
        <span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
        <span class="row-icon"><i class="fa-solid ${sec.icon || 'fa-layer-group'}"></i></span>
        <span class="row-main">
          <strong>${sec.label || sec.id}</strong>
          <small>${sec.id === 'menu' ? 'Full menu items list — always functional' : sec.enabled !== false ? 'Visible' : 'Hidden'}</small>
        </span>
        <div class="row-actions">
          ${sec.id !== 'menu' ? `
          <label class="toggle-sw" title="Enable section">
            <input type="checkbox" ${sec.enabled!==false?'checked':''}
              onchange="Studio.setSectionEnabled('${sec.id}',this.checked)"/>
            <span class="toggle-track"></span>
          </label>` : `<span style="font-size:.74rem;color:var(--c-text-muted);padding:0 6px">Always on</span>`}
        </div>
      </div>`).join('');

    initSectionsDrag(el);
  }

  function initSectionsDrag(container) {
    let dragging = null;
    container.querySelectorAll('.content-row').forEach(row => {
      row.addEventListener('dragstart', () => { dragging = row; row.style.opacity = '.4'; });
      row.addEventListener('dragend',   () => {
        row.style.opacity = '';
        dragging = null;
        const rows = [...container.querySelectorAll('.content-row')];
        rows.forEach((r, i) => {
          const sec = doc.sections.find(s => s.id === r.dataset.sid);
          if (sec) sec.order = i;
        });
        persist(); applyLive(); renderSectionsTab();
      });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragging || dragging === row) return;
        const mid = row.getBoundingClientRect().top + row.offsetHeight / 2;
        if (e.clientY < mid) container.insertBefore(dragging, row);
        else row.after(dragging);
      });
    });
  }

  function setSectionEnabled(id, val) {
    const sec = doc.sections.find(s => s.id === id);
    if (sec) { sec.enabled = val; persist(); applyLive(); renderSectionsTab(); }
  }

  /* ══════════════════════════════════════════════════════════
     TAB 4 — CONTENT
  ══════════════════════════════════════════════════════════ */

  function renderContentTab() {
    renderMeta();
    renderContactFields();
    renderCategoryList();
    renderItemList();
  }

  /* Meta */
  function renderMeta() {
    const m = doc.meta;
    setVal('meta-name',       m.name            || '');
    setVal('meta-tagline',    m.tagline          || '');
    setVal('meta-currency',   m.currency         || 'DA');
    setVal('meta-hero-title', (m.heroTitle||'').replace(/<em>(.*?)<\/em>/g,'*$1*'));
    setVal('meta-hero-sub',   m.heroSub          || '');
    const curPos = $('meta-currency-pos');
    if (curPos) curPos.value = m.currencyPosition || 'after';
    const darkEl = $('meta-dark');
    if (darkEl) darkEl.checked = m.darkMode || false;
    // Logo preview
    const logoPrev = $('logo-preview');
    if (logoPrev) {
      logoPrev.style.display = m.logoImage ? 'block' : 'none';
      const img = logoPrev.querySelector('img');
      if (img && m.logoImage) img.src = m.logoImage;
    }
  }

  function saveMeta() {
    const m = doc.meta;
    m.name             = $('meta-name').value.trim()      || 'Maison Élite';
    m.tagline          = $('meta-tagline').value.trim()   || '';
    m.currency         = $('meta-currency').value.trim()  || 'DA';
    m.currencyPosition = $('meta-currency-pos').value     || 'after';
    m.heroSub          = $('meta-hero-sub').value.trim()  || '';
    m.darkMode         = $('meta-dark').checked;
    const rawTitle     = $('meta-hero-title').value.trim();
    m.heroTitle = rawTitle.replace(/\*(.*?)\*/g, '<em>$1</em>');
    persist(); applyLive(); toast('Identity saved.', 'success');
  }

  function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { toast('Logo must be under 2 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      doc.meta.logoImage   = e.target.result;
      doc.meta.logoFilename = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      persist(); renderMeta(); toast('Logo uploaded.', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    doc.meta.logoImage = ''; doc.meta.logoFilename = '';
    persist(); renderMeta(); toast('Logo removed.', 'info');
  }

  /* ── Contact ── */
  const CONTACT_FIELDS = [
    { key: 'address',   icon: 'fa-map-pin',  label: 'Address',      placeholder: '12 Rue de la Paix, Algiers',  type: 'text'  },
    { key: 'phone',     icon: 'fa-phone',    label: 'Phone',         placeholder: '+213 21 XX XX XX',            type: 'tel'   },
    { key: 'hours',     icon: 'fa-clock',    label: 'Opening Hours', placeholder: 'Mon–Sat: 12:00 – 23:00',      type: 'text'  },
    { key: 'email',     icon: 'fa-envelope', label: 'Email / Reservations', placeholder: 'reserve@restaurant.dz', type: 'email' },
    { key: 'website',   icon: 'fa-globe',    label: 'Website',       placeholder: 'https://yourrestaurant.com',  type: 'url'   },
    { key: 'instagram', icon: 'fa-instagram',label: 'Instagram',     placeholder: 'https://instagram.com/yourpage', type: 'url' },
    { key: 'facebook',  icon: 'fa-facebook', label: 'Facebook',      placeholder: 'https://facebook.com/yourpage',  type: 'url' },
    { key: 'whatsapp',  icon: 'fa-whatsapp', label: 'WhatsApp',      placeholder: '+213 6XX XX XX XX',           type: 'tel'   },
  ];

  function renderContactFields() {
    const el = $('contact-fields-list');
    if (!el) return;
    const m = doc.meta;
    setVal('contact-title',    m.contactTitle    || '');
    setVal('contact-subtitle', m.contactSubtitle || '');
    const contactShow = m.contactShow || {};
    el.innerHTML = CONTACT_FIELDS.map(f => {
      const val     = m[f.key] || '';
      const visible = contactShow[f.key] !== false;
      const isFA    = ['fa-instagram','fa-facebook','fa-whatsapp'].includes(f.icon);
      const iconCls = isFA ? `fa-brands ${f.icon}` : `fa-solid ${f.icon}`;
      return `
        <div class="contact-field-row">
          <span class="contact-field-icon"><i class="${iconCls}"></i></span>
          <div class="contact-field-inputs">
            <label>${f.label}</label>
            <input id="cf-${f.key}" type="${f.type}" class="input"
                   value="${val.replace(/"/g,'&quot;')}" placeholder="${f.placeholder}"/>
          </div>
          <label class="toggle-sw" title="Show on menu">
            <input type="checkbox" id="cfv-${f.key}" ${visible ? 'checked' : ''}/>
            <span class="toggle-track"></span>
          </label>
        </div>`;
    }).join('');
  }

  function saveContact() {
    const m = doc.meta;
    m.contactTitle    = $('contact-title')?.value.trim()    || '';
    m.contactSubtitle = $('contact-subtitle')?.value.trim() || '';
    const contactShow = {};
    CONTACT_FIELDS.forEach(f => {
      m[f.key]         = $(`cf-${f.key}`)?.value.trim()     || '';
      contactShow[f.key] = $(`cfv-${f.key}`)?.checked !== false;
    });
    m.contactShow = contactShow;
    persist(); applyLive(); toast('Contact info saved.', 'success');
  }

  /* ── Categories ── */
  function renderCategoryList() {
    const el = $('cat-list');
    if (!el) return;
    const sorted = [...doc.categories].sort((a,b) => (a.order??99)-(b.order??99));
    if (!sorted.length) {
      el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-tags"></i><p>No categories yet.</p></div>`;
      return;
    }
    el.innerHTML = sorted.map(cat => `
      <div class="content-row" draggable="true" data-id="${cat.id}">
        <span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
        <span class="row-icon"><i class="fa-solid ${cat.icon}"></i></span>
        <span class="row-main">
          <strong>${cat.name}</strong>
          <small>${cat.description || ''}</small>
        </span>
        <div class="row-actions">
          <label class="toggle-sw" title="Visible">
            <input type="checkbox" ${cat.visible!==false?'checked':''}
              onchange="Studio.setCatVisible('${cat.id}',this.checked)"/>
            <span class="toggle-track"></span>
          </label>
          <button class="action-btn" onclick="Studio.openCatModal('${cat.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn del" onclick="Studio.deleteCat('${cat.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
    initCatDrag(el);
  }

  function initCatDrag(container) {
    let dragging = null;
    container.querySelectorAll('.content-row').forEach(row => {
      row.addEventListener('dragstart', () => { dragging = row; row.style.opacity='.4'; });
      row.addEventListener('dragend',   () => {
        row.style.opacity='';
        dragging = null;
        const rows = [...container.querySelectorAll('.content-row')];
        rows.forEach((r,i) => {
          const cat = doc.categories.find(c=>c.id===r.dataset.id);
          if (cat) cat.order = i;
        });
        persist(); renderCategoryList();
      });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragging || dragging === row) return;
        const mid = row.getBoundingClientRect().top + row.offsetHeight/2;
        if (e.clientY < mid) container.insertBefore(dragging, row);
        else row.after(dragging);
      });
    });
  }

  function setCatVisible(id, val) {
    const cat = doc.categories.find(c=>c.id===id);
    if (cat) { cat.visible=val; persist(); }
  }

  function openCatModal(id) {
    editCatId = id || null;
    const cat = id ? doc.categories.find(c=>c.id===id) : null;
    $('cat-modal-title').textContent = id ? 'Edit Category' : 'Add Category';
    setVal('cm-name', cat?.name||'');
    setVal('cm-id',   cat?.id||'');
    setVal('cm-desc', cat?.description||'');
    $('cm-id').disabled = !!id;
    const grid = $('cm-icon-grid');
    const sel  = cat?.icon || 'fa-utensils';
    grid.innerHTML = ICONS.map(ic => `
      <button type="button" class="icon-btn-pick${ic===sel?' sel':''}"
              data-icon="${ic}" onclick="Studio.pickIcon('${ic}')">
        <i class="fa-solid ${ic}"></i>
      </button>`).join('');
    $('cat-modal').classList.remove('hidden');
  }

  function closeCatModal() { $('cat-modal').classList.add('hidden'); editCatId=null; }

  function pickIcon(ic) {
    document.querySelectorAll('.icon-btn-pick').forEach(b=>b.classList.toggle('sel', b.dataset.icon===ic));
  }

  function saveCat() {
    const name = $('cm-name').value.trim();
    const id   = editCatId || $('cm-id').value.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const desc = $('cm-desc').value.trim();
    const icon = document.querySelector('.icon-btn-pick.sel')?.dataset.icon || 'fa-utensils';
    if (!name) { toast('Name required.', 'error'); return; }
    if (!id)   { toast('ID required.', 'error'); return; }
    if (editCatId) {
      const cat = doc.categories.find(c=>c.id===editCatId);
      if (cat) Object.assign(cat, { name, description:desc, icon });
    } else {
      if (doc.categories.find(c=>c.id===id)) { toast('ID already exists.', 'error'); return; }
      doc.categories.push({ id, name, icon, description:desc, visible:true, order:doc.categories.length });
    }
    persist(); closeCatModal(); renderCategoryList(); populateCatOpts();
    toast(editCatId ? 'Category updated.' : 'Category added.', 'success');
  }

  function deleteCat(id) {
    const cat = doc.categories.find(c=>c.id===id);
    showConfirm(`Delete category "${cat?.name}"? Items will remain but lose their grouping.`, () => {
      doc.categories = doc.categories.filter(c=>c.id!==id);
      persist(); renderCategoryList(); populateCatOpts();
      toast('Category deleted.', 'info');
    });
  }

  /* ── Items ── */
  function populateCatOpts() {
    const sel = $('item-cat');
    if (!sel) return;
    sel.innerHTML = doc.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }

  function renderItemList() {
    populateCatOpts();
    const el = $('item-list');
    if (!el) return;
    const q   = ($('item-search')?.value||'').toLowerCase().trim();
    const cat = $('item-cat-filter')?.value||'';
    let list  = doc.items;
    if (q)   list = list.filter(i=>i.name.toLowerCase().includes(q)||(i.description||'').toLowerCase().includes(q));
    if (cat) list = list.filter(i=>i.category===cat);
    if (!list.length) {
      el.innerHTML=`<div class="empty-state"><i class="fa-solid fa-bowl-food"></i><p>No items.</p></div>`;
      return;
    }
    const currency = doc.meta.currency || 'DA';
    el.innerHTML = list.map(item => {
      const catName = doc.categories.find(c=>c.id===item.category)?.name || item.category;
      const imgSrc  = uploadedImages[item.image?.split('/').pop()||''] || item.image || '';
      return `
        <div class="content-row">
          <img class="row-thumb" src="${imgSrc}" alt="${item.name}"
               onerror="this.src=''" style="${imgSrc?'':'opacity:0'}" />
          <span class="row-main">
            <strong>${item.name}</strong>
            <small>${catName} · ${Number(item.price).toLocaleString('fr-DZ')} ${currency}
              ${item.featured?'· <em>Featured</em>':''}
              ${item.tag?`· ${item.tag}`:''}
            </small>
          </span>
          <div class="row-actions">
            <label class="toggle-sw" title="Available">
              <input type="checkbox" ${item.available?'checked':''}
                onchange="Studio.setItemAvail(${item.id},this.checked)"/>
              <span class="toggle-track"></span>
            </label>
            <button class="action-btn" onclick="Studio.openItemModal(${item.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn del" onclick="Studio.deleteItem(${item.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`; }).join('');
  }

  function setItemAvail(id, val) {
    const item = doc.items.find(i=>i.id===id);
    if (item) { item.available=val; persist(); }
  }

  /* Item modal */
  let currentImgDataURL = null;
  let currentImgFilename = null;

  function openItemModal(id) {
    editItemId = id || null;
    currentImgDataURL = null; currentImgFilename = null;
    populateCatOpts();
    $('item-modal-title').textContent = id ? 'Edit Item' : 'Add Item';
    resetImgUI();
    if (id) {
      const item = doc.items.find(i=>i.id===id);
      setVal('item-name',  item.name);
      setVal('item-price', item.price);
      setVal('item-desc',  item.description||'');
      $('item-cat').value     = item.category;
      $('item-tag').value     = item.tag||'';
      $('item-avail').checked    = item.available;
      $('item-featured').checked = item.featured||false;
      const fn  = item.image?.split('/').pop()||'';
      const src = uploadedImages[fn] || item.image || '';
      if (src) setImgPreview(src, fn);
    } else {
      ['item-name','item-price','item-desc'].forEach(id=>setVal(id,''));
      $('item-cat').value        = doc.categories[0]?.id || '';
      $('item-tag').value        = '';
      $('item-avail').checked    = true;
      $('item-featured').checked = false;
    }
    $('item-modal').classList.remove('hidden');
  }

  function closeItemModal() { $('item-modal').classList.add('hidden'); editItemId=null; }

  function resetImgUI() {
    $('img-area').style.display='';
    $('img-preview-box').classList.remove('show');
    $('img-file').value='';
  }
  function setImgPreview(src, filename) {
    $('img-preview').src = src;
    $('img-preview-box').classList.add('show');
    $('img-area').style.display='none';
    if (filename) currentImgFilename = filename;
  }
  function removeImg() { currentImgDataURL=null; currentImgFilename=null; resetImgUI(); }
  function handleImgFile(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { toast('Max 5 MB.','error'); return; }
    const ext  = file.name.split('.').pop().toLowerCase();
    const slug = file.name.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
    currentImgFilename = `${Date.now()}-${slug}.${ext}`;
    const reader = new FileReader();
    reader.onload = e => { currentImgDataURL=e.target.result; setImgPreview(currentImgDataURL, currentImgFilename); };
    reader.readAsDataURL(file);
  }

  function setupImgDrag() {
    const area = $('img-area');
    if (!area) return;
    area.addEventListener('dragover', e=>{e.preventDefault();area.classList.add('drag-over');});
    area.addEventListener('dragleave',  ()=>area.classList.remove('drag-over'));
    area.addEventListener('drop', e=>{
      e.preventDefault(); area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) { const dt=new DataTransfer(); dt.items.add(file); $('img-file').files=dt.files; handleImgFile($('img-file')); }
    });
  }

  function saveItem() {
    const name  = $('item-name').value.trim();
    const price = parseFloat($('item-price').value);
    const cat   = $('item-cat').value;
    if (!name)       { toast('Name required.','error'); return; }
    if (isNaN(price)){ toast('Valid price required.','error'); return; }
    if (!cat)        { toast('Select a category.','error'); return; }

    let imagePath = editItemId ? doc.items.find(i=>i.id===editItemId)?.image||'' : '';
    if (currentImgFilename && currentImgDataURL) {
      imagePath = `assets/images/${currentImgFilename}`;
      uploadedImages[currentImgFilename] = currentImgDataURL;
    } else if (!imagePath) {
      imagePath = `assets/images/${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.jpg`;
    }

    const payload = {
      name, price, category:cat,
      description: $('item-desc').value.trim(),
      image: imagePath,
      tag:      $('item-tag').value,
      available: $('item-avail').checked,
      featured:  $('item-featured').checked,
    };

    if (editItemId) {
      const idx = doc.items.findIndex(i=>i.id===editItemId);
      doc.items[idx] = { ...doc.items[idx], ...payload };
      toast(`"${name}" updated.`, 'success');
    } else {
      payload.id = Date.now();
      doc.items.push(payload);
      toast(`"${name}" added.`, 'success');
    }
    persist(); closeItemModal(); renderItemList();
  }

  function deleteItem(id) {
    const item = doc.items.find(i=>i.id===id);
    showConfirm(`Delete "${item?.name}"?`, () => {
      doc.items = doc.items.filter(i=>i.id!==id);
      persist(); renderItemList();
      toast('Item deleted.','info');
    });
  }

  /* ══════════════════════════════════════════════════════════
     CONFIRM DIALOG
  ══════════════════════════════════════════════════════════ */

  function showConfirm(msg, cb) {
    $('confirm-msg').textContent = msg;
    $('confirm-overlay').classList.remove('hidden');
    confirmCb = cb;
  }
  function closeConfirm() { $('confirm-overlay').classList.add('hidden'); confirmCb=null; }
  function execConfirm()  { if(confirmCb) confirmCb(); closeConfirm(); }

  /* ══════════════════════════════════════════════════════════
     EXPORT ZIP
  ══════════════════════════════════════════════════════════ */

  async function exportZip() {
    if (typeof JSZip === 'undefined') { toast('JSZip not loaded.','error'); return; }
    const progress = $('export-progress');
    const bar      = $('progress-bar');
    const lbl      = $('progress-label');
    progress.classList.add('show');
    bar.style.width='0%'; lbl.textContent='Building…';

    const zip = new JSZip();
    bar.style.width='20%';

    // Clean export — canonical keys
    const exportDoc = {
      meta:       doc.meta,
      tokens:     {
        ...doc.tokens,
        // Always include darkColors in export so engine.js works without studio
        darkColors: doc.tokens.darkColors ||
          (doc.tokens.preset && DARK_PALETTES[doc.tokens.preset]
            ? { ...DARK_PALETTES[doc.tokens.preset] }
            : undefined),
      },
      layout:     doc.layout,
      hero:       doc.hero || { layout: 'minimal' },
      sections:   doc.sections || DEFAULT_SECTIONS(),
      categories: [...doc.categories].sort((a,b)=>(a.order??99)-(b.order??99)),
      items:      doc.items.map(i=>({
        id:i.id, name:i.name, category:i.category, price:i.price,
        description:i.description||'', image:i.image||'',
        available:i.available, featured:i.featured||false, tag:i.tag||''
      }))
    };
    zip.file('data/menu.json', JSON.stringify(exportDoc, null, 2));
    bar.style.width='40%'; lbl.textContent='Packing images…';

    const entries = Object.entries(uploadedImages);
    for (let i=0; i<entries.length; i++) {
      const [fn, dataURL] = entries[i];
      const b64 = dataURL.split(',')[1];
      zip.file(`assets/images/${fn}`, b64, { base64:true });
      bar.style.width = `${40 + Math.round((i/entries.length)*40)}%`;
    }

    // Include logo image if it's a data URL (not embedded)
    if (doc.meta.logoImage?.startsWith('data:') && doc.meta.logoFilename) {
      zip.file(`assets/images/${doc.meta.logoFilename}`, doc.meta.logoImage.split(',')[1], { base64:true });
    }

    bar.style.width='85%'; lbl.textContent='Finalizing…';
    zip.file('DEPLOY.txt', [
      'THEME ENGINE v4 — DEPLOY PACKAGE',
      '==================================',
      '',
      'CONTENTS:',
      '  data/menu.json      ← Full design system + content',
      '  assets/images/*     ← Uploaded images',
      '',
      'DEPLOY:',
      '  1. Copy data/menu.json to your repo',
      '  2. Copy assets/images/* to your repo',
      '  3. Commit & push to GitHub',
      '  4. GitHub Pages deploys in ~30s',
      '',
      `Exported: ${new Date().toLocaleString()}`,
      `Items: ${doc.items.length} | Categories: ${doc.categories.length}`,
      `Theme preset: ${doc.tokens.preset} | Font preset: ${doc.tokens.fonts?.preset}`,
      `Layout: ${doc.layout.mode} / ${doc.layout.columns} cols / ${doc.layout.cardStyle}`,
    ].join('\n'));

    bar.style.width='95%'; lbl.textContent='Generating download…';
    const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
    bar.style.width='100%'; lbl.textContent='Done!';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `menu-v4-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('ZIP exported — push to GitHub!','success');
    setTimeout(()=>{progress.classList.remove('show'); bar.style.width='0%';}, 2500);
  }

  /* ══════════════════════════════════════════════════════════
     DARK MODE TOGGLE (admin)
  ══════════════════════════════════════════════════════════ */

  function toggleDark() {
    const dark = document.documentElement.getAttribute('data-mode') !== 'dark';
    document.documentElement.setAttribute('data-mode', dark?'dark':'light');
    document.querySelectorAll('.dark-icon').forEach(i=>
      i.className=`fa-solid ${dark?'fa-sun':'fa-moon'} dark-icon`);
    // Re-inject tokens so dark colour derivation runs in the studio itself
    Engine.applyTokens(doc.tokens);
    applyLive();
  }

  /* ══════════════════════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════════════════════ */

  function toast(msg, type='info') {
    const icons={success:'fa-circle-check',error:'fa-circle-exclamation',info:'fa-circle-info'};
    const el=document.createElement('div');
    el.className=`toast ${type}`;
    el.innerHTML=`<i class="fa-solid ${icons[type]}"></i><span>${msg}</span>`;
    $('toast-container').appendChild(el);
    setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),320);},3500);
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */
  const $     = id => document.getElementById(id);
  const setVal = (id, v) => { const el=$(id); if(el) el.value=v; };

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */
  return {
    init, login, logout, changePassword, togglePassVis, toggleDark,
    switchTab, applyPreset, applyFontPreset,
    setColorTab, setColor, syncHex, setHex, setRadius, setSpacing,
    setDisplayFont, setBodyFont,
    onLayoutChange, updateColLabel,
    setHeroLayout, saveHeroField, handleHeroImgFile, removeHeroImg,
    setSectionEnabled,
    saveMeta, saveContact, handleLogoUpload, removeLogo,
    openCatModal, closeCatModal, pickIcon, saveCat, deleteCat, setCatVisible,
    openItemModal, closeItemModal, saveItem, deleteItem, setItemAvail,
    handleImgFile, removeImg, setupImgDrag, renderItemList,
    showConfirm, closeConfirm, execConfirm,
    exportZip,
  };

})();

document.addEventListener('DOMContentLoaded', () => {
  Studio.init();
  Studio.setupImgDrag();
});
