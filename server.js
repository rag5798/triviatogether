const express = require('express');
const app = express();
const PORT = 3000;
const static = require('./routes/static');
const expressLayouts = require('express-ejs-layouts');
const env = require('dotenv').config();
const utilities = require('./utilities/index');
const homeController = require('./controllers/homeController');
const quizRoute = require('./routes/gameRoute');

//Templates
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', './layouts/layout');
app.use('/', static);

//Routes
app.get('/', utilities.handleErrors(homeController.buildHome));
app.use('/quiz', quizRoute);

//Error Route
app.use(async (req, res, next) => {
  next({ status: 404, message: 'Sorry, we appear to have lost that page.' });
});

//Development and Start
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

app.use(async (err, req, res, next) => {
  console.error(`Error at: "${req.originalUrl}": ${err.message}`);
  if (err.status == 404) {
    message = err.message;
  } else {
    message = 'Oh no! There was a crash. Maybe try a different route?';
  }
  res.render('errors/error', {
    title: err.status || 'Server Error',
    message,
  });
});
