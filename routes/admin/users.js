// routes/admin/users.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Court = require('../../models/Court');
const WaitlistManager = require('../../utils/waitlistManager');

// Admin password validation middleware
const validateAdmin = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];
  
  if (adminPassword !== 'canamadmin') {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid admin password' 
    });
  }
  
  next();
};

router.get('/', validateAdmin, async (req, res) => {
  try {
    // Get current date in PST
    const now = new Date();
    const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const startOfDay = new Date(pstDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Get all courts with waitlists (unified system)
    const courts = await Court.find({});

    // Get all users registered today
    const allUsers = await User.find({
      createdAt: { $gte: startOfDay }
    });

    // Create a map of active users with their court information using unified queue logic
    const activeUsers = [];
    const activeUserSet = new Set();

    courts.forEach(court => {
      if (court.waitlist && court.waitlist.length > 0) {
        // Get court status using unified logic
        const status = WaitlistManager.getCourtStatus(court);
        
        // If court has active reservation (queue head), get those users
        if (status.activeReservation) {
          const courtNumber = parseInt(court.name.replace('Court ', ''));
          
          status.activeReservation.usernames.forEach(username => {
            activeUsers.push({
              username: username,
              courtNumber: courtNumber,
              startTime: status.activeReservation.startTime
            });
            activeUserSet.add(username);
          });
        }
      }
    });

    // Filter out active users to get idle users
    const idleUsers = allUsers.filter(user => !activeUserSet.has(user.animalName));

    return res.json({
      success: true,
      activeUsers,
      idleUsers: idleUsers.map(user => ({
        animalName: user.animalName,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;