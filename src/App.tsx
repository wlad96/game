import { GameCanvas } from './game/GameCanvas';
import { HUD } from './ui/HUD';

/**
 * SAI Universe: Three.js canvas + HTML HUD on top (TZ §49).
 * The whole thing is one component so it can be embedded into the main site.
 */
export function App() {
  return (
    <div className="app">
      <GameCanvas />
      <HUD />
    </div>
  );
}
