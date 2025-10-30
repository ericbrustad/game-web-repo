const listeners = new Map();
export function on(event, fn){
  if(!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => off(event, fn);
}
export function off(event, fn){
  listeners.get(event)?.delete(fn);
}
export function emit(event, payload){
  const set = listeners.get(event);
  if(!set) return;
  for(const fn of Array.from(set)){
    try{ fn(payload); }
    catch{}
  }
}
export const Events = {
  SETTINGS_UPDATE:"settings:update",
  GEO_POSITION:"geo:position",
  GEO_ENTER:"geo:enter",
  GEO_EXIT:"geo:exit",
  ACTION_PLAY:"action:play_media",
  ACTION_PAUSE:"action:pause_media",
  ACTION_SHOW:"action:show_overlay",
  ACTION_HIDE:"action:hide_overlay",
  UI_OPEN_DIALOG:"ui:open_dialog",
  UI_MODAL_OPEN:"ui:modal-open"
};
