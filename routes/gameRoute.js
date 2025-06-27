const express = require('express');
const router = express.Router();
const utilities = require('../utilities');
const gameController = require('../controllers/gameController');

router.get('/home', utilities.handleErrors(gameController.buildGameStart));
router.post('/home', utilities.handleErrors(gameController.validateForm));
router.get("/questions", utilities.handleErrors(gameController.buildQuiz))
router.post("/questions", utilities.handleErrors(gameController.submitAnswer));
router.get('/complete', utilities.handleErrors(gameController.quizComplete));


module.exports = router;
