import { Component, type ReactNode } from 'react';
import { useGame } from '../../store/gameStore';
import { SaiGlbModel } from './SaiGlbModel';
import { SaiModel, type AnimSource } from './SaiModel';

type Props = { skin: string; source: () => AnimSource; riding?: boolean; castShadow?: boolean };

/** If the 3D model fails to load, keep the game running with the primitive Sai. */
class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn('sai.glb failed, using the classic model', e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Picks the Sai body: the generated 3D model (default) or the primitive one. */
export function SaiAvatar(props: Props) {
  const model = useGame((s) => s.settings.saiModel ?? 'glb');
  if (model !== 'glb') return <SaiModel {...props} />;
  return (
    <Fallback fallback={<SaiModel {...props} />}>
      <SaiGlbModel {...props} />
    </Fallback>
  );
}
