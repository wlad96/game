import { useState } from 'react';
import { ITEMS, RARITY_COLOR, SKINS } from '../../data/items';
import { useGame } from '../../store/gameStore';
import { Panel, Tabs } from './Panel';

type ShopTab = 'skins' | 'room' | 'pets' | 'vehicles' | 'emotes' | 'effects' | 'pass';

/** Shop (TZ §44). Monetisation is visual only — no stat boosts for money. */
export function ShopPanel() {
  const [tab, setTab] = useState<ShopTab>('skins');
  const s = useGame();
  const cat = tab === 'room' ? 'furniture' : tab === 'pets' ? 'pet' : tab === 'vehicles' ? 'vehicle' : null;
  return (
    <Panel title="Shop" icon="🛍️">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'skins', label: 'Sai Skins' },
            { id: 'room', label: 'Room' },
            { id: 'pets', label: 'Pets' },
            { id: 'vehicles', label: 'Vehicles' },
            { id: 'emotes', label: 'Emotes' },
            { id: 'effects', label: 'Effects' },
            { id: 'pass', label: 'Season Pass' },
          ]}
        />
        <b className="price">⚡ {s.saiEnergy}</b>
      </div>
      {tab === 'skins' && (
        <div className="grid">
          {SKINS.map((sk) => {
            const owned = s.skins.includes(sk.id);
            const lockedLevel = sk.minLevel && s.level < sk.minLevel;
            return (
              <div key={sk.id} className="card">
                <div className="swatch" style={{ background: `linear-gradient(135deg, ${sk.suit} 0 55%, ${sk.trim} 55% 75%, ${sk.gloves} 75%)` }} />
                <div className="name">{sk.name}</div>
                <div className="desc">{sk.source}</div>
                {owned ? (
                  <button className="btn" disabled={s.equippedSkin === sk.id} onClick={() => s.equipSkin(sk.id)}>
                    {s.equippedSkin === sk.id ? 'Equipped' : 'Equip'}
                  </button>
                ) : sk.price ? (
                  <button className="btn primary" disabled={!!lockedLevel || s.saiEnergy < sk.price} onClick={() => s.buy(`skin_${sk.id}`, sk.price!)}>
                    {lockedLevel ? `Level ${sk.minLevel}` : `⚡ ${sk.price}`}
                  </button>
                ) : (
                  <span className="badge gray">{sk.nftOnly ? 'NFT HOLDERS' : 'QUEST REWARD'}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {cat && (
        <div className="grid">
          {ITEMS.filter((i) => i.category === cat && i.price).map((it) => {
            const owned = s.inventory[it.id] ?? 0;
            const single = it.category !== 'furniture';
            return (
              <div key={it.id} className="card" style={{ borderColor: RARITY_COLOR[it.rarity] + '66' }}>
                <div className="big-ico">{it.icon}</div>
                <div className="name">{it.name}</div>
                <div className="desc">{it.description}</div>
                {single && owned ? (
                  <span className="badge green">OWNED</span>
                ) : (
                  <button className="btn primary" disabled={s.saiEnergy < it.price!} onClick={() => s.buy(it.id, it.price!)}>
                    ⚡ {it.price} {owned ? `(have ${owned})` : ''}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab === 'emotes' && (
        <div className="grid">
          {[
            ['👋', 'Wave', '1'],
            ['🎉', 'Celebrate', '2'],
            ['🪑', 'Sit', '3'],
            ['🕺', 'Dance', '4'],
          ].map(([i, n, k]) => (
            <div key={n} className="card">
              <div className="big-ico">{i}</div>
              <div className="name">{n}</div>
              <span className="badge green">OWNED · key {k}</span>
            </div>
          ))}
        </div>
      )}
      {tab === 'effects' && <div className="muted" style={{ padding: 24, textAlign: 'center' }}>Trails and auras arrive with the Season Pass.</div>}
      {tab === 'pass' && (
        <div className="card">
          <div className="name">Season 1 Premium Pass</div>
          <div className="desc">Extra cosmetics, rare furniture, pets, effects and bonus quest lines. The story is always free.</div>
          <button className="btn" onClick={() => s.openPanel('season')}>
            View tiers
          </button>
        </div>
      )}
    </Panel>
  );
}
