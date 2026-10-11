const express = require('express');
const router = express.Router();

const adhesionController = require('../controllers/adhesionController');
const eventController = require('../controllers/eventController');
const partnerController = require('../controllers/partnerController');
const contactController = require('../controllers/contactController');
const dashboardController = require('../controllers/dashboardController');
const settingsController = require('../controllers/settingsController');
const userAdminController = require('../controllers/userAdminController');

const { authenticateToken, requireSuperAdmin } = require('../middlewares/authMiddleware');
const {
  uploadAdhesionDoc,
  uploadEventFiles,
  uploadPartnerLogo,
  uploadSiteMedia
} = require('../middlewares/uploadMiddleware');

// ==========================================
// ROUTES PUBLIQUES (FRONT-OFFICE)
// ==========================================

// Paramètres & Médias publics
router.get('/settings', settingsController.getPublicSettings);

// Adhésions
router.post('/adhesions', uploadAdhesionDoc.single('justificatif'), adhesionController.createAdhesion);

// Événements & Activités
router.get('/events', eventController.getEvents);
router.get('/events/:identifier', eventController.getEventBySlugOrId);
router.get('/activities', eventController.getEvents);
router.get('/activity-types', eventController.getActivityTypes);

// Partenaires
router.get('/partners', partnerController.getPartners);

// Contact & Spam HoneyPot
router.post('/contact', contactController.createContact);


// ==========================================
// ROUTES SÉCURISÉES (BACK-OFFICE ADMIN)
// ==========================================

// Paramètres & Médias du Site
router.get('/admin/settings', authenticateToken, settingsController.getAdminSettings);
router.put('/admin/settings', authenticateToken, settingsController.updateSettings);
router.post('/admin/settings/upload-hero', authenticateToken, uploadSiteMedia.single('hero_image'), settingsController.uploadHeroImage);
router.post('/admin/settings/reset-hero', authenticateToken, settingsController.resetHeroImage);

// Gestion Multi-Comptes Administrateurs
router.get('/admin/users', authenticateToken, userAdminController.getAllUsers);
router.post('/admin/users', authenticateToken, requireSuperAdmin, userAdminController.createUser);
router.put('/admin/users/:id', authenticateToken, requireSuperAdmin, userAdminController.updateUser);
router.delete('/admin/users/:id', authenticateToken, requireSuperAdmin, userAdminController.deleteUser);

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

// Gestion des Types d'Activités (Paramétrable)
router.get('/admin/activity-types', authenticateToken, eventController.getActivityTypes);
router.post('/admin/activity-types', authenticateToken, eventController.createActivityType);
router.delete('/admin/activity-types/:id', authenticateToken, eventController.deleteActivityType);

// Gestion des Partenaires
router.post('/admin/partners', authenticateToken, uploadPartnerLogo.single('logo'), partnerController.createPartner);
router.put('/admin/partners/:id', authenticateToken, uploadPartnerLogo.single('logo'), partnerController.updatePartner);
router.delete('/admin/partners/:id', authenticateToken, partnerController.deletePartner);

// Messagerie Interne
router.get('/admin/contacts', authenticateToken, contactController.getContacts);
router.put('/admin/contacts/:id/status', authenticateToken, contactController.updateContactStatus);
router.delete('/admin/contacts/:id', authenticateToken, contactController.deleteContact);

module.exports = router;