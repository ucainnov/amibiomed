const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Sécurité Helmet avec configuration assouplie pour ressources FontAwesome, images local/remote et CDN
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// 2. CORS & Cookie Parser
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Limiteur de requêtes (Rate Limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limite chaque IP à 300 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes envoyées depuis cette adresse IP. Veuillez réessayer plus tard.' }
});
app.use('/api/', limiter);

// 4. Servir les fichiers statiques (Front-Office & Back-Office Assets)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  extensions: ['html', 'htm']
}));

// Servir spécifiquement le dossier d'uploads de manière sécurisée
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// 5. Enregistrement des Routes API
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// 6. Gestion des pages HTML par défaut ou 404
app.get('/admin', (req, res) => {
  res.redirect('/admin/login.html');
});

// Fallback pour les routes non trouvées (404 Page)
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'Ressource introuvable' });
  }
});

// 7. Initialisation de la base de données et démarrage du serveur Express
async function startServer() {
  await db.initDatabase();
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`🚀 [AMIBIOMED] Serveur Web démarré sur : http://localhost:${PORT}`);
    console.log(`📌 Front-Office : http://localhost:${PORT}`);
    console.log(`🔐 Back-Office  : http://localhost:${PORT}/admin/login.html`);
    console.log(`========================================================`);
  });
}

startServer();
