import { useEffect, useMemo, useState } from "react";
import { createDefaultThemeTemplate, cloneThemeFromTemplate, getDefaultTheme } from "../lib/model";

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
        label: th.isDefault === true ? "⭐ Default Theme" : (th.name ? `${th.name} (unassigned)` : "Unnamed theme (unassigned)"),
        teamId: "",
        themeId: th.id,
      }));

    return { teamOptions, unassigned };
  }, [data.teams, data.themes]);
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

  function updateData(updater) {
    setData((prev) => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

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

      const existing = d.themes.find((th) => th.id === team.themeId);
      if (existing) {
        // keep name aligned with team for clarity
        existing.name = team.name;
        return d;
      }

      // Create/bind a theme cloned from the Default Theme (template)
      d.themes ??= [];
      let template = getDefaultTheme(d.themes);
      if (!template) {
        template = createDefaultThemeTemplate();
        d.themes.push(template);
      }
      const th = cloneThemeFromTemplate(template, team.name || "Theme");
      th.name = team.name || th.name;
      d.themes.push(th);
      team.themeId = th.id;

      // If we were trying to edit this team's theme, jump to the repaired theme
      if (teamId === d.activeTeamId && followActiveTeam) {
        d.activeThemeId = th.id;
      }
      return d;
    });
  }

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


  const headerTeamName = editingTeam?.name || editingTheme?.name || activeTeam?.name || "Theme";

  if (!editingTheme) {
    const missingTeam = editingTeam || activeTeam;
    const missingTeamId = missingTeam?.id;

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Theme Manager</h2>

        <Card title="Editing theme">
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 12 }}>Select theme</div>
              <select
                value={editingThemeId || ""}
                onChange={(e) => selectTheme(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)" }}
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
              Live preview is active on this tab. Leaving the Theme tab will revert the app back to the active team’s
              theme automatically.
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={backToActiveTeamTheme} style={{ width: 220 }}>
                Back to active team theme
              </button>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 8, opacity: 0.8 }}>
          The selected team does not have a theme yet (or it was missing). Click below to create/repair it.
        </div>
        <button onClick={() => ensureBoundThemeFor(missingTeamId)} style={{ marginTop: 0 }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
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
            <div style={{ fontSize: 12, opacity: 0.75, maxWidth: 340, textAlign: "right" }}>
              Leaving this tab will revert the app styling back to the active team automatically.
            </div>
          </div>
        </div>

        <Card title="Editing theme">
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 12 }}>Select theme</div>
            <select
              value={editingThemeId || ""}
              onChange={(e) => selectTheme(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)" }}
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
            Themes are <b>bound 1:1</b> to teams. Editing here changes that team’s theme. Active team selection does not
            change.
          </div>
        </Card>
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

        {/* Factory reset card (bottom) */}
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

/* ===================== RESET CARD ===================== */

function ResetFactoryCard() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  function close() {
    setOpen(false);
    setChecked(false);
  }

  function doFactoryReset() {
    // Wipe ONLY this app's persisted state
    localStorage.removeItem("ihlbuilder_v1");

    // Ask App.jsx to land on Rosters after reload
    sessionStorage.setItem("ihlbuilder_postreset_tab", "rosters");

    // Hard reset clears in-memory state too
    window.location.reload();
  }

  return (
    <Card title="RESET">
      <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>
        This will permanently delete all saved data on this device/browser (teams, rosters, lineups, themes, and
        settings). This cannot be undone.
      </div>

      <button
        onClick={() => setOpen(true)}
        style={{
          width: 290,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          fontWeight: 900,
          background: "var(--errorBubble, #dc2626)",
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
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Confirm factory reset</div>

            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35, marginBottom: 12 }}>
              You are about to delete <b>everything</b> saved by this app on this device/browser. This cannot be undone.
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span style={{ fontSize: 13 }}>I understand this will delete all my saved data.</span>
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={close}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--buttons)",
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
                  background: !checked ? "rgba(0,0,0,0.12)" : "var(--errorBubble, #dc2626)",
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
    </Card>
  );
}
