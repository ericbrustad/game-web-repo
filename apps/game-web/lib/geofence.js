import { emit, on, Events } from "./eventBus";
const R=6371000;
const rad=(d)=>d*Math.PI/180;
export function distanceMeters(a,b){
  const dLat=rad(b.lat-a.lat);
  const dLng=rad(b.lng-a.lng);
  const lat1=rad(a.lat);
  const lat2=rad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function startGeofenceWatcher({ features, highAccuracy=true }){
  const state={ inside:new Set(), pos:null };
  const check=()=>{
    if(!state.pos) return;
    for(const f of features){
      const c={lng:f.coordinates[0], lat:f.coordinates[1]};
      const dist=distanceMeters(state.pos,c);
      const within=dist <= (f.radius||50);
      const id=f.id;
      if(within && !state.inside.has(id)){
        state.inside.add(id);
        emit(Events.GEO_ENTER,{feature:f, distance:dist});
      } else if(!within && state.inside.has(id)){
        state.inside.delete(id);
        emit(Events.GEO_EXIT,{feature:f, distance:dist});
      }
    }
  };
  const offSim = on(Events.GEO_POSITION,(pos)=>{
    if(!pos) return;
    state.pos=pos;
    check();
  });
  let watchId=null;
  if(typeof navigator!=="undefined" && navigator.geolocation){
    watchId = navigator.geolocation.watchPosition(
      (p)=>{
        state.pos={lat:p.coords.latitude, lng:p.coords.longitude, accuracy:p.coords.accuracy};
        check();
      },
      ()=>{},
      { enableHighAccuracy:highAccuracy, maximumAge:3000, timeout:10000 }
    );
  }
  return ()=>{
    offSim();
    if(watchId!=null && navigator?.geolocation?.clearWatch){
      navigator.geolocation.clearWatch(watchId);
    }
  };
}
