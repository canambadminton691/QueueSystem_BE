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
  currentReservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  }
});

module.exports = mongoose.model('Court', CourtSchema);