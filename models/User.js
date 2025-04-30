const mongoose = require('mongoose');

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
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      const now = new Date();
      const pst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const endOfDay = new Date(pst);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    }
  }
});

// Add method to check if user is valid (registered today in PST)
userSchema.methods.isValid = function() {
  const now = new Date();
  return now <= this.expiresAt;
};

// Add indexes for better performance
userSchema.index({ phoneNumber: 1, createdAt: 1 });
userSchema.index({ animalName: 1 });

module.exports = mongoose.model('User', userSchema);