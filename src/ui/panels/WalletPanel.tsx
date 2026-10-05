import { useState } from 'react';
import { tr } from '../../i18n';
import { PORTALS } from '../../data/cities';
import { cityArtUrl } from '../../game/textures';
import { cityAccess, connectWallet, fetchOwnedCollections, setDemoCollections, shortAddress } from '../../services/nftAccess';
import { useGame } from '../../store/gameStore';
import { Panel } from './Panel';

/** Wallet connection + NFT city access (TZ §7). */
export function WalletPanel() {
  const wallet = useGame((s) => s.wallet);
  const setWallet = useGame((s) => s.setWallet);
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    const address = await connectWallet();
    const cols = await fetchOwnedCollections(address);
    setWallet(address, cols);
    setBusy(false);
  };
  const toggleDemo = async (id: string) => {
    const next = wallet.collections.includes(id) ? wallet.collections.filter((c) => c !== id) : [...wallet.collections, id];
    setDemoCollections(next);
    setBusy(true);
    const cols = await fetchOwnedCollections(wallet.address!);
    setWallet(wallet.address, cols);
    setBusy(false);
  };

  return (
    <Panel title="NFT Gallery · City Access" icon="🖼️">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{tr('Wallet')}</div>
          <b>{wallet.address ? shortAddress(wallet.address) : 'Not connected'}</b>
        </div>
        {wallet.address ? (
          <button className="btn" onClick={() => setWallet(null, [])}>{tr('Disconnect')}</button>
        ) : (
          <button className="btn primary" disabled={busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect wallet'}</button>
        )}
      </div>
      <div className="grid">
        {PORTALS.map((p) => {
          const access = cityAccess(p.city, wallet.collections);
          const id = `sai-city-${p.city}`;
          return (
            <div key={p.city} className={`card ${access === 'full' ? 'selected' : ''}`}>
              <img src={cityArtUrl(p.art, p.city)} alt="" style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 10, filter: access === 'full' ? 'none' : 'grayscale(0.7) brightness(0.7)' }} />
              <div className="name">{tr(p.name)} NFT</div>
              <div>
                {access === 'full' ? <span className="badge gold">{tr('FULL ACCESS')}</span> : access === 'visitor' ? <span className="badge green">{tr('VISITOR')}</span> : <span className="badge gray">{tr('LOCKED')}</span>}
              </div>
              {wallet.address && (
                <button className="btn" style={{ fontSize: 12 }} disabled={busy} onClick={() => toggleDemo(id)}>
                  {wallet.collections.includes(id) ? tr('Demo: remove ownership') : tr('Demo: simulate ownership')}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
        {tr('City NFTs are access passes, not power-ups: full city areas, story branches, exclusive quests, cosmetics, NFT-only events and trophies.')}
        {tr('Everyone can play the story as a visitor. In this MVP the backend check is mocked — use “simulate ownership” to preview NFT perks.')}
      </div>
    </Panel>
  );
}
