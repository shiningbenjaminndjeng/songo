/**
 * api/_pusher.js
 * Configuration Pusher centralisée.
 * Remplacez les 4 valeurs ci-dessous par celles de votre app Pusher
 * (onglet App Keys dans le dashboard Pusher).
 */
const Pusher = require('pusher');

// ← REMPLACEZ CES VALEURS PAR CELLES DE SONGHO-DEVELOPMENT
const PUSHER_APP_ID  = process.env.PUSHER_APP_ID  || '2164792';
const PUSHER_KEY     = process.env.PUSHER_KEY     || 'f8590f345168518bca77';
const PUSHER_SECRET  = process.env.PUSHER_SECRET  || '95449bd24336f8611eeb';
const PUSHER_CLUSTER = process.env.PUSHER_CLUSTER || 'eu';

function createPusher() {
  return new Pusher({
    appId:   PUSHER_APP_ID,
    key:     PUSHER_KEY,
    secret:  PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS:  true,
  });
}

module.exports = { createPusher };
