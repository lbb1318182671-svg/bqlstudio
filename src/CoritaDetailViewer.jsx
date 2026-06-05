import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

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

const SUN_PRESETS = {
  "9 AM": { position: [-1.15, 0.7, 0.9], intensity: 1.55, environment: 0.58, heat: 0.58 },
  "12 PM": { position: [-1.3, 1.45, 0.05], intensity: 2.35, environment: 0.76, heat: 1 },
  "3 PM": { position: [-1.15, 0.82, -0.82], intensity: 1.9, environment: 0.66, heat: 0.82 },
  "6 PM": { position: [-0.9, 0.28, -1.2], intensity: 0.9, environment: 0.42, heat: 0.36 },
};

const THERMAL_LAYERS = new Set(["floor_finish", "floorslab", "beam_finish", "column_beam", "concrete", "duct"]);

const THERMAL_SURFACE_MODE = {
  floor_finish: 1,
  floorslab: 1,
  beam_finish: 2,
  column_beam: 3,
  concrete: 4,
  duct: 5,
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
    { id: "building_concrete", layers: ["concrete"], name: "in-site cast reinforced concrete system", url: null },
  ],
};

function createMetal(color, metalness = 0.5, roughness = 0.68) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createMatte(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createSurfaceTexture({
  base,
  accent,
  seed,
  repeat = [1, 1],
  grain = false,
  knots = false,
  trowel = false,
  trowelCount = 85,
  trowelStrength = 1,
  speckleCount = 1800,
  colorSpace = true,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const random = seededRandom(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;

  for (let i = 0; i < speckleCount; i += 1) {
    ctx.globalAlpha = 0.03 + random() * 0.11;
    const size = 0.3 + random() * 2.1;
    ctx.fillRect(random() * canvas.width, random() * canvas.height, size, size);
  }

  if (grain) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 145; i += 1) {
      const y = random() * canvas.height;
      const wave = 1 + random() * 5;
      ctx.globalAlpha = 0.04 + random() * 0.12;
      ctx.lineWidth = 0.25 + random() * 1.05;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(64, y + wave, 190, y - wave, 256, y + random() * 2);
      ctx.stroke();
    }
  }

  if (knots) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 12; i += 1) {
      const x = 16 + random() * 224;
      const y = 12 + random() * 232;
      const width = 3 + random() * 10;
      const height = 1.5 + random() * 4;
      for (let ring = 0; ring < 4; ring += 1) {
        ctx.globalAlpha = 0.08 + random() * 0.1;
        ctx.lineWidth = 0.45 + random() * 0.55;
        ctx.beginPath();
        ctx.ellipse(x, y, width + ring * 2.2, height + ring, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  if (trowel) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < trowelCount; i += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const radius = 18 + random() * 70;
      ctx.globalAlpha = (0.018 + random() * 0.055) * trowelStrength;
      ctx.lineWidth = 5 + random() * 18;
      ctx.beginPath();
      ctx.arc(x, y, radius, random() * Math.PI, random() * Math.PI + Math.PI * 0.85);
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

function orientTexture(source, repeat, rotation) {
  const texture = source.clone();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.center.set(0.5, 0.5);
  texture.rotation = rotation;
  texture.needsUpdate = true;
  return texture;
}

function createTexturedMatte(map, roughnessMap, roughness = 0.78, bumpScale = 0.015) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    roughnessMap,
    bumpMap: roughnessMap,
    bumpScale,
    roughness,
    metalness: 0,
  });
}

function createTexturedMetal(map, roughnessMap, metalness = 0.56, roughness = 0.66) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    roughnessMap,
    bumpMap: roughnessMap,
    bumpScale: 0.004,
    roughness,
    metalness,
  });
}

function createMeshOpacityTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.4;

  for (let offset = -128; offset <= 256; offset += 16) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset - 128, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + 128, 128);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 8);
  texture.anisotropy = 8;
  return texture;
}

const TEXTURE = {
  timber: createSurfaceTexture({
    base: "#d8bb87",
    accent: "#65472d",
    seed: 13,
    repeat: [1.2, 5.5],
    grain: true,
    knots: true,
  }),
  plywood: createSurfaceTexture({
    base: "#ddd2bd",
    accent: "#9b8060",
    seed: 23,
    repeat: [1.5, 3.5],
    grain: true,
  }),
  woodRoughness: createSurfaceTexture({
    base: "#c5c5c5",
    accent: "#464646",
    seed: 31,
    repeat: [1.2, 5.5],
    grain: true,
    knots: true,
    colorSpace: false,
  }),
  frameSpeckle: createSurfaceTexture({
    base: "#d9c195",
    accent: "#806c4e",
    seed: 35,
    repeat: [3.75, 3.75],
    speckleCount: 2300,
  }),
  frameSpeckleRoughness: createSurfaceTexture({
    base: "#c8c8c8",
    accent: "#5b5b5b",
    seed: 37,
    repeat: [3.75, 3.75],
    speckleCount: 2300,
    colorSpace: false,
  }),
  concrete: createSurfaceTexture({
    base: "#919594",
    accent: "#4b5051",
    seed: 41,
    repeat: [3.67, 3.67],
    trowel: true,
    trowelCount: 32,
    trowelStrength: 0.475,
    speckleCount: 1700,
  }),
  concreteRoughness: createSurfaceTexture({
    base: "#b5b5b5",
    accent: "#494545",
    seed: 43,
    repeat: [3.67, 3.67],
    trowel: true,
    trowelCount: 32,
    trowelStrength: 0.475,
    speckleCount: 1700,
    colorSpace: false,
  }),
  microcement: createSurfaceTexture({
    base: "#c9cccd",
    accent: "#697378",
    seed: 53,
    repeat: [1.4, 1.4],
    trowel: true,
    speckleCount: 550,
  }),
  microcementRoughness: createSurfaceTexture({
    base: "#c6c6c6",
    accent: "#565656",
    seed: 57,
    repeat: [1.4, 1.4],
    trowel: true,
    speckleCount: 550,
    colorSpace: false,
  }),
  zinc: createSurfaceTexture({
    base: "#b8bec1",
    accent: "#758086",
    seed: 61,
    repeat: [1, 9],
    grain: true,
  }),
  zincRoughness: createSurfaceTexture({
    base: "#c8c8c8",
    accent: "#696969",
    seed: 67,
    repeat: [1, 9],
    grain: true,
    colorSpace: false,
  }),
  meshOpacity: createMeshOpacityTexture(),
};

const ORIENTED_TEXTURE = {
  timberVertical: orientTexture(TEXTURE.timber, [5.5, 1.2], Math.PI / 2),
  woodRoughnessVertical: orientTexture(TEXTURE.woodRoughness, [5.5, 1.2], Math.PI / 2),
  plywoodTurned: orientTexture(TEXTURE.plywood, [3.5, 1.5], Math.PI / 2),
  timberTurned: orientTexture(TEXTURE.timber, [5.5, 1.2], Math.PI / 2),
  woodRoughnessTurned: orientTexture(TEXTURE.woodRoughness, [5.5, 1.2], Math.PI / 2),
  timberSlantedBeam: orientTexture(TEXTURE.timber, [1.2, 5.5], THREE.MathUtils.degToRad(17.4)),
  woodRoughnessSlantedBeam: orientTexture(TEXTURE.woodRoughness, [1.2, 5.5], THREE.MathUtils.degToRad(17.4)),
  zincAligned: orientTexture(TEXTURE.zinc, [1, 9], THREE.MathUtils.degToRad(118)),
  zincRoughnessAligned: orientTexture(TEXTURE.zincRoughness, [1, 9], THREE.MathUtils.degToRad(118)),
};

const FRAME_MATERIAL = createTexturedMatte(TEXTURE.frameSpeckle, TEXTURE.frameSpeckleRoughness, 0.76, 0.012);

const SLANTED_BEAM_MATERIAL = createTexturedMatte(
  ORIENTED_TEXTURE.timberSlantedBeam,
  ORIENTED_TEXTURE.woodRoughnessSlantedBeam,
  0.76
);

const MAT = {
  env1_seal: createMatte(0x333638),
  env1_flashing: createTexturedMetal(ORIENTED_TEXTURE.zincAligned, ORIENTED_TEXTURE.zincRoughnessAligned),
  env1_mesh: createMetal(0xc9ced1, 0.48, 0.72),
  env1_insul: createMatte(0xe8ddad),
  env1_frame: FRAME_MATERIAL,
  env1_finish: createTexturedMatte(ORIENTED_TEXTURE.plywoodTurned, ORIENTED_TEXTURE.woodRoughnessTurned, 0.8),
  env1_batten: createTexturedMatte(ORIENTED_TEXTURE.timberTurned, ORIENTED_TEXTURE.woodRoughnessTurned, 0.8),
  env1_board: createTexturedMatte(ORIENTED_TEXTURE.timberTurned, ORIENTED_TEXTURE.woodRoughnessTurned, 0.8),
  env1_windowseal: createMatte(0x303235),
  env1_glazing: new THREE.MeshPhysicalMaterial({
    color: 0xf0fbff,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.22,
    transmission: 0.64,
    thickness: 0.08,
    ior: 1.45,
    depthWrite: false,
  }),
  env2_mesh: new THREE.MeshStandardMaterial({
    color: 0x9da7ac,
    metalness: 0.68,
    roughness: 0.58,
    alphaMap: TEXTURE.meshOpacity,
    alphaTest: 0.32,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  }),
  env2_bracket: createMetal(0x858d92, 0.88, 0.4),
  env2_pv: new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0,
    transparent: true,
    opacity: 0.58,
    transmission: 0.14,
    thickness: 0.08,
    ior: 1.48,
    clearcoat: 0.08,
    clearcoatRoughness: 0.72,
    depthWrite: false,
  }),
  roof_finish: createTexturedMetal(ORIENTED_TEXTURE.zincAligned, ORIENTED_TEXTURE.zincRoughnessAligned, 0.58, 0.64),
  roof_water: createTexturedMetal(ORIENTED_TEXTURE.zincAligned, ORIENTED_TEXTURE.zincRoughnessAligned, 0.52, 0.7),
  roof_panel: createMatte(0x26314a, 0.65),
  roof_slab: createTexturedMatte(TEXTURE.timber, TEXTURE.woodRoughness, 0.8),
  roof_board: createTexturedMatte(TEXTURE.plywood, TEXTURE.woodRoughness, 0.82),
  roof_insul: createMatte(0xe9deac),
  roof_bracket: createMetal(0x8e9498, 0.6, 0.64),
  roof_batten: createTexturedMatte(TEXTURE.timber, TEXTURE.woodRoughness, 0.8),
  duct: createMetal(0x1b4ddd, 0.8, 0.46),
  connection: createMetal(0x7e8588, 0.64, 0.6),
  door: createMetal(0x119958, 0.92, 0.36),
  floorslab: createTexturedMatte(TEXTURE.timber, TEXTURE.woodRoughness, 0.78, 0.024),
  beam_finish: createTexturedMatte(TEXTURE.plywood, TEXTURE.woodRoughness, 0.82),
  column_beam: createTexturedMatte(TEXTURE.timber, TEXTURE.woodRoughness, 0.78),
  soundinsul: createMatte(0xe4dcae),
  floor_finish: createTexturedMatte(TEXTURE.microcement, TEXTURE.microcementRoughness, 0.84, 0.014),
  concrete: createTexturedMatte(TEXTURE.concrete, TEXTURE.concreteRoughness, 0.98, 0.065),
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

function getLayerMeshMaterial(childLayerName, mesh, defaultMaterial) {
  if (!mesh.geometry) return defaultMaterial;

  const worldSize = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());

  if (childLayerName === "column_beam") {
    const isTopSlantedBeam = worldSize.x > 5.5 && worldSize.y > 1.5;
    return isTopSlantedBeam ? SLANTED_BEAM_MATERIAL : defaultMaterial;
  }

  return defaultMaterial;
}

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

function createAirflowArrows(env1, env2, modelScale) {
  const env1Box = new THREE.Box3().setFromObject(env1);
  const env2Box = new THREE.Box3().setFromObject(env2);
  const env1Center = env1Box.getCenter(new THREE.Vector3());
  const env2Center = env2Box.getCenter(new THREE.Vector3());
  const cavityX = (env1Center.x + env2Center.x) * 0.5;
  const group = new THREE.Group();
  const arrows = [];
  const count = 16;
  const random = seededRandom(83);
  const length = Math.max(modelScale * 0.052, 0.25);
  const boundaryMargin = Math.max(modelScale * 0.012, length * 0.18);
  const minY = Math.max(env1Box.min.y, env2Box.min.y) + boundaryMargin;
  const maxY = Math.min(env1Box.max.y, env2Box.max.y) - length - boundaryMargin;
  const minZ = Math.max(env1Box.min.z, env2Box.min.z) + boundaryMargin;
  const maxZ = Math.min(env1Box.max.z, env2Box.max.z) - boundaryMargin;
  const cavityMinX = Math.min(env1Center.x, env2Center.x) + boundaryMargin;
  const cavityMaxX = Math.max(env1Center.x, env2Center.x) - boundaryMargin;
  const safeMinY = minY < maxY ? minY : Math.min(env1Box.min.y, env2Box.min.y);
  const safeMaxY = minY < maxY ? maxY : Math.max(env1Box.max.y, env2Box.max.y) - length;
  const safeMinZ = minZ < maxZ ? minZ : Math.min(env1Box.min.z, env2Box.min.z);
  const safeMaxZ = minZ < maxZ ? maxZ : Math.max(env1Box.max.z, env2Box.max.z);
  const safeMinX = cavityMinX < cavityMaxX ? cavityMinX : cavityX - modelScale * 0.008;
  const safeMaxX = cavityMinX < cavityMaxX ? cavityMaxX : cavityX + modelScale * 0.008;
  const swayX = Math.min(modelScale * 0.008, Math.max((safeMaxX - safeMinX) * 0.22, 0));
  const swayZ = Math.min(modelScale * 0.01, Math.max((safeMaxZ - safeMinZ) * 0.08, 0));

  for (let i = 0; i < count; i += 1) {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      length,
      0x65c8ed,
      length * 0.4,
      length * 0.25
    );
    arrow.traverse(child => {
      if (!child.material) return;
      child.material.transparent = true;
      child.material.opacity = 0.82;
      child.material.depthWrite = false;
    });
    const baseX = THREE.MathUtils.lerp(safeMinX + swayX, safeMaxX - swayX, random());
    const baseZ = THREE.MathUtils.lerp(safeMinZ + swayZ, safeMaxZ - swayZ, random());
    arrow.position.set(
      baseX,
      THREE.MathUtils.lerp(safeMinY, safeMaxY, random()),
      baseZ
    );
    group.add(arrow);
    arrows.push({
      arrow,
      seed: random() * Math.PI * 2,
      speed: 0.72 + random() * 0.42,
      baseX,
      baseZ,
    });
  }

  group.visible = false;
  group.renderOrder = 5;

  return {
    group,
    arrows,
    minY: safeMinY,
    maxY: safeMaxY,
    minX: safeMinX,
    maxX: safeMaxX,
    minZ: safeMinZ,
    maxZ: safeMaxZ,
    speed: Math.max((safeMaxY - safeMinY) * 0.055, 0.35),
    swayX,
    swayZ,
  };
}

function createThermalOverlayMaterial({
  origin,
  interiorMaxX,
  mode,
  bounds,
  ductCenter,
  fadeDistance,
  undergroundDepth,
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHeat: { value: 0 },
      uAirflow: { value: 0 },
      uExposure: { value: 0.18 },
      uSunDirection: { value: new THREE.Vector3(-1, 1, 0).normalize() },
      uMode: { value: mode },
      uOrigin: { value: origin.clone() },
      uInteriorMaxX: { value: interiorMaxX },
      uBoundsMin: { value: bounds.min.clone() },
      uBoundsMax: { value: bounds.max.clone() },
      uDuctCenter: { value: ductCenter.clone() },
      uFadeDistance: { value: fadeDistance },
      uUndergroundDepth: { value: undergroundDepth },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uHeat;
      uniform float uAirflow;
      uniform float uExposure;
      uniform vec3 uSunDirection;
      uniform float uMode;
      uniform vec3 uOrigin;
      uniform float uInteriorMaxX;
      uniform vec3 uBoundsMin;
      uniform vec3 uBoundsMax;
      uniform vec3 uDuctCenter;
      uniform float uFadeDistance;
      uniform float uUndergroundDepth;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      float heatNoise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 41.117))) * 43758.5453);
      }

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 localPosition = vWorldPosition - uOrigin;
        float positiveX = smoothstep(-uFadeDistance, uFadeDistance, localPosition.x);
        float positiveY = smoothstep(-uUndergroundDepth, uFadeDistance, localPosition.y);
        float positiveZ = smoothstep(-uFadeDistance, uFadeDistance, localPosition.z);
        float positiveOctant = positiveX * positiveY * positiveZ;
        float facadeProximity = 1.0 - smoothstep(uOrigin.x, uInteriorMaxX, vWorldPosition.x);
        float upwardFacing = smoothstep(0.5, 0.9, dot(normal, vec3(0.0, 1.0, 0.0)));
        float downwardFacing = smoothstep(0.62, 0.94, dot(normal, vec3(0.0, -1.0, 0.0)));
        float inwardFacing = smoothstep(0.18, 0.82, dot(normal, vec3(1.0, 0.0, 0.0)));
        float sunFacing = dot(normal, normalize(uSunDirection));
        float directSurface = smoothstep(-0.35, 0.65, sunFacing);
        float strictDirectSurface = smoothstep(0.05, 0.68, sunFacing);
        float zSection = smoothstep(0.55, 0.9, abs(normal.z));
        float sideBoundary = min(
          smoothstep(0.0, uFadeDistance, vWorldPosition.z - uBoundsMin.z),
          smoothstep(0.0, uFadeDistance, uBoundsMax.z - vWorldPosition.z)
        );
        vec2 radial = normalize(vWorldPosition.xz - uDuctCenter.xz);
        float ductOutside = smoothstep(0.18, 0.68, dot(normal.xz, radial)) *
          (1.0 - smoothstep(0.5, 0.86, abs(normal.y)));

        float surfaceVisibility = upwardFacing;
        float materialHeatWeight = 1.0;
        if (uMode > 1.5 && uMode < 2.5) {
          surfaceVisibility = upwardFacing * 0.28;
          materialHeatWeight = 0.38;
        } else if (uMode > 2.5 && uMode < 3.5) {
          surfaceVisibility = max(upwardFacing * 0.28, inwardFacing * 0.46);
          materialHeatWeight = 0.52;
        } else if (uMode > 3.5 && uMode < 4.5) {
          surfaceVisibility = max(upwardFacing * directSurface * 0.52, directSurface * 0.82) *
            mix(0.42, 1.0, sideBoundary);
          materialHeatWeight = 0.72;
        } else if (uMode > 4.5) {
          surfaceVisibility = ductOutside * strictDirectSurface;
          materialHeatWeight = 0.42;
        }

        surfaceVisibility *= (1.0 - downwardFacing);
        float airflowReduction = mix(1.0, 0.62, uAirflow);
        float sunlightWeight = mix(0.16, 1.0, uExposure);
        if (uMode > 3.5) {
          sunlightWeight = mix(0.08, 1.0, uExposure);
        }
        float variation = mix(0.9, 1.1, heatNoise(floor(vWorldPosition * 3.4)));
        float heat = positiveOctant * surfaceVisibility * mix(0.5, 1.0, facadeProximity) *
          materialHeatWeight * sunlightWeight * airflowReduction * uHeat * variation;
        vec3 warm = mix(vec3(1.0, 0.54, 0.16), vec3(1.0, 0.12, 0.035), smoothstep(0.18, 0.9, heat));
        gl_FragColor = vec4(warm, clamp(heat * 1.624, 0.0, 0.98));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    toneMapped: false,
  });
}

function createThermalSurfaces(meshes, env1, modelScale) {
  const surfaces = [];
  const thermalBox = new THREE.Box3();
  meshes.forEach(mesh => thermalBox.union(new THREE.Box3().setFromObject(mesh)));
  const env1Box = new THREE.Box3().setFromObject(env1);
  const glazingLayer = env1.children.find(child => child.name === "env1_glazing");
  const glazingBox = glazingLayer ? new THREE.Box3().setFromObject(glazingLayer) : env1Box;
  const origin = new THREE.Vector3(glazingBox.max.x, env1Box.min.y, env1Box.min.z);
  const interiorMaxX = thermalBox.isEmpty() ? env1Box.max.x : thermalBox.max.x;
  const fadeDistance = modelScale * 0.035;
  const undergroundDepth = modelScale * 0.18;

  meshes.forEach(source => {
    if (!source.geometry?.attributes?.normal) return;
    const bounds = new THREE.Box3().setFromObject(source);
    const size = bounds.getSize(new THREE.Vector3());
    const layerName = source.userData.childLayerName;
    let mode = THERMAL_SURFACE_MODE[layerName] || 1;
    if (layerName === "column_beam") {
      mode = size.y > Math.max(size.x, size.z) * 1.35 ? 3 : 2;
    }
    const material = createThermalOverlayMaterial({
      origin,
      interiorMaxX,
      mode,
      bounds,
      ductCenter: bounds.getCenter(new THREE.Vector3()),
      fadeDistance,
      undergroundDepth,
    });
    const overlay = new THREE.Mesh(source.geometry, material);
    overlay.userData.isPerformanceOverlay = true;
    overlay.frustumCulled = source.frustumCulled;
    overlay.renderOrder = 3;
    source.add(overlay);
    surfaces.push({ source, overlay, material, bounds, mode });
  });

  return surfaces;
}

function updateThermalExposure(surfaces, occluders, sunPosition, modelScale) {
  const raycaster = new THREE.Raycaster();
  const epsilon = Math.max(modelScale * 0.003, 0.015);

  surfaces.forEach(surface => {
    const center = surface.bounds.getCenter(new THREE.Vector3());
    const size = surface.bounds.getSize(new THREE.Vector3());
    const sampleY = surface.mode === 1 || surface.mode === 2
      ? surface.bounds.max.y + epsilon
      : center.y;
    const samples = [
      new THREE.Vector3(center.x, sampleY, center.z),
      new THREE.Vector3(center.x + size.x * 0.28, sampleY, center.z + size.z * 0.28),
      new THREE.Vector3(center.x - size.x * 0.28, sampleY, center.z - size.z * 0.28),
      new THREE.Vector3(center.x + size.x * 0.22, sampleY, center.z - size.z * 0.22),
      new THREE.Vector3(center.x - size.x * 0.22, sampleY, center.z + size.z * 0.22),
    ];
    let visibleSamples = 0;

    samples.forEach(sample => {
      const direction = sunPosition.clone().sub(sample);
      const distance = direction.length();
      direction.normalize();
      raycaster.set(sample.clone().addScaledVector(direction, epsilon), direction);
      raycaster.far = Math.max(distance - epsilon, epsilon);
      const blocked = raycaster.intersectObjects(occluders, false)
        .some(hit => hit.object !== surface.source && !hit.object.userData.isPerformanceOverlay);
      if (!blocked) visibleSamples += 1;
    });

    surface.material.uniforms.uExposure.value = visibleSamples / samples.length;
    surface.material.uniforms.uSunDirection.value.copy(
      sunPosition.clone().sub(center).normalize()
    );
  });
}

function setThermalVisualization(surfaces, intensity, airflowOn) {
  surfaces.forEach(surface => {
    surface.material.uniforms.uHeat.value = intensity;
    surface.material.uniforms.uAirflow.value = airflowOn ? 1 : 0;
    surface.overlay.visible = intensity > 0.002;
  });
}

function clearThermalVisualization(surfaces) {
  surfaces.forEach(surface => {
    surface.material.uniforms.uHeat.value = 0;
    surface.overlay.visible = false;
  });
}

function setMeshesHighlighted(meshes, active) {
  meshes.forEach(mesh => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(material => {
      if (!material?.emissive) return;
      material.emissive.setHex(active ? 0xf7fbff : 0x000000);
      material.emissiveIntensity = active ? 0.045 : 0;
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
    sun: null,
    hemisphere: null,
    airflow: null,
    thermalSurfaces: [],
    thermalOccluders: [],
    lastFrameAt: 0,
    performance: {
      active: false,
      wasActive: false,
      sunTime: "12 PM",
      exposureSunTime: null,
      airflowOn: false,
      thermalOn: true,
      heatCurrent: 0,
    },
    performanceReadyTimer: null,
    raf: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  });
  const [systemExploded, setSystemExploded] = useState(false);
  const [detailExploded, setDetailExploded] = useState(() => makeInitialDetailOpen(false));
  const [hoverKeyState, setHoverKeyState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState(null);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [sunTime, setSunTime] = useState("12 PM");
  const [airflowOn, setAirflowOn] = useState(false);
  const [thermalOn, setThermalOn] = useState(true);
  const [performanceReady, setPerformanceReady] = useState(true);

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
    if (stateRef.current.performance.active) return;
    const s = stateRef.current;
    if (s.performanceReadyTimer) window.clearTimeout(s.performanceReadyTimer);
    setPerformanceReady(false);
    startTween(s.systemTrack, 1, 580);
    setSystemExploded(true);
  };

  const closeAll = () => {
    const s = stateRef.current;
    if (s.performanceReadyTimer) window.clearTimeout(s.performanceReadyTimer);
    startTween(s.systemTrack, 0, 560);
    Object.values(s.detailTracks).forEach(track => startTween(track, 0, 420));
    setSystemExploded(false);
    setDetailExploded(makeInitialDetailOpen(false));
    setActiveHover(null);
    setLabel(null);
    s.performanceReadyTimer = window.setTimeout(() => {
      setPerformanceReady(true);
      s.performanceReadyTimer = null;
    }, 580);
  };

  const openAllDetails = () => {
    const s = stateRef.current;
    if (s.performance.active) return;
    startTween(s.systemTrack, 1, 420);
    Object.values(s.detailTracks).forEach(track => startTween(track, 1, 460));
    setSystemExploded(true);
    setDetailExploded(makeInitialDetailOpen(true));
  };

  const toggleSystemDetail = topLayerName => {
    const s = stateRef.current;
    if (s.performance.active) return;
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

  const togglePerformanceMode = () => {
    if (systemExploded || Object.values(detailExploded).some(Boolean) || loading) return;
    const next = !performanceMode;
    const s = stateRef.current;
    s.performance.active = next;
    s.performance.airflowOn = next ? airflowOn : false;
    s.performance.thermalOn = next ? thermalOn : false;
    if (next) {
      s.performance.exposureSunTime = null;
    }
    if (!next) {
      s.performance.heatCurrent = 0;
      s.performance.wasActive = false;
      clearThermalVisualization(s.thermalSurfaces);
      setThermalOn(false);
    }
    setPerformanceMode(next);
    setActiveHover(null);
    setLabel(null);
  };

  const chooseSunTime = nextTime => {
    stateRef.current.performance.sunTime = nextTime;
    setSunTime(nextTime);
  };

  const toggleAirflow = () => {
    const next = !airflowOn;
    stateRef.current.performance.airflowOn = next;
    setAirflowOn(next);
  };

  const toggleThermal = () => {
    const next = !thermalOn;
    stateRef.current.performance.thermalOn = next;
    setThermalOn(next);
  };

  useEffect(() => {
    const mount = mountRef.current;
    const s = stateRef.current;
    let alive = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.76;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    s.scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.72;

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0xc8d2d8, 0.68);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff7e8, 2.1);
    sun.position.set(10, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.018;
    scene.add(sun);
    scene.add(sun.target);
    s.sun = sun;
    s.hemisphere = hemisphere;
    const fill = new THREE.DirectionalLight(0xc4dcf0, 0.16);
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
      const originalMeshes = [];
      const thermalMeshes = [];
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
            originalMeshes.push(node);
            node.castShadow = true;
            node.receiveShadow = true;
            node.material = getLayerMeshMaterial(childLayerName, node, material);
            if (THERMAL_LAYERS.has(childLayerName)) {
              thermalMeshes.push(node);
            }
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
          const detailHitScale = group.id === "building_concrete" ? 0.32 : 1;

          const hitBox = createHitBox(groupLayers, topLayer, {
            interactionLevel: "detail",
            topLayerName,
            detailGroupId: group.id,
            detailName: group.name,
            highlightKey: detailKey(group.id),
          }, hitPad, detailHitScale);

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

      const env1 = model.children.find(child => child.name === "ENV1");
      const env2 = model.children.find(child => child.name === "ENV2");
      if (env1) {
        s.thermalSurfaces = createThermalSurfaces(thermalMeshes, env1, modelScale);
        s.thermalOccluders = originalMeshes.filter(
          mesh => mesh.userData.childLayerName !== "env1_glazing"
        );
      }
      if (env1 && env2) {
        s.airflow = createAirflowArrows(env1, env2, modelScale);
        scene.add(s.airflow.group);
      }
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
      const shadowExtent = maxDim * 1.15;
      sun.shadow.camera.left = -shadowExtent;
      sun.shadow.camera.right = shadowExtent;
      sun.shadow.camera.top = shadowExtent;
      sun.shadow.camera.bottom = -shadowExtent;
      sun.shadow.camera.near = 0.1;
      sun.shadow.camera.far = maxDim * 4;
      sun.shadow.camera.updateProjectionMatrix();

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
      const delta = Math.min((now - (s.lastFrameAt || now)) / 1000, 0.05);
      s.lastFrameAt = now;
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

      const performanceState = s.performance;
      const sunPreset = SUN_PRESETS[performanceState.sunTime] || SUN_PRESETS["12 PM"];
      const sunTarget = performanceState.active
        ? new THREE.Vector3(...sunPreset.position).multiplyScalar(scale)
        : new THREE.Vector3(10, 18, 8);
      const sunIntensity = performanceState.active ? sunPreset.intensity : 2.1;
      const environmentIntensity = performanceState.active ? sunPreset.environment : 0.72;
      const hemisphereIntensity = performanceState.active ? sunPreset.environment * 0.82 : 0.68;

      if (s.sun) {
        s.sun.position.lerp(sunTarget, 0.045);
        s.sun.intensity = THREE.MathUtils.lerp(s.sun.intensity, sunIntensity, 0.045);
      }
      scene.environmentIntensity = THREE.MathUtils.lerp(scene.environmentIntensity, environmentIntensity, 0.045);
      if (s.hemisphere) {
        s.hemisphere.intensity = THREE.MathUtils.lerp(s.hemisphere.intensity, hemisphereIntensity, 0.045);
      }

      if (s.airflow) {
        const visible = performanceState.active && performanceState.airflowOn;
        s.airflow.group.visible = visible;
        if (visible) {
          s.airflow.arrows.forEach(item => {
            item.arrow.position.y += s.airflow.speed * item.speed * delta;
            if (item.arrow.position.y > s.airflow.maxY) {
              item.arrow.position.y = s.airflow.minY;
            }
            item.arrow.position.x = THREE.MathUtils.clamp(
              item.baseX + Math.sin(now * 0.00145 + item.seed) * s.airflow.swayX,
              s.airflow.minX,
              s.airflow.maxX
            );
            item.arrow.position.z = THREE.MathUtils.clamp(
              item.baseZ + Math.sin(now * 0.0011 + item.seed) * s.airflow.swayZ,
              s.airflow.minZ,
              s.airflow.maxZ
            );
          });
        }
      }

      if (
        performanceState.active &&
        performanceState.thermalOn &&
        performanceState.exposureSunTime !== performanceState.sunTime
      ) {
        updateThermalExposure(s.thermalSurfaces, s.thermalOccluders, sunTarget, scale);
        performanceState.exposureSunTime = performanceState.sunTime;
      }

      const heatTarget = performanceState.active && performanceState.thermalOn
        ? sunPreset.heat
        : 0;
      performanceState.heatCurrent = THREE.MathUtils.lerp(performanceState.heatCurrent, heatTarget, 0.035);
      if (performanceState.active || performanceState.wasActive) {
        if (performanceState.heatCurrent > 0.002) {
          setThermalVisualization(s.thermalSurfaces, performanceState.heatCurrent, performanceState.airflowOn);
        } else {
          clearThermalVisualization(s.thermalSurfaces);
        }
      }
      performanceState.wasActive = performanceState.active;

      s.controls.update();
      renderer.render(scene, s.camera);
    };
    s.raf = requestAnimationFrame(animate);

    return () => {
      alive = false;
      if (s.performanceReadyTimer) window.clearTimeout(s.performanceReadyTimer);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(s.raf);
      scene.clear();
      if (s.airflow) {
        s.airflow.group.traverse(child => {
          child.geometry?.dispose();
          child.material?.dispose();
        });
      }
      clearThermalVisualization(s.thermalSurfaces);
      s.thermalSurfaces.forEach(surface => surface.material.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  const onMouseMove = e => {
    const s = stateRef.current;
    if (!s.renderer || !s.hoverTargets.length) return;
    if (s.performance.active) {
      setActiveHover(null);
      setLabel(null);
      return;
    }
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
    if (s.performance.active) return;
    const { hits } = updatePointer(e);
    if (!hits.length) return;

    const topLayerName = hits[0].object.userData.topLayerName;
    toggleSystemDetail(topLayerName);
  };

  const toggleAll = () => {
    if (stateRef.current.performance.active) return;
    const allDetailsOpen = Object.values(detailExploded).every(Boolean);
    if (!systemExploded) openSystemStage();
    else if (!allDetailsOpen) openAllDetails();
    else closeAll();
  };

  const expandedDetails = Object.values(detailExploded).filter(Boolean).length;
  const allDetailsExploded = Object.values(detailExploded).every(Boolean);
  const performanceAvailable = !loading && performanceReady && !systemExploded && expandedDetails === 0;
  const performanceButtonEnabled = performanceMode || performanceAvailable;

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
        width: "min(300px, 40vw)",
        maxHeight: "calc(100% - 140px)",
        overflowY: "auto",
        padding: "0.35rem 0",
        background: "rgba(255,255,255,0.72)",
        borderLeft: `1px solid rgba(196,166,110,0.52)`,
        backdropFilter: "blur(10px)",
        zIndex: 8,
        pointerEvents: performanceMode ? "none" : "auto",
        opacity: performanceMode ? 0.28 : 1,
        transition: "opacity .25s",
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
                  background: activeSystem || open ? "rgba(196,166,110,0.055)" : "transparent",
                  color: open ? "#080807" : "rgba(8,8,7,0.86)",
                  cursor: "pointer",
                  fontFamily: F,
                  fontSize: "0.725rem",
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
                          background: activeDetail ? "rgba(8,8,7,0.035)" : "transparent",
                          color: activeDetail ? "#080807" : "rgba(8,8,7,0.68)",
                          cursor: item.url ? "pointer" : "default",
                          fontFamily: F,
                          fontSize: "0.7rem",
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

      {performanceMode && (
        <div style={{
          position: "absolute",
          right: 18,
          top: "50%",
          transform: "translateY(-50%)",
          width: "min(319px, 40vw)",
          padding: "0.94rem 1rem 0.88rem",
          background: "rgba(255,255,255,0.72)",
          borderLeft: "1px solid rgba(84,145,167,0.42)",
          backdropFilter: "blur(12px)",
          zIndex: 9,
          fontFamily: F,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              fontSize: "0.725rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(8,8,7,0.72)",
            }}>Performance</span>
            <button onClick={togglePerformanceMode} style={{
              border: "none",
              background: "none",
              color: "rgba(8,8,7,0.48)",
              cursor: "pointer",
              fontFamily: F,
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: 0,
            }}>Exit</button>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <span style={{
              display: "block",
              marginBottom: "0.35rem",
              fontSize: "0.6rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(8,8,7,0.42)",
            }}>Sunlight</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
              {Object.keys(SUN_PRESETS).map(time => (
                <button key={time} onClick={() => chooseSunTime(time)} style={{
                  border: "1px solid rgba(8,8,7,0.1)",
                  background: sunTime === time ? "rgba(196,166,110,0.18)" : "rgba(255,255,255,0.42)",
                  color: sunTime === time ? "rgba(8,8,7,0.82)" : "rgba(8,8,7,0.48)",
                  cursor: "pointer",
                  fontFamily: F,
                  fontSize: "0.575rem",
                  letterSpacing: "0.05em",
                  padding: "0.35rem 0.1rem",
                }}>{time}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: "0.55rem" }}>
            <button onClick={toggleAirflow} style={{
              border: `1px solid ${airflowOn ? "rgba(84,145,167,0.38)" : "rgba(8,8,7,0.1)"}`,
              background: airflowOn ? "rgba(120,204,232,0.14)" : "rgba(255,255,255,0.42)",
              color: airflowOn ? "rgba(31,91,112,0.78)" : "rgba(8,8,7,0.46)",
              cursor: "pointer",
              fontFamily: F,
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.38rem 0.2rem",
            }}>Airflow {airflowOn ? "On" : "Off"}</button>
            <button onClick={toggleThermal} style={{
              border: `1px solid ${thermalOn ? "rgba(84,145,167,0.38)" : "rgba(8,8,7,0.1)"}`,
              background: thermalOn ? "rgba(120,204,232,0.14)" : "rgba(255,255,255,0.42)",
              color: thermalOn ? "rgba(31,91,112,0.78)" : "rgba(8,8,7,0.46)",
              cursor: "pointer",
              fontFamily: F,
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.38rem 0.2rem",
            }}>Thermal {thermalOn ? "On" : "Off"}</button>
          </div>

          <p style={{
            margin: "0.65rem 0 0",
            fontSize: "0.525rem",
            letterSpacing: "0.07em",
            lineHeight: 1.45,
            textTransform: "uppercase",
            color: "rgba(8,8,7,0.3)",
          }}>Conceptual thermal visualization</p>
        </div>
      )}

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

      <div style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        zIndex: 9,
      }}>
        <button onClick={toggleAll} disabled={performanceMode} style={{
          background: systemExploded ? C_gold : "rgba(8,8,7,0.82)",
          border: `1px solid ${C_gold}`,
          color: systemExploded ? "#080807" : C_gold,
          fontFamily: F,
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          width: 168,
          height: 38,
          cursor: performanceMode ? "not-allowed" : "pointer",
          opacity: performanceMode ? 0.28 : 1,
          transition: "all .3s",
          backdropFilter: "blur(8px)",
        }}>
          {!systemExploded ? "Explode View" : allDetailsExploded ? "Collapse All" : "Explode Details"}
        </button>
        <button
          onClick={togglePerformanceMode}
          disabled={!performanceButtonEnabled}
          style={{
            border: `1px solid ${performanceButtonEnabled ? "rgba(84,145,167,0.58)" : "rgba(8,8,7,0.12)"}`,
            background: performanceMode
              ? "rgba(84,145,167,0.78)"
              : performanceAvailable
                ? "rgba(225,242,247,0.82)"
                : "rgba(255,255,255,0.36)",
            color: performanceMode
              ? "#ffffff"
              : performanceAvailable
                ? "rgba(31,91,112,0.82)"
                : "rgba(8,8,7,0.26)",
            cursor: performanceButtonEnabled ? "pointer" : "not-allowed",
            fontFamily: F,
            fontSize: "0.65rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            width: 168,
            height: 38,
            backdropFilter: "blur(9px)",
            transition: "all .3s",
          }}
        >{performanceMode ? "Exit Performance" : "Performance"}</button>
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
        Drag to rotate<br/>Scroll to zoom<br/>{performanceMode ? "Performance study" : "Click to explode"}<br/>
        {performanceMode
          ? `${sunTime} · airflow ${airflowOn ? "on" : "off"}`
          : expandedDetails
            ? `${expandedDetails} detail list${expandedDetails > 1 ? "s" : ""} open`
            : "Hover to identify"}
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
