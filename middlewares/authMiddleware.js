const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'amibiomed_secret_jwt_key_2026_securise_maroc_technologie_sante_ethique';

function authenticateToken(req, res, next) {
  let token = null;

  // Récupérer depuis les cookies (HttpOnly)
  if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // Si c'est une requête AJAX/API
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Accès non autorisé : session expirée ou inexistante.' });
    }
    // Sinon redirection vers login
    return res.redirect('/admin/login.html');
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Session invalide ou expirée.' });
      }
      return res.redirect('/admin/login.html');
    }
    req.admin = decoded;
    next();
  });
}

function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Privilèges super-administrateur requis.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  JWT_SECRET
};
