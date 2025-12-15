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
    return {
      teams: [],               // [{id,name,players:[...]}]
      activeTeamId: null,
      themes: [],              // later
      activeThemeId: null,     // later
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  
  export function createTeam(name) {
    return { id: newId(), name, players: [] };
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
      p => p.number === num && p.id !== editingPlayerId
    );
    if (numberClash) return `Number ${num} is already used in this team.`;
  
    // required fields
    if (!playerDraft.name || !playerDraft.name.trim()) return "Name is required.";
    if (!playerDraft.preferredPosition) return "Preferred position is required.";
  
    // leadership rules: 1C max, 2A max
    const leadership = playerDraft.leadership || "";
    const others = team.players.filter(p => p.id !== editingPlayerId);
  
    if (leadership === "C") {
      const hasC = others.some(p => p.leadership === "C");
      if (hasC) return "Only one Captain (C) is allowed per team.";
    }
    if (leadership === "A") {
      const aCount = others.filter(p => p.leadership === "A").length;
      if (aCount >= 2) return "Only two Alternates (A) are allowed per team.";
    }
  
    return null;
  }
  
  export function positionSortKey(pos) {
    // change order anytime you like
    const order = { Goalie: 0, Defender: 1, Centre: 2, Wing: 3 };
    return order[pos] ?? 99;
  }
  