/* =========================================================
   EDU GAME - BALAP KARUNG
   DUAL TEAM / SIMULTAN
   ========================================================= */

/* =========================================================
   STATE GAME
   ========================================================= */

let sackQuestions = [];

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
 * Kedua tim mendapatkan SEMUA soal.
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
 * Soal yang sedang dipakai oleh masing-masing tim.
 *
 * Soal yang sama tidak boleh aktif bersamaan.
 */
const activeQuestionIds = {
  A: null,
  B: null,
};

/*
 * Soal yang sudah selesai untuk masing-masing tim.
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
   BACKGROUND MUSIC
   ========================================================= */

let gameMusic = null;
let winMusic = null;
let zonkMusic = null;

/* =========================================================
   RACE STATE
   ========================================================= */

/*
 * Posisi pelari.
 *
 * 0 = start
 * raceMaxSteps = finish
 */
let runnerAPosition = 0;
let runnerBPosition = 0;

/*
 * Jumlah jawaban benar yang dibutuhkan
 * untuk mencapai garis finish.
 */
let raceMaxSteps = 1;

/*
 * Total soal.
 */
let totalGameQuestions = 0;

/* =========================================================
   GAME MUSIC
   ========================================================= */

function initGameMusic() {
  gameMusic = new Audio("../assets/audio/game.mp3");

  gameMusic.loop = true;
  gameMusic.volume = 0.35;

  winMusic = new Audio("../assets/audio/victory.mp3");

  winMusic.loop = false;
  winMusic.volume = 0.55;

  zonkMusic = new Audio("../assets/audio/zonk.mp3");

  zonkMusic.loop = false;
  zonkMusic.volume = 0.55;
}

/* =========================================================
   START GAME MUSIC
   ========================================================= */

function startGameMusic() {
  if (!gameMusic) {
    initGameMusic();
  }

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
   PLAY WIN MUSIC
   ========================================================= */

function playWinMusic() {
  if (!winMusic) {
    initGameMusic();
  }

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
   PLAY ZONK MUSIC
   ========================================================= */

function playZonkMusic() {
  if (!zonkMusic) {
    initGameMusic();
  }

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

function getTugGameSettings() {
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
   DATABASE READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Balap Karung: halaman siap.");

  try {
    await ensureDatabase();

    console.log("Balap Karung: database siap.");

    currentSettings = getTugGameSettings();

    await initSackSetup();

    const startButton = document.getElementById("startGameButton");

    if (startButton) {
      startButton.onclick = startSackRace;
    } else {
      console.error("startGameButton tidak ditemukan.");
    }
  } catch (error) {
    console.error("Gagal menjalankan Balap Karung:", error);

    showSetupError("Database gagal dimuat: " + error.message);
  }
});

/* =========================================================
   SETUP GAME
   ========================================================= */

async function initSackSetup() {
  const subjectSelect = document.getElementById("subjectSelect");
  const classSelect = document.getElementById("classSelect");
  const bankSelect = document.getElementById("bankSelect");

  if (!subjectSelect || !classSelect || !bankSelect) {
    throw new Error("Element select setup tidak ditemukan.");
  }

  subjectSelect.innerHTML = `
    <option value="">
      Pilih Mata Pelajaran
    </option>
  `;

  classSelect.innerHTML = `
    <option value="">
      Pilih Kelas
    </option>
  `;

  bankSelect.innerHTML = `
    <option value="">
      Pilih Bank Soal
    </option>
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
      <option value="">
        Pilih Kelas
      </option>
    `;

    bankSelect.innerHTML = `
      <option value="">
        Pilih Bank Soal
      </option>
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
      <option value="">
        Pilih Bank Soal
      </option>
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
          <option value="">
            Tidak ada Bank Soal
          </option>
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
        <option value="">
          Gagal memuat Bank Soal
        </option>
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
   INFO SETUP
   ========================================================= */

function updateSetupInfo() {
  const setupInfo = document.getElementById("setupInfo");

  if (!setupInfo) {
    return;
  }

  currentSettings = getTugGameSettings();

  if (currentSettings.useTimer) {
    setupInfo.textContent = `⏱️ Timer aktif: ${currentSettings.timeLimit} detik per soal.`;
  } else {
    setupInfo.textContent = "⏱️ Timer tidak digunakan.";
  }
}

/* =========================================================
   START SACK RACE
   ========================================================= */

async function startSackRace() {
  clearSetupError();

  const subjectSelect = document.getElementById("subjectSelect");

  const classSelect = document.getElementById("classSelect");

  const bankSelect = document.getElementById("bankSelect");

  const teamAInput = document.getElementById("teamAInput");

  const teamBInput = document.getElementById("teamBInput");

  if (!subjectSelect || !classSelect || !bankSelect) {
    showSetupError("Form permainan tidak lengkap.");
    return;
  }

  const subject = subjectSelect.value.trim();
  const className = classSelect.value.trim();
  const bankId = bankSelect.value;

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
       ACAK BANK SOAL
       ================================================= */

    sackQuestions = shuffleArray([...uniqueQuestions]);

    totalGameQuestions = sackQuestions.length;

    /* =================================================
       RESET
       ================================================= */

    resetGameState();

    /*
     * KEDUA TIM MEMPUNYAI SEMUA SOAL.
     */
    teamAQuestions = shuffleArray([...sackQuestions]);

    teamBQuestions = shuffleArray([...sackQuestions]);

    teamState.A.questions = teamAQuestions;

    teamState.B.questions = teamBQuestions;

    /*
     * Jumlah jawaban benar yang diperlukan
     * untuk sampai finish.
     *
     * Dengan 10 soal:
     *
     * START |--1--2--3--4--5--6--7--8--9--10--| FINISH
     */
    raceMaxSteps = Math.max(1, Math.ceil(totalGameQuestions / 2) + 1);

    setText("maxStepsValue", String(raceMaxSteps));

    console.log("BALAP KARUNG:", {
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

    updateGlobalProgress();

    setText("questionTotal", String(totalGameQuestions));

    /* =================================================
       RESET RUNNER
       ================================================= */

    runnerAPosition = 0;
    runnerBPosition = 0;

    createRaceSteps(raceMaxSteps);

    /*
     * Pastikan posisi awal sudah dihitung
     * sebelum animasi opening dimainkan.
     */
    updateRunnerPositions();

    /*
     * Animasi karakter masuk ke posisi start.
     */
    playRaceOpeningAnimation();

    /* =================================================
       TAMPILKAN GAME
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

    const globalTimer = document.getElementById("timerContainer");

    if (globalTimer) {
      globalTimer.hidden = true;
    }

    ensureTeamTimers();

    /* =================================================
       MULAI KEDUA TIM
       ================================================= */

    showTeamRound("A");
    showTeamRound("B");

    console.log("GAME BALAP KARUNG DIMULAI");
  } catch (error) {
    console.error("Gagal memulai game:", error);

    showSetupError("Gagal memulai permainan: " + error.message);
  }
}

/* =========================================================
   RACE OPENING ANIMATION
========================================================= */

function playRaceOpeningAnimation() {
  const characterA = document.getElementById("redCharacter");
  const characterB = document.getElementById("blueCharacter");

  if (!characterA || !characterB) {
    return;
  }

  /*
   * Bersihkan animasi sebelumnya.
   */
  characterA.classList.remove("race-opening", "race-ready");
  characterB.classList.remove("race-opening", "race-ready");

  /*
   * Paksa browser reset animasi.
   */
  void characterA.offsetWidth;
  void characterB.offsetWidth;

  /*
   * TAHAP 1:
   * Karakter muncul dari samping.
   */
  characterA.classList.add("race-opening");
  characterB.classList.add("race-opening");

  /*
   * TAHAP 2:
   * Setelah karakter selesai muncul,
   * keduanya loncat di tempat.
   */
  setTimeout(() => {
    characterA.classList.remove("race-opening");
    characterB.classList.remove("race-opening");

    /*
     * Paksa reset sebelum animasi loncat.
     */
    void characterA.offsetWidth;
    void characterB.offsetWidth;

    characterA.classList.add("race-ready");
    characterB.classList.add("race-ready");

    /*
     * Setelah loncat selesai,
     * hapus class supaya kembali diam.
     */
    setTimeout(() => {
      characterA.classList.remove("race-ready");
      characterB.classList.remove("race-ready");
    }, 600);
  }, 650);
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

  updateRunnerPositions();
}

/* =========================================================
   FIND NEXT AVAILABLE QUESTION
   ========================================================= */

function findNextAvailableQuestion(team) {
  const state = teamState[team];

  if (!state || !state.questions.length) {
    return null;
  }

  const otherTeam = team === "A" ? "B" : "A";

  /*
   * Cari dari seluruh bank.
   */
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
     * Sedang dipakai lawan.
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
   SHUFFLE QUESTION ANSWERS
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

    originalAnswer,
    shuffledAnswer: newAnswer,
  };
}

/* =========================================================
   SHOW TEAM ROUND
   ========================================================= */

function showTeamRound(team) {
  const state = teamState[team];

  if (!state) {
    return;
  }

  stopTeamTimer(team);

  const next = findNextAvailableQuestion(team);

  /*
   * Tidak ada soal.
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
     * Soal mungkin sedang digunakan
     * oleh lawan.
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

  /*
   * Shuffle jawaban jika aktif.
   */
  const question = shuffleQuestionAnswers(originalQuestion);

  /*
   * Simpan soal aktif.
   */
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
     PROGRESS
     ===================================================== */

  renderTeamProgress(team);

  /* =====================================================
     ANSWERS
     ===================================================== */

  renderAnswers(team);

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
   TEAM FINISHED
   ========================================================= */

function showTeamFinished(team) {
  const questionTextId = team === "A" ? "questionAText" : "questionBText";

  const answersId = team === "A" ? "answersA" : "answersB";

  const statusId = team === "A" ? "statusA" : "statusB";

  setText(statusId, "🏁 Selesai");

  setText(
    questionTextId,
    `🎉 ${
      team === "A" ? teamAName : teamBName
    } telah menyelesaikan semua soal.`,
  );

  const answers = document.getElementById(answersId);

  if (answers) {
    answers.innerHTML = `
      <div class="team-finished-message">
        🏁 Semua soal telah selesai dijawab!
      </div>
    `;
  }

  renderTeamProgress(team, true);

  activeQuestionIds[team] = null;

  stopTeamTimer(team);

  updateTeamTimerDisplay(team, null, true);

  updateGlobalProgress();
}

/* =========================================================
   RENDER TEAM PROGRESS
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
   RENDER ANSWERS
   ========================================================= */

function renderAnswers(team) {
  const containerId = team === "A" ? "answersA" : "answersB";

  const container = document.getElementById(containerId);

  if (!container) {
    console.error("Container jawaban tidak ditemukan:", containerId);

    return;
  }

  container.innerHTML = "";

  const state = teamState[team];

  if (!state) {
    return;
  }

  /*
   * WAJIB menggunakan currentQuestion.
   */
  const question = state.currentQuestion;

  if (!question) {
    console.error("Soal aktif tidak ditemukan:", team);

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

    button.className = "answer-button";

    button.dataset.answer = letter;

    button.innerHTML = `
        <span class="answer-letter">
          ${letter}
        </span>

        <span class="answer-text">
          ${escapeHtml(options[letter])}
        </span>
      `;

    button.style.touchAction = "none";

    button.style.userSelect = "none";

    button.style.webkitUserSelect = "none";

    button.style.webkitTouchCallout = "none";

    button.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (
          teamState[team].answered ||
          teamState[team].finished ||
          gameFinished
        ) {
          return;
        }

        answerQuestion(team, letter, button);
      },
      {
        passive: false,
      },
    );

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
    console.error("Tidak ada currentQuestion:", team);

    return;
  }

  const questionId = state.currentQuestionId || getQuestionId(question);

  /*
   * Pastikan soal memang milik tim ini.
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

  /*
   * Visual jawaban.
   */
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
     JAWABAN BENAR
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
     * Pelari maju satu langkah.
     */
    moveRunner(team);

    /*
     * Kalau sudah finish,
     * moveRunner() sudah memanggil
     * finishGame().
     */
    if (gameFinished) {
      return;
    }
  }

  /*
   * Lanjut soal.
   */
  setTimeout(() => {
    if (!gameFinished) {
      nextTeamQuestion(team);
    }
  }, 500);
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
   SOUND CORRECT / WRONG ANSWER
   ========================================================= */

function playAnswerSound(isCorrect) {
  const sound = new Audio(
    isCorrect ? "../assets/audio/correct.mp3" : "../assets/audio/wrong.mp3",
  );

  sound.volume = 0.8;
  sound.play().catch((error) => {
    console.error("Audio gagal:", error);
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

    /*
     * Tunggu soal yang sedang digunakan
     * lawan selesai.
     */
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
   TEAM TIMER
   ========================================================= */

function startTeamTimer(team) {
  stopTeamTimer(team);

  const state = teamState[team];

  if (!state) {
    return;
  }

  const limit = Math.max(1, Number(currentSettings.timeLimit) || 15);

  const token = ++state.timerToken;

  let remaining = limit;

  updateTeamTimerDisplay(team, remaining, false);

  state.timer = setInterval(() => {
    if (token !== state.timerToken) {
      stopTeamTimer(team);
      return;
    }

    if (state.answered || state.finished || gameFinished) {
      stopTeamTimer(team);
      return;
    }

    remaining--;

    updateTeamTimerDisplay(team, Math.max(0, remaining), false);

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
}

/* =========================================================
   TIMER DISPLAY
   ========================================================= */

function updateTeamTimerDisplay(team, seconds, hidden) {
  ensureTeamTimers();

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

  container.classList.toggle("timer-warning", Number(seconds) <= 5);

  container.classList.toggle("timer-danger", Number(seconds) <= 3);
}

/* =========================================================
   CREATE TEAM TIMERS
   ========================================================= */

function ensureTeamTimers() {
  createTeamTimer("A");
  createTeamTimer("B");
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

  /*
   * Gunakan soal aktif.
   * Jangan mengambil berdasarkan index
   * karena soal aktif sudah diproses.
   */
  const question = state.currentQuestion;

  if (!question) {
    return;
  }

  const questionId = state.currentQuestionId || getQuestionId(question);

  state.answered = true;

  disableAnswers(team);

  setText(team === "A" ? "statusA" : "statusB", "⏰ Waktu habis");

  activeQuestionIds[team] = null;

  /*
   * Waktu habis = soal selesai,
   * tetapi tidak mendapat poin
   * dan tidak maju.
   */
  completedQuestionIds[team].add(questionId);

  playAnswerSound(false);

  setTimeout(() => {
    if (!gameFinished) {
      nextTeamQuestion(team);
    }
  }, 450);
}

/* =========================================================
   MOVE RUNNER
   ========================================================= */

function moveRunner(team) {
  if (gameFinished) {
    return;
  }

  let progress;

  if (team === "A") {
    runnerAPosition++;

    runnerAPosition = Math.min(raceMaxSteps, runnerAPosition);

    progress = (runnerAPosition / raceMaxSteps) * 100;
  } else {
    runnerBPosition++;

    runnerBPosition = Math.min(raceMaxSteps, runnerBPosition);

    progress = (runnerBPosition / raceMaxSteps) * 100;
  }

  /*
   * HANYA karakter tim yang menjawab benar
   * yang digerakkan dan dianimasikan.
   */
  moveCharacter(team, progress);

  updateRaceStepMarkers();

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
   UPDATE RUNNER POSITIONS
========================================================= */

function updateRunnerPositions() {
  const runnerA = document.getElementById("redCharacter");
  const runnerB = document.getElementById("blueCharacter");

  if (!runnerA || !runnerB) {
    console.warn("Karakter balap tidak ditemukan.");
    return;
  }

  const percentA =
    raceMaxSteps > 0 ? (runnerAPosition / raceMaxSteps) * 100 : 0;

  const percentB =
    raceMaxSteps > 0 ? (runnerBPosition / raceMaxSteps) * 100 : 0;

  /*
   * Hanya update posisi.
   * JANGAN menjalankan animasi di sini.
   */
  setCharacterPosition("A", percentA);
  setCharacterPosition("B", percentB);

  updateRaceStepMarkers();

  runnerA.classList.toggle("finished", runnerAPosition >= raceMaxSteps);

  runnerB.classList.toggle("finished", runnerBPosition >= raceMaxSteps);
}

function setCharacterPosition(team, progress) {
  const character =
    team === "A"
      ? document.getElementById("redCharacter")
      : document.getElementById("blueCharacter");

  const marker =
    team === "A"
      ? document.getElementById("raceProgressA")
      : document.getElementById("raceProgressB");

  if (!character) return;

  const track = character.closest(".race-track");

  if (!track) return;

  progress = Math.max(0, Math.min(100, Number(progress) || 0));

  const padding = 15;
  const characterWidth = character.offsetWidth;

  const startX = padding + characterWidth * 0.2;

  const finishX = track.clientWidth - padding - characterWidth * 0.8;

  const x = startX + (finishX - startX) * (progress / 100);

  character.style.left = `${x}px`;

  if (marker) {
    marker.style.left = `${x}px`;
  }
}

/* =========================================================
   MOVE CHARACTER
========================================================= */

function moveCharacter(team, progress) {
  const character =
    team === "A"
      ? document.getElementById("redCharacter")
      : document.getElementById("blueCharacter");

  const marker =
    team === "A"
      ? document.getElementById("raceProgressA")
      : document.getElementById("raceProgressB");

  if (!character) {
    console.warn(`Karakter tim ${team} tidak ditemukan.`);
    return;
  }

  const track = character.closest(".race-track");

  if (!track) {
    console.warn(`Race track tim ${team} tidak ditemukan.`);
    return;
  }

  progress = Math.max(0, Math.min(100, Number(progress) || 0));

  /*
   * Posisi karakter dihitung berdasarkan
   * ukuran track sebenarnya.
   */
  const padding = 15;
  const characterWidth = character.offsetWidth;

  const startX = padding + characterWidth * 0.2;

  const finishX = track.clientWidth - padding - characterWidth * 0.8;

  const x = startX + (finishX - startX) * (progress / 100);

  /*
   * Gerakkan karakter.
   */
  character.style.left = `${x}px`;

  /*
   * Gerakkan marker juga.
   */
  if (marker) {
    marker.style.left = `${x}px`;
  }

  /*
   * Animasi lompat.
   */
  if (progress > 0) {
    character.classList.remove("running");

    void character.offsetWidth;

    character.classList.add("running");
  }
}

/* =========================================================
   CREATE RACE STEPS
   ========================================================= */

function createRaceSteps(maxSteps) {
  /*
   * Bisa menggunakan:
   *
   * .race-track
   *
   * atau
   *
   * .race-lane
   */
  const track =
    document.querySelector(".race-track") ||
    document.querySelector(".race-lane");

  if (!track) {
    return;
  }

  const oldSteps = track.querySelector(".race-steps");

  if (oldSteps) {
    oldSteps.remove();
  }

  const steps = document.createElement("div");

  steps.className = "race-steps";

  /*
   * Marker dari START sampai FINISH.
   */
  for (let index = 0; index <= maxSteps; index++) {
    const marker = document.createElement("span");

    marker.className = "race-step-marker";

    const position = maxSteps === 0 ? 0 : (index / maxSteps) * 100;

    marker.style.left = `${position}%`;

    if (index === 0) {
      marker.classList.add("start-step");
    }

    if (index === maxSteps) {
      marker.classList.add("finish-step");
    }

    steps.appendChild(marker);
  }

  track.appendChild(steps);

  updateRaceStepMarkers();
}

/* =========================================================
   UPDATE RACE MARKERS
   ========================================================= */

function updateRaceStepMarkers() {
  const steps = document.querySelector(".race-steps");

  if (!steps) {
    return;
  }

  const markers = [...steps.querySelectorAll(".race-step-marker")];

  if (!markers.length) {
    return;
  }

  markers.forEach((marker, index) => {
    /*
     * Progress Tim A.
     */
    marker.classList.toggle("passed-a", index <= runnerAPosition);

    /*
     * Progress Tim B.
     */
    marker.classList.toggle("passed-b", index <= runnerBPosition);

    /*
     * Finish.
     */
    marker.classList.toggle(
      "active-finish-a",
      index === raceMaxSteps && runnerAPosition >= raceMaxSteps,
    );

    marker.classList.toggle(
      "active-finish-b",
      index === raceMaxSteps && runnerBPosition >= raceMaxSteps,
    );
  });
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
   * Finish berdasarkan posisi.
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
   * Cek apakah semua soal kedua tim
   * sudah selesai.
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

// function finishGame(forcedWinner = null, reason = "score") {
//   if (gameFinished) {
//     return;
//   }

//   gameFinished = true;

//   stopTeamTimer("A");
//   stopTeamTimer("B");

//   /*
//    * Tentukan pemenang.
//    */
//   let winner = forcedWinner;

//   if (!winner) {
//     if (teamAScore > teamBScore) {
//       winner = "A";
//     } else if (teamBScore > teamAScore) {
//       winner = "B";
//     } else {
//       winner = "draw";
//     }
//   }

//   /*
//    * Musik.
//    */
//   if (winner === "A" || winner === "B") {
//     playWinMusic();
//   } else {
//     playZonkMusic();
//   }

//   console.log("BALAP KARUNG SELESAI:", {
//     teamA: teamAName,
//     teamB: teamBName,
//     scoreA: teamAScore,
//     scoreB: teamBScore,
//     runnerA: runnerAPosition,
//     runnerB: runnerBPosition,
//     winner,
//     reason,
//   });

//   /*
//    * Sembunyikan game.
//    */
//   const setupSection = document.getElementById("setupSection");

//   const gameSection = document.getElementById("gameSection");

//   const resultSection = document.getElementById("resultSection");

//   if (setupSection) {
//     setupSection.hidden = true;
//   }

//   if (gameSection) {
//     gameSection.hidden = true;
//   }

//   if (resultSection) {
//     resultSection.hidden = false;

//     resultSection.classList.add("result-celebration");
//   }

//   /*
//    * Nama.
//    */
//   setText("finalTeamA", teamAName);

//   setText("finalTeamB", teamBName);

//   /*
//    * Skor.
//    */
//   setText("finalScoreA", String(teamAScore));

//   setText("finalScoreB", String(teamBScore));

//   /*
//    * Hasil.
//    */
//   showWinnerResult(winner, reason);

//   /*
//    * Confetti.
//    */
//   if (winner !== "draw") {
//     launchConfetti(winner);
//   }
// }
/* =========================================================
   FINISH GAME
   ========================================================= */

function finishGame(forcedWinner = null, reason = "score") {
  if (gameFinished) {
    return;
  }

  /*
   * Kunci game terlebih dahulu agar tidak ada
   * jawaban/timer lain yang masuk selama animasi finish.
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

  console.log("BALAP KARUNG SELESAI:", {
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
   * Pastikan karakter yang menang mendapatkan
   * animasi finish.
   */
  if (winner === "A") {
    const characterA = document.getElementById("redCharacter");

    if (characterA) {
      characterA.classList.remove("running");
      void characterA.offsetWidth;
      characterA.classList.add("finished");
    }
  }

  if (winner === "B") {
    const characterB = document.getElementById("blueCharacter");

    if (characterB) {
      characterB.classList.remove("running");
      void characterB.offsetWidth;
      characterB.classList.add("finished");
    }
  }

  /*
   * Musik kemenangan langsung boleh dimainkan,
   * tetapi RESULT belum ditampilkan.
   */
  if (winner === "A" || winner === "B") {
    playWinMusic();
  } else {
    playZonkMusic();
  }

  /*
   * Tunggu animasi finish terlebih dahulu.
   *
   * 1200 ms = 1.2 detik.
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

  /*
   * Sekarang baru sembunyikan arena.
   */
  if (gameSection) {
    gameSection.hidden = true;
  }

  /*
   * Tampilkan hasil.
   */
  if (resultSection) {
    resultSection.hidden = false;

    /*
     * Paksa reset animasi result jika sebelumnya
     * sudah pernah digunakan.
     */
    resultSection.classList.remove("result-celebration");

    void resultSection.offsetWidth;

    resultSection.classList.add("result-celebration");
  }

  /*
   * Nama tim.
   */
  setText("finalTeamA", teamAName);
  setText("finalTeamB", teamBName);

  /*
   * Skor akhir.
   */
  setText("finalScoreA", String(teamAScore));
  setText("finalScoreB", String(teamBScore));

  /*
   * Pesan pemenang.
   */
  showWinnerResult(winner, reason);

  /*
   * Confetti baru muncul ketika RESULT tampil.
   */
  if (winner !== "draw") {
    launchConfetti(winner);
  }
}

/* =========================================================
   SHOW WINNER
   ========================================================= */

function showWinnerResult(winner, reason = "score") {
  const resultMessage = document.getElementById("resultMessage");

  if (!resultMessage) {
    return;
  }

  resultMessage.className = "";

  if (winner === "A") {
    resultMessage.innerHTML = `
      <span class="winner-badge winner-badge-a">
        🏆 PEMENANG
      </span>

      <strong class="winner-title winner-title-a">
        🔴 ${escapeHtml(teamAName)}
      </strong>

      <span class="winner-subtitle">
        ${
          reason === "race"
            ? "Berhasil mencapai garis finish lebih dulu!"
            : `Menang dengan skor ${teamAScore} poin!`
        }
      </span>
    `;

    resultMessage.classList.add("winner-result-a");
  } else if (winner === "B") {
    resultMessage.innerHTML = `
      <span class="winner-badge winner-badge-b">
        🏆 PEMENANG
      </span>

      <strong class="winner-title winner-title-b">
        🔵 ${escapeHtml(teamBName)}
      </strong>

      <span class="winner-subtitle">
        ${
          reason === "race"
            ? "Berhasil mencapai garis finish lebih dulu!"
            : `Menang dengan skor ${teamBScore} poin!`
        }
      </span>
    `;

    resultMessage.classList.add("winner-result-b");
  } else {
    resultMessage.innerHTML = `
      <span class="winner-badge winner-badge-draw">
        🤝 HASIL SERI
      </span>

      <strong class="winner-title">
        Kedua Tim Sama Kuat!
      </strong>

      <span class="winner-subtitle">
        ${teamAScore} : ${teamBScore}
      </span>
    `;

    resultMessage.classList.add("draw-result");
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

    piece.style.transform = `translateY(-30px) rotate(${rotation}deg)`;

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
   RESTART GAME
   ========================================================= */

function restartGame() {
  stopTeamTimer("A");
  stopTeamTimer("B");

  stopAllMusic();

  document
    .querySelectorAll(".confetti-piece")
    .forEach((element) => element.remove());

  resetGameState();

  const resultSection = document.getElementById("resultSection");

  if (resultSection) {
    resultSection.hidden = true;

    resultSection.classList.remove("result-celebration");
  }

  const setupSection = document.getElementById("setupSection");

  if (setupSection) {
    setupSection.hidden = false;
  }

  const gameSection = document.getElementById("gameSection");

  if (gameSection) {
    gameSection.hidden = true;
  }

  initSackSetup().catch((error) => {
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
   ERROR SETUP
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

let isGameMusicMuted = false;

function toggleMusicMute() {
  if (!gameMusic) {
    initGameMusic();
  }

  isGameMusicMuted = !isGameMusicMuted;

  gameMusic.muted = isGameMusicMuted;

  /*
   * Supaya musik kemenangan juga
   * mengikuti status mute.
   */
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
