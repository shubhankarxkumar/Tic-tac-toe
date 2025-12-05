(function () {
  'use strict';

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const turnEl = document.getElementById('turn');
  const newBtn = document.getElementById('newBtn');
  const resetBtn = document.getElementById('resetBtn');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const undoBtn = document.getElementById('undoBtn');
  const shareBtn = document.getElementById('shareBtn');

  const soundToggle = document.getElementById('soundToggle');
  const vibrateToggle = document.getElementById('vibrateToggle');
  const highlightToggle = document.getElementById('highlightToggle');

  const WIN_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]
  ];

  let board = Array(9).fill(null);
  let current = 'X';
  let running = true;
  let history = [];
  let scores = { X: 0, O: 0 };

  // tiny click & win sounds (data URIs)
  const clickSound = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA='); // very short silent/placeholder
  const winSound = new Audio('data:audio/wave;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=');

  // If you prefer real sounds, set src to real file paths:
  // clickSound.src = 'click.mp3'; winSound.src = 'win.mp3';

  // init
  function init() {
    loadScores();
    buildBoard();
    attachEvents();
    render();
  }

  function buildBoard() {
    // Only build if board container exists
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.type = 'button';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Cell ${i + 1}`);
      cell.dataset.index = i;
      cell.tabIndex = 0;
      boardEl.appendChild(cell);
    }
  }

  function attachEvents() {
    if (boardEl) {
      boardEl.addEventListener('click', onCellClick);
      boardEl.addEventListener('keydown', onBoardKeydown);
    }
    if (newBtn) newBtn.addEventListener('click', newGame);
    if (resetBtn) resetBtn.addEventListener('click', resetScores);
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (shareBtn) shareBtn.addEventListener('click', copyInvite);
  }

  function onCellClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell || !running) return;
    const idx = Number(cell.dataset.index);
    playAt(idx);
  }

  function onBoardKeydown(e) {
    const active = document.activeElement;
    if (!active || !active.classList.contains('cell')) return;
    let idx = Number(active.dataset.index);
    switch (e.key) {
      case 'ArrowLeft': idx = (idx + 8) % 9; boardEl.children[idx].focus(); e.preventDefault(); break;
      case 'ArrowRight': idx = (idx + 1) % 9; boardEl.children[idx].focus(); e.preventDefault(); break;
      case 'ArrowUp': idx = (idx + 6) % 9; boardEl.children[idx].focus(); e.preventDefault(); break;
      case 'ArrowDown': idx = (idx + 3) % 9; boardEl.children[idx].focus(); e.preventDefault(); break;
      case 'Enter': case ' ': playAt(Number(active.dataset.index)); e.preventDefault(); break;
    }
  }

  function playAt(i) {
    if (board[i] || !running) return;
    history.push({ board: board.slice(), current });
    board[i] = current;

    // vibrate if available and enabled
    if ((vibrateToggle?.checked) && navigator.vibrate) navigator.vibrate(20);
    // sound if enabled
    if (soundToggle?.checked) {
      try { clickSound.currentTime = 0; clickSound.play().catch(() => { }); } catch (e) { /* noop */ }
    }

    render();
    const win = checkWin();
    if (win) {
      running = false;
      // small delay so the last move renders before win animation
      setTimeout(() => showWin(win), 120);
      return;
    }
    if (board.every(Boolean)) {
      running = false;
      setTimeout(() => showDraw(), 120);
      return;
    }
    current = current === 'X' ? 'O' : 'X';
    render();
  }

  function checkWin() {
    for (const combo of WIN_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], combo };
      }
    }
    return null;
  }

  function showWin({ winner, combo }) {
    // highlight winning cells
    combo.forEach(i => {
      const cell = boardEl.children[i];
      if (!cell) return;
      if (highlightToggle?.checked) cell.classList.add('win');
      // micro animation: add a class that you style in CSS (like .win -> glow)
      cell.animate([
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.08)', offset: 0.5 },
        { transform: 'scale(1)', offset: 1 }
      ], { duration: 450, iterations: 2, easing: 'ease-out' });
    });

    // play win sound
    if (soundToggle?.checked) {
      try { winSound.currentTime = 0; winSound.play().catch(() => { }); } catch (e) { /* noop */ }
    }

    // update score & save
    scores[winner] = (scores[winner] || 0) + 1;
    saveScores();
    renderScores();

    // show status text
    if (statusEl) {
      statusEl.textContent = `Player ${winner} wins!`;
      // small winner pulse
      statusEl.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.04)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 }
      ], { duration: 450, easing: 'ease-out' });
    }
  }

  function showDraw() {
    if (statusEl) statusEl.textContent = 'Draw!';
    // small pulse for draw
    if (statusEl) statusEl.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.03)', opacity: 1 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: 350, easing: 'ease-out' });
  }

  // NEW GAME: clears board and history but keeps scores (play another round)
  function newGame() {
    board = Array(9).fill(null);
    current = 'X';
    running = true;
    history = [];
    // clear cell classes/content
    for (let i = 0; i < 9; i++) {
      const cell = boardEl.children[i];
      if (!cell) continue;
      cell.textContent = '';
      cell.classList.remove('x', 'o', 'win');
    }
    render();
    if (statusEl) statusEl.textContent = `Player ${current}'s turn`;
  }

  // RESET SCORES: resets scores (with confirmation) and clears board too
  function resetScores() {
    if (!confirm('Reset scores?')) return;
    scores = { X: 0, O: 0 };
    saveScores();
    renderScores();
    // also clear board so you start fresh
    newGame();
  }

  function undo() {
    if (!history.length) return;
    const state = history.pop();
    board = state.board.slice();
    current = state.current;
    running = true;
    render();
  }

  function copyInvite() {
    const txt = 'Come play Tic-Tac-Toe with me — pass the device!';
    navigator.clipboard?.writeText(txt).then(() => {
      if (shareBtn) {
        const prev = shareBtn.textContent;
        shareBtn.textContent = 'Copied!';
        setTimeout(() => shareBtn.textContent = prev || 'Copy Invite', 1500);
      }
    }).catch(() => {
      alert('Copy failed — share the URL or invite manually.');
    });
  }

  function render() {
    // populate board
    for (let i = 0; i < 9; i++) {
      const cell = boardEl.children[i];
      if (!cell) continue;
      cell.classList.remove('x', 'o');
      const val = board[i];
      cell.textContent = val || '';
      if (val) cell.classList.add(val.toLowerCase());
      if (!running) {
        // keep win class if already added by showWin
      }
    }
    if (turnEl) turnEl.textContent = current;
    if (!running) {
      // status set by showWin/showDraw already, so don't override
    } else {
      if (statusEl) statusEl.textContent = `Player ${current}'s turn`;
    }

    if (undoBtn) undoBtn.disabled = history.length === 0;
    renderScores();
  }

  function renderScores() {
    if (scoreXEl) scoreXEl.textContent = scores.X;
    if (scoreOEl) scoreOEl.textContent = scores.O;
  }

  function saveScores() {
    try { localStorage.setItem('ttt-scores', JSON.stringify(scores)); } catch (e) { /* noop */ }
  }

  function loadScores() {
    try {
      const raw = localStorage.getItem('ttt-scores');
      if (raw) scores = JSON.parse(raw);
    } catch (e) { /* noop */ }
  }

  // keyboard: quick new game (N), restart (R)
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'n') newGame();
    if (e.key.toLowerCase() === 'r') resetScores();
  });

  // init app
  init();

})();
