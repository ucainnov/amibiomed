const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Veuillez saisir votre email et mot de passe.' });
    }

    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email.trim().toLowerCase()]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    // Générer JWT (valable 24h)
    const token = jwt.sign(
      {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Définir le cookie sécurisé HttpOnly
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });

    return res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
}

function logout(req, res) {
  res.clearCookie('admin_token');
  return res.json({ success: true, message: 'Déconnexion réussie.' });
}

function getMe(req, res) {
  if (!req.admin) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }
  return res.json({ success: true, admin: req.admin });
}

module.exports = {
  login,
  logout,
  getMe
};
