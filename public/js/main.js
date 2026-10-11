/**
 * AMIBIOMED - Script Front-End Principal
 * Association Marocaine de l'Ingénierie Biomédicale
 */

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initSplashIntro();
  initPageTransitions();
  initCounters();
  loadRecentEvents();
  loadPartners();
  initAdhesionForm();
  initContactForm();
  highlightActiveNav();
  initMobileNav();
  loadSiteSettings();
});

// Initialisation du Menu Mobile Tiroir (Drawer)
function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-nav-toggle');
  const closeBtn = document.getElementById('mobile-nav-close');
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('mobile-nav-backdrop');

  if (!toggleBtn || !drawer || !backdrop) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
}

// 1. Surbrillance du lien actif de navigation
function highlightActiveNav() {
  const currentPath = window.location.pathname.toLowerCase();
  const currentHash = window.location.hash.toLowerCase();
  let currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1);
  if (!currentFile || currentFile === '/') {
    currentFile = 'index.html';
  }

  const navLinks = document.querySelectorAll('.header-nav .nav-link-pill, .mobile-nav-links .mobile-nav-link');
  
  navLinks.forEach(link => link.classList.remove('active'));

  let matched = false;

  if (currentHash) {
    navLinks.forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      if (href.endsWith(currentHash) || href === (currentFile + currentHash)) {
        link.classList.add('active');
        matched = true;
      }
    });
  }

  if (!matched) {
    navLinks.forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const hrefFile = href.substring(href.lastIndexOf('/') + 1).split('#')[0];
      if ((hrefFile === currentFile || (currentFile === 'events.html' && hrefFile === 'activities.html') || (currentFile === 'activities.html' && hrefFile === 'events.html')) && !href.includes('#')) {
        link.classList.add('active');
      }
    });
  }
}

// 2. Compteurs Animés au Scroll (Page d'accueil)
function initCounters() {
  const counterElements = document.querySelectorAll('.counter-number');
  if (counterElements.length === 0) return;

  let hasAnimated = false;
  const animate = () => {
    const section = document.querySelector('.counters-section');
    if (!section) return;

    const top = section.getBoundingClientRect().top;
    if (top < window.innerHeight - 50 && !hasAnimated) {
      hasAnimated = true;
      counterElements.forEach(el => {
        const target = parseInt(el.getAttribute('data-target'), 10);
        let current = 0;
        const increment = Math.ceil(target / 40);
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
          } else {
            el.textContent = current;
          }
        }, 35);
      });
    }
  };

  window.addEventListener('scroll', animate);
  animate();
}

// 3. Charger les Activités (Accueil & Page Activités / Événements)
async function loadRecentEvents() {
  const eventsContainer = document.getElementById('recent-events-container');
  const allEventsContainer = document.getElementById('all-events-container');

  if (!eventsContainer && !allEventsContainer) return;

  try {
    const isHomePage = !!eventsContainer;
    const url = isHomePage ? '/api/events?limit=6' : '/api/events';
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success || !data.data || data.data.length === 0) {
      const emptyMsg = '<div class="col-12 text-center text-muted py-5"><i class="fa-solid fa-calendar-xmark fa-2x mb-3 text-secondary"></i><p class="fs-6">Aucune activité programmée pour le moment.</p></div>';
      if (eventsContainer) eventsContainer.innerHTML = emptyMsg;
      if (allEventsContainer) allEventsContainer.innerHTML = emptyMsg;
      return;
    }

    const getIconInfo = (type, title) => {
      const t = ((type || '') + ' ' + (title || '')).toLowerCase();
      if (t.includes('scientifique') || t.includes('ia') || t.includes('intelligence') || t.includes('robot')) {
        return { icon: 'fa-solid fa-robot', colorClass: 'activity-icon-green' };
      }
      if (t.includes('international') || t.includes('monde') || t.includes('icbe') || t.includes('globe')) {
        return { icon: 'fa-solid fa-globe', colorClass: 'activity-icon-green' };
      }
      if (t.includes('formation') || t.includes('atelier') || t.includes('workshop') || t.includes('groupe')) {
        return { icon: 'fa-solid fa-users', colorClass: 'activity-icon-green' };
      }
      if (t.includes('séminaire') || t.includes('clinico') || t.includes('médical') || t.includes('santé')) {
        return { icon: 'fa-solid fa-stethoscope', colorClass: 'activity-icon-green' };
      }
      return { icon: 'fa-solid fa-calendar-check', colorClass: 'activity-icon-green' };
    };

    const getActionHtml = (ev) => {
      if (ev.lien_action) {
        const la = ev.lien_action.trim();
        if (la.toLowerCase().includes('particip') || la.toLowerCase().includes('rejoign')) {
          return `<a href="/adhesion.html" class="activity-action-link">${la}</a>`;
        }
        if (la.toLowerCase().includes('réalisé') || ev.statut === 'realise') {
          return `<span class="fw-semibold text-primary" style="font-size:0.92rem;">${la}</span>`;
        }
        if (la.toLowerCase().includes('cours') || ev.statut === 'en_cours') {
          return `<span class="fw-semibold text-warning" style="font-size:0.92rem;">${la}</span>`;
        }
        return `<a href="/activities.html" class="activity-action-link">${la}</a>`;
      }
      if (ev.statut === 'a_venir') {
        return `<a href="/adhesion.html" class="activity-action-link">Participez avec nous!</a>`;
      } else if (ev.statut === 'en_cours') {
        return `<span class="fw-semibold text-warning" style="font-size:0.92rem;">En cours</span>`;
      } else {
        return `<span class="fw-semibold text-primary" style="font-size:0.92rem;">Réalisé</span>`;
      }
    };

    const renderEvents = (items, targetEl) => {
      targetEl.innerHTML = items.map(ev => {
        const iconInfo = getIconInfo(ev.type_activite, ev.titre);
        const actionHtml = getActionHtml(ev);

        return `
          <div class="col-md-6 col-lg-4 d-flex">
            <div class="activity-card-modern w-100">
              <div class="activity-icon-sq ${iconInfo.colorClass}">
                <i class="${iconInfo.icon}"></i>
              </div>
              <h3 class="activity-card-title">${ev.titre}</h3>
              <p class="activity-card-desc">${ev.description || ''}</p>
              <div class="activity-card-meta">
                ${actionHtml}
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    if (eventsContainer) renderEvents(data.data.slice(0, 3), eventsContainer);
    if (allEventsContainer) renderEvents(data.data, allEventsContainer);

  } catch (err) {
    console.error('Erreur chargement activités :', err);
  }
}

// 4. Charger les Partenaires (Grille & Carousel)
async function loadPartners() {
  const partnersContainer = document.getElementById('partners-grid-container');
  if (!partnersContainer) return;

  try {
    const response = await fetch('/api/partners?statut=actif');
    const data = await response.json();

    if (!data.success || !data.data || data.data.length === 0) {
      partnersContainer.innerHTML = `
        <div class="col-12 col-md-4 mb-4">
          <a href="https://www.uca.ma" target="_blank" class="text-decoration-none">
            <div class="partner-logo-box" title="Université Cadi Ayyad de Marrakech">
              <img src="/img/partners/uca.jpg" alt="Université Cadi Ayyad">
            </div>
          </a>
        </div>
        <div class="col-12 col-md-4 mb-4">
          <a href="https://fmpm.uca.ma" target="_blank" class="text-decoration-none">
            <div class="partner-logo-box" title="Faculté de Médecine et de Pharmacie de Marrakech">
              <img src="/img/partners/fpm.webp" alt="Faculté de Médecine et de Pharmacie">
            </div>
          </a>
        </div>
        <div class="col-12 col-md-4 mb-4">
          <a href="http://www.chumarrakech.ma" target="_blank" class="text-decoration-none">
            <div class="partner-logo-box" title="CHU Mohammed VI Marrakech">
              <img src="/img/partners/chu.webp" alt="CHU Mohammed VI">
            </div>
          </a>
        </div>
      `;
      return;
    }

    partnersContainer.innerHTML = data.data.map(p => `
      <div class="col-12 col-md-4 mb-4">
        <a href="${p.site_url || '#'}" target="_blank" class="text-decoration-none">
          <div class="partner-logo-box" title="${p.nom}">
            <img src="${p.logo_path}" alt="${p.nom}" onerror="this.onerror=null; this.parentNode.innerHTML='<span class=\'fw-bold text-dark text-center\' style=\'font-size:0.85rem;\'>${p.nom}</span>';">
          </div>
        </a>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erreur chargement partenaires :', err);
  }
}

// 5. Traitement du Formulaire d'Adhésion en Ligne
function initAdhesionForm() {
  const form = document.getElementById('adhesion-form');
  if (!form) return;

  const alertBox = document.getElementById('adhesion-alert');
  const submitBtn = document.getElementById('adhesion-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');
    
    const formData = new FormData(form);
    const fileInput = document.getElementById('justificatif');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showAlert(alertBox, 'danger', '<i class="fa-solid fa-circle-exclamation me-2"></i>Veuillez téléverser votre pièce justificative.');
      return;
    }

    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      showAlert(alertBox, 'danger', '<i class="fa-solid fa-circle-exclamation me-2"></i>La taille du fichier ne doit pas dépasser 5 Mo.');
      return;
    }

    // Effet chargement bouton
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Transmission du dossier...';

    try {
      const response = await fetch('/api/adhesions', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        showAlert(
          alertBox,
          'success',
          `<i class="fa-solid fa-circle-check fa-lg me-2"></i><strong>Félicitations !</strong> ${data.message}`
        );
        form.reset();
      } else {
        showAlert(alertBox, 'danger', `<i class="fa-solid fa-triangle-exclamation me-2"></i>${data.message}`);
      }
    } catch (err) {
      console.error('Erreur soumission adhésion :', err);
      showAlert(alertBox, 'danger', '<i class="fa-solid fa-triangle-exclamation me-2"></i>Une erreur réseau est survenue. Veuillez réessayer.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i>Soumettre ma Candidature';
    }
  });
}

// 6. Traitement du Formulaire de Contact
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const alertBox = document.getElementById('contact-alert');
  const submitBtn = document.getElementById('contact-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');

    const payload = {
      nom_complet: document.getElementById('nom_complet').value,
      email: document.getElementById('email').value,
      sujet: document.getElementById('sujet').value,
      message: document.getElementById('message').value,
      honeypot: document.getElementById('honeypot') ? document.getElementById('honeypot').value : ''
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Envoi en cours...';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        showAlert(alertBox, 'success', `<i class="fa-solid fa-circle-check me-2"></i>${data.message}`);
        form.reset();
      } else {
        showAlert(alertBox, 'danger', `<i class="fa-solid fa-triangle-exclamation me-2"></i>${data.message}`);
      }
    } catch (err) {
      console.error('Erreur envoi contact :', err);
      showAlert(alertBox, 'danger', '<i class="fa-solid fa-triangle-exclamation me-2"></i>Erreur lors de l’envoi. Veuillez réessayer.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i>Envoyer le Message';
    }
  });
}

function showAlert(alertEl, type, htmlMsg) {
  alertEl.className = `alert alert-${type} mt-3 shadow-sm border-0 d-block`;
  alertEl.innerHTML = htmlMsg;
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ——————————————————————————————————————————————————————————
   SUPPORT MULTILINGUE (i18n : FR / AR / EN)
   —————————————————————————————————————————————————————————— */
const i18nData = {
  fr: {
    nav_home: 'Accueil',
    nav_about: 'À Propos',
    nav_organigram: 'Organigramme',
    nav_events: 'Activités',
    nav_activities: 'Activités',
    nav_partners: 'Partenaires',
    nav_contact: 'Contact',
    btn_join: 'Devenir Membre',
    btn_submit_candidature: 'Soumettre ma candidature',
    footer_devise: 'Technologie • Santé • Éthique',
    footer_rights: '© 2025–2026 AMIBIOMED — Tous droits réservés.',
    hero_badge: 'Fédérer • Innover • Valider',
    hero_title_1: "L'Ingénierie Biomédicale",
    hero_title_2: "au Service de la Santé au Maroc",
    hero_desc: "Depuis 2017, AMIBIOMED rassemble les ingénieurs biomédicaux, hospitaliers, chercheurs, professionnels de santé et industriels pour bâtir des technologies médicales fiables, éthiques et souveraines.",
    btn_join_assoc: "Rejoindre l'Association",
    btn_discover_org: "Découvrir l'Organigramme"
  },
  ar: {
    nav_home: 'الرئيسية',
    nav_about: 'عن الجمعية',
    nav_organigram: 'الهيكل التنظيمي',
    nav_events: 'الأنشطة',
    nav_activities: 'الأنشطة',
    nav_partners: 'الشركاء',
    nav_contact: 'اتصل بنا',
    btn_join: 'الانضمام كعضو',
    btn_submit_candidature: 'تقديم طلب العضوية',
    footer_devise: 'تكنولوجيا • صحة • أصل الأخلاقيات',
    footer_rights: '© 2025–2026 الجمعية المغربية للهندسة البيوطبية — جميع الحقوق محفوظة.',
    hero_badge: 'تجميع • تبتكر • تصادق',
    hero_title_1: "الهندسة البيوطبية",
    hero_title_2: "في خدمة الصحة بالمغرب",
    hero_desc: "منذ سنة 2017، تجمع الجمعية المغربية للهندسة البيوطبية المهندسين والباحثين والأطباء والفاعلين الصناعيين لبناء تكنولوجيا طبية موثوقة وأخلاقية ومستقلة.",
    btn_join_assoc: "الانضمام إلى الجمعية",
    btn_discover_org: "اكتشاف الهيكل التنظيمي"
  },
  en: {
    nav_home: 'Home',
    nav_about: 'About Us',
    nav_organigram: 'Organization Chart',
    nav_events: 'Activities',
    nav_activities: 'Activities',
    nav_partners: 'Partners',
    nav_contact: 'Contact',
    btn_join: 'Become a Member',
    btn_submit_candidature: 'Submit Application',
    footer_devise: 'Technology • Health • Ethics',
    footer_rights: '© 2025–2026 AMIBIOMED — All rights reserved.',
    hero_badge: 'Unite • Innovate • Validate',
    hero_title_1: "Biomedical Engineering",
    hero_title_2: "Serving Healthcare in Morocco",
    hero_desc: "Since 2017, AMIBIOMED brings together biomedical engineers, hospital staff, researchers, healthcare professionals, and industry leaders to build reliable, ethical, and sovereign medical technologies.",
    btn_join_assoc: "Join the Association",
    btn_discover_org: "Discover Organization Chart"
  }
};

function initI18n() {
  const currentLang = localStorage.getItem('amibiomed_lang') || 'fr';
  setLanguage(currentLang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      if (lang) setLanguage(lang);
    });
  });
}

function setLanguage(lang) {
  if (!i18nData[lang]) lang = 'fr';
  localStorage.setItem('amibiomed_lang', lang);

  if (lang === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = i18nData[lang][key];
    if (translation) {
      const icon = el.querySelector('i');
      if (icon) {
        el.innerHTML = '';
        el.appendChild(icon);
        const textNode = document.createTextNode(' ' + translation);
        el.appendChild(textNode);
      } else {
        el.textContent = translation;
      }
    }
  });
}

/* —GESTION DU LOGO ANIMÉ EN TRANSITION DE PAGE (SUR TOUS LES CLICS)— */
function initPageTransitions() {
  const overlay = document.getElementById('amibiomed-splash-overlay');
  if (!overlay) return;

  // Intercepter les clics vers une autre page interne
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Ignorer les ancres sur la même page, liens externes, mailto, tel, téléchargements
    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      link.target === '_blank' ||
      link.hasAttribute('download')
    ) {
      return;
    }

    try {
      const targetUrl = new URL(link.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      
      // Même page avec ancre hash : laisser le défilement natif sans rejouer l'intro
      if (targetUrl.pathname.toLowerCase() === window.location.pathname.toLowerCase() && targetUrl.hash) {
        return;
      }

      // Activer l'overlay immédiatement pour masquer la transition
      overlay.classList.remove('d-none');
      overlay.classList.remove('fade-out');

      // Naviguer vers la nouvelle page
      window.location.href = link.href;
    } catch (err) {
      // Navigation native
    }
  });
}

/* —SPLASH INTRO ANIMATION COMPLÈTE (AMIBIOMED)— */
function initSplashIntro() {
  const overlay = document.getElementById('amibiomed-splash-overlay');
  if (!overlay) return;

  overlay.classList.remove('d-none');
  overlay.classList.remove('fade-out');
  document.body.style.overflow = 'hidden';

  // Construction dynamique des lettres avec tempo conforme
  const fr = document.getElementById('splash-fr');
  if (fr) {
    const TEXT = "ASSOCIATION MAROCAINE DE L'INGÉNIERIE BIOMÉDICALE";
    fr.innerHTML = '';
    TEXT.split(' ').forEach((w, wi, arr) => {
      const word = document.createElement('div');
      word.style.display = 'flex';
      [...w].forEach((c, i) => {
        const s = document.createElement('span');
        s.textContent = c;
        s.style.animationDelay = (1.6 + (TEXT.indexOf(w) + i) * 0.02) + 's';
        word.appendChild(s);
      });
      fr.appendChild(word);
      if (wi < arr.length - 1) {
        const sp = document.createElement('span');
        sp.className = 'sp';
        sp.innerHTML = '&nbsp;';
        sp.style.animation = 'none';
        sp.style.opacity = 1;
        fr.appendChild(sp);
      }
    });
  }

  // Animation des particules Canvas
  const cv = document.getElementById('splash-fx');
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, H, P = [];
    const cols = ['90,171,58', '30,111,181', '224,48,63'];

    function size() {
      const d = window.devicePixelRatio || 1;
      W = cv.clientWidth || window.innerWidth;
      H = cv.clientHeight || window.innerHeight;
      cv.width = W * d;
      cv.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const n = Math.min(60, Math.round(W * H / 18000));
      P = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * .35,
        vy: (Math.random() - .5) * .35,
        r: Math.random() * 2.2 + 1,
        c: cols[Math.floor(Math.random() * 3)]
      }));
    }

    function tick() {
      if (overlay.classList.contains('fade-out') || overlay.classList.contains('d-none')) return;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < 120) {
            ctx.strokeStyle = 'rgba(' + a.c + ',' + (0.2 * (1 - d / 120)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(' + a.c + ',.55)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, 6.283);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    size();
    window.addEventListener('resize', size);
    tick();
  }

  // Clôture fluide uniquement APRÈS l'animation complète (5.8 secondes)
  let isClosed = false;
  const closeSplash = () => {
    if (isClosed) return;
    isClosed = true;
    overlay.classList.add('fade-out');
    document.body.style.overflow = '';
    
    // Défilement automatique vers ancre éventuelle (#partenaires, etc.)
    if (window.location.hash) {
      setTimeout(() => {
        try {
          const target = document.querySelector(window.location.hash);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        } catch (e) {}
      }, 300);
    }

    setTimeout(() => {
      overlay.classList.add('d-none');
    }, 850);
  };

  // Laisser l'animation se terminer de manière fluide et rapide (3.4 secondes)
  setTimeout(closeSplash, 3400);
}

// 12. Chargement Dynamique des Paramètres & Médias du Site (Hero & Badges)
async function loadSiteSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      const heroImg = document.getElementById('hero-main-img');
      if (heroImg && s.hero_image) {
        heroImg.src = s.hero_image;
      }
      const b1Title = document.getElementById('hero-badge-1-title');
      if (b1Title && s.hero_badge_1_title) b1Title.textContent = s.hero_badge_1_title;
      const b1Sub = document.getElementById('hero-badge-1-subtitle');
      if (b1Sub && s.hero_badge_1_subtitle) b1Sub.textContent = s.hero_badge_1_subtitle;

      const b2Title = document.getElementById('hero-badge-2-title');
      if (b2Title && s.hero_badge_2_title) b2Title.textContent = s.hero_badge_2_title;
      const b2Sub = document.getElementById('hero-badge-2-subtitle');
      if (b2Sub && s.hero_badge_2_subtitle) b2Sub.textContent = s.hero_badge_2_subtitle;

      const aboutImg = document.getElementById('about-main-img');
      if (aboutImg && s.about_image) {
        aboutImg.src = s.about_image;
      }
    }
  } catch (e) {
    // Silencieux : fallback sur les images intégrées dans le HTML
  }
}
