const bord = document.getElementById('bord');
const RIJEN = 6;
const KOLLOMNEN = 7;
let huidigeSpeler = 'rood';
let spelbord = Array.from({ length: RIJEN }, () => Array(KOLLOMNEN).fill(null));

const maakBord = () => {
  bord.innerHTML = '';
  for (let rij = 0; rij < RIJEN; rij++) {
    for (let kol = 0; kol < KOLLOMNEN; kol++) {
      const cel = document.createElement('div');
      cel.classList.add('cel');
      cel.dataset.rij = rij;
      cel.dataset.kol = kol;
      cel.addEventListener('click', handelCelKlik);
      bord.appendChild(cel);
    }
  }
};

const handelCelKlik = (event) => {
  const kol = parseInt(event.target.dataset.kol);
  const rij = vindBeschikbareRij(kol);
  if (rij !== -1) {
    plaatsSchijf(rij, kol);
    if (controleerWinst(rij, kol)) {
      setTimeout(() => {
        alert(`${huidigeSpeler} wint!`);
        resetSpel();
      }, 10);
    } else if (isBordVol()) {
      setTimeout(() => {
        alert('Gelijkspel!');
        resetSpel();
      }, 10);
    } else {
      huidigeSpeler = huidigeSpeler === 'rood' ? 'geel' : 'rood';
    }
  }
};

const vindBeschikbareRij = (kol) => {
  for (let rij = RIJEN - 1; rij >= 0; rij--) {
    if (!spelbord[rij][kol]) {
      return rij;
    }
  }
  return -1;
};

const plaatsSchijf = (rij, kol) => {
  spelbord[rij][kol] = huidigeSpeler;
  const cel = document.querySelector(`.cel[data-rij="${rij}"][data-kol="${kol}"]`);
  const schijf = document.createElement('div');
  schijf.classList.add('schijf', huidigeSpeler);
  cel.appendChild(schijf);
};

const controleerWinst = (rij, kol) => {
  return (
    controleerRichting(rij, kol, 1, 0) || // Horizontaal
    controleerRichting(rij, kol, 0, 1) || // Verticaal
    controleerRichting(rij, kol, 1, 1) || // Diagonaal naar rechts-onder
    controleerRichting(rij, kol, 1, -1)   // Diagonaal naar rechts-boven
  );
};

const controleerRichting = (rij, kol, rijRichting, kolRichting) => {
  let aantal = 1;
  aantal += telSchijven(rij, kol, rijRichting, kolRichting);
  aantal += telSchijven(rij, kol, -rijRichting, -kolRichting);
  return aantal >= 4;
};

const telSchijven = (rij, kol, rijRichting, kolRichting) => {
  let aantal = 0;
  let r = rij + rijRichting;
  let k = kol + kolRichting;
  while (r >= 0 && r < RIJEN && k >= 0 && k < KOLLOMNEN && spelbord[r][k] === huidigeSpeler) {
    aantal++;
    r += rijRichting;
    k += kolRichting;
  }
  return aantal;
};

const isBordVol = () => {
  return spelbord.every(rij => rij.every(cel => cel !== null));
};

const resetSpel = () => {
  spelbord = Array.from({ length: RIJEN }, () => Array(KOLLOMNEN).fill(null));
  huidigeSpeler = 'rood';
  maakBord();
};

maakBord();

