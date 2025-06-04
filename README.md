# CanAm Backend API

A Node.js/Express backend service for managing tennis court reservations, user registrations, and court waitlists at CanAm Tennis Courts.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Models](#database-models)
- [Project Structure](#project-structure)
- [Development](#development)

## Features

- **Court Management**: Manage 20 tennis courts with availability status
- **User Registration**: Daily user registration with phone number and animal name
- **Reservations**: Make court reservations for singles and doubles matches
- **Queue System**: Global queue management for players waiting to play
- **Waitlist System**: Court-specific waitlists for each court with advanced management
  - User-initiated drop from waitlists
  - Automatic cleanup of empty waitlist entries
  - Automatic reordering of waitlist indices
  - Real-time waitlist position tracking
- **Admin Panel**: Administrative features for court management
- **Auto-cleanup**: Automatic cleanup of expired reservations and users
- **Real-time Status**: Live court availability and reservation status

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **CORS**: Enabled for cross-origin requests
- **Authentication**: Admin password-based authentication
- **Environment**: dotenv for environment management

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd canam-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Start the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001` by default.

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/canam-backend
PORT=3001
NODE_ENV=development
```

## API Documentation

### Base URL
`http://localhost:3001/api`

### Health Check
- **GET** `/` - API service status
- **GET** `/health` - Health check endpoint

### Courts API

#### Get Visible Courts
- **GET** `/courts`
- **Description**: Fetch all visible courts for regular users
- **Response**: Court information json in the format:

```json
{ success : true,
  courts : [
    {
      _id: court._id,
      name: court.name,
      isVisible: court.isVisible,
      isAvailable: court.currentReservation ? false : true,
      currentReservation: court.currentReservation ? {
        startTime: court.currentReservation.startTime,
        userIds: court.currentReservation.usernames || [],
        type: court.currentReservation.type,
        option: 'queue'
      } : null,
      waitlist: court.waitlist || [],
      waitlistCount: (court.waitlist || []).length
    },
    ...,
    ]
}
```

#### Get All Courts (Admin)
- **GET** `/courts/all`
- **Headers**: `x-admin-password: canamadmin`
- **Description**: Fetch all courts including hidden ones (admin only)
- **Response**: Array of all court objects, same as above.

#### Court Waitlist Management
- **POST** `/waitlist/:courtId/join`
- **Body**: `{ "usernames": ["user1", "user2"] }`
- **Description**: Join a court's waitlist

- **POST** `/waitlist/:courtId/drop`
- **Body**: `{ "username": "user1" }`
- **Description**: Drop a user from court's waitlist (user-initiated)

- **GET** `/waitlist/:courtId`
- **Description**: Get current waitlist for a specific court

- **DELETE** `/waitlist/:courtId/:waitlistIndex`
- **Description**: Remove an entry from court waitlist (admin function)

- **GET** `/waitlist`
- **Description**: Get all waitlists across all courts

- **POST** `/waitlist/:courtId/next`
- **Description**: Get next players in line for a court

- **POST** `/waitlist/cleanup/empty`
- **Body**: `{ "courtId": "optional_court_id" }`
- **Description**: Manually trigger cleanup of empty waitlist entries

- **GET** `/waitlist/debug/user/:username`
- **Description**: Find which waitlists a user is currently in (debugging)

### User Registration API

#### Register User
- **POST** `/register`
- **Body**: `{ "phoneNumber": "1234567890", "animalName": "Tiger" }`
- **Description**: Register a new user for the day
- **Response**: User object with registration details

#### Validate User
- **POST** `/validate-users`
- **Body**: `{ "userIds": ["Tiger", "Lion"] }`
- **Description**: Validate if users are registered for today

### Reservations API

#### Make Reservation
- **POST** `/reserve`
- **Body**: 
```json
{
  "courtId": "court_object_id",
  "userIds": ["Tiger", "Lion"],
  "type": "doubles",
  "option": "challenge"
}
```
- **Description**: Make a court reservation

### Queue API

#### Get Active Queue
- **GET** `/queue`
- **Description**: Get all active court reservations with time remaining
- **Response**: Array of active reservations sorted by time remaining

#### Join Queue
- **POST** `/queue/join`
- **Body**: `{ "userIds": ["Tiger"], "type": "singles" }`
- **Description**: Join the global queue

#### Leave Queue
- **DELETE** `/queue/leave`
- **Body**: `{ "userIds": ["Tiger"] }`
- **Description**: Leave the global queue

### Admin API

#### Admin Actions
- **POST** `/admin/toggle-court-visibility/:courtId`
- **Headers**: `x-admin-password: canamadmin`
- **Description**: Toggle court visibility
- **Returns**:

```json
{ 
      success: true,
      court: {
        _id: court._id,
        name: court.name,
        isVisible: court.isVisible,
        isAvailable: court.currentReservation ? false : true,
        currentReservation: court.currentReservation ? {
          startTime: court.currentReservation.startTime,
          userIds: court.currentReservation.userIds,
          type: court.currentReservation.type,
          option: court.currentReservation.option
        } : null
      }
    }
```

- **POST** `/admin/end-reservation`
- **Headers**: `x-admin-password: canamadmin`
- **Body**: `{ "courtId": "court_object_id" }`
- **Description**: Manually end a court reservation

### Utility APIs

#### Merge Players
- **POST** `/merge`
- **Body**: `{ "userIds": ["Tiger", "Lion"], "targetCourtId": "court_id" }`
- **Description**: Merge players from queue to a specific court

#### Active Users
- **GET** `/active-users`
- **Description**: Get all users registered for today

#### Cleanup
- **POST** `/cron/cleanup-courts`
- **Description**: Manual cleanup of expired reservations and users

## Database Models

### User Model
```javascript
{
  phoneNumber: String (required),
  animalName: String (required),
  createdAt: Date (default: now),
  expiresAt: Date (default: end of day PST)
}
```

### Court Model
```javascript
{
  name: String (required),
  isAvailable: Boolean (default: true),
  isVisible: Boolean (default: true),
  currentReservation: ObjectId (ref: 'Reservation'),
  waitlist: [{
    waitlistIndex: Number (required),
    usernames: [String] (required),
    startTime: Date (default: now)
  }]
}
```

### Reservation Model
```javascript
{
  userIds: [String] (required),
  type: String (enum: ['singles', 'doubles']),
  option: String,
  startTime: Date (default: now),
  courtId: ObjectId (ref: 'Court')
}
```

### Queue Model
```javascript
{
  userIds: [String] (required),
  type: String (enum: ['singles', 'doubles']),
  joinedAt: Date (default: now)
}
```

## Project Structure

```
canam-backend/
├── models/
│   ├── User.js          # User registration model
│   ├── Court.js         # Court and waitlist model
│   ├── Reservation.js   # Court reservation model
│   └── Queue.js         # Global queue model
├── routes/
│   ├── register.js      # User registration routes
│   ├── courts.js        # Court management routes
│   ├── reserve.js       # Reservation routes
│   ├── queue.js         # Queue management routes
│   ├── merge.js         # Player merging routes
│   ├── validate-users.js # User validation routes
│   ├── active-users.js  # Active users routes
│   ├── admin/           # Admin-specific routes
│   └── cron/            # Scheduled tasks
├── utils/               # Utility functions
├── scripts/             # Database scripts
├── lib/                 # Library files
├── server.js            # Main server file
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon for automatic restarts on file changes.

### Testing API Endpoints
You can test the API using tools like:
- Postman
- curl
- Thunder Client (VS Code extension)

Example curl command:
```bash
# Get all visible courts
curl http://localhost:3001/api/courts

# Register a user
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"1234567890","animalName":"Tiger"}'
```

### Admin Password
The admin password is currently hardcoded as `canamadmin`. Include this in the `x-admin-password` header for admin endpoints.

### Database Management
- Courts 1-20 are automatically created if they don't exist
- Users expire at the end of each day (PST timezone)
- Reservations automatically expire after 30 minutes
- Cleanup runs automatically and can be triggered manually

### Error Handling
- All endpoints include proper error handling
- 404 errors for unknown routes
- 500 errors for server issues
- Validation errors for invalid data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License





