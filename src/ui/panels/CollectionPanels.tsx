import { useState } from 'react';
import { PORTALS, SEASON } from '../../data/cities';
import { ITEMS, RARITY_COLOR, skinById } from '../../data/items';
import type { ItemCategory, Reward } from '../../data/types';
import { cityArtUrl } from '../../game/textures';
import { cityAccess, shortAddress } from '../../services/nftAccess';
import { useGame } from '../../store/gameStore';
import { cityLevel, cityProgress, COMMUNITY_BASE, COMMUNITY_GOAL } from '../../store/progress';
import { xpToNext } from '../../store/questEngine';
import { Panel, Progress, Tabs } from './Panel';

type InvTab = 'quest' | 'artifact' | 'furniture' | 'cosmetic' | 'pet' | 'vehicle' | 'collectible';

const INV_TABS: { id: InvTab; label: string; cats: ItemCategory[] }[] = [
  { id: 'quest', label: 'Quest Items', cats: ['quest'] },
  { id: 'artifact', label: 'Artifacts & Trophies', cats: ['artifact', 'trophy'] },
  { id: 'furniture', label: 'Furniture', cats: ['furniture'] },
  { id: 'cosmetic', label: 'Cosmetics', cats: ['cosmetic'] },
  { id: 'pet', label: 'Pets', cats: ['pet'] },
  { id: 'vehicle', label: 'Vehicles', cats: ['vehicle'] },
  { id: 'collectible', label: 'Collectibles', cats: ['collectible'] },
];

/** Inventory (TZ §37). */
export function InventoryPanel() {
  const [tab, setTab] = useState<InvTab>('artifact');
  const s = useGame();
  const cats = INV_TABS.find((t) => t.id === tab)!.cats;
  const items = tab === 'cosmetic' ? [] : ITEMS.filter((i) => cats.includes(i.category) && (s.inventory[i.id] ?? 0) > 0);
  return (
    <Panel title="Inventory" icon="🎒">
      <Tabs tabs={INV_TABS} value={tab} onChange={setTab} />
      {tab === 'cosmetic' ? (
        <div className="grid">
          {s.skins.map((id) => {
            const sk = skinById(id);
            return (
              <div key={id} className={`card ${s.equippedSkin === id ? 'selected' : ''}`}>
                <div className="swatch" style={{ background: `linear-gradient(135deg, ${sk.suit}, ${sk.trim})` }} />
                <div className="name">{sk.name}</div>
                <button className="btn" onClick={() => s.equipSkin(id)} disabled={s.equippedSkin === id}>
                  {s.equippedSkin === id ? 'Equipped' : 'Equip'}
                </button>
              </div>
            );
          })}
        </div>
      ) : items.length ? (
        <div className="grid">
          {items.map((it) => (
            <div key={it.id} className="card" style={{ borderColor: RARITY_COLOR[it.rarity] + '66' }}>
              <div className="big-ico">{it.icon}</div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="name">{it.name}</span>
                <b>×{s.inventory[it.id]}</b>
              </div>
              <div style={{ fontSize: 11, color: RARITY_COLOR[it.rarity], textTransform: 'uppercase', fontWeight: 800 }}>{it.rarity}</div>
              <div className="desc">{it.description}</div>
              {it.category === 'pet' && (
                <button className="btn" onClick={() => s.equipPet(s.equippedPet === it.id ? null : it.id)}>
                  {s.equippedPet === it.id ? 'Dismiss' : 'Summon'}
                </button>
              )}
              {it.category === 'vehicle' && (
                <button className="btn" onClick={() => { s.setRiding(!s.riding); s.closePanel(); }}>
                  {s.riding ? 'Dismount' : 'Ride (F)'}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ padding: 24, textAlign: 'center' }}>
          Nothing here yet. {tab === 'furniture' ? 'Placed furniture lives in your apartment.' : 'Explore cities and complete quests!'}
        </div>
      )}
    </Panel>
  );
}

/** Screen 12: Sai Passport (TZ §30–32). */
export function PassportPanel() {
  const s = useGame();
  const totalOrbs = s.totalOrbs;
  const community = (COMMUNITY_BASE + totalOrbs * 5) / COMMUNITY_GOAL;
  const completedCities = PORTALS.filter((p) => cityProgress(p.city, s).completed).length;
  return (
    <Panel title="SAI Passport" icon="🛂">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Region</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>South America</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted" style={{ fontSize: 12 }}>Cities completed</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>
            {completedCities} / {PORTALS.length}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {PORTALS.map((p) => {
          const pr = cityProgress(p.city, s);
          const open = p.status === 'open';
          return (
            <div key={p.city} className="card" style={{ flexDirection: 'row', gap: 14, alignItems: 'center', opacity: open ? 1 : 0.55 }}>
              <img src={cityArtUrl(p.art, p.city)} alt="" style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div className="row">
                  <span className="name" style={{ fontSize: 16 }}>{p.name}</span>
                  {cityAccess(p.city, s.wallet.collections) === 'full' && <span className="badge gold">NFT</span>}
                  {open && <span className="badge">Rio Level {cityLevel(s.cityXp[p.city] ?? 0)}</span>}
                </div>
                {open ? (
                  <>
                    <div className="desc">
                      Completed: <b>{pr.percent}%</b> · {pr.questsDone}/{pr.questsTotal} quests · {pr.secrets}/{pr.secretsTotal} secrets · {pr.viewpoints}/
                      {pr.viewpointsTotal} viewpoints · {pr.fastTravel}/{pr.fastTravelTotal} fast travel
                    </div>
                    <Progress value={pr.percent / 100} />
                    <div className="desc" style={{ marginTop: 4 }}>
                      Stamp needs: story 100% ({pr.storyDone}/{pr.storyTotal}) · exploration 70% · main artifact {pr.artifact ? '✓' : '✗'}
                    </div>
                  </>
                ) : (
                  <div className="desc">Coming later this season</div>
                )}
              </div>
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  border: `3px dashed ${pr.completed ? '#e15554' : 'rgba(255,255,255,0.2)'}`,
                  display: 'grid',
                  placeItems: 'center',
                  transform: 'rotate(-12deg)',
                  fontWeight: 800,
                  fontSize: 11,
                  color: pr.completed ? '#ff7b7b' : 'var(--muted)',
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                }}
              >
                {pr.completed ? `${p.name.split(' ')[0].toUpperCase()}\nCOMPLETED` : 'STAMP'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="name">RIO COMMUNITY LEVEL</span>
          <b style={{ color: 'var(--cyan)' }}>{(community * 100).toFixed(1)}%</b>
        </div>
        <Progress value={community} />
        <div className="desc">
          All explorers together: {(COMMUNITY_BASE + totalOrbs * 5).toLocaleString()} / {COMMUNITY_GOAL.toLocaleString()} Energy collected. At 100% a new
          district of Rio opens for everyone. Your contribution: {totalOrbs} orbs.
        </div>
      </div>
      <div className="card" style={{ marginTop: 10, opacity: 0.7 }}>
        <span className="name">🏔️ South America Final Expedition</span>
        <div className="desc">Unlocks after completing 5 / 5 cities of the region.</div>
      </div>
    </Panel>
  );
}

/** Profile: account level, stats and wallet (TZ §38). */
export function ProfilePanel() {
  const s = useGame();
  const [name, setName] = useState(s.playerName);
  return (
    <Panel title="Profile" icon="👤" narrow>
      <div className="row" style={{ gap: 16 }}>
        <div className="avatar" style={{ width: 72, height: 72, fontSize: 22 }}>
          Sai
        </div>
        <div style={{ flex: 1 }}>
          <input
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => useGame.setState({ playerName: name.trim() || 'Sai Explorer' })}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--line)', borderRadius: 8, color: 'inherit', padding: '6px 10px', font: 'inherit', fontWeight: 800, fontSize: 18, width: '100%' }}
          />
          <div className="muted" style={{ margin: '6px 0' }}>
            Level {s.level} · {s.xp}/{xpToNext(s.level)} XP
          </div>
          <Progress value={s.xp / xpToNext(s.level)} />
        </div>
      </div>
      <div className="stat-list" style={{ marginTop: 16 }}>
        <span>SAI Energy</span>
        <b>⚡ {s.saiEnergy}</b>
        <span>Rio City Level</span>
        <b>{cityLevel(s.cityXp.rio ?? 0)}</b>
        <span>Quests completed</span>
        <b>{Object.values(s.quests).filter((q) => q.status === 'completed').length}</b>
        <span>Energy Orbs collected</span>
        <b>{s.totalOrbs}</b>
        <span>Skins</span>
        <b>{s.skins.length}</b>
        <span>Wallet</span>
        <b>{s.wallet.address ? shortAddress(s.wallet.address) : 'not connected'}</b>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        Levels unlock cosmetics, quests, effects and profile badges. Golden Sai unlocks at level 4.
      </div>
    </Panel>
  );
}

const TIERS: { tier: number; xp: number; free: Reward; freeLabel: string; premium: string }[] = [
  { tier: 1, xp: 100, free: { energy: 50 }, freeLabel: '⚡ 50', premium: '🪴 Golden Plant' },
  { tier: 2, xp: 400, free: { energy: 80 }, freeLabel: '⚡ 80', premium: '✨ Spark Trail' },
  { tier: 3, xp: 900, free: { items: [{ id: 'plant' }] }, freeLabel: '🪴 Tropical Plant', premium: '🐱 Robot Cat' },
  { tier: 4, xp: 1600, free: { energy: 150 }, freeLabel: '⚡ 150', premium: '🛹 Carnival Board Skin' },
  { tier: 5, xp: 2500, free: { items: [{ id: 'lamp' }] }, freeLabel: '💡 Energy Lamp', premium: '👕 Samba Sai' },
];

/** Events & Season Pass (TZ §41–43). Premium track is cosmetic only. */
export function SeasonPanel() {
  const s = useGame();
  let totalXp = s.xp;
  for (let l = 1; l < s.level; l++) totalXp += xpToNext(l);
  const days = Math.max(0, Math.ceil((new Date(SEASON.endsAt).getTime() - Date.now()) / 86400000));
  return (
    <Panel title="Season 1 · South America" icon="🏆">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="muted">Season XP: {totalXp} · ends in {days} days</div>
        <span className="badge purple">PREMIUM PASS · coming soon</span>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {TIERS.map((t) => {
          const reached = totalXp >= t.xp;
          const claimed = s.seasonClaimed.includes(t.tier);
          return (
            <div key={t.tier} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <b style={{ width: 54 }}>Tier {t.tier}</b>
              <span className="muted" style={{ width: 70, fontSize: 12 }}>{t.xp} XP</span>
              <div style={{ flex: 1 }}>
                <div className="name">Free: {t.freeLabel}</div>
                <div className="desc">Premium: {t.premium}</div>
              </div>
              {claimed ? (
                <span className="badge green">CLAIMED</span>
              ) : (
                <button className="btn primary" disabled={!reached} onClick={() => s.claimSeasonTier(t.tier, t.free)}>
                  Claim
                </button>
              )}
            </div>
          );
        })}
      </div>
      <h3>Events</h3>
      <div className="card">
        <div className="name">🎉 SAI FEST RIO</div>
        <div className="desc">Music, lights, decorations and limited-time quests across Rio. Starts soon — watch the Event Portal on the Home Planet.</div>
      </div>
    </Panel>
  );
}
