import { festiveAudio } from './audio.js';
import './fireworks.js';
import './text-3d.js';

document.addEventListener('DOMContentLoaded', () => {
  const welcomeScreen = document.getElementById('welcome-screen');
  const startBtn = document.getElementById('start-ar-btn');
  const arScene = document.getElementById('ar-scene');
  const hudContainer = document.getElementById('hud-container');
  const hudStatus = document.getElementById('hud-status');
  const scanReticle = document.getElementById('scan-reticle');
  const soundBtn = document.getElementById('sound-toggle-btn');
  const switchCamBtn = document.getElementById('switch-cam-btn');
  const previewCardBtn = document.getElementById('preview-card-btn');
  const snapshotBtn = document.getElementById('snapshot-btn');
  const cardModal = document.getElementById('card-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');

  const targetEntity = document.getElementById('target-marker');
  const fireworksEntity = document.getElementById('fireworks-container');
  const festiveSceneEntity = document.getElementById('festive-scene');

  let currentCameraFacing = 'environment';
  let isTargetVisible = false;

  // Initialize and start AR
  startBtn.addEventListener('click', async () => {
    // Unlock Web Audio API on user gesture
    festiveAudio.init();

    // Fade welcome screen
    welcomeScreen.classList.add('fade-out');
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      hudContainer.style.display = 'flex';
    }, 500);

    // Initialize MindAR scene system
    try {
      if (arScene.hasLoaded) {
        startMindAR();
      } else {
        arScene.addEventListener('loaded', startMindAR);
      }
    } catch (e) {
      console.error('AR start error:', e);
    }
  });

  function startMindAR() {
    const sceneSystem = arScene.systems['mindar-image-system'];
    if (sceneSystem && typeof sceneSystem.start === 'function') {
      sceneSystem.start();
    }
  }

  // Target Tracking Events
  targetEntity.addEventListener('targetFound', () => {
    isTargetVisible = true;
    hudStatus.innerHTML = '<span class="status-icon pulse-glow">✨</span> <strong>Bonne Année 2027 !</strong>';
    hudContainer.classList.add('tracking-active');
    scanReticle.classList.add('locked');

    // Trigger 3D scene & fireworks
    festiveSceneEntity.setAttribute('festive-scene-controller', 'visible: true');
    fireworksEntity.setAttribute('fireworks-controller', 'active: true');

    const fireworksComp = fireworksEntity.components['fireworks-controller'];
    if (fireworksComp) {
      fireworksComp.triggerGrandFinale();
    }
  });

  targetEntity.addEventListener('targetLost', () => {
    isTargetVisible = false;
    hudStatus.innerHTML = '<span class="status-icon">🔍</span> Visez la carte de vœux';
    hudContainer.classList.remove('tracking-active');
    scanReticle.classList.remove('locked');

    festiveSceneEntity.setAttribute('festive-scene-controller', 'visible: false');
    fireworksEntity.setAttribute('fireworks-controller', 'active: false');
  });

  // Sound toggle button
  soundBtn.addEventListener('click', () => {
    festiveAudio.init();
    const enabled = festiveAudio.toggle();
    if (enabled) {
      soundBtn.innerHTML = '<span>🔊</span> Son Activé';
      soundBtn.classList.remove('muted');
    } else {
      soundBtn.innerHTML = '<span>🔇</span> Son Coupé';
      soundBtn.classList.add('muted');
    }
  });

  // Camera switch (environment vs user)
  if (switchCamBtn) {
    switchCamBtn.addEventListener('click', () => {
      const sceneSystem = arScene.systems['mindar-image-system'];
      if (sceneSystem && typeof sceneSystem.switchCamera === 'function') {
        sceneSystem.switchCamera();
        currentCameraFacing = currentCameraFacing === 'environment' ? 'user' : 'environment';
      }
    });
  }

  // Card Preview Modal
  previewCardBtn.addEventListener('click', () => {
    cardModal.classList.add('open');
  });

  closeModalBtn.addEventListener('click', () => {
    cardModal.classList.remove('open');
  });

  cardModal.addEventListener('click', (e) => {
    if (e.target === cardModal) {
      cardModal.classList.remove('open');
    }
  });

  // Photo Snapshot feature
  snapshotBtn.addEventListener('click', () => {
    const video = document.querySelector('video');
    const aSceneCanvas = arScene.renderer.domElement;

    if (!video || !aSceneCanvas) {
      alert('Impossible de capturer la photo pour le moment.');
      return;
    }

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = aSceneCanvas.width;
    captureCanvas.height = aSceneCanvas.height;
    const ctx = captureCanvas.getContext('2d');

    // Draw video feed scaled to canvas
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    // Draw 3D WebGL scene over video
    ctx.drawImage(aSceneCanvas, 0, 0);

    // Add festive watermark
    ctx.save();
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText('Bonne Année 2027 ✨', 40, captureCanvas.height - 50);
    ctx.restore();

    // Trigger download
    const link = document.createElement('a');
    link.download = `bonne-annee-2027-${Date.now()}.png`;
    link.href = captureCanvas.toDataURL('image/png');
    link.click();

    // Visual shutter flash effect
    const flash = document.createElement('div');
    flash.className = 'shutter-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
  });
});
