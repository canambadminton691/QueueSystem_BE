// cron/cleanupScheduler.js
const cleanupOldUsers = require('./cleanupOldUsers');

class CleanupScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * @param intervalHours - how often to run (default = 48 hours)
   */
  start(intervalHours = 48) {
    if (this.isRunning) {
      console.log('Cleanup scheduler is already running');
      return;
    }

    console.log(`🧹 Starting cleanup scheduler - every ${intervalHours} hours`);

    // run immediately once
    this.runOnce();

    // then schedule at interval
    this.intervalId = setInterval(() => this.runOnce(), intervalHours * 60 * 60 * 1000);
    this.isRunning = true;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Cleanup scheduler stopped');
    }
  }

  async runOnce() {
    console.log('🧹 Running one-time cleanup...');
    try {
      const { deletedCount, cutoff } = await cleanupOldUsers();
      console.log(`✅ Cleanup deleted ${deletedCount} users created before ${cutoff} PST`);
    } catch (err) {
      console.error('❌ Cleanup scheduler error:', err);
    }
  }

  getStatus() {
    return { isRunning: this.isRunning, hasInterval: this.intervalId !== null };
  }
}

module.exports = new CleanupScheduler();
