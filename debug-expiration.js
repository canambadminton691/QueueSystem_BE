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
    console.log('⏰ Current PST ISO:', nowPST.toISOString());

    // Check head entry
    const head = court.waitlist[0];
    console.log('\n👥 Head Entry:', head.usernames.join(', '));
    console.log('🔗 Reservation ID:', head.reservationId);
    console.log('🕐 Head Start Time (ISO):', head.startTime.toISOString());
    console.log('🕐 Head Start Time (PST):', PSTTimeUtils.getPSTTimeString(head.startTime));
    
    // Check actual reservation
    if (head.reservationId) {
      const reservation = await Reservation.findById(head.reservationId);
      if (reservation) {
        console.log('\n📋 Reservation Details:');
        console.log('   Start Time (ISO):', reservation.startTime.toISOString());
        console.log('   Start Time (PST):', PSTTimeUtils.getPSTTimeString(reservation.startTime));
        console.log('   End Time (ISO):', reservation.endTime.toISOString());
        console.log('   End Time (PST):', PSTTimeUtils.getPSTTimeString(reservation.endTime));
        
        // Use actual reservation end time for expiration check
        const actualEndTime = reservation.endTime;
        const isExpiredActual = nowPST >= actualEndTime;
        const timeDiffActual = Math.floor((nowPST - actualEndTime) / (1000 * 60));
        
        console.log('\n🔍 Expiration Check (Using Actual End Time):');
        console.log('   Current Time >= Actual End Time?', isExpiredActual);
        console.log('   Time difference (minutes):', timeDiffActual);
        console.log('   Status:', isExpiredActual ? '❌ EXPIRED' : '✅ Still active');
        
        if (isExpiredActual) {
          console.log('\n🚨 This SHOULD be automatically removed based on actual endTime!');
        }
      } else {
        console.log('\n❌ Reservation not found in database');
      }
    } else {
      console.log('\n❌ No reservation ID linked to waitlist entry');
    }
    
    // Also show calculated end time for comparison
    const calculatedEndTime = new Date(head.startTime.getTime() + (30 * 60 * 1000));
    console.log('\n📊 Calculated End Time (Start + 30 min):');
    console.log('   Calculated End Time (ISO):', calculatedEndTime.toISOString());
    console.log('   Calculated End Time (PST):', PSTTimeUtils.getPSTTimeString(calculatedEndTime));
    
    const isExpiredCalculated = nowPST >= calculatedEndTime;
    console.log('   Would be expired by calculation?', isExpiredCalculated);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugExpiration(); 