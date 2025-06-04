const PSTTimeUtils = require('./utils/pstTime');
const Court = require('./models/Court');
const Reservation = require('./models/Reservation');
const mongoose = require('mongoose');
require('dotenv').config();

async function debugExpiration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const courtId = '681080e60540941d24e662af';
    const court = await Court.findById(courtId);
    
    if (!court) {
      console.log('❌ Court not found');
      return;
    }

    console.log('🏓 Court:', court.name);
    console.log('📝 Waitlist length:', court.waitlist.length);

    if (court.waitlist.length === 0) {
      console.log('✅ No waitlist entries');
      return;
    }

    // Get current PST time
    const nowPST = PSTTimeUtils.getPSTTime();
    const nowPSTString = PSTTimeUtils.getPSTTimeString(nowPST);
    
    console.log('\n⏰ Current PST Time:', nowPSTString);

    // Find Nightingale, Reindeer specifically
    const sortedQueue = court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    const nightingaleEntry = sortedQueue.find(entry => 
      entry.usernames.includes('Nightingale') && entry.usernames.includes('Reindeer')
    );
    
    if (!nightingaleEntry) {
      console.log('❌ Nightingale, Reindeer entry not found');
      return;
    }
    
    console.log('\n👥 Found Entry (Position ' + nightingaleEntry.waitlistIndex + '):', nightingaleEntry.usernames.join(', '));
    console.log('🔗 Reservation ID:', nightingaleEntry.reservationId);
    
    // Check and modify their reservation
    if (nightingaleEntry.reservationId) {
      const reservation = await Reservation.findById(nightingaleEntry.reservationId);
      if (reservation) {
        console.log('\n📋 BEFORE Modification:');
        console.log('   Start Time (PST):', PSTTimeUtils.getPSTTimeString(reservation.startTime));
        console.log('   End Time (PST):', PSTTimeUtils.getPSTTimeString(reservation.endTime));
        
        // Modify endTime to 15 minutes after start (instead of default 30) 
        const fifteenMinutesAfterStart = new Date(reservation.startTime.getTime() + (15 * 60 * 1000));
        await Reservation.findByIdAndUpdate(nightingaleEntry.reservationId, {
          endTime: fifteenMinutesAfterStart
        });
        console.log('\n🔧 MODIFIED End Time to:', PSTTimeUtils.getPSTTimeString(fifteenMinutesAfterStart));
        console.log('   (Changed from 30 minutes to 15 minutes duration)');
        
        // Verify modification
        const updatedReservation = await Reservation.findById(nightingaleEntry.reservationId);
        console.log('\n✅ Verification:');
        console.log('   Updated End Time (PST):', PSTTimeUtils.getPSTTimeString(updatedReservation.endTime));
        console.log('   Duration: 15 minutes (instead of default 30)');
        console.log('   Next entry should start at:', PSTTimeUtils.getPSTTimeString(updatedReservation.endTime));
        
      } else {
        console.log('\n❌ Reservation not found in database');
      }
    } else {
      console.log('\n❌ No reservation ID linked to waitlist entry');
    }
    
    // Show current waitlist positions and times
    console.log('\n📋 Current Waitlist:');
    court.waitlist.forEach((entry, index) => {
      console.log(`   ${entry.waitlistIndex}. ${entry.usernames.join(', ')} - ${PSTTimeUtils.getPSTTimeString(entry.startTime)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugExpiration(); 