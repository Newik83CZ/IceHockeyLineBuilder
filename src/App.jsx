import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { loadAppData, saveAppData } from "./lib/storage";
import { createEmptyAppData, normalizeAppData } from "./lib/model";

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
  const navigate = useNavigate();

  const [data, setData] = useState(() =>
    normalizeAppData(loadAppData() ?? createEmptyAppData())
  );

  // ✅ After factory reset, force landing on Rosters tab ("/")
  // The reset flow sets: sessionStorage.setItem("ihlbuilder_postreset_tab", "rosters")
  useEffect(() => {
    const tab = sessionStorage.getItem("ihlbuilder_postreset_tab");
    if (!tab) return;

    sessionStorage.removeItem("ihlbuilder_postreset_tab");

    // Today you only need Rosters. If you later add others, map them here.
    if (tab === "rosters") {
      navigate("/", { replace: true });
    } else if (tab === "lineups") {
      navigate("/lineups", { replace: true });
    } else if (tab === "theme") {
      navigate("/theme", { replace: true });
    } else {
      // fallback safety
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // ✅ One-time migration/backfill (runs once on mount)
  // This ensures any older saved data is upgraded safely.
  useEffect(() => {
    setData((prev) => normalizeAppData(prev));
  }, []);

  // Persist all app data
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  const activeTheme =
    data.themes?.find((t) => t.id === data.activeThemeId) || data.themes?.[0] || null;

  const themeStyle = activeTheme
    ? {
        // legacy aliases (avoid undefined)
        "--primary": activeTheme?.app?.buttons,
        "--accent": activeTheme?.app?.leader,

        // NEW vars
        "--buttons": activeTheme?.app?.buttons,
        "--leader": activeTheme?.app?.leader,

        "--printTeamColor": activeTheme?.app?.printTeamColor,
        "--printText": activeTheme?.app?.printText,
        "--printCardText": activeTheme?.app?.printCardText,
        "--printLeader": activeTheme?.app?.printLeader,

        "--background": activeTheme?.app?.background,
        "--surface": activeTheme?.app?.surface,
        "--text": activeTheme?.app?.text,
        "--border": activeTheme?.app?.border ?? "rgba(0,0,0,0.12)",

        "--pos-centre": activeTheme?.positions?.Centre,
        "--pos-wing": activeTheme?.positions?.Wing,
        "--pos-defender": activeTheme?.positions?.Defender,
        "--pos-goalie": activeTheme?.positions?.Goalie,

        // error bubble for mismatch slots
        "--errorBubble": activeTheme?.app?.errorBubble ?? "#dc2626",

        background: "var(--background)",
        color: "var(--text)",
        minHeight: "100vh",
        paddingBottom: "96px",
      }
    : {
        minHeight: "100vh",
        paddingBottom: "96px",
      };

  return (
    <div style={themeStyle}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, paddingTop: 20, paddingLeft: 10, paddingBottom: 10 }}>
          Ice Hockey Line Builder
        </h1>

        <nav className="tabNav">
          <TabLink to="/">Rosters</TabLink>
          <TabLink to="/lineups">Line-ups</TabLink>
          <TabLink to="/theme">Theme</TabLink>
        </nav>

        <div className="pageWrap" style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
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
