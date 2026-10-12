// 3D Festive Scene Manager: renders 3D text, stylized 8-point stars, and floating golden embers

function createEightPointStarGeometry(outerRadius = 0.12, innerRadius = 0.045, depth = 0.03) {
  const shape = new THREE.Shape();
  const points = 8;
  const step = Math.PI / points;

  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.01,
    bevelSegments: 3
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

AFRAME.registerComponent('festive-scene-controller', {
  schema: {
    visible: { type: 'boolean', default: false }
  },

  init: function () {
    this.container = this.el.object3D;
    this.currentScale = 0.001;
    this.targetScale = 0.001;
    this.time = 0;

    // Create 3D Sparkle Stars matching the artwork
    this.starsGroup = new THREE.Group();
    this.container.add(this.starsGroup);

    // 1. Purple Star (Top Left)
    const purpleGeo = createEightPointStarGeometry(0.09, 0.035, 0.02);
    const purpleMat = new THREE.MeshStandardMaterial({
      color: 0xC084FC,
      emissive: 0x6B21A8,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2
    });
    this.starPurple = new THREE.Mesh(purpleGeo, purpleMat);
    this.starPurple.position.set(-0.35, 0.45, 0.12);
    this.starsGroup.add(this.starPurple);

    // 2. Blue Star (Bottom Right)
    const blueGeo = createEightPointStarGeometry(0.11, 0.04, 0.02);
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x93C5FD,
      emissive: 0x1E40AF,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2
    });
    this.starBlue = new THREE.Mesh(blueGeo, blueMat);
    this.starBlue.position.set(0.32, -0.42, 0.14);
    this.starsGroup.add(this.starBlue);

    // 3. Stardust ambient particles floating around the card
    const emberCount = 60;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    this.emberSpeeds = [];

    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = (Math.random() - 0.5) * 1.1;
      emberPos[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      emberPos[i * 3 + 2] = 0.05 + Math.random() * 0.3;
      this.emberSpeeds.push(0.001 + Math.random() * 0.0025);
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));

    const emberMat = new THREE.PointsMaterial({
      color: 0xFFF3B0,
      size: 0.025,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.embers = new THREE.Points(emberGeo, emberMat);
    this.container.add(this.embers);
  },

  update: function () {
    this.targetScale = this.data.visible ? 1.0 : 0.001;
  },

  tick: function (time, delta) {
    if (!delta) return;
    this.time += delta * 0.001;

    // Smooth elastic scaling transition
    const lerpFactor = this.data.visible ? 0.08 : 0.15;
    this.currentScale += (this.targetScale - this.currentScale) * lerpFactor;
    this.container.scale.set(this.currentScale, this.currentScale, this.currentScale);

    if (this.currentScale < 0.01) return;

    // Rotate and hover stars
    if (this.starPurple) {
      this.starPurple.rotation.z += 0.018;
      this.starPurple.rotation.y = Math.sin(this.time * 2) * 0.2;
      this.starPurple.position.y = 0.45 + Math.sin(this.time * 2.5) * 0.03;
    }

    if (this.starBlue) {
      this.starBlue.rotation.z -= 0.014;
      this.starBlue.rotation.x = Math.cos(this.time * 2) * 0.2;
      this.starBlue.position.y = -0.42 + Math.cos(this.time * 2.2) * 0.03;
    }

    // Float embers upwards
    const posAttr = this.embers.geometry.attributes.position;
    const array = posAttr.array;
    for (let i = 0; i < this.emberSpeeds.length; i++) {
      array[i * 3 + 1] += this.emberSpeeds[i];
      if (array[i * 3 + 1] > 0.85) {
        array[i * 3 + 1] = -0.85;
      }
    }
    posAttr.needsUpdate = true;
  }
});
