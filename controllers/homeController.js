const utilities = require('../utilities');
const homeController = {};

homeController.buildHome = async function (req, res) {
  res.render('index', { title: 'Home' });
};

module.exports = homeController;
