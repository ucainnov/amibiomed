const db = require('../config/db');

// 1. Obtenir les partenaires (Public & Admin)
async function getPartners(req, res) {
  try {
    const { statut } = req.query;
    let sql = 'SELECT * FROM partners WHERE 1=1';
    const params = [];

    if (statut && statut !== 'all') {
      params.push(statut);
      sql += ` AND statut = $${params.length}`;
    }

    sql += ' ORDER BY ordre_affichage ASC, id ASC';

    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Erreur getPartners:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des partenaires.' });
  }
}

// 2. Créer un partenaire (Admin)
async function createPartner(req, res) {
  try {
    const { nom, categorie, site_url, ordre_affichage, statut } = req.body;

    if (!nom || !categorie) {
      return res.status(400).json({ success: false, message: 'Nom et catégorie sont obligatoires.' });
    }

    let logo_path = '/img/partners/default-partner.png';
    if (req.file) {
      logo_path = `/img/partners/${req.file.filename}`;
    }

    const sql = `
      INSERT INTO partners (nom, categorie, logo_path, site_url, ordre_affichage, statut)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await db.query(sql, [
      nom.trim(),
      categorie.trim(),
      logo_path,
      site_url ? site_url.trim() : null,
      parseInt(ordre_affichage, 10) || 0,
      statut || 'actif'
    ]);

    return res.status(201).json({
      success: true,
      message: 'Partenaire ajouté avec succès',
      id: result.rows && result.rows[0] ? result.rows[0].id : null
    });
  } catch (err) {
    console.error('Erreur createPartner:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création du partenaire.' });
  }
}

// 3. Mettre à jour un partenaire (Admin)
async function updatePartner(req, res) {
  try {
    const { id } = req.params;
    const { nom, categorie, site_url, ordre_affichage, statut } = req.body;

    const exist = await db.query('SELECT * FROM partners WHERE id = $1', [id]);
    if (!exist.rows || exist.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Partenaire non trouvé.' });
    }
    const current = exist.rows[0];

    let logo_path = current.logo_path;
    if (req.file) {
      logo_path = `/img/partners/${req.file.filename}`;
    }

    const sql = `
      UPDATE partners
      SET nom = $1, categorie = $2, logo_path = $3, site_url = $4, ordre_affichage = $5, statut = $6
      WHERE id = $7
    `;
    await db.query(sql, [
      nom || current.nom,
      categorie || current.categorie,
      logo_path,
      site_url !== undefined ? site_url : current.site_url,
      ordre_affichage !== undefined ? parseInt(ordre_affichage, 10) : current.ordre_affichage,
      statut || current.statut,
      id
    ]);

    return res.json({ success: true, message: 'Partenaire mis à jour avec succès.' });
  } catch (err) {
    console.error('Erreur updatePartner:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
}

// 4. Supprimer un partenaire (Admin)
async function deletePartner(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM partners WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Partenaire supprimé avec succès.' });
  } catch (err) {
    console.error('Erreur deletePartner:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
}

module.exports = {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner
};
