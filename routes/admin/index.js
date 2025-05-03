// routes/admin/index.js
const express = require('express');
const router = express.Router();

const resetCourtRoutes = require('./reset-court');
const usersRoutes = require('./users');
const toggleCourtVisibilityRoutes = require('./toggle-court-visibility');

router.use('/reset-court', resetCourtRoutes);
router.use('/users', usersRoutes);
router.use('/toggle-court-visibility', toggleCourtVisibilityRoutes);
module.exports = router;