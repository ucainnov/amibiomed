/**
 * AMIBIOMED - Logique Dynamique de l'Espace Administrateur (Back-Office)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const isLoginPage = window.location.pathname.includes('login.html');

  if (isLoginPage) {
    initAdminLogin();
  } else {
    // Vérifier l'authentification active
    const isAuth = await checkAdminSession();
    if (!isAuth) return;

    initLogout();

    if (window.location.pathname.includes('dashboard.html')) {
      loadDashboardStats();
    } else if (window.location.pathname.includes('adhesions-list.html')) {
      initAdhesionsModeration();
    } else if (window.location.pathname.includes('events-manage.html')) {
      initEventsManagement();
      initPartnersManagement();
    } else if (window.location.pathname.includes('media-manage.html')) {
      initMediaManagement();
    } else if (window.location.pathname.includes('users-manage.html')) {
      initUsersManagement();
    }
  }
});

// 1. Vérifier la session JWT active
async function checkAdminSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.success) {
      window.location.href = '/admin/login.html';
      return false;
    }
    const adminNameEl = document.getElementById('admin-user-name');
    if (adminNameEl) adminNameEl.textContent = data.admin.nom;
    return true;
  } catch (err) {
    window.location.href = '/admin/login.html';
    return false;
  }
}

// 2. Connexion Administrateur
function initAdminLogin() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Connexion en cours...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = '/admin/dashboard.html';
      } else {
        alertBox.className = 'alert alert-danger d-block';
        alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation me-2"></i>${data.message}`;
      }
    } catch (err) {
      console.error('Erreur login:', err);
      alertBox.className = 'alert alert-danger d-block';
      alertBox.innerHTML = '<i class="fa-solid fa-circle-exclamation me-2"></i>Erreur de connexion au serveur.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i>Se Connecter au Back-Office';
    }
  });
}

// 3. Déconnexion
function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });
}

// 4. Charger les Statistiques KPI Dashboard
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();
    if (!data.success) return;

    const s = data.stats;
    document.getElementById('kpi-total-adhesions').textContent = s.totalAdhesions;
    document.getElementById('kpi-pending-adhesions').textContent = s.pendingAdhesions;
    document.getElementById('kpi-validated-adhesions').textContent = s.validatedAdhesions;
    document.getElementById('kpi-events-count').textContent = s.totalEvents;

    // Table récents dossiers
    const recentAdhesionsTable = document.getElementById('recent-adhesions-tbody');
    if (recentAdhesionsTable) {
      if (data.recentAdhesions.length === 0) {
        recentAdhesionsTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucune demande d\'adhésion récente.</td></tr>';
      } else {
        recentAdhesionsTable.innerHTML = data.recentAdhesions.map(a => `
          <tr>
            <td><strong>#ADH-${a.id}</strong></td>
            <td>${a.nom_complet}</td>
            <td><span class="badge bg-secondary">${a.type_membre.toUpperCase()}</span></td>
            <td>${a.affiliation}</td>
            <td><span class="badge-status ${a.statut}">${a.statut.replace('_', ' ')}</span></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Erreur chargement KPI:', err);
  }
}

// 5. Modération des Demandes d'Adhésion
function initAdhesionsModeration() {
  const tableBody = document.getElementById('adhesions-tbody');
  const searchInput = document.getElementById('search-adhesions');
  const filterStatut = document.getElementById('filter-statut');
  const exportBtn = document.getElementById('export-csv-btn');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.location.href = '/api/admin/adhesions/export';
    });
  }

  const fetchAdhesions = async () => {
    try {
      const search = searchInput ? searchInput.value : '';
      const statut = filterStatut ? filterStatut.value : 'all';

      const res = await fetch(`/api/admin/adhesions?statut=${statut}&search=${encodeURIComponent(search)}`);
      const data = await res.json();

      if (!data.success || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fa-solid fa-inbox fa-2x mb-2 d-block"></i>Aucun dossier d\'adhésion correspondant.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(a => {
        const dateStr = new Date(a.date_soumission).toLocaleDateString('fr-FR');
        return `
          <tr>
            <td><strong>#ADH-${a.id}</strong></td>
            <td>
              <div class="fw-bold">${a.nom_complet}</div>
              <small class="text-muted">CIN: ${a.cin} | ${a.email}</small>
            </td>
            <td><span class="badge bg-light text-dark border">${a.type_membre.toUpperCase()}</span></td>
            <td>${a.affiliation}</td>
            <td><small class="text-muted">${dateStr}</small></td>
            <td><span class="badge-status ${a.statut}">${a.statut.replace('_', ' ')}</span></td>
            <td>
              <div class="btn-group btn-group-sm">
                <a href="${a.justificatif_path}" target="_blank" class="btn btn-outline-secondary" title="Voir Justificatif PDF/Image">
                  <i class="fa-solid fa-file-lines"></i> Document
                </a>
                ${a.statut === 'en_attente' ? `
                  <button onclick="updateAdhesionStatus(${a.id}, 'validee')" class="btn btn-success" title="Valider l'adhésion">
                    <i class="fa-solid fa-check"></i>
                  </button>
                  <button onclick="openRejectionModal(${a.id})" class="btn btn-danger" title="Rejeter l'adhésion">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Erreur chargement adhésions :', err);
    }
  };

  if (searchInput) searchInput.addEventListener('input', fetchAdhesions);
  if (filterStatut) filterStatut.addEventListener('change', fetchAdhesions);

  fetchAdhesions();
}

// Fonction globale valider adhésion
window.updateAdhesionStatus = async function(id, statut, motif = null) {
  if (statut === 'validee' && !confirm(`Confirmez-vous la validation du dossier #${id} ? Un e-mail de confirmation sera automatiquement envoyé.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/adhesions/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut, motif_rejet: motif })
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.message}`);
      location.reload();
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    alert('Erreur lors de la mise à jour du statut.');
  }
};

window.openRejectionModal = function(id) {
  const motif = prompt("Veuillez saisir le motif explicatif du rejet de ce dossier (ce texte sera communiqué au candidat par courriel) :");
  if (motif !== null && motif.trim() !== '') {
    window.updateAdhesionStatus(id, 'rejetee', motif.trim());
  }
};

// 6. Gestion des Événements & Partenaires
function initEventsManagement() {
  const tableBody = document.getElementById('events-tbody');
  if (!tableBody) return;

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();

      if (!data.success || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun événement répertorié.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(e => `
        <tr>
          <td><img src="${e.image_cover}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;" alt=""></td>
          <td><strong>${e.titre}</strong></td>
          <td>${new Date(e.date_event).toLocaleDateString('fr-FR')}</td>
          <td><span class="badge-status ${e.statut}">${e.statut.replace('_', ' ')}</span></td>
          <td>
            <button onclick="deleteEventItem(${e.id})" class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  };

  fetchEvents();

  const addForm = document.getElementById('add-event-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);

      try {
        const res = await fetch('/api/admin/events', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ Événement créé avec succès !');
          location.reload();
        } else {
          alert(`❌ ${data.message}`);
        }
      } catch (err) {
        alert('Erreur lors de la création de l\'événement.');
      }
    });
  }
}

window.deleteEventItem = async function(id) {
  if (confirm("Voulez-vous vraiment supprimer cet événement ?")) {
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    location.reload();
  }
};

function initPartnersManagement() {
  const tableBody = document.getElementById('partners-tbody');
  if (!tableBody) return;

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/partners');
      const data = await res.json();

      if (!data.success || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucun partenaire enregistré.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(p => `
        <tr>
          <td><img src="${p.logo_path}" style="max-height: 30px;" alt="${p.nom}" onerror="this.onerror=null; this.parentNode.innerHTML='${p.nom}';"></td>
          <td><strong>${p.nom}</strong></td>
          <td><span class="badge bg-info text-dark">${p.categorie.toUpperCase()}</span></td>
          <td>
            <button onclick="deletePartnerItem(${p.id})" class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  };

  fetchPartners();

  const addForm = document.getElementById('add-partner-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addForm);

      try {
        const res = await fetch('/api/admin/partners', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ Partenaire ajouté avec succès !');
          location.reload();
        } else {
          alert(`❌ ${data.message}`);
        }
      } catch (err) {
        alert('Erreur lors de la création du partenaire.');
      }
    });
  }
}

window.deletePartnerItem = async function(id) {
  if (confirm("Voulez-vous vraiment supprimer ce partenaire ?")) {
    await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
    location.reload();
  }
};

// ==========================================================
// 8. GESTION DES MÉDIAS & PARAMÈTRES (HERO & BADGES)
// ==========================================================
function initMediaManagement() {
  const alertBox = document.getElementById('media-alert');
  const livePreview = document.getElementById('live-hero-preview');
  const dropzone = document.getElementById('dropzone-hero');
  const fileInput = document.getElementById('hero-file-input');
  const fileChosenInfo = document.getElementById('file-chosen-info');
  const fileNameText = document.getElementById('file-name-text');
  const cancelFileBtn = document.getElementById('btn-cancel-file');
  const submitHeroBtn = document.getElementById('btn-submit-hero');
  const resetHeroBtn = document.getElementById('btn-reset-hero');
  const heroUploadForm = document.getElementById('hero-upload-form');

  const b1TitleInput = document.getElementById('input-badge-1-title');
  const b1SubInput = document.getElementById('input-badge-1-sub');
  const b2TitleInput = document.getElementById('input-badge-2-title');
  const b2SubInput = document.getElementById('input-badge-2-sub');

  const liveB1Title = document.getElementById('live-badge-1-title');
  const liveB1Sub = document.getElementById('live-badge-1-sub');
  const liveB2Title = document.getElementById('live-badge-2-title');
  const liveB2Sub = document.getElementById('live-badge-2-sub');
  const badgesForm = document.getElementById('hero-badges-form');

  let currentSavedImage = '../img/photos/hero-biomedical.jpg';

  const showAlert = (msg, type = 'success') => {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} d-block`;
    alertBox.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'} me-2"></i>${msg}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      alertBox.classList.add('d-none');
    }, 6000);
  };

  // Chargement des données actuelles
  async function loadCurrentSettings() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.hero_image) {
          const formattedImg = s.hero_image.startsWith('/') ? s.hero_image : `../${s.hero_image}`;
          currentSavedImage = formattedImg;
          if (livePreview) livePreview.src = formattedImg;
        }
        if (s.hero_badge_1_title) {
          if (b1TitleInput) b1TitleInput.value = s.hero_badge_1_title;
          if (liveB1Title) liveB1Title.textContent = s.hero_badge_1_title;
        }
        if (s.hero_badge_1_subtitle) {
          if (b1SubInput) b1SubInput.value = s.hero_badge_1_subtitle;
          if (liveB1Sub) liveB1Sub.textContent = s.hero_badge_1_subtitle;
        }
        if (s.hero_badge_2_title) {
          if (b2TitleInput) b2TitleInput.value = s.hero_badge_2_title;
          if (liveB2Title) liveB2Title.textContent = s.hero_badge_2_title;
        }
        if (s.hero_badge_2_subtitle) {
          if (b2SubInput) b2SubInput.value = s.hero_badge_2_subtitle;
          if (liveB2Sub) liveB2Sub.textContent = s.hero_badge_2_subtitle;
        }
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    }
  }

  loadCurrentSettings();

  // Mise à jour live de la frappe des badges
  if (b1TitleInput && liveB1Title) {
    b1TitleInput.addEventListener('input', () => { liveB1Title.textContent = b1TitleInput.value || 'Excellence Clinique'; });
  }
  if (b1SubInput && liveB1Sub) {
    b1SubInput.addEventListener('input', () => { liveB1Sub.textContent = b1SubInput.value || 'Normes & Éthique Médicale'; });
  }
  if (b2TitleInput && liveB2Title) {
    b2TitleInput.addEventListener('input', () => { liveB2Title.textContent = b2TitleInput.value || 'CHU & Université'; });
  }
  if (b2SubInput && liveB2Sub) {
    b2SubInput.addEventListener('input', () => { liveB2Sub.textContent = b2SubInput.value || 'Partenaires Fondateurs'; });
  }

  // Dropzone events
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleSelectedFile(fileInput.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleSelectedFile(fileInput.files[0]);
      }
    });
  }

  function handleSelectedFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
      return;
    }
    if (fileNameText) fileNameText.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} Mo)`;
    if (fileChosenInfo) fileChosenInfo.classList.remove('d-none');
    if (submitHeroBtn) submitHeroBtn.disabled = false;

    // Aperçu client instantané
    const reader = new FileReader();
    reader.onload = (e) => {
      if (livePreview) livePreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (cancelFileBtn) {
    cancelFileBtn.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      if (fileChosenInfo) fileChosenInfo.classList.add('d-none');
      if (submitHeroBtn) submitHeroBtn.disabled = true;
      if (livePreview) livePreview.src = currentSavedImage;
    });
  }

  // Upload image
  if (heroUploadForm) {
    heroUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fileInput.files || !fileInput.files[0]) return;

      const formData = new FormData();
      formData.append('hero_image', fileInput.files[0]);

      submitHeroBtn.disabled = true;
      submitHeroBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Téléversement en cours...';

      try {
        const res = await fetch('/api/admin/settings/upload-hero', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          showAlert(data.message, 'success');
          const formattedImg = data.hero_image.startsWith('/') ? data.hero_image : `../${data.hero_image}`;
          currentSavedImage = formattedImg;
          if (livePreview) livePreview.src = formattedImg;
          if (fileChosenInfo) fileChosenInfo.classList.add('d-none');
          if (fileInput) fileInput.value = '';
        } else {
          showAlert(data.message, 'danger');
        }
      } catch (err) {
        showAlert('Erreur lors du téléversement de l’image.', 'danger');
      } finally {
        submitHeroBtn.disabled = false;
        submitHeroBtn.innerHTML = '<i class="fa-solid fa-check me-2"></i> Téléverser &amp; Publier sur le Site';
      }
    });
  }

  // Réinitialiser image hero
  if (resetHeroBtn) {
    resetHeroBtn.addEventListener('click', async () => {
      if (!confirm("Voulez-vous réinitialiser l'illustration héroïque à l'image originale d'AMIBIOMED ?")) return;

      resetHeroBtn.disabled = true;
      try {
        const res = await fetch('/api/admin/settings/reset-hero', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showAlert(data.message, 'success');
          currentSavedImage = '../img/photos/hero-biomedical.jpg';
          if (livePreview) livePreview.src = currentSavedImage;
          if (fileChosenInfo) fileChosenInfo.classList.add('d-none');
          if (fileInput) fileInput.value = '';
          if (submitHeroBtn) submitHeroBtn.disabled = true;
        } else {
          showAlert(data.message, 'danger');
        }
      } catch (err) {
        showAlert('Erreur lors de la réinitialisation.', 'danger');
      } finally {
        resetHeroBtn.disabled = false;
      }
    });
  }

  // Enregistrer les textes des badges
  if (badgesForm) {
    badgesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-badges');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Enregistrement...';
      }

      const payload = {
        hero_badge_1_title: b1TitleInput ? b1TitleInput.value.trim() : '',
        hero_badge_1_subtitle: b1SubInput ? b1SubInput.value.trim() : '',
        hero_badge_2_title: b2TitleInput ? b2TitleInput.value.trim() : '',
        hero_badge_2_subtitle: b2SubInput ? b2SubInput.value.trim() : ''
      };

      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showAlert('Textes des badges enregistrés et synchronisés avec succès sur le site !', 'success');
        } else {
          showAlert(data.message, 'danger');
        }
      } catch (err) {
        showAlert('Erreur lors de l’enregistrement des badges.', 'danger');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i> Enregistrer les Textes';
        }
      }
    });
  }
}

// ==========================================================
// 9. GESTION MULTI-COMPTES ADMINISTRATEURS
// ==========================================================
let allLoadedUsers = [];
let currentLoggedInUserId = null;

function initUsersManagement() {
  const alertBox = document.getElementById('users-alert');
  const tableBody = document.getElementById('users-table-body');
  const searchInput = document.getElementById('users-search-input');
  const formCreate = document.getElementById('form-create-user');
  const formEdit = document.getElementById('form-edit-user');

  const showAlert = (msg, type = 'success') => {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} d-block`;
    alertBox.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'} me-2"></i>${msg}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      alertBox.classList.add('d-none');
    }, 6000);
  };

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        allLoadedUsers = data.users || [];
        currentLoggedInUserId = data.currentUserId;
        renderUsers(allLoadedUsers);
        updateUserKpis(allLoadedUsers);
      } else {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">${data.message}</td></tr>`;
      }
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Erreur de connexion au serveur.</td></tr>`;
    }
  }

  function updateUserKpis(users) {
    const totalEl = document.getElementById('kpi-total-users');
    const supersEl = document.getElementById('kpi-superadmins');
    const editorsEl = document.getElementById('kpi-editors');

    if (totalEl) totalEl.textContent = users.length;
    if (supersEl) supersEl.textContent = users.filter(u => u.role === 'superadmin').length;
    if (editorsEl) editorsEl.textContent = users.filter(u => u.role !== 'superadmin').length;
  }

  function renderUsers(users) {
    if (!tableBody) return;
    if (users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Aucun administrateur trouvé.</td></tr>`;
      return;
    }

    tableBody.innerHTML = users.map(user => {
      const isCurrentUser = user.id === currentLoggedInUserId;
      const initials = (user.nom || 'AD')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const roleBadge = user.role === 'superadmin'
        ? '<span class="badge-superadmin"><i class="fa-solid fa-shield-halved me-1"></i>Superadmin</span>'
        : '<span class="badge-editor"><i class="fa-solid fa-pen-nib me-1"></i>Éditeur</span>';

      const dateStr = user.created_at
        ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Actif';

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-3">
              <div class="user-avatar-circle">${initials}</div>
              <div>
                <strong class="d-block text-dark">${user.nom}</strong>
                ${isCurrentUser ? '<span class="badge bg-light text-success border border-success small" style="font-size:0.7rem;"><i class="fa-solid fa-user-check me-1"></i>Connecté (Vous)</span>' : ''}
              </div>
            </div>
          </td>
          <td><span class="text-dark font-monospace">${user.email}</span></td>
          <td>${roleBadge}</td>
          <td><small class="text-muted">${dateStr}</small></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="window.openEditUserModal(${user.id})" title="Modifier le compte">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.deleteUserItem(${user.id}, '${user.email.replace(/'/g, "\\'")}')" title="Supprimer le compte" ${isCurrentUser ? 'disabled' : ''}>
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Recherche en direct
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      if (!q) {
        renderUsers(allLoadedUsers);
      } else {
        const filtered = allLoadedUsers.filter(u =>
          (u.nom && u.nom.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.role && u.role.toLowerCase().includes(q))
        );
        renderUsers(filtered);
      }
    });
  }

  // Création d'administrateur
  if (formCreate) {
    formCreate.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('create-user-error');
      const submitBtn = document.getElementById('btn-submit-create-user');
      if (errBox) errBox.classList.add('d-none');

      const nom = document.getElementById('add-user-name').value;
      const email = document.getElementById('add-user-email').value;
      const password = document.getElementById('add-user-password').value;
      const role = document.getElementById('add-user-role').value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Création...';

      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom, email, password, role })
        });
        const data = await res.json();

        if (data.success) {
          formCreate.reset();
          const modalEl = document.getElementById('modal-add-user');
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
          showAlert(data.message, 'success');
          loadUsers();
        } else {
          if (errBox) {
            errBox.textContent = data.message;
            errBox.classList.remove('d-none');
          }
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = 'Erreur lors de la création du compte.';
          errBox.classList.remove('d-none');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check me-1"></i> Créer le Compte';
      }
    });
  }

  // Modification d'administrateur
  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('edit-user-error');
      const submitBtn = document.getElementById('btn-submit-edit-user');
      if (errBox) errBox.classList.add('d-none');

      const userId = document.getElementById('edit-user-id').value;
      const nom = document.getElementById('edit-user-name').value;
      const email = document.getElementById('edit-user-email').value;
      const password = document.getElementById('edit-user-password').value;
      const role = document.getElementById('edit-user-role').value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Mise à jour...';

      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom, email, password, role })
        });
        const data = await res.json();

        if (data.success) {
          const modalEl = document.getElementById('modal-edit-user');
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
          showAlert(data.message, 'success');
          loadUsers();
        } else {
          if (errBox) {
            errBox.textContent = data.message;
            errBox.classList.remove('d-none');
          }
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = 'Erreur lors de la mise à jour.';
          errBox.classList.remove('d-none');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Enregistrer les Modifications';
      }
    });
  }

  // Initialiser la liste
  loadUsers();

  // Exposer les méthodes aux fenêtres modales
  window.openEditUserModal = function(userId) {
    const user = allLoadedUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.nom;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-password').value = '';
    document.getElementById('edit-user-role').value = user.role || 'editor';

    const errBox = document.getElementById('edit-user-error');
    if (errBox) errBox.classList.add('d-none');

    const modal = new bootstrap.Modal(document.getElementById('modal-edit-user'));
    modal.show();
  };

  window.deleteUserItem = async function(userId, userEmail) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte administrateur de ${userEmail} ?`)) {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showAlert(data.message, 'success');
          loadUsers();
        } else {
          showAlert(data.message, 'danger');
        }
      } catch (err) {
        showAlert('Erreur lors de la suppression du compte.', 'danger');
      }
    }
  };
}

