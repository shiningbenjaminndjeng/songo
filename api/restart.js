const Pusher = require('pusher');
const { CHANNEL } = require('./_store');

const pusher = new Pusher({
  appId: '2164792', key: 'f8590f345168518bca77',
  secret: '95449bd24336f8611eeb', cluster: 'eu', useTLS: true,
});

// Importer les sessions de join pour les réinitialiser
let joinModule;
try { joinModule = require('./join'); } catch(e) {}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Réinitialiser les sessions dans join.js
    // On passe par Pusher pour notifier tous les clients de se reconnecter
    const newGame = {
      board: Array(12).fill(4), scores: [0,0], currentPlayer: 0,
      gameOver: false, phase: 'waiting',
      message: 'Nouvelle partie ! Reconnectez-vous.',
      player0Connected: false, player1Connected: false,
    };

    // Envoyer event spécial pour forcer reconnexion des clients
    await pusher.trigger(CHANNEL, 'reset', {});
    await pusher.trigger(CHANNEL, 'state', newGame);

    return res.status(200).json({ ok: true, game: newGame });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
