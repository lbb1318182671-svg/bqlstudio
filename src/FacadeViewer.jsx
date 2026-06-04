import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const EXPLODE_UP  = ["roof_clt", "roof_finish", "roof_pv"];
const EXPLODE_OUT = ["env2_poly", "env2_bracket", "env1_frame", "env1_glazing"];

const LABELS = {
  env1_frame:   { name:"Timber Window Frame",            spec:"Wood frame, painted white" },
  env1_glazing: { name:"Double Glazing Unit",            spec:"6 / 16 / 6 mm, argon-filled" },
  env2_bracket: { name:"Steel Mounting Bracket",         spec:"Galvanized steel, light framing" },
  env2_poly:    { name:"Corrugated Polycarbonate Sheet", spec:"Semi-transparent, 10 mm" },
  roof_clt:     { name:"½″ CLT Roof Slab",              spec:"5-ply cross-laminated timber" },
  roof_finish:  { name:"Rooftop Finish Assembly",        spec:"Insulation · waterproofing · standing seam" },
  roof_pv:      { name:"Photovoltaic Panel",             spec:"Monocrystalline silicon, tilt-mounted" },
};

const MAT = {
  env1_frame:       new THREE.MeshStandardMaterial({ color:0xd4b896, roughness:0.7, metalness:0.0 }),
  env1_glazing:     new THREE.MeshPhysicalMaterial({ color:0xaaccdd, roughness:0.05, metalness:0.0, transparent:true, opacity:0.4 }),
  env2_bracket:     new THREE.MeshStandardMaterial({ color:0x888888, roughness:0.4, metalness:0.8 }),
  env2_poly:        new THREE.MeshPhysicalMaterial({ color:0xddeeff, roughness:0.1, metalness:0.0, transparent:true, opacity:0.5 }),
  roof_clt:         new THREE.MeshStandardMaterial({ color:0xc8a87a, roughness:0.8, metalness:0.0 }),
  roof_finish:      new THREE.MeshStandardMaterial({ color:0x888880, roughness:0.6, metalness:0.3 }),
  roof_pv:          new THREE.MeshStandardMaterial({ color:0x1a2a4a, roughness:0.3, metalness:0.1 }),
  core_wall:        new THREE.MeshStandardMaterial({ color:0xb0a898, roughness:0.9, metalness:0.0 }),
  core_floor:       new THREE.MeshStandardMaterial({ color:0xa8a090, roughness:0.9, metalness:0.0 }),
  column_wood:      new THREE.MeshStandardMaterial({ color:0xc8a87a, roughness:0.7, metalness:0.0 }),
  beam_clt:         new THREE.MeshStandardMaterial({ color:0xc8a87a, roughness:0.7, metalness:0.0 }),
  floor_finish:     new THREE.MeshStandardMaterial({ color:0xd0c8b8, roughness:0.8, metalness:0.0 }),
  floor_insulation: new THREE.MeshStandardMaterial({ color:0xe8d890, roughness:0.9, metalness:0.0 }),
};

const C_gold = "#c4a66e";
const F = "'Jost', sans-serif";

// 用户调整过的距离
const DIST_MAP = {
  env1_frame:   0.3,
  env1_glazing: 0.3,
  env2_bracket: 0.6,
  env2_poly:    0.8,
  roof_pv:      0.8,
  roof_clt:     0.3,
  roof_finish:  0.5,
};

// Three.js 对重复名字加 _1 _2 后缀，用这个去掉还原原始名字
function baseName(name) {
  return name.replace(/_\d+$/, "");
}

export default function FacadeViewer({ onClose }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    renderer:null, camera:null, controls:null, scene:null,
    explodeMeshes:[], target:0, current:0,
    raf:null, modelScale:1,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  });
  const [exploded, setExploded] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [label,    setLabel]    = useState(null);

  useEffect(() => {
    const mount = mountRef.current;
    const s = stateRef.current;
    let alive = true;

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f7f4);
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
      const bbox  = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      const size   = bbox.getSize(new THREE.Vector3());
      model.position.sub(center);
      scene.add(model);
      model.updateMatrixWorld(true);

      const namedNodes = [];
      model.traverse(obj => {
        const raw = obj.name;
        if (!raw) return;
        const base = baseName(raw); // env1_frame_12 → env1_frame
        // 材质用 baseName
        if (MAT[base]) {
          if (obj.isMesh) obj.material = MAT[base];
          else obj.traverse(c => { if (c.isMesh) c.material = MAT[base]; });
        }
        if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
        namedNodes.push({ obj, base });
      });

      const OUT_DIR = new THREE.Vector3(-1, 0, 0);
      const UP_DIR  = new THREE.Vector3(0, 1, 0);

      const explodeMeshes = [];
      namedNodes.forEach(({ obj, base }) => {
        if (!EXPLODE_UP.includes(base) && !EXPLODE_OUT.includes(base)) return;
        explodeMeshes.push({
          mesh: obj,
          localOrigin: obj.position.clone(),
          dir: EXPLODE_UP.includes(base) ? UP_DIR.clone() : OUT_DIR.clone(),
          name: base, // 用 base 对应 DIST_MAP 和 LABELS
        });
      });

      s.explodeMeshes = explodeMeshes;
      s.modelScale = Math.max(size.x, size.z);
      console.log("Explodable:", explodeMeshes.length, "| modelScale:", s.modelScale.toFixed(2));

      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(maxDim, maxDim * 0.6, maxDim * 1.6);
      controls.target.set(0, 0, 0);
      controls.update();

      setLoading(false);
    }, undefined, err => console.error("GLB error:", err));

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    onResize();
    window.addEventListener("resize", onResize);

    const animate = () => {
      s.raf = requestAnimationFrame(animate);
      s.current += (s.target - s.current) * 0.055;
      const p = s.current;
      const scale = s.modelScale || 1;
      s.explodeMeshes.forEach(({ mesh, localOrigin, dir, name }) => {
        const dist = (DIST_MAP[name] || 0.3) * scale * p;
        mesh.position.set(
          localOrigin.x + dir.x * dist,
          localOrigin.y + dir.y * dist,
          localOrigin.z + dir.z * dist
        );
      });
      s.controls.update();
      renderer.render(scene, s.camera);
    };
    animate();

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
    if (!s.renderer || !s.explodeMeshes.length) return;
    const rect = mountRef.current.getBoundingClientRect();
    s.mouse.set(
      ((e.clientX - rect.left) / rect.width)  * 2 - 1,
     -((e.clientY - rect.top)  / rect.height) * 2 + 1
    );
    s.raycaster.setFromCamera(s.mouse, s.camera);
    const targets = [];
    s.explodeMeshes.forEach(({ mesh: obj, name }) => {
      if (obj.isMesh) { obj.__hoverName = name; targets.push(obj); }
      else obj.traverse(c => { if (c.isMesh) { c.__hoverName = name; targets.push(c); } });
    });
    const hits = s.raycaster.intersectObjects(targets, false);
    if (hits.length && LABELS[hits[0].object.__hoverName]) {
      const name = hits[0].object.__hoverName;
      setLabel({ ...LABELS[name], x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }
    setLabel(null);
  };

  const toggle = () => {
    const next = !exploded;
    setExploded(next);
    stateRef.current.target = next ? 1 : 0;
  };

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:"#f8f7f4" }}>
      <div ref={mountRef} style={{ width:"100%", height:"100%" }}
        onMouseMove={onMouseMove} onMouseLeave={()=>setLabel(null)}/>

      {loading && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", background:"rgba(248,247,244,0.95)" }}>
          <div style={{ width:40, height:2, background:C_gold, marginBottom:"1rem",
            animation:"pulse 1.2s ease-in-out infinite" }}/>
          <span style={{ fontFamily:F, fontSize:"0.68rem", letterSpacing:"0.22em",
            textTransform:"uppercase", color:"rgba(0,0,0,0.4)" }}>Loading model</span>
          <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
        </div>
      )}

      {label && (
        <div style={{ position:"absolute", left:label.x+16, top:label.y-10,
          background:"rgba(8,8,7,0.88)", border:`1px solid rgba(196,166,110,0.3)`,
          padding:"0.55rem 0.9rem", pointerEvents:"none", zIndex:10, maxWidth:240 }}>
          <p style={{ fontFamily:F, fontSize:"0.78rem", fontWeight:400, color:"#fff", margin:0, lineHeight:1.3 }}>{label.name}</p>
          <p style={{ fontFamily:F, fontSize:"0.6rem", letterSpacing:"0.1em", color:C_gold, margin:"0.3rem 0 0", textTransform:"uppercase" }}>{label.spec}</p>
        </div>
      )}

      <div style={{ position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)" }}>
        <button onClick={toggle} style={{
          background: exploded ? C_gold : "rgba(8,8,7,0.82)",
          border:`1px solid ${C_gold}`,
          color: exploded ? "#080807" : C_gold,
          fontFamily:F, fontSize:"0.65rem", letterSpacing:"0.2em",
          textTransform:"uppercase", padding:"9px 28px",
          cursor:"pointer", transition:"all .3s", backdropFilter:"blur(8px)"
        }}>
          {exploded ? "Collapse" : "Explode View"}
        </button>
      </div>

      <div style={{ position:"absolute", top:14, right:16,
        fontFamily:F, fontSize:"0.56rem", letterSpacing:"0.14em",
        color:"rgba(0,0,0,0.3)", textTransform:"uppercase", lineHeight:1.6, textAlign:"right" }}>
        Drag to rotate<br/>Scroll to zoom<br/>Hover to identify
      </div>

      {onClose && (
        <button onClick={onClose} style={{ position:"absolute", top:14, left:14,
          background:"none", border:`1px solid rgba(0,0,0,0.15)`,
          color:"rgba(0,0,0,0.5)", fontFamily:F, fontSize:"0.62rem",
          letterSpacing:"0.14em", textTransform:"uppercase",
          padding:"5px 12px", cursor:"pointer" }}>
          ← Back
        </button>
      )}
    </div>
  );
}