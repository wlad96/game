import type { ReactNode } from 'react';
import { useGame } from '../../store/gameStore';

export function Panel({ title, children, narrow, icon }: { title: string; children: ReactNode; narrow?: boolean; icon?: string }) {
  const close = useGame((s) => s.closePanel);
  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`panel glass ${narrow ? 'narrow' : ''}`}>
        <div className="panel-head">
          {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
          <h2>{title}</h2>
          <button className="close" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.id} className={`tab ${value === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
