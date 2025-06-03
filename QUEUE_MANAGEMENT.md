# Automatic Queue Management System

## Overview
The CanAm backend now includes an automatic queue management system that checks for expired queue heads (players who have exceeded their 30-minute play time) and removes them without affecting other queue times.

## How It Works

### 1. **Automatic Background Processing** 🤖
- **Frequency**: Checks every 2 minutes
- **What it does**: Scans all courts for expired head reservations
- **Action**: Removes expired heads and promotes next player to active
- **Time preservation**: Does NOT change start times for remaining players

### 2. **Manual Queue Processing** 🔧
You can manually trigger queue processing through API endpoints:

#### Check All Courts
```bash
POST /api/waitlist/auto-process-expired
```

#### Check Specific Court
```bash
POST /api/waitlist/:courtId/check-expired
```

#### Run Scheduler Once (Testing)
```bash
POST /api/waitlist/scheduler/run-once
```

#### Check Scheduler Status
```bash
GET /api/waitlist/scheduler/status
```

## Logic Flow

### When a Queue Head Expires:
1. **Detection**: Current PST time > (head start time + 30 minutes)
2. **Removal**: Remove expired head from queue
3. **Cleanup**: Delete associated reservation from database
4. **Promotion**: Next player becomes new head (with original start time)
5. **Reordering**: Renumber queue indices (1, 2, 3...)
6. **No Time Changes**: All remaining players keep their original start times

### Example:
**Before** (Head expired at 6:30 PM):
- Position 1: Alice, Bob (started 6:00 PM, should end 6:30 PM) ❌ EXPIRED
- Position 2: Charlie (scheduled 6:40 PM)
- Position 3: Dave (scheduled 7:20 PM)

**After** (automatic processing):
- Position 1: Charlie (still scheduled 6:40 PM) ✅ NOW ACTIVE
- Position 2: Dave (still scheduled 7:20 PM)

## API Responses

### Successful Processing:
```json
{
  "success": true,
  "message": "Automatic queue processing completed",
  "totalCourtsProcessed": 2,
  "totalExpiredRemoved": 1,
  "processedCourts": [
    {
      "courtId": "...",
      "courtName": "Court 1",
      "removedEntries": [
        {
          "waitlistIndex": 1,
          "usernames": ["Alice", "Bob"],
          "startTime": "2025-06-02T23:00:00.000Z",
          "expired": true
        }
      ],
      "activatedEntry": {
        "waitlistIndex": 1,
        "usernames": ["Charlie"],
        "startTime": "2025-06-02T23:40:00.000Z"
      },
      "newQueueLength": 2
    }
  ]
}
```

### No Expired Entries:
```json
{
  "success": true,
  "message": "Automatic queue processing completed",
  "totalCourtsProcessed": 0,
  "totalExpiredRemoved": 0,
  "processedCourts": []
}
```

## Console Logs
The system provides detailed console logs:

```
🚀 Starting queue scheduler - checking every 2 minutes
⏰ Checking for expired queue heads...
✅ Processed 1 expired entries across 1 courts
  📍 Court 1: Removed 1 expired entries
    👥 Expired: Alice, Bob (was position 1)
    🎾 Now active: Charlie
```

## Key Features

✅ **Automatic**: Runs every 2 minutes in background  
✅ **Time Preservation**: Doesn't change existing queue times  
✅ **Accurate**: Uses PST local time for all calculations  
✅ **Robust**: Handles database cleanup (removes reservations)  
✅ **Logged**: Detailed console output for monitoring  
✅ **Manual Control**: API endpoints for manual processing  
✅ **Testing**: One-time run capability for testing  

## Benefits

1. **Fair Play**: Ensures 30-minute time limits are enforced
2. **Queue Flow**: Keeps queues moving automatically  
3. **No Manual Intervention**: Works completely automatically
4. **Accurate Timing**: Preserves original queue scheduling
5. **Database Integrity**: Cleans up expired reservations

This system ensures that courts stay active and queues keep moving even when players overstay their time! 