const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: [true, 'Token is required to be added to the blacklist'],
  },
  // Auto-delete after 2 days (same as the token lifetime)
  createdAt: { type: Date, default: Date.now, expires: 2 * 24 * 60 * 60 },
});

module.exports = mongoose.model('Blacklist', blacklistSchema);
