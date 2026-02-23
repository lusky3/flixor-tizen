import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import { flixor } from "../services/flixor";
import { loadSettings } from "../services/settings";
import type { PlexMediaItem } from "@flixor/core";
import { TopNav } from "../components/TopNav";
import { PosterCard } from "../components/PosterCard";
import { FilterBar, type FilterOption } from "../components/FilterBar";
import { SkeletonRow } from "../components/SkeletonRow";
import { VirtualGrid, type VirtualGridItem } from "../components/VirtualGrid";
import { SectionBanner } from "../components/SectionBanner";

const PAGE_SIZE = 50;

export function LibraryPage() {
  const { type } = useParams<{ type: string }>();
  const [allItems, setAllItems] = useState<PlexMediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PlexMediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [genres, setGenres] = useState<{ key: string; title: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const libKeyRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const { ref: pageRef, focusKey: pageFocusKey } = useFocusable({
    focusKey: "library-page",
    trackChildren: true,
  });

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      setSearchQuery("");
      setSelectedGenre(null);
      setAllItems([]);
      setFilteredItems([]);
      setHasMore(true);
      try {
        const libs = await flixor.plexServer.getLibraries();
        const settings = loadSettings();
        const disabledKeys = settings.catalogDisabledLibraries || [];
        const enabledLibs = libs.filter((l) => !disabledKeys.includes(l.key));
        const targetLib = enabledLibs.find((l) => l.type === type);
        if (targetLib) {
          libKeyRef.current = targetLib.key;
          const [content, genreList] = await Promise.all([
            flixor.plexServer.getLibraryItems(targetLib.key, {
              sort: "addedAt:desc",
              offset: 0,
              limit: PAGE_SIZE,
            }),
            flixor.plexServer.getGenres(targetLib.key),
          ]);
          setAllItems(content);
          setFilteredItems(content);
          setGenres(genreList);
          setHasMore(content.length >= PAGE_SIZE);
        }
      } catch (err) {
        console.error("Failed to load library:", err);
      } finally {
        setLoading(false);
      }
    };
    loadLibrary();
  }, [type]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !libKeyRef.current) return;
    setLoadingMore(true);
    try {
      const next = await flixor.plexServer.getLibraryItems(libKeyRef.current, {
        sort: "addedAt:desc",
        offset: allItems.length,
        limit: PAGE_SIZE,
      });
      if (next.length < PAGE_SIZE) setHasMore(false);
      setAllItems((prev) => [...prev, ...next]);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, allItems.length]);

  useEffect(() => {
    let result = allItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.title.toLowerCase().includes(q));
    }
    if (selectedGenre) {
      result = result.filter((item) => {
        const meta = item as any;
        return meta.Genre?.some((g: any) => g.tag === selectedGenre);
      });
    }
    setFilteredItems(result);
  }, [searchQuery, selectedGenre, allItems]);

  const genreFilterOptions: FilterOption[] = genres.map((g) => ({
    id: g.title,
    label: g.title,
  }));

  type LibraryGridItem = VirtualGridItem & { _item: PlexMediaItem };

  const gridItems: LibraryGridItem[] = filteredItems.map((item) => ({
    id: item.ratingKey,
    _item: item,
  }));

  const isFiltering = !!(searchQuery || selectedGenre);

  const renderCard = useCallback(
    (gridItem: LibraryGridItem) => (
      <PosterCard
        item={gridItem._item}
        onClick={() => navigate(`/details/${gridItem._item.ratingKey}`)}
      />
    ),
    [navigate],
  );

  return (
    <FocusContext.Provider value={pageFocusKey}>
      <div ref={pageRef} className="tv-container pt-nav">
        <TopNav />
        <h1 className="library-title" style={{ margin: "20px 80px 0" }}>
          {type === "movie" ? "Movies" : "TV Shows"}
        </h1>

      <div className="library-filters">
        <input
          type="text"
          className="search-input library-search"
          placeholder={`Search ${type === "movie" ? "movies" : "shows"}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        {genreFilterOptions.length > 0 && (
          <FilterBar
            options={genreFilterOptions}
            activeId={selectedGenre}
            onSelect={setSelectedGenre}
          />
        )}
      </div>

      {loading ? (
        <div style={{ padding: "0 80px" }}>
          <SkeletonRow count={6} variant="poster" />
          <SkeletonRow count={6} variant="poster" />
        </div>
      ) : !flixor.isPlexAuthenticated ? (
        <div style={{ padding: "0 80px" }}>
          <SectionBanner
            title="Connect Your Plex Server"
            message="Link your Plex account to browse your library."
            cta="Go to Settings"
            to="/settings"
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)", fontSize: "24px" }}>
          No results found
        </div>
      ) : (
        <div style={{ padding: "0 80px 100px", flex: 1 }}>
          <VirtualGrid<LibraryGridItem>
            items={gridItems}
            render={renderCard}
            hasMore={!isFiltering && hasMore}
            loadMore={!isFiltering ? loadMore : undefined}
          />
        </div>
      )}
      </div>
    </FocusContext.Provider>
  );
}
