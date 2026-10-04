import { player, playerCommands, view } from './game/runtime';
import { useGame } from './store/gameStore';

/** `?debug` exposes game state for QA / automated smoke tests. */
export function installDebug() {
  if (!new URLSearchParams(location.search).has('debug')) return;
  (window as unknown as Record<string, unknown>).__sai = { useGame, player, playerCommands, view };
}
