import { useState } from 'react';
import { tr } from '../../i18n';
import { questById } from '../../data/quests';
import { player, playerCommands } from '../../game/runtime';
import { HOME_POIS } from '../../game/scenes/homeLayout';
import { RIO_BOUNDS, RIO_FAST_TRAVEL_POINTS, RIO_POIS, RIO_ZONES, STREET } from '../../game/scenes/rioLayout';
import { activeObjective, useGame } from '../../store/gameStore';
import { rewardText } from './QuestPanels';
import { Panel } from './Panel';

interface Sel {
  label: string;
  description?: string;
  icon: string;
  fastTravel?: string;
  reward?: string;
}

/** Screen 14: city map with clickable markers and fast travel (TZ §35–36). */
export function MapPanel() {
  const scene = useGame((s) => s.scene);
  return scene === 'home' ? <HomeMap /> : <RioMap />;
}

function RioMap() {
  const s = useGame();
  const [sel, setSel] = useState<Sel | null>(null);
  const { minX, maxX, minZ, maxZ } = RIO_BOUNDS;
  const tracked = s.trackedQuest ?? 'rio_energy_01';
  const target = activeObjective(s, tracked)?.poi;
  const inRio = s.scene === 'rio';

  const travel = (id: string) => {
    const f = RIO_FAST_TRAVEL_POINTS.find((p) => p.id === id)!;
    s.closePanel();
    if (inRio) {
      playerCommands.teleport = { x: f.x, y: f.y, z: f.z, yaw: f.yaw };
      s.toast(tr('Fast travel: {name}', { name: tr(f.name) }), '📍', 'quest');
    } else s.goTo('rio', `ft:${id}`, 'fade');
  };

  return (
    <Panel title="Rio de Janeiro — Map" icon="🗺️">
      <div className="map-wrap">
        <svg className="map-svg" viewBox={`${minX} ${minZ} ${maxX - minX} ${maxZ - minZ + 22}`}>
          <rect x={minX} y={minZ} width={maxX - minX} height={STREET.north - minZ} fill="#5d8a58" />
          {[...RIO_ZONES].reverse().map((z) => (
            <g key={z.id}>
              <rect x={z.x0} y={z.z0} width={z.x1 - z.x0} height={z.z1 - z.z0} rx={4} fill={z.color} opacity={0.85} />
              <text
                x={(z.x0 + z.x1) / 2}
                y={z.z0 + 8}
                fontSize={6}
                textAnchor="middle"
                fill="#1b2236"
                fontWeight={700}
                {...(tr(z.name).length * 3.3 > z.x1 - z.x0 - 4 ? { textLength: z.x1 - z.x0 - 4, lengthAdjust: 'spacingAndGlyphs' } : {})}
              >
                {tr(z.name)}
              </text>
            </g>
          ))}
          <rect x={minX} y={STREET.beach + 12} width={maxX - minX} height={30} fill="#2aa3c4" />
          {RIO_FAST_TRAVEL_POINTS.map((f) => {
            const found = s.fastTravel.includes(f.id);
            return (
              <g key={f.id} className="poi" onClick={() => setSel({ label: `Fast Travel: ${tr(f.name)}`, icon: '📍', description: found ? 'Discovered.' : 'Find this point in the city to unlock it.', fastTravel: found ? f.id : undefined })}>
                <circle cx={f.x + 2.5} cy={f.z} r={4} fill={found ? '#59e6ff' : '#6f7d95'} stroke="#fff" strokeWidth={1} />
              </g>
            );
          })}
          {RIO_POIS.map((p) => (
            <g
              key={p.id}
              className="poi"
              onClick={() => {
                const q = target === p.id ? questById(tracked) : null;
                setSel({ label: p.label, icon: p.icon, description: p.description, reward: q ? rewardText(q.reward) : undefined });
              }}
            >
              {target === p.id && <circle cx={p.x} cy={p.z} r={9} fill="none" stroke="#ffcf5a" strokeWidth={2} />}
              <text x={p.x} y={p.z + 3} fontSize={10} textAnchor="middle">
                {p.icon}
              </text>
            </g>
          ))}
          {inRio && (
            <g transform={`translate(${player.pos.x} ${player.pos.z}) rotate(${(-player.facing * 180) / Math.PI + 180})`}>
              <path d="M0 -7 L5 5 L0 2 L-5 5 Z" fill="#fff" stroke="#0b1530" strokeWidth={1.2} />
            </g>
          )}
        </svg>
        <div>
          {sel ? (
            <div className="card">
              <div className="big-ico">{sel.icon}</div>
              <div className="name">{tr(sel.label)}</div>
              <div className="desc">{tr(sel.description ?? '')}</div>
              {sel.reward && (
                <div style={{ fontSize: 13 }}>
                  {tr('Reward')}: <span className="price">{sel.reward}</span>
                </div>
              )}
              {sel.fastTravel && (
                <button className="btn cyan" onClick={() => travel(sel.fastTravel!)}>
                  {tr('Fast travel')}
                </button>
              )}
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              {tr('Click a marker for details. Gold ring = current quest target. Blue pins = discovered fast travel points ({a}/{b}).', {
                a: s.fastTravel.length,
                b: RIO_FAST_TRAVEL_POINTS.length,
              })}
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 12 }} className="muted">
            {!inRio && 'You are in your apartment. Fast travel takes you back to the streets.'}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function HomeMap() {
  const [sel, setSel] = useState<(typeof HOME_POIS)[number] | null>(null);
  return (
    <Panel title="Sai Home Planet — Map" icon="🗺️">
      <div className="map-wrap">
        <svg className="map-svg" viewBox="-50 -50 100 100" style={{ background: '#2a7fa0' }}>
          <circle cx={0} cy={0} r={46} fill="#e9eef6" />
          <circle cx={0} cy={-6} r={9} fill="#cfe0f5" />
          {HOME_POIS.map((p) => (
            <text key={p.id} x={p.x} y={p.z + 2} fontSize={6} textAnchor="middle" className="poi" onClick={() => setSel(p)}>
              {p.icon}
            </text>
          ))}
          <g transform={`translate(${player.pos.x} ${player.pos.z}) rotate(${(-player.facing * 180) / Math.PI + 180})`}>
            <path d="M0 -3 L2.2 2.2 L0 1 L-2.2 2.2 Z" fill="#1b2236" />
          </g>
        </svg>
        <div>
          {sel ? (
            <div className="card">
              <div className="big-ico">{sel.icon}</div>
              <div className="name">{tr(sel.label)}</div>
            </div>
          ) : (
            <div className="muted">{tr('Click a marker. Portals lead to the cities of the South America season.')}</div>
          )}
        </div>
      </div>
    </Panel>
  );
}
