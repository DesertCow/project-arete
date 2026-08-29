// Pure-CSS shimmer placeholders — no skeleton library.
export function SkeletonBlock({ height = '1rem', width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function SkeletonLines({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === count - 1 ? '60%' : '100%' }}
        />
      ))}
    </>
  );
}

export function SkeletonCards({ count = 4, className }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}
