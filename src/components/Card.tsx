import type { ReactNode } from "react";
import "../styles/card.css";

interface CardProps {
  title: string;
  sub?: string;
  children: ReactNode;
}

/** A titled panel holding one chart or list. */
export function Card({ title, sub, children }: CardProps) {
  return (
    <section className="card">
      <header className="card-head">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </header>
      {children}
    </section>
  );
}
