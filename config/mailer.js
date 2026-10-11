const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const hasCredentials = process.env.SMTP_USER && 
                         process.env.SMTP_PASS && 
                         process.env.SMTP_PASS !== 'votre_mot_de_passe_application_ici';

  if (hasCredentials) {
    const isGmail = (process.env.SMTP_HOST || '').includes('gmail') || (process.env.SMTP_USER || '').includes('@gmail.com');
    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: process.env.SMTP_PASS.trim(),
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 465,
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: process.env.SMTP_PASS.trim(),
        },
      });
    }
  } else {
    // Mode simulation / fallback gracieux pour développement local
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('📧 [MODE SIMULATION EMAIL] E-mail simulé avec succès :');
        console.log(`   De     : ${mailOptions.from}`);
        console.log(`   À      : ${mailOptions.to}`);
        console.log(`   Sujet  : ${mailOptions.subject}`);
        console.log(`   Aperçu : ${mailOptions.text ? mailOptions.text.substring(0, 120) : 'HTML email'}...`);
        return { messageId: 'simulated-' + Date.now() };
      }
    };
  }
  return transporter;
}

/**
 * Envoie un email transactionnel sécurisé
 */
async function sendEmail({ to, cc, replyTo, subject, html, text }) {
  try {
    const mailer = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || '"AMIBIOMED" <qcmuca@gmail.com>',
      to,
      ...(cc ? { cc } : {}),
      ...(replyTo ? { replyTo } : {}),
      subject,
      text: text || '',
      html: html || '',
    };
    const info = await mailer.sendMail(mailOptions);
    return { success: true, info };
  } catch (err) {
    console.error('⚠️ Erreur lors de l’envoi d’email :', err.message);
    // Ne pas faire planter l'application si l'envoi SMTP échoue
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
  getTransporter,
};
