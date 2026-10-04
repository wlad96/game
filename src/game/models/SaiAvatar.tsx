import { useGame } from '../../store/gameStore';
import { SaiGlbModel } from './SaiGlbModel';
import { SaiModel, type AnimSource } from './SaiModel';

/** Picks the Sai body: the generated 3D model (default) or the primitive one. */
export function SaiAvatar(props: { skin: string; source: () => AnimSource; riding?: boolean; castShadow?: boolean }) {
  const model = useGame((s) => s.settings.saiModel ?? 'glb');
  return model === 'glb' ? <SaiGlbModel {...props} /> : <SaiModel {...props} />;
}
