/**
 * One-off: set leader@cse.edu to role "leader" if it was saved as student.
 * Usage (from server/):  node scripts/fixLeaderRole.js
 * Requires MONGODB_URI in .env
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const r = await User.updateOne(
      { email: 'leader@cse.edu' },
      { $set: { role: 'leader' } }
    );
    console.log('Modified:', r.modifiedCount);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
