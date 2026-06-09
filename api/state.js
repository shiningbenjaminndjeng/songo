/**
 * /api/state.js
 * Retourne l'état courant du jeu (polling de secours).
 */
const { getGame } = require('./_store');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(getGame());
};
