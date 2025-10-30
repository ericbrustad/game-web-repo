import React from "react";
const baseBtn={borderRadius:12,padding:"10px 12px",background:"#111",color:"#fff",border:"1px solid #333",boxShadow:"0 4px 14px rgba(0,0,0,0.35)",cursor:"pointer"};
export function BackpackButton({ onClick }){
  return <button onClick={onClick} style={{...baseBtn,position:"fixed",left:12,bottom:12,zIndex:20}} aria-label="Open backpack">🎒 Backpack</button>;
}
export function SettingsButton({ onClick }){
  return <button onClick={onClick} style={{...baseBtn,position:"fixed",right:12,top:12,zIndex:20}} aria-label="Open settings">⚙️ Settings</button>;
}
