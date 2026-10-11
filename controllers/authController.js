const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Veuillez saisir votre email et mot de passe.' });
    }

    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email.trim().toLowerCase()]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    }

    // Générer JWT (valable 24h)
    const token = jwt.sign(
      {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Définir le cookie sécurisé HttpOnly
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });

    return res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
}

function logout(req, res) {
  res.clearCookie('admin_token');
  return res.json({ success: true, message: 'Déconnexion réussie.' });
}

function getMe(req, res) {
  if (!req.admin) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }
  return res.json({ success: true, admin: req.admin });
}

const { sendEmail } = require('../config/mailer');

// In-memory cache de secours pour les codes de réinitialisation
const resetCodesMemory = new Map();

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Veuillez saisir votre adresse e-mail administrateur.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminRes = await db.query('SELECT id, nom, email FROM admins WHERE email = $1', [cleanEmail]);
    if (!adminRes.rows || adminRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Aucun compte administrateur associé à cette adresse e-mail.' });
    }

    const admin = adminRes.rows[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    resetCodesMemory.set(cleanEmail, { code, expiresAt });

    try {
      await db.query(
        'INSERT INTO password_resets (email, code, expires_at) VALUES ($1, $2, $3)',
        [cleanEmail, code, expiresAt]
      );
    } catch (e) {
      console.warn('Note insertion password_resets:', e.message);
    }

    console.log(`========================================================`);
    console.log(`🔐 [AMIBIOMED] Code de réinitialisation généré :`);
    console.log(`   Compte   : ${admin.nom} (${admin.email})`);
    console.log(`   Code     : ${code}`);
    console.log(`   Validité : 15 minutes`);
    console.log(`========================================================`);

    const emailSubject = "AMIBIOMED - Code de réinitialisation de votre mot de passe administrateur";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2428; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1F2428; padding: 20px; text-align: center; border-bottom: 4px solid #4AA438;">
          <h2 style="color: #FFFFFF; margin: 0; font-size: 20px;">AMIBIOMED Back-Office</h2>
          <p style="color: #4AA438; margin: 5px 0 0; font-size: 13px; font-weight: bold;">Sécurité & Réinitialisation d'Accès</p>
        </div>
        <div style="padding: 25px;">
          <h3 style="color: #0074BC; margin-top: 0;">Bonjour ${admin.nom},</h3>
          <p>Vous avez demandé la réinitialisation du mot de passe de votre compte administrateur AMIBIOMED.</p>
          <div style="background: #F8FAFC; border: 2px dashed #4AA438; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
            <p style="margin: 0 0 8px; color: #64748B; font-size: 13px; text-transform: uppercase; font-weight: bold;">Votre Code de Vérification :</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1F2428;">${code}</div>
            <p style="margin: 8px 0 0; color: #E22637; font-size: 12px; font-weight: bold;">Ce code expire dans 15 minutes.</p>
          </div>
          <p style="font-size: 14px; color: #475569;">
            <strong>Identifiant / Nom d'utilisateur :</strong> ${admin.email}<br>
            Saisissez ce code sur la page de connexion pour définir votre nouveau mot de passe.
          </p>
          <p style="margin-top: 30px; font-size: 12px; color: #94A3B8;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: admin.email,
      subject: emailSubject,
      html: emailHtml,
      text: `Bonjour ${admin.nom}, votre code de réinitialisation pour ${admin.email} est : ${code}. Valable 15 minutes.`
    });

    return res.json({
      success: true,
      message: 'Un code de réinitialisation sécurisé à 6 chiffres a été envoyé par e-mail.',
      email: admin.email
    });
  } catch (err) {
    console.error('Erreur forgotPassword:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la demande de réinitialisation.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, code, new_password } = req.body;
    if (!email || !code || !new_password) {
      return res.status(400).json({ success: false, message: 'Email, code de vérification et nouveau mot de passe sont obligatoires.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const cached = resetCodesMemory.get(cleanEmail);
    let isValid = false;

    if (cached && cached.code === cleanCode && new Date() <= cached.expiresAt) {
      isValid = true;
    } else {
      const dbRes = await db.query(
        'SELECT * FROM password_resets WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at >= NOW() ORDER BY created_at DESC LIMIT 1',
        [cleanEmail, cleanCode]
      );
      if (dbRes.rows && dbRes.rows.length > 0) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Code de vérification invalide ou expiré.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(new_password, salt);

    await db.query('UPDATE admins SET password_hash = $1 WHERE email = $2', [hash, cleanEmail]);

    resetCodesMemory.delete(cleanEmail);
    try {
      await db.query('UPDATE password_resets SET used = TRUE WHERE email = $1', [cleanEmail]);
    } catch (e) {}

    console.log(`✅ [AMIBIOMED] Mot de passe réinitialisé avec succès pour : ${cleanEmail}`);

    return res.json({
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.'
    });
  } catch (err) {
    console.error('Erreur resetPassword:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
}

module.exports = {
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword
};
