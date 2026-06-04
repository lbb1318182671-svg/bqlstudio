import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const TOP_LAYER_MOTION = {
  ENV1: { dir: new THREE.Vector3(-1, 0, 0), distance: 0.3 },
  ENV2: { dir: new THREE.Vector3(-1, 0, 0), distance: 0.75 },
  ROOF_UP: { dir: new THREE.Vector3(0, 1, 0), distance: 0.3 },
  BUILDING: { dir: new THREE.Vector3(0, 0, 0), distance: 0 },
};

const SYSTEM_ORDER = ["ROOF_UP", "ENV1", "ENV2", "BUILDING"];

const SYSTEM_LABELS = {
  ROOF_UP: "ROOF SYSTEM",
  ENV1: "CURTAIN WALL SYSTEM",
  ENV2: "POLYCARBONATE SYSTEM",
  BUILDING: "BUILDING SYSTEM",
};

const DETAIL_GROUPS = {
  ENV1: [
    {
      id: "env1_zinc_sill",
      layers: ["env1_mesh", "env1_flashing", "env1_seal"],
      name: "zinc sill flashing",
      dir: new THREE.Vector3(-1, 0, 0),
      distance: 0.187,
      url: null,
    },
    {
      id: "env1_sheathing",
      layers: ["env1_finish"],
      name: "plywood sheathing",
      dir: new THREE.Vector3(-1, 0, 0),
      distance: 0.121,
      url: null,
    },
    {
      id: "env1_battens",
      layers: ["env1_batten"],
      name: "timber battens",
      dir: new THREE.Vector3(-1, 0, 0),
      distance: 0.061,
      url: null,
    },
    {
      id: "env1_spacer",
      layers: ["env1_board"],
      name: "timber spacer",
      dir: new THREE.Vector3(0, 0, 0),
      distance: 0,
      url: null,
    },
    {
      id: "env1_insulation",
      layers: ["env1_insul"],
      name: "weather-resistive barrier + rigid insulation",
      dir: new THREE.Vector3(1, 0, 0),
      distance: 0.072,
      url: null,
    },
    {
      id: "env1_window",
      layers: ["env1_frame", "env1_windowseal", "env1_glazing"],
      name: "timber-framed double glazed window",
      dir: new THREE.Vector3(1, 0, 0),
      distance: 0.154,
      url: null,
    },
  ],
  ENV2: [
    {
      id: "env2_polycarbonate",
      layers: ["env2_pv"],
      name: "corrugated polycarbonate panel",
      dir: new THREE.Vector3(-1, 0, 0),
      distance: 0.22,
      url: null,
    },
    {
      id: "env2_bracket",
      layers: ["env2_bracket"],
      name: "light steel framing and mounting brackets",
      dir: new THREE.Vector3(0, 0, 0),
      distance: 0,
      url: null,
    },
    {
      id: "env2_walkway",
      layers: ["env2_mesh"],
      name: "aluminum mesh walkway",
      dir: new THREE.Vector3(0, 1, 0),
      distance: 0.1,
      url: null,
    },
  ],
  ROOF_UP: [
    {
      id: "roof_pv",
      layers: ["roof_panel"],
      name: "photovoltaic (PV) panel on tilt bracket",
      dir: new THREE.Vector3(0, 1, 0),
      distance: 0.23,
      url: null,
    },
    {
      id: "roof_clamp",
      layers: ["roof_bracket"],
      name: "standing seam clamp",
      dir: new THREE.Vector3(0, 1, 0),
      distance: 0.15,
      url: null,
    },
    {
      id: "roof_zinc_sheet",
      layers: ["roof_finish", "roof_water"],
      name: "zinc standing seam roof sheet + water collection system",
      dir: new THREE.Vector3(0, 1, 0),
      distance: 0.08,
      url: null,
    },
    {
      id: "roof_board",
      layers: ["roof_board"],
      name: "waterproofing membrane + plywood sheet",
      dir: new THREE.Vector3(0, 0, 0),
      distance: 0,
      url: null,
    },
    {
      id: "roof_insulation_batten",
      layers: ["roof_insul", "roof_batten"],
      name: "thermal insulation + wood batten",
      dir: new THREE.Vector3(0, -1, 0),
      distance: 0.09,
      url: null,
    },
    {
      id: "roof_slab",
      layers: ["roof_slab"],
      name: "6 inch cross-laminated timber",
      dir: new THREE.Vector3(0, -1, 0),
      distance: 0.18,
      url: null,
    },
  ],
  BUILDING: [
    { id: "building_duct", layers: ["duct"], name: "architectural sleeve", url: null },
    { id: "building_connection", layers: ["connection"], name: "exposed steel mounting flange", url: null },
    { id: "building_door", layers: ["door"], name: "public bathroom", url: null },
    { id: "building_floorslab", layers: ["floorslab"], name: "6 inch 5-ply cross-laminated timber floor", url: null },
    { id: "building_beam_finish", layers: ["beam_finish"], name: "plywood finish", url: null },
    {
      id: "building_column_beam",
      layers: ["column_beam"],
      name: "12 x 12 inch wood column + 12 x 18 inch penetrated wood beam",
      url: null,
    },
    { id: "building_soundinsul", layers: ["soundinsul"], name: "vapor barrier + acoustic underlayment", url: null },
    { id: "building_floor_finish", layers: ["floor_finish"], name: "microcement finish", url: null },
    { id: "building_concrete", layers: ["concrete"], name: "in-situ cast reinforced concrete system", url: null },
  ],
};

function createMetal(color, metalness = 0.28) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness });
}

function createMatte(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

const MAT = {
  env1_seal: createMatte(0x333638),
  env1_flashing: createMetal(0xb9bec2),
  env1_mesh: createMetal(0xc9ced1, 0.2),
  env1_insul: createMatte(0xe8ddad),
  env1_frame: createMatte(0xe0bf86, 0.76),
  env1_finish: createMatte(0xd6d2c8),
  env1_batten: createMatte(0xd8b77c, 0.78),
  env1_board: createMatte(0xd0aa70, 0.78),
  env1_windowseal: createMatte(0x303235),
  env1_glazing: new THREE.MeshPhysicalMaterial({
    color: 0xf0fbff,
    roughness: 0.035,
    metalness: 0,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  }),
  env2_mesh: createMetal(0xbac1c6, 0.26),
  env2_bracket: createMetal(0x8e9498, 0.32),
  env2_pv: new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  }),
  roof_finish: createMetal(0xb8bdc0, 0.28),
  roof_water: createMetal(0x9ca3a6, 0.22),
  roof_panel: createMatte(0x26314a, 0.65),
  roof_slab: createMatte(0xd8b47a, 0.78),
  roof_board: createMatte(0xd5d0c5),
  roof_insul: createMatte(0xe9deac),
  roof_bracket: createMetal(0x8e9498, 0.32),
  roof_batten: createMatte(0xd8b77c, 0.78),
  duct: createMetal(0x1f56ff, 0.42),
  connection: createMetal(0x7e8588, 0.32),
  door: createMatte(0x4b4742),
  floorslab: createMatte(0xc3beb2),
  beam_finish: createMatte(0xd9d2c5),
  column_beam: createMatte(0xd9b77d, 0.76),
  soundinsul: createMatte(0xe4dcae),
  floor_finish: createMatte(0xd5d8d8),
  concrete: createMatte(0xaaaeb0, 0.88),
};

const DEFAULT_MAT = createMatte(0xb8b2a8);
const HIT_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const C_gold = "#c4a66e";
const F = "'Jost', sans-serif";

function makeInitialDetailOpen(value = false) {
  return { ENV1: value, ENV2: value, ROOF_UP: value, BUILDING: value };
}

function buildDetailLookup() {
  const lookup = {};
  Object.entries(DETAIL_GROUPS).forEach(([topLayerName, groups]) => {
    lookup[topLayerName] = {};
    groups.forEach(group => {
      group.layers.forEach(layerName => {
        lookup[topLayerName][layerName] = group;
      });
    });
  });
  return lookup;
}

const DETAIL_LOOKUP = buildDetailLookup();

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
  const back = 0.72;
  return 1 + (back + 1) * Math.pow(t - 1, 3) + back * Math.pow(t - 1, 2);
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
  track.current = track.start + (track.target - track.start) * cleanEase(t);
  if (t >= 1) track.current = track.target;
}

function collectMeshes(root) {
  const meshes = [];
  root.traverse(node => {
    if (node.isMesh && !node.userData.isHitArea) meshes.push(node);
  });
  return meshes;
}

function setMeshesHighlighted(meshes, active) {
  meshes.forEach(mesh => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(material => {
      if (!material?.emissive) return;
      material.emissive.setHex(active ? 0xf7fbff : 0x000000);
      material.emissiveIntensity = active ? 0.029 : 0;
    });
  });
}

function createHitBox(objects, parent, userData, pad, scaleFactor = 1) {
  const bbox = new THREE.Box3();
  objects.forEach(object => {
    bbox.union(new THREE.Box3().setFromObject(object));
  });
  if (bbox.isEmpty()) return null;

  bbox.expandByScalar(pad);
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(size.x * scaleFactor, size.y * scaleFactor, size.z * scaleFactor),
    HIT_MAT
  );
  hitBox.userData = { ...userData, isHitArea: true };
  hitBox.position.copy(parent.worldToLocal(center.clone()));
  parent.add(hitBox);
  return hitBox;
}

function systemKey(topLayerName) {
  return `system:${topLayerName}`;
}

function detailKey(groupId) {
  return `detail:${groupId}`;
}

function getDetailItems(topLayerName) {
  return DETAIL_GROUPS[topLayerName] || [];
}

function getTargetKey(hitObject, systemOpen, detailOpen) {
  const topLayerName = hitObject.userData.topLayerName;
  if (!systemOpen) return systemKey(topLayerName);
  if (hitObject.userData.interactionLevel === "detail") return hitObject.userData.highlightKey;
  if (detailOpen[topLayerName] && hitObject.userData.detailGroupId) return hitObject.userData.highlightKey;
  return systemKey(topLayerName);
}

function getHoverName(hitObject, systemOpen, detailOpen) {
  const topLayerName = hitObject.userData.topLayerName;
  if (!systemOpen) return SYSTEM_LABELS[topLayerName] || "SYSTEM";
  if (hitObject.userData.interactionLevel === "detail") return hitObject.userData.detailName;
  if (detailOpen[topLayerName] && hitObject.userData.detailName) return hitObject.userData.detailName;
  return SYSTEM_LABELS[topLayerName] || "SYSTEM";
}

export default function CoritaDetailViewer({ onClose }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    renderer: null,
    camera: null,
    controls: null,
    scene: null,
    systemTrack: { current: 0, start: 0, target: 0, startedAt: 0, duration: 650 },
    detailTracks: {
      ENV1: { current: 0, start: 0, target: 0, startedAt: 0, duration: 480 },
      ENV2: { current: 0, start: 0, target: 0, startedAt: 0, duration: 480 },
      ROOF_UP: { current: 0, start: 0, target: 0, startedAt: 0, duration: 480 },
    },
    explodeGroups: [],
    detailLayers: [],
    systemTargets: [],
    detailTargets: [],
    systemTargetsByTop: {},
    detailTargetsByTop: {},
    hoverTargets: [],
    highlightGroups: {},
    hoverKey: null,
    modelScale: 1,
    raf: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  });
  const [systemExploded, setSystemExploded] = useState(false);
  const [detailExploded, setDetailExploded] = useState(() => makeInitialDetailOpen(false));
  const [hoverKeyState, setHoverKeyState] = useState(null);
  const [loading, setLoading] = useState(true);
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
    setHoverKeyState(nextKey);
  };

  const getPickTargets = () => {
    const s = stateRef.current;
    if (!s.systemTrack.target && s.systemTrack.current < 0.5) return s.systemTargets;

    return SYSTEM_ORDER.flatMap(topLayerName => {
      if (topLayerName === "BUILDING") {
        return detailExploded.BUILDING ? (s.detailTargetsByTop.BUILDING || []) : (s.systemTargetsByTop.BUILDING || []);
      }
      if (detailExploded[topLayerName]) return s.detailTargetsByTop[topLayerName] || [];
      return s.systemTargetsByTop[topLayerName] || [];
    });
  };

  const updatePointer = e => {
    const s = stateRef.current;
    const rect = mountRef.current.getBoundingClientRect();
    s.mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    s.raycaster.setFromCamera(s.mouse, s.camera);
    return { rect, hits: s.raycaster.intersectObjects(getPickTargets(), false) };
  };

  const openSystemStage = () => {
    const s = stateRef.current;
    startTween(s.systemTrack, 1, 580);
    setSystemExploded(true);
  };

  const closeAll = () => {
    const s = stateRef.current;
    startTween(s.systemTrack, 0, 560);
    Object.values(s.detailTracks).forEach(track => startTween(track, 0, 420));
    setSystemExploded(false);
    setDetailExploded(makeInitialDetailOpen(false));
    setActiveHover(null);
    setLabel(null);
  };

  const toggleSystemDetail = topLayerName => {
    const s = stateRef.current;
    if (!systemExploded) {
      openSystemStage();
      return;
    }

    if (!DETAIL_GROUPS[topLayerName]) return;

    if (topLayerName === "BUILDING" && detailExploded.ENV1 && detailExploded.ENV2 && detailExploded.ROOF_UP) {
      closeAll();
      return;
    }

    const nextOpen = !detailExploded[topLayerName];
    if (topLayerName !== "BUILDING") {
      startTween(s.detailTracks[topLayerName], nextOpen ? 1 : 0, 460);
    }
    setDetailExploded(prev => ({ ...prev, [topLayerName]: nextOpen }));
  };

  useEffect(() => {
    const mount = mountRef.current;
    const s = stateRef.current;
    let alive = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    s.scene = scene;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(10, 18, 8);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.5);
    fill.position.set(-8, 6, -10);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 500);
    s.camera = camera;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    s.controls = controls;

    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load("/models/coritaexplodefacade.glb", gltf => {
      if (!alive) return;

      const model = gltf.scene;
      console.groupCollapsed("Imported GLTF hierarchy");
      printGltfHierarchy(model);
      console.groupEnd();

      const bbox = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      model.position.sub(center);
      scene.add(model);
      model.updateMatrixWorld(true);

      const hoverTargets = [];
      const systemTargets = [];
      const detailTargets = [];
      const systemTargetsByTop = {};
      const detailTargetsByTop = {};
      const explodeGroups = [];
      const detailLayers = [];
      const highlightGroups = {};
      const modelScale = Math.max(size.x, size.z) || 1;
      const hitPad = Math.max(modelScale * 0.035, 0.08);

      model.children.forEach(topLayer => {
        const topLayerName = topLayer.name;
        const motion = TOP_LAYER_MOTION[topLayerName];
        if (!motion) return;

        const systemMeshes = collectMeshes(topLayer);
        highlightGroups[systemKey(topLayerName)] = systemMeshes;

        if (motion.distance > 0) {
          explodeGroups.push({
            group: topLayer,
            localOrigin: topLayer.position.clone(),
            dir: motion.dir.clone(),
            distance: motion.distance,
            topLayerName,
          });
        }

        const childLayersByName = {};
        topLayer.children.forEach(childLayer => {
          childLayersByName[childLayer.name] = childLayer;
          const childLayerName = childLayer.name;
          const detailGroup = DETAIL_LOOKUP[topLayerName]?.[childLayerName];
          const material = MAT[childLayerName] || DEFAULT_MAT;

          childLayer.traverse(node => {
            if (!node.isMesh) return;
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = material;
            node.userData.topLayerName = topLayerName;
            node.userData.childLayerName = childLayerName;
            node.userData.detailGroupId = detailGroup?.id || null;
            node.userData.detailName = detailGroup?.name || SYSTEM_LABELS[topLayerName];
          });
        });

        getDetailItems(topLayerName).forEach(group => {
          const groupLayers = group.layers.map(layerName => childLayersByName[layerName]).filter(Boolean);
          if (!groupLayers.length) return;
          const groupMeshes = groupLayers.flatMap(layer => collectMeshes(layer));
          highlightGroups[detailKey(group.id)] = groupMeshes;

          const hitBox = createHitBox(groupLayers, topLayer, {
            interactionLevel: "detail",
            topLayerName,
            detailGroupId: group.id,
            detailName: group.name,
            highlightKey: detailKey(group.id),
          }, hitPad);

          if (hitBox) {
            detailTargets.push(hitBox);
            detailTargetsByTop[topLayerName] = [...(detailTargetsByTop[topLayerName] || []), hitBox];
            hoverTargets.push(hitBox);

            if (topLayerName !== "BUILDING") {
              detailLayers.push({
                layer: hitBox,
                localOrigin: hitBox.position.clone(),
                topLayerName,
                dir: group.dir.clone(),
                distance: group.distance,
              });
            }
          }

          if (topLayerName !== "BUILDING") {
            groupLayers.forEach(layer => {
              detailLayers.push({
                layer,
                localOrigin: layer.position.clone(),
                topLayerName,
                dir: group.dir.clone(),
                distance: group.distance,
              });
            });
          }
        });

        const systemHitScale = topLayerName === "BUILDING" ? 0.5 : 1;
        const systemHitBox = createHitBox(Object.values(childLayersByName), topLayer, {
          interactionLevel: "system",
          topLayerName,
          detailName: SYSTEM_LABELS[topLayerName],
          highlightKey: systemKey(topLayerName),
        }, hitPad * 1.2, systemHitScale);

        if (systemHitBox) {
          systemTargets.push(systemHitBox);
          systemTargetsByTop[topLayerName] = [systemHitBox];
          hoverTargets.push(systemHitBox);
        }
      });

      s.explodeGroups = explodeGroups;
      s.detailLayers = detailLayers;
      s.systemTargets = systemTargets;
      s.detailTargets = detailTargets;
      s.systemTargetsByTop = systemTargetsByTop;
      s.detailTargetsByTop = detailTargetsByTop;
      s.hoverTargets = hoverTargets;
      s.highlightGroups = highlightGroups;
      s.modelScale = modelScale;
      console.log(
        "Layer-driven facade viewer:",
        "explodeGroups",
        explodeGroups.map(item => item.topLayerName),
        "detailLayers",
        detailLayers.length,
        "hoverTargets",
        hoverTargets.length,
        "modelScale",
        s.modelScale.toFixed(2)
      );

      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(maxDim, maxDim * 0.6, maxDim * 1.6);
      controls.target.set(0, 0, 0);
      controls.update();

      setLoading(false);
    }, undefined, err => console.error("GLB error:", err));

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
      updateTween(s.systemTrack, now);
      Object.values(s.detailTracks).forEach(track => updateTween(track, now));

      const scale = s.modelScale || 1;
      s.explodeGroups.forEach(({ group, localOrigin, dir, distance }) => {
        const dist = distance * scale * s.systemTrack.current;
        group.position.set(
          localOrigin.x + dir.x * dist,
          localOrigin.y + dir.y * dist,
          localOrigin.z + dir.z * dist
        );
      });

      s.detailLayers.forEach(({ layer, localOrigin, topLayerName, dir, distance }) => {
        const dist = distance * scale * s.detailTracks[topLayerName].current;
        layer.position.set(
          localOrigin.x + dir.x * dist,
          localOrigin.y + dir.y * dist,
          localOrigin.z + dir.z * dist
        );
      });

      s.controls.update();
      renderer.render(scene, s.camera);
    };
    animate(performance.now());

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(s.raf);
      scene.clear();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  const onMouseMove = e => {
    const s = stateRef.current;
    if (!s.renderer || !s.hoverTargets.length) return;
    const { rect, hits } = updatePointer(e);

    if (hits.length) {
      const hitObject = hits[0].object;
      setActiveHover(getTargetKey(hitObject, systemExploded, detailExploded));
      setLabel({
        name: getHoverName(hitObject, systemExploded, detailExploded),
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
    if (!s.renderer || !s.hoverTargets.length) return;
    const { hits } = updatePointer(e);
    if (!hits.length) return;

    const topLayerName = hits[0].object.userData.topLayerName;
    toggleSystemDetail(topLayerName);
  };

  const toggleAll = () => {
    if (systemExploded) closeAll();
    else openSystemStage();
  };

  const expandedDetails = Object.values(detailExploded).filter(Boolean).length;

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
        width: "min(245px, 34vw)",
        maxHeight: "calc(100% - 140px)",
        overflowY: "auto",
        padding: "0.35rem 0",
        background: "rgba(255,255,255,0.58)",
        borderLeft: `1px solid rgba(196,166,110,0.38)`,
        backdropFilter: "blur(10px)",
        zIndex: 8,
      }}>
        {SYSTEM_ORDER.map(topLayerName => {
          const activeSystem = hoverKeyState === systemKey(topLayerName);
          const open = detailExploded[topLayerName];
          const detailItems = getDetailItems(topLayerName);

          return (
            <div key={topLayerName} style={{ padding: "0.18rem 0" }}>
              <button
                onClick={() => toggleSystemDetail(topLayerName)}
                onMouseEnter={() => setActiveHover(systemKey(topLayerName))}
                onMouseLeave={() => setActiveHover(null)}
                style={{
                  width: "100%",
                  border: "none",
                  borderLeft: open ? `2px solid ${C_gold}` : "2px solid transparent",
                  background: activeSystem || open ? "rgba(196,166,110,0.011)" : "transparent",
                  color: open ? "#080807" : "rgba(8,8,7,0.64)",
                  cursor: "pointer",
                  fontFamily: F,
                  fontSize: "0.58rem",
                  letterSpacing: "0.16em",
                  lineHeight: 1.35,
                  textAlign: "left",
                  textTransform: "uppercase",
                  padding: "0.42rem 0.62rem",
                  transition: "background .2s, color .2s, border-color .2s",
                }}
              >
                {SYSTEM_LABELS[topLayerName]}
              </button>

              {systemExploded && open && detailItems.length > 0 && (
                <div style={{ padding: "0.05rem 0 0.35rem 0.78rem" }}>
                  {detailItems.map(item => {
                    const key = detailKey(item.id);
                    const activeDetail = hoverKeyState === key;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setActiveHover(key)}
                        onMouseLeave={() => setActiveHover(null)}
                        onClick={e => {
                          if (!item.url) return;
                          e.stopPropagation();
                          window.open(item.url, "_blank", "noopener,noreferrer");
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          border: "none",
                          background: activeDetail ? "rgba(8,8,7,0.008)" : "transparent",
                          color: activeDetail ? "#080807" : "rgba(8,8,7,0.5)",
                          cursor: item.url ? "pointer" : "default",
                          fontFamily: F,
                          fontSize: "0.56rem",
                          letterSpacing: "0.08em",
                          lineHeight: 1.35,
                          textAlign: "left",
                          textTransform: "uppercase",
                          padding: "0.28rem 0.5rem",
                          transition: "background .2s, color .2s",
                        }}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.95)",
        }}>
          <div style={{
            width: 40,
            height: 2,
            background: C_gold,
            marginBottom: "1rem",
            animation: "pulse 1.2s ease-in-out infinite",
          }}/>
          <span style={{
            fontFamily: F,
            fontSize: "0.68rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.4)",
          }}>Loading model</span>
          <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
        </div>
      )}

      {label && (
        <div style={{
          position: "absolute",
          left: label.x + 10,
          top: label.y - 6,
          background: "rgba(255,255,255,0.62)",
          border: "1px solid rgba(21,21,21,0.08)",
          padding: "0.28rem 0.46rem",
          pointerEvents: "none",
          zIndex: 10,
          maxWidth: 160,
          backdropFilter: "blur(7px)",
        }}>
          <p style={{
            fontFamily: F,
            fontSize: "0.36rem",
            fontWeight: 400,
            color: "rgba(21,21,21,0.66)",
            margin: 0,
            lineHeight: 1.25,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}>{label.name}</p>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)" }}>
        <button onClick={toggleAll} style={{
          background: systemExploded ? C_gold : "rgba(8,8,7,0.82)",
          border: `1px solid ${C_gold}`,
          color: systemExploded ? "#080807" : C_gold,
          fontFamily: F,
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          padding: "9px 28px",
          cursor: "pointer",
          transition: "all .3s",
          backdropFilter: "blur(8px)",
        }}>
          {systemExploded ? "Collapse All" : "Explode View"}
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
        Drag to rotate<br/>Scroll to zoom<br/>Click to explode<br/>
        {expandedDetails ? `${expandedDetails} detail list${expandedDetails > 1 ? "s" : ""} open` : "Hover to identify"}
      </div>

      {onClose && (
        <button onClick={onClose} style={{
          position: "absolute",
          top: 14,
          left: 14,
          background: "none",
          border: `1px solid rgba(0,0,0,0.15)`,
          color: "rgba(0,0,0,0.5)",
          fontFamily: F,
          fontSize: "0.62rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          padding: "5px 12px",
          cursor: "pointer",
        }}>
          Back
        </button>
      )}
    </div>
  );
}
