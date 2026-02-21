import { useNavigate, useLocation } from "react-router-dom";

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="tv-nav">
      <h1 className="logo">FLIXOR</h1>
      <div className="nav-items">
        <button
          className={`nav-item ${currentPath === "/" ? "active" : ""}`}
          tabIndex={0}
          onClick={() => navigate("/")}
        >
          Home
        </button>
        <button
          className={`nav-item ${currentPath === "/mylist" ? "active" : ""}`}
          tabIndex={0}
          onClick={() => navigate("/mylist")}
        >
          My List
        </button>
        <button
          className={`nav-item ${currentPath.includes("/library/movie") ? "active" : ""}`}
          tabIndex={0}
          onClick={() => navigate("/library/movie")}
        >
          Movies
        </button>
        <button
          className={`nav-item ${currentPath.includes("/library/show") ? "active" : ""}`}
          tabIndex={0}
          onClick={() => navigate("/library/show")}
        >
          Shows
        </button>
        <button
          className={`nav-item ${currentPath === "/search" ? "active" : ""}`}
          tabIndex={0}
          onClick={() => navigate("/search")}
        >
          Search
        </button>
        <button
          className={`nav-item ${currentPath === "/settings" ? "active" : ""}`}
          tabIndex={0}
          onClick={() => navigate("/settings")}
        >
          ⚙ Settings
        </button>
      </div>
    </nav>
  );
}
