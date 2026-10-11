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
