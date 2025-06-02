const Court = require('../models/Court');
const User = require('../models/User');
const Reservation = require('../models/Reservation');

/**
 * Waitlist Management Utility Functions
 * Provides data structure management for court waitlists
 */

class WaitlistManager {
  
  /**
   * Check if court is available for immediate use (not in waitlist)
   * @param {String} courtId - MongoDB ObjectId of the court
   * @returns {Object} - Availability status and suggestion
   */
  static async checkCourtAvailability(courtId) {
    try {
      const court = await Court.findById(courtId).populate('currentReservation');
      if (!court) {
        throw new Error('Court not found');
      }

      const now = new Date();
      
      // Check if court has active reservation
      if (court.currentReservation) {
        const startTime = new Date(court.currentReservation.startTime);
        const timeDifferenceMinutes = (now - startTime) / (1000 * 60);
        
        // If reservation expired, court is available
        if (timeDifferenceMinutes >= 30) {
          return {
            isAvailable: true,
            suggestion: 'Court is available for immediate use',
            shouldJoinWaitlist: false
          };
        } else {
          return {
            isAvailable: false,
            suggestion: 'Court is in use, join waitlist',
            shouldJoinWaitlist: true,
            reservationEndsAt: new Date(startTime.getTime() + 30 * 60000)
          };
        }
      }

      // Court has no reservation, check waitlist
      if (court.waitlist.length === 0) {
        return {
          isAvailable: true,
          suggestion: 'Court is available for immediate use',
          shouldJoinWaitlist: false
        };
      }

      // Court has waitlist, check if first entry time has passed
      const sortedWaitlist = court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
      const firstEntry = sortedWaitlist[0];
      
      if (now >= new Date(firstEntry.startTime)) {
        return {
          isAvailable: false,
          suggestion: 'Court should be processed for next waitlist entry',
          shouldJoinWaitlist: true,
          nextAvailable: firstEntry.startTime
        };
      }

      return {
        isAvailable: false,
        suggestion: 'Court is reserved, join waitlist',
        shouldJoinWaitlist: true,
        nextAvailable: firstEntry.startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate smart start time for waitlist entry
   * @param {Object} court - Court document
   * @returns {Date} - Calculated start time
   */
  static calculateStartTime(court) {
    const now = new Date();
    
    // If court has active reservation, start after reservation ends + 40 minutes
    if (court.currentReservation) {
      const reservationStart = new Date(court.currentReservation.startTime);
      const reservationEnd = new Date(reservationStart.getTime() + 30 * 60000); // 30 min reservation
      
      if (court.waitlist.length === 0) {
        // First waitlist entry: reservation end time + 40 minutes
        return new Date(reservationEnd.getTime() + 40 * 60000);
      }
    }
    
    // If there are existing waitlist entries, use last entry's time + 40 minutes
    if (court.waitlist.length > 0) {
      const sortedWaitlist = court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
      const lastEntry = sortedWaitlist[sortedWaitlist.length - 1];
      return new Date(new Date(lastEntry.startTime).getTime() + 40 * 60000);
    }
    
    // No reservation and no waitlist - immediate availability
    return now;
  }

  /**
   * Check if users are already in any waitlist (individual users or as same group)
   * @param {Array} usernames - Array of username strings
   * @param {String} excludeCourtId - Optional court ID to exclude from check
   * @returns {Object} - Check result
   */
  static async checkForDuplicateWaitlists(usernames, excludeCourtId = null) {
    try {
      const query = excludeCourtId ? { _id: { $ne: excludeCourtId } } : {};
      const courts = await Court.find(query);
      
      const conflicts = [];
      const sortedUsernames = [...usernames].sort(); // Sort for comparison
      
      for (const court of courts) {
        for (const entry of court.waitlist) {
          // Check for individual user conflicts
          for (const username of usernames) {
            if (entry.usernames.includes(username)) {
              conflicts.push({
                type: 'individual_user',
                username,
                courtId: court._id,
                courtName: court.name,
                waitlistIndex: entry.waitlistIndex,
                startTime: entry.startTime,
                conflictingGroup: entry.usernames
              });
            }
          }
          
          // Check for exact same group (regardless of order)
          const sortedEntryUsernames = [...entry.usernames].sort();
          if (sortedUsernames.length === sortedEntryUsernames.length && 
              sortedUsernames.every((user, index) => user === sortedEntryUsernames[index])) {
            conflicts.push({
              type: 'same_group',
              group: usernames,
              courtId: court._id,
              courtName: court.name,
              waitlistIndex: entry.waitlistIndex,
              startTime: entry.startTime,
              message: 'Exact same user group already in waitlist'
            });
          }
        }
      }
      
      // Remove duplicate conflicts (same user might be reported multiple times)
      const uniqueConflicts = conflicts.filter((conflict, index, self) => 
        index === self.findIndex(c => 
          c.type === conflict.type && 
          c.courtId.toString() === conflict.courtId.toString() && 
          c.waitlistIndex === conflict.waitlistIndex
        )
      );
      
      return {
        hasConflicts: uniqueConflicts.length > 0,
        conflicts: uniqueConflicts
      };
      
    } catch (error) {
      return {
        hasConflicts: false,
        error: error.message
      };
    }
  }

  /**
   * Process automatic waitlist progression for all courts
   * @returns {Object} - Processing results
   */
  static async processWaitlistProgression() {
    try {
      const courts = await Court.find({}).populate('currentReservation');
      const now = new Date();
      const processed = [];
      
      for (const court of courts) {
        // Skip if court has active reservation
        if (court.currentReservation) {
          const startTime = new Date(court.currentReservation.startTime);
          const timeDifferenceMinutes = (now - startTime) / (1000 * 60);
          
          if (timeDifferenceMinutes < 30) {
            continue; // Still in use
          } else {
            // Reservation expired, clean it up
            await Reservation.findByIdAndDelete(court.currentReservation._id);
            court.currentReservation = null;
            court.isAvailable = true;
          }
        }
        
        // Check if first waitlist entry should become active
        if (court.waitlist.length > 0) {
          const sortedWaitlist = court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
          const firstEntry = sortedWaitlist[0];
          
          if (now >= new Date(firstEntry.startTime)) {
            // Update the existing reservation to be active instead of creating new one
            if (firstEntry.reservationId) {
              const existingReservation = await Reservation.findById(firstEntry.reservationId);
              if (existingReservation) {
                // Update the reservation start time to now (since it's ready)
                existingReservation.startTime = now;
                await existingReservation.save();
                
                // Update court
                court.currentReservation = existingReservation._id;
                court.isAvailable = false;
              }
            } else {
              // Fallback: create new reservation if no linked reservation exists
              const reservation = new Reservation({
                userIds: firstEntry.usernames,
                type: firstEntry.usernames.length === 1 ? 'half' : 'full',
                startTime: now,
                courtId: court._id
              });
              
              await reservation.save();
              
              // Update court
              court.currentReservation = reservation._id;
              court.isAvailable = false;
            }
            
            // Remove first entry from waitlist and reorder
            court.waitlist.splice(0, 1);
            await this.reorderWaitlistIndices(court);
            
            processed.push({
              courtId: court._id,
              courtName: court.name,
              activatedUsers: firstEntry.usernames,
              remainingWaitlist: court.waitlist.length,
              reservationId: firstEntry.reservationId || 'created_new'
            });
          }
        }
        
        await court.save();
      }
      
      return {
        success: true,
        processedCount: processed.length,
        processed
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add users to a court's waitlist with smart logic
   * @param {String} courtId - MongoDB ObjectId of the court
   * @param {Array} usernames - Array of username strings
   * @returns {Object} - Success status and waitlist entry
   */
  static async addToWaitlist(courtId, usernames) {
    try {
      // Validate users first
      const validUsers = await User.find({ 
        animalName: { $in: usernames },
        expiresAt: { $gt: new Date() }
      });

      if (validUsers.length !== usernames.length) {
        throw new Error('One or more users are not registered or have expired');
      }

      // Check for duplicate waitlists
      const duplicateCheck = await this.checkForDuplicateWaitlists(usernames, null); // Check all courts
      if (duplicateCheck.hasConflicts) {
        const individualUserConflicts = duplicateCheck.conflicts.filter(c => 
          c.type === 'individual_user' && c.courtId.toString() !== courtId.toString()
        );
        const sameGroupConflicts = duplicateCheck.conflicts.filter(c => 
          c.type === 'same_group'
        );
        
        let errorMessage = '';
        if (sameGroupConflicts.length > 0) {
          errorMessage = `Same user group already in waitlist at ${sameGroupConflicts[0].courtName} (position ${sameGroupConflicts[0].waitlistIndex})`;
        } else if (individualUserConflicts.length > 0) {
          errorMessage = `Users already in waitlist: ${individualUserConflicts.map(c => `${c.username} at ${c.courtName}`).join(', ')}`;
        }
        
        throw new Error(errorMessage);
      }

      // Find court
      const court = await Court.findById(courtId).populate('currentReservation');
      if (!court) {
        throw new Error('Court not found');
      }

      // Check if court is available for immediate use
      const availability = await this.checkCourtAvailability(courtId);
      if (availability.isAvailable && !availability.shouldJoinWaitlist) {
        return {
          success: false,
          error: 'Court is available for immediate use. Please make a reservation instead of joining waitlist.',
          suggestion: 'Use the reservation API to book this court now'
        };
      }

      // Calculate smart start time
      const startTime = this.calculateStartTime(court);

      // Generate next waitlist index
      const nextIndex = this.getNextWaitlistIndex(court.waitlist);

      // Create reservation in Reservations schema for the future booking
      const reservation = new Reservation({
        courtId: courtId,
        userIds: usernames,
        type: usernames.length === 1 ? 'half' : 'full',
        startTime: startTime,
        option: 'queue' // Mark as queue-based reservation
      });
      
      await reservation.save();

      // Create waitlist entry with reference to the reservation
      const waitlistEntry = {
        waitlistIndex: nextIndex,
        usernames: usernames,
        startTime: startTime,
        reservationId: reservation._id // Link to the actual reservation
      };

      // Add to court's waitlist array
      court.waitlist.push(waitlistEntry);
      await court.save();

      return {
        success: true,
        waitlistEntry,
        reservation: {
          id: reservation._id,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          type: reservation.type
        },
        position: nextIndex,
        estimatedStartTime: startTime,
        message: 'Successfully joined waitlist with reservation created'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Drop a user from waitlist (user-initiated)
   * @param {String} courtId - MongoDB ObjectId of the court
   * @param {String} username - Username to remove from waitlist
   * @returns {Object} - Success status and operation details
   */
  static async dropUserFromWaitlist(courtId, username) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      let userFound = false;
      let entryModified = false;
      let removedEntries = [];

      // Find the user in waitlist entries and remove them
      for (let i = court.waitlist.length - 1; i >= 0; i--) {
        const entry = court.waitlist[i];
        const userIndex = entry.usernames.indexOf(username);
        
        if (userIndex !== -1) {
          userFound = true;
          // Remove the user from this entry
          entry.usernames.splice(userIndex, 1);
          entryModified = true;

          // If entry becomes empty, mark it for removal and delete reservation
          if (entry.usernames.length === 0) {
            // Delete the linked reservation
            if (entry.reservationId) {
              await Reservation.findByIdAndDelete(entry.reservationId);
            }
            
            removedEntries.push({
              waitlistIndex: entry.waitlistIndex,
              wasEmpty: true,
              reservationDeleted: !!entry.reservationId
            });
            court.waitlist.splice(i, 1);
          } else {
            // Update the existing reservation with remaining users
            if (entry.reservationId) {
              await Reservation.findByIdAndUpdate(entry.reservationId, {
                userIds: entry.usernames,
                type: entry.usernames.length === 1 ? 'half' : 'full'
              });
            }
          }
        }
      }

      if (!userFound) {
        throw new Error('User not found in any waitlist for this court');
      }

      // Reorder indices and recalculate start times after removal
      if (removedEntries.length > 0 || entryModified) {
        await this.reorderWaitlistIndices(court);
        await this.recalculateStartTimes(court);
      }

      await court.save();

      return {
        success: true,
        message: `User ${username} successfully dropped from waitlist`,
        userRemoved: username,
        entriesCleanedUp: removedEntries.length,
        cleanedEntries: removedEntries,
        waitlistReordered: removedEntries.length > 0,
        remainingWaitlist: court.waitlist.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recalculate start times for all waitlist entries
   * @param {Object} court - Court document with waitlist
   * @returns {void}
   */
  static async recalculateStartTimes(court) {
    if (court.waitlist.length === 0) return;
    
    // Sort by index first
    court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    
    // Calculate start time for first entry
    let baseTime;
    if (court.currentReservation) {
      const reservationStart = new Date(court.currentReservation.startTime);
      if (isNaN(reservationStart.getTime())) {
        // If reservation start time is invalid, use current time
        baseTime = new Date();
      } else {
        baseTime = new Date(reservationStart.getTime() + 30 * 60000 + 40 * 60000); // reservation end + 40min
      }
    } else {
      baseTime = new Date(); // Now
    }
    
    // Update start times
    court.waitlist.forEach((entry, index) => {
      if (index === 0) {
        entry.startTime = baseTime;
      } else {
        entry.startTime = new Date(baseTime.getTime() + (index * 40 * 60000));
      }
    });
  }

  /**
   * Remove entry from waitlist by index with automatic cleanup and reordering
   * @param {String} courtId - MongoDB ObjectId of the court
   * @param {Number} waitlistIndex - Index of the waitlist entry to remove
   * @returns {Object} - Success status and removed entry
   */
  static async removeFromWaitlistWithCleanup(courtId, waitlistIndex) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      // Find and remove the entry
      const entryIndex = court.waitlist.findIndex(
        entry => entry.waitlistIndex === parseInt(waitlistIndex)
      );

      if (entryIndex === -1) {
        throw new Error('Waitlist entry not found');
      }

      const removedEntry = court.waitlist[entryIndex];
      
      // Delete the linked reservation
      if (removedEntry.reservationId) {
        await Reservation.findByIdAndDelete(removedEntry.reservationId);
      }
      
      court.waitlist.splice(entryIndex, 1);

      // Reorder indices and recalculate start times after removal
      await this.reorderWaitlistIndices(court);
      await this.recalculateStartTimes(court);
      await court.save();

      return {
        success: true,
        message: 'Successfully removed from waitlist and reordered indices',
        removedEntry: removedEntry,
        waitlistReordered: true,
        remainingWaitlist: court.waitlist.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove entry from waitlist by index (legacy method)
   * @param {String} courtId - MongoDB ObjectId of the court
   * @param {Number} waitlistIndex - Index of the waitlist entry to remove
   * @returns {Object} - Success status and removed entry
   */
  static async removeFromWaitlist(courtId, waitlistIndex) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      // Find and remove the entry
      const entryIndex = court.waitlist.findIndex(
        entry => entry.waitlistIndex === parseInt(waitlistIndex)
      );

      if (entryIndex === -1) {
        throw new Error('Waitlist entry not found');
      }

      const removedEntry = court.waitlist[entryIndex];
      court.waitlist.splice(entryIndex, 1);
      await court.save();

      return {
        success: true,
        removedEntry
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reorder waitlist indices to maintain continuous numbering
   * @param {Object} court - Court document with waitlist
   * @returns {void}
   */
  static async reorderWaitlistIndices(court) {
    // Sort by current index and reassign sequential indices
    court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    
    court.waitlist.forEach((entry, index) => {
      entry.waitlistIndex = index + 1;
    });
  }

  /**
   * Clean up empty waitlist entries across all courts
   * @param {String} courtId - Optional: specific court ID, or null for all courts
   * @returns {Object} - Success status and cleanup summary
   */
  static async cleanupEmptyWaitlistEntries(courtId = null) {
    try {
      const query = courtId ? { _id: courtId } : {};
      const courts = await Court.find(query);
      
      let totalCleaned = 0;
      let courtsAffected = 0;

      for (const court of courts) {
        const originalLength = court.waitlist.length;
        
        // Remove empty entries
        court.waitlist = court.waitlist.filter(entry => 
          entry.usernames && entry.usernames.length > 0
        );
        
        const cleanedCount = originalLength - court.waitlist.length;
        
        if (cleanedCount > 0) {
          // Reorder indices after cleanup
          await this.reorderWaitlistIndices(court);
          await this.recalculateStartTimes(court);
          await court.save();
          totalCleaned += cleanedCount;
          courtsAffected++;
        }
      }

      return {
        success: true,
        message: 'Empty waitlist entries cleanup completed',
        totalCleaned,
        courtsAffected
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get next available waitlist index
   * @param {Array} waitlist - Current waitlist array
   * @returns {Number} - Next index number
   */
  static getNextWaitlistIndex(waitlist) {
    if (!waitlist || waitlist.length === 0) {
      return 1;
    }
    return Math.max(...waitlist.map(entry => entry.waitlistIndex)) + 1;
  }

  /**
   * Reorder waitlist entries (for admin use)
   * @param {String} courtId - MongoDB ObjectId of the court
   * @param {Array} newOrder - Array of waitlist indices in new order
   * @returns {Object} - Success status and reordered waitlist
   */
  static async reorderWaitlist(courtId, newOrder) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      // Create a mapping of old indices to entries
      const entryMap = {};
      court.waitlist.forEach(entry => {
        entryMap[entry.waitlistIndex] = entry;
      });

      // Reorder and reassign indices
      const reorderedWaitlist = newOrder.map((oldIndex, position) => {
        const entry = entryMap[oldIndex];
        if (!entry) {
          throw new Error(`Waitlist entry with index ${oldIndex} not found`);
        }
        return {
          ...entry.toObject(),
          waitlistIndex: position + 1
        };
      });

      court.waitlist = reorderedWaitlist;
      await this.recalculateStartTimes(court);
      await court.save();

      return {
        success: true,
        waitlist: reorderedWaitlist
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sorted waitlist for a court
   * @param {String} courtId - MongoDB ObjectId of the court
   * @returns {Object} - Success status and sorted waitlist with metadata
   */
  static async getCourtWaitlist(courtId) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      // Sort waitlist by index and add waiting time
      const now = new Date();
      const sortedWaitlist = court.waitlist
        .sort((a, b) => a.waitlistIndex - b.waitlistIndex)
        .map(entry => ({
          waitlistIndex: entry.waitlistIndex,
          usernames: entry.usernames,
          startTime: entry.startTime,
          waitingTime: Math.floor((now - entry.startTime) / 60000), // minutes
          isReady: now >= new Date(entry.startTime)
        }));

      return {
        success: true,
        court: {
          id: court._id,
          name: court.name,
          isAvailable: court.isAvailable
        },
        waitlist: sortedWaitlist,
        totalWaiting: sortedWaitlist.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Move first person in waitlist to active reservation
   * @param {String} courtId - MongoDB ObjectId of the court
   * @returns {Object} - Success status and next player info
   */
  static async moveNextToReservation(courtId) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      if (court.waitlist.length === 0) {
        throw new Error('No one in waitlist');
      }

      // Sort and get first entry
      const sortedWaitlist = court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
      const nextEntry = sortedWaitlist[0];

      return {
        success: true,
        nextInLine: nextEntry,
        suggestedAction: 'Create reservation for these users',
        remainingWaitlist: sortedWaitlist.length - 1,
        isReady: new Date() >= new Date(nextEntry.startTime)
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all expired waitlist entries (daily cleanup)
   * @param {Number} maxWaitTimeHours - Maximum wait time before removal (default 4 hours)
   * @returns {Object} - Success status and cleanup summary
   */
  static async cleanupExpiredWaitlists(maxWaitTimeHours = 4) {
    try {
      const courts = await Court.find({});
      const cutoffTime = new Date(Date.now() - (maxWaitTimeHours * 60 * 60 * 1000));
      
      let totalRemoved = 0;
      let courtsAffected = 0;

      for (const court of courts) {
        const originalLength = court.waitlist.length;
        
        // Remove expired entries
        court.waitlist = court.waitlist.filter(entry => entry.startTime > cutoffTime);
        
        if (court.waitlist.length !== originalLength) {
          // Reorder indices after removing expired entries
          await this.reorderWaitlistIndices(court);
          await this.recalculateStartTimes(court);
          await court.save();
          totalRemoved += (originalLength - court.waitlist.length);
          courtsAffected++;
        }
      }

      return {
        success: true,
        message: 'Waitlist cleanup completed',
        totalRemoved,
        courtsAffected
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WaitlistManager; 