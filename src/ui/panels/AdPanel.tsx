import { useMemo } from 'react';
import { tr } from '../../i18n';
import { adPlaceholderCanvas } from '../../game/models/AdBoards';
import { adByCode, adImage, AD_CONTACT, AD_CONTENT } from '../../game/scenes/rioAds';
import { useGame } from '../../store/gameStore';
import { Panel } from './Panel';

/** An advertising spot: the client's card, or "this spot is free" with how to book it. */
export function AdPanel() {
  const code = useGame((s) => s.panelArg) as string;
  const toast = useGame((s) => s.toast);
  const slot = adByCode(code);
  const ad = AD_CONTENT[code];
  const img = adImage(code);
  const preview = useMemo(() => (slot && !img ? adPlaceholderCanvas(slot).toDataURL('image/jpeg', 0.85) : img), [slot, img]);
  if (!slot) return null;
  const taken = !!ad || !!img;
  const px = slot.w > 5 ? 2048 : 1024;
  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done, '📋', 'reward');
    } catch {
      toast(text, '📋');
    }
  };
  const { email, telegram, site } = AD_CONTACT;
  const hasContact = !!(email || telegram || site);
  return (
    <Panel title={taken ? 'Advert' : 'Advertising spot'} icon="📣" narrow>
      <img className="ad-preview" src={preview} alt="" />
      {taken ? (
        <>
          {ad?.advertiser && <div className="muted ad-eyebrow">{ad.advertiser}</div>}
          {ad?.title && <h3 className="ad-title">{ad.title}</h3>}
          {ad?.text && <p className="ad-text">{ad.text}</p>}
          <div className="row ad-actions">
            {ad?.url && (
              <a className="btn primary" href={ad.url} target="_blank" rel="noopener noreferrer">
                {tr('Open website')}
              </a>
            )}
            {ad?.promo && (
              <button className="btn" onClick={() => copy(ad.promo!, tr('Promo code copied'))}>
                🎟️ {tr('Promo code')}: <b>{ad.promo}</b>
              </button>
            )}
          </div>
          <div className="muted ad-foot">
            {tr('Spot')} {slot.code} · {tr(slot.name)}
          </div>
        </>
      ) : (
        <>
          <h3 className="ad-title">{tr('This spot is free')}</h3>
          <div className="stat-list">
            <span className="muted">{tr('Spot')}</span>
            <b>{slot.code}</b>
            <span className="muted">{tr('Where')}</span>
            <span>{tr(slot.name)}</span>
            <span className="muted">{tr('Size')}</span>
            <span>
              {slot.w.toFixed(1)} × {slot.h.toFixed(1)} {tr('m')}
            </span>
            <span className="muted">{tr('Picture')}</span>
            <span>{tr('{w} × {h} px or larger', { w: px, h: Math.round((px * slot.h) / slot.w) })}</span>
          </div>
          <p className="ad-text">{tr('Put your brand in front of every player who walks through Copacabana. Players can walk up to the ad and open your website or promo code.')}</p>
          {hasContact ? (
            <div className="row ad-actions">
              {email && (
                <a className="btn primary" href={`mailto:${email}?subject=${encodeURIComponent(`SAI Universe ad · ${slot.code}`)}`}>
                  ✉️ {email}
                </a>
              )}
              {telegram && (
                <a className="btn" href={`https://t.me/${telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">
                  ✈️ {telegram}
                </a>
              )}
              {site && (
                <a className="btn" href={site} target="_blank" rel="noopener noreferrer">
                  🌐 {tr('Website')}
                </a>
              )}
            </div>
          ) : (
            <p className="muted">{tr('To book this spot, contact the SAI Universe team.')}</p>
          )}
          <button className="btn" onClick={() => copy(`SAI Universe · ${slot.code} · ${slot.w.toFixed(1)}×${slot.h.toFixed(1)} m`, tr('Spot code copied'))}>
            📋 {tr('Copy spot code')}
          </button>
        </>
      )}
    </Panel>
  );
}
