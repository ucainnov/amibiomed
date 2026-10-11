const db = require('../config/db');
const { sendEmail } = require('../config/mailer');

// 1. Création d'une demande d'adhésion (Public)
async function createAdhesion(req, res) {
  try {
    const { nom_complet, cin, email, telephone, type_membre, affiliation, charte_accept } = req.body;

    // Validation des champs obligatoires
    if (!nom_complet || !cin || !email || !telephone || !type_membre || !affiliation) {
      return res.status(400).json({ success: false, message: 'Tous les champs obligatoires doivent être renseignés.' });
    }

    if (charte_accept !== 'true' && charte_accept !== true && charte_accept !== 'on') {
      return res.status(400).json({ success: false, message: 'Vous devez accepter la charte éthique et la politique de traitement des données.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'La pièce justificative (diplôme, carte étudiante ou attestation) est obligatoire.' });
    }

    const justificatif_path = `/uploads/${req.file.filename}`;

    const insertSql = `
      INSERT INTO adhesions (nom_complet, cin, email, telephone, type_membre, affiliation, justificatif_path, statut)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente')
      RETURNING id
    `;
    const result = await db.query(insertSql, [
      nom_complet.trim(),
      cin.trim().toUpperCase(),
      email.trim().toLowerCase(),
      telephone.trim(),
      type_membre.trim(),
      affiliation.trim(),
      justificatif_path
    ]);

    const newId = result.rows && result.rows.length > 0 ? result.rows[0].id : null;

    // Email de confirmation à l'adhérent
    const applicantSubject = "AMIBIOMED - Réception de votre demande d'adhésion";
    const applicantHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2428; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1F2428; padding: 20px; text-align: center; border-bottom: 4px solid #4AA438;">
          <h2 style="color: #FFFFFF; margin: 0; font-size: 20px;">AMIBIOMED</h2>
          <p style="color: #4AA438; margin: 5px 0 0; font-size: 13px; font-weight: bold;">Technologie • Santé • Éthique</p>
        </div>
        <div style="padding: 25px;">
          <h3 style="color: #0074BC; margin-top: 0;">Bonjour ${nom_complet},</h3>
          <p>Nous avons bien reçu votre demande d'adhésion à l'<strong>Association Marocaine de l'Ingénierie Biomédicale</strong> (AMIBIOMED).</p>
          <div style="background: #F8F9FA; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0074BC;">
            <p style="margin: 0 0 8px;"><strong>Numéro de dossier :</strong> #ADH-${newId || 'REF'}</p>
            <p style="margin: 0 0 8px;"><strong>Catégorie :</strong> ${type_membre.toUpperCase()}</p>
            <p style="margin: 0 0 8px;"><strong>Affiliation :</strong> ${affiliation}</p>
            <p style="margin: 0;"><strong>Statut :</strong> <span style="color: #E22637; font-weight: bold;">En cours d'examen</span></p>
          </div>
          <p>La commission d'adhésion de l'association examine actuellement vos pièces justificatives. Vous recevrez une notification par e-mail dès validation de votre dossier.</p>
          <p style="margin-top: 30px; font-size: 13px; color: #64748B;">Pour toute question, contactez-nous à : <a href="mailto:amibiomed.contact@gmail.com" style="color: #0074BC;">amibiomed.contact@gmail.com</a></p>
        </div>
        <div style="background: #F1F5F9; padding: 12px; text-align: center; font-size: 12px; color: #64748B;">
          &copy; 2026 AMIBIOMED - Association Marocaine de l'Ingénierie Biomédicale. Tous droits réservés.
        </div>
      </div>
    `;

    sendEmail({
      to: email,
      subject: applicantSubject,
      html: applicantHtml,
      text: `Bonjour ${nom_complet}, votre demande d'adhésion à AMIBIOMED a bien été reçue et est en cours d'examen.`
    }).catch(e => console.error(e));

    // Email alerte aux administrateurs
    const adminNotificationEmail = process.env.CONTACT_RECEIVER || 'qcmuca@gmail.com';
    const adminNotificationCC = process.env.CONTACT_CC || 'amibiomed.contact@gmail.com';

    sendEmail({
      to: adminNotificationEmail,
      cc: adminNotificationCC,
      subject: `[Nouvelle Adhésion] Dossier #${newId} - ${nom_complet}`,
      html: `<p>Une nouvelle demande d'adhésion a été soumise par <strong>${nom_complet}</strong> (${type_membre}, ${affiliation}). Veuillez vous connecter au Back-Office pour la traiter.</p>`,
      text: `Nouvelle demande d'adhésion par ${nom_complet}`
    }).catch(e => console.error(e));

    return res.status(201).json({
      success: true,
      message: 'Votre demande d’adhésion a été enregistrée avec succès. Un e-mail d’accusé de réception vous a été envoyé.',
      adhesionId: newId
    });
  } catch (err) {
    console.error('Erreur createAdhesion:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de l’enregistrement de votre candidature.' });
  }
}

// 2. Récupérer la liste des adhésions (Admin avec recherche et filtres)
async function getAllAdhesions(req, res) {
  try {
    const { statut, search } = req.query;
    let querySql = 'SELECT * FROM adhesions WHERE 1=1';
    const params = [];

    if (statut && statut !== 'all') {
      params.push(statut);
      querySql += ` AND statut = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      querySql += ` AND (LOWER(nom_complet) LIKE $${params.length} OR LOWER(cin) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(affiliation) LIKE $${params.length})`;
    }

    querySql += ' ORDER BY date_soumission DESC';

    const result = await db.query(querySql, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Erreur getAllAdhesions:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des adhésions.' });
  }
}

// 3. Récupérer une adhésion par ID
async function getAdhesionById(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM adhesions WHERE id = $1', [id]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dossier d’adhésion introuvable.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Erreur getAdhesionById:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

// 4. Mettre à jour le statut d'une adhésion (Validation ou Rejet)
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { statut, motif_rejet } = req.body;

    if (!['validee', 'rejetee', 'en_attente'].includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }

    const checkRes = await db.query('SELECT * FROM adhesions WHERE id = $1', [id]);
    if (!checkRes.rows || checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }
    const adhesion = checkRes.rows[0];

    const updateSql = 'UPDATE adhesions SET statut = $1, motif_rejet = $2 WHERE id = $3';
    await db.query(updateSql, [statut, motif_rejet || null, id]);

    // Envoi de l'e-mail de notification
    if (statut === 'validee') {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2428; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1F2428; padding: 20px; text-align: center; border-bottom: 4px solid #4AA438;">
            <h2 style="color: #FFFFFF; margin: 0; font-size: 20px;">AMIBIOMED</h2>
            <p style="color: #4AA438; margin: 5px 0 0; font-size: 13px; font-weight: bold;">Technologie • Santé • Éthique</p>
          </div>
          <div style="padding: 25px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="background-color: #DEF7EC; color: #4AA438; font-weight: bold; padding: 8px 16px; border-radius: 50px; font-size: 14px;">Dossier Validé</span>
            </div>
            <h3 style="color: #1F2428; margin-top: 0;">Félicitations, ${adhesion.nom_complet} !</h3>
            <p>Le bureau de l'<strong>Association Marocaine de l'Ingénierie Biomédicale</strong> a le plaisir de vous annoncer que votre candidature d'adhésion a été officiellement <strong>validée</strong>.</p>
            <p>Vous faites désormais partie de notre réseau d'ingénieurs, scientifiques et praticiens engagés pour l'excellence des technologies de santé au Maroc.</p>
            <div style="background: #F8F9FA; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 6px;"><strong>Identifiant Membre :</strong> AMIB-${adhesion.id.toString().padStart(4, '0')}</p>
              <p style="margin: 0 0 6px;"><strong>Statut :</strong> Membre ${adhesion.type_membre.toUpperCase()}</p>
              <p style="margin: 0;"><strong>Date d'activation :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <p>Vous recevrez prochainement les convocations pour nos assemblées générales, colloques et groupes de travail thématiques.</p>
          </div>
          <div style="background: #F1F5F9; padding: 12px; text-align: center; font-size: 12px; color: #64748B;">
            AMIBIOMED - amibiomed.contact@gmail.com
          </div>
        </div>
      `;
      sendEmail({
        to: adhesion.email,
        subject: "Félicitations ! Votre adhésion à AMIBIOMED est validée",
        html: emailHtml,
        text: `Félicitations ${adhesion.nom_complet}, votre adhésion à AMIBIOMED a été validée.`
      }).catch(e => console.error(e));
    } else if (statut === 'rejetee') {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2428; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1F2428; padding: 20px; text-align: center; border-bottom: 4px solid #E22637;">
            <h2 style="color: #FFFFFF; margin: 0; font-size: 20px;">AMIBIOMED</h2>
            <p style="color: #E22637; margin: 5px 0 0; font-size: 13px; font-weight: bold;">Technologie • Santé • Éthique</p>
          </div>
          <div style="padding: 25px;">
            <h3 style="color: #1F2428; margin-top: 0;">Bonjour ${adhesion.nom_complet},</h3>
            <p>Après examen de votre dossier d'adhésion par la commission, nous sommes au regret de vous informer que votre candidature n'a pas pu être validée en l'état.</p>
            <div style="background: #FDF2F2; border-left: 4px solid #E22637; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #991B1B;">Motif du refus :</p>
              <p style="margin: 5px 0 0; color: #7F1D1D;">${motif_rejet || 'Pièces justificatives non conformes ou incomplètes.'}</p>
            </div>
            <p>Vous avez la possibilité de soumettre une nouvelle candidature avec les justificatifs appropriés sur notre plateforme.</p>
          </div>
          <div style="background: #F1F5F9; padding: 12px; text-align: center; font-size: 12px; color: #64748B;">
            AMIBIOMED - amibiomed.contact@gmail.com
          </div>
        </div>
      `;
      sendEmail({
        to: adhesion.email,
        subject: "Information concernant votre demande d'adhésion AMIBIOMED",
        html: emailHtml,
        text: `Bonjour ${adhesion.nom_complet}, votre demande d'adhésion n'a pas été retenue. Motif : ${motif_rejet || 'Justificatifs incomplets'}`
      }).catch(e => console.error(e));
    }

    return res.json({ success: true, message: `Dossier #${id} mis à jour avec le statut: ${statut}` });
  } catch (err) {
    console.error('Erreur updateStatus:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut.' });
  }
}

// 5. Exporter les adhésions au format CSV
async function exportCsv(req, res) {
  try {
    const result = await db.query('SELECT * FROM adhesions ORDER BY date_soumission DESC');
    const rows = result.rows;

    let csv = 'ID,Nom Complet,CIN,Email,Telephone,Type Membre,Affiliation,Statut,Date Soumission,Motif Rejet\n';
    rows.forEach(r => {
      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      csv += `${r.id},${escape(r.nom_complet)},${escape(r.cin)},${escape(r.email)},${escape(r.telephone)},${escape(r.type_membre)},${escape(r.affiliation)},${escape(r.statut)},${escape(r.date_soumission)},${escape(r.motif_rejet)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="adhesions_amibiomed_' + Date.now() + '.csv"');
    return res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
  } catch (err) {
    console.error('Erreur exportCsv:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de l’export CSV.' });
  }
}

module.exports = {
  createAdhesion,
  getAllAdhesions,
  getAdhesionById,
  updateStatus,
  exportCsv
};
