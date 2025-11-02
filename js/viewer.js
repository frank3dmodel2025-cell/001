import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class ModelViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this._lastSize = { w: canvas.clientWidth, h: canvas.clientHeight };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
    this.camera.position.set(0, 1.2, 2.5);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = true;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 50;
    this.controls.target.set(0, 0.8, 0);
    this.controls.update();
    this.controls.minPolarAngle = 0.15 * Math.PI; // clamp vertical rotation
    this.controls.maxPolarAngle = 0.95 * Math.PI;

    this.clock = new THREE.Clock();
    this.loader = new GLTFLoader();

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(2, 3, 2);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dir2.position.set(-2, 1.5, -1);
    this.scene.add(ambient, dir1, dir2);

    this.grid = new THREE.GridHelper(10, 10, 0xeeeeee, 0xf5f5f5);
    this.grid.material.opacity = 0.6;
    this.grid.material.transparent = true;
    this.scene.add(this.grid);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.current = null;
    this.autoRotate = false;
    this.lockModelToCamera = false;
    this.cameraBgEnabled = false;
    this._bgVideo = null; this._bgStream = null; this._bgTexture = null;

    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("dblclick", () => this.fitToView());
    this.animate();
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this._lastSize && this._lastSize.w === w && this._lastSize.h === h) return;
    this._lastSize = { w, h };
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  async load(url, onProgress) {
    if (this.current) {
      this.root.remove(this.current);
      this.current.traverse(o => {
        if (o.isMesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else o.material?.dispose();
        }
      });
      this.current = null;
    }
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.current = gltf.scene;
          this.root.add(this.current);
          this.normalizeScale();
          this.fitToView();
          resolve(gltf);
        },
        (evt) => { onProgress?.(evt.loaded / (evt.total || 1)); },
        (err) => reject(err)
      );
    });
  }

  normalizeScale() {
    if (!this.current) return;
    const box = new THREE.Box3().setFromObject(this.current);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1 / maxDim;
    this.current.scale.setScalar(scale * 1.6);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.current.position.sub(center.multiplyScalar(scale * 1.6));
  }

  fitToView() {
    if (!this.current) return;
    const box = new THREE.Box3().setFromObject(this.current);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const dist = (maxDim / 2) / Math.tan(fov / 2);
    const offset = 1.35;
    const newPos = new THREE.Vector3(center.x, center.y + maxDim * 0.2, center.z + dist * offset);
    this.smoothMoveCamera(newPos, center);
  }

  smoothMoveCamera(targetPos, targetLook) {
    const startPos = this.camera.position.clone();
    const startLook = this.controls.target.clone();
    const duration = 0.5;
    let t = 0;
    const animateStep = () => {
      t += this.clock.getDelta();
      const k = Math.min(t / duration, 1);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      this.camera.position.lerpVectors(startPos, targetPos, e);
      this.controls.target.lerpVectors(startLook, targetLook, e);
      this.controls.update();
      if (k < 1) requestAnimationFrame(animateStep);
    };
    animateStep();
  }

  setAutoRotate(enabled) {
    this.autoRotate = enabled;
  }

  async setCameraBackground(enabled) {
    if (enabled && !this.cameraBgEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = document.createElement("video");
        video.playsInline = true; video.muted = true; video.autoplay = true; video.srcObject = stream;
        await video.play();
        const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = tex;
        this._bgVideo = video; this._bgStream = stream; this._bgTexture = tex;
        this.cameraBgEnabled = true;
      } catch (e) {
        console.warn("No se pudo activar la cámara:", e);
        this.scene.background = new THREE.Color(0xffffff);
        this.cameraBgEnabled = false;
      }
    } else if (!enabled && this.cameraBgEnabled) {
      this.scene.background = new THREE.Color(0xffffff);
      this._bgTexture?.dispose();
      this._bgStream?.getTracks().forEach(t => t.stop());
      this._bgVideo = null; this._bgStream = null; this._bgTexture = null;
      this.cameraBgEnabled = false;
    }
  }

  lockCurrentToScreen(enabled) {
    if (!this.current) { this.lockModelToCamera = false; return; }
    if (enabled && !this.lockModelToCamera) {
      this.scene.updateMatrixWorld(true);
      const worldMatrix = this.current.matrixWorld.clone();
      const camInv = new THREE.Matrix4().copy(this.camera.matrixWorld).invert();
      const localMatrix = camInv.multiply(worldMatrix);
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
      localMatrix.decompose(pos, quat, scl);
      this.camera.add(this.current);
      this.current.position.copy(pos);
      this.current.quaternion.copy(quat);
      this.current.scale.copy(scl);
      this.lockModelToCamera = true;
    } else if (!enabled && this.lockModelToCamera) {
      this.scene.updateMatrixWorld(true);
      const camMatrix = this.camera.matrixWorld.clone();
      const objLocal = this.current.matrix.clone();
      const worldMatrix = camMatrix.multiply(objLocal);
      const rootInv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
      const finalMatrix = rootInv.multiply(worldMatrix);
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
      finalMatrix.decompose(pos, quat, scl);
      this.root.add(this.current);
      this.current.position.copy(pos);
      this.current.quaternion.copy(quat);
      this.current.scale.copy(scl);
      this.lockModelToCamera = false;
    }
  }

  zoom(step = 1) {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const targetDist = THREE.MathUtils.clamp(dist * (step > 0 ? 0.85 : 1.15), this.controls.minDistance, this.controls.maxDistance);
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    const targetPos = new THREE.Vector3().addVectors(this.controls.target, dir.multiplyScalar(targetDist));
    this.smoothMoveCamera(targetPos, this.controls.target);
  }

  animate() {
    const delta = this.clock.getDelta();
    if (this.autoRotate && this.current) {
      this.current.rotation.y += delta * 0.6;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }
}