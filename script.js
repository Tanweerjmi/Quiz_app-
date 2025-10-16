// ==== SELECT ELEMENTS ====
const startButton = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const nextButton = document.getElementById('next-btn');
const questionContainerElement = document.getElementById('question-container');
const questionElement = document.getElementById('question');
const answerButtonsElement = document.getElementById('answer-buttons');
const questionNumberElement = document.getElementById('question-number');
const scoreElement = document.getElementById('right-answer');
const endScreen = document.getElementById('end-screen');
const restartButton = document.getElementById('restart-btn');


let questionTime = 59; // time per question (in seconds)
let questionTimer;
const timeDisplay = document.getElementById('time');


let totalTime = 1800; //minutes
let totalTimer;
const totalTimeDisplay = document.getElementById('total-time-value');

let totalQuizTime = 1800; // 30 minutes = 1800 seconds
let totalQuizTimer;
const totalChallengeTimeDisplay = document.getElementById('total-challenge-time');


let shuffledQuestions = [];
let currentQuestionIndex = 0;
let quizScore = 0;


// Save score to leaderboard
function saveScoreToLeaderboard(score) {
  // 🛑 Don’t save invalid or zero scores
  if (score === undefined || score === null || score <= 0) return;

  const leaderboard = JSON.parse(localStorage.getItem('quizLeaderboard')) || [];

  const now = new Date();
  const date = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }); // e.g. "16 Oct 2025"

  const time = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }); // e.g. "03:45:22 PM"

  const dateTime = `${date}, ${time}`;

  leaderboard.push({ score, dateTime });

  // Sort by score descending and keep top 3
  leaderboard.sort((a, b) => b.score - a.score);
  const topThree = leaderboard.slice(0, 3);

  localStorage.setItem('quizLeaderboard', JSON.stringify(topThree));
}


// Display leaderboard on end screen
function showLeaderboard() {
  const leaderboard = JSON.parse(localStorage.getItem('quizLeaderboard')) || [];
  const leaderboardElement = document.getElementById('leaderboard');
  leaderboardElement.innerHTML = '';

  if (leaderboard.length === 0) {
    leaderboardElement.innerHTML = '<li>No scores yet</li>';
    return;
  }

  leaderboard.forEach(item => {
    const li = document.createElement('li');
    li.innerText = `${item.score} points — (${item.dateTime})`; // 👈 show full datetime
    leaderboardElement.appendChild(li);
  });
}

// ==== EVENT LISTENERS ====
startButton.addEventListener('click', startGame);
nextButton.addEventListener('click', () => {
  currentQuestionIndex++;
  setNextQuestion();
});
restartButton.addEventListener('click', restartQuiz);


// ==== HELPER TO DECODE HTML ENTITIES ====
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

    return data.results.map(q => {
      const answers = [
        ...q.incorrect_answers.map(a => ({ text: decodeHTML(a), correct: false })),
        { text: decodeHTML(q.correct_answer), correct: true }
      ];
      answers.sort(() => Math.random() - 1);

      return {
        question: decodeHTML(q.question),
        answers: answers
      };
    });
  } catch (error) {
    console.error("Failed to fetch API questions:", error);
    return [];
  }
}
async function fetchApiQuestions(amount) {
  try {
    const response = await fetch(`https://opentdb.com/api.php?amount=${amount}&difficulty=medium&type=multiple`);
    const data = await response.json();

    return data.results.map(q => ({
      question: decodeHTML(q.question),
      answers: [
        { text: decodeHTML(q.correct_answer), correct: true },
        ...q.incorrect_answers.map(ans => ({ text: decodeHTML(ans), correct: false }))
      ].sort(() => Math.random() - 0.5) // shuffle answers
    }));
  } catch (error) {
    console.error("Failed to fetch API questions:", error);
    return [];
  }
}

// ==== FETCH QUESTIONS FROM LOCAL JSON ====
async function fetchQuestionsFromJSON() {
  try {
    const res = await fetch('questions.json');
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch JSON questions:", error);
    return [];
  }
}

// ==== START GAME ====
async function startGame() {
  startButton.classList.add('hide');
  startScreen.classList.add('hide');
  endScreen.classList.add('hide');
  questionContainerElement.classList.remove('hide');

  quizScore = 0;
  scoreElement.innerText = quizScore;

  startTotalTimer();
  startTotalQuizTimer();

  // Fetch exactly 15 local + 15 API questions
  shuffledQuestions = await getQuizQuestions();
  currentQuestionIndex = 0;

  setNextQuestion();
}



// ==== SHOW NEXT QUESTION ====
function setNextQuestion() {
  resetState();
  showQuestion(shuffledQuestions[currentQuestionIndex]);
  startQuestionTimer(); // 🕒 Start 59s countdown per question

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

// ==== RESET STATE ====
function resetState() {
  nextButton.classList.add('hide');
  while (answerButtonsElement.firstChild) {
    answerButtonsElement.removeChild(answerButtonsElement.firstChild);
  }
}

// ==== SELECT ANSWER ====
function selectAnswer(e) {
  clearInterval(timer);
  clearInterval(questionTimer); // stop timer when user answers
  const selectedButton = e.target;
  const correct = selectedButton.dataset.correct === "true";

  setStatusClass(selectedButton, correct);

  // Disable all buttons and highlight correct answers
  Array.from(answerButtonsElement.children).forEach(button => {
    button.disabled = true;
    if (button.dataset.correct === "true" && button !== selectedButton) {
      button.classList.add("correct");
    }
  });

  if (correct) {
    quizScore++;
    scoreElement.innerText = quizScore;
  }

  if (shuffledQuestions.length > currentQuestionIndex + 1) {
    nextButton.classList.remove('hide');
  } else {
    stopTotalTimer(); // 🛑 stop total per-question timer
  clearInterval(totalQuizTimer); // 🛑 stop 30-min challenge timer
    startButton.innerText = "Restart";
    
   
    
  endScreen.classList.remove('hide'); // 🎯 show end screen
  questionContainerElement.classList.add('hide');
     const totalQuestions = shuffledQuestions.length;
  const accuracy = ((quizScore / totalQuestions) * 100).toFixed(1);
  const scoreText = document.getElementById('final-score-text');
  scoreText.innerHTML = `You scored <b>${quizScore}</b> out of <b>${totalQuestions}</b> (${accuracy}%)`;

  saveScoreToLeaderboard(quizScore);
showLeaderboard();
  
  }
}

// ==== UPDATE QUESTION NUMBER ====
function updateProgress() {
  questionNumberElement.innerText = `Question: ${currentQuestionIndex + 1} / ${shuffledQuestions.length}`;
}

// ==== STATUS CLASS FUNCTIONS ====
function setStatusClass(element, correct) {
  clearStatusClass(element);
  element.classList.add(correct ? "correct" : "wrong");
}

function clearStatusClass(element) {
  element.classList.remove("correct");
  element.classList.remove("wrong");
}


// ==== PER-QUESTION COUNTDOWN TIMER ====
function startQuestionTimer() {
  clearInterval(questionTimer);
  questionTime = 59; // reset timer each question
  timeDisplay.innerText = questionTime;

  questionTimer = setInterval(() => {
    questionTime--;
    timeDisplay.innerText = questionTime;

    if (questionTime <= 0) {
      clearInterval(questionTimer);
      handleTimeUp();
    }
  }, 1000);
}
function handleTimeUp() {
  clearInterval(questionTimer);

  // Hide question area and next button
  questionContainerElement.classList.add('hide');
  nextButton.classList.add('hide');

  // Show End Screen
  endScreen.classList.remove('hide');
    
  clearInterval(totalTimer); // stop old timer

}



// ==== TOTAL QUIZ TIMER ====
function startTotalTimer() {
  clearInterval(totalTimer);
  totalTime = 1800;
  updateTotalTimeDisplay();

  totalTimer = setInterval(() => {
    totalTime--;
    updateTotalTimeDisplay();
  }, 1000);
}

function stopTotalTimer() {
  clearInterval(totalTimer);
}

function updateTotalTimeDisplay() {
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;
  totalTimeDisplay.innerText = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
}
function startTotalQuizTimer() {
  clearInterval(totalQuizTimer);
  totalQuizTime = 1800; // reset to 30 min

  totalQuizTimer = setInterval(() => {
    totalQuizTime--;

    const minutes = Math.floor(totalQuizTime / 60);
    const seconds = totalQuizTime % 60;
    totalChallengeTimeDisplay.innerText = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;

    if (totalQuizTime <= 0) {
      clearInterval(totalQuizTimer);
      endQuizDueToTime();
    }
  }, 1000);
}

function endQuizDueToTime() {
  clearInterval(questionTimer);

  // Hide question area and next button
  questionContainerElement.classList.add('hide');
  nextButton.classList.add('hide');

  // Show End Screen
  endScreen.classList.remove('hide');
    
  clearInterval(totalTimer); // stop old timer

   // 🎯 Show Final Score even if time is up
  const totalQuestions = shuffledQuestions.length;
  const accuracy = ((quizScore / totalQuestions) * 100).toFixed(1);
  const scoreText = document.getElementById('final-score-text');
  scoreText.innerHTML = `You scored <b>${quizScore}</b> out of <b>${totalQuestions}</b> (${accuracy}%)`;

  startButton.classList.remove('hide');
  
}
function handleTimeUp() {
  clearInterval(totalQuizTimer);

  // Hide question area and next button
  questionContainerElement.classList.add('hide');
  nextButton.classList.add('hide');

  // Show End Screen
  endScreen.classList.remove('hide');
    
  clearInterval(totalTimer); // stop old timer

}
function restartQuiz() {
  // 🛑 Stop any old timers before restarting
  clearInterval(questionTimer);
  clearInterval(totalTimer);
  clearInterval(totalQuizTimer);

  // 🧹 Reset timer variables
  questionTime = 59;
  totalTime = 1800;
  totalQuizTime = 1800;

  // 🔁 Hide end screen, show start screen
  endScreen.classList.add('hide');
  questionContainerElement.classList.add('hide');
  startScreen.classList.remove('hide');

  // 🎯 Reset all values
  quizScore = 0;
  scoreElement.innerText = quizScore;
  currentQuestionIndex = 0;
  timeDisplay.innerText = questionTime;
  totalTimeDisplay.innerText = "30:00";
  totalChallengeTimeDisplay.innerText = "30:00";

  // 🟢 Show the Start button again
  startButton.classList.remove('hide');
  startButton.innerText = "Start Quiz";
 
  showLeaderboard();

}


function showEndScreen() {
  questionContainer.classList.add('hide');
  endScreen.classList.remove('hide');
  startButton.classList.remove('hide'); // 👈 show start button again
}

// Restart button logic
restartButton.addEventListener('click', () => {
  endScreen.classList.add('hide');
  startScreen.classList.remove('hide');
  startButton.classList.remove('hide'); // 👈 make sure Start is visible
});
async function getQuizQuestions() {
  const localCount = 15;
  const apiCount = 15;

  // Fetch local questions
  const localQuestions = await fetchQuestionsFromJSON();
  const shuffledLocal = [...localQuestions].sort(() => Math.random() - 0.5);
  const selectedLocal = shuffledLocal.slice(0, localCount);

  // Fetch API questions
  const apiQuestions = await fetchApiQuestions(apiCount); // now returns 15

  // Combine 15 local + 15 API and shuffle
  const allQuestions = [...selectedLocal, ...apiQuestions].sort(() => Math.random() - 0.5);

  return allQuestions;
}




