const express = require('express');
const router = express.Router();
const utilities = require('../utilities');
const gameController = require('../controllers/gameController');

router.get('/home', utilities.handleErrors(gameController.buildHome));

module.exports = router;
