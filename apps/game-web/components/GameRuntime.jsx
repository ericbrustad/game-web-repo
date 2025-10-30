import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { BackpackButton, SettingsButton } from "./ui/CornerButtons";
import { BackpackPanel, SettingsPanel } from "./ui/Panels";
import Modal from "./ui/Modal";
import { on, Events, emit } from "../lib/eventBus";
import { showBanner } from "./ui/Banner";
import DevPanel from "./ui/DevPanel";

const GameMap = dynamic(() => import("./GameMap"), { ssr: false });

// Helpers to pull labels from overlay/mission/bundle or default
function labelFrom(paths, fallback="Continue") {
  for (const p of paths) {
    if (!p) continue;
    if (typeof p === "string" && p.trim()) return p;
    if (typeof p === "object" && typeof p.continueLabel === "string" && p.continueLabel.trim()) return p.continueLabel;
  }
  return fallback;
}

export default function GameRuntime(){
  const router = useRouter();
  const gameId = useMemo(() => (typeof router.query?.game === "string" ? router.query.game : "demo"), [router.query?.game]);

  // Bundle + missions
  const [bundle, setBundle] = useState(null);
  const [missions, setMissions] = useState([]);        // normalized missions[]
  const [mi, setMi] = useState(0);                     // mission index

  // Current mission state
  const currentMission = missions[mi] || { overlays: [], prompts: [] };
  const [answers, setAnswers] = useState({});          // {promptId: value}
  const [gameFinished, setGameFinished] = useState(false);
  const allPromptIds = useMemo(()=> (Array.isArray(currentMission.prompts) ? currentMission.prompts.map(p=>p.id) : []), [currentMission]);
  const requiredIds = useMemo(()=> allPromptIds.filter(id => {
    const p = currentMission.prompts?.find(x=>x.id===id);
    return p?.required !== false; // default required
  }), [allPromptIds, currentMission]);
  // Do NOT auto-complete missions unless explicitly opted-in
  const autoComplete = currentMission?.ui?.autoComplete === true;
  const complete = requiredIds.length > 0
    ? requiredIds.every(id => answers[id] != null && String(answers[id]).trim().length > 0)
    : (autoComplete && (currentMission.prompts?.length || 0) === 0);

  // UI panels
  const [openBackpack, setOpenBackpack] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  // Modals
  const [modal, setModal] = useState(null);
  // modal = {
  //   type: 'prompt'|'response'|'complete'|'finished'|'message',
  //   overlay, prompt, mission, fields...
  //   value, continueLabel
  // }

  // Load mission bundle
  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try {
        const r = await fetch(`/api/game-load?game=${encodeURIComponent(gameId)}`);
        const j = await r.json();
        if (cancelled) return;
        if (j.ok && j.bundle) {
          const b = j.bundle;
          setBundle(b);
          // Normalize to missions[]
          let ms = [];
          if (Array.isArray(b.missions) && b.missions.length) {
            ms = b.missions.map((m, idx)=>({
              id: m.id || `m${idx+1}`,
              title: m.title || `Mission ${idx+1}`,
              overlays: Array.isArray(m.overlays) ? m.overlays : [],
              prompts: Array.isArray(m.prompts) ? m.prompts : [],
              ui: m.ui || {}
            }));
          } else {
            ms = [{
              id: b.id || gameId,
              title: b.title || "Mission",
              overlays: Array.isArray(b.overlays) ? b.overlays : [],
              prompts: Array.isArray(b.prompts) ? b.prompts : [],
              ui: b.ui || {}
            }];
          }
          setMissions(ms);
          setMi(0);
          // Reset answers per mission
          const init = {};
          for (const p of (ms[0]?.prompts || [])) init[p.id] = null;
          setAnswers(init);
          setGameFinished(false);
          setModal(null);
        } else {
          // No bundle: leave missions empty so GameMap falls back to demo overlays
          setBundle(null);
          setMissions([]);
          setMi(0);
          setAnswers({});
          setGameFinished(false);
          setModal(null);
        }
      } catch {
        if (!cancelled) { setBundle(null); setMissions([]); setMi(0); setAnswers({}); setGameFinished(false); setModal(null); }
      }
    })();
    return ()=>{ cancelled = true; };
  }, [gameId]);

  // Prompt/message on GEO_ENTER (prompt first, then dialog, then fallback message)
  useEffect(()=>{
    const offEnter = on(Events.GEO_ENTER, ({ feature })=>{
      showBanner(`Entered zone: ${feature?.id ?? "unknown"}`);
      if (!feature) return;

      const prompt = feature?.prompt;
      if (prompt?.id && prompt?.question) {
        if (answers[prompt.id] == null) {
          const continueLabel = labelFrom([prompt, currentMission?.ui, bundle?.ui], "Continue");
          setModal({
            type: "prompt",
            overlay: feature,
            prompt,
            mission: currentMission,
            title: prompt.title || "Answer Required",
            question: prompt.question,
            value: "",
            continueLabel
          });
          return;
        }
        // Prompt already answered; fall through to dialog/text
      }

      const dialog = feature?.dialog;
      if (dialog?.text || dialog?.title) {
        const continueLabel = labelFrom([dialog, currentMission?.ui, bundle?.ui], "Continue");
        setModal({
          type: "message",
          overlay: feature,
          mission: currentMission,
          title: dialog.title || "Info",
          message: dialog.text || "",
          continueLabel
        });
        return;
      }

      const fallbackMessage = feature?.text || `Entered zone: ${feature?.id ?? "zone"}`;
      const continueLabel = labelFrom([currentMission?.ui, bundle?.ui], "Continue");
      setModal({
        type: "message",
        overlay: feature,
        mission: currentMission,
        title: "Zone reached",
        message: fallbackMessage,
        continueLabel
      });
    });
    return () => offEnter();
  }, [answers, currentMission, bundle]);


  // Test modal hook from Settings
  useEffect(()=>{
    const off = on("debug:test_modal", ()=>{
      setModal({
        type:"message",
        title:"Test dialog",
        message:"If you can see this, the portal/z-index is working.",
        continueLabel:"Close"
      });
    });
    return ()=>off();
  }, []);

  // Listen for direct UI dialog requests (fallback from GameMap)
  useEffect(()=>{
    const off = on(Events.UI_OPEN_DIALOG, (p={})=>{
      setModal({
        type:"message",
        title: p.title || "Info",
        message: p.message || "…",
        continueLabel: p.continueLabel || "Continue"
      });
    });
    return ()=>off();
  }, []);

  // Broadcast modal open state so other components (e.g., GameMap) can react
  useEffect(()=>{
    emit(Events.UI_MODAL_OPEN, Boolean(modal));
  }, [modal]);

  // When a mission becomes complete, show the completion modal (once)
  useEffect(()=>{
    if (!complete) return;
    if (gameFinished) return;
    if (modal && modal.type !== "complete" && modal.type !== "finished") return;
    if (modal?.type === "complete" || modal?.type === "finished") return;
    const continueLabel = labelFrom([currentMission?.ui?.completeLabel, bundle?.ui?.completeLabel, "Continue"]);
    setModal({
      type: "complete",
      mission: currentMission,
      title: currentMission?.ui?.completeTitle || "Mission Complete",
      message: currentMission?.ui?.completeMessage || "Great work!",
      continueLabel
    });
  }, [complete, currentMission, bundle, modal, gameFinished]);

  // Handlers
  const onPromptChange = (e)=> setModal((m)=> ({ ...m, value: e.target.value }));
  const onContinue = ()=>{
    if (!modal) return;
    if (modal.type === "prompt") {
      const { prompt, value, overlay } = modal;
      setAnswers((prev)=> ({ ...prev, [prompt.id]: value }));
      if (prompt.correct != null) {
        const normalizedAnswer = String(value ?? "").trim().toLowerCase();
        const normalizedCorrect = String(prompt.correct).trim().toLowerCase();
        if (normalizedAnswer === normalizedCorrect) {
          emit(Events.GEO_ENTER, { feature: { id:`answer-${prompt.id}`, type:"text", coordinates: overlay?.coordinates || [0,0], radius: 0, text:`Answered: ${prompt.id}` } });
        }
      }
      // Optional response window
      const resp = prompt.responseText || overlay?.dialog?.responseText;
      if (resp) {
        const continueLabel = labelFrom([prompt, currentMission?.ui, bundle?.ui], "Continue");
        setModal({ type:"response", title: prompt.responseTitle || "Response", message: resp, continueLabel });
      } else {
        setModal(null);
      }
      return;
    }
    if (modal.type === "message" || modal.type === "response") {
      setModal(null);
      return;
    }
    if (modal.type === "complete") {
      // Advance to next mission if any
      if (mi + 1 < missions.length) {
        const next = mi + 1;
        setMi(next);
        // Reset answers for next mission prompts
        const init = {};
        for (const p of (missions[next]?.prompts || [])) init[p.id] = null;
        setAnswers(init);
        setGameFinished(false);
        setModal(null);
      } else {
        // No more missions – show finished banner
        const continueLabel = labelFrom([bundle?.ui?.finishLabel, "Close"]);
        setGameFinished(true);
        setModal({ type:"finished", title:"All Missions Complete", message:"You’ve finished the game.", continueLabel });
      }
    } else if (modal.type === "finished") {
      setModal(null);
    }
  };

  // Overlays to render for the current mission (or demo if empty)
  const overlays = useMemo(()=> Array.isArray(currentMission.overlays) ? currentMission.overlays : [], [currentMission]);
  // Make sure modalOpen is always defined to avoid runtime errors when referenced elsewhere.
  const modalOpen = Boolean(modal);
  return (
    <div style={{ fontFamily:"system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif" }}>
      {/* Keep map interactive during debug. To block clicks while a modal is open, change pointerEvents to modalOpen ? "none" : "auto". */}
      <div style={{ pointerEvents: "auto" }}>
        <GameMap overlays={overlays} />
      </div>

      {/* Corner UI */}
      <BackpackButton onClick={()=>setOpenBackpack(true)} />
      <SettingsButton onClick={()=>setOpenSettings(true)} />
      <BackpackPanel open={openBackpack} onClose={()=>setOpenBackpack(false)} />
      <SettingsPanel open={openSettings} onClose={()=>setOpenSettings(false)} />

      {/* Modals */}
      <Modal
        open={modal?.type==="prompt"}
        title={modal?.title}
        primaryLabel={modal?.continueLabel || "Continue"}
        onPrimary={onContinue}
      >
        <div style={{display:"grid", gap:8}}>
          <div>{modal?.question}</div>
          <input
            autoFocus
            value={modal?.value ?? ""}
            onChange={onPromptChange}
            placeholder="Type your answer"
            style={{padding:"10px 12px", border:"1px solid #ccc", borderRadius:10}}
          />
        </div>
      </Modal>

      <Modal
        open={modal?.type==="message" || modal?.type==="response"}
        title={modal?.title}
        primaryLabel={modal?.continueLabel || "Continue"}
        onPrimary={onContinue}
      >
        <div>{modal?.message}</div>
      </Modal>

      <Modal
        open={modal?.type==="complete"}
        title={modal?.title}
        primaryLabel={modal?.continueLabel || "Continue"}
        onPrimary={onContinue}
      >
        <div>{modal?.message}</div>
        {mi + 1 < missions.length ? <p style={{opacity:0.7, marginTop:8}}>Next: {missions[mi+1]?.title || `Mission ${mi+2}`}</p> : null}
      </Modal>

      <Modal
        open={modal?.type==="finished"}
        title={modal?.title}
        primaryLabel={modal?.continueLabel || "Close"}
        onPrimary={onContinue}
      >
        <div>{modal?.message}</div>
      </Modal>

      {/* Dev helper: trigger enters without clicking the map */}
      <DevPanel overlays={overlays} missionTitle={currentMission?.title} />

    </div>
  );
}
