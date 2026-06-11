const Pusher = require('pusher');
const { CHANNEL } = require('./_store');

const pusher = new Pusher({
  appId: '2164792', key: 'f8590f345168518bca77',
  secret: '95449bd24336f8611eeb', cluster: 'eu', useTLS: true,
});

function freshGame() {
  return {
    board: Array(12).fill(4), scores: [0,0], currentPlayer: 0,
    gameOver: false, phase: 'playing',
    message: 'Les deux joueurs sont connectés ! Joueur 1, commencez.',
    player0Connected: true, player1Connected: true,
  };
}

// Sessions actives : { sessionId -> playerIdx }
const sessions = {};
let sharedGame = freshGame();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Lire le body pour récupérer un éventuel sessionId
    let body = {};
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      if (raw) body = JSON.parse(raw);
    } catch(e) {}

    const sessionId = body.sessionId || null;

    // Si cette session a déjà un rôle, le réutiliser
    if (sessionId && sessions[sessionId] !== undefined) {
      const playerIdx = sessions[sessionId];
      await pusher.trigger(CHANNEL, 'state', sharedGame);
      return res.status(200).json({ playerIdx, game: sharedGame });
    }

    // Nettoyer les sessions trop nombreuses (évite fuite mémoire)
    const sessionKeys = Object.keys(sessions);
    if (sessionKeys.length > 10) {
      sessionKeys.slice(0, 5).forEach(k => delete sessions[k]);
    }

    // Compter les joueurs actifs (0 et 1)
    const activePlayers = Object.values(sessions);
    const hasPlayer0 = activePlayers.includes(0);
    const hasPlayer1 = activePlayers.includes(1);

    let playerIdx;
    if (!hasPlayer0) {
      playerIdx = 0;
    } else if (!hasPlayer1) {
      playerIdx = 1;
    } else {
      playerIdx = -1; // spectateur
    }

    // Enregistrer la session
    if (sessionId && playerIdx >= 0) {
      sessions[sessionId] = playerIdx;
    }

    // Réinitialiser le jeu si les deux joueurs viennent de se connecter
    if (playerIdx === 1 || (playerIdx === 0 && !hasPlayer1)) {
      if (sharedGame.gameOver) {
        sharedGame = freshGame();
      }
    }

    await pusher.trigger(CHANNEL, 'state', sharedGame);
    return res.status(200).json({ playerIdx, game: sharedGame });

  } catch (err) {
    console.error('join error:', err.message);
    return res.status(500).json({ error: err.message, playerIdx: -1, game: null });
  }
};
