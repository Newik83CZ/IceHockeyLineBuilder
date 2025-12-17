import { useMemo, useRef, useState } from "react";
import {
  createPlayer,
  createTeam,
  positionSortKey,
  validatePlayer,
} from "../lib/model";

const POSITIONS = ["Centre", "Wing", "Defender", "Goalie"];
const CANPLAY = ["LW", "C", "RW", "LD", "RD", "G"];
const STICKS = ["", "Left", "Right"];
const LEADERSHIP = ["", "C", "A"];

export default function Rosters({ data, setData }) {
  const [teamName, setTeamName] = useState("");
  const [search, setSearch] = useState("");

  const importRef = useRef(null);

  function exportActiveTeam() {
    if (!activeTeam) return;

    const payload = {
      schema: "icehockey-linebuilder/team/v1",
      exportedAt: new Date().toISOString(),
      team: {
        name: activeTeam.name,
        players: activeTeam.players.map(p => ({
          number: String(p.number),
          name: p.name,
          preferredPosition: p.preferredPosition,
          leadership: p.leadership || "",
          stick: p.stick || "",
          canPlay: p.canPlay || [],
          notes: p.notes || "",
        })),
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const safeName = activeTeam.name.replace(/[^a-z0-9-_]+/gi, "_");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName || "team"}_roster.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function clickImport() {
    importRef.current?.click();
  }

  function importFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const teamData = parsed?.team ?? parsed; // support either {team:{...}} or direct

        const name = (teamData?.name || "Imported Team").toString().trim();
        const rawPlayers = Array.isArray(teamData?.players) ? teamData.players : [];

        updateData(d => {
          const team = createTeam(name);

          // Convert players into your internal shape (new ids generated)
          for (const rp of rawPlayers) {
            const playerDraft = {
              number: String(rp?.number ?? ""),
              name: String(rp?.name ?? ""),
              preferredPosition: POSITIONS.includes(rp?.preferredPosition) ? rp.preferredPosition : "Centre",
              leadership: LEADERSHIP.includes(rp?.leadership) ? rp.leadership : "",
              stick: STICKS.includes(rp?.stick) ? rp.stick : "",
              canPlay: Array.isArray(rp?.canPlay)
                ? rp.canPlay.filter(x => CANPLAY.includes(x))
                : [],
              notes: String(rp?.notes ?? ""),
            };

            // Skip totally empty rows
            if (!playerDraft.number && !playerDraft.name) continue;

            team.players.push(createPlayer(playerDraft));
          }

          d.teams.push(team);
          d.activeTeamId = team.id;
          return d;
        });

      } catch (e) {
        alert("Import failed: invalid JSON file.");
      } finally {
        // allow importing same file twice
        if (importRef.current) importRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }


  const activeTeam = data.teams.find((t) => t.id === data.activeTeamId) || null;

  const sortedPlayers = useMemo(() => {
    if (!activeTeam) return [];
    const q = search.trim().toLowerCase();
    return [...activeTeam.players]
      .filter((p) => {
        if (!q) return true;
        return (
          String(p.number).includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.preferredPosition.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const pa = positionSortKey(a.preferredPosition);
        const pb = positionSortKey(b.preferredPosition);
        if (pa !== pb) return pa - pb;
        return a.number - b.number;
      });
  }, [activeTeam, search]);

  const [draft, setDraft] = useState({
    number: "",
    name: "",
    preferredPosition: "Centre",
    leadership: "",
    stick: "",
    canPlay: [],
    notes: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  function updateData(updater) {
    setData((prev) => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  function createNewTeam() {
    const name = teamName.trim();
    if (!name) return;
    updateData((d) => {
      const t = createTeam(name);
      d.teams.push(t);
      d.activeTeamId = t.id;
      return d;
    });
    setTeamName("");
  }

  function deleteTeam(id) {
    updateData((d) => {
      d.teams = d.teams.filter((t) => t.id !== id);
      if (d.activeTeamId === id) d.activeTeamId = d.teams[0]?.id ?? null;
      return d;
    });
  }

  function startEditPlayer(p) {
    setEditingId(p.id);
    setDraft({
      number: String(p.number),
      name: p.name,
      preferredPosition: p.preferredPosition,
      leadership: p.leadership || "",
      stick: p.stick || "",
      canPlay: p.canPlay || [],
      notes: p.notes || "",
    });
    setError("");
  }

  function resetDraft() {
    setEditingId(null);
    setDraft({
      number: "",
      name: "",
      preferredPosition: "Centre",
      leadership: "",
      stick: "",
      canPlay: [],
      notes: "",
    });
    setError("");
  }

  function savePlayer() {
    if (!activeTeam) return;
    const msg = validatePlayer(activeTeam, draft, editingId);
    if (msg) {
      setError(msg);
      return;
    }

    updateData((d) => {
      const team = d.teams.find((t) => t.id === d.activeTeamId);
      if (!team) return d;

      if (editingId) {
        const idx = team.players.findIndex((p) => p.id === editingId);
        if (idx >= 0) {
          const updated = { ...team.players[idx], ...createPlayer(draft), id: editingId };
          team.players[idx] = updated;
        }
      } else {
        team.players.push(createPlayer(draft));
      }
      return d;
    });

    resetDraft();
  }

  function deletePlayer(id) {
    updateData((d) => {
      const team = d.teams.find((t) => t.id === d.activeTeamId);
      if (!team) return d;
      team.players = team.players.filter((p) => p.id !== id);
      return d;
    });
  }

  function toggleCanPlay(code) {
    setDraft((prev) => {
      const has = prev.canPlay.includes(code);
      return {
        ...prev,
        canPlay: has ? prev.canPlay.filter((c) => c !== code) : [...prev.canPlay, code],
      };
    });
  }

  return (
    <div className="rostersLayout" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      {/* Teams */}
      <aside className="rostersSidebar" style={{ borderRight: "1px solid rgba(0,0,0,0.12)", paddingRight: 16 }}>

        <h3 style={{ marginTop: 0 }}>Teams</h3>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="New team name"
            style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
          />
          <button onClick={createNewTeam} style={{ padding: "8px 10px", borderRadius: 10 }}>
            Add
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {data.teams.length === 0 && <div style={{ opacity: 0.7 }}>No teams yet. Add one above.</div>}
          {data.teams.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: t.id === data.activeTeamId ? "rgba(255, 169, 99, 0.1)" : "transparent",
              }}
            >
              <button
                onClick={() => updateData((d) => ((d.activeTeamId = t.id), d))}
                style={{
                  flex: 1,
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: "var(--text)",       // ✅ key fix
                  font: "inherit",            // ✅ prevents odd button font
                  cursor: "pointer",
                }}
              >

                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{t.players.length} players</div>
              </button>
              <button onClick={() => deleteTeam(t.id)} title="Delete team">
                🗑️
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Players */}
      <section>
        <div className="rostersTopRow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Rosters</h2>

          <div className="rostersActionsRow" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {activeTeam ? (
              <>
                <button onClick={exportActiveTeam}>Export team</button>
                <button onClick={clickImport}>Import team</button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={(e) => importFromFile(e.target.files?.[0])}
                />
              </>
            ) : null}

            <input
              className="rostersSearch"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players…"
              style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)", width: 260 }}
            />
          </div>
        </div>


        {!activeTeam ? (
          <div style={{ marginTop: 14, opacity: 0.8 }}>Create a team on the left to start adding players.</div>
        ) : (
          <>
            <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}>
              <h3 style={{ marginTop: 0 }}>{editingId ? "Edit player" : "Add player"}</h3>

              {error && (
                <div style={{ marginBottom: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.2)" }}>
                  <b>Fix:</b> {error}
                </div>
              )}

              {/* NEW LAYOUT */}
              <div style={{ display: "grid", gap: 12 }}>
                {/* Row 1: Number + Name */}
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                  <input
                    value={draft.number}
                    onChange={(e) => setDraft((p) => ({ ...p, number: e.target.value }))}
                    placeholder="Number"
                    style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
                  />
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                    style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
                  />
                </div>

                {/* Row 2: Position + Leadership + Stick */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 170px", gap: 10 }}>
                  <select
                    value={draft.preferredPosition}
                    onChange={(e) => setDraft((p) => ({ ...p, preferredPosition: e.target.value }))}
                    style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
                  >
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draft.leadership}
                    onChange={(e) => setDraft((p) => ({ ...p, leadership: e.target.value }))}
                    style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
                  >
                    {LEADERSHIP.map((l) => (
                      <option key={l} value={l}>
                        {l === "" ? "Leadership: none" : l}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draft.stick}
                    onChange={(e) => setDraft((p) => ({ ...p, stick: e.target.value }))}
                    style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
                  >
                    {STICKS.map((s) => (
                      <option key={s} value={s}>
                        {s === "" ? "Stick: (not set)" : s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 3: Can play (full width) */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700, opacity: 0.85 }}>Can play:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    {CANPLAY.map((code) => (
                      <label key={code} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={draft.canPlay.includes(code)}
                          onChange={() => toggleCanPlay(code)}
                        />
                        {code}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Row 4: Notes (full width) */}
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes (optional)"
                  rows={3}
                  style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
                />

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={savePlayer} style={{ padding: "8px 12px", borderRadius: 10 }}>
                    {editingId ? "Save changes" : "Add player"}
                  </button>
                  {editingId && (
                    <button onClick={resetDraft} style={{ padding: "8px 12px", borderRadius: 10 }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>Players</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {sortedPlayers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 140px 70px 80px 1fr 90px",
                      gap: 10,
                      alignItems: "center",
                      padding: 10,
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.12)",
                      minWidth: 0, // ✅ helps shrinking inside grid
                    }}
                  >

                    <div style={{ fontWeight: 700 }}>#{p.number}</div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontWeight: 800,
                          fontSize: 12,
                          color: "white",
                          background: `var(--pos-${p.preferredPosition.toLowerCase()})`,
                        }}
                      >
                        {p.preferredPosition}
                      </span>
                    </div>

                    <div>{p.leadership || "—"}</div>
                    <div style={{ opacity: 0.9 }}>{p.stick || "—"}</div>
                    <div style={{ opacity: 0.85 }}>{(p.canPlay || []).length ? p.canPlay.join(", ") : "—"}</div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => startEditPlayer(p)}>Edit</button>
                      <button onClick={() => deletePlayer(p.id)}>Del</button>
                    </div>
                  </div>
                ))}

                {sortedPlayers.length === 0 && <div style={{ opacity: 0.7 }}>No players match your search.</div>}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
