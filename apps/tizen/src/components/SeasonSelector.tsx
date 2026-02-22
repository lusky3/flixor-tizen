import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

export interface SeasonSelectorProps {
  seasons: { key: string; title: string }[];
  activeSeason: string;
  onSeasonChange: (key: string) => void;
}

function SeasonPill({
  season,
  isActive,
  onSelect,
}: {
  season: { key: string; title: string };
  isActive: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });

  return (
    <button
      ref={ref}
      className={`season-item${isActive ? ' active' : ''}${focused ? ' spatial-focused' : ''}`}
      tabIndex={0}
      onClick={onSelect}
    >
      {season.title}
    </button>
  );
}

export function SeasonSelector({ seasons, activeSeason, onSeasonChange }: SeasonSelectorProps) {
  const { ref, focusKey } = useFocusable();

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="seasons-list">
        {seasons.map((s) => (
          <SeasonPill
            key={s.key}
            season={s}
            isActive={activeSeason === s.key}
            onSelect={() => onSeasonChange(s.key)}
          />
        ))}
      </div>
    </FocusContext.Provider>
  );
}
