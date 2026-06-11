const Pusher = require('pusher');
const { getGame, saveGame, CHANNEL } = require('./_store');

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
    const game = getGame();

    let playerIdx = -1;
    if (!game.player0Connected)      { game.player0Connected = true; playerIdx = 0; }
    else if (!game.player1Connected) { game.player1Connected = true; playerIdx = 1; }

    if (game.player0Connected && game.player1Connected && game.phase !== 'playing' && game.phase !== 'ended') {
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
    console.error('join error:', err.message);
    return res.status(500).json({ error: err.message, playerIdx: -1, game: null });
  }
};
