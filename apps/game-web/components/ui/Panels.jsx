import React, { useEffect, useState } from "react";
import { emit, on, Events } from "../../lib/eventBus";

const panelBase={position:"fixed",top:64,bottom:64,width:320,zIndex:30,background:"#fff",color:"#111",border:"1px solid #ddd",borderRadius:16,overflow:"hidden",boxShadow:"0 12px 30px rgba(0,0,0,0.25)"};
const header={display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:"1px solid #eee"};
const btn={background:"#111",color:"#fff",border:"1px solid #333",padding:"8px 10px",borderRadius:10,cursor:"pointer"};

export function BackpackPanel({ open, onClose }){
  const [items, setItems] = useState([]);
  useEffect(()=>{ const off=on(Events.GEO_ENTER,({feature})=>setItems((prev)=>prev.some(x=>x.id===feature.id)?prev:[...prev, feature])); return ()=>off(); },[]);
  if(!open) return null;
  return (
    <div style={{...panelBase, left:12}}>
      <div style={header}><strong>🎒 Backpack</strong><button style={btn} onClick={onClose}>Close</button></div>
      <div style={{padding:12}}>
        {items.length===0 ? <p>No collected items yet. Enter a zone to collect.</p> :
          <ul style={{margin:0,paddingLeft:18}}>{items.map(f=> <li key={f.id}><code>{f.type}</code> · {f.id}</li>)}</ul>}
      </div>
    </div>
  );
}

export function SettingsPanel({ open, onClose }){
  const [audioAll, setAudioAll] = useState(false);
  const [audioMusic, setAudioMusic] = useState(false);
  const [audioFx, setAudioFx] = useState(false);
  const [debug, setDebug] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [buildInfo, setBuildInfo] = useState(null);
  useEffect(()=>{ emit(Events.SETTINGS_UPDATE,{audioAll, audioMusic, audioFx, debug, simulate}); },[audioAll,audioMusic,audioFx,debug,simulate]);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const res=await fetch("/api/meta");
        const data=await res.json();
        if(!cancelled) setBuildInfo(data);
      }catch(e){
        if(!cancelled) setBuildInfo({ error:String(e?.message||e) });
      }
    })();
    return ()=>{ cancelled=true; };
  },[]);
  if(!open) return null;
  const formattedTime = buildInfo?.timestamp ? new Date(buildInfo.timestamp).toLocaleString() : null;
  return (
    <div style={{...panelBase, right:12}}>
      <div style={header}><strong>⚙️ Settings</strong><button style={btn} onClick={onClose}>Close</button></div>
      <div style={{padding:12, display:"grid", gap:12}}>
        <fieldset style={{border:"1px solid #eee", borderRadius:12, padding:"10px 12px"}}>
          <legend style={{padding:"0 6px", fontWeight:600}}>Audio controls</legend>
          <label style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
            <input type="checkbox" checked={audioAll} onChange={e=>setAudioAll(e.target.checked)} /> Enable all audio
          </label>
          <label style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
            <input type="checkbox" checked={audioMusic} onChange={e=>setAudioMusic(e.target.checked)} /> Enable music overlays
          </label>
          <label style={{display:"flex", alignItems:"center", gap:8}}>
            <input type="checkbox" checked={audioFx} onChange={e=>setAudioFx(e.target.checked)} /> Enable FX overlays
          </label>
          <p style={{margin:"8px 0 0", fontSize:12, lineHeight:1.4, opacity:0.75}}>Turn on "all" for a global allow, or toggle categories to hear only music or FX overlays.</p>
        </fieldset>
        <label><input type="checkbox" checked={debug} onChange={e=>setDebug(e.target.checked)} /> Show geofence debug rings</label>
        <label><input type="checkbox" checked={simulate} onChange={e=>setSimulate(e.target.checked)} /> Click to simulate location</label>
        <button onClick={()=>emit(Events.GEO_POSITION,null)} style={btn}>Reset simulated location</button>
        <button onClick={()=>emit("debug:test_modal", {})} style={btn}>Open test modal</button>
        <div style={{marginTop:12,fontSize:12,lineHeight:1.5,opacity:0.8}}>
          <div><strong>Repository:</strong> {buildInfo?.repository || "n/a"}</div>
          <div><strong>Branch:</strong> {buildInfo?.branch || "n/a"}</div>
          <div><strong>Commit:</strong> {buildInfo?.commit ? buildInfo.commit.slice(0,12) : "n/a"}</div>
          <div><strong>Deployment:</strong> {buildInfo?.deployment ? `https://${buildInfo.deployment}` : "n/a"}</div>
          <div><strong>Date:</strong> {formattedTime || "n/a"}</div>
          {buildInfo?.environment && <div><strong>Environment:</strong> {buildInfo.environment}</div>}
          {buildInfo?.error && <div style={{color:"#c0392b"}}>Info error: {buildInfo.error}</div>}
        </div>
      </div>
    </div>
  );
}
