import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const HERO_MODELS = [
  {
    id: "corita",
    url: "/models/coritaexplodefacade.glb",
    position: [-2.1, 0.22, 0],
    frontCorrection: [0, Math.PI / 2, 0],
    targetHeight: 2.42,
  },
  {
    id: "bones-scales",
    url: "/models/bonesandscales.glb",
    position: [2.0, 0.02, 0],
    frontCorrection: [0, 0, 0],
    targetHeight: 1.87,
  },
];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeTexture({
  base,
  accent,
  seed,
  repeat = [1, 1],
  count = 900,
  grain = false,
  trowel = false,
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

  for (let i = 0; i < count; i += 1) {
    ctx.globalAlpha = 0.025 + random() * 0.085;
    const size = 0.3 + random() * 1.8;
    ctx.fillRect(random() * canvas.width, random() * canvas.height, size, size);
  }

  if (grain) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 120; i += 1) {
      const y = random() * canvas.height;
      ctx.globalAlpha = 0.025 + random() * 0.08;
      ctx.lineWidth = 0.25 + random() * 0.7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(70, y + random() * 4, 188, y - random() * 4, 256, y + random() * 2);
      ctx.stroke();
    }
  }

  if (trowel) {
    ctx.strokeStyle = accent;
    for (let i = 0; i < 32; i += 1) {
      ctx.globalAlpha = 0.014 + random() * 0.04;
      ctx.lineWidth = 5 + random() * 16;
      ctx.beginPath();
      ctx.arc(random() * 256, random() * 256, 18 + random() * 70, random() * Math.PI, random() * Math.PI + Math.PI * 0.85);
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

function makePerforationTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#000";

  for (let y = -8; y < 520; y += 8) {
    const rowOffset = Math.round(y / 8) % 2 ? 4 : 0;
    for (let x = -8; x < 520; x += 8) {
      const u = (x + rowOffset) / 512;
      const v = y / 512;
      const fan = THREE.MathUtils.clamp(1.22 - Math.hypot(u - 0.52, v - 0.08) * 1.05, 0.72, 1.18);
      ctx.beginPath();
      ctx.arc(x + rowOffset, y, 2.7 * fan, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makeMaterialKit() {
  const wood = makeTexture({ base: "#d8bb87", accent: "#65472d", seed: 13, repeat: [1.2, 5.5], grain: true });
  const plywood = makeTexture({ base: "#ddd2bd", accent: "#9b8060", seed: 23, repeat: [1.5, 3.5], grain: true });
  const woodRough = makeTexture({ base: "#c5c5c5", accent: "#464646", seed: 31, repeat: [1.2, 5.5], grain: true, colorSpace: false });
  const concrete = makeTexture({ base: "#8f9493", accent: "#4d5555", seed: 41, repeat: [3, 3], count: 1450, trowel: true });
  const concreteRough = makeTexture({ base: "#b5b5b5", accent: "#494545", seed: 43, repeat: [3, 3], count: 1450, trowel: true, colorSpace: false });
  const metal = makeTexture({ base: "#c8ccce", accent: "#7a858a", seed: 61, repeat: [1, 8], count: 760, grain: true });
  const metalRough = makeTexture({ base: "#bdbdbd", accent: "#626a6e", seed: 67, repeat: [1, 8], count: 760, grain: true, colorSpace: false });
  const bone = makeTexture({ base: "#f0eee8", accent: "#b9b2a7", seed: 71, repeat: [2.2, 2.2], count: 680 });
  const boneRough = makeTexture({ base: "#d1d1d1", accent: "#6f6d68", seed: 73, repeat: [2.2, 2.2], count: 680, colorSpace: false });
  const perforation = makePerforationTexture();

  const matte = (color, roughness = 0.82) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const metalMat = (color, metalness = 0.5, roughness = 0.68) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const texturedMatte = (map, roughnessMap, roughness = 0.82, bumpScale = 0.014) => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    roughnessMap,
    bumpMap: roughnessMap,
    bumpScale,
    roughness,
    metalness: 0,
  });

  const texturedMetal = (map, roughnessMap, metalness = 0.52, roughness = 0.66) => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    roughnessMap,
    bumpMap: roughnessMap,
    bumpScale: 0.004,
    roughness,
    metalness,
  });

  const timber = texturedMatte(wood, woodRough, 0.8);
  const plywoodMat = texturedMatte(plywood, woodRough, 0.82);
  const concreteMat = texturedMatte(concrete, concreteRough, 0.96, 0.055);
  const zinc = texturedMetal(metal, metalRough, 0.56, 0.66);
  const boneMat = texturedMatte(bone, boneRough, 0.86, 0.012);
  const perforatedAluminum = new THREE.MeshStandardMaterial({
    color: 0xd8dbda,
    map: metal,
    roughnessMap: metalRough,
    bumpMap: metalRough,
    bumpScale: 0.004,
    metalness: 0.46,
    roughness: 0.66,
    alphaMap: perforation,
    alphaTest: 0.62,
    side: THREE.DoubleSide,
  });

  return {
    timber,
    plywood: plywoodMat,
    concrete: concreteMat,
    zinc,
    bone: boneMat,
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x263033, roughness: 0.68, metalness: 0.52 }),
    translucent: new THREE.MeshPhysicalMaterial({
      color: 0xf5fbff,
      roughness: 0.52,
      metalness: 0,
      transparent: true,
      opacity: 0.64,
      transmission: 0.18,
      thickness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    perforated: perforatedAluminum,
    corita: {
      env1_seal: matte(0x333638),
      env1_flashing: zinc,
      env1_mesh: metalMat(0xc9ced1, 0.48, 0.72),
      env1_insul: matte(0xe8ddad),
      env1_frame: timber,
      env1_finish: plywoodMat,
      env1_batten: timber,
      env1_board: timber,
      env1_windowseal: matte(0x303235),
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
        alphaMap: perforation,
        alphaTest: 0.32,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
      }),
      env2_bracket: metalMat(0x858d92, 0.88, 0.4),
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
      roof_finish: zinc,
      roof_water: zinc,
      roof_panel: matte(0x26314a, 0.65),
      roof_slab: timber,
      roof_board: plywoodMat,
      roof_insul: matte(0xe9deac),
      roof_bracket: metalMat(0x8e9498, 0.6, 0.64),
      roof_batten: timber,
      duct: metalMat(0x1b4ddd, 0.8, 0.46),
      connection: metalMat(0x7e8588, 0.64, 0.6),
      door: metalMat(0x119958, 0.92, 0.36),
      floorslab: texturedMatte(wood, woodRough, 0.78, 0.024),
      beam_finish: plywoodMat,
      column_beam: timber,
      soundinsul: matte(0xe4dcae),
      floor_finish: texturedMatte(concrete, concreteRough, 0.84, 0.014),
      concrete: concreteMat,
    },
    bones: {
      scale: perforatedAluminum,
      bone: boneMat,
      buildingSmall: matte(0x747776, 0.92),
      buildingLarge: concreteMat,
      bracket: metalMat(0x3f4648, 0.48, 0.74),
      default: matte(0xd8d6cf, 0.78),
    },
    fallbackPerforated: new THREE.MeshStandardMaterial({
      color: 0xaeb8ba,
      map: metal,
      roughnessMap: metalRough,
      bumpMap: metalRough,
      bumpScale: 0.004,
      metalness: 0.5,
      roughness: 0.58,
      alphaMap: perforation,
      alphaTest: 0.62,
      side: THREE.DoubleSide,
    }),
    defaultMatte: new THREE.MeshStandardMaterial({ color: 0xb0ada4, roughness: 0.78, metalness: 0 }),
  };
}

function cloneMaterial(material) {
  return material.clone ? material.clone() : material;
}

function isLargeBuildingSlab(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.isEmpty()) return false;
  const size = box.getSize(new THREE.Vector3());
  const sorted = [size.x, size.y, size.z].sort((a, b) => b - a);
  return sorted[0] * sorted[1] > 100 && sorted[2] < 1.25;
}

function applyHeroMaterials(model, kit) {
  model.traverse(node => {
    if (!node.isMesh) return;
    const layerName = node.parent?.name || node.name;

    if (kit.corita[layerName]) {
      node.material = cloneMaterial(kit.corita[layerName]);
    } else if (layerName === "SCALE") {
      node.material = cloneMaterial(kit.bones.scale);
    } else if (layerName === "BONE1" || layerName === "BONE2") {
      node.material = cloneMaterial(kit.bones.bone);
    } else if (layerName === "BUILDNG") {
      node.material = cloneMaterial(isLargeBuildingSlab(node) ? kit.bones.buildingLarge : kit.bones.buildingSmall);
    } else if (layerName === "SCREW" || layerName.includes("BRACKET")) {
      node.material = cloneMaterial(kit.bones.bracket);
    } else {
      node.material = cloneMaterial(kit.bones.default || kit.defaultMatte);
    }

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(material => {
      material.side = THREE.DoubleSide;
      if ("envMapIntensity" in material) material.envMapIntensity = 0.88;
      material.needsUpdate = true;
    });
    node.castShadow = false;
    node.receiveShadow = false;
  });
}

function fitModel(model, targetHeight) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const height = size.y || Math.max(size.x, size.z) || 1;
  const scale = targetHeight / height;
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  return { center, size, scale };
}

export default function HeroFacadeBackground() {
  const mountRef = useRef(null);
  const stateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    raf: null,
    models: [],
    loadedCount: 0,
    pointer: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
  });

  useEffect(() => {
    const mount = mountRef.current;
    const state = stateRef.current;
    let alive = true;
    window.__heroFacadeStatus = {
      loaded: [],
      errors: [],
      bounds: {},
      usingFallback: true,
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);
    state.renderer = renderer;

    const scene = new THREE.Scene();
    state.scene = scene;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    state.camera = camera;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.88;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dfd0, 0.72));

    const sun = new THREE.DirectionalLight(0xfff3dc, 1.72);
    sun.position.set(-4.2, 7.8, 5.4);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xd8ecff, 0.42);
    fill.position.set(5, 3.2, -6);
    scene.add(fill);

    const kit = makeMaterialKit();
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/gltf/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    const prepareModel = async config => {
      try {
        const gltf = await loader.loadAsync(config.url);
        const pivot = new THREE.Group();
        const orientation = new THREE.Group();
        const model = gltf.scene;

        applyHeroMaterials(model, kit);
        const fit = fitModel(model, config.targetHeight);
        window.__heroFacadeStatus.bounds[config.id] = {
          size: fit.size.toArray(),
          center: fit.center.toArray(),
          scale: fit.scale,
        };

        orientation.rotation.set(...config.frontCorrection);
        orientation.add(model);
        pivot.position.set(...config.position);
        pivot.add(orientation);

        return { config, pivot };
      } catch (err) {
        window.__heroFacadeStatus.errors.push({ id: config.id, message: err?.message || String(err) });
        console.error(`Hero model failed to load: ${config.id}`, err);
        return null;
      }
    };

    HERO_MODELS.forEach(config => {
      prepareModel(config).then(result => {
        if (!alive || !result) return;
        const { config: loadedConfig, pivot } = result;
        scene.add(pivot);
        state.models.push(pivot);
        window.__heroFacadeStatus.loaded.push(loadedConfig.id);
        state.loadedCount += 1;
        if (state.loadedCount === HERO_MODELS.length) {
          window.__heroFacadeStatus.usingFallback = false;
          mount.classList.add("is-webgl-loaded");
        }
      });
    });

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      const aspect = width / Math.max(height, 1);
      const viewHeight = width < 760 ? 4.85 : 4.65;
      const viewWidth = viewHeight * aspect;
      renderer.setSize(width, height);
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    };
    onResize();
    window.addEventListener("resize", onResize);

    const animate = () => {
      state.raf = requestAnimationFrame(animate);
      state.current.x = THREE.MathUtils.lerp(state.current.x, state.pointer.x, 0.075);
      state.current.y = THREE.MathUtils.lerp(state.current.y, state.pointer.y, 0.075);

      const targetYaw = state.current.x * 0.18;
      const targetPitch = -state.current.y * 0.075;
      state.models.forEach((model, index) => {
        model.rotation.y = targetYaw * (index === 0 ? 1 : 0.92);
        model.rotation.x = targetPitch;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(state.raf);
      scene.traverse(child => {
        child.geometry?.dispose?.();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => material?.dispose?.());
      });
      environment.dispose();
      pmrem.dispose();
      draco.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      state.models = [];
    };
  }, []);

  const updatePointer = event => {
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    stateRef.current.pointer.x = x;
    stateRef.current.pointer.y = y;
    mountRef.current.style.setProperty("--fallback-rotate-y", `${(x * 7).toFixed(2)}deg`);
    mountRef.current.style.setProperty("--fallback-rotate-x", `${(-y * 4).toFixed(2)}deg`);
  };

  const resetPointer = () => {
    stateRef.current.pointer.x = 0;
    stateRef.current.pointer.y = 0;
    mountRef.current.style.setProperty("--fallback-rotate-y", "0deg");
    mountRef.current.style.setProperty("--fallback-rotate-x", "0deg");
  };

  return (
    <div
      ref={mountRef}
      className="hero-facade-background"
      onPointerMove={updatePointer}
      onPointerLeave={resetPointer}
      aria-hidden="true"
    >
      <div className="hero-facade-fallback">
        <img className="hero-facade-fallback-model hero-facade-fallback-model-left" src="/images/coritafacade.png" alt="" />
        <img className="hero-facade-fallback-model hero-facade-fallback-model-right" src="/images/bonesandscales.png" alt="" />
      </div>
    </div>
  );
}
