import { useState, useEffect, useRef, useCallback } from "react";

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #080807; color: #ede8df; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: #080807; }
  ::-webkit-scrollbar-thumb { background: rgba(196,166,110,0.3); border-radius: 2px; }
`;

const C = {
  bg:      "#080807",
  surface: "#141310",
  gold:    "#c4a66e",
  goldDim: "rgba(196,166,110,0.3)",
  text:    "#ffffff",
  textDim: "rgba(255,255,255,0.65)",
  border:  "rgba(196,166,110,0.18)",
};
const F = { display:"'Jost', sans-serif", ui:"'Jost', sans-serif" };

/* ─── PROJECT DATA ───────────────────────────────────────────────────────── */
const PROJECTS = [
  { id:"01", title:"The Enfolding",         subtitle:"Corita Kent Art Center",
    type:"Art foundation building",   year:"Spring 2024", tag:"Individual",       location:"Boyle Heights, Los Angeles", hasFacade:true,  facadePages:[0,5],
    brief:"A folded architectural skin wraps the art center, filtering light and creating a gradient of enclosure from public plaza to intimate gallery. The envelope responds to the existing urban fabric while establishing a distinct institutional presence.",
    images:Array(10).fill(null),
    captions:["","Site analysis, Boyle Heights, Los Angeles.",
      "Program distribution across folded levels.",
      "Structural logic of the envelope.",
      "Facade material study.",
      "Section through the main gallery volume.",
      "Interior render — filtered light through skin.",
      "Detail: folded panel connection.",
      "Physical model 1:200.",
      "Final presentation render."] },
  { id:"02", title:"The Bones and Scales",  subtitle:"Facade Design & Joint Studies",
    type:"Facade design",             year:"Spring 2025", tag:"Group project",    location:"Los Angeles, CA", hasFacade:true,  facadePages:[0,3],
    brief:"An investigation into tectonic expression through facade articulation. The project studies how structural logic — bones — and surface modulation — scales — can be unified into a coherent architectural language.",
    images:Array(10).fill(null), captions:["","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies.","Facade system detail — joint and scale studies."] },
  { id:"03", title:"Eternal Life",          subtitle:"In Between the Living and the Deceased",
    type:"Memorial complex",          year:"Fall 2024",   tag:"Group project",    location:"Los Angeles, CA", hasFacade:false,
    brief:"A memorial complex that negotiates the threshold between the living and the deceased. Spatial sequences guide visitors through states of grief, remembrance, and release, using light and material to mark the passage of time.",
    images:Array(10).fill(null), captions:["","Spatial threshold between life and memory.","Spatial threshold between life and memory.","Spatial threshold between life and memory.","Spatial threshold between life and memory.","Spatial threshold between life and memory.","Spatial threshold between life and memory.","Spatial threshold between life and memory.","Spatial threshold between life and memory.","Spatial threshold between life and memory."] },
  { id:"04", title:"Co-Individual Housing", subtitle:"Co-living from Minimal Dwelling",
    type:"Residential",               year:"Fall 2023",   tag:"Individual",       location:"Los Angeles, CA", hasFacade:false,
    brief:"Starting from the minimal dwelling unit, the project builds upward toward a co-living model that preserves individual autonomy while creating meaningful shared spaces. Aggregation strategies allow flexible density responses.",
    images:Array(10).fill(null), captions:["","Modular co-living unit aggregation study.","Modular co-living unit aggregation study.","Modular co-living unit aggregation study.","Modular co-living unit aggregation study.","Modular co-living unit aggregation study.","Modular co-living unit aggregation study.","Modular co-living unit aggregation study.","Modular co-living unit aggregation study.","Modular co-living unit aggregation study."] },
  { id:"05", title:"The Rise of Altadena",  subtitle:"Community Church",
    type:"Church — Competition",      year:"Fall 2025",   tag:"Team competition", location:"Altadena, CA", hasFacade:false,
    brief:"A community church conceived as an act of spiritual ascent. The structure rises from the earth through a series of compressed and expanding volumes, culminating in a luminous sanctuary that anchors the post-fire Altadena community.",
    images:Array(10).fill(null), captions:["","Structural expression of spiritual ascent.","Structural expression of spiritual ascent.","Structural expression of spiritual ascent.","Structural expression of spiritual ascent.","Structural expression of spiritual ascent.","Structural expression of spiritual ascent.","Structural expression of spiritual ascent.","Structural expression of spiritual ascent.","Structural expression of spiritual ascent."] },
  { id:"06", title:"BIM Modeling",          subtitle:"Revit Sample",
    type:"BIM / Documentation",       year:"2023–2024",   tag:"Professional",     location:"Los Angeles, CA", hasFacade:false,
    brief:"A professional BIM documentation sample demonstrating coordination across architectural, structural, and MEP systems. Developed to industry standards with detailed construction documentation and clash detection.",
    images:Array(10).fill(null), captions:["","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope.","Coordinated BIM model — structural and envelope."] },
  { id:"07", title:"Model Collection",      subtitle:"Fabrication & Physical Models",
    type:"Fabrication",               year:"Spring 2025", tag:"Collection",       location:"Los Angeles, CA", hasFacade:false,
    brief:"A curated collection of physical models produced across multiple studio projects. Techniques include laser cutting, hand fabrication, and 3D printing, reflecting the development of spatial thinking through making.",
    images:Array(10).fill(null), captions:["","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models.","Laser-cut and hand-crafted architectural models."] },
];

const FACADES = [
  { id:"F1", title:"Perforated Steel Screen",
    layers:["Outer Perforated Steel Panel","Air Cavity + Drainage","Rigid Insulation Board","Vapour Control Layer","Structural Concrete Wall","Interior Plaster Finish"] },
  { id:"F2", title:"Glazed Curtain Wall",
    layers:["Double-Glazed Unit (6/16/6)","Aluminium Frame","Thermally Broken Mullion","Fire-Stop Barrier","Spandrel Panel","Interior Finish"] },
  { id:"F3", title:"Brick Rain-Screen",
    layers:["Facing Brick (100mm)","Open Cavity","Stainless Steel Ties","Breather Membrane","Rigid Insulation","Structural Frame"] },
  { id:"F4", title:"Folded Metal Skin",
    layers:["Folded Zinc Panel","Sub-Frame Bracket","Thermal Break","Air Barrier","Structural Steel Frame","Interior Lining"] },
];

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function Rule({ style }) {
  return <div style={{ height:1, background:C.border, ...style }}/>;
}
function Grain() {
  return (
    <svg style={{ position:"fixed",inset:0,width:"100%",height:"100%",
      pointerEvents:"none",zIndex:50,opacity:0.03,mixBlendMode:"overlay" }}>
      <filter id="gn">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#gn)"/>
    </svg>
  );
}
function useSwipe(onLeft, onRight) {
  const tx = useRef(null);
  return {
    onTouchStart: e => { tx.current = e.touches[0].clientX; },
    onTouchEnd:   e => {
      if (tx.current === null) return;
      const dx = e.changedTouches[0].clientX - tx.current;
      if (Math.abs(dx) > 48) dx < 0 ? onLeft() : onRight();
      tx.current = null;
    },
  };
}
function SectionHeader({ label, title }) {
  return (
    <div>
      <h2 style={{ fontFamily:F.display, fontSize:"clamp(1.2rem,2.5vw,1.8rem)",
        fontWeight:300, color:C.text, letterSpacing:"0.06em",
        textTransform:"uppercase", lineHeight:1, margin:0 }}>{title}</h2>
    </div>
  );
}

/* ─── NAV BAR ────────────────────────────────────────────────────────────── */
function NavBar({ currentPage, currentProject, onNavigate, menu, setMenu }) {
  const NAV = ["Work Samples","Facade Designs","Photography","Contact"];
  return (
    <>
    <header style={{ position:"fixed",top:0,left:0,right:0,zIndex:40,
      background:"rgba(8,8,7,0.93)", backdropFilter:"blur(14px)",
      borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
        height:58, padding:"0 clamp(1.25rem,4vw,3.5rem)" }}>

        {/* ── Logo: replace src with your PNG path ── */}
        <button onClick={()=>onNavigate(null)} style={{ background:"none",border:"none",
          cursor:"pointer", display:"flex", alignItems:"center", gap:"0.65rem" }}>
          {/*
            TO ADD YOUR LOGO:
            Replace the placeholder div below with:
            <img src="/logo.png" alt="BQL Studio" style={{ height:32, width:"auto" }} />
            Then put your logo.png in the /public folder.
          */}
          <div style={{
            height:32, width:32,
            border:"1px dashed rgba(196,166,110,0.35)",
            borderRadius:2,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <span style={{ fontFamily:F.ui, fontSize:"0.45rem", letterSpacing:"0.08em",
              color:"rgba(196,166,110,0.4)", textTransform:"uppercase", lineHeight:1.2,
              textAlign:"center" }}>your<br/>logo</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"1px" }}>
            <span style={{ fontFamily:F.ui, fontSize:"0.82rem", letterSpacing:"0.18em",
              color:C.text, fontWeight:300, textTransform:"uppercase" }}>
              BQL Studio
            </span>
            <span style={{ fontFamily:F.ui, fontSize:"0.42rem", letterSpacing:"0.16em",
              color:"rgba(255,255,255,0.18)", fontWeight:300,
              textTransform:"lowercase" }}>
              by Bingqing Li
            </span>
          </div>
        </button>

        {/* Desktop nav */}
        <nav style={{ display:"flex", gap:"2rem" }} className="desk-nav">
          {NAV.map(n=>(
            <button key={n} onClick={()=>onNavigate(n)} style={{ background:"none",border:"none",
              cursor:"pointer", fontFamily:F.ui, fontSize:"0.68rem", letterSpacing:"0.18em",
              textTransform:"uppercase",
              color: currentPage===n && !currentProject ? C.gold : C.textDim,
              borderBottom: currentPage===n && !currentProject
                ? `1px solid ${C.gold}` : "1px solid transparent",
              padding:"3px 0", transition:"color .25s" }}>
              {n}
            </button>
          ))}
        </nav>

        {/* Hamburger */}
        <button onClick={()=>setMenu(o=>!o)} className="burger" style={{ background:"none",
          border:"none", cursor:"pointer", display:"none", flexDirection:"column", gap:5, padding:4 }}>
          {[0,1,2].map(i=>(
            <span key={i} style={{ display:"block", width:20, height:1, background:C.text,
              transform: menu
                ? i===1?"scaleX(0)":i===0?"rotate(45deg) translate(4px,4px)":"rotate(-45deg) translate(4px,-4px)"
                : "none",
              transition:"transform .3s" }}/>
          ))}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div style={{ overflow:"hidden", maxHeight:menu?"220px":"0", transition:"max-height .4s" }}>
        <Rule/>
        {NAV.map(n=>(
          <button key={n} onClick={()=>{ onNavigate(n); setMenu(false); }} style={{
            display:"block", width:"100%", textAlign:"left",
            background:"none", border:"none", cursor:"pointer",
            fontFamily:F.ui, fontSize:"0.8rem", letterSpacing:"0.18em",
            textTransform:"uppercase", color:currentPage===n ? C.gold : C.textDim,
            padding:"13px clamp(1.25rem,4vw,3.5rem)" }}>{n}</button>
        ))}
        <div style={{ height:12 }}/>
      </div>

      <style>{`@media(max-width:600px){.desk-nav{display:none!important}.burger{display:flex!important}}`}</style>
    </header>

    {/* ── Project sub-bar: shown below navbar when viewing a project ── */}
    {currentProject && (
      <div style={{
        position:"fixed", top:58, left:0, right:0, zIndex:39,
        height:28,
        background:"rgba(8,8,7,0.95)", backdropFilter:"blur(10px)",
        borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <span style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.2em",
          textTransform:"uppercase", color:C.textDim }}>
          {currentProject.id} — {currentProject.title}
        </span>
      </div>
    )}
    </>
  );
}

/* ─── PROJECT INDEX SIDEBAR ──────────────────────────────────────────────── */
// Shows all project numbers; current is larger + gold; hover reveals title + type tooltip
function ProjectIndexSidebar({ currentProject, onSwitchProject, top=58 }) {
  return (
    <div style={{
      position:"fixed", left:0, top:top, bottom:0, zIndex:30,
      width:"clamp(48px,5.5vw,64px)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      gap:"clamp(0.6rem,1.2vh,1rem)",
      borderRight:`1px solid ${C.border}`,
      background:"rgba(8,8,7,0.82)",
      padding:"1.5rem 0",
    }}>
      {PROJECTS.map(p => {
        const isCurrent = p.id === currentProject.id;
        return (
          <ProjectIndexItem
            key={p.id}
            project={p}
            isCurrent={isCurrent}
            onSwitch={()=>onSwitchProject(p)}
          />
        );
      })}
    </div>
  );
}

function ProjectIndexItem({ project, isCurrent, onSwitch }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position:"relative" }}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}>

      <button onClick={onSwitch} style={{
        background:"none", border:"none",
        cursor: isCurrent ? "default" : "pointer",
        fontFamily:F.ui,
        fontSize: isCurrent ? "0.88rem" : "0.62rem",
        fontWeight: isCurrent ? 500 : 300,
        letterSpacing:"0.1em",
        color: isCurrent ? C.gold : hov ? C.text : C.textDim,
        transition:"all .25s",
        lineHeight:1,
        padding:"2px 0",
        // underline for current
        borderBottom: isCurrent ? `1px solid ${C.gold}` : "1px solid transparent",
        paddingBottom: isCurrent ? "2px" : "3px",
      }}>
        {project.id}
      </button>

      {/* Hover tooltip — slides in from left side */}
      <div style={{
        position:"absolute",
        left:"calc(100% + 12px)",
        top:"50%", transform:"translateY(-50%)",
        pointerEvents:"none",
        opacity: hov ? 1 : 0,
        transform: hov
          ? "translateY(-50%) translateX(0)"
          : "translateY(-50%) translateX(-6px)",
        transition:"opacity .2s ease, transform .2s ease",
        background:C.surface,
        border:`1px solid ${C.border}`,
        padding:"0.55rem 0.85rem",
        whiteSpace:"nowrap",
        zIndex:50,
      }}>
        <p style={{ fontFamily:F.display, fontSize:"0.82rem", fontWeight:300,
          color:C.text, margin:0, lineHeight:1.3 }}>
          {project.title}
        </p>
        <p style={{ fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.14em",
          textTransform:"uppercase", color:C.gold, margin:"0.3rem 0 0" }}>
          {project.type}
        </p>
      </div>
    </div>
  );
}

/* ─── PROJECT VIEWER ─────────────────────────────────────────────────────── */
function ProjectViewer({ project, onSwitchProject, onNavigate }) {
  const [idx, setIdx] = useState(0);
  const total = project.images.length;
  const prev = useCallback(()=>setIdx(i=>Math.max(0,i-1)),[]);
  const next = useCallback(()=>setIdx(i=>Math.min(total-1,i+1)),[total]);

  useEffect(()=>{
    const h = e=>{
      if(e.key==="ArrowRight"||e.key==="ArrowDown") next();
      if(e.key==="ArrowLeft"||e.key==="ArrowUp")   prev();
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[prev,next]);

  useEffect(()=>setIdx(0),[project.id]);

  const swipe = useSwipe(next, prev);
  const pi    = PROJECTS.findIndex(p=>p.id===project.id);
  const prevP = PROJECTS[pi-1]??null;
  const nextP = PROJECTS[pi+1]??null;

  const SB = "clamp(48px,5.5vw,64px)";
  const BH = "clamp(130px,20vh,162px)";
  const TOP = 86; // navbar 58 + project sub-bar 28

  return (
    <div style={{ minHeight:"100vh", background:C.bg }} {...swipe}>

      {/* ── LEFT SIDEBAR: project index ── */}
      <ProjectIndexSidebar currentProject={project} onSwitchProject={onSwitchProject} top={TOP}/>

      {/* ── IMAGE AREA ── */}
      <div style={{ marginLeft:SB, paddingTop:TOP, paddingBottom:BH,
        minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", position:"relative" }}>

        {idx === 0 ? (
          /* ── COVER PAGE (first slide): left text + right image, same padding as other slides ── */
          <>
          <style>{`.cover-row{display:flex;flex-direction:row;align-items:flex-start;gap:clamp(1.5rem,3vw,2.5rem)}@media(max-width:640px){.cover-row{flex-direction:column;align-items:stretch}}`}</style>
          <div className="cover-row" style={{
            width:"100%",
            padding:"clamp(1rem,3vw,2.5rem) clamp(2.5rem,7vw,5.5rem)",
          }}>
            {/* Left: project info — padded top so it clears the navbar visually */}
            <div style={{
              width:"clamp(180px,28%,290px)", flexShrink:0,
              paddingTop:"clamp(1.5rem,4vh,3rem)",
              paddingRight:"clamp(1rem,2.5vw,2rem)",
              borderRight:`1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily:F.display,
                fontSize:"clamp(2.5rem,5vw,4rem)",
                fontWeight:300, color:"rgba(196,166,110,0.1)",
                lineHeight:1, display:"block", marginBottom:"1rem",
                letterSpacing:"-0.02em" }}>
                {project.id}
              </span>
              <h2 style={{ fontFamily:F.display,
                fontSize:"clamp(1.15rem,2.2vw,1.7rem)",
                fontWeight:300, color:C.text, lineHeight:1.1,
                margin:"0 0 0.45rem" }}>
                {project.title}
              </h2>
              <p style={{ fontFamily:F.display, fontStyle:"italic",
                fontSize:"clamp(0.78rem,1.3vw,0.92rem)",
                color:C.textDim, margin:"0 0 clamp(1.2rem,3vh,2rem)", lineHeight:1.55 }}>
                {project.subtitle}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
                {[
                  { label:"Type",     value:project.type },
                  { label:"Location", value:project.location },
                  { label:"Year",     value:project.year },
                  { label:"Credit",   value:project.tag },
                ].map(row=>(
                  <div key={row.label}>
                    <span style={{ fontFamily:F.ui, fontSize:"0.52rem", letterSpacing:"0.22em",
                      textTransform:"uppercase", color:C.gold, display:"block",
                      marginBottom:"0.12rem" }}>{row.label}</span>
                    <span style={{ fontFamily:F.ui, fontSize:"0.75rem",
                      letterSpacing:"0.03em", color:C.textDim }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Project brief */}
              {project.brief && (
                <>
                  <div style={{ height:"0.6rem" }}/>
                  <Rule/>
                  <div style={{ height:"0.6rem" }}/>
                  <span style={{ fontFamily:F.ui, fontSize:"0.52rem", letterSpacing:"0.22em",
                    textTransform:"uppercase", color:C.gold, display:"block",
                    marginBottom:"0.4rem" }}>Brief</span>
                  <p style={{ fontFamily:F.display, fontStyle:"italic",
                    fontSize:"clamp(0.72rem,1.2vw,0.85rem)",
                    color:C.textDim, lineHeight:1.7, margin:0 }}>
                    {project.brief}
                  </p>
                </>
              )}
            </div>

            {/* Right: image — same size constraint as other slides */}
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {project.images[0] ? (
                <img src={project.images[0]} alt={project.title}
                  style={{ maxWidth:"100%", maxHeight:"calc(100vh - 250px)",
                    objectFit:"contain", display:"block" }}/>
              ) : (
                <div style={{ width:"100%", maxWidth:700, aspectRatio:"16/9",
                  background:"rgba(255,255,255,0.022)", border:`1px solid ${C.border}`,
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", gap:"0.9rem" }}>
                  <span style={{ fontFamily:F.display, fontSize:"clamp(2rem,5vw,3.5rem)",
                    color:"rgba(196,166,110,0.07)", fontWeight:300 }}>
                    {project.title}
                  </span>
                  <span style={{ fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.2em",
                    textTransform:"uppercase", color:"rgba(196,166,110,0.22)" }}>
                    cover image — add path in PROJECTS array
                  </span>
                </div>
              )}
            </div>
          </div>
          </>
        ) : (
          /* ── REGULAR IMAGE SLIDES ── */
          <div style={{ width:"100%", display:"flex", alignItems:"center",
            justifyContent:"center",
            padding:"clamp(1rem,3vw,2.5rem) clamp(2.5rem,7vw,5.5rem)" }}>
            {project.images[idx] ? (
              <img src={project.images[idx]} alt={`${project.title} — slide ${idx+1}`}
                style={{ maxWidth:"100%", maxHeight:"calc(100vh - 250px)",
                  objectFit:"contain", display:"block" }}/>
            ) : (
              <div style={{ width:"100%", maxWidth:860, aspectRatio:"16/9",
                background:"rgba(255,255,255,0.022)", border:`1px solid ${C.border}`,
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:"0.9rem" }}>
                <span style={{ fontFamily:F.display, fontSize:"clamp(2.5rem,6vw,4.5rem)",
                  color:"rgba(196,166,110,0.07)", fontWeight:300 }}>
                  {project.id}
                </span>
                <span style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.2em",
                  textTransform:"uppercase", color:"rgba(196,166,110,0.25)" }}>
                  {idx+1} / {total} — add image path in PROJECTS array
                </span>
              </div>
            )}
          </div>
        )}

        {/* Side arrow buttons */}
        {[
          { side:"left",  fn:prev, disabled:idx===0 },
          { side:"right", fn:next, disabled:idx===total-1 },
        ].map(a=>(
          <button key={a.side} onClick={a.fn} disabled={a.disabled} style={{
            position:"absolute", [a.side]:"clamp(0.4rem,1.5vw,1.2rem)", top:"50%",
            transform:"translateY(-50%)",
            background:"none", border:"none",
            cursor:a.disabled?"default":"pointer",
            color:a.disabled?"rgba(196,166,110,0.1)":C.gold,
            fontSize:"clamp(1.1rem,2.5vw,1.5rem)", lineHeight:1,
            padding:"0.6rem", transition:"color .2s" }}>
            {a.side==="left"?"←":"→"}
          </button>
        ))}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ position:"fixed", bottom:0, left:SB, right:0, zIndex:30,
        background:"rgba(8,8,7,0.96)", backdropFilter:"blur(18px)",
        borderTop:`1px solid ${C.border}`,
        padding:"0.6rem clamp(1.5rem,5vw,4rem) 0.9rem" }}>

        {/* Facade detail button — ABOVE caption and subtitle */}
        {project.hasFacade && project.facadePages?.includes(idx) && (
          <div style={{ textAlign:"center", marginBottom:"0.5rem" }}>
            <button onClick={()=>onNavigate("Facade Designs")} style={{
              background:"none",
              border:`1px solid rgba(196,166,110,0.38)`,
              color:C.gold, fontFamily:F.ui,
              fontSize:"0.6rem", letterSpacing:"0.18em",
              textTransform:"uppercase", padding:"4px 16px",
              cursor:"pointer", transition:"all .2s",
              display:"inline-flex", alignItems:"center", gap:"0.5rem",
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background=C.gold; e.currentTarget.style.color=C.bg; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=C.gold; }}>
              <span>⊞</span> View Facade Detail
            </button>
          </div>
        )}

        {/* Per-page caption */}
        <p style={{ fontFamily:F.display, fontStyle:"italic",
          fontSize:"clamp(0.72rem,1.5vw,0.92rem)",
          color:C.textDim, textAlign:"center", lineHeight:1.65,
          marginBottom:"0.6rem", minHeight:"1.3em" }}>
          {project.captions[idx]||""}
        </p>

        <Rule style={{ marginBottom:"0.6rem" }}/>

        {/* Controls row: prev project — pagination — next project */}
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:"0.5rem" }}>

          {/* Prev project link */}
          <button onClick={prevP?()=>onSwitchProject(prevP):undefined}
            style={{ background:"none", border:"none",
              cursor:prevP?"pointer":"default",
              fontFamily:F.ui, fontSize:"0.56rem", letterSpacing:"0.14em",
              textTransform:"uppercase",
              color:prevP?C.textDim:"transparent",
              transition:"color .2s", whiteSpace:"nowrap", flexShrink:0 }}
            onMouseEnter={e=>{ if(prevP) e.currentTarget.style.color=C.gold; }}
            onMouseLeave={e=>{ if(prevP) e.currentTarget.style.color=C.textDim; }}>
            ← {prevP?`${prevP.id} ${prevP.title}`:""}
          </button>

          {/* Page numbers */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.28rem",
            flexWrap:"wrap", justifyContent:"center" }}>
            <button onClick={prev} disabled={idx===0}
              style={{ background:"none",border:"none",cursor:idx===0?"default":"pointer",
                fontFamily:F.ui, fontSize:"0.62rem",
                color:idx===0?C.goldDim:C.textDim,
                padding:"2px 5px", transition:"color .2s" }}>Prev</button>

            {project.images.map((_,i)=>(
              <button key={i} onClick={()=>setIdx(i)} style={{
                background:i===idx?C.gold:"none",
                border:`1px solid ${i===idx?C.gold:C.goldDim}`,
                color:i===idx?C.bg:C.textDim,
                fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.06em",
                width:22, height:22, cursor:"pointer", transition:"all .2s" }}>
                {i+1}
              </button>
            ))}

            <button onClick={next} disabled={idx===total-1}
              style={{ background:"none",border:"none",cursor:idx===total-1?"default":"pointer",
                fontFamily:F.ui, fontSize:"0.62rem",
                color:idx===total-1?C.goldDim:C.textDim,
                padding:"2px 5px", transition:"color .2s" }}>Next</button>
          </div>

          {/* Next project link */}
          <button onClick={nextP?()=>onSwitchProject(nextP):undefined}
            style={{ background:"none", border:"none",
              cursor:nextP?"pointer":"default",
              fontFamily:F.ui, fontSize:"0.56rem", letterSpacing:"0.14em",
              textTransform:"uppercase",
              color:nextP?C.textDim:"transparent",
              transition:"color .2s", whiteSpace:"nowrap", flexShrink:0 }}
            onMouseEnter={e=>{ if(nextP) e.currentTarget.style.color=C.gold; }}
            onMouseLeave={e=>{ if(nextP) e.currentTarget.style.color=C.textDim; }}>
            {nextP?`${nextP.id} ${nextP.title}`:""} →
          </button>
        </div>

        {/* Project subtitle */}
        <p style={{ fontFamily:F.display, fontSize:"clamp(0.65rem,1.3vw,0.8rem)",
          color:"rgba(255,255,255,0.32)", textAlign:"center",
          marginTop:"0.4rem",
          letterSpacing:"0.04em" }}>
          {project.subtitle}
          <span style={{ color:C.goldDim, margin:"0 0.45rem" }}>·</span>
          {project.type}
          <span style={{ color:C.goldDim, margin:"0 0.45rem" }}>·</span>
          {project.year}
        </p>
      </div>
    </div>
  );
}

/* ─── HOME ───────────────────────────────────────────────────────────────── */
function Home({ onNavigate }) {
  const [vis, setVis] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),80); return()=>clearTimeout(t); },[]);
  const NAV = ["Work Samples","Facade Designs","Photography","Contact"];

  return (
    <div style={{ opacity:vis?1:0, transform:vis?"none":"translateY(14px)",
      transition:"opacity .7s ease, transform .7s ease" }}>
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
        justifyContent:"center", padding:"clamp(1.5rem,4vw,3rem)",
        paddingTop:"clamp(80px,12vh,120px)", paddingBottom:"clamp(1.5rem,4vw,3rem)" }}>

        {/*
          ── Logo image placeholder ──
          Replace the div below with:
          <img src="/logo.png" alt="BQL Studio"
               style={{ height:"clamp(48px,7vw,72px)", width:"auto", marginBottom:"clamp(1rem,2.5vh,2rem)" }} />
          Put logo.png (white version) in your /public folder.
        */}
        <div style={{
          height:"clamp(48px,6vw,72px)",
          width:"clamp(38px,5vw,58px)",
          border:"1px dashed rgba(196,166,110,0.28)",
          borderRadius:2,
          display:"flex", alignItems:"center", justifyContent:"center",
          marginBottom:"clamp(1.8rem,4.5vh,3.2rem)",
        }}>
          <span style={{ fontFamily:F.ui, fontSize:"0.45rem", letterSpacing:"0.1em",
            color:"rgba(196,166,110,0.35)", textTransform:"uppercase",
            textAlign:"center", lineHeight:1.5 }}>your<br/>logo<br/>PNG</span>
        </div>

        <p style={{ fontFamily:F.ui, fontSize:"0.63rem", letterSpacing:"0.26em",
          textTransform:"uppercase", color:C.gold, marginBottom:"2rem" }}>
          Architecture &amp; Photography — bqlstudio.com
        </p>

        <h1 style={{ fontFamily:F.display, fontSize:"clamp(2.2rem,4.5vw,3.8rem)",
          lineHeight:1.05, color:C.text,
          letterSpacing:"0.08em", textTransform:"uppercase", margin:0 }}>
          <span style={{ fontWeight:500 }}>BQL</span>
          <span style={{ fontWeight:300 }}> Studio</span>
        </h1>

        <div style={{ height:"clamp(2rem,5vh,3.5rem)" }}/>

        <p style={{ fontFamily:F.display, fontStyle:"italic",
          fontSize:"clamp(0.88rem,1.8vw,1.1rem)",
          color:C.textDim, lineHeight:1.8 }}>
          Architectural design, facade research, and spatial photography.
        </p>

        <div style={{ height:"clamp(2.8rem,7vh,5rem)" }}/>
        <Rule/>
        <div style={{ height:"clamp(2rem,5vh,3.5rem)" }}/>

        <nav style={{ display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))",
          gap:"clamp(0.5rem,2vw,1.5rem)" }}>
          {NAV.map((item,i)=>{
            const [hov,setHov] = useState(false);
            return (
              <button key={item} onClick={()=>onNavigate(item)}
                onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
                style={{ background:"none", border:"none", cursor:"pointer", textAlign:"left",
                  padding:"0.9rem 0",
                  borderTop:`1px solid ${hov ? C.gold : C.border}`,
                  transition:"border-color .3s" }}>
                <span style={{ fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.22em",
                  textTransform:"uppercase", color:C.gold, display:"block", marginBottom:"0.35rem" }}>
                  0{i+1}
                </span>
                <span style={{ fontFamily:F.display, fontSize:"1.05rem",
                  fontWeight:300, color:C.text }}>
                  {item}
                </span>
              </button>
            );
          })}
        </nav>
        <div style={{ height:"clamp(0.75rem,2vh,1.5rem)" }}/>
      </div>
    </div>
  );
}

/* ─── WORK SAMPLES ───────────────────────────────────────────────────────── */
function WorkSamples({ onOpenProject, onNavigate }) {
  return (
    <div style={{ padding:"clamp(2rem,8vw,6rem)", paddingTop:100 }}>
      <SectionHeader label="01" title="Work Samples"/>
      <div style={{ height:"clamp(2rem,5vw,3.5rem)" }}/>
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,300px),1fr))",
        gap:"clamp(1rem,3vw,2rem)" }}>
        {PROJECTS.map(p=>(
          <ProjectCard key={p.id} project={p}
            onOpen={()=>onOpenProject(p)}
            onFacade={()=>onNavigate("Facade Designs")}/>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, onOpen, onFacade }) {
  const [hov,setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onOpen}
      style={{ border:`1px solid ${hov?"rgba(196,166,110,0.48)":C.border}`,
        transition:"all .3s", transform:hov?"translateY(-4px)":"none",
        background:"rgba(255,255,255,0.02)", cursor:"pointer" }}>
      <div style={{ aspectRatio:"4/3", background:"rgba(255,255,255,0.03)",
        display:"flex",alignItems:"center",justifyContent:"center",
        position:"relative", overflow:"hidden" }}>
        {project.images[0]
          ? <img src={project.images[0]} alt={project.title}
              style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          : <>
              <span style={{ fontFamily:F.display, fontSize:"3.5rem",
                color:"rgba(196,166,110,0.07)", fontWeight:300, userSelect:"none" }}>
                {project.id}
              </span>
              <div style={{ position:"absolute",inset:0,
                background:"radial-gradient(circle at 30% 60%, rgba(196,166,110,0.04),transparent 70%)" }}/>
            </>
        }
      </div>
      <div style={{ padding:"1.2rem 1.5rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
          <h3 style={{ fontFamily:F.display, fontSize:"1.05rem", fontWeight:300,
            color:C.text, margin:0 }}>{project.title}</h3>
          <span style={{ fontFamily:F.ui, fontSize:"0.62rem", letterSpacing:"0.1em",
            color:"rgba(237,232,223,0.28)" }}>{project.year}</span>
        </div>
        <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.83rem",
          color:C.textDim, margin:"0.22rem 0 0.55rem", textAlign:"left" }}>{project.subtitle}</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.16em",
            textTransform:"uppercase", color:C.gold }}>{project.type}</span>
          {project.hasFacade && (
            <button onClick={e=>{ e.stopPropagation(); onFacade(); }} style={{
              background:"none",
              border:`1px solid rgba(196,166,110,0.32)`,
              color:C.gold, fontFamily:F.ui, fontSize:"0.58rem",
              letterSpacing:"0.16em", textTransform:"uppercase",
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
function FacadeDesigns() {
  const [sel,setSel] = useState(null);
  const [exp,setExp] = useState(false);
  return (
    <div style={{ padding:"clamp(2rem,8vw,6rem)", paddingTop:100 }}>
      <SectionHeader label="02" title="Facade Designs"/>
      <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.92rem",
        color:C.textDim, margin:"1rem 0 clamp(2rem,5vw,3.5rem)" }}>
        Click a facade to explore the material schedule.
      </p>
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,240px),1fr))",
        gap:"clamp(1rem,3vw,2rem)" }}>
        {FACADES.map(f=>{
          const [hov,setHov]=useState(false);
          return (
            <div key={f.id} onClick={()=>{ setSel(f); setExp(false); }}
              onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
              style={{ border:`1px solid ${hov?"rgba(196,166,110,0.5)":C.border}`,
                cursor:"pointer", padding:"2rem",
                background:hov?"rgba(196,166,110,0.03)":"rgba(255,255,255,0.02)",
                transition:"all .3s", transform:hov?"translateY(-4px)":"none" }}>
              <div style={{ aspectRatio:"3/2", marginBottom:"1.5rem",
                background:"rgba(255,255,255,0.03)", position:"relative", overflow:"hidden",
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{ position:"absolute",left:`${8+i*22}%`,
                    top:"12%",bottom:"12%",width:"18%",
                    background:`rgba(196,166,110,${0.07+i*0.04})`,
                    border:`1px solid rgba(196,166,110,0.14)`,
                    transform:hov?`translateY(${i%2===0?-7:5}px)`:"none",
                    transition:`transform ${0.28+i*0.05}s ease` }}/>
                ))}
                <span style={{ position:"relative",zIndex:1,fontFamily:F.ui,fontSize:"0.56rem",
                  letterSpacing:"0.22em",textTransform:"uppercase",
                  color:"rgba(196,166,110,0.38)" }}>{f.id}</span>
              </div>
              <h3 style={{ fontFamily:F.display, fontSize:"1rem", fontWeight:300,
                color:C.text, margin:"0 0 0.4rem" }}>{f.title}</h3>
              <p style={{ fontFamily:F.ui, fontSize:"0.6rem", letterSpacing:"0.16em",
                color:C.gold, textTransform:"uppercase", margin:0 }}>
                {f.layers.length} Layers
              </p>
            </div>
          );
        })}
      </div>

      {sel && (
        <div onClick={()=>setSel(null)} style={{ position:"fixed",inset:0,zIndex:60,
          background:"rgba(4,4,3,0.9)",backdropFilter:"blur(8px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          padding:"clamp(1rem,5vw,3rem)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#0f0e0c",
            border:`1px solid rgba(196,166,110,0.28)`,
            maxWidth:540, width:"100%",
            padding:"clamp(1.5rem,5vw,3rem)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <h2 style={{ fontFamily:F.display, fontSize:"clamp(1.2rem,4vw,1.75rem)",
                fontWeight:300, color:C.text, margin:0 }}>{sel.title}</h2>
              <button onClick={()=>setSel(null)} style={{ background:"none",border:"none",
                cursor:"pointer", color:C.textDim, fontSize:"1rem", padding:"0 0 0 1rem" }}>✕</button>
            </div>
            <div style={{ height:"1.5rem" }}/><Rule/><div style={{ height:"1.5rem" }}/>
            <button onClick={()=>setExp(e=>!e)} style={{ background:exp?C.gold:"none",
              border:`1px solid rgba(196,166,110,0.42)`, color:exp?C.bg:C.gold,
              fontFamily:F.ui, fontSize:"0.65rem", letterSpacing:"0.18em",
              textTransform:"uppercase", padding:"7px 16px", cursor:"pointer",
              transition:"all .25s" }}>
              {exp?"Collapse":"Explode View"}
            </button>
            <div style={{ marginTop:"2rem" }}>
              {sel.layers.map((layer,i)=>(
                <div key={i} style={{ padding:"0.8rem 1rem", marginBottom:"0.4rem",
                  background:`rgba(196,166,110,${0.03+i*0.025})`,
                  border:`1px solid rgba(196,166,110,0.1)`,
                  transform:exp?`translateX(${i*15}px) translateY(${i*-8}px)`:"none",
                  opacity:exp?1:0.82,
                  transition:`transform ${0.26+i*0.06}s ease, opacity .3s`,
                  display:"flex",alignItems:"center",gap:"1rem" }}>
                  <span style={{ fontFamily:F.ui, fontSize:"0.58rem", letterSpacing:"0.15em",
                    color:C.gold, minWidth:18, textAlign:"right" }}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{ fontFamily:F.ui, fontSize:"0.8rem", letterSpacing:"0.06em",
                    textTransform:"uppercase", color:"rgba(237,232,223,0.82)" }}>{layer}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PHOTOGRAPHY ────────────────────────────────────────────────────────── */
function Photography() {
  const [cat,setCat] = useState("Architecture");
  return (
    <div style={{ padding:"clamp(2rem,8vw,6rem)", paddingTop:100 }}>
      <SectionHeader label="03" title="Photography"/>
      <div style={{ height:"2rem" }}/>
      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"clamp(2rem,5vw,3.5rem)" }}>
        {["Architecture","Commercial"].map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{
            background:cat===c?C.gold:"none",
            border:`1px solid rgba(196,166,110,0.36)`,
            color:cat===c?C.bg:C.textDim,
            fontFamily:F.ui, fontSize:"0.65rem", letterSpacing:"0.18em",
            textTransform:"uppercase", padding:"8px 22px",
            cursor:"pointer", transition:"all .25s" }}>{c}</button>
        ))}
      </div>
      {cat==="Commercial" && (
        <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.92rem",
          color:C.textDim, marginBottom:"2rem" }}>
          Real estate interiors &amp; public spaces
        </p>
      )}
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,260px),1fr))",
        gap:"clamp(0.75rem,2vw,1.1rem)" }}>
        {[1,2,3,4,5,6].map(i=>{
          const [hov,setHov]=useState(false);
          const tall=i===1||i===4;
          return (
            <div key={`${cat}-${i}`}
              onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
              style={{ gridRow:tall?"span 2":"span 1", aspectRatio:tall?"2/3":"3/2",
                background:"rgba(255,255,255,0.03)",
                border:`1px solid ${hov?"rgba(196,166,110,0.32)":C.border}`,
                transition:"border-color .3s",
                display:"flex",alignItems:"center",justifyContent:"center",
                position:"relative", overflow:"hidden", cursor:"pointer" }}>
              {/* Replace with: <img src="..." style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/> */}
              <span style={{ fontFamily:F.display, fontSize:"0.85rem",
                color:"rgba(196,166,110,0.15)" }}>{cat[0]}{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── CONTACT ────────────────────────────────────────────────────────────── */
function Contact() {
  return (
    <div style={{ minHeight:"100vh", padding:"clamp(2rem,8vw,6rem)", paddingTop:100,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <SectionHeader label="04" title="Contact"/>
      <div style={{ height:"clamp(2rem,6vw,4rem)" }}/>
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,270px),1fr))",
        gap:"clamp(1rem,3vw,2.5rem)", maxWidth:680, width:"100%" }}>
        {[
          { label:"Professional",
            note:"Architecture employers & studios",
            links:[
              { text:"bqli9905@gmail.com", href:"mailto:bqli9905@gmail.com" },
              { text:"LinkedIn", href:"https://www.linkedin.com/in/bingqingl" },
            ]},
          { label:"Studio",
            note:"Commercial photography & other business enquiries",
            links:[
              { text:"contact@bqlstudio.com", href:"mailto:contact@bqlstudio.com" },
            ]},
        ].map(card=>(
          <div key={card.label} style={{ padding:"2rem", border:`1px solid ${C.border}`,
            background:"rgba(255,255,255,0.02)", textAlign:"center" }}>
            <p style={{ fontFamily:F.ui, fontSize:"0.62rem", letterSpacing:"0.22em",
              textTransform:"uppercase", color:C.gold, margin:"0 0 0.55rem" }}>{card.label}</p>
            <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.88rem",
              color:C.textDim, margin:"0 0 1.5rem" }}>{card.note}</p>
            <Rule/>
            <div style={{ marginTop:"1.5rem", display:"flex", flexDirection:"column",
              gap:"0.7rem", alignItems:"center" }}>
              {card.links.map(l=>(
                <a key={l.text} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily:F.ui, fontSize:"0.86rem", letterSpacing:"0.05em",
                    color:C.text, textDecoration:"none",
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

/* ─── CHAT WIDGET ────────────────────────────────────────────────────────── */
function ChatWidget() {
  const [open,setOpen] = useState(false);
  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{ position:"fixed",bottom:28,right:28,zIndex:55,
        width:50,height:50,borderRadius:"50%",background:C.gold,border:"none",cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        boxShadow:"0 4px 24px rgba(0,0,0,0.5)",transition:"transform .2s",
        fontFamily:F.ui, fontSize:"1rem", color:C.bg }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        {open?"✕":"✦"}
      </button>
      <div style={{ position:"fixed",bottom:88,right:28,zIndex:55,
        width:"clamp(275px,88vw,365px)",
        maxHeight:open?"460px":"0", overflow:"hidden",
        transition:"max-height .4s ease",
        boxShadow:"0 8px 40px rgba(0,0,0,0.6)" }}>
        <div style={{ background:"#0f0e0c", border:`1px solid rgba(196,166,110,0.28)`,
          display:"flex",flexDirection:"column",height:460 }}>
          <div style={{ padding:"1rem 1.25rem", borderBottom:`1px solid rgba(196,166,110,0.1)` }}>
            <p style={{ fontFamily:F.ui, fontSize:"0.65rem", letterSpacing:"0.18em",
              textTransform:"uppercase", color:C.gold, margin:0 }}>Studio Assistant</p>
            <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.78rem",
              color:C.textDim, margin:"0.15rem 0 0" }}>Ask me about any project</p>
          </div>
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem" }}>
            <p style={{ fontFamily:F.display, fontStyle:"italic", fontSize:"0.85rem",
              color:"rgba(237,232,223,0.24)", textAlign:"center", lineHeight:1.75 }}>
              AI integration coming soon.<br/>I'll answer questions<br/>about any project here.
            </p>
          </div>
          <div style={{ padding:"1rem 1.25rem", borderTop:`1px solid rgba(196,166,110,0.08)`,
            display:"flex",gap:"0.5rem" }}>
            <input placeholder="Ask about a project..." disabled style={{ flex:1,
              background:"rgba(255,255,255,0.04)",
              border:`1px solid rgba(196,166,110,0.16)`,
              color:C.text, fontFamily:F.ui, fontSize:"0.8rem",
              letterSpacing:"0.05em", padding:"8px 12px", outline:"none" }}/>
            <button disabled style={{ background:"rgba(196,166,110,0.22)",border:"none",
              color:C.gold, padding:"8px 14px", fontFamily:F.ui,
              fontSize:"0.7rem", letterSpacing:"0.15em", cursor:"not-allowed" }}>→</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [page,    setPage]    = useState(null);
  const [project, setProject] = useState(null);
  const [menu,    setMenu]    = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),80); return()=>clearTimeout(t); },[]);

  const navigate      = p => { setProject(null); setPage(p); setMenu(false); window.scrollTo({top:0,behavior:"smooth"}); };
  const openProject   = p => { setProject(p); setPage("Work Samples"); window.scrollTo({top:0,behavior:"smooth"}); };
  const switchProject = p => { setProject(p); window.scrollTo({top:0,behavior:"smooth"}); };

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <div style={{ minHeight:"100vh", background:C.bg,
        opacity:mounted?1:0, transition:"opacity .5s ease" }}>
        <Grain/>
        <NavBar currentPage={page} currentProject={project}
          onNavigate={navigate} menu={menu} setMenu={setMenu}/>
        {project ? (
          <ProjectViewer project={project} onSwitchProject={switchProject} onNavigate={navigate}/>
        ) : (
          <>
            {page===null             && <Home onNavigate={navigate}/>}
            {page==="Work Samples"   && <WorkSamples onOpenProject={openProject} onNavigate={navigate}/>}
            {page==="Facade Designs" && <FacadeDesigns/>}
            {page==="Photography"    && <Photography/>}
            {page==="Contact"        && <Contact/>}
          </>
        )}
        <ChatWidget/>
      </div>
    </>
  );
}
