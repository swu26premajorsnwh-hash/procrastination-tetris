/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  ArrowRight, 
  ArrowDown, 
  RotateCw, 
  Zap, 
  Flame, 
  Award, 
  Clock, 
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

// --- Types & Constants ---

const COLS = 10;
const ROWS = 20;

interface TaskType {
  name: string;
  label: string;
  icon: string;
  bg: string;
  border: string;
  text: string;
  accent: string;
}

const TASKS: TaskType[] = [
  { name: 'STUDY', label: 'STUDY', icon: '📚', bg: '#e0e7ff', border: '#818cf8', text: '#3730a3', accent: '#6366f1' },
  { name: 'ASSIGN', label: 'ASSIGN', icon: '📝', bg: '#fef3c7', border: '#f59e0b', text: '#92400e', accent: '#d97706' },
  { name: 'CLEAN', label: 'CLEAN', icon: '🧹', bg: '#d1fae5', border: '#10b981', text: '#065f46', accent: '#059669' },
  { name: 'REPLY', label: 'REPLY', icon: '📧', bg: '#e0f2fe', border: '#38bdf8', text: '#075985', accent: '#0284c7' },
  { name: 'LAUNDRY', label: 'LAUNDRY', icon: '🧺', bg: '#ffe4e6', border: '#fb7185', text: '#9f1239', accent: '#e11d48' },
  { name: 'WORK', label: 'WORK', icon: '💼', bg: '#ede9fe', border: '#a78bfa', text: '#5b21b6', accent: '#7c3aed' },
  { name: 'SCHEDULE', label: 'SCHEDULE', icon: '📅', bg: '#ffedd5', border: '#fb923c', text: '#9a3412', accent: '#ea580c' },
  { name: 'TAXES', label: 'TAXES', icon: '💳', bg: '#fee2e2', border: '#f87171', text: '#991b1b', accent: '#dc2626' },
];

// Tetromino Shapes: I, O, T, S, Z, J, L
const SHAPES: number[][][] = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // O
  [
    [1, 1],
    [1, 1],
  ],
  // T
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // S
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  // Z
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  // J
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // L
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
];

interface Cell {
  task: TaskType;
}

interface Piece {
  shape: number[][];
  x: number;
  y: number;
  task: TaskType;
}

const PROCRASTINATION_MESSAGES_DAY = [
  "I'll do it later.",
  "Still have plenty of time.",
  "Tomorrow for sure.",
  "It's not that urgent.",
  "Five more minutes.",
  "I work better under pressure.",
  "Future me can handle it.",
  "This is technically productive.",
  "At least I'm doing something.",
  "Let me make some iced coffee first.",
  "Productive procrastination is valid.",
  "My desk needs to be reorganized first.",
  "Just one video essay to get focused.",
  "Brain needs a quick warm-up first.",
  "Let me make a detailed color-coded schedule."
];

const PROCRASTINATION_MESSAGES_NIGHT = [
  "Okay, I really need to do this.",
  "Why is it already 11 PM?!",
  "I said I would start at 9...",
  "Tomorrow. Definitely tomorrow.",
  "Sleep now, wake up at 5 AM to do it.",
  "If I submit at 11:58 PM, it counts!",
  "The deadline adrenaline is kicking in!",
  "Tomorrow Me is going to hate me.",
  "I'm typing at 120 words per minute in my head."
];

// --- Simple Web Audio Synthesizer ---
class SoundManager {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.1) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio context autoplay errors
    }
  }

  move() {
    this.playTone(480, 0.04, 'triangle', 0.05);
  }

  rotate() {
    this.playTone(680, 0.06, 'sine', 0.08);
  }

  drop() {
    this.playTone(180, 0.1, 'triangle', 0.12);
  }

  hardDrop() {
    this.playTone(120, 0.15, 'sawtooth', 0.15);
  }

  lineClear(lines: number) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = lines >= 4 ? [440, 554, 659, 880] : [523, 659, 784];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 0.2, 'sine', 0.15);
        }, idx * 70);
      });
    } catch {
      // Audio error safe ignore
    }
  }

  gameOver() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      [330, 293, 261, 196].forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 0.25, 'sawtooth', 0.12);
        }, idx * 120);
      });
    } catch {
      // Audio error safe ignore
    }
  }

  victory() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      [523, 659, 784, 1046].forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 0.3, 'triangle', 0.15);
        }, idx * 100);
      });
    } catch {
      // Audio error safe ignore
    }
  }
}

const sounds = new SoundManager();

export default function App() {
  // Game states
  const [grid, setGrid] = useState<(Cell | null)[][]>(() => 
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);

  // Stats
  const [score, setScore] = useState<number>(0);
  const [linesCleared, setLinesCleared] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [tasksAvoided, setTasksAvoided] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('procrastination_tetris_hi') || '0', 10);
    } catch {
      return 0;
    }
  });

  // Clock progression (starts at 9:00 AM = 540 minutes from midnight)
  const [clockMinutes, setClockMinutes] = useState<number>(540);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(false);

  // Status flags
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // Procrastination Toast Message
  const [activeToast, setActiveToast] = useState<{ message: string; id: number } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Refs for animation & state in loops
  const gridRef = useRef<(Cell | null)[][]>(grid);
  gridRef.current = grid;
  const currentPieceRef = useRef<Piece | null>(currentPiece);
  currentPieceRef.current = currentPiece;
  const nextPieceRef = useRef<Piece | null>(nextPiece);
  nextPieceRef.current = nextPiece;
  const holdPieceRef = useRef<Piece | null>(holdPiece);
  holdPieceRef.current = holdPiece;
  const canHoldRef = useRef<boolean>(canHold);
  canHoldRef.current = canHold;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;
  const isGameOverRef = useRef<boolean>(isGameOver);
  isGameOverRef.current = isGameOver;
  const clockMinutesRef = useRef<number>(clockMinutes);
  clockMinutesRef.current = clockMinutes;
  const levelRef = useRef<number>(level);
  levelRef.current = level;

  // Flash rows effect on line clear
  const [clearingRows, setClearingRows] = useState<number[]>([]);

  // Sound mute state
  useEffect(() => {
    sounds.muted = muted;
  }, [muted]);

  // Generate random piece
  const generatePiece = useCallback((): Piece => {
    const shapeIdx = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[shapeIdx];
    const task = TASKS[Math.floor(Math.random() * TASKS.length)];
    // Center the piece
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;
    return {
      shape,
      x,
      y,
      task
    };
  }, []);

  // Format Clock display (e.g., 9:00 AM -> 11:59 PM)
  const formatTime = (totalMinutes: number) => {
    const boundedMins = Math.floor(totalMinutes);
    const hours24 = Math.floor(boundedMins / 60) % 24;
    const mins = boundedMins % 60;
    const isPm = hours24 >= 12;
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const padMins = mins < 10 ? `0${mins}` : `${mins}`;
    const period = isPm ? 'PM' : 'AM';
    return `${hours12}:${padMins} ${period}`;
  };

  // Trigger procrastination toast
  const triggerProcrastinationMessage = useCallback((minutes: number) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    const isLate = minutes >= 21 * 60; // After 9:00 PM
    const pool = isLate ? PROCRASTINATION_MESSAGES_NIGHT : PROCRASTINATION_MESSAGES_DAY;
    const message = pool[Math.floor(Math.random() * pool.length)];
    setActiveToast({ message, id: Date.now() });

    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 2200);
  }, []);

  // Collision Check
  const checkCollision = useCallback((shape: number[][], offsetX: number, offsetY: number, currentGrid: (Cell | null)[][]): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const newX = offsetX + c;
          const newY = offsetY + r;

          // Wall and bottom bounds
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          // Grid block collision (ignore if above board)
          if (newY >= 0 && currentGrid[newY] && currentGrid[newY][newX] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Rotate Matrix with SRS-like wall kicks
  const rotateMatrix = (matrix: number[][]): number[][] => {
    const N = matrix.length;
    const result: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        result[c][N - 1 - r] = matrix[r][c];
      }
    }
    return result;
  };

  // Lock piece into grid & clear lines
  const lockPiece = useCallback((piece: Piece) => {
    const newGrid = gridRef.current.map(row => [...row]);
    let placedOutOfTop = false;

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0) {
          const boardY = piece.y + r;
          const boardX = piece.x + c;
          if (boardY < 0) {
            placedOutOfTop = true;
          } else if (boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newGrid[boardY][boardX] = { task: piece.task };
          }
        }
      }
    }

    if (placedOutOfTop) {
      handleGameOver();
      return;
    }

    // Advance time slightly for placing a block
    setClockMinutes(prev => {
      const nextTime = prev + 4; // +4 minutes per task placed
      if (nextTime >= 23 * 60 + 59) {
        setDeadlinePassed(true);
      }
      return nextTime;
    });

    // Check full rows
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (newGrid[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length > 0) {
      setClearingRows(fullRows);
      sounds.lineClear(fullRows.length);

      setTimeout(() => {
        const remainingGrid = newGrid.filter((_, idx) => !fullRows.includes(idx));
        const emptyRowsNeeded = ROWS - remainingGrid.length;
        const refreshedGrid = [
          ...Array.from({ length: emptyRowsNeeded }, () => Array(COLS).fill(null)),
          ...remainingGrid,
        ];

        setGrid(refreshedGrid);
        setClearingRows([]);

        // Points & stats
        const linePoints = [0, 100, 300, 500, 800];
        const earned = (linePoints[fullRows.length] || 1000) * levelRef.current;
        setScore(s => {
          const newS = s + earned;
          if (newS > highScore) {
            setHighScore(newS);
            try {
              localStorage.setItem('procrastination_tetris_hi', newS.toString());
            } catch {
              // Ignore
            }
          }
          return newS;
        });

        setLinesCleared(l => {
          const newL = l + fullRows.length;
          // Level up every 6 lines
          const newLevel = Math.floor(newL / 6) + 1;
          setLevel(newLevel);

          // Optional Victory condition: 25 lines cleared before 11:59 PM
          if (newL >= 25 && clockMinutesRef.current < 23 * 60 + 59 && !isVictory) {
            setIsVictory(true);
            sounds.victory();
          }
          return newL;
        });

        setTasksAvoided(t => t + fullRows.length * 10);

        // Advance clock on line clears & trigger funny message
        setClockMinutes(prev => {
          const advanced = prev + fullRows.length * 15; // +15 mins per line clear
          if (advanced >= 23 * 60 + 59) {
            setDeadlinePassed(true);
          }
          triggerProcrastinationMessage(advanced);
          return advanced;
        });

        spawnNextPiece(refreshedGrid);
      }, 180);
    } else {
      setGrid(newGrid);
      spawnNextPiece(newGrid);
    }
  }, [triggerProcrastinationMessage, highScore, isVictory]);

  // Spawn next piece
  const spawnNextPiece = useCallback((currentGrid: (Cell | null)[][]) => {
    const next = nextPieceRef.current || generatePiece();
    const futureNext = generatePiece();

    setNextPiece(futureNext);
    setCanHold(true);

    if (checkCollision(next.shape, next.x, next.y, currentGrid)) {
      handleGameOver();
    } else {
      setCurrentPiece(next);
    }
  }, [checkCollision, generatePiece]);

  // Game over
  const handleGameOver = () => {
    setIsPlaying(false);
    setIsGameOver(true);
    sounds.gameOver();
  };

  // Start new game
  const startGame = () => {
    const emptyGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    setGrid(emptyGrid);
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    setTasksAvoided(0);
    setClockMinutes(540); // 9:00 AM
    setDeadlinePassed(false);
    setIsGameOver(false);
    setIsVictory(false);
    setIsPaused(false);
    setHoldPiece(null);
    setCanHold(true);
    setActiveToast(null);

    const first = generatePiece();
    const second = generatePiece();

    setCurrentPiece(first);
    setNextPiece(second);
    setIsPlaying(true);
    setHasStarted(true);
  };

  // Drop Ghost calculation
  const getGhostY = useCallback((piece: Piece, currentGrid: (Cell | null)[][]): number => {
    let ghostY = piece.y;
    while (!checkCollision(piece.shape, piece.x, ghostY + 1, currentGrid)) {
      ghostY++;
    }
    return ghostY;
  }, [checkCollision]);

  // Player Actions
  const moveLeft = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || !currentPieceRef.current) return;
    const piece = currentPieceRef.current;
    if (!checkCollision(piece.shape, piece.x - 1, piece.y, gridRef.current)) {
      setCurrentPiece({ ...piece, x: piece.x - 1 });
      sounds.move();
    }
  }, [checkCollision]);

  const moveRight = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || !currentPieceRef.current) return;
    const piece = currentPieceRef.current;
    if (!checkCollision(piece.shape, piece.x + 1, piece.y, gridRef.current)) {
      setCurrentPiece({ ...piece, x: piece.x + 1 });
      sounds.move();
    }
  }, [checkCollision]);

  const rotate = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || !currentPieceRef.current) return;
    const piece = currentPieceRef.current;
    const rotated = rotateMatrix(piece.shape);

    // Wall kicks: try standard, left, right, double left, double right, up
    const kicks = [0, -1, 1, -2, 2];
    for (const offset of kicks) {
      if (!checkCollision(rotated, piece.x + offset, piece.y, gridRef.current)) {
        setCurrentPiece({
          ...piece,
          shape: rotated,
          x: piece.x + offset
        });
        sounds.rotate();
        return;
      }
    }
  }, [checkCollision]);

  const softDrop = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || !currentPieceRef.current) return;
    const piece = currentPieceRef.current;
    if (!checkCollision(piece.shape, piece.x, piece.y + 1, gridRef.current)) {
      setCurrentPiece({ ...piece, y: piece.y + 1 });
      setScore(s => s + 1);
      sounds.move();
    } else {
      lockPiece(piece);
    }
  }, [checkCollision, lockPiece]);

  const hardDrop = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || !currentPieceRef.current) return;
    const piece = currentPieceRef.current;
    const targetY = getGhostY(piece, gridRef.current);
    const dropDistance = targetY - piece.y;

    setScore(s => s + dropDistance * 2);
    sounds.hardDrop();

    const lockedPiece = { ...piece, y: targetY };
    setCurrentPiece(lockedPiece);
    lockPiece(lockedPiece);
  }, [getGhostY, lockPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current || !currentPieceRef.current || !canHoldRef.current) return;

    sounds.rotate();
    const current = currentPieceRef.current;
    const freshHeldPiece: Piece = {
      shape: SHAPES[SHAPES.findIndex(s => s.length === current.shape.length && s[0].length === current.shape[0].length)] || current.shape,
      x: 0,
      y: 0,
      task: current.task
    };

    if (holdPieceRef.current) {
      const swappedPiece: Piece = {
        shape: holdPieceRef.current.shape,
        x: Math.floor((COLS - holdPieceRef.current.shape[0].length) / 2),
        y: 0,
        task: holdPieceRef.current.task
      };
      setHoldPiece(freshHeldPiece);
      setCurrentPiece(swappedPiece);
    } else {
      setHoldPiece(freshHeldPiece);
      spawnNextPiece(gridRef.current);
    }
    setCanHold(false);
  }, [spawnNextPiece]);

  const togglePause = useCallback(() => {
    if (!isPlayingRef.current || isGameOverRef.current) return;
    setIsPaused(prev => !prev);
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
        return;
      }

      if (!isPlayingRef.current || isPausedRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveRight();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          rotate();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          softDrop();
          break;
        case ' ':
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          holdCurrentPiece();
          break;
        case 'm':
        case 'M':
          setMuted(m => !m);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, rotate, softDrop, hardDrop, holdCurrentPiece, togglePause]);

  // Main Game Loop for Falling
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) return;

    // Speed increases with level (Level 1: 850ms, Level 10: 200ms)
    const dropSpeed = Math.max(160, 850 - (level - 1) * 70);

    const interval = setInterval(() => {
      if (currentPieceRef.current) {
        const piece = currentPieceRef.current;
        if (!checkCollision(piece.shape, piece.x, piece.y + 1, gridRef.current)) {
          setCurrentPiece({ ...piece, y: piece.y + 1 });
        } else {
          lockPiece(piece);
        }
      }
    }, dropSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isGameOver, level, checkCollision, lockPiece]);

  // Natural clock tick (advances 1 minute every 2.5 seconds)
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) return;

    const clockInterval = setInterval(() => {
      setClockMinutes(prev => {
        const next = prev + 1;
        if (next >= 23 * 60 + 59) {
          setDeadlinePassed(true);
        }
        return next;
      });
    }, 2500);

    return () => clearInterval(clockInterval);
  }, [isPlaying, isPaused, isGameOver]);

  // Render Main Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / COLS;

    // Clear board background
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = '#f0efed';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize, 0);
      ctx.lineTo(c * cellSize, height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize);
      ctx.lineTo(width, r * cellSize);
      ctx.stroke();
    }

    // Helper: draw single rounded task block
    const drawBlock = (
      col: number, 
      row: number, 
      task: TaskType, 
      isGhost = false, 
      isClearing = false
    ) => {
      const x = col * cellSize;
      const y = row * cellSize;
      const pad = 2;
      const bw = cellSize - pad * 2;
      const bh = cellSize - pad * 2;
      const radius = 6;

      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x + pad, y + pad, bw, bh, radius);
      } else {
        ctx.rect(x + pad, y + pad, bw, bh);
      }

      if (isClearing) {
        // Flash animation
        ctx.fillStyle = '#fef08a';
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isGhost) {
        // Ghost Piece: faint outline + transparent fill
        ctx.fillStyle = `${task.bg}40`;
        ctx.fill();
        ctx.strokeStyle = task.border;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Normal block
        ctx.fillStyle = task.bg;
        ctx.fill();
        ctx.strokeStyle = task.border;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Inner subtle shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(x + pad + 2, y + pad + 2, bw - 4, 3);

        // Icon + Short Label
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;

        ctx.font = `${Math.floor(cellSize * 0.44)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(task.icon, centerX, centerY - 4);

        // Tiny task name underneath
        ctx.font = `bold ${Math.floor(cellSize * 0.22)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = task.text;
        ctx.fillText(task.name, centerX, centerY + Math.floor(cellSize * 0.28));
      }
      ctx.restore();
    };

    // 1. Draw Grid Cells
    for (let r = 0; r < ROWS; r++) {
      const isRowClearing = clearingRows.includes(r);
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell) {
          drawBlock(c, r, cell.task, false, isRowClearing);
        }
      }
    }

    // 2. Draw Ghost Piece
    if (currentPiece && isPlaying && !isPaused) {
      const ghostY = getGhostY(currentPiece, grid);
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c] !== 0) {
            const boardY = ghostY + r;
            const boardX = currentPiece.x + c;
            if (boardY >= 0 && boardY < ROWS) {
              drawBlock(boardX, boardY, currentPiece.task, true);
            }
          }
        }
      }

      // 3. Draw Active Falling Piece
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c] !== 0) {
            const boardY = currentPiece.y + r;
            const boardX = currentPiece.x + c;
            if (boardY >= 0 && boardY < ROWS) {
              drawBlock(boardX, boardY, currentPiece.task, false);
            }
          }
        }
      }
    }
  }, [grid, currentPiece, isPlaying, isPaused, clearingRows, getGhostY]);

  // Render Mini Preview Canvas (Next or Hold)
  const drawMiniCanvas = (canvas: HTMLCanvasElement | null, piece: Piece | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!piece) return;

    const shape = piece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const cellSize = 18;
    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const startX = (canvas.width - totalW) / 2;
    const startY = (canvas.height - totalH) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] !== 0) {
          const x = startX + c * cellSize;
          const y = startY + r * cellSize;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
          } else {
            ctx.rect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          }
          ctx.fillStyle = piece.task.bg;
          ctx.fill();
          ctx.strokeStyle = piece.task.border;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(piece.task.icon, x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
  };

  useEffect(() => {
    drawMiniCanvas(nextCanvasRef.current, nextPiece);
  }, [nextPiece]);

  useEffect(() => {
    drawMiniCanvas(holdCanvasRef.current, holdPiece);
  }, [holdPiece]);

  // Deadline Urgency Stage
  const getDeadlineStatus = () => {
    if (clockMinutes >= 24 * 60) {
      return {
        badge: 'DEADLINE MISSED',
        sub: 'Tomorrow Me is weeping',
        color: 'bg-rose-50 text-rose-700 border-rose-300'
      };
    }
    if (clockMinutes >= 23 * 60) {
      return {
        badge: 'PANIC MODE • 11:59 PM',
        sub: 'Due in minutes! Adrenaline peak!',
        color: 'bg-red-50 text-red-700 border-red-300 animate-pulse'
      };
    }
    if (clockMinutes >= 18 * 60) {
      return {
        badge: 'URGENT • DUE TONIGHT',
        sub: 'Still got hours left, right?',
        color: 'bg-amber-50 text-amber-700 border-amber-300'
      };
    }
    if (clockMinutes >= 12 * 60) {
      return {
        badge: 'AFTERNOON • DUE TODAY',
        sub: 'I will definitely start at 6:00 PM',
        color: 'bg-sky-50 text-sky-700 border-sky-300'
      };
    }
    return {
      badge: 'MORNING • 9:00 AM',
      sub: 'D-Day: Just warming up with a game',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-300'
    };
  };

  const deadlineStatus = getDeadlineStatus();

  return (
    <div id="procrastination-app-root" className="min-h-screen bg-[#f7f6f2] text-stone-800 flex flex-col items-center justify-between p-2 sm:p-4 select-none font-sans">
      {/* Top Header Card */}
      <header id="game-header" className="w-full max-w-md flex flex-col gap-2 pt-1 pb-2">
        <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-stone-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="melting face">🫠</span>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 leading-tight">
                PROCRASTINATION TETRIS
              </h1>
              <p className="text-xs text-stone-500 font-medium">
                “Tomorrow Me can deal with it.”
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="sound-toggle-btn"
              onClick={() => setMuted(!muted)}
              className="p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
              aria-label="Toggle Sound"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              id="info-toggle-btn"
              onClick={() => setShowHowToPlay(prev => !prev)}
              className="p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
              title="How to Play"
              aria-label="How to Play"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Clock & Deadline Status Bar */}
        <div id="clock-status-bar" className="grid grid-cols-2 gap-2">
          {/* Virtual Time Progression */}
          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                Current Time
              </span>
              <span className="text-sm sm:text-base font-black text-stone-800 font-mono">
                {formatTime(clockMinutes)}
              </span>
            </div>
          </div>

          {/* Deadline Tracker */}
          <div className={`rounded-xl p-2.5 border shadow-2xs flex items-center gap-2 transition-all ${deadlineStatus.color}`}>
            <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wide truncate block">
                {deadlineStatus.badge}
              </span>
              <span className="text-xs font-medium truncate block opacity-90">
                {deadlineStatus.sub}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Centerpiece */}
      <main id="game-main-area" className="w-full max-w-md flex flex-col items-center relative my-1">
        {/* Floating Procrastination Toast Message */}
        {activeToast && (
          <div 
            id="procrastination-toast"
            className="absolute top-3 z-30 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-stone-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-stone-700/50 flex items-center gap-2.5 animate-bounce"
          >
            <span className="text-lg">💭</span>
            <p className="text-xs sm:text-sm font-semibold tracking-wide">
              {activeToast.message}
            </p>
          </div>
        )}

        {/* Board & Side Columns Layout */}
        <div className="flex items-start justify-center gap-1.5 sm:gap-3 w-full">
          {/* Left Column: HOLD & LEVEL */}
          <div className="flex flex-col gap-2 w-16 sm:w-20 shrink-0">
            {/* Hold Box */}
            <div className="bg-white rounded-2xl p-1.5 sm:p-2 border border-stone-200 shadow-2xs flex flex-col items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                HOLD
              </span>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-stone-50 rounded-xl border border-dashed border-stone-200 flex items-center justify-center overflow-hidden">
                <canvas ref={holdCanvasRef} width={56} height={56} className="w-full h-full" />
              </div>
              <span className="text-[8px] sm:text-[9px] text-stone-400 mt-1 font-mono">
                [ C ]
              </span>
            </div>

            {/* Level & Lines Box */}
            <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-stone-200 shadow-2xs flex flex-col items-center gap-1.5 sm:gap-2 text-center">
              <div>
                <span className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                  LEVEL
                </span>
                <span className="text-sm sm:text-base font-black text-stone-800">
                  {level}
                </span>
              </div>
              <div className="w-full h-px bg-stone-100" />
              <div>
                <span className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                  LINES
                </span>
                <span className="text-sm sm:text-base font-black text-stone-800">
                  {linesCleared}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Tetris Canvas Container */}
          <div className="relative bg-white p-1 sm:p-2 rounded-2xl border-2 border-stone-300 shadow-md shrink-0">
            <canvas
              ref={canvasRef}
              id="tetris-canvas"
              width={260}
              height={520}
              className="rounded-xl block bg-[#fafaf9] w-[210px] xs:w-[230px] sm:w-[260px] h-auto aspect-1/2"
            />

            {/* Start Screen Overlay */}
            {!hasStarted && (
              <div className="absolute inset-0 bg-white/95 rounded-xl z-20 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-5xl mb-3">🫠</span>
                <h2 className="text-xl font-black text-stone-900 mb-1">
                  PROCRASTINATION TETRIS
                </h2>
                <p className="text-xs text-stone-500 mb-6 max-w-56 leading-relaxed">
                  Every falling block is a task on your todo list. Clear lines and pretend you're being productive.
                </p>
                <button
                  id="start-game-btn"
                  onClick={startGame}
                  className="w-full py-3 px-6 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Play className="w-4 h-4 fill-white" />
                  START PROCRASTINATING
                </button>
              </div>
            )}

            {/* Pause Screen Overlay */}
            {isPaused && isPlaying && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-xl z-20 flex flex-col items-center justify-center p-4 text-center">
                <Pause className="w-10 h-10 text-stone-400 mb-2" />
                <h3 className="text-lg font-bold text-stone-800 mb-1">
                  Taking a "Quick Break"
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  Game paused. Real tasks are still waiting.
                </p>
                <button
                  id="resume-game-btn"
                  onClick={togglePause}
                  className="py-2.5 px-6 bg-stone-900 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-stone-800 cursor-pointer"
                >
                  RESUME GAME
                </button>
              </div>
            )}

            {/* Game Over Screen Overlay */}
            {isGameOver && (
              <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm rounded-xl z-20 flex flex-col items-center justify-center p-5 text-center text-white">
                <span className="text-4xl mb-2">🫠</span>
                <h2 className="text-xl font-black mb-1">
                  GAME OVER
                </h2>
                <p className="text-xs text-stone-300 font-medium italic mb-4 max-w-56 leading-snug">
                  “You didn't finish anything. But at least you got a high score.”
                </p>

                <div className="w-full bg-stone-800/80 rounded-xl p-3 border border-stone-700 mb-4 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between text-stone-300">
                    <span>Final Score:</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{score}</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Time Reached:</span>
                    <span className="font-bold font-mono">{formatTime(clockMinutes)}</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Lines Cleared:</span>
                    <span className="font-bold">{linesCleared}</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Tasks Deferred:</span>
                    <span className="font-bold text-emerald-400">~{tasksAvoided} items</span>
                  </div>
                </div>

                <button
                  id="play-again-btn"
                  onClick={startGame}
                  className="w-full py-3 bg-white text-stone-900 hover:bg-stone-100 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <RotateCcw className="w-4 h-4" />
                  PLAY AGAIN
                </button>
              </div>
            )}

            {/* Optional Success Ending Overlay */}
            {isVictory && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl z-20 flex flex-col items-center justify-center p-5 text-center">
                <span className="text-4xl mb-2">🎉</span>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 mb-1">
                  YOU ACTUALLY DID IT!
                </h2>
                <p className="text-xs text-stone-600 font-medium italic mb-4 max-w-56 leading-relaxed">
                  “Future You is proud of you.”
                </p>

                <div className="w-full bg-stone-50 rounded-xl p-3 border border-stone-200 mb-4 flex flex-col gap-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-bold text-stone-900 font-mono">{score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Finished at:</span>
                    <span className="font-bold text-emerald-600 font-mono">{formatTime(clockMinutes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tasks Cleared:</span>
                    <span className="font-bold text-stone-900">{linesCleared} lines</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => setIsVictory(false)}
                    className="w-full py-2.5 bg-stone-900 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-stone-800 cursor-pointer"
                  >
                    CONTINUE PROCRASTINATING
                  </button>
                  <button
                    onClick={startGame}
                    className="w-full py-2.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    START OVER
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: NEXT & SCORE */}
          <div className="flex flex-col gap-2 w-16 sm:w-20 shrink-0">
            {/* Next Piece Box */}
            <div className="bg-white rounded-2xl p-1.5 sm:p-2 border border-stone-200 shadow-2xs flex flex-col items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                NEXT
              </span>
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-stone-50 rounded-xl border border-dashed border-stone-200 flex items-center justify-center overflow-hidden">
                <canvas ref={nextCanvasRef} width={56} height={56} className="w-full h-full" />
              </div>
              <span className="text-[8px] sm:text-[9px] text-stone-500 mt-1 font-bold truncate max-w-16">
                {nextPiece?.task.name || 'TASK'}
              </span>
            </div>

            {/* Score Box */}
            <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-stone-200 shadow-2xs flex flex-col items-center text-center">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">
                SCORE
              </span>
              <span className="text-sm font-black text-amber-600 font-mono">
                {score}
              </span>
              <div className="w-full h-px bg-stone-100 my-1.5" />
              <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider block">
                BEST
              </span>
              <span className="text-xs font-bold text-stone-500 font-mono">
                {highScore}
              </span>
            </div>

            {/* Quick Pause Button */}
            <button
              id="quick-pause-btn"
              onClick={togglePause}
              disabled={!isPlaying || isGameOver}
              className="w-full py-2 bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-600 rounded-xl border border-stone-200 text-[10px] font-bold shadow-2xs cursor-pointer flex items-center justify-center gap-1"
            >
              {isPaused ? <Play className="w-3 h-3 fill-stone-600" /> : <Pause className="w-3 h-3" />}
              {isPaused ? 'RESUME' : 'PAUSE'}
            </button>
          </div>
        </div>
      </main>

      {/* Mobile & Touch Controls Bar */}
      <footer id="game-controls-deck" className="w-full max-w-md mt-1 mb-1">
        <div className="bg-white p-2 sm:p-3 rounded-2xl border border-stone-200 shadow-xs flex flex-col gap-2">
          {/* Action Row: Left, Rotate, Right, Soft Drop, Hard Drop */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {/* Move Left */}
            <button
              id="ctrl-left-btn"
              onClick={moveLeft}
              disabled={!isPlaying || isPaused}
              aria-label="Move Left"
              className="h-13 sm:h-14 bg-stone-100 active:bg-stone-300 disabled:opacity-40 text-stone-700 font-bold rounded-xl flex flex-col items-center justify-center shadow-2xs touch-manipulation cursor-pointer transition-transform active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-[9px] text-stone-400 mt-0.5">←</span>
            </button>

            {/* Rotate */}
            <button
              id="ctrl-rotate-btn"
              onClick={rotate}
              disabled={!isPlaying || isPaused}
              aria-label="Rotate Piece"
              className="h-13 sm:h-14 bg-stone-100 active:bg-stone-300 disabled:opacity-40 text-stone-700 font-bold rounded-xl flex flex-col items-center justify-center shadow-2xs touch-manipulation cursor-pointer transition-transform active:scale-95"
            >
              <RotateCw className="w-5 h-5 text-indigo-600" />
              <span className="text-[9px] text-indigo-500 font-bold mt-0.5">↻</span>
            </button>

            {/* Move Right */}
            <button
              id="ctrl-right-btn"
              onClick={moveRight}
              disabled={!isPlaying || isPaused}
              aria-label="Move Right"
              className="h-13 sm:h-14 bg-stone-100 active:bg-stone-300 disabled:opacity-40 text-stone-700 font-bold rounded-xl flex flex-col items-center justify-center shadow-2xs touch-manipulation cursor-pointer transition-transform active:scale-95"
            >
              <ArrowRight className="w-5 h-5" />
              <span className="text-[9px] text-stone-400 mt-0.5">→</span>
            </button>

            {/* Soft Drop */}
            <button
              id="ctrl-softdrop-btn"
              onClick={softDrop}
              disabled={!isPlaying || isPaused}
              aria-label="Soft Drop"
              className="h-13 sm:h-14 bg-stone-100 active:bg-stone-300 disabled:opacity-40 text-stone-700 font-bold rounded-xl flex flex-col items-center justify-center shadow-2xs touch-manipulation cursor-pointer transition-transform active:scale-95"
            >
              <ArrowDown className="w-5 h-5" />
              <span className="text-[9px] text-stone-400 mt-0.5">↓</span>
            </button>

            {/* Hard Drop */}
            <button
              id="ctrl-harddrop-btn"
              onClick={hardDrop}
              disabled={!isPlaying || isPaused}
              aria-label="Hard Drop"
              className="h-13 sm:h-14 bg-amber-500 active:bg-amber-600 disabled:opacity-40 text-white font-black rounded-xl flex flex-col items-center justify-center shadow-sm touch-manipulation cursor-pointer transition-transform active:scale-95"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span className="text-[9px] font-black tracking-wider mt-0.5">DROP</span>
            </button>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex items-center justify-between px-1 text-[11px] text-stone-400 font-medium">
            <span className="hidden sm:inline">
              Keyboard: <kbd className="bg-stone-100 px-1 py-0.5 rounded border border-stone-200 text-stone-600">Arrows</kbd> to move/rotate • <kbd className="bg-stone-100 px-1 py-0.5 rounded border border-stone-200 text-stone-600">Space</kbd> drop
            </span>
            <button
              onClick={holdCurrentPiece}
              disabled={!isPlaying || isPaused || !canHold}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ListTodo className="w-3.5 h-3.5" />
              Hold Piece (C)
            </button>
            <span className="text-[10px] text-stone-400">
              {deadlinePassed ? '⚠️ Deadline Passed' : '🔥 Due 11:59 PM'}
            </span>
          </div>
        </div>
      </footer>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div 
          id="how-to-play-modal"
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowHowToPlay(false)}
        >
          <div 
            className="bg-white max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-stone-200 text-stone-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🫠</span>
                <h3 className="font-bold text-base text-stone-900">
                  How to Procrastinate
                </h3>
              </div>
              <button 
                onClick={() => setShowHowToPlay(false)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed">
              <p>
                <strong>The Goal:</strong> Arrange falling task blocks (Study, Assignment, Clean, Reply, Taxes) into solid horizontal lines.
              </p>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100 space-y-1">
                <p><strong>Controls:</strong></p>
                <p>• <strong>← / →</strong> or <strong>A / D</strong>: Move Left / Right</p>
                <p>• <strong>↑</strong> or <strong>W</strong>: Rotate Block</p>
                <p>• <strong>↓</strong> or <strong>S</strong>: Soft Drop</p>
                <p>• <strong>Space</strong>: Instant Hard Drop</p>
                <p>• <strong>C / Shift</strong>: Hold / Stash Block</p>
                <p>• <strong>P / Esc</strong>: Pause Game</p>
              </div>
              <p>
                <strong>The Clock:</strong> Time starts at 9:00 AM and advances as you play. Your deadline is <strong>11:59 PM Tonight</strong>!
              </p>
              <p className="text-stone-500 italic">
                “There is no right answer to your todo list. But the blocks keep falling.”
              </p>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-4 w-full py-2.5 bg-stone-900 text-white rounded-xl font-bold text-xs hover:bg-stone-800 cursor-pointer"
            >
              GOT IT, LET'S PROCRASTINATE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
