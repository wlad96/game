import { useEffect, useRef, useState } from 'react';
import { tr } from '../i18n';
import { photoSpots, player, playerCommands, view, type AnimState, type PhotoSpot } from '../game/runtime';
import { useGame } from '../store/gameStore';

const POSES: { anim: AnimState; icon: string; label: string }[] = [
  { anim: 'idle', icon: '🙂', label: 'Stand' },
  { anim: 'wave', icon: '👋', label: 'Wave' },
  { anim: 'celebrate', icon: '🎉', label: 'Cheer' },
  { anim: 'dance', icon: '💃', label: 'Dance' },
  { anim: 'sit', icon: '🪑', label: 'Sit' },
];

/**
 * Framings: camera distance and height behind Sai, where Sai's middle lands on
 * screen (-1 bottom … 1 top) and how much of the spot's extra tilt to use.
 */
const FRAMES = [
  { id: 'close', label: 'Close-up', dist: 3.2, h: 1.35, at: -0.05, k: 0 },
  { id: 'mid', label: 'Medium', dist: 5.6, h: 1.55, at: -0.35, k: 0.6 },
  { id: 'wide', label: 'Wide', dist: 9.5, h: 1.8, at: -0.5, k: 1 },
] as const;

function frameCamera(spot: PhotoSpot, f: (typeof FRAMES)[number]) {
  const [x, y, z] = spot.pos;
  const dx = Math.sin(spot.bg);
  const dz = Math.cos(spot.bg);
  const half = (((view.camera?.fov ?? 55) / 2) * Math.PI) / 180;
  // pitch so that Sai (1 m up) sits at `at` on screen, then the spot's extra tilt for tall scenery
  const below = Math.atan((f.h - 1) / f.dist);
  // never tilt so far that Sai leaves the bottom of the frame
  const maxPitch = Math.atan(Math.tan(half) * 0.72) - below;
  const pitch = Math.min(maxPitch, Math.atan(Math.tan(half) * -f.at) - below + (spot.pitch ?? 0) * f.k);
  const pos: [number, number, number] = [x - dx * f.dist, y + f.h, z - dz * f.dist];
  return { pos, look: [pos[0] + dx * 10, pos[1] + 10 * Math.tan(pitch), pos[2] + dz * 10] as [number, number, number] };
}

/** Render one frame and stamp the SAI UNIVERSE caption on it. */
function capture(place: string, who: string): Promise<Blob | null> {
  const { gl, scene, camera } = view;
  if (!gl || !scene || !camera) return Promise.resolve(null);
  gl.render(scene, camera); // the drawing buffer is only valid right after a render
  const src = gl.domElement;
  const W = src.width;
  const H = src.height;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const u = Math.min(W, H) / 100;
  // bottom shade + thin gold frame
  const grad = g.createLinearGradient(0, H * 0.72, 0, H);
  grad.addColorStop(0, 'rgba(10,8,40,0)');
  grad.addColorStop(1, 'rgba(10,8,40,0.72)');
  g.fillStyle = grad;
  g.fillRect(0, H * 0.72, W, H * 0.28);
  g.strokeStyle = 'rgba(255,214,120,0.95)';
  g.lineWidth = u * 0.6;
  g.strokeRect(u * 2, u * 2, W - u * 4, H - u * 4);
  g.textBaseline = 'alphabetic';
  g.shadowColor = '#5ee7ff';
  g.shadowBlur = u * 1.6;
  g.fillStyle = '#ffffff';
  g.font = `italic 800 ${u * 6}px "Exo 2", system-ui, sans-serif`;
  g.fillText('SAI UNIVERSE', u * 5, H - u * 9);
  g.shadowBlur = 0;
  g.fillStyle = '#ffd36b';
  g.font = `700 ${u * 3}px "Exo 2", system-ui, sans-serif`;
  g.fillText(place, u * 5.2, H - u * 5);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.font = `600 ${u * 2.6}px "Exo 2", system-ui, sans-serif`;
  g.fillText(`${who} · ${new Date().toLocaleDateString()}`, W - u * 5, H - u * 5);
  return new Promise((r) => c.toBlob((b) => r(b), 'image/png'));
}

/** Photo mode: Sai poses on the photo zone, the shot can be copied, saved or shared. */
export function PhotoMode() {
  const spotId = useGame((s) => s.panelArg) as string;
  const close = useGame((s) => s.closePanel);
  const toast = useGame((s) => s.toast);
  const who = useGame((s) => s.playerName);
  const spot = photoSpots.get(spotId);
  const [pose, setPose] = useState<AnimState>('wave');
  const [frame, setFrame] = useState(1);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [flash, setFlash] = useState(false);
  const holdTimer = useRef(0);

  // stand on the spot facing the camera
  useEffect(() => {
    if (!spot) return;
    const [x, y, z] = spot.pos;
    playerCommands.teleport = { x, y, z, yaw: spot.bg + Math.PI };
    return () => {
      playerCommands.camera = null;
      playerCommands.emote = 'idle';
    };
  }, [spot]);
  useEffect(() => {
    if (spot) playerCommands.camera = frameCamera(spot, FRAMES[frame]);
  }, [spot, frame]);
  // hold the pose for as long as the photo mode is open
  useEffect(() => {
    playerCommands.emote = pose;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      if (pose !== 'idle') player.emoteTimer = 999;
    }, 60);
    return () => window.clearTimeout(holdTimer.current);
  }, [pose]);
  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot]);

  if (!spot) return null;

  const take = async () => {
    const blob = await capture(tr(spot.place), who);
    if (!blob) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 260);
    setShot({ blob, url: URL.createObjectURL(blob) });
  };
  const fileName = () => `sai-universe-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.png`;
  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': shot!.blob })]);
      toast(tr('Photo copied — paste it into any chat'), '📋', 'reward');
    } catch {
      toast(tr('This browser does not allow copying pictures — use Save'), '⚠️', 'warn');
    }
  };
  const save = () => {
    const a = document.createElement('a');
    a.href = shot!.url;
    a.download = fileName();
    a.click();
  };
  const file = shot ? new File([shot.blob], fileName(), { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const share = async () => {
    try {
      await navigator.share({ files: [file!], title: 'SAI Universe', text: tr('My photo from SAI Universe') });
    } catch {
      // cancelled
    }
  };

  return (
    <div className="photo-mode">
      {flash && <div className="photo-flash" />}
      <div className="photo-top glass">
        <span>📸</span>
        <b>{tr('Photo zone')}</b>
        <span className="muted">· {tr(spot.place)}</span>
        <button className="close" onClick={close} aria-label={tr('Close')}>
          ✕
        </button>
      </div>
      {!shot && (
        <div className="photo-bar glass">
          <div className="photo-group">
            {POSES.map((p) => (
              <button key={p.anim} className={`photo-chip ${pose === p.anim ? 'on' : ''}`} onClick={() => setPose(p.anim)}>
                <span>{p.icon}</span>
                {tr(p.label)}
              </button>
            ))}
          </div>
          <button className="photo-shutter" onClick={take} aria-label={tr('Take photo')}>
            <span />
          </button>
          <div className="photo-group">
            {FRAMES.map((f, i) => (
              <button key={f.id} className={`photo-chip ${frame === i ? 'on' : ''}`} onClick={() => setFrame(i)}>
                {tr(f.label)}
              </button>
            ))}
          </div>
        </div>
      )}
      {shot && (
        <div className="photo-preview-wrap">
          <div className="photo-preview glass">
            <img src={shot.url} alt={tr('Your photo')} />
            <div className="photo-actions">
              <button className="btn primary" onClick={copy}>
                📋 {tr('Copy')}
              </button>
              <button className="btn" onClick={save}>
                💾 {tr('Save')}
              </button>
              {canShare && (
                <button className="btn" onClick={share}>
                  📤 {tr('Share')}
                </button>
              )}
              <button className="btn" onClick={() => setShot(null)}>
                🔁 {tr('Another shot')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
