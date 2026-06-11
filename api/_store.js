/**
 * api/_store.js - Store en mémoire simple (pas de fs, pas de /tmp)
 * Fonctionne dans le même processus Node.js sur Vercel.
 * L'état est recréé si l'instance redémarre (cold start),
 * mais Pusher synchronise le vrai état côté clients.
 */
const CHANNEL = 'songo-game';
const SEEDS   = 4;
const HOLES   = 12;
const P1_ROW  = [6,7,8,9,10,11];
const P2_ROW  = [0,1,2,3,4,5];

function createGameState() {
  return {
    board:            Array(HOLES).fill(SEEDS),
    scores:           [0, 0],
    currentPlayer:    0,
    gameOver:         false,
    phase:            'playing',   // ← toujours 'playing' par défaut
    message:          'En attente…',
    player0Connected: true,
    player1Connected: true,
  };
}

let _game = createGameState();
const getGame  = ()  => _game;
const saveGame = (g) => { _game = g; };
const resetGame = () => { _game = createGameState(); return _game; };

function getSowingOrder(startIdx) {
  const seq = [6,7,8,9,10,11,5,4,3,2,1,0];
  const pos  = seq.indexOf(startIdx);
  return [...seq.slice(pos+1), ...seq.slice(0, pos)];
}

function canPlay(game, player) {
  return (player === 0 ? P1_ROW : P2_ROW).some(i => game.board[i] > 0);
}

function processMove(game, startIdx) {
  const opponentRow = game.currentPlayer === 0 ? P2_ROW : P1_ROW;
  const seeds = game.board[startIdx];
  game.board[startIdx] = 0;
  const targets = getSowingOrder(startIdx).slice(0, seeds);
  targets.forEach(i => { game.board[i]++; });
  const lastSown = targets[targets.length - 1];
  let captured = 0;
  if (opponentRow.includes(lastSown)) {
    const gs = [6,7,8,9,10,11,5,4,3,2,1,0];
    let pos = gs.indexOf(lastSown);
    while (true) {
      const idx = gs[pos];
      if (!opponentRow.includes(idx)) break;
      if (game.board[idx] === 2 || game.board[idx] === 3) {
        captured += game.board[idx];
        game.board[idx] = 0;
        pos = (pos - 1 + gs.length) % gs.length;
      } else break;
    }
  }
  game.scores[game.currentPlayer] += captured;
  return { captured, lastSown };
}

function endGame(game) {
  P1_ROW.forEach(i => { game.scores[0] += game.board[i]; game.board[i] = 0; });
  P2_ROW.forEach(i => { game.scores[1] += game.board[i]; game.board[i] = 0; });
  game.gameOver = true; game.phase = 'ended';
  const [s0, s1] = game.scores;
  game.message = s0>s1 ? `🎉 Joueur 1 gagne ! (${s0} vs ${s1})` :
                 s1>s0 ? `🎉 Joueur 2 gagne ! (${s1} vs ${s0})` :
                         `🤝 Égalité ! (${s0} chacun)`;
}

module.exports = { CHANNEL, P1_ROW, P2_ROW, getGame, saveGame, resetGame,
                   getSowingOrder, canPlay, processMove, endGame };
