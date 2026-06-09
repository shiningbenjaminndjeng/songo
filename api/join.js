/**
 * /api/join.js
 * Un joueur rejoint la partie.
 * Retourne son playerIdx (0 ou 1) et l'état actuel.
 * L'état est stocké dans un objet en mémoire partagé (Vercel Edge Cache via KV).
 * Pour simplifier sans KV, on utilise un store en mémoire de processus
 * (fonctionne pour 2 joueurs sur la même instance Vercel – suffisant pour démo).
 */

const Pusher = require('pusher');
const { getGame, saveGame, CHANNEL } = require('./_store');

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

  const game = getGame();

  // Assigner un slot joueur
  let playerIdx = -1;
  if (!game.player0Connected) { game.player0Connected = true; playerIdx = 0; }
  else if (!game.player1Connected) { game.player1Connected = true; playerIdx = 1; }

  const bothConnected = game.player0Connected && game.player1Connected;
  if (bothConnected && game.phase === 'waiting') {
    game.phase   = 'playing';
    game.message = 'Les deux joueurs sont connectés ! Joueur 1, commencez.';
  }

  saveGame(game);

  // Notifier tous les clients
  await pusher.trigger(CHANNEL, 'state', {
    ...game,
    playersConnected: (game.player0Connected ? 1 : 0) + (game.player1Connected ? 1 : 0),
  });

  res.status(200).json({ playerIdx, game });
};
