const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const mongoose = require('mongoose');

router.post('/', async (req, res) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courtId, userIds, type, option } = req.body;
    
    console.log('Reservation request:', { courtId, userIds, type, option });

    // Basic validation
    if (!courtId || !userIds || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
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

    // Find the court and lock it for update
    const court = await Court.findById(courtId).session(session);
    if (!court) {
      await session.abortTransaction();
      return res.status(404).json({ 
        error: 'Court not found' 
      });
    }

    // Double-check court availability (race condition protection)
    if (!court.isAvailable) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Court is no longer available' 
      });
    }

    // Validate users exist and are not expired within the transaction
    const currentTime = new Date();
    const pstDate = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const startOfDay = new Date(pstDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const validUsers = await User.find({
      animalName: { $in: formattedUserIds },
      createdAt: { $gte: startOfDay }
    }).session(session);

    if (validUsers.length !== formattedUserIds.length) {
      await session.abortTransaction();
      const foundUsernames = new Set(validUsers.map(u => u.animalName));
      const invalidUsers = formattedUserIds.filter(id => !foundUsernames.has(id));
      return res.status(400).json({
        error: `The following users are not registered or have expired: ${invalidUsers.join(', ')}`
      });
    }

    // Check if users are already in active games within the transaction
    const activeCourts = await Court.find({ 
      isAvailable: false,
      'currentReservation.userIds': { $in: formattedUserIds }
    }).session(session);

    if (activeCourts.length > 0) {
      await session.abortTransaction();
      const busyUsers = formattedUserIds.filter(userId => 
        activeCourts.some(court => 
          court.currentReservation?.userIds.includes(userId)
        )
      );
      return res.status(400).json({ 
        error: `The following users are already in active courts: ${busyUsers.join(', ')}` 
      });
    }

    // Create reservation within the transaction
    const reservation = await Reservation.create([{
      courtId,
      userIds: formattedUserIds,
      type,
      option: type === 'half' ? option : null,
      startTime: new Date()
    }], { session });

    // Update court within the transaction
    court.isAvailable = false;
    court.currentReservation = reservation[0]._id;
    await court.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    // Get the updated court with populated reservation
    const updatedCourt = await Court.findById(courtId).populate('currentReservation');

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
    // Rollback the transaction on error
    await session.abortTransaction();
    console.error('Reservation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create reservation' 
    });
  } finally {
    // End the session
    session.endSession();
  }
});

module.exports = router;