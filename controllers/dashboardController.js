const db = require('../config/db');

async function getStats(req, res) {
  try {
    const totalAdhesionsRes = await db.query('SELECT COUNT(*) as c FROM adhesions');
    const pendingAdhesionsRes = await db.query("SELECT COUNT(*) as c FROM adhesions WHERE statut = 'en_attente'");
    const validatedAdhesionsRes = await db.query("SELECT COUNT(*) as c FROM adhesions WHERE statut = 'validee'");
    const rejectedAdhesionsRes = await db.query("SELECT COUNT(*) as c FROM adhesions WHERE statut = 'rejetee'");
    
    const eventsCountRes = await db.query('SELECT COUNT(*) as c FROM events');
    const upcomingEventsRes = await db.query("SELECT COUNT(*) as c FROM events WHERE statut = 'a_venir'");
    
    const unreadMessagesRes = await db.query("SELECT COUNT(*) as c FROM contacts WHERE statut = 'non_lu'");
    const totalPartnersRes = await db.query("SELECT COUNT(*) as c FROM partners WHERE statut = 'actif'");

    const recentAdhesionsRes = await db.query('SELECT * FROM adhesions ORDER BY date_soumission DESC LIMIT 5');
    const recentMessagesRes = await db.query('SELECT * FROM contacts ORDER BY date_envoi DESC LIMIT 5');

    const parseC = (resObj) => {
      if (!resObj.rows || resObj.rows.length === 0) return 0;
      const row = resObj.rows[0];
      return parseInt(row.c || row['count(*)'] || 0, 10);
    };

    return res.json({
      success: true,
      stats: {
        totalAdhesions: parseC(totalAdhesionsRes),
        pendingAdhesions: parseC(pendingAdhesionsRes),
        validatedAdhesions: parseC(validatedAdhesionsRes),
        rejectedAdhesions: parseC(rejectedAdhesionsRes),
        totalEvents: parseC(eventsCountRes),
        upcomingEvents: parseC(upcomingEventsRes),
        unreadMessages: parseC(unreadMessagesRes),
        activePartners: parseC(totalPartnersRes),
      },
      recentAdhesions: recentAdhesionsRes.rows,
      recentMessages: recentMessagesRes.rows,
    });
  } catch (err) {
    console.error('Erreur getStats:', err);
    return res.status(500).json({ success: false, message: 'Erreur lors du calcul des statistiques.' });
  }
}

module.exports = {
  getStats
};
