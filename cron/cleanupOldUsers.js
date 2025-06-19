// cron/cleanupOldUsers.js
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env') // explicitly point to your root .env
});
const mongoose = require('mongoose');
const User = require('../models/User');

(async function cleanupOldUsers() {
  try {
    // 1) Connect to your DB
    await mongoose.connect(process.env.MONGODB_URI);

    // 2) Compute “two days ago” in PST
    const nowUtc = new Date();
    const nowPst = new Date(nowUtc.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles'
    }));
    const twoDaysAgoPst = new Date(nowPst.getTime() - 2 * 24 * 60 * 60 * 1000);

    // 3) Delete all users created before that PST cutoff
    const result = await User.deleteMany({
      createdAt: { $lt: twoDaysAgoPst }
    });

    console.log(
      `[cleanupOldUsers] Deleted ${result.deletedCount} users created before ${twoDaysAgoPst.toISOString()} PST`
    );
    process.exit(0);
  } catch (err) {
    console.error('[cleanupOldUsers] Error:', err);
    process.exit(1);
  }
})();
