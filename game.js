/**
 * NEON DASH — Cyber Prism Endless 2D Platformer
 * Features 3D Prism character resting flat on its 3 sides (never on vertices),
 * Minimalist arcade start (Press Space to Start), and single continuous distance scoring.
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. CONSTANTS & CONFIGURATION
     ========================================================================== */
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;
  const FLOOR_HEIGHT = 130;
  const GROUND_Y = CANVAS_HEIGHT - FLOOR_HEIGHT; // 590px
  const PLAYER_SIZE = 50;

  // Physics tuning matching Geometry Dash precision
  const GRAVITY = 1980; // px/s²
  const JUMP_VELOCITY = -655; // px/s
  const PAD_BOOST_VELOCITY = -870; // px/s
  const RING_BOOST_VELOCITY = -750; // px/s

  // Rotates 360° per standard jump, snapping cleanly in 120° increments (3 flat sides)
  const ROTATION_SPEED = 544;

  // Continuous run speeds
  const BASE_SPEED = 360;
  const MAX_SPEED = 540;

  // Game States
  const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    DEAD: 'DEAD'
  };

  /* ==========================================================================
     2. AUDIO SYNTHESIS SYSTEM (Procedural Cyberpunk Synthwave)
     ========================================================================== */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.isPlayingMusic = false;
      this.stepTimer = null;
      this.currentStep = 0;
      this.tempo = 136;
      this.volumes = {
        master: 0.8,
        music: 0.7,
        sfx: 0.85
      };
    }

    init() {
      if (this.ctx) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.volumes.music, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      } catch (e) {
        console.warn('Web Audio API not supported:', e);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    setVolumes(master, music, sfx) {
      this.volumes.master = master;
      this.volumes.music = music;
      this.volumes.sfx = sfx;
      if (this.ctx) {
        const t = this.ctx.currentTime;
        if (this.masterGain) this.masterGain.gain.setValueAtTime(master, t);
        if (this.musicGain) this.musicGain.gain.setValueAtTime(music, t);
        if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, t);
      }
    }

    playJump() {
      if (!this.ctx || this.volumes.sfx <= 0) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(760, t + 0.12);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.14);
    }

    playPad() {
      if (!this.ctx || this.volumes.sfx <= 0) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(1150, t + 0.15);

      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.17);
    }

    playCrash() {
      if (!this.ctx || this.volumes.sfx <= 0) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.32);

      oscGain.gain.setValueAtTime(0.45, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(180, t + 0.28);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.55, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(t);
      noise.stop(t + 0.32);
    }

    playCheckpoint() {
      if (!this.ctx || this.volumes.sfx <= 0) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, t);
      osc.frequency.setValueAtTime(1380, t + 0.08);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.2);
    }

    playClick() {
      if (!this.ctx || this.volumes.sfx <= 0) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.05);
    }

    startMusic() {
      this.init();
      this.resume();
      this.stopMusic();

      this.isPlayingMusic = true;
      this.currentStep = 0;
      this.tempo = 136;
      const stepDurationMs = (60 / this.tempo / 4) * 1000;

      this.stepTimer = setInterval(() => {
        if (!this.isPlayingMusic) return;
        this.stepMusicTick();
        this.currentStep = (this.currentStep + 1) % 32;
      }, stepDurationMs);
    }

    stepMusicTick() {
      if (!this.ctx || this.volumes.music <= 0) return;
      const t = this.ctx.currentTime;
      const step = this.currentStep;

      // 1. Kick Drum
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(36, t + 0.08);

        kickGain.gain.setValueAtTime(0.4, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.12);
      }

      // 2. Snare
      if (step % 8 === 4) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(250, t);
        snareOsc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

        snareGain.gain.setValueAtTime(0.24, t);
        snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        snareOsc.connect(snareGain);
        snareGain.connect(this.musicGain);
        snareOsc.start(t);
        snareOsc.stop(t + 0.1);
      }

      // 3. Hi-Hat
      if (step % 2 === 1) {
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(4800, t);

        hatGain.gain.setValueAtTime(0.05, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        hatOsc.connect(hatGain);
        hatGain.connect(this.musicGain);
        hatOsc.start(t);
        hatOsc.stop(t + 0.04);
      }

      // 4. Synthwave Bass (D Minor Matrix Theme)
      const rootFreq = 146.83;
      const bassPatterns = [0, 0, 0, 0, 5, 5, 3, 3, 0, 0, 0, 0, 7, 7, 5, 5];
      const pitchOffset = bassPatterns[Math.floor(step / 2) % bassPatterns.length];
      const baseFreq = rootFreq * Math.pow(2, pitchOffset / 12);

      if (step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const bassGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(baseFreq * 0.5, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);

        bassGain.gain.setValueAtTime(0.26, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        bassOsc.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(this.musicGain);

        bassOsc.start(t);
        bassOsc.stop(t + 0.15);
      }

      // 5. Arpeggio Lead
      const arpIntervals = [0, 7, 12, 15, 12, 7, 19, 12];
      const arpNote = arpIntervals[step % arpIntervals.length];
      const leadFreq = baseFreq * Math.pow(2, arpNote / 12);

      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'triangle';
      leadOsc.frequency.setValueAtTime(leadFreq, t);

      leadGain.gain.setValueAtTime(0.14, t);
      leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      leadOsc.connect(leadGain);
      leadGain.connect(this.musicGain);

      leadOsc.start(t);
      leadOsc.stop(t + 0.09);
    }

    stopMusic() {
      this.isPlayingMusic = false;
      if (this.stepTimer) {
        clearInterval(this.stepTimer);
        this.stepTimer = null;
      }
    }
  }

  /* ==========================================================================
     3. PARTICLE & VISUAL EFFECTS ENGINE (NEON GREEN PRISM SHARDS)
     ========================================================================== */
  class ParticleEngine {
    constructor() {
      this.particles = [];
      this.trails = [];
      this.quality = 'high';
    }

    setQuality(q) {
      this.quality = q;
    }

    addPrismTrail(x, y, rotation) {
      if (this.quality === 'low') return;
      this.trails.push({
        x,
        y,
        rotation,
        alpha: 0.45,
        decay: this.quality === 'high' ? 0.05 : 0.09
      });
    }

    addJumpDust(x, y) {
      const count = this.quality === 'high' ? 12 : 6;
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 1.6;
        const speed = 70 + Math.random() * 150;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.4,
          size: 3 + Math.random() * 4,
          color: '#39FF14',
          alpha: 1,
          decay: 2.2 + Math.random() * 1.5
        });
      }
    }

    addPrismExplosion(x, y) {
      const count = this.quality === 'high' ? 50 : 25;
      const shardColors = ['#39FF14', '#00FF66', '#00E676', '#E2FF00', '#FFFFFF'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 450;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 120,
          gravity: 720,
          isShard: true,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 15,
          size: 5 + Math.random() * 8,
          color: shardColors[Math.floor(Math.random() * shardColors.length)],
          alpha: 1,
          decay: 1.1 + Math.random() * 1.1
        });
      }
    }

    update(dt) {
      for (let i = this.trails.length - 1; i >= 0; i--) {
        const tr = this.trails[i];
        tr.alpha -= tr.decay;
        if (tr.alpha <= 0) {
          this.trails.splice(i, 1);
        }
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) {
          p.vy += p.gravity * dt;
        }
        if (p.rotation !== undefined) {
          p.rotation += p.rotSpeed * dt;
        }
        p.alpha -= p.decay * dt;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(ctx, cameraX) {
      for (let tr of this.trails) {
        ctx.save();
        ctx.translate(tr.x - cameraX, tr.y);
        ctx.rotate((tr.rotation * Math.PI) / 180);
        ctx.globalAlpha = tr.alpha * 0.4;
        draw3DPrismVector(ctx, 0, 0, PLAYER_SIZE, true);
        ctx.restore();
      }

      for (let p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (this.quality === 'high') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
        }

        ctx.translate(p.x - cameraX, p.y);
        if (p.isShard) {
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.8, p.size * 0.6);
          ctx.lineTo(-p.size * 0.8, p.size * 0.6);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    clear() {
      this.particles = [];
      this.trails = [];
    }
  }

  /* ==========================================================================
     4. 3D PRISM CHARACTER RENDERING (FLAT BASE ON 3 SIDES, NEVER ON POINTS)
     ========================================================================== */
  /**
   * Draws the 3D Prism Logo.
   * Constructed with exact 3-fold symmetry so at 0°, 120°, 240°, 360°
   * the prism rests perfectly flat on one of its three sides!
   */
  function draw3DPrismVector(ctx, centerX, centerY, size, isTrail) {
    ctx.save();
    ctx.translate(centerX, centerY);

    // Exact equilateral prism geometry (R = 32, r = 16, halfBase = 27.7)
    // Centroid is at (0, 0), and all 3 sides are exactly r = 16px from center.
    // At 0°, 120°, 240°, one side is always perfectly horizontal at y = +16px!
    const R = 32;
    const r = 16;
    const halfBase = 27.7;

    const topV = { x: 0, y: -R };
    const leftV = { x: -halfBase, y: r };
    const rightV = { x: halfBase, y: r };

    // Central 3D vertex (where the 3 visible faces converge)
    const centerV = { x: 0, y: 3 };

    if (!isTrail) {
      ctx.shadowColor = '#00FF66';
      ctx.shadowBlur = 15;
    }

    // 1. Facet Left: Deep emerald shaded gradient
    const gradLeft = ctx.createLinearGradient(topV.x, topV.y, leftV.x, leftV.y);
    gradLeft.addColorStop(0, '#008A2E');
    gradLeft.addColorStop(1, '#004D1A');
    ctx.fillStyle = gradLeft;
    ctx.beginPath();
    ctx.moveTo(topV.x, topV.y);
    ctx.lineTo(centerV.x, centerV.y);
    ctx.lineTo(leftV.x, leftV.y);
    ctx.closePath();
    ctx.fill();

    // 2. Facet Right: Radiant electric neon lime highlight
    const gradRight = ctx.createLinearGradient(topV.x, topV.y, rightV.x, rightV.y);
    gradRight.addColorStop(0, '#39FF14');
    gradRight.addColorStop(0.5, '#00FF66');
    gradRight.addColorStop(1, '#00B83A');
    ctx.fillStyle = gradRight;
    ctx.beginPath();
    ctx.moveTo(topV.x, topV.y);
    ctx.lineTo(rightV.x, rightV.y);
    ctx.lineTo(centerV.x, centerV.y);
    ctx.closePath();
    ctx.fill();

    // 3. Facet Bottom (FLAT BASE SIDE): Deep cyber forest green
    const gradBottom = ctx.createLinearGradient(leftV.x, leftV.y, rightV.x, rightV.y);
    gradBottom.addColorStop(0, '#004717');
    gradBottom.addColorStop(1, '#00210A');
    ctx.fillStyle = gradBottom;
    ctx.beginPath();
    ctx.moveTo(leftV.x, leftV.y);
    ctx.lineTo(centerV.x, centerV.y);
    ctx.lineTo(rightV.x, rightV.y);
    ctx.closePath();
    ctx.fill();

    // Crisp neon bevel ridge lines
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#39FF14';

    // Center ridge line
    ctx.beginPath();
    ctx.moveTo(topV.x, topV.y);
    ctx.lineTo(centerV.x, centerV.y);
    ctx.stroke();

    // Left ridge line
    ctx.beginPath();
    ctx.moveTo(centerV.x, centerV.y);
    ctx.lineTo(leftV.x, leftV.y);
    ctx.stroke();

    // Right ridge line
    ctx.beginPath();
    ctx.moveTo(centerV.x, centerV.y);
    ctx.lineTo(rightV.x, rightV.y);
    ctx.stroke();

    // Outer silhouette outline
    ctx.strokeStyle = '#00FF66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topV.x, topV.y);
    ctx.lineTo(rightV.x, rightV.y);
    ctx.lineTo(leftV.x, leftV.y);
    ctx.closePath();
    ctx.stroke();

    // Glowing apex spark
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(topV.x, topV.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ==========================================================================
     5. MAIN GAME CONTROLLER & ENDLESS RUNNER LOGIC
     ========================================================================== */
  class NeonDashGame {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');

      this.audio = new SoundEngine();
      this.particles = new ParticleEngine();

      this.state = STATE.MENU;
      this.mode = 'normal';
      this.attempts = 1;
      this.totalAttempts = 1;

      this.distance = 0;
      this.bestDistance = 0;
      this.newRecordTriggered = false;

      this.checkpoints = [];

      this.logoImg = new Image();
      this.logoImg.src = 'assets/logo.png';

      // Player geometry: center point aligned so base rests flush on GROUND_Y
      // PLAYER_SIZE = 50. Incenter is at r = 16px above base.
      this.player = {
        x: 180,
        y: GROUND_Y - PLAYER_SIZE,
        prevX: 180,
        prevY: GROUND_Y - PLAYER_SIZE,
        vy: 0,
        rotation: 0, // Starts at 0°: rests perfectly flat on its bottom side!
        onGround: true,
        isJumping: false,
        alive: true
      };

      this.input = {
        jumpHeld: false,
        jumpBufferTimer: 0
      };

      this.cameraX = 0;
      this.obstacles = [];
      this.gameSpeed = BASE_SPEED;
      this.generationCursorX = 750;

      this.shakeDuration = 0;
      this.shakeIntensity = 0;

      this.settings = {
        masterVol: 0.8,
        musicVol: 0.7,
        sfxVol: 0.85,
        quality: 'high',
        screenShake: true,
        cubeTrail: true
      };

      this.lastTime = 0;
      this.respawnTimer = 0;

      this.loadStorage();
      this.setupDOM();
      this.bindEvents();
      this.resetProceduralWorld();

      requestAnimationFrame(this.gameLoop.bind(this));
    }

    loadStorage() {
      try {
        const savedBest = localStorage.getItem('neon_prism_best_distance');
        if (savedBest) {
          this.bestDistance = parseInt(savedBest, 10) || 0;
        }

        const savedAttempts = localStorage.getItem('neon_prism_total_attempts');
        if (savedAttempts) {
          this.totalAttempts = parseInt(savedAttempts, 10) || 1;
          this.attempts = this.totalAttempts;
        }

        const savedSettings = localStorage.getItem('neon_dash_settings');
        if (savedSettings) {
          this.settings = Object.assign(this.settings, JSON.parse(savedSettings));
        }
      } catch (e) {
        this.bestDistance = 0;
        this.totalAttempts = 1;
      }

      this.audio.setVolumes(this.settings.masterVol, this.settings.musicVol, this.settings.sfxVol);
      this.particles.setQuality(this.settings.quality);
    }

    saveStorage() {
      try {
        localStorage.setItem('neon_prism_best_distance', this.bestDistance.toString());
        localStorage.setItem('neon_prism_total_attempts', this.totalAttempts.toString());
        localStorage.setItem('neon_dash_settings', JSON.stringify(this.settings));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }

    setupDOM() {
      this.menuScreen = document.getElementById('menu-screen');
      this.hudOverlay = document.getElementById('hud-overlay');
      this.pauseModal = document.getElementById('pause-modal');
      this.settingsModal = document.getElementById('settings-modal');
      this.instructionsModal = document.getElementById('instructions-modal');
      this.crashToast = document.getElementById('crash-toast');

      this.hudAttemptCounter = document.getElementById('hud-attempt-counter');
      this.hudDistanceVal = document.getElementById('hud-distance-val');
      this.hudBestVal = document.getElementById('hud-best-val');
      this.hudSpeedVal = document.getElementById('hud-speed-val');
      this.newRecordBadge = document.getElementById('new-record-badge');
      this.practiceTools = document.getElementById('practice-tools');

      document.getElementById('menu-best-distance').textContent = `${this.bestDistance} m`;

      document.getElementById('setting-master-vol').value = Math.round(this.settings.masterVol * 100);
      document.getElementById('setting-music-vol').value = Math.round(this.settings.musicVol * 100);
      document.getElementById('setting-sfx-vol').value = Math.round(this.settings.sfxVol * 100);
      document.getElementById('val-master-vol').textContent = `${Math.round(this.settings.masterVol * 100)}%`;
      document.getElementById('val-music-vol').textContent = `${Math.round(this.settings.musicVol * 100)}%`;
      document.getElementById('val-sfx-vol').textContent = `${Math.round(this.settings.sfxVol * 100)}%`;
      document.getElementById('setting-quality').value = this.settings.quality;
      document.getElementById('setting-shake').checked = this.settings.screenShake;
      document.getElementById('setting-trail').checked = this.settings.cubeTrail;
    }

    bindEvents() {
      const unlockAudio = () => {
        this.audio.init();
        this.audio.resume();
      };

      // Space / Key controls
      window.addEventListener('keydown', (e) => {
        unlockAudio();
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
          if (this.state === STATE.MENU) {
            this.startRun();
          } else if (this.state === STATE.PLAYING) {
            this.input.jumpHeld = true;
            this.input.jumpBufferTimer = 0.12;
          } else if (this.state === STATE.DEAD && this.respawnTimer > 0.25) {
            this.respawn();
          }
          e.preventDefault();
        } else if (e.code === 'Escape') {
          if (this.state === STATE.PLAYING) {
            this.pauseGame();
          } else if (this.state === STATE.PAUSED) {
            this.resumeGame();
          }
        } else if (e.code === 'KeyZ' && this.mode === 'practice' && this.state === STATE.PLAYING) {
          this.placeCheckpoint();
        } else if (e.code === 'KeyX' && this.mode === 'practice' && this.state === STATE.PLAYING) {
          this.removeCheckpoint();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
          this.input.jumpHeld = false;
        }
      });

      // Pointer / Click / Tap to start or jump
      const container = document.getElementById('game-container');
      const handlePointerDown = (e) => {
        unlockAudio();
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;

        if (this.state === STATE.MENU) {
          this.startRun();
        } else if (this.state === STATE.PLAYING) {
          this.input.jumpHeld = true;
          this.input.jumpBufferTimer = 0.12;
        } else if (this.state === STATE.DEAD && this.respawnTimer > 0.25) {
          this.respawn();
        }
      };

      const handlePointerUp = () => {
        this.input.jumpHeld = false;
      };

      container.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('touchend', handlePointerUp);

      // Start Prompt Click
      const startArea = document.getElementById('start-click-area');
      if (startArea) {
        startArea.addEventListener('click', () => {
          unlockAudio();
          this.startRun();
        });
      }

      // Pause controls
      document.getElementById('btn-pause').addEventListener('click', () => {
        unlockAudio();
        this.audio.playClick();
        this.pauseGame();
      });

      document.getElementById('btn-resume').addEventListener('click', () => {
        unlockAudio();
        this.audio.playClick();
        this.resumeGame();
      });

      document.getElementById('btn-pause-restart').addEventListener('click', () => {
        unlockAudio();
        this.audio.playClick();
        this.resumeGame();
        this.restartRun();
      });

      document.getElementById('btn-pause-settings').addEventListener('click', () => {
        unlockAudio();
        this.audio.playClick();
        this.settingsModal.classList.remove('hud-hidden');
      });

      document.getElementById('btn-pause-menu').addEventListener('click', () => {
        unlockAudio();
        this.audio.playClick();
        this.returnToMenu();
      });

      // Modals
      const btnOpenSettings = document.getElementById('btn-open-settings');
      if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', () => {
          unlockAudio();
          this.audio.playClick();
          this.settingsModal.classList.remove('hud-hidden');
        });
      }

      document.getElementById('btn-close-settings').addEventListener('click', () => {
        unlockAudio();
        this.audio.playClick();
        this.settingsModal.classList.add('hud-hidden');
        this.saveStorage();
      });

      document.getElementById('setting-master-vol').addEventListener('input', (e) => {
        this.settings.masterVol = e.target.value / 100;
        document.getElementById('val-master-vol').textContent = `${e.target.value}%`;
        this.audio.setVolumes(this.settings.masterVol, this.settings.musicVol, this.settings.sfxVol);
      });

      document.getElementById('setting-music-vol').addEventListener('input', (e) => {
        this.settings.musicVol = e.target.value / 100;
        document.getElementById('val-music-vol').textContent = `${e.target.value}%`;
        this.audio.setVolumes(this.settings.masterVol, this.settings.musicVol, this.settings.sfxVol);
      });

      document.getElementById('setting-sfx-vol').addEventListener('input', (e) => {
        this.settings.sfxVol = e.target.value / 100;
        document.getElementById('val-sfx-vol').textContent = `${e.target.value}%`;
        this.audio.setVolumes(this.settings.masterVol, this.settings.musicVol, this.settings.sfxVol);
      });

      document.getElementById('setting-quality').addEventListener('change', (e) => {
        this.settings.quality = e.target.value;
        this.particles.setQuality(this.settings.quality);
      });

      document.getElementById('setting-shake').addEventListener('change', (e) => {
        this.settings.screenShake = e.target.checked;
      });

      document.getElementById('setting-trail').addEventListener('change', (e) => {
        this.settings.cubeTrail = e.target.checked;
      });

      const btnOpenInstructions = document.getElementById('btn-open-instructions');
      if (btnOpenInstructions) {
        btnOpenInstructions.addEventListener('click', () => {
          unlockAudio();
          this.audio.playClick();
          this.instructionsModal.classList.remove('hud-hidden');
        });
      }

      const btnPauseInstructions = document.getElementById('btn-pause-instructions');
      if (btnPauseInstructions) {
        btnPauseInstructions.addEventListener('click', () => {
          unlockAudio();
          this.audio.playClick();
          this.instructionsModal.classList.remove('hud-hidden');
        });
      }

      document.getElementById('btn-close-instructions').addEventListener('click', () => {
        unlockAudio();
        this.audio.playClick();
        this.instructionsModal.classList.add('hud-hidden');
      });

      document.getElementById('btn-place-checkpoint').addEventListener('click', () => {
        this.placeCheckpoint();
      });
      document.getElementById('btn-remove-checkpoint').addEventListener('click', () => {
        this.removeCheckpoint();
      });
    }

    /* ==========================================================================
       6. PROCEDURAL CONTINUOUS LEVEL GENERATOR
       ========================================================================== */
    resetProceduralWorld() {
      this.obstacles = [];
      this.generationCursorX = 850;
      while (this.generationCursorX < 2800) {
        this.spawnNextChunk();
      }
    }

    spawnNextChunk() {
      const S = 50;
      const startX = this.generationCursorX;
      const chunkTypes = ['single_spikes', 'double_spikes', 'block_step', 'pad_launcher', 'pit_island', 'ring_jump', 'moving_blade'];
      const pick = chunkTypes[Math.floor(Math.random() * chunkTypes.length)];

      switch (pick) {
        case 'single_spikes':
          this.obstacles.push({ type: 'spike', x: startX, y: GROUND_Y - S, width: S, height: S });
          this.obstacles.push({ type: 'spike', x: startX + 380, y: GROUND_Y - S, width: S, height: S });
          this.generationCursorX += 700;
          break;

        case 'double_spikes':
          this.obstacles.push({ type: 'spike', x: startX, y: GROUND_Y - S, width: S, height: S });
          this.obstacles.push({ type: 'spike', x: startX + S, y: GROUND_Y - S, width: S, height: S });
          this.generationCursorX += 600;
          break;

        case 'block_step':
          this.obstacles.push({ type: 'block', x: startX, y: GROUND_Y - S, width: S * 2, height: S });
          this.obstacles.push({ type: 'spike', x: startX + S * 2 + 180, y: GROUND_Y - S, width: S, height: S });
          this.generationCursorX += 680;
          break;

        case 'pad_launcher':
          this.obstacles.push({ type: 'pad', x: startX, y: GROUND_Y - 16, width: 44, height: 16 });
          this.obstacles.push({ type: 'spike', x: startX + 110, y: GROUND_Y - S, width: S, height: S });
          this.obstacles.push({ type: 'spike', x: startX + 160, y: GROUND_Y - S, width: S, height: S });
          this.obstacles.push({ type: 'block', x: startX + 220, y: GROUND_Y - S * 1.5, width: 220, height: S });
          this.generationCursorX += 780;
          break;

        case 'pit_island':
          this.obstacles.push({ type: 'gap', x: startX, width: 220 });
          this.obstacles.push({ type: 'block', x: startX + 70, y: GROUND_Y - S, width: 80, height: S });
          this.generationCursorX += 580;
          break;

        case 'ring_jump':
          this.obstacles.push({ type: 'spike', x: startX, y: GROUND_Y - S, width: S, height: S });
          this.obstacles.push({ type: 'ring', x: startX + 90, y: GROUND_Y - 130, radius: 24 });
          this.obstacles.push({ type: 'spike', x: startX + 180, y: GROUND_Y - S, width: S, height: S });
          this.generationCursorX += 620;
          break;

        case 'moving_blade':
          this.obstacles.push({
            type: 'moving_obstacle',
            x: startX,
            baseY: GROUND_Y - 120,
            y: GROUND_Y - 120,
            width: 46,
            height: 46,
            range: 75,
            speed: 4.5
          });
          this.generationCursorX += 640;
          break;

        default:
          this.obstacles.push({ type: 'spike', x: startX, y: GROUND_Y - S, width: S, height: S });
          this.generationCursorX += 500;
          break;
      }
    }

    maintainProceduralWorld() {
      while (this.generationCursorX < this.player.x + 1800) {
        this.spawnNextChunk();
      }

      const cullX = this.player.x - 400;
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const ob = this.obstacles[i];
        if (ob.x + (ob.width || 60) < cullX) {
          this.obstacles.splice(i, 1);
        }
      }
    }

    /* ==========================================================================
       7. RUN LIFECYCLE
       ========================================================================== */
    startRun() {
      this.distance = 0;
      this.newRecordTriggered = false;
      this.newRecordBadge.classList.add('hud-hidden');
      this.checkpoints = [];
      this.respawnTimer = 0;
      this.gameSpeed = BASE_SPEED;

      this.resetPlayerToStart();
      this.resetProceduralWorld();

      this.menuScreen.classList.remove('active-screen');
      this.menuScreen.classList.add('hud-hidden');
      this.hudOverlay.classList.remove('hud-hidden');
      this.pauseModal.classList.add('hud-hidden');
      this.crashToast.classList.add('hud-hidden');

      this.hudAttemptCounter.textContent = `ATTEMPT ${this.attempts}`;
      this.hudDistanceVal.innerHTML = `0 <span class="distance-unit">m</span>`;
      this.hudBestVal.textContent = `${this.bestDistance} m`;
      this.hudSpeedVal.textContent = Math.round(this.gameSpeed);

      if (this.mode === 'practice') {
        this.practiceTools.classList.remove('hud-hidden');
      } else {
        this.practiceTools.classList.add('hud-hidden');
      }

      this.particles.clear();
      this.state = STATE.PLAYING;
      this.audio.startMusic();
    }

    resetPlayerToStart() {
      this.player.x = 180;
      this.player.y = GROUND_Y - PLAYER_SIZE;
      this.player.prevX = 180;
      this.player.prevY = GROUND_Y - PLAYER_SIZE;
      this.player.vy = 0;
      this.player.rotation = 0; // Starts at 0°: rests flat on its bottom side!
      this.player.onGround = true;
      this.player.isJumping = false;
      this.player.alive = true;
      this.cameraX = 0;
    }

    pauseGame() {
      if (this.state !== STATE.PLAYING) return;
      this.state = STATE.PAUSED;
      this.audio.stopMusic();

      document.getElementById('pause-distance').textContent = `${this.distance} m`;
      document.getElementById('pause-best').textContent = `${this.bestDistance} m`;
      document.getElementById('pause-attempt').textContent = this.attempts;
      this.pauseModal.classList.remove('hud-hidden');
    }

    resumeGame() {
      if (this.state !== STATE.PAUSED) return;
      this.pauseModal.classList.add('hud-hidden');
      this.state = STATE.PLAYING;
      this.audio.startMusic();
    }

    restartRun() {
      this.attempts++;
      this.totalAttempts++;
      this.saveStorage();
      this.startRun();
    }

    returnToMenu() {
      this.state = STATE.MENU;
      this.audio.stopMusic();
      this.hudOverlay.classList.add('hud-hidden');
      this.pauseModal.classList.add('hud-hidden');
      this.crashToast.classList.add('hud-hidden');
      this.menuScreen.classList.remove('hud-hidden');
      this.menuScreen.classList.add('active-screen');
      document.getElementById('menu-best-distance').textContent = `${this.bestDistance} m`;
      this.resetPlayerToStart();
    }

    triggerDeath() {
      if (!this.player.alive) return;
      this.player.alive = false;
      this.state = STATE.DEAD;
      this.respawnTimer = 0;

      this.audio.playCrash();
      this.particles.addPrismExplosion(this.player.x + PLAYER_SIZE / 2, this.player.y + PLAYER_SIZE / 2);

      if (this.settings.screenShake) {
        this.shakeDuration = 0.36;
        this.shakeIntensity = 18;
      }

      document.getElementById('crash-distance-result').textContent = `Distance: ${this.distance} m`;
      this.crashToast.classList.remove('hud-hidden');

      if (this.distance > this.bestDistance) {
        this.bestDistance = this.distance;
      }
      this.saveStorage();
    }

    respawn() {
      this.crashToast.classList.add('hud-hidden');

      if (this.mode === 'practice' && this.checkpoints.length > 0) {
        const cp = this.checkpoints[this.checkpoints.length - 1];
        this.player.x = cp.x;
        this.player.y = cp.y;
        this.player.prevX = cp.x;
        this.player.prevY = cp.y;
        this.player.vy = 0;
        this.player.rotation = cp.rotation;
        this.player.onGround = cp.onGround;
        this.player.alive = true;
        this.cameraX = this.player.x - 220;
      } else {
        this.attempts++;
        this.totalAttempts++;
        this.saveStorage();
        this.hudAttemptCounter.textContent = `ATTEMPT ${this.attempts}`;
        this.distance = 0;
        this.newRecordTriggered = false;
        this.newRecordBadge.classList.add('hud-hidden');
        this.gameSpeed = BASE_SPEED;
        this.resetPlayerToStart();
        this.resetProceduralWorld();
      }

      this.state = STATE.PLAYING;
    }

    placeCheckpoint() {
      if (this.state !== STATE.PLAYING || !this.player.alive) return;
      this.checkpoints.push({
        x: this.player.x,
        y: this.player.y,
        rotation: this.player.rotation,
        onGround: this.player.onGround,
        distance: this.distance
      });
      this.audio.playCheckpoint();
    }

    removeCheckpoint() {
      if (this.checkpoints.length > 0) {
        this.checkpoints.pop();
        this.audio.playClick();
      }
    }

    /* ==========================================================================
       8. PHYSICS & 120° TRIANGLE FLAT-BASE SNAPPING
       ========================================================================== */
    update(dt) {
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
      }

      this.particles.update(dt);

      if (this.state === STATE.DEAD) {
        this.respawnTimer += dt;
        if (this.respawnTimer >= 0.65) {
          this.respawn();
        }
        return;
      }

      if (this.state !== STATE.PLAYING) return;

      if (this.input.jumpBufferTimer > 0) {
        this.input.jumpBufferTimer -= dt;
      }

      // Moving Hazards
      const timeSec = performance.now() * 0.001;
      for (let ob of this.obstacles) {
        if (ob.type === 'moving_obstacle') {
          ob.y = ob.baseY + Math.sin(timeSec * ob.speed) * ob.range;
        }
      }

      // Dynamic Speed Scaling
      this.gameSpeed = Math.min(MAX_SPEED, BASE_SPEED + (this.distance / 100) * 8);

      // Sub-stepping for glitch-free collision
      const subSteps = 2;
      const subDt = dt / subSteps;

      for (let s = 0; s < subSteps; s++) {
        if (!this.player.alive) break;
        this.physicsStep(subDt);
      }

      this.cameraX = this.player.x - 220;

      // Distance in meters
      this.distance = Math.floor(this.player.x / 10);
      this.hudDistanceVal.innerHTML = `${this.distance} <span class="distance-unit">m</span>`;
      this.hudSpeedVal.textContent = Math.round(this.gameSpeed);

      if (this.bestDistance > 0 && this.distance > this.bestDistance && !this.newRecordTriggered) {
        this.newRecordTriggered = true;
        this.newRecordBadge.classList.remove('hud-hidden');
      }

      this.maintainProceduralWorld();
    }

    physicsStep(dt) {
      this.player.prevX = this.player.x;
      this.player.prevY = this.player.y;

      const wantsToJump = this.input.jumpHeld || this.input.jumpBufferTimer > 0;
      if (wantsToJump && this.player.onGround) {
        this.player.vy = JUMP_VELOCITY;
        this.player.onGround = false;
        this.player.isJumping = true;
        this.input.jumpBufferTimer = 0;
        this.audio.playJump();
        this.particles.addJumpDust(this.player.x + PLAYER_SIZE / 2, this.player.y + PLAYER_SIZE);
      }

      this.player.vy += GRAVITY * dt;
      this.player.x += this.gameSpeed * dt;
      this.player.y += this.player.vy * dt;

      const inPit = this.checkInGap(this.player.x + PLAYER_SIZE * 0.5);
      let isGrounded = false;

      // Floor Collision
      if (!inPit) {
        if (this.player.y + PLAYER_SIZE >= GROUND_Y) {
          this.player.y = GROUND_Y - PLAYER_SIZE;
          this.player.vy = 0;
          if (!this.player.onGround) {
            this.particles.addJumpDust(this.player.x + PLAYER_SIZE / 2, GROUND_Y);
          }
          isGrounded = true;
          this.player.isJumping = false;
        }
      } else {
        if (this.player.y > GROUND_Y + 50) {
          this.triggerDeath();
          return;
        }
      }

      // Platform & Obstacle Collision Resolution
      const landedOnPlatform = this.resolveObstacleCollisions();
      if (landedOnPlatform) {
        isGrounded = true;
      }

      this.player.onGround = isGrounded;

      // Prism Rotation & Flat-Base Snapping
      if (!this.player.onGround) {
        this.player.rotation += ROTATION_SPEED * dt;
        if (this.settings.cubeTrail) {
          this.particles.addPrismTrail(this.player.x + PLAYER_SIZE / 2, this.player.y + PLAYER_SIZE - 16, this.player.rotation);
        }
      } else {
        // Snaps IMMEDIATELY to the nearest 120° increment so the prism ALWAYS rests flat on one of its 3 sides, NEVER on its points!
        this.player.rotation = Math.round(this.player.rotation / 120) * 120;
      }
    }

    checkInGap(x) {
      for (let ob of this.obstacles) {
        if (ob.type === 'gap') {
          if (x >= ob.x && x <= ob.x + ob.width) {
            return true;
          }
        }
      }
      return false;
    }

    resolveObstacleCollisions() {
      const px = this.player.x;
      const py = this.player.y;
      const playerWidth = PLAYER_SIZE;
      const playerHeight = PLAYER_SIZE;

      const playerBottom = py + playerHeight;
      const playerTop = py;
      const playerLeft = px;
      const playerRight = px + playerWidth;

      const prevBottom = this.player.prevY + playerHeight;
      const prevTop = this.player.prevY;

      let landedOnPlatform = false;

      // PASS 1: Check platform top-landing surfaces FIRST
      for (let ob of this.obstacles) {
        if (ob.type !== 'block') continue;
        if (ob.x > px + 250 || ob.x + ob.width < px - 100) continue;

        const bx = ob.x;
        const by = ob.y;
        const bw = ob.width;

        const inLandingX = (playerRight > bx - 4) && (playerLeft < bx + bw + 4);

        if (inLandingX) {
          const wasAboveOrAtTop = prevBottom <= by + 16;
          const isFallingOrApex = this.player.vy >= -90;
          const feetReachedTop = playerBottom >= by - 12;

          if (wasAboveOrAtTop && isFallingOrApex && feetReachedTop) {
            this.player.y = by - playerHeight;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.isJumping = false;
            landedOnPlatform = true;
            break;
          }
        }
      }

      // PASS 2: Check hazards & fatal front-wall impacts
      for (let ob of this.obstacles) {
        if (ob.x > px + 350 || (ob.x + (ob.width || 60)) < px - 120) continue;

        // 1. Solid Blocks (Front Wall or Underside Bump)
        if (ob.type === 'block') {
          if (landedOnPlatform && Math.abs((this.player.y + playerHeight) - ob.y) < 3) {
            continue;
          }

          const bx = ob.x;
          const by = ob.y;
          const bw = ob.width;
          const bh = ob.height;

          // FATAL FRONT WALL COLLISION:
          const wasBelowTop = (prevBottom > by + 12);
          const isBelowTop = (playerBottom > by + 12);
          const aboveBlockBottom = (playerTop < by + bh - 4);
          const penetratingFront = (playerRight > bx + 6) && (playerLeft < bx + 18);

          if (wasBelowTop && isBelowTop && aboveBlockBottom && penetratingFront) {
            this.triggerDeath();
            return false;
          }

          // FATAL UNDERSIDE (HEAD BUMP) COLLISION:
          const movingUp = (this.player.vy < 0);
          const wasBelowBlock = (prevTop >= by + bh - 10);
          const hittingUnderside = (playerTop < by + bh);
          const withinBlockX = (playerRight > bx + 8) && (playerLeft < bx + bw - 8);

          if (movingUp && wasBelowBlock && hittingUnderside && withinBlockX) {
            this.triggerDeath();
            return false;
          }
        }

        // 2. Triangular Spikes
        else if (ob.type === 'spike') {
          const pxHit = px + 4;
          const pyHit = py + 2;
          const pwHit = playerWidth - 8;
          const phHit = playerHeight - 4;
          if (this.checkSpikeCollision(pxHit, pyHit, pwHit, phHit, ob)) {
            this.triggerDeath();
            return false;
          }
        }

        // 3. Jump Pads
        else if (ob.type === 'pad') {
          if (playerRight > ob.x && playerLeft < ob.x + ob.width && playerBottom >= ob.y && playerTop <= ob.y + ob.height) {
            if (!ob.activated) {
              ob.activated = true;
              this.player.vy = PAD_BOOST_VELOCITY;
              this.player.onGround = false;
              this.audio.playPad();
              this.particles.addJumpDust(ob.x + ob.width / 2, ob.y);
            }
          } else {
            if (this.player.x > ob.x + ob.width + 10) {
              ob.activated = false;
            }
          }
        }

        // 4. Jump Rings
        else if (ob.type === 'ring') {
          const pcx = px + playerWidth / 2;
          const pcy = py + playerHeight / 2;
          const dist = Math.hypot(pcx - ob.x, pcy - ob.y);

          if (dist < ob.radius + playerWidth * 0.42) {
            if (!ob.used && (this.input.jumpHeld || this.input.jumpBufferTimer > 0)) {
              ob.used = true;
              this.player.vy = RING_BOOST_VELOCITY;
              this.player.onGround = false;
              this.input.jumpBufferTimer = 0;
              this.audio.playPad();
              this.particles.addJumpDust(ob.x, ob.y);
            }
          } else {
            if (this.player.x > ob.x + ob.radius + 30) {
              ob.used = false;
            }
          }
        }

        // 5. Moving Hazards
        else if (ob.type === 'moving_obstacle') {
          if (playerRight > ob.x + 4 && playerLeft < ob.x + ob.width - 4 && playerBottom > ob.y + 4 && playerTop < ob.y + ob.height - 4) {
            this.triggerDeath();
            return false;
          }
        }
      }

      return landedOnPlatform;
    }

    checkSpikeCollision(px, py, pw, ph, spike) {
      if (px + pw < spike.x + 5 || px > spike.x + spike.width - 5) return false;
      if (py + ph < spike.y + 4 || py > spike.y + spike.height - 2) return false;

      const tipX = spike.x + spike.width * 0.5;
      const tipY = spike.inverted ? spike.y + spike.height - 4 : spike.y + 4;
      const baseY = spike.inverted ? spike.y + 2 : spike.y + spike.height - 2;

      const testPoints = [
        { x: px + pw * 0.5, y: py + ph },
        { x: px + 4, y: py + ph - 2 },
        { x: px + pw - 4, y: py + ph - 2 },
        { x: px + pw * 0.5, y: py + 2 },
        { x: px + 4, y: py + 4 },
        { x: px + pw - 4, y: py + 4 }
      ];

      for (let pt of testPoints) {
        if (!spike.inverted) {
          if (pt.y >= spike.y + 4 && pt.y <= baseY) {
            const progress = (pt.y - tipY) / (baseY - tipY);
            const halfWidthAtY = (spike.width * 0.44) * progress;
            if (pt.x >= tipX - halfWidthAtY && pt.x <= tipX + halfWidthAtY) {
              return true;
            }
          }
        } else {
          if (pt.y >= baseY && pt.y <= tipY) {
            const progress = (tipY - pt.y) / (tipY - baseY);
            const halfWidthAtY = (spike.width * 0.44) * progress;
            if (pt.x >= tipX - halfWidthAtY && pt.x <= tipX + halfWidthAtY) {
              return true;
            }
          }
        }
      }
      return false;
    }

    /* ==========================================================================
       9. GRAPHICS & RENDERING SYSTEM
       ========================================================================== */
    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();

      if (this.shakeDuration > 0 && this.settings.screenShake) {
        const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(shakeX, shakeY);
      }

      this.drawParallaxBackground(ctx);
      this.drawFloorAndGaps(ctx);
      this.drawObstacles(ctx);
      this.drawCheckpoints(ctx);
      this.particles.draw(ctx, this.cameraX);

      // Render 3D Emerald Prism Character (both in MENU and PLAYING state)
      if (this.player.alive) {
        this.drawPrismPlayer(ctx);
      }

      ctx.restore();
    }

    drawParallaxBackground(ctx) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, '#020A04');
      skyGrad.addColorStop(0.6, '#041A0B');
      skyGrad.addColorStop(1, '#031207');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

      const bgOffset = (this.cameraX * 0.15) % 180;
      ctx.fillStyle = 'rgba(0, 255, 102, 0.04)';
      for (let x = -bgOffset; x < CANVAS_WIDTH + 180; x += 180) {
        const h = 200 + ((x * 17) % 150);
        ctx.fillRect(x, GROUND_Y - h, 140, h);

        ctx.fillStyle = 'rgba(57, 255, 20, 0.06)';
        ctx.fillRect(x + 20, GROUND_Y - h + 30, 20, 60);
        ctx.fillRect(x + 70, GROUND_Y - h + 50, 20, 80);
        ctx.fillStyle = 'rgba(0, 255, 102, 0.04)';
      }

      ctx.fillStyle = 'rgba(57, 255, 20, 0.5)';
      for (let i = 0; i < 42; i++) {
        const sx = ((i * 137 - this.cameraX * 0.25) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
        const sy = (i * 47) % (GROUND_Y - 80);
        const size = (i % 3) + 1;
        ctx.fillRect(sx, sy, size, size);
      }
    }

    drawFloorAndGaps(ctx) {
      ctx.fillStyle = '#030E06';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, FLOOR_HEIGHT);

      ctx.strokeStyle = '#00FF66';
      ctx.lineWidth = 3.5;
      if (this.settings.quality === 'high') {
        ctx.shadowColor = '#00FF66';
        ctx.shadowBlur = 14;
      }

      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(0, 255, 102, 0.22)';
      ctx.lineWidth = 1.5;
      const floorTileWidth = 60;
      const floorScroll = (this.cameraX) % floorTileWidth;

      ctx.beginPath();
      for (let x = -floorScroll; x < CANVAS_WIDTH + floorTileWidth; x += floorTileWidth) {
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x - 50, CANVAS_HEIGHT);
      }
      ctx.stroke();

      for (let ob of this.obstacles) {
        if (ob.type === 'gap') {
          const gx = ob.x - this.cameraX;
          if (gx + ob.width < -50 || gx > CANVAS_WIDTH + 50) continue;

          ctx.fillStyle = '#010502';
          ctx.fillRect(gx, GROUND_Y - 2, ob.width, FLOOR_HEIGHT + 10);

          ctx.fillStyle = 'rgba(255, 23, 68, 0.85)';
          ctx.fillRect(gx - 4, GROUND_Y - 2, 4, 20);
          ctx.fillRect(gx + ob.width, GROUND_Y - 2, 4, 20);
        }
      }
    }

    drawObstacles(ctx) {
      for (let ob of this.obstacles) {
        const screenX = ob.x - this.cameraX;
        if (screenX + (ob.width || 60) < -100 || screenX > CANVAS_WIDTH + 100) continue;

        // 1. Spikes
        if (ob.type === 'spike') {
          ctx.save();
          if (this.settings.quality === 'high') {
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00FF66';
          }

          const tipX = screenX + ob.width / 2;
          const tipY = ob.inverted ? ob.y + ob.height : ob.y;
          const baseY = ob.inverted ? ob.y : ob.y + ob.height;

          const spikeGrad = ctx.createLinearGradient(0, ob.y, 0, ob.y + ob.height);
          spikeGrad.addColorStop(0, '#00FF66');
          spikeGrad.addColorStop(1, '#05290E');

          ctx.fillStyle = spikeGrad;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(screenX + 3, baseY);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(screenX + ob.width - 3, baseY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#E2FF00';
          ctx.beginPath();
          ctx.moveTo(screenX + ob.width * 0.35, baseY - (ob.inverted ? -4 : 4));
          ctx.lineTo(tipX, tipY + (ob.inverted ? -14 : 14));
          ctx.lineTo(screenX + ob.width * 0.65, baseY - (ob.inverted ? -4 : 4));
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }

        // 2. Solid Blocks & Platforms
        else if (ob.type === 'block') {
          ctx.save();
          ctx.fillStyle = '#05180C';
          ctx.fillRect(screenX, ob.y, ob.width, ob.height);

          ctx.strokeStyle = '#00FF66';
          ctx.lineWidth = 2.5;
          if (this.settings.quality === 'high') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00FF66';
          }
          ctx.strokeRect(screenX, ob.y, ob.width, ob.height);

          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(0, 255, 102, 0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX + 6, ob.y + 6, ob.width - 12, ob.height - 12);
          ctx.beginPath();
          ctx.moveTo(screenX + 6, ob.y + 6);
          ctx.lineTo(screenX + ob.width - 6, ob.y + ob.height - 6);
          ctx.stroke();

          ctx.restore();
        }

        // 3. Jump Pads
        else if (ob.type === 'pad') {
          ctx.save();
          ctx.fillStyle = '#39FF14';
          if (this.settings.quality === 'high') {
            ctx.shadowBlur = 14;
            ctx.shadowColor = '#39FF14';
          }
          ctx.beginPath();
          ctx.ellipse(screenX + ob.width / 2, ob.y + ob.height / 2, ob.width / 2, ob.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(screenX + ob.width / 2, ob.y + ob.height / 2, ob.width / 4, ob.height / 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 4. Jump Rings
        else if (ob.type === 'ring') {
          ctx.save();
          ctx.strokeStyle = '#39FF14';
          ctx.lineWidth = 4;
          if (this.settings.quality === 'high') {
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#39FF14';
          }
          ctx.beginPath();
          ctx.arc(screenX, ob.y, ob.radius, 0, Math.PI * 2);
          ctx.stroke();

          const pulse = (Math.sin(performance.now() * 0.008) + 1) * 0.5;
          ctx.strokeStyle = '#E2FF00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(screenX, ob.y, ob.radius * (0.5 + pulse * 0.2), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 5. Moving Obstacle (Acid Cutter Blade)
        else if (ob.type === 'moving_obstacle') {
          ctx.save();
          ctx.translate(screenX + ob.width / 2, ob.y + ob.height / 2);
          ctx.rotate(performance.now() * 0.006);

          if (this.settings.quality === 'high') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#39FF14';
          }

          ctx.fillStyle = '#FF1744';
          ctx.beginPath();
          ctx.moveTo(0, -ob.height / 2);
          ctx.lineTo(ob.width / 2, 0);
          ctx.lineTo(0, ob.height / 2);
          ctx.lineTo(-ob.width / 2, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    drawCheckpoints(ctx) {
      if (this.mode !== 'practice') return;
      ctx.save();
      for (let cp of this.checkpoints) {
        const sx = cp.x - this.cameraX;
        if (sx < -40 || sx > CANVAS_WIDTH + 40) continue;

        ctx.fillStyle = '#00FF66';
        if (this.settings.quality === 'high') {
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#00FF66';
        }
        ctx.beginPath();
        ctx.moveTo(sx + PLAYER_SIZE / 2, cp.y - 12);
        ctx.lineTo(sx + PLAYER_SIZE / 2 + 10, cp.y + 6);
        ctx.lineTo(sx + PLAYER_SIZE / 2, cp.y + 24);
        ctx.lineTo(sx + PLAYER_SIZE / 2 - 10, cp.y + 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    drawPrismPlayer(ctx) {
      ctx.save();
      const screenX = this.player.x - this.cameraX;
      const size = PLAYER_SIZE;
      // Incenter is at size - 16px. Base is at (this.player.y + size) which is GROUND_Y or platform top.
      const centerY = this.player.y + size - 16;
      const centerX = screenX + size / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((this.player.rotation * Math.PI) / 180);

      if (this.logoImg && this.logoImg.complete && this.logoImg.naturalWidth > 0) {
        ctx.save();
        if (this.settings.quality === 'high') {
          ctx.shadowColor = '#00FF66';
          ctx.shadowBlur = 18;
        }
        // Scaled to match incenter r = 16, R = 32
        const scale = 16 / 103.2;
        ctx.drawImage(this.logoImg, -239.3 * scale, -292.3 * scale, 482 * scale, 482 * scale);

        // Cyber neon rim outline
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(27.7, 16);
        ctx.lineTo(-27.7, 16);
        ctx.closePath();
        ctx.stroke();

        // Apex spark
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, -32, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Render procedural vector 3D prism
        draw3DPrismVector(ctx, 0, 0, size, false);
      }

      ctx.restore();
    }

    /* ==========================================================================
       10. MAIN ANIMATION LOOP
       ========================================================================== */
    gameLoop(timestamp) {
      if (!this.lastTime) this.lastTime = timestamp;
      const rawDt = (timestamp - this.lastTime) * 0.001;
      this.lastTime = timestamp;

      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.draw();

      requestAnimationFrame(this.gameLoop.bind(this));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new NeonDashGame());
  } else {
    new NeonDashGame();
  }

})();
