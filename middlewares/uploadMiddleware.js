const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// S'assurer que les répertoires d'upload existent
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const partnersDir = path.join(__dirname, '..', 'public', 'img', 'partners');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(partnersDir)) {
  fs.mkdirSync(partnersDir, { recursive: true });
}

// Configuration stockage pour les pièces justificatives d'adhésion et affiches
const storageAdhesions = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `doc_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// Configuration stockage pour les logos partenaires
const storagePartners = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, partnersDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = `partner_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
    cb(null, cleanName);
  }
});

// Filtre MIME type strict (PDF, JPG, JPEG, PNG, WEBP)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non autorisé. Formats acceptés : PDF, JPG, PNG, WEBP.'), false);
  }
};

// Upload pour adhésion (max 5 Mo)
const uploadAdhesionDoc = multer({
  storage: storageAdhesions,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Upload pour événements (affiche + PDF programme)
const uploadEventFiles = multer({
  storage: storageAdhesions,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Upload pour logo partenaire
const uploadPartnerLogo = multer({
  storage: storagePartners,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }
});

module.exports = {
  uploadAdhesionDoc,
  uploadEventFiles,
  uploadPartnerLogo
};
