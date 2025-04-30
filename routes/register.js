const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { getUniqueAnimalName } = require('../utils/animals');
const { validatePhoneNumber } = require('../utils/validation');

router.post('/', async (req, res) => {
  console.log('Register API called');
  
  try {
    const body = req.body;
    console.log('Request body:', body);

    if (!body.phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    // Validate phone number
    const validation = validatePhoneNumber(body.phoneNumber);
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }

    const cleanedPhone = validation.cleaned;

    // Get current date in PST
    const now = new Date();
    const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const startOfDay = new Date(pstDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    try {
      // Check if user already exists and registered today
      let user = await User.findOne({ 
        phoneNumber: cleanedPhone,
        createdAt: { $gte: startOfDay }
      });
      
      if (user) {
        console.log('Existing user found:', user);
        return res.json({ 
          success: true,
          user: {
            phoneNumber: user.phoneNumber,
            animalName: user.animalName,
            createdAt: user.createdAt
          },
          isExisting: true
        });
      }

      // Delete any old registrations for this phone number
      await User.deleteMany({ 
        phoneNumber: cleanedPhone,
        createdAt: { $lt: startOfDay }
      });

      // Get a unique animal name
      const animalName = await getUniqueAnimalName(User);

      // Create new user
      user = await User.create({
        phoneNumber: cleanedPhone,
        animalName,
        createdAt: now
      });

      console.log('Created new user:', user);

      return res.json({
        success: true,
        user: {
          phoneNumber: user.phoneNumber,
          animalName: user.animalName,
          createdAt: user.createdAt
        },
        isExisting: false
      });

    } catch (error) {
      console.error('Database operation error:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Database operation failed: ${error.message}` 
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false,
      error: `Registration failed: ${error.message}` 
    });
  }
});

module.exports = router;