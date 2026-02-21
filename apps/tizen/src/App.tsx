import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useTizenRemote } from "./hooks/useTizenRemote";
import { flixor } from "./services/flixor";

// Pages
import { Home } from "./pages/Home";
import { LibraryPage } from "./pages/Library";
import { DetailsPage } from "./pages/Details";
import { PlayerPage } from "./pages/Player";
import { SearchPage } from "./pages/Search";
import { Login } from "./pages/Login";
import { SettingsPage } from "./pages/Settings";
import { MyListPage } from "./pages/MyList";
import { PersonPage } from "./pages/Person";

function App() {
  useTizenRemote();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      const restored = await flixor.initialize();
      setAuthenticated(restored);
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return (
      <div
        className="tv-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 className="logo">FLIXOR</h1>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          authenticated ? (
            <Home />
          ) : (
            <Login onLogin={() => setAuthenticated(true)} />
          )
        }
      />
      <Route path="/library/:type" element={<LibraryPage />} />
      <Route path="/details/:ratingKey" element={<DetailsPage />} />
      <Route path="/player/:ratingKey" element={<PlayerPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/mylist" element={<MyListPage />} />
      <Route path="/person/:id" element={<PersonPage />} />
      <Route path="/person" element={<PersonPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;
