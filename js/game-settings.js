/* =========================================================
   EDU GAME - GAME SETTINGS
   ========================================================= */

const DEFAULT_GAME_SETTINGS = {
  useTimer: true,
  timeLimit: 15,
  countdown: true,
  shuffleAnswers: false,
};

/* =========================================================
   LOAD SETTINGS
   ========================================================= */

function loadGameSettings() {
  const saved = localStorage.getItem("eduGameSettings");

  if (!saved) {
    return {
      ...DEFAULT_GAME_SETTINGS,
    };
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      ...DEFAULT_GAME_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.error("Gagal membaca Game Settings:", error);

    return {
      ...DEFAULT_GAME_SETTINGS,
    };
  }
}

/* =========================================================
   GLOBAL SETTINGS
   ========================================================= */

let gameSettings = loadGameSettings();

/* =========================================================
   SAVE SETTINGS
   ========================================================= */

function saveGameSettings() {
  const timerMode = document.querySelector(
    'input[name="globalTimerMode"]:checked',
  );

  const timeLimit = document.querySelector(
    'input[name="globalTimeLimit"]:checked',
  );

  const countdown = document.getElementById("globalCountdown");

  const shuffleAnswers = document.getElementById("globalShuffleAnswers");

  const newSettings = {
    useTimer: timerMode ? timerMode.value === "true" : true,

    timeLimit: timeLimit ? Number(timeLimit.value) : 15,

    countdown: countdown ? countdown.checked : true,

    shuffleAnswers: shuffleAnswers ? shuffleAnswers.checked : false,
  };

  /* Simpan ke memory */
  gameSettings = newSettings;

  /* Simpan ke LocalStorage */
  try {
    localStorage.setItem("eduGameSettings", JSON.stringify(gameSettings));

    console.log("Game Settings tersimpan:", gameSettings);

    showSettingsMessage("✓ Pengaturan berhasil disimpan");
  } catch (error) {
    console.error("Gagal menyimpan Game Settings:", error);

    showSettingsMessage("❌ Pengaturan gagal disimpan");
  }
}

/* =========================================================
   RESET SETTINGS
   ========================================================= */

function resetGameSettings() {
  gameSettings = {
    ...DEFAULT_GAME_SETTINGS,
  };

  try {
    localStorage.setItem("eduGameSettings", JSON.stringify(gameSettings));
  } catch (error) {
    console.error("Gagal reset Game Settings:", error);
  }

  loadSettingsToForm();

  showSettingsMessage("✓ Pengaturan dikembalikan ke awal");
}

/* =========================================================
   LOAD SETTINGS KE FORM
   ========================================================= */

function loadSettingsToForm() {
  /* Timer mode */

  const timerMode = document.querySelector(
    `input[name="globalTimerMode"][value="${gameSettings.useTimer}"]`,
  );

  if (timerMode) {
    timerMode.checked = true;
  }

  /* Durasi */

  const duration = document.querySelector(
    `input[name="globalTimeLimit"][value="${gameSettings.timeLimit}"]`,
  );

  if (duration) {
    duration.checked = true;
  }

  /* Countdown */

  const countdown = document.getElementById("globalCountdown");

  if (countdown) {
    countdown.checked = gameSettings.countdown;
  }

  /* Acak jawaban */

  const shuffleAnswers = document.getElementById("globalShuffleAnswers");

  if (shuffleAnswers) {
    shuffleAnswers.checked = gameSettings.shuffleAnswers;
  }

  updateTimerModeUI();
  updateDurationUI();
}

/* =========================================================
   TIMER MODE UI
   ========================================================= */

function updateTimerModeUI() {
  const selected = document.querySelector(
    'input[name="globalTimerMode"]:checked',
  );

  const durationCard = document.getElementById("globalTimerOptions");

  if (!selected || !durationCard) {
    return;
  }

  const useTimer = selected.value === "true";

  durationCard.style.display = useTimer ? "block" : "none";

  document
    .querySelectorAll('input[name="globalTimerMode"]')
    .forEach((input) => {
      const label = input.closest(".setting-radio");

      if (!label) return;

      label.classList.toggle("selected", input.checked);
    });
}

/* =========================================================
   DURATION UI
   ========================================================= */

function updateDurationUI() {
  document
    .querySelectorAll('input[name="globalTimeLimit"]')
    .forEach((input) => {
      const label = input.closest(".duration-option");

      if (!label) return;

      label.classList.toggle("active", input.checked);
    });
}

/* =========================================================
   MESSAGE
   ========================================================= */

function showSettingsMessage(message) {
  const element = document.getElementById("settingsSavedMessage");

  if (!element) {
    return;
  }

  element.textContent = message;

  setTimeout(() => {
    element.textContent = "";
  }, 2500);
}

/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Game Settings loaded:", gameSettings);

  loadSettingsToForm();

  /* Timer mode */

  document
    .querySelectorAll('input[name="globalTimerMode"]')
    .forEach((input) => {
      input.addEventListener("change", updateTimerModeUI);
    });

  /* Duration */

  document
    .querySelectorAll('input[name="globalTimeLimit"]')
    .forEach((input) => {
      input.addEventListener("change", updateDurationUI);
    });
});
