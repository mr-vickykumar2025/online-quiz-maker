const quizzesKey = "oqm_quizzes";
const sessionKey = "oqm_session";

const views = document.querySelectorAll(".view");
const navViewTriggers = document.querySelectorAll("[data-view]");

const authState = document.getElementById("authState");
const homeStatus = document.getElementById("homeStatus");
const createStatus = document.getElementById("createStatus");
const takeStatus = document.getElementById("takeStatus");

const quizForm = document.getElementById("quizForm");
const questionBlocks = document.getElementById("questionBlocks");
const addQuestionBtn = document.getElementById("addQuestionBtn");

const quizList = document.getElementById("quizList");

const takeTitle = document.getElementById("takeTitle");
const progressText = document.getElementById("progressText");
const questionArea = document.getElementById("questionArea");
const submitAnswerBtn = document.getElementById("submitAnswerBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");

const scoreText = document.getElementById("scoreText");
const resultBreakdown = document.getElementById("resultBreakdown");

let activeQuiz = null;
let questionIndex = 0;
let selectedOptionIndex = null;
let answerLog = [];
let score = 0;

function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getQuizzes() {
  return readLocal(quizzesKey, []);
}

function getSession() {
  return readLocal(sessionKey, null);
}

function clearStatuses() {
  [homeStatus, createStatus, takeStatus].forEach((el) => {
    el.textContent = "";
    el.className = "status";
  });
}

function setStatus(el, message, type = "") {
  el.textContent = message;
  el.className = type ? `status ${type}` : "status";
}

function setView(viewId) {
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  clearStatuses();
  if (viewId === "listView") {
    renderQuizList();
  }
}

function renderAuthState() {
  const session = getSession();
  if (!session) {
    authState.innerHTML = `Not logged in <a class="inline-link" href="login.html">Login</a>`;
    return;
  }

  authState.innerHTML = `Logged in as <strong>${session}</strong> <button id="logoutBtn" class="secondary">Logout</button>`;
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(sessionKey);
    renderAuthState();
    setStatus(homeStatus, "Logged out.", "success");
  });
}

function requireLogin() {
  if (!getSession()) {
    setView("homeView");
    setStatus(homeStatus, "Please login first.", "error");
    setTimeout(() => {
      location.href = "login.html";
    }, 600);
    return false;
  }
  return true;
}

function createQuestionBlock() {
  const index = questionBlocks.children.length + 1;
  const card = document.createElement("div");
  card.className = "question-card";
  card.innerHTML = `
    <h4>Question ${index}</h4>
    <label>
      Question
      <input type="text" class="q-text" required />
    </label>
    <div class="options-grid">
      <label>Option A <input type="text" class="q-option" required /></label>
      <label>Option B <input type="text" class="q-option" required /></label>
      <label>Option C <input type="text" class="q-option" required /></label>
      <label>Option D <input type="text" class="q-option" required /></label>
    </div>
    <label>
      Correct Option
      <select class="q-correct" required>
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
        <option value="3">D</option>
      </select>
    </label>
  `;

  questionBlocks.appendChild(card);
}

function collectQuizData() {
  const title = document.getElementById("quizTitle").value.trim();
  const description = document.getElementById("quizDescription").value.trim();
  const cards = Array.from(questionBlocks.querySelectorAll(".question-card"));

  const questions = cards.map((card) => {
    const text = card.querySelector(".q-text").value.trim();
    const options = Array.from(card.querySelectorAll(".q-option")).map((opt) => opt.value.trim());
    const correctIndex = Number(card.querySelector(".q-correct").value);
    return { text, options, correctIndex };
  });

  if (!title || !description) {
    return { error: "Title and description are required." };
  }

  if (questions.length === 0) {
    return { error: "Add at least one question." };
  }

  const hasEmptyFields = questions.some(
    (q) => !q.text || q.options.some((option) => !option)
  );

  if (hasEmptyFields) {
    return { error: "Fill all question and option fields." };
  }

  return {
    value: {
      id: crypto.randomUUID(),
      title,
      description,
      questions,
      createdBy: getSession(),
      createdAt: new Date().toISOString(),
    },
  };
}

function saveQuiz(quiz) {
  const quizzes = getQuizzes();
  quizzes.push(quiz);
  writeLocal(quizzesKey, quizzes);
}

function renderQuizList() {
  const quizzes = getQuizzes();

  if (quizzes.length === 0) {
    quizList.innerHTML = "<p>No quizzes available yet. Create one first.</p>";
    return;
  }

  quizList.innerHTML = "";
  quizzes.forEach((quiz) => {
    const card = document.createElement("article");
    card.className = "quiz-item";
    const createdDate = new Date(quiz.createdAt).toLocaleString();
    card.innerHTML = `
      <h3>${quiz.title}</h3>
      <p>${quiz.description}</p>
      <p class="quiz-meta">${quiz.questions.length} questions | By ${quiz.createdBy} | ${createdDate}</p>
      <button class="primary">Take Quiz</button>
    `;

    card.querySelector("button").addEventListener("click", () => startQuiz(quiz.id));
    quizList.appendChild(card);
  });
}

function startQuiz(quizId) {
  const quizzes = getQuizzes();
  const quiz = quizzes.find((item) => item.id === quizId);
  if (!quiz) {
    return;
  }

  activeQuiz = quiz;
  questionIndex = 0;
  selectedOptionIndex = null;
  answerLog = [];
  score = 0;
  setView("takeView");
  renderQuestion();
}

function renderQuestion() {
  const question = activeQuiz.questions[questionIndex];
  takeTitle.textContent = activeQuiz.title;
  progressText.textContent = `Question ${questionIndex + 1} of ${activeQuiz.questions.length}`;
  selectedOptionIndex = null;
  submitAnswerBtn.disabled = false;
  nextQuestionBtn.disabled = true;
  setStatus(takeStatus, "");

  questionArea.innerHTML = `
    <h3>${question.text}</h3>
    <div id="answerOptions"></div>
  `;

  const answerOptions = document.getElementById("answerOptions");
  question.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-option";
    btn.textContent = option;
    btn.addEventListener("click", () => {
      selectedOptionIndex = index;
      Array.from(answerOptions.children).forEach((child) => child.classList.remove("selected"));
      btn.classList.add("selected");
    });
    answerOptions.appendChild(btn);
  });
}

function submitAnswer() {
  if (selectedOptionIndex === null) {
    setStatus(takeStatus, "Select an option first.", "error");
    return;
  }

  const question = activeQuiz.questions[questionIndex];
  const isCorrect = selectedOptionIndex === question.correctIndex;

  if (isCorrect) {
    score += 1;
    setStatus(takeStatus, "Correct answer!", "success");
  } else {
    setStatus(
      takeStatus,
      `Incorrect. Correct answer: ${question.options[question.correctIndex]}`,
      "error"
    );
  }

  answerLog.push({
    question: question.text,
    selected: question.options[selectedOptionIndex],
    correct: question.options[question.correctIndex],
    isCorrect,
  });

  submitAnswerBtn.disabled = true;
  nextQuestionBtn.disabled = false;
}

function nextQuestion() {
  questionIndex += 1;
  if (questionIndex < activeQuiz.questions.length) {
    renderQuestion();
    return;
  }

  showResult();
}

function showResult() {
  setView("resultView");
  scoreText.textContent = `Your score: ${score} / ${activeQuiz.questions.length}`;
  resultBreakdown.innerHTML = "";

  answerLog.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "result-item";
    row.innerHTML = `
      <p><strong>Q${i + 1}:</strong> ${item.question}</p>
      <p>Your answer: ${item.selected}</p>
      <p>Correct answer: ${item.correct}</p>
      <p>${item.isCorrect ? "Correct" : "Incorrect"}</p>
    `;
    resultBreakdown.appendChild(row);
  });
}

navViewTriggers.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-view");
    if (target === "createView" && !requireLogin()) {
      return;
    }
    setView(target);
  });
});

addQuestionBtn.addEventListener("click", createQuestionBlock);

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireLogin()) {
    return;
  }

  const result = collectQuizData();
  if (result.error) {
    setStatus(createStatus, result.error, "error");
    return;
  }

  saveQuiz(result.value);
  setStatus(createStatus, "Quiz saved successfully.", "success");
  quizForm.reset();
  questionBlocks.innerHTML = "";
  createQuestionBlock();
});

submitAnswerBtn.addEventListener("click", submitAnswer);
nextQuestionBtn.addEventListener("click", nextQuestion);

createQuestionBlock();
renderAuthState();
renderQuizList();
