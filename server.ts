import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import esbuild from "esbuild";

interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: string;
}

interface Profile {
  userId: string;
  bio: string;
  avatarUrl: string;
  location: string;
  dateOfBirth: string;
  website: string;
}

interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  active: boolean;
  code?: string; // Original TSX code
  js?: string;   // Compiled JS code
}

interface Score {
  id: string;
  userId: string;
  gameId: string;
  scoreValue: number;
  createdAt: string;
}

interface Session {
  id: string;
  userId: string;
  gameId: string;
  startTime: string;
  endTime?: string;
  active: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  requiredScore: number;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

// Database JSON File Path
const DB_FILE = path.join(process.cwd(), "db.json");

// Default initial data seeds
const INITIAL_USERS: User[] = [
  { id: "user-1", username: "john_doe", email: "john@example.com", password: "12345", role: "USER" },
  { id: "user-2", username: "pixel_warrior", email: "pixel@example.com", password: "12345", role: "USER" },
  { id: "user-admin", username: "admin", email: "admin@example.com", password: "admin", role: "ADMIN" }
];

const INITIAL_PROFILES: Profile[] = [
  { userId: "user-1", bio: "Retro gaming enthusiast. High scores are meant to be broken!", avatarUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80", location: "New York", dateOfBirth: "2000-01-01", website: "https://myblog.com" },
  { userId: "user-2", bio: "Casual gamer who loves high-speed clickers and snake speedruns.", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80", location: "Los Angeles", dateOfBirth: "1999-05-15", website: "https://pixelwarriors.dev" },
  { userId: "user-admin", bio: "CurioPlay administrator. Here to maintain high standards.", avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80", location: "San Francisco", dateOfBirth: "1990-10-10", website: "https://curioplay.com" }
];

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: "ach-1", title: "CurioPlay Recruit", description: "Submit your very first score in any game.", requiredScore: 1 },
  { id: "ach-2", title: "Century Club", description: "Reach a score of 100 or more in any game.", requiredScore: 100 },
  { id: "ach-3", title: "Grandmaster", description: "Reach a score of 500 or more in any game.", requiredScore: 500 },
  { id: "ach-4", title: "Legendary Clicker", description: "Score over 1000 in Clicker or any dynamic game.", requiredScore: 1000 }
];

// Preseeded simple games TSX
const SNAKE_GAME_TSX = `import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trophy } from "lucide-react";

export default function SnakeGame({ onScoreSubmit }) {
  const [gridSize] = useState(20);
  const [snake, setSnake] = useState([[10, 10], [10, 11]]);
  const [food, setFood] = useState([5, 5]);
  const [dir, setDir] = useState([0, -1]); // Up
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(150);
  const gameLoopRef = useRef(null);

  // Generate random food position not on snake
  const generateFood = (currSnake) => {
    let newFood;
    while (true) {
      newFood = [
        Math.floor(Math.random() * gridSize),
        Math.floor(Math.random() * gridSize)
      ];
      if (!currSnake.some(cell => cell[0] === newFood[0] && cell[1] === newFood[1])) {
        break;
      }
    }
    return newFood;
  };

  const resetGame = () => {
    setSnake([[10, 10], [10, 11]]);
    setDir([0, -1]);
    setIsGameOver(false);
    setScore(0);
    setFood([5, 5]);
    setIsPlaying(false);
  };

  const handleKeyDown = (e) => {
    if (!isPlaying) return;
    switch (e.key) {
      case "ArrowUp":
        if (dir[1] !== 1) setDir([0, -1]);
        break;
      case "ArrowDown":
        if (dir[1] !== -1) setDir([0, 1]);
        break;
      case "ArrowLeft":
        if (dir[0] !== 1) setDir([-1, 0]);
        break;
      case "ArrowRight":
        if (dir[0] !== -1) setDir([1, 0]);
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dir, isPlaying]);

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    gameLoopRef.current = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = [head[0] + dir[0], head[1] + dir[1]];

        // Wall collision
        if (newHead[0] < 0 || newHead[0] >= gridSize || newHead[1] < 0 || newHead[1] >= gridSize) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(cell => cell[0] === newHead[0] && cell[1] === newHead[1])) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food consumption
        if (newHead[0] === food[0] && newHead[1] === food[1]) {
          const nextScore = score + 10;
          setScore(nextScore);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, isGameOver, dir, food, score, speed]);

  const triggerSubmit = () => {
    if (onScoreSubmit) {
      onScoreSubmit(score);
    }
  };

  return (
    <div className="flex flex-col items-center bg-gray-950 text-white p-6 rounded-2xl max-w-xl mx-auto border border-purple-500/20 shadow-2xl">
      <div className="flex justify-between w-full items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">SNAKE ARCADE</h2>
          <p className="text-xs text-gray-400 font-mono">Score: <span className="text-purple-400 text-sm font-bold">{score}</span></p>
        </div>
        <div className="flex gap-2">
          {!isPlaying && !isGameOver ? (
            <button onClick={() => setIsPlaying(true)} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition">
              <Play className="w-4 h-4" /> Play
            </button>
          ) : isPlaying ? (
            <button onClick={() => setIsPlaying(false)} className="bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition">
              Pause
            </button>
          ) : null}
          <button onClick={resetGame} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm transition">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="relative w-[320px] h-[320px] bg-gray-900 border-2 border-purple-900 rounded-lg overflow-hidden grid grid-cols-20 grid-rows-20">
        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
          const x = i % gridSize;
          const y = Math.floor(i / gridSize);
          const isSnake = snake.some(cell => cell[0] === x && cell[1] === y);
          const isHead = snake[0] && snake[0][0] === x && snake[0][1] === y;
          const isFoodCell = food[0] === x && food[1] === y;

          return (
            <div
              key={i}
              className={\`w-4 h-4 border-[0.5px] border-gray-950/20 \${
                isHead ? "bg-purple-500 rounded-sm" :
                isSnake ? "bg-purple-600/80" :
                isFoodCell ? "bg-red-500 animate-pulse rounded-full" : "bg-gray-900"
              }\`}
            />
          );
        })}

        {isGameOver && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-red-500 text-3xl font-extrabold tracking-wider mb-2">GAME OVER</p>
            <p className="text-gray-300 text-sm mb-4">Final score: <span className="text-white font-bold">{score}</span></p>
            <div className="flex gap-3">
              <button onClick={triggerSubmit} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg font-semibold text-sm shadow-lg hover:brightness-110 transition">
                <Trophy className="w-4 h-4" /> Submit Score
              </button>
              <button onClick={resetGame} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition">
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="mt-6 flex flex-col items-center gap-2 md:hidden">
        <button onClick={() => handleKeyDown({ key: "ArrowUp" })} className="p-3 bg-gray-800 rounded-xl hover:bg-purple-950"><ArrowUp className="w-5 h-5 text-purple-400" /></button>
        <div className="flex gap-8">
          <button onClick={() => handleKeyDown({ key: "ArrowLeft" })} className="p-3 bg-gray-800 rounded-xl hover:bg-purple-950"><ArrowLeft className="w-5 h-5 text-purple-400" /></button>
          <button onClick={() => handleKeyDown({ key: "ArrowRight" })} className="p-3 bg-gray-800 rounded-xl hover:bg-purple-950"><ArrowRight className="w-5 h-5 text-purple-400" /></button>
        </div>
        <button onClick={() => handleKeyDown({ key: "ArrowDown" })} className="p-3 bg-gray-800 rounded-xl hover:bg-purple-950"><ArrowDown className="w-5 h-5 text-purple-400" /></button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[10px] text-gray-500 font-mono">Use Arrow Keys to Navigate. Catch Red Food!</p>
      </div>
    </div>
  );
}`;

const CLICKER_GAME_TSX = `import React, { useState, useEffect } from "react";
import { Zap, Play, RotateCcw, Award, Star } from "lucide-react";

export default function ClickerGame({ onScoreSubmit }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const handleClick = () => {
    if (!isPlaying && !isFinished) {
      setIsPlaying(true);
    }
    if (isFinished) return;
    
    const clickScore = 1 + Math.floor(combo / 10);
    setScore(prev => prev + clickScore);
    setCombo(prev => prev + 1);
  };

  const handleReset = () => {
    setScore(0);
    setTimeLeft(15);
    setIsPlaying(false);
    setIsFinished(false);
    setCombo(0);
  };

  return (
    <div className="flex flex-col items-center bg-gray-950 text-white p-6 rounded-2xl max-w-xl mx-auto border border-amber-500/20 shadow-2xl">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent uppercase flex items-center justify-center gap-1.5">
          <Zap className="w-6 h-6 text-amber-400 animate-bounce" /> Hyper Clicker
        </h2>
        <p className="text-xs text-gray-400 font-mono mt-1">Tap as fast as you can before time expires!</p>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full mb-6">
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">Time Left</span>
          <span className={\`text-xl font-bold font-mono \${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-amber-400"}\`}>{timeLeft}s</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">Score</span>
          <span className="text-xl font-black text-white font-mono">{score}</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">Combo</span>
          <span className="text-xl font-bold text-orange-400 font-mono">{combo}x</span>
        </div>
      </div>

      {/* Main Clicking Circle */}
      <div className="relative mb-6">
        <button
          onClick={handleClick}
          disabled={isFinished}
          className={\`w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-75 transform active:scale-90 shadow-2xl focus:outline-none \${
            isFinished ? "bg-gray-900 border-gray-800 cursor-not-allowed" :
            isPlaying ? "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300 hover:brightness-110 cursor-pointer" :
            "bg-gradient-to-br from-gray-800 to-gray-900 border-amber-500/40 hover:border-amber-400 cursor-pointer"
          }\`}
        >
          {isFinished ? (
            <Award className="w-16 h-16 text-gray-600" />
          ) : isPlaying ? (
            <>
              <span className="text-4xl font-extrabold tracking-wider animate-pulse font-mono">TAP!</span>
              <span className="text-xs opacity-80 mt-1 font-mono">Combo +{Math.floor(combo / 10) + 1}</span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold uppercase tracking-wider">Start Tapping</span>
              <span className="text-[10px] text-gray-400 mt-1">15 Second Rush</span>
            </>
          )}
        </button>

        {combo > 0 && isPlaying && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-full rotate-12 flex items-center gap-0.5 shadow">
            <Star className="w-3 h-3 fill-black" /> POP!
          </div>
        )}
      </div>

      {isFinished ? (
        <div className="bg-gray-900/80 p-4 border border-amber-500/30 rounded-xl w-full text-center flex flex-col items-center mb-4 animate-fade-in">
          <p className="text-amber-400 text-lg font-bold uppercase">Time's Up!</p>
          <p className="text-xs text-gray-400 mt-1">Outstanding effort! Let's register your legendary status.</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => onScoreSubmit?.(score)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold px-6 py-2 rounded-lg text-sm hover:brightness-110 transition shadow-lg shadow-orange-500/20"
            >
              Submit Score
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition"
            >
              Play Again
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 justify-center w-full">
          <button onClick={handleReset} className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 px-4 py-2 rounded-xl text-xs font-mono transition">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Board
          </button>
        </div>
      )}
    </div>
  );
}`;

const PONG_GAME_TSX = `import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Trophy } from "lucide-react";

export default function PongGame({ onScoreSubmit }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Game state held in refs for the loop speed and avoiding React state lag
  const ball = useRef({ x: 150, y: 100, dx: 2, dy: 1.5, radius: 6 });
  const paddle = useRef({ x: 110, y: 185, width: 80, height: 10, speed: 15 });
  const width = 300;
  const height = 200;

  const draw = (ctx) => {
    // Clear canvas
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, width, height);

    // Grid lines accent
    ctx.strokeStyle = "rgba(139, 92, 246, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff007f";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff007f";
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw paddle
    ctx.fillStyle = "#8b5cf6";
    ctx.fillRect(paddle.current.x, paddle.current.y, paddle.current.width, paddle.current.height);
  };

  const update = () => {
    if (!isPlaying || isGameOver) return;

    // Move ball
    ball.current.x += ball.current.dx;
    ball.current.y += ball.current.dy;

    // Wall bounce X
    if (ball.current.x - ball.current.radius <= 0 || ball.current.x + ball.current.radius >= width) {
      ball.current.dx = -ball.current.dx;
    }

    // Top wall bounce
    if (ball.current.y - ball.current.radius <= 0) {
      ball.current.dy = -ball.current.dy;
    }

    // Paddle collision
    if (
      ball.current.y + ball.current.radius >= paddle.current.y &&
      ball.current.x >= paddle.current.x &&
      ball.current.x <= paddle.current.x + paddle.current.width
    ) {
      ball.current.dy = -Math.abs(ball.current.dy) * 1.05; // speed up slightly
      ball.current.dx *= 1.05;
      setScore(s => s + 10);
    }

    // Bottom out (Game over)
    if (ball.current.y - ball.current.radius > height) {
      setIsGameOver(true);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      update();
      draw(ctx);
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, isGameOver]);

  const handleKeyDown = (e) => {
    if (!isPlaying) return;
    if (e.key === "ArrowLeft") {
      paddle.current.x = Math.max(0, paddle.current.x - paddle.current.speed);
    } else if (e.key === "ArrowRight") {
      paddle.current.x = Math.min(width - paddle.current.width, paddle.current.x + paddle.current.speed);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  const handleTouch = (dir) => {
    if (!isPlaying) return;
    if (dir === "left") {
      paddle.current.x = Math.max(0, paddle.current.x - paddle.current.speed * 1.5);
    } else {
      paddle.current.x = Math.min(width - paddle.current.width, paddle.current.x + paddle.current.speed * 1.5);
    }
  };

  const start = () => {
    ball.current = { x: 150, y: 50, dx: 2, dy: 2, radius: 6 };
    paddle.current = { x: 110, y: 185, width: 80, height: 10, speed: 20 };
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col items-center bg-gray-950 text-white p-6 rounded-2xl max-w-xl mx-auto border border-pink-500/20 shadow-2xl">
      <div className="flex justify-between w-full items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">RETRO PONG</h2>
          <p className="text-xs text-gray-400 font-mono">Score: <span className="text-pink-500 text-sm font-bold">{score}</span></p>
        </div>
        <div className="flex gap-2">
          {!isPlaying && !isGameOver ? (
            <button onClick={start} className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition">
              Play Game
            </button>
          ) : isPlaying ? (
            <button onClick={() => setIsPlaying(false)} className="bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition">
              Pause
            </button>
          ) : null}
          <button onClick={start} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm transition">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-pink-500/40 rounded-lg bg-gray-950 block shadow-inner"
        />

        {isGameOver && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 rounded-lg">
            <p className="text-pink-500 text-2xl font-extrabold tracking-wider mb-2">BALL DROPPED!</p>
            <p className="text-gray-300 text-xs mb-4">Final score: <span className="text-white font-bold font-mono">{score}</span></p>
            <div className="flex gap-3">
              <button onClick={() => onScoreSubmit?.(score)} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-lg font-bold text-xs shadow-lg hover:brightness-110 transition">
                <Trophy className="w-4 h-4" /> Submit Score
              </button>
              <button onClick={start} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-xs transition">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch Controllers */}
      <div className="mt-4 flex gap-8 w-full justify-center">
        <button onClick={() => handleTouch("left")} className="px-6 py-3 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-xl font-bold font-mono text-xs select-none">
          ◀ LEFT
        </button>
        <button onClick={() => handleTouch("right")} className="px-6 py-3 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-xl font-bold font-mono text-xs select-none">
          RIGHT ▶
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[10px] text-gray-500 font-mono">Move Paddle left or right to keep the neon ball alive!</p>
      </div>
    </div>
  );
}`;

const INITIAL_GAMES: Game[] = [
  { id: "game-snake", title: "Snake Arcade", description: "The definitive arcade serpent classic. Grow longer, dodge boundaries, eat apples.", category: "Arcade", thumbnail: "https://images.unsplash.com/photo-1628277613967-6abca504d0ac?w=400&auto=format&fit=crop&q=80", active: true, code: SNAKE_GAME_TSX },
  { id: "game-clicker", title: "Hyper Clicker", description: "Test your lightning-fast reaction speed! 15 seconds. Pure focus. Click to win.", category: "Casual", thumbnail: "https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?w=400&auto=format&fit=crop&q=80", active: true, code: CLICKER_GAME_TSX },
  { id: "game-pong", title: "Retro Pong", description: "A high-octane 2D bounce back. Use your paddle, accelerate the core ball, and crush limits.", category: "Arcade", thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80", active: true, code: PONG_GAME_TSX }
];

// In-Memory Database Manager
class Database {
  users: User[] = [];
  profiles: Profile[] = [];
  games: Game[] = [];
  scores: Score[] = [];
  sessions: Session[] = [];
  achievements: Achievement[] = [];
  userAchievements: UserAchievement[] = [];

  constructor() {
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        this.users = data.users || [];
        this.profiles = data.profiles || [];
        this.games = data.games || [];
        this.scores = data.scores || [];
        this.sessions = data.sessions || [];
        this.achievements = data.achievements || [];
        this.userAchievements = data.userAchievements || [];

        // Pre-compile initial/seeded games if they don't have JS yet
        let updated = false;
        for (const game of this.games) {
          if (game.code && !game.js) {
            try {
              const res = esbuild.transformSync(game.code, {
                loader: "tsx",
                jsx: "automatic",
                format: "cjs",
                target: "es2020",
              });
              game.js = res.code;
              updated = true;
            } catch (e) {
              console.error(`Failed to compile ${game.title}:`, e);
            }
          }
        }
        if (updated) this.save();

      } else {
        this.bootstrap();
      }
    } catch (e) {
      console.error("Database loading error, bootstrapping new db", e);
      this.bootstrap();
    }
  }

  bootstrap() {
    this.users = [...INITIAL_USERS];
    this.profiles = [...INITIAL_PROFILES];
    this.achievements = [...INITIAL_ACHIEVEMENTS];
    
    // Seed and compile preloaded games
    this.games = INITIAL_GAMES.map(game => {
      try {
        const res = esbuild.transformSync(game.code || "", {
          loader: "tsx",
          jsx: "automatic",
          format: "cjs",
          target: "es2020",
        });
        return { ...game, js: res.code };
      } catch (e) {
        console.error("Seed compilation failed:", e);
        return game;
      }
    });

    // Seed some score history forjohn_doe
    this.scores = [
      { id: "score-1", userId: "user-1", gameId: "game-snake", scoreValue: 120, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: "score-2", userId: "user-1", gameId: "game-clicker", scoreValue: 450, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: "score-3", userId: "user-2", gameId: "game-pong", scoreValue: 210, createdAt: new Date(Date.now() - 3600000 * 3).toISOString() }
    ];

    // Seed some user achievements
    this.userAchievements = [
      { id: "ua-1", userId: "user-1", achievementId: "ach-1", unlockedAt: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: "ua-2", userId: "user-1", achievementId: "ach-2", unlockedAt: new Date(Date.now() - 3600000 * 2).toISOString() }
    ];

    // Seed some game sessions
    this.sessions = [
      { id: "sess-1", userId: "user-1", gameId: "game-snake", startTime: new Date(Date.now() - 3600000 * 2 - 300).toISOString(), endTime: new Date(Date.now() - 3600000 * 2).toISOString(), active: false },
      { id: "sess-2", userId: "user-1", gameId: "game-clicker", startTime: new Date(Date.now() - 3600000 - 15).toISOString(), endTime: new Date(Date.now() - 3600000).toISOString(), active: false }
    ];

    this.save();
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({
        users: this.users,
        profiles: this.profiles,
        games: this.games,
        scores: this.scores,
        sessions: this.sessions,
        achievements: this.achievements,
        userAchievements: this.userAchievements
      }, null, 2));
    } catch (e) {
      console.error("Database save error:", e);
    }
  }
}

const db = new Database();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // --- AUTH ENDPOINTS ---
  app.post("/auth/register", (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }
    const exists = db.users.find(u => u.username === username || u.email === email);
    if (exists) {
      return res.status(400).json({ error: "Username or Email already registered." });
    }
    const newUser: User = {
      id: "user-" + Math.random().toString(36).substring(2, 11),
      username,
      email,
      password,
      role: role || "USER"
    };
    db.users.push(newUser);
    
    // Auto-create blank profile for new user
    db.profiles.push({
      userId: newUser.id,
      bio: "Joined CurioPlay!",
      avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
      location: "",
      dateOfBirth: "",
      website: ""
    });

    db.save();
    res.status(201).json(newUser);
  });

  app.post("/auth/login", (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Username or email and password are required." });
    }
    const user = db.users.find(u => u.username === identifier || u.email === identifier);
    if (!user) {
      return res.status(404).json({ error: "Account not found. Please check your username or email address." });
    }
    if (user.password !== password) {
      return res.status(400).json({ error: "Incorrect password. Please try again." });
    }
    res.json(user);
  });

  app.get("/auth/user", (req, res) => {
    const { identifier } = req.query;
    if (!identifier) {
      return res.status(400).json({ error: "Identifier parameter is required." });
    }
    const user = db.users.find(u => u.username === identifier || u.email === identifier);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    // Don't expose password
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- USERS ENDPOINTS ---
  app.get("/api/users", (req, res) => {
    res.json(db.users.map(({ password, ...u }) => u));
  });

  app.get("/api/users/:userId", (req, res) => {
    const user = db.users.find(u => u.id === req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.put("/api/users/:userId", (req, res) => {
    const userIndex = db.users.findIndex(u => u.id === req.params.userId);
    if (userIndex === -1) return res.status(404).json({ error: "User not found." });
    const { username, email, password, role } = req.body;
    
    db.users[userIndex] = {
      ...db.users[userIndex],
      ...(username && { username }),
      ...(email && { email }),
      ...(password && { password }),
      ...(role && { role })
    };
    db.save();
    const { password: _, ...safeUser } = db.users[userIndex];
    res.json(safeUser);
  });

  app.delete("/api/users/:userId", (req, res) => {
    const userIndex = db.users.findIndex(u => u.id === req.params.userId);
    if (userIndex === -1) return res.status(404).json({ error: "User not found." });
    
    db.users.splice(userIndex, 1);
    // Cascade delete profile, scores, sessions, userAchievements
    db.profiles = db.profiles.filter(p => p.userId !== req.params.userId);
    db.scores = db.scores.filter(s => s.userId !== req.params.userId);
    db.sessions = db.sessions.filter(s => s.userId !== req.params.userId);
    db.userAchievements = db.userAchievements.filter(ua => ua.userId !== req.params.userId);
    
    db.save();
    res.status(204).send();
  });

  // --- PROFILES ENDPOINTS ---
  app.get("/api/profiles/:userId", (req, res) => {
    const profile = db.profiles.find(p => p.userId === req.params.userId);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    res.json(profile);
  });

  app.post("/api/profiles", (req, res) => {
    const { userId, bio, avatarUrl, location, dateOfBirth, website } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required." });
    
    const exists = db.profiles.find(p => p.userId === userId);
    if (exists) return res.status(400).json({ error: "Profile already exists." });

    const newProfile: Profile = {
      userId,
      bio: bio || "",
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}`,
      location: location || "",
      dateOfBirth: dateOfBirth || "",
      website: website || ""
    };
    db.profiles.push(newProfile);
    db.save();
    res.status(201).json(newProfile);
  });

  app.put("/api/profiles/:userId", (req, res) => {
    const profileIndex = db.profiles.findIndex(p => p.userId === req.params.userId);
    if (profileIndex === -1) return res.status(404).json({ error: "Profile not found." });
    
    const { bio, avatarUrl, location, dateOfBirth, website } = req.body;
    db.profiles[profileIndex] = {
      ...db.profiles[profileIndex],
      ...(bio !== undefined && { bio }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(location !== undefined && { location }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
      ...(website !== undefined && { website })
    };
    db.save();
    res.json(db.profiles[profileIndex]);
  });

  app.delete("/api/profiles/:userId", (req, res) => {
    const profileIndex = db.profiles.findIndex(p => p.userId === req.params.userId);
    if (profileIndex === -1) return res.status(404).json({ error: "Profile not found." });
    db.profiles.splice(profileIndex, 1);
    db.save();
    res.json({ message: "Profile deleted successfully." });
  });

  // --- GAMES ENDPOINTS & SPECIAL TSX COMPILE ---
  app.post("/api/games/compile", async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "TSX code is required." });
    try {
      const result = await esbuild.transform(code, {
        loader: "tsx",
        jsx: "automatic",
        format: "cjs",
        target: "es2020",
      });
      res.json({ js: result.code });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "TSX Compilation error" });
    }
  });

  app.get("/api/games", (req, res) => {
    res.json(db.games);
  });

  app.get("/api/games/active", (req, res) => {
    res.json(db.games.filter(g => g.active));
  });

  app.get("/api/games/:gameId", (req, res) => {
    const game = db.games.find(g => g.id === req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found." });
    res.json(game);
  });

  app.post("/api/games", async (req, res) => {
    const { title, description, category, thumbnail, active, code } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: "Title and Category are required." });
    }
    
    let jsCode = "";
    if (code) {
      try {
        const transpileRes = await esbuild.transform(code, {
          loader: "tsx",
          jsx: "automatic",
          format: "cjs",
          target: "es2020",
        });
        jsCode = transpileRes.code;
      } catch (err: any) {
        return res.status(400).json({ error: `TSX compilation failed: ${err.message}` });
      }
    }

    const newGame: Game = {
      id: "game-" + Math.random().toString(36).substring(2, 11),
      title,
      description: description || "Custom User Game",
      category,
      thumbnail: thumbnail || "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&auto=format&fit=crop&q=80",
      active: active !== undefined ? active : true,
      code,
      js: jsCode
    };

    db.games.push(newGame);
    db.save();
    res.status(201).json(newGame);
  });

  app.put("/api/games/:gameId", async (req, res) => {
    const gameIndex = db.games.findIndex(g => g.id === req.params.gameId);
    if (gameIndex === -1) return res.status(404).json({ error: "Game not found." });
    
    const { title, description, category, thumbnail, active, code } = req.body;
    
    let jsCode = db.games[gameIndex].js;
    if (code && code !== db.games[gameIndex].code) {
      try {
        const transpileRes = await esbuild.transform(code, {
          loader: "tsx",
          jsx: "automatic",
          format: "cjs",
          target: "es2020",
        });
        jsCode = transpileRes.code;
      } catch (err: any) {
        return res.status(400).json({ error: `TSX compilation failed: ${err.message}` });
      }
    }

    db.games[gameIndex] = {
      ...db.games[gameIndex],
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(thumbnail !== undefined && { thumbnail }),
      ...(active !== undefined && { active }),
      ...(code !== undefined && { code }),
      js: jsCode
    };

    db.save();
    res.json(db.games[gameIndex]);
  });

  app.delete("/api/games/:gameId", (req, res) => {
    const gameIndex = db.games.findIndex(g => g.id === req.params.gameId);
    if (gameIndex === -1) return res.status(404).json({ error: "Game not found." });
    
    db.games.splice(gameIndex, 1);
    // Cascade delete scores and sessions
    db.scores = db.scores.filter(s => s.gameId !== req.params.gameId);
    db.sessions = db.sessions.filter(s => s.gameId !== req.params.gameId);
    
    db.save();
    res.json({ message: "Game deleted successfully." });
  });

  // --- SCORES ENDPOINTS & AUTO-ACHIEVEMENT REWARDING ---
  app.post("/api/scores", (req, res) => {
    const { userId, gameId, scoreValue } = req.body;
    if (!userId || !gameId || scoreValue === undefined) {
      return res.status(400).json({ error: "userId, gameId, and scoreValue are required." });
    }

    const val = Number(scoreValue);
    const newScore: Score = {
      id: "score-" + Math.random().toString(36).substring(2, 11),
      userId,
      gameId,
      scoreValue: val,
      createdAt: new Date().toISOString()
    };

    db.scores.push(newScore);

    // Auto-unlock achievements based on this new high score!
    const newlyUnlocked: Achievement[] = [];
    const unlockedIds = db.userAchievements
      .filter(ua => ua.userId === userId)
      .map(ua => ua.achievementId);

    const eligibleAchievements = db.achievements.filter(
      ach => val >= ach.requiredScore && !unlockedIds.includes(ach.id)
    );

    for (const ach of eligibleAchievements) {
      const ua: UserAchievement = {
        id: "ua-" + Math.random().toString(36).substring(2, 11),
        userId,
        achievementId: ach.id,
        unlockedAt: new Date().toISOString()
      };
      db.userAchievements.push(ua);
      newlyUnlocked.push(ach);
    }

    db.save();
    res.status(201).json({ score: newScore, newlyUnlocked });
  });

  app.get("/api/scores/game/:gameId", (req, res) => {
    const scores = db.scores
      .filter(s => s.gameId === req.params.gameId)
      .sort((a, b) => b.scoreValue - a.scoreValue);
    res.json(scores);
  });

  app.get("/api/scores/user/:userId", (req, res) => {
    const scores = db.scores.filter(s => s.userId === req.params.userId);
    res.json(scores);
  });

  app.get("/api/scores/leaderboard/:gameId", (req, res) => {
    const gameScores = db.scores.filter(s => s.gameId === req.params.gameId);
    
    // Group by user to get only their highest score for the leaderboard
    const userBest: Record<string, Score> = {};
    for (const score of gameScores) {
      if (!userBest[score.userId] || score.scoreValue > userBest[score.userId].scoreValue) {
        userBest[score.userId] = score;
      }
    }

    const leaderboard = Object.values(userBest)
      .map(score => {
        const user = db.users.find(u => u.id === score.userId);
        return {
          id: score.id,
          userId: score.userId,
          username: user ? user.username : "Unknown Player",
          scoreValue: score.scoreValue,
          createdAt: score.createdAt
        };
      })
      .sort((a, b) => b.scoreValue - a.scoreValue)
      .slice(0, 10);

    res.json(leaderboard);
  });

  app.get("/api/scores/personal-best", (req, res) => {
    const { userId, gameId } = req.query;
    if (!userId || !gameId) {
      return res.status(400).json({ error: "userId and gameId parameters are required." });
    }

    const personalScores = db.scores.filter(s => s.userId === userId && s.gameId === gameId);
    if (personalScores.length === 0) {
      return res.json(null);
    }

    const best = personalScores.sort((a, b) => b.scoreValue - a.scoreValue)[0];
    res.json(best);
  });

  // --- GAME SESSIONS ENDPOINTS ---
  app.post("/api/sessions/start", (req, res) => {
    const { userId, gameId } = req.query;
    if (!userId || !gameId) {
      return res.status(400).json({ error: "userId and gameId parameters are required." });
    }

    // Force-end any current active sessions for this user to keep data neat
    db.sessions.forEach(s => {
      if (s.userId === userId && s.active) {
        s.active = false;
        s.endTime = new Date().toISOString();
      }
    });

    const newSession: Session = {
      id: "sess-" + Math.random().toString(36).substring(2, 11),
      userId: userId as string,
      gameId: gameId as string,
      startTime: new Date().toISOString(),
      active: true
    };

    db.sessions.push(newSession);
    db.save();
    res.status(201).json(newSession);
  });

  app.put("/api/sessions/end/:sessionId", (req, res) => {
    const session = db.sessions.find(s => s.id === req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found." });

    session.active = false;
    session.endTime = new Date().toISOString();
    db.save();
    res.json(session);
  });

  app.get("/api/sessions/user/:userId", (req, res) => {
    res.json(db.sessions.filter(s => s.userId === req.params.userId));
  });

  app.get("/api/sessions/game/:gameId", (req, res) => {
    res.json(db.sessions.filter(s => s.gameId === req.params.gameId));
  });

  app.get("/api/sessions/active/user/:userId", (req, res) => {
    const active = db.sessions.filter(s => s.userId === req.params.userId && s.active);
    res.json(active);
  });

  app.get("/api/sessions/total-time/user/:userId", (req, res) => {
    const userSessions = db.sessions.filter(s => s.userId === req.params.userId);
    let totalSeconds = 0;
    
    for (const s of userSessions) {
      const start = new Date(s.startTime).getTime();
      const end = s.endTime ? new Date(s.endTime).getTime() : Date.now();
      totalSeconds += Math.max(0, Math.floor((end - start) / 1000));
    }

    res.json({ totalPlayTimeSeconds: totalSeconds });
  });

  app.get("/api/sessions/dau", (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date parameter is required." });

    const targetDate = new Date(date as string).toDateString();
    const activeUsers = new Set<string>();

    db.sessions.forEach(s => {
      const sessDate = new Date(s.startTime).toDateString();
      if (sessDate === targetDate) {
        activeUsers.add(s.userId);
      }
    });

    res.json({ date: date as string, dailyActiveUsersCount: activeUsers.size });
  });

  app.get("/api/sessions/count/user/:userId", (req, res) => {
    const count = db.sessions.filter(s => s.userId === req.params.userId).length;
    res.json({ sessionCount: count });
  });

  // --- ACHIEVEMENTS ENDPOINTS ---
  app.get("/api/achievements", (req, res) => {
    res.json(db.achievements);
  });

  app.get("/api/achievements/:achievementId", (req, res) => {
    const ach = db.achievements.find(a => a.id === req.params.achievementId);
    if (!ach) return res.status(404).json({ error: "Achievement not found." });
    res.json(ach);
  });

  app.post("/api/achievements", (req, res) => {
    const { title, description, requiredScore } = req.body;
    if (!title || requiredScore === undefined) {
      return res.status(400).json({ error: "Title and requiredScore are required." });
    }

    const newAch: Achievement = {
      id: "ach-" + Math.random().toString(36).substring(2, 11),
      title,
      description: description || "",
      requiredScore: Number(requiredScore)
    };

    db.achievements.push(newAch);
    db.save();
    res.status(201).json(newAch);
  });

  app.put("/api/achievements/:achievementId", (req, res) => {
    const index = db.achievements.findIndex(a => a.id === req.params.achievementId);
    if (index === -1) return res.status(404).json({ error: "Achievement not found." });

    const { title, description, requiredScore } = req.body;
    db.achievements[index] = {
      ...db.achievements[index],
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(requiredScore !== undefined && { requiredScore: Number(requiredScore) })
    };

    db.save();
    res.json(db.achievements[index]);
  });

  app.delete("/api/achievements/:achievementId", (req, res) => {
    const index = db.achievements.findIndex(a => a.id === req.params.achievementId);
    if (index === -1) return res.status(404).json({ error: "Achievement not found." });

    db.achievements.splice(index, 1);
    db.userAchievements = db.userAchievements.filter(ua => ua.achievementId !== req.params.achievementId);
    
    db.save();
    res.json({ message: "Achievement deleted successfully." });
  });

  // --- USER ACHIEVEMENTS ENDPOINTS ---
  app.post("/api/user-achievements/unlock", (req, res) => {
    const { userId, achievementId } = req.query;
    if (!userId || !achievementId) {
      return res.status(400).json({ error: "userId and achievementId parameters are required." });
    }

    const alreadyUnlocked = db.userAchievements.find(
      ua => ua.userId === userId && ua.achievementId === achievementId
    );
    if (alreadyUnlocked) {
      return res.status(400).json({ error: "Achievement already unlocked for this user." });
    }

    const newUA: UserAchievement = {
      id: "ua-" + Math.random().toString(36).substring(2, 11),
      userId: userId as string,
      achievementId: achievementId as string,
      unlockedAt: new Date().toISOString()
    };

    db.userAchievements.push(newUA);
    db.save();
    res.status(201).json(newUA);
  });

  app.get("/api/user-achievements/user/:userId", (req, res) => {
    const uas = db.userAchievements.filter(ua => ua.userId === req.params.userId);
    const detailed = uas.map(ua => {
      const ach = db.achievements.find(a => a.id === ua.achievementId);
      return {
        ...ua,
        achievement: ach || null
      };
    });
    res.json(detailed);
  });

  app.get("/api/user-achievements/achievement/:achievementId", (req, res) => {
    const uas = db.userAchievements.filter(ua => ua.achievementId === req.params.achievementId);
    const detailed = uas.map(ua => {
      const user = db.users.find(u => u.id === ua.userId);
      return {
        ...ua,
        username: user ? user.username : "Unknown User"
      };
    });
    res.json(detailed);
  });

  app.get("/api/user-achievements/count/user/:userId", (req, res) => {
    const count = db.userAchievements.filter(ua => ua.userId === req.params.userId).length;
    res.json({ achievementCount: count });
  });

  app.post("/api/user-achievements/check", (req, res) => {
    const { userId, score } = req.query;
    if (!userId || !score) {
      return res.status(400).json({ error: "userId and score parameters are required." });
    }

    const val = Number(score);
    const newlyUnlocked: Achievement[] = [];
    const unlockedIds = db.userAchievements
      .filter(ua => ua.userId === userId)
      .map(ua => ua.achievementId);

    const eligibleAchievements = db.achievements.filter(
      ach => val >= ach.requiredScore && !unlockedIds.includes(ach.id)
    );

    for (const ach of eligibleAchievements) {
      const ua: UserAchievement = {
        id: "ua-" + Math.random().toString(36).substring(2, 11),
        userId: userId as string,
        achievementId: ach.id,
        unlockedAt: new Date().toISOString()
      };
      db.userAchievements.push(ua);
      newlyUnlocked.push(ach);
    }

    if (newlyUnlocked.length > 0) {
      db.save();
    }

    res.json({ newlyUnlocked });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
