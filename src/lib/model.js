export function newId() {
  return crypto.randomUUID();
}

/**
 * Current default theme values (single source of truth).
 * Keep these aligned with your Theme.jsx and your CSS variable applier.
 */
export const DEFAULT_THEME_APP = {
  // UI
  background: "#ffffff",
  surface: "#f8fafc",
  text: "#0f172a",
  border: "rgba(0,0,0,0.12)",

  // NEW names (buttons replaces old primary)
  buttons: "#2563eb",

  // NEW leadership color (replaces old accent for this purpose)
  leader: "#ffc061",

  // ✅ NEW: error bubble color
  errorBubble: "#dc2626",

  // Printing (Lineups print)
  printTeamColor: "#961f1f",
  printText: "#000000",
  printCardText: "#f8fafc",
  printLeader: "#a88718",
};

export const DEFAULT_POSITION_COLORS = {
  Centre: "#ad724b",
  Wing: "#654321",
  Defender: "#1e1f1b",
  Goalie: "#3b3c35",
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

  // ✅ NEW: ensure teams have printBackgroundImage
  for (const t of data.teams) {
    t.printBackgroundImage ??= ""; // Data URL (base64). Empty = no background
    t.players ??= [];
  }

  // Ensure at least 1 team
  if (data.teams.length === 0) {
    const t = createTeam("Default Team");
    data.teams.push(t);
    data.activeTeamId = t.id;
  } else {
    data.activeTeamId ??= data.teams[0]?.id ?? null;
  }

  // Ensure at least 1 theme
  if (data.themes.length === 0) {
    const th = createTheme("Default");
    data.themes.push(th);
    data.activeThemeId = th.id;
  } else {
    // normalize all themes (back-compat)
    data.themes = data.themes.map((t) => normalizeTheme(t));
    data.activeThemeId ??= data.themes[0]?.id ?? null;

    // if activeThemeId points to missing theme, fix it
    const exists = data.themes.some((t) => t.id === data.activeThemeId);
    if (!exists) data.activeThemeId = data.themes[0]?.id ?? null;
  }

  data.createdAt ??= Date.now();
  data.updatedAt ??= Date.now();

  return data;
}

export function createEmptyAppData() {
  const defaultTeam = createTeam("SNIPERS DIV 1");

  defaultTeam.players.push(
    createPlayer({
      number: "2",
      name: "E.Buley",
      preferredPosition: "Centre",
      stick: "Right",
      canPlay: ["C", "LW", "RW"],
    }),
    createPlayer({
      number: "39",
      name: "Preece",
      preferredPosition: "Goalie",
      canPlay: ["G"],
    }),
    createPlayer({
      number: "15",
      name: "Logsdon",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "73",
      name: "S.Buley",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "71",
      name: "Burden",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "77",
      name: "Uy",
      preferredPosition: "Centre",
      stick: "Right",
      canPlay: ["C"],
    }),
    createPlayer({
      number: "48",
      name: "Coats",
      preferredPosition: "Wing",
      stick: "Left",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "43",
      name: "Hoskins",
      preferredPosition: "Defender",
      stick: "Right",
      canPlay: ["RW", "RD"],
    }),
    createPlayer({
      number: "58",
      name: "Harriman",
      preferredPosition: "Defender",
      stick: "Right",
      canPlay: ["LD", "RD"],
    }),
    createPlayer({
      number: "87",
      name: "Boys",
      preferredPosition: "Wing",
      leadership: "C",
      stick: "Right",
      canPlay: ["C", "LW", "RW", "LD", "RD"],
    }),
    createPlayer({
      number: "38",
      name: "Norman",
      preferredPosition: "Defender",
      leadership: "A",
      stick: "Right",
      canPlay: ["LW", "RW", "LD", "RD"],
    }),
    createPlayer({
      number: "40",
      name: "Whitter",
      preferredPosition: "Centre",
      stick: "Left",
      canPlay: ["C", "LD", "RD"],
    }),
    createPlayer({
      number: "93",
      name: "Pracny",
      preferredPosition: "Defender",
      leadership: "A",
      stick: "Left",
      canPlay: ["LW", "RW", "LD", "RD"],
    })
  );

  const defaultTheme = createTheme("Default");

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
    players: [],
    printBackgroundImage: "", // ✅ Data URL (base64). Empty = no background
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
