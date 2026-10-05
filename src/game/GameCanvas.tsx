import { Canvas, useThree } from '@react-three/fiber';
import { lazy, Suspense, useEffect } from 'react';
import { portalByCity } from '../data/cities';
import type { SceneId } from '../data/types';
import { useGame } from '../store/gameStore';
import { attachLook } from './input';
import { view } from './runtime';
import type * as THREE from 'three';

/**
 * Scenes are code-split: only the active one is downloaded and mounted, and the
 * previous one is unmounted (and its GPU resources disposed) on transition (TZ §56).
 */
export const sceneLoaders: Record<SceneId, () => Promise<{ default: React.ComponentType<{ spawnId: string }> }>> = {
  home: () => import('./scenes/HomePlanet'),
  rio: () => import('./scenes/RioCity'),
  'rio-room': () => import('./scenes/RioRoom'),
  gallery: () => import('./scenes/GalleryHall'),
};

const Scenes: Record<SceneId, React.LazyExoticComponent<React.ComponentType<{ spawnId: string }>>> = {
  home: lazy(sceneLoaders.home),
  rio: lazy(sceneLoaders.rio),
  'rio-room': lazy(sceneLoaders['rio-room']),
  gallery: lazy(sceneLoaders.gallery),
};
const Warp = lazy(() => import('./scenes/Warp'));

function LookControls() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useEffect(() => attachLook(gl.domElement), [gl]);
  useEffect(() => {
    view.camera = camera as THREE.PerspectiveCamera;
    view.gl = gl;
    view.scene = scene;
  }, [camera, gl, scene]);
  return null;
}

export function GameCanvas() {
  const scene = useGame((s) => s.scene);
  const spawn = useGame((s) => s.spawn);
  const transition = useGame((s) => s.transition);
  const quality = useGame((s) => s.settings.quality);
  const lang = useGame((s) => s.settings.lang ?? 'ru');
  const high = quality === 'high';

  const warping = transition?.kind === 'warp';
  const Active = Scenes[scene];
  const warpArt = transition?.to === 'rio' ? portalByCity('rio').art : null;

  return (
    <Canvas
      shadows={high}
      dpr={high ? [1, 1.75] : [0.6, 1]}
      camera={{ fov: 55, near: 0.1, far: 1500, position: [0, 5, 10] }}
      gl={{ antialias: high, powerPreference: 'high-performance' }}
      className="game-canvas"
    >
      <LookControls />
      <Suspense fallback={null}>
        {warping ? <Warp art={warpArt} artKey="rio" /> : <Active key={`${scene}:${spawn}:${lang}`} spawnId={spawn} />}
      </Suspense>
    </Canvas>
  );
}
