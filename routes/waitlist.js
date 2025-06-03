const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const User = require('../models/User');
const WaitlistManager = require('../utils/waitlistManager');
const PSTTimeUtils = require('../utils/pstTime');

// Check court availability before joining waitlist
router.get('/:courtId/availability', async (req, res) => {
  try {
    const { courtId } = req.params;
    const result = await WaitlistManager.checkCourtAvailability(courtId);
    res.json(result);
  } catch (error) {
    console.error('Error checking court availability:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process automatic waitlist progression (can be called manually or by cron)
router.post('/process-progression', async (req, res) => {
  try {
    const result = await WaitlistManager.processWaitlistProgression();
    res.json(result);
  } catch (error) {
    console.error('Error processing waitlist progression:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if users are in any waitlists
router.post('/check-duplicates', async (req, res) => {
  try {
    const { usernames, excludeCourtId } = req.body;
    
    if (!usernames || !Array.isArray(usernames)) {
      return res.status(400).json({
        success: false,
        error: 'Valid usernames array is required'
      });
    }

    const result = await WaitlistManager.checkForDuplicateWaitlists(usernames, excludeCourtId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Join a court's waitlist
router.post('/:courtId/join', async (req, res) => {
  try {
    const { courtId } = req.params;
    const { usernames } = req.body;

    // Validate input
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid usernames array is required'
      });
    }

    const result = await WaitlistManager.addToWaitlist(courtId, usernames);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error joining waitlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Drop user from waitlist (user-initiated with phone verification)
router.post('/:courtId/drop', async (req, res) => {
  try {
    const { courtId } = req.params;
    const { phoneNumber, animalName } = req.body;

    if (!phoneNumber || !animalName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and animal name are required'
      });
    }

    // Verify user exists with matching phone number and animal name
    const now = PSTTimeUtils.getPSTTime();
    const user = await User.findOne({ 
      phoneNumber: phoneNumber, 
      animalName: animalName,
      expiresAt: { $gt: now } // Make sure user hasn't expired (using PST)
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number and animal name combination, or user has expired'
      });
    }

    // If verification passes, drop the user from waitlist using their animal name
    const result = await WaitlistManager.removeReservation(courtId, animalName);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      ...result,
      message: `User ${animalName} (${phoneNumber}) successfully dropped from waitlist`
    });

  } catch (error) {
    console.error('Error dropping from waitlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get waitlist for a specific court
router.get('/:courtId', async (req, res) => {
  try {
    const { courtId } = req.params;

    const result = await WaitlistManager.getCourtWaitlist(courtId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error getting waitlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove an entry from waitlist (admin function)
router.delete('/:courtId/:waitlistIndex', async (req, res) => {
  try {
    const { courtId, waitlistIndex } = req.params;

    const result = await WaitlistManager.removeFromWaitlistWithCleanup(courtId, waitlistIndex);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error removing from waitlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all waitlists across all courts
router.get('/', async (req, res) => {
  try {
    const courts = await Court.find({ isVisible: true })
      .select('name isAvailable waitlist')
      .sort({ name: 1 });

    // Use PST time for calculations
    const now = PSTTimeUtils.getPSTTime();
    
    const allWaitlists = courts.map(court => {
      const waitlistWithTime = court.waitlist
        .sort((a, b) => a.waitlistIndex - b.waitlistIndex)
        .map(entry => {
          const entryStartTime = PSTTimeUtils.toPSTTime(entry.startTime);
          return {
            waitlistIndex: entry.waitlistIndex,
            usernames: entry.usernames,
            startTime: entry.startTime,
            waitingTime: Math.floor((now - entryStartTime) / 60000), // minutes in PST
            isReady: now >= entryStartTime
          };
        });

      return {
        court: {
          id: court._id,
          name: court.name,
          isAvailable: court.isAvailable
        },
        waitlist: waitlistWithTime,
        totalWaiting: waitlistWithTime.length
      };
    }).filter(court => court.totalWaiting > 0); // Only return courts with waitlists

    res.json({
      success: true,
      courts: allWaitlists,
      totalCourtsWithWaitlists: allWaitlists.length
    });

  } catch (error) {
    console.error('Error getting all waitlists:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Move to next in waitlist (when court becomes available)
router.post('/:courtId/next', async (req, res) => {
  try {
    const { courtId } = req.params;

    const result = await WaitlistManager.moveNextToReservation(courtId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error getting next in waitlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual cleanup of empty waitlist entries
router.post('/cleanup/empty', async (req, res) => {
  try {
    const { courtId } = req.body; // Optional: clean specific court or all courts

    const result = await WaitlistManager.cleanupEmptyWaitlistEntries(courtId);
    
    res.json(result);

  } catch (error) {
    console.error('Error cleaning up empty waitlist entries:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check for users in multiple waitlists (debugging endpoint)
router.get('/debug/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const courts = await Court.find({ isVisible: true });
    const foundIn = [];

    courts.forEach(court => {
      court.waitlist.forEach(entry => {
        if (entry.usernames.includes(username)) {
          foundIn.push({
            courtId: court._id,
            courtName: court.name,
            waitlistIndex: entry.waitlistIndex,
            entryUsers: entry.usernames,
            startTime: entry.startTime
          });
        }
      });
    });

    res.json({
      success: true,
      username: username,
      foundInWaitlists: foundIn,
      totalCount: foundIn.length
    });

  } catch (error) {
    console.error('Error searching for user in waitlists:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 