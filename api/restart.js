const { createPusher } = require('./_pusher');
const { CHANNEL, resetGame, getGame, saveGame } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pusher = createPusher();
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
    return res.status(500).json({ error: err.message });
  }
};
