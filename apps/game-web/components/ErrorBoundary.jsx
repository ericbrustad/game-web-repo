import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { hasError:false, error:null };
  }
  static getDerivedStateFromError(error){
    return { hasError:true, error };
  }
  componentDidCatch(error, info){
    if(process.env.NODE_ENV!=="production"){
      console.error("[ErrorBoundary]", error, info);
    }
  }
  render(){
    if(this.state.hasError){
      const msg = (this.state.error && (this.state.error.message || String(this.state.error))) || "Unknown error";
      return (
        <div style={{padding:"24px",fontFamily:"system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif",maxWidth:800,margin:"40px auto"}}>
          <h1 style={{margin:"0 0 8px"}}>⚠️ Game failed to load</h1>
          <p style={{margin:"0 0 16px",opacity:0.8}}>The app caught an error so you don’t get a black screen.</p>
          <pre style={{whiteSpace:"pre-wrap",background:"#111",color:"#fff",padding:"12px",borderRadius:8,overflow:"auto"}}>{msg}</pre>
          <div style={{marginTop:16}}><a href="/api/ping" style={{textDecoration:"underline"}}>Open /api/ping</a></div>
        </div>
      );
    }
    return this.props.children;
  }
}
