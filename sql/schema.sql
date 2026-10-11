-- ==========================================================
-- AMIBIOMED - Schéma Physique de la Base de Données
-- Association Marocaine de l'Ingénierie Biomédicale
-- Devise : Technologie • Santé • Éthique
-- ==========================================================

-- Extension pour génération d'UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table des Administrateurs (Back-Office)
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'editor' CHECK (role IN ('superadmin', 'editor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des Adhésions (Dossiers de candidature)
CREATE TABLE IF NOT EXISTS adhesions (
    id SERIAL PRIMARY KEY,
    nom_complet VARCHAR(150) NOT NULL,
    cin VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telephone VARCHAR(30) NOT NULL,
    type_membre VARCHAR(50) NOT NULL CHECK (type_membre IN ('etudiant', 'ingenieur', 'medecin', 'entreprise', 'honneur')),
    affiliation VARCHAR(200) NOT NULL,
    justificatif_path VARCHAR(255) NOT NULL,
    statut VARCHAR(30) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'validee', 'rejetee')),
    motif_rejet TEXT,
    date_soumission TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherches rapides sur les adhésions
CREATE INDEX IF NOT EXISTS idx_adhesions_statut ON adhesions(statut);
CREATE INDEX IF NOT EXISTS idx_adhesions_email ON adhesions(email);
CREATE INDEX IF NOT EXISTS idx_adhesions_cin ON adhesions(cin);

-- 3. Table des Événements & Conférences
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    date_event TIMESTAMP WITH TIME ZONE NOT NULL,
    lieu VARCHAR(150) NOT NULL,
    image_cover VARCHAR(255),
    programme_pdf VARCHAR(255),
    statut VARCHAR(30) DEFAULT 'a_venir' CHECK (statut IN ('a_venir', 'en_cours', 'realise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_statut ON events(statut);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_event);

-- 4. Table des Articles & Publications
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    extrait TEXT,
    contenu TEXT NOT NULL,
    image VARCHAR(255),
    is_published BOOLEAN DEFAULT true,
    date_publication TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des Partenaires (Institutionnels, Hospitaliers & Industriels)
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    categorie VARCHAR(50) NOT NULL CHECK (categorie IN ('academique', 'clinique', 'industriel')),
    logo_path VARCHAR(255) NOT NULL,
    site_url VARCHAR(255),
    ordre_affichage INTEGER DEFAULT 0,
    statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partners_ordre ON partners(ordre_affichage);

-- 6. Table des Messages de Contact
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    sujet VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    statut VARCHAR(30) DEFAULT 'non_lu' CHECK (statut IN ('non_lu', 'en_cours', 'traite')),
    date_envoi TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_statut ON contacts(statut);

-- 7. Table des Paramètres & Médias Configurables du Site
CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
