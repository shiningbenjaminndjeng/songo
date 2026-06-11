const Pusher = require('pusher');
const { CHANNEL, P1_ROW, P2_ROW, canPlay, processMove, endGame } = require('./_store');

const pusher = new Pusher({
  appId: '2164792', key: 'f8590f345168518bca77',
  secret: '95449bd24336f8611eeb', cluster: 'eu', useTLS: true,
});

// État partagé dans cette instance
let gameState = null;

function freshGame() {
  return {
    board: Array(12).fill(4), scores: [0,0], currentPlayer: 0,
    gameOver: false, phase: 'playing',
    message: 'Joueur 1, commencez.',
    player0Connected: true, player1Connected: true,
  };
}

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

    const { playerIdx, cellIdx, clientState } = body;

    // Utiliser l'état envoyé par le client si le serveur n'en a pas
    if (!gameState || gameState.gameOver) {
      gameState = clientState || freshGame();
    }

    // Forcer phase playing
    gameState.phase = 'playing';
    gameState.player0Connected = true;
    gameState.player1Connected = true;

    // Validations
    if (typeof playerIdx === 'undefined' || playerIdx === null)
      return res.status(400).json({ error: 'playerIdx manquant.' });
    if (playerIdx !== gameState.currentPlayer)
      return res.status(400).json({ error: "Ce n'est pas votre tour." });

    const ownRow = playerIdx === 0 ? P1_ROW : P2_ROW;
    if (!ownRow.includes(cellIdx))
      return res.status(400).json({ error: 'Case invalide.' });
    if (gameState.board[cellIdx] === 0)
      return res.status(400).json({ error: 'Case vide.' });

    const { captured } = processMove(gameState, cellIdx);

    if (!canPlay(gameState, 0) || !canPlay(gameState, 1)) {
      endGame(gameState);
      await pusher.trigger(CHANNEL, 'state', gameState);
      return res.status(200).json({ ok: true, game: gameState });
    }

    gameState.currentPlayer = 1 - gameState.currentPlayer;
    const pName = gameState.currentPlayer === 0 ? 'Joueur 1' : 'Joueur 2';
    gameState.message = captured > 0
      ? `✨ ${captured} graine${captured>1?'s':''}! Au tour de ${pName}.`
      : `Au tour de ${pName}.`;

    if (!canPlay(gameState, gameState.currentPlayer)) {
      gameState.message = `${pName} ne peut pas jouer – tour sauté.`;
      gameState.currentPlayer = 1 - gameState.currentPlayer;
      if (!canPlay(gameState, gameState.currentPlayer)) endGame(gameState);
    }

    await pusher.trigger(CHANNEL, 'state', gameState);
    return res.status(200).json({ ok: true, game: gameState });

  } catch (err) {
    console.error('move error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
