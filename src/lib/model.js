export function newId() {
    return crypto.randomUUID();
  }
  
  export const DEFAULT_POSITION_COLORS = {
    Centre: "#4f46e5",
    Wing: "#16a34a",
    Defender: "#f59e0b",
    Goalie: "#dc2626",
  };
  
  export function createEmptyAppData() {
  const defaultTeam = createTeam("Default Team");

  // Optional: add a few sample players
  // defaultTeam.players.push(createPlayer({ number:"10", name:"Sample Centre", preferredPosition:"Centre", ... }))

  defaultTeam.players.push(
    createPlayer({
      number: "2",
      name: "Elliot",
      preferredPosition: "Centre",
      stick: "Right",
      canPlay: ["C", "LW", "RW"],
    }),
    createPlayer({
      number: "39",
      name: "Bubbles",
      preferredPosition: "Goalie",
      canPlay: ["G"],
    }),
    createPlayer({
      number: "15",
      name: "Kim",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "73",
      name: "Scotty",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "71",
      name: "Georgie",
      preferredPosition: "Wing",
      stick: "Right",
      canPlay: ["LW", "RW"],
    }),
    createPlayer({
      number: "77",
      name: "Sonnay",
      preferredPosition: "Centre",
      stick: "Right",
      canPlay: ["C"],
    }),
    createPlayer({
      number: "48",
      name: "Maddi",
      preferredPosition: "Wing",
      stick: "Left",
      canPlay: ["LW", "RW", "LD", "RD"],
    }),
    createPlayer({
      number: "43",
      name: "Nathan",
      preferredPosition: "Defender",
      stick: "Right",
      canPlay: ["LD", "RD"],
    }),
    createPlayer({
      number: "58",
      name: "Trav",
      preferredPosition: "Defender",
      stick: "Right",
      canPlay: ["LD", "RD"],
    }),
    createPlayer({
      number: "87",
      name: "Boysy",
      preferredPosition: "Wing",
      leadership: "C",
      stick: "Right",
      canPlay: ["C", "LW", "RW", "LD", "RD"],      
    }),
    createPlayer({
      number: "38",
      name: "Ailish",
      preferredPosition: "Defender",
      leadership: "A",
      stick: "Right",
      canPlay: ["LW", "RW","LD", "RD"],
    }),
    createPlayer({
      number: "40",
      name: "Jeff",
      preferredPosition: "Centre",
      stick: "Left",
      canPlay: ["C", "LD", "RD"],
    }),
    createPlayer({
      number: "93",
      name: "Pavel",
      preferredPosition: "Defender",
      leadership: "A",
      stick: "Left",
      canPlay: ["LW", "RW","LD", "RD"],
    })
  );

  const defaultTheme = createTheme("Default");

  return {
    teams: [defaultTeam],
    activeTeamId: defaultTeam.id,

    themes: [defaultTheme],
    activeThemeId: defaultTheme.id,

    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

  
  export function createTeam(name) {
    return { id: newId(), name, players: [] };
  }
  
  export function createTheme(name = "Default") {
    return {
      id: newId(),
      name,
      app: {
        primary: "#2563eb",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        accent: "#22c55e",
        border: "rgba(0,0,0,0.12)",
      },
      positions: {
        Centre: "#4f46e5",
        Wing: "#16a34a",
        Defender: "#f59e0b",
        Goalie: "#dc2626",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  

  export function createPlayer(input) {
    return {
      id: newId(),
      number: Number(input.number),
      name: input.name.trim(),
      preferredPosition: input.preferredPosition, // Centre/Wing/Defender/Goalie
      leadership: input.leadership || "",         // "", "C", "A"
      stick: input.stick || "",                   // "", "Left", "Right"
      canPlay: Array.isArray(input.canPlay) ? input.canPlay : [],
      notes: input.notes || "",
    };
  }
  
export function validatePlayer(team, playerDraft, editingPlayerId = null) {
  // number unique
  const num = Number(playerDraft.number);
  if (!Number.isInteger(num) || num <= 0) return "Number must be a positive integer.";
  const numberClash = team.players.some(
    (p) => p.number === num && p.id !== editingPlayerId
  );
  if (numberClash) return `Number ${num} is already used in this team.`;

  // required fields
  const name = String(playerDraft.name ?? "").trim();
  if (!name) return "Name is required.";

  // ✅ NEW: max 16 characters (including spaces)
  if (name.length > 16) return "Name must be 16 characters or fewer.";

  if (!playerDraft.preferredPosition) return "Preferred position is required.";

  // leadership rules: 1C max, 2A max
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
    // change order anytime you like
    const order = { Goalie: 0, Defender: 1, Centre: 2, Wing: 3 };
    return order[pos] ?? 99;
  }
  