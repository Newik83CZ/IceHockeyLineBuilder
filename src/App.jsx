import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import { loadAppData, saveAppData } from "./lib/storage";
import { createEmptyAppData, createTheme } from "./lib/model";

import RostersPage from "./pages/Rosters";
import LineupsPage from "./pages/Lineups";
import ThemePage from "./pages/Theme";

function TabLink({ to, children }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: "10px 14px",
        borderRadius: 10,
        textDecoration: "none",
        color: "inherit",
        background: isActive ? "rgba(0,0,0,0.08)" : "transparent",
        fontWeight: isActive ? 600 : 400,
      })}
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  const [data, setData] = useState(() => loadAppData() ?? createEmptyAppData());

  // Persist all app data
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // One-time migration: ensure at least one theme exists
  useEffect(() => {
    setData((prev) => {
      const next = structuredClone(prev);

      if (!next.themes || next.themes.length === 0) {
        const t = createTheme("Default");
        next.themes = [t];
        next.activeThemeId = t.id;
        next.updatedAt = Date.now();
      } else if (!next.activeThemeId) {
        next.activeThemeId = next.themes[0].id;
        next.updatedAt = Date.now();
      }

      if (!next.teams || next.teams.length === 0) {
        const t = createTeam("Default Team");
        next.teams = [t];
        next.activeTeamId = t.id;
        next.updatedAt = Date.now();
      } else if (!next.activeTeamId) {
        next.activeTeamId = next.teams[0].id;
        next.updatedAt = Date.now();
      }

      return next;
    });
    // run once on mount
  }, []);

  const activeTheme =
    data.themes?.find((t) => t.id === data.activeThemeId) || data.themes?.[0] || null;

  const themeStyle = activeTheme
    ? {
        "--primary": activeTheme.app.primary,
        "--accent": activeTheme.app.accent,
        "--background": activeTheme.app.background,
        "--surface": activeTheme.app.surface,
        "--text": activeTheme.app.text,
        "--border": activeTheme.app.border ?? "rgba(0,0,0,0.12)",

        "--pos-centre": activeTheme.positions.Centre,
        "--pos-wing": activeTheme.positions.Wing,
        "--pos-defender": activeTheme.positions.Defender,
        "--pos-goalie": activeTheme.positions.Goalie,

        background: "var(--background)",
        color: "var(--text)",
        minHeight: "100vh",
      }
    : { minHeight: "100vh" };

  return (
    <div style={themeStyle}>
      <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Ice Hockey Line Builder</h1>

        <nav style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <TabLink to="/">Rosters</TabLink>
          <TabLink to="/lineups">Line-ups</TabLink>
          <TabLink to="/theme">Theme</TabLink>
        </nav>

        <div
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <Routes>
            <Route path="/" element={<RostersPage data={data} setData={setData} />} />
            <Route path="/lineups" element={<LineupsPage data={data} setData={setData} />} />
            <Route path="/theme" element={<ThemePage data={data} setData={setData} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
