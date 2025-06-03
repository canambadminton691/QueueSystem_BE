const WaitlistManager = require('./waitlistManager');

/**
 * Queue Scheduler for automatic expired head removal
 * Checks every few minutes for expired queue heads and removes them
 */
class QueueScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the automatic queue processing
   * @param {number} intervalMinutes - How often to check (default: 2 minutes)
   */
  start(intervalMinutes = 2) {
    if (this.isRunning) {
      console.log('Queue scheduler is already running');
      return;
    }

    console.log(`🚀 Starting queue scheduler - checking every ${intervalMinutes} minutes`);
    
    this.intervalId = setInterval(async () => {
      try {
        console.log('⏰ Checking for expired queue heads...');
        const result = await WaitlistManager.autoProcessExpiredQueues();
        
        if (result.success && result.totalExpiredRemoved > 0) {
          console.log(`✅ Processed ${result.totalExpiredRemoved} expired entries across ${result.totalCourtsProcessed} courts`);
          
          // Log details for each court processed
          result.processedCourts.forEach(court => {
            console.log(`  📍 ${court.courtName}: Removed ${court.removedEntries.length} expired entries`);
            court.removedEntries.forEach(entry => {
              console.log(`    👥 Expired: ${entry.usernames.join(', ')} (was position ${entry.waitlistIndex})`);
            });
            if (court.activatedEntry) {
              console.log(`    🎾 Now active: ${court.activatedEntry.usernames.join(', ')}`);
            }
          });
        } else if (result.success) {
          console.log('✓ No expired entries found');
        } else {
          console.error('❌ Error processing queues:', result.error);
        }
      } catch (error) {
        console.error('❌ Queue scheduler error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    this.isRunning = true;
  }

  /**
   * Stop the automatic queue processing
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Queue scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null
    };
  }

  /**
   * Run a one-time check (for testing)
   */
  async runOnce() {
    console.log('🔍 Running one-time queue check...');
    try {
      const result = await WaitlistManager.autoProcessExpiredQueues();
      console.log('One-time check result:', result);
      return result;
    } catch (error) {
      console.error('One-time check error:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const queueScheduler = new QueueScheduler();

module.exports = queueScheduler; 