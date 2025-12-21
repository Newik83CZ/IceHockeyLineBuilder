import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";

import { newId } from "../lib/model";
import html2canvas from "html2canvas";

const MAX_FORWARD_LINES = 4;
const MAX_DEF_PAIRS = 4;
const DEFAULT_PRINT_BG = "/print-default-bg.png"; // public/print-default-bg.png

/* ===================== UI: Draggable Player ===================== */

function DraggablePlayer({ id, label, sublabel, preferredPosition, isError = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const labelObj = (() => {
    if (label && typeof label === "object") {
      if ("firstName" in label || "lastName" in label || "number" in label) {
        return {
          mode: "parts",
          leadership: label.leadership || "",
          firstName: label.firstName || "",
          lastName: label.lastName || "",
          number: label.number ?? "",
        };
      }
      return {
        mode: "text",
        leadership: label.leadership || "",
        text: label.text || "",
      };
    }
    return { mode: "text", leadership: "", text: String(label ?? "") };
  })();

  const posVar =
    preferredPosition && typeof preferredPosition === "string"
      ? `var(--pos-${preferredPosition.toLowerCase()})`
      : "var(--border)";

  const rowRef = useRef(null);
  const badgeRef = useRef(null);

  const metaRef = useRef(null);
  const nameRef = useRef(null);
  const [nameSize, setNameSize] = useState(18);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 800px)").matches;

  const lastNameFixed =
    labelObj.lastName && labelObj.lastName.length <= 8 ? (isMobile ? 14 : 18) : null;

  useLayoutEffect(() => {
    const rowEl = rowRef.current;
    const nameEl = nameRef.current;
    if (!rowEl || !nameEl) return;

    const compute = () => {
      let size = 18;
      nameEl.style.fontSize = `${size}px`;

      const available = Math.max(0, rowEl.clientWidth);
      const MIN = 10;
      let guard = 0;

      while (size > MIN && nameEl.scrollWidth > available && guard < 60) {
        size -= 1;
        nameEl.style.fontSize = `${size}px`;
        guard += 1;
      }

      setNameSize(size);
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(rowEl);

    return () => ro.disconnect();
  }, [labelObj.firstName, labelObj.lastName, labelObj.number, labelObj.leadership]);

  const style = {
    width: "100%",
    minWidth: 0,
    height: 100,
    minHeight: 100,
    padding: "10px 10px",
    borderRadius: 20,
    border: isError ? `2px solid var(--errorBubble)` : `1px solid var(--primary)`,
    color: "var(--surface)",
    background: isError ? "var(--errorBubble)" : posVar,
    cursor: "grab",
    userSelect: "none",
    touchAction: "none",
    opacity: isDragging ? 0.6 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.12)" : "none",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: 4,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div
        ref={rowRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div
          ref={metaRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {labelObj.number !== "" && labelObj.number !== null ? (
            <span style={{ flexShrink: 0, fontSize: `22px`, fontWeight: 700, opacity: 1 }}>
              #{labelObj.number}
            </span>
          ) : null}

          {labelObj.leadership ? (
            <span
              ref={badgeRef}
              style={{
                fontSize: `16px`,
                fontWeight: 900,
                padding: "0px 5px",
                borderRadius: 14,
                color: "var(--leader, var(--accent))",
                borderRight: "2px solid var(--leader, var(--accent))",
                borderLeft: "2px solid var(--leader, var(--accent))",
                flexShrink: 0,
              }}
              title={labelObj.leadership === "C" ? "Captain" : "Alternate"}
            >
              {labelObj.leadership}
            </span>
          ) : null}
        </div>

        <div
          ref={nameRef}
          style={{
            minWidth: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            fontSize: nameSize,
            lineHeight: 1.15,
          }}
        >
          {labelObj.firstName ? (
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: `${nameSize * 0.95}px`,
                fontWeight: 700,
                opacity: 0.9,
              }}
            >
              {labelObj.firstName}
            </div>
          ) : null}

          {labelObj.lastName ? (
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: lastNameFixed ?? `${nameSize * 1.01}px`,
                fontWeight: 900,
                opacity: 0.95,
                lineHeight: 1.05,
              }}
            >
              {labelObj.lastName}
            </div>
          ) : null}
        </div>
      </div>

      {sublabel ? <div style={{ fontSize: 10, opacity: 0.75 }}>{sublabel}</div> : null}
    </div>
  );
}

/* ===================== UI: Droppable Slot ===================== */

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
        padding: "2px 2px",
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
      <div style={{ fontSize: 12, fontWeight: 900, color: titleColor }}>{title}</div>

      <div style={{ flex: 1, minWidth: 0, display: "grid", alignItems: "center" }}>
        {children}
        {!player ? <div style={{ fontSize: 12, opacity: 0.55 }}>Drop here</div> : null}
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

function BoardSection({ title, children }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function RowLabel({ children }) {
  return (
    <div className="rowLabel" style={{ fontWeight: 800, paddingTop: 8 }}>
      {children}
    </div>
  );
}

/* ===================== Slot renderer ===================== */

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
        <div style={{ color: "black" }}>{warningText}</div>
      </>
    );
  } else if (warningText) {
    sublabel = warningText;
  } else if (stick) {
    sublabel = stick;
  }

  let firstName = "";
  let lastName = "";
  if (player && typeof player.name === "string") {
    const parts = player.name.trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ");
  }

  return (
    <DroppableSlot id={id} title={title} player={player}>
      {player ? (
        <DraggablePlayer
          id={player.id}
          preferredPosition={player.preferredPosition}
          isError={warn}
          label={{
            leadership: player.leadership || "",
            firstName,
            lastName,
            number: player.number,
          }}
          sublabel={sublabel}
        />
      ) : null}
    </DroppableSlot>
  );
}

/* ===================== Lineup model helpers ===================== */

function createLineup(name = "New lineup") {
  return {
    id: newId(),
    name,
    forwardLines: 3,
    defencePairs: 2,
    backupGoalieEnabled: false,
    assignments: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function ensureAssignmentsShape(lineup) {
  if (!lineup.assignments || typeof lineup.assignments !== "object") lineup.assignments = {};
  return lineup;
}

function slotToPosCode(slotId) {
  if (slotId.startsWith("G_")) return "G";
  const parts = slotId.split("_");
  return parts[1] || "";
}

function canPlayMismatch(player, posCode) {
  const list = player?.canPlay || [];
  if (list.length === 0) return false;
  return !list.includes(posCode);
}

function stickLabel(player) {
  if (!player) return "";
  if (player.stick === "Left") return "LH";
  if (player.stick === "Right") return "RH";
  return "";
}

function slotIdsFor(lineup) {
  const slots = [];

  for (let i = 1; i <= lineup.forwardLines; i++) {
    slots.push(`F${i}_LW`, `F${i}_C`, `F${i}_RW`);
  }

  for (let i = 1; i <= lineup.defencePairs; i++) {
    slots.push(`D${i}_LD`, `D${i}_RD`);
  }

  slots.push("G_START");
  if (lineup.backupGoalieEnabled) slots.push("G_BACKUP");

  return slots;
}

function normalizeAssignments(lineup) {
  const allowed = new Set(slotIdsFor(lineup));
  const next = {};
  for (const key of allowed) next[key] = lineup.assignments?.[key] ?? null;
  lineup.assignments = next;
  return lineup;
}

function removeSlots(lineup, slotsToRemove) {
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

/* ===================== Main component ===================== */

export default function Lineups({ data, setData }) {
  const activeTeam = data.teams.find((t) => t.id === data.activeTeamId) || null;

  const isMobile =
    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const printingBlocked = isMobile;

  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewUrl, setExportPreviewUrl] = useState("");
  const [exportBusy, setExportBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 10 } })
  );

  function updateData(updater) {
    setData((prev) => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  useEffect(() => {
    if (!activeTeam) return;

    updateData((d) => {
      d.lineupsByTeam ??= {};

      const teamId = d.activeTeamId;
      const bucket = d.lineupsByTeam[teamId];

      if (bucket?.lineups?.length) return d;

      const legacyKey = `lineup_${teamId}`;
      const legacy = d[legacyKey];

      const first = createLineup("Lineup 1");
      ensureAssignmentsShape(first);

      if (legacy?.assignments) first.assignments = legacy.assignments;

      normalizeAssignments(first);

      d.lineupsByTeam[teamId] = {
        activeLineupId: first.id,
        lineups: [first],
      };

      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.activeTeamId]);

  const teamId = data.activeTeamId;
  const bucket = data.lineupsByTeam?.[teamId] || { activeLineupId: null, lineups: [] };
  const lineups = bucket.lineups || [];
  const activeLineup = lineups.find((l) => l.id === bucket.activeLineupId) || lineups[0] || null;

  const players = activeTeam?.players ?? [];
  const byId = useMemo(() => {
    const m = new Map();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const assignments = activeLineup?.assignments || {};
  const assignedIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean)),
    [assignments]
  );

  const available = useMemo(() => {
    return players.filter((p) => !assignedIds.has(p.id)).sort((a, b) => a.number - b.number);
  }, [players, assignedIds]);

  function saveActiveLineup(mutator) {
    updateData((d) => {
      const b = d.lineupsByTeam?.[d.activeTeamId];
      if (!b) return d;
      const idx = b.lineups.findIndex((x) => x.id === b.activeLineupId);
      if (idx < 0) return d;

      const lu = b.lineups[idx];
      mutator(lu);
      lu.updatedAt = Date.now();
      normalizeAssignments(lu);
      b.lineups[idx] = lu;
      return d;
    });
  }

  function setActiveLineupId(id) {
    updateData((d) => {
      d.lineupsByTeam ??= {};
      d.lineupsByTeam[d.activeTeamId] ??= { activeLineupId: null, lineups: [] };
      d.lineupsByTeam[d.activeTeamId].activeLineupId = id;
      return d;
    });
  }

  function createNewLineup() {
    const name = prompt("Lineup name?", `Lineup ${lineups.length + 1}`);
    if (!name) return;
    updateData((d) => {
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
    saveActiveLineup((lu) => {
      lu.name = name.trim();
    });
  }

  function duplicateLineup() {
    if (!activeLineup) return;
    const name = prompt("Name for duplicated lineup?", `${activeLineup.name} (copy)`);
    if (!name) return;

    updateData((d) => {
      const b = d.lineupsByTeam[d.activeTeamId];
      const src = b.lineups.find((x) => x.id === b.activeLineupId);
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

    updateData((d) => {
      const b = d.lineupsByTeam[d.activeTeamId];
      b.lineups = b.lineups.filter((x) => x.id !== b.activeLineupId);
      b.activeLineupId = b.lineups[0]?.id ?? null;

      if (!b.activeLineupId) {
        const lu = createLineup("Lineup 1");
        normalizeAssignments(lu);
        b.lineups = [lu];
        b.activeLineupId = lu.id;
      }
      return d;
    });
  }

  function clearAllAssignments() {
    if (!activeLineup) return;
    if (!confirm("Clear all assigned players for this lineup?")) return;
    saveActiveLineup((lu) => {
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

    if (target === "AVAILABLE") {
      if (!fromSlot) return;
      saveActiveLineup((lu) => {
        lu.assignments[fromSlot] = null;
      });
      return;
    }

    if (!activeLineup.assignments.hasOwnProperty(toSlot)) return;

    const targetPlayerId = activeLineup.assignments[toSlot];

    if (!fromSlot) {
      saveActiveLineup((lu) => {
        lu.assignments[toSlot] = draggedPlayerId;
      });
      return;
    }

    if (fromSlot === toSlot) return;

    saveActiveLineup((lu) => {
      const next = { ...lu.assignments };
      next[toSlot] = draggedPlayerId;
      next[fromSlot] = targetPlayerId || null;
      lu.assignments = next;
    });
  }

  function pickRandomFrom(list) {
    if (!list || list.length === 0) return null;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  function buildFillOrder(lineup) {
    const order = [];
    order.push("G_START");

    for (let i = 1; i <= lineup.defencePairs; i++) {
      order.push(`D${i}_LD`, `D${i}_RD`);
    }

    order.push("F1_LW", "F1_C", "F1_RW");

    for (let i = 2; i <= lineup.forwardLines; i++) {
      order.push(`F${i}_LW`, `F${i}_C`, `F${i}_RW`);
    }

    if (lineup.backupGoalieEnabled) order.push("G_BACKUP");
    return order;
  }

  function autoFillLines() {
    if (!activeLineup) return;

    const assigned = new Set(Object.values(activeLineup.assignments || {}).filter(Boolean));
    const pool = players.filter((p) => !assigned.has(p.id));

    if (pool.length === 0) {
      alert("No available players to assign.");
      return;
    }

    saveActiveLineup((lu) => {
      const order = buildFillOrder(lu);

      for (const slotId of order) {
        if (lu.assignments?.[slotId]) continue;

        const code = slotToPosCode(slotId);
        const canPlayMatches = pool.filter((p) => (p.canPlay || []).includes(code));

        const pickFrom = canPlayMatches.length ? canPlayMatches : pool;
        const chosen = pickRandomFrom(pickFrom);
        if (!chosen) break;

        lu.assignments[slotId] = chosen.id;

        const poolIdx = pool.findIndex((p) => p.id === chosen.id);
        if (poolIdx >= 0) pool.splice(poolIdx, 1);
        if (pool.length === 0) break;
      }

      normalizeAssignments(lu);
    });
  }

  function addForwardLine() {
    if (!activeLineup) return;
    if (activeLineup.forwardLines >= MAX_FORWARD_LINES) return;
    saveActiveLineup((lu) => {
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

    saveActiveLineup((lu) => {
      removeSlots(lu, slots);
      lu.forwardLines -= 1;
    });
  }

  function addDefPair() {
    if (!activeLineup) return;
    if (activeLineup.defencePairs >= MAX_DEF_PAIRS) return;
    saveActiveLineup((lu) => {
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

    saveActiveLineup((lu) => {
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

    saveActiveLineup((lu) => {
      if (lu.backupGoalieEnabled) {
        removeSlots(lu, ["G_BACKUP"]);
        lu.backupGoalieEnabled = false;
      } else {
        lu.backupGoalieEnabled = true;
      }
    });
  }

  /// PRINT HELPERS ///
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pillHtml(player) {
    if (!player) return `<div class="pill pill--empty"></div>`;

    const num = escapeHtml(player.number);
    const name = escapeHtml(player.name);
    const lead = (player.leadership || "").trim();

    return `
      <div class="pill">
        <div class="numCircle">#${num}</div>
        <div class="pillName">${name}</div>
        ${lead ? `<div class="leadCircle">${escapeHtml(lead)}</div>` : ``}
      </div>
    `;
  }

  // =========================
  // NEW: shared canvas renderer (keeps your export layout EXACTLY the same)
  // =========================
  async function renderExportCanvas({ scale = 2 } = {}) {
    if (!activeTeam || !activeLineup) return null;

    const activeTheme = data.themes?.find((t) => t.id === data.activeThemeId) || null;

    const teamC = activeTheme?.app?.printTeamColor ?? "#d32f2f";
    const labelsC = activeTheme?.app?.printText ?? activeTheme?.app?.text ?? "#111111";
    const lineupTitleC = activeTheme?.app?.printText ?? activeTheme?.app?.text ?? "#111111";
    const numberBackgroundC = activeTheme?.app?.printText ?? activeTheme?.app?.text ?? "#111111";
    const numberC = activeTheme?.app?.printCardText ?? activeTheme?.app?.surface ?? "#ffffff";
    const playerNameC = activeTheme?.app?.printCardText ?? activeTheme?.app?.surface ?? "#ffffff";
    const leadershipBackgroundC = activeTheme?.app?.printLeader ?? activeTheme?.app?.leader ?? "#ffd54a";

    const bgImg = String(activeTeam.printBackgroundImage || DEFAULT_PRINT_BG || "").replaceAll("'", "%27");

    const teamName = escapeHtml(activeTeam.name);
    const lineupName = escapeHtml(activeLineup.name);

    // === Fixed 4:5 export size ===
    const EXPORT_W = 1200;
    const EXPORT_H = Math.round((EXPORT_W * 5) / 4);

    const getPlayerForSlot = (slotId) => {
      const pid = activeLineup.assignments?.[slotId];
      return pid ? byId.get(pid) : null;
    };

    let forwards = "";
    for (let i = 1; i <= activeLineup.forwardLines; i++) {
      const lw = getPlayerForSlot(`F${i}_LW`);
      const c = getPlayerForSlot(`F${i}_C`);
      const rw = getPlayerForSlot(`F${i}_RW`);

      forwards += `
        <div class="pillRow pillRow--3">
          <div class="edgePad"></div>
          ${pillHtml(lw)}
          ${pillHtml(c)}
          ${pillHtml(rw)}
          <div class="edgePad"></div>
        </div>
      `;
    }

    let defence = "";
    for (let i = 1; i <= activeLineup.defencePairs; i++) {
      const ld = getPlayerForSlot(`D${i}_LD`);
      const rd = getPlayerForSlot(`D${i}_RD`);

      defence += `
        <div class="pillRow pillRow--2">
          <div class="edgePad"></div>
          ${pillHtml(ld)}
          ${pillHtml(rd)}
          <div class="edgePad"></div>
        </div>
      `;
    }

    const gs = getPlayerForSlot("G_START");
    const gb = activeLineup.backupGoalieEnabled ? getPlayerForSlot("G_BACKUP") : null;

    const goalies = `
      <div class="goaliesStack">
        <div class="pillRow pillRow--1">
          <div class="edgePad"></div>
          ${pillHtml(gs)}
          <div class="edgePad"></div>
        </div>
        ${
          activeLineup.backupGoalieEnabled
            ? `
              <div class="pillRow pillRow--1">
                <div class="edgePad"></div>
                ${pillHtml(gb)}
                <div class="edgePad"></div>
              </div>
            `
            : ""
        }
      </div>
    `;

    let host;
    try {
      host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-99999px";
      host.style.top = "0";
      host.style.width = `${EXPORT_W}px`;
      host.style.height = `${EXPORT_H}px`;
      host.style.background = "white";
      host.style.zIndex = "-1";
      document.body.appendChild(host);

      // IMPORTANT: this is your SAME export HTML/CSS (unchanged layout)
      host.innerHTML = `
        <style>
          * { box-sizing: border-box; }
          .wrap {
            position: relative;
            width: ${EXPORT_W}px;
            height: ${EXPORT_H}px;   /* ✅ fixed height */
            overflow: hidden;        /* ✅ crops anything outside 4:5 frame */
            background: white;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            color: ${labelsC};
          }

          .bg {
            position: absolute;
            inset: 0;
            ${bgImg ? `background-image: url('${bgImg}');` : ""}
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            opacity: 0.90;
            pointer-events: none;
          }
          :root{
            --pillW: 272px;
            --pillGap: 10px;
            --pillH: 50px;
            --circle: 50px;
          }
          .sheet {
            position: relative;
            z-index: 1;
            padding: 24px 24px;
          }
          .teamTitle {
            text-align: center;
            font-weight: 900;
            font-size: 56px;
            letter-spacing: 0.5px;
            color: ${teamC};
            margin: 0;
          }
          .lineupTitle {
            text-align: center;
            font-weight: 900;
            font-size: 28px;
            margin: 16px 0 30px;
            color: ${lineupTitleC};
          }
          .section { display: grid; gap: 14px; margin-top: 14px; }
          .pillRow {
            display: grid;
            gap: var(--pillGap);
            justify-self: center;
          }
          .pillRow--3 { grid-template-columns: 2px repeat(3, var(--pillW)) 2px; }
          .pillRow--2 { grid-template-columns: 2px repeat(2, var(--pillW)) 2px; }
          .pillRow--1 { grid-template-columns: 2px repeat(1, var(--pillW)) 2px; }
          .pill {
            position: relative;
            height: var(--pillH);
            width: var(--pillW);
            border-radius: 999px;
            background: ${teamC};
            display: flex;
            align-items: center;
            padding-left: var(--circle);
            padding-right: var(--circle);
            overflow: hidden;
          }
          .pill--empty { background: transparent; }
          .numCircle {
            position: absolute;
            left: 0px;
            width: var(--circle);
            height: var(--circle);
            border-radius: 999px;
            background: ${numberBackgroundC};
            color: ${numberC};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 20px;
          }
          .pillName {
            color: ${playerNameC};
            font-weight: 900;
            font-size: 17px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 10px 0 10px;
          }
          .edgePad { width: 50px; height: 1px; }
          .leadCircle {
            position: absolute;
            right: 0px;
            width: var(--circle);
            height: var(--circle);
            border-radius: 999px;
            background: ${leadershipBackgroundC};
            color: ${playerNameC};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 20px;
          }
          .goaliesStack { display: grid; gap: var(--pillGap); }
          .spacer { height: 123px; }
        </style>

        <div class="wrap" id="printSheet">
          ${bgImg ? `<div class="bg"></div>` : ""}
          <div class="sheet">
            <div class="spacer"></div>
            <h1 class="teamTitle">${teamName}</h1>
            <div class="lineupTitle">${lineupName}</div>

            <div class="spacer"></div>
            <div class="section">${forwards}</div>

            <div class="spacer"></div>
            <div class="section">${defence}</div>

            <div class="spacer"></div>
            <div class="section">${goalies}</div>
          </div>
        </div>
      `;

      const node = host.querySelector("#printSheet");
      if (!node) throw new Error("printSheet node not found");

      const canvas = await html2canvas(node, {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      return canvas;
    } finally {
      if (host) host.remove();
    }
  }

  // =========================
  // NEW: preview handler
  // =========================
  async function previewExportImage() {
    try {
      if (exportBusy) return;
      setExportBusy(true);
      setExportPreviewUrl("");
      setExportPreviewOpen(true);

      const canvas = await renderExportCanvas({ scale: 1 }); // faster preview
      if (!canvas) {
        setExportPreviewOpen(false);
        return;
      }
      setExportPreviewUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Preview export failed:", err);
      alert("Preview export failed. Open DevTools console to see the error.");
      setExportPreviewOpen(false);
    } finally {
      setExportBusy(false);
    }
  }

  // =========================
  // CHANGED: export uses the shared renderer (layout unchanged)
  // =========================
  async function exportLineupToImage() {
    try {
      if (!activeTeam || !activeLineup) return;
      if (exportBusy) return;

      setExportBusy(true);

      const canvas = await renderExportCanvas({ scale: 2 }); // same as your current export
      if (!canvas) return;

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${activeTeam.name} - ${activeLineup.name}.png`.replace(/[\\/:*?"<>|]/g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Export as image failed:", err);
      alert("Export as image failed. Open DevTools console to see the error.");
    } finally {
      setExportBusy(false);
    }
  }

  function printLineupToPDF() {
    if (!activeTeam || !activeLineup) return;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Please allow popups.");
      return;
    }

    const bgImg = String(activeTeam.printBackgroundImage || "").replaceAll("'", "%27");
    const activeTheme = data.themes?.find((t) => t.id === data.activeThemeId) || null;

    const teamC = activeTheme?.app?.printTeamColor ?? activeTheme?.app?.primary ?? "#d32f2f";
    const labelsC = activeTheme?.app?.printText ?? activeTheme?.app?.text ?? "#111111";
    const lineupTitleC = activeTheme?.app?.printText ?? activeTheme?.app?.text ?? "#111111";
    const numberBackgroundC = activeTheme?.app?.printText ?? activeTheme?.app?.text ?? "#111111";

    const text = labelsC;

    const numberC = activeTheme?.app?.printCardText ?? activeTheme?.app?.surface ?? "#ffffff";
    const playerNameC = activeTheme?.app?.printCardText ?? activeTheme?.app?.surface ?? "#ffffff";
    const leadershipBackgroundC = activeTheme?.app?.printLeader ?? activeTheme?.app?.accent ?? "#ffd54a";

    const teamName = escapeHtml(activeTeam.name);
    const lineupName = escapeHtml(activeLineup.name);

    const getPlayerForSlot = (slotId) => {
      const pid = activeLineup.assignments?.[slotId];
      return pid ? byId.get(pid) : null;
    };

    let forwards = "";
    for (let i = 1; i <= activeLineup.forwardLines; i++) {
      const lw = getPlayerForSlot(`F${i}_LW`);
      const c = getPlayerForSlot(`F${i}_C`);
      const rw = getPlayerForSlot(`F${i}_RW`);

      forwards += `
        <div class="pillRow pillRow--3">
          <div class="edgePad"></div>
          ${pillHtml(lw)}
          ${pillHtml(c)}
          ${pillHtml(rw)}
          <div class="edgePad"></div>
        </div>
      `;
    }

    let defence = "";
    for (let i = 1; i <= activeLineup.defencePairs; i++) {
      const ld = getPlayerForSlot(`D${i}_LD`);
      const rd = getPlayerForSlot(`D${i}_RD`);

      defence += `
        <div class="pillRow pillRow--2">
          <div class="edgePad"></div>
          ${pillHtml(ld)}
          ${pillHtml(rd)}
          <div class="edgePad"></div>
        </div>
      `;
    }

    const gs = getPlayerForSlot("G_START");
    const gb = activeLineup.backupGoalieEnabled ? getPlayerForSlot("G_BACKUP") : null;

    const goalies = `
      <div class="goaliesStack">
        <div class="pillRow pillRow--1">
          <div class="edgePad"></div>
          ${pillHtml(gs)}
          <div class="edgePad"></div>
        </div>
        ${
          activeLineup.backupGoalieEnabled
            ? `
              <div class="pillRow pillRow--1">
                ${pillHtml(gb)}
              </div>
            `
            : ""
        }
      </div>
    `;

    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${teamName} - ${lineupName}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4 portrait; margin: 18mm; }

            body {
              margin: 0;
              background: white;
              font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
              color: ${text};
            }

            .bg {
              position: fixed;
              inset: 0;
              z-index: 0;
              ${bgImg ? `background-image: url('${bgImg}');` : ""}
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              opacity: 0.90;
              pointer-events: none;
            }

            :root{
              --pillW: 272px;
              --pillGap: 10px;
              --pillH: 50px;
              --circle: 50px;
            }

            .sheet {
              position: relative;
              z-index: 1;
              padding: 24mm 24mm;
            }

            .teamTitle {
              text-align: center;
              font-weight: 900;
              font-size: 56px;
              letter-spacing: 0.5px;
              color: ${teamC};
              margin: 0;
            }

            .lineupTitle {
              text-align: center;
              font-weight: 900;
              font-size: 28px;
              margin: 16px 0 30px;
              color: ${lineupTitleC};
            }

            .section {
              display: grid;
              gap: 14px;
              margin-top: 14px;
            }

            .pillRow {
              display: grid;
              gap: var(--pillGap);
              justify-self: center;
            }

            .pillRow--3 { grid-template-columns: 2px repeat(3, var(--pillW)) 2px; }
            .pillRow--2 { grid-template-columns: 2px repeat(2, var(--pillW)) 2px; }
            .pillRow--1 { grid-template-columns: 2px repeat(1, var(--pillW)) 2px; }

            .pill {
              position: relative;
              height: var(--pillH);
              width: var(--pillW);
              border-radius: 999px;
              background: ${teamC};
              display: flex;
              align-items: center;
              padding-left: var(--circle);
              padding-right: var(--circle);
              overflow: hidden;
            }

            .pill--empty { background: transparent; }

            .numCircle {
              position: absolute;
              left: 0px;
              width: var(--circle);
              height: var(--circle);
              border-radius: 999px;
              background: ${numberBackgroundC};
              color: ${numberC};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 16px;
            }

            .pillName {
              color: ${playerNameC};
              font-weight: 900;
              font-size: 16px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              padding: 0 10px 0 10px;
            }

            .edgePad { width: 50px; height: 1px; }

            .leadCircle {
              position: absolute;
              right: 0px;
              width: var(--circle);
              height: var(--circle);
              border-radius: 999px;
              background: ${leadershipBackgroundC};
              color: ${playerNameC};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 16px;
            }

            .goaliesStack {
              display: grid;
              gap: var(--pillGap);
            }

            .spacer { height: 110px; }

            a { color: inherit; text-decoration: none; }
          </style>
        </head>
        <body>
          ${bgImg ? `<div class="bg"></div>` : ""}

          <div class="sheet">
            <div class="spacer"></div>
            <h1 class="teamTitle">${teamName}</h1>
            <div class="lineupTitle">${lineupName}</div>

            <div class="spacer"></div>
            <div class="section">
              ${forwards}
            </div>

            <div class="spacer"></div>

            <div class="section">
              ${defence}
            </div>

            <div class="spacer"></div>

            <div class="section">
              ${goalies}
            </div>

          </div>
        </body>
      </html>
    `);

    w.document.close();

    w.onload = () => {
      w.focus();
      w.print();
      w.close();
    };
  }

  if (!activeTeam) return <div>Please create/select a team in Rosters first.</div>;
  if (!activeLineup) return <div>Creating lineup…</div>;

  const forwardRows = [];
  for (let i = 1; i <= activeLineup.forwardLines; i++) {
    forwardRows.push(
      <div
        key={`F${i}`}
        className="lineRow"
        style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start" }}
      >
        <RowLabel>{`Line ${i}`}</RowLabel>
        <div className="forwardGrid" style={{ display: "grid", gridTemplateColumns: "170px 170px 170px", gap: 12 }}>
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
      <div
        key={`D${i}`}
        className="pairRow"
        style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start" }}
      >
        <RowLabel>{`Pair ${i}`}</RowLabel>
        <div className="defenceGrid" style={{ display: "grid", gridTemplateColumns: "170px 170px", gap: 12 }}>
          <Slot id={`D${i}_LD`} title="LD" assignments={activeLineup.assignments} byId={byId} />
          <Slot id={`D${i}_RD`} title="RD" assignments={activeLineup.assignments} byId={byId} />
        </div>
      </div>
    );
  }

  return (
    <div className="lineupsLayout" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      <div style={{ marginTop: 0, padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>
            <h2 style={{ margin: "0 0 10px", fontWeight: 900 }}>{activeTeam.name}</h2> Line-ups
          </div>

          <select
            value={bucket.activeLineupId || ""}
            onChange={(e) => setActiveLineupId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)" }}
          >
            {lineups.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <div className="lineupActions" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <button onClick={createNewLineup}>New</button>
            <button onClick={renameLineup}>Rename</button>
            <button onClick={duplicateLineup}>Duplicate</button>
            <button onClick={deleteLineup}>Delete</button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Structure</div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              Forward lines: <b>{activeLineup.forwardLines}</b>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
              <button style={{ padding: "4px 8px", borderRadius: 8 }} onClick={removeForwardLine} disabled={activeLineup.forwardLines <= 1}>
                -
              </button>
              <button style={{ padding: "4px 7px", borderRadius: 8 }} onClick={addForwardLine} disabled={activeLineup.forwardLines >= MAX_FORWARD_LINES}>
                +
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              Defence pairs: <b>{activeLineup.defencePairs}</b>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
              <button style={{ padding: "4px 8px", borderRadius: 8 }} onClick={removeDefPair} disabled={activeLineup.defencePairs <= 1}>
                -
              </button>
              <button style={{ padding: "4px 7px", borderRadius: 8 }} onClick={addDefPair} disabled={activeLineup.defencePairs >= MAX_DEF_PAIRS}>
                +
              </button>
            </div>
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={!!activeLineup.backupGoalieEnabled} onChange={toggleBackupGoalie} />
            Backup goalie enabled
          </label>

          <div className="lineupActions" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            <button onClick={autoFillLines}>Auto-fill lines</button>
            <button onClick={clearAllAssignments}>Clear all assignments</button>
            <button onClick={previewExportImage} disabled={exportBusy}>Preview export</button>
            <button onClick={exportLineupToImage} disabled={exportBusy}>Export lines (PNG)</button>
            {/*
            <div style={{ display: "grid", gap: 6 }}>
              <button onClick={printLineupToPDF} disabled={printingBlocked}>
                Print current lines
              </button>
            </div>
            */}
          </div>
          {/*
          {printingBlocked ? (
            <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.2, textAlign: "right" }}>
              ⚠️ Printing isn’t supported on mobile. Use a desktop browser.
            </div>
          ) : null}
          */}
        </div>
      </div>

      <div className="lineupsLayout" style={{ display: "grid", gridTemplateColumns: "310px 1fr", gap: 16 }}>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="lineupsLeft" style={{ display: "grid", gap: 8 }}>
            <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }}>
              <AvailableDropZone>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Available Players</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {available.map((p) => {
                    const parts = String(p.name || "").trim().split(/\s+/).filter(Boolean);
                    const firstName = parts[0] || "";
                    const lastName = parts.slice(1).join(" ");

                    return (
                      <DraggablePlayer
                        key={p.id}
                        id={p.id}
                        preferredPosition={p.preferredPosition}
                        label={{
                          number: p.number,
                          leadership: p.leadership || "",
                          firstName,
                          lastName,
                        }}
                        sublabel={(p.canPlay || []).length ? `Can play: ${p.canPlay.join(", ")}` : ""}
                      />
                    );
                  })}

                  {available.length === 0 && <div style={{ fontSize: 12, opacity: 0.65 }}>No available players (everyone assigned).</div>}
                </div>
              </AvailableDropZone>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <BoardSection title="Forward Lines">{forwardRows}</BoardSection>
            <BoardSection title="Defence Pairs">{defRows}</BoardSection>

            <BoardSection title="Goalies">
              <div className="goalieRow">
                <RowLabel>.</RowLabel>

                <div className="goalieGrid">
                  <Slot id="G_START" title="Starter (G)" assignments={activeLineup.assignments} byId={byId} />

                  {activeLineup.backupGoalieEnabled ? (
                    <Slot id="G_BACKUP" title="Backup (G)" assignments={activeLineup.assignments} byId={byId} />
                  ) : null}
                </div>
              </div>
            </BoardSection>
          </div>
        </DndContext>
      </div>

      {/* ===================== Preview Modal ===================== */}
      {exportPreviewOpen ? (
        <div
          onClick={() => setExportPreviewOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 95vw)",
              background: "var(--surface)",
              borderRadius: 16,
              border: "1px solid var(--border)",
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Export Preview (4:5)</div>
              <button onClick={() => setExportPreviewOpen(false)}>Close</button>
            </div>

            {exportPreviewUrl ? (
              <img
                src={exportPreviewUrl}
                alt="Export Preview"
                style={{
                  width: "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "contain",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              />
            ) : (
              <div style={{ padding: 20, opacity: 0.8 }}>Generating preview…</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={exportLineupToImage}
                disabled={exportBusy}
              >
                Download PNG
              </button>
              <button onClick={() => setExportPreviewOpen(false)}>Back</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
