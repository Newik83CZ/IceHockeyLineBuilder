import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";

import { useEffect, useMemo, useState } from "react";
import { newId } from "../lib/model";

const MAX_FORWARD_LINES = 4;
const MAX_DEF_PAIRS = 4;

function DraggablePlayer({ id, label, sublabel, preferredPosition }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  
    const posVar =
      preferredPosition && typeof preferredPosition === "string"
        ? `var(--pos-${preferredPosition.toLowerCase()})`
        : "var(--border)";
  
    const style = {
        width: 130,
        minHeight: 72,
        padding: "10px 12px",
        borderRadius: 20,
        border: `1px solid ${posVar}`,
        background: "var(--background)",
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        opacity: isDragging ? 0.6 : 1,
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.12)" : "none",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        touchAction: "none",
    };
  
    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: posVar,
          }}
        />
        <div style={{ paddingLeft: 10, display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{label}</div>
          {sublabel ? <div style={{ fontSize: 12, opacity: 0.75 }}>{sublabel}</div> : null}
        </div>
      </div>
    );
  }
  

  function DroppableSlot({ id, title, player, children }) {
    const { isOver, setNodeRef } = useDroppable({ id });
  
    // Optional: tint the slot title by role group
    const titleColor =
      title.includes("G") ? "var(--pos-goalie)" :
      (title === "LD" || title === "RD") ? "var(--pos-defender)" :
      (title === "C") ? "var(--pos-centre)" :
      (title === "LW" || title === "RW") ? "var(--pos-wing)" :
      "var(--text)";
  
    return (
      <div
        ref={setNodeRef}
        style={{
          padding: 10,
          borderRadius: 14,
          border: "1px dashed var(--border)",
          background: isOver ? "rgba(0,0,0,0.06)" : "transparent",
          minHeight: 62,
          display: "grid",
          gap: 8,
          touchAction: "none",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9, color: titleColor }}>
          {title}
        </div>
  
        {children}
  
        {!player ? <div style={{ fontSize: 12, opacity: 0.55 }}>Drop here</div> : null}
      </div>
    );
  }
  

function AvailableDropZone({ children }) {
  const { isOver, setNodeRef } = useDroppable({ id: "AVAILABLE" });
  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 14,
        padding: 10,
        background: isOver ? "rgba(0,0,0,0.06)" : "transparent",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}

function BoardSection({ title, children }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)", // ✅ key
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function RowLabel({ children }) {
  return <div style={{ fontWeight: 800, paddingTop: 8 }}>{children}</div>;
}

function Slot({ id, title, assignments, byId }) {
    const playerId = assignments[id];
    const player = playerId ? byId.get(playerId) : null;
  
    const posCode = slotToPosCode(id);
    const warn = player ? canPlayMismatch(player, posCode) : false;
  
    const stick = player ? stickLabel(player) : "";
    const warningText = warn ? "⚠️ Not familiar with this position" : "";
  
    let sublabel = "";
    if (warningText && stick) {
      sublabel = (
        <>
          <div>{warningText}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{stick}</div>
        </>
      );
    } else if (warningText) {
      sublabel = warningText;
    } else if (stick) {
      sublabel = stick;
    }
  
    return (
      <DroppableSlot id={id} title={title} player={player}>
        {player ? (
          <DraggablePlayer
            id={player.id}
            preferredPosition={player.preferredPosition}
            label={`#${player.number} ${player.name}${player.leadership ? ` (${player.leadership})` : ""}`}
            sublabel={sublabel}
          />
        ) : null}
      </DroppableSlot>
    );
  }

// ---------- Lineup model helpers ----------
function createLineup(name = "New lineup") {
  return {
    id: newId(),
    name,
    forwardLines: 2,         // default 2 lines
    defencePairs: 2,         // default 2 pairs
    backupGoalieEnabled: true,
    assignments: {},         // slotId -> playerId | null
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function ensureAssignmentsShape(lineup) {
  if (!lineup.assignments || typeof lineup.assignments !== "object") lineup.assignments = {};
  return lineup;
}

function slotToPosCode(slotId) {
    // Examples: F2_LW -> LW, D1_RD -> RD, G_START -> G
    if (slotId.startsWith("G_")) return "G";
    const parts = slotId.split("_");
    return parts[1] || "";
  }
  
  function posTitle(posCode) {
    // For nice display if you want later
    return posCode || "";
  }
  
  function canPlayMismatch(player, posCode) {
    // If canPlay is empty, we don't warn (optional fields)
    if (!player) return false;
    const list = player.canPlay || [];
    if (list.length === 0) return false;
    return !list.includes(posCode);
  }  

  function stickLabel(player) {
    if (!player) return "";
    if (player.stick === "Left") return "Stick: Left";
    if (player.stick === "Right") return "Stick: Right";
    return ""; // ← hide label completely if not chosen
  }

function slotIdsFor(lineup) {
  const slots = [];

  // Forwards
  for (let i = 1; i <= lineup.forwardLines; i++) {
    slots.push(`F${i}_LW`, `F${i}_C`, `F${i}_RW`);
  }

  // Defence
  for (let i = 1; i <= lineup.defencePairs; i++) {
    slots.push(`D${i}_LD`, `D${i}_RD`);
  }

  // Goalies
  slots.push("G_START");
  if (lineup.backupGoalieEnabled) slots.push("G_BACKUP");

  return slots;
}

function normalizeAssignments(lineup) {
  // Keep only keys that exist for the current lineup structure.
  const allowed = new Set(slotIdsFor(lineup));
  const next = {};
  for (const key of allowed) next[key] = lineup.assignments?.[key] ?? null;
  lineup.assignments = next;
  return lineup;
}

function removeSlots(lineup, slotsToRemove) {
  // Unassign players from removed slots; keep everything else.
  const removeSet = new Set(slotsToRemove);
  const next = { ...lineup.assignments };
  for (const s of removeSet) {
    if (next[s] != null) next[s] = null;
    delete next[s];
  }
  lineup.assignments = next;
  return lineup;
}

function countAssignedInSlots(lineup, slots) {
  let c = 0;
  for (const s of slots) {
    if (lineup.assignments?.[s]) c++;
  }
  return c;
}

// ---------- Main component ----------
export default function Lineups({ data, setData }) {
  const activeTeam = data.teams.find(t => t.id === data.activeTeamId) || null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 10 } })
  );

  function autoBuildLines() {
    if (!activeLineup) return;

    const hasAssignments = Object.values(activeLineup.assignments || {}).some(Boolean);
    if (hasAssignments) {
      if (!confirm("This will overwrite current assignments. Continue?")) return;
    }

    saveActiveLineup(lu => {
      autoAssignLineup(lu, players);
    });
  }


  function updateData(updater) {
    setData(prev => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  // ----- Migration from old MVP storage (lineup_<teamId>) to new structure -----
  useEffect(() => {
    if (!activeTeam) return;

    updateData(d => {
      d.lineupsByTeam ??= {};

      const teamId = d.activeTeamId;
      const bucket = d.lineupsByTeam[teamId];

      // If already set up, do nothing
      if (bucket?.lineups?.length) return d;

      const legacyKey = `lineup_${teamId}`;
      const legacy = d[legacyKey];

      const first = createLineup("Lineup 1");
      ensureAssignmentsShape(first);

      if (legacy?.assignments) {
        first.assignments = legacy.assignments;
      }

      normalizeAssignments(first);

      d.lineupsByTeam[teamId] = {
        activeLineupId: first.id,
        lineups: [first],
      };

      // keep legacy in place (harmless), or delete it if you prefer:
      // delete d[legacyKey];

      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.activeTeamId]);

  const teamId = data.activeTeamId;
  const bucket = data.lineupsByTeam?.[teamId] || { activeLineupId: null, lineups: [] };
  const lineups = bucket.lineups || [];
  const activeLineup = lineups.find(l => l.id === bucket.activeLineupId) || lineups[0] || null;

  const players = activeTeam?.players ?? [];
  const byId = useMemo(() => {
    const m = new Map();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const assignments = activeLineup?.assignments || {};
  const assignedIds = useMemo(() => new Set(Object.values(assignments).filter(Boolean)), [assignments]);

  const available = useMemo(() => {
    return players
      .filter(p => !assignedIds.has(p.id))
      .sort((a, b) => a.number - b.number);
  }, [players, assignedIds]);

  function saveActiveLineup(mutator) {
    updateData(d => {
      const b = d.lineupsByTeam?.[d.activeTeamId];
      if (!b) return d;
      const idx = b.lineups.findIndex(x => x.id === b.activeLineupId);
      if (idx < 0) return d;

      const lu = b.lineups[idx];
      mutator(lu);
      lu.updatedAt = Date.now();

      // Always keep assignments normalized after any structure change
      normalizeAssignments(lu);

      b.lineups[idx] = lu;
      return d;
    });
  }

  function setActiveLineupId(id) {
    updateData(d => {
      d.lineupsByTeam ??= {};
      d.lineupsByTeam[d.activeTeamId] ??= { activeLineupId: null, lineups: [] };
      d.lineupsByTeam[d.activeTeamId].activeLineupId = id;
      return d;
    });
  }

  function createNewLineup() {
    const name = prompt("Lineup name?", `Lineup ${lineups.length + 1}`);
    if (!name) return;
    updateData(d => {
      d.lineupsByTeam ??= {};
      d.lineupsByTeam[d.activeTeamId] ??= { activeLineupId: null, lineups: [] };
      const lu = createLineup(name.trim());
      normalizeAssignments(lu);
      d.lineupsByTeam[d.activeTeamId].lineups.push(lu);
      d.lineupsByTeam[d.activeTeamId].activeLineupId = lu.id;
      return d;
    });
  }

  function renameLineup() {
    if (!activeLineup) return;
    const name = prompt("New lineup name?", activeLineup.name);
    if (!name) return;
    saveActiveLineup(lu => {
      lu.name = name.trim();
    });
  }

  function duplicateLineup() {
    if (!activeLineup) return;
    const name = prompt("Name for duplicated lineup?", `${activeLineup.name} (copy)`);
    if (!name) return;

    updateData(d => {
      const b = d.lineupsByTeam[d.activeTeamId];
      const src = b.lineups.find(x => x.id === b.activeLineupId);
      if (!src) return d;

      const copy = {
        ...structuredClone(src),
        id: newId(),
        name: name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      b.lineups.push(copy);
      b.activeLineupId = copy.id;
      return d;
    });
  }

  function deleteLineup() {
    if (!activeLineup) return;
    if (!confirm(`Delete lineup "${activeLineup.name}"?`)) return;

    updateData(d => {
      const b = d.lineupsByTeam[d.activeTeamId];
      b.lineups = b.lineups.filter(x => x.id !== b.activeLineupId);
      b.activeLineupId = b.lineups[0]?.id ?? null;

      // Ensure at least one lineup exists
      if (!b.activeLineupId) {
        const lu = createLineup("Lineup 1");
        normalizeAssignments(lu);
        b.lineups = [lu];
        b.activeLineupId = lu.id;
      }
      return d;
    });
  }

  function autoAssignLineup(lineup, players) {
    const used = new Set();
    const next = {};

    function pick(filterFn) {
      const p = players.find(pl => !used.has(pl.id) && filterFn(pl));
      if (p) used.add(p.id);
      return p?.id || null;
    }

    // ---- Forwards ----
    for (let i = 1; i <= lineup.forwardLines; i++) {
      next[`F${i}_LW`] =
        pick(p => p.canPlay?.includes("LW")) ??
        pick(p => p.preferredPosition === "Wing");

      next[`F${i}_C`] =
        pick(p => p.canPlay?.includes("C")) ??
        pick(p => p.preferredPosition === "Centre");

      next[`F${i}_RW`] =
        pick(p => p.canPlay?.includes("RW")) ??
        pick(p => p.preferredPosition === "Wing");
    }

    // ---- Defence ----
    for (let i = 1; i <= lineup.defencePairs; i++) {
      next[`D${i}_LD`] =
        pick(p => p.canPlay?.includes("LD")) ??
        pick(p => p.preferredPosition === "Defender");

      next[`D${i}_RD`] =
        pick(p => p.canPlay?.includes("RD")) ??
        pick(p => p.preferredPosition === "Defender");
    }

    // ---- Goalies ----
    next["G_START"] =
      pick(p => p.preferredPosition === "Goalie");

    if (lineup.backupGoalieEnabled) {
      next["G_BACKUP"] =
        pick(p => p.preferredPosition === "Goalie");
    }

    lineup.assignments = next;
  }


  function clearAllAssignments() {
    if (!activeLineup) return;
    if (!confirm("Clear all assigned players for this lineup?")) return;
    saveActiveLineup(lu => {
      for (const k of Object.keys(lu.assignments)) lu.assignments[k] = null;
    });
  }

  function findSlotHoldingPlayer(playerId) {
    if (!activeLineup) return null;
    for (const [slotId, pid] of Object.entries(activeLineup.assignments)) {
      if (pid === playerId) return slotId;
    }
    return null;
  }

  function handleDragEnd(event) {
    if (!activeLineup) return;

    const { active, over } = event;
    if (!over) return;

    const draggedPlayerId = active.id;
    const target = over.id;

    const fromSlot = findSlotHoldingPlayer(draggedPlayerId);
    const toSlot = target === "AVAILABLE" ? null : target;

    // Drop onto Available means unassign
    if (target === "AVAILABLE") {
      if (!fromSlot) return;
      saveActiveLineup(lu => {
        lu.assignments[fromSlot] = null;
      });
      return;
    }

    // Validate target is a current slot
    if (!activeLineup.assignments.hasOwnProperty(toSlot)) return;

    const targetPlayerId = activeLineup.assignments[toSlot];

    // Dragged from available into slot
    if (!fromSlot) {
      saveActiveLineup(lu => {
        // If occupied, displaced goes back to available (unassigned)
        lu.assignments[toSlot] = draggedPlayerId;
      });
      return;
    }

    // Dragged from slot to same slot
    if (fromSlot === toSlot) return;

    // Swap slots
    saveActiveLineup(lu => {
      const next = { ...lu.assignments };
      next[toSlot] = draggedPlayerId;
      next[fromSlot] = targetPlayerId || null;
      lu.assignments = next;
    });
  }

  // ----- Structure controls -----
  function addForwardLine() {
    if (!activeLineup) return;
    if (activeLineup.forwardLines >= MAX_FORWARD_LINES) return;

    saveActiveLineup(lu => {
      lu.forwardLines += 1;
    });
  }

  function removeForwardLine() {
    if (!activeLineup) return;
    if (activeLineup.forwardLines <= 1) return;

    const n = activeLineup.forwardLines;
    const slots = [`F${n}_LW`, `F${n}_C`, `F${n}_RW`];
    const assignedCount = countAssignedInSlots(activeLineup, slots);

    if (assignedCount > 0) {
      if (!confirm(`Remove Forward Line ${n} and unassign ${assignedCount} player(s) from it?`)) return;
    }

    saveActiveLineup(lu => {
      removeSlots(lu, slots);
      lu.forwardLines -= 1;
    });
  }

  function addDefPair() {
    if (!activeLineup) return;
    if (activeLineup.defencePairs >= MAX_DEF_PAIRS) return;

    saveActiveLineup(lu => {
      lu.defencePairs += 1;
    });
  }

  function removeDefPair() {
    if (!activeLineup) return;
    if (activeLineup.defencePairs <= 1) return;

    const n = activeLineup.defencePairs;
    const slots = [`D${n}_LD`, `D${n}_RD`];
    const assignedCount = countAssignedInSlots(activeLineup, slots);

    if (assignedCount > 0) {
      if (!confirm(`Remove Defence Pair ${n} and unassign ${assignedCount} player(s) from it?`)) return;
    }

    saveActiveLineup(lu => {
      removeSlots(lu, slots);
      lu.defencePairs -= 1;
    });
  }

  function toggleBackupGoalie() {
    if (!activeLineup) return;

    const currentlyOn = !!activeLineup.backupGoalieEnabled;
    const assigned = activeLineup.assignments?.["G_BACKUP"] ? 1 : 0;

    if (currentlyOn && assigned) {
      if (!confirm("Disable Backup Goalie and unassign the current backup goalie?")) return;
    }

    saveActiveLineup(lu => {
      if (lu.backupGoalieEnabled) {
        removeSlots(lu, ["G_BACKUP"]);
        lu.backupGoalieEnabled = false;
      } else {
        lu.backupGoalieEnabled = true;
      }
    });
  }

  if (!activeTeam) return <div>Please create/select a team in Rosters first.</div>;
  if (!activeLineup) return <div>Creating lineup…</div>;

  const forwardRows = [];
  for (let i = 1; i <= activeLineup.forwardLines; i++) {
    forwardRows.push(
      <div key={`F${i}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start" }}>
        <RowLabel>{`Line ${i}`}</RowLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Slot id={`F${i}_LW`} title="LW" assignments={activeLineup.assignments} byId={byId} />
          <Slot id={`F${i}_C`} title="C" assignments={activeLineup.assignments} byId={byId} />
          <Slot id={`F${i}_RW`} title="RW" assignments={activeLineup.assignments} byId={byId} />
        </div>
      </div>
    );
  }

  const defRows = [];
  for (let i = 1; i <= activeLineup.defencePairs; i++) {
    defRows.push(
      <div key={`D${i}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start" }}>
        <RowLabel>{`Pair ${i}`}</RowLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Slot id={`D${i}_LD`} title="LD" assignments={activeLineup.assignments} byId={byId} />
          <Slot id={`D${i}_RD`} title="RD" assignments={activeLineup.assignments} byId={byId} />
        </div>
      </div>
    );
  }

  return (
    <div className="lineupsLayout" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* Left: Available + lineup controls */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "inline", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Line-ups</h2>
            <br />
            <h3 style={{ fontSize: 14, opacity: 0.7 }}>{activeTeam.name}</h3>
          </div>

          {/* Lineup selector + actions */}
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--surface)", // ✅ key
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 800 }}>Line-up</div>

              <select
                value={bucket.activeLineupId || ""}
                onChange={(e) => setActiveLineupId(e.target.value)}
                style={{ padding: 0, borderRadius: 12, border: "1px solid rgba(0,0,0,0.2)" }}
              >
                {lineups.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", maxHeight: "40px" }}>
                <button onClick={createNewLineup}>New</button>
                <button onClick={renameLineup}>Rename</button>
                <button onClick={duplicateLineup}>Duplicate</button>
                <button onClick={deleteLineup}>Delete</button>
              </div>
              <div> </div>
            </div>

            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 800 }}>Structure</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>Forward lines: <b>{activeLineup.forwardLines}</b></div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={removeForwardLine} disabled={activeLineup.forwardLines <= 1}>-</button>
                    <button onClick={addForwardLine} disabled={activeLineup.forwardLines >= MAX_FORWARD_LINES}>+</button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>Defence pairs: <b>{activeLineup.defencePairs}</b></div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={removeDefPair} disabled={activeLineup.defencePairs <= 1}>-</button>
                    <button onClick={addDefPair} disabled={activeLineup.defencePairs >= MAX_DEF_PAIRS}>+</button>
                  </div>
                </div>

                <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={!!activeLineup.backupGoalieEnabled}
                    onChange={toggleBackupGoalie}
                  />
                  Backup goalie enabled
                </label>

                <button onClick={autoBuildLines}>Auto-build lines</button>

                <button onClick={clearAllAssignments}>Clear all assignments</button>

              </div>
          </div>

          {/* Available players */}
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--surface)", // ✅ key
            }}
          >
            <AvailableDropZone>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Available Players</div>
              <div className="lineupsLeft" style={{ display: "grid", gap: 10 }}>

                {available.map(p => (
                  <DraggablePlayer
                    key={p.id}
                    id={p.id}
                    preferredPosition={p.preferredPosition}
                    label={`#${p.number} ${p.name}${p.leadership ? ` (${p.leadership})` : ""}`}
                    sublabel={(p.canPlay || []).length ? `Can play: ${p.canPlay.join(", ")}` : ""}
                  />
                ))}
                {available.length === 0 && (
                  <div style={{ fontSize: 12, opacity: 0.65 }}>No available players (everyone assigned).</div>
                )}
              </div>
            </AvailableDropZone>
          </div>
        </div>

        {/* Right: Board */}
        <div style={{ display: "grid", gap: 12 }}>
          <BoardSection title="Forward Lines">
            {forwardRows}
          </BoardSection>

          <BoardSection title="Defence Pairs">
            {defRows}
          </BoardSection>

          <BoardSection title="Goalies">
            <div style={{ display: "grid", gridTemplateColumns: activeLineup.backupGoalieEnabled ? "1fr 1fr" : "1fr", gap: 12 }}>
              <Slot id="G_START" title="Starter (G)" assignments={activeLineup.assignments} byId={byId} />
              {activeLineup.backupGoalieEnabled ? (
                <Slot id="G_BACKUP" title="Backup (G)" assignments={activeLineup.assignments} byId={byId} />
              ) : null}
            </div>
          </BoardSection>
        </div>
      </DndContext>
    </div>
  );
}
