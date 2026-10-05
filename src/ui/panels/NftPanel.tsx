import { useEffect, useMemo } from 'react';
import { tr } from '../../i18n';
import { HAS_NFTS, NFTS } from '../../data/art';
import { nftPlaceholderCanvas } from '../../game/textures';
import { useGame } from '../../store/gameStore';
import { Panel } from './Panel';

/** A gallery NFT up close, with arrows to walk through the collection. */
export function NftPanel() {
  const arg = useGame((s) => s.panelArg) as number;
  const open = useGame((s) => s.openPanel);
  const i = Math.max(0, Math.min(NFTS.length - 1, arg ?? 0));
  const nft = NFTS[i];
  const src = useMemo(() => nft.url ?? nftPlaceholderCanvas(nft.n).toDataURL('image/png'), [nft]);
  const go = (d: number) => open('nft', (i + d + NFTS.length) % NFTS.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') go(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <Panel title="NFT Gallery" icon="🖼️">
      <div className="nft-view">
        <button className="nft-arrow" onClick={() => go(-1)} aria-label={tr('Previous')}>
          ‹
        </button>
        <figure>
          <img src={src} alt={nft.name} />
          <figcaption>
            <b>{nft.name}</b>
            <span className="muted">
              {tr('No. {n} of {total}', { n: nft.n, total: NFTS.length })}
            </span>
          </figcaption>
          {!HAS_NFTS && <div className="muted nft-note">{tr('Preview: the collection artwork appears here once it is uploaded.')}</div>}
        </figure>
        <button className="nft-arrow" onClick={() => go(1)} aria-label={tr('Next')}>
          ›
        </button>
      </div>
    </Panel>
  );
}
