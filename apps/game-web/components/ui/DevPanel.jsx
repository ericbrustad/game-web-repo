import React, { useEffect, useMemo, useState } from "react";
import { emit, Events } from "../../lib/eventBus";

const baseStyles = {
  wrapper: {
    position: "fixed",
    right: 12,
    bottom: 12,
    zIndex: 10002,
    width: 280,
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 12,
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
    fontFamily: "system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
  },
  header: {
    padding: "10px 12px",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  row: {
    padding: "10px 12px",
    borderBottom: "1px solid #f3f3f3",
    display: "grid",
    gap: 4
  },
  button: {
    marginTop: 6,
    alignSelf: "start",
    padding: "6px 10px",
    border: "1px solid #333",
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    cursor: "pointer"
  }
};

function useDebugUiFlag() {
  const [enabled, setEnabled] = useState(
    typeof process !== "undefined" && (process.env.NEXT_PUBLIC_DEBUG_UI === "1" || process.env.DEBUG_UI === "1")
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug_ui") === "1") {
      setEnabled(true);
    }
  }, []);

  return enabled;
}

export default function DevPanel({ overlays = [], missionTitle = "" }) {
  const debugEnabled = useDebugUiFlag();
  const items = useMemo(() => {
    if (!Array.isArray(overlays)) return [];
    return overlays.map((feature) => ({
      id: feature?.id || "overlay",
      title: feature?.dialog?.title || feature?.prompt?.title || "",
      type: feature?.type || "overlay",
      radius: feature?.radius,
      feature
    }));
  }, [overlays]);

  if (!debugEnabled || !items.length) return null;

  return (
    <div style={baseStyles.wrapper}>
      <div style={baseStyles.header}>
        <strong>Dev Panel</strong>
        {missionTitle ? <span style={{ opacity: 0.7 }}>{missionTitle}</span> : null}
      </div>
      <div style={{ maxHeight: 260, overflow: "auto" }}>
        {items.map((item) => (
          <div key={item.id} style={baseStyles.row}>
            <div style={{ fontWeight: 600 }}>{item.id}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {item.type} · R={item.radius ?? 100}m
            </div>
            <button
              type="button"
              style={baseStyles.button}
              onClick={() => {
                const target = overlays.find((ov) => ov?.id === item.id);
                if (!target) return;
                emit(Events.GEO_ENTER, { feature: target, distance: 0 });
                emit(Events.UI_OPEN_DIALOG, {
                  title: target?.dialog?.title || target?.prompt?.title || "Zone reached",
                  message:
                    target?.dialog?.text || target?.text || `Manual enter: ${target?.id ?? "overlay"}`,
                  continueLabel: target?.dialog?.continueLabel || target?.prompt?.continueLabel || "Continue"
                });
              }}
            >
              Trigger Enter
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
