import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadAppData, saveAppData } from "./lib/storage";
import { createEmptyAppData } from "./lib/model";
import RostersPage from "./pages/Rosters";
import LineupsPage from "./pages/Lineups";


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

function Rosters() {
  return <div><h2>Rosters</h2><p>Coming next.</p></div>;
}
function Lineups() {
  return <div><h2>Line-ups</h2><p>Coming next.</p></div>;
}
function Theme() {
  return <div><h2>Theme</h2><p>Coming next.</p></div>;
}

export default function App() {
  const [data, setData] = useState(
    () => loadAppData() ?? createEmptyAppData()
  );

  useEffect(() => {
    saveAppData(data);
  }, [data]);
  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Ice Hockey Line Builder</h1>

      <nav style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <TabLink to="/">Rosters</TabLink>
        <TabLink to="/lineups">Line-ups</TabLink>
        <TabLink to="/theme">Theme</TabLink>
      </nav>

      <div style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}>
        <Routes>
          <Route
              path="/"
              element={<RostersPage data={data} setData={setData} />}
          />
          <Route path="/lineups" element={<LineupsPage data={data} setData={setData} />} />

          <Route path="/theme" element={<Theme />} />
        </Routes>
      </div>
    </div>
  );
}