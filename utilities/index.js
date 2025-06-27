const he = require('he');
const Util = {};

/* ****************************************
 * Middleware For Handling Errors
 * Wrap other function in this for
 * General Error Handling
 **************************************** */
Util.handleErrors = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

Util.fetchQuestions = async function (category, amount = 1) {
  console.log(category)
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${category}`;
  console.log(url)
  const response = await fetch(url);
  const data = await response.json();
  console.log(data)

  return data.results.map((q) => {
    const correct = he.decode(q.correct_answer);
    const incorrect = q.incorrect_answers.map(ans => he.decode(ans));

    return {
      questionText: he.decode(q.question),
      correctAnswer: correct,
      choices: this.shuffleChoices([correct, ...incorrect]),
      type: q.type,
      difficulty: q.difficulty,
      category: q.category
    };
  });
};


// Helper to shuffle choices
Util.shuffleChoices = function (array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}


module.exports = Util;
