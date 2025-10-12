// ==== SELECT ELEMENTS ====
const startButton = document.getElementById('start-btn');
const nextButton = document.getElementById('next-btn');
const questionContainerElement = document.getElementById('question-container');
const questionElement = document.getElementById('question');
const answerButtonsElement = document.getElementById('answer-buttons');
const questionNumberElement = document.getElementById('question-number');
const scoreElement = document.getElementById('right-answer');

let shuffledQuestions = [];
let currentQuestionIndex = 0;
let quizScore = 0;

// ==== EVENT LISTENERS ====
startButton.addEventListener('click', startGame);
nextButton.addEventListener('click', () => {
  currentQuestionIndex++;
  setNextQuestion();
});

// ==== HELPER FUNCTION TO DECODE HTML ENTITIES ====
function decodeHTML(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

// ==== FETCH QUESTIONS FROM API ====
async function fetchQuestionsFromAPI() {
  try {
    const res = await fetch('https://opentdb.com/api.php?amount=20&difficulty=medium&type=multiple');
    const data = await res.json();

    // Convert API results to quiz format
    return data.results.map(q => {
      const answers = [
        ...q.incorrect_answers.map(a => ({ text: decodeHTML(a), correct: false })),
        { text: decodeHTML(q.correct_answer), correct: true }
      ];
      // Shuffle answers
      answers.sort(() => Math.random() - 0.5);

      return {
        question: decodeHTML(q.question),
        answers: answers
      };
    });
  } catch (error) {
    console.error("Failed to fetch questions:", error);
    return [];
  }
}

// ==== START GAME ====
async function startGame() {
  startButton.classList.add('hide');
  questionContainerElement.classList.remove('hide');
  quizScore = 0;
  scoreElement.innerText = quizScore;

  // Fetch questions dynamically
  shuffledQuestions = await fetchQuestionsFromAPI();
  currentQuestionIndex = 0;

  if (shuffledQuestions.length > 0) {
    setNextQuestion();
  } else {
    questionElement.innerText = "Failed to load questions. Please try again.";
  }
}

// ==== SHOW NEXT QUESTION ====
function setNextQuestion() {
  resetState();
  showQuestion(shuffledQuestions[currentQuestionIndex]);
  updateProgress();
}

// ==== SHOW QUESTION ====
function showQuestion(question) {
  questionElement.innerText = question.question;
  question.answers.forEach(answer => {
    const button = document.createElement('button');
    button.innerText = answer.text;
    button.classList.add('btn');
    if (answer.correct) {
      button.dataset.correct = answer.correct;
    }
    button.addEventListener('click', selectAnswer);
    answerButtonsElement.appendChild(button);
  });
}

// ==== RESET BUTTONS AND STATE ====
function resetState() {
  nextButton.classList.add('hide');
  while (answerButtonsElement.firstChild) {
    answerButtonsElement.removeChild(answerButtonsElement.firstChild);
  }
}

// ==== SELECT ANSWER ====
function selectAnswer(e) {
  const selectedButton = e.target;
  const correct = selectedButton.dataset.correct === "true";

  // Highlight only selected button
  setStatusClass(selectedButton, correct);

  // Disable all buttons after click
  Array.from(answerButtonsElement.children).forEach(button => {
    button.disabled = true;
    if (button.dataset.correct === "true" && button !== selectedButton) {
      button.classList.add("correct");
    }
  });

  // Update score
  if (correct) {
    quizScore++;
    scoreElement.innerText = quizScore;
  }

  // Show next or restart
  if (shuffledQuestions.length > currentQuestionIndex + 1) {
    nextButton.classList.remove('hide');
  } else {
    startButton.innerText = "Restart";
    startButton.classList.remove('hide');
  }
}

// ==== UPDATE QUESTION NUMBER ====
function updateProgress() {
  questionNumberElement.innerText = `Question: ${currentQuestionIndex + 1} / ${shuffledQuestions.length}`;
}

// ==== SET BUTTON STATUS ====
function setStatusClass(element, correct) {
  clearStatusClass(element);
  if (correct) {
    element.classList.add("correct");
  } else {
    element.classList.add("wrong");
  }
}

// ==== CLEAR BUTTON STATUS ====
function clearStatusClass(element) {
  element.classList.remove('correct');
  element.classList.remove('wrong');
}
