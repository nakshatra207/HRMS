import React from 'react';

const TILES = [
  { key: 'total', label: 'Total' },
  { key: 'Applied', label: 'Applied' },
  { key: 'Interview', label: 'Interview' },
  { key: 'Selected', label: 'Selected' },
  { key: 'Rejected', label: 'Rejected' },
];

export default function Dashboard({ stats }) {
  return (
    <section className="dashboard" aria-label="Application statistics">
      {TILES.map((tile, i) => (
        <div className={`stat-tile stat-${tile.key.toLowerCase()}`} key={tile.key}>
          <span className="stat-index">{String(i + 1).padStart(2, '0')}</span>
          <span className="stat-value">{stats[tile.key] ?? 0}</span>
          <span className="stat-label">{tile.label}</span>
        </div>
      ))}
    </section>
  );
}
