import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, title, children, primaryLabel = "Continue", onPrimary, secondaryLabel, onSecondary }) {
  const canPortal = typeof window !== "undefined" && typeof document !== "undefined";
  const root = canPortal ? document.body : null;
  // Lock scroll while modal open for nicer UX
  useEffect(() => {
    if (!canPortal) return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open, canPortal]);

  if (!open || !canPortal || !root) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" style={backdrop}>
      <div style={card}>
        {title ? <h3 style={{ margin: "0 0 12px" }}>{title}</h3> : null}
        <div style={{ marginBottom: 16 }}>{children}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {secondaryLabel ? (
            <button onClick={onSecondary} style={btnGhost}>
              {secondaryLabel}
            </button>
          ) : null}
          <button onClick={onPrimary} style={btnPrimary}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    root
  );
}

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 10000,
  display: "grid",
  placeItems: "center",
  padding: 16,
};
const card = {
  width: "min(720px, 96vw)",
  background: "#fff",
  color: "#111",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  fontFamily: "system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
};
const btnPrimary = {
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};
const btnGhost = {
  background: "#fff",
  color: "#111",
  border: "1px solid #ccc",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};
