const Court = require('../models/Court');
const { fetchCourtsView } = require('./fetchCourts');

async function updateReservationsCron() {
  try {
    const courts = await Court.find({})
      .populate('currentReservation')
      .populate('waitlist');

    const expiredReservations = [];
    const promotedReservations = [];

    const now = new Date();

    for (const court of courts) {
      let updated = false;

      // --- Step 1: Check and expire currentReservation
      if (
        court.currentReservation &&
        new Date(court.currentReservation.endTime) <= now
      ) {
        expiredReservations.push(court.currentReservation.toObject());

        // Clear the current reservation
        court.currentReservation = null;
        updated = true;
      }

      // --- Step 2: Promote next waitlist reservation (if any)
      if (!court.currentReservation && court.waitlist.length > 0) {
        // Sort waitlist
        const sortedWaitlist = [...court.waitlist].sort(
          (a, b) => new Date(a.startTime) - new Date(b.startTime)
        );

        const nextReservation = sortedWaitlist.shift(); // earliest

        if (nextReservation) {
          // Promote it
          court.currentReservation = nextReservation._id;

          // Remove it from the waitlist
          court.waitlist = court.waitlist.filter(r => r._id.toString() !== nextReservation._id.toString());

          promotedReservations.push(nextReservation.toObject());
          updated = true;
        }
      }

      if (updated) {
        await court.save();
      }
    }

    const updatedCourts = await fetchCourtsView({ isVisible: undefined });

    const result = {
      success: true,
      updatedAt: new Date().toISOString(),
      expiredReservations,
      promotedReservations,
      courts: updatedCourts
    };
    // console.log(result);
    return result;

  } catch (err) {
    console.error('Error updating reservations:', err);
    return {
      success: false
    };
  }
}

module.exports = updateReservationsCron;
