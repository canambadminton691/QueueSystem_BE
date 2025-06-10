const mongoose = require('mongoose');
const PSTTimeUtils = require('../utils/pstTime');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  animalName: {
    type: String,
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    required: true,
    default: function() {
      return PSTTimeUtils.getPSTTime();
    }
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      const pstNow = PSTTimeUtils.getPSTTime();
      const endOfDay = new Date(pstNow);
      // Set to end of PST day (11:59:59 PM PST)
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    }
  }
});

// Add method to check if user is valid (registered today in PST)
userSchema.methods.isValid = function() {
  const now = PSTTimeUtils.getPSTTime();
  return now <= this.expiresAt;
};

// Add method to get PST formatted timestamps
userSchema.methods.getPSTCreatedAt = function() {
  return PSTTimeUtils.getPSTTimeString(this.createdAt);
};

userSchema.methods.getPSTExpiresAt = function() {
  return PSTTimeUtils.getPSTTimeString(this.expiresAt);
};

// Add indexes for better performance
userSchema.index({ phoneNumber: 1, createdAt: 1 });
userSchema.index({ animalName: 1 });

module.exports = mongoose.model('User', userSchema);