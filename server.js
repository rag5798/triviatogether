const express = require('express');
const app = express();
const PORT = 3000;
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv').config();

const static = require('./routes/static');
const quizRoute = require('./routes/gameRoute');
const utilities = require('./utilities/index');
const homeController = require('./controllers/homeController');

// Early middlewares
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Template setup
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', './layouts/layout');

// Routes
app.use('/', static);
app.use('/quiz', quizRoute);
app.get('/', utilities.handleErrors(homeController.buildHome));

// 404 handler
app.use((req, res, next) => {
  next({ status: 404, message: 'Sorry, we appear to have lost that page.' });
});

// Error handler (must be before listen)
app.use((err, req, res, next) => {
  console.error(`Error at: "${req.originalUrl}": ${err.message}`);
  const message = err.status === 404 ? err.message: 'Oh no! There was a crash. Maybe try a different route?';

  res.status(err.status || 500).render('errors/error', {
    title: err.status || 'Server Error',
    message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});