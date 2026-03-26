'use strict';

// ============================================================
// State
// ============================================================
const state = {
  board:    Array.from({length:9}, ()=>Array(9).fill(0)),
  preset:   Array.from({length:9}, ()=>Array(9).fill(false)),
  notes:    Array.from({length:9}, ()=>Array.from({length:9}, ()=>new Set())),
  selected: null,
  isNote:   false,
  lang:     'en',
  level:    50,
  timerSec: 0,
  timerInterval: null,
  won:      false,
};

const LEVELS_EN = ['Intro','Easy','Medium','Hard','Expert','Final Boss','Universe'];
const LEVELS_VI = ['Nhập môn','Dễ','Trung bình','Khó','Chuyên gia','Trùm cuối','Tầm vũ trụ'];
const LEVEL_VALUES = [35,40,45,50,55,60,65];

const I18N = {
  en: {
    title:'Sudoku', solve:'Solve', newgame:'New Game', note:'Note',
    again:'Play Again', del:'Del', clearall:'Clear All',
    success:'Sudoku solved successfully!', nosolution:'No solution found.',
    victory:'Victory...!!! 1000 likes....!!!',
    lang_toggle:'VI', status_default:'Code By: Trần Quốc Minh',
    generating:'Generating...', solving:'Solving...',
  },
  vi: {
    title:'Giải Sudoku', solve:'Giải', newgame:'Thư giãn', note:'Ghi chú',
    again:'Chơi Lại', del:'Xóa', clearall:'Xóa Hết',
    success:'Sudoku được giải!', nosolution:'Không tìm thấy giải pháp.',
    victory:'Chiến thắng...!!! 1000 likes....!!!',
    lang_toggle:'EN', status_default:'Code By: Trần Quốc Minh',
    generating:'Đang tạo...', solving:'Đang giải...',
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

const loadingEl = document.createElement('div');
loadingEl.id = 'loading';
loadingEl.classList.add('hidden');
document.body.appendChild(loadingEl);

// ============================================================
// Sudoku Generator (pure JavaScript — no server needed)
// ============================================================

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValidCell(board, row, col, num) {
  // Row
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
  }
  // Col
  for (let i = 0; i < 9; i++) {
    if (board[i][col] === num) return false;
  }
  // Box
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[br + i][bc + j] === num) return false;
    }
  }
  return true;
}

/** Fill board using backtracking with randomized digit order. Returns true if solved. */
function fillBoard(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1,2,3,4,5,6,7,8,9]);
        for (const n of nums) {
          if (isValidCell(board, r, c, n)) {
            board[r][c] = n;
            if (fillBoard(board)) return true;
            board[r][c] = 0;
          }
        }
        return false; // backtrack
      }
    }
  }
  return true; // all filled
}

/** Fill diagonal 3×3 boxes (they're independent — no conflicts possible). */
function fillDiagonalBoxes(board) {
  for (let box = 0; box < 3; box++) {
    const nums = shuffle([1,2,3,4,5,6,7,8,9]);
    let idx = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        board[box * 3 + i][box * 3 + j] = nums[idx++];
      }
    }
  }
}

/** Generate a fully solved board. */
function generateSolvedBoard() {
  const board = Array.from({length:9}, ()=>Array(9).fill(0));
  fillDiagonalBoxes(board); // fill 3 diagonal boxes first (always valid)
  fillBoard(board);          // fill remaining cells
  return board;
}

/** Remove `count` cells from a solved board to create the puzzle. */
function removeCells(solved, count) {
  const board = solved.map(r => [...r]);
  const positions = shuffle(
    Array.from({length:81}, (_, i) => [Math.floor(i/9), i%9])
  );
  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= count) break;
    board[r][c] = 0;
    removed++;
  }
  return board;
}

/** Entry point: generate a puzzle for the given difficulty (cells removed). */
function generatePuzzle(cellsToRemove) {
  const solved = generateSolvedBoard();
  return removeCells(solved, cellsToRemove);
}

// ============================================================
// Iterative solver (used by the Solve button via server, but
// also available locally as fallback)
// ============================================================

function solveLocal(boardIn) {
  const board = boardIn.map(r => [...r]);
  const empties = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] === 0) empties.push([r, c]);

  if (empties.length === 0) return board;

  const n = empties.length;
  const choices = Array(n).fill(1); // next digit to try per position
  let i = 0;
  let steps = 0;
  const MAX = 5_000_000;

  while (i >= 0 && i < n) {
    if (++steps > MAX) return null; // give up
    const [r, c] = empties[i];
    let found = false;
    for (let num = choices[i]; num <= 9; num++) {
      if (isValidCell(board, r, c, num)) {
        board[r][c] = num;
        choices[i] = num + 1;
        i++;
        found = true;
        break;
      }
    }
    if (!found) {
      board[r][c] = 0;
      choices[i] = 1;
      i--;
    }
  }
  return i === n ? board : null;
}

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
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      renderCell(r, c);
}

function renderCell(r, c) {
  const cell    = getCellEl(r, c);
  const val     = state.board[r][c];
  const pre     = state.preset[r][c];
  const noteSet = state.notes[r][c];
  const isSel   = state.selected && state.selected.row===r && state.selected.col===c;

  cell.className = 'cell';
  if (pre) cell.classList.add('preset');

  if (isSel) {
    cell.classList.add('selected');
  } else if (state.selected) {
    const {row:sr, col:sc} = state.selected;
    if (r===sr || c===sc || (Math.floor(r/3)===Math.floor(sr/3) && Math.floor(c/3)===Math.floor(sc/3)))
      cell.classList.add('highlight');
  }

  if (!pre && val !== 0) {
    cell.classList.add(isValidPlacement(r, c, val) ? 'valid' : 'invalid');
  }

  if (!pre && noteSet.size > 0 && val === 0) {
    cell.classList.add('note-mode');
    const arr = Array(9).fill(' ');
    noteSet.forEach(n => { arr[n-1] = String(n); });
    let txt = '';
    for (let i = 0; i < 3; i++) txt += arr.slice(i*3, i*3+3).join('') + (i<2?'\n':'');
    cell.textContent = txt;
  } else {
    cell.textContent = val !== 0 ? val : '';
  }
}

// ============================================================
// Validation helpers
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
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    if (state.board[r][c]===0 || !isValidPlacement(r,c,state.board[r][c])) return false;
  }
  return true;
}

// ============================================================
// Cell selection & input
// ============================================================
function selectCell(r, c) {
  state.selected = {row:r, col:c};
  renderBoard();
}

function inputNumber(num) {
  if (!state.selected || state.won) return;
  const {row, col} = state.selected;
  if (state.preset[row][col]) return;
  if (state.isNote) {
    const ns = state.notes[row][col];
    if (ns.has(num)) ns.delete(num); else ns.add(num);
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
  if (state.isNote) state.notes[row][col].clear();
  else state.board[row][col] = 0;
  renderBoard();
}

// ============================================================
// Keyboard
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') { inputNumber(parseInt(e.key)); return; }
  if (e.key==='Backspace'||e.key==='Delete'||e.key==='0') { deleteInput(); return; }
  if (!state.selected) return;
  const {row, col} = state.selected;
  let nr=row, nc=col;
  if (e.key==='ArrowUp')    nr=Math.max(0,row-1);
  if (e.key==='ArrowDown')  nr=Math.min(8,row+1);
  if (e.key==='ArrowLeft')  nc=Math.max(0,col-1);
  if (e.key==='ArrowRight') nc=Math.min(8,col+1);
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
  if      (type==='success') { statusEl.textContent=msg||t.success; statusEl.classList.add('success'); }
  else if (type==='error')   { statusEl.textContent=msg||t.nosolution; statusEl.classList.add('error'); }
  else                       { statusEl.textContent=t.status_default; }
}

// ============================================================
// Victory modal
// ============================================================
function showVictory() {
  modalMsg.textContent = I18N[state.lang].victory;
  modal.classList.remove('hidden');
}
modalClose.addEventListener('click', ()=>{ modal.classList.add('hidden'); });

// ============================================================
// Level
// ============================================================
function getLevelIdx() {
  const idx = LEVEL_VALUES.indexOf(state.level);
  return idx === -1 ? 3 : idx;
}
function updateLevelLabel() {
  const labels = state.lang==='vi' ? LEVELS_VI : LEVELS_EN;
  levelLabel.textContent = labels[getLevelIdx()];
}

// ============================================================
// New game — generated entirely in JS (instant, no server)
// ============================================================
function newGame() {
  stopTimer();
  state.won    = false;
  state.isNote = false;
  btnNote.classList.remove('active');
  setStatus(null);
  showLoading(true, I18N[state.lang].generating);

  // Use setTimeout so the loading overlay renders before heavy work
  setTimeout(() => {
    try {
      const puzzle = generatePuzzle(state.level);
      for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
        state.board[r][c]  = puzzle[r][c];
        state.preset[r][c] = puzzle[r][c] !== 0;
        state.notes[r][c]  = new Set();
      }
      state.selected = null;
      renderBoard();
      startTimer();
    } catch(err) {
      setStatus('error', 'Error generating puzzle');
    } finally {
      showLoading(false);
    }
  }, 20);
}

// ============================================================
// Solve — tries server first, falls back to local JS solver
// ============================================================
async function solveBoard() {
  showLoading(true, I18N[state.lang].solving);

  // Validate first
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    const num = state.board[r][c];
    if (num !== 0 && !isValidPlacement(r,c,num)) {
      setStatus('error');
      showLoading(false);
      return;
    }
  }

  // Try server
  try {
    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({board: state.board}),
      signal: AbortSignal.timeout(8000), // 8s max
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        applysolvedBoard(data.board);
        showLoading(false);
        return;
      } else {
        setStatus('error');
        showLoading(false);
        return;
      }
    }
  } catch (_) {
    // Server unreachable or timeout — fall through to local solver
  }

  // Local JS fallback (runs instantly in browser)
  const solved = solveLocal(state.board);
  if (solved) {
    applysolvedBoard(solved);
  } else {
    setStatus('error');
  }
  showLoading(false);
}

function applysolvedBoard(solved) {
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    state.board[r][c] = solved[r][c];
    state.notes[r][c] = new Set();
  }
  state.won      = true;
  state.selected = null;
  stopTimer();
  renderBoard();
  setStatus('success');
}

// ============================================================
// Reset & Clear
// ============================================================
function resetGame() {
  stopTimer();
  state.won = false; state.isNote = false;
  btnNote.classList.remove('active');
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    if (!state.preset[r][c]) { state.board[r][c]=0; state.notes[r][c]=new Set(); }
  }
  state.selected = null;
  setStatus(null);
  renderBoard();
  startTimer();
}

function clearAll() {
  stopTimer();
  state.won = false; state.isNote = false;
  btnNote.classList.remove('active');
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    state.board[r][c]=0; state.preset[r][c]=false; state.notes[r][c]=new Set();
  }
  state.selected = null;
  timerEl.textContent = '00:00';
  setStatus(null);
  renderBoard();
}

// ============================================================
// Loading overlay
// ============================================================
function showLoading(show, msg) {
  loadingEl.textContent = msg || '';
  loadingEl.classList.toggle('hidden', !show);
}

// ============================================================
// Language
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
