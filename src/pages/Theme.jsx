import { useMemo } from "react";
import { createTheme } from "../lib/model";

const POSITIONS = ["Centre", "Wing", "Defender", "Goalie"];

export default function ThemePage({ data, setData }) {
  const activeTheme = useMemo(() => {
    return data.themes?.find((t) => t.id === data.activeThemeId) || null;
  }, [data.themes, data.activeThemeId]);

  function updateData(updater) {
    setData((prev) => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  function ensureThemeBasics() {
    updateData((d) => {
      d.themes ??= [];
      if (d.themes.length === 0) {
        const t = createTheme("Default");
        d.themes.push(t);
        d.activeThemeId = t.id;
      } else if (!d.activeThemeId) {
        d.activeThemeId = d.themes[0].id;
      }
      return d;
    });
  }

  function setActiveThemeId(id) {
    updateData((d) => {
      d.activeThemeId = id;
      return d;
    });
  }

  function saveNewThemeCopy() {
    const base = activeTheme || createTheme("Default");
    const name = prompt("Theme name?", `${base.name} (copy)`);
    if (!name) return;

    updateData((d) => {
      const copy = structuredClone(base);
      copy.id = crypto.randomUUID();
      copy.name = name.trim();
      copy.createdAt = Date.now();
      copy.updatedAt = Date.now();
      d.themes.push(copy);
      d.activeThemeId = copy.id;
      return d;
    });
  }

  function renameTheme() {
    if (!activeTheme) return;
    const name = prompt("New theme name?", activeTheme.name);
    if (!name) return;

    updateData((d) => {
      const t = d.themes.find((x) => x.id === d.activeThemeId);
      if (!t) return d;
      t.name = name.trim();
      t.updatedAt = Date.now();
      return d;
    });
  }

  function deleteTheme() {
    if (!activeTheme) return;
    if (!confirm(`Delete theme "${activeTheme.name}"?`)) return;

    updateData((d) => {
      d.themes = d.themes.filter((t) => t.id !== d.activeThemeId);
      d.activeThemeId = d.themes[0]?.id ?? null;
      return d;
    });

    setTimeout(ensureThemeBasics, 0);
  }

  function setAppColor(key, value) {
    updateData((d) => {
      const t = d.themes.find((x) => x.id === d.activeThemeId);
      if (!t) return d;
      t.app ??= {};
      t.app[key] = value;
      t.updatedAt = Date.now();
      return d;
    });
  }

  function setPosColor(pos, value) {
    updateData((d) => {
      const t = d.themes.find((x) => x.id === d.activeThemeId);
      if (!t) return d;
      t.positions ??= {};
      t.positions[pos] = value;
      t.updatedAt = Date.now();
      return d;
    });
  }

  if (!activeTheme) {
    return (
      <div>
        <h2>Theme</h2>
        <button onClick={ensureThemeBasics}>Create default theme</button>
      </div>
    );
  }

  // Backward compatible fallbacks (old themes used primary/accent)
  const app = activeTheme.app || {};

  const uiBackground = app.background ?? "#f8fafc";
  const uiButtons = app.buttons ?? app.primary ?? "#2563eb";
  const uiSurface = app.surface ?? "#ffffff";
  const uiText = app.text ?? "#111111";

  const leaderColor = app.leader ?? app.accent ?? "#ffd54a";

  // ✅ NEW: errorBubble (default red if missing)
  const uiErrorBubble = app.errorBubble ?? "#dc2626";

  const printTeamColor = app.printTeamColor ?? app.primary ?? "#d32f2f";
  const printText = app.printText ?? app.text ?? "#111111";
  const printCardText = app.printCardText ?? app.surface ?? "#ffffff";
  const printLeader = app.printLeader ?? app.accent ?? "#ffd54a";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Theme</h2>

        <select
          value={data.activeThemeId || ""}
          onChange={(e) => setActiveThemeId(e.target.value)}
          style={{ padding: 8, borderRadius: 12, border: "1px solid var(--border)" }}
        >
          {data.themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={saveNewThemeCopy}>Save as new</button>
        <button onClick={renameTheme}>Rename</button>
        <button onClick={deleteTheme}>Delete</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr)", gap: 10 }}>
        <Card title="Colors in App UI">
          <ColorRow label="Background" value={uiBackground} onChange={(v) => setAppColor("background", v)} />
          <ColorRow label="Buttons" value={uiButtons} onChange={(v) => setAppColor("buttons", v)} />
          <ColorRow label="Surface" value={uiSurface} onChange={(v) => setAppColor("surface", v)} />
          <ColorRow label="Text" value={uiText} onChange={(v) => setAppColor("text", v)} />
          <ColorRow label="Leadership" value={leaderColor} onChange={(v) => setAppColor("leader", v)} />
        </Card>

        <Card title="Preferred Position Colors">
          {POSITIONS.map((pos) => (
            <ColorRow key={pos} label={pos} value={activeTheme.positions?.[pos] || "#999999"} onChange={(v) => setPosColor(pos, v)} />
          ))}

          

          {/* ✅ NEW */}
          <ColorRow label="Error bubble" value={uiErrorBubble} onChange={(v) => setAppColor("errorBubble", v)} />
        </Card>

        <Card title="Colors for printing Lineups">
          <ColorRow label="Team Color" value={printTeamColor} onChange={(v) => setAppColor("printTeamColor", v)} />
          <ColorRow label="Number Background" value={printText} onChange={(v) => setAppColor("printText", v)} />
          <ColorRow label="Players Cards Text" value={printCardText} onChange={(v) => setAppColor("printCardText", v)} />
          <ColorRow label="Leadership" value={printLeader} onChange={(v) => setAppColor("printLeader", v)} />
        </Card>

        <Card title="Preview">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 14 }}>
            <Badge text="Background" style={{ background: "var(--background)", color: "var(--text)" }} />
            <Badge text="Buttons" style={{ background: "var(--buttons)", color: "var(--surface)" }} />
            <Badge text="Surface" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
            <Badge text="C" style={{ 
              background: "transparent",
              color: "var(--leader)",
              borderRight: "2px solid var(--leader)",
              borderLeft: "2px solid var(--leader)", 
              paddingLeft: 14,
              paddingRight: 14
              }} />
          </div>

          <hr />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 5, marginBottom: 10, fontSize: 12 }}>
            {POSITIONS.map((p) => (
              <Badge
                key={p}
                text={p}
                style={{ background: `var(--pos-${p.toLowerCase()})`, color: "var(--surface)", border: `1px solid var(--buttons)` }}
              />
            ))}
            
            <Badge text="Error" style={{ background: "var(--errorBubble)", color: "white" }} />
          </div>

          <hr />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 5, marginBottom: 10, fontSize: 14 }}>
            <Badge text="Team" style={{ background: "white", color: "var(--printTeamColor)" }} />
            
            <Badge
              text="#99"
              style={{
                background: "var(--printText)",
                color: "var(--printCardText)",
                marginRight: -40,
                zIndex: 2,
                fontSize: 10,
                padding: 10,
              }}
            />
            <Badge
              text="Player Name"
              style={{
                background: "var(--printTeamColor)",
                color: "var(--printCardText)",
                paddingLeft: 35,
                paddingRight: 35,
                paddingTop: 8,
              }}
            />
            <Badge
              text="C"
              style={{
                background: "var(--printLeader)",
                color: "var(--printCardText)",
                marginLeft: -40,
                fontSize: 10,
                paddingTop: 10,
                paddingRight: 14,
                paddingBottom: 5,
                paddingLeft: 14,
              }}
            />
          </div>
        </Card>

        {/* ...existing Theme tab content... */}
        <ResetFactoryCard />

      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div
      className="colorRow"
      style={{
        display: "grid",
        gridTemplateColumns: "150px 50px 70px",
        gap: 10,
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <div style={{ fontWeight: 700, minWidth: 0 }}>{label}</div>

      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 56, height: 36, padding: 0, border: 0, background: "transparent" }}
      />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          minWidth: 0,
          padding: 8,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text)",
        }}
      />
    </div>
  );
}

function Badge({ text, style }) {
  return <div style={{ padding: "8px 10px", borderRadius: 999, fontWeight: 800, ...style }}>{text}</div>;
}

// --- RESET CARD (place near bottom of Theme tab render) ---
function ResetFactoryCard() {
  const [open, setOpen] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  function close() {
    setOpen(false);
    setChecked(false);
  }

  function doFactoryReset() {
    // Wipe ONLY this app's persisted state
    localStorage.removeItem("ihlbuilder_v1");

    // Ask app to open Rosters after reload
    sessionStorage.setItem("ihlbuilder_postreset_tab", "rosters");

    // Hard reset = safest (clears in-memory state too)
    window.location.reload();
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>RESET</div>

      <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35, marginBottom: 10 }}>
        This will permanently delete all saved data on this device/browser (teams, rosters, lineups,
        themes, and settings). This cannot be undone.
      </div>

      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          fontWeight: 900,
          background: "var(--errorBubble, #ff4d4d)",
          color: "white",
        }}
      >
        Factory reset
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            // click outside to close
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              padding: 14,
              boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
              Confirm factory reset
            </div>

            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35, marginBottom: 12 }}>
              You are about to delete <b>everything</b> saved by this app on this device/browser.
              This cannot be undone.
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>
                I understand this will delete all my saved data.
              </span>
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={close}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  fontWeight: 800,
                }}
              >
                Cancel
              </button>

              <button
                onClick={doFactoryReset}
                disabled={!checked}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontWeight: 900,
                  background: !checked ? "rgba(0,0,0,0.12)" : "var(--errorBubble, #ff4d4d)",
                  color: !checked ? "rgba(0,0,0,0.55)" : "white",
                  cursor: !checked ? "not-allowed" : "pointer",
                }}
              >
                Reset app
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

