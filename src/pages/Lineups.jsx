import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useMemo, useState } from "react";

function DraggablePlayer({ id, label, sublabel }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "white",
    cursor: "grab",
    opacity: isDragging ? 0.6 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      {sublabel ? <div style={{ fontSize: 12, opacity: 0.75 }}>{sublabel}</div> : null}
    </div>
  );
}

function DroppableSlot({ id, title, player, children }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: 10,
        borderRadius: 14,
        border: "1px dashed rgba(0,0,0,0.25)",
        background: isOver ? "rgba(0,0,0,0.06)" : "transparent",
        minHeight: 62,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }}>{title}</div>
      {children}
      {!player ? <div style={{ fontSize: 12, opacity: 0.55 }}>Drop here</div> : null}
    </div>
  );
}

const DEFAULT_ASSIGNMENTS = () => ({
  F1_LW: null, F1_C: null, F1_RW: null,
  F2_LW: null, F2_C: null, F2_RW: null,
  D1_LD: null, D1_RD: null,
  D2_LD: null, D2_RD: null,
  G_START: null, G_BACKUP: null,
});

export default function Lineups({ data, setData }) {
  const teams = data.teams;
  const activeTeam = teams.find(t => t.id === data.activeTeamId) || null;

  // For MVP: one lineup per team stored in-memory in appData.
  // We'll upgrade to multiple named lineups after this works.
  const lineupKey = `lineup_${data.activeTeamId || "none"}`;

  const lineup = data[lineupKey] || { assignments: DEFAULT_ASSIGNMENTS() };
  const assignments = lineup.assignments;

  const players = activeTeam?.players ?? [];

  const byId = useMemo(() => {
    const m = new Map();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const assignedIds = useMemo(() => {
    return new Set(Object.values(assignments).filter(Boolean));
  }, [assignments]);

  const available = useMemo(() => {
    return players
      .filter(p => !assignedIds.has(p.id))
      .sort((a, b) => a.number - b.number);
  }, [players, assignedIds]);

  function updateData(updater) {
    setData(prev => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  function setAssignments(nextAssignments) {
    updateData(d => {
      d[lineupKey] = { assignments: nextAssignments };
      return d;
    });
  }

  function findSlotHoldingPlayer(playerId) {
    for (const [slotId, pid] of Object.entries(assignments)) {
      if (pid === playerId) return slotId;
    }
    return null;
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const draggedPlayerId = active.id;
    const target = over.id; // slotId or "AVAILABLE"

    const fromSlot = findSlotHoldingPlayer(draggedPlayerId);
    const toSlot = target === "AVAILABLE" ? null : target;

    // Dropping onto Available means unassign
    if (target === "AVAILABLE") {
      if (!fromSlot) return;
      const next = { ...assignments, [fromSlot]: null };
      setAssignments(next);
      return;
    }

    // If target slot is invalid
    if (!assignments.hasOwnProperty(toSlot)) return;

    const targetPlayerId = assignments[toSlot];

    // Dragged from available into slot
    if (!fromSlot) {
      // empty target
      if (!targetPlayerId) {
        setAssignments({ ...assignments, [toSlot]: draggedPlayerId });
      } else {
        // occupied: swap means displaced goes back to available (unassigned)
        setAssignments({ ...assignments, [toSlot]: draggedPlayerId });
      }
      return;
    }

    // Dragged from a slot to another slot
    if (fromSlot === toSlot) return;

    // Swap
    const next = { ...assignments };
    next[toSlot] = draggedPlayerId;
    next[fromSlot] = targetPlayerId || null;
    setAssignments(next);
  }

  if (!activeTeam) {
    return <div>Please create/select a team in Rosters first.</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
      <DndContext onDragEnd={handleDragEnd}>
        {/* Available */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Line-ups</h2>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{activeTeam.name}</div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          >
            <AvailableDropZone>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Available Players</div>
              <div style={{ display: "grid", gap: 8 }}>
                {available.map(p => (
                  <DraggablePlayer
                    key={p.id}
                    id={p.id}
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

        {/* Board */}
        <div style={{ display: "grid", gap: 12 }}>
          <BoardSection title="Forward Lines">
            <ThreeSlotRow
              label="Line 1"
              slots={[
                { id: "F1_LW", title: "LW" },
                { id: "F1_C", title: "C" },
                { id: "F1_RW", title: "RW" },
              ]}
              assignments={assignments}
              byId={byId}
            />
            <ThreeSlotRow
              label="Line 2"
              slots={[
                { id: "F2_LW", title: "LW" },
                { id: "F2_C", title: "C" },
                { id: "F2_RW", title: "RW" },
              ]}
              assignments={assignments}
              byId={byId}
            />
          </BoardSection>

          <BoardSection title="Defence Pairs">
            <TwoSlotRow
              label="Pair 1"
              slots={[
                { id: "D1_LD", title: "LD" },
                { id: "D1_RD", title: "RD" },
              ]}
              assignments={assignments}
              byId={byId}
            />
            <TwoSlotRow
              label="Pair 2"
              slots={[
                { id: "D2_LD", title: "LD" },
                { id: "D2_RD", title: "RD" },
              ]}
              assignments={assignments}
              byId={byId}
            />
          </BoardSection>

          <BoardSection title="Goalies">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Slot id="G_START" title="Starter (G)" assignments={assignments} byId={byId} />
              <Slot id="G_BACKUP" title="Backup (G)" assignments={assignments} byId={byId} />
            </div>
          </BoardSection>
        </div>
      </DndContext>
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
      }}
    >
      {children}
    </div>
  );
}

function BoardSection({ title, children }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function ThreeSlotRow({ label, slots, assignments, byId }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start" }}>
      <div style={{ fontWeight: 800, paddingTop: 8 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {slots.map(s => (
          <Slot key={s.id} id={s.id} title={s.title} assignments={assignments} byId={byId} />
        ))}
      </div>
    </div>
  );
}

function TwoSlotRow({ label, slots, assignments, byId }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start" }}>
      <div style={{ fontWeight: 800, paddingTop: 8 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {slots.map(s => (
          <Slot key={s.id} id={s.id} title={s.title} assignments={assignments} byId={byId} />
        ))}
      </div>
    </div>
  );
}

function Slot({ id, title, assignments, byId }) {
  const playerId = assignments[id];
  const player = playerId ? byId.get(playerId) : null;

  return (
    <DroppableSlot id={id} title={title} player={player}>
      {player ? (
        <DraggablePlayer
          id={player.id}
          label={`#${player.number} ${player.name}${player.leadership ? ` (${player.leadership})` : ""}`}
          sublabel={`Assigned: ${title}`}
        />
      ) : null}
    </DroppableSlot>
  );
}
