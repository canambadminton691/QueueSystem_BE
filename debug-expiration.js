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
    
    // Check and modify actual reservation
    if (head.reservationId) {
      const reservation = await Reservation.findById(head.reservationId);
      if (reservation) {
        console.log('\n📋 BEFORE Modification:');
        console.log('   End Time (PST):', PSTTimeUtils.getPSTTimeString(reservation.endTime));
        
        // Modify endTime to 5 minutes ago to make it expired
        const fiveMinutesAgo = new Date(nowPST.getTime() - (5 * 60 * 1000));
        await Reservation.findByIdAndUpdate(head.reservationId, {
          endTime: fiveMinutesAgo
        });
        console.log('\n🔧 MODIFIED End Time to:', PSTTimeUtils.getPSTTimeString(fiveMinutesAgo));
        console.log('   (Set to 5 minutes ago to make it expired)');
        
        // Verify modification
        const updatedReservation = await Reservation.findById(head.reservationId);
        const isNowExpired = nowPST >= updatedReservation.endTime;
        console.log('\n✅ Verification:');
        console.log('   Updated End Time (PST):', PSTTimeUtils.getPSTTimeString(updatedReservation.endTime));
        console.log('   Is Now Expired?', isNowExpired ? '❌ YES - EXPIRED' : '✅ No');
        
      } else {
        console.log('\n❌ Reservation not found in database');
      }
    } else {
      console.log('\n❌ No reservation ID linked to waitlist entry');
    }
    
    // Show current waitlist positions and times before processing
    console.log('\n📋 Current Waitlist Before Processing:');
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