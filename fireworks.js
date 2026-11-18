/**
 * fireworks.js
 * High-performance 3D Fireworks & Particle System for MindAR / A-Frame / Three.js
 * Featuring procedural Web Audio synthesizer (no external audio files needed).
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. Procedural Web Audio Sound Synthesizer
  // -------------------------------------------------------------
  class FireworkAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.masterGain = null;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) {
        this.init();
      }
      return this.enabled;
    }

    // Launch whistle sound
    playLaunch(pan = 0) {
      if (!this.enabled || !this.ctx) return;
      try {
        const t0 = this.ctx.currentTime;
        const duration = 0.65;

        // Panner
        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (panner) panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t0);

        // Sweeping tone (whistle)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, t0);
        osc.frequency.exponentialRampToValueAtTime(880, t0 + duration);

        // Filter for soft whoosh
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, t0);
        filter.frequency.exponentialRampToValueAtTime(1100, t0 + duration);
        filter.Q.setValueAtTime(3.0, t0);

        oscGain.gain.setValueAtTime(0.01, t0);
        oscGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(filter);
        filter.connect(oscGain);

        if (panner) {
          oscGain.connect(panner);
          panner.connect(this.masterGain);
        } else {
          oscGain.connect(this.masterGain);
        }

        osc.start(t0);
        osc.stop(t0 + duration);
      } catch (e) {
        // Audio error silent fallback
      }
    }

    // Explosion boom + crackle sound
    playExplosion(intensity = 1.0, pan = 0, hasCrackle = true) {
      if (!this.enabled || !this.ctx) return;
      try {
        const t0 = this.ctx.currentTime;

        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (panner) panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t0);

        // 1. Deep Sub-bass Thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140 * intensity, t0);
        osc.frequency.exponentialRampToValueAtTime(35, t0 + 0.35);

        oscGain.gain.setValueAtTime(0.45 * intensity, t0);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);

        osc.connect(oscGain);

        // 2. White noise burst for the explosion roar
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800 * intensity, t0);
        noiseFilter.frequency.exponentialRampToValueAtTime(120, t0 + 0.6);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35 * intensity, t0);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        if (panner) {
          oscGain.connect(panner);
          noiseGain.connect(panner);
          panner.connect(this.masterGain);
        } else {
          oscGain.connect(this.masterGain);
          noiseGain.connect(this.masterGain);
        }

        osc.start(t0);
        osc.stop(t0 + 0.4);
        whiteNoise.start(t0);
        whiteNoise.stop(t0 + 0.75);

        // 3. Crackle sparks
        if (hasCrackle) {
          const crackleCount = Math.floor(6 + Math.random() * 8);
          for (let i = 0; i < crackleCount; i++) {
            const delay = 0.2 + Math.random() * 0.7;
            const cOsc = this.ctx.createOscillator();
            const cGain = this.ctx.createGain();
            cOsc.type = 'triangle';
            cOsc.frequency.setValueAtTime(1200 + Math.random() * 800, t0 + delay);
            cGain.gain.setValueAtTime(0.08, t0 + delay);
            cGain.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.04);
            cOsc.connect(cGain);
            if (panner) cGain.connect(panner);
            else cGain.connect(this.masterGain);
            cOsc.start(t0 + delay);
            cOsc.stop(t0 + delay + 0.05);
          }
        }
      } catch (e) {}
    }

    playCelebrationFanfare() {
      if (!this.enabled || !this.ctx) return;
      try {
        const t0 = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t0 + idx * 0.1);
          gain.gain.setValueAtTime(0.01, t0 + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.2, t0 + idx * 0.1 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t0 + idx * 0.1);
          osc.stop(t0 + idx * 0.1 + 0.4);
        });
      } catch (e) {}
    }
  }

  window.FireworkAudioInstance = new FireworkAudio();

  // -------------------------------------------------------------
  // 2. Texture Generators for Glowing Particles & Stars
  // -------------------------------------------------------------
  function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(255, 245, 210, 0.95)');
    grad.addColorStop(0.45, 'rgba(255, 180, 50, 0.55)');
    grad.addColorStop(0.75, 'rgba(255, 100, 20, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const cx = 64, cy = 64;

    // Glowing 8-pointed star matching poster design
    ctx.clearRect(0, 0, 128, 128);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 230, 100, 0.8)');
    grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();

    // 4 major beams
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 10); ctx.lineTo(cx, 118);
    ctx.moveTo(10, cy); ctx.lineTo(118, cy);
    ctx.stroke();

    // 4 minor beams
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(25, 25); ctx.lineTo(103, 103);
    ctx.moveTo(103, 25); ctx.lineTo(25, 103);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // -------------------------------------------------------------
  // 3. Fireworks Engine Component for A-Frame / Three.js
  // -------------------------------------------------------------
  AFRAME.registerComponent('fireworks-system', {
    schema: {
      autoLaunch: { type: 'boolean', default: true },
      launchInterval: { type: 'number', default: 800 }
    },

    init: function () {
      this.targetFound = false;
      this.lastLaunchTime = 0;
      this.rockets = [];
      this.particles = [];
      this.decorations = [];

      this.particleTexture = createParticleTexture();
      this.starTexture = createStarTexture();

      // Color Palettes
      this.palettes = [
        // 1. Royal Gold & Champagne (Poster buildings)
        ['#FFD700', '#FFF5B8', '#FFAA00', '#FF8C00', '#FFF9E6'],
        // 2. Neon Purple & Lavender (Poster left star)
        ['#A855F7', '#C084FC', '#E879F9', '#7C3AED', '#F3E8FF'],
        // 3. Electric Cyan & Sky Blue (Poster right star)
        ['#38BDF8', '#00E5FF', '#7DD3FC', '#0284C7', '#E0F2FE'],
        // 4. Vibrant Ruby & Coral (Festive celebration)
        ['#FF1744', '#FF5252', '#FF4081', '#FF80AB', '#FFE082'],
        // 5. Emerald & Lime Fireworks
        ['#00E676', '#69F0AE', '#00C853', '#B9F6CA', '#FFEA00']
      ];

      // Setup Three.js particle buffer
      this.maxParticles = 2000;
      this.particleGeo = new THREE.BufferGeometry();
      this.positions = new Float32Array(this.maxParticles * 3);
      this.colors = new Float32Array(this.maxParticles * 3);
      this.sizes = new Float32Array(this.maxParticles);

      this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
      this.particleGeo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
      this.particleGeo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

      this.particleMaterial = new THREE.PointsMaterial({
        size: 0.045,
        map: this.particleTexture,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particleSystem = new THREE.Points(this.particleGeo, this.particleMaterial);
      this.el.object3D.add(this.particleSystem);

      // Create 3D Festive Decors (Floating "2027", "BONNE ANNÉE", 3D Stars)
      this.createFloating3DText();
      this.createPosterStars();

      // 3D Rocket Flight Controller (Takes off 3 seconds after scan)
      this.rocketRig = null;
      this.rocketState = 'INIT';
      this.countdown = 3.0;
      this.rocketBaseY = -0.2;
      this.rocketY = -0.2;
      this.rocketVy = 0;
      this.rocketAy = 4.2;
      this.postLaunchTimer = 0;
      this.respawnProgress = 0;

      // Bind Listeners
      this.onTargetFound = this.onTargetFound.bind(this);
      this.onTargetLost = this.onTargetLost.bind(this);

      this.el.addEventListener('targetFound', this.onTargetFound);
      this.el.addEventListener('targetLost', this.onTargetLost);

      // Global trigger functions
      window.launchCustomFirework = (targetX, targetY) => {
        // If rocket is waiting, tap can immediately launch it!
        if (this.rocketState === 'WAITING' && this.countdown > 0.5) {
          this.countdown = 0;
        }
        this.launchRocket(targetX, targetY);
      };
      window.launchGrandFinale = () => this.launchFinale();
    },

    onTargetFound: function () {
      console.log('[AR] Target 2027 poster found!');
      this.targetFound = true;
      window.FireworkAudioInstance.init();
      window.FireworkAudioInstance.playCelebrationFanfare();

      // Reset 3D Rocket for 3-second countdown
      if (!this.rocketRig) {
        this.rocketRig = document.getElementById('rocketFlightRig');
      }
      if (this.rocketRig) {
        this.rocketRig.object3D.visible = true;
        this.rocketRig.object3D.position.set(0, this.rocketBaseY, 0.22);
        this.rocketRig.object3D.rotation.set(0, 0, 0);
        this.rocketRig.object3D.scale.set(1, 1, 1);
      }
      this.rocketState = 'WAITING';
      this.countdown = 3.0; // EXACTEMENT 3 SECONDES AVANT DÉCOLLAGE
    },

    onTargetLost: function () {
      console.log('[AR] Target lost.');
      this.targetFound = false;
      this.rocketState = 'WAITING';
      this.countdown = 3.0;
    },

    createFloating3DText: function () {
      // 3D Canvas Billboard for glowing "2027" and "BONNE ANNÉE !"
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Draw glowing gold text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 1. "2027"
      ctx.font = 'bold 90px "Arial Black", "Montserrat", sans-serif';
      ctx.shadowColor = '#FFA500';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('2027', 256, 95);

      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 35;
      ctx.fillStyle = '#FFEB3B';
      ctx.fillText('2027', 256, 95);

      // 2. "BONNE ANNÉE !"
      ctx.font = 'bold 36px "Montserrat", "Arial", sans-serif';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('✨ BONNE ANNÉE ! ✨', 256, 175);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });

      const planeGeo = new THREE.PlaneGeometry(0.85, 0.425);
      this.textMesh = new THREE.Mesh(planeGeo, material);
      // Position hovering above the city skyline (top is +0.71, so y = +0.88, z = +0.12)
      this.textMesh.position.set(0, 0.88, 0.12);
      this.el.object3D.add(this.textMesh);
    },

    createPosterStars: function () {
      // Create 3D rotating star meshes matching the poster's 2 sparkles
      // Left star (purple): x ≈ -0.38, y ≈ +0.40
      // Right star (sky blue): x ≈ +0.35, y ≈ -0.35
      const starGeo = new THREE.PlaneGeometry(0.24, 0.24);

      // Left Purple Star
      const matLeft = new THREE.MeshBasicMaterial({
        map: this.starTexture,
        color: new THREE.Color('#D8B4FE'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      this.starLeft = new THREE.Mesh(starGeo, matLeft);
      this.starLeft.position.set(-0.38, 0.40, 0.04);
      this.el.object3D.add(this.starLeft);

      // Right Cyan Star
      const matRight = new THREE.MeshBasicMaterial({
        map: this.starTexture,
        color: new THREE.Color('#67E8F9'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      this.starRight = new THREE.Mesh(starGeo, matRight);
      this.starRight.position.set(0.35, -0.35, 0.04);
      this.el.object3D.add(this.starRight);
    },

    launchRocket: function (targetX = null, targetY = null) {
      const palette = this.palettes[Math.floor(Math.random() * this.palettes.length)];
      
      const startX = (Math.random() - 0.5) * 0.7;
      const startY = -0.55 - Math.random() * 0.2;
      const startZ = 0.03 + Math.random() * 0.05;

      const endX = targetX !== null ? targetX : (Math.random() - 0.5) * 0.85;
      const endY = targetY !== null ? targetY : (0.55 + Math.random() * 0.55);
      const endZ = 0.08 + Math.random() * 0.18;

      const duration = 0.6 + Math.random() * 0.35; // seconds flight

      const rocket = {
        startX, startY, startZ,
        endX, endY, endZ,
        x: startX, y: startY, z: startZ,
        age: 0,
        lifetime: duration,
        color: new THREE.Color(palette[0]),
        palette: palette,
        trailTimer: 0
      };

      this.rockets.push(rocket);
      window.FireworkAudioInstance.playLaunch(endX);
    },

    launchFinale: function () {
      if (!this.targetFound) return;
      const count = 14;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const tx = (Math.random() - 0.5) * 0.95;
          const ty = 0.45 + Math.random() * 0.75;
          this.launchRocket(tx, ty);
        }, i * 160);
      }
    },

    explode: function (rocket) {
      const particleCount = 75 + Math.floor(Math.random() * 45);
      const palette = rocket.palette;
      const type = Math.random() > 0.3 ? 'sphere' : (Math.random() > 0.5 ? 'willow' : 'ring');

      window.FireworkAudioInstance.playExplosion(1.0, rocket.x, true);

      for (let i = 0; i < particleCount; i++) {
        const pColor = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
        let vx, vy, vz;
        let speed = 0.75 + Math.random() * 0.85;

        if (type === 'sphere') {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          vx = Math.sin(phi) * Math.cos(theta) * speed;
          vy = Math.sin(phi) * Math.sin(theta) * speed;
          vz = Math.cos(phi) * speed * 0.55;
        } else if (type === 'willow') {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * speed;
          vx = Math.cos(angle) * r;
          vy = Math.sin(angle) * r * 0.6 + 0.2;
          vz = (Math.random() - 0.5) * 0.4;
        } else {
          // Ring
          const angle = (i / particleCount) * Math.PI * 2;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          vz = (Math.random() - 0.5) * 0.15;
        }

        const p = {
          x: rocket.x,
          y: rocket.y,
          z: rocket.z,
          vx: vx,
          vy: vy,
          vz: vz,
          color: pColor,
          baseColor: pColor.clone(),
          size: 0.05 + Math.random() * 0.035,
          age: 0,
          lifetime: (type === 'willow' ? 1.6 : 1.2) + Math.random() * 0.5,
          gravity: type === 'willow' ? -0.55 : -0.32,
          drag: 0.94,
          twinkle: Math.random() > 0.4
        };

        if (this.particles.length < this.maxParticles) {
          this.particles.push(p);
        }
      }
    },

    emitNozzleSparks: function (x, y, z, count = 2) {
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 0.03,
          y: y + (Math.random() - 0.5) * 0.02,
          z: z + (Math.random() - 0.5) * 0.03,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -0.2 - Math.random() * 0.4,
          vz: (Math.random() - 0.5) * 0.25,
          color: new THREE.Color(Math.random() > 0.4 ? '#FFD700' : '#FF6600'),
          baseColor: new THREE.Color('#FFD700'),
          size: 0.045,
          age: 0,
          lifetime: 0.35,
          gravity: -0.2,
          drag: 0.9,
          twinkle: true
        });
      }
    },

    emitExhaustFlames: function (x, y, z, count = 5) {
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= this.maxParticles) break;
        const c = Math.random() > 0.5 ? '#FFAA00' : (Math.random() > 0.3 ? '#FF3300' : '#FFF9D2');
        this.particles.push({
          x: x + (Math.random() - 0.5) * 0.045,
          y: y,
          z: z + (Math.random() - 0.5) * 0.045,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -1.4 - Math.random() * 1.8,
          vz: (Math.random() - 0.5) * 0.18,
          color: new THREE.Color(c),
          baseColor: new THREE.Color(c),
          size: 0.07,
          age: 0,
          lifetime: 0.45,
          gravity: -0.6,
          drag: 0.88,
          twinkle: true
        });
      }
    },

    triggerMegaExplosion: function (x, y, z) {
      // 1. Center Grand Burst (Gold & Willow)
      this.explodeCustom(x, y, z, this.palettes[0], 'willow', 140);
      window.FireworkAudioInstance.playExplosion(1.5, 0, true);

      // 2. Left Burst (Neon Purple)
      setTimeout(() => {
        this.explodeCustom(x - 0.35, y - 0.12, z - 0.04, this.palettes[1], 'sphere', 90);
        window.FireworkAudioInstance.playExplosion(1.1, -0.4, true);
      }, 120);

      // 3. Right Burst (Electric Cyan & Azure)
      setTimeout(() => {
        this.explodeCustom(x + 0.35, y - 0.08, z - 0.04, this.palettes[2], 'sphere', 90);
        window.FireworkAudioInstance.playExplosion(1.1, 0.4, true);
      }, 240);
    },

    explodeCustom: function (x, y, z, palette, type = 'sphere', particleCount = 100) {
      for (let i = 0; i < particleCount; i++) {
        if (this.particles.length >= this.maxParticles) break;
        const pColor = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
        let vx, vy, vz;
        let speed = 0.85 + Math.random() * 0.95;

        if (type === 'sphere') {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          vx = Math.sin(phi) * Math.cos(theta) * speed;
          vy = Math.sin(phi) * Math.sin(theta) * speed;
          vz = Math.cos(phi) * speed * 0.6;
        } else {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * speed;
          vx = Math.cos(angle) * r;
          vy = Math.sin(angle) * r * 0.7 + 0.25;
          vz = (Math.random() - 0.5) * 0.4;
        }

        this.particles.push({
          x, y, z,
          vx, vy, vz,
          color: pColor,
          baseColor: pColor.clone(),
          size: 0.055 + Math.random() * 0.035,
          age: 0,
          lifetime: (type === 'willow' ? 1.8 : 1.3) + Math.random() * 0.5,
          gravity: type === 'willow' ? -0.58 : -0.32,
          drag: 0.93,
          twinkle: Math.random() > 0.3
        });
      }
    },

    tick: function (time, delta) {
      const dt = Math.min(delta / 1000, 0.1);

      // -------------------------------------------------------------
      // GESTION DU DÉCOLLAGE DE LA FUSÉE 3D (3s après le scan)
      // -------------------------------------------------------------
      if (!this.rocketRig) {
        this.rocketRig = document.getElementById('rocketFlightRig');
      }

      if (this.rocketRig && this.targetFound) {
        const rigObj = this.rocketRig.object3D;

        if (this.rocketState === 'WAITING') {
          this.countdown -= dt;

          // Lévitation douce
          rigObj.position.y = this.rocketBaseY + Math.sin(time * 0.003) * 0.02;
          rigObj.rotation.y += dt * 0.7;

          // 0.6s avant décollage : étincelles et secousses de mise à feu
          if (this.countdown <= 0.6 && this.countdown > 0) {
            rigObj.position.x = (Math.random() - 0.5) * 0.015;
            this.emitNozzleSparks(rigObj.position.x, rigObj.position.y - 0.14, 0.22, 2);
          }

          // Décollage exactement après 3 secondes !
          if (this.countdown <= 0) {
            this.rocketState = 'BLASTING';
            this.rocketY = this.rocketBaseY;
            this.rocketVy = 1.0;
            this.rocketAy = 4.2;
            rigObj.position.x = 0;
            window.FireworkAudioInstance.playLaunch(0);
          }
        } else if (this.rocketState === 'BLASTING') {
          this.rocketVy += this.rocketAy * dt;
          this.rocketY += this.rocketVy * dt;
          rigObj.position.y = this.rocketY;
          rigObj.position.x = 0;

          // Rotation rapide pendant l'ascension
          rigObj.rotation.y += dt * 12.0;

          // Flammes et traînées de particules sous la fusée
          this.emitExhaustFlames(rigObj.position.x, this.rocketY - 0.14, 0.22, 5);

          // Sommet atteint dans le ciel au-dessus de la skyline (y >= 1.6)
          if (this.rocketY >= 1.6) {
            rigObj.visible = false;
            this.rocketState = 'EXPLODED';
            this.postLaunchTimer = 3.5;

            // Explosion spectaculaire en plein vol !
            this.triggerMegaExplosion(0, 1.6, 0.25);
          }
        } else if (this.rocketState === 'EXPLODED') {
          this.postLaunchTimer -= dt;
          if (this.postLaunchTimer <= 0) {
            // Réapparition en douceur de la fusée pour un nouveau cycle
            rigObj.visible = true;
            rigObj.position.set(0, this.rocketBaseY, 0.22);
            rigObj.rotation.set(0, 0, 0);
            rigObj.scale.set(0.01, 0.01, 0.01);
            this.rocketState = 'RESPAWNING';
            this.respawnProgress = 0;
          }
        } else if (this.rocketState === 'RESPAWNING') {
          this.respawnProgress += dt * 2.0;
          const s = Math.min(1.0, this.respawnProgress);
          rigObj.scale.set(s, s, s);
          rigObj.rotation.y += dt * 2.5;
          this.emitNozzleSparks(0, this.rocketBaseY, 0.22, 1);
          if (s >= 1.0) {
            this.rocketState = 'WAITING';
            this.countdown = 3.5; // Relance 3.5s plus tard
          }
        }
      }

      // Animate floating text
      if (this.textMesh) {
        this.textMesh.position.y = 0.88 + Math.sin(time * 0.0025) * 0.03;
        this.textMesh.rotation.z = Math.sin(time * 0.0018) * 0.03;
      }

      // Animate poster stars
      if (this.starLeft) {
        this.starLeft.rotation.z += dt * 0.8;
        const s = 1.0 + Math.sin(time * 0.005) * 0.2;
        this.starLeft.scale.set(s, s, s);
      }
      if (this.starRight) {
        this.starRight.rotation.z -= dt * 0.9;
        const s = 1.0 + Math.cos(time * 0.006) * 0.2;
        this.starRight.scale.set(s, s, s);
      }

      // Auto launch fireworks when target is detected
      if (this.data.autoLaunch && this.targetFound) {
        if (time - this.lastLaunchTime > this.data.launchInterval) {
          this.lastLaunchTime = time;
          this.launchRocket();
          // Randomize next interval
          this.data.launchInterval = 650 + Math.random() * 750;
        }
      }

      // Update Rockets
      for (let i = this.rockets.length - 1; i >= 0; i--) {
        const r = this.rockets[i];
        r.age += dt;
        const prog = Math.min(1.0, r.age / r.lifetime);
        // Easing trajectory
        const ease = 1 - Math.pow(1 - prog, 2);

        r.x = r.startX + (r.endX - r.startX) * ease;
        r.y = r.startY + (r.endY - r.startY) * ease;
        r.z = r.startZ + (r.endZ - r.startZ) * ease;

        // Emit spark trail
        r.trailTimer += dt;
        if (r.trailTimer > 0.02 && this.particles.length < this.maxParticles) {
          r.trailTimer = 0;
          this.particles.push({
            x: r.x + (Math.random() - 0.5) * 0.015,
            y: r.y - 0.02,
            z: r.z,
            vx: (Math.random() - 0.5) * 0.05,
            vy: -0.15 - Math.random() * 0.15,
            vz: (Math.random() - 0.5) * 0.05,
            color: r.color,
            baseColor: r.color.clone(),
            size: 0.035,
            age: 0,
            lifetime: 0.35,
            gravity: -0.1,
            drag: 0.9,
            twinkle: true
          });
        }

        if (prog >= 1.0) {
          this.explode(r);
          this.rockets.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.age += dt;

        if (p.age >= p.lifetime) {
          this.particles.splice(i, 1);
          continue;
        }

        p.vx *= p.drag;
        p.vy = (p.vy + p.gravity * dt) * p.drag;
        p.vz *= p.drag;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }

      // Sync with GPU Buffer
      const activeCount = Math.min(this.particles.length, this.maxParticles);
      for (let i = 0; i < activeCount; i++) {
        const p = this.particles[i];
        const idx3 = i * 3;

        this.positions[idx3] = p.x;
        this.positions[idx3 + 1] = p.y;
        this.positions[idx3 + 2] = p.z;

        const lifeRatio = 1.0 - (p.age / p.lifetime);
        let flicker = 1.0;
        if (p.twinkle && Math.random() > 0.55) {
          flicker = 0.45 + Math.random() * 0.8;
        }

        this.colors[idx3] = p.color.r * lifeRatio * flicker;
        this.colors[idx3 + 1] = p.color.g * lifeRatio * flicker;
        this.colors[idx3 + 2] = p.color.b * lifeRatio * flicker;

        this.sizes[i] = p.size * (0.4 + 0.6 * lifeRatio);
      }

      // Zero out unused slots to hide them
      for (let i = activeCount; i < this.maxParticles; i++) {
        const idx3 = i * 3;
        this.positions[idx3] = 0;
        this.positions[idx3 + 1] = -999;
        this.positions[idx3 + 2] = 0;
        this.sizes[i] = 0;
      }

      this.particleGeo.attributes.position.needsUpdate = true;
      this.particleGeo.attributes.color.needsUpdate = true;
      this.particleGeo.attributes.size.needsUpdate = true;
      this.particleGeo.setDrawRange(0, activeCount);
    }
  });

})();
