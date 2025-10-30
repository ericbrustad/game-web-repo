// Demo overlays — replace with DB-driven content later
// { id, type: 'image'|'video'|'text'|'audio', coordinates:[lng,lat], radius, url?, text?, size?, autoplay?, loop?, poster? }
export const OVERLAYS = [
  { id:"img-warehouse", type:"image", coordinates:[-93.265, 44.9778], radius:100, url:"https://placekitten.com/420/280", size:{width:280, height:180} },
  { id:"video-flowers", type:"video", coordinates:[-93.269, 44.9752], radius:120, url:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", poster:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.jpg", size:{width:320, height:180}, autoplay:true, loop:true },
  { id:"txt-mission", type:"text", coordinates:[-93.27, 44.9793], radius:90, text:"Mission: Find the briefcase near Nicollet Mall." },
  { id:"aud-horn", type:"audio", coordinates:[-93.2625, 44.9758], radius:100, url:"https://upload.wikimedia.org/wikipedia/commons/0/06/Trombone_short.ogg" },
];
