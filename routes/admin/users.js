// routes/admin/users.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Court = require('../../models/Court');
// const WaitlistManager = require('../../utils/waitlistManager');
const fetchCourts = require('../../utils/fetchCourts');
const { all } = require('../reserve');

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


async function collectAllUsersFromCourts(courts) {
  const activeUsernames = new Set();

  for (const court of courts) {
    court.currentReservation?.userIds.forEach(user => activeUsernames.add(user));
    court.waitlist?.forEach(res =>
      res.userIds.forEach(user => activeUsernames.add(user))
    );
  }

  const users = await User.find({ animalName: { $in: [...activeUsernames] } });
  const activeUserMap = new Map(users.map(user => [user.animalName, user]));
  
  return { activeUsernames, activeUserMap };

}


router.get('/', validateAdmin, async (req, res) => {
  try {
    // Get current date in PST
    const now = new Date();
    const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const startOfDay = new Date(pstDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Get all courts with waitlists
    const courts = await fetchCourts.fetchCourts({ isVisible: undefined });

    console.log(courts);
    // Get all users registered today
    const allUsers = await User.find({
      createdAt: { $gte: startOfDay }
    });

    // Create a map of active users with their court information using unified queue logic
    const { activeUsernames, activeUserMap } = await collectAllUsersFromCourts(courts);
    console.info('Active users', activeUsernames);

    // Filter out active users to get idle users
    const idleUsers = allUsers.filter(user => !activeUsernames?.has(user.animalName));
    const idleUserMap = new Map(idleUsers.map(user => [user.animalName, user]));
    
    return res.json({
      success: true,
      activeUsers: Object.fromEntries(activeUserMap),
      idleUsers: Object.fromEntries(idleUserMap),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/approve', validateAdmin, async (req, res) => {
  try {
    const { animalName } = req.body;

    if (!animalName) {
      return res.status(400).json({
        success: false,
        error: 'Missing animal name'
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { animalName },
      { isApproved: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: `User with animalName '${animalName}' not found`
      });
    }

    res.json({
      success: true,
      message: `User '${animalName}' has been approved.`,
      user: {
        animalName: updatedUser.animalName,
        isApproved: updatedUser.isApproved
      }
    });

  } catch (error) {
    console.error('Error approving user:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/unapprove', validateAdmin, async (req, res) => {
  try {
    const { animalName } = req.body;

    if (!animalName) {
      return res.status(400).json({
        success: false,
        error: 'Missing animal name'
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { animalName },
      { isApproved: false },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: `User with animalName '${animalName}' not found`
      });
    }

    res.json({
      success: true,
      message: `User '${animalName}' has been unapproved.`,
      user: {
        animalName: updatedUser.animalName,
        isApproved: updatedUser.isApproved
      }
    });

  } catch (error) {
    console.error('Error unapproving user:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
module.exports = router;