const Pusher = require('pusher');
const { CHANNEL } = require('./_store');

const pusher = new Pusher({
  appId: '2164792', key: 'f8590f345168518bca77',
  secret: '95449bd24336f8611eeb', cluster: 'eu', useTLS: true,
});

// Compteur de joueurs connectés (valide dans la même instance)
let connectedPlayers = 0;
let gameState = null;

function freshGame() {
  return {
    board: Array(12).fill(4), scores: [0,0], currentPlayer: 0,
    gameOver: false, phase: 'playing',
    message: 'Les deux joueurs sont connectés ! Joueur 1, commencez.',
    player0Connected: true, player1Connected: true,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Assigner un index joueur
    const playerIdx = connectedPlayers < 2 ? connectedPlayers : -1;
    connectedPlayers = Math.min(connectedPlayers + 1, 2);

    // Créer ou récupérer l'état de jeu
    if (!gameState || gameState.gameOver) {
      gameState = freshGame();
    }

    // Diffuser l'état à tous les clients
    await pusher.trigger(CHANNEL, 'state', gameState);

    return res.status(200).json({ playerIdx, game: gameState });
  } catch (err) {
    console.error('join error:', err.message);
    return res.status(500).json({ error: err.message, playerIdx: -1, game: null });
  }
};
