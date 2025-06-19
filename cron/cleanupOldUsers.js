// cron/cleanupOldUsers.js
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env') // explicitly point to your root .env
});
const User = require('../models/User');

async function cleanupOldUsers() {
  const nowUtc = new Date();
  const nowPst = new Date(nowUtc.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles'
  }));
  const twoDaysAgoPst = new Date(nowPst.getTime() - 2 * 24 * 60 * 60 * 1000);

  const { deletedCount } = await User.deleteMany({
      createdAt: { $lt: twoDaysAgoPst }
  });

  return { deletedCount, cutoff: twoDaysAgoPst.toISOString() };
  }

  module.exports = cleanupOldUsers;
