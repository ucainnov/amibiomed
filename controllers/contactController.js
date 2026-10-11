const db = require('../config/db');
const { sendEmail } = require('../config/mailer');

// 1. Envoyer un message depuis le site public
async function createContact(req, res) {
  try {
    const { nom_complet, email, sujet, message, honeypot } = req.body;

    // Protection anti-spam honeypot
    if (honeypot && honeypot.trim() !== '') {
      // Spam robot détecté
      return res.status(200).json({ success: true, message: 'Message reçu.' });
    }

    if (!nom_complet || !email || !sujet || !message) {
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
    }

    const sql = `
      INSERT INTO contacts (nom_complet, email, sujet, message, statut)
      VALUES ($1, $2, $3, $4, 'non_lu')
      RETURNING id
    `;
    const result = await db.query(sql, [
      nom_complet.trim(),
      email.trim().toLowerCase(),
      sujet.trim(),
      message.trim()
    ]);

    const msgId = result.rows && result.rows[0] ? result.rows[0].id : null;

    // Envoi de notification par email à AMIBIOMED
    const emailAdminSubject = `[AMIBIOMED Contact] ${sujet} - de ${nom_complet}`;
    const emailAdminHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2428; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="background-color: #1F2428; padding: 15px 20px; border-bottom: 3px solid #0074BC;">
          <h3 style="color: #FFFFFF; margin: 0;">Nouveau Message reçu sur le Portail AMIBIOMED</h3>
        </div>
        <div style="padding: 20px;">
          <p><strong>Expéditeur :</strong> ${nom_complet} (&lt;${email}&gt;)</p>
          <p><strong>Objet :</strong> ${sujet}</p>
          <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 15px 0;">
          <p><strong>Message :</strong></p>
          <div style="background: #F8F9FA; padding: 15px; border-radius: 6px; white-space: pre-line;">${message}</div>
        </div>
      </div>
    `;

    sendEmail({
      to: process.env.CONTACT_RECEIVER || 'amibiomed.contact@gmail.com',
      subject: emailAdminSubject,
      html: emailAdminHtml,
      text: `Message de ${nom_complet} (${email}):\n${message}`
    }).catch(e => console.error(e));

    return res.status(201).json({
      success: true,
      message: 'Votre message a été transmis avec succès au secrétariat d’AMIBIOMED.',
      id: msgId
    });
  } catch (err) {
    console.error('Erreur createContact:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de l’envoi de votre message.' });
  }
}

// 2. Liste des messages (Admin)
async function getContacts(req, res) {
  try {
    const { statut } = req.query;
    let sql = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];

    if (statut && statut !== 'all') {
      params.push(statut);
      sql += ` AND statut = $${params.length}`;
    }

    sql += ' ORDER BY date_envoi DESC';

    const result = await db.query(sql, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Erreur getContacts:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

// 3. Mettre à jour le statut du message (Admin)
async function updateContactStatus(req, res) {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!['non_lu', 'en_cours', 'traite'].includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }

    await db.query('UPDATE contacts SET statut = $1 WHERE id = $2', [statut, id]);
    return res.json({ success: true, message: 'Statut du message actualisé.' });
  } catch (err) {
    console.error('Erreur updateContactStatus:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

// 4. Supprimer un message
async function deleteContact(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM contacts WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Message supprimé.' });
  } catch (err) {
    console.error('Erreur deleteContact:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

module.exports = {
  createContact,
  getContacts,
  updateContactStatus,
  deleteContact
};
