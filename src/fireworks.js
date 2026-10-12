import { festiveAudio } from './audio.js';

// Particle texture generator (creates a soft glowing round star spark in memory)
function createSparkleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 240, 200, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 180, 50, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  // Cross glare
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(32, 10); ctx.lineTo(32, 54);
  ctx.moveTo(10, 32); ctx.lineTo(54, 32);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

const PALETTES = [
  // 1. Royal Gold (matching 2027 yellow/gold background)
  [0xFFD700, 0xFFA500, 0xFFE082, 0xFFF9C4],
  // 2. Purple Sparkle (matching top-left sparkle on the card)
  [0x9D4EDD, 0xC77DFF, 0xE0AAFF, 0xF72585],
  // 3. Celestial Blue (matching bottom sparkle on the card)
  [0x64DFDF, 0x72EFDD, 0x48CAE4, 0x00B4D8],
  // 4. Multicolor Gala
  [0xFF007F, 0xFFD700, 0x00F5D4, 0x7B2CBF]
];

AFRAME.registerComponent('fireworks-controller', {
  schema: {
    active: { type: 'boolean', default: false }
  },

  init: function () {
    this.sparkleTexture = createSparkleTexture();
    this.rockets = [];
    this.explosions = [];
    this.lastLaunchTime = 0;
    this.launchInterval = 900; // ms between rockets
    this.maxExplosions = 12;

    // Create container for 3D fireworks
    this.fireworksGroup = new THREE.Group();
    this.el.object3D.add(this.fireworksGroup);

    // Dynamic point light that flashes during explosions
    this.flashLight = new THREE.PointLight(0xfff3b0, 0, 2.5, 1.8);
    this.flashLight.position.set(0, 0, 0.3);
    this.fireworksGroup.add(this.flashLight);

    this.grandFinaleDone = false;
  },

  triggerGrandFinale: function () {
    // Launch a flurry of 4 festive fireworks at once when card is recognized
    festiveAudio.playChimeFanfare();
    const positions = [
      { x: -0.28, y: 0.35, z: 0.15 },
      { x: 0.28, y: 0.40, z: 0.20 },
      { x: 0.0, y: 0.55, z: 0.25 },
      { x: -0.15, y: -0.1, z: 0.18 }
    ];

    positions.forEach((pos, idx) => {
      setTimeout(() => {
        if (!this.data.active) return;
        this.createExplosion(pos.x, pos.y, pos.z, PALETTES[idx % PALETTES.length], 140);
      }, idx * 180);
    });
  },

  launchRocket: function () {
    festiveAudio.playLaunch();

    // Random start from bottom/around card
    const startX = (Math.random() - 0.5) * 0.7;
    const startY = -0.65;
    const startZ = 0.05 + Math.random() * 0.1;

    // Target explosion position
    const targetX = (Math.random() - 0.5) * 0.85;
    const targetY = 0.1 + Math.random() * 0.65; // around or above the 3D text
    const targetZ = 0.15 + Math.random() * 0.25;

    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];

    // Create rocket particle
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array([startX, startY, startZ]);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xfff0aa,
      size: 0.045,
      map: this.sparkleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Points(geo, mat);
    this.fireworksGroup.add(mesh);

    this.rockets.push({
      mesh,
      currentPos: new THREE.Vector3(startX, startY, startZ),
      targetPos: new THREE.Vector3(targetX, targetY, targetZ),
      progress: 0,
      speed: 0.024 + Math.random() * 0.012,
      palette
    });
  },

  createExplosion: function (x, y, z, palette, particleCount = 110) {
    festiveAudio.playExplosion(particleCount > 100 ? 1.0 : 0.75);

    // Trigger flash light
    this.flashLight.position.set(x, y, z + 0.1);
    this.flashLight.color.setHex(palette[0]);
    this.flashLight.intensity = 2.2;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];

    const threeColor = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Spherical explosion velocity distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 0.009 + Math.random() * 0.022;

      velocities.push({
        vx: speed * Math.sin(phi) * Math.cos(theta),
        vy: speed * Math.sin(phi) * Math.sin(theta),
        vz: speed * Math.cos(phi) * 0.7
      });

      // Random color from palette
      const hex = palette[Math.floor(Math.random() * palette.length)];
      threeColor.setHex(hex);
      colors[i * 3] = threeColor.r;
      colors[i * 3 + 1] = threeColor.g;
      colors[i * 3 + 2] = threeColor.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.038,
      vertexColors: true,
      map: this.sparkleTexture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.fireworksGroup.add(points);

    this.explosions.push({
      points,
      geo,
      mat,
      velocities,
      particleCount,
      age: 0,
      maxAge: 75 + Math.random() * 20
    });
  },

  tick: function (time, delta) {
    if (!delta) return;

    // Decay flash light
    if (this.flashLight.intensity > 0) {
      this.flashLight.intensity = Math.max(0, this.flashLight.intensity - 0.08);
    }

    // Launch periodic rockets if marker is active
    if (this.data.active) {
      if (time - this.lastLaunchTime > this.launchInterval) {
        this.lastLaunchTime = time;
        this.launchRocket();
        this.launchInterval = 700 + Math.random() * 800; // varied timing
      }
    }

    // Update ascending rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i];
      rocket.progress += rocket.speed;

      if (rocket.progress >= 1.0) {
        // Rocket reached target: BOOM!
        this.createExplosion(
          rocket.targetPos.x,
          rocket.targetPos.y,
          rocket.targetPos.z,
          rocket.palette,
          100 + Math.floor(Math.random() * 30)
        );

        this.fireworksGroup.remove(rocket.mesh);
        rocket.mesh.geometry.dispose();
        rocket.mesh.material.dispose();
        this.rockets.splice(i, 1);
      } else {
        // Interpolate along curve with upward arc
        const curr = rocket.currentPos.clone().lerp(rocket.targetPos, rocket.progress);
        const arc = Math.sin(rocket.progress * Math.PI) * 0.08;
        curr.y += arc;

        const posAttr = rocket.mesh.geometry.attributes.position;
        posAttr.setXYZ(0, curr.x, curr.y, curr.z);
        posAttr.needsUpdate = true;
      }
    }

    // Update bursting explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += 1;

      const posAttr = exp.geo.attributes.position;
      const positions = posAttr.array;
      const decay = 1 - (exp.age / exp.maxAge);
      exp.mat.opacity = Math.max(0, decay);

      // Drag + gravity simulation
      for (let j = 0; j < exp.particleCount; j++) {
        const vel = exp.velocities[j];
        vel.vx *= 0.965;
        vel.vy *= 0.965;
        vel.vz *= 0.965;
        vel.vy -= 0.00035; // gentle gravity

        positions[j * 3] += vel.vx;
        positions[j * 3 + 1] += vel.vy;
        positions[j * 3 + 2] += vel.vz;
      }
      posAttr.needsUpdate = true;

      if (exp.age >= exp.maxAge) {
        this.fireworksGroup.remove(exp.points);
        exp.geo.dispose();
        exp.mat.dispose();
        this.explosions.splice(i, 1);
      }
    }
  }
});
