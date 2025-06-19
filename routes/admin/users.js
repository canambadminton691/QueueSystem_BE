// routes/admin/users.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Court = require('../../models/Court');
// const WaitlistManager = require('../../utils/waitlistManager');
const fetchCourts = require('../../utils/fetchCourts');
const { all } = require('../reserve');
const mongoose = require('mongoose');


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

    // Get all users registered today
    const allUsers = await User.find({
      createdAt: { $gte: startOfDay }
    });

    // Create a map of active users with their court information using unified queue logic
    const { activeUsernames, activeUserMap } = await collectAllUsersFromCourts(courts);

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


function normalizeAnimalName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}


router.post('/approve', validateAdmin, async (req, res) => {
  const { animalName } = req.body;

  if (!animalName) {
    return res.status(400).json({
      success: false,
      error: 'Missing animal name'
    });
  }

  // Get current date in PST
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const startOfDay = new Date(pstDate);
  startOfDay.setHours(0, 0, 0, 0);

  // Start a session if you want transactional safety
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const normalizedName = normalizeAnimalName(animalName);
    // The user needs to be registered today to avoid collision.
    const user = await User.findOne({ 
      animalName: normalizedName,
      createdAt: { $gte: startOfDay }
    }).session(session);
    
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: `User with animalName '${normalizedName}' not found`
      });
    }

    // Flip the approval status
    const newApprovalStatus = !user.isApproved;

    user.isApproved = newApprovalStatus;
    await user.save({ session });

    await session.commitTransaction();

    console.log('Updated user approval status:', {
      animalName: user.animalName,
      isApproved: user.isApproved
    });

    res.json({
      success: true,
      message: `User '${normalizedName}' is now ${newApprovalStatus ? 'approved' : 'unapproved'}.`,
      user: {
        animalName: user.animalName,
        isApproved: user.isApproved
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error toggling approval status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }

});

module.exports = router;