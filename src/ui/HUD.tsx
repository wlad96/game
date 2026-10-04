import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { setAudioSettings, setMusic, unlockAudio } from '../audio/sfx';
import { portalByCity, SEASON } from '../data/cities';
import { questById } from '../data/quests';
import { attachKeyboard, isTouchDevice } from '../game/input';
import { player, playerCommands, view, type AnimState } from '../game/runtime';
import { sceneLoaders } from '../game/GameCanvas';
import { RIO_ZONES } from '../game/scenes/rioLayout';
import { cityArtUrl } from '../game/textures';
import { tr } from '../i18n';
import { useGame, type GameState, type PanelId } from '../store/gameStore';
import { xpToNext } from '../store/questEngine';
import { Dialog } from './Dialog';
import { currentGoal, type Goal } from './goal';
import { Minimap } from './Minimap';
import { MobileControls } from './MobileControls';
import { PanelRouter } from './panels/PanelRouter';
import { RewardModal } from './RewardModal';

const EMOTES: Record<string, AnimState> = { Digit1: 'wave', Digit2: 'celebrate', Digit3: 'sit', Digit4: 'dance' };

const musicFor = (scene: string) => (scene === 'home' ? 'home' : scene === 'rio' ? 'rio' : 'room');

export function HUD() {
  const scene = useGame((s) => s.scene);
  const panel = useGame((s) => s.panel);
  const dialog = useGame((s) => !!s.dialog);
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
        else if (code === 'KeyH' || code === 'F1') toggle('help');
        else if (EMOTES[code] && !g.panel) playerCommands.emote = EMOTES[code];
      }),
    [],
  );

  useEffect(() => {
    setAudioSettings(settings.sound, settings.music);
  }, [settings.sound, settings.music]);
  useEffect(() => {
    if (!transition) setMusic(musicFor(scene));
  }, [scene, transition]);
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      setMusic(musicFor(useGame.getState().scene));
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <div className={`hud ${touch ? 'touch' : ''}`}>
      {!transition && (
        <>
          <LocationChip />
          {scene === 'rio' && <Minimap />}
          <Rail />
          <TopBar />
          <ObjectiveBanner />
          <TargetMarker />
          <QuestCard />
          <Prompt />
          {!touch && !panel && !dialog && <HintBar />}
          <Coach />
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

// ───────────────────────── Top-left: where am I ─────────────────────────

function LocationChip() {
  const scene = useGame((s) => s.scene);
  const [zone, setZone] = useState('');
  useEffect(() => {
    if (scene !== 'rio') return;
    const tick = () => {
      const z = RIO_ZONES.find((z) => player.pos.x >= z.x0 && player.pos.x <= z.x1 && player.pos.z >= z.z0 && player.pos.z <= z.z1);
      setZone(tr(z?.name ?? 'Streets of Rio'));
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [scene]);
  const [title, sub] =
    scene === 'home'
      ? [tr('Sai Home Planet'), tr('Central Plaza')]
      : scene === 'rio'
        ? [tr('Rio de Janeiro'), zone]
        : [tr('Rio Apartment'), tr('Your personal residence')];
  return (
    <div className="loc glass">
      <span className="loc-pin">📍</span>
      <div>
        <div className="loc-title">{title}</div>
        <div className="loc-sub">{sub}</div>
      </div>
    </div>
  );
}

// ───────────────────────── Left rail ─────────────────────────

const MENU: { id: PanelId; label: string; ico: string; key?: string }[] = [
  { id: 'quests', label: 'Quests', ico: '📜', key: 'Tab' },
  { id: 'map', label: 'Map', ico: '🗺️', key: 'M' },
  { id: 'inventory', label: 'Inventory', ico: '🎒', key: 'I' },
  { id: 'wardrobe', label: 'Wardrobe', ico: '👕', key: 'C' },
  { id: 'passport', label: 'Passport', ico: '🛂', key: 'P' },
  { id: 'shop', label: 'Shop', ico: '🛍️' },
  { id: 'season', label: 'Events', ico: '🏆' },
  { id: 'help', label: 'Controls', ico: '⌨️', key: 'H' },
];

function Rail() {
  const open = useGame((s) => s.openPanel);
  const scene = useGame((s) => s.scene);
  return (
    <nav className={`rail glass ${scene === 'rio' ? 'below-map' : ''}`} aria-label={tr('Menu')}>
      {MENU.map((m) => (
        <button key={m.id} onClick={() => open(m.id)} aria-label={tr(m.label)}>
          <span className="rail-ico">{m.ico}</span>
          <span className="rail-tip">
            {tr(m.label)}
            {m.key && <kbd>{m.key}</kbd>}
          </span>
        </button>
      ))}
    </nav>
  );
}

// ───────────────────────── Top-right: me ─────────────────────────

function TopBar() {
  const level = useGame((s) => s.level);
  const xp = useGame((s) => s.xp);
  const energy = useGame((s) => s.saiEnergy);
  const name = useGame((s) => s.playerName);
  const wallet = useGame((s) => s.wallet);
  const open = useGame((s) => s.openPanel);
  const need = xpToNext(level);
  return (
    <div className="topbar">
      <button className="me glass" onClick={() => open('profile')} title={tr('Profile')}>
        <span className="avatar">
          Sai
          <span className="lvl-badge">{level}</span>
        </span>
        <span className="me-meta">
          <span className="me-name">{name}</span>
          <span className="xpbar" title={`${xp} / ${need} XP`}>
            <span style={{ width: `${(xp / need) * 100}%` }} />
          </span>
        </span>
      </button>
      <button className="energy glass" onClick={() => open('shop')} title={tr('SAI Energy · open the Shop')}>
        <span className="energy-ico">⚡</span>
        <span className="num">{energy.toLocaleString()}</span>
        <span className="plus">+</span>
      </button>
      <button className="icon-btn glass" title={tr('Wallet / NFT access')} onClick={() => open('wallet')}>
        {wallet.address ? '🟢' : '👛'}
      </button>
      <button className="icon-btn glass" title={tr('Menu (Esc)')} onClick={() => open('menu')}>
        ☰
      </button>
    </div>
  );
}

// ───────────────────────── Objective: what & where ─────────────────────────

function useGoal() {
  return useGame((s) => {
    const g = currentGoal(s);
    return g ? JSON.stringify(g) : '';
  });
}

const distText = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} ${tr('km')}` : `${Math.round(m)} ${tr('m')}`);

function ObjectiveBanner() {
  const raw = useGoal();
  const goal: Goal | null = raw ? JSON.parse(raw) : null;
  const arrow = useRef<HTMLSpanElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  const [flash, setFlash] = useState(0);
  useEffect(() => setFlash((f) => f + 1), [raw]);

  useEffect(() => {
    if (!goal?.pos) return;
    let raf = 0;
    const [gx, , gz] = goal.pos;
    const tick = () => {
      const dx = gx - player.pos.x;
      const dz = gz - player.pos.z;
      const d = Math.hypot(dx, dz);
      // bearing relative to where the camera looks (0 = straight ahead)
      const rel = Math.atan2(dx, dz) - player.camYaw;
      if (arrow.current) arrow.current.style.transform = `rotate(${-rel}rad)`;
      if (dist.current) dist.current.textContent = d < 4 ? tr('here') : distText(d);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  if (!goal) return null;
  return (
    <div className={`objective glass tone-${goal.tone}`} key={flash}>
      <span className="obj-ico">{goal.icon}</span>
      <div className="obj-body">
        {goal.eyebrow && <div className="obj-eyebrow">{goal.eyebrow}</div>}
        <div className="obj-text">{goal.text}</div>
      </div>
      {goal.pos && (
        <div className="obj-nav">
          <span className="obj-arrow" ref={arrow}>
            ▲
          </span>
          <span className="obj-dist" ref={dist} />
        </div>
      )}
    </div>
  );
}

/** Diamond over the goal in the world; clamps to the screen edge with an arrow when off-screen. */
function TargetMarker() {
  const raw = useGoal();
  const goal: Goal | null = raw ? JSON.parse(raw) : null;
  const el = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const pointer = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!goal?.pos) return;
    const v = new THREE.Vector3();
    const [gx, gy, gz] = goal.pos;
    let raf = 0;
    const tick = () => {
      const cam = view.camera;
      const node = el.current;
      if (cam && node) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        v.set(gx, gy + 3.2, gz).project(cam);
        const behind = v.z > 1;
        let x = (v.x * 0.5 + 0.5) * W;
        let y = (-v.y * 0.5 + 0.5) * H;
        if (behind) {
          x = W - x;
          y = H - y;
        }
        const m = 70;
        const onScreen = !behind && x > m && x < W - m && y > 110 && y < H - 120;
        const d = Math.hypot(gx - player.pos.x, gz - player.pos.z);
        if (!onScreen) {
          // park it on a ring around the character, pointing towards the goal,
          // so it never lands on the minimap, menus or the quest card
          const cx = W / 2;
          const cy = H / 2;
          let dx = x - cx;
          let dy = y - cy;
          if (behind && Math.abs(dy) < 1) dy = 1;
          const a = Math.atan2(dy, dx);
          const rx = Math.min(W * 0.3, 380);
          const ry = Math.min(H * 0.3, 230);
          dx = Math.cos(a) * rx;
          dy = Math.sin(a) * ry;
          x = cx + dx;
          y = cy + dy;
          if (pointer.current) {
            pointer.current.style.display = 'block';
            pointer.current.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
          }
        } else if (pointer.current) pointer.current.style.display = 'none';
        node.style.transform = `translate(${x}px, ${y}px)`;
        node.style.opacity = d < 4 ? '0' : '1';
        if (label.current) label.current.textContent = distText(d);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  if (!goal?.pos) return null;
  return (
    <div className={`target tone-${goal.tone}`} ref={el} aria-hidden>
      <span className="target-pointer" ref={pointer} />
      <span className="target-gem">{goal.icon}</span>
      <span className="target-dist" ref={label} />
    </div>
  );
}

// ───────────────────────── Right: quest progress ─────────────────────────

function QuestCard() {
  const scene = useGame((s) => s.scene);
  const tracked = useGame((s) => s.trackedQuest);
  const quests = useGame((s) => s.quests);
  const flags = useGame((s) => s.flags);
  const [open, setOpen] = useState(true);
  const id = tracked && quests[tracked]?.status === 'active' ? tracked : Object.keys(quests).find((k) => quests[k].status === 'active');
  if (!id) return scene === 'home' ? <SeasonCard /> : null;
  const q = quests[id];
  const def = questById(id);
  const beacons = ['beacon1', 'beacon2', 'beacon3'].filter((b) => flags[b]).length;
  const progress = id === 'rio_energy_01' ? beacons / 3 : q.step / def.objectives.length;
  return (
    <div className={`questcard glass ${open ? '' : 'closed'}`}>
      <button className="qc-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`qc-type ${def.type}`}>{tr(def.type === 'story' ? 'Story' : def.type === 'daily' ? 'Daily' : 'Quest')}</span>
        <span className="qc-title">{tr(def.title)}</span>
        <span className="qc-toggle">{open ? '–' : '+'}</span>
      </button>
      <div className="qc-progress">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      {open && (
        <ol className="qc-steps">
          {def.objectives.map((o, i) => {
            const state = i < q.step ? 'done' : i === q.step ? 'now' : 'next';
            return (
              <li key={o.id} className={state}>
                <span className="qc-dot">{state === 'done' ? '✓' : i + 1}</span>
                <span className="qc-label">{tr(o.label)}</span>
                {o.count && o.count > 1 && (
                  <span className="qc-count">
                    {i < q.step ? o.count : i === q.step ? q.count : 0}/{o.count}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {open && id === 'rio_energy_01' && (
        <div className="qc-foot">
          {tr('Energy Beacons restored')} <b>{beacons} / 3</b>
        </div>
      )}
    </div>
  );
}

function SeasonCard() {
  const days = Math.max(0, Math.ceil((new Date(SEASON.endsAt).getTime() - Date.now()) / 86400000));
  const open = useGame((s) => s.openPanel);
  return (
    <button className="season glass" onClick={() => open('season')}>
      <img src={cityArtUrl(portalByCity('rio').art, 'rio')} alt="" />
      <span className="season-body">
        <span className="season-eyebrow">{tr('Current event')}</span>
        <span className="season-title">{tr(SEASON.name)}</span>
        <span className="season-sub">{tr('Ends in {n} days', { n: days })}</span>
      </span>
    </button>
  );
}

// ───────────────────────── Bottom: what can I press ─────────────────────────

function Key({ k }: { k: string }) {
  return <kbd className="key">{k}</kbd>;
}

function Prompt() {
  const prompt = useGame((s) => s.prompt);
  const blocked = useGame((s) => !!(s.panel || s.dialog || s.reward));
  if (!prompt || blocked) return null;
  const touch = isTouchDevice();
  return (
    <div className="prompt" key={prompt.label}>
      {touch ? <span className="key round">✋</span> : <Key k={prompt.key} />}
      <span>{tr(prompt.label)}</span>
    </div>
  );
}

interface Hint {
  keys: string[];
  text: string;
}

function hintsFor(s: GameState): Hint[] {
  const out: Hint[] = [];
  const learning = !s.flags.visitedRio;
  const goalLabel = (() => {
    const id = s.trackedQuest ?? 'rio_energy_01';
    const q = s.quests[id];
    return q?.status === 'active' ? questById(id).objectives[q.step]?.target : undefined;
  })();
  if (learning) {
    out.push({ keys: ['W', 'A', 'S', 'D'], text: tr('move') });
    out.push({ keys: [tr('Mouse')], text: tr('look around') });
  }
  if (goalLabel === 'beacon2' || goalLabel === 'summit' || learning) out.push({ keys: ['Space', '×2'], text: tr('double jump') });
  if (goalLabel === 'beacon2' || goalLabel === 'summit') out.push({ keys: ['Shift'], text: tr('run') }, { keys: ['Q'], text: tr('dash') });
  if ((s.inventory.hoverboard ?? 0) > 0 && s.scene === 'rio') out.push({ keys: ['F'], text: s.riding ? tr('get off the board') : tr('hoverboard') });
  if (s.scene !== 'home' || s.flags.visitedRio) out.push({ keys: ['M'], text: tr('map') });
  out.push({ keys: ['H'], text: tr('all controls') });
  return out;
}

function HintBar() {
  const key = useGame((s) => JSON.stringify(hintsFor(s)));
  const hints: Hint[] = JSON.parse(key);
  return (
    <div className="hints">
      {hints.map((h) => (
        <span className="hint" key={h.text}>
          {h.keys.map((k) => (k === '×2' ? <span key={k} className="times">×2</span> : <Key key={k} k={k} />))}
          <span className="hint-text">{h.text}</span>
        </span>
      ))}
    </div>
  );
}

// ───────────────────────── Onboarding coach ─────────────────────────

const STEPS: { flag: string; title: string; text: string; icon: string }[] = [
  { flag: 'reachedPortal', icon: '🧭', title: 'Walk to the Rio portal', text: 'Follow the marker on the screen. Move with WASD and turn the camera by dragging the mouse.' },
  { flag: 'jumped', icon: '⤴️', title: 'Jump', text: 'Press Space. Press it again in the air for a double jump.' },
  { flag: 'interacted', icon: '✋', title: 'Interact', text: 'When a hint with E appears at the bottom, press E. Try the portal or the Sai Guide robot.' },
  { flag: 'visitedRio', icon: '🌀', title: 'Enter Rio', text: 'At the Rio portal press E and choose ENTER CITY.' },
  { flag: 'done:rio_energy_01', icon: '⚡', title: 'Restore the Rio energy network', text: 'Talk to the Technician by the portal, then follow the goal at the top of the screen.' },
  { flag: 'visitedRoom', icon: '🏠', title: 'Visit your apartment', text: 'Enter the Rio Apartment door near the beach road.' },
];

function Coach() {
  const flags = useGame((s) => s.flags);
  const setFlag = useGame((s) => s.setFlag);
  const blocked = useGame((s) => !!(s.panel || s.dialog || s.reward));
  if (flags.onboardingHidden || blocked) return null;
  // being in Rio means the first walk/interact steps were done, even if skipped
  const done = (f: string) => !!flags[f] || (!!flags.visitedRio && (f === 'reachedPortal' || f === 'interacted'));
  const idx = STEPS.findIndex((st) => !done(st.flag));
  if (idx < 0) return null;
  const step = STEPS[idx];
  return (
    <div className="coach glass" key={step.flag}>
      <div className="coach-head">
        <span className="coach-eyebrow">{tr('First steps')} · {idx + 1}/{STEPS.length}</span>
        <button className="coach-skip" onClick={() => setFlag('onboardingHidden')}>
          {tr('Hide')}
        </button>
      </div>
      <div className="coach-main">
        <span className="coach-ico">{step.icon}</span>
        <div>
          <div className="coach-title">{tr(step.title)}</div>
          <div className="coach-text">{tr(step.text)}</div>
        </div>
      </div>
      <div className="coach-dots">
        {STEPS.map((st, i) => (
          <span key={st.flag} className={done(st.flag) ? 'done' : i === idx ? 'now' : ''} />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Notifications ─────────────────────────

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast glass kind-${t.kind}`}>
          {t.icon && <span className="toast-ico">{t.icon}</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Scene transitions ─────────────────────────

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
  const name = transition.to === 'rio' ? tr('Rio de Janeiro') : transition.to === 'home' ? tr('Sai Home Planet') : tr('Rio Apartment');
  return (
    <div className="loading">
      <h1>{name.toUpperCase()}</h1>
      <div className="muted" style={{ fontWeight: 700, marginTop: 6 }}>
        {tr(transition.to === 'rio' ? 'Loading city…' : 'Loading world…')} {Math.round(progress * 100)}%
      </div>
      <div className="bar">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="tip">💡 {tr(tip.current)}</div>
    </div>
  );
}
