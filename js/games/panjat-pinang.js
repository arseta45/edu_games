/* =========================================================
   EDU GAME - PANJAT PINANG
   DUAL TEAM / SIMULTAN
   ========================================================= */

/* =========================================================
   GAME STATE
========================================================= */

let pinangQuestions = [];

let teamAQuestions = [];
let teamBQuestions = [];

let teamAName = "Tim Merah";
let teamBName = "Tim Biru";

let teamAScore = 0;
let teamBScore = 0;

let currentSettings = {
  useTimer: true,
  timeLimit: 15,
  countdown: true,
  shuffleAnswers: false,
};

/*
 * State masing-masing tim.
 */
const teamState = {
  A: {
    questions: [],
    index: 0,
    answered: false,
    finished: false,

    timer: null,
    timerToken: 0,

    currentQuestion: null,
    currentQuestionId: null,
  },

  B: {
    questions: [],
    index: 0,
    answered: false,
    finished: false,

    timer: null,
    timerToken: 0,

    currentQuestion: null,
    currentQuestionId: null,
  },
};

/*
 * Soal yang sedang digunakan.
 *
 * Soal aktif Tim A tidak boleh dipakai
 * oleh Tim B pada waktu yang sama.
 */
const activeQuestionIds = {
  A: null,
  B: null,
};

/*
 * Soal yang sudah dijawab/dilewati masing-masing tim.
 */
const completedQuestionIds = {
  A: new Set(),
  B: new Set(),
};

/*
 * Mencegah finishGame dipanggil berkali-kali.
 */
let gameFinished = false;

/* =========================================================
   MUSIC
========================================================= */

let gameMusic = null;
let winMusic = null;
let zonkMusic = null;

let isGameMusicMuted = false;

/* =========================================================
   PANJAT PINANG STATE
========================================================= */

/*
 * Posisi karakter:
 *
 * 0 = bawah
 * raceMaxSteps = finish
 */
let runnerAPosition = 0;
let runnerBPosition = 0;

/*
 * Jumlah langkah untuk mencapai finish.
 */
let raceMaxSteps = 1;

/*
 * Total soal dalam bank.
 */
let totalGameQuestions = 0;

/* =========================================================
   MUSIC INIT
========================================================= */

function initGameMusic() {
  if (!gameMusic) {
    gameMusic = new Audio("../assets/audio/game.mp3");

    gameMusic.loop = true;
    gameMusic.volume = 0.35;
    gameMusic.muted = isGameMusicMuted;
  }

  if (!winMusic) {
    winMusic = new Audio("../assets/audio/victory.mp3");

    winMusic.loop = false;
    winMusic.volume = 0.55;
    winMusic.muted = isGameMusicMuted;
  }

  if (!zonkMusic) {
    zonkMusic = new Audio("../assets/audio/zonk.mp3");

    zonkMusic.loop = false;
    zonkMusic.volume = 0.55;
    zonkMusic.muted = isGameMusicMuted;
  }
}

/* =========================================================
   START MUSIC
========================================================= */

function startGameMusic() {
  initGameMusic();

  if (winMusic) {
    winMusic.pause();
    winMusic.currentTime = 0;
  }

  if (zonkMusic) {
    zonkMusic.pause();
    zonkMusic.currentTime = 0;
  }

  gameMusic.currentTime = 0;

  gameMusic.play().catch((error) => {
    console.warn("Musik game tidak dapat diputar:", error);
  });
}

/* =========================================================
   STOP GAME MUSIC
========================================================= */

function stopGameMusic() {
  if (!gameMusic) {
    return;
  }

  gameMusic.pause();
  gameMusic.currentTime = 0;
}

/* =========================================================
   WIN MUSIC
========================================================= */

function playWinMusic() {
  initGameMusic();

  stopGameMusic();

  if (zonkMusic) {
    zonkMusic.pause();
    zonkMusic.currentTime = 0;
  }

  winMusic.currentTime = 0;

  winMusic.play().catch((error) => {
    console.warn("Musik kemenangan tidak dapat diputar:", error);
  });
}

/* =========================================================
   ZONK MUSIC
========================================================= */

function playZonkMusic() {
  initGameMusic();

  stopGameMusic();

  if (winMusic) {
    winMusic.pause();
    winMusic.currentTime = 0;
  }

  zonkMusic.currentTime = 0;

  zonkMusic.play().catch((error) => {
    console.warn("Musik zonk tidak dapat diputar:", error);
  });
}

/* =========================================================
   STOP ALL MUSIC
========================================================= */

function stopAllMusic() {
  if (gameMusic) {
    gameMusic.pause();
    gameMusic.currentTime = 0;
  }

  if (winMusic) {
    winMusic.pause();
    winMusic.currentTime = 0;
  }

  if (zonkMusic) {
    zonkMusic.pause();
    zonkMusic.currentTime = 0;
  }
}

/* =========================================================
   SETTINGS
========================================================= */

function getPinangGameSettings() {
  const defaultSettings = {
    useTimer: true,
    timeLimit: 15,
    countdown: true,
    shuffleAnswers: false,
  };

  const saved = localStorage.getItem("eduGameSettings");

  if (!saved) {
    return {
      ...defaultSettings,
    };
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch (error) {
    console.error("Gagal membaca Game Settings:", error);

    return {
      ...defaultSettings,
    };
  }
}

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Panjat Pinang: halaman siap.");

  try {
    await ensureDatabase();

    currentSettings = getPinangGameSettings();

    await initPinangSetup();

    const startButton = document.getElementById("startGameButton");

    if (startButton) {
      startButton.onclick = startPinangGame;
    } else {
      console.error("startGameButton tidak ditemukan.");
    }
  } catch (error) {
    console.error("Gagal menjalankan Panjat Pinang:", error);

    showSetupError("Database gagal dimuat: " + error.message);
  }
});

/* =========================================================
   SETUP
========================================================= */

async function initPinangSetup() {
  const subjectSelect = document.getElementById("subjectSelect");
  const classSelect = document.getElementById("classSelect");
  const bankSelect = document.getElementById("bankSelect");

  if (!subjectSelect || !classSelect || !bankSelect) {
    throw new Error("Element select setup tidak ditemukan.");
  }

  subjectSelect.innerHTML = `
    <option value="">Pilih Mata Pelajaran</option>
  `;

  classSelect.innerHTML = `
    <option value="">Pilih Kelas</option>
  `;

  bankSelect.innerHTML = `
    <option value="">Pilih Bank Soal</option>
  `;

  classSelect.disabled = true;
  bankSelect.disabled = true;

  const questions = await getAllQuestions();

  const subjects = [
    ...new Set(
      questions
        .map((question) => String(question.subject || "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
    }),
  );

  subjects.forEach((subject) => {
    const option = document.createElement("option");

    option.value = subject;
    option.textContent = subject;

    subjectSelect.appendChild(option);
  });

  /* =====================================================
     SUBJECT CHANGE
  ===================================================== */

  subjectSelect.onchange = async function () {
    const subject = subjectSelect.value;

    classSelect.innerHTML = `
      <option value="">Pilih Kelas</option>
    `;

    bankSelect.innerHTML = `
      <option value="">Pilih Bank Soal</option>
    `;

    bankSelect.disabled = true;

    if (!subject) {
      classSelect.disabled = true;
      return;
    }

    const selectedQuestions = questions.filter(
      (question) => String(question.subject || "").trim() === subject,
    );

    const classes = [
      ...new Set(
        selectedQuestions
          .map((question) => String(question.class || "").trim())
          .filter(Boolean),
      ),
    ].sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
      }),
    );

    classes.forEach((className) => {
      const option = document.createElement("option");

      option.value = className;
      option.textContent = `Kelas ${className}`;

      classSelect.appendChild(option);
    });

    classSelect.disabled = classes.length === 0;
  };

  /* =====================================================
     CLASS CHANGE
  ===================================================== */

  classSelect.onchange = async function () {
    const subject = subjectSelect.value;
    const className = classSelect.value;

    bankSelect.innerHTML = `
      <option value="">Pilih Bank Soal</option>
    `;

    bankSelect.disabled = true;

    if (!subject || !className) {
      return;
    }

    try {
      const banks = await getAllBanks();

      const filteredBanks = banks.filter((bank) => {
        return (
          String(bank.subject || "").trim() === String(subject).trim() &&
          String(bank.class || "").trim() === String(className).trim()
        );
      });

      const uniqueBanks = dedupeBanks(filteredBanks);

      if (!uniqueBanks.length) {
        bankSelect.innerHTML = `
          <option value="">Tidak ada Bank Soal</option>
        `;

        return;
      }

      uniqueBanks.forEach((bank) => {
        const option = document.createElement("option");

        option.value = String(bank.id);

        option.textContent = bank.name || `Bank Soal ${bank.id}`;

        bankSelect.appendChild(option);
      });

      bankSelect.disabled = false;
    } catch (error) {
      console.error("Gagal mengambil bank:", error);

      bankSelect.innerHTML = `
        <option value="">Gagal memuat Bank Soal</option>
      `;
    }
  };

  updateSetupInfo();
}

/* =========================================================
   DEDUPE BANK
========================================================= */

function dedupeBanks(banks) {
  const map = new Map();

  banks.forEach((bank) => {
    const id =
      bank.id !== undefined && bank.id !== null && String(bank.id).trim() !== ""
        ? `id:${bank.id}`
        : null;

    const fallbackKey = [bank.name, bank.subject, bank.class]
      .map((value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      )
      .join("|");

    const key = id || `name:${fallbackKey}`;

    if (!map.has(key)) {
      map.set(key, bank);
    }
  });

  return [...map.values()];
}

/* =========================================================
   SETUP INFO
========================================================= */

function updateSetupInfo() {
  const setupInfo = document.getElementById("setupInfo");

  if (!setupInfo) {
    return;
  }

  currentSettings = getPinangGameSettings();

  if (currentSettings.useTimer) {
    setupInfo.textContent = `⏱️ Timer aktif: ${currentSettings.timeLimit} detik per soal.`;
  } else {
    setupInfo.textContent = "⏱️ Timer tidak digunakan.";
  }
}

/* =========================================================
   START GAME
========================================================= */

async function startPinangGame() {
  clearSetupError();

  const subjectSelect = document.getElementById("subjectSelect");

  const classSelect = document.getElementById("classSelect");

  const bankSelect = document.getElementById("bankSelect");

  const teamAInput = document.getElementById("teamAInput");

  const teamBInput = document.getElementById("teamBInput");

  const subject = subjectSelect?.value.trim();
  const className = classSelect?.value.trim();
  const bankId = bankSelect?.value;

  teamAName = teamAInput?.value.trim() || "Tim Merah";

  teamBName = teamBInput?.value.trim() || "Tim Biru";

  if (!subject) {
    showSetupError("Silakan pilih Mata Pelajaran.");
    return;
  }

  if (!className) {
    showSetupError("Silakan pilih Kelas.");
    return;
  }

  if (!bankId) {
    showSetupError("Silakan pilih Bank Soal.");
    return;
  }

  try {
    const questions = await getQuestionsByBank(Number(bankId));

    if (!questions || !questions.length) {
      showSetupError("Bank soal tersebut belum memiliki soal.");

      return;
    }

    /* =================================================
       VALIDASI SOAL
    ================================================= */

    const validQuestions = questions.filter((question) => {
      return (
        question &&
        question.question &&
        question.optionA !== undefined &&
        question.optionB !== undefined &&
        question.optionC !== undefined &&
        question.optionD !== undefined &&
        String(question.answer || "").trim()
      );
    });

    const uniqueQuestions = dedupeQuestions(validQuestions);

    if (uniqueQuestions.length < 2) {
      showSetupError("Minimal diperlukan 2 soal.");

      return;
    }

    /* =================================================
       RESET
    ================================================= */

    resetGameState();

    /*
     * Acak bank soal.
     */
    pinangQuestions = shuffleArray([...uniqueQuestions]);

    totalGameQuestions = pinangQuestions.length;

    /*
     * Kedua tim mendapatkan semua soal.
     */
    teamAQuestions = shuffleArray([...pinangQuestions]);

    teamBQuestions = shuffleArray([...pinangQuestions]);

    teamState.A.questions = teamAQuestions;

    teamState.B.questions = teamBQuestions;

    /*
     * Setiap jawaban benar = 1 langkah.
     *
     * Agar finish tidak terlalu cepat:
     *
     * 10 soal => 6 langkah
     * 20 soal => 11 langkah
     *
     * Anda bisa mengubah rumus ini jika ingin
     * lebih banyak / sedikit langkah.
     */
    raceMaxSteps = Math.max(1, Math.ceil(totalGameQuestions / 2) + 1);

    setText("maxStepsValue", String(raceMaxSteps));

    console.log("PANJAT PINANG:", {
      total: totalGameQuestions,
      teamA: teamAQuestions.length,
      teamB: teamBQuestions.length,
      raceMaxSteps,
    });

    /* =================================================
       NAMA TIM
    ================================================= */

    setText("teamAName", teamAName);
    setText("teamBName", teamBName);

    /* =================================================
       SKOR
    ================================================= */

    setText("scoreA", "0");
    setText("scoreB", "0");

    /* =================================================
       POSISI AWAL
    ================================================= */

    runnerAPosition = 0;
    runnerBPosition = 0;

    updateRunnerPositions();

    /* =================================================
       PROGRESS
    ================================================= */

    setText("questionTotal", String(totalGameQuestions));

    updateGlobalProgress();

    /* =================================================
       SHOW GAME
    ================================================= */

    const setupSection = document.getElementById("setupSection");

    const gameSection = document.getElementById("gameSection");

    const resultSection = document.getElementById("resultSection");

    if (setupSection) {
      setupSection.hidden = true;
    }

    if (resultSection) {
      resultSection.hidden = true;

      resultSection.classList.remove("result-celebration");
    }

    if (gameSection) {
      gameSection.hidden = false;
    }

    /* =================================================
       MUSIC
    ================================================= */

    startGameMusic();

    /* =================================================
       TIMER
    ================================================= */

    /* =================================================
       MULAI KEDUA TIM
    ================================================= */

    showTeamRound("A");
    showTeamRound("B");

    console.log("GAME PANJAT PINANG DIMULAI");
  } catch (error) {
    console.error("Gagal memulai game:", error);

    showSetupError("Gagal memulai permainan: " + error.message);
  }
}

/* =========================================================
   RESET GAME STATE
========================================================= */

function resetGameState() {
  stopTeamTimer("A");
  stopTeamTimer("B");

  teamAScore = 0;
  teamBScore = 0;

  runnerAPosition = 0;
  runnerBPosition = 0;

  gameFinished = false;

  activeQuestionIds.A = null;
  activeQuestionIds.B = null;

  completedQuestionIds.A = new Set();
  completedQuestionIds.B = new Set();

  teamState.A.index = 0;
  teamState.A.answered = false;
  teamState.A.finished = false;
  teamState.A.timerToken++;

  teamState.A.currentQuestion = null;
  teamState.A.currentQuestionId = null;

  teamState.B.index = 0;
  teamState.B.answered = false;
  teamState.B.finished = false;
  teamState.B.timerToken++;

  teamState.B.currentQuestion = null;
  teamState.B.currentQuestionId = null;

  setText("scoreA", "0");
  setText("scoreB", "0");

  setText("statusA", "Belum menjawab");

  setText("statusB", "Belum menjawab");

  setText("questionAText", "Memuat soal...");
  setText("questionBText", "Memuat soal...");

  const answersA = document.getElementById("answersA");

  const answersB = document.getElementById("answersB");

  if (answersA) {
    answersA.innerHTML = "";
  }

  if (answersB) {
    answersB.innerHTML = "";
  }

  const characterA = document.getElementById("panjatCharacterA");

  const characterB = document.getElementById("panjatCharacterB");

  [characterA, characterB].forEach((character) => {
    if (!character) {
      return;
    }

    character.classList.remove("climbing", "finished");
  });

  updateRunnerPositions();
}

/* =========================================================
   GET QUESTION ID
========================================================= */

function getQuestionId(question) {
  if (!question) {
    return null;
  }

  if (question.id !== undefined && question.id !== null) {
    return String(question.id);
  }

  return (
    "text:" +
    String(question.question || "")
      .trim()
      .toLowerCase()
  );
}

/* =========================================================
   DEDUPE QUESTIONS
========================================================= */

function dedupeQuestions(questions) {
  const map = new Map();

  questions.forEach((question) => {
    let key;

    if (question.id !== undefined && question.id !== null) {
      key = `id:${question.id}`;
    } else {
      key = `question:${String(question.question || "")
        .trim()
        .toLowerCase()}`;
    }

    if (!map.has(key)) {
      map.set(key, question);
    }
  });

  return [...map.values()];
}

/* =========================================================
   FIND NEXT QUESTION
========================================================= */

function findNextAvailableQuestion(team) {
  const state = teamState[team];

  if (!state || !state.questions.length) {
    return null;
  }

  const otherTeam = team === "A" ? "B" : "A";

  for (let i = 0; i < state.questions.length; i++) {
    const question = state.questions[i];

    if (!question) {
      continue;
    }

    const questionId = getQuestionId(question);

    /*
     * Sudah selesai oleh tim ini.
     */
    if (completedQuestionIds[team].has(questionId)) {
      continue;
    }

    /*
     * Sedang digunakan tim lawan.
     */
    if (activeQuestionIds[otherTeam] === questionId) {
      continue;
    }

    return {
      question,
      index: i,
    };
  }

  return null;
}

/* =========================================================
   SHUFFLE ANSWERS
========================================================= */

function shuffleQuestionAnswers(question) {
  if (!currentSettings.shuffleAnswers) {
    return {
      ...question,
    };
  }

  const originalAnswer = String(question.answer || "")
    .trim()
    .toUpperCase();

  const options = [
    {
      text: question.optionA ?? "",
      isCorrect: originalAnswer === "A",
    },

    {
      text: question.optionB ?? "",
      isCorrect: originalAnswer === "B",
    },

    {
      text: question.optionC ?? "",
      isCorrect: originalAnswer === "C",
    },

    {
      text: question.optionD ?? "",
      isCorrect: originalAnswer === "D",
    },
  ];

  shuffleArray(options);

  const correctIndex = options.findIndex((option) => option.isCorrect === true);

  const letters = ["A", "B", "C", "D"];

  const newAnswer = correctIndex >= 0 ? letters[correctIndex] : originalAnswer;

  return {
    ...question,

    optionA: options[0].text,
    optionB: options[1].text,
    optionC: options[2].text,
    optionD: options[3].text,

    answer: newAnswer,
  };
}

/* =========================================================
   SHOW TEAM ROUND
========================================================= */

function showTeamRound(team) {
  const state = teamState[team];

  if (!state || gameFinished) {
    return;
  }

  stopTeamTimer(team);

  const next = findNextAvailableQuestion(team);

  /*
   * Tidak ada soal tersedia.
   */
  if (!next) {
    const allDone = state.questions.every((question) =>
      completedQuestionIds[team].has(getQuestionId(question)),
    );

    if (allDone) {
      state.finished = true;

      activeQuestionIds[team] = null;

      state.currentQuestion = null;
      state.currentQuestionId = null;

      showTeamFinished(team);

      checkGameFinished();

      return;
    }

    /*
     * Soal mungkin sedang dipakai lawan.
     */
    setTimeout(() => {
      if (!gameFinished && !state.finished && !state.answered) {
        showTeamRound(team);
      }
    }, 250);

    return;
  }

  state.index = next.index;

  state.answered = false;
  state.finished = false;

  const originalQuestion = next.question;

  const questionId = getQuestionId(originalQuestion);

  const question = shuffleQuestionAnswers(originalQuestion);

  state.currentQuestion = question;
  state.currentQuestionId = questionId;

  activeQuestionIds[team] = questionId;

  /* =====================================================
     STATUS
  ===================================================== */

  setText(team === "A" ? "statusA" : "statusB", "Belum menjawab");

  /* =====================================================
     QUESTION
  ===================================================== */

  setText(team === "A" ? "questionAText" : "questionBText", question.question);

  /* =====================================================
     TITLE
  ===================================================== */

  setText(
    team === "A" ? "questionATitle" : "questionBTitle",
    team === "A" ? `Pertanyaan ${teamAName}` : `Pertanyaan ${teamBName}`,
  );

  /* =====================================================
     ANSWERS
  ===================================================== */

  renderAnswers(team);

  /* =====================================================
     PROGRESS
  ===================================================== */

  renderTeamProgress(team);

  /* =====================================================
     TIMER
  ===================================================== */

  if (currentSettings.useTimer) {
    startTeamTimer(team);
  } else {
    updateTeamTimerDisplay(team, null, true);
  }

  updateGlobalProgress();
}

/* =========================================================
   RENDER ANSWERS
========================================================= */

function renderAnswers(team) {
  const container = document.getElementById(
    team === "A" ? "answersA" : "answersB",
  );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const state = teamState[team];

  if (!state) {
    return;
  }

  const question = state.currentQuestion;

  if (!question) {
    return;
  }

  const options = {
    A: question.optionA ?? "",
    B: question.optionB ?? "",
    C: question.optionC ?? "",
    D: question.optionD ?? "",
  };

  ["A", "B", "C", "D"].forEach((letter) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "pinang-answer-button";

    button.dataset.answer = letter;

    button.innerHTML = `
        <span class="pinang-answer-letter">
          ${letter}
        </span>

        <span class="pinang-answer-text">
          ${escapeHtml(options[letter])}
        </span>
      `;

    button.addEventListener("click", (event) => {
      event.preventDefault();

      if (
        teamState[team].answered ||
        teamState[team].finished ||
        gameFinished
      ) {
        return;
      }

      answerQuestion(team, letter, button);
    });

    container.appendChild(button);
  });
}

/* =========================================================
   ANSWER QUESTION
========================================================= */

function answerQuestion(team, selectedAnswer, clickedButton) {
  const state = teamState[team];

  if (!state) {
    return;
  }

  if (state.answered || state.finished || gameFinished) {
    return;
  }

  const question = state.currentQuestion;

  if (!question) {
    return;
  }

  const questionId = state.currentQuestionId || getQuestionId(question);

  /*
   * Pastikan soal masih aktif.
   */
  if (activeQuestionIds[team] !== questionId) {
    return;
  }

  const correctAnswer = String(question.answer || "")
    .trim()
    .toUpperCase();

  const selected = String(selectedAnswer).trim().toUpperCase();

  const isCorrect = selected === correctAnswer;

  state.answered = true;

  stopTeamTimer(team);

  disableAnswers(team);

  activeQuestionIds[team] = null;

  completedQuestionIds[team].add(questionId);

  /* =====================================================
     VISUAL ANSWER
  ===================================================== */

  if (clickedButton) {
    clickedButton.classList.add(isCorrect ? "correct" : "wrong");
  }

  if (!isCorrect) {
    highlightCorrectAnswer(team, correctAnswer);
  }

  setText(
    team === "A" ? "statusA" : "statusB",
    isCorrect ? "✅ Benar" : "❌ Salah",
  );

  playAnswerSound(isCorrect);

  /* =====================================================
     BENAR
  ===================================================== */

  if (isCorrect) {
    if (team === "A") {
      teamAScore++;
    } else {
      teamBScore++;
    }

    setText("scoreA", String(teamAScore));

    setText("scoreB", String(teamBScore));

    /*
     * Pemanjat naik.
     */
    moveRunner(team);

    /*
     * Jika finish, jangan lanjut soal.
     */
    if (gameFinished) {
      return;
    }
  }

  /* =====================================================
     NEXT QUESTION
  ===================================================== */

  setTimeout(() => {
    if (!gameFinished) {
      nextTeamQuestion(team);
    }
  }, 700);
}

/* =========================================================
   HIGHLIGHT CORRECT ANSWER
========================================================= */

function highlightCorrectAnswer(team, correctAnswer) {
  const container = document.getElementById(
    team === "A" ? "answersA" : "answersB",
  );

  if (!container) {
    return;
  }

  const button = container.querySelector(
    `button[data-answer="${correctAnswer}"]`,
  );

  if (button) {
    button.classList.add("correct-answer-reveal");
  }
}

/* =========================================================
   DISABLE ANSWERS
========================================================= */

function disableAnswers(team) {
  const container = document.getElementById(
    team === "A" ? "answersA" : "answersB",
  );

  if (!container) {
    return;
  }

  container.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

/* =========================================================
   ANSWER SOUND
========================================================= */

function playAnswerSound(isCorrect) {
  const sound = new Audio(
    isCorrect ? "../assets/audio/correct.mp3" : "../assets/audio/wrong.mp3",
  );

  sound.volume = 0.8;

  sound.play().catch((error) => {
    console.warn("Audio jawaban gagal:", error);
  });
}

/* =========================================================
   NEXT QUESTION
========================================================= */

function nextTeamQuestion(team) {
  const state = teamState[team];

  if (!state || gameFinished) {
    return;
  }

  state.answered = false;

  const next = findNextAvailableQuestion(team);

  if (!next) {
    const allDone = state.questions.every((question) =>
      completedQuestionIds[team].has(getQuestionId(question)),
    );

    if (allDone) {
      state.finished = true;

      showTeamFinished(team);

      checkGameFinished();

      return;
    }

    setTimeout(() => {
      if (!gameFinished && !state.finished) {
        showTeamRound(team);
      }
    }, 250);

    return;
  }

  state.index = next.index;

  showTeamRound(team);

  checkGameFinished();
}

/* =========================================================
   TEAM FINISHED
========================================================= */

function showTeamFinished(team) {
  const questionTextId = team === "A" ? "questionAText" : "questionBText";

  const answersId = team === "A" ? "answersA" : "answersB";

  const statusId = team === "A" ? "statusA" : "statusB";

  const teamName = team === "A" ? teamAName : teamBName;

  setText(statusId, "🏁 Selesai");

  setText(questionTextId, `🎉 ${teamName} telah menyelesaikan semua soal.`);

  const answers = document.getElementById(answersId);

  if (answers) {
    answers.innerHTML = `
      <div class="pinang-team-finished">
        🏁 Semua soal selesai
      </div>
    `;
  }

  activeQuestionIds[team] = null;

  stopTeamTimer(team);

  renderTeamProgress(team, true);

  updateGlobalProgress();
}

/* =========================================================
   TEAM PROGRESS
========================================================= */

function renderTeamProgress(team, completed = false) {
  const panel = document.getElementById(
    team === "A" ? "teamAPanel" : "teamBPanel",
  );

  if (!panel) {
    return;
  }

  let progress = panel.querySelector(".team-question-progress");

  if (!progress) {
    progress = document.createElement("div");

    progress.className = "team-question-progress";

    const questionText = panel.querySelector(".question-text");

    if (questionText) {
      panel.insertBefore(progress, questionText);
    } else {
      panel.appendChild(progress);
    }
  }

  const state = teamState[team];

  const total = state.questions.length;

  const completedCount = completedQuestionIds[team].size;

  const current = completed ? total : Math.min(completedCount + 1, total);

  const percent = total > 0 ? (completedCount / total) * 100 : 0;

  const teamName = team === "A" ? teamAName : teamBName;

  const fillClass = team === "A" ? "progress-fill-a" : "progress-fill-b";

  progress.innerHTML = `
    <div class="progress-label">
      <span>
        ${escapeHtml(teamName)}
      </span>

      <strong>
        ${current} / ${total}
      </strong>
    </div>

    <div class="progress-track">
      <div
        class="progress-fill ${fillClass}"
        style="width: ${percent}%"
      ></div>
    </div>
  `;
}

/* =========================================================
   START TEAM TIMER
========================================================= */

function startTeamTimer(team) {
  stopTeamTimer(team);

  const state = teamState[team];

  if (!state) {
    return;
  }

  if (!currentSettings.useTimer) {
    updateTeamTimerDisplay(team, null, true);
    return;
  }

  const limit = Math.max(1, Number(currentSettings.timeLimit) || 15);

  const token = ++state.timerToken;

  let remaining = limit;

  updateTeamTimerDisplay(team, remaining, false);

  state.timer = setInterval(() => {
    /*
     * Timer sudah tidak valid.
     */
    if (token !== state.timerToken) {
      stopTeamTimer(team);
      return;
    }

    /*
     * Soal sudah dijawab.
     */
    if (state.answered || state.finished || gameFinished) {
      stopTeamTimer(team);
      return;
    }

    remaining--;

    updateTeamTimerDisplay(team, Math.max(0, remaining), false);

    /*
     * Waktu habis.
     */
    if (remaining <= 0) {
      stopTeamTimer(team);

      handleTeamTimeUp(team);
    }
  }, 1000);
}

/* =========================================================
   STOP TEAM TIMER
========================================================= */

function stopTeamTimer(team) {
  const state = teamState[team];

  if (!state) {
    return;
  }

  if (state.timer) {
    clearInterval(state.timer);

    state.timer = null;
  }

  state.timerToken++;

  /*
   * Jangan langsung menyembunyikan timer.
   * Timer tetap menampilkan angka terakhir.
   */
}

/* =========================================================
   GLOBAL TIMER DISPLAY
========================================================= */

function updateGlobalTimerDisplay(seconds, hidden) {
  const container = document.getElementById("timerContainer");

  const display = document.getElementById("timerDisplay");

  if (!container || !display) {
    return;
  }

  if (hidden) {
    container.hidden = true;
    return;
  }

  container.hidden = false;

  display.textContent = String(seconds ?? 0);

  container.classList.toggle("timer-warning", Number(seconds) <= 5);

  container.classList.toggle("timer-danger", Number(seconds) <= 3);
}

/* =========================================================
   CREATE ONE TEAM TIMER
   ========================================================= */

function createTeamTimer(team) {
  const panel = document.getElementById(
    team === "A" ? "teamAPanel" : "teamBPanel",
  );

  if (!panel) {
    return;
  }

  const id = team === "A" ? "teamATimer" : "teamBTimer";

  if (document.getElementById(id)) {
    return;
  }

  const header = panel.querySelector(".question-header");

  if (!header) {
    return;
  }

  const timer = document.createElement("div");

  timer.id = id;

  timer.className = `team-timer-inline team-timer-inline-${team.toLowerCase()}`;

  timer.innerHTML = `
    <span class="team-timer-icon">
      ⏱️
    </span>

    <strong id="${team === "A" ? "teamATimerDisplay" : "teamBTimerDisplay"}">
      ${Number(currentSettings.timeLimit) || 15}
    </strong>

    <small>
      detik
    </small>
  `;

  header.appendChild(timer);
}

/* =========================================================
   UPDATE TEAM TIMER DISPLAY
========================================================= */

function updateTeamTimerDisplay(team, seconds, hidden) {
  const display = document.getElementById(
    team === "A" ? "teamATimerDisplay" : "teamBTimerDisplay",
  );

  const container = document.getElementById(
    team === "A" ? "teamATimer" : "teamBTimer",
  );

  if (!display || !container) {
    return;
  }

  if (hidden) {
    container.hidden = true;
    return;
  }

  container.hidden = false;

  display.textContent = String(seconds ?? 0);

  const numericSeconds = Number(seconds ?? 0);

  container.classList.toggle(
    "timer-warning",
    numericSeconds <= 5 && numericSeconds > 3,
  );

  container.classList.toggle("timer-danger", numericSeconds <= 3);
}

/* =========================================================
   TIME UP
========================================================= */

function handleTeamTimeUp(team) {
  const state = teamState[team];

  if (!state) {
    return;
  }

  if (state.answered || state.finished || gameFinished) {
    return;
  }

  const question = state.currentQuestion;

  if (!question) {
    return;
  }

  const questionId = state.currentQuestionId || getQuestionId(question);

  state.answered = true;

  stopTeamTimer(team);

  updateTeamTimerDisplay(team, 0, false);

  disableAnswers(team);

  setText(team === "A" ? "statusA" : "statusB", "⏰ Waktu habis");

  activeQuestionIds[team] = null;

  completedQuestionIds[team].add(questionId);

  playAnswerSound(false);

  setTimeout(() => {
    if (!gameFinished) {
      nextTeamQuestion(team);
    }
  }, 500);
}

/* =========================================================
   MOVE RUNNER
========================================================= */

function moveRunner(team) {
  if (gameFinished) {
    return;
  }

  if (team === "A") {
    runnerAPosition++;

    runnerAPosition = Math.min(raceMaxSteps, runnerAPosition);
  } else {
    runnerBPosition++;

    runnerBPosition = Math.min(raceMaxSteps, runnerBPosition);
  }

  /*
   * Update karakter.
   */
  moveCharacter(team);

  /*
   * Update target progress.
   */
  updateRaceProgress();

  /*
   * Cek finish.
   */
  if (runnerAPosition >= raceMaxSteps) {
    finishGame("A", "race");

    return;
  }

  if (runnerBPosition >= raceMaxSteps) {
    finishGame("B", "race");

    return;
  }
}

/* =========================================================
   UPDATE CHARACTER POSITION
========================================================= */

function updateRunnerPositions() {
  moveCharacter("A", false);

  moveCharacter("B", false);

  updateRaceProgress();
}

/* =========================================================
   MOVE CHARACTER
========================================================= */

function moveCharacter(team, animate = true) {
  const character =
    team === "A"
      ? document.getElementById("panjatCharacterA")
      : document.getElementById("panjatCharacterB");

  if (!character) {
    console.warn(`Karakter Tim ${team} tidak ditemukan.`);

    return;
  }

  const position = team === "A" ? runnerAPosition : runnerBPosition;

  /*
   * 0 sampai 100%.
   */
  const progress = raceMaxSteps > 0 ? position / raceMaxSteps : 0;

  /*
   * Area gerak karakter.
   *
   * CSS:
   *
   * pole-container height:
   * 500px
   *
   * character bottom:
   * 20px
   *
   * Finish:
   * sekitar 54px dari atas.
   *
   * Jadi karakter bergerak dari bawah
   * menuju bagian atas tiang.
   */
  const poleContainer = character.closest(".pinang-pole-container");

  if (!poleContainer) {
    return;
  }

  const containerHeight = poleContainer.clientHeight;

  const characterHeight = character.offsetHeight || 70;

  /*
   * Batas bawah.
   */
  const bottomStart = 20;

  /*
   * Batas atas.
   *
   * Kita sisakan jarak dari finish
   * supaya karakter tidak keluar tiang.
   */
  const bottomFinish = Math.max(80, containerHeight - characterHeight - 58);

  const bottom = bottomStart + (bottomFinish - bottomStart) * progress;

  character.style.bottom = `${bottom}px`;

  /*
   * Animasi hanya ketika benar-benar naik.
   */
  if (animate && progress > 0 && position < raceMaxSteps) {
    character.classList.remove("climbing");

    void character.offsetWidth;

    character.classList.add("climbing");

    setTimeout(() => {
      character.classList.remove("climbing");
    }, 700);
  }

  /*
   * Finish.
   */
  if (position >= raceMaxSteps) {
    character.classList.add("finished");
  } else {
    character.classList.remove("finished");
  }
}

/* =========================================================
   RACE PROGRESS
========================================================= */

function updateRaceProgress() {
  const progressA =
    raceMaxSteps > 0 ? Math.round((runnerAPosition / raceMaxSteps) * 100) : 0;

  const progressB =
    raceMaxSteps > 0 ? Math.round((runnerBPosition / raceMaxSteps) * 100) : 0;

  /*
   * Progress ditampilkan melalui round message.
   */
  const roundMessage = document.getElementById("roundMessage");

  if (roundMessage && !gameFinished) {
    roundMessage.hidden = false;

    roundMessage.innerHTML = `
      <span>
        🔴 ${escapeHtml(teamAName)}
        <strong>${progressA}%</strong>
      </span>

      <span>
        🔵 ${escapeHtml(teamBName)}
        <strong>${progressB}%</strong>
      </span>
    `;
  }
}

/* =========================================================
   GLOBAL PROGRESS
========================================================= */

function updateGlobalProgress() {
  const aTotal = teamState.A.questions.length;

  const bTotal = teamState.B.questions.length;

  const aDone = completedQuestionIds.A.size;

  const bDone = completedQuestionIds.B.size;

  const aCurrent = teamState.A.finished ? aTotal : Math.min(aDone + 1, aTotal);

  const bCurrent = teamState.B.finished ? bTotal : Math.min(bDone + 1, bTotal);

  setText(
    "questionNumber",
    `A ${aCurrent}/${aTotal} • B ${bCurrent}/${bTotal}`,
  );

  setText("questionTotal", String(totalGameQuestions));
}

/* =========================================================
   CHECK GAME FINISHED
========================================================= */

function checkGameFinished() {
  if (gameFinished) {
    return;
  }

  /*
   * Finish karena mencapai puncak.
   */
  if (runnerAPosition >= raceMaxSteps) {
    finishGame("A", "race");

    return;
  }

  if (runnerBPosition >= raceMaxSteps) {
    finishGame("B", "race");

    return;
  }

  /*
   * Jika kedua tim sudah menghabiskan
   * semua soal tetapi belum finish,
   * pemenang ditentukan berdasarkan skor.
   */
  const aFinished =
    teamState.A.finished ||
    completedQuestionIds.A.size >= teamState.A.questions.length;

  const bFinished =
    teamState.B.finished ||
    completedQuestionIds.B.size >= teamState.B.questions.length;

  if (aFinished && bFinished) {
    finishGame(null, "score");
  }
}

/* =========================================================
   FINISH GAME
========================================================= */

function finishGame(forcedWinner = null, reason = "score") {
  if (gameFinished) {
    return;
  }

  /*
   * Kunci game.
   */
  gameFinished = true;

  stopTeamTimer("A");
  stopTeamTimer("B");

  /*
   * Tentukan pemenang.
   */
  let winner = forcedWinner;

  if (!winner) {
    if (teamAScore > teamBScore) {
      winner = "A";
    } else if (teamBScore > teamAScore) {
      winner = "B";
    } else {
      winner = "draw";
    }
  }

  console.log("PANJAT PINANG SELESAI:", {
    teamA: teamAName,
    teamB: teamBName,
    scoreA: teamAScore,
    scoreB: teamBScore,
    runnerA: runnerAPosition,
    runnerB: runnerBPosition,
    winner,
    reason,
  });

  /*
   * Tandai pemenang.
   */
  if (winner === "A") {
    const characterA = document.getElementById("panjatCharacterA");

    if (characterA) {
      characterA.classList.remove("climbing");

      void characterA.offsetWidth;

      characterA.classList.add("finished");
    }
  }

  if (winner === "B") {
    const characterB = document.getElementById("panjatCharacterB");

    if (characterB) {
      characterB.classList.remove("climbing");

      void characterB.offsetWidth;

      characterB.classList.add("finished");
    }
  }

  /*
   * Musik.
   */
  if (winner === "A" || winner === "B") {
    playWinMusic();
  } else {
    playZonkMusic();
  }

  /*
   * Tampilkan pesan finish terlebih dahulu.
   */
  const roundMessage = document.getElementById("roundMessage");

  if (roundMessage) {
    roundMessage.hidden = false;

    if (winner === "A") {
      roundMessage.innerHTML = `
        🏆
        <strong>
          ${escapeHtml(teamAName)}
          mencapai puncak!
        </strong>
      `;
    } else if (winner === "B") {
      roundMessage.innerHTML = `
        🏆
        <strong>
          ${escapeHtml(teamBName)}
          mencapai puncak!
        </strong>
      `;
    } else {
      roundMessage.innerHTML = `
        🤝
        <strong>
          Permainan berakhir seri!
        </strong>
      `;
    }
  }

  /*
   * Tunggu animasi karakter sebelum
   * berpindah ke halaman hasil.
   */
  setTimeout(() => {
    showFinalResult(winner, reason);
  }, 2000);
}

/* =========================================================
   SHOW FINAL RESULT
========================================================= */

function showFinalResult(winner, reason) {
  const setupSection = document.getElementById("setupSection");

  const gameSection = document.getElementById("gameSection");

  const resultSection = document.getElementById("resultSection");

  if (setupSection) {
    setupSection.hidden = true;
  }

  if (gameSection) {
    gameSection.hidden = true;
  }

  if (resultSection) {
    resultSection.hidden = false;
  }

  /*
   * Nama.
   */
  setText("finalTeamA", teamAName);

  setText("finalTeamB", teamBName);

  /*
   * Skor.
   */
  setText("finalScoreA", String(teamAScore));

  setText("finalScoreB", String(teamBScore));

  /*
   * Pesan.
   */
  showWinnerResult(winner, reason);

  /*
   * Confetti.
   */
  if (winner !== "draw") {
    launchConfetti(winner);
  }
}

/* =========================================================
   WINNER RESULT
========================================================= */

function showWinnerResult(winner, reason = "score") {
  const resultMessage = document.getElementById("resultMessage");

  if (!resultMessage) {
    return;
  }

  if (winner === "A") {
    resultMessage.innerHTML = `
      <span class="pinang-winner-badge">
        🏆 PEMENANG
      </span>

      <strong>
        🔴 ${escapeHtml(teamAName)}
      </strong>

      <span>
        ${
          reason === "race"
            ? "Berhasil mencapai puncak Panjat Pinang lebih dulu!"
            : `Menang dengan skor ${teamAScore} poin!`
        }
      </span>
    `;
  } else if (winner === "B") {
    resultMessage.innerHTML = `
      <span class="pinang-winner-badge">
        🏆 PEMENANG
      </span>

      <strong>
        🔵 ${escapeHtml(teamBName)}
      </strong>

      <span>
        ${
          reason === "race"
            ? "Berhasil mencapai puncak Panjat Pinang lebih dulu!"
            : `Menang dengan skor ${teamBScore} poin!`
        }
      </span>
    `;
  } else {
    resultMessage.innerHTML = `
      <span class="pinang-winner-badge">
        🤝 HASIL SERI
      </span>

      <strong>
        Kedua Tim Sama Kuat!
      </strong>

      <span>
        ${teamAScore} : ${teamBScore}
      </span>
    `;
  }
}

/* =========================================================
   CONFETTI
   ========================================================= */

function launchConfetti(winner) {
  document
    .querySelectorAll(".confetti-piece")
    .forEach((element) => element.remove());

  const colors =
    winner === "A"
      ? ["#ef4444", "#f97316", "#facc15", "#ffffff", "#dc2626", "#fb7185"]
      : ["#3b82f6", "#06b6d4", "#facc15", "#ffffff", "#2563eb", "#60a5fa"];

  const count = 140;

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");

    piece.className = "confetti-piece";

    const size = 6 + Math.random() * 9;

    const left = Math.random() * 100;

    const delay = Math.random() * 1.8;

    const duration = 3.2 + Math.random() * 2.5;

    const rotation = Math.random() * 360;

    const drift = -180 + Math.random() * 360;

    const color = colors[Math.floor(Math.random() * colors.length)];

    piece.style.left = `${left}%`;

    piece.style.width = `${size}px`;

    piece.style.height = `${size * 1.6}px`;

    piece.style.background = color;

    piece.style.animationDelay = `${delay}s`;

    piece.style.animationDuration = `${duration}s`;

    piece.style.setProperty("--confetti-drift", `${drift}px`);

    piece.style.transform = `translateY(-30px)
             rotate(${rotation}deg)`;

    fragment.appendChild(piece);
  }

  document.body.appendChild(fragment);

  setTimeout(() => {
    document
      .querySelectorAll(".confetti-piece")
      .forEach((element) => element.remove());
  }, 8000);
}

/* =========================================================
   RESTART
========================================================= */

function restartGame() {
  stopTeamTimer("A");
  stopTeamTimer("B");

  stopAllMusic();

  document
    .querySelectorAll(".pinang-confetti-piece")
    .forEach((element) => element.remove());

  resetGameState();

  const resultSection = document.getElementById("resultSection");

  if (resultSection) {
    resultSection.hidden = true;
  }

  const setupSection = document.getElementById("setupSection");

  if (setupSection) {
    setupSection.hidden = false;
  }

  const gameSection = document.getElementById("gameSection");

  if (gameSection) {
    gameSection.hidden = true;
  }

  initPinangSetup().catch((error) => {
    console.error("Gagal mengulang setup:", error);

    showSetupError("Gagal memuat setup: " + error.message);
  });
}

/* =========================================================
   BACK HOME
========================================================= */

function backToHome() {
  stopTeamTimer("A");
  stopTeamTimer("B");

  stopAllMusic();

  window.location.href = "../index.html";
}

/* =========================================================
   SETUP ERROR
========================================================= */

function showSetupError(message) {
  const errorElement = document.getElementById("setupError");

  if (!errorElement) {
    alert(message);
    return;
  }

  errorElement.textContent = message;

  errorElement.hidden = false;
}

function clearSetupError() {
  const errorElement = document.getElementById("setupError");

  if (errorElement) {
    errorElement.textContent = "";

    errorElement.hidden = true;
  }
}

/* =========================================================
   TEXT HELPER
========================================================= */

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   SHUFFLE
========================================================= */

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/* =========================================================
   MUTE MUSIC
========================================================= */

function toggleMusicMute() {
  initGameMusic();

  isGameMusicMuted = !isGameMusicMuted;

  if (gameMusic) {
    gameMusic.muted = isGameMusicMuted;
  }

  if (winMusic) {
    winMusic.muted = isGameMusicMuted;
  }

  if (zonkMusic) {
    zonkMusic.muted = isGameMusicMuted;
  }

  const button = document.getElementById("muteMusicButton");

  if (button) {
    button.textContent = isGameMusicMuted ? "🔇" : "🔊";

    button.setAttribute(
      "aria-label",
      isGameMusicMuted ? "Unmute musik" : "Mute musik",
    );

    button.setAttribute(
      "title",
      isGameMusicMuted ? "Unmute musik" : "Mute musik",
    );
  }
}
