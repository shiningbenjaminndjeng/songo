/**
 * /api/move.js
 * Traite un coup joué par un joueur.
 * Body JSON attendu : { playerIdx: 0|1, cellIdx: 0-11 }
 */

const Pusher = require('pusher');
const {
  CHANNEL, P1_ROW, P2_ROW,
  getGame, saveGame,
  canPlay, processMove, endGame,
} = require('./_store');

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

  let body = req.body;
  if (!body) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); }
    catch { return res.status(400).json({ error: 'JSON invalide' }); }
  }

  const { playerIdx, cellIdx } = body;
  const game = getGame();

  // ── Validations ──
  if (game.phase !== 'playing')
    return res.status(400).json({ error: 'Partie non en cours.' });
  if (playerIdx !== game.currentPlayer)
    return res.status(400).json({ error: 'Ce n\'est pas votre tour.' });

  const ownRow = playerIdx === 0 ? P1_ROW : P2_ROW;
  if (!ownRow.includes(cellIdx))
    return res.status(400).json({ error: 'Case invalide.' });
  if (game.board[cellIdx] === 0)
    return res.status(400).json({ error: 'Case vide.' });

  // ── Traitement du coup ──
  const { captured } = processMove(game, cellIdx);

  // Vérifier fin de partie
  if (!canPlay(game, 0) || !canPlay(game, 1)) {
    endGame(game);
    saveGame(game);
    await pusher.trigger(CHANNEL, 'state', game);
    return res.status(200).json({ ok: true, game });
  }

  // Passer le tour
  game.currentPlayer = 1 - game.currentPlayer;
  const pName = game.currentPlayer === 0 ? 'Joueur 1' : 'Joueur 2';

  game.message = captured > 0
    ? `✨ ${captured} graine${captured > 1 ? 's' : ''} capturée${captured > 1 ? 's' : ''} ! Au tour de ${pName}.`
    : `Au tour de ${pName}.`;

  // Vérifier si le nouveau joueur peut jouer
  if (!canPlay(game, game.currentPlayer)) {
    const skipped = game.currentPlayer === 0 ? 'Joueur 1' : 'Joueur 2';
    game.message = `${skipped} ne peut pas jouer – tour sauté.`;
    game.currentPlayer = 1 - game.currentPlayer;
    if (!canPlay(game, game.currentPlayer)) {
      endGame(game);
    }
  }

  saveGame(game);

  // Diffuser le nouvel état à tous les clients via Pusher
  await pusher.trigger(CHANNEL, 'state', game);

  res.status(200).json({ ok: true, game });
};
