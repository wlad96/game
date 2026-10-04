import { GameCanvas } from './game/GameCanvas';
import { HUD } from './ui/HUD';
import { useGame } from './store/gameStore';

/**
 * SAI Universe: Three.js canvas + HTML HUD on top (TZ §49).
 * The whole thing is one component so it can be embedded into the main site.
 */
export function App() {
  // re-mount the HUD on a language switch so every string is re-translated
  const lang = useGame((s) => s.settings.lang ?? 'ru');
  return (
    <div className="app" lang={lang}>
      <GameCanvas />
      <HUD key={lang} />
    </div>
  );
}
