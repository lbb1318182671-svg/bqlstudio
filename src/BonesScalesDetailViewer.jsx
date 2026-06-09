import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const MODEL_URL = "/models/bonesandscales.glb";
const C_GOLD = "#c4a66e";
const F = "'Jost', sans-serif";

const LAYER_ORDER = [
  { layer: "SCREW", label: "SCREW", distance: 0.69 },
  { layer: "SCALE", label: "PERFORATED ALUMINUM PANEL", distance: 0.61 },
  { layer: "SCALEBRACKET", label: "STAINLESS STEEL SUBFRAME FOR ALUMINUM SCALES", distance: 0.54 },
  { layer: "BONE2", label: "BONE 2 - PRECAST LIGHTWEIGHT GFRC", distance: 0.47 },
  { layer: "BONE1", label: "BONE 1 - PRECAST LIGHTWEIGHT GFRC", distance: 0.35 },
  { layer: "BONEBRACKET", label: "STAINLESS STEEL LINKAGE ROD", distance: 0.2 },
  { layer: "BUILDINGBRACKET", label: "HOT-DIP GALVANIZED STEEL ANCHOR BRACKET", distance: 0.12 },
  { layer: "BUILDNG", label: "BUILDING", distance: 0 },
];

const INSTALL_ORDER = ["BUILDINGBRACKET", "BONEBRACKET", "BONE1", "BONE2", "SCALEBRACKET", "SCALE", "SCREW"];
const LAYER_LABELS = Object.fromEntries(LAYER_ORDER.map(item => [item.layer, item.label]));
const LAYER_CONFIG = Object.fromEntries(LAYER_ORDER.map(item => [item.layer, item]));
const SYSTEM_ORDER = [
  { id: "scale", label: "SCALE SYSTEM", layers: ["SCREW", "SCALE", "SCALEBRACKET"] },
  { id: "bone", label: "BONE SYSTEM", layers: ["BONE2", "BONE1", "BONEBRACKET"] },
  { id: "building", label: "BUILDING SYSTEM", layers: ["BUILDINGBRACKET", "BUILDNG"] },
];
const SYSTEM_KEY_PREFIX = "system:";
const SYSTEM_BY_LAYER = Object.fromEntries(SYSTEM_ORDER.flatMap(system => system.layers.map(layerName => [layerName, system])));
const SYSTEM_DISTANCE = {
  scale: (LAYER_CONFIG.SCREW.distance + LAYER_CONFIG.SCALE.distance + LAYER_CONFIG.SCALEBRACKET.distance) / 3,
  bone: (LAYER_CONFIG.BONE2.distance + LAYER_CONFIG.BONE1.distance + LAYER_CONFIG.BONEBRACKET.distance) / 3,
  building: 0,
};
const EXPLODE_DIR = new THREE.Vector3(0, 0, 1);
const EXPLODE_DURATION = 650;
const INSTALL_DURATION = 2080;
const INSTALL_STEP_DELAY = 360;
const REST_INSTALL_DURATION = INSTALL_DURATION / 0.85;
const REST_INSTALL_STEP_DELAY = INSTALL_STEP_DELAY / 0.85;
const SUBFRAME_INSTALL_DURATION = INSTALL_DURATION / (1.44 * 1.5 * 1.5 * 1.35 * 1.7);
const SUBFRAME_INSTALL_STEP_DELAY = (((INSTALL_DURATION / 1.44) * 0.21) / 1.35) / 1.7;
const BUILDING_INTERACTION_SCALE = 0.52;
const HIT_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

function printGltfHierarchy(node, depth = 0) {
  const flags = [];
  if (node.isMesh) flags.push("mesh");
  if (node.children.length) flags.push(`children:${node.children.length}`);
  console.log(`${"  ".repeat(depth)}- ${node.name || "(unnamed)"}${flags.length ? ` [${flags.join(", ")}]` : ""}`);
  node.children.forEach(child => printGltfHierarchy(child, depth + 1));
}

function cleanEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

function softEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function startTween(track, target, duration, delay = 0, ease = cleanEase) {
  track.start = track.current;
  track.target = target;
  track.startedAt = performance.now() + delay;
  track.duration = duration;
  track.ease = ease;
}

function updateTween(track, now) {
  if (track.current === track.target) return;
  if (now < track.startedAt) return;
  const t = Math.min(1, (now - track.startedAt) / track.duration);
  const eased = (track.ease || cleanEase)(t);
  track.current = track.start + (track.target - track.start) * eased;
  if (t >= 1) track.current = track.target;
}

function collectMeshes(root) {
  const meshes = [];
  root.traverse(node => {
    if (node.isMesh && !node.userData.isHitArea) meshes.push(node);
  });
  return meshes;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createSpeckleTexture({
  base,
  accent,
  seed,
  repeat = [1, 1],
  count = 1200,
  trowel = false,
  grain = false,
  colorSpace = true,
  opacityScale = 1,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const random = seededRandom(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;

  for (let i = 0; i < count; i += 1) {
    ctx.globalAlpha = (0.025 + random() * 0.11) * opacityScale;
    const size = 0.35 + random() * 2.1;
    ctx.fillRect(random() * canvas.width, random() * canvas.height, size, size);
  }

  if (trowel) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 34; i += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const radius = 18 + random() * 72;
      ctx.globalAlpha = (0.018 + random() * 0.052) * opacityScale;
      ctx.lineWidth = 5 + random() * 18;
      ctx.beginPath();
      ctx.arc(x, y, radius, random() * Math.PI, random() * Math.PI + Math.PI * 0.85);
      ctx.stroke();
    }
  }

  if (grain) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 130; i += 1) {
      const y = random() * canvas.height;
      const wave = 1 + random() * 4;
      ctx.globalAlpha = (0.025 + random() * 0.08) * opacityScale;
      ctx.lineWidth = 0.3 + random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(64, y + wave, 190, y - wave, 256, y + random() * 2);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPerforationAlphaTexture({
  seed = 97,
  spacingScale = 1,
  radiusScale = 1,
  variationMode = "plain",
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const random = seededRandom(seed);

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";

  const spacing = 7.6 * spacingScale;
  const radius = 2.9 * radiusScale;
  const centerX = 0.44 + random() * 0.22;
  const centerY = 0.02 + random() * 0.18;
  const bandAngle = random() * Math.PI;
  const bandCenter = -0.08 + random() * 0.16;
  for (let y = -spacing; y < canvas.height + spacing; y += spacing) {
    const row = Math.round(y / spacing);
    const xOffset = row % 2 === 0 ? 0 : spacing * 0.5;
    for (let x = -spacing; x < canvas.width + spacing; x += spacing) {
      const u = (x + xOffset) / canvas.width;
      const v = y / canvas.height;
      const dx = u - centerX;
      const dy = v - centerY;
      const fan = THREE.MathUtils.clamp(1.32 - Math.sqrt(dx * dx + dy * dy) * 1.18, 0.68, 1.3);
      const wave = 0.94 + 0.18 * Math.sin((u * 4.5 + v * 6.2 + random() * 0.15) * Math.PI);
      const band = THREE.MathUtils.clamp(
        1.22 - Math.abs((u - 0.5) * Math.cos(bandAngle) + (v - 0.5) * Math.sin(bandAngle) - bandCenter) * 3.2,
        0.72,
        1.24
      );
      const modeScale = variationMode === "fan"
        ? fan
        : variationMode === "wave"
          ? Math.min(wave, 1.08)
          : variationMode === "band"
            ? Math.min(band, 1.1)
            : variationMode === "sparse-corner"
              ? THREE.MathUtils.clamp(0.66 + (u + v) * 0.28, 0.66, 1.08)
              : 1;
      ctx.beginPath();
      ctx.arc(x + xOffset, y, radius * modeScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

const MATERIAL_TEXTURES = {
  concrete: createSpeckleTexture({
    base: "#747776",
    accent: "#373d3d",
    seed: 41,
    repeat: [3.67, 1.835],
    count: 1700,
    trowel: true,
    opacityScale: 0.5,
  }),
  concreteRoughness: createSpeckleTexture({
    base: "#9a9a9a",
    accent: "#343434",
    seed: 43,
    repeat: [3.67, 1.835],
    count: 1700,
    trowel: true,
    colorSpace: false,
    opacityScale: 0.5,
  }),
  bone: createSpeckleTexture({
    base: "#f0eee8",
    accent: "#b9b2a7",
    seed: 71,
    repeat: [2.2, 2.2],
    count: 680,
  }),
  boneRoughness: createSpeckleTexture({
    base: "#d1d1d1",
    accent: "#6f6d68",
    seed: 73,
    repeat: [2.2, 2.2],
    count: 680,
    colorSpace: false,
  }),
  aluminum: createSpeckleTexture({
    base: "#d6d8d7",
    accent: "#8e9697",
    seed: 81,
    repeat: [1, 8],
    count: 900,
    grain: true,
    opacityScale: 0.72,
  }),
  aluminumRoughness: createSpeckleTexture({
    base: "#bdbdbd",
    accent: "#6d7374",
    seed: 83,
    repeat: [1, 8],
    count: 900,
    grain: true,
    colorSpace: false,
    opacityScale: 0.72,
  }),
  perforationAlpha: createPerforationAlphaTexture(),
};

function isLargeBuildingSlab(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.isEmpty()) return false;
  const size = box.getSize(new THREE.Vector3());
  const sorted = [size.x, size.y, size.z].sort((a, b) => b - a);
  return sorted[0] * sorted[1] > 100 && sorted[2] < 1.25;
}

function createPerforatedAluminumMaterial(options = {}) {
  const perforationAlpha = createPerforationAlphaTexture({
    seed: options.seed,
    spacingScale: options.spacingScale,
    radiusScale: options.radiusScale,
    variationMode: options.variationMode,
  });

  return new THREE.MeshStandardMaterial({
    color: 0xd8dbda,
    map: MATERIAL_TEXTURES.aluminum,
    roughnessMap: MATERIAL_TEXTURES.aluminumRoughness,
    bumpMap: MATERIAL_TEXTURES.aluminumRoughness,
    bumpScale: 0.004,
    metalness: 0.46,
    roughness: 0.66,
    alphaMap: perforationAlpha,
    alphaTest: 0.62,
    side: THREE.DoubleSide,
  });
}

function createLayerMaterial(layerName, mesh) {
  if (layerName === "BUILDNG") {
    if (!isLargeBuildingSlab(mesh)) {
      return new THREE.MeshStandardMaterial({
        color: 0x747776,
        roughness: 0.92,
        metalness: 0,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: MATERIAL_TEXTURES.concrete,
      roughnessMap: MATERIAL_TEXTURES.concreteRoughness,
      bumpMap: MATERIAL_TEXTURES.concreteRoughness,
      bumpScale: 0.055,
      roughness: 0.96,
      metalness: 0,
    });
  }

  if (layerName === "SCALE") {
    return createPerforatedAluminumMaterial();
  }

  if (layerName === "BONE1" || layerName === "BONE2") {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: MATERIAL_TEXTURES.bone,
      roughnessMap: MATERIAL_TEXTURES.boneRoughness,
      bumpMap: MATERIAL_TEXTURES.boneRoughness,
      bumpScale: 0.012,
      roughness: 0.86,
      metalness: 0,
    });
  }

  if (layerName === "SCREW" || layerName.includes("BRACKET")) {
    return new THREE.MeshStandardMaterial({
      color: 0x3f4648,
      roughness: 0.74,
      metalness: 0.48,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: 0xd8d6cf,
    roughness: 0.78,
    metalness: 0,
  });
}

function createHitBox(object, parent, userData, pad, scaleFactor = 1) {
  const bbox = new THREE.Box3().setFromObject(object);
  if (bbox.isEmpty()) return null;

  bbox.expandByScalar(pad);
  const size = bbox.getSize(new THREE.Vector3());
  size.multiplyScalar(scaleFactor);
  const center = bbox.getCenter(new THREE.Vector3());
  const hitBox = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), HIT_MAT);
  hitBox.userData = { ...userData, isHitArea: true };
  hitBox.position.copy(parent.worldToLocal(center.clone()));
  parent.add(hitBox);
  return hitBox;
}

function setMeshesHighlighted(meshes, active) {
  meshes.forEach(mesh => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(material => {
      if (!material?.emissive) return;
      material.emissive.setHex(active ? 0xf4d28d : 0x000000);
      material.emissiveIntensity = active ? 0.22 : 0;
    });
  });
}

function applyLayerMaterial(mesh, layerName, options) {
  if (layerName === "SCALE") {
    mesh.material = createPerforatedAluminumMaterial(options);
    return;
  }

  mesh.material = createLayerMaterial(layerName, mesh);
}

function systemKey(systemId) {
  return `${SYSTEM_KEY_PREFIX}${systemId}`;
}

function getStageDistance(layerName, stage) {
  if (stage <= 0) return 0;
  if (stage >= 2) return LAYER_CONFIG[layerName]?.distance || 0;
  const system = SYSTEM_BY_LAYER[layerName];
  return system ? SYSTEM_DISTANCE[system.id] : 0;
}

export default function BonesScalesDetailViewer({ onClose }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    renderer: null,
    camera: null,
    controls: null,
    scene: null,
    motionItems: [],
    hoverTargets: [],
    clickTargets: [],
    highlightGroups: {},
    hoverKey: null,
    modelScale: 1,
    raf: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  });
  const [explodeStage, setExplodeStage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [hoverLayer, setHoverLayer] = useState(null);
  const [label, setLabel] = useState(null);
  const exploded = explodeStage > 0;

  const setActiveHover = nextLayer => {
    const s = stateRef.current;
    if (s.hoverKey === nextLayer) return;
    if (s.hoverKey && s.highlightGroups[s.hoverKey]) {
      setMeshesHighlighted(s.highlightGroups[s.hoverKey], false);
    }
    if (nextLayer && s.highlightGroups[nextLayer]) {
      setMeshesHighlighted(s.highlightGroups[nextLayer], true);
    }
    s.hoverKey = nextLayer;
    setHoverLayer(nextLayer);
  };

  const updatePointer = (e, targets) => {
    const s = stateRef.current;
    const rect = mountRef.current.getBoundingClientRect();
    s.mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    s.raycaster.setFromCamera(s.mouse, s.camera);
    return { rect, hits: s.raycaster.intersectObjects(targets, false) };
  };

  const explodeToStage = nextStage => {
    const s = stateRef.current;
    s.motionItems.forEach(item => {
      startTween(item.track, getStageDistance(item.layerName, nextStage), EXPLODE_DURATION);
    });
    setExplodeStage(nextStage);
    setActiveHover(null);
    setLabel(null);
  };

  const installAll = () => {
    const s = stateRef.current;
    let delayCursor = 0;
    let latestRestFinish = 0;

    INSTALL_ORDER.forEach(layerName => {
      const layerItems = s.motionItems.filter(item => item.layerName === layerName);
      if (!layerItems.length) return;

      if (layerName === "SCALEBRACKET") {
        const finishGap = Math.max(latestRestFinish - delayCursor, 0);
        const startDelay = delayCursor + finishGap * 0.35;
        const sortedSubframe = [...layerItems].sort((a, b) => {
          const xDiff = b.installCenter.x - a.installCenter.x;
          if (Math.abs(xDiff) > 0.01) return xDiff;
          return b.installCenter.y - a.installCenter.y;
        });
        sortedSubframe.forEach((item, index) => {
          startTween(item.track, 0, SUBFRAME_INSTALL_DURATION, startDelay + index * SUBFRAME_INSTALL_STEP_DELAY, softEase);
        });
        delayCursor = startDelay + sortedSubframe.length * SUBFRAME_INSTALL_STEP_DELAY;
        return;
      }

      layerItems.forEach(item => startTween(item.track, 0, REST_INSTALL_DURATION, delayCursor));
      latestRestFinish = Math.max(latestRestFinish, delayCursor + REST_INSTALL_DURATION);
      delayCursor += REST_INSTALL_STEP_DELAY;
    });

    setExplodeStage(0);
    setActiveHover(null);
    setLabel(null);
  };

  const toggleExplode = () => {
    if (explodeStage === 0) {
      explodeToStage(1);
      return;
    }
    if (explodeStage === 1) {
      explodeToStage(2);
      return;
    }
    installAll();
  };

  useEffect(() => {
    const mount = mountRef.current;
    const s = stateRef.current;
    let alive = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.domElement.style.filter = "contrast(1.18)";
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f7f4);
    s.scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.72;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe7dcc7, 0.62));
    const sun = new THREE.DirectionalLight(0xfff3dc, 1.7);
    sun.position.set(10, 18, 8);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd8ecff, 0.32);
    fill.position.set(-8, 6, -10);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);
    s.camera = camera;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    s.controls = controls;

    const loader = new GLTFLoader();
    loader.load(MODEL_URL, gltf => {
      if (!alive) return;

      const model = gltf.scene;
      console.groupCollapsed("Bones and Scales GLTF hierarchy");
      printGltfHierarchy(model);
      console.groupEnd();

      const bbox = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      model.position.sub(center);
      scene.add(model);
      model.updateMatrixWorld(true);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const hitPad = Math.max(maxDim * 0.01, 0.04);
      const motionItems = [];
      const hoverTargets = [];
      const clickTargets = [];
      const highlightGroups = {};
      const layerMeshesByName = {};
      const foundLayers = [];

      model.children.forEach(topLayer => {
        const layerName = topLayer.name;
        const config = LAYER_CONFIG[layerName];
        if (!config) return;

        foundLayers.push(layerName);
        topLayer.userData.layerName = layerName;

        const layerMeshes = collectMeshes(topLayer);
        layerMeshesByName[layerName] = layerMeshes;
        highlightGroups[layerName] = layerMeshes;
        const scaleVariationRandom = seededRandom(193);
        const variationModes = ["fan", "wave", "band", "sparse-corner"];
        layerMeshes.forEach((mesh, meshIndex) => {
          const useScaleVariation = layerName === "SCALE" && scaleVariationRandom() < 0.72;
          const variationMode = variationModes[meshIndex % variationModes.length];
          applyLayerMaterial(mesh, layerName, layerName === "SCALE" ? {
            seed: 311 + meshIndex * 47,
            spacingScale: useScaleVariation ? 0.86 + scaleVariationRandom() * 0.22 : 0.94,
            radiusScale: useScaleVariation ? 0.9 + scaleVariationRandom() * 0.2 : 1.02,
            variationMode: useScaleVariation ? variationMode : "plain",
          } : undefined);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.topLayerName = layerName;
        });
        hoverTargets.push(...layerMeshes);

        if (config.distance > 0) {
          if (layerName === "SCALEBRACKET") {
            layerMeshes.forEach(mesh => {
              const installCenter = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
              motionItems.push({
                object: mesh,
                localOrigin: mesh.position.clone(),
                dir: EXPLODE_DIR.clone(),
                layerName,
                installCenter,
                track: { current: 0, start: 0, target: 0, startedAt: 0, duration: EXPLODE_DURATION },
              });
            });
          } else {
            const installCenter = new THREE.Box3().setFromObject(topLayer).getCenter(new THREE.Vector3());
            motionItems.push({
              object: topLayer,
              localOrigin: topLayer.position.clone(),
              dir: EXPLODE_DIR.clone(),
              layerName,
              installCenter,
              track: { current: 0, start: 0, target: 0, startedAt: 0, duration: EXPLODE_DURATION },
            });
          }
        }

        const hitBox = createHitBox(topLayer, topLayer, {
          topLayerName: layerName,
          label: config.label,
        }, hitPad, layerName === "BUILDNG" ? BUILDING_INTERACTION_SCALE : 0.86);
        if (hitBox) clickTargets.push(hitBox);
      });

      SYSTEM_ORDER.forEach(system => {
        highlightGroups[systemKey(system.id)] = system.layers.flatMap(layerName => layerMeshesByName[layerName] || []);
      });

      s.motionItems = motionItems;
      s.hoverTargets = hoverTargets;
      s.clickTargets = clickTargets;
      s.highlightGroups = highlightGroups;
      s.modelScale = maxDim;

      console.log(
        "Bones and Scales layer-driven viewer:",
        "foundLayers",
        foundLayers,
        "motionItems",
        motionItems.map(item => item.layerName),
        "hoverTargets",
        hoverTargets.length,
        "clickTargets",
        clickTargets.length,
        "modelScale",
        maxDim.toFixed(2)
      );

      camera.position.set(maxDim * 0.85, maxDim * 0.52, maxDim * 1.45);
      controls.target.set(0, 0, 0);
      controls.update();

      setLoading(false);
    }, undefined, err => {
      console.error("Bones and Scales GLB error:", err);
      setLoadError("Model could not be loaded");
      setLoading(false);
    });

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    onResize();
    window.addEventListener("resize", onResize);

    const animate = now => {
      s.raf = requestAnimationFrame(animate);
      s.motionItems.forEach(item => updateTween(item.track, now));

      const scale = s.modelScale || 1;
      s.motionItems.forEach(({ object, localOrigin, dir, track }) => {
        const dist = scale * track.current;
        object.position.set(
          localOrigin.x + dir.x * dist,
          localOrigin.y + dir.y * dist,
          localOrigin.z + dir.z * dist
        );
      });

      s.controls.update();
      renderer.render(scene, s.camera);
    };
    s.raf = requestAnimationFrame(animate);

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(s.raf);
      scene.clear();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  const onMouseMove = e => {
    const s = stateRef.current;
    if (!s.renderer || !s.hoverTargets.length) return;
    const { rect, hits } = updatePointer(e, s.hoverTargets);

    if (hits.length) {
      const layerName = hits[0].object.userData.topLayerName;
      setActiveHover(layerName);
      setLabel({
        name: LAYER_LABELS[layerName] || layerName,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      return;
    }

    setActiveHover(null);
    setLabel(null);
  };

  const onCanvasClick = e => {
    const s = stateRef.current;
    if (loading || loadError || !s.renderer || !s.clickTargets.length) return;
    const { hits } = updatePointer(e, s.clickTargets);
    if (hits.length) toggleExplode();
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#f8f7f4" }}>
      <div
        ref={mountRef}
        style={{ width: "100%", height: "100%" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          setActiveHover(null);
          setLabel(null);
        }}
        onClick={onCanvasClick}
      />

      <div style={{
        position: "absolute",
        left: 18,
        top: 64,
        width: "min(330px, 42vw)",
        maxHeight: "calc(100% - 140px)",
        overflowY: "auto",
        padding: "0.35rem 0",
        background: "rgba(248,247,244,0.66)",
        borderLeft: `1px solid rgba(196,166,110,0.42)`,
        backdropFilter: "blur(10px)",
        zIndex: 8,
      }}>
        {SYSTEM_ORDER.map((system, systemIndex) => {
          const key = systemKey(system.id);
          const active = hoverLayer === key;
          return (
            <div key={system.id} style={{ padding: "0.1rem 0" }}>
              <button
                onMouseEnter={() => setActiveHover(key)}
                onMouseLeave={() => setActiveHover(null)}
                style={{
                  width: "100%",
                  border: "none",
                  borderLeft: active ? `2px solid ${C_GOLD}` : "2px solid transparent",
                  background: active ? "rgba(196,166,110,0.12)" : "transparent",
                  color: active ? "#080807" : "rgba(8,8,7,0.72)",
                  cursor: "default",
                  fontFamily: F,
                  fontSize: "0.62rem",
                  letterSpacing: "0.16em",
                  lineHeight: 1.35,
                  textAlign: "left",
                  textTransform: "uppercase",
                  padding: "0.48rem 0.62rem",
                  transition: "background .2s, color .2s, border-color .2s",
                }}
              >
                <span style={{ color: C_GOLD, marginRight: "0.55rem" }}>
                  {String(systemIndex + 1).padStart(2, "0")}
                </span>
                {system.label}
              </button>

              {explodeStage >= 1 && (
                <div style={{ padding: "0.02rem 0 0.35rem 0.85rem" }}>
                  {system.layers.map(layerName => {
                    const layerActive = hoverLayer === layerName;
                    return (
                      <button
                        key={layerName}
                        onMouseEnter={() => setActiveHover(layerName)}
                        onMouseLeave={() => setActiveHover(null)}
                        style={{
                          display: "block",
                          width: "100%",
                          border: "none",
                          background: layerActive ? "rgba(8,8,7,0.045)" : "transparent",
                          color: layerActive ? "#080807" : "rgba(8,8,7,0.52)",
                          cursor: "default",
                          fontFamily: F,
                          fontSize: "0.52rem",
                          letterSpacing: "0.08em",
                          lineHeight: 1.35,
                          textAlign: "left",
                          textTransform: "uppercase",
                          padding: "0.28rem 0.5rem",
                          transition: "background .2s, color .2s",
                        }}
                      >
                        {LAYER_LABELS[layerName] || layerName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(loading || loadError) && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(248,247,244,0.95)",
          zIndex: 12,
        }}>
          <div style={{
            width: 40,
            height: 2,
            background: C_GOLD,
            marginBottom: "1rem",
            animation: loading ? "pulse 1.2s ease-in-out infinite" : "none",
          }}/>
          <span style={{
            fontFamily: F,
            fontSize: "0.68rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.4)",
          }}>{loadError || "Loading model"}</span>
          <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
        </div>
      )}

      {label && (
        <div style={{
          position: "absolute",
          left: label.x + 14,
          top: label.y - 8,
          background: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(21,21,21,0.08)",
          padding: "0.34rem 0.52rem",
          pointerEvents: "none",
          zIndex: 10,
          backdropFilter: "blur(7px)",
        }}>
          <p style={{
            fontFamily: F,
            fontSize: "0.46rem",
            fontWeight: 400,
            color: "rgba(21,21,21,0.7)",
            margin: 0,
            lineHeight: 1.25,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>{label.name}</p>
        </div>
      )}

      <div style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9,
      }}>
        <button onClick={toggleExplode} disabled={loading || Boolean(loadError)} style={{
          background: exploded ? C_GOLD : "rgba(8,8,7,0.82)",
          border: `1px solid ${C_GOLD}`,
          color: exploded ? "#080807" : C_GOLD,
          fontFamily: F,
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          width: 168,
          height: 38,
          cursor: loading || loadError ? "not-allowed" : "pointer",
          opacity: loading || loadError ? 0.36 : 1,
          transition: "all .3s",
          backdropFilter: "blur(8px)",
        }}>
          {explodeStage === 0 ? "Explode View" : explodeStage === 1 ? "Explode Details" : "Install"}
        </button>
      </div>

      <div style={{
        position: "absolute",
        top: 14,
        right: 16,
        fontFamily: F,
        fontSize: "0.56rem",
        letterSpacing: "0.14em",
        color: "rgba(0,0,0,0.3)",
        textTransform: "uppercase",
        lineHeight: 1.6,
        textAlign: "right",
      }}>
        Drag to rotate<br/>Scroll to zoom<br/>{explodeStage === 0 ? "Click model to explode systems" : explodeStage === 1 ? "Click model to explode details" : "Click model to install"}<br/>Layer-driven
      </div>

      {onClose && (
        <button onClick={onClose} style={{
          position: "absolute",
          top: 14,
          left: 14,
          background: "none",
          border: "1px solid rgba(0,0,0,0.15)",
          color: "rgba(0,0,0,0.5)",
          fontFamily: F,
          fontSize: "0.62rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          padding: "5px 12px",
          cursor: "pointer",
          zIndex: 9,
        }}>
          Back
        </button>
      )}
    </div>
  );
}
