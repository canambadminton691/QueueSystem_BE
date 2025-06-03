const Court = require('../models/Court');
const User = require('../models/User');
const Reservation = require('../models/Reservation');

/**
 * Waitlist Management Utility Functions
 * Provides data structure management for court waitlists
 */

class WaitlistManager {
  
  /**
   * Get current court status using unified queue logic
   * @param {Object} court - Court document
   * @returns {Object} - Court status information
   */
  static getCourtStatus(court) {
    const now = new Date();
    
    if (!court.waitlist || court.waitlist.length === 0) {
      return {
        isAvailable: true,
        activeReservation: null,
        nextEntry: null,
        queueLength: 0
      };
    }

    // Sort waitlist to ensure proper order
    const sortedQueue = court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    const head = sortedQueue[0];
    const headEndTime = new Date(new Date(head.startTime).getTime() + 30 * 60000); // 30 min duration

    return {
      isAvailable: now >= headEndTime, // Head expired = court available
      activeReservation: now < headEndTime ? head : null, // Head active if not expired
      nextEntry: sortedQueue.length > 1 ? sortedQueue[1] : null,
      queueLength: sortedQueue.length,
      headExpired: now >= headEndTime
    };
  }

  /**
   * Process queue head removal when expired (unified progression)
   * @param {Object} court - Court document
   * @returns {Object} - Processing result
   */
  static async processQueueProgression(court) {
    const status = this.getCourtStatus(court);
    let processed = false;
    let activatedEntry = null;

    // If head is expired, remove it and activate next
    if (status.headExpired && court.waitlist.length > 0) {
      const expiredEntry = court.waitlist[0];
      
      // Remove expired reservation if it exists
      if (expiredEntry.reservationId) {
        await Reservation.findByIdAndDelete(expiredEntry.reservationId);
      }
      
      // Remove head from queue
      court.waitlist.splice(0, 1);
      
      // Reorder remaining entries
      await this.reorderWaitlistIndices(court);
      
      processed = true;
      activatedEntry = court.waitlist.length > 0 ? court.waitlist[0] : null;
      
      // Update court availability
      court.isAvailable = court.waitlist.length === 0;
    }

    return {
      processed,
      expiredEntry: processed ? court.waitlist[0] || null : null,
      activatedEntry,
      queueLength: court.waitlist.length
    };
  }

  /**
   * Check if court is available for immediate use (unified logic)
   * @param {String} courtId - MongoDB ObjectId of the court
   * @returns {Object} - Availability status and suggestion
   */
  static async checkCourtAvailability(courtId) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      // Process any expired entries first
      await this.processQueueProgression(court);
      await court.save();

      const status = this.getCourtStatus(court);

      if (status.isAvailable) {
        return {
          isAvailable: true,
          suggestion: 'Court is available for immediate use',
          shouldJoinWaitlist: false,
          queueLength: status.queueLength
        };
      } else {
        const activeReservation = status.activeReservation;
        const endTime = new Date(new Date(activeReservation.startTime).getTime() + 30 * 60000);
        
        return {
          isAvailable: false,
          suggestion: 'Court is in use, join waitlist',
          shouldJoinWaitlist: true,
          activeReservation: {
            users: activeReservation.usernames,
            endTime: endTime
          },
          nextAvailable: status.nextEntry ? status.nextEntry.startTime : endTime,
          queueLength: status.queueLength
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate smart start time for waitlist entry (unified logic)
   * @param {Object} court - Court document
   * @returns {Date} - Calculated start time
   */
  static calculateStartTime(court) {
    const now = new Date();
    const status = this.getCourtStatus(court);
    
    if (status.queueLength === 0) {
      // Empty queue - immediate activation (start now)
      return now;
    }
    
    // Calculate based on last entry in queue + 40 minutes
    const sortedQueue = court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    const lastEntry = sortedQueue[sortedQueue.length - 1];
    
    // Next entry starts 40 minutes after last entry's start time
    return new Date(new Date(lastEntry.startTime).getTime() + 40 * 60000);
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
   * Process automatic waitlist progression for all courts (unified logic)
   * @returns {Object} - Processing results
   */
  static async processWaitlistProgression() {
    try {
      const courts = await Court.find({});
      const processed = [];
      
      for (const court of courts) {
        const progressionResult = await this.processQueueProgression(court);
        
        if (progressionResult.processed) {
          processed.push({
            courtId: court._id,
            courtName: court.name,
            expiredUsers: progressionResult.expiredEntry ? progressionResult.expiredEntry.usernames : [],
            activatedUsers: progressionResult.activatedEntry ? progressionResult.activatedEntry.usernames : [],
            remainingQueueLength: progressionResult.queueLength
          });
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
        const individualUserConflicts = duplicateCheck.conflicts.filter(c => c.type === 'individual_user');
        const sameGroupConflicts = duplicateCheck.conflicts.filter(c => c.type === 'same_group');
        
        let errorMessage = '';
        if (sameGroupConflicts.length > 0) {
          errorMessage = `Same user group already in waitlist at ${sameGroupConflicts[0].courtName} (position ${sameGroupConflicts[0].waitlistIndex})`;
        } else if (individualUserConflicts.length > 0) {
          // Check if it's the same court - provide different message
          const sameCourt = individualUserConflicts
            .filter(c => c.courtId.toString() === courtId.toString());
          if (sameCourt.length > 0) {
            const conflictUsers = sameCourt.map(c => c.username);
            errorMessage = `Users already in this court's waitlist: ${conflictUsers.join(', ')}`;
          } else {
            errorMessage = `Users already in waitlist: ${individualUserConflicts.map(c => `${c.username} at ${c.courtName}`).join(', ')}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Find court
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      // Check availability using unified logic (this handles progression internally)
      const availability = await this.checkCourtAvailability(courtId);
      
      // In unified system, we allow joining even empty courts (they become head immediately)
      // No need to reject empty courts since joining empty queue = immediate activation

      // Reload court after availability check (which may have processed progression)
      const updatedCourt = await Court.findById(courtId);

      // Calculate smart start time
      const startTime = this.calculateStartTime(updatedCourt);

      // Generate next waitlist index
      const nextIndex = this.getNextWaitlistIndex(updatedCourt.waitlist);

      // Create reservation in Reservations schema for the future booking
      const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes later
      const reservation = new Reservation({
        courtId: courtId,
        userIds: usernames,
        type: usernames.length != 4 ? 'half' : 'full',
        startTime: startTime,
        endTime: endTime,
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
      updatedCourt.waitlist.push(waitlistEntry);
      
      // Mark court as unavailable since we now have an active head
      updatedCourt.isAvailable = false;
      
      await updatedCourt.save();

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
                type: entry.usernames.length != 4 ? 'half' : 'full'
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
   * Recalculate start times for all waitlist entries (unified logic)
   * @param {Object} court - Court document with waitlist
   * @returns {void}
   */
  static async recalculateStartTimes(court) {
    if (court.waitlist.length === 0) return;
    
    // Sort by index first
    court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    
    // Calculate start time for first entry
    let baseTime = new Date(); // Start from now for first entry
    
    // Update start times with 40-minute intervals
    court.waitlist.forEach((entry, index) => {
      if (index === 0) {
        entry.startTime = baseTime;
      } else {
        entry.startTime = new Date(baseTime.getTime() + (index * 40 * 60000));
      }
      
      // Update linked reservation with both start and end time (30-minute duration)
      if (entry.reservationId) {
        const endTime = new Date(entry.startTime.getTime() + 30 * 60000); // 30 minutes later
        Reservation.findByIdAndUpdate(entry.reservationId, {
          startTime: entry.startTime,
          endTime: endTime
        }).exec(); // Run async without waiting
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

  /**
   * Remove a reservation from the queue with proper time recalculation
   * @param {String} courtId - MongoDB ObjectId of the court
   * @param {String} username - Username to remove from the queue
   * @returns {Object} - Success status and operation details
   */
  static async removeReservation(courtId, username) {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      if (court.waitlist.length === 0) {
        throw new Error('No reservations in queue to remove');
      }

      let userFound = false;
      let entireReservationRemoved = false;
      let removedFromHead = false;
      let removedEntries = [];

      // Sort waitlist by index to ensure proper order
      court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);

      // Find the user in waitlist entries and remove them
      for (let i = court.waitlist.length - 1; i >= 0; i--) {
        const entry = court.waitlist[i];
        const userIndex = entry.usernames.indexOf(username);
        
        if (userIndex !== -1) {
          userFound = true;
          const isHead = (entry.waitlistIndex === 1); // Head of queue
          
          // Remove the user from this entry
          entry.usernames.splice(userIndex, 1);

          // Check if entire reservation becomes empty after removal
          if (entry.usernames.length === 0) {
            entireReservationRemoved = true;
            removedFromHead = isHead;
            
            // Delete the linked reservation
            if (entry.reservationId) {
              await Reservation.findByIdAndDelete(entry.reservationId);
            }
            
            removedEntries.push({
              waitlistIndex: entry.waitlistIndex,
              wasEmpty: true,
              reservationDeleted: !!entry.reservationId,
              wasHead: isHead
            });
            
            court.waitlist.splice(i, 1);
          } else {
            // Reservation still has users - just update the reservation, NO TIME CHANGES
            if (entry.reservationId) {
              await Reservation.findByIdAndUpdate(entry.reservationId, {
                userIds: entry.usernames,
                type: entry.usernames.length != 4 ? 'half' : 'full'
              });
            }
            // Don't change any start times since reservation continues
          }
          break; // Exit loop after finding and removing user
        }
      }

      if (!userFound) {
        throw new Error('User not found in any reservation for this court');
      }

      // Only recalculate times if an entire reservation was removed
      if (entireReservationRemoved) {
        // Reorder indices first
        await this.reorderWaitlistIndices(court);

        // Recalculate start times based on removal location
        if (removedFromHead) {
          // Removed head reservation: recalculate ALL times from now
          await this.recalculateStartTimesFromHead(court);
        } else {
          // Removed non-head reservation: only recalculate reservations behind it
          await this.recalculateStartTimesFromPosition(court);
        }
      }

      // Update court availability
      if (court.waitlist.length === 0) {
        court.isAvailable = true;
      }

      await court.save();

      return {
        success: true,
        message: `Reservation for ${username} successfully removed from queue`,
        userRemoved: username,
        entireReservationRemoved: entireReservationRemoved,
        removedFromHead: removedFromHead,
        entriesCleanedUp: removedEntries.length,
        cleanedEntries: removedEntries,
        waitlistReordered: entireReservationRemoved,
        remainingQueue: court.waitlist.length,
        courtNowAvailable: court.waitlist.length === 0,
        timesRecalculated: entireReservationRemoved
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recalculate start times from head (when head is removed)
   * @param {Object} court - Court document with waitlist
   * @returns {void}
   */
  static async recalculateStartTimesFromHead(court) {
    if (court.waitlist.length === 0) return;
    
    // Sort by index first
    court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    
    // Start from now since head was removed
    const now = new Date();
    
    // Update start times with 40-minute intervals starting from now
    court.waitlist.forEach((entry, index) => {
      entry.startTime = new Date(now.getTime() + (index * 40 * 60000));
      
      // Update linked reservation with both start and end time (30-minute duration)
      if (entry.reservationId) {
        const endTime = new Date(entry.startTime.getTime() + 30 * 60000); // 30 minutes later
        Reservation.findByIdAndUpdate(entry.reservationId, {
          startTime: entry.startTime,
          endTime: endTime
        }).exec(); // Run async without waiting
      }
    });
  }

  /**
   * Recalculate start times from a specific position (when non-head is removed)
   * @param {Object} court - Court document with waitlist
   * @returns {void}
   */
  static async recalculateStartTimesFromPosition(court) {
    if (court.waitlist.length === 0) return;
    
    // Sort by index first
    court.waitlist.sort((a, b) => a.waitlistIndex - b.waitlistIndex);
    
    // For non-head removals, maintain existing head time and recalculate from there
    if (court.waitlist.length > 0) {
      const headStartTime = court.waitlist[0].startTime;
      
      // Update start times with 40-minute intervals from head
      court.waitlist.forEach((entry, index) => {
        if (index === 0) {
          // Keep head time unchanged - but still update end time if needed
          if (entry.reservationId) {
            const endTime = new Date(entry.startTime.getTime() + 30 * 60000);
            Reservation.findByIdAndUpdate(entry.reservationId, {
              endTime: endTime
            }).exec();
          }
          return;
        }
        
        entry.startTime = new Date(headStartTime.getTime() + (index * 40 * 60000));
        
        // Update linked reservation with both start and end time (30-minute duration)
        if (entry.reservationId) {
          const endTime = new Date(entry.startTime.getTime() + 30 * 60000); // 30 minutes later
          Reservation.findByIdAndUpdate(entry.reservationId, {
            startTime: entry.startTime,
            endTime: endTime
          }).exec(); // Run async without waiting
        }
      });
    }
  }
}

module.exports = WaitlistManager; 