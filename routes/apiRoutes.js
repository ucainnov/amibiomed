const express = require('express');
const router = express.Router();

const adhesionController = require('../controllers/adhesionController');
const eventController = require('../controllers/eventController');
const partnerController = require('../controllers/partnerController');
const contactController = require('../controllers/contactController');
const dashboardController = require('../controllers/dashboardController');

const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  uploadAdhesionDoc,
  uploadEventFiles,
  uploadPartnerLogo
} = require('../middlewares/uploadMiddleware');

// ==========================================
// ROUTES PUBLIQUES (FRONT-OFFICE)
// ==========================================

// Adhésions
router.post('/adhesions', uploadAdhesionDoc.single('justificatif'), adhesionController.createAdhesion);

// Événements
router.get('/events', eventController.getEvents);
router.get('/events/:identifier', eventController.getEventBySlugOrId);

// Partenaires
router.get('/partners', partnerController.getPartners);

// Contact & Spam HoneyPot
router.post('/contact', contactController.createContact);


// ==========================================
// ROUTES SÉCURISÉES (BACK-OFFICE ADMIN)
// ==========================================

// Dashboard KPI
router.get('/admin/dashboard', authenticateToken, dashboardController.getStats);

// Modération des adhésions
router.get('/admin/adhesions', authenticateToken, adhesionController.getAllAdhesions);
router.get('/admin/adhesions/export', authenticateToken, adhesionController.exportCsv);
router.get('/admin/adhesions/:id', authenticateToken, adhesionController.getAdhesionById);
router.put('/admin/adhesions/:id/status', authenticateToken, adhesionController.updateStatus);

// Gestion des Événements
router.post(
  '/admin/events',
  authenticateToken,
  uploadEventFiles.fields([
    { name: 'image_cover', maxCount: 1 },
    { name: 'programme_pdf', maxCount: 1 }
  ]),
  eventController.createEvent
);
router.put(
  '/admin/events/:id',
  authenticateToken,
  uploadEventFiles.fields([
    { name: 'image_cover', maxCount: 1 },
    { name: 'programme_pdf', maxCount: 1 }
  ]),
  eventController.updateEvent
);
router.delete('/admin/events/:id', authenticateToken, eventController.deleteEvent);

// Gestion des Partenaires
router.post('/admin/partners', authenticateToken, uploadPartnerLogo.single('logo'), partnerController.createPartner);
router.put('/admin/partners/:id', authenticateToken, uploadPartnerLogo.single('logo'), partnerController.updatePartner);
router.delete('/admin/partners/:id', authenticateToken, partnerController.deletePartner);

// Messagerie Interne
router.get('/admin/contacts', authenticateToken, contactController.getContacts);
router.put('/admin/contacts/:id/status', authenticateToken, contactController.updateContactStatus);
router.delete('/admin/contacts/:id', authenticateToken, contactController.deleteContact);

module.exports = router;