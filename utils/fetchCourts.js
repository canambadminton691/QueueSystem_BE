const Court = require('../models/Court'); // adjust the path to your model

// Time for the court to become available in minutes
function getTimeToAvailable(court) {
  let lastEndTime = court.currentReservation?.endTime
    ? new Date(court.currentReservation.endTime)
    : null;

  if (court.waitlist && court.waitlist.length > 0) {
    const lastWaitlistEndTime = new Date(
      court.waitlist[court.waitlist.length - 1].endTime
    );

    if (!lastEndTime || lastWaitlistEndTime > lastEndTime) {
      lastEndTime = lastWaitlistEndTime;
    }
  }

  if (lastEndTime && lastEndTime > new Date()) {
    const diffMs = lastEndTime - new Date();
    return Math.ceil(diffMs / (60 * 1000)); // minutes
  }

  return 0;
}


async function fetchCourts({ isVisible } = {}) {

  const query = isVisible === true ? { isVisible: true } : {};

  const courts = await Court.find(query)
    .sort({ courtNumber: 1 })
    .populate('currentReservation')
    .populate('waitlist');

  return courts;
}

async function fetchCourtsView({ isVisible } = {}) {

  const query = isVisible === true ? { isVisible: true } : {};

  const rawCourts = await Court.find(query)
    .sort({ courtNumber: 1 })
    .populate('currentReservation')
    .populate('waitlist');

  const courts = rawCourts.map(courtDoc => {
    const courtObj = courtDoc.toObject(); // 🧠 convert to plain object

    courtObj.isAvailable = courtObj.currentReservation === null;
    courtObj.waitlistCount = courtObj.waitlist.length;

    courtObj.waitlist.sort((a, b) =>
      new Date(a.startTime) - new Date(b.startTime)
    );

    courtObj.timeToAvailable = getTimeToAvailable(courtObj);

    return courtObj;
  });

  return courts;
}

async function fetchCourtViewById(courtId) {
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
  courtObj.timeToAvailable = getTimeToAvailable(courtObj);
  return courtObj;
}

module.exports = { fetchCourts, fetchCourtsView, fetchCourtViewById };
