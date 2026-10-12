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
  let hasStartedAR = false;
  let cameraVideoObserver = null;

  const DEFAULT_START_LABEL = '<span>✨</span> Lancer l\'expérience AR';

  const getCameraErrorMessage = (error) => {
    const errorName = error?.name || '';
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return 'La caméra nécessite HTTPS (ou localhost). Ouvrez ce site en https:// pour continuer.';
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'Votre navigateur ne prend pas en charge l’accès caméra (getUserMedia).';
    }
    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return 'Accès caméra refusé. Autorisez la caméra puis relancez l’expérience AR.';
    }
    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return 'Aucune caméra détectée sur cet appareil.';
    }
    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return 'Impossible d’ouvrir la caméra (elle est peut-être utilisée par une autre application).';
    }
    if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
      return 'Les paramètres caméra demandés ne sont pas compatibles avec cet appareil.';
    }
    if (errorName === 'SecurityError') {
      return 'Accès caméra bloqué pour des raisons de sécurité navigateur.';
    }
    return 'Impossible de démarrer la caméra. Vérifiez les permissions puis réessayez.';
  };

  const showCameraError = (error) => {
    const message = getCameraErrorMessage(error);
    hudStatus.innerHTML = `<span class="status-icon">⚠️</span> ${message}`;
    hudContainer.classList.remove('tracking-active');
    hudContainer.style.display = 'flex';
    alert(message);
  };

  const configureCameraVideoElement = (videoEl) => {
    if (!videoEl) return;
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.setAttribute('muted', '');
    videoEl.setAttribute('autoplay', '');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', 'true');
    videoEl.style.objectFit = 'cover';
    videoEl.style.backgroundColor = 'transparent';

    if (videoEl.paused) {
      videoEl.play().catch(() => {
        // Ignore autoplay race errors: user gesture already captured on AR start.
      });
    }
  };

  const watchAndConfigureCameraVideo = () => {
    const configureKnownVideos = () => {
      const candidates = document.querySelectorAll('#ar-scene video, video');
      candidates.forEach((video) => configureCameraVideoElement(video));
    };

    configureKnownVideos();
    if (!cameraVideoObserver) {
      cameraVideoObserver = new MutationObserver(configureKnownVideos);
      cameraVideoObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  const probeCameraAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia unavailable');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    stream.getTracks().forEach((track) => track.stop());
  };

  // Initialize and start AR
  startBtn.addEventListener('click', async () => {
    if (hasStartedAR) return;

    // Unlock Web Audio API on user gesture
    festiveAudio.init();

    startBtn.disabled = true;
    startBtn.innerHTML = 'Initialisation...';

    try {
      await probeCameraAccess();
    } catch (error) {
      console.error('Camera preflight error:', error);
      showCameraError(error);
      startBtn.disabled = false;
      startBtn.innerHTML = DEFAULT_START_LABEL;
      return;
    }

    // Fade welcome screen
    welcomeScreen.classList.add('fade-out');
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      hudContainer.style.display = 'flex';
    }, 500);

    // Initialize MindAR scene system
    try {
      if (arScene.hasLoaded) {
        await startMindAR();
      } else {
        arScene.addEventListener('loaded', () => {
          startMindAR().catch((error) => {
            console.error('AR start error:', error);
            showCameraError(error);
          });
        }, { once: true });
      }
    } catch (e) {
      console.error('AR start error:', e);
      showCameraError(e);
      startBtn.disabled = false;
      startBtn.innerHTML = DEFAULT_START_LABEL;
    }
  });

  async function startMindAR() {
    const sceneSystem = arScene.systems['mindar-image-system'];
    if (sceneSystem && typeof sceneSystem.start === 'function') {
      await sceneSystem.start();
      hasStartedAR = true;
      watchAndConfigureCameraVideo();
      return;
    }
    throw new Error('MindAR system unavailable');
  }

  arScene.addEventListener('arReady', () => {
    watchAndConfigureCameraVideo();
  });

  arScene.addEventListener('arError', (event) => {
    console.error('MindAR runtime error:', event?.detail || event);
    showCameraError(event?.detail || event);
  });

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
    const video = document.querySelector('#ar-scene video, video.mindar-video, video');
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
