const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const WaitlistManager = require('../utils/waitlistManager');

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

// Utility function to process court data using unified queue logic
async function processCourtData(court) {
  // Only process queue progression if court has a waitlist
  if (court.waitlist && court.waitlist.length > 0) {
    await WaitlistManager.processQueueProgression(court);
    await court.save();
  }
  
  // Get current status using unified logic
  const status = WaitlistManager.getCourtStatus(court);
  
  return {
    _id: court._id,
    name: court.name,
    isVisible: court.isVisible,
    isAvailable: status.isAvailable,
    currentReservation: status.activeReservation ? {
      startTime: status.activeReservation.startTime,
      userIds: status.activeReservation.usernames || [],
      type: status.activeReservation.usernames?.length === 1 ? 'half' : 'full',
      option: 'queue'
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
        isVisible: true,
        waitlist: []
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
    
    // Fetch only visible courts (no populate needed in unified system)
    const courts = await Court.find({ isVisible: true })
      .sort({ name: 1 });

    // Transform the data using unified queue logic
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
    
    // Fetch all courts (including invisible, no populate needed in unified system)
    const courts = await Court.find()
      .sort({ name: 1 });

    // Transform the data using unified queue logic
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