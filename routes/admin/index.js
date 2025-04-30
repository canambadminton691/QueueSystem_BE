// routes/admin/index.js
const express = require('express');
const router = express.Router();

const resetCourtRoutes = require('./reset-court');
const usersRoutes = require('./users');

router.use('/reset-court', resetCourtRoutes);
router.use('/users', usersRoutes);

module.exports = router;