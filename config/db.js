const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let dbType = 'pg'; // 'pg' ou 'sqlite'
let pool = null;
let sqliteDb = null;

const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'amibiomed_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function initDatabase() {
  // Test connection PostgreSQL
  try {
    const testPool = new Pool(pgConfig);
    const client = await testPool.connect();
    client.release();
    pool = testPool;
    dbType = 'pg';
    console.log('✅ [Database] Connecté avec succès à PostgreSQL (' + pgConfig.database + ')');
    await setupSchemaPg();
    await seedInitialData();
    return;
  } catch (err) {
    console.warn('⚠️ [Database] Connexion directe à PostgreSQL a échoué (' + err.message + '). Tentative de création ou fallback SQLite...');
    
    // Essayer de se connecter à la base 'postgres' par défaut pour créer 'amibiomed_db' si manquante
    try {
      const adminPool = new Pool({ ...pgConfig, database: 'postgres' });
      const client = await adminPool.connect();
      const checkRes = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [pgConfig.database]);
      if (checkRes.rowCount === 0) {
        console.log(`ℹ️ [Database] Création de la base de données ${pgConfig.database}...`);
        await client.query(`CREATE DATABASE "${pgConfig.database}"`);
      }
      client.release();
      await adminPool.end();

      pool = new Pool(pgConfig);
      dbType = 'pg';
      console.log('✅ [Database] Base créée et connectée avec succès à PostgreSQL');
      await setupSchemaPg();
      await seedInitialData();
      return;
    } catch (pgError) {
      console.warn('⚠️ [Database] Impossible d’initialiser PostgreSQL (' + pgError.message + '). Activation du moteur SQLite autonome intégré pour un fonctionnement immédiat.');
    }
  }

  // Fallback SQLite autonome
  try {
    const Database = require('better-sqlite3');
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'amibiomed.sqlite');
    sqliteDb = new Database(dbPath);
    dbType = 'sqlite';
    console.log('✅ [Database] Connecté au moteur local SQLite (' + dbPath + ')');
    setupSchemaSqlite();
    await seedInitialData();
  } catch (sqliteErr) {
    console.error('❌ [Database] Erreur critique lors de l’initialisation de SQLite :', sqliteErr);
  }
}

async function setupSchemaPg() {
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('✅ [Database] Schéma PostgreSQL appliqué avec succès');
  }
}

function setupSchemaSqlite() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS adhesions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom_complet TEXT NOT NULL,
      cin TEXT NOT NULL,
      email TEXT NOT NULL,
      telephone TEXT NOT NULL,
      type_membre TEXT NOT NULL,
      affiliation TEXT NOT NULL,
      justificatif_path TEXT NOT NULL,
      statut TEXT DEFAULT 'en_attente',
      motif_rejet TEXT,
      date_soumission DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      date_event DATETIME NOT NULL,
      lieu TEXT NOT NULL,
      image_cover TEXT,
      programme_pdf TEXT,
      statut TEXT DEFAULT 'a_venir',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      extrait TEXT,
      contenu TEXT NOT NULL,
      image TEXT,
      is_published INTEGER DEFAULT 1,
      date_publication DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      categorie TEXT NOT NULL,
      logo_path TEXT NOT NULL,
      site_url TEXT,
      ordre_affichage INTEGER DEFAULT 0,
      statut TEXT DEFAULT 'actif',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom_complet TEXT NOT NULL,
      email TEXT NOT NULL,
      sujet TEXT NOT NULL,
      message TEXT NOT NULL,
      statut TEXT DEFAULT 'non_lu',
      date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ [Database] Schéma SQLite appliqué avec succès');
}

async function seedInitialData() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@amibiomed.ma';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Amibiomed@2026!';
  const adminName = process.env.DEFAULT_ADMIN_NAME || 'Présidence AMIBIOMED';

  const existingAdmin = await query('SELECT * FROM admins WHERE email = $1', [adminEmail]);
  if (!existingAdmin.rows || existingAdmin.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);
    await query(
      'INSERT INTO admins (nom, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [adminName, adminEmail, hash, 'superadmin']
    );
    console.log(`🔑 [Database] Compte Superadmin initial créé : ${adminEmail} (Mot de passe: ${adminPassword})`);
  }

  // Seed events si vide
  const eventsCount = await query('SELECT COUNT(*) as count FROM events');
  const countEv = parseInt(eventsCount.rows[0].count || eventsCount.rows[0]['count(*)'] || 0, 10);
  if (countEv === 0) {
    const events = [
      {
        titre: "Congrès National d'Ingénierie Biomédicale 2026",
        slug: "congres-national-ingenierie-biomedicale-2026",
        description: "Rassemblement scientifique majeur des ingénieurs biomédicaux, cliniciens et décideurs de santé autour du thème : L'Intelligence Artificielle et la Souveraineté Sanitaire au Maroc.",
        date_event: "2026-11-14 09:00:00",
        lieu: "Faculté de Médecine et de Pharmacie, Marrakech",
        image_cover: "/img/photos/event-congres.jpg",
        programme_pdf: "/uploads/programme_congres_2026.pdf",
        statut: "a_venir"
      },
      {
        titre: "Journée d'Étude : Maintenance & Sécurité des Plateaux d'Imagerie",
        slug: "journee-etude-maintenance-securite-imagerie",
        description: "Séminaire technique et réglementaire dédié à la radioprotection, aux protocoles de maintenance préventive des IRM et Scanners et à la conformité hospitalière.",
        date_event: "2026-06-20 10:00:00",
        lieu: "Centre Hospitalier Universitaire (CHU) Mohammed VI, Marrakech",
        image_cover: "/img/photos/event-imagerie.jpg",
        programme_pdf: "/uploads/programme_imagerie.pdf",
        statut: "a_venir"
      },
      {
        titre: "Atelier Pratique : Évaluation & Achat des Dispositifs Médicaux",
        slug: "atelier-pratique-evaluation-achat-dm",
        description: "Formation certifiante et échanges clinico-techniques sur les grilles de sélection multicritères des équipements biomédicaux en milieu hospitalier.",
        date_event: "2025-12-05 14:00:00",
        lieu: "Université Cadi Ayyad, Marrakech",
        image_cover: "/img/photos/event-formation.jpg",
        programme_pdf: "/uploads/programme_dm.pdf",
        statut: "realise"
      }
    ];

    for (const ev of events) {
      await query(
        `INSERT INTO events (titre, slug, description, date_event, lieu, image_cover, programme_pdf, statut)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [ev.titre, ev.slug, ev.description, ev.date_event, ev.lieu, ev.image_cover, ev.programme_pdf, ev.statut]
      );
    }
    console.log('📅 [Database] Événements initiaux insérés avec succès');
  }

  // Seed partners si vide
  const partnersCount = await query('SELECT COUNT(*) as count FROM partners');
  const countPart = parseInt(partnersCount.rows[0].count || partnersCount.rows[0]['count(*)'] || 0, 10);
  if (countPart === 0) {
    const partners = [
      {
        nom: "Université Cadi Ayyad de Marrakech",
        categorie: "academique",
        logo_path: "/img/partners/uca.png",
        site_url: "https://www.uca.ma",
        ordre_affichage: 1
      },
      {
        nom: "Faculté de Médecine et de Pharmacie de Marrakech",
        categorie: "academique",
        logo_path: "/img/partners/fmpm.png",
        site_url: "https://fmpm.uca.ma",
        ordre_affichage: 2
      },
      {
        nom: "CHU Mohammed VI Marrakech",
        categorie: "clinique",
        logo_path: "/img/partners/chu.png",
        site_url: "http://www.chumarrakech.ma",
        ordre_affichage: 3
      },
      {
        nom: "Société Marocaine de Technologie Médicale",
        categorie: "industriel",
        logo_path: "/img/partners/smtm.png",
        site_url: "https://amibiomed.ma",
        ordre_affichage: 4
      }
    ];

    for (const p of partners) {
      await query(
        `INSERT INTO partners (nom, categorie, logo_path, site_url, ordre_affichage, statut)
         VALUES ($1, $2, $3, $4, $5, 'actif')`,
        [p.nom, p.categorie, p.logo_path, p.site_url, p.ordre_affichage]
      );
    }
    console.log('🤝 [Database] Partenaires initiaux insérés avec succès');
  }

  // Seed site_settings si vide
  try {
    const settingsCount = await query('SELECT COUNT(*) as count FROM site_settings');
    const countSet = parseInt(settingsCount.rows[0].count || settingsCount.rows[0]['count(*)'] || 0, 10);
    if (countSet === 0) {
      const defaultSettings = [
        { key: 'hero_image', value: 'img/photos/hero-biomedical.jpg', description: 'Image principale du bloc héroïque (accueil)' },
        { key: 'hero_badge_1_title', value: 'Excellence Clinique', description: 'Titre badge haut droit' },
        { key: 'hero_badge_1_subtitle', value: 'Normes & Éthique Médicale', description: 'Sous-titre badge haut droit' },
        { key: 'hero_badge_2_title', value: 'CHU & Université', description: 'Titre badge bas gauche' },
        { key: 'hero_badge_2_subtitle', value: 'Partenaires Fondateurs', description: 'Sous-titre badge bas gauche' },
        { key: 'about_image', value: 'img/photos/hero-biomedical.jpg', description: 'Image de la page à propos' }
      ];

      for (const s of defaultSettings) {
        await query(
          'INSERT INTO site_settings (key, value, description) VALUES ($1, $2, $3)',
          [s.key, s.value, s.description]
        );
      }
      console.log('⚙️ [Database] Paramètres et médias initiaux configurés avec succès');
    }
  } catch (errSettings) {
    console.warn('⚠️ [Database] Impossible d’initialiser les paramètres par défaut:', errSettings.message);
  }
}

/**
 * Fonction unifiée pour exécuter des requêtes SQL
 * Convertit automatiquement les placeholders $1, $2 en ? si SQLite est actif
 */
async function query(sql, params = []) {
  if (dbType === 'pg') {
    return await pool.query(sql, params);
  }

  // SQLite adapter
  let sqliteSql = sql;
  // Remplacer $1, $2 par ?
  sqliteSql = sqliteSql.replace(/\$(\d+)/g, '?');

  // Gérer RETURNING id
  const hasReturning = /RETURNING\s+id/i.test(sqliteSql);
  if (hasReturning) {
    sqliteSql = sqliteSql.replace(/RETURNING\s+id/i, '').trim();
  }

  const isSelect = /^\s*SELECT/i.test(sqliteSql);
  try {
    const stmt = sqliteDb.prepare(sqliteSql);
    if (isSelect) {
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const info = stmt.run(...params);
      return {
        rows: hasReturning ? [{ id: info.lastInsertRowid }] : [],
        rowCount: info.changes,
        lastInsertRowid: info.lastInsertRowid
      };
    }
  } catch (err) {
    console.error(`Erreur SQL (${sqliteSql}):`, err.message);
    throw err;
  }
}

module.exports = {
  query,
  initDatabase,
  getDbType: () => dbType,
  getPool: () => pool
};
