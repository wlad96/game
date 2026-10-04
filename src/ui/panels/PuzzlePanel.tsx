import { useMemo, useState } from 'react';
import { tr } from '../../i18n';
import { play } from '../../audio/sfx';
import { E, generatePuzzle, isNode, isSolved, N, poweredTiles, rotateTile, S, W } from '../../game/puzzle';
import { useGame, type PuzzleArgs } from '../../store/gameStore';
import { Panel } from './Panel';

function Tile({ mask, powered, source, node }: { mask: number; powered: boolean; source: boolean; node: boolean }) {
  const c = powered ? '#59e6ff' : '#4a5878';
  const seg = (on: boolean, x2: number, y2: number) => on && <line x1={50} y1={50} x2={x2} y2={y2} stroke={c} strokeWidth={14} strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 100 100">
      {seg(!!(mask & N), 50, 0)}
      {seg(!!(mask & E), 100, 50)}
      {seg(!!(mask & S), 50, 100)}
      {seg(!!(mask & W), 0, 50)}
      {source ? (
        <circle cx={50} cy={50} r={22} fill="#ffcf5a" stroke="#fff" strokeWidth={4} />
      ) : node ? (
        <circle cx={50} cy={50} r={16} fill={powered ? '#59e6ff' : '#1b2236'} stroke={c} strokeWidth={5} />
      ) : (
        <circle cx={50} cy={50} r={8} fill={c} />
      )}
    </svg>
  );
}

/** Screen 9: Energy Network / Artifact Decoding mini-game. */
export function PuzzlePanel() {
  const args = useGame((s) => s.panelArg) as PuzzleArgs;
  const initial = useMemo(() => generatePuzzle(args.size, args.seed), [args.size, args.seed]);
  const [p, setP] = useState(initial);
  const [moves, setMoves] = useState(0);
  const powered = poweredTiles(p);
  const solved = isSolved(p);
  const nodes = p.tiles.filter(isNode).length;
  const lit = p.tiles.filter((m, i) => isNode(m) && powered.has(i)).length;

  const finish = () => {
    const g = useGame.getState();
    g.closePanel();
    if (args.target === 'beacon3') {
      g.setFlag('beacon3');
      g.setFlag('rioRestored');
      play('beacon');
      g.questEvent({ type: 'puzzle', target: 'beacon3' });
      g.toast(tr('Rio network restored — the whole city glows!'), '✨', 'reward');
    } else if (args.target === 'artifact_station') {
      const inv = { ...g.inventory };
      if (inv.ancient_artifact) inv.ancient_artifact -= 1;
      useGame.setState({ inventory: inv });
      g.questEvent({ type: 'puzzle', target: 'artifact_station' });
    }
  };

  return (
    <Panel title={tr(args.title)} icon="🧩" narrow>
      <div className="muted" style={{ textAlign: 'center', marginBottom: 10, fontSize: 14 }}>
        {tr('Click tiles to rotate them. Connect every energy node to the golden core.')}
      </div>
      <div className="net" style={{ gridTemplateColumns: `repeat(${p.size}, 1fr)` }}>
        {p.tiles.map((m, i) => (
          <button
            key={i}
            disabled={solved}
            onClick={() => {
              play('click');
              const next = rotateTile(p, i);
              setP(next);
              setMoves(moves + 1);
              if (isSolved(next)) play('quest');
            }}
            style={{ borderColor: powered.has(i) ? 'rgba(89,230,255,0.6)' : undefined }}
          >
            <Tile mask={m} powered={powered.has(i)} source={i === p.source} node={isNode(m)} />
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
        <span className="muted">
          {tr('Nodes lit')}: <b style={{ color: 'var(--cyan)' }}>{lit}/{nodes}</b> · {tr('moves')} {moves}
        </span>
        {solved ? (
          <button className="btn primary" onClick={finish}>
            {args.target === 'beacon3' ? tr('Restore Network ⚡') : tr('Artifact Restored ✓')}
          </button>
        ) : (
          <button className="btn" onClick={() => { setP(initial); setMoves(0); }}>
            {tr('Reset')}
          </button>
        )}
      </div>
    </Panel>
  );
}

