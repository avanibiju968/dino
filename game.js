// Dino Runner Game Logic with Canvas & Web Audio API
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const overlayIcon = document.getElementById('overlay-icon');
const actionBtn = document.getElementById('action-btn');

// --- Web Audio Synthesizer (No external asset dependency) ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playJump() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'square';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_) {}
  }

  playScore() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (_) {}
  }

  playHit() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_) {}
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const sounds = new SoundManager();

// --- Game State & Constants ---
const GROUND_Y = 220;
let gameState = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER' | 'PAUSED'
let score = 0;
let highScore = parseInt(localStorage.getItem('dino_hi_score') || '0', 10);
let baseSpeed = 6;
let currentSpeed = 6;
let animationId = null;
let lastMilestone = 0;

// High Score init
function formatScore(n) {
  return Math.floor(n).toString().padStart(5, '0');
}
highScoreEl.textContent = formatScore(highScore);

// --- Entities ---
// Dino Player
const dino = {
  x: 60,
  y: GROUND_Y - 44,
  baseWidth: 42,
  baseHeight: 46,
  width: 42,
  height: 46,
  vy: 0,
  gravity: 0.72,
  jumpStrength: -12.5,
  isGrounded: true,
  isDucking: false,
  runFrame: 0,
  frameTimer: 0,

  reset() {
    this.y = GROUND_Y - 44;
    this.vy = 0;
    this.width = this.baseWidth;
    this.height = this.baseHeight;
    this.isGrounded = true;
    this.isDucking = false;
    this.runFrame = 0;
  },

  jump() {
    if (this.isGrounded) {
      this.vy = this.jumpStrength;
      this.isGrounded = false;
      sounds.playJump();
    }
  },

  duck(active) {
    if (active) {
      this.isDucking = true;
      this.height = 26;
      this.width = 54;
      if (!this.isGrounded) {
        this.vy += 1.8; // Quick dive downward
      } else {
        this.y = GROUND_Y - this.height;
      }
    } else {
      if (this.isDucking) {
        this.isDucking = false;
        this.width = this.baseWidth;
        this.height = this.baseHeight;
        this.y = GROUND_Y - this.height;
      }
    }
  },

  update() {
    if (!this.isGrounded) {
      this.vy += this.gravity;
      this.y += this.vy;
      if (this.y >= GROUND_Y - this.height) {
        this.y = GROUND_Y - this.height;
        this.vy = 0;
        this.isGrounded = true;
      }
    } else {
      this.y = GROUND_Y - this.height;
      this.frameTimer++;
      if (this.frameTimer > 6) {
        this.runFrame = (this.runFrame + 1) % 2;
        this.frameTimer = 0;
      }
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#38bdf8'; // Dino cyan neon

    const px = this.x;
    const py = this.y;

    if (!this.isDucking) {
      // Body
      ctx.fillRect(px + 12, py + 12, 22, 22);
      // Head & Snout
      ctx.fillRect(px + 22, py, 18, 14);
      ctx.fillRect(px + 36, py + 6, 6, 8);
      // Eye (dark cutout)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 26, py + 3, 3, 3);
      ctx.fillStyle = '#38bdf8';

      // Little Arms
      ctx.fillRect(px + 32, py + 18, 8, 3);
      ctx.fillRect(px + 37, py + 21, 3, 4);

      // Tail
      ctx.fillRect(px + 4, py + 18, 8, 10);
      ctx.fillRect(px, py + 22, 4, 6);

      // Legs / Running animation
      if (!this.isGrounded) {
        // Jumping legs
        ctx.fillRect(px + 14, py + 34, 4, 10);
        ctx.fillRect(px + 26, py + 34, 4, 8);
      } else if (this.runFrame === 0) {
        ctx.fillRect(px + 14, py + 34, 4, 12);
        ctx.fillRect(px + 14, py + 44, 7, 2);
        ctx.fillRect(px + 26, py + 34, 4, 6);
      } else {
        ctx.fillRect(px + 14, py + 34, 4, 6);
        ctx.fillRect(px + 26, py + 34, 4, 12);
        ctx.fillRect(px + 26, py + 44, 7, 2);
      }
    } else {
      // Ducking Dino
      ctx.fillRect(px + 10, py + 8, 30, 14);
      // Elongated Head
      ctx.fillRect(px + 36, py + 6, 16, 12);
      // Eye
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 42, py + 8, 3, 3);
      ctx.fillStyle = '#38bdf8';
      // Tail
      ctx.fillRect(px, py + 12, 10, 8);
      // Legs
      if (this.runFrame === 0) {
        ctx.fillRect(px + 16, py + 22, 4, 6);
      } else {
        ctx.fillRect(px + 28, py + 22, 4, 6);
      }
    }

    ctx.restore();
  }
};

// Obstacles (Cactus & Pterodactyl Birds)
let obstacles = [];
let nextSpawnDistance = 250;

class Cactus {
  constructor(x, type) {
    this.x = x;
    this.type = type; // 'small' | 'tall' | 'cluster'
    if (type === 'small') {
      this.width = 16;
      this.height = 34;
    } else if (type === 'tall') {
      this.width = 22;
      this.height = 48;
    } else {
      this.width = 38;
      this.height = 36;
    }
    this.y = GROUND_Y - this.height;
  }

  update(speed) {
    this.x -= speed;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#10b981'; // Neon emerald cactus

    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    // Main Stem
    ctx.fillRect(x + w * 0.35, y, w * 0.3, h);

    // Left Arm
    ctx.fillRect(x, y + h * 0.3, w * 0.35, 6);
    ctx.fillRect(x, y + h * 0.15, 6, h * 0.2);

    // Right Arm
    ctx.fillRect(x + w * 0.65, y + h * 0.45, w * 0.35, 6);
    ctx.fillRect(x + w - 6, y + h * 0.28, 6, h * 0.2);

    ctx.restore();
  }
}

class Bird {
  constructor(x, heightLevel) {
    this.x = x;
    this.width = 38;
    this.height = 24;
    // Level 0: low (duck under), Level 1: mid (jump over), Level 2: high (idle under)
    if (heightLevel === 0) {
      this.y = GROUND_Y - 32; // Forces duck
    } else {
      this.y = GROUND_Y - 60; // Can jump or stay under
    }
    this.wingFrame = 0;
    this.frameTimer = 0;
  }

  update(speed) {
    this.x -= speed * 1.15; // Slightly faster than ground objects
    this.frameTimer++;
    if (this.frameTimer > 8) {
      this.wingFrame = (this.wingFrame + 1) % 2;
      this.frameTimer = 0;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#f59e0b'; // Amber Pterodactyl

    const x = this.x;
    const y = this.y;

    // Body & Beak
    ctx.fillRect(x + 10, y + 8, 20, 8);
    ctx.fillRect(x + 2, y + 10, 8, 4); // Beak
    // Eye
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 8, y + 9, 2, 2);
    ctx.fillStyle = '#f59e0b';

    // Wings
    if (this.wingFrame === 0) {
      // Wings Up
      ctx.fillRect(x + 14, y, 6, 9);
      ctx.fillRect(x + 18, y + 2, 8, 6);
    } else {
      // Wings Down
      ctx.fillRect(x + 14, y + 15, 6, 8);
      ctx.fillRect(x + 18, y + 13, 8, 5);
    }

    ctx.restore();
  }
}

// Background Clouds & Ground particles
let clouds = [
  { x: 120, y: 50, speed: 0.6 },
  { x: 420, y: 75, speed: 0.4 },
  { x: 700, y: 40, speed: 0.7 }
];

let groundOffset = 0;
let stars = Array.from({ length: 30 }, () => ({
  x: Math.random() * 800,
  y: Math.random() * 160,
  radius: Math.random() * 1.3,
  alpha: Math.random() * 0.7 + 0.3
}));

// Floating particles on jump or hit
let particles = [];
function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.7) * 5,
      life: 25,
      maxLife: 25,
      color
    });
  }
}

// --- Spawn Manager ---
function spawnObstacles() {
  const lastObs = obstacles[obstacles.length - 1];
  const lastX = lastObs ? lastObs.x : 0;

  if (lastX < 800 - nextSpawnDistance) {
    const isBird = score > 150 && Math.random() < 0.32;
    if (isBird) {
      const heightType = Math.random() < 0.5 ? 0 : 1;
      obstacles.push(new Bird(850, heightType));
    } else {
      const cactusTypes = ['small', 'tall', 'cluster'];
      const pick = cactusTypes[Math.floor(Math.random() * cactusTypes.length)];
      obstacles.push(new Cactus(850, pick));
    }
    // Randomize next gap
    nextSpawnDistance = 240 + Math.random() * 260 + (600 / currentSpeed);
  }
}

// --- Collision Detection (AABB with tolerance) ---
function checkCollision(player, obs) {
  const paddingX = 8;
  const paddingY = 6;

  return (
    player.x + paddingX < obs.x + obs.width - paddingX &&
    player.x + player.width - paddingX > obs.x + paddingX &&
    player.y + paddingY < obs.y + obs.height &&
    player.y + player.height > obs.y + paddingY
  );
}

// --- Drawing Environment ---
function drawSky() {
  // Star twinkle
  ctx.save();
  stars.forEach(s => {
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.fillRect(s.x, s.y, s.radius * 2, s.radius * 2);
  });

  // Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
    ctx.arc(c.x + 15, c.y - 6, 18, 0, Math.PI * 2);
    ctx.arc(c.x + 32, c.y, 14, 0, Math.PI * 2);
    ctx.fill();

    if (gameState === 'PLAYING') {
      c.x -= c.speed;
      if (c.x < -60) c.x = 840;
    }
  });
  ctx.restore();
}

function drawGround() {
  ctx.save();
  // Ground Horizon Line
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(800, GROUND_Y);
  ctx.stroke();

  // Textured dashes on ground
  ctx.fillStyle = '#64748b';
  groundOffset = (groundOffset + currentSpeed) % 40;
  for (let x = -groundOffset; x < 800; x += 35) {
    ctx.fillRect(x, GROUND_Y + 7, 14, 2);
    ctx.fillRect(x + 18, GROUND_Y + 16, 8, 2);
  }
  ctx.restore();
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(p.x, p.y, 4, 4);
    ctx.globalAlpha = 1.0;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// --- Main Game Loop ---
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();
  drawGround();

  if (gameState === 'PLAYING') {
    // Score & Speed scaling
    score += 0.15;
    scoreEl.textContent = formatScore(score);

    // Milestones beep every 100 points
    if (Math.floor(score / 100) > lastMilestone) {
      lastMilestone = Math.floor(score / 100);
      sounds.playScore();
    }

    // Gradual difficulty acceleration
    currentSpeed = baseSpeed + Math.min(10, Math.floor(score / 150) * 0.8);

    // Obstacles
    spawnObstacles();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.update(currentSpeed);
      obs.draw(ctx);

      // Check collision
      if (checkCollision(dino, obs)) {
        gameOver();
        break;
      }

      // Cleanup passed obstacles
      if (obs.x + obs.width < -50) {
        obstacles.splice(i, 1);
      }
    }

    dino.update();
  } else if (gameState === 'GAMEOVER' || gameState === 'START' || gameState === 'PAUSED') {
    // Still render obstacles
    obstacles.forEach(obs => obs.draw(ctx));
  }

  dino.draw(ctx);
  updateAndDrawParticles();

  animationId = requestAnimationFrame(gameLoop);
}

// --- Game Control Actions ---
function startGame() {
  sounds.init();
  gameState = 'PLAYING';
  score = 0;
  lastMilestone = 0;
  currentSpeed = baseSpeed;
  obstacles = [];
  particles = [];
  dino.reset();
  overlay.classList.add('hidden');
}

function gameOver() {
  gameState = 'GAMEOVER';
  sounds.playHit();
  createParticles(dino.x + 20, dino.y + 20, '#ef4444', 20);

  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('dino_hi_score', highScore);
    highScoreEl.textContent = formatScore(highScore);
  }

  overlayIcon.textContent = '💥';
  overlayTitle.textContent = 'GAME OVER';
  overlayMsg.textContent = `Score: ${Math.floor(score)} — Press Space or Click to Retry`;
  actionBtn.textContent = 'PLAY AGAIN';
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    overlayIcon.textContent = '⏸️';
    overlayTitle.textContent = 'GAME PAUSED';
    overlayMsg.textContent = 'Press P or Click Resume';
    actionBtn.textContent = 'RESUME';
    overlay.classList.remove('hidden');
  } else if (gameState === 'PAUSED') {
    gameState = 'PLAYING';
    overlay.classList.add('hidden');
  }
}

// --- Event Listeners ---
actionBtn.addEventListener('click', () => {
  if (gameState === 'START' || gameState === 'GAMEOVER') {
    startGame();
  } else if (gameState === 'PAUSED') {
    togglePause();
  }
});

// Key Inputs
window.addEventListener('keydown', (e) => {
  sounds.init();
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (gameState === 'START' || gameState === 'GAMEOVER') {
      startGame();
    } else if (gameState === 'PLAYING') {
      dino.jump();
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (gameState === 'PLAYING') {
      dino.duck(true);
    }
  } else if (e.code === 'KeyP') {
    e.preventDefault();
    togglePause();
  } else if (e.code === 'KeyM') {
    e.preventDefault();
    const isMuted = sounds.toggleMute();
    console.log(isMuted ? 'Muted' : 'Unmuted');
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    dino.duck(false);
  }
});

// Touch / Mouse controls on Canvas
canvas.addEventListener('pointerdown', (e) => {
  sounds.init();
  if (gameState === 'START' || gameState === 'GAMEOVER') {
    startGame();
  } else if (gameState === 'PLAYING') {
    // If tap is in lower third of canvas, trigger duck, else jump
    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    if (clickY > rect.height * 0.75) {
      dino.duck(true);
      setTimeout(() => dino.duck(false), 450);
    } else {
      dino.jump();
    }
  }
});

// Initial kick-off
requestAnimationFrame(gameLoop);
