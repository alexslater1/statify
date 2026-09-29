import "../styles/flag.css";

/** A warning that goes above what it's about, not in a footnote. */
export function Flag({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flag" role="note">
      <span className="flag-icon" aria-hidden="true">
        !
      </span>
      <div>
        <strong>{title}</strong>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
