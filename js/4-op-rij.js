document.addEventListener('DOMContentLoaded', () => {
  // Game constants
  const ROWS = 6;
  const COLS = 7;
  
  // Game state
  let currentPlayer = 'red';
  let gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  let gameActive = true;
  let scores = {
    red: 0,
    yellow: 0
  };
  let soundEnabled = true;
  
  // DOM elements using querySelector
  const boardElement = document.querySelector('#board');
  const currentPlayerElement = document.querySelector('#current-player');
  const scoreRedElement = document.querySelector('#score-red');
  const scoreYellowElement = document.querySelector('#score-yellow');
  const gameStatusElement = document.querySelector('#game-status');
  const resetButton = document.querySelector('#reset-btn');
  const soundToggleButton = document.querySelector('#sound-toggle');
  const winModal = document.querySelector('#win-modal');
  const winTitle = document.querySelector('#win-title');
  const winPlayerElement = document.querySelector('#win-player');
  const playAgainButton = document.querySelector('#play-again-btn');
  const closeModalButton = document.querySelector('#close-modal-btn');
  const columnIndicators = document.querySelectorAll('.column-indicator');
  
  // Audio elements
  const dropSound = document.querySelector('#drop-sound');
  const winSound = document.querySelector('#win-sound');
  const drawSound = document.querySelector('#draw-sound');
  
  // Initialize the game
  function initGame() {
    createBoard();
    updateUI();
    setupEventListeners();
    setupKeyboardControls();
  }
  
  // Create the game board
  function createBoard() {
    boardElement.innerHTML = '';
    
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.addEventListener('click', () => handleColumnClick(col));
        boardElement.appendChild(cell);
      }
    }
  }
  
  // Update UI elements
  function updateUI() {
    currentPlayerElement.textContent = currentPlayer === 'red' ? 'Rood' : 'Geel';
    currentPlayerElement.style.color = currentPlayer === 'red' ? '#ff6b6b' : '#fdcb6e';
    
    scoreRedElement.textContent = scores.red;
    scoreYellowElement.textContent = scores.yellow;
    
    if (gameActive) {
      gameStatusElement.textContent = `Speler ${currentPlayer === 'red' ? 'Rood' : 'Geel'} is aan de beurt`;
      gameStatusElement.style.color = currentPlayer === 'red' ? '#ff6b6b' : '#fdcb6e';
    }
  }
  
  // Setup event listeners
  function setupEventListeners() {
    resetButton.addEventListener('click', resetGame);
    
    soundToggleButton.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggleButton.classList.toggle('sound-on', soundEnabled);
      soundToggleButton.classList.toggle('sound-off', !soundEnabled);
      soundToggleButton.innerHTML = soundEnabled 
        ? '<i class="fas fa-volume-up"></i> Geluid Aan'
        : '<i class="fas fa-volume-mute"></i> Geluid Uit';
    });
    
    playAgainButton.addEventListener('click', () => {
      winModal.style.display = 'none';
      resetGame();
    });
    
    closeModalButton.addEventListener('click', () => {
      winModal.style.display = 'none';
      window.location.href = '/index.html';
    });
    
    // Column indicators
    columnIndicators.forEach(indicator => {
      indicator.addEventListener('click', () => {
        const col = parseInt(indicator.dataset.col);
        handleColumnClick(col);
      });
    });
  }
  
  // Setup keyboard controls
  function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      if (!gameActive) return;
      
      let col = -1;
      
      switch(event.key) {
        case '1': col = 0; break;
        case '2': col = 1; break;
        case '3': col = 2; break;
        case '4': col = 3; break;
        case '5': col = 4; break;
        case '6': col = 5; break;
        case '7': col = 6; break;
        case 'ArrowLeft': 
          highlightColumn(-1);
          break;
        case 'ArrowRight':
          highlightColumn(1);
          break;
        case 'Enter':
        case ' ':
          const highlighted = document.querySelector('.column-indicator.highlighted');
          if (highlighted) {
            col = parseInt(highlighted.dataset.col);
          }
          break;
      }
      
      if (col !== -1) {
        handleColumnClick(col);
      }
    });
  }
  
  // Highlight column with arrow keys
  let currentHighlighted = 0;
  
  function highlightColumn(direction) {
    columnIndicators[currentHighlighted].classList.remove('highlighted');
    
    currentHighlighted += direction;
    if (currentHighlighted < 0) currentHighlighted = COLS - 1;
    if (currentHighlighted >= COLS) currentHighlighted = 0;
    
    columnIndicators[currentHighlighted].classList.add('highlighted');
  }
  
  // Handle column click
  function handleColumnClick(col) {
    if (!gameActive) return;
    
    const row = findAvailableRow(col);
    if (row !== -1) {
      placeDisc(row, col);
      
      if (checkWin(row, col)) {
        gameActive = false;
        scores[currentPlayer]++;
        showWinModal(currentPlayer);
        if (soundEnabled) winSound.play();
      } else if (isBoardFull()) {
        gameActive = false;
        showDrawModal();
        if (soundEnabled) drawSound.play();
      } else {
        currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
        updateUI();
      }
    } else {
      gameStatusElement.textContent = 'Deze kolom is vol! Kies een andere kolom.';
      gameStatusElement.style.color = '#ff7675';
      setTimeout(() => updateUI(), 1500);
    }
  }
  
  // Find available row in column
  function findAvailableRow(col) {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!gameBoard[row][col]) {
        return row;
      }
    }
    return -1;
  }
  
  // Place disc on board
  function placeDisc(row, col) {
    gameBoard[row][col] = currentPlayer;
    
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const disc = document.createElement('div');
    disc.classList.add('disc', currentPlayer);
    
    if (soundEnabled) {
      dropSound.currentTime = 0;
      dropSound.play();
    }
    
    cell.appendChild(disc);
  }
  
  // Check for win
  function checkWin(row, col) {
    const directions = [
      [0, 1],   // Horizontal
      [1, 0],   // Vertical
      [1, 1],   // Diagonal down-right
      [1, -1]   // Diagonal down-left
    ];
    
    for (const [dx, dy] of directions) {
      let count = 1;
      
      count += countDirection(row, col, dx, dy);
      count += countDirection(row, col, -dx, -dy);
      
      if (count >= 4) {
        highlightWinningDiscs(row, col, dx, dy);
        highlightWinningDiscs(row, col, -dx, -dy);
        return true;
      }
    }
    
    return false;
  }
  
  // Count discs in direction
  function countDirection(row, col, dx, dy) {
    let count = 0;
    let r = row + dx;
    let c = col + dy;
    
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && gameBoard[r][c] === currentPlayer) {
      count++;
      r += dx;
      c += dy;
    }
    
    return count;
  }
  
  // Highlight winning discs
  function highlightWinningDiscs(row, col, dx, dy) {
    let r = row;
    let c = col;
    
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && gameBoard[r][c] === currentPlayer) {
      const disc = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"] .disc`);
      disc.classList.add('winning');
      disc.style.setProperty('--win-color', currentPlayer === 'red' ? '#ff6b6b' : '#fdcb6e');
      r += dx;
      c += dy;
    }
  }
  
  // Check if board is full
  function isBoardFull() {
    return gameBoard.every(row => row.every(cell => cell !== null));
  }
  
  // Show win modal
  function showWinModal(winner) {
    winTitle.textContent = `${winner === 'red' ? 'Rood' : 'Geel'} wint!`;
    winPlayerElement.innerHTML = `<div class="disc-indicator ${winner} big"></div>`;
    winModal.style.display = 'flex';
  }
  
  // Show draw modal
  function showDrawModal() {
    winTitle.textContent = 'Gelijkspel!';
    winPlayerElement.innerHTML = `
      <div style="display: flex; gap: 20px; justify-content: center;">
        <div class="disc-indicator red big"></div>
        <div class="disc-indicator yellow big"></div>
      </div>
    `;
    winModal.style.display = 'flex';
  }
  
  // Reset game
  function resetGame() {
    gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    currentPlayer = 'red';
    gameActive = true;
    createBoard();
    updateUI();
  }
  
  // Initialize the game
  initGame();
});