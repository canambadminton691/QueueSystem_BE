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
    type: String,  // reservation type
    required: true,
    enum: ['full', 'half']  // Make sure these exact values are allowed
  },
  option: {
    type: String,
    enum: ['merge', 'queue', null],  // Allow null for full court
    default: null
  },
  startTime: {
    type: Date,  // start time of the reservation in milliseconds
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