let credits = 10;
let score = 0;
let correctGuesses = 0;
let previousTotal = null;
let leaderboard = [];
 
const dice1Elem = document.getElementById('dice1');
const dice2Elem = document.getElementById('dice2');
const resultElem = document.getElementById('result');
const creditsElem = document.getElementById('credits');
const scoreElem = document.getElementById('score');
const spinBtn = document.getElementById('spin-btn');
const spinResultElem = document.getElementById('spin-result');
const leaderboardList = document.getElementById('leaderboard-list');
const gameOverSection = document.getElementById('game-over');
 
document.getElementById('higher').addEventListener('click', () => handleGuess('higher'));
document.getElementById('lower').addEventListener('click', () => handleGuess('lower'));
document.getElementById('spin-btn').addEventListener('click', spinMachine);
document.getElementById('leaderboard-form').addEventListener('submit', addToLeaderboard);
 
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}
 
function handleGuess(guess) {
    if (credits <= 0) return;
 
    const dice1 = rollDice();
    const dice2 = rollDice();
    const total = dice1 + dice2;
 
    dice1Elem.textContent = `🎲${dice1}`;
    dice2Elem.textContent = `🎲${dice2}`;
 
    if (previousTotal !== null) {
        let isCorrect = (guess === 'higher' && total >= previousTotal) || (guess === 'lower' && total <= previousTotal);
 
        if (isCorrect) {
            score += 5;
            correctGuesses++;
            resultElem.textContent = "Goed geraden!";
            if (correctGuesses >= 5) {
                spinBtn.disabled = false;
            }
        } else {
            credits--;
            correctGuesses = 0;
            resultElem.textContent = `Fout geraden! De worp was: ${dice1} + ${dice2} = ${total}`;
            if (credits <= 0) {
                gameOver();
                return;
            }
        }
    }
 
    previousTotal = total;
    updateDisplay();
}
 
function updateDisplay() {
    creditsElem.textContent = `Credits: ${credits}`;
    scoreElem.textContent = `Score: ${score}`;
}
 
function spinMachine() {
    const spinValues = [5, 10, 15, 20, 25];
    const spinResult = spinValues[Math.floor(Math.random() * spinValues.length)];
    score += spinResult * 10;
    spinResultElem.textContent = `Resultaat: ${spinResult}`;
    spinBtn.disabled = true;
    updateDisplay();
}
 
function gameOver() {
    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('scoreboard').classList.add('hidden');
    gameOverSection.classList.remove('hidden');
}
 
function addToLeaderboard(event) {
    event.preventDefault();
    const playerName = document.getElementById('player-name').value;
    leaderboard.push({ name: playerName, score: score });
    leaderboard.sort((a, b) => b.score - a.score);
    updateLeaderboard();
    resetGame();
}
 
function updateLeaderboard() {
    leaderboardList.innerHTML = '';
    leaderboard.forEach(player => {
        const listItem = document.createElement('li');
        listItem.textContent = `${player.name}: ${player.score} punten`;
        leaderboardList.appendChild(listItem);
    });
}
 
function resetGame() {
    credits = 10;
    score = 0;
    correctGuesses = 0;
    previousTotal = null;
    spinResultElem.textContent = 'Resultaat: -';
    document.getElementById('game-area').classList.remove('hidden');
    document.getElementById('scoreboard').classList.remove('hidden');
    gameOverSection.classList.add('hidden');
    updateDisplay();
}
resultElem.textContent = `Fout geraden! De worp was: ${dice1} + ${dice2} = ${total}`;