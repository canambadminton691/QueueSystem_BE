const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const mongoose = require('mongoose');
const fetchCourts = require('../utils/fetchCourts');


function validateAndFormatRequestBody(body) {
  const { courtId, userIds, type, option } = body;

  if (!courtId || !userIds || !type) {
    throw new Error('Missing required fields');
  }

  const formattedUserIds = userIds.map(id =>
    id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()
  );

  if (new Set(formattedUserIds).size !== formattedUserIds.length) {
    throw new Error('Each player must be unique');
  }

  if (formattedUserIds.length === 4 && type === 'half') {
    throw new Error('Must select full court with 4 players')
  }

  return { courtId, formattedUserIds, type, option };
}


async function validateUsersExist(formattedUserIds, session) {
  const now = new Date();
  const pst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  pst.setHours(0, 0, 0, 0);

  const users = await User.find({
    animalName: { $in: formattedUserIds },
    createdAt: { $gte: pst }
  }).session(session);

  if (users.length !== formattedUserIds.length) {
    const found = new Set(users.map(u => u.animalName));
    const invalid = formattedUserIds.filter(id => !found.has(id));
    throw new Error(`The following users are not registered or have expired: ${invalid.join(', ')}`);
  }
}


const areUsersInActiveGames = async (userIds, session) => {
  const now = new Date();
  const activeReservations = await Reservation.find({
    userIds: { $in: userIds },
    endTime: { $gt: now }
  }).session(session);

  return activeReservations.length > 0;
};


const getWaitlistReservationToUpdate = async (waitlist = []) => {
  if (!Array.isArray(waitlist) || waitlist.length === 0) return null;

  // Sort the waitlist by startTime (earliest first)
  const sorted = [...waitlist].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );

  // Find the first reservation that matches the merge criteria
  return sorted.find(reservation =>
    reservation.userIds.length === 2 &&
    reservation.option === 'merge'
  ) || null;
};


const createNewReservationInWaitlist = async ({ court, courtId, userIds, type, option, session }) => {

  // Find the next available start time
  // Sort the waitlist by startTime
  const sortedWaitlist = [...court.waitlist].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );

  // Add currentReservation to the start if it exists
  const fullQueue = court.currentReservation
    ? [court.currentReservation, ...sortedWaitlist]
    : sortedWaitlist;

  const lastReservation = fullQueue[fullQueue.length - 1];
  if (!lastReservation) {
    throw new Error(
      'No preceding or current reservations while trying to add to waitlist.'
    )
  }
  const nextStartTime = lastReservation.endTime;
  
  const [reservation] = await Reservation.create([{
    courtId,
    userIds,
    type,
    option: type === 'half' ? option : null,
    startTime: nextStartTime
  }], { session });

  court.waitlist.push(reservation._id);

  return reservation;
};


async function processReservation({ court, courtId, formattedUserIds, type, option, session }) {
  // Easy case: if no current players on court, create a reservation and grab the court.
  if (!court.currentReservation) {
    const [reservation] = await Reservation.create([{
      courtId,
      userIds: formattedUserIds,
      type,
      option: type === 'half' ? option : null,
      startTime: new Date()
    }], { session });

    court.currentReservation = reservation._id;
    return;
  }

  // There are players on court already, then:

  // If the requester is signing up for half court
  if (type === 'half' && option === 'merge') {
    // And if the current on-court players are short by 2 ppl & willing to merge
    if (court.currentReservation.userIds.length === 2
      && court.currentReservation.option === 'merge') {
      // Directly add the requester to the current reservation
      await Reservation.findByIdAndUpdate(
        court.currentReservation._id,
        { $push: { userIds: { $each: formattedUserIds } } },
        { session }
      );
      return;
    }

    // Else, need to check the waitlist
    const waitlistRes = await getWaitlistReservationToUpdate(court.waitlist);

    if (waitlistRes) {  
      // Has a waitlist reservation to merge
      await Reservation.findByIdAndUpdate(
        waitlistRes._id,
        { $push: { userIds: { $each: formattedUserIds } } },
        { session }
      );
    } else {  
      // No waitlist reservation to merge, or waitlist is empty, then add a new reservation.
      await createNewReservationInWaitlist({ court, courtId, userIds: formattedUserIds, type, option, session });
    }

    return;
  }

  // Requester is signing up for full court, always add to the waitlist
  await createNewReservationInWaitlist({ court, courtId, userIds: formattedUserIds, type, option, session });
}


router.post('/', async (req, res) => {
  if (!req.body) return res.status(400).json({ error: 'Missing request body' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courtId, formattedUserIds, type, option } = validateAndFormatRequestBody(req.body);

    const court = await Court.findById(courtId)
      .populate('currentReservation')
      .populate('waitlist')
      .session(session);

    if (!court) throw new Error('Court not found');

    await validateUsersExist(formattedUserIds, session);

    if (await areUsersInActiveGames(formattedUserIds, session)) {
      throw new Error('Some users are already in active games.');
    }

    await processReservation({ court, courtId, formattedUserIds, type, option, session });

    await court.save({ session });
    await session.commitTransaction();

    const updatedCourt = await fetchCourts.fetchCourtById(courtId);

    res.json({ success: true, court: updatedCourt });

  } catch (error) {
    await session.abortTransaction();
    console.error('Reservation error:', error);
    res.status(400).json({ error: error.message || 'Failed to create reservation' });
  } finally {
    session.endSession();
  }
});

module.exports = router;