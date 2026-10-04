import { itemById, skinById } from '../data/items';
import { tr } from '../i18n';
import { useGame } from '../store/gameStore';

/** Screen 6: big, satisfying reward screen (TZ §17). */
export function RewardModal() {
  const reward = useGame((s) => s.reward);
  const close = useGame((s) => s.closeReward);
  if (!reward) return null;
  const r = reward.reward;
  const main = r.items?.[0];
  const mainIcon = main ? (main.id.startsWith('skin_') ? '👕' : itemById(main.id)?.icon) : '⚡';
  return (
    <div className="overlay" style={{ zIndex: 15 }}>
      <div className="reward glass">
        <div className="muted" style={{ fontWeight: 700 }}>{tr(reward.subtitle)}</div>
        <h1>{tr(reward.title)}</h1>
        <div className="gem">{mainIcon}</div>
        <div className="reward-items">
          {r.energy ? (
            <div className="reward-item">
              <div className="i">⚡</div>+{r.energy} {tr('SAI Energy')}
            </div>
          ) : null}
          {r.xp ? (
            <div className="reward-item">
              <div className="i">⭐</div>+{r.xp} XP
            </div>
          ) : null}
          {r.items?.map((it) => {
            const skin = it.id.startsWith('skin_') ? skinById(it.id.slice(5)) : null;
            const def = itemById(it.id);
            return (
              <div key={it.id} className="reward-item" style={{ borderColor: 'rgba(181,123,255,0.6)' }}>
                <div className="i">{skin ? '👕' : def?.icon}</div>
                {skin ? tr('Skin: {name}', { name: tr(skin.name) }) : tr(def?.name ?? '')}
                {def && <div className="muted" style={{ fontSize: 10, textTransform: 'capitalize' }}>{tr(def.rarity)} · {tr(def.category)}</div>}
              </div>
            );
          })}
        </div>
        {r.cityProgress ? <div style={{ color: 'var(--gold)', fontWeight: 800 }}>{tr('City Progress')} +{r.cityProgress}%</div> : null}
        {reward.levelUp ? <div style={{ color: 'var(--cyan)', fontWeight: 800, marginTop: 4 }}>{tr('LEVEL UP')} → {reward.levelUp}</div> : null}
        {reward.lore && <div className="lore">“{tr(reward.lore)}”</div>}
        <button className="btn primary" style={{ width: '100%', marginTop: 8 }} onClick={close}>
          {tr('Continue')}
        </button>
      </div>
    </div>
  );
}
