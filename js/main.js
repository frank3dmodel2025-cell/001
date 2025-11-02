import { ModelViewer } from "./viewer.js";
import { Carousel } from "./carousel.js";

const canvas = document.getElementById("viewport");
const loading = document.getElementById("loading");
const btnAuto = document.getElementById("btn-autorotate");
const btnFit = document.getElementById("btn-fit");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnLockModel = document.getElementById("btn-lock-model");
const btnBgCamera = document.getElementById("btn-bg-camera");

const viewer = new ModelViewer(canvas);

const models = [
  {
    name: "Astronauta",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    thumb: "https://modelviewer.dev/shared-assets/models/thumbnails/Astronaut.webp",
    ext: "glb", size: "2.4 MB"
  },
  {
    name: "Cámara vintage",
    url: "https://modelviewer.dev/shared-assets/models/FlightHelmet.glb",
    thumb: "https://modelviewer.dev/shared-assets/models/thumbnails/FlightHelmet.webp",
    ext: "glb", size: "7.1 MB"
  },
  {
    name: "Robot",
    url: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
    thumb: "https://modelviewer.dev/shared-assets/models/thumbnails/RobotExpressive.webp",
    ext: "glb", size: "2.3 MB"
  },
  {
    name: "Silla (GLTF + BIN)",
    url: "https://threejs.org/examples/models/gltf/Chair/Chair.gltf",
    thumb: "",
    ext: "gltf", size: "binario"
  }
];

const carousel = new Carousel(
  document.getElementById("carousel"),
  document.getElementById("carousel-prev"),
  document.getElementById("carousel-next"),
  async (item) => {
    loading.classList.remove("hidden");
    try {
      await viewer.load(item.url, (p) => {
        // Optional: could map progress to a bar
      });
    } catch (e) {
      alert("Error al cargar el modelo:\n" + e.message);
      console.error(e);
    } finally {
      loading.classList.add("hidden");
    }
  }
);

carousel.setItems(models);

btnAuto.addEventListener("click", () => {
  const en = !viewer.autoRotate;
  viewer.setAutoRotate(en);
  btnAuto.classList.toggle("active", en);
  btnAuto.textContent = en ? "Pausar rotación" : "Auto-rotar";
});

btnFit.addEventListener("click", () => viewer.fitToView());
btnZoomIn.addEventListener("click", () => viewer.zoom(+1));
btnZoomOut.addEventListener("click", () => viewer.zoom(-1));
btnLockModel.addEventListener("click", () => {
  const en = !viewer.lockModelToCamera;
  viewer.lockCurrentToScreen(en);
  btnLockModel.classList.toggle("active", en);
  btnLockModel.textContent = en ? "Desfijar modelo" : "Fijar modelo";
});
btnBgCamera.addEventListener("click", async () => {
  const en = !viewer.cameraBgEnabled;
  await viewer.setCameraBackground(en);
  btnBgCamera.classList.toggle("active", en);
  btnBgCamera.textContent = en ? "Fondo: sólido" : "Fondo: cámara";
});

// Resize observer to keep canvas sized to container
const ro = new ResizeObserver((entries) => {
  // Observe parent container to avoid resize feedback loops from canvas mutations
  if (!entries.length) return;
  // Throttle via rAF
  requestAnimationFrame(() => viewer.resize());
});
ro.observe(canvas.parentElement || canvas);