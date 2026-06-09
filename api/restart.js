/**
 * /api/restart.js
 * Réinitialise la partie.
 */

const Pusher = require('pusher');
const { CHANNEL, getGame, resetGame, saveGame } = require('./_store');

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  resetGame();
  const game = getGame();

  // Reconnecter les deux joueurs directement
  game.player0Connected = true;
  game.player1Connected = true;
  game.phase   = 'playing';
  game.message = 'Nouvelle partie ! Joueur 1 commence.';
  saveGame(game);

  await pusher.trigger(CHANNEL, 'state', game);
  res.status(200).json({ ok: true, game });
};
