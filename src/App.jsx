import { useState, useEffect, useRef, useCallback } from "react";
import CoritaDetailViewer from "./CoritaDetailViewer";
import BonesScalesDetailViewer from "./BonesScalesDetailViewer";
import HeroFacadeBackground from "./HeroFacadeBackground";

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #ffffff; color: #151515; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: #ffffff; }
  ::-webkit-scrollbar-thumb { background: rgba(166,132,75,0.36); border-radius: 2px; }
`;

const C = {
  bg:      "#ffffff",
  surface: "#f6f6f3",
  gold:    "#a6844b",
  goldDim: "rgba(166,132,75,0.3)",
  text:    "#151515",
  textDim: "rgba(21,21,21,0.62)",
  border:  "rgba(21,21,21,0.14)",
};
const F = { display:"'Jost', sans-serif", ui:"'Jost', sans-serif" };

const PROJECTS = [
  { id:"01", title:"The Enfolding", subtitle:"Corita Kent Art Center",
    type:"Art foundation building", year:"Spring 2024", tag:"Individual", location:"Boyle Heights, Los Angeles", hasFacade:true, facadePages:[0,4],
    brief:"A folded architectural skin wraps the art center, filtering light and creating a gradient of enclosure from public plaza to intimate gallery. The envelope responds to the existing urban fabric while establishing a distinct institutional presence.",
    cover:"/images/01/cover.jpg",
    images:["/images/01/1.jpg","/images/01/2.jpg","/images/01/3.jpg","/images/01/4.jpg","/images/01/5.jpg","/images/01/6.jpg","/images/01/7.jpg","/images/01/8.jpg"],
    captions:["","","","","","","Interior render — Fourth Floor Gallery.","Exterior render — Docking Area."] },
  { id:"02", title:"The Bones and Scales", subtitle:"Facade Design & Joint Studies",
    type:"Facade design", year:"Spring 2025", tag:"Group project", location:"Los Angeles, CA", hasFacade:true, facadePages:[0,3],
    brief:"An investigation into tectonic expression through facade articulation. The project studies how structural logic — bones — and surface modulation — scales — can be unified into a coherent architectural language.",
    cover:"/images/02/cover.jpg",
    images:["/images/02/1.jpg","/images/02/2.jpg","/images/02/3.jpg","/images/02/4.jpg","/images/02/5.jpg"],
    captions:["","","","",""] },
  { id:"03", title:"Eternal Life", subtitle:"In Between the Living and the Deceased",
    type:"Memorial complex", year:"Fall 2024", tag:"Group project", location:"Los Angeles, CA", hasFacade:false,
    brief:"A memorial complex that negotiates the threshold between the living and the deceased. Spatial sequences guide visitors through states of grief, remembrance, and release, using light and material to mark the passage of time.",
    cover:"/images/03/cover.jpg",
    images:["/images/03/1.jpg","/images/03/2.jpg","/images/03/3.jpg","/images/03/4.jpg","/images/03/5.jpg","/images/03/6.jpg","/images/03/7.jpg","/images/03/8.jpg","/images/03/9.jpg","/images/03/10.jpg"],
    captions:["","","","","","","","","",""] },
  { id:"04", title:"Co-Individual Housing", subtitle:"Co-living from Minimal Dwelling",
    type:"Residential", year:"Fall 2023", tag:"Individual", location:"Los Angeles, CA", hasFacade:false,
    brief:"Starting from the minimal dwelling unit, the project builds upward toward a co-living model that preserves individual autonomy while creating meaningful shared spaces. Aggregation strategies allow flexible density responses.",
    cover:"/images/04/cover.jpg",
    images:["/images/04/1.jpg","/images/04/2.jpg","/images/04/3.jpg","/images/04/4.jpg","/images/04/5.jpg","/images/04/6.jpg","/images/04/7.jpg","/images/04/8.jpg"],
    captions:["","Phase I: Minimal Dwelling Unit","Phase II: 10-Unit Collective Housing","Phase III: 50-Unit Co-individual Housing System study.","","",""] },
  { id:"05", title:"The Rise of Altadena", subtitle:"Community Church",
    type:"Church — Competition", year:"Fall 2025", tag:"Team competition", location:"Altadena, CA", hasFacade:false,
    brief:"A community church conceived as an act of spiritual ascent. The structure rises from the earth through a series of compressed and expanding volumes, culminating in a luminous sanctuary that anchors the post-fire Altadena community.",
    cover:"/images/05/cover.jpg",
    images:["/images/05/1.jpg","/images/05/2.jpg","/images/05/3.jpg","/images/05/4.jpg","/images/05/5.jpg"],
    captions:["","","","",""] },
  { id:"06", title:"BIM Modeling", subtitle:"Revit Sample",
    type:"BIM / Documentation", year:"2023–2024", tag:"Professional", location:"Los Angeles, CA", hasFacade:false,
    brief:"A professional BIM documentation sample demonstrating coordination across architectural, structural, and MEP systems. Developed to industry standards with detailed construction documentation and clash detection.",
    cover:"/images/06/cover.jpg",
    images:["/images/06/1.jpg","/images/06/2.jpg","/images/06/3.jpg","/images/06/4.jpg"],
    captions:["","","","Professional Sample"] },
  { id:"07", title:"Model Collection", subtitle:"Fabrication & Physical Models",
    type:"Fabrication", year:"Spring 2025", tag:"Collection", location:"Los Angeles, CA", hasFacade:false,
    brief:"A curated collection of physical models produced across multiple studio projects. Techniques include laser cutting, hand fabrication, and 3D printing, reflecting the development of spatial thinking through making.",
    cover:"/images/07/cover.jpg",
    images:["/images/07/1.jpg","/images/07/2.jpg"],
    captions:["",""] },
  { id:"08", title:"New Urban Model", subtitle:"Aging Population",
    type:"Academic Thesis Project", year:"Fall 2024 + Spring 2025", tag:"Individual", location:"Los Angeles, CA", hasFacade:false,
    brief:"An urban design thesis investigating new models of community infrastructure for aging populations. The project proposes a distributed network of care-integrated housing and public space across Los Angeles.",
    cover:"/images/08/cover.jpg",
    images:["/images/08/1.jpg","/images/08/2.jpg","/images/08/3.jpg","/images/08/4.jpg","/images/08/5.jpg","/images/08/6.jpg","/images/08/7.jpg","/images/08/8.jpg"],
    captions:["","","","","","",".",""] },
];

const FACADES = [
  { id:"F1", title:"The Enfolding — Facade Detail", cover:"/images/coritafacade.png", layers:[] },
  { id:"F2", title:"The Bones and Scales — Facade Detail", cover:"/images/bonesandscales.png", layers:[] },
  { id:"F3", title:"/", layers:["Facing Brick (100mm)","Open Cavity","Stainless Steel Ties","Breather Membrane","Rigid Insulation","Structural Frame"] },
  { id:"F4", title:"Folded Metal Skin", layers:["Folded Zinc Panel","Sub-Frame Bracket","Thermal Break","Air Barrier","Structural Steel Frame","Interior Lining"] },
];

function Rule({ style }) {
  return <div style={{ height:1, background:C.border, ...style }}/>;
}
function Grain() {
  return (
    <svg style={{ position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:50,opacity:0.03,mixBlendMode:"overlay" }}>
      <filter id="gn"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
      <rect width="100%" height="100%" filter="url(#gn)"/>
    </svg>
  );
}
function useSwipe(onLeft, onRight) {
  const tx = useRef(null);
  return {
    onTouchStart: e => { tx.current = e.touches[0].clientX; },
    onTouchEnd: e => {
      if (tx.current === null) return;
      const dx = e.changedTouches[0].clientX - tx.current;
      if (Math.abs(dx) > 48) dx < 0 ? onLeft() : onRight();
      tx.current = null;
    },
  };
}
function SectionHeader({ title }) {
  return (
    <div>
      <h2 style={{ fontFamily:F.display, fontSize:"clamp(1.2rem,2.5vw,1.8rem)",
        fontWeight:300, color:C.text, letterSpacing:"0.06em",
        textTransform:"uppercase", lineHeight:1, margin:0 }}>{title}</h2>
    </div>
  );
}

function NavBar({ currentPage, currentProject, onNavigate, menu, setMenu }) {
  const NAV = ["Work Samples","Facade Designs","Photography","Contact"];
  return (
    <>
    <header style={{ position:"fixed",top:0,left:0,right:0,zIndex:40,
      background:"rgba(255,255,255,0.93)", backdropFilter:"blur(14px)",
      borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
        height:58, padding:"0 clamp(1.25rem,4vw,3.5rem)" }}>
        <button onClick={()=>onNavigate(null)} style={{ background:"none",border:"none",
          cursor:"pointer", display:"flex", alignItems:"center", gap:"0.65rem" }}>
          <img src="/logo.png" alt="BQL Studio" style={{ height:32, width:"auto", filter:"invert(1)" }} />
          <div style={{ display:"flex", flexDirection:"column", gap:"1px" }}>
            <span style={{ fontFamily:F.ui, fontSize:"0.82rem", letterSpacing:"0.18em", color:C.text, fontWeight:300, textTransform:"uppercase" }}>BQL Studio</span>
            <span style={{ fontFamily:F.ui, fontSize:"0.525rem", letterSpacing:"0.16em", color:"rgba(21,21,21,0.58)", fontWeight:300, textTransform:"none" }}>by Bingqing Li</span>
          </div>
        </button>
        <nav style={{ display:"flex", gap:"2rem" }} className="desk-nav">
          {NAV.map(n=>(
            <button key={n} onClick={()=>onNavigate(n)} style={{ background:"none",border:"none",cursor:"pointer",
              fontFamily:F.ui, fontSize:"0.68rem", letterSpacing:"0.18em", textTransform:"uppercase",
              color: currentPage===n && !currentProject ? C.gold : C.textDim,
              borderBottom: currentPage===n && !currentProject ? `1px solid ${C.gold}` : "1px solid transparent",
              padding:"3px 0", transition:"color .25s" }}>{n}</button>
          ))}
        </nav>
        <button onClick={()=>setMenu(o=>!o)} className="burger" style={{ background:"none",border:"none",cursor:"pointer",display:"none",flexDirection:"column",gap:5,padding:4 }}>
          {[0,1,2].map(i=>(
            <span key={i} style={{ display:"block", width:20, height:1, background:C.text,
              transform: menu ? i===1?"scaleX(0)":i===0?"rotate(45deg) translate(4px,4px)":"rotate(-45deg) translate(4px,-4px)" : "none",
              transition:"transform .3s" }}/>
          ))}
        </button>
      </div>
      <div style={{ overflow:"hidden", maxHeight:menu?"220px":"0", transition:"max-height .4s" }}>
        <Rule/>
        {NAV.map(n=>(
          <button key={n} onClick={()=>{ onNavigate(n); setMenu(false); }} style={{
            display:"block", width:"100%", textAlign:"left", background:"none", border:"none", cursor:"pointer",
            fontFamily:F.ui, fontSize:"0.8rem", letterSpacing:"0.18em", textTransform:"uppercase",
            color:currentPage===n ? C.gold : C.textDim, padding:"13px clamp(1.25rem,4vw,3.5rem)" }}>{n}</button>
        ))}
        <div style={{ height:12 }}/>
      </div>
      <style>{`@media(max-width:600px){.desk-nav{display:none!important}.burger{display:flex!important}}`}</style>
    </header>
    {currentProject && (
      <div style={{ position:"fixed", top:58, left:0, right:0, zIndex:39, height:28,
        background:"rgba(255,255,255,0.95)", backdropFilter:"blur(10px)",
        borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.2em", textTransform:"uppercase", color:C.textDim }}>
          {currentProject.id} — {currentProject.title}
        </span>
      </div>
    )}
    </>
  );
}

function ProjectIndexSidebar({ currentProject, onSwitchProject, top=58 }) {
  return (
    <div style={{ position:"fixed", left:0, top:top, bottom:0, zIndex:30,
      width:"clamp(48px,5.5vw,64px)", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:"clamp(0.6rem,1.2vh,1rem)",
      borderRight:`1px solid ${C.border}`, background:"rgba(255,255,255,0.86)", padding:"1.5rem 0" }}>
      {PROJECTS.map(p => {
        const isCurrent = p.id === currentProject.id;
        return <ProjectIndexItem key={p.id} project={p} isCurrent={isCurrent} onSwitch={()=>onSwitchProject(p)}/>;
      })}
    </div>
  );
}

function ProjectIndexItem({ project, isCurrent, onSwitch }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position:"relative" }} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <button onClick={onSwitch} style={{ background:"none", border:"none",
        cursor: isCurrent ? "default" : "pointer", fontFamily:F.ui,
        fontSize: isCurrent ? "0.88rem" : "0.62rem", fontWeight: isCurrent ? 500 : 300,
        letterSpacing:"0.1em", color: isCurrent ? C.gold : hov ? C.text : C.textDim,
        transition:"all .25s", lineHeight:1, padding:"2px 0",
        borderBottom: isCurrent ? `1px solid ${C.gold}` : "1px solid transparent",
        paddingBottom: isCurrent ? "2px" : "3px" }}>
        {project.id}
      </button>
      <div style={{ position:"absolute", left:"calc(100% + 12px)", top:"50%",
        pointerEvents:"none", opacity: hov ? 1 : 0,
        transform: hov ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(-6px)",
        transition:"opacity .2s ease, transform .2s ease",
        background:"#ffffff", border:`1px solid ${C.border}`,
        padding:"0.55rem 0.85rem", whiteSpace:"nowrap", zIndex:50 }}>
        <p style={{ fontFamily:F.display, fontSize:"0.82rem", fontWeight:300, color:C.text, margin:0, lineHeight:1.3 }}>{project.title}</p>
        <p style={{ fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.14em", textTransform:"uppercase", color:C.gold, margin:"0.3rem 0 0" }}>{project.type}</p>
      </div>
    </div>
  );
}

function ProjectViewer({ project, onSwitchProject, onNavigate, onOpenDetail }) {
  const [idx, setIdx] = useState(0);
  const total = project.images.length;
  const prev = useCallback(()=>setIdx(i=>Math.max(0,i-1)),[]);
  const next = useCallback(()=>setIdx(i=>Math.min(total-1,i+1)),[total]);

  useEffect(()=>{
    const h = e=>{
      if(e.key==="ArrowRight"||e.key==="ArrowDown") next();
      if(e.key==="ArrowLeft"||e.key==="ArrowUp") prev();
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[prev,next]);

  const swipe = useSwipe(next, prev);
  const pi = PROJECTS.findIndex(p=>p.id===project.id);
  const prevP = PROJECTS[pi-1]??null;
  const nextP = PROJECTS[pi+1]??null;

  const SB = "clamp(48px,5.5vw,64px)";
  const BH = "clamp(118px,18vh,148px)";
  const TOP = 86;

  return (
    <div style={{ minHeight:"100vh", background:C.bg }} {...swipe}>
      <ProjectIndexSidebar currentProject={project} onSwitchProject={onSwitchProject} top={TOP}/>
      <div style={{ marginLeft:SB, paddingBottom:BH,
        minHeight:"100vh", display:"flex", alignItems:"flex-start",
        justifyContent:"center", position:"relative",
        background:"#ffffff",
        paddingTop:`calc(${TOP}px + 0.25rem)` }}>
        <div style={{ width:"100%", height:`calc(100vh - ${TOP}px - ${BH})`, display:"flex", alignItems:"center",
          justifyContent:"center",
          padding:"0 clamp(2.5rem,7vw,5.5rem)" }}>
          {project.images[idx] ? (
            <img src={project.images[idx]} alt={`${project.title} — slide ${idx+1}`}
              style={{ maxWidth:"100%", height:"100%", maxHeight:"100%",
                objectFit:"contain", display:"block" }}/>
          ) : (
            <div style={{ width:"100%", maxWidth:860, aspectRatio:"16/9",
              background:"rgba(0,0,0,0.06)", border:`1px solid rgba(0,0,0,0.1)`,
              display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:"0.9rem" }}>
              <span style={{ fontFamily:F.display, fontSize:"clamp(2.5rem,6vw,4.5rem)",
                color:"rgba(196,166,110,0.3)", fontWeight:300 }}>{project.id}</span>
              <span style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.2em",
                textTransform:"uppercase", color:"rgba(0,0,0,0.3)" }}>{idx+1} / {total}</span>
            </div>
          )}
        </div>
        {[
          { side:"left", fn:prev, disabled:idx===0 },
          { side:"right", fn:next, disabled:idx===total-1 },
        ].map(a=>(
          <button key={a.side} onClick={a.fn} disabled={a.disabled} style={{
            position:"absolute", [a.side]:"clamp(0.4rem,1.5vw,1.2rem)", top:"50%",
            transform:"translateY(-50%)", background:"none", border:"none",
            cursor:a.disabled?"default":"pointer",
            color:a.disabled?"rgba(196,166,110,0.2)":C.gold,
            fontSize:"clamp(1.1rem,2.5vw,1.5rem)", lineHeight:1, padding:"0.6rem", transition:"color .2s" }}>
            {a.side==="left"?"←":"→"}
          </button>
        ))}
      </div>
      <div style={{ position:"fixed", bottom:0, left:SB, right:0, zIndex:30,
        background:"rgba(255,255,255,0.96)", backdropFilter:"blur(18px)",
        borderTop:`1px solid ${C.border}`,
        padding:"0.5rem clamp(1.5rem,5vw,4rem) 0.8rem" }}>
        <p style={{ fontFamily:F.display, fontStyle:"italic",
          fontSize:"clamp(0.7rem,1.4vw,0.88rem)",
          color:C.textDim, textAlign:"center", lineHeight:1.6,
          marginBottom:"0.5rem", minHeight:"1.3em" }}>
          {project.captions[idx]||""}
        </p>
        <Rule style={{ marginBottom:"0.5rem" }}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.5rem" }}>
          <button onClick={prevP?()=>onSwitchProject(prevP):undefined}
            style={{ background:"none", border:"none", cursor:prevP?"pointer":"default",
              fontFamily:F.ui, fontSize:"0.54rem", letterSpacing:"0.14em", textTransform:"uppercase",
              color:prevP?C.textDim:"transparent", transition:"color .2s", whiteSpace:"nowrap", flexShrink:0 }}
            onMouseEnter={e=>{ if(prevP) e.currentTarget.style.color=C.gold; }}
            onMouseLeave={e=>{ if(prevP) e.currentTarget.style.color=C.textDim; }}>
            ← {prevP?`${prevP.id} ${prevP.title}`:""}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:"0.28rem", flexWrap:"wrap", justifyContent:"center" }}>
            <button onClick={prev} disabled={idx===0}
              style={{ background:"none",border:"none",cursor:idx===0?"default":"pointer",
                fontFamily:F.ui, fontSize:"0.62rem", color:idx===0?C.goldDim:C.textDim,
                padding:"2px 5px", transition:"color .2s" }}>Prev</button>
            {project.images.map((_,i)=>(
              <button key={i} onClick={()=>setIdx(i)} style={{
                background:i===idx?C.gold:"none",
                border:`1px solid ${i===idx?C.gold:C.goldDim}`,
                color:i===idx?C.bg:C.textDim,
                fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.06em",
                width:22, height:22, cursor:"pointer", transition:"all .2s" }}>{i+1}</button>
            ))}
            <button onClick={next} disabled={idx===total-1}
              style={{ background:"none",border:"none",cursor:idx===total-1?"default":"pointer",
                fontFamily:F.ui, fontSize:"0.62rem", color:idx===total-1?C.goldDim:C.textDim,
                padding:"2px 5px", transition:"color .2s" }}>Next</button>
          </div>
          <button onClick={nextP?()=>onSwitchProject(nextP):undefined}
            style={{ background:"none", border:"none", cursor:nextP?"pointer":"default",
              fontFamily:F.ui, fontSize:"0.54rem", letterSpacing:"0.14em", textTransform:"uppercase",
              color:nextP?C.textDim:"transparent", transition:"color .2s", whiteSpace:"nowrap", flexShrink:0 }}
            onMouseEnter={e=>{ if(nextP) e.currentTarget.style.color=C.gold; }}
            onMouseLeave={e=>{ if(nextP) e.currentTarget.style.color=C.textDim; }}>
            {nextP?`${nextP.id} ${nextP.title}`:""} →
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.35rem" }}>
          <div style={{ flex:1 }}/>
          <p style={{ fontFamily:F.display, fontSize:"clamp(0.62rem,1.2vw,0.76rem)",
            color:"rgba(21,21,21,0.38)", textAlign:"center", letterSpacing:"0.04em", margin:0 }}>
            {project.subtitle}
            <span style={{ color:C.goldDim, margin:"0 0.45rem" }}>·</span>
            {project.type}
            <span style={{ color:C.goldDim, margin:"0 0.45rem" }}>·</span>
            {project.year}
          </p>
          <div style={{ flex:1, display:"flex", justifyContent:"flex-end" }}>
            {project.hasFacade && project.facadePages?.includes(idx) && (
              <button onClick={()=>project.id==="01" ? onOpenDetail("corita") : project.id==="02" ? onOpenDetail("bones-scales") : onNavigate("Facade Designs")} style={{
                background:"none", border:`1px solid rgba(196,166,110,0.45)`,
                color:C.gold, fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.16em",
                textTransform:"uppercase", padding:"3px 12px", cursor:"pointer", transition:"all .2s",
                display:"inline-flex", alignItems:"center", gap:"0.4rem" }}
                onMouseEnter={e=>{ e.currentTarget.style.background=C.gold; e.currentTarget.style.color=C.bg; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=C.gold; }}>
                ⊞ View Facade Detail
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Home({ onNavigate }) {
  const [vis, setVis] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),80); return()=>clearTimeout(t); },[]);
  const NAV = ["Work Samples","Facade Designs","Photography","Contact"];
  return (
    <div style={{ opacity:vis?1:0, transform:vis?"none":"translateY(14px)", transition:"opacity .7s ease, transform .7s ease" }}>
      <div className="home-hero-shell" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", padding:"clamp(1.5rem,4vw,3rem)", paddingTop:0, paddingBottom:0, position:"relative", overflow:"hidden" }}>
        <HeroFacadeBackground/>
        <div className="home-hero-haze"/>
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", paddingTop:68, position:"relative", zIndex:2, pointerEvents:"none" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"clamp(1.8rem,4.5vh,3.2rem)" }}>
            <img src="/logo.png" alt="BQL Studio" style={{ height:"clamp(60px,6vw,96px)", width:"auto", maxWidth:"clamp(120px,15vw,180px)", objectFit:"contain", filter:"invert(1)" }} />
          </div>
          <p style={{ fontFamily:F.ui, fontSize:"0.63rem", letterSpacing:"0.26em", textTransform:"uppercase", color:C.gold, marginBottom:"2rem" }}>
            Architecture &amp; Photography — bqlstudio.com
          </p>
          <h1 style={{ fontFamily:F.display, fontSize:"clamp(2.2rem,4.5vw,3.8rem)", lineHeight:1.05, color:C.text, letterSpacing:"0.08em", textTransform:"uppercase", margin:0 }}>
            <span style={{ fontWeight:500 }}>BQL</span>
            <span style={{ fontWeight:300 }}> Studio</span>
          </h1>
          <div style={{ height:"clamp(2rem,5vh,3.5rem)" }}/>
          <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"clamp(0.88rem,1.8vw,1.1rem)", color:C.textDim, lineHeight:1.8 }}>
            Architectural design, facade research, and spatial photography.
          </p>
        </div>
        <div style={{ paddingBottom:"clamp(3rem,7vh,5rem)", position:"relative", zIndex:3 }}>
          <div style={{ height:"clamp(1rem,2.5vh,2rem)" }}/>
          <Rule/>
          <div style={{ height:"clamp(2rem,5vh,3.5rem)" }}/>
          <nav style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:"clamp(0.5rem,2vw,1.5rem)" }}>
            {NAV.map((item,i)=>(
              <HomeNavButton key={item} item={item} index={i} onNavigate={onNavigate}/>
            ))}
          </nav>
          <div style={{ height:"clamp(0.75rem,2vh,1.5rem)" }}/>
        </div>
      </div>
    </div>
  );
}

function HomeNavButton({ item, index, onNavigate }) {
  const [hov,setHov] = useState(false);
  return (
    <button onClick={()=>onNavigate(item)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:"none", border:"none", cursor:"pointer", textAlign:"left", padding:"0.9rem 0",
        borderTop:`1px solid ${hov ? C.gold : C.border}`, transition:"border-color .3s" }}>
      <span style={{ fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.22em", textTransform:"uppercase", color:C.gold, display:"block", marginBottom:"0.35rem" }}>0{index+1}</span>
      <span style={{ fontFamily:F.display, fontSize:"1.05rem", fontWeight:300, color:C.text }}>{item}</span>
    </button>
  );
}

function WorkSamples({ onOpenProject, onNavigate, onOpenDetail }) {
  return (
    <div style={{ padding:"clamp(2rem,8vw,6rem)", paddingTop:100 }}>
      <SectionHeader label="01" title="Work Samples"/>
      <div style={{ height:"clamp(2rem,5vw,3.5rem)" }}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,300px),1fr))", gap:"clamp(1rem,3vw,2rem)" }}>
        {PROJECTS.map(p=>(
          <ProjectCard
            key={p.id}
            project={p}
            onOpen={()=>onOpenProject(p)}
            onFacade={()=>p.id==="01" ? onOpenDetail("corita") : p.id==="02" ? onOpenDetail("bones-scales") : onNavigate("Facade Designs")}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, onOpen, onFacade }) {
  const [hov,setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onOpen}
      style={{ border:`1px solid ${hov?"rgba(196,166,110,0.48)":C.border}`, transition:"all .3s",
        transform:hov?"translateY(-4px)":"none", background:"rgba(21,21,21,0.018)", cursor:"pointer" }}>
      <div style={{ aspectRatio:"4/3", background:"rgba(21,21,21,0.035)", display:"flex",
        alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
        {(project.cover || project.images[0])
          ? <img src={project.cover || project.images[0]} alt={project.title} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          : <>
              <span style={{ fontFamily:F.display, fontSize:"3.5rem", color:"rgba(196,166,110,0.07)", fontWeight:300, userSelect:"none" }}>{project.id}</span>
              <div style={{ position:"absolute",inset:0, background:"radial-gradient(circle at 30% 60%, rgba(196,166,110,0.04),transparent 70%)" }}/>
            </>
        }
      </div>
      <div style={{ padding:"1.2rem 1.5rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
          <h3 style={{ fontFamily:F.display, fontSize:"1.05rem", fontWeight:300, color:C.text, margin:0 }}>{project.title}</h3>
          <span style={{ fontFamily:F.ui, fontSize:"0.62rem", letterSpacing:"0.1em", color:"rgba(21,21,21,0.34)" }}>{project.year}</span>
        </div>
        <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.83rem", color:C.textDim, margin:"0.22rem 0 0.55rem", textAlign:"left" }}>{project.subtitle}</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.16em", textTransform:"uppercase", color:C.gold }}>{project.type}</span>
          {project.hasFacade && (
            <button onClick={e=>{ e.stopPropagation(); onFacade(); }} style={{
              background:"none", border:`1px solid rgba(196,166,110,0.32)`, color:C.gold,
              fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.16em", textTransform:"uppercase",
              padding:"5px 10px", cursor:"pointer", transition:"all .2s", flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.background=C.gold; e.currentTarget.style.color=C.bg; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=C.gold; }}>
              Facade →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FACADE DESIGNS ─────────────────────────────────────────────────────── */
function FacadeDesignCard({ facade, onOpenDetail, onSelect }) {
  const [hov,setHov]=useState(false);
  const openFacade = () => {
    if(facade.id==="F1"){
      onOpenDetail("corita");
    } else if(facade.id==="F2"){
      onOpenDetail("bones-scales");
    } else {
      onSelect(facade);
    }
  };

  return (
    <div
      onClick={openFacade}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ border:`1px solid ${hov?"rgba(196,166,110,0.5)":C.border}`, cursor:"pointer", padding:"2rem",
        background:hov?"rgba(166,132,75,0.045)":"rgba(21,21,21,0.018)", transition:"all .3s", transform:hov?"translateY(-4px)":"none" }}>
      <div style={{ aspectRatio:"3/2", marginBottom:"1.5rem", background:"rgba(21,21,21,0.035)",
        position:"relative", overflow:"hidden", display:"flex",alignItems:"center",justifyContent:"center" }}>
        {facade.cover ? (
          <img src={facade.cover} alt={facade.title} style={{
            width:"100%", height:"100%", objectFit:"cover", display:"block",
            transform:hov?"scale(1.025)":"scale(1)", transition:"transform .35s ease"
          }}/>
        ) : (
          <>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{ position:"absolute",left:`${8+i*22}%`,top:"12%",bottom:"12%",width:"18%",
                background:`rgba(196,166,110,${0.07+i*0.04})`, border:`1px solid rgba(196,166,110,0.14)`,
                transform:hov?`translateY(${i%2===0?-7:5}px)`:"none", transition:`transform ${0.28+i*0.05}s ease` }}/>
            ))}
            <span style={{ position:"relative",zIndex:1,fontFamily:F.ui,fontSize:"0.56rem",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(196,166,110,0.38)" }}>{facade.id}</span>
          </>
        )}
      </div>
      <h3 style={{ fontFamily:F.display, fontSize:"1rem", fontWeight:300, color:C.text, margin:"0 0 0.4rem" }}>{facade.title}</h3>
      {facade.layers.length > 0 && (
        <p style={{ fontFamily:F.ui, fontSize:"0.72rem", letterSpacing:"0.18em", color:C.gold, textTransform:"uppercase", margin:0 }}>{facade.layers.length} Layers</p>
      )}
      {(facade.id==="F1" || facade.id==="F2") && (
        <p style={{ fontFamily:F.ui, fontSize:"0.72rem", letterSpacing:"0.18em", color:C.gold, textTransform:"uppercase", margin:0 }}>3D Interactive</p>
      )}
    </div>
  );
}

function FacadeDesigns({ onOpenDetail }) {
  const [sel, setSel] = useState(null);
  const [exp, setExp] = useState(false);
  return (
    <div style={{ padding:"clamp(2rem,8vw,6rem)", paddingTop:100 }}>
      <SectionHeader label="02" title="Facade Designs"/>
      <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.92rem", color:C.textDim, margin:"1rem 0 clamp(2rem,5vw,3.5rem)" }}>
        Click a facade to explore the material schedule.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,240px),1fr))", gap:"clamp(1rem,3vw,2rem)" }}>
        {FACADES.map(f=>(
          <FacadeDesignCard
            key={f.id}
            facade={f}
            onOpenDetail={onOpenDetail}
            onSelect={next=>{ setSel(next); setExp(false); }}
          />
        ))}
      </div>
      {sel && sel.layers.length > 0 && (
        <div onClick={()=>setSel(null)} style={{ position:"fixed",inset:0,zIndex:60,background:"rgba(255,255,255,0.86)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(1rem,5vw,3rem)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#ffffff", border:`1px solid rgba(166,132,75,0.28)`, maxWidth:540, width:"100%", padding:"clamp(1.5rem,5vw,3rem)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <h2 style={{ fontFamily:F.display, fontSize:"clamp(1.2rem,4vw,1.75rem)", fontWeight:300, color:C.text, margin:0 }}>{sel.title}</h2>
              <button onClick={()=>setSel(null)} style={{ background:"none",border:"none",cursor:"pointer",color:C.textDim,fontSize:"1rem",padding:"0 0 0 1rem" }}>✕</button>
            </div>
            <div style={{ height:"1.5rem" }}/><Rule/><div style={{ height:"1.5rem" }}/>
            <button onClick={()=>setExp(e=>!e)} style={{ background:exp?C.gold:"none", border:`1px solid rgba(196,166,110,0.42)`, color:exp?C.bg:C.gold, fontFamily:F.ui, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", padding:"7px 16px", cursor:"pointer", transition:"all .25s" }}>
              {exp?"Collapse":"Explode View"}
            </button>
            <div style={{ marginTop:"2rem" }}>
              {sel.layers.map((layer,i)=>(
                <div key={i} style={{ padding:"0.8rem 1rem", marginBottom:"0.4rem",
                  background:`rgba(196,166,110,${0.03+i*0.025})`, border:`1px solid rgba(196,166,110,0.1)`,
                  transform:exp?`translateX(${i*15}px) translateY(${i*-8}px)`:"none", opacity:exp?1:0.82,
                  transition:`transform ${0.26+i*0.06}s ease, opacity .3s`, display:"flex",alignItems:"center",gap:"1rem" }}>
                  <span style={{ fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.15em", color:C.gold, minWidth:18, textAlign:"right" }}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{ fontFamily:F.ui, fontSize:"0.8rem", letterSpacing:"0.06em", textTransform:"uppercase", color:"rgba(21,21,21,0.72)" }}>{layer}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ARCH_PHOTOS = Array.from({length:17}, (_,i) => ({
  src: `/images/photography/architecture/${i+1}.jpg`,
  alt: `Architecture ${i+1}`,
}));

const COMM_PHOTOS = [];

function MasonryPhoto({ photo }) {
  const [hov, setHov] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ position:"relative", overflow:"hidden", cursor:"pointer",
        background:"rgba(21,21,21,0.035)",
        outline: hov ? `1px solid rgba(196,166,110,0.4)` : "1px solid transparent",
        transition:"outline .25s" }}>
      <img src={photo.src} alt={photo.alt} onLoad={()=>setLoaded(true)}
        style={{ width:"100%", height:"auto", display:"block",
          opacity: loaded ? 1 : 0,
          transform: hov ? "scale(1.02)" : "scale(1)",
          transition:"opacity .4s ease, transform .4s ease" }}/>
      {!loaded && (
        <div style={{ position:"absolute", inset:0, aspectRatio:"4/3",
          background:"rgba(21,21,21,0.035)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.15em", color:"rgba(196,166,110,0.2)", textTransform:"uppercase" }}>loading</span>
        </div>
      )}
    </div>
  );
}

function MasonryGrid({ photos }) {
  const cols = 3;
  const columns = Array.from({length:cols}, () => []);
  photos.forEach((photo, i) => columns[i % cols].push(photo));
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:"clamp(0.5rem,1.2vw,1rem)", alignItems:"start" }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ display:"flex", flexDirection:"column", gap:"clamp(0.5rem,1.2vw,1rem)" }}>
          {col.map(photo => <MasonryPhoto key={photo.src} photo={photo}/>)}
        </div>
      ))}
    </div>
  );
}

function Photography() {
  const [cat,setCat] = useState("Architecture");
  const photos = cat === "Architecture" ? ARCH_PHOTOS : COMM_PHOTOS;
  return (
    <div style={{ padding:"clamp(2rem,8vw,6rem)", paddingTop:100 }}>
      <SectionHeader label="03" title="Photography"/>
      <div style={{ height:"1.5rem" }}/>
      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"clamp(1.5rem,4vw,3rem)" }}>
        {["Architecture","Commercial"].map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{
            background:cat===c?C.gold:"none", border:`1px solid rgba(196,166,110,0.36)`,
            color:cat===c?C.bg:C.textDim, fontFamily:F.ui, fontSize:"0.65rem", letterSpacing:"0.18em",
            textTransform:"uppercase", padding:"8px 22px", cursor:"pointer", transition:"all .25s" }}>{c}</button>
        ))}
      </div>
      {cat==="Commercial" && COMM_PHOTOS.length===0 ? (
        <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.92rem", color:C.textDim }}>Commercial photography coming soon.</p>
      ) : (
        <MasonryGrid photos={photos}/>
      )}
    </div>
  );
}

function Contact() {
  return (
    <div style={{ minHeight:"100vh", padding:"clamp(2rem,8vw,6rem)", paddingTop:100,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <SectionHeader label="04" title="Contact"/>
      <div style={{ height:"clamp(2rem,6vw,4rem)" }}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,270px),1fr))", gap:"clamp(1rem,3vw,2.5rem)", maxWidth:680, width:"100%" }}>
        {[
          { label:"Professional", note:"Architecture employers & studios",
            links:[{ text:"bqli9905@gmail.com", href:"mailto:bqli9905@gmail.com" },{ text:"LinkedIn", href:"https://www.linkedin.com/in/bingqingl" }]},
          { label:"Studio", note:"Commercial photography & other business enquiries",
            links:[{ text:"contact@bqlstudio.com", href:"mailto:contact@bqlstudio.com" }]},
        ].map(card=>(
          <div key={card.label} style={{ padding:"2rem", border:`1px solid ${C.border}`, background:"rgba(21,21,21,0.018)", textAlign:"center" }}>
            <p style={{ fontFamily:F.ui, fontSize:"0.62rem", letterSpacing:"0.22em", textTransform:"uppercase", color:C.gold, margin:"0 0 0.55rem" }}>{card.label}</p>
            <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.88rem", color:C.textDim, margin:"0 0 1.5rem" }}>{card.note}</p>
            <Rule/>
            <div style={{ marginTop:"1.5rem", display:"flex", flexDirection:"column", gap:"0.7rem", alignItems:"center" }}>
              {card.links.map(l=>(
                <a key={l.text} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily:F.ui, fontSize:"0.86rem", letterSpacing:"0.05em", color:C.text, textDecoration:"none",
                    borderBottom:`1px solid rgba(196,166,110,0.26)`, paddingBottom:2,
                    transition:"color .2s, border-color .2s", display:"inline-block" }}
                  onMouseEnter={e=>{ e.currentTarget.style.color=C.gold; e.currentTarget.style.borderColor=C.gold; }}
                  onMouseLeave={e=>{ e.currentTarget.style.color=C.text; e.currentTarget.style.borderColor="rgba(196,166,110,0.26)"; }}>
                  {l.text}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatWidget() {
  const [open,setOpen] = useState(false);
  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{ position:"fixed",bottom:28,right:28,zIndex:55,
        width:50,height:50,borderRadius:"50%",background:C.gold,border:"none",cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        boxShadow:"0 4px 24px rgba(0,0,0,0.16)",transition:"transform .2s",
        fontFamily:F.ui, fontSize:"1rem", color:C.bg }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        {open?"✕":"✦"}
      </button>
      <div style={{ position:"fixed",bottom:88,right:28,zIndex:55,
        width:"clamp(275px,88vw,365px)", maxHeight:open?"460px":"0", overflow:"hidden",
        transition:"max-height .4s ease", boxShadow:"0 8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ background:"#ffffff", border:`1px solid rgba(166,132,75,0.28)`, display:"flex",flexDirection:"column",height:460 }}>
          <div style={{ padding:"1rem 1.25rem", borderBottom:`1px solid rgba(196,166,110,0.1)` }}>
            <p style={{ fontFamily:F.ui, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", color:C.gold, margin:0 }}>Studio Assistant</p>
            <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.78rem", color:C.textDim, margin:"0.15rem 0 0" }}>Ask me about any project</p>
          </div>
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem" }}>
            <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.85rem", color:"rgba(21,21,21,0.28)", textAlign:"center", lineHeight:1.75 }}>
              AI integration coming soon.<br/>I'll answer questions<br/>about any project here.
            </p>
          </div>
          <div style={{ padding:"1rem 1.25rem", borderTop:`1px solid rgba(196,166,110,0.08)`, display:"flex",gap:"0.5rem" }}>
            <input placeholder="Ask about a project..." disabled style={{ flex:1, background:"rgba(21,21,21,0.035)", border:`1px solid rgba(166,132,75,0.16)`, color:C.text, fontFamily:F.ui, fontSize:"0.8rem", letterSpacing:"0.05em", padding:"8px 12px", outline:"none" }}/>
            <button disabled style={{ background:"rgba(196,166,110,0.22)",border:"none", color:C.gold, padding:"8px 14px", fontFamily:F.ui, fontSize:"0.7rem", letterSpacing:"0.15em", cursor:"not-allowed" }}>→</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [page,    setPage]    = useState(null);
  const [project, setProject] = useState(null);
  const [menu,    setMenu]    = useState(false);
  const [mounted, setMounted] = useState(false);
  const [detailViewer, setDetailViewer] = useState(null);

  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),80); return()=>clearTimeout(t); },[]);

  const navigate      = p => { setProject(null); setPage(p); setMenu(false); window.scrollTo({top:0,behavior:"smooth"}); };
  const openProject   = p => { setProject(p); setPage("Work Samples"); window.scrollTo({top:0,behavior:"smooth"}); };
  const switchProject = p => { setProject(p); window.scrollTo({top:0,behavior:"smooth"}); };
  const openDetailViewer = id => setDetailViewer(id);
  const closeDetailViewer = () => setDetailViewer(null);

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <div style={{ minHeight:"100vh",
        background:"#ffffff",
        opacity:mounted?1:0, transition:"opacity .5s ease" }}>
        <Grain/>
        <NavBar currentPage={page} currentProject={project} onNavigate={navigate} menu={menu} setMenu={setMenu}/>
        {project ? (
          <ProjectViewer key={project.id} project={project} onSwitchProject={switchProject} onNavigate={navigate} onOpenDetail={openDetailViewer}/>
        ) : (
          <>
            {page===null             && <Home onNavigate={navigate}/>}
            {page==="Work Samples"   && <WorkSamples onOpenProject={openProject} onNavigate={navigate} onOpenDetail={openDetailViewer}/>}
            {page==="Facade Designs" && <FacadeDesigns onOpenDetail={openDetailViewer}/>}
            {page==="Photography"    && <Photography/>}
            {page==="Contact"        && <Contact/>}
          </>
        )}
        {detailViewer==="corita" && (
          <div style={{ position:"fixed", inset:0, zIndex:80 }}>
            <CoritaDetailViewer onClose={closeDetailViewer}/>
          </div>
        )}
        {detailViewer==="bones-scales" && (
          <div style={{ position:"fixed", inset:0, zIndex:80 }}>
            <BonesScalesDetailViewer onClose={closeDetailViewer}/>
          </div>
        )}
        <ChatWidget/>
      </div>
    </>
  );
}
