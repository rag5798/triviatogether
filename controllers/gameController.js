const utilities = require('../utilities');
const gameController = {};

gameController.buildHome = async function (req, res) {
  const categories = [
    'General Knowledge',
    'Entertainment: Books',
    'Entertainment: Film',
    'Entertainment: Music',
    'Entertainment: Musicals & Theatres',
    'Entertainment: Television',
    'Entertainment: Video Games',
    'Entertainment: Board Games',
    'Entertainment: Comics',
    'Entertainment: Japanese Anime & Manga',
    'Entertainment: Cartoon & Animations',
    'Science & Nature',
    'Science: Computers',
    'Science: Mathematics',
    'Science: Gadgets',
    'Mythology',
    'Sports',
    'Geography',
    'History',
    'Politics',
    'Art',
    'Celebrities',
    'Animals',
    'Vehicles',
  ];
  res.render('quiz/index', { title: 'Quiz', categories});
};

module.exports = gameController;
