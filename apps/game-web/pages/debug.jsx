import React, { useEffect, useState } from "react";

export default function Debug(){
  const [ping, setPing] = useState(null);
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState(null);

  const defaultBucket = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || process.env.SUPABASE_MEDIA_BUCKET || "game-media";
  const defaultPrefix = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_PREFIX || process.env.SUPABASE_MEDIA_PREFIX || "";

  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try { const r = await fetch("/api/ping"); const d = await r.json(); if(!cancelled) setPing(d); } catch(e){ if(!cancelled) setError(e); }
      try { const r2 = await fetch(`/api/list-storage?bucket=${encodeURIComponent(defaultBucket)}&prefix=${encodeURIComponent(defaultPrefix)}`); const d2 = await r2.json(); if(!cancelled) setStorage(d2); } catch(e){ if(!cancelled) setError(e); }
    })();
    return ()=>{ cancelled = true; };
  },[]);

  return (
    <div style={{fontFamily:"system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif",padding:"24px",maxWidth:980,margin:"0 auto"}}>
      <h1 style={{margin:"0 0 6px"}}>Game Debug Panel</h1>
      <p style={{margin:"0 0 16px",opacity:0.8}}>Environment checks and quick links.</p>
      <section style={{border:"1px solid #ddd",borderRadius:12,padding:16,marginBottom:16}}>
        <h3 style={{margin:"0 0 8px"}}>Status</h3>
        <ul style={{margin:"0 0 8px",paddingLeft:18,lineHeight:1.7}}>
          <li>Health check: {ping ? (ping.ok!==false ? "OK" : "Error") : "…"}</li>
          <li>Storage list: {storage ? (storage.ok ? `${storage.files?.length ?? 0} items` : "Error") : "…"}</li>
        </ul>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <a href="/api/ping" style={{textDecoration:"underline"}}>Open /api/ping</a>
          <a href={`/api/list-storage?bucket=${encodeURIComponent(defaultBucket)}&prefix=${encodeURIComponent(defaultPrefix)}`} style={{textDecoration:"underline"}}>Open /api/list-storage</a>
          <a href="/" style={{textDecoration:"underline"}}>Back to Play</a>
        </div>
      </section>
      {error && <section style={{border:"1px solid #f5c2c7",background:"#fff5f5",color:"#842029",borderRadius:12,padding:16,marginBottom:16}}>
        <strong>Captured error:</strong>
        <pre style={{whiteSpace:"pre-wrap",marginTop:8}}>{String(error?.message || error)}</pre>
      </section>}
      <section style={{border:"1px dashed #bbb",borderRadius:12,padding:16}}>
        <h3 style={{margin:"0 0 8px"}}>Tips</h3>
        <ul style={{margin:"0 0 0 20px",lineHeight:1.7}}>
          <li>Set env vars in Vercel for this project: <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code> (server-only), <code>SUPABASE_MEDIA_BUCKET</code> (e.g. <code>game-media</code>), <code>SUPABASE_MEDIA_PREFIX</code> (blank), <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.</li>
          <li>Visit <code>/api/game-load?game=demo</code> to see mission bundle discovery.</li>
        </ul>
      </section>
    </div>
  );
}
