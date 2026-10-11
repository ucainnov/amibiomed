const db = require('../config/db');

/**
 * Récupérer tous les paramètres publics du site
 */
async function getPublicSettings(req, res) {
  try {
    const result = await db.query('SELECT key, value FROM site_settings');
    const settings = {};
    if (result.rows) {
      result.rows.forEach(r => {
        settings[r.key] = r.value;
      });
    }

    // Valeurs de secours par défaut si non définies
    if (!settings.hero_image) settings.hero_image = 'img/photos/hero-biomedical.jpg';
    if (!settings.hero_badge_1_title) settings.hero_badge_1_title = 'Excellence Clinique';
    if (!settings.hero_badge_1_subtitle) settings.hero_badge_1_subtitle = 'Normes & Éthique Médicale';
    if (!settings.hero_badge_2_title) settings.hero_badge_2_title = 'CHU & Université';
    if (!settings.hero_badge_2_subtitle) settings.hero_badge_2_subtitle = 'Partenaires Fondateurs';
    if (!settings.about_image) settings.about_image = 'img/photos/hero-biomedical.jpg';

    return res.json({ success: true, settings });
  } catch (err) {
    console.error('Erreur getPublicSettings:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paramètres.' });
  }
}

/**
 * Récupérer les paramètres détaillés pour le Back-Office
 */
async function getAdminSettings(req, res) {
  try {
    const result = await db.query('SELECT key, value, description, updated_at FROM site_settings ORDER BY key ASC');
    const settings = {};
    if (result.rows) {
      result.rows.forEach(r => {
        settings[r.key] = r.value;
      });
    }

    return res.json({
      success: true,
      settings,
      items: result.rows || []
    });
  } catch (err) {
    console.error('Erreur getAdminSettings:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

/**
 * Mettre à jour des paramètres textuels (badges, titres, etc.)
 */
async function updateSettings(req, res) {
  try {
    const updates = req.body; // { hero_badge_1_title: '...', ... }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, message: 'Données invalides fournies.' });
    }

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string') {
        const existing = await db.query('SELECT key FROM site_settings WHERE key = $1', [key]);
        if (existing.rows && existing.rows.length > 0) {
          await db.query(
            'UPDATE site_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
            [value.trim(), key]
          );
        } else {
          await db.query(
            'INSERT INTO site_settings (key, value, description) VALUES ($1, $2, $3)',
            [key, value.trim(), 'Paramètre personnalisé']
          );
        }
      }
    }

    return res.json({ success: true, message: 'Paramètres mis à jour avec succès.' });
  } catch (err) {
    console.error('Erreur updateSettings:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des paramètres.' });
  }
}

/**
 * Téléverser et mettre à jour l'image Hero principale
 */
async function uploadHeroImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier image fourni.' });
    }

    const relativePath = `uploads/${req.file.filename}`;

    const existing = await db.query('SELECT key FROM site_settings WHERE key = $1', ['hero_image']);
    if (existing.rows && existing.rows.length > 0) {
      await db.query(
        'UPDATE site_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
        [relativePath, 'hero_image']
      );
    } else {
      await db.query(
        'INSERT INTO site_settings (key, value, description) VALUES ($1, $2, $3)',
        ['hero_image', relativePath, 'Image principale du bloc héroïque (accueil)']
      );
    }

    return res.json({
      success: true,
      message: 'Nouvelle image héroïque enregistrée et appliquée sur le site avec succès.',
      hero_image: relativePath
    });
  } catch (err) {
    console.error('Erreur uploadHeroImage:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de l’enregistrement de l’image.' });
  }
}

/**
 * Réinitialiser l'image Hero à l'image originale par défaut
 */
async function resetHeroImage(req, res) {
  try {
    const defaultHero = 'img/photos/hero-biomedical.jpg';
    await db.query(
      'UPDATE site_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
      [defaultHero, 'hero_image']
    );

    return res.json({
      success: true,
      message: 'Image d’origine réinitialisée avec succès.',
      hero_image: defaultHero
    });
  } catch (err) {
    console.error('Erreur resetHeroImage:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation.' });
  }
}

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateSettings,
  uploadHeroImage,
  resetHeroImage
};
