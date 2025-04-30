const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
  userIds: [{
    type: String,  // usernames
    required: true,
  }],
  type: {
    type: String,
    enum: ['singles', 'doubles'],
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
});

// Add virtual for waiting time
QueueSchema.virtual('waitingTime').get(function() {
  return Date.now() - this.joinedAt.getTime();
});

// Ensure virtuals are included when converting to JSON
QueueSchema.set('toJSON', { virtuals: true });

// Index for efficient sorting
QueueSchema.index({ joinedAt: 1 });

module.exports = mongoose.model('Queue', QueueSchema);