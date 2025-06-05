const Court = require('../models/Court'); // adjust the path to your model

async function fetchCourts({ isVisible } = {}) {

  const query = isVisible === true ? { isVisible: true } : {};

  const courts = await Court.find(query)
    .sort({ courtNumber: 1 })
    .populate('currentReservation')
    .populate('waitlist');

  courts.forEach(court => {
    court.isAvailable = court.currentReservation === null;
    court.waitlistCount = court.waitlist.length;
    court.waitlist.sort((res_a, res_b) => new Date(res_a.startTime) - new Date(res_b.startTime));
  });

  return courts;
}

async function fetchCourtById(courtId) {
  const court = await Court.findById(courtId)
    .populate('currentReservation')
    .populate('waitlist');

  if (!court) {
    throw new Error(`Court with ID ${courtId} not found.`);
  }

  const courtObj = court.toObject();
  courtObj.isAvailable = court.currentReservation === null;
  courtObj.waitlistCount = court.waitlist.length;
  courtObj.waitlist.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return courtObj;
}

module.exports = { fetchCourts, fetchCourtById };
