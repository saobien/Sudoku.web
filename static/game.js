'use strict';

// ============================================================
// State
// ============================================================
const state = {
  board:    Array.from({length:9}, ()=>Array(9).fill(0)), // current board
  preset:   Array.from({length:9}, ()=>Array(9).fill(false)), // given cells
  notes:    Array.from({length:9}, ()=>Array.from({length:9}, ()=>new Set())),
  selected: null,   // {row, col}
  isNote:   false,
  lang:     'en',
  level:    50,     // 35=Intro … 65=Universe
  timerSec: 0,
  timerInterval: null,
  won:      false,
};

// Level map: cells_removed -> label
const LEVELS_EN = ['Intro','Easy','Medium','Hard','Expert','Final Boss','Universe'];
const LEVELS_VI = ['Nhập môn','Dễ','Trung bình','Khó','Chuyên gia','Trùm cuối','Tầm vũ trụ'];
const LEVEL_VALUES = [35,40,45,50,55,60,65];

const I18N = {
  en: {
    title:'Sudoku', solve:'Solve', newgame:'New Game', note:'Note',
    again:'Play Again', del:'Del', clearall:'Clear All',
    success:'Sudoku solved successfully!', nosolution:'No solution found for Sudoku.',
    victory:'Victory...!!! 1000 likes....!!!', info:'Info',
    lang_toggle:'VI', status_default:'Code By: Trần Quốc Minh',
    loading:'Loading...',
  },
  vi: {
    title:'Giải Sudoku', solve:'Giải', newgame:'Thư giãn', note:'Ghi chú',
    again:'Chơi Lại', del:'Xóa', clearall:'Xóa Hết',
    success:'Sudoku được giải!', nosolution:'Không tìm thấy giải pháp cho Sudoku.',
    victory:'Chiến thắng...!!! 1000 likes....!!!', info:'Thông báo',
    lang_toggle:'EN', status_default:'Code By: Trần Quốc Minh',
    loading:'Đang tải...',
  },
};

// ============================================================
// DOM refs
// ============================================================
const boardEl    = document.getElementById('board');
const statusEl   = document.getElementById('status-bar');
const timerEl    = document.getElementById('timer');
const levelLabel = document.getElementById('level-label');
const appTitle   = document.getElementById('app-title');
const langBtn    = document.getElementById('lang-btn');
const modal      = document.getElementById('modal');
const modalMsg   = document.getElementById('modal-msg');
const modalClose = document.getElementById('modal-close');
const btnSolve   = document.getElementById('btn-solve');
const btnRelax   = document.getElementById('btn-relax');
const btnNote    = document.getElementById('btn-note');
const btnReset   = document.getElementById('btn-reset');
const btnDel     = document.getElementById('btn-del');
const btnClear   = document.getElementById('btn-clear');
const btnLevelDn = document.getElementById('level-down');
const btnLevelUp = document.getElementById('level-up');

// Loading overlay (create dynamically)
const loadingEl = document.createElement('div');
loadingEl.id = 'loading';
loadingEl.textContent = 'Loading...';
loadingEl.classList.add('hidden');
document.body.appendChild(loadingEl);

// ============================================================
// Board rendering
// ============================================================
function buildBoardDOM() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('pointerdown', e => { e.preventDefault(); selectCell(r, c); });
      boardEl.appendChild(cell);
    }
  }
}

function getCellEl(r, c) {
  return boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

function renderBoard() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      renderCell(r, c);
    }
  }
}

function renderCell(r, c) {
  const cell = getCellEl(r, c);
  const val  = state.board[r][c];
  const pre  = state.preset[r][c];
  const noteSet = state.notes[r][c];
  const isSel = state.selected && state.selected.row===r && state.selected.col===c;

  // Clear classes
  cell.className = 'cell';
  if (pre) cell.classList.add('preset');

  // Selected
  if (isSel) cell.classList.add('selected');
  else if (state.selected) {
    const sr = state.selected.row, sc = state.selected.col;
    // same row/col/box as selected
    if (r===sr || c===sc || (Math.floor(r/3)===Math.floor(sr/3) && Math.floor(c/3)===Math.floor(sc/3))) {
      cell.classList.add('highlight');
    }
  }

  // Validity coloring for non-preset non-empty
  if (!pre && val !== 0) {
    if (isValidPlacement(r, c, val)) cell.classList.add('valid');
    else cell.classList.add('invalid');
  }

  // Content
  if (!pre && noteSet.size > 0 && val === 0) {
    // notes display
    cell.classList.add('note-mode');
    const noteArr = Array(9).fill(' ');
    noteSet.forEach(n => { noteArr[n-1] = String(n); });
    // 3x3 grid of digits
    let txt = '';
    for (let i=0; i<3; i++) txt += noteArr.slice(i*3, i*3+3).join('') + (i<2?'\n':'');
    cell.textContent = txt;
  } else {
    cell.textContent = val !== 0 ? val : '';
  }
}

// ============================================================
// Validation
// ============================================================
function isValidPlacement(row, col, num) {
  const b = state.board;
  for (let i=0;i<9;i++) { if (b[row][i]===num && i!==col) return false; }
  for (let i=0;i<9;i++) { if (b[i][col]===num && i!==row) return false; }
  const SR=Math.floor(row/3)*3, SC=Math.floor(col/3)*3;
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) {
    if (b[SR+i][SC+j]===num && (SR+i!==row||SC+j!==col)) return false;
  }
  return true;
}

function checkWin() {
  // all cells filled and valid
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    if (state.board[r][c]===0) return false;
    if (!isValidPlacement(r,c,state.board[r][c])) return false;
  }
  return true;
}

// ============================================================
// Cell selection
// ============================================================
function selectCell(r, c) {
  state.selected = {row:r, col:c};
  renderBoard();
}

// ============================================================
// Number input
// ============================================================
function inputNumber(num) {
  if (!state.selected || state.won) return;
  const {row, col} = state.selected;
  if (state.preset[row][col]) return;

  if (state.isNote) {
    const ns = state.notes[row][col];
    if (ns.has(num)) ns.delete(num);
    else ns.add(num);
  } else {
    state.board[row][col] = num;
    state.notes[row][col].clear();
  }

  renderBoard();
  setStatus(null);

  if (!state.isNote && checkWin()) {
    state.won = true;
    stopTimer();
    setTimeout(showVictory, 300);
  }
}

function deleteInput() {
  if (!state.selected || state.won) return;
  const {row, col} = state.selected;
  if (state.preset[row][col]) return;
  if (state.isNote) {
    state.notes[row][col].clear();
  } else {
    state.board[row][col] = 0;
  }
  renderBoard();
}

// ============================================================
// Keyboard support
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') { inputNumber(parseInt(e.key)); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { deleteInput(); return; }
  if (!state.selected) return;
  const {row, col} = state.selected;
  let nr=row, nc=col;
  if (e.key==='ArrowUp')    nr = Math.max(0,row-1);
  if (e.key==='ArrowDown')  nr = Math.min(8,row+1);
  if (e.key==='ArrowLeft')  nc = Math.max(0,col-1);
  if (e.key==='ArrowRight') nc = Math.min(8,col+1);
  if (nr!==row||nc!==col) { selectCell(nr,nc); e.preventDefault(); }
});

// ============================================================
// Timer
// ============================================================
function startTimer() {
  stopTimer();
  state.timerSec = 0;
  timerEl.textContent = '00:00';
  state.timerInterval = setInterval(() => {
    state.timerSec++;
    const m = String(Math.floor(state.timerSec/60)).padStart(2,'0');
    const s = String(state.timerSec%60).padStart(2,'0');
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

// ============================================================
// Status bar
// ============================================================
function setStatus(type, msg) {
  const t = I18N[state.lang];
  statusEl.className = 'status-bar';
  if (type === 'success') { statusEl.textContent = msg||t.success; statusEl.classList.add('success'); }
  else if (type === 'error') { statusEl.textContent = msg||t.nosolution; statusEl.classList.add('error'); }
  else { statusEl.textContent = t.status_default; }
}

// ============================================================
// Victory modal
// ============================================================
function showVictory() {
  const t = I18N[state.lang];
  modalMsg.textContent = t.victory;
  modal.classList.remove('hidden');
}
modalClose.addEventListener('click', ()=>{ modal.classList.add('hidden'); });

// ============================================================
// Level display
// ============================================================
function getLevelIdx() {
  let idx = LEVEL_VALUES.indexOf(state.level);
  if (idx===-1) idx=3;
  return idx;
}
function updateLevelLabel() {
  const idx = getLevelIdx();
  const labels = state.lang==='vi' ? LEVELS_VI : LEVELS_EN;
  levelLabel.textContent = labels[idx];
}

// ============================================================
// New game (fetch from server)
// ============================================================
async function newGame() {
  stopTimer();
  state.won = false;
  state.isNote = false;
  btnNote.classList.remove('active');
  setStatus(null);
  showLoading(true);

  try {
    const res = await fetch(`/api/new-game?level=${state.level}`);
    const data = await res.json();
    const puzzle = data.board;

    for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
      state.board[r][c] = puzzle[r][c];
      state.preset[r][c] = puzzle[r][c] !== 0;
      state.notes[r][c] = new Set();
    }
    state.selected = null;
    renderBoard();
    startTimer();
  } catch(err) {
    setStatus('error', 'Network error');
  } finally {
    showLoading(false);
  }
}

// ============================================================
// Solve (ask server)
// ============================================================
async function solveBoard() {
  showLoading(true);
  const t = I18N[state.lang];
  // send current board (merge preset + user input)
  try {
    const res = await fetch('/api/solve', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({board: state.board}),
    });
    const data = await res.json();
    if (data.success) {
      const solved = data.board;
      for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
        state.board[r][c] = solved[r][c];
        state.notes[r][c] = new Set();
      }
      state.won = true;
      stopTimer();
      state.selected = null;
      renderBoard();
      setStatus('success');
    } else {
      setStatus('error');
    }
  } catch(err) {
    setStatus('error', 'Network error');
  } finally {
    showLoading(false);
  }
}

// ============================================================
// Reset (restore original puzzle)
// ============================================================
function resetGame() {
  stopTimer();
  state.won = false;
  state.isNote = false;
  btnNote.classList.remove('active');
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    if (!state.preset[r][c]) {
      state.board[r][c] = 0;
      state.notes[r][c] = new Set();
    }
  }
  state.selected = null;
  setStatus(null);
  renderBoard();
  startTimer();
}

// ============================================================
// Clear all
// ============================================================
function clearAll() {
  stopTimer();
  state.won = false;
  state.isNote = false;
  btnNote.classList.remove('active');
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    state.board[r][c] = 0;
    state.preset[r][c] = false;
    state.notes[r][c] = new Set();
  }
  state.selected = null;
  timerEl.textContent = '00:00';
  setStatus(null);
  renderBoard();
}

// ============================================================
// Loading overlay
// ============================================================
function showLoading(show) {
  loadingEl.textContent = I18N[state.lang].loading;
  loadingEl.classList.toggle('hidden', !show);
}

// ============================================================
// Language toggle
// ============================================================
function toggleLanguage() {
  state.lang = state.lang==='en' ? 'vi' : 'en';
  applyLanguage();
}

function applyLanguage() {
  const t = I18N[state.lang];
  langBtn.textContent  = t.lang_toggle;
  appTitle.textContent = t.title;
  btnSolve.textContent = t.solve;
  btnRelax.textContent = t.newgame;
  btnNote.textContent  = t.note;
  btnReset.textContent = t.again;
  btnDel.textContent   = t.del;
  btnClear.textContent = t.clearall;
  setStatus(null);
  updateLevelLabel();
}

// ============================================================
// Button wiring
// ============================================================
document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('pointerdown', e => { e.preventDefault(); inputNumber(parseInt(btn.dataset.num)); });
});

btnSolve.addEventListener('click', solveBoard);
btnRelax.addEventListener('click', newGame);
btnNote.addEventListener('click', () => {
  state.isNote = !state.isNote;
  btnNote.classList.toggle('active', state.isNote);
});
btnReset.addEventListener('click', resetGame);
btnDel.addEventListener('click', deleteInput);
btnClear.addEventListener('click', clearAll);
langBtn.addEventListener('click', toggleLanguage);

btnLevelDn.addEventListener('click', () => {
  const idx = getLevelIdx();
  if (idx > 0) { state.level = LEVEL_VALUES[idx-1]; updateLevelLabel(); }
});
btnLevelUp.addEventListener('click', () => {
  const idx = getLevelIdx();
  if (idx < LEVEL_VALUES.length-1) { state.level = LEVEL_VALUES[idx+1]; updateLevelLabel(); }
});

// ============================================================
// Init
// ============================================================
buildBoardDOM();
applyLanguage();
newGame();
