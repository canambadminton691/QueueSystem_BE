/**
 * PST Time Utility Functions
 * Provides PST timezone handling without circular dependencies
 */

class PSTTimeUtils {
  /**
   * Get current time in Pacific Standard Time (PST/PDT) as a Date object
   * @returns {Date} - Date object representing current time in PST
   */
  static getPSTTime() {
    return new Date();
  }

  /**
   * Get PST local time string for display purposes
   * @param {Date} date - Date to format in PST
   * @returns {string} - PST time string
   */
  static getPSTTimeString(date = null) {
    const targetDate = date || new Date();
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(targetDate);
  }

  /**
   * Convert a time to PST timezone for comparisons
   * @param {Date|string|number} time - Time to convert to PST
   * @returns {Date} - Date object for PST comparisons
   */
  static toPSTTime(time) {
    return new Date(time);
  }

  /**
   * Add minutes to a time
   * @param {Date} time - Date object
   * @param {number} minutes - Minutes to add
   * @returns {Date} - New date object
   */
  static addMinutesToPST(time, minutes) {
    return new Date(time.getTime() + (minutes * 60000));
  }

  /**
   * Compare times in PST timezone
   * @param {Date} time1 - First time
   * @param {Date} time2 - Second time
   * @returns {number} - Comparison result (-1, 0, 1)
   */
  static comparePSTTimes(time1, time2) {
    return time1.getTime() - time2.getTime();
  }
}

module.exports = PSTTimeUtils; 