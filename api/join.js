const Pusher = require('pusher');
const { getGame, saveGame, CHANNEL } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;

  // Diagnostic clair des variables manquantes
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    const missing = ['PUSHER_APP_ID','PUSHER_KEY','PUSHER_SECRET','PUSHER_CLUSTER']
      .filter(k => !process.env[k]);
    console.error('Variables Pusher manquantes sur Vercel:', missing);
    return res.status(500).json({
      error: `Variables d'environnement manquantes sur Vercel: ${missing.join(', ')}`,
      playerIdx: -1,
      game: null
    });
  }

  const pusher = new Pusher({
    appId: PUSHER_APP_ID, key: PUSHER_KEY,
    secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true
  });

  try {
    const game = getGame();

    let playerIdx = -1;
    if (!game.player0Connected)      { game.player0Connected = true; playerIdx = 0; }
    else if (!game.player1Connected) { game.player1Connected = true; playerIdx = 1; }

    if (game.player0Connected && game.player1Connected && game.phase === 'waiting') {
      game.phase   = 'playing';
      game.message = 'Les deux joueurs sont connectés ! Joueur 1, commencez.';
    }
    saveGame(game);

    await pusher.trigger(CHANNEL, 'state', {
      ...game,
      playersConnected: (game.player0Connected ? 1 : 0) + (game.player1Connected ? 1 : 0),
    });

    return res.status(200).json({ playerIdx, game });
  } catch (err) {
    console.error('Erreur join:', err.message);
    return res.status(500).json({ error: err.message, playerIdx: -1, game: null });
  }
};
