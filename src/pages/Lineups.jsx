import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";

import { useEffect, useMemo } from "react";
import { newId } from "../lib/model";

/* ===================== CONSTANTS ===================== */

const MAX_FORWARD_LINES = 4;
const MAX_DEF_PAIRS = 4;

/* ===================== DRAGGABLE PLAYER ===================== */

function DraggablePlayer({ id, label, sublabel, preferredPosition }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const posVar =
    preferredPosition && typeof preferredPosition === "string"
      ? `var(--pos-${preferredPosition.toLowerCase()})`
      : "var(--border)";

  const style = {
    width: "100%",
    minWidth: 0,
    minHeight: 84,
    padding: "8px 12px",
    borderRadius: 20,
    border: `1px solid ${posVar}`,
    background: "var(--surface)",
    cursor: "grab",
    userSelect: "none",
    touchAction: "none",
    opacity: isDragging ? 0.6 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.12)" : "none",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div
        className="playerLabel"
        style={{
          fontWeight: 700,
          fontSize: 13,
          lineHeight: 1.15,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          lineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>

      {sublabel && <div style={{ fontSize: 12, opacity: 0.75 }}>{sublabel}</div>}
    </div>
  );
}

/* ===================== DROP ZONES ===================== */

function DroppableSlot({ id, title, player, children }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const titleColor =
    title.includes("G")
      ? "var(--pos-goalie)"
      : title === "LD" || title === "RD"
      ? "var(--pos-defender)"
      : title === "C"
      ? "var(--pos-centre)"
      : title === "LW" || title === "RW"
      ? "var(--pos-wing)"
      : "var(--text)";

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: 12,
        borderRadius: 16,
        border: "1px dashed var(--border)",
        background: isOver ? "rgba(0,0,0,0.06)" : "var(--surface)",
        minHeight: 108,
        minWidth: 0,
        touchAction: "none",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: titleColor }}>
        {title}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {player ? (
          <div style={{ width: "100%", minWidth: 0 }}>{children}</div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.55 }}>Drop here</div>
        )}
      </div>
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

/* ===================== UI HELPERS ===================== */

function BoardSection({ title, children }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function RowLabel({ children }) {
  return <div className="rowLabel" style={{ fontWeight: 800 }}>{children}</div>;
}

/* ===================== MODEL HELPERS ===================== */

function createLineup(name = "New lineup") {
  return {
    id: newId(),
    name,
    forwardLines: 2,
    defencePairs: 2,
    backupGoalieEnabled: true,
    assignments: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function slotToPosCode(slotId) {
  if (slotId.startsWith("G_")) return "G";
  return slotId.split("_")[1] || "";
}

function canPlayMismatch(player, posCode) {
  const list = player?.canPlay || [];
  return list.length > 0 && !list.includes(posCode);
}

function stickLabel(player) {
  if (player?.stick === "Left") return "Stick: Left";
  if (player?.stick === "Right") return "Stick: Right";
  return "";
}

/* ===================== MAIN COMPONENT ===================== */

export default function Lineups({ data, setData }) {
  const activeTeam = data.teams.find(t => t.id === data.activeTeamId) || null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 10 } })
  );

  function updateData(updater) {
    setData(prev => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  /* ---- Migration ---- */
  useEffect(() => {
    if (!activeTeam) return;

    updateData(d => {
      d.lineupsByTeam ??= {};
      const teamId = d.activeTeamId;

      if (d.lineupsByTeam[teamId]?.lineups?.length) return d;

      const first = createLineup("Lineup 1");
      d.lineupsByTeam[teamId] = {
        activeLineupId: first.id,
        lineups: [first],
      };
      return d;
    });
  }, [data.activeTeamId]);

  const bucket = data.lineupsByTeam?.[data.activeTeamId];
  const activeLineup =
    bucket?.lineups.find(l => l.id === bucket.activeLineupId) ||
    bucket?.lineups[0] ||
    null;

  const players = activeTeam?.players ?? [];
  const byId = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const assignments = activeLineup?.assignments || {};
  const assignedIds = new Set(Object.values(assignments).filter(Boolean));

  const available = players
    .filter(p => !assignedIds.has(p.id))
    .sort((a, b) => a.number - b.number);

  function saveActiveLineup(mutator) {
    updateData(d => {
      const b = d.lineupsByTeam[d.activeTeamId];
      const lu = b.lineups.find(x => x.id === b.activeLineupId);
      mutator(lu);
      lu.updatedAt = Date.now();
      return d;
    });
  }

  function handleDragEnd({ active, over }) {
    if (!activeLineup || !over) return;

    const fromSlot = Object.entries(assignments).find(([, v]) => v === active.id)?.[0];
    const toSlot = over.id === "AVAILABLE" ? null : over.id;

    saveActiveLineup(lu => {
      if (fromSlot) lu.assignments[fromSlot] = null;
      if (toSlot) lu.assignments[toSlot] = active.id;
    });
  }

  if (!activeTeam) return <div>Please create/select a team in Rosters first.</div>;
  if (!activeLineup) return <div>Creating lineup…</div>;

  /* ===================== RENDER ===================== */

  return (
    <div className="lineupsLayout" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* LEFT */}
        <div className="lineupsLeft" style={{ display: "grid", gap: 12 }}>
          <h2>Line-ups</h2>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Available Players</div>
            <AvailableDropZone>
              <div style={{ display: "grid", gap: 10 }}>
                {available.map(p => (
                  <DraggablePlayer
                    key={p.id}
                    id={p.id}
                    preferredPosition={p.preferredPosition}
                    label={`#${p.number} ${p.name}`}
                    sublabel={p.canPlay?.length ? `Can play: ${p.canPlay.join(", ")}` : ""}
                  />
                ))}
              </div>
            </AvailableDropZone>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 12 }}>
          <BoardSection title="Forward Lines">
            {[1, 2].map(i => (
              <div key={i} className="lineRow" style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
                <RowLabel>{`Line ${i}`}</RowLabel>
                <div className="forwardGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {["LW", "C", "RW"].map(p => (
                    <DroppableSlot key={p} id={`F${i}_${p}`} title={p} />
                  ))}
                </div>
              </div>
            ))}
          </BoardSection>
        </div>
      </DndContext>
    </div>
  );
}
