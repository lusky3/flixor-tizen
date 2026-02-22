import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserAvatar } from "./UserAvatar";
import { flixor } from "../services/flixor";

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [userName, setUserName] = useState("User");
  const [userThumb, setUserThumb] = useState<string | undefined>();

  useEffect(() => {
    // Try active profile first, then fall back to fetching home users
    const profile = flixor.currentProfile;
    if (profile) {
      setUserName(profile.title);
      setUserThumb(profile.thumb);
      return;
    }

    // No active profile — fetch home users and use the admin/first user
    flixor.getHomeUsers().then((users) => {
      if (users.length > 0) {
        const admin = users.find((u) => u.admin) || users[0];
        setUserName(admin.title);
        setUserThumb(admin.thumb);
      }
    }).catch(() => {
      // Silently keep defaults
    });
  }, []);

  const handleAvatarPress = useCallback(() => {
    navigate("/profile-select");
  }, [navigate]);

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
          className={`nav-item ${currentPath === "/new-popular" ? "active" : ""}`}
          tabIndex={0}
          onClick={() => navigate("/new-popular")}
        >
          New & Popular
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
      <div className="nav-user">
        <UserAvatar
          thumb={userThumb}
          title={userName}
          onPress={handleAvatarPress}
        />
      </div>
    </nav>
  );
}


