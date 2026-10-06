import { tr } from '../../i18n';
import { Panel } from './Panel';

const GROUPS: { title: string; rows: [string[], string][] }[] = [
  {
    title: 'Movement',
    rows: [
      [['W', 'A', 'S', 'D'], 'Walk'],
      [['Shift'], 'Run'],
      [['Space'], 'Jump'],
      [['Space', 'Space'], 'Double jump (in the air)'],
      [['Q'], 'Dash forward'],
      [['F'], 'Skateboard on / off'],
    ],
  },
  {
    title: 'Camera',
    rows: [
      [['Mouse'], 'Hold a button and drag to look around'],
      [['Wheel'], 'Zoom in / out'],
    ],
  },
  {
    title: 'Actions',
    rows: [
      [['E'], 'Talk, open, take, enter'],
      [['1', '2', '3', '4'], 'Emotes: wave, celebrate, sit, dance'],
    ],
  },
  {
    title: 'Menus',
    rows: [
      [['M'], 'Map and fast travel'],
      [['Tab'], 'Quest journal'],
      [['I'], 'Inventory'],
      [['C'], 'Wardrobe'],
      [['P'], 'Passport'],
      [['H'], 'This help'],
      [['Esc'], 'Close / menu'],
    ],
  },
];

/** Full controls reference (H). */
export function HelpPanel() {
  return (
    <Panel title={tr('Controls')} icon="⌨️">
      <div className="help-grid">
        {GROUPS.map((g) => (
          <section key={tr(g.title)} className="help-group">
            <h3>{tr(g.title)}</h3>
            {g.rows.map(([keys, label]) => (
              <div key={label} className="help-row">
                <span className="help-keys">
                  {keys.map((k, i) => (
                    <kbd key={i} className="key">
                      {tr(k)}
                    </kbd>
                  ))}
                </span>
                <span>{tr(label)}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
      <p className="muted help-foot">{tr('On a phone: joystick on the left, buttons on the right, swipe to turn the camera.')}</p>
    </Panel>
  );
}
