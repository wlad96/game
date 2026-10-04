import { useGame } from '../../store/gameStore';
import { Panel } from './Panel';

/** Esc menu: settings, help, reset. */
export function MenuPanel() {
  const s = useGame();
  const set = s.setSettings;
  return (
    <Panel title="Menu" icon="☰" narrow>
      <div style={{ display: 'grid', gap: 10 }}>
        <button className="btn primary" onClick={s.closePanel}>Resume</button>
        <div className="card">
          <div className="name">Graphics</div>
          <div className="row">
            {(['high', 'low'] as const).map((q) => (
              <button key={q} className={`btn ${s.settings.quality === q ? 'cyan' : ''}`} onClick={() => set({ quality: q })}>
                {q === 'high' ? 'High (desktop)' : 'Low (mobile)'}
              </button>
            ))}
          </div>
          <div className="desc">High: shadows, bloom, sparkles, full resolution. Low: lighter for phones.</div>
        </div>
        <div className="card">
          <div className="name">Sai model</div>
          <div className="row">
            <button className={`btn ${(s.settings.saiModel ?? 'glb') === 'glb' ? 'cyan' : ''}`} onClick={() => set({ saiModel: 'glb' })}>New 3D model</button>
            <button className={`btn ${s.settings.saiModel === 'classic' ? 'cyan' : ''}`} onClick={() => set({ saiModel: 'classic' })}>Classic</button>
          </div>
          <div className="desc">The new model is not rigged yet, so it moves as a whole body (hop, lean, flip) until animations arrive.</div>
        </div>
        <div className="card">
          <div className="name">Audio</div>
          <div className="row">
            <button className={`btn ${s.settings.sound ? 'cyan' : ''}`} onClick={() => set({ sound: !s.settings.sound })}>Sound {s.settings.sound ? 'on' : 'off'}</button>
            <button className={`btn ${s.settings.music ? 'cyan' : ''}`} onClick={() => set({ music: !s.settings.music })}>Music {s.settings.music ? 'on' : 'off'}</button>
          </div>
        </div>
        <div className="card">
          <div className="name">Controls</div>
          <div className="desc" style={{ lineHeight: 1.6 }}>
            WASD move · Mouse drag camera · Wheel zoom · Shift run · Space jump / double jump · Q dash · E interact · F hoverboard · M map · I inventory ·
            Tab quests · P passport · C wardrobe · 1–4 emotes · Esc menu
          </div>
        </div>
        {s.scene !== 'home' && (
          <button className="btn" onClick={() => s.goTo('home', 'start', 'warp')}>Return to Home Planet</button>
        )}
        <button
          className="btn"
          style={{ color: '#ff9d7a' }}
          onClick={() => {
            if (window.confirm('Reset all progress? This cannot be undone.')) s.resetProgress();
          }}
        >
          Reset progress
        </button>
      </div>
    </Panel>
  );
}
