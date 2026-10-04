import { useState } from 'react';
import { PORTALS } from '../../data/cities';
import { QUESTS } from '../../data/quests';
import type { CityId } from '../../data/types';
import { cityArtUrl } from '../../game/textures';
import { cityAccess } from '../../services/nftAccess';
import { useGame } from '../../store/gameStore';
import { cityProgress } from '../../store/progress';
import { Panel, Progress } from './Panel';

/** Screen 2: portal / city selection (TZ §8). */
export function PortalPanel() {
  const arg = useGame((s) => s.panelArg) as CityId | null;
  const [city, setCity] = useState<CityId>(arg ?? 'rio');
  const s = useGame();
  const p = PORTALS.find((x) => x.city === city)!;
  const access = cityAccess(city, s.wallet.collections);
  const prog = cityProgress(city, s);
  const daily = QUESTS.filter((q) => q.city === city && q.repeat === 'daily');
  const dailyDone = daily.filter((q) => s.quests[q.id]?.status === 'completed').length;
  const open = p.status === 'open';

  return (
    <Panel title="City Portals" icon="🌀">
      <div className="portal-ui">
        <div className="city-list">
          {PORTALS.map((c) => (
            <button key={c.city} className={c.city === city ? 'active' : ''} onClick={() => setCity(c.city)}>
              <img src={cityArtUrl(c.art, c.city)} alt="" />
              <span style={{ flex: 1 }}>{c.name}</span>
              {c.status === 'open' ? <span className="badge green">OPEN</span> : <span className="badge gray">🔒</span>}
            </button>
          ))}
        </div>
        <div className="city-detail">
          <img src={cityArtUrl(p.art, p.city)} alt={p.name} />
          <div>
            <div className="muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>{p.country}</div>
            <h3>{p.name.toUpperCase()}</h3>
            <div style={{ color: 'var(--cyan)', fontWeight: 600, marginBottom: 8 }}>{p.tagline}</div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>{p.description}</div>
            <div className="stat-list">
              <span>Access</span>
              <span>
                {!open ? (
                  <span className="badge gray">COMING SOON</span>
                ) : access === 'full' ? (
                  <span className="badge gold">NFT CITY ACCESS · FULL</span>
                ) : access === 'visitor' ? (
                  <span className="badge green">VISITOR ACCESS</span>
                ) : (
                  <span className="badge gray">CITY LOCKED</span>
                )}
              </span>
              {open && (
                <>
                  <span>Story progress</span>
                  <b>{prog.percent}%</b>
                  <span>Daily quests</span>
                  <b>
                    {dailyDone}/{daily.length}
                  </b>
                  <span>Secrets</span>
                  <b>
                    {prog.secrets}/{prog.secretsTotal}
                  </b>
                </>
              )}
              <span>Rewards</span>
              <span style={{ textAlign: 'right' }}>{p.rewards.join(' · ')}</span>
            </div>
            {open && <Progress value={prog.percent / 100} />}
            {open && access === 'visitor' && (
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                Visitors can play the whole story. Rio NFT holders also unlock the Carnival Plaza, the Rio Sai skin and an NFT trophy.
              </div>
            )}
            <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn primary" disabled={!open || !p.scene} onClick={() => s.goTo(p.scene!, 'portal', 'warp')} style={{ minWidth: 180 }}>
                {open ? 'ENTER CITY' : 'LOCKED'}
              </button>
              {access !== 'full' && open && (
                <button className="btn" onClick={() => s.openPanel('wallet')}>
                  Explore NFT access
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
