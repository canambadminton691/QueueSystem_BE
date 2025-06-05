const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const fetchCourts = require('../utils/fetchCourts');

// const WaitlistManager = require('../utils/waitlistManager');
// const { validateAdmin } = require('../utils/validateAdmin');

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

// Utility function to ensure all courts exist
async function ensureAllCourtsExist() {
  // Ensure all courts exist (1 through 20)
  const existingCourts = await Court.find().sort({ courtNumber: 1 });
  const existingCourtNames = new Set(existingCourts.map(c => c.name));
  
  // Create any missing courts
  const courtsToCreate = [];
  for (let i = 1; i <= 20; i++) {
    const courtName = `Court ${i}`;
    if (!existingCourtNames.has(courtName)) {
      courtsToCreate.push({
        name: courtName,
        courtNumber: i,
        isVisible: true,
        currentReservation: null,
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
    
    // Fetch only visible courts
    const courts = await fetchCourts.fetchCourts({ isVisible: true });

    res.json({ 
      success: true,
      courts: courts
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
    
    // Fetch all courts (including invisible)
    const courts = await fetchCourts.fetchCourts({ isVisible: undefined });

    res.json({ 
      success: true,
      courts: courts,
    });
  } catch (error) {
    console.error('Error fetching all courts:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

module.exports = router;