const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { randomUUID } = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Game state
const gameState = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("hostRoom", ({ hostName, category }, callback) => {
    const roomCode = generateRoomCode();
    const playerId = randomUUID();

    gameState[roomCode] = {
      hostId: playerId,
      players: {
        [playerId]: {
          name: hostName,
          socketId: socket.id,
          score: 0,
          answer: null,
        },
      },
      category: category || null,
    };

    socket.join(roomCode);
    callback({ roomCode, playerId, hostId: playerId });
  });

  socket.on("joinRoom", ({ roomCode, playerName }, callback) => {
    const room = gameState[roomCode];
    if (!room) return callback({ error: "Room not found" });

    const playerId = randomUUID();
    room.players[playerId] = {
      name: playerName,
      socketId: socket.id,
      score: 0,
      answer: null,
    };
    socket.join(roomCode);
    callback({ playerId, hostId: room.hostId });
    io.to(roomCode).emit("playerList", Object.values(room.players));
    logGameState();
  });

  socket.on("reconnectPlayer", ({ roomCode, playerId }, callback) => {
    const room = gameState[roomCode];
    if (!room || !room.players[playerId]) {
      return callback({ success: false, error: "Room or player not found" });
    }

    room.players[playerId].socketId = socket.id;
    socket.join(roomCode);
    io.to(roomCode).emit("playerList", Object.values(room.players));
    callback({
      success: true,
      name: room.players[playerId].name,
      hostId: room.hostId,
    });
  });

  socket.on("startGame", async ({ roomCode, playerId, category }, callback) => {
    const room = gameState[roomCode];
    if (!room || room.hostId !== playerId) {
      return callback({
        success: false,
        error: "Unauthorized or room not found",
      });
    }

    resetGame(room);

    if (category) {
      room.category = category; // Save new selection before making the API call
    }

    try {
      const categoryParam = room.category ? `&category=${room.category}` : "";
      const res = await fetch(
        `https://opentdb.com/api.php?amount=5&type=multiple${categoryParam}`
      );
      const data = await res.json();
      room.questions = data.results;

      io.to(roomCode).emit("question", formatQuestion(room.questions[0]));
      startQuestionTimer(roomCode);
      callback({ success: true });
      logGameState();
    } catch (err) {
      console.error("Fetch error:", err);
      callback({ success: false, error: "Could not load quiz questions" });
    }
  });

  socket.on("submitAnswer", ({ roomCode, playerId, answer }) => {
    const room = gameState[roomCode];
    if (!room || !room.players[playerId]) return;

    const player = room.players[playerId];
    if (player.answer != null) return;

    player.answer = answer;
    if (!room.answerLog) room.answerLog = {};
    if (!room.answerLog[playerId]) room.answerLog[playerId] = [];
    room.answerLog[playerId][room.currentIndex] = answer;

    if (answer === room.questions[room.currentIndex].correct_answer) {
      player.score++;
    }

    const allAnswered = Object.values(room.players).every(
      (p) => p.answer !== null
    );
    if (allAnswered) {
      clearTimeout(room.timer);
      revealAndAdvance(roomCode);
    }

    logGameState();
  });

  socket.on("restartGame", async ({ roomCode, playerId }, callback) => {
    const room = gameState[roomCode];
    if (!room || room.hostId !== playerId) {
      return callback({
        success: false,
        error: "Unauthorized or room not found",
      });
    }

    resetGame(room);
    try {
      const categoryParam = room.category ? `&category=${room.category}` : "";
      const res = await fetch(
        `https://opentdb.com/api.php?amount=5&type=multiple${categoryParam}`
      );
      const data = await res.json();
      room.questions = data.results;

      io.to(roomCode).emit("question", formatQuestion(room.questions[0]));
      startQuestionTimer(roomCode);
      callback({ success: true });
      logGameState();
    } catch (err) {
      console.error("Restart error:", err);
      callback({ success: false, error: "Failed to fetch questions" });
    }
  });

  socket.on("returnToLobby", ({ roomCode, playerId }, callback) => {
    const room = gameState[roomCode];
    if (!room || room.hostId !== playerId) {
      return callback({
        success: false,
        error: "Unauthorized or room not found",
      });
    }

    delete room.questions;
    delete room.currentIndex;
    delete room.answerLog;
    room.started = false;
    io.to(roomCode).emit("returnToLobby");
    callback({ success: true });
  });

  socket.on("leaveRoom", ({ roomCode, playerId }) => {
    const room = gameState[roomCode];
    if (room?.players[playerId]) {
      delete room.players[playerId];
      io.to(roomCode).emit("playerList", Object.values(room.players));

      if (Object.keys(room.players).length === 0) {
        delete gameState[roomCode];
        console.log(`Room ${roomCode} deleted`);
      }
    }
  });

  socket.on("disconnect", () => {
    for (const [roomCode, room] of Object.entries(gameState)) {
      for (const [playerId, player] of Object.entries(room.players)) {
        if (player.socketId === socket.id) {
          delete room.players[playerId];
          io.to(roomCode).emit("playerList", Object.values(room.players));
          if (Object.keys(room.players).length === 0) {
            delete gameState[roomCode];
          }
          return;
        }
      }
    }
  });
});

// Helpers
function resetGame(room) {
  if (room.timer) clearTimeout(room.timer);
  room.questions = [];
  room.currentIndex = 0;
  room.started = true;
  room.answerLog = {};
  for (const player of Object.values(room.players)) {
    player.score = 0;
    player.answer = null;
  }
}

function startQuestionTimer(roomCode) {
  const room = gameState[roomCode];
  if (!room) return;

  room.timer = setTimeout(() => {
    console.log("Timer expired");
    revealAndAdvance(roomCode);
  }, 15000);
}

function revealAndAdvance(roomCode) {
  const room = gameState[roomCode];
  if (!room) return;

  const correct = room.questions[room.currentIndex].correct_answer;
  const scores = Object.entries(room.players).map(([_, p]) => ({
    name: p.name,
    score: p.score,
  }));

  for (const player of Object.values(room.players)) {
    player.answer = null;
  }

  io.to(roomCode).emit("revealAnswer", { correct, scores });

  setTimeout(() => {
    room.currentIndex++;
    if (room.currentIndex < room.questions.length) {
      io.to(roomCode).emit(
        "question",
        formatQuestion(room.questions[room.currentIndex])
      );
      startQuestionTimer(roomCode);
    } else {
      io.to(roomCode).emit("quizOver", {
        scores,
        questions: room.questions,
        answerLog: room.answerLog,
      });
    }
  }, 3000);
}

function formatQuestion(q) {
  const choices = [...q.incorrect_answers, q.correct_answer].sort(
    () => Math.random() - 0.5
  );
  return {
    question: q.question,
    choices,
    correct: q.correct_answer,
  };
}

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  do {
    code = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (gameState[code]);
  return code;
}

function logGameState() {
  console.log("Current Game State:");
  console.dir(gameState, { depth: null });
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
