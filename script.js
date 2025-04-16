document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const INITIAL_REVEALS = 5;
    const STORAGE_KEY = 'colorMasterGameState';
    const DIFFICULTY_THRESHOLDS = {
        easy:   { bonus: 90, perfect: 100, feedback: { close: 80, good: 60 } },
        medium: { bonus: 95, perfect: 100, feedback: { close: 85, good: 70 } }, // Default
        hard:   { bonus: 98, perfect: 100, feedback: { close: 90, good: 80 } }
    };

    // --- DOM Elements ---
    // Main Game
    const body = document.body;
    const targetColorBox = document.getElementById('target-color-box');
    const targetValuesRgbDiv = document.getElementById('target-values-rgb');
    const targetValuesHexDiv = document.getElementById('target-values-hex');
    const yourMatchBox = document.getElementById('your-match-box');
    const yourValuesRgbDiv = document.getElementById('your-values-rgb');
    const yourValuesHexDiv = document.getElementById('your-values-hex');
    const redSlider = document.getElementById('red-slider');
    const greenSlider = document.getElementById('green-slider');
    const blueSlider = document.getElementById('blue-slider');
    const redValueSpan = document.getElementById('red-value');
    const greenValueSpan = document.getElementById('green-value');
    const blueValueSpan = document.getElementById('blue-value');
    const submitButton = document.getElementById('submit-button');
    const revealButton = document.getElementById('reveal-button');
    const nextButton = document.getElementById('next-button');
    const feedbackDiv = document.getElementById('feedback');
    const roundNumberSpan = document.getElementById('round-number');
    const lastScoreSpan = document.getElementById('last-score');
    const revealCountSpan = document.getElementById('reveal-count');
    const revealButtonCountSpan = document.getElementById('reveal-button-count');
    const revealInfoTooltipText = document.querySelector('#reveal-info-tooltip .tooltip-text');

    // Settings Modal
    const settingsIcon = document.getElementById('settings-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings');
    const applySettingsButton = document.getElementById('apply-settings-button');
    const resetGameButton = document.getElementById('reset-game-button');
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    const colorFormatRadios = document.querySelectorAll('input[name="colorFormat"]');

    // Score Popup
    const scorePopup = document.getElementById('score-popup');
    const closePopupButton = scorePopup.querySelector('.close-popup');
    const popupOverlay = document.getElementById('popup-overlay');
    const popupIconDiv = document.getElementById('popup-icon');
    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const popupBonusMessage = document.getElementById('popup-bonus');

    // --- State Variables ---
    let gameState = {
        targetR: 0, targetG: 0, targetB: 0,
        currentRound: 1,
        revealCount: INITIAL_REVEALS,
        lastScore: '-',
        revealedThisRound: false,
        difficulty: 'medium', // easy, medium, hard
        theme: 'light',      // light, dark
        colorFormat: 'both' // rgb, hex, both
    };

    // --- Helper Functions ---
    const randomColorValue = () => Math.floor(Math.random() * 256);
    const componentToHex = (c) => c.toString(16).padStart(2, '0');
    const rgbToHex = (r, g, b) => `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;

    // --- Game State Management ---
    function loadGameState() {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                // Merge saved state with defaults, prioritizing saved values
                gameState = { ...gameState, ...parsedState };
                // Ensure numeric values are numbers
                gameState.revealCount = Number(gameState.revealCount) || INITIAL_REVEALS;
                gameState.currentRound = Number(gameState.currentRound) || 1;
                 // Validate difficulty and theme
                if (!['easy', 'medium', 'hard'].includes(gameState.difficulty)) gameState.difficulty = 'medium';
                if (!['light', 'dark'].includes(gameState.theme)) gameState.theme = 'light';
                if (!['rgb', 'hex', 'both'].includes(gameState.colorFormat)) gameState.colorFormat = 'both';

            } catch (e) {
                console.error("Failed to parse saved state:", e);
                resetGameState(false); // Reset if storage is corrupted, don't save yet
            }
        }
        applyTheme(); // Apply loaded theme
        updateRevealTooltip(); // Update tooltip based on loaded difficulty
        updateUI();
    }

    function saveGameState() {
        try {
            // Only save relevant persistent parts
            const stateToSave = {
                revealCount: gameState.revealCount,
                currentRound: gameState.currentRound,
                lastScore: gameState.lastScore,
                difficulty: gameState.difficulty,
                theme: gameState.theme,
                colorFormat: gameState.colorFormat
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save game state:", e);
        }
    }

     function resetGameState(save = true) {
        gameState.revealCount = INITIAL_REVEALS;
        gameState.currentRound = 1;
        gameState.lastScore = '-';
        // Optionally reset difficulty/theme or keep user preferences
        // gameState.difficulty = 'medium';
        // gameState.theme = 'light';
        // gameState.colorFormat = 'both';
        if (save) saveGameState();
        console.log("Game stats reset.");
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
        // Update sliders & "Your Match" display
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

        // Update game stats display
        roundNumberSpan.textContent = gameState.currentRound;
        lastScoreSpan.textContent = gameState.lastScore;
        revealCountSpan.textContent = gameState.revealCount;
        revealButtonCountSpan.textContent = gameState.revealCount;

        // Update reveal button state
        revealButton.disabled = (gameState.revealCount <= 0) || gameState.revealedThisRound;
        revealButton.dataset.revealedThisRound = gameState.revealedThisRound;

        // Update target values display state & format
        const targetRgb = `(${gameState.targetR}, ${gameState.targetG}, ${gameState.targetB})`;
        const targetHex = rgbToHex(gameState.targetR, gameState.targetG, gameState.targetB);

        targetValuesRgbDiv.textContent = gameState.revealedThisRound ? targetRgb : `(???, ???, ???)`;
        targetValuesHexDiv.textContent = gameState.revealedThisRound ? targetHex.toUpperCase() : `#??????`;
        targetValuesRgbDiv.classList.toggle('visible', gameState.revealedThisRound);
        targetValuesHexDiv.classList.toggle('visible', gameState.revealedThisRound);

        // Apply color format visibility
        targetValuesRgbDiv.classList.toggle('hidden', gameState.colorFormat === 'hex');
        yourValuesRgbDiv.classList.toggle('hidden', gameState.colorFormat === 'hex');
        targetValuesHexDiv.classList.toggle('hidden', gameState.colorFormat === 'rgb');
        yourValuesHexDiv.classList.toggle('hidden', gameState.colorFormat === 'rgb');
    }

    // --- Core Game Logic ---
    function generateNewTargetColor() {
        gameState.targetR = randomColorValue();
        gameState.targetG = randomColorValue();
        gameState.targetB = randomColorValue();
        targetColorBox.style.backgroundColor = `rgb(${gameState.targetR}, ${gameState.targetG}, ${gameState.targetB})`;

        gameState.revealedThisRound = false;
        feedbackDiv.textContent = `Round ${gameState.currentRound}! Good luck!`;
        feedbackDiv.className = 'feedback-area';
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

        // Check for bonus reveal
        if (score >= thresholds.bonus && !gameState.revealedThisRound) {
            gameState.revealCount++;
            bonusEarned = true;
            saveGameState(); // Save immediately after earning
        }

        // Determine feedback level
        let feedbackLevel = 'far';
        if (score === thresholds.perfect) feedbackLevel = 'perfect';
        else if (score >= thresholds.bonus) feedbackLevel = 'bonus_level'; // Special level for bonus score
        else if (score >= thresholds.feedback.close) feedbackLevel = 'close';
        else if (score >= thresholds.feedback.good) feedbackLevel = 'good';

        showScorePopup(score, feedbackLevel, bonusEarned);
        updateUI(); // Update score display and reveal count
    }

     function showTargetValues() {
        targetValuesRgbDiv.classList.add('visible');
        targetValuesHexDiv.classList.add('visible');
        updateUI(); // Re-render UI to show the values
    }

    function handleReveal() {
        if (gameState.revealCount > 0 && !gameState.revealedThisRound) {
            gameState.revealCount--;
            gameState.revealedThisRound = true;
            showTargetValues();
            saveGameState();
            updateUI();
            feedbackDiv.textContent = "Target revealed!";
            feedbackDiv.className = 'feedback-area close';
        } else if (gameState.revealedThisRound) {
             feedbackDiv.textContent = "Already revealed for this round.";
             feedbackDiv.className = 'feedback-area far';
        } else {
            feedbackDiv.textContent = "No reveals left!";
            feedbackDiv.className = 'feedback-area far';
        }
    }

    function handleNextColor() {
        gameState.currentRound++;
        generateNewTargetColor();
        saveGameState(); // Save round progression
    }

    // --- Popup Handling ---
    function showPopup(popupElement) {
        popupElement.setAttribute('aria-hidden', 'false');
        popupOverlay.classList.add('active');
        popupElement.classList.add('active');
         // Focus management can be added here for accessibility
    }

    function hidePopup(popupElement) {
        popupElement.setAttribute('aria-hidden', 'true');
        popupOverlay.classList.remove('active');
        popupElement.classList.remove('active');
    }

    function showScorePopup(score, level, bonusEarned) {
        let icon = '';
        let title = '';
        let message = `Your score: ${score}%`;

        switch (level) {
            case 'perfect':
                icon = '<svg class="icon-perfect" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'; // Checkmark
                title = "Perfect Match!";
                message += " - Absolutely flawless!";
                break;
            case 'bonus_level':
                 icon = '<svg class="icon-perfect" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'; // Star
                title = "Excellent!";
                message += " - Great job!";
                break;
            case 'close':
                icon = '<svg class="icon-good" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>'; // Thumbs up
                title = "Very Close!";
                message += " - You're almost there.";
                break;
            case 'good':
                 icon = '<svg class="icon-ok" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'; // Info Circle
                title = "Getting Warmer";
                message += " - Keep adjusting!";
                break;
            default: // far
                icon = '<svg class="icon-far" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'; // Cross Circle
                title = "Keep Trying";
                message += " - Adjust the sliders more.";
        }

        popupIconDiv.innerHTML = icon;
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        popupBonusMessage.textContent = bonusEarned ? "+1 Reveal Earned!" : "";
        popupBonusMessage.style.display = bonusEarned ? 'block' : 'none';

        showPopup(scorePopup);
    }

    // --- Settings Modal Logic ---
    function openSettingsModal() {
        // Set radio buttons to current state before showing
        document.querySelector(`input[name="theme"][value="${gameState.theme}"]`).checked = true;
        document.querySelector(`input[name="difficulty"][value="${gameState.difficulty}"]`).checked = true;
        document.querySelector(`input[name="colorFormat"][value="${gameState.colorFormat}"]`).checked = true;
        showPopup(settingsModal);
    }

    function applySettings() {
        const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
        const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
        const selectedFormat = document.querySelector('input[name="colorFormat"]:checked').value;

        gameState.theme = selectedTheme;
        gameState.difficulty = selectedDifficulty;
        gameState.colorFormat = selectedFormat;

        applyTheme();
        updateRevealTooltip();
        saveGameState();
        updateUI(); // Update UI immediately based on new settings (like color format)
        hidePopup(settingsModal);
        console.log("Settings applied:", gameState);
    }


    // --- Event Listeners ---
    // Game Controls
    redSlider.addEventListener('input', updateUI);
    greenSlider.addEventListener('input', updateUI);
    blueSlider.addEventListener('input', updateUI);
    submitButton.addEventListener('click', handleSubmit);
    revealButton.addEventListener('click', handleReveal);
    nextButton.addEventListener('click', handleNextColor);

    // Popups
    settingsIcon.addEventListener('click', openSettingsModal);
    closeSettingsButton.addEventListener('click', () => hidePopup(settingsModal));
    closePopupButton.addEventListener('click', () => hidePopup(scorePopup));
    popupOverlay.addEventListener('click', () => { // Close any active popup on overlay click
        hidePopup(settingsModal);
        hidePopup(scorePopup);
    });

    // Settings Actions
    applySettingsButton.addEventListener('click', applySettings);
    resetGameButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset your Reveals and Round Number?")) {
            resetGameState();
            updateUI(); // Update display immediately after reset
            hidePopup(settingsModal); // Close settings after resetting
        }
    });

    // --- Initial Setup ---
    loadGameState(); // Load saved state first
    generateNewTargetColor(); // Generate the first target color & initial UI setup
});