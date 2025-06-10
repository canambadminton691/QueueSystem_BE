// routes/drop.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const PSTTimeUtils = require('../utils/pstTime');
const { fetchCourtViewById } = require('../utils/fetchCourts');

// Drop two players from waitlist with phone verification
router.post('/:courtId/drop', async (req, res) => {
  try {
    const { courtId } = req.params;
    const { phoneNumber1, animalName1, phoneNumber2, animalName2 } = req.body;

    // Sanity Checks
    const validationError = validateInput({ phoneNumber1, animalName1, phoneNumber2, animalName2 });
    if (validationError) return res.status(400).json({ success: false, error: validationError });

    await verifyUsers([ [phoneNumber1, animalName1], [phoneNumber2, animalName2] ]);

    const court = await Court.findById(courtId).populate('currentReservation').populate('waitlist');
    if (!court) return res.status(404).json({ success: false, error: 'Court not found' });

    if (!court.currentReservation || court.waitlist.length === 0) {
        return res.status(404).json({ success: false, error: 'No reservations to drop from' });
    }
    if (court.currentReservation.userIds.includes(animalName1) || court.currentReservation.userIds.includes(animalName2)) {
      return res.status(400).json({ success: false, error: 'Users are currently playing; cannot drop from waitlist' });
    }

    const reservation = court.waitlist.find(res => res.userIds.includes(animalName1));
    if (!reservation || !reservation.userIds.includes(animalName2)) {
      return res.status(404).json({ success: false, error: 'Both users must be in the same waitlist reservation' });
    }

    // Update Reservation
    const updatedReservation = await Reservation.findById(reservation._id);
    updatedReservation.userIds = updatedReservation.userIds.filter(
      id => id !== animalName1 && id !== animalName2
    );
    // We always make the updated Reservation a half court willing to merge.
    // If the reservation is 4 -> 2, this makes sense; if it's 2 -> 0, it will be deleted anyway.
    updatedReservation.type = 'half';
    updatedReservation.option = 'merge';

    if (updatedReservation.userIds.length === 0) {
      await Reservation.findByIdAndDelete(updatedReservation._id);
      court.waitlist = court.waitlist.filter(resId => resId.toString() !== updatedReservation._id.toString());
    } else {
      await updatedReservation.save();
    }

    await shiftWaitlistTimes(court);

    await court.save();

    // Return updated info
    const updatedCourt = await fetchCourtViewById(courtId);
    return res.json({
      success: true,
      message: `Users ${animalName1} and ${animalName2} successfully removed from waitlist`,
      court: updatedCourt
    });

  } catch (error) {
    console.error('Error dropping from waitlist:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// Helper: Validate required fields
function validateInput({ phoneNumber1, animalName1, phoneNumber2, animalName2 }) {
  if (!phoneNumber1 || !animalName1 || !phoneNumber2 || !animalName2) {
    return 'Phone number and animal name for two players are required';
  }
  return null;
}

// Helper: Verify both users are registered and not expired
async function verifyUsers(userPairs) {
  const now = PSTTimeUtils.getPSTTime();
  for (const [phone, name] of userPairs) {
    const user = await User.findOne({
      phoneNumber: phone,
      animalName: name,
      expiresAt: { $gt: now }
    });
    if (!user) throw new Error(`User ${name} with phone ${phone} not found or expired`);
  }
}

// Helper: Shift waitlist reservation times forward to take up freed spots
async function shiftWaitlistTimes(court) {
  const sortedWaitlist = court.waitlist.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  let lastEndTime = court.currentReservation?.endTime || new Date();
  for (const res of sortedWaitlist) {
    if (res.startTime <= lastEndTime) {
      lastEndTime = res.endTime;
      continue;
    }
    res.startTime = new Date(lastEndTime);
    res.endTime = new Date(res.startTime.getTime() + 30 * 60 * 1000);
    lastEndTime = res.endTime;
    await res.save();
  }
}

module.exports = router;
