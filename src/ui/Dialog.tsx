import { useEffect, useState } from 'react';
import { tr } from '../i18n';
import { play } from '../audio/sfx';
import { input } from '../game/input';
import { useGame } from '../store/gameStore';

/** NPC dialogue box, paged line by line. */
export function Dialog() {
  const dialog = useGame((s) => s.dialog);
  const show = useGame((s) => s.showDialog);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [dialog]);
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'KeyE' && e.code !== 'Space') return;
      e.preventDefault();
      // the same key must not also reach the player controller this frame
      input.interact = input.jump = false;
      if (i < dialog.lines.length - 1) setI(i + 1);
      else if (!dialog.actions) show(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, i, show]);
  if (!dialog) return null;
  const last = i >= dialog.lines.length - 1;
  return (
    <div className="dialog glass">
      <div className="portrait">{dialog.portrait}</div>
      <div style={{ flex: 1 }}>
        <div className="who">{tr(dialog.name)}</div>
        <p>{tr(dialog.lines[i])}</p>
        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!last && (
            <button className="btn cyan" onClick={() => { play('click'); setI(i + 1); }}>
              {tr('Next')} ▸
            </button>
          )}
          {last &&
            (dialog.actions ?? [{ label: tr('Close'), onClick: () => show(null), primary: false }]).map((a) => (
              <button key={a.label} className={`btn ${a.primary ? 'primary' : ''}`} onClick={() => { play('click'); a.onClick(); }}>
                {tr(a.label)}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
