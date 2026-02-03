import { useEffect, useMemo, useState } from "react";
import {
  createDefaultThemeTemplate,
  cloneThemeFromTemplate,
  getDefaultTheme,
} from "../lib/model";

const POSITIONS = ["Centre", "Wing", "Defender", "Goalie"];

export default function ThemePage({ data, setData, setPreviewThemeId }) {
  const activeTeam = useMemo(() => {
    return data.teams?.find((t) => t.id === data.activeTeamId) || null;
  }, [data.teams, data.activeTeamId]);

  // -------------------------
  // Theme manager state
  // -------------------------
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [followActiveTeam, setFollowActiveTeam] = useState(true);

  function updateData(updater) {
    setData((prev) => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  // Build selector options:
  // - Teams (bound 1:1) shown by team name
  // - Any unassigned themes (no team points to them) shown by theme name
  const themeOptions = useMemo(() => {
    const teams = data.teams || [];
    const themes = data.themes || [];

    const teamByThemeId = new Map();
    for (const tm of teams) {
      if (tm?.themeId) teamByThemeId.set(tm.themeId, tm);
    }

    const teamOptions = teams.map((tm) => ({
      kind: "team",
      key: `team:${tm.id}`,
      value: tm.themeId || "",
      label: tm.name || "Unnamed team",
      teamId: tm.id,
      themeId: tm.themeId || "",
    }));

    const unassigned = themes
      .filter((th) => th?.id && !teamByThemeId.has(th.id))
      .map((th) => ({
        kind: "unassigned",
        key: `theme:${th.id}`,
        value: th.id,
        label:
          th.isDefault === true
            ? "⭐ Default Theme"
            : th.name
              ? `${th.name} (unassigned)`
              : "Unnamed theme (unassigned)",
        teamId: "",
        themeId: th.id,
      }));

    return { teamOptions, unassigned };
  }, [data.teams, data.themes]);

  const editingTeam = useMemo(() => {
    if (!editingThemeId) return null;
    return data.teams?.find((tm) => tm.themeId === editingThemeId) || null;
  }, [data.teams, editingThemeId]);

  const editingTheme = useMemo(() => {
    if (!editingThemeId) return null;
    return data.themes?.find((t) => t.id === editingThemeId) || null;
  }, [data.themes, editingThemeId]);

  function ensureBoundThemeFor(teamId) {
    if (!teamId) return;

    updateData((d) => {
      d.themes ??= [];

      const team = d.teams.find((t) => t.id === teamId);
      if (!team) return d;

      // If team.themeId exists AND theme exists, just align name and ensure activeThemeId is consistent
      const existing = team.themeId
        ? d.themes.find((th) => th.id === team.themeId)
        : null;

      if (existing) {
        existing.name = team.name; // keep name aligned with team for clarity
        if (teamId === d.activeTeamId) d.activeThemeId = team.themeId;
        return d;
      }

      // Create/bind a theme cloned from the Default Theme (template)
      let template = getDefaultTheme(d.themes);
      if (!template) {
        template = createDefaultThemeTemplate();
        d.themes.push(template);
      }

      const th = cloneThemeFromTemplate(template, team.name || "Theme");
      th.name = team.name || th.name;

      d.themes.push(th);
      team.themeId = th.id;

      // Keep activeThemeId in sync if we’re repairing the active team
      if (teamId === d.activeTeamId) {
        d.activeThemeId = th.id;
      }

      return d;
    });
  }

  // ✅ Auto-repair for active team while following it:
  // If active team has no themeId OR the theme object is missing, repair immediately.
  useEffect(() => {
    if (!activeTeam) return;
    if (!followActiveTeam) return;

    const themeId = activeTeam.themeId || "";
    const exists =
      themeId && Array.isArray(data.themes)
        ? data.themes.some((t) => t?.id === themeId)
        : false;

    if (!themeId || !exists) {
      ensureBoundThemeFor(activeTeam.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam?.id, activeTeam?.themeId, followActiveTeam, data.themes]);

  // On first mount (and whenever active team changes), default to active team's theme
  useEffect(() => {
    if (!activeTeam) return;
    if (!followActiveTeam) return;
    setEditingThemeId(activeTeam.themeId || null);
  }, [activeTeam, followActiveTeam]);

  // While Theme tab is mounted, apply preview globally
  useEffect(() => {
    if (typeof setPreviewThemeId === "function") {
      setPreviewThemeId(editingThemeId || null);
    }
  }, [editingThemeId, setPreviewThemeId]);

  // On unmount, revert preview back to team theme
  useEffect(() => {
    return () => {
      if (typeof setPreviewThemeId === "function") setPreviewThemeId(null);
    };
  }, [setPreviewThemeId]);

  function setAppColor(key, value) {
    if (!editingThemeId) return;
    updateData((d) => {
      const t = d.themes.find((x) => x.id === editingThemeId);
      if (!t) return d;
      t.app ??= {};
      t.app[key] = value;
      t.updatedAt = Date.now();
      return d;
    });
  }

  function setPosColor(pos, value) {
    if (!editingThemeId) return;
    updateData((d) => {
      const t = d.themes.find((x) => x.id === editingThemeId);
      if (!t) return d;
      t.positions ??= {};
      t.positions[pos] = value;
      t.updatedAt = Date.now();
      return d;
    });
  }

  function selectTheme(themeId) {
    setFollowActiveTeam(false);
    setEditingThemeId(themeId || null);
  }

  function backToActiveTeamTheme() {
    if (!activeTeam) return;
    setFollowActiveTeam(true);
    setEditingThemeId(activeTeam.themeId || null);
  }

  if (!activeTeam) {
    return (
      <div>
        <h2>Theme</h2>
        <div style={{ opacity: 0.8 }}>Create a team first.</div>
      </div>
    );
  }

  const headerTeamName =
    editingTeam?.name || editingTheme?.name || activeTeam?.name || "Theme";

  // If the selected theme is missing, show repair UI (kept as-is)
  if (!editingTheme) {
    const missingTeam = editingTeam || activeTeam;
    const missingTeamId = missingTeam?.id;

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Theme Manager</h2>

        <Card title="Editing theme">
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 12 }}>Select theme</div>
              <select
                value={editingThemeId || ""}
                onChange={(e) => selectTheme(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                }}
              >
                {themeOptions.teamOptions.map((opt) => (
                  <option key={opt.key} value={opt.value || ""}>
                    {opt.label}
                  </option>
                ))}

                {themeOptions.unassigned.length ? (
                  <optgroup label="Unassigned themes:">
                    {themeOptions.unassigned.map((opt) => (
                      <option key={opt.key} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>

            <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.35 }}>
              Live preview is active on this tab. Leaving the Theme tab will
              revert the app back to the active team’s theme automatically.
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={backToActiveTeamTheme} style={{ width: 220 }}>
                Back to active team theme
              </button>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 8, opacity: 0.8 }}>
          The selected team does not have a theme yet (or it was missing). Click
          below to create/repair it.
        </div>
        <button
          onClick={() => ensureBoundThemeFor(missingTeamId)}
          style={{ marginTop: 0 }}
        >
          Create / repair theme for this team
        </button>
      </div>
    );
  }

  // Backward compatible fallbacks (old themes used primary/accent)
  const app = editingTheme.app || {};

  const uiBackground = app.background ?? "#f8fafc";
  const uiButtons = app.buttons ?? app.primary ?? "#2563eb";
  const uiSurface = app.surface ?? "#ffffff";
  const uiText = app.text ?? "#111111";
  const leaderColor = app.leader ?? app.accent ?? "#ffd54a";

  // error bubble (default red if missing)
  const uiErrorBubble = app.errorBubble ?? "#dc2626";

  const printTeamColor = app.printTeamColor ?? app.primary ?? "#d32f2f";
  const printText = app.printText ?? app.text ?? "#111111";
  const printCardText = app.printCardText ?? app.surface ?? "#ffffff";
  const printLeader = app.printLeader ?? app.accent ?? "#ffd54a";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={{ margin: 0 }}>Theme Manager</h2>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>
              <b>Previewing:</b> {headerTeamName} theme
              <br />
              <b>Active team:</b> {activeTeam?.name || "—"} (unchanged)
            </div>
          </div>

          <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
            <button onClick={backToActiveTeamTheme} style={{ width: 220 }}>
              Back to active team theme
            </button>
            <div
              style={{
                fontSize: 12,
                opacity: 0.75,
                maxWidth: 340,
                textAlign: "right",
              }}
            >
              Leaving this tab will revert the app styling back to the active
              team automatically.
            </div>
          </div>
        </div>

        <Card title="Editing theme">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 12 }}>Select theme</div>
            <select
              value={editingThemeId || ""}
              onChange={(e) => selectTheme(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
              }}
            >
              {themeOptions.teamOptions.map((opt) => (
                <option key={opt.key} value={opt.value || ""}>
                  {opt.label}
                </option>
              ))}

              {themeOptions.unassigned.length ? (
                <optgroup label="Unassigned themes:">
                  {themeOptions.unassigned.map((opt) => (
                    <option key={opt.key} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>

          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.35 }}>
            Themes are <b>bound 1:1</b> to teams. Editing here changes that team’s
            theme. Active team selection does not change.
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 1fr)",
          gap: 10,
        }}
      >
        <Card title="Colors in App UI">
          <ColorRow label="Background" value={uiBackground} onChange={(v) => setAppColor("background", v)} />
          <ColorRow label="Buttons" value={uiButtons} onChange={(v) => setAppColor("buttons", v)} />
          <ColorRow label="Surface" value={uiSurface} onChange={(v) => setAppColor("surface", v)} />
          <ColorRow label="Text" value={uiText} onChange={(v) => setAppColor("text", v)} />
          <ColorRow label="Leadership" value={leaderColor} onChange={(v) => setAppColor("leader", v)} />
        </Card>

        <Card title="Preferred Position Colors">
          {POSITIONS.map((pos) => (
            <ColorRow
              key={pos}
              label={pos}
              value={editingTheme.positions?.[pos] || "#999999"}
              onChange={(v) => setPosColor(pos, v)}
            />
          ))}
          <ColorRow label="Error bubble" value={uiErrorBubble} onChange={(v) => setAppColor("errorBubble", v)} />
        </Card>

        <Card title="Colors for printing Lineups">
          <ColorRow label="Team Color" value={printTeamColor} onChange={(v) => setAppColor("printTeamColor", v)} />
          <ColorRow label="Number Background" value={printText} onChange={(v) => setAppColor("printText", v)} />
          <ColorRow
            label="Players Cards Text"
            value={printCardText}
            onChange={(v) => setAppColor("printCardText", v)}
          />
          <ColorRow label="Leadership" value={printLeader} onChange={(v) => setAppColor("printLeader", v)} />
        </Card>

        <Card title="Preview">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 14 }}>
            <Badge text="Background" style={{ background: "var(--background)", color: "var(--text)" }} />
            <Badge text="Buttons" style={{ background: "var(--buttons)", color: "var(--surface)" }} />
            <Badge
              text="Surface"
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            />
            <Badge
              text="C"
              style={{
                background: "transparent",
                color: "var(--leader)",
                borderRight: "2px solid var(--leader)",
                borderLeft: "2px solid var(--leader)",
                paddingLeft: 14,
                paddingRight: 14,
              }}
            />
          </div>

          <hr />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 5, marginBottom: 10, fontSize: 12 }}>
            {POSITIONS.map((p) => (
              <Badge
                key={p}
                text={p}
                style={{
                  background: `var(--pos-${p.toLowerCase()})`,
                  color: "var(--surface)",
                  border: `1px solid var(--buttons)`,
                }}
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
              }}
            />
            <Badge
              text="A"
              style={{
                background: "transparent",
                color: "var(--printLeader)",
                borderRight: "2px solid var(--printLeader)",
                borderLeft: "2px solid var(--printLeader)",
                paddingLeft: 14,
                paddingRight: 14,
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------
   UI helpers (unchanged)
------------------------- */

function Card({ title, children }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "var(--surface)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 46, height: 32, border: "none", background: "transparent" }}
      />
    </div>
  );
}

function Badge({ text, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        padding: "8px 12px",
        fontWeight: 900,
        border: "1px solid transparent",
        ...style,
      }}
    >
      {text}
    </span>
  );
}
