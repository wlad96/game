import { ITEMS, itemById } from '../../data/items';
import { tr } from '../../i18n';
import { TROPHY_SLOTS } from '../../data/room';
import { useGame } from '../../store/gameStore';
import { Panel } from './Panel';

/** Furniture slot editing (place / rotate / remove) and the Trophy Shelf (TZ §22, §34). */
export function SlotPanel() {
  const arg = useGame((s) => s.panelArg) as { kind: 'furniture' | 'trophy'; slot?: string };
  return arg.kind === 'trophy' ? <TrophyShelf /> : <FurnitureSlot slot={arg.slot!} />;
}

function FurnitureSlot({ slot }: { slot: string }) {
  const s = useGame();
  const placed = s.room.slots[slot];
  const owned = ITEMS.filter((i) => i.category === 'furniture' && (s.inventory[i.id] ?? 0) > 0);
  return (
    <Panel title="Furniture Slot" icon="🛋️" narrow>
      {placed && (
        <div className="card selected" style={{ marginBottom: 12 }}>
          <div className="row">
            <span style={{ fontSize: 28 }}>{itemById(placed.item)?.icon}</span>
            <span className="name" style={{ flex: 1 }}>{itemById(placed.item)?.name}</span>
            <button className="btn" onClick={() => s.rotateFurniture(slot)}>{tr('⟳ Rotate')}</button>
            <button className="btn" onClick={() => s.placeFurniture(slot, null)}>{tr('Remove')}</button>
          </div>
        </div>
      )}
      <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>{tr('Place from inventory:')}</div>
      {owned.length ? (
        <div className="grid">
          {owned.map((it) => (
            <div key={it.id} className="card">
              <div className="big-ico">{it.icon}</div>
              <div className="name">{tr(it.name)}</div>
              <button className="btn primary" onClick={() => { s.placeFurniture(slot, it.id); s.closePanel(); }}>
                {tr('Place')} (×{s.inventory[it.id]})
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{tr('No furniture in your inventory.')}</span>
          <button className="btn cyan" onClick={() => s.openPanel('shop')}>{tr('Open Shop')}</button>
        </div>
      )}
    </Panel>
  );
}

function TrophyShelf() {
  const s = useGame();
  const trophies = ITEMS.filter((i) => (i.category === 'trophy' || i.category === 'artifact') && i.id !== 'ancient_artifact' && (s.inventory[i.id] ?? 0) > 0);
  return (
    <Panel title="Trophy Shelf" icon="🏆" narrow>
      <div style={{ display: 'grid', gap: 10 }}>
        {TROPHY_SLOTS.map((t, idx) => {
          const item = s.room.trophies[t];
          return (
            <div key={t} className={`card ${item ? 'selected' : ''}`}>
              <div className="row">
                <b>Shelf {idx + 1}</b>
                <span style={{ fontSize: 24 }}>{item ? itemById(item)?.icon : '—'}</span>
                <span style={{ flex: 1 }}>{item ? itemById(item)?.name : <span className="muted">{tr('empty')}</span>}</span>
                {item && <button className="btn" onClick={() => s.placeTrophy(t, null)}>{tr('Take back')}</button>}
              </div>
              {!item && trophies.length > 0 && (
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {trophies.map((it) => (
                    <button key={it.id} className="btn primary" onClick={() => s.placeTrophy(t, it.id)}>
                      {it.icon} {tr('Place')} {tr(it.name)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {trophies.length === 0 && <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>{tr('Complete quests to earn trophies like the Rio Energy Crystal.')}</div>}
    </Panel>
  );
}
