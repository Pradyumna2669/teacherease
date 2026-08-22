// Placeholder shown while a page's data is in flight. Mirrors the shape of the
// content it replaces, so the layout does not jump when the real thing lands.
export function SkeletonRows({ rows = 4 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk sk-block" />
      ))}
    </div>
  );
}

export default function Skeleton({ rows = 3 }) {
  return (
    <div className="card wide" aria-busy="true">
      <div className="sk sk-line w40" style={{ height: 24 }} />
      <div className="sk sk-line w60" />
      <div style={{ marginTop: 22 }}>
        <SkeletonRows rows={rows} />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
