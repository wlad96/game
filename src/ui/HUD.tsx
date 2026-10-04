import { useEffect, useRef, useState } from 'react';
import { setAudioSettings, setMusic, unlockAudio } from '../audio/sfx';
import { portalByCity, SEASON } from '../data/cities';
import { questById } from '../data/quests';
import { attachKeyboard, isTouchDevice } from '../game/input';
import { player, playerCommands, type AnimState } from '../game/runtime';
import { sceneLoaders } from '../game/GameCanvas';
import { RIO_ZONES } from '../game/scenes/rioLayout';
import { cityArtUrl } from '../game/textures';
import { useGame, type PanelId } from '../store/gameStore';
import { xpToNext } from '../store/questEngine';
import { Dialog } from './Dialog';
import { Minimap } from './Minimap';
import { MobileControls } from './MobileControls';
import { PanelRouter } from './panels/PanelRouter';
import { RewardModal } from './RewardModal';

const EMOTES: Record<string, AnimState> = { Digit1: 'wave', Digit2: 'celebrate', Digit3: 'sit', Digit4: 'dance' };

export function HUD() {
  const scene = useGame((s) => s.scene);
  const panel = useGame((s) => s.panel);
  const transition = useGame((s) => s.transition);
  const touch = isTouchDevice();
  const settings = useGame((s) => s.settings);

  // keyboard shortcuts (TZ §3)
  useEffect(
    () =>
      attachKeyboard((code) => {
        const g = useGame.getState();
        unlockAudio();
        if (g.transition) return;
        const toggle = (p: PanelId) => (g.panel === p ? g.closePanel() : g.openPanel(p));
        if (code === 'Escape') {
          if (g.reward) g.closeReward();
          else if (g.panel) g.closePanel();
          else if (g.dialog) g.showDialog(null);
          else g.openPanel('menu');
          return;
        }
        if (g.reward || g.dialog) return;
        if (code === 'KeyM') toggle('map');
        else if (code === 'KeyI') toggle('inventory');
        else if (code === 'Tab') toggle('quests');
        else if (code === 'KeyP') toggle('passport');
        else if (code === 'KeyC') toggle('wardrobe');
        else if (EMOTES[code] && !g.panel) playerCommands.emote = EMOTES[code];
      }),
    [],
  );

  // music per scene
  useEffect(() => {
    setAudioSettings(settings.sound, settings.music);
  }, [settings.sound, settings.music]);
  useEffect(() => {
    if (transition) return;
    setMusic(scene === 'home' ? 'home' : scene === 'rio' ? 'rio' : 'room');
  }, [scene, transition]);
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      setMusic(useGame.getState().scene === 'home' ? 'home' : useGame.getState().scene === 'rio' ? 'rio' : 'room');
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <div className="hud">
      {!transition && (
        <>
          <SceneTitle />
          <TopBar />
          {scene === 'rio' && <Minimap />}
          <LeftMenu />
          <RightColumn />
          <Prompt />
          {!touch && <ControlsHint />}
          <Onboarding />
          {touch && !panel && <MobileControls />}
        </>
      )}
      <Toasts />
      <Dialog />
      <PanelRouter />
      <RewardModal />
      <TransitionOverlay />
    </div>
  );
}

function SceneTitle() {
  const scene = useGame((s) => s.scene);
  const [zone, setZone] = useState('');
  useEffect(() => {
    if (scene !== 'rio') return;
    const id = window.setInterval(() => {
      const z = RIO_ZONES.find((z) => player.pos.x >= z.x0 && player.pos.x <= z.x1 && player.pos.z >= z.z0 && player.pos.z <= z.z1);
      setZone(z?.name ?? 'Streets of Rio');
    }, 500);
    return () => window.clearInterval(id);
  }, [scene]);
  const [title, sub] =
    scene === 'home' ? ['SAI HOME PLANET', 'Central Plaza'] : scene === 'rio' ? ['RIO DE JANEIRO', zone] : ['RIO APARTMENT', 'Your personal residence'];
  return (
    <div className="scene-title glass" style={{ left: scene === 'rio' ? 192 : 12 }}>
      {title}
      <small>{sub}</small>
    </div>
  );
}

function TopBar() {
  const level = useGame((s) => s.level);
  const xp = useGame((s) => s.xp);
  const energy = useGame((s) => s.saiEnergy);
  const name = useGame((s) => s.playerName);
  const wallet = useGame((s) => s.wallet);
  const open = useGame((s) => s.openPanel);
  return (
    <div className="topbar">
      <div className="chip glass profile-chip" onClick={() => open('profile')} style={{ cursor: 'pointer' }}>
        <div className="avatar">Sai</div>
        <div className="meta">
          <div className="name">{name}</div>
          <div className="lvl">Lv. {level}</div>
          <div className="xpbar">
            <div style={{ width: `${(xp / xpToNext(level)) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="chip glass" title="SAI Energy">
        <span>⚡</span>
        <span>{energy.toLocaleString()}</span>
        <button title="Shop" onClick={() => open('shop')} style={{ color: 'var(--cyan)' }}>
          ＋
        </button>
      </div>
      <button className="icon-btn" title="Wallet / NFT access" onClick={() => open('wallet')}>
        {wallet.address ? '🟢' : '👛'}
      </button>
      <button className="icon-btn" title="Menu (Esc)" onClick={() => open('menu')}>
        ☰
      </button>
    </div>
  );
}

const MENU: { id: PanelId; label: string; ico: string; key?: string }[] = [
  { id: 'profile', label: 'Profile', ico: '👤' },
  { id: 'quests', label: 'Quests', ico: '📜', key: 'Tab' },
  { id: 'map', label: 'World Map', ico: '🗺️', key: 'M' },
  { id: 'shop', label: 'Shop', ico: '🛍️' },
  { id: 'inventory', label: 'Inventory', ico: '🎒', key: 'I' },
  { id: 'passport', label: 'Passport', ico: '🛂', key: 'P' },
  { id: 'wardrobe', label: 'Wardrobe', ico: '👕', key: 'C' },
  { id: 'season', label: 'Events', ico: '🏆' },
];

function LeftMenu() {
  const open = useGame((s) => s.openPanel);
  const scene = useGame((s) => s.scene);
  return (
    <div className="leftmenu glass" style={scene === 'rio' ? { top: 248 } : undefined}>
      {MENU.map((m) => (
        <button key={m.id} onClick={() => open(m.id)}>
          <span className="ico">{m.ico}</span>
          <span className="lbl">{m.label}</span>
          {m.key && <kbd>{m.key}</kbd>}
        </button>
      ))}
    </div>
  );
}

function RightColumn() {
  const scene = useGame((s) => s.scene);
  const tracked = useGame((s) => s.trackedQuest);
  const quests = useGame((s) => s.quests);
  const activeId = tracked && quests[tracked]?.status === 'active' ? tracked : Object.keys(quests).find((k) => quests[k].status === 'active');
  if (activeId) return <QuestTracker id={activeId} />;
  if (scene === 'home') return <SeasonCard />;
  return null;
}

function QuestTracker({ id }: { id: string }) {
  const q = useGame((s) => s.quests[id]);
  const flags = useGame((s) => s.flags);
  const def = questById(id);
  const beacons = ['beacon1', 'beacon2', 'beacon3'].filter((b) => flags[b]).length;
  return (
    <div className="tracker glass">
      <h4>
        Current quest · <span style={{ color: def.type === 'story' ? 'var(--gold)' : 'var(--cyan)' }}>{def.type}</span>
      </h4>
      <div className="title">{def.title}</div>
      {def.objectives.map((o, i) => {
        const state = i < q.step ? 'done' : i === q.step ? 'current' : '';
        return (
          <div key={o.id} className={`obj ${state}`}>
            <span className="dot">{state === 'done' ? '✓' : ''}</span>
            <span>{o.label}</span>
            {o.count && o.count > 1 && (
              <span className="count">
                {i < q.step ? o.count : i === q.step ? q.count : 0}/{o.count}
              </span>
            )}
          </div>
        );
      })}
      {id === 'rio_energy_01' && (
        <>
          <div className="meta">
            <span>Restore Energy Beacons</span>
            <b style={{ color: 'var(--gold)' }}>{beacons} / 3</b>
          </div>
          <div className="progress">
            <div style={{ width: `${(beacons / 3) * 100}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

function SeasonCard() {
  const days = Math.max(0, Math.ceil((new Date(SEASON.endsAt).getTime() - Date.now()) / 86400000));
  const open = useGame((s) => s.openPanel);
  return (
    <div className="season-card glass" onClick={() => open('season')} style={{ cursor: 'pointer' }}>
      <img src={cityArtUrl(portalByCity('rio').art, 'rio')} alt="" />
      <div className="inner">
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Current events
        </div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{SEASON.name}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Ends in {days} days
        </div>
      </div>
    </div>
  );
}

function Prompt() {
  const prompt = useGame((s) => s.prompt);
  const blocked = useGame((s) => !!(s.panel || s.dialog || s.reward));
  if (!prompt || blocked) return null;
  return (
    <div className="prompt glass" key={prompt.label}>
      <span className="key">{isTouchDevice() ? '✋' : prompt.key}</span>
      {prompt.label}
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast glass">
          {t.icon && <span style={{ marginRight: 6 }}>{t.icon}</span>}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function ControlsHint() {
  const [open, setOpen] = useState(true);
  if (!open)
    return (
      <button className="icon-btn" style={{ position: 'absolute', left: '50%', bottom: 12 }} onClick={() => setOpen(true)} title="Controls">
        ⌨️
      </button>
    );
  const rows: [string[], string][] = [
    [['W', 'A', 'S', 'D'], 'Move'],
    [['Shift'], 'Run'],
    [['Space'], 'Jump ×2'],
    [['Q'], 'Dash'],
    [['E'], 'Interact'],
    [['F'], 'Hoverboard'],
    [['1-4'], 'Emotes'],
    [['Drag'], 'Camera'],
  ];
  return (
    <div className="controls glass" onClick={() => setOpen(false)} title="Click to hide">
      {rows.map(([keys, label]) => (
        <div key={label} className="pair">
          <span className="k">
            {keys.map((k) => (
              <span key={k} className="key">
                {k}
              </span>
            ))}
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

const ONBOARDING: [string, string][] = [
  ['reachedPortal', 'Walk to the Rio portal'],
  ['jumped', 'Jump (Space)'],
  ['interacted', 'Interact (E)'],
  ['visitedRio', 'Enter Rio'],
  ['done:rio_energy_01', 'Complete your first quest'],
  ['visitedRoom', 'Visit your apartment'],
];

function Onboarding() {
  const flags = useGame((s) => s.flags);
  const setFlag = useGame((s) => s.setFlag);
  if (flags.onboardingHidden) return null;
  const done = ONBOARDING.filter(([f]) => flags[f]).length;
  if (done === ONBOARDING.length) return null;
  return (
    <div className="onboarding glass">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h4>First steps · {done}/{ONBOARDING.length}</h4>
        <button style={{ background: 'none', border: 'none', color: 'var(--muted)' }} onClick={() => setFlag('onboardingHidden')}>
          ✕
        </button>
      </div>
      {ONBOARDING.map(([f, label]) => (
        <div key={f} className={`obj ${flags[f] ? 'done' : ''}`}>
          <span className="dot">{flags[f] ? '✓' : ''}</span>
          {label}
        </div>
      ))}
    </div>
  );
}

const TIPS = [
  'Complete city quests to upgrade your apartment.',
  'Double-jump with Space while in the air — rooftops hide secrets.',
  'Your pet beeps when an Energy Orb is nearby.',
  'Fast travel points unlock once you physically find them.',
  'NFT city access unlocks extra areas and cosmetics — never stats.',
];

/** Screen 3 overlay + fade, and the timing of scene switches. */
function TransitionOverlay() {
  const transition = useGame((s) => s.transition);
  const finish = useGame((s) => s.finishTransition);
  const [progress, setProgress] = useState(0);
  const tip = useRef(TIPS[0]);

  useEffect(() => {
    if (!transition) return;
    tip.current = TIPS[Math.floor(Math.random() * TIPS.length)];
    const minTime = transition.kind === 'warp' ? 3200 : 450;
    const startT = performance.now();
    let loaded = false;
    let raf = 0;
    sceneLoaders[transition.to]().then(() => (loaded = true));
    const tick = () => {
      const t = (performance.now() - startT) / minTime;
      const p = Math.min(loaded ? 1 : 0.92, t);
      setProgress(p);
      if (t >= 1 && loaded) {
        if (transition.to === 'rio-room') useGame.getState().setFlag('visitedRoom');
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transition, finish]);

  if (!transition) return null;
  if (transition.kind === 'fade') return <div className="fade-cover" />;
  const name = transition.to === 'rio' ? 'RIO DE JANEIRO' : transition.to === 'home' ? 'SAI HOME PLANET' : 'RIO APARTMENT';
  return (
    <div className="loading">
      <h1>{name}</h1>
      <div className="muted" style={{ fontWeight: 700, marginTop: 6 }}>
        Loading {transition.to === 'rio' ? 'City' : 'World'}… {Math.round(progress * 100)}%
      </div>
      <div className="bar">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="tip">💡 {tip.current}</div>
    </div>
  );
}
