/**
 * AMIBIOMED - Script Front-End Principal
 * Association Marocaine de l'Ingénierie Biomédicale
 */

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initSplashIntro();
  initCounters();
  loadRecentEvents();
  loadPartners();
  initAdhesionForm();
  initContactForm();
  highlightActiveNav();
  initMobileNav();
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
      const href = link.getAttribute('href') || '';
      if (href.toLowerCase() === (currentFile + currentHash)) {
        link.classList.add('active');
        matched = true;
      }
    });
  }

  if (!matched) {
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const hrefFile = href.substring(href.lastIndexOf('/') + 1).toLowerCase().split('#')[0];
      if (hrefFile === currentFile && !href.includes('#')) {
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

// 3. Charger les événements récents (Accueil & Page Événements)
async function loadRecentEvents() {
  const eventsContainer = document.getElementById('recent-events-container');
  const allEventsContainer = document.getElementById('all-events-container');

  if (!eventsContainer && !allEventsContainer) return;

  try {
    const isHomePage = !!eventsContainer;
    const url = isHomePage ? '/api/events?limit=3' : '/api/events';
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success || !data.data || data.data.length === 0) {
      const emptyMsg = '<div class="col-12 text-center text-muted py-4"><i class="fa-solid fa-calendar-xmark fa-2x mb-2"></i><p>Aucun événement programmé pour le moment.</p></div>';
      if (eventsContainer) eventsContainer.innerHTML = emptyMsg;
      if (allEventsContainer) allEventsContainer.innerHTML = emptyMsg;
      return;
    }

    const renderEvents = (items, targetEl) => {
      targetEl.innerHTML = items.map(ev => {
        const dateFormatted = new Date(ev.date_event).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const statusLabels = {
          a_venir: '<span class="badge-status a_venir"><i class="fa-solid fa-clock"></i> À venir</span>',
          en_cours: '<span class="badge-status en_cours"><i class="fa-solid fa-spinner fa-spin"></i> En cours</span>',
          realise: '<span class="badge-status realise"><i class="fa-solid fa-circle-check"></i> Réalisé</span>'
        };

        const pdfBtn = ev.programme_pdf 
          ? `<a href="${ev.programme_pdf}" target="_blank" class="btn btn-sm btn-amibiomed-outline"><i class="fa-solid fa-file-pdf text-danger me-1"></i> Programme PDF</a>`
          : '';

        return `
          <div class="col-md-4 mb-4">
            <div class="event-card">
              <img src="${ev.image_cover || '/img/photos/event-congres.jpg'}" class="event-card-img" alt="${ev.titre}">
              <div class="event-card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  ${statusLabels[ev.statut] || statusLabels.a_venir}
                  <small class="text-muted"><i class="fa-solid fa-location-dot me-1"></i>${ev.lieu.split(',')[0]}</small>
                </div>
                <h5 class="card-title fw-bold mb-2 text-dark">${ev.titre}</h5>
                <div class="event-meta mb-3">
                  <span><i class="fa-solid fa-calendar-day me-1 text-primary"></i> ${dateFormatted}</span>
                </div>
                <p class="card-text text-muted flex-grow-1" style="font-size:0.9rem;">${ev.description}</p>
                <div class="d-flex justify-content-between align-items-center pt-3 border-top mt-3">
                  ${pdfBtn}
                  <a href="/adhesion.html" class="btn btn-sm btn-amibiomed-primary">Rejoindre</a>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    if (eventsContainer) renderEvents(data.data, eventsContainer);
    if (allEventsContainer) renderEvents(data.data, allEventsContainer);

  } catch (err) {
    console.error('Erreur chargement événements :', err);
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
        <div class="col-6 col-md-3"><div class="partner-logo-box"><span class="fw-bold text-muted">Université Cadi Ayyad</span></div></div>
        <div class="col-6 col-md-3"><div class="partner-logo-box"><span class="fw-bold text-muted">FMPM Marrakech</span></div></div>
        <div class="col-6 col-md-3"><div class="partner-logo-box"><span class="fw-bold text-muted">CHU Mohammed VI</span></div></div>
        <div class="col-6 col-md-3"><div class="partner-logo-box"><span class="fw-bold text-muted">SMTM Maroc</span></div></div>
      `;
      return;
    }

    partnersContainer.innerHTML = data.data.map(p => `
      <div class="col-6 col-md-3 mb-4">
        <a href="${p.site_url || '#'}" target="_blank" class="text-decoration-none">
          <div class="partner-logo-box" title="${p.nom}">
            <img src="${p.logo_path}" alt="${p.nom}" onerror="this.onerror=null; this.parentNode.innerHTML='<span class=\'fw-bold text-dark text-center style=\'font-size:0.85rem;\'\'>${p.nom}</span>';">
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
    nav_events: 'Événements',
    nav_contact: 'Contact',
    nav_login: 'Connexion',
    nav_admin_login: 'Connexion Administration',
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
    nav_events: 'الفعاليات',
    nav_contact: 'اتصل بنا',
    nav_login: 'تسجيل الدخول',
    nav_admin_login: 'دخول الإدارة',
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
    nav_events: 'Events',
    nav_contact: 'Contact',
    nav_login: 'Login',
    nav_admin_login: 'Admin Login',
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

/* —INFRINGEMENT SAFE SPLASH INTRO ANIMATION (SEULEMENT PREMIÈRE VISITE)— */
function initSplashIntro() {
  const overlay = document.getElementById('amibiomed-splash-overlay');
  if (!overlay) return;

  const hasSeenIntro = sessionStorage.getItem('amibiomed_intro_shown');
  if (hasSeenIntro) {
    overlay.classList.add('d-none');
    return;
  }

  overlay.classList.remove('d-none');
  document.body.style.overflow = 'hidden';

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
        s.style.animationDelay = (2.4 + (TEXT.indexOf(w) + i) * 0.035) + 's';
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

  const cv = document.getElementById('splash-fx');
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, H, P = [];
    const cols = ['90,171,58', '30,111,181', '224,48,63'];

    function size() {
      const d = window.devicePixelRatio || 1;
      W = cv.clientWidth;
      H = cv.clientHeight;
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
      if (overlay.classList.contains('fade-out')) return;
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

  const closeSplash = () => {
    overlay.classList.add('fade-out');
    document.body.style.overflow = '';
    sessionStorage.setItem('amibiomed_intro_shown', 'true');
    setTimeout(() => overlay.classList.add('d-none'), 850);
  };

  const skipBtn = document.getElementById('splash-skip-btn');
  if (skipBtn) skipBtn.addEventListener('click', closeSplash);

  setTimeout(closeSplash, 5800);
}
