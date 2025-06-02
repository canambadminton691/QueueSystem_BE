const mongoose = require('mongoose');

const CourtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  currentReservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  waitlist: [{
    waitlistIndex: {
      type: Number,
      required: true
    },
    usernames: [{
      type: String,
      required: true
    }],
    startTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    }
  }]
});

module.exports = mongoose.model('Court', CourtSchema);