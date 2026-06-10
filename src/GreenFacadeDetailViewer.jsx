import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GREEN_FACADE_MODEL_URL } from "./modelUrls";

const MODEL_URL = GREEN_FACADE_MODEL_URL;
const C_GOLD = "#a6844b";
const F = "'Jost', sans-serif";
const EXPLODE_DURATION = 720;
const DETAIL_DISTANCE_SCALE = 0.064;
const SYSTEM_KEY_PREFIX = "system:";

const SYSTEMS = [
  {
    layer: "GREENFACADE",
    label: "GREENFACADE SYSTEM",
    stageOne: { dir: new THREE.Vector3(0, 0, 1), distance: 0.442 },
    components: [
      { id: "green-planting", label: "PLANTS + SOIL + WATERPROOFING MEMBRANE", layers: ["green", "soil", "vaperbarrier"] },
      { id: "green-concrete", label: "3D-PRINTED UHPC FACADE MODULES", layers: ["greenconcrete"] },
      { id: "green-plate-hook", label: "POCKET PLATE + VERTICAL SLOTTED HOOK HANGER", layers: ["greenplateandhold", "hookandslot"] },
      { id: "green-bracket", label: "GREEN FACADE BRACKET", layers: ["facadebracket"] },
    ],
  },
  {
    layer: "CORRIDOR",
    label: "CORRIDOR",
    stageOne: { dir: new THREE.Vector3(0, 0, 1), distance: 0.22 },
    components: [
      { id: "corridor-handrail", label: "HANDRAIL", layers: ["handrill"] },
      { id: "corridor-finish", label: "CORRIDOR FLOOR FINISH", layers: ["corridorfinish"] },
      { id: "corridor-slab", label: "CLT ROOF SLAB", layers: ["corridorslab"] },
      { id: "corridor-beam", label: "TIMBER BEAM", layers: ["corridorbeam"] },
    ],
  },
  {
    layer: "SPANDREALENV",
    label: "SPANDREAL GLASS ENVELOPE",
    stageOne: { dir: new THREE.Vector3(0, 0, 0), distance: 0 },
    components: [
      { id: "spandrel-insulation", label: "INSULATION AND CONNECTION", layers: ["insulandconnection"] },
      { id: "spandrel-finish", label: "EXTERIOR WALL FINISH", layers: ["ENV1finish"] },
      { id: "spandrel-frame", label: "SPANDREL WINDOW FRAME", layers: ["windowframe"] },
      { id: "spandrel-glazing", label: "HIGH PERFORMANCE GLAZING", layers: ["glazing"] },
    ],
  },
  {
    layer: "BUILDING",
    label: "BUILDING",
    stageOne: { dir: new THREE.Vector3(0, 0, 0), distance: 0 },
    components: [
      { id: "building-roof", label: "CLT ROOF SLAB", layers: ["roof"] },
      { id: "building-floor", label: "INTERIOR FLOOR FINISH", layers: ["floorfinish"] },
      { id: "building-structure", label: "CLT BEAM", layers: ["buildingstructure"] },
    ],
  },
];

const SYSTEM_BY_LAYER = Object.fromEntries(SYSTEMS.map(system => [system.layer, system]));
const COMPONENTS = SYSTEMS.flatMap(system => system.components.map(component => ({
  ...component,
  systemLayer: system.layer,
})));
const COMPONENT_BY_LAYER = Object.fromEntries(
  COMPONENTS.flatMap(component => component.layers.map(layer => [layer, component]))
);

const HIT_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

function systemKey(layerName) {
  return `${SYSTEM_KEY_PREFIX}${layerName}`;
}

function cleanEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

function startTween(track, target, duration) {
  track.start = track.current;
  track.target = target;
  track.startedAt = performance.now();
  track.duration = duration;
}

function updateTween(track, now) {
  if (track.current === track.target) return;
  const t = Math.min(1, (now - track.startedAt) / track.duration);
  const eased = cleanEase(t);
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

function createTexture({ base, accent, seed, repeat = [1, 1], count = 900, grain = false, bands = false, trowel = false }) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const random = seededRandom(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (bands) {
    ctx.strokeStyle = accent;
    for (let y = 8; y < canvas.height; y += 10 + random() * 2.5) {
      ctx.globalAlpha = 0.08 + random() * 0.08;
      ctx.lineWidth = 1 + random() * 1.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(56, y + random() * 2, 178, y - random() * 2, 256, y + random() * 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = accent;
  for (let i = 0; i < count; i += 1) {
    ctx.globalAlpha = 0.025 + random() * 0.12;
    const size = 0.35 + random() * 2.1;
    ctx.fillRect(random() * canvas.width, random() * canvas.height, size, size);
  }

  if (grain) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 120; i += 1) {
      const y = random() * canvas.height;
      ctx.globalAlpha = 0.035 + random() * 0.09;
      ctx.lineWidth = 0.35 + random() * 0.9;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(64, y + random() * 4, 182, y - random() * 4, 256, y + random() * 2);
      ctx.stroke();
    }
  }

  if (trowel) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 42; i += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const radius = 18 + random() * 70;
      ctx.globalAlpha = 0.02 + random() * 0.055;
      ctx.lineWidth = 5 + random() * 16;
      ctx.beginPath();
      ctx.arc(x, y, radius, random() * Math.PI, random() * Math.PI + Math.PI * 0.8);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const TEXTURES = {};

function getTexture(name) {
  if (TEXTURES[name]) return TEXTURES[name];
  if (name === "printedConcrete") {
    TEXTURES[name] = createTexture({
      base: "#c7c8c3",
      accent: "#545853",
      seed: 503,
      repeat: [6.2, 4.2],
      count: 6250,
      bands: true,
    });
  } else if (name === "microcement") {
    TEXTURES[name] = createTexture({
      base: "#c9cccd",
      accent: "#697378",
      seed: 53,
      repeat: [1.4, 0.7],
      count: 550,
      trowel: true,
    });
  } else if (name === "wood") {
    TEXTURES[name] = createTexture({
      base: "#cbb9a6",
      accent: "#725a43",
      seed: 13,
      repeat: [1.2, 5.5],
      count: 620,
      grain: true,
    });
  } else if (name === "soil") {
    TEXTURES[name] = createTexture({
      base: "#7b6445",
      accent: "#3d2c1d",
      seed: 829,
      repeat: [3, 3],
      count: 2200,
    });
  }
  return TEXTURES[name];
}

function printGltfHierarchy(node, depth = 0) {
  const flags = [];
  if (node.isMesh) flags.push("mesh");
  if (node.children.length) flags.push(`children:${node.children.length}`);
  console.log(`${"  ".repeat(depth)}- ${node.name || "(unnamed)"}${flags.length ? ` [${flags.join(", ")}]` : ""}`);
  node.children.forEach(child => printGltfHierarchy(child, depth + 1));
}

function createLayerMaterial(layerName) {
  if (layerName === "green") {
    return new THREE.MeshStandardMaterial({
      color: 0x426d38,
      roughness: 0.78,
      metalness: 0,
      emissive: 0x0f270c,
      emissiveIntensity: 0.06,
      side: THREE.DoubleSide,
    });
  }

  if (layerName === "soil") {
    return new THREE.MeshStandardMaterial({
      color: 0x8a7351,
      map: getTexture("soil"),
      roughness: 0.92,
      metalness: 0,
    });
  }

  if (layerName === "vaperbarrier") {
    return new THREE.MeshStandardMaterial({ color: 0xdbd8cf, roughness: 0.82, metalness: 0 });
  }

  if (layerName === "greenconcrete") {
    return new THREE.MeshStandardMaterial({
      color: 0xc4c4bc,
      map: getTexture("printedConcrete"),
      roughness: 0.93,
      metalness: 0,
    });
  }

  if (layerName === "corridorbeam" || layerName === "corridorslab" || layerName === "buildingstructure" || layerName === "roof") {
    return new THREE.MeshStandardMaterial({
      color: 0xcbb9a6,
      map: getTexture("wood"),
      roughness: 0.78,
      metalness: 0,
    });
  }

  if (layerName === "corridorfinish" || layerName === "floorfinish") {
    return new THREE.MeshStandardMaterial({
      color: 0xd8d3c7,
      map: getTexture("microcement"),
      roughness: 0.86,
      metalness: 0,
    });
  }

  if (layerName.includes("bracket") || layerName === "hookandslot" || layerName === "windowframe" || layerName === "handrill") {
    return new THREE.MeshStandardMaterial({ color: 0x8e938e, roughness: 0.5, metalness: 0.35 });
  }

  if (layerName === "glazing") {
    return new THREE.MeshPhysicalMaterial({
      color: 0xd8edf0,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.28,
      transparent: true,
      opacity: 0.42,
      clearcoat: 0.35,
    });
  }

  if (layerName === "greenplateandhold") {
    return new THREE.MeshStandardMaterial({ color: 0xd0cec2, roughness: 0.62, metalness: 0.18 });
  }

  if (layerName.includes("finish") || layerName === "roof" || layerName === "floorfinish") {
    return new THREE.MeshStandardMaterial({ color: 0xdedbd1, roughness: 0.74, metalness: 0 });
  }

  return new THREE.MeshStandardMaterial({ color: 0xc9c6ba, roughness: 0.78, metalness: 0 });
}

function createHitBox(objects, parent, userData, pad, scaleFactor = 1) {
  const bbox = new THREE.Box3();
  objects.forEach(object => bbox.union(new THREE.Box3().setFromObject(object)));
  if (bbox.isEmpty()) return null;

  bbox.expandByScalar(pad);
  const size = bbox.getSize(new THREE.Vector3()).multiplyScalar(scaleFactor);
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
      material.emissive.setHex(active ? 0xe4c779 : 0x000000);
      material.emissiveIntensity = active ? 0.26 : 0;
    });
  });
}

function disposeObject(root) {
  root.traverse(node => {
    if (!node.isMesh) return;
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(material => material?.dispose?.());
  });
}

function getDetailOffset(systemLayer, childLayer) {
  if (systemLayer === "BUILDING" || systemLayer === "SPANDREALENV") {
    return new THREE.Vector3(0, 0, 0);
  }

  if (systemLayer === "CORRIDOR") {
    const offsets = {
      handrill: 0.75,
      corridorfinish: 0.25,
      corridorslab: 0,
      corridorbeam: -0.75,
    };
    return new THREE.Vector3(0, offsets[childLayer] ?? 0, 0);
  }

  if (systemLayer === "GREENFACADE") {
    const offsets = {
      greenconcrete: new THREE.Vector3(0, 0, 0),
      green: new THREE.Vector3(0, 0.84, 0),
      soil: new THREE.Vector3(0, 0.84, 0),
      vaperbarrier: new THREE.Vector3(0, 0.84, 0),
      greenplateandhold: new THREE.Vector3(0, 0, -0.7),
      hookandslot: new THREE.Vector3(0, 0, -0.7),
      facadebracket: new THREE.Vector3(0, 0, -1.4),
    };
    return offsets[childLayer]?.clone() || new THREE.Vector3(0, 0, 0);
  }

  return new THREE.Vector3(0, 0, 0);
}

export default function GreenFacadeDetailViewer({ onClose }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    renderer: null,
    camera: null,
    controls: null,
    scene: null,
    model: null,
    systemItems: [],
    detailItems: [],
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
  const [hoverKey, setHoverKey] = useState(null);
  const [label, setLabel] = useState(null);

  const setActiveHover = nextKey => {
    const s = stateRef.current;
    if (s.hoverKey === nextKey) return;
    if (s.hoverKey && s.highlightGroups[s.hoverKey]) {
      setMeshesHighlighted(s.highlightGroups[s.hoverKey], false);
    }
    if (nextKey && s.highlightGroups[nextKey]) {
      setMeshesHighlighted(s.highlightGroups[nextKey], true);
    }
    s.hoverKey = nextKey;
    setHoverKey(nextKey);
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
    s.systemItems.forEach(item => startTween(item.track, nextStage > 0 ? 1 : 0, EXPLODE_DURATION));
    s.detailItems.forEach(item => {
      const target = nextStage >= 2 ? 1 : 0;
      startTween(item.track, target, EXPLODE_DURATION);
    });
    setExplodeStage(nextStage);
    setActiveHover(null);
    setLabel(null);
  };

  const toggleExplode = () => {
    if (loading || loadError) return;
    if (explodeStage === 0) {
      explodeToStage(1);
      return;
    }
    if (explodeStage === 1) {
      explodeToStage(2);
      return;
    }
    explodeToStage(0);
  };

  useEffect(() => {
    const mount = mountRef.current;
    const s = stateRef.current;
    let alive = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.filter = "contrast(1.25)";
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    s.scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.92;
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xded8cc, 0.7));

    const key = new THREE.DirectionalLight(0xfff2dc, 0.48);
    key.position.set(5, 7, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xd8ecff, 0.24);
    fill.position.set(-8, 5, -6);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.22);
    rim.position.set(-4, 3, 8);
    scene.add(rim);

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
      s.model = model;
      console.groupCollapsed("Green Facade GLTF hierarchy");
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
      const systemItems = [];
      const detailItems = [];
      const hoverTargets = [];
      const clickTargets = [];
      const highlightGroups = {};
      const childLayersByName = {};
      const foundTopLayers = [];

      model.children.forEach(topLayer => {
        const system = SYSTEM_BY_LAYER[topLayer.name];
        if (!system) return;
        foundTopLayers.push(topLayer.name);

        const systemMeshes = collectMeshes(topLayer);
        highlightGroups[systemKey(topLayer.name)] = systemMeshes;
        if (system.stageOne.distance > 0) {
          systemItems.push({
            object: topLayer,
            localOrigin: topLayer.position.clone(),
            dir: system.stageOne.dir.clone(),
            distance: system.stageOne.distance,
            track: { current: 0, start: 0, target: 0, startedAt: 0, duration: EXPLODE_DURATION },
          });
        }

        topLayer.children.forEach(childLayer => {
          const childLayerName = childLayer.name;
          const component = COMPONENT_BY_LAYER[childLayerName];
          if (!component) return;
          childLayersByName[childLayerName] = childLayer;

          const meshes = collectMeshes(childLayer);
          meshes.forEach(mesh => {
            mesh.material = createLayerMaterial(childLayerName);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.userData.systemLayer = topLayer.name;
            mesh.userData.childLayerName = childLayerName;
            mesh.userData.componentId = component.id;
            mesh.userData.hoverKey = component.id;
          });

          const detailOffset = getDetailOffset(topLayer.name, childLayerName);
          if (detailOffset.lengthSq() > 0) {
            detailItems.push({
              object: childLayer,
              localOrigin: childLayer.position.clone(),
              offset: detailOffset,
              track: { current: 0, start: 0, target: 0, startedAt: 0, duration: EXPLODE_DURATION },
            });
          }
        });

        system.components.forEach(component => {
          const groupLayers = component.layers.map(layerName => childLayersByName[layerName]).filter(Boolean);
          const groupMeshes = groupLayers.flatMap(layer => collectMeshes(layer));
          if (!groupLayers.length || !groupMeshes.length) return;

          highlightGroups[component.id] = groupMeshes;
          const hitBox = createHitBox(groupLayers, topLayer, {
            hoverKey: component.id,
            label: component.label,
            systemLayer: topLayer.name,
          }, hitPad, topLayer.name === "BUILDING" || topLayer.name === "SPANDREALENV" ? 0.62 : 0.92);
          if (hitBox) {
            hoverTargets.push(hitBox);
            clickTargets.push(hitBox);
            const hitOffset = getDetailOffset(topLayer.name, component.layers[0]);
            if (hitOffset.lengthSq() > 0) {
              detailItems.push({
                object: hitBox,
                localOrigin: hitBox.position.clone(),
                offset: hitOffset,
                track: { current: 0, start: 0, target: 0, startedAt: 0, duration: EXPLODE_DURATION },
              });
            }
          }
        });

        const systemHitBox = createHitBox(topLayer.children, topLayer, {
          hoverKey: systemKey(topLayer.name),
          label: system.label,
          systemLayer: topLayer.name,
        }, hitPad, topLayer.name === "BUILDING" || topLayer.name === "SPANDREALENV" ? 0.5 : 0.9);
        if (systemHitBox) clickTargets.push(systemHitBox);
      });

      s.systemItems = systemItems;
      s.detailItems = detailItems;
      s.hoverTargets = hoverTargets;
      s.clickTargets = clickTargets;
      s.highlightGroups = highlightGroups;
      s.modelScale = maxDim;

      camera.position.set(maxDim * 0.78, maxDim * 0.5, maxDim * 1.28);
      controls.target.set(0, 0, 0);
      controls.update();

      console.log(
        "Green Facade layer-driven viewer:",
        "topLayers",
        foundTopLayers,
        "systemItems",
        systemItems.length,
        "detailItems",
        detailItems.length,
        "hoverTargets",
        hoverTargets.length,
        "modelScale",
        maxDim.toFixed(2)
      );

      setLoading(false);
    }, undefined, err => {
      console.error("Green Facade GLB error:", err);
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
      s.systemItems.forEach(item => updateTween(item.track, now));
      s.detailItems.forEach(item => updateTween(item.track, now));

      const scale = s.modelScale || 1;
      s.systemItems.forEach(({ object, localOrigin, dir, distance, track }) => {
        const dist = scale * distance * track.current;
        object.position.set(
          localOrigin.x + dir.x * dist,
          localOrigin.y + dir.y * dist,
          localOrigin.z + dir.z * dist
        );
      });

      s.detailItems.forEach(({ object, localOrigin, offset, track }) => {
        const dist = scale * DETAIL_DISTANCE_SCALE * track.current;
        object.position.set(
          localOrigin.x + offset.x * dist,
          localOrigin.y + offset.y * dist,
          localOrigin.z + offset.z * dist
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
      if (s.model) disposeObject(s.model);
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
      const target = hits[0].object.userData;
      setActiveHover(target.hoverKey);
      setLabel({
        name: target.label,
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
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#ffffff" }}>
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
        width: "min(350px, 42vw)",
        maxHeight: "calc(100% - 140px)",
        overflowY: "auto",
        padding: "0.35rem 0",
        background: "rgba(248,247,244,0.66)",
        borderLeft: `1px solid rgba(166,132,75,0.42)`,
        backdropFilter: "blur(10px)",
        zIndex: 8,
      }}>
        {SYSTEMS.map((system, systemIndex) => {
          const activeSystem = hoverKey === systemKey(system.layer);
          return (
            <div key={system.layer} style={{ padding: "0.1rem 0" }}>
              <button
                onMouseEnter={() => setActiveHover(systemKey(system.layer))}
                onMouseLeave={() => setActiveHover(null)}
                style={{
                  width: "100%",
                  border: "none",
                  borderLeft: activeSystem ? `2px solid ${C_GOLD}` : "2px solid transparent",
                  background: activeSystem ? "rgba(166,132,75,0.11)" : "transparent",
                  color: activeSystem ? "#12120f" : "rgba(18,18,15,0.72)",
                  cursor: "default",
                  fontFamily: F,
                  fontSize: "0.62rem",
                  letterSpacing: "0.16em",
                  lineHeight: 1.35,
                  textAlign: "left",
                  textTransform: "uppercase",
                  padding: "0.5rem 0.62rem",
                  transition: "background .2s, color .2s, border-color .2s",
                }}
              >
                <span style={{ color: C_GOLD, marginRight: "0.55rem" }}>
                  {String(systemIndex + 1).padStart(2, "0")}
                </span>
                {system.label}
              </button>

              {explodeStage >= 1 && (
                <div style={{ padding: "0.02rem 0 0.38rem 0.85rem" }}>
                  {system.components.map(component => {
                    const activeComponent = hoverKey === component.id;
                    return (
                      <button
                        key={component.id}
                        onMouseEnter={() => setActiveHover(component.id)}
                        onMouseLeave={() => setActiveHover(null)}
                        style={{
                          display: "block",
                          width: "100%",
                          border: "none",
                          background: activeComponent ? "rgba(18,18,15,0.045)" : "transparent",
                          color: activeComponent ? "#12120f" : "rgba(18,18,15,0.54)",
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
                        {component.label}
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
          background: "rgba(255,255,255,0.95)",
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
          background: "rgba(255,255,255,0.72)",
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
          background: explodeStage > 0 ? C_GOLD : "rgba(18,18,15,0.84)",
          border: `1px solid ${C_GOLD}`,
          color: explodeStage > 0 ? "#12120f" : C_GOLD,
          fontFamily: F,
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          width: 190,
          height: 38,
          cursor: loading || loadError ? "not-allowed" : "pointer",
          opacity: loading || loadError ? 0.36 : 1,
          transition: "all .3s",
          backdropFilter: "blur(8px)",
        }}>
          {explodeStage === 0 ? "Explode Systems" : explodeStage === 1 ? "Explode Details" : "Reset"}
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
        Drag to rotate<br/>Scroll to zoom<br/>{explodeStage === 0 ? "Click model to explode systems" : explodeStage === 1 ? "Click model to explode details" : "Click model to reset"}<br/>Layer-driven
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
