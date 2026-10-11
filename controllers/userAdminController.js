const bcrypt = require('bcryptjs');
const db = require('../config/db');

/**
 * Récupérer la liste de tous les comptes administrateurs
 */
async function getAllUsers(req, res) {
  try {
    const result = await db.query(
      'SELECT id, nom, email, role, created_at FROM admins ORDER BY id ASC'
    );
    return res.json({
      success: true,
      users: result.rows || [],
      currentUserId: req.admin ? req.admin.id : null
    });
  } catch (err) {
    console.error('Erreur getAllUsers:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des utilisateurs.' });
  }
}

/**
 * Créer un nouveau compte administrateur
 */
async function createUser(req, res) {
  try {
    const { nom, email, password, role } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'L’adresse e-mail est obligatoire.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Format d’adresse e-mail invalide.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    const assignedRole = role === 'superadmin' ? 'superadmin' : 'editor';

    // Vérifier unicité email
    const existing = await db.query('SELECT id FROM admins WHERE email = $1', [cleanEmail]);
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Cet e-mail est déjà associé à un compte existant.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertResult = await db.query(
      'INSERT INTO admins (nom, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [nom.trim(), cleanEmail, passwordHash, assignedRole]
    );

    return res.status(201).json({
      success: true,
      message: `Compte administrateur créé avec succès pour ${cleanEmail}.`,
      userId: insertResult.rows && insertResult.rows[0] ? insertResult.rows[0].id : null
    });
  } catch (err) {
    console.error('Erreur createUser:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création de l’utilisateur.' });
  }
}

/**
 * Mettre à jour un compte existant
 */
async function updateUser(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { nom, email, password, role } = req.body;

    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Identifiant d’administrateur invalide.' });
    }

    const userCheck = await db.query('SELECT id, role, email FROM admins WHERE id = $1', [targetId]);
    if (!userCheck.rows || userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Compte administrateur introuvable.' });
    }
    const currentTarget = userCheck.rows[0];

    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'L’adresse e-mail est obligatoire.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Vérifier unicité si changement d'email
    if (cleanEmail !== currentTarget.email.toLowerCase()) {
      const emailConflict = await db.query('SELECT id FROM admins WHERE email = $1 AND id != $2', [cleanEmail, targetId]);
      if (emailConflict.rows && emailConflict.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Cet e-mail est déjà utilisé par un autre compte.' });
      }
    }

    const assignedRole = role === 'superadmin' ? 'superadmin' : 'editor';

    // Sécurité : Vérifier qu'on ne rétrograde pas le dernier superadmin
    if (currentTarget.role === 'superadmin' && assignedRole === 'editor') {
      const superAdminsCount = await db.query("SELECT COUNT(*) as count FROM admins WHERE role = 'superadmin'");
      const count = parseInt(superAdminsCount.rows[0].count || superAdminsCount.rows[0]['count(*)'] || 0, 10);
      if (count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Action refusée : le système doit conserver au moins un Superadministrateur.'
        });
      }
    }

    // Mise à jour du mot de passe si renseigné
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Le mot de passe doit comporter au moins 6 caractères.' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      await db.query(
        'UPDATE admins SET nom = $1, email = $2, password_hash = $3, role = $4 WHERE id = $5',
        [nom.trim(), cleanEmail, passwordHash, assignedRole, targetId]
      );
    } else {
      await db.query(
        'UPDATE admins SET nom = $1, email = $2, role = $3 WHERE id = $4',
        [nom.trim(), cleanEmail, assignedRole, targetId]
      );
    }

    return res.json({
      success: true,
      message: 'Compte administrateur mis à jour avec succès.'
    });
  } catch (err) {
    console.error('Erreur updateUser:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
}

/**
 * Supprimer un compte administrateur
 */
async function deleteUser(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const requesterId = req.admin ? req.admin.id : null;

    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Identifiant invalide.' });
    }

    // Sécurité 1 : Ne peut pas se supprimer soi-même
    if (requesterId && requesterId === targetId) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte actif.'
      });
    }

    const userCheck = await db.query('SELECT id, role, email FROM admins WHERE id = $1', [targetId]);
    if (!userCheck.rows || userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Compte administrateur introuvable.' });
    }
    const targetUser = userCheck.rows[0];

    // Sécurité 2 : Ne peut pas supprimer le dernier superadmin
    if (targetUser.role === 'superadmin') {
      const superAdminsCount = await db.query("SELECT COUNT(*) as count FROM admins WHERE role = 'superadmin'");
      const count = parseInt(superAdminsCount.rows[0].count || superAdminsCount.rows[0]['count(*)'] || 0, 10);
      if (count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer le seul Superadministrateur du système.'
        });
      }
    }

    await db.query('DELETE FROM admins WHERE id = $1', [targetId]);

    return res.json({
      success: true,
      message: `Le compte administrateur de ${targetUser.email} a été supprimé avec succès.`
    });
  } catch (err) {
    console.error('Erreur deleteUser:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
