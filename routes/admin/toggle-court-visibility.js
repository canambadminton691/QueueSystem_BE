// routes/admin/toggle-court-visibility.js
const express = require('express');
const router = express.Router();
const Court = require('../../models/Court');

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
    console.info('Court ID to toggle ', courtId);
    
    if (!courtId) {
      return res.status(400).json({
        success: false,
        error: 'Court ID is required'
      });
    }

    // search corresponding court
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ 
        success: false,
        error: 'Court not found' 
      });
    }
    console.info('Court found', Court)

    // switch court status
    court.isVisible = !court.isVisible;
    await court.save();

    // return newly court object
    return res.json({ 
      success: true,
      court: {
        _id: court._id,
        name: court.name,
        isVisible: court.isVisible,
        isAvailable: court.isAvailable,
        currentReservation: court.currentReservation ? {
          startTime: court.currentReservation.startTime,
          userIds: court.currentReservation.userIds,
          type: court.currentReservation.type,
          option: court.currentReservation.option
        } : null
      }
    });
  } catch (error) {
    console.error('Toggle court visibility error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to toggle court visibility'
    });
  }
});

module.exports = router;