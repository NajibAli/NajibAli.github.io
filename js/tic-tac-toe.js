// variable en het selecteer van elementen van html
const board = document.querySelector('.board');
const items = document.querySelectorAll('.items');
const resetButton = document.querySelector('.Restart');

 
let startPlayer = 'X'; // begin met speller
let secondPlayer = 'O';
let gameActie = true; // controleer of het spel nog bezig is
let boardState = Array(9).fill('') // maak een lege array voor de status van de bord
let currentPlayer = startPlayer;

const winpatronen =
[
    [0, 1, 2],      // 0 | 1 | 2 |
    [3, 4, 5],      // 3 | 4 | 5 |       
    [6, 7, 8],      // 6 | 7 | 8 |
    [0, 3, 6],  
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8], 
    [2, 4, 6]
 
];

// startPlayer doet een zet;
// Controleer de zet
// Als legale zet, volgendeBeurt;

function volgendeBeurt(){
    console.log('volgendeBeurt');
    currentPlayer = currentPlayer === startPlayer ? secondPlayer : startPlayer; // Als de huidige speler X is, verander het naar O, anders verander het naar X
    console.log("Huidige speler: " + currentPlayer);
}
console.log("Huidige speler: " + currentPlayer);
volgendeBeurt();



function CellClicked(x, y) {
    if(!gameActie) { // Als het spel niet bezig is,r eturn
        return;
    }
    // Plaats een X of O in cell x, y
    // Maak een index van de cellen
    // Als de cell leeg is, voeg de huidige speler toe aan de boardState array
    // Voeg de huidige speler toe aan de cell
    let clickedCell = document.querySelector(`#cell-${x}-${y}`);
    let cellIndex = 3 * x + y; 
    if(boardState[cellIndex] === '') { 
        boardState[cellIndex] = currentPlayer;
        clickedCell.textContent = currentPlayer; 


        // Lichtgevende effect voor X of O
        if (currentPlayer === startPlayer) {
            clickedCell.style.color = 'red'; 
            clickedCell.style.textShadow = '0 0 5px rgba(255, 0, 0, 0.7), 0 0 10px rgba(255, 0, 0, 0.5), 0 0 15px rgba(255, 0, 0, 0.3)'; 
        } else {
            clickedCell.style.color = 'blue'; 
            clickedCell.style.textShadow = '0 0 5px rgba(0, 0, 255, 0.7), 0 0 10px rgba(0, 0, 255, 0.5), 0 0 15px rgba(0, 0, 255, 0.3)'; 
        }
        console.log("Er is op cell " + x + " " + y + " geklikt");
        checkGameOver();
        volgendeBeurt();
    }
    
     // Voeg of O of X, of een plaatje toe aan de cell
    // clickedCell.textContent = currentPlayer;
}

// Maak 9 cellen op het board
function AddCells() {
    for(let x = 0; x < 3; x ++){
        for(let y = 0; y < 3; y++) {
            // Add <div class="items"></div> to board, with id="cell-x-y"
            let cell = document.createElement('div');                   // Maak een nieuwe div
            cell.classList.add('items');                                // Voeg de class 'items' toe aan de div
            cell.id = `cell-${x}-${y}`;                                 // Voeg een id toe aan de div
            cell.addEventListener('click', () => CellClicked(x, y));    // Voeg een event listener toe aan de div
            board.appendChild(cell);                                    // Voeg de div toe aan het board
            
        }
    }
}
AddCells();


// Check of er een winnaar is
// Als de cellen a, b en c van de winpatronen array gelijk zijn aan elkaar en niet leeg zijn, return de winnaar
// Als alle items in de boardState array niet leeg zijn, return true, anders return false
// Als er een winnaar is of het gelijkspel is, stop het spel
function checkWinner() { 
    for(let i = 0; i < winpatronen.length; i++) {
        const [a, b, c] = winpatronen[i]; // Maak een array van de winpatronen array
        if(boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            alert('Winner is: ' + boardState[a]); 

            // Markeer de winnende cellen met een gloeiend effect
            this.highlightWinningCells([a, b, c]); 

            return boardState[a];
        }
    }
    return null; // Als er geen winnaar is, return null
}


// Markeer de winnende cellen met een gloeiend effect
// Maak een array van de winpatronen array
// Voeg een border en een box shadow toe aan de cellen
function highlightWinningCells(cells) {
    cells.forEach(index => {
        const cell = document.querySelector(`#cell-${Math.floor(index / 3)}-${index % 3}`);
        cell.style.border = '1px solid white'; 
        cell.style.boxShadow = '0 0 20px white, 0 0 30px white'; 
    });
}


// Als alle items in de boardState array niet leeg zijn, return true, anders return false
function checkDraw() {
    return boardState.every(item => item !== ''); 
    
}

// Check of het spel is afgelopen
// Als er een winnaar is of het gelijkspel is, stop het spel, alert 'winner is: ' + de winnaar of alert 'Gelijkspel' of alert 'Game Over'
// Als het spel is gestopt, verander de gameActie naar false
function checkGameOver() {  
    if(checkWinner() || checkDraw()) { 
        gameActie = false;
        alert ('Game Over');
    }
   
}


// Reset de game
// Als er op de reset button wordt geklikt, verwijder alle cellen van het board
// Voeg nieuwe cellen toe
// Maak de boardState leeg en verander de gameActie naar true
resetButton.addEventListener('click', () => {
    board.innerHTML = ''; 
    AddCells();
    resetButtonClicked();
});

// Maak de boardState leeg en verander de gameActie naar true
// Verander de huidige speler naar de startPlayer
function resetButtonClicked() { 
    console.log('resetButtonClicked'); 
    boardState = Array(9).fill(''); 
    gameActie = true; 
    currentPlayer = startPlayer;
  
}

