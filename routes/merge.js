const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

router.post('/', async (req, res) => {
  try {
    const { courtId, userIds } = req.body;
    
    // Basic validation
    if (!courtId || !userIds || !Array.isArray(userIds) || userIds.length !== 2) {
      return res.status(400).json({ 
        error: 'Invalid request data' 
      });
    }

    // Format usernames
    const formattedUserIds = userIds.map(id => 
      id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()
    );

    // Check for duplicate users
    if (new Set(formattedUserIds).size !== formattedUserIds.length) {
      return res.status(400).json({ 
        error: 'Each player must be unique' 
      });
    }

    // Validate users exist and are not expired
    const currentTime = new Date();
    const pstDate = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const startOfDay = new Date(pstDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const validUsers = await User.find({
      animalName: { $in: formattedUserIds },
      createdAt: { $gte: startOfDay }
    });

    if (validUsers.length !== formattedUserIds.length) {
      const foundUsernames = new Set(validUsers.map(u => u.animalName));
      const invalidUsers = formattedUserIds.filter(id => !foundUsernames.has(id));
      return res.status(400).json({
        error: `The following users are not registered or have expired: ${invalidUsers.join(', ')}`
      });
    }

    // Check if users are already in active games
    const activeCourts = await Court.find({ isAvailable: false })
      .populate('currentReservation');

    const activeUsers = new Set(
      activeCourts
        .filter(court => court.currentReservation)
        .flatMap(court => court.currentReservation.userIds)
    );

    const busyUsers = formattedUserIds.filter(userId => activeUsers.has(userId));
    if (busyUsers.length > 0) {
      return res.status(400).json({ 
        error: `The following users are already in active courts: ${busyUsers.join(', ')}` 
      });
    }

    // Get the target court and verify it's a half court in use
    const court = await Court.findById(courtId).populate('currentReservation');
    if (!court) {
      return res.status(404).json({ 
        error: 'Court not found' 
      });
    }

    if (court.isAvailable || !court.currentReservation) {
      return res.status(400).json({ 
        error: 'Court is not in use' 
      });
    }

    if (court.currentReservation.type !== 'half') {
      return res.status(400).json({ 
        error: 'Can only merge into a half court' 
      });
    }

    // Update the reservation with new players and change type to full
    const existingUserIds = court.currentReservation.userIds;
    const allUserIds = [...existingUserIds, ...formattedUserIds];
    
    // Update the reservation
    await Reservation.findByIdAndUpdate(court.currentReservation._id, {
      userIds: allUserIds,
      type: 'full'
    });

    // Get the updated court with populated reservation
    const updatedCourt = await Court.findById(courtId)
      .populate('currentReservation');

    return res.json({ 
      success: true,
      court: {
        _id: updatedCourt._id,
        name: updatedCourt.name,
        isAvailable: updatedCourt.isAvailable,
        currentReservation: updatedCourt.currentReservation ? {
          startTime: updatedCourt.currentReservation.startTime,
          userIds: updatedCourt.currentReservation.userIds,
          type: updatedCourt.currentReservation.type,
          option: updatedCourt.currentReservation.option
        } : null
      }
    });

  } catch (error) {
    console.error('Merge error:', error);
    return res.status(500).json({ 
      error: 'Failed to merge into court' 
    });
  }
});

module.exports = router;