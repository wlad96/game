import { useGame } from '../../store/gameStore';
import { InventoryPanel, PassportPanel, ProfilePanel, SeasonPanel } from './CollectionPanels';
import { HelpPanel } from './HelpPanel';
import { MapPanel } from './MapPanel';
import { MenuPanel } from './MenuPanel';
import { NftPanel } from './NftPanel';
import { PortalPanel } from './PortalPanel';
import { PuzzlePanel } from './PuzzlePanel';
import { QuestJournal, QuestTerminal } from './QuestPanels';
import { SlotPanel } from './RoomPanels';
import { ShopPanel } from './ShopPanel';
import { WalletPanel } from './WalletPanel';
import { WardrobePanel } from './WardrobePanel';

export function PanelRouter() {
  const panel = useGame((s) => s.panel);
  switch (panel) {
    case 'portal':
      return <PortalPanel />;
    case 'terminal':
      return <QuestTerminal />;
    case 'quests':
      return <QuestJournal />;
    case 'map':
      return <MapPanel />;
    case 'inventory':
      return <InventoryPanel />;
    case 'passport':
      return <PassportPanel />;
    case 'profile':
      return <ProfilePanel />;
    case 'season':
      return <SeasonPanel />;
    case 'shop':
      return <ShopPanel />;
    case 'wardrobe':
      return <WardrobePanel />;
    case 'puzzle':
      return <PuzzlePanel />;
    case 'wallet':
      return <WalletPanel />;
    case 'slot':
      return <SlotPanel />;
    case 'menu':
      return <MenuPanel />;
    case 'help':
      return <HelpPanel />;
    case 'nft':
      return <NftPanel />;
    default:
      return null;
  }
}
