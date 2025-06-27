const utilities = require('../utilities');
const gameController = {};

gameController.buildGameStart = async function (req, res) {
  const categoryMap = {
    9: 'General Knowledge',
    10: 'Entertainment: Books',
    11: 'Entertainment: Film',
    12: 'Entertainment: Music',
    13: 'Entertainment: Musicals & Theatres',
    14: 'Entertainment: Television',
    15: 'Entertainment: Video Games',
    16: 'Entertainment: Board Games',
    17: 'Science & Nature',
    18: 'Science: Computers',
    19: 'Science: Mathematics',
    20: 'Mythology',
    21: 'Sports',
    22: 'Geography',
    23: 'History',
    24: 'Politics',
    25: 'Art',
    26: 'Celebrities',
    27: 'Animals',
    28: 'Vehicles',
    29: 'Entertainment: Comics',
    30: 'Science: Gadgets',
    31: 'Entertainment: Japanese Anime & Manga',
    32: 'Entertainment: Cartoon & Animations',
  };

  function generateSection(title, filterFn) {
    let section = `<fieldset><legend>${title}</legend>`;
    
    Object.entries(categoryMap)
      .filter(([id, name]) => filterFn(name))
      .forEach(([id, name]) => {
        section += `
          <label>
            <input type="radio" name="category" value="${id}" required> ${name}
          </label><br>`;
      });

    section += `</fieldset>`;
    return section;
  }

  const formHtml = `
    <h1>Select a Quiz Category</h1>
    <form action="/quiz/home" method="POST" id="categoryForm">
      ${generateSection('Entertainment', (name) => name.startsWith('Entertainment'))}
      ${generateSection('Science', (name) => name.startsWith('Science'))}
      ${generateSection('Other', (name) => !name.startsWith('Entertainment') && !name.startsWith('Science'))}
      <button type="submit" id="start-btn">Start Quiz</button>
    </form>
  `;

  res.render('quiz/index', { title: 'Quiz', formHtml });
};

gameController.validateForm = async function (req, res) {
  const categoryId = req.body.category;
  const questions = await utilities.fetchQuestions(categoryId);

  req.session.quiz = {
    category: categoryId,
    currentIndex: 0,
    questions,
    score: 0,
  };

  res.redirect('/quiz/questions');
};

gameController.buildQuiz = async function (req, res) {
  const quiz = req.session.quiz;
  if (!quiz || quiz.currentIndex >= quiz.questions.length) {
    return res.redirect('/quiz/complete');
  }

  const question = quiz.questions[quiz.currentIndex];

  res.render('quiz/questions', {
    title: 'Quiz',
    question,
    currentIndex: quiz.currentIndex + 1,
    total: quiz.questions.length,
  });
};

gameController.submitAnswer = async function (req, res) {
  const quiz = req.session.quiz;
  const userAnswer = req.body.answer;

  if (!quiz) return res.redirect('/quiz/home');

  const currentQ = quiz.questions[quiz.currentIndex];

  // Save user's answer
  quiz.questions[quiz.currentIndex].userAnswer = userAnswer;

  // Update score if correct
  if (userAnswer === currentQ.correctAnswer) {
    quiz.score += 1;
  }

  quiz.currentIndex += 1;
  res.redirect('/quiz/questions');
};

gameController.quizComplete = async function (req, res) {
  const quiz = req.session.quiz;

  if (!quiz || !quiz.questions) {
    return res.redirect('/quiz/home');
  }

  res.render('quiz/complete', {
    title: 'Quiz Complete',
    score: quiz.score,
    total: quiz.questions.length,
    questions: quiz.questions,
  });
};

module.exports = gameController;
