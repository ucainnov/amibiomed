# AMIBIOMED — Plateforme Web Officielle

> **Association Marocaine de l'Ingénierie Biomédicale**  
> *Devise : Technologie • Santé • Éthique*

---

## 📌 Présentation du Projet

**AMIBIOMED** est la plateforme web institutionnelle et la solution de gestion d'adhésion pour l'Association Marocaine de l’Ingénierie Biomédicale (fondée en 2017 à la Faculté de Médecine et de Pharmacie & CHU Mohammed VI de Marrakech).

La plateforme regroupe :
1. **Un Portail Front-Office Public (White & Clean Tech Style)** :
   - Page d'accueil moderne avec statistiques animées & piliers stratégiques.
   - Organigramme interactif du Bureau Exécutif (2024–Présent) et tableau d'honneur des Membres Fondateurs (2017–2024).
   - Agenda des conférences et manifestations scientifiques avec téléchargement de programmes PDF.
   - Formulaire d'adhésion en ligne avec téléversement sécurisé de pièces justificatives (PDF/Images).
   - Formulaire de contact anti-spam avec protection Honeypot.

2. **Un Espace Back-Office Administration (`/admin`)** :
   - Connexion sécurisée JWT avec hachage de mot de passe `bcryptjs`.
   - Dashboard avec indicateurs KPI en temps réel.
   - Modération et validation des demandes d'adhésion.
   - Exportation de la liste des adhérents au format CSV.
   - Gestion des conférences (ajout/modification/suppression, affiches & programmes PDF).
   - Répertoire des partenaires institutionnels (académiques, cliniques & industriels).

---

## 📁 Organisation & Structure du Projet

```
amibiomed/
├── config/                  # Configuration base de données & expédition e-mails
│   ├── db.js                # Support hybride PostgreSQL & SQLite fallback (better-sqlite3)
│   └── mailer.js            # Service de notifications e-mail (Nodemailer)
├── controllers/             # Contrôleurs de la logique métier API
│   ├── adhesionController.js
│   ├── authController.js
│   ├── contactController.js
│   ├── dashboardController.js
│   ├── eventController.js
│   └── partnerController.js
├── data/                    # Stockage de la base SQLite locale
│   └── amibiomed.sqlite
├── docs/                    # Documents de référence & archives
│   ├── intro.html
│   ├── organigramme.png
│   ├── logo-amibiomed.png
│   └── logo-preview.png
├── middlewares/             # Middlewares Express
│   ├── authMiddleware.js    # Vérification JWT Back-Office
│   └── uploadMiddleware.js  # Filtrage & stockage Multer (pièces justificatives/PDF)
├── public/                  # Assets & pages HTML Front-Office / Back-Office
│   ├── admin/               # Espace Back-Office Admin
│   │   ├── adhesions-list.html
│   │   ├── dashboard.html
│   │   ├── events-manage.html
│   │   └── login.html
│   ├── css/                 # Design System CSS
│   │   ├── style.css        # Style principal Front-Office (Header Pilule, Glassmorphism, ECG)
│   │   └── admin.css        # Style Back-Office Admin
│   ├── img/                 # Logos, photos, partenaires, équipe
│   │   ├── logo/
│   │   ├── partners/
│   │   ├── photos/
│   │   └── team/
│   ├── js/                  # Scripts JavaScript interactifs
│   │   ├── main.js          # Navigation, header dynamique, compteurs, formulaires
│   │   └── admin.js         # Logique d'administration & appels API sécurisés
│   ├── uploads/             # Stockage des fichiers téléversés
│   ├── about.html           # À Propos & Organigramme
│   ├── adhesion.html        # Formulaire d'Adhésion en ligne
│   ├── contact.html         # Contact & Partenariat
│   ├── events.html          # Événements & Conférences
│   └── index.html           # Page d'Accueil
├── routes/                  # Définition des routes Express
│   ├── apiRoutes.js         # Endpoints REST publics & protégés
│   └── authRoutes.js        # Endpoints d'authentification Back-Office
├── sql/                     # Schémas SQL d'initialisation
│   └── schema.sql
├── .env                     # Variables d'environnement (PORT, JWT_SECRET, DB_*)
├── .gitignore               # Exclusions de versionnement Git
├── package.json             # Dépendances & scripts NPM
└── server.js                # Point d'entrée principal Node.js / Express
```

---

## 🚀 Installation & Démarrage

### 1. Prérequis
- **Node.js** (v18 ou supérieur)
- **NPM** (v9 ou supérieur)

### 2. Installation des dépendances
```bash
npm install
```

### 3. Lancement en Mode Développement
```bash
npm run dev
```

Le serveur sera accessible sur :
- **Front-Office** : [http://localhost:3000](http://localhost:3000)
- **Back-Office Admin** : [http://localhost:3000/admin](http://localhost:3000/admin)

### 4. Accès Administrateur par défaut
- **Identifiant** : `admin@amibiomed.ma`
- **Mot de passe** : `Amibiomed@2026!`

---

## 🛡️ Sécurité & Bonnes Pratiques

- **Helmet.js** : En-têtes HTTP sécurisés avec Content Security Policy (CSP) assouplie pour CDNs & Google Fonts.
- **Express Rate Limit** : Limiteur de requêtes contre les attaques par force brute (300 req / 15 min par IP).
- **Honeypot Anti-Spam** : Détection silencieuse des bots sur le formulaire de contact sans gêner l'expérience utilisateur.
- **Téléversement Sécurisé** : Restriction des types MIME (PDF, PNG, JPG, WEBP) et limite de taille à 5 Mo par fichier.
