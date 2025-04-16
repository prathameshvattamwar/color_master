document.addEventListener("DOMContentLoaded", () => {
  // --- Constants ---
  const INITIAL_REVEALS = 5;
  const MAX_SCORE_HISTORY = 5;
  const STORAGE_KEY = "colorMasterGameState_v2";
  const DIFFICULTY_THRESHOLDS = {
    easy: { bonus: 90, perfect: 100, feedback: { close: 80, good: 60 } },
    medium: { bonus: 95, perfect: 100, feedback: { close: 85, good: 70 } },
    hard: { bonus: 98, perfect: 100, feedback: { close: 90, good: 80 } },
  };

  // --- DOM Elements ---
  const body = document.body;
  const targetColorBox = document.getElementById("target-color-box");
  const targetValuesRgbDiv = document.getElementById("target-values-rgb");
  const targetValuesHexDiv = document.getElementById("target-values-hex");
  const yourMatchBox = document.getElementById("your-match-box");
  const yourValuesRgbDiv = document.getElementById("your-values-rgb");
  const yourValuesHexDiv = document.getElementById("your-values-hex");
  const redSlider = document.getElementById("red-slider");
  const greenSlider = document.getElementById("green-slider");
  const blueSlider = document.getElementById("blue-slider");
  const redValueSpan = document.getElementById("red-value");
  const greenValueSpan = document.getElementById("green-value");
  const blueValueSpan = document.getElementById("blue-value");
  const submitButton = document.getElementById("submit-button");
  const revealButton = document.getElementById("reveal-button");
  const feedbackDiv = document.getElementById("feedback");
  const roundNumberSpan = document.getElementById("round-number");
  const lastScoreSpan = document.getElementById("last-score");
  const revealCountSpan = document.getElementById("reveal-count");
  const revealButtonCountSpan = document.getElementById("reveal-button-count");
  const revealInfoTooltipText = document.querySelector(
    "#reveal-info-tooltip .tooltip-text"
  );
  const scoreHistoryDisplay = document.getElementById("score-history-display");

  // Settings Modal
  const settingsIcon = document.getElementById("settings-icon");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsButton = document.getElementById("close-settings");
  const applySettingsButton = document.getElementById("apply-settings-button");
  const resetGameButton = document.getElementById("reset-game-button");
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  const difficultyRadios = document.querySelectorAll(
    'input[name="difficulty"]'
  );
  const colorFormatRadios = document.querySelectorAll(
    'input[name="colorFormat"]'
  );
  const accordionHeaders = document.querySelectorAll(".accordion-header"); // Get accordion headers

  // Score Popup
  const scorePopup = document.getElementById("score-popup");
  const closePopupButton = scorePopup.querySelector(".close-popup");
  const popupOverlay = document.getElementById("popup-overlay");
  const popupIconDiv = document.getElementById("popup-icon");
  const popupTitle = document.getElementById("popup-title");
  const popupMessage = document.getElementById("popup-message");
  const popupBonusMessage = document.getElementById("popup-bonus");
  const popupNextButton = document.getElementById("popup-next-button");

  // --- State Variables ---
  let gameState = {
    targetR: 0,
    targetG: 0,
    targetB: 0,
    currentRound: 1,
    revealCount: INITIAL_REVEALS,
    lastScore: "-",
    revealedThisRound: false,
    difficulty: "medium",
    theme: "light",
    colorFormat: "both",
    scoreHistory: [],
  };

  // --- Helper Functions ---
  const randomColorValue = () => Math.floor(Math.random() * 256);
  const componentToHex = (c) => c.toString(16).padStart(2, "0");
  const rgbToHex = (r, g, b) =>
    `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;

  // --- Game State Management ---
  function loadGameState() {
    const savedState = localStorage.getItem(STORAGE_KEY);
    let loadedState = {};
    if (savedState) {
      try {
        loadedState = JSON.parse(savedState);
      } catch (e) {
        console.error("Failed to parse saved state:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    gameState = {
      ...gameState,
      ...loadedState,
      revealCount: Number(loadedState.revealCount) || INITIAL_REVEALS,
      currentRound: Number(loadedState.currentRound) || 1,
      difficulty: ["easy", "medium", "hard"].includes(loadedState.difficulty)
        ? loadedState.difficulty
        : "medium",
      theme: ["light", "dark"].includes(loadedState.theme)
        ? loadedState.theme
        : "light",
      colorFormat: ["rgb", "hex", "both"].includes(loadedState.colorFormat)
        ? loadedState.colorFormat
        : "both",
      scoreHistory: Array.isArray(loadedState.scoreHistory)
        ? loadedState.scoreHistory
        : [],
    };
    applyTheme();
    updateRevealTooltip();
    updateUI();
  }

  function saveGameState() {
    try {
      const stateToSave = {
        revealCount: gameState.revealCount,
        currentRound: gameState.currentRound,
        lastScore: gameState.lastScore,
        difficulty: gameState.difficulty,
        theme: gameState.theme,
        colorFormat: gameState.colorFormat,
        scoreHistory: gameState.scoreHistory,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save game state:", e);
    }
  }

  function resetGameState(save = true) {
    gameState.revealCount = INITIAL_REVEALS;
    gameState.currentRound = 1;
    gameState.lastScore = "-";
    gameState.scoreHistory = [];
    if (save) saveGameState();
    console.log("Game stats (reveals, round, score history) reset.");
  }

  // --- UI Update Functions ---
  function applyTheme() {
    body.dataset.theme = gameState.theme;
  }

  function updateRevealTooltip() {
    const bonusThreshold = DIFFICULTY_THRESHOLDS[gameState.difficulty].bonus;
    revealInfoTooltipText.textContent = `Earn reveals by scoring ${bonusThreshold}% or higher!`;
  }

  function updateUI() {
    const r = parseInt(redSlider.value);
    const g = parseInt(greenSlider.value);
    const b = parseInt(blueSlider.value);
    redValueSpan.textContent = r;
    greenValueSpan.textContent = g;
    blueValueSpan.textContent = b;
    const userRgb = `(${r}, ${g}, ${b})`;
    const userHex = rgbToHex(r, g, b);
    yourMatchBox.style.backgroundColor = `rgb${userRgb}`;
    yourValuesRgbDiv.textContent = userRgb;
    yourValuesHexDiv.textContent = userHex.toUpperCase();

    roundNumberSpan.textContent = gameState.currentRound;
    lastScoreSpan.textContent = gameState.lastScore;
    revealCountSpan.textContent = gameState.revealCount;
    revealButtonCountSpan.textContent = gameState.revealCount;

    scoreHistoryDisplay.textContent =
      gameState.scoreHistory.length > 0
        ? gameState.scoreHistory.map((s) => `${s}%`).join(", ")
        : "-";

    revealButton.disabled =
      gameState.revealCount <= 0 || gameState.revealedThisRound;
    revealButton.dataset.revealedThisRound = gameState.revealedThisRound;

    const targetRgb = `(${gameState.targetR}, ${gameState.targetG}, ${gameState.targetB})`;
    const targetHex = rgbToHex(
      gameState.targetR,
      gameState.targetG,
      gameState.targetB
    );
    targetValuesRgbDiv.textContent = gameState.revealedThisRound
      ? targetRgb
      : `(???, ???, ???)`;
    targetValuesHexDiv.textContent = gameState.revealedThisRound
      ? targetHex.toUpperCase()
      : `#??????`;
    targetValuesRgbDiv.classList.toggle("visible", gameState.revealedThisRound);
    targetValuesHexDiv.classList.toggle("visible", gameState.revealedThisRound);

    targetValuesRgbDiv.classList.toggle(
      "hidden",
      gameState.colorFormat === "hex"
    );
    yourValuesRgbDiv.classList.toggle(
      "hidden",
      gameState.colorFormat === "hex"
    );
    targetValuesHexDiv.classList.toggle(
      "hidden",
      gameState.colorFormat === "rgb"
    );
    yourValuesHexDiv.classList.toggle(
      "hidden",
      gameState.colorFormat === "rgb"
    );
  }

  // --- Core Game Logic ---
  function generateNewTargetColor() {
    gameState.targetR = randomColorValue();
    gameState.targetG = randomColorValue();
    gameState.targetB = randomColorValue();
    targetColorBox.style.backgroundColor = `rgb(${gameState.targetR}, ${gameState.targetG}, ${gameState.targetB})`;
    gameState.revealedThisRound = false;
    feedbackDiv.textContent = `Round ${gameState.currentRound}! Match the color.`;
    feedbackDiv.className = "feedback-area";
    submitButton.disabled = false;
    updateUI();
  }

  function calculateScore() {
    const userR = parseInt(redSlider.value);
    const userG = parseInt(greenSlider.value);
    const userB = parseInt(blueSlider.value);
    const diffR = gameState.targetR - userR;
    const diffG = gameState.targetG - userG;
    const diffB = gameState.targetB - userB;
    const distance = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);
    const maxDistance = Math.sqrt(3 * 255 * 255);
    const similarity = Math.max(0, (1 - distance / maxDistance) * 100);
    return Math.round(similarity);
  }

  function handleSubmit() {
    const score = calculateScore();
    gameState.lastScore = score;
    let bonusEarned = false;
    const thresholds = DIFFICULTY_THRESHOLDS[gameState.difficulty];

    gameState.scoreHistory.unshift(score);
    if (gameState.scoreHistory.length > MAX_SCORE_HISTORY) {
      gameState.scoreHistory.pop();
    }

    if (score >= thresholds.bonus && !gameState.revealedThisRound) {
      gameState.revealCount++;
      bonusEarned = true;
    }

    let feedbackLevel = "far";
    if (score === thresholds.perfect) feedbackLevel = "perfect";
    else if (score >= thresholds.bonus) feedbackLevel = "bonus_level";
    else if (score >= thresholds.feedback.close) feedbackLevel = "close";
    else if (score >= thresholds.feedback.good) feedbackLevel = "good";

    submitButton.disabled = true;
    showScorePopup(score, feedbackLevel, bonusEarned);
    updateUI();
  }

  function showTargetValues() {
    targetValuesRgbDiv.classList.add("visible");
    targetValuesHexDiv.classList.add("visible");
    updateUI();
  }

  function handleReveal() {
    if (gameState.revealCount > 0 && !gameState.revealedThisRound) {
      gameState.revealCount--;
      gameState.revealedThisRound = true;
      showTargetValues();
      saveGameState();
      updateUI();
      feedbackDiv.textContent = "Target revealed!";
      feedbackDiv.className = "feedback-area close";
    } else if (gameState.revealedThisRound) {
      feedbackDiv.textContent = "Already revealed for this round.";
      feedbackDiv.className = "feedback-area far";
    } else {
      feedbackDiv.textContent = "No reveals left!";
      feedbackDiv.className = "feedback-area far";
    }
  }

  function handleNextColor() {
    hidePopup(scorePopup);
    gameState.currentRound++;
    generateNewTargetColor();
    saveGameState();
  }

  // --- Popup Handling ---
  function showPopup(popupElement) {
    popupElement.setAttribute("aria-hidden", "false");
    popupOverlay.classList.add("active");
    popupElement.classList.add("active");
    const firstButton = popupElement.querySelector("button:not(.close-popup)"); // Try to focus main action button first
    if (firstButton) {
      firstButton.focus();
    } else {
      // Fallback to close button if no other button
      const closeBtn = popupElement.querySelector(".close-popup");
      if (closeBtn) closeBtn.focus();
    }
  }

  function hidePopup(popupElement) {
    const wasActive = popupElement.classList.contains("active");
    popupElement.setAttribute("aria-hidden", "true");
    popupOverlay.classList.remove("active");
    popupElement.classList.remove("active");
    return wasActive;
  }

  function showScorePopup(score, level, bonusEarned) {
    let iconClass = "";
    let title = "";
    let message = `Your score: ${score}%`;

    switch (level) {
      case "perfect":
        iconClass = "fas fa-check-circle icon-perfect";
        title = "Perfect Match!";
        message += " - Absolutely flawless!";
        break;
      case "bonus_level":
        iconClass = "fas fa-star icon-star";
        title = "Excellent!";
        message += " - Great job!";
        break;
      case "close":
        iconClass = "fas fa-thumbs-up icon-good";
        title = "Very Close!";
        message += " - You're almost there.";
        break;
      case "good":
        iconClass = "fas fa-info-circle icon-ok";
        title = "Getting Warmer";
        message += " - Keep adjusting!";
        break;
      default:
        iconClass = "fas fa-times-circle icon-far";
        title = "Keep Trying";
        message += " - Adjust the sliders more.";
    }
    popupIconDiv.innerHTML = `<i class="${iconClass}"></i>`;
    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popupBonusMessage.textContent = bonusEarned ? "+1 Reveal Earned!" : "";
    popupBonusMessage.style.display = bonusEarned ? "block" : "none";
    showPopup(scorePopup);
  }

  // --- Settings Modal Logic ---
  function openSettingsModal() {
    document.querySelector(
      `input[name="theme"][value="${gameState.theme}"]`
    ).checked = true;
    document.querySelector(
      `input[name="difficulty"][value="${gameState.difficulty}"]`
    ).checked = true;
    document.querySelector(
      `input[name="colorFormat"][value="${gameState.colorFormat}"]`
    ).checked = true;
    // Ensure accordion is closed when opening settings
    document
      .querySelectorAll(".accordion-item.active")
      .forEach((item) => item.classList.remove("active"));
    showPopup(settingsModal);
  }

  function applySettings() {
    const previousDifficulty = gameState.difficulty;
    const selectedTheme = document.querySelector(
      'input[name="theme"]:checked'
    ).value;
    const selectedDifficulty = document.querySelector(
      'input[name="difficulty"]:checked'
    ).value;
    const selectedFormat = document.querySelector(
      'input[name="colorFormat"]:checked'
    ).value;
    let difficultyChanged = false;

    if (selectedDifficulty !== previousDifficulty) {
      gameState.difficulty = selectedDifficulty;
      difficultyChanged = true;
      updateRevealTooltip();
    }
    gameState.theme = selectedTheme;
    gameState.colorFormat = selectedFormat;

    applyTheme();
    saveGameState();
    hidePopup(settingsModal);

    if (difficultyChanged) {
      feedbackDiv.textContent = `Difficulty changed to ${gameState.difficulty}. New round started!`;
      feedbackDiv.className = "feedback-area bonus";
      gameState.lastScore = "-";
      generateNewTargetColor();
      saveGameState(); // Save the state after generating new color
    } else {
      updateUI(); // Update UI for format/theme only if difficulty didn't change
    }
    console.log("Settings applied:", gameState);
  }

  // --- Event Listeners ---
  // Game Controls
  redSlider.addEventListener("input", updateUI);
  greenSlider.addEventListener("input", updateUI);
  blueSlider.addEventListener("input", updateUI);
  submitButton.addEventListener("click", handleSubmit);
  revealButton.addEventListener("click", handleReveal);

  // Popups
  settingsIcon.addEventListener("click", openSettingsModal);
  closeSettingsButton.addEventListener("click", () => hidePopup(settingsModal));
  closePopupButton.addEventListener("click", () => {
    if (hidePopup(scorePopup)) handleNextColor();
  });
  popupNextButton.addEventListener("click", () => {
    if (hidePopup(scorePopup)) handleNextColor();
  });
  popupOverlay.addEventListener("click", () => {
    const scorePopupWasActive = scorePopup.classList.contains("active");
    hidePopup(settingsModal);
    hidePopup(scorePopup);
    if (scorePopupWasActive) handleNextColor();
  });

  // Settings Actions
  applySettingsButton.addEventListener("click", applySettings);
  resetGameButton.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to reset your Reveals, Round Number, and Score History?"
      )
    ) {
      resetGameState();
      updateUI();
      hidePopup(settingsModal);
      feedbackDiv.textContent = "Game stats reset!";
      feedbackDiv.className = "feedback-area bonus";
    }
  });

  // START: Accordion Listener
  accordionHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      item.classList.toggle("active");

      // Optional: Close other accordions when one opens
      // if (item.classList.contains('active')) {
      //     accordionHeaders.forEach(otherHeader => {
      //         if (otherHeader !== header) {
      //             otherHeader.parentElement.classList.remove('active');
      //         }
      //     });
      // }
    });
  });
  // END: Accordion Listener

  // --- Initial Setup ---
  loadGameState();
  generateNewTargetColor();
});
