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

// 3. Créer un événement (Admin)
async function createEvent(req, res) {
  try {
    const { titre, description, date_event, lieu, statut } = req.body;

    if (!titre || !description || !date_event || !lieu) {
      return res.status(400).json({ success: false, message: 'Titre, description, date et lieu sont obligatoires.' });
    }

    const slug = createSlug(titre);
    let image_cover = '/img/photos/event-congres.jpg';
    let programme_pdf = null;

    if (req.files) {
      if (req.files.image_cover && req.files.image_cover[0]) {
        image_cover = `/uploads/${req.files.image_cover[0].filename}`;
      }
      if (req.files.programme_pdf && req.files.programme_pdf[0]) {
        programme_pdf = `/uploads/${req.files.programme_pdf[0].filename}`;
      }
    }

    const sql = `
      INSERT INTO events (titre, slug, description, date_event, lieu, image_cover, programme_pdf, statut)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      statut || 'a_venir'
    ]);

    return res.status(201).json({
      success: true,
      message: 'Événement créé avec succès',
      id: result.rows && result.rows[0] ? result.rows[0].id : null
    });
  } catch (err) {
    console.error('Erreur createEvent:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création de l’événement.' });
  }
}

// 4. Modifier un événement (Admin)
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const { titre, description, date_event, lieu, statut } = req.body;

    const existingRes = await db.query('SELECT * FROM events WHERE id = $1', [id]);
    if (!existingRes.rows || existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }
    const current = existingRes.rows[0];

    let image_cover = current.image_cover;
    let programme_pdf = current.programme_pdf;

    if (req.files) {
      if (req.files.image_cover && req.files.image_cover[0]) {
        image_cover = `/uploads/${req.files.image_cover[0].filename}`;
      }
      if (req.files.programme_pdf && req.files.programme_pdf[0]) {
        programme_pdf = `/uploads/${req.files.programme_pdf[0].filename}`;
      }
    }

    const sql = `
      UPDATE events
      SET titre = $1, description = $2, date_event = $3, lieu = $4, statut = $5, image_cover = $6, programme_pdf = $7
      WHERE id = $8
    `;
    await db.query(sql, [
      titre || current.titre,
      description || current.description,
      date_event || current.date_event,
      lieu || current.lieu,
      statut || current.statut,
      image_cover,
      programme_pdf,
      id
    ]);

    return res.json({ success: true, message: 'Événement mis à jour avec succès.' });
  } catch (err) {
    console.error('Erreur updateEvent:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
}

// 5. Supprimer un événement (Admin)
async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM events WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Événement supprimé avec succès.' });
  } catch (err) {
    console.error('Erreur deleteEvent:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
}

module.exports = {
  getEvents,
  getEventBySlugOrId,
  createEvent,
  updateEvent,
  deleteEvent
};
