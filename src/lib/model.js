export function newId() {
  return crypto.randomUUID();
}

/**
 * Current default theme values (single source of truth).
 * Keep these aligned with your Theme.jsx and your CSS variable applier.
 */
export const DEFAULT_THEME_APP = {
  // UI
  background: "#d7c4b4",
  surface: "#fcfaf8",
  text: "#1d1d1d",
  border: "rgba(0,0,0,0.12)",

  // NEW names (buttons replaces old primary)
  buttons: "#961f1f",

  // NEW leadership color (replaces old accent for this purpose)
  leader: "#f2a900",

  // ✅ NEW: error bubble color
  errorBubble: "#dc2626",

  // Printing (Lineups print)
  printTeamColor: "#961f1f",
  printText: "#000000",
  printCardText: "#f8fafc",
  printLeader: "#a88718",
};

export const DEFAULT_POSITION_COLORS = {
  Centre: "#5a3e00",
  Wing: "#865c00",
  Defender: "#3b2a00",
  Goalie: "#b77c00",
};

/**
 * Make old themes compatible with new keys.
 * - Old model had app.primary + app.accent
 * - New model uses app.buttons + app.leader + app.errorBubble + print* keys
 */
export function normalizeTheme(theme) {
  if (!theme || typeof theme !== "object") return createTheme("Default");

  theme.app ??= {};
  theme.positions ??= {};

  // Back-compat inputs (old keys)
  const oldPrimary = theme.app.primary;
  const oldAccent = theme.app.accent;

  // Fill NEW keys with best-available values
  theme.app.background ??= DEFAULT_THEME_APP.background;
  theme.app.surface ??= DEFAULT_THEME_APP.surface;
  theme.app.text ??= DEFAULT_THEME_APP.text;
  theme.app.border ??= DEFAULT_THEME_APP.border;

  // buttons: prefer new key, else old primary, else default
  theme.app.buttons ??= oldPrimary ?? DEFAULT_THEME_APP.buttons;

  // leader: prefer new key, else old accent, else default
  theme.app.leader ??= oldAccent ?? DEFAULT_THEME_APP.leader;

  // ✅ errorBubble: default if missing
  theme.app.errorBubble ??= DEFAULT_THEME_APP.errorBubble;

  // Printing: prefer new keys, else fall back to old primary/accent/text/surface
  theme.app.printTeamColor ??= oldPrimary ?? DEFAULT_THEME_APP.printTeamColor;
  theme.app.printText ??= theme.app.text ?? DEFAULT_THEME_APP.printText;
  theme.app.printCardText ??= theme.app.surface ?? DEFAULT_THEME_APP.printCardText;
  theme.app.printLeader ??= oldAccent ?? theme.app.leader ?? DEFAULT_THEME_APP.printLeader;

  // Positions: ensure all positions exist
  for (const [pos, color] of Object.entries(DEFAULT_POSITION_COLORS)) {
    theme.positions[pos] ??= color;
  }

  theme.createdAt ??= Date.now();
  theme.updatedAt ??= Date.now();

  return theme;
}

export function normalizeAppData(data) {
  if (!data || typeof data !== "object") return createEmptyAppData();

  data.teams ??= [];
  data.themes ??= [];

  // Normalize all themes (back-compat)
  data.themes = data.themes.map((t) => normalizeTheme(t));

  // ✅ Ensure team fields exist (back-compat)
  for (const t of data.teams) {
    t.players ??= [];
    // Printing background
    // - printBackgroundPreset: built-in background path under /public (string)
    // - printBackgroundImage: uploaded image data URL (overrides preset when set)
    t.printBackgroundPreset ??= "";
    t.printBackgroundImage ??= "";

    // Opposition + league (for printing/opponent dropdowns)
    t.opposition ??= [];
    t.leagueName ??= "";

    // NEW: bound theme (Team ↔ Theme)
    t.themeId ??= null;
  }

  // Ensure at least 1 team
  if (data.teams.length === 0) {
    const t = createTeam("Default Team");
    data.teams.push(t);
    data.activeTeamId = t.id;
  } else {
    // If activeTeamId missing or invalid, fix it
    const activeExists = data.teams.some((t) => t.id === data.activeTeamId);
    if (!activeExists) data.activeTeamId = data.teams[0]?.id ?? null;
  }

  // Build theme lookup
  const themeById = new Map(data.themes.map((t) => [t.id, t]));
  const usedThemeIds = new Set();

  // Helper: attach a theme to a team (create if needed)
  const ensureTeamTheme = (team, preferThemeId = null) => {
    // Keep existing theme if valid + not already claimed
    if (
      team.themeId &&
      themeById.has(team.themeId) &&
      !usedThemeIds.has(team.themeId)
    ) {
      usedThemeIds.add(team.themeId);
      // Keep theme name aligned with team name for sanity
      const th = themeById.get(team.themeId);
      if (th && th.name !== team.name) th.name = team.name;
      return;
    }

    // Prefer legacy activeThemeId for the active team (migration)
    if (
      preferThemeId &&
      themeById.has(preferThemeId) &&
      !usedThemeIds.has(preferThemeId)
    ) {
      team.themeId = preferThemeId;
      usedThemeIds.add(preferThemeId);
      const th = themeById.get(preferThemeId);
      if (th) th.name = team.name;
      return;
    }

    // Otherwise create a fresh theme for this team
    const th = createTheme(team.name || "Theme");
    th.name = team.name || th.name;
    data.themes.push(th);
    themeById.set(th.id, th);
    team.themeId = th.id;
    usedThemeIds.add(th.id);
  };

  const activeTeam =
    data.teams.find((t) => t.id === data.activeTeamId) || data.teams[0] || null;

  // Ensure a theme exists for every team
  for (const team of data.teams) {
    const prefer = activeTeam && team.id === activeTeam.id ? data.activeThemeId : null;
    ensureTeamTheme(team, prefer);
  }

  // ✅ Active theme is always the active team's theme
  const activeTeam2 =
    data.teams.find((t) => t.id === data.activeTeamId) || data.teams[0] || null;
  data.activeThemeId = activeTeam2?.themeId ?? data.themes[0]?.id ?? null;

  data.createdAt ??= Date.now();
  data.updatedAt ??= Date.now();

  return data;
}

export function createEmptyAppData() {
  const defaultTeam = createTeam("SNIPERS DIV 1");

  // ✅ Seed default opposition for the initial (bootstrapped) team only.
  // New teams created by users will start with an empty opposition list.
  defaultTeam.opposition = ["Arctics", "Huskies", "Stingrays", "Titans", "Unicorns"];

  defaultTeam.players.push(
    createPlayer({
      number: "2",
      name: "E.BULEY",
      preferredPosition: "Centre",
      stick: "Right",
      canPlay: ["C", "LW", "RW"],
    }),
    createPlayer({
      number: "39",
      name: "PREECE",
      preferredPosition: "Goalie",
      canPlay: ["G"],
    }),
    createPlayer({
      number: "15",
      name: "LOGSDON",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "73",
      name: "S.BULEY",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "71",
      name: "BURDEN",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "77",
      name: "UY",
      preferredPosition: "Centre",
      stick: "Right",
      canPlay: ["C"],
    }),
    createPlayer({
      number: "48",
      name: "COATS",
      preferredPosition: "Wing",
      stick: "Left",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "43",
      name: "HOSKINS",
      preferredPosition: "Defender",
      stick: "Right",
      canPlay: ["RW", "RD"],
    }),
    createPlayer({
      number: "58",
      name: "HARRIMAN",
      preferredPosition: "Defender",
      stick: "Right",
      canPlay: ["LD", "RD"],
    }),
    createPlayer({
      number: "87",
      name: "BOYS",
      preferredPosition: "Wing",
      leadership: "C",
      stick: "Right",
      canPlay: ["C", "LW", "RW", "LD", "RD"],
    }),
    createPlayer({
      number: "38",
      name: "NORMAN",
      preferredPosition: "Defender",
      leadership: "A",
      stick: "Right",
      canPlay: ["LW", "RW", "LD", "RD"],
    }),
    createPlayer({
      number: "40",
      name: "WHITTER",
      preferredPosition: "Centre",
      stick: "Left",
      canPlay: ["C", "LD", "RD"],
    }),
    createPlayer({
      number: "93",
      name: "PRACNY",
      preferredPosition: "Defender",
      leadership: "A",
      stick: "Left",
      canPlay: ["LW", "RW", "LD", "RD"],
    })
  );

  const defaultTheme = createTheme("Default");

  // ✅ Bind default theme to default team
  defaultTeam.themeId = defaultTheme.id;

  return normalizeAppData({
    teams: [defaultTeam],
    activeTeamId: defaultTeam.id,

    themes: [defaultTheme],
    activeThemeId: defaultTheme.id,

    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export function createTeam(name) {
  return {
    id: newId(),
    name,
    themeId: null, // ✅ bound theme for this team
    players: [],
    printBackgroundPreset: "", // ✅ built-in bg path (e.g. "/print-default-bg.png")
    printBackgroundImage: "", // ✅ uploaded bg data URL (overrides preset)

    // ✅ Opposition + league (used for printing + dropdowns)
    opposition: [],
    leagueName: "",
  };
}

export function createTheme(name = "Default") {
  const t = {
    id: newId(),
    name,
    app: structuredClone(DEFAULT_THEME_APP),
    positions: structuredClone(DEFAULT_POSITION_COLORS),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return normalizeTheme(t);
}

export function createPlayer(input) {
  return {
    id: newId(),
    number: Number(input.number),
    name: String(input.name || "").trim(),
    preferredPosition: input.preferredPosition, // Centre/Wing/Defender/Goalie
    leadership: input.leadership || "", // "", "C", "A"
    stick: input.stick || "", // "", "Left", "Right"
    canPlay: Array.isArray(input.canPlay) ? input.canPlay : [],
    notes: input.notes || "",
  };
}

export function validatePlayer(team, playerDraft, editingPlayerId = null) {
  const num = Number(playerDraft.number);
  if (!Number.isInteger(num) || num <= 0) return "Number must be a positive integer.";

  const numberClash = team.players.some((p) => p.number === num && p.id !== editingPlayerId);
  if (numberClash) return `Number ${num} is already used in this team.`;

  const name = String(playerDraft.name ?? "").trim();
  if (!name) return "Name is required.";

  // max 16 chars (incl spaces)
  if (name.length > 16) return "Name must be 16 characters or fewer.";

  if (!playerDraft.preferredPosition) return "Preferred position is required.";

  const leadership = playerDraft.leadership || "";
  const others = team.players.filter((p) => p.id !== editingPlayerId);

  if (leadership === "C") {
    const hasC = others.some((p) => p.leadership === "C");
    if (hasC) return "Only one Captain (C) is allowed per team.";
  }

  if (leadership === "A") {
    const aCount = others.filter((p) => p.leadership === "A").length;
    if (aCount >= 2) return "Only two Alternates (A) are allowed per team.";
  }

  return null;
}

export function positionSortKey(pos) {
  const order = { Goalie: 0, Defender: 1, Centre: 2, Wing: 3 };
  return order[pos] ?? 99;
}

