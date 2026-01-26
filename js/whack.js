document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let score = 0;
    let highScore = localStorage.getItem('whackHighScore') || 0;
    let timeLeft = 60;
    let gameActive = false;
    let gamePaused = false;
    let gameSpeed = 1000; // Start speed in ms
    let activeHole = null;
    let soundEnabled = true;
    
    // Game elements using querySelector
    const holes = document.querySelectorAll('.hole');
    const scoreDisplay = document.querySelector('.score-display');
    const timerDisplay = document.querySelector('.timer-display');
    const speedDisplay = document.querySelector('.speed-display');
    const gameStatus = document.querySelector('#game-status');
    const highScoreDisplay = document.querySelector('#high-score');
    const gameOverModal = document.querySelector('#game-over-modal');
    const winModal = document.querySelector('#win-modal');
    const finalScoreDisplay = document.querySelector('#final-score');
    const winScoreDisplay = document.querySelector('#win-score');
    const resultMessage = document.querySelector('#result-message');
    
    // Buttons
    const startBtn = document.querySelector('#start-btn');
    const pauseBtn = document.querySelector('#pause-btn');
    const soundToggleBtn = document.querySelector('#sound-toggle');
    const restartBtn = document.querySelector('#restart-btn');
    const playAgainBtn = document.querySelector('#play-again-btn');
    const menuBtn = document.querySelector('#menu-btn');
    const backToMenuBtn = document.querySelector('#back-to-menu-btn');
    
    // Audio elements
    const clickSound = document.querySelector('#click-sound');
    const sonicSound = document.querySelector('#sonic-sound');
    const eggmanSound = document.querySelector('#eggman-sound');
    const gameOverSound = document.querySelector('#game-over-sound');
    const timerSound = document.querySelector('#timer-sound');
    
    // Game intervals
    let gameInterval = null;
    let timerInterval = null;
    
    // Initialize game
    function init() {
        updateHighScoreDisplay();
        setupEventListeners();
        resetGame();
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Hole click events
        holes.forEach(hole => {
            hole.addEventListener('click', () => handleHoleClick(hole));
        });
        
        // Control buttons
        startBtn.addEventListener('click', startGame);
        pauseBtn.addEventListener('click', togglePause);
        soundToggleBtn.addEventListener('click', toggleSound);
        
        // Modal buttons
        restartBtn.addEventListener('click', restartGame);
        playAgainBtn.addEventListener('click', restartGame);
        menuBtn.addEventListener('click', goToMenu);
        backToMenuBtn.addEventListener('click', goToMenu);
        
        // Keyboard controls
        document.addEventListener('keydown', handleKeyPress);
    }
    
    // Handle keyboard input
    function handleKeyPress(event) {
        if (!gameActive) return;
        
        switch(event.key) {
            case ' ':
            case 'Spacebar':
                togglePause();
                break;
            case '1': case '2': case '3':
            case '4': case '5': case '6':
            case '7': case '8': case '9':
                const holeIndex = parseInt(event.key) - 1;
                if (holeIndex < holes.length) {
                    handleHoleClick(holes[holeIndex]);
                }
                break;
            case 's':
            case 'S':
                startGame();
                break;
            case 'm':
            case 'M':
                toggleSound();
                break;
        }
    }
    
    // Start the game
    function startGame() {
        if (gameActive) return;
        
        resetGame();
        gameActive = true;
        gamePaused = false;
        startBtn.disabled = true;
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pauze';
        
        gameStatus.textContent = 'Spel bezig! Klik op Sonic, vermijd Eggman!';
        gameStatus.style.color = '#00ff88';
        
        // Start game loop
        gameInterval = setInterval(showCharacter, gameSpeed);
        
        // Start timer
        timerInterval = setInterval(updateTimer, 1000);
        
        playSound(clickSound);
    }
    
    // Toggle pause state
    function togglePause() {
        if (!gameActive) return;
        
        gamePaused = !gamePaused;
        
        if (gamePaused) {
            clearInterval(gameInterval);
            clearInterval(timerInterval);
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Verder';
            gameStatus.textContent = 'SPEL GEPAUZEERD';
            gameStatus.style.color = '#ffaa00';
        } else {
            gameInterval = setInterval(showCharacter, gameSpeed);
            timerInterval = setInterval(updateTimer, 1000);
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pauze';
            gameStatus.textContent = 'Spel bezig! Klik op Sonic, vermijd Eggman!';
            gameStatus.style.color = '#00ff88';
        }
        
        playSound(clickSound);
    }
    
    // Toggle sound
    function toggleSound() {
        soundEnabled = !soundEnabled;
        
        if (soundEnabled) {
            soundToggleBtn.classList.remove('sound-off');
            soundToggleBtn.classList.add('sound-on');
            soundToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> Geluid Aan';
        } else {
            soundToggleBtn.classList.remove('sound-on');
            soundToggleBtn.classList.add('sound-off');
            soundToggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Geluid Uit';
        }
        
        playSound(clickSound);
    }
    
    // Update timer
    function updateTimer() {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        // Speed up in last 20 seconds
        if (timeLeft <= 20 && gameSpeed === 1000) {
            gameSpeed = 500; // 2x speed
            speedDisplay.textContent = '2x';
            clearInterval(gameInterval);
            gameInterval = setInterval(showCharacter, gameSpeed);
            
            // Visual feedback for speed increase
            speedDisplay.parentElement.classList.add('pulse');
            setTimeout(() => {
                speedDisplay.parentElement.classList.remove('pulse');
            }, 1000);
            
            if (soundEnabled) {
                timerSound.currentTime = 0;
                timerSound.play();
            }
        }
        
        // Last 10 seconds warning
        if (timeLeft <= 10) {
            timerDisplay.parentElement.classList.add('pulse');
        }
        
        if (timeLeft <= 0) {
            endGame('time');
        }
    }
    
    // Show random character
    function showCharacter() {
        if (gamePaused) return;
        
        // Hide previous character
        if (activeHole) {
            activeHole.classList.remove('active', 'sonic', 'eggman');
        }
        
        // Select random hole
        let randomHole;
        do {
            randomHole = holes[Math.floor(Math.random() * holes.length)];
        } while (randomHole === activeHole && holes.length > 1);
        
        activeHole = randomHole;
        
        // Determine character type (70% Sonic, 30% Eggman)
        const isSonic = Math.random() < 0.7;
        
        if (isSonic) {
            activeHole.classList.add('active', 'sonic');
        } else {
            activeHole.classList.add('active', 'eggman');
        }
        
        // Auto-hide after 0.8 seconds
        setTimeout(() => {
            if (activeHole) {
                activeHole.classList.remove('active');
            }
        }, 800);
    }
    
    // Handle hole click
    function handleHoleClick(hole) {
        if (!gameActive || gamePaused) return;
        
        playSound(clickSound);
        
        // Check if clicked on active hole
        if (hole.classList.contains('active')) {
            if (hole.classList.contains('sonic')) {
                // Hit Sonic - add points
                score += 10;
                scoreDisplay.textContent = score;
                hole.classList.add('pulse');
                
                playSound(sonicSound);
                
                // Visual feedback
                setTimeout(() => {
                    hole.classList.remove('pulse');
                }, 300);
                
            } else if (hole.classList.contains('eggman')) {
                // Hit Eggman - game over
                playSound(eggmanSound);
                hole.classList.add('shake');
                setTimeout(() => {
                    hole.classList.remove('shake');
                }, 500);
                
                endGame('eggman');
                return;
            }
            
            // Hide the character after hit
            hole.classList.remove('active');
        }
    }
    
    // End the game
    function endGame(reason) {
        gameActive = false;
        gamePaused = false;
        
        clearInterval(gameInterval);
        clearInterval(timerInterval);
        
        startBtn.disabled = false;
        
        // Update high score if needed
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('whackHighScore', highScore);
            updateHighScoreDisplay();
        }
        
        // Show appropriate modal
        if (reason === 'eggman') {
            finalScoreDisplay.textContent = score;
            resultMessage.textContent = 'Je hebt Eggman geraakt! Game Over!';
            playSound(gameOverSound);
            gameOverModal.style.display = 'flex';
        } else if (reason === 'time') {
            winScoreDisplay.textContent = score;
            playSound(sonicSound);
            winModal.style.display = 'flex';
        }
    }
    
    // Restart game
    function restartGame() {
        gameOverModal.style.display = 'none';
        winModal.style.display = 'none';
        startGame();
    }
    
    // Go to menu
    function goToMenu() {
        window.location.href = 'index.html';
    }
    
    // Reset game state
    function resetGame() {
        score = 0;
        timeLeft = 60;
        gameSpeed = 1000;
        
        scoreDisplay.textContent = score;
        timerDisplay.textContent = timeLeft;
        speedDisplay.textContent = '1x';
        
        timerDisplay.parentElement.classList.remove('pulse');
        speedDisplay.parentElement.classList.remove('pulse');
        
        // Clear any active holes
        holes.forEach(hole => {
            hole.classList.remove('active', 'sonic', 'eggman', 'pulse', 'shake');
        });
        
        gameStatus.textContent = 'Klik op START om te beginnen!';
        gameStatus.style.color = '#00ffff';
    }
    
    // Update high score display
    function updateHighScoreDisplay() {
        highScoreDisplay.textContent = highScore;
    }
    
    // Play sound if enabled
    function playSound(soundElement) {
        if (soundEnabled && soundElement) {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => console.log("Audio error:", e));
        }
    }
    
    // Initialize the game
    init();
});