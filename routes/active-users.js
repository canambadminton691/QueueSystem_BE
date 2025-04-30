const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');

router.get('/', async (req, res) => {
  try {
    // Get all courts with active reservations
    const activeCourts = await Court.find({ isAvailable: false })
      .populate('currentReservation');

    const currentTime = new Date();
    
    // Process courts and update expired games
    const activeUsers = [];
    
    activeCourts.forEach(court => {
      if (court.currentReservation) {
        const startTime = new Date(court.currentReservation.startTime);
        const timeDifferenceMinutes = (currentTime - startTime) / (1000 * 60);
        
        if (timeDifferenceMinutes < 30) {
          // Only add users from active games
          court.currentReservation.userIds.forEach(userId => {
            activeUsers.push({
              username: userId,
              startTime: court.currentReservation.startTime
            });
          });
        }
      }
    });

    return res.json({ 
      success: true,
      activeUsers
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
});

module.exports = router;