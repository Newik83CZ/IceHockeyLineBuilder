import { useMemo, useRef, useState } from "react";
import {
  createPlayer,
  createTeam,
  createDefaultThemeTemplate,
  cloneThemeFromTemplate,
  getDefaultTheme,
  positionSortKey,
  validatePlayer,
} from "../lib/model";

const POSITIONS = ["Centre", "Wing", "Defender", "Goalie"];
const CANPLAY = ["LW", "C", "RW", "LD", "RD", "G"];
const STICKS = ["", "Left", "Right"];
const LEADERSHIP = ["", "C", "A"];

function normalizeOppName(name) {
  return String(name || "").trim();
}

function dedupeOpposition(list) {
  const out = [];
  const seen = new Set();
  for (const raw of list || []) {
    const n = normalizeOppName(raw);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function OppositionPanel({ activeTeam, updateData, iconBtn, oppImportRef, parseCSV }) {
  const opposition = Array.isArray(activeTeam.opposition) ? activeTeam.opposition : [];

  function addSingle() {
    const name = prompt("Opposition team name?");
    const n = normalizeOppName(name);
    if (!n) return;

    updateData((d) => {
      const t = d.teams.find((x) => x.id === d.activeTeamId);
      if (!t) return d;
      t.opposition = dedupeOpposition([...(t.opposition || []), n]);
      return d;
    });
  }

  function editAt(idx) {
    const current = opposition[idx];
    const name = prompt("Edit opposition team name:", current);
    const n = normalizeOppName(name);
    if (!n) return;

    updateData((d) => {
      const t = d.teams.find((x) => x.id === d.activeTeamId);
      if (!t) return d;
      const next = [...(t.opposition || [])];
      next[idx] = n;
      t.opposition = dedupeOpposition(next);
      return d;
    });
  }

  function removeAt(idx) {
    const current = opposition[idx];
    if (!confirm(`Delete opposition team "${current}"?`)) return;
    updateData((d) => {
      const t = d.teams.find((x) => x.id === d.activeTeamId);
      if (!t) return d;
      const next = [...(t.opposition || [])];
      next.splice(idx, 1);
      t.opposition = next;
      return d;
    });
  }

  function clickImportOpp() {
    oppImportRef.current?.click();
  }

  async function onImportFile(file) {
    if (!file) return;
    if (!String(file.name || "").toLowerCase().endsWith(".csv")) {
      alert("Please select a .csv file.");
      if (oppImportRef.current) oppImportRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result || ""));
        const nonEmpty = rows
          .map((r) => (r || []).map((c) => String(c ?? "").trim()))
          .filter((r) => r.some((c) => c !== ""));

        if (nonEmpty.length === 0) {
          alert("CSV is empty.");
          return;
        }

        // Header row: league name in first cell
        const leagueName = normalizeOppName(nonEmpty[0]?.[0] || "");

        // Remaining rows: opposition names in first cell
        const importedOpp = nonEmpty
          .slice(1)
          .map((r) => normalizeOppName(r[0]))
          .filter(Boolean);

        updateData((d) => {
          const t = d.teams.find((x) => x.id === d.activeTeamId);
          if (!t) return d;
          if (leagueName) t.leagueName = leagueName;
          t.opposition = dedupeOpposition([...(t.opposition || []), ...importedOpp]);
          return d;
        });

        alert(
          `Opposition imported.\n\nLeague: ${leagueName || "(none)"}\nAdded: ${importedOpp.length}`
        );
      } catch (e) {
        alert("Import failed: invalid CSV file.");
      } finally {
        if (oppImportRef.current) oppImportRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Opposition</div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.3 }}>
          Manage opponent teams for this team. CSV import header is the league name.
        </div>

        {activeTeam.leagueName ? (
          <div style={{ fontSize: 12 }}>
            League: <b>{activeTeam.leagueName}</b>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 6 }}>
          {opposition.length ? (
            opposition.map((name, idx) => (
              <div
                key={`${name}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "var(--surface)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {name}
                </div>
                <button
                  onClick={() => editAt(idx)}
                  title="Edit"
                  aria-label="Edit opposition"
                  style={iconBtn}
                >
                  ✏️
                </button>
                <button
                  onClick={() => removeAt(idx)}
                  title="Delete"
                  aria-label="Delete opposition"
                  style={iconBtn}
                >
                  🗑️
                </button>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>No opposition teams yet.</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={addSingle}>+ Add</button>
          <button onClick={clickImportOpp}>Import (CSV)</button>
          <input
            ref={oppImportRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}

export default function Rosters({ data, setData }) {
  const [teamName, setTeamName] = useState("");
  const [search, setSearch] = useState("");

  // ✅ NEW: rename team inline in list
  const [renamingTeamId, setRenamingTeamId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const importRef = useRef(null);
  const formRef = useRef(null);

  // ✅ NEW: opposition CSV import picker
  const oppImportRef = useRef(null);

  const activeTeam = data.teams.find((t) => t.id === data.activeTeamId) || null;

  // ✅ Shared icon button style (mobile-friendly)
  const iconBtn = {
    width: 24,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: 0,
    lineHeight: 1,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
  };

  // Note: printing background moved to Line-ups tab

  /* HELPERS FOR ROSTER DISPLAY / IMPORT/EXPORT */

  function yyyymmdd(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  function safeFileBase(name) {
    return String(name || "team").replace(/[^a-z0-9-_]+/gi, "_");
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    // Quote if it contains comma, quote, or newline
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  // Simple CSV parser that supports quoted fields + commas + newlines
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    const s = String(text ?? "");
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];

      if (inQuotes) {
        if (ch === '"') {
          const next = s[i + 1];
          if (next === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        continue;
      }

      if (ch === ",") {
        row.push(cell);
        cell = "";
        continue;
      }

      if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      if (ch === "\r") {
        // ignore CR (handles Windows CRLF)
        continue;
      }

      cell += ch;
    }

    // flush last cell
    row.push(cell);
    rows.push(row);

    // Trim trailing completely-empty rows
    while (
      rows.length &&
      rows[rows.length - 1].every((c) => String(c || "").trim() === "")
    ) {
      rows.pop();
    }

    return rows;
  }

  function normalizePosition(raw) {
    const v = String(raw || "").trim();
    if (!v) return "Wing";

    // Case-insensitive match for full names
    const lower = v.toLowerCase();
    const fullMatch = POSITIONS.find((p) => p.toLowerCase() === lower);
    if (fullMatch) return fullMatch;

    // Short codes / aliases
    const up = v.toUpperCase();
    if (
      up === "C" ||
      up === "CE" ||
      up === "CTR" ||
      lower === "centre" ||
      lower === "center"
    )
      return "Centre";
    if (up === "W" || up === "LW" || up === "RW" || lower === "wing")
      return "Wing";
    if (
      up === "D" ||
      up === "LD" ||
      up === "RD" ||
      lower === "defender" ||
      lower === "defence" ||
      lower === "defense"
    )
      return "Defender";
    if (
      up === "G" ||
      up === "GK" ||
      lower === "goalie" ||
      lower === "goalkeeper"
    )
      return "Goalie";

    return "Wing"; // default if invalid
  }

  function normalizeLeadership(raw) {
    const up = String(raw || "").trim().toUpperCase();
    return up === "C" || up === "A" ? up : "";
  }

  function normalizeStick(raw) {
    const v = String(raw || "").trim();
    if (STICKS.includes(v)) return v;

    const up = v.toUpperCase();
    if (up === "L" || up === "LH") return "Left";
    if (up === "R" || up === "RH") return "Right";
    return "";
  }

  function parseCanPlayCell(raw) {
    const s = String(raw || "").trim();
    if (!s) return [];

    // allow commas, semicolons, or whitespace as separators
    const tokens = s
      .split(/[,;\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const filtered = tokens.filter((t) => CANPLAY.includes(t));

    // de-dupe while keeping order
    const out = [];
    const seen = new Set();
    for (const t of filtered) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  }

  function updateData(updater) {
    setData((prev) => {
      const next = updater(structuredClone(prev));
      next.updatedAt = Date.now();
      return next;
    });
  }

  // ✅ NEW: rename helpers (in team list)
  function startRenameTeam(team) {
    if (!team) return;
    setRenamingTeamId(team.id);
    setRenameValue(team.name || "");
  }

  function cancelRenameTeam() {
    setRenamingTeamId(null);
    setRenameValue("");
  }

  function saveRenameTeam() {
    const id = renamingTeamId;
    if (!id) return;

    const nextName = renameValue.trim();
    if (!nextName) return;

    updateData((d) => {
      const t = d.teams.find((x) => x.id === id);
      if (t) {
        t.name = nextName;

        // ✅ Keep bound theme name in sync with team name
        if (t.themeId) {
          const th = d.themes?.find((y) => y.id === t.themeId);
          if (th) th.name = nextName;
        }
      }
      return d;
    });

    setRenamingTeamId(null);
  }

  function resetTeamThemeToDefault(teamId) {
    if (!teamId) return;
    if (!confirm("Reset this team theme to the current Default Theme template?")) return;

    updateData((d) => {
      d.themes ??= [];

      // Ensure default template exists
      let template = getDefaultTheme(d.themes);
      if (!template) {
        template = createDefaultThemeTemplate();
        d.themes.push(template);
      }

      const team = d.teams.find((x) => x.id === teamId);
      if (!team) return d;

      const oldThemeId = team.themeId;

      // Create a fresh clone and bind it
      const fresh = cloneThemeFromTemplate(template, team.name || "Theme");
      team.themeId = fresh.id;
      d.themes.push(fresh);

      // Remove the old theme (but never remove the default template)
      if (oldThemeId && oldThemeId !== template.id) {
        const old = d.themes.find((t) => t.id === oldThemeId);
        if (old && old.isDefault !== true) {
          d.themes = d.themes.filter((t) => t.id !== oldThemeId);
        }
      }

      // Keep activeThemeId consistent with active team
      if (d.activeTeamId === teamId) {
        d.activeThemeId = team.themeId;
      }

      return d;
    });
  }

  function exportActiveTeam() {
    if (!activeTeam) return;

    const date = yyyymmdd(new Date());
    const safeName = safeFileBase(activeTeam.name);

    const header = [
      "number",
      "name",
      "preferredPosition",
      "leadership",
      "stick",
      "canPlay",
      "notes",
    ];

    const lines = [];
    lines.push(header.map(csvEscape).join(","));

    for (const p of activeTeam.players) {
      const row = [
        String(p.number ?? ""),
        String(p.name ?? ""),
        String(p.preferredPosition ?? ""),
        String(p.leadership ?? ""),
        String(p.stick ?? ""),
        (p.canPlay || []).join(","), // will be quoted if needed
        String(p.notes ?? ""),
      ];
      lines.push(row.map(csvEscape).join(","));
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName || "team"}_roster_${date}.csv`;
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
        const text = String(reader.result || "");
        const rows = parseCSV(text);

        if (!rows.length) {
          alert("Import failed: CSV is empty.");
          return;
        }

        // Detect header (case-insensitive)
        const header = rows[0].map((h) => String(h || "").trim().toLowerCase());
        const hasHeader = header.includes("number") || header.includes("name");
        const startIdx = hasHeader ? 1 : 0;

        // Team name from file name (strip extension, strip _roster_YYYYMMDD if present)
        let base = file.name.replace(/\.[^/.]+$/, "");
        base = base.replace(/_roster_\d{8}$/i, "");
        base = base.replace(/_/g, " ").trim();
        const teamNameFromFile = base || "Imported Team";

        const report = {
          imported: 0,
          skipped: 0,
          messages: [],
        };

        // Build the team FIRST (so report counts are correct before updateData)
        const team = createTeam(teamNameFromFile);

        // ✅ Create/bind a team theme cloned from the Default Theme (template)
        d.themes ??= [];
        let template = getDefaultTheme(d.themes);
        if (!template) {
          template = createDefaultThemeTemplate();
          d.themes.push(template);
        }

        const theme = cloneThemeFromTemplate(template, teamNameFromFile);
        team.themeId = theme.id;

        const usedNumbers = new Set(); // for uniqueness in imported team
        let captainUsed = false;
        let aCount = 0;

        for (let r = startIdx; r < rows.length; r++) {
          const cols = rows[r] || [];

          // If we have a header, map columns by name; otherwise use fixed order
          const get = (key, fallbackIndex) => {
            if (hasHeader) {
              const idx = header.indexOf(key);
              return idx >= 0 ? cols[idx] : "";
            }
            return cols[fallbackIndex] ?? "";
          };

          const rawNumber = String(get("number", 0) ?? "").trim();
          const rawName = String(get("name", 1) ?? "");
          const rawPos = String(get("preferredposition", 2) ?? "");
          const rawLead = String(get("leadership", 3) ?? "");
          const rawStick = String(get("stick", 4) ?? "");
          const rawCanPlay = String(get("canplay", 5) ?? "");
          const rawNotes = String(get("notes", 6) ?? "");

          // Skip fully empty rows
          const allEmpty = [
            rawNumber,
            rawName,
            rawPos,
            rawLead,
            rawStick,
            rawCanPlay,
            rawNotes,
          ].every((v) => String(v || "").trim() === "");
          if (allEmpty) continue;

          // Number: required, positive int, 1-2 digits
          if (!/^\d{1,2}$/.test(rawNumber)) {
            report.skipped++;
            report.messages.push(
              `Row ${r + 1}: invalid number "${rawNumber}" (must be 1–2 digits).`
            );
            continue;
          }

          const num = Number(rawNumber);
          if (!Number.isInteger(num) || num <= 0) {
            report.skipped++;
            report.messages.push(
              `Row ${r + 1}: invalid number "${rawNumber}" (must be positive).`
            );
            continue;
          }

          if (usedNumbers.has(num)) {
            report.skipped++;
            report.messages.push(
              `Row ${r + 1}: number ${num} duplicated in import.`
            );
            continue;
          }

          // Name: required, trim, truncate to 16
          const trimmedName = String(rawName || "").trim();
          if (!trimmedName) {
            report.skipped++;
            report.messages.push(`Row ${r + 1}: missing name.`);
            continue;
          }
          const name16 =
            trimmedName.length > 16 ? trimmedName.slice(0, 16) : trimmedName;

          // ✅ Position mapping / default (now case-insensitive)
          const preferredPosition = normalizePosition(rawPos);

          // Leadership: normalize then enforce rules (first valid claims the slots)
          let leadership = normalizeLeadership(rawLead);
          if (leadership === "C") {
            if (captainUsed) leadership = "";
            else captainUsed = true;
          } else if (leadership === "A") {
            if (aCount >= 2) leadership = "";
            else aCount++;
          }

          // Stick: normalize
          const stick = normalizeStick(rawStick);

          // CanPlay: parse and filter to allowed codes
          const canPlay = parseCanPlayCell(rawCanPlay);

          const playerDraft = {
            number: String(num),
            name: name16,
            preferredPosition,
            leadership,
            stick,
            canPlay,
            notes: String(rawNotes || ""),
          };

          team.players.push(createPlayer(playerDraft));
          usedNumbers.add(num);
          report.imported++;
        }

        // Now update state ONCE with the fully built team
        updateData((d) => {
          d.teams.push(team);
          d.themes ??= [];
          d.themes.push(theme);
          d.activeTeamId = team.id;
          d.activeThemeId = theme.id;
          return d;
        });

        // Summary alert (counts now always correct)
        const topIssues = report.messages.slice(0, 8).join("\n");
        const more =
          report.messages.length > 8
            ? `\n...and ${report.messages.length - 8} more.`
            : "";

        alert(
          `Import complete.\n\nImported: ${report.imported}\nSkipped: ${report.skipped}` +
            (report.messages.length
              ? `\n\nIssues:\n${topIssues}${more}`
              : "")
        );
      } catch (e) {
        alert("Import failed: invalid CSV file.");
      } finally {
        if (importRef.current) importRef.current.value = "";
      }
    };

    reader.readAsText(file);
  }

  // =====================
  // Opposition management (stored on ACTIVE TEAM)
  // CSV format:
  //   Row 1 (header): League name (first cell)
  //   Rows 2..: opponent team names (first cell)
  // =====================

  function ensureOppFields(team) {
    if (!team) return;
    team.opposition ??= [];
    team.leagueName ??= "";
  }

  function addOppositionSingle() {
    if (!activeTeam) return;
    const name = prompt("Add opposition team name:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    updateData((d) => {
      const team = d.teams.find((t) => t.id === d.activeTeamId);
      if (!team) return d;
      ensureOppFields(team);
      const exists = team.opposition.some(
        (x) => String(x).trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (!exists) team.opposition.push(trimmed);
      return d;
    });
  }

  function editOppositionAt(index) {
    if (!activeTeam) return;
    const current = String(activeTeam.opposition?.[index] ?? "").trim();
    const nextName = prompt("Edit opposition team name:", current);
    if (nextName == null) return;
    const trimmed = String(nextName).trim();
    if (!trimmed) return;

    updateData((d) => {
      const team = d.teams.find((t) => t.id === d.activeTeamId);
      if (!team) return d;
      ensureOppFields(team);
      const lower = trimmed.toLowerCase();
      const dup = team.opposition.some(
        (x, i) => i !== index && String(x).trim().toLowerCase() === lower
      );
      if (dup) return d;
      team.opposition[index] = trimmed;
      return d;
    });
  }

  function deleteOppositionAt(index) {
    if (!activeTeam) return;
    const current = String(activeTeam.opposition?.[index] ?? "").trim();
    if (!current) return;
    if (!confirm(`Delete opposition team "${current}"?`)) return;

    updateData((d) => {
      const team = d.teams.find((t) => t.id === d.activeTeamId);
      if (!team) return d;
      ensureOppFields(team);
      team.opposition = team.opposition.filter((_, i) => i !== index);
      return d;
    });
  }

  function clickImportOpposition() {
    if (!activeTeam) return;
    oppImportRef.current?.click();
  }

  function importOppositionCsv(file) {
    if (!activeTeam || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const rows = parseCSV(text);

        // Find first non-empty row as header
        const nonEmptyRows = rows
          .map((r) => (Array.isArray(r) ? r : []))
          .map((r) => r.map((c) => String(c ?? "").trim()))
          .filter((r) => r.some((c) => c !== ""));

        if (nonEmptyRows.length === 0) {
          alert("Import failed: CSV is empty.");
          return;
        }

        const league = String(nonEmptyRows[0][0] ?? "").trim();
        const opponentNames = nonEmptyRows
          .slice(1)
          .map((r) => String(r[0] ?? "").trim())
          .filter(Boolean);

        updateData((d) => {
          const team = d.teams.find((t) => t.id === d.activeTeamId);
          if (!team) return d;
          ensureOppFields(team);

          if (league) team.leagueName = league;

          const seen = new Set(team.opposition.map((x) => String(x).trim().toLowerCase()));
          for (const nm of opponentNames) {
            const key = nm.toLowerCase();
            if (seen.has(key)) continue;
            team.opposition.push(nm);
            seen.add(key);
          }
          return d;
        });

        alert(
          `Opposition import complete.\n\nLeague: ${league || "(not provided)"}\nImported: ${opponentNames.length}`
        );
      } catch (e) {
        alert("Import failed: invalid CSV file.");
      } finally {
        if (oppImportRef.current) oppImportRef.current.value = "";
      }
    };

    reader.readAsText(file);
  }

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

  function createNewTeam() {
    const name = teamName.trim();
    if (!name) return;

    updateData((d) => {
      const t = createTeam(name);

      d.themes ??= [];
      let template = getDefaultTheme(d.themes);
      if (!template) {
        template = createDefaultThemeTemplate();
        d.themes.push(template);
      }

      const th = cloneThemeFromTemplate(template, name);
      t.themeId = th.id;

      d.teams.push(t);
      d.themes.push(th);

      d.activeTeamId = t.id;
      d.activeThemeId = th.id;
      return d;
    });

    setTeamName("");
  }

  function deleteTeam(id) {
    // If deleting the team currently being renamed, close rename UI
    if (renamingTeamId === id) cancelRenameTeam();

    updateData((d) => {
      const teamToDelete = d.teams.find((t) => t.id === id);
      const themeIdToDelete = teamToDelete?.themeId || null;

      d.teams = d.teams.filter((t) => t.id !== id);

      // Also delete the bound theme (keeps data clean)
      if (themeIdToDelete && Array.isArray(d.themes)) {
        d.themes = d.themes.filter((th) => th.id !== themeIdToDelete);
      }

      // Fix active team/theme
      if (d.activeTeamId === id) {
        d.activeTeamId = d.teams[0]?.id ?? null;
      }

      const activeTeam = d.teams.find((t) => t.id === d.activeTeamId) || d.teams[0] || null;
      d.activeThemeId = activeTeam?.themeId ?? d.themes?.[0]?.id ?? null;

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

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
          const updated = {
            ...team.players[idx],
            ...createPlayer(draft),
            id: editingId,
          };
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
        canPlay: has
          ? prev.canPlay.filter((c) => c !== code)
          : [...prev.canPlay, code],
      };
    });
  }

  return (
    <div
      className="rostersLayout"
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 16,
        minWidth: 0,
      }}
    >
      {/* Teams */}
      <aside
        className="rostersSidebar"
        style={{
          borderRight: "1px solid rgba(0,0,0,0.12)",
          paddingRight: 16,
          minWidth: 0,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Teams</h3>

        <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="New team name"
            style={{
              flex: 1,
              minWidth: 0,
              padding: 8,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />
          <button
            onClick={createNewTeam}
            style={{ padding: "8px 10px", borderRadius: 10 }}
          >
            Add
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {data.teams.length === 0 && (
            <div style={{ opacity: 0.7 }}>No teams yet. Add one above.</div>
          )}

          {data.teams.map((t) => {
            const isEditingThis = renamingTeamId === t.id;

            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background:
                    t.id === data.activeTeamId
                      ? "rgba(255, 169, 99, 0.1)"
                      : "transparent",
                  minWidth: 0,
                }}
              >
                <button
                  onClick={() => {
                    updateData((d) => {
                      d.activeTeamId = t.id;
                      d.activeThemeId = t.themeId ?? d.activeThemeId;
                      return d;
                    });
                    // If switching teams while renaming something else, cancel rename UI
                    if (renamingTeamId && renamingTeamId !== t.id)
                      cancelRenameTeam();
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "var(--text)",
                    font: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {!isEditingThis ? (
                    <>
                      <div
                        style={{
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {t.players.length} players
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        placeholder="Team name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRenameTeam();
                          if (e.key === "Escape") cancelRenameTeam();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "100%",
                          maxWidth: "100%",
                          padding: 8,
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.2)",
                        }}
                      />

                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            saveRenameTeam();
                          }}
                          title="Save"
                          style={{ ...iconBtn, width: 36, height: 30 }}
                          aria-label="Save rename"
                        >
                          ✅
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            cancelRenameTeam();
                          }}
                          title="Cancel"
                          style={{ ...iconBtn, width: 36, height: 30 }}
                          aria-label="Cancel rename"
                        >
                          ✖️
                        </button>
                      </div>
                    </>
                  )}
                </button>

                {/* ✅ Edit first */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRenameTeam(t);
                  }}
                  title="Rename team"
                  aria-label="Rename team"
                  style={iconBtn}
                >
                  ✏️
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetTeamThemeToDefault(t.id);
                  }}
                  title="Reset theme to default"
                  aria-label="Reset theme to default"
                  style={iconBtn}
                >
                  ♻️
                </button>

                {/* ✅ Delete second */}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTeam(t.id);
                  }}
                  title="Delete team"
                  aria-label="Delete team"
                  style={iconBtn}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>

        {/* ✅ Opposition management for active team */}
        {activeTeam ? (
          <OppositionPanel
            activeTeam={activeTeam}
            updateData={updateData}
            iconBtn={iconBtn}
            oppImportRef={oppImportRef}
            parseCSV={parseCSV}
          />
        ) : null}
      </aside>

      {/* Players */}
      <section style={{ minWidth: 0 }}>
        <div
          className="rostersTopRow"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            minWidth: 0,
          }}
        >
          <h2 style={{ margin: 0 }}>Rosters</h2>

          <div
            className="rostersActionsRow"
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              minWidth: 0,
            }}
          >
            {activeTeam ? (
              <>
                <button onClick={exportActiveTeam}>Export team</button>
                <button onClick={clickImport}>Import team</button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => importFromFile(e.target.files?.[0])}
                />
              </>
            ) : null}

            <input
              className="rostersSearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players…"
              style={{
                padding: 8,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                width: 260,
                maxWidth: "100%",
                minWidth: 0,
              }}
            />
          </div>
        </div>

        {!activeTeam ? (
          <div style={{ marginTop: 14, opacity: 0.8 }}>
            Create a team on the left to start adding players.
          </div>
        ) : (
          <>
            <div
              ref={formRef}
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                scrollMarginTop: 90,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {editingId ? "Edit player" : "Add player"}
              </h3>

              {error && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.2)",
                  }}
                >
                  <b>Fix:</b> {error}
                </div>
              )}

              <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
                {/* Row 1: Number + Name */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 140px) minmax(0, 1fr)",
                    gap: 10,
                  }}
                >
                  <input
                    value={draft.number}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, number: e.target.value }))
                    }
                    placeholder="Number"
                    style={{
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.2)",
                      minWidth: 0,
                      width: "100%",
                    }}
                  />
                  <input
                    value={draft.name}
                    maxLength={16}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Name (max 16 chars)"
                  />
                </div>

                {/* Row 2: Position + Leadership + Stick */}
                <div
                  className="addPlayerRow2"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 160px) minmax(0, 160px) minmax(0, 160px)",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <select
                    value={draft.preferredPosition}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        preferredPosition: e.target.value,
                      }))
                    }
                    style={{
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.2)",
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draft.leadership}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        leadership: e.target.value,
                      }))
                    }
                    style={{
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.2)",
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    {LEADERSHIP.map((l) => (
                      <option key={l} value={l}>
                        {l === "" ? "Leadership: none" : l}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draft.stick}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, stick: e.target.value }))
                    }
                    style={{
                      padding: 8,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.2)",
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    {STICKS.map((s) => (
                      <option key={s} value={s}>
                        {s === "" ? "Stick: (not set)" : s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 3: Can play */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700, opacity: 0.85 }}>
                    Can play:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    {CANPLAY.map((code) => (
                      <label
                        key={code}
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
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

                {/* Row 4: Notes */}
                <textarea
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Notes (optional)"
                  rows={3}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.2)",
                    minWidth: 0,
                    width: "100%",
                  }}
                />

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={savePlayer}
                    style={{ padding: "8px 12px", borderRadius: 10 }}
                  >
                    {editingId ? "Save changes" : "Add player"}
                  </button>
                  {editingId && (
                    <button
                      onClick={resetDraft}
                      style={{ padding: "8px 12px", borderRadius: 10 }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>Players</h3>

              <div className="playersList">
                {sortedPlayers.map((p) => (
                  <div key={p.id} className="playerRow">
                    <div className="playerNum">#{p.number}</div>

                    <div className="playerNameCell">
                      <div className="playerNameText">{p.name}</div>
                    </div>

                    <div className="playerLeader">{p.leadership || ""}</div>

                    <div className="playerPos">
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          border: `1px solid var(--primary)`,
                          borderRadius: 999,
                          fontWeight: 800,
                          fontSize: 12,
                          color: "var(--surface)",
                          background: `var(--pos-${p.preferredPosition.toLowerCase()})`,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.preferredPosition}
                      </span>
                    </div>

                    <div className="playerStick">
                      {p.stick === "Left" ? "LH" : p.stick === "Right" ? "RH" : ""}
                    </div>

                    <div className="playerCanPlay">
                      {(p.canPlay || []).length ? p.canPlay.join(", ") : ""}
                    </div>

                    {/* ✅ Icon actions for consistency + better mobile layout */}
                    <div
                      className="playerActions"
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={() => startEditPlayer(p)}
                        title="Edit player"
                        aria-label="Edit player"
                        style={iconBtn}
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() => deletePlayer(p.id)}
                        title="Delete player"
                        aria-label="Delete player"
                        style={iconBtn}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}

                {sortedPlayers.length === 0 && (
                  <div style={{ opacity: 0.7 }}>
                    No players match your search.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
