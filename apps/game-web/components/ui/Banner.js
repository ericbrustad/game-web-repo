export function showBanner(text, ms = 2000) {
  if (typeof document === "undefined") return;
  const div = document.createElement("div");
  div.textContent = text;
  Object.assign(div.style, {
    position: "fixed",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#111",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "10px",
    border: "1px solid #333",
    zIndex: 10001,
    fontFamily: "system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    boxShadow: "0 10px 24px rgba(0,0,0,0.3)",
    pointerEvents: "none",
  });
  document.body.appendChild(div);
  setTimeout(() => { try { div.remove(); } catch {} }, ms);
}
