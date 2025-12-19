import { useMemo } from "react";
import { createTheme } from "../lib/model";

const POSITIONS = ["Centre", "Wing", "Defender", "Goalie"];

export default function ThemePage({ data, setData }) {
  const activeTheme = useMemo(() => {
    return data.themes?.find(t => t.id === data.activeThemeId) || null;
  }, [data.themes, data.activeThemeId]);

  function updateData(updater) {
    setData(prev => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  function ensureThemeBasics() {
    updateData(d => {
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
    updateData(d => {
      d.activeThemeId = id;
      return d;
    });
  }

  function saveNewThemeCopy() {
    const base = activeTheme || createTheme("Default");
    const name = prompt("Theme name?", `${base.name} (copy)`);
    if (!name) return;

    updateData(d => {
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

    updateData(d => {
      const t = d.themes.find(x => x.id === d.activeThemeId);
      if (!t) return d;
      t.name = name.trim();
      t.updatedAt = Date.now();
      return d;
    });
  }

  function deleteTheme() {
    if (!activeTheme) return;
    if (!confirm(`Delete theme "${activeTheme.name}"?`)) return;

    updateData(d => {
      d.themes = d.themes.filter(t => t.id !== d.activeThemeId);
      d.activeThemeId = d.themes[0]?.id ?? null;
      return d;
    });

    // after deletion, ensure there's still a theme
    setTimeout(ensureThemeBasics, 0);
  }

  function setAppColor(key, value) {
    updateData(d => {
      const t = d.themes.find(x => x.id === d.activeThemeId);
      if (!t) return d;
      t.app[key] = value;
      t.updatedAt = Date.now();
      return d;
    });
  }

  function setPosColor(pos, value) {
    updateData(d => {
      const t = d.themes.find(x => x.id === d.activeThemeId);
      if (!t) return d;
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

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Theme</h2>

        <select
          value={data.activeThemeId || ""}
          onChange={(e) => setActiveThemeId(e.target.value)}
          style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)" }}
        >
          {data.themes.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button onClick={saveNewThemeCopy}>Save as new</button>
        <button onClick={renameTheme}>Rename</button>
        <button onClick={deleteTheme}>Delete</button>
      </div>

      <Card title="Colors in App UI">
        
        <ColorRow label="Background" value={activeTheme.app.background} onChange={(v) => setAppColor("background", v)} />
        <ColorRow label="Buttons" value={activeTheme.app.primary} onChange={(v) => setAppColor("primary", v)} />
        <ColorRow label="Surface" value={activeTheme.app.surface} onChange={(v) => setAppColor("surface", v)} />
        <ColorRow label="Text" value={activeTheme.app.text} onChange={(v) => setAppColor("text", v)} />
        
      </Card>



      <Card title="Preferred Position Colors">
        {POSITIONS.map(pos => (
          <ColorRow
            key={pos}
            label={pos}
            value={activeTheme.positions[pos]}
            onChange={(v) => setPosColor(pos, v)}
          />
          
        ))}
        <ColorRow label="Leadership" value={activeTheme.app.accent} onChange={(v) => setAppColor("accent", v)} />
      </Card>

      
      <Card title="Colors for printing Lineups">
        
        <ColorRow label="Team Color" value={activeTheme.app.primary} onChange={(v) => setAppColor("primary", v)} />
        <ColorRow label="Labels" value={activeTheme.app.text} onChange={(v) => setAppColor("text", v)} />
        <ColorRow label="Players Cards Text" value={activeTheme.app.surface} onChange={(v) => setAppColor("surface", v)} />
        <ColorRow label="Leadership" value={activeTheme.app.accent} onChange={(v) => setAppColor("accent", v)} />

      </Card>

      {
      
      <Card title="Preview">
        APP:
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10}}>           
          <Badge text="Background" style={{ background: "var(--background)", color: "var(--text)" }} />
          <Badge text="Buttons" style={{ background: "var(--primary)", color: "var(--surface)" }} />
          <Badge text="Surface" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
        </div>
          
        Positions in APP:          
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 5, marginBottom: 10 }}>
          {POSITIONS.map(p => (
            <Badge key={p} text={p} style={{ background: `var(--pos-${p.toLowerCase()})`, color: "var(--surface)", border: `1px solid var(--primary)` }} />
          ))}
        </div>

        Print:  
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 5, marginBottom: 10 }}>
          <Badge text="Team Name" style={{ background: "white", color: "var(--primary)" }} />      
          <Badge text="Labels" style={{ background: "white", color: "var(--text)" }} /> 
          <Badge text="#99" style={{ background: "var(--text)", color: "var(--surface)", marginRight: -40, zIndex: 2, fontSize: 12, padding: 10 }} />
          <Badge text="Players Card" style={{
                                       background: "var(--primary)", 
                                       color: "var(--surface)", 
                                       paddingLeft: 35,
                                       paddingRight: 35,
                                       paddingTop: 8
                                       }} />
          <Badge text="C" style={{
                           background: "var(--accent)", 
                           color: "var(--surface)", 
                           marginLeft: -40, 
                           fontSize: 12, 
                           paddingTop: 10, 
                           paddingRight: 14, 
                           paddingBottom: 5, 
                           paddingLeft: 14
                           }} />

        </div>
        
      </Card>
      
      }
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
    <div style={{ display: "grid", gridTemplateColumns: "130px 80px 70px 50px", gap: 10, alignItems: "center" }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text)" }}
      />
      
    </div>
  );
}

function Badge({ text, style }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 999, fontWeight: 800, ...style }}>
      {text}
    </div>
  );
}
