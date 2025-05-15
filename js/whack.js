document.addEventListener('DOMContentLoaded', () => {
    const holes = document.querySelectorAll('.hole');
    const scoreBoard = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const gameOverElement = document.getElementById('game-over');
    let score = 0;
    let activeHole = null;
    let gameInterval = null;
    let gameOver = false;
    let timeLeft = 60; 
    let timerInterval = null;

    function updateTimer() {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        } else if (timeLeft <= 20 && timeLeft % 2 === 0) {
            clearInterval(gameInterval);
            gameInterval = setInterval(showMole, 500); 
        }
    }

    function showMole() {
        if (activeHole) {
            activeHole.classList.remove('active-sonic', 'active-eggman');
        }
        const randomIndex = Math.floor(Math.random() * holes.length);
        activeHole = holes[randomIndex];
        const isSonic = Math.random() > 0.5;
        if (isSonic) {
            activeHole.classList.add('active-sonic');
        } else {
            activeHole.classList.add('active-eggman');
        }
    }

    function startGame() {
        gameOver = false;
        score = 0;
        timeLeft = 60;
        scoreBoard.textContent = score;
        timerElement.textContent = timeLeft;
        gameOverElement.classList.remove('visible');
        gameInterval = setInterval(showMole, 1000); 
        timerInterval = setInterval(updateTimer, 1000); 
    }

    function endGame() {
        gameOver = true;
        clearInterval(gameInterval);
        clearInterval(timerInterval);
        gameOverElement.classList.add('visible');
        setTimeout(startGame, 3000); 
    }

    function whack(event) {
        if (gameOver) return;
        if (event.target.classList.contains('active-sonic')) {
            score++;
            scoreBoard.textContent = score;
            activeHole.classList.remove('active-sonic');
        } else if (event.target.classList.contains('active-eggman')) {
            endGame();
        }
    }

    holes.forEach(hole => hole.addEventListener('click', whack));
    startGame();
});