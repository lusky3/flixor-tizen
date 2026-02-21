import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { flixor } from "../services/flixor";
import { TopNav } from "../components/TopNav";
import type { TMDBPerson, TMDBMedia } from "@flixor/core";

export function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const nameQuery = params.get("name");
  const [person, setPerson] = useState<TMDBPerson | null>(null);
  const [credits, setCredits] = useState<
    { title: string; items: TMDBMedia[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPerson = async () => {
      setLoading(true);
      try {
        let personId = id ? Number.parseInt(id, 10) : null;

        if (!personId && nameQuery) {
          const searchRes = await flixor.tmdb.searchPerson(nameQuery);
          if (searchRes.results?.length > 0) {
            personId = searchRes.results[0].id;
          }
        }

        if (personId) {
          const [details, creditData] = await Promise.all([
            flixor.tmdb.getPersonDetails(personId),
            flixor.tmdb.getPersonCredits(personId),
          ]);

          setPerson(details);

          const movieCredits = (creditData.cast || [])
            .filter((c: TMDBMedia) => c.media_type === "movie")
            .sort(
              (a: TMDBMedia, b: TMDBMedia) =>
                (b.popularity || 0) - (a.popularity || 0),
            )
            .slice(0, 15);

          const tvCredits = (creditData.cast || [])
            .filter((c: TMDBMedia) => c.media_type === "tv")
            .sort(
              (a: TMDBMedia, b: TMDBMedia) =>
                (b.popularity || 0) - (a.popularity || 0),
            )
            .slice(0, 15);

          const groups = [];
          if (movieCredits.length > 0)
            groups.push({ title: "Movies", items: movieCredits });
          if (tvCredits.length > 0)
            groups.push({ title: "TV Shows", items: tvCredits });
          setCredits(groups);
        }
      } catch (err) {
        console.error("Failed to load person details", err);
      } finally {
        setLoading(false);
      }
    };
    loadPerson();
  }, [id, nameQuery]);

  if (loading) return <div className="loading">Loading Person...</div>;
  if (!person)
    return (
      <div className="empty-state">
        <h2>Person not found</h2>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );

  return (
    <div className="tv-container pt-nav">
      <TopNav />

      <div className="person-header">
        <div className="person-profile-container">
          {person.profile_path ? (
            <img
              src={flixor.tmdb.getProfileUrl(person.profile_path, "h632")}
              alt={person.name}
              className="person-profile-img"
            />
          ) : (
            <div className="person-profile-placeholder">{person.name[0]}</div>
          )}
        </div>
        <div className="person-info">
          <h1 className="person-name">{person.name}</h1>
          <p className="person-bio">
            {person.biography || "No biography available."}
          </p>
          <div className="person-meta">
            {person.birthday && <span>Born: {person.birthday}</span>}
            {person.place_of_birth && (
              <span>Place of Birth: {person.place_of_birth}</span>
            )}
          </div>
        </div>
      </div>

      {credits.map((group) => (
        <div key={group.title} className="person-section">
          <h2 className="section-title">{group.title}</h2>
          <div className="tv-row">
            {group.items.map((item: any) => (
              <button
                key={item.id + item.media_type}
                className="media-card-wrapper"
                onClick={async () => {
                  // Attempt to find this item in Plex
                  const guid = `tmdb://${item.id}`;
                  const plexItems = await flixor.plexServer.findByGuid(
                    guid,
                    item.media_type === "movie" ? 1 : 2,
                  );
                  if (plexItems.length > 0) {
                    navigate(`/details/${plexItems[0].ratingKey}`);
                  } else {
                    // Item not in Plex, maybe show a "Not in Library" state or similar
                  }
                }}
              >
                <div className="media-card poster">
                  <img
                    src={flixor.tmdb.getPosterUrl(item.poster_path, "w342")}
                    className="card-img"
                    alt={item.title || item.name}
                  />
                  <div className="card-info">
                    <div className="card-title">{item.title || item.name}</div>
                    <div className="card-meta">
                      {item.release_date?.split("-")[0] ||
                        item.first_air_date?.split("-")[0]}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
