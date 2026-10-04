import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import type * as THREE from 'three';
import { ITEMS, SKINS } from '../../data/items';
import { SaiAvatar } from '../../game/models/SaiAvatar';
import type { AnimState } from '../../game/runtime';
import { useGame } from '../../store/gameStore';
import { Panel } from './Panel';

const CATS = ['Suit', 'Helmet', 'Gloves', 'Boots', 'Backpack', 'Effects', 'Emotes', 'Pets'] as const;
type Cat = (typeof CATS)[number];

function Turntable({ skin, anim }: { skin: string; anim: AnimState }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    g.current.rotation.y += dt * 0.6;
  });
  return (
    <group ref={g} position={[0, -1.1, 0]}>
      <SaiAvatar skin={skin} source={() => ({ anim, animTime: 0, speed: 0 })} castShadow={false} />
    </group>
  );
}

/** Screen 10: Sai customisation — categories, 3D preview, items (TZ §26). */
export function WardrobePanel() {
  const s = useGame();
  const [cat, setCat] = useState<Cat>('Suit');
  const [preview, setPreview] = useState(s.equippedSkin);
  const [anim, setAnim] = useState<AnimState>('idle');
  const pets = ITEMS.filter((i) => i.category === 'pet' && (s.inventory[i.id] ?? 0) > 0);

  return (
    <Panel title="Wardrobe" icon="👕">
      <div className="wardrobe">
        <div className="cat-list">
          {CATS.map((c) => (
            <button key={c} className={c === cat ? 'active' : ''} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="preview">
          <Canvas camera={{ position: [0, 0.6, 4.2], fov: 40 }} dpr={[1, 1.5]}>
            <ambientLight intensity={1.1} />
            <directionalLight position={[3, 5, 4]} intensity={2.2} />
            <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#7fdcff" />
            <Suspense fallback={null}>
              <Turntable skin={preview} anim={anim} />
            </Suspense>
          </Canvas>
        </div>
        <div>
          {cat === 'Suit' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
              {SKINS.map((sk) => {
                const owned = s.skins.includes(sk.id);
                return (
                  <div
                    key={sk.id}
                    className={`card ${s.equippedSkin === sk.id ? 'selected' : ''}`}
                    onMouseEnter={() => setPreview(sk.id)}
                    onMouseLeave={() => setPreview(s.equippedSkin)}
                    onClick={() => setPreview(sk.id)}
                    style={{ opacity: owned ? 1 : 0.6, cursor: 'pointer' }}
                  >
                    <div className="swatch" style={{ background: `linear-gradient(135deg, ${sk.suit} 0 55%, ${sk.trim} 55% 75%, ${sk.gloves} 75%)` }} />
                    <div className="name" style={{ fontSize: 13 }}>{sk.name}</div>
                    {owned ? (
                      <button className="btn" style={{ padding: '6px 8px' }} disabled={s.equippedSkin === sk.id} onClick={() => s.equipSkin(sk.id)}>
                        {s.equippedSkin === sk.id ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <span className="badge gray" style={{ textAlign: 'center' }}>{sk.source}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {cat === 'Emotes' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {(['wave', 'celebrate', 'sit', 'dance'] as AnimState[]).map((a, i) => (
                <button key={a} className={`btn ${anim === a ? 'cyan' : ''}`} onClick={() => setAnim(anim === a ? 'idle' : a)}>
                  {['👋', '🎉', '🪑', '🕺'][i]} {a} · {i + 1}
                </button>
              ))}
            </div>
          )}
          {cat === 'Pets' &&
            (pets.length ? (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {pets.map((p) => (
                  <div key={p.id} className={`card ${s.equippedPet === p.id ? 'selected' : ''}`}>
                    <div className="big-ico">{p.icon}</div>
                    <div className="name">{p.name}</div>
                    <button className="btn" onClick={() => s.equipPet(s.equippedPet === p.id ? null : p.id)}>
                      {s.equippedPet === p.id ? 'Dismiss' : 'Summon'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">No pets yet — adopt one in the Shop.</div>
            ))}
          {!['Suit', 'Emotes', 'Pets'].includes(cat) && (
            <div className="muted" style={{ fontSize: 14 }}>
              {cat} pieces arrive with the Season Pass. Every part swaps materials on the same Sai skeleton, so any combination works with every animation.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
