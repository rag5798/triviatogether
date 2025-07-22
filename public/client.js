const socket = io();
let roomCode = "";
let playerId = "";
let playerName = "";
let hostId = null;
let lastSubmittedAnswer = null;
let countdownInterval = null;
let hasSubmitted = false;
let currentSoloQuestions = [];
let currentSoloIndex = 0;
let currentSoloScore = 0;
let soloCategory = "";
let currentSoloAnswers = [];

function showPage(pageId) {
  const pages = [
    "modeSelectPage",
    "singlePlayerCategoryPage",
    "homePage",
    "lobbyPage",
    "quizPage",
    "summaryPage",
    "soloHistoryPage", // ✅ Add this!
  ];

  pages.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === pageId ? "block" : "none";
  });

  const disconnectContainer = document.getElementById("disconnectContainer");
  if (disconnectContainer) {
    disconnectContainer.style.display =
      pageId === "lobbyPage" ? "block" : "none";
  }
}

function goToSinglePlayer() {
  // You’ll build this page/logic next
  showPage("singlePlayerCategoryPage");
}

function goToMultiplayer() {
  showPage("homePage"); // Reuses existing multiplayer home screen
}

function handleBackToModeSelect() {
  if (playerId && roomCode) {
    socket.emit("leaveRoom", { roomCode, playerId });
    localStorage.removeItem("playerId");
    localStorage.removeItem("roomCode");
    playerId = "";
    roomCode = "";
    hostId = null;
    playerName = "";
    if (countdownInterval) clearInterval(countdownInterval);
    showStatusMessage("Disconnected from multiplayer room.");
  }
  currentSoloQuestions = [];
  currentSoloAnswers = [];
  currentSoloIndex = 0;
  currentSoloScore = 0;
  if (countdownInterval) clearInterval(countdownInterval);
  showPage("modeSelectPage");
}

function startSinglePlayerGame() {
  currentSoloAnswers = [];
  const category = document.getElementById("singlePlayerCategorySelect").value;
  soloCategory = category;

  let apiURL = "https://opentdb.com/api.php?amount=5&type=multiple";
  if (category) apiURL += `&category=${category}`;

  fetch(apiURL)
    .then((res) => res.json())
    .then((data) => {
      currentSoloQuestions = data.results;
      currentSoloIndex = 0;
      currentSoloScore = 0;
      renderSoloQuestion();
    })
    .catch(() => {
      alert("Failed to load quiz. Please try again.");
    });
}

function saveSoloQuizToHistory() {
  const review = currentSoloQuestions.map((q, i) => ({
    question: q.question,
    correct: q.correct_answer,
    answer: currentSoloAnswers[i] || "No answer",
    category: soloCategory,
  }));

  const history = JSON.parse(localStorage.getItem("soloHistory") || "[]");
  history.push({
    timestamp: new Date().toISOString(),
    score: `${currentSoloScore} / ${currentSoloQuestions.length}`,
    category: soloCategory,
    review,
  });

  localStorage.setItem("soloHistory", JSON.stringify(history));
}

function showSoloHistory() {
  const historyList = document.getElementById("soloHistoryList");
  historyList.innerHTML = "";

  const history = JSON.parse(localStorage.getItem("soloHistory") || "[]");

  if (history.length === 0) {
    historyList.innerHTML = "<p>No quiz history yet.</p>";
  } else {
    history
      .slice()
      .reverse()
      .forEach((entry, index) => {
        const container = document.createElement("div");
        container.classList.add("history-entry");

        const header = document.createElement("div");
        header.innerHTML = `
          <h3>Quiz ${history.length - index}</h3>
          <p><strong>Date:</strong> ${new Date(
            entry.timestamp
          ).toLocaleString()}</p>
          <p><strong>Category:</strong> ${entry.category || "Any"}</p>
          <p><strong>Score:</strong> ${entry.score}</p>
        `;

        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = "Show Questions";
        toggleBtn.classList.add("btn", "small");
        const details = document.createElement("div");
        details.style.display = "none";
        details.classList.add("question-review");

        entry.review.forEach((q, i) => {
          const qDiv = document.createElement("div");
          qDiv.classList.add("question-summary");
          qDiv.innerHTML = `
            <p><strong>Q${i + 1}:</strong> ${q.question}</p>
            <p>Your answer: ${q.answer} ${
            q.answer === q.correct ? "✅" : "❌"
          }</p>
            <p>Correct answer: ${q.correct}</p>
          `;
          details.appendChild(qDiv);
        });

        toggleBtn.onclick = () => {
          details.style.display =
            details.style.display === "none" ? "block" : "none";
          toggleBtn.textContent =
            details.style.display === "none"
              ? "Show Questions"
              : "Hide Questions";
        };

        container.appendChild(header);
        container.appendChild(toggleBtn);
        container.appendChild(details);
        historyList.appendChild(container);
      });
  }

  showPage("soloHistoryPage");
}

function renderSoloQuestion() {
  if (currentSoloIndex >= currentSoloQuestions.length) {
    saveSoloQuizToHistory();
    showPage("summaryPage");
    document.getElementById(
      "finalScore"
    ).textContent = `Score: ${currentSoloScore} / ${currentSoloQuestions.length}`;

    const list = document.getElementById("questionReviewList");
    list.innerHTML = "";
    currentSoloQuestions.forEach((q, i) => {
      // same review code as above...
    });

    document.getElementById("restartButton").style.display = "none";
    return;
  }

  const questionObj = currentSoloQuestions[currentSoloIndex];
  const allAnswers = [
    ...questionObj.incorrect_answers,
    questionObj.correct_answer,
  ].sort(() => Math.random() - 0.5);

  showPage("quizPage");

  document.getElementById("questionText").innerHTML = questionObj.question;
  document.getElementById("countdown").innerText = "";
  document.getElementById("feedback").innerText = "";

  const list = document.getElementById("choicesList");
  list.innerHTML = "";
  allAnswers.forEach((ans) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.innerHTML = ans;
    btn.onclick = () => submitSoloAnswer(ans, questionObj.correct_answer);
    li.appendChild(btn);
    list.appendChild(li);
  });

  document.getElementById("scoreboard").innerHTML = `Question ${
    currentSoloIndex + 1
  } of ${currentSoloQuestions.length}`;
}

function submitSoloAnswer(selected, correct) {
  const isCorrect = selected === correct;
  if (isCorrect) currentSoloScore++;
  currentSoloAnswers[currentSoloIndex] = selected;

  document.getElementById("feedback").textContent = isCorrect
    ? "✅ Correct!"
    : `❌ Incorrect. Correct answer: ${correct}`;
  document.getElementById("feedback").style.color = isCorrect ? "green" : "red";

  // Disable all buttons
  document.querySelectorAll("#choicesList button").forEach((btn) => {
    btn.disabled = true;
  });

  // Next question after 2 seconds
  setTimeout(() => {
    currentSoloIndex++;
    renderSoloQuestion();
  }, 2000);
}

window.addEventListener("load", () => {
  const storedId = localStorage.getItem("playerId");
  const storedRoom = localStorage.getItem("roomCode");

  if (storedId && storedRoom) {
    socket.emit(
      "reconnectPlayer",
      { roomCode: storedRoom, playerId: storedId },
      ({ success, name, hostId: hId }) => {
        if (success) {
          playerId = storedId;
          roomCode = storedRoom;
          playerName = name;
          hostId = hId;

          document.getElementById(
            "roomCodeDisplay"
          ).innerText = `Room Code: ${roomCode}`;
          updatePlayerListUI();
          showStartButtonIfHost();
          showPage("lobbyPage");
        } else {
          localStorage.removeItem("playerId");
          localStorage.removeItem("roomCode");
          showPage("modeSelectPage");
        }
      }
    );
  } else {
    showPage("modeSelectPage");
  }
});

function hostRoom() {
  const name = document.getElementById("hostName").value;
  const selectedCategory = document.getElementById("categorySelect").value;
  console.log(selectedCategory);
  if (!name) return alert("Enter a name to host");

  socket.emit(
    "hostRoom",
    { hostName: name, category: selectedCategory },
    ({ roomCode: code, playerId: id, hostId: hId }) => {
      roomCode = code;
      playerId = id;
      hostId = hId;
      playerName = name;

      localStorage.setItem("playerId", playerId);
      localStorage.setItem("roomCode", roomCode);
      document.getElementById(
        "roomCodeDisplay"
      ).innerText = `Room Code: ${roomCode}`;
      showStartButtonIfHost();
      showPage("lobbyPage");
    }
  );
}

function joinRoom() {
  const code = document.getElementById("joinCode").value.toUpperCase();
  const name = document.getElementById("joinName").value;
  if (!code || !name) return alert("Enter room code and name to join");

  socket.emit(
    "joinRoom",
    { roomCode: code, playerName: name },
    ({ playerId: id, error, hostId: hId }) => {
      if (error) return alert(error);

      roomCode = code;
      playerId = id;
      hostId = hId;
      playerName = name;

      localStorage.setItem("playerId", playerId);
      localStorage.setItem("roomCode", roomCode);
      document.getElementById(
        "roomCodeDisplay"
      ).innerText = `Room Code: ${roomCode}`;
      showStartButtonIfHost();
      showPage("lobbyPage");
    }
  );
}

function startGame() {
  const selectedCategory = document.getElementById("categorySelect").value;
  socket.emit(
    "startGame",
    { roomCode, playerId, category: selectedCategory },
    (res) => {
      if (!res.success) alert(res.error);
    }
  );
}

function showStartButtonIfHost() {
  const startBtn = document.getElementById("startButton");
  startBtn.style.display = playerId === hostId ? "block" : "none";
}

function submitAnswer(answer) {
  if (hasSubmitted) return;
  hasSubmitted = true;

  lastSubmittedAnswer = answer;
  socket.emit("submitAnswer", { roomCode, playerId, answer });

  document.querySelectorAll("#choicesList button").forEach((btn) => {
    btn.disabled = true;
  });

  document.getElementById("choicesList").innerHTML +=
    "<p>Answer submitted!</p>";
}

function updatePlayerListUI(players = []) {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name;
    list.appendChild(li);
  });
}

function restartGame() {
  socket.emit("returnToLobby", { roomCode, playerId }, (res) => {
    if (!res.success) {
      alert(res.error);
    }
  });
}

function showStatusMessage(msg, duration = 3000) {
  const status = document.getElementById("statusMessage");
  status.textContent = msg;
  status.style.display = "block";

  setTimeout(() => {
    status.style.display = "none";
  }, duration);
}

document.getElementById("disconnectButton").addEventListener("click", () => {
  if (playerId && roomCode) {
    socket.emit("leaveRoom", { roomCode, playerId });
  }

  localStorage.removeItem("playerId");
  localStorage.removeItem("roomCode");
  playerId = "";
  playerName = "";
  roomCode = "";
  hostId = null;
  lastSubmittedAnswer = null;

  showStatusMessage("You have left the room.");
  showPage("homePage");
});

window.addEventListener("DOMContentLoaded", () => {
  const categories = {
    General: {
      9: "General Knowledge",
      22: "Geography",
      23: "History",
      24: "Politics",
    },
    Entertainment: {
      10: "Books",
      11: "Film",
      12: "Music",
      14: "Television",
      15: "Video Games",
      29: "Comics",
      31: "Anime & Manga",
    },
    Science: {
      17: "Science & Nature",
      18: "Computers",
      19: "Mathematics",
      30: "Gadgets",
    },
    Miscellaneous: {
      20: "Mythology",
      25: "Art",
      26: "Celebrities",
      27: "Animals",
      28: "Vehicles",
    },
  };

  const multiSelect = document.getElementById("categorySelect");
  const soloSelect = document.getElementById("singlePlayerCategorySelect");

  [multiSelect, soloSelect].forEach((select) => {
    select.innerHTML = '<option value="">Any Category</option>';
    for (const group in categories) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group;

      for (const id in categories[group]) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = categories[group][id];
        optgroup.appendChild(option);
      }

      select.appendChild(optgroup);
    }
  });
});

socket.on("playerList", (players) => {
  updatePlayerListUI(players);
});

socket.on("question", ({ question, choices }) => {
  showPage("quizPage");
  lastSubmittedAnswer = null;
  hasSubmitted = false;

  if (countdownInterval) clearInterval(countdownInterval);

  let timeLeft = 15;
  const countdown = document.getElementById("countdown");
  countdown.textContent = `Time left: ${timeLeft}`;
  countdownInterval = setInterval(() => {
    timeLeft--;
    countdown.textContent = `Time left: ${timeLeft}`;
    if (timeLeft <= 0) clearInterval(countdownInterval);
  }, 1000);

  document.getElementById("questionText").innerHTML = question;

  const list = document.getElementById("choicesList");
  list.innerHTML = "";
  choices.forEach((choice) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.innerHTML = choice;
    btn.onclick = () => submitAnswer(choice);
    li.appendChild(btn);
    list.appendChild(li);
  });

  document.getElementById("feedback").textContent = "";
  document.getElementById("scoreboard").innerHTML = "";
});

socket.on("revealAnswer", ({ correct, scores }) => {
  const feedback = document.getElementById("feedback");
  feedback.textContent =
    lastSubmittedAnswer === correct
      ? "✅ Correct!"
      : `❌ Incorrect. Correct answer: ${correct}`;
  feedback.style.color = lastSubmittedAnswer === correct ? "green" : "red";

  const scoreBoard = document.getElementById("scoreboard");
  scoreBoard.innerHTML = "<h4>Scores:</h4>";
  const ul = document.createElement("ul");
  scores.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = `${player.name}: ${player.score}`;
    ul.appendChild(li);
  });
  scoreBoard.appendChild(ul);
});

socket.on("quizOver", ({ scores, questions, answerLog }) => {
  showPage("summaryPage");

  const currentPlayerAnswers = answerLog[playerId] || [];
  const totalCorrect = scores.find((p) => p.name === playerName)?.score || 0;
  const totalQuestions = questions.length;

  document.getElementById(
    "finalScore"
  ).textContent = `Score: ${totalCorrect} / ${totalQuestions}`;

  const list = document.getElementById("questionReviewList");
  list.innerHTML = "";

  questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.classList.add("question-summary");

    const playerAnswer = currentPlayerAnswers[i];
    const correct = q.correct_answer;
    const isCorrect = playerAnswer === correct;

    div.innerHTML = `
      <p><strong>Q${i + 1}:</strong> ${q.question}</p>
      <p>Your answer: ${playerAnswer || "No answer"} ${
      isCorrect ? "✅" : "❌"
    }</p>
      <p>Correct answer: ${correct}</p>
    `;

    list.appendChild(div);
  });

  // Show restart button if host
  document.getElementById("restartButton").style.display =
    playerId === hostId ? "block" : "none";
});

socket.on("returnToLobby", () => {
  showPage("lobbyPage");
  document.getElementById("restartButton").style.display =
    playerId === hostId ? "block" : "none";
});
