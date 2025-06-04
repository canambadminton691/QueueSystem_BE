// routes/admin/reset-court.js
const express = require('express');
const router = express.Router();
const Court = require('../../models/Court');
const Reservation = require('../../models/Reservation');

const ADMIN_PASSWORD = 'canamadmin';

// validate the password of admin
const validateAdmin = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];
  
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid admin password' 
    });
  }
  
  next();
};

// apply middleware to all routes
router.use(validateAdmin);

router.post('/:courtId', async (req, res) => {
  try {
    const { courtId } = req.params;
    console.info('Court ID to reset ', courtId);

    // Find the court and populate the reservation
    const court = await Court.findById(courtId).populate('currentReservation');
    if (!court) {
      return res.status(404).json({ 
        error: 'Court not found' 
      });
    }

    // If there's a current reservation, delete it properly
    if (court.currentReservation) {
      // Store the reservation ID before deleting
      const reservationId = court.currentReservation._id;
      
      // Reset court status first
      court.currentReservation = null;
      court.waitlist = [];
      court.isVisible = true;
      await court.save();

      // Then delete the reservation
      await Reservation.findByIdAndDelete(reservationId);
    }

    return res.json({ 
      success: true,
      message: 'Court reset successfully'
    });
  } catch (error) {
    console.error('Admin reset error:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
});

module.exports = router;