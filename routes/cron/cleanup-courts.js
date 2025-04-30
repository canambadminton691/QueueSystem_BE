// routes/cron/cleanup-courts.js
const express = require('express');
const router = express.Router();
const Court = require('../../models/Court');
const Reservation = require('../../models/Reservation');

router.get('/', async (req, res) => {
  try {
    // Find all courts with expired reservations
    const courts = await Court.find({ isAvailable: false })
      .populate('currentReservation');

    let cleanedCount = 0;
    
    // Update courts with expired reservations
    for (const court of courts) {
      if (court.currentReservation) {
        const startTime = new Date(court.currentReservation.startTime);
        const currentTime = new Date();
        const timeDifferenceMinutes = (currentTime - startTime) / (1000 * 60);
        
        if (timeDifferenceMinutes >= 30) {
          // Store the reservation ID before deleting
          const reservationId = court.currentReservation._id;
          
          // Reset court status
          court.isAvailable = true;
          court.currentReservation = null;
          await court.save();

          // Delete the expired reservation
          await Reservation.findByIdAndDelete(reservationId);
          cleanedCount++;
        }
      }
    }

    return res.json({ 
      success: true,
      message: `Cleaned up ${cleanedCount} expired reservations`,
      cleanedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
});

module.exports = router;