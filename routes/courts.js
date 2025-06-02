const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');

// Constants
const ADMIN_PASSWORD = 'canamadmin';

// Middleware for admin authentication
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

// Utility function to process court data and update expired games
async function processCourtData(court) {
  const currentTime = new Date();
  
  // Check if the court has an active reservation
  if (court.currentReservation) {
    const startTime = new Date(court.currentReservation.startTime);
    const timeDifferenceMinutes = (currentTime - startTime) / (1000 * 60);
    
    // If 30 minutes have passed, update the database
    if (timeDifferenceMinutes >= 30) {
      // Update the court in database
      await Court.findByIdAndUpdate(court._id, {
        isAvailable: true,
        currentReservation: null
      });

      // Delete or archive the reservation
      if (court.currentReservation._id) {
        await Reservation.findByIdAndDelete(court.currentReservation._id);
      }

      return {
        _id: court._id,
        name: court.name,
        isVisible: court.isVisible,
        isAvailable: true,
        currentReservation: null,
        waitlist: court.waitlist || [],
        waitlistCount: (court.waitlist || []).length
      };
    }
  }

  // Return court data with current reservation if game is still active
  return {
    _id: court._id,
    name: court.name,
    isVisible: court.isVisible,
    isAvailable: court.isAvailable,
    currentReservation: court.currentReservation ? {
      startTime: court.currentReservation.startTime,
      userIds: court.currentReservation.userIds || [],
      type: court.currentReservation.type,
      option: court.currentReservation.option
    } : null,
    waitlist: court.waitlist || [],
    waitlistCount: (court.waitlist || []).length
  };
}

// Utility function to ensure all courts exist
async function ensureAllCourtsExist() {
  // Ensure all courts exist (1 through 20)
  const existingCourts = await Court.find().sort({ name: 1 });
  const existingCourtNames = new Set(existingCourts.map(c => c.name));
  
  // Create any missing courts
  const courtsToCreate = [];
  for (let i = 1; i <= 20; i++) {
    const courtName = `Court ${i}`;
    if (!existingCourtNames.has(courtName)) {
      courtsToCreate.push({
        name: courtName,
        isAvailable: true,
        isVisible: true
      });
    }
  }
  
  if (courtsToCreate.length > 0) {
    await Court.create(courtsToCreate);
  }
}

// GET /api/courts - Fetch visible courts for regular users
router.get('/', async (req, res) => {
  try {
    // Ensure all courts exist
    await ensureAllCourtsExist();
    
    // Fetch only visible courts with populated reservation data
    const courts = await Court.find({ isVisible: true })
      .populate('currentReservation')
      .sort({ name: 1 });

    // Transform the data and update expired games in database
    const safeCourtData = await Promise.all(courts.map(processCourtData));

    res.json({ 
      success: true,
      courts: safeCourtData
    });
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// GET /api/courts/all - Fetch all courts for admin (including invisible)
router.get('/all', validateAdmin, async (req, res) => {
  try {
    // Ensure all courts exist
    await ensureAllCourtsExist();
    
    // Fetch all courts (including invisible) with populated reservation data
    const courts = await Court.find()
      .populate('currentReservation')
      .sort({ name: 1 });

    // Transform the data and update expired games in database
    const safeCourtData = await Promise.all(courts.map(processCourtData));

    res.json({ 
      success: true,
      courts: safeCourtData
    });
  } catch (error) {
    console.error('Error fetching all courts:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

module.exports = router;