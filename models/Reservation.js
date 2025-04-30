const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  courtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: true,
  },
  userIds: [{
    type: String,  // usernames
    required: true,
  }],
  type: {
    type: String,
    required: true,
    enum: ['half', 'full']  // Make sure these exact values are allowed
  },
  option: {
    type: String,
    enum: ['merge', 'queue', null],  // Allow null for full court
    default: null
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: function() {
      const start = this.startTime || new Date();
      return new Date(start.getTime() + 30 * 60 * 1000);
    }
  }
});

// Add method to check if reservation is expired
ReservationSchema.methods.isExpired = function() {
  return Date.now() >= this.endTime.getTime();
};

module.exports = mongoose.model('Reservation', ReservationSchema);