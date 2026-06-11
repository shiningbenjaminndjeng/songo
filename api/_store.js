/**
 * api/_store.js
 * État du jeu persisté dans /tmp (partagé entre fonctions serverless Vercel).
 */
const fs   = require('fs');
const path = require('path');

const STATE_FILE = path.join('/tmp', 'songo_state.json');
const CHANNEL    = 'songo-game';

const SEEDS = 4;
const HOLES = 12;
const P1_ROW = [6,7,8,9,10,11];
const P2_ROW = [0,1,2,3,4,5];

function createGameState() {
  return {
    board:            Array(HOLES).fill(SEEDS),
    scores:           [0, 0],
    currentPlayer:    0,
    gameOver:         false,
    phase:            'waiting',
    message:          'En attente des joueurs…',
    player0Connected: false,
    player1Connected: false,
  };
}

function getGame() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) { /* ignore, retourne état initial */ }
  return createGameState();
}

function saveGame(g) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(g), 'utf8'); }
  catch (e) { console.error('saveGame error:', e.message); }
}

function resetGame() {
  const g = createGameState();
  saveGame(g);
  return g;
}

function getSowingOrder(startIdx) {
  const seq = [6,7,8,9,10,11,5,4,3,2,1,0];
  const pos  = seq.indexOf(startIdx);
  return [...seq.slice(pos+1), ...seq.slice(0, pos)];
}

function canPlay(game, player) {
  const row = player === 0 ? P1_ROW : P2_ROW;
  return row.some(i => game.board[i] > 0);
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
    const globalSeq = [6,7,8,9,10,11,5,4,3,2,1,0];
    let pos = globalSeq.indexOf(lastSown);
    while (true) {
      const idx = globalSeq[pos];
      if (!opponentRow.includes(idx)) break;
      if (game.board[idx] === 2 || game.board[idx] === 3) {
        captured += game.board[idx];
        game.board[idx] = 0;
        pos = (pos - 1 + globalSeq.length) % globalSeq.length;
      } else break;
    }
  }

  game.scores[game.currentPlayer] += captured;
  return { captured, lastSown };
}

function endGame(game) {
  P1_ROW.forEach(i => { game.scores[0] += game.board[i]; game.board[i] = 0; });
  P2_ROW.forEach(i => { game.scores[1] += game.board[i]; game.board[i] = 0; });
  game.gameOver = true;
  game.phase    = 'ended';
  const s0 = game.scores[0], s1 = game.scores[1];
  game.message =
    s0 > s1 ? `🎉 Joueur 1 gagne ! (${s0} vs ${s1})` :
    s1 > s0 ? `🎉 Joueur 2 gagne ! (${s1} vs ${s0})` :
              `🤝 Égalité ! (${s0} chacun)`;
}

module.exports = {
  CHANNEL, P1_ROW, P2_ROW,
  getGame, saveGame, resetGame,
  getSowingOrder, canPlay, processMove, endGame,
};
