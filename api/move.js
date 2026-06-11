const Pusher = require('pusher');
const { CHANNEL, P1_ROW, P2_ROW, getGame, saveGame, canPlay, processMove, endGame } = require('./_store');

const pusher = new Pusher({
  appId:   '2164792',
  key:     'f8590f345168518bca77',
  secret:  '95449bd24336f8611eeb',
  cluster: 'eu',
  useTLS:  true,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    }

    const { playerIdx, cellIdx } = body;

    // Lire l'état depuis /tmp
    let game = getGame();

    // Si la partie est en phase 'waiting' à cause d'une instance fraîche,
    // on force 'playing' si les deux joueurs étaient déjà connectés
    if (game.phase === 'waiting' && (game.player0Connected || game.player1Connected)) {
      game.phase = 'playing';
      game.player0Connected = true;
      game.player1Connected = true;
      saveGame(game);
    }

    // Validation du joueur
    if (typeof playerIdx === 'undefined' || playerIdx === null)
      return res.status(400).json({ error: 'playerIdx manquant.' });

    const ownRow = playerIdx === 0 ? P1_ROW : P2_ROW;
    if (!ownRow.includes(cellIdx))
      return res.status(400).json({ error: 'Case invalide.' });
    if (game.board[cellIdx] === 0)
      return res.status(400).json({ error: 'Case vide.' });
    if (playerIdx !== game.currentPlayer)
      return res.status(400).json({ error: "Ce n'est pas votre tour." });

    const { captured } = processMove(game, cellIdx);

    if (!canPlay(game, 0) || !canPlay(game, 1)) {
      endGame(game);
      saveGame(game);
      await pusher.trigger(CHANNEL, 'state', game);
      return res.status(200).json({ ok: true, game });
    }

    game.currentPlayer = 1 - game.currentPlayer;
    const pName = game.currentPlayer === 0 ? 'Joueur 1' : 'Joueur 2';
    game.message = captured > 0
      ? `✨ ${captured} graine${captured>1?'s':''}! Au tour de ${pName}.`
      : `Au tour de ${pName}.`;

    if (!canPlay(game, game.currentPlayer)) {
      game.message = `${pName} ne peut pas jouer – tour sauté.`;
      game.currentPlayer = 1 - game.currentPlayer;
      if (!canPlay(game, game.currentPlayer)) endGame(game);
    }

    saveGame(game);
    await pusher.trigger(CHANNEL, 'state', game);
    return res.status(200).json({ ok: true, game });

  } catch (err) {
    console.error('move error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
