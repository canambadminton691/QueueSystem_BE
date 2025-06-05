const mongoose = require('mongoose');

const CourtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  courtNumber: {
    type: Number,
    required: true,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  currentReservation: {
    type: mongoose.Schema.Types.ObjectId,  // reservation Id
    ref: 'Reservation',
    default: null
  },
  waitlist: [{
    type: mongoose.Schema.Types.ObjectId,  // reservation Id
    ref: 'Reservation',
    default: null
  }]
});

module.exports = mongoose.model('Court', CourtSchema);