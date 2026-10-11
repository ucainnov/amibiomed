const db = require('../config/db');

// Slug helper
function createSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
}

// 1. Liste des événements (Public & Admin)
async function getEvents(req, res) {
  try {
    const { statut, limit } = req.query;
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (statut && statut !== 'all') {
      params.push(statut);
      sql += ` AND statut = $${params.length}`;
    }

    sql += ' ORDER BY date_event DESC';

    if (limit) {
      params.push(parseInt(limit, 10));
      sql += ` LIMIT $${params.length}`;
    }

    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Erreur getEvents:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des événements.' });
  }
}

// 2. Détail d'un événement
async function getEventBySlugOrId(req, res) {
  try {
    const { identifier } = req.params;
    let sql = 'SELECT * FROM events WHERE slug = $1';
    if (!isNaN(identifier)) {
      sql = 'SELECT * FROM events WHERE id = $1 OR slug = $2';
      const result = await db.query(sql, [identifier, identifier]);
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
      return res.json({ success: true, data: result.rows[0] });
    }
    const result = await db.query(sql, [identifier]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Erreur getEventBySlugOrId:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

// 3. Créer un événement / activité (Admin)
async function createEvent(req, res) {
  try {
    const { titre, description, date_event, lieu, statut, type_activite, lien_action } = req.body;

    if (!titre || !description || !date_event || !lieu) {
      return res.status(400).json({ success: false, message: 'Titre, description, date et lieu sont obligatoires.' });
    }

    const slug = createSlug(titre);
    let image_cover = 'img/photos/event-congres.jpg';
    let programme_pdf = null;

    if (req.files) {
      if (req.files.image_cover && req.files.image_cover[0]) {
        image_cover = `uploads/${req.files.image_cover[0].filename}`;
      }
      if (req.files.programme_pdf && req.files.programme_pdf[0]) {
        programme_pdf = `uploads/${req.files.programme_pdf[0].filename}`;
      }
    }

    const sql = `
      INSERT INTO events (titre, slug, description, date_event, lieu, image_cover, programme_pdf, statut, type_activite, lien_action)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    const result = await db.query(sql, [
      titre.trim(),
      slug,
      description.trim(),
      date_event,
      lieu.trim(),
      image_cover,
      programme_pdf,
      statut || 'a_venir',
      type_activite ? type_activite.trim() : 'Journées Scientifiques',
      lien_action ? lien_action.trim() : 'Participez avec nous!'
    ]);

    return res.status(201).json({
      success: true,
      message: 'Activité créée avec succès',
      id: result.rows && result.rows[0] ? result.rows[0].id : null
    });
  } catch (err) {
    console.error('Erreur createEvent:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création de l’activité.' });
  }
}

// 4. Modifier un événement / activité (Admin)
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const { titre, description, date_event, lieu, statut, type_activite, lien_action } = req.body;

    const existingRes = await db.query('SELECT * FROM events WHERE id = $1', [id]);
    if (!existingRes.rows || existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activité non trouvée.' });
    }
    const current = existingRes.rows[0];

    let image_cover = current.image_cover;
    let programme_pdf = current.programme_pdf;

    if (req.files) {
      if (req.files.image_cover && req.files.image_cover[0]) {
        image_cover = `uploads/${req.files.image_cover[0].filename}`;
      }
      if (req.files.programme_pdf && req.files.programme_pdf[0]) {
        programme_pdf = `uploads/${req.files.programme_pdf[0].filename}`;
      }
    }

    const sql = `
      UPDATE events
      SET titre = $1, description = $2, date_event = $3, lieu = $4, statut = $5, image_cover = $6, programme_pdf = $7, type_activite = $8, lien_action = $9
      WHERE id = $10
    `;
    await db.query(sql, [
      titre ? titre.trim() : current.titre,
      description ? description.trim() : current.description,
      date_event || current.date_event,
      lieu ? lieu.trim() : current.lieu,
      statut || current.statut,
      image_cover,
      programme_pdf,
      type_activite ? type_activite.trim() : (current.type_activite || 'Journées Scientifiques'),
      lien_action ? lien_action.trim() : (current.lien_action || 'Participez avec nous!'),
      id
    ]);

    return res.json({ success: true, message: 'Activité mise à jour avec succès.' });
  } catch (err) {
    console.error('Erreur updateEvent:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
}

// 5. Supprimer un événement / activité (Admin)
async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM events WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Activité supprimée avec succès.' });
  } catch (err) {
    console.error('Erreur deleteEvent:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
}

// 6. Gestion des Types d'Activités (Paramétrable dans le Back-Office)
async function getActivityTypes(req, res) {
  try {
    const result = await db.query('SELECT * FROM activity_types ORDER BY id ASC');
    const items = result.rows || [];
    return res.json({ success: true, types: items, data: items });
  } catch (err) {
    console.error('Erreur getActivityTypes:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des types.' });
  }
}

async function createActivityType(req, res) {
  try {
    const { nom, icon, icone, couleur, couleur_badge, description } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom du type est obligatoire.' });
    }

    const check = await db.query('SELECT id FROM activity_types WHERE LOWER(nom) = $1', [nom.trim().toLowerCase()]);
    if (check.rows && check.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Ce type d’activité existe déjà.' });
    }

    const iconVal = icon || icone || 'fa-solid fa-calendar-check';
    const colorVal = couleur || couleur_badge || '#2D5A27';

    const sql = `
      INSERT INTO activity_types (nom, icon, couleur)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await db.query(sql, [
      nom.trim(),
      iconVal.trim(),
      colorVal.trim()
    ]);

    return res.status(201).json({
      success: true,
      message: 'Nouveau type d’activité ajouté avec succès.',
      id: result.rows && result.rows[0] ? result.rows[0].id : null
    });
  } catch (err) {
    console.error('Erreur createActivityType:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création du type d’activité.' });
  }
}

async function deleteActivityType(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM activity_types WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Type d’activité supprimé avec succès.' });
  } catch (err) {
    console.error('Erreur deleteActivityType:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
}

module.exports = {
  getEvents,
  getEventBySlugOrId,
  createEvent,
  updateEvent,
  deleteEvent,
  getActivityTypes,
  createActivityType,
  deleteActivityType
};
