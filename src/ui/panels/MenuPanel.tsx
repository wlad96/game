import { useState } from 'react';
import { tr } from '../../i18n';
import { useGame } from '../../store/gameStore';
import { Panel } from './Panel';

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`btn ${on ? 'cyan' : ''}`} onClick={onClick} aria-pressed={on}>
      {label}
    </button>
  );
}

/** Esc menu: language, settings, help, reset. */
export function MenuPanel() {
  const s = useGame();
  const set = s.setSettings;
  const lang = s.settings.lang ?? 'ru';
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Panel title="Menu" icon="☰" narrow>
      <div style={{ display: 'grid', gap: 10 }}>
        <button className="btn primary" onClick={s.closePanel}>
          {tr('Resume')}
        </button>
        <div className="card">
          <div className="name">{tr('Language')}</div>
          <div className="row">
            <Toggle on={lang === 'ru'} label="Русский" onClick={() => set({ lang: 'ru' })} />
            <Toggle on={lang === 'en'} label="English" onClick={() => set({ lang: 'en' })} />
          </div>
        </div>
        <div className="card">
          <div className="name">{tr('Graphics')}</div>
          <div className="row">
            <Toggle on={s.settings.quality === 'high'} label={tr('High (desktop)')} onClick={() => set({ quality: 'high' })} />
            <Toggle on={s.settings.quality === 'low'} label={tr('Low (mobile)')} onClick={() => set({ quality: 'low' })} />
          </div>
          <div className="desc">{tr('High: shadows and full resolution. Low: lighter for phones and older laptops.')}</div>
        </div>
        <div className="card">
          <div className="name">{tr('Sai model')}</div>
          <div className="row">
            <Toggle on={(s.settings.saiModel ?? 'glb') === 'glb'} label={tr('New 3D model')} onClick={() => set({ saiModel: 'glb' })} />
            <Toggle on={s.settings.saiModel === 'classic'} label={tr('Classic')} onClick={() => set({ saiModel: 'classic' })} />
          </div>
        </div>
        <div className="card">
          <div className="name">{tr('Audio')}</div>
          <div className="row">
            <Toggle on={s.settings.sound} label={s.settings.sound ? tr('Sound on') : tr('Sound off')} onClick={() => set({ sound: !s.settings.sound })} />
            <Toggle on={s.settings.music} label={s.settings.music ? tr('Music on') : tr('Music off')} onClick={() => set({ music: !s.settings.music })} />
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => s.openPanel('help')}>
            ⌨️ {tr('All controls')}
          </button>
          {s.scene !== 'home' && (
            <button className="btn" style={{ flex: 1 }} onClick={() => s.goTo('home', 'start', 'warp')}>
              🌐 {tr('Return to Home Planet')}
            </button>
          )}
        </div>
        {confirmReset ? (
          <div className="card" style={{ borderColor: 'rgba(255,138,122,0.5)' }}>
            <div className="name">{tr('Reset all progress? This cannot be undone.')}</div>
            <div className="row">
              <button className="btn" style={{ color: 'var(--red)' }} onClick={() => s.resetProgress()}>
                {tr('Yes, reset')}
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                {tr('Cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn" style={{ color: 'var(--red)' }} onClick={() => setConfirmReset(true)}>
            {tr('Reset progress')}
          </button>
        )}
      </div>
    </Panel>
  );
}
