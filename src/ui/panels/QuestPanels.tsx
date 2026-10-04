import { useState } from 'react';
import { itemById } from '../../data/items';
import { QUESTS } from '../../data/quests';
import { ROOM_LEVELS } from '../../data/room';
import type { QuestDef, Reward } from '../../data/types';
import { useGame } from '../../store/gameStore';
import { isQuestAvailable } from '../../store/questEngine';
import { Panel, Progress, Tabs } from './Panel';

type TerminalTab = 'story' | 'daily' | 'weekly' | 'exploration' | 'events' | 'residence';

export function rewardText(r: Reward) {
  const parts: string[] = [];
  if (r.energy) parts.push(`⚡ ${r.energy}`);
  if (r.xp) parts.push(`⭐ ${r.xp} XP`);
  for (const it of r.items ?? []) parts.push(it.id.startsWith('skin_') ? '👕 Skin' : `${itemById(it.id)?.icon ?? ''} ${itemById(it.id)?.name ?? it.id}`);
  return parts.join('  ·  ');
}

function QuestRow({ q }: { q: QuestDef }) {
  const s = useGame();
  const st = s.quests[q.id];
  const available = isQuestAvailable(q, s);
  const lockedReason = !st && !available ? (q.requiresFlag === 'crystalPlaced' && s.quests[q.requires?.[0] ?? '']?.status === 'completed' ? 'Place the Energy Crystal on your Trophy Shelf' : 'Requires previous story chapter') : null;
  const isGiverQuest = q.giver && !st;
  return (
    <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <div className="big-ico" style={{ width: 56, height: 56, fontSize: 26, flex: 'none' }}>
        {q.type === 'story' ? '📖' : q.type === 'daily' ? '☀️' : q.type === 'secret' ? '🗝️' : '🧭'}
      </div>
      <div style={{ flex: 1 }}>
        <div className="row">
          <span className="name">{q.title}</span>
          <span className="badge">{q.type.toUpperCase()}</span>
          <span className="badge gray">{q.city.toUpperCase()}</span>
        </div>
        <div className="desc">{q.description}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          Reward: <span className="price">{rewardText(q.reward)}</span>
        </div>
        {lockedReason && <div style={{ fontSize: 12, color: '#ff9d7a', marginTop: 2 }}>🔒 {lockedReason}</div>}
      </div>
      <div>
        {st?.status === 'completed' ? (
          <span className="badge green">COMPLETED</span>
        ) : st?.status === 'active' ? (
          <button className="btn cyan" disabled={s.trackedQuest === q.id} onClick={() => s.trackQuest(q.id)}>
            {s.trackedQuest === q.id ? 'Tracking' : 'Track'}
          </button>
        ) : available && !isGiverQuest ? (
          <button className="btn primary" onClick={() => s.acceptQuest(q.id)}>
            ACCEPT
          </button>
        ) : available && isGiverQuest ? (
          <span className="badge gold" title="Talk to the quest giver in the city">
            TALK TO RIO TECHNICIAN
          </span>
        ) : (
          <span className="badge gray">LOCKED</span>
        )}
      </div>
    </div>
  );
}

/** Screen 8: Quest Terminal (TZ §23) — also manages residence upgrades (TZ §33). */
export function QuestTerminal() {
  const [tab, setTab] = useState<TerminalTab>('story');
  const list = QUESTS.filter((q) =>
    tab === 'story' ? q.type === 'story' : tab === 'daily' ? q.repeat === 'daily' : tab === 'exploration' ? ['exploration', 'secret', 'parkour'].includes(q.type) : false,
  );
  return (
    <Panel title="Quest Terminal" icon="📜">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'story', label: 'Story' },
          { id: 'daily', label: 'Daily' },
          { id: 'weekly', label: 'Weekly' },
          { id: 'exploration', label: 'Exploration' },
          { id: 'events', label: 'Events' },
          { id: 'residence', label: '🏠 Residence' },
        ]}
      />
      {tab === 'residence' ? (
        <Residence />
      ) : list.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {list.map((q) => (
            <QuestRow key={q.id} q={q} />
          ))}
          {tab === 'daily' && <div className="muted" style={{ fontSize: 12 }}>Daily quests reset every day (UTC). Energy Orbs respawn too.</div>}
        </div>
      ) : (
        <div className="muted" style={{ padding: 24, textAlign: 'center' }}>
          {tab === 'weekly' ? 'Weekly quests unlock with the next Rio update.' : 'SAI FEST RIO event quests will appear here when the event starts.'}
        </div>
      )}
    </Panel>
  );
}

function Residence() {
  const room = useGame((s) => s.room);
  const energy = useGame((s) => s.saiEnergy);
  const upgrade = useGame((s) => s.upgradeRoom);
  const toast = useGame((s) => s.toast);
  const cur = ROOM_LEVELS.find((l) => l.level === room.level)!;
  const next = ROOM_LEVELS.find((l) => l.level === room.level + 1);
  return (
    <div>
      <div className="row" style={{ gap: 16, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {ROOM_LEVELS.map((l) => (
          <div key={l.level} className={`card ${l.level === room.level ? 'selected' : ''}`} style={{ flex: '1 1 160px', opacity: l.level > room.level + 1 ? 0.5 : 1 }}>
            <div className="name">{l.name}</div>
            <div className="desc">{l.slots} furniture slots{l.level >= 2 ? ' · energy floor lights' : ''}{l.level >= 3 ? ' · gold ceiling' : ''}{l.level >= 4 ? ' · personal portal (soon)' : ''}</div>
            {l.level <= room.level ? <span className="badge green">UNLOCKED</span> : <span className="price">⚡ {l.cost}</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        Current: <b>{cur.name}</b>
      </div>
      {next ? (
        <button
          className="btn primary"
          style={{ marginTop: 10 }}
          disabled={energy < next.cost}
          onClick={() => upgrade(next.cost) && toast(`Upgraded to ${next.name}!`, '🏠')}
        >
          Upgrade to {next.name} · ⚡ {next.cost}
        </button>
      ) : (
        <div className="muted">Maximum level reached.</div>
      )}
    </div>
  );
}

/** Tab: quest journal with active objectives and unlocked lore. */
export function QuestJournal() {
  const s = useGame();
  const active = QUESTS.filter((q) => s.quests[q.id]?.status === 'active');
  const done = QUESTS.filter((q) => s.quests[q.id]?.status === 'completed');
  return (
    <Panel title="Quest Journal" icon="📖">
      <h3 style={{ marginTop: 0 }}>Active</h3>
      {active.length === 0 && <div className="muted">No active quests. Visit a Quest Terminal or talk to NPCs with a ❗ marker.</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {active.map((q) => {
          const st = s.quests[q.id];
          const obj = q.objectives[st.step];
          return (
            <div key={q.id} className={`card ${s.trackedQuest === q.id ? 'selected' : ''}`}>
              <div className="row">
                <span className="name">{q.title}</span>
                <span className="badge">{q.type.toUpperCase()}</span>
                <button className="btn" style={{ marginLeft: 'auto', padding: '6px 12px' }} onClick={() => s.trackQuest(q.id)}>
                  {s.trackedQuest === q.id ? '★ Tracked' : 'Track'}
                </button>
              </div>
              <div className="desc">
                ➜ {obj.label} {obj.count && obj.count > 1 ? `(${st.count}/${obj.count})` : ''}
              </div>
              <Progress value={st.step / q.objectives.length} />
            </div>
          );
        })}
      </div>
      <h3>Completed</h3>
      {done.length === 0 && <div className="muted">Nothing yet — the adventure is just beginning.</div>}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {done.map((q) => (
          <span key={q.id} className="badge green">
            ✓ {q.title}
          </span>
        ))}
      </div>
      {s.lore.length > 0 && (
        <>
          <h3>Lore</h3>
          {s.lore.map((l, i) => (
            <div key={i} className="lore" style={{ textAlign: 'left' }}>
              “{l}”
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}
