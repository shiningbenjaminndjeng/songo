const { createPusher } = require('./_pusher');
const { CHANNEL, P1_ROW, P2_ROW, getGame, saveGame, canPlay, processMove, endGame } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pusher = createPusher();

    let body = req.body;
    if (!body || typeof body !== 'object') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    }

    const { playerIdx, cellIdx } = body;
    const game = getGame();

    if (game.phase !== 'playing')         return res.status(400).json({ error: 'Partie non en cours.' });
    if (playerIdx !== game.currentPlayer) return res.status(400).json({ error: "Ce n'est pas votre tour." });

    const ownRow = playerIdx === 0 ? P1_ROW : P2_ROW;
    if (!ownRow.includes(cellIdx))  return res.status(400).json({ error: 'Case invalide.' });
    if (game.board[cellIdx] === 0)  return res.status(400).json({ error: 'Case vide.' });

    const { captured } = processMove(game, cellIdx);

    if (!canPlay(game, 0) || !canPlay(game, 1)) {
      endGame(game); saveGame(game);
      await pusher.trigger(CHANNEL, 'state', game);
      return res.status(200).json({ ok: true, game });
    }

    game.currentPlayer = 1 - game.currentPlayer;
    const pName = game.currentPlayer === 0 ? 'Joueur 1' : 'Joueur 2';
    game.message = captured > 0
      ? `✨ ${captured} graine${captured>1?'s':''} capturée${captured>1?'s':''}! Au tour de ${pName}.`
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
    return res.status(500).json({ error: err.message });
  }
};
