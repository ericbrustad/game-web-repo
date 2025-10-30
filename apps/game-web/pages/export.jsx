import React, { useState } from "react";

export default function ExportPage() {
  const [apiKey, setApiKey] = useState("");
  const [game, setGame] = useState("demo");
  const [bundle, setBundle] = useState(`{
  "ui": { "continueLabel": "Continue", "completeLabel": "Proceed", "finishLabel": "Done" },
  "missions": [
    {
      "id": "m1",
      "title": "Downtown Briefcase",
      "ui": { "completeTitle": "Mission 1 Complete", "completeMessage": "Nice work!" },
      "overlays": [
        { "id": "note", "type": "text", "coordinates": [-93.265, 44.978], "radius": 120,
          "dialog": { "title": "Heads up", "text": "Check the plaza near Nicollet Mall.", "continueLabel": "Got it" } },
        { "id": "quiz1", "type": "text", "coordinates": [-93.267, 44.979], "radius": 100,
          "prompt": { "id": "q1", "title": "Checkpoint", "question": "What color is the X?", "correct": "blue", "continueLabel": "Answer" } }
      ],
      "prompts": [{ "id": "q1", "required": true }]
    }
  ]
}`);
  const [out, setOut] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    let body;
    try {
      body = JSON.parse(bundle);
    } catch {
      setOut({ ok: false, error: "Bundle is not valid JSON" });
      return;
    }
    const r = await fetch("/api/export-bundle", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ game, bundle: body }),
    });
    const j = await r.json();
    setOut(j);
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Export bundle → Supabase</h1>
      <p style={{ opacity: 0.8 }}>
        Paste a bundle JSON, enter your API key, and upload to <code>game-media/games/&lt;game&gt;/bundle.json</code>.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Export API Key (server checks this)
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter EXPORT_API_KEY"
            style={inputStyle}
          />
        </label>
        <label>
          Game slug
          <input
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="demo"
            style={inputStyle}
          />
        </label>
        <label>
          Bundle JSON
          <textarea
            value={bundle}
            onChange={(e) => setBundle(e.target.value)}
            rows={16}
            style={{ ...inputStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          />
        </label>
        <button type="submit" style={buttonStyle}>
          Upload
        </button>
      </form>
      {out && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#111",
            color: "#fff",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {JSON.stringify(out, null, 2)}
        </pre>
      )}
      <p style={{ opacity: 0.7, marginTop: 12 }}>
        After upload, open <code>/?game={game}</code> to play.
      </p>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ccc",
  borderRadius: 10,
};

const buttonStyle = {
  width: "fit-content",
  padding: "10px 14px",
  border: "1px solid #333",
  borderRadius: 10,
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};
