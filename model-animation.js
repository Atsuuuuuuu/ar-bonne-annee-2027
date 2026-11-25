AFRAME.registerComponent('scan-model-animation', {
  schema: {
    target: { type: 'selector' }
  },

  init: function () {
    this.targetFound = false;
    this.mixer = null;
    this.actions = [];

    if (!this.data.target) {
      throw new Error('scan-model-animation requires a target selector.');
    }

    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.onTargetFound = this.onTargetFound.bind(this);
    this.onTargetLost = this.onTargetLost.bind(this);

    this.el.addEventListener('model-loaded', this.onModelLoaded);
    this.data.target.addEventListener('targetFound', this.onTargetFound);
    this.data.target.addEventListener('targetLost', this.onTargetLost);
    this.el.object3D.visible = false;
  },

  onModelLoaded: function (event) {
    const model = event.detail.model || this.el.getObject3D('mesh');
    if (!model) {
      console.error('[AR] The fireworks GLB loaded without a 3D model.');
      return;
    }

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = (model.animations || []).map((clip) => this.mixer.clipAction(clip));

    if (this.actions.length === 0) {
      console.warn('[AR] The fireworks GLB contains no animation clips.');
    }

    if (this.targetFound) {
      this.playAnimation();
    }
  },

  onTargetFound: function () {
    this.targetFound = true;
    this.el.object3D.visible = true;
    this.playAnimation();
  },

  onTargetLost: function () {
    this.targetFound = false;
    this.el.object3D.visible = false;
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  },

  playAnimation: function () {
    if (!this.mixer || this.actions.length === 0) {
      return;
    }

    this.mixer.stopAllAction();
    this.mixer.setTime(0);

    this.actions.forEach((action) => {
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
    });
  },

  tick: function (time, delta) {
    if (this.targetFound && this.mixer) {
      this.mixer.update(delta / 1000);
    }
  },

  remove: function () {
    this.el.removeEventListener('model-loaded', this.onModelLoaded);
    this.data.target.removeEventListener('targetFound', this.onTargetFound);
    this.data.target.removeEventListener('targetLost', this.onTargetLost);
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
});
