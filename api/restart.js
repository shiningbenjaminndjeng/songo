const Pusher = require('pusher');
const { CHANNEL, resetGame, getGame, saveGame } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER)
    return res.status(500).json({ error: 'Configuration serveur manquante.' });

  const pusher = new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true });

  try {
    resetGame();
    const game = getGame();
    game.player0Connected = true;
    game.player1Connected = true;
    game.phase   = 'playing';
    game.message = 'Nouvelle partie ! Joueur 1 commence.';
    saveGame(game);
    await pusher.trigger(CHANNEL, 'state', game);
    return res.status(200).json({ ok: true, game });
  } catch (err) {
    console.error('Erreur restart:', err);
    return res.status(500).json({ error: err.message });
  }
};
