interface SkeletonRowProps {
  count?: number;
  variant?: "poster" | "landscape";
}

export function SkeletonRow({ count = 6, variant = "poster" }: SkeletonRowProps) {
  const isPoster = variant === "poster";
  const cardClass = `skeleton-card ${isPoster ? "poster" : "landscape"}`;

  return (
    <section className="tv-row-section">
      <div className="skeleton-title shimmer" />
      <div className="tv-row">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={cardClass}>
            <div className="skeleton-thumb shimmer" />
            <div className="skeleton-label shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}
