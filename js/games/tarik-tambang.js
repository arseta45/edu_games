/* =========================================================
   EDU GAME - TARIK TAMBANG
   DUAL TEAM / SIMULTAN
   ========================================================= */

/* =========================================================
   STATE GAME
   ========================================================= */

let tugQuestions = [];

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
 * Setiap tim memiliki SEMUA soal.
 *
 * Tidak lagi dibagi 50:50.
 */
const teamState = {
  A: {
    questions: [],
    index: 0,
    answered: false,
    finished: false,
    timer: null,
    timerToken: 0,

    // Soal aktif, termasuk posisi jawaban setelah shuffle
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
    // Soal aktif, termasuk posisi jawaban setelah shuffle
    currentQuestion: null,
    currentQuestionId: null,
  },
};

/*
 * Soal yang sedang dikerjakan.
 *
 * Contoh:
 *
 * activeQuestionIds = {
 *     A: "123",
 *     B: "456"
 * }
 *
 * Artinya soal 123 sedang dipakai Merah
 * dan soal 456 sedang dipakai Biru.
 *
 * Soal yang sama tidak boleh aktif bersamaan.
 */
const activeQuestionIds = {
  A: null,
  B: null,
};

/*
 * Menandai soal yang sudah selesai
 * dikerjakan oleh masing-masing tim.
 *
 * Tim tetap mempunyai seluruh bank soal,
 * tetapi soal yang sudah selesai tidak diulang.
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
   GAME MUSIC
   ========================================================= */

function initGameMusic() {
  /*
   * Musik selama permainan.
   * Ganti path sesuai lokasi file musik kamu.
   */
  gameMusic = new Audio("../assets/audio/game.mp3");

  gameMusic.loop = true;
  gameMusic.volume = 0.35;

  /*
   * Musik ketika permainan selesai.
   */
  winMusic = new Audio("../assets/audio/victory.mp3");

  winMusic.loop = false;
  winMusic.volume = 0.55;

  /*
   * Musik ketika draw.
   */
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

  /*
   * Pastikan musik kemenangan berhenti.
   */
  if (winMusic) {
    winMusic.pause();

    winMusic.currentTime = 0;
  }

  gameMusic.currentTime = 0;

  /*
   * Browser biasanya hanya mengizinkan
   * audio setelah user melakukan klik.
   *
   * startTugOfWar() dipanggil dari tombol
   * "Mulai", sehingga aman.
   */
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

  /*
   * Hentikan musik permainan.
   */
  stopGameMusic();

  /*
   * Reset musik kemenangan.
   */
  winMusic.currentTime = 0;

  winMusic.play().catch((error) => {
    console.warn("Musik kemenangan tidak dapat diputar:", error);
  });
}

/* =========================================================
   PLAY ZONK MUSIC
   ========================================================= */

function playZonkMusic() {
  if (!winMusic) {
    initGameMusic();
  }

  /*
   * Hentikan musik permainan.
   */
  stopGameMusic();

  /*
   * Reset musik kemenangan.
   */
  zonkMusic.currentTime = 0;

  zonkMusic.play().catch((error) => {
    console.warn("Musik zonk tidak dapat diputar:", error);
  });
}

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

/*
 * Total soal dalam bank.
 */
let totalGameQuestions = 0;

/*
 * Posisi bendera.

 * Nilai:
 *
 * negatif = arah Merah
 * 0       = tengah
 * positif = arah Biru
 *
 * Satu jawaban benar = satu titik.
 */
let ropeDifference = 0;

/*
 * Jumlah titik dari tengah ke ujung.
 *
 * Contoh 10 soal:
 *
 * Merah <- -5 -4 -3 -2 -1 0 +1 +2 +3 +4 +5 -> Biru
 *
 * Jadi ada 11 posisi.
 */
let ropeMaxSteps = 1;

/* =========================================================
   SETTINGS
   ========================================================= */

function getTugGameSettings() {
  const defaultSettings = {
    useTimer: true,
    timeLimit: 15,
    countdown: true,
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
  console.log("Tarik Tambang: halaman siap.");

  try {
    await ensureDatabase();

    console.log("Tarik Tambang: database siap.");

    currentSettings = getTugGameSettings();

    await initTugSetup();

    const startButton = document.getElementById("startGameButton");

    if (startButton) {
      startButton.onclick = startTugOfWar;
    } else {
      console.error("startGameButton tidak ditemukan.");
    }
  } catch (error) {
    console.error("Gagal menjalankan Tarik Tambang:", error);

    showSetupError("Database gagal dimuat: " + error.message);
  }
});

/* =========================================================
   SETUP GAME
   ========================================================= */

async function initTugSetup() {
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
   MULAI GAME
   ========================================================= */

async function startTugOfWar() {
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

    tugQuestions = shuffleArray([...uniqueQuestions]);

    totalGameQuestions = tugQuestions.length;

    /* =================================================
           RESET
           ================================================= */

    /*
     * Reset karakter terlebih dahulu.
     */
    resetRopeCharacters();

    resetGameState();

    /*
     * ==================================================
     * PENTING:
     *
     * TIDAK ADA LAGI:
     *
     * const splitIndex = ...
     * teamAQuestions = slice(...)
     * teamBQuestions = slice(...)
     *
     * KEDUA TIM MENDAPATKAN SEMUA SOAL.
     * ==================================================
     */

    teamAQuestions = shuffleArray([...tugQuestions]);

    teamBQuestions = shuffleArray([...tugQuestions]);

    teamState.A.questions = teamAQuestions;

    teamState.B.questions = teamBQuestions;

    /*
     * Jumlah langkah dari tengah
     * sampai ujung.
     *
     * Dengan 10 soal:
     *
     * -5 ... 0 ... +5
     */
    ropeMaxSteps = Math.max(1, Math.ceil(totalGameQuestions / 2) + 1);

    setText("maxStepsValue", String(ropeMaxSteps));

    console.log("GAME SOAL:", {
      total: totalGameQuestions,

      teamA: teamAQuestions.length,

      teamB: teamBQuestions.length,

      ropeMaxSteps,
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
           ROPE
           ================================================= */

    createRopeSteps(ropeMaxSteps);

    updateRopePosition();

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
    }

    if (gameSection) {
      gameSection.hidden = false;
    }

    /*
     * Mulai musik background game.
     */
    startGameMusic();

    const globalTimer = document.getElementById("timerContainer");

    if (globalTimer) {
      globalTimer.hidden = true;
    }

    ensureTeamTimers();

    /*
     * ==================================================
     * MULAI KEDUA TIM BERSAMAAN
     * ==================================================
     */

    showTeamRound("A");
    showTeamRound("B");

    console.log("GAME TARIK TAMBANG DIMULAI");
  } catch (error) {
    console.error("Gagal memulai game:", error);

    showSetupError("Gagal memulai permainan: " + error.message);
  }
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
  resetRopeCharacters();
  stopTeamTimer("A");
  stopTeamTimer("B");

  teamAScore = 0;
  teamBScore = 0;

  ropeDifference = 0;

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

  const roundMessage = document.getElementById("roundMessage");

  if (roundMessage) {
    roundMessage.hidden = true;
    roundMessage.textContent = "";
  }

  const ropePosition = document.getElementById("ropePosition");

  if (ropePosition) {
    ropePosition.style.transform = "translate(-50%, -50%)";
  }
}

/* =========================================================
   CARI SOAL BERIKUTNYA
   ========================================================= */

function findNextAvailableQuestion(team) {
  const state = teamState[team];

  if (!state || !state.questions.length) {
    return null;
  }

  const otherTeam = team === "A" ? "B" : "A";

  /*
   * Cari dari SELURUH bank soal.
   * Jangan mulai dari state.index.
   */
  for (let i = 0; i < state.questions.length; i++) {
    const question = state.questions[i];

    if (!question) {
      continue;
    }

    const questionId = getQuestionId(question);

    /*
     * Soal sudah selesai oleh tim ini.
     */
    if (completedQuestionIds[team].has(questionId)) {
      continue;
    }

    /*
     * Soal sedang aktif oleh lawan.
     *
     * Lewati dulu.
     */
    if (activeQuestionIds[otherTeam] === questionId) {
      continue;
    }

    /*
     * Soal tersedia.
     */
    return {
      question,
      index: i,
    };
  }

  /*
   * Tidak ada soal tersedia saat ini.
   */
  return null;
}

/* =========================================================
   SHUFFLE QUESTION ANSWERS
   ========================================================= */

function shuffleQuestionAnswers(question) {
  /*
   * Jika setting shuffle jawaban MATI,
   * kunci database tetap digunakan.
   */
  if (!currentSettings.shuffleAnswers) {
    return {
      ...question,
    };
  }

  /*
   * Kunci asli dari database.
   *
   * Contoh:
   * answer = "B"
   */
  const originalAnswer = String(question.answer || "")
    .trim()
    .toUpperCase();

  /*
   * Buat daftar jawaban.
   *
   * Setiap pilihan membawa informasi:
   *
   * - text
   * - apakah jawaban benar
   */
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

  /*
   * Acak pilihan.
   */
  shuffleArray(options);

  /*
   * Setelah shuffle:
   *
   * options[0] = posisi A
   * options[1] = posisi B
   * options[2] = posisi C
   * options[3] = posisi D
   */

  /*
   * Cari posisi jawaban benar.
   */
  const correctIndex = options.findIndex((option) => option.isCorrect === true);

  /*
   * Ubah index menjadi huruf.
   *
   * 0 = A
   * 1 = B
   * 2 = C
   * 3 = D
   */
  const letters = ["A", "B", "C", "D"];

  const newAnswer = correctIndex >= 0 ? letters[correctIndex] : originalAnswer;

  /*
   * Kembalikan soal baru.
   *
   * Soal database asli TIDAK disentuh.
   */
  return {
    ...question,

    optionA: options[0].text,
    optionB: options[1].text,
    optionC: options[2].text,
    optionD: options[3].text,

    /*
     * Kunci baru mengikuti posisi
     * jawaban setelah shuffle.
     */
    answer: newAnswer,

    /*
     * Informasi tambahan.
     */
    originalAnswer: originalAnswer,
    shuffledAnswer: newAnswer,
  };
}

/* =========================================================
   SHOW TEAM ROUND
   ========================================================= */

/* =========================================================
   SHOW TEAM ROUND
   ========================================================= */

function showTeamRound(team) {
  const state = teamState[team];

  if (!state) {
    return;
  }

  stopTeamTimer(team);

  /*
   * Cari soal yang tidak sedang
   * dipakai tim lawan.
   */
  const next = findNextAvailableQuestion(team);

  /*
   * Jika tidak ada soal tersedia
   * sekarang, cek apakah benar-benar
   * sudah selesai.
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
     * oleh tim lawan.
     */
    setTimeout(() => {
      if (!gameFinished && !state.finished && !state.answered) {
        showTeamRound(team);
      }
    }, 250);

    return;
  }

  /*
   * Gunakan index soal tersebut.
   */
  state.index = next.index;

  state.answered = false;

  state.finished = false;

  /*
   * =====================================================
   * SOAL ASLI
   * =====================================================
   *
   * Ini soal dari database.
   *
   * Jangan ubah object ini.
   */
  const originalQuestion = next.question;

  const questionId = getQuestionId(originalQuestion);

  /*
   * =====================================================
   * ACAK PILIHAN JAWABAN
   * =====================================================
   *
   * Fungsi ini akan:
   *
   * 1. Mengecek setting shuffleAnswers.
   *
   * 2. Jika OFF:
   *      jawaban tetap seperti database.
   *
   * 3. Jika ON:
   *      pilihan diacak.
   *
   * 4. Kunci jawaban ikut berpindah
   *    mengikuti posisi baru.
   */
  const question = shuffleQuestionAnswers(originalQuestion);

  /*
   * =====================================================
   * SIMPAN SOAL AKTIF
   * =====================================================
   *
   * renderAnswers()
   * dan answerQuestion()
   * akan menggunakan soal ini.
   */
  state.currentQuestion = question;

  state.currentQuestionId = questionId;

  /*
   * Kunci soal untuk tim ini.
   */
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
                🏁 Semua soal selesai
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
   RENDER ANSWERS - MULTI TOUCH
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
   * PENTING:
   *
   * Jangan mengambil:
   *
   * state.questions[state.index]
   *
   * karena soal aktif sudah bisa mengalami
   * shuffle.
   *
   * Gunakan currentQuestion.
   */
  const question = state.currentQuestion;

  if (!question) {
    console.error("Soal aktif tidak ditemukan untuk tim:", team);

    return;
  }

  /*
   * Ambil pilihan dari soal aktif.
   *
   * optionA/B/C/D sudah merupakan
   * posisi setelah shuffle.
   */
  const options = {
    A: question.optionA ?? "",
    B: question.optionB ?? "",
    C: question.optionC ?? "",
    D: question.optionD ?? "",
  };

  /*
   * Render A B C D.
   */
  ["A", "B", "C", "D"].forEach((letter) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "answer-button";

    /*
     * Huruf posisi jawaban.
     */
    button.dataset.answer = letter;

    button.innerHTML = `
        <span class="answer-letter">
          ${letter}
        </span>

        <span class="answer-text">
          ${escapeHtml(options[letter])}
        </span>
      `;

    /*
     * Touchscreen.
     */
    button.style.touchAction = "none";

    button.style.userSelect = "none";

    button.style.webkitUserSelect = "none";

    button.style.webkitTouchCallout = "none";

    /*
     * Pointer event.
     */
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

        /*
         * Kirim huruf POSISI SAAT INI.
         *
         * Contoh:
         *
         * pintar sekarang ada di C
         *
         * maka:
         *
         * answerQuestion(team, "C", button)
         */
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

  /*
   * PENTING:
   *
   * Gunakan currentQuestion.
   *
   * Jangan lagi:
   *
   * state.questions[state.index]
   *
   * karena currentQuestion adalah soal
   * yang sudah disesuaikan dengan shuffle.
   */
  const question = state.currentQuestion;

  if (!question) {
    console.error("Tidak ada currentQuestion:", team);

    return;
  }

  /*
   * ID tetap berasal dari soal asli.
   */
  const questionId = state.currentQuestionId || getQuestionId(question);

  /*
   * Pastikan soal memang sedang
   * dikunci oleh tim ini.
   */
  if (activeQuestionIds[team] !== questionId) {
    return;
  }

  /*
   * =====================================================
   * KUNCI JAWABAN AKTIF
   * =====================================================
   *
   * Jika shuffle OFF:
   *
   * answer = B
   *
   * Jika shuffle ON dan jawaban benar
   * berpindah ke C:
   *
   * answer = C
   */
  const correctAnswer = String(question.answer || "")
    .trim()
    .toUpperCase();

  /*
   * Jawaban yang dipilih pemain.
   */
  const selected = String(selectedAnswer).trim().toUpperCase();

  /*
   * Sekarang perbandingannya benar.
   */
  const isCorrect = selected === correctAnswer;

  state.answered = true;

  stopTeamTimer(team);

  disableAnswers(team);

  /*
   * Lepaskan soal dari status aktif.
   */
  activeQuestionIds[team] = null;

  /*
   * Tandai soal sudah selesai
   * untuk tim ini.
   */
  completedQuestionIds[team].add(questionId);

  /*
   * Visual jawaban.
   */
  if (clickedButton) {
    clickedButton.classList.add(isCorrect ? "correct" : "wrong");
  }

  /*
   * Jika salah, tunjukkan jawaban
   * yang benar.
   */
  if (!isCorrect) {
    highlightCorrectAnswer(team, correctAnswer);
  }

  /*
   * Status.
   */
  setText(
    team === "A" ? "statusA" : "statusB",
    isCorrect ? "✅ Benar" : "❌ Salah",
  );

  /*
   * =====================================================
   * JAWABAN BENAR
   * =====================================================
   */

  if (isCorrect) {
    if (team === "A") {
      teamAScore++;
    } else {
      teamBScore++;
    }

    setText("scoreA", String(teamAScore));

    setText("scoreB", String(teamBScore));

    /*
     * Gerakkan tali.
     */
    moveRope(team);

    /*
     * Jika sudah mencapai ujung,
     * game selesai.
     */
    if (gameFinished) {
      return;
    }
  }

  /*
   * Lanjut soal tim ini.
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
   NEXT QUESTION
   ========================================================= */

function nextTeamQuestion(team) {
  const state = teamState[team];

  if (!state) {
    return;
  }

  if (gameFinished) {
    return;
  }

  state.answered = false;

  /*
   * Jangan langsung index++.
   *
   * Cari soal yang belum dikerjakan
   * dan tidak sedang dipakai lawan.
   */
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
     * Semua soal yang tersedia
     * mungkin sedang dipakai lawan.
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

        <strong id="${
          team === "A" ? "teamATimerDisplay" : "teamBTimerDisplay"
        }">
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

  const question = state.questions[state.index];

  if (!question) {
    return;
  }

  const questionId = getQuestionId(question);

  state.answered = true;

  disableAnswers(team);

  setText(team === "A" ? "statusA" : "statusB", "⏰ Waktu habis");

  /*
   * Lepaskan soal.
   */
  activeQuestionIds[team] = null;

  /*
   * Waktu habis tetap dianggap
   * soal sudah selesai.
   */
  completedQuestionIds[team].add(questionId);

  setTimeout(() => {
    if (!gameFinished) {
      nextTeamQuestion(team);
    }
  }, 450);
}

/* =========================================================
   ROPE
   ========================================================= */

function moveRope(team) {
  if (gameFinished) {
    return;
  }

  /*
   * MERAH = KIRI
   *
   * BIRU = KANAN
   */
  if (team === "A") {
    ropeDifference--;
  } else {
    ropeDifference++;
  }

  /*
   * Batasi posisi.
   */
  ropeDifference = Math.max(
    -ropeMaxSteps,
    Math.min(ropeMaxSteps, ropeDifference),
  );

  /*
   * Update posisi bendera.
   */
  updateRopePosition();

  /*
   * CEK UJUNG.
   *
   * Merah mencapai ujung kiri.
   *
   * Biru mencapai ujung kanan.
   */
  if (ropeDifference <= -ropeMaxSteps) {
    finishGame("A", "rope");

    return;
  }

  if (ropeDifference >= ropeMaxSteps) {
    finishGame("B", "rope");

    return;
  }
}

function updateRopePosition() {
  const ropePosition = document.getElementById("ropePosition");

  if (!ropePosition) {
    return;
  }

  /*
   * Posisi awal / netral harus benar-benar di tengah tali.
   */
  if (ropeDifference === 0) {
    ropePosition.style.left = "50%";
  } else {
    /*
     * Setiap step bergerak dengan jarak yang sama.
     */
    const maxSteps = Math.max(1, ropeMaxSteps);

    const percentage = (ropeDifference / maxSteps) * 50;

    const limitedPercentage = Math.max(-50, Math.min(50, percentage));

    /*
     * 0 = tengah
     * negatif = kiri
     * positif = kanan
     */
    ropePosition.style.left = `calc(50% + ${limitedPercentage}%)`;
  }

  ropePosition.style.top = "50%";

  /*
   * Tetap pusatkan emoji terhadap titik posisinya.
   */
  ropePosition.style.transform = "translate(-50%, -50%)";

  /*
   * Animasi
   */
  ropePosition.classList.remove("rope-step");

  void ropePosition.offsetWidth;

  ropePosition.classList.add("rope-step");

  /*
   * Marker
   */
  updateRopeStepMarkers();
}

/* =========================================================
   CREATE ROPE STEP MARKERS
   ========================================================= */

function createRopeSteps(maxSteps) {
  const rope = document.querySelector(".rope");

  if (!rope) {
    return;
  }

  const oldSteps = rope.querySelector(".rope-steps");

  if (oldSteps) {
    oldSteps.remove();
  }

  const steps = document.createElement("div");

  steps.className = "rope-steps";

  /*
   * Contoh maxSteps = 5:
   *
   * 0   1   2   3   4   5
   * |   |   |   |   |   |
   *
   * Tetapi posisi visual dibuat
   * dari kiri ke kanan:
   *
   * -5 -4 -3 -2 -1 0 +1 +2 +3 +4 +5
   *
   * Total marker = 2 * maxSteps + 1.
   */
  const markerCount = maxSteps * 2 + 1;

  for (let index = 0; index < markerCount; index++) {
    const marker = document.createElement("span");

    marker.className = "rope-step-marker";

    const position = markerCount === 1 ? 50 : (index / (markerCount - 1)) * 100;

    marker.style.left = `${position}%`;

    /*
     * Index tengah.
     */
    const centerIndex = maxSteps;

    if (index === centerIndex) {
      marker.classList.add("center-step");
    }

    steps.appendChild(marker);
  }

  rope.appendChild(steps);

  updateRopeStepMarkers();
}

/* =========================================================
   UPDATE ROPE MARKERS
   ========================================================= */

function updateRopeStepMarkers() {
  const steps = document.querySelector(".rope-steps");

  if (!steps) {
    return;
  }

  const markers = [...steps.querySelectorAll(".rope-step-marker")];

  if (!markers.length) {
    return;
  }

  const maxSteps = Math.max(1, ropeMaxSteps);

  /*
   * Ubah ropeDifference menjadi
   * index marker.
   *
   * Contoh maxSteps 5:
   *
   * difference -5 → index 0
   * difference  0 → index 5
   * difference +5 → index 10
   */
  const currentIndex = maxSteps + ropeDifference;

  markers.forEach((marker, index) => {
    /*
     * Marker ke arah Merah
     */
    marker.classList.toggle("passed-a", index <= currentIndex);

    /*
     * Marker ke arah Biru
     */
    marker.classList.toggle("passed-b", index >= currentIndex);

    /*
     * Marker aktif.
     */
    marker.classList.toggle("active-step", index === currentIndex);
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
   * Jika bendera sudah mencapai ujung,
   * moveRope() sebenarnya sudah
   * memanggil finishGame().
   */
  if (ropeDifference <= -ropeMaxSteps) {
    finishGame("A", "rope");

    return;
  }

  if (ropeDifference >= ropeMaxSteps) {
    finishGame("B", "rope");

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
    /*
     * Jika semua soal habis,
     * pemenang berdasarkan skor.
     */
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

//   // Hentikan SEMUA musik terlebih dahulu
//   // stopAllMusic();

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
//    * Hanya pemenang yang mendapatkan musik.
//    * DRAW = tidak memainkan audio apa pun.
//    */
//   if (winner === "A" || winner === "B") {
//     playWinMusic();
//   } else if (winner === "draw") {
//     playZonkMusic();
//   }

//   console.log("GAME SELESAI:", {
//     teamA: teamAName,
//     teamB: teamBName,
//     scoreA: teamAScore,
//     scoreB: teamBScore,
//     winner,
//     reason,
//     ropeDifference,
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
//    * Confetti jika ada pemenang.
//    */
//   if (winner !== "draw") {
//     launchConfetti(winner);
//   }
// }

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

  console.log("GAME SELESAI:", {
    teamA: teamAName,
    teamB: teamBName,
    scoreA: teamAScore,
    scoreB: teamBScore,
    winner,
    reason,
    ropeDifference,
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
   RESET KARAKTER SAAT GAME BARU
========================================================= */

function resetRopeCharacters() {
  const redCharacter = document.getElementById("redCharacter");
  const blueCharacter = document.getElementById("blueCharacter");

  if (redCharacter) {
    redCharacter.classList.remove("finished", "running");
    void redCharacter.offsetWidth;
  }

  if (blueCharacter) {
    blueCharacter.classList.remove("finished", "running");
    void blueCharacter.offsetWidth;
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
                  reason === "rope"
                    ? "Berhasil menarik bendera sampai ujung!"
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
                  reason === "rope"
                    ? "Berhasil menarik bendera sampai ujung!"
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
   RESTART GAME
   ========================================================= */

function restartGame() {
  stopTeamTimer("A");
  stopTeamTimer("B");

  /*
   * Hentikan semua musik.
   */
  stopGameMusic();

  resetRopeCharacters();

  if (winMusic) {
    winMusic.pause();

    winMusic.currentTime = 0;
  }

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

  initTugSetup().catch((error) => {
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

let isGameMusicMuted = false;

function toggleMusicMute() {
  if (!gameMusic) {
    initGameMusic();
  }

  isGameMusicMuted = !isGameMusicMuted;
  gameMusic.muted = isGameMusicMuted;

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
