import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { itemById, skinById } from '../data/items';
import { QUESTS, questById } from '../data/quests';
import type { CityId, QuestEvent, Reward, SceneId } from '../data/types';
import { play } from '../audio/sfx';
import { addXp, applyQuestEvent, isQuestAvailable, type QuestStates } from './questEngine';
import { ownedCities } from '../services/nftAccess';

export type PanelId =
  | 'menu'
  | 'map'
  | 'inventory'
  | 'quests'
  | 'passport'
  | 'wardrobe'
  | 'shop'
  | 'terminal'
  | 'portal'
  | 'puzzle'
  | 'profile'
  | 'season'
  | 'wallet'
  | 'slot'
  | 'upgrade';

export interface Toast {
  id: number;
  text: string;
  icon?: string;
}

export interface DialogState {
  name: string;
  portrait: string;
  lines: string[];
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
}

export interface RewardScreen {
  title: string;
  subtitle: string;
  reward: Reward;
  lore?: string;
  levelUp?: number;
}

export interface PuzzleArgs {
  target: string;
  title: string;
  size: number;
  seed: number;
}

export interface FurniturePlacement {
  item: string;
  rot: number;
}

export type Quality = 'high' | 'low';

interface Persisted {
  playerName: string;
  level: number;
  xp: number;
  saiEnergy: number;
  cityXp: Partial<Record<CityId, number>>;
  wallet: { address: string | null; collections: string[] };
  quests: QuestStates;
  trackedQuest: string | null;
  inventory: Record<string, number>;
  skins: string[];
  equippedSkin: string;
  equippedPet: string | null;
  flags: Record<string, boolean>;
  collected: Record<string, boolean>;
  fastTravel: string[];
  dailyDate: string;
  room: { level: number; slots: Record<string, FurniturePlacement | null>; trophies: Record<string, string | null> };
  lore: string[];
  stamps: string[];
  seasonClaimed: number[];
  totalOrbs: number;
  settings: { quality: Quality; sound: boolean; music: boolean };
}

interface Runtime {
  scene: SceneId;
  spawn: string;
  transition: { to: SceneId; kind: 'warp' | 'fade'; spawn: string } | null;
  panel: PanelId | null;
  panelArg: unknown;
  prompt: { label: string; key: string } | null;
  dialog: DialogState | null;
  reward: RewardScreen | null;
  toasts: Toast[];
  riding: boolean;
  hydrated: boolean;
}

interface Actions {
  goTo: (to: SceneId, spawn: string, kind?: 'warp' | 'fade') => void;
  finishTransition: () => void;
  openPanel: (p: PanelId, arg?: unknown) => void;
  closePanel: () => void;
  setPrompt: (p: Runtime['prompt']) => void;
  showDialog: (d: DialogState | null) => void;
  toast: (text: string, icon?: string) => void;
  dismissToast: (id: number) => void;
  closeReward: () => void;

  acceptQuest: (id: string) => void;
  trackQuest: (id: string | null) => void;
  questEvent: (ev: QuestEvent) => void;
  grantReward: (r: Reward, city?: CityId) => number | undefined;
  setFlag: (f: string, v?: boolean) => void;
  collect: (key: string, opts?: { energy?: number; xp?: number; item?: string; event?: QuestEvent; toast?: string; icon?: string }) => void;
  discoverFastTravel: (id: string, name: string) => void;

  buy: (id: string, price: number) => boolean;
  equipSkin: (id: string) => void;
  equipPet: (id: string | null) => void;
  setRiding: (v: boolean) => void;

  placeFurniture: (slot: string, item: string | null) => void;
  rotateFurniture: (slot: string) => void;
  placeTrophy: (slot: string, item: string | null) => void;
  upgradeRoom: (cost: number) => boolean;

  setWallet: (address: string | null, collections: string[]) => void;
  claimSeasonTier: (tier: number, reward: Reward) => void;
  setSettings: (s: Partial<Persisted['settings']>) => void;
  checkDaily: () => void;
  resetProgress: () => void;
}

export type GameState = Persisted & Runtime & Actions;

const today = () => new Date().toISOString().slice(0, 10);

const initialPersisted = (): Persisted => ({
  playerName: 'Sai Explorer',
  level: 1,
  xp: 0,
  saiEnergy: 300,
  cityXp: {},
  wallet: { address: null, collections: [] },
  quests: {},
  trackedQuest: null,
  inventory: {},
  skins: ['classic'],
  equippedSkin: 'classic',
  equippedPet: null,
  flags: {},
  collected: {},
  fastTravel: [],
  dailyDate: '',
  room: { level: 1, slots: {}, trophies: {} },
  lore: [],
  stamps: [],
  seasonClaimed: [],
  totalOrbs: 0,
  settings: {
    quality:
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'low' : 'high',
    sound: true,
    music: true,
  },
});

let toastId = 1;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialPersisted(),
      scene: 'home',
      spawn: 'start',
      transition: null,
      panel: null,
      panelArg: null,
      prompt: null,
      dialog: null,
      reward: null,
      toasts: [],
      riding: false,
      hydrated: false,

      goTo: (to, spawn, kind = 'fade') => {
        if (kind === 'warp') play('portal');
        set({ transition: { to, kind, spawn }, panel: null, dialog: null, prompt: null });
      },
      finishTransition: () => {
        const t = get().transition;
        if (!t) return;
        set({ scene: t.to, spawn: t.spawn, transition: null, riding: false });
        if (t.to === 'rio' && !get().flags.visitedRio) {
          get().setFlag('visitedRio');
        }
        get().checkDaily();
      },

      openPanel: (p, arg) => {
        play('click');
        set({ panel: p, panelArg: arg ?? null, dialog: null });
      },
      closePanel: () => set({ panel: null, panelArg: null }),
      setPrompt: (p) => set({ prompt: p }),
      showDialog: (d) => set({ dialog: d }),
      toast: (text, icon) => {
        const id = toastId++;
        set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, icon }] }));
        setTimeout(() => get().dismissToast(id), 3200);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      closeReward: () => set({ reward: null }),

      acceptQuest: (id) => {
        const s = get();
        const def = questById(id);
        if (!isQuestAvailable(def, s)) return;
        set({ quests: { ...s.quests, [id]: { status: 'active', step: 0, count: 0 } }, trackedQuest: id });
        play('quest');
        get().toast(`Quest accepted: ${def.title}`, '📜');
      },
      trackQuest: (id) => set({ trackedQuest: id }),

      questEvent: (ev) => {
        const s = get();
        const res = applyQuestEvent(QUESTS, s.quests, ev);
        if (!res.advanced.length && !res.completed.length && !res.progressed.length) return;
        set({ quests: res.quests });
        for (const id of res.advanced) {
          const def = questById(id);
          const obj = def.objectives[res.quests[id].step];
          get().toast(obj.label, '➜');
        }
        for (const id of res.completed) {
          const def = questById(id);
          const levelUp = get().grantReward(def.reward, def.city);
          get().setFlag(`done:${id}`);
          if (def.lore) set((st) => ({ lore: [...st.lore, def.lore!] }));
          play('quest');
          set({
            reward: {
              title: 'Quest Complete!',
              subtitle: def.title,
              reward: def.reward,
              lore: def.lore,
              levelUp,
            },
          });
          if (get().trackedQuest === id) {
            const next = Object.entries(get().quests).find(([, q]) => q.status === 'active');
            set({ trackedQuest: next?.[0] ?? null });
          }
        }
      },

      grantReward: (r, city) => {
        const s = get();
        const lv = addXp(s.level, s.xp, r.xp ?? 0);
        const inventory = { ...s.inventory };
        const skins = [...s.skins];
        for (const it of r.items ?? []) {
          if (it.id.startsWith('skin_')) {
            const sk = it.id.slice(5);
            if (!skins.includes(sk)) skins.push(sk);
          } else {
            inventory[it.id] = (inventory[it.id] ?? 0) + (it.count ?? 1);
          }
        }
        const cityXp = { ...s.cityXp };
        if (city && r.cityXp) cityXp[city] = (cityXp[city] ?? 0) + r.cityXp;
        set({ level: lv.level, xp: lv.xp, saiEnergy: s.saiEnergy + (r.energy ?? 0), inventory, skins, cityXp });
        if (lv.levelsGained.length) {
          play('levelup');
          get().toast(`Level up! You are now level ${lv.level}`, '⭐');
          return lv.level;
        }
        return undefined;
      },

      setFlag: (f, v = true) => set((s) => ({ flags: { ...s.flags, [f]: v } })),

      collect: (key, opts = {}) => {
        const s = get();
        if (s.collected[key]) return;
        set({
          collected: { ...s.collected, [key]: true },
          saiEnergy: s.saiEnergy + (opts.energy ?? 0),
          totalOrbs: key.startsWith('orb:') ? s.totalOrbs + 1 : s.totalOrbs,
        });
        if (opts.xp) get().grantReward({ xp: opts.xp });
        if (opts.item) {
          const inv = { ...get().inventory };
          inv[opts.item] = (inv[opts.item] ?? 0) + 1;
          set({ inventory: inv });
        }
        if (opts.toast) get().toast(opts.toast, opts.icon);
        if (opts.event) get().questEvent(opts.event);
      },

      discoverFastTravel: (id, name) => {
        const s = get();
        if (s.fastTravel.includes(id)) return;
        set({ fastTravel: [...s.fastTravel, id] });
        get().toast(`Fast travel unlocked: ${name}`, '📍');
      },

      buy: (id, price) => {
        const s = get();
        if (s.saiEnergy < price) {
          play('error');
          get().toast('Not enough SAI Energy', '⚡');
          return false;
        }
        if (id.startsWith('skin_')) {
          set({ saiEnergy: s.saiEnergy - price, skins: [...s.skins, id.slice(5)] });
          get().toast(`${skinById(id.slice(5)).name} unlocked`, '👕');
        } else {
          set({ saiEnergy: s.saiEnergy - price, inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + 1 } });
          get().toast(`Bought ${itemById(id)?.name ?? id}`, itemById(id)?.icon);
        }
        play('collect');
        return true;
      },
      equipSkin: (id) => set({ equippedSkin: id }),
      equipPet: (id) => set({ equippedPet: id }),
      setRiding: (v) => set({ riding: v }),

      placeFurniture: (slot, item) => {
        const s = get();
        const inv = { ...s.inventory };
        const prev = s.room.slots[slot];
        if (prev) inv[prev.item] = (inv[prev.item] ?? 0) + 1;
        if (item) {
          if (!inv[item]) return;
          inv[item] -= 1;
        }
        set({
          inventory: inv,
          room: { ...s.room, slots: { ...s.room.slots, [slot]: item ? { item, rot: prev?.rot ?? 0 } : null } },
        });
      },
      rotateFurniture: (slot) => {
        const s = get();
        const p = s.room.slots[slot];
        if (!p) return;
        set({ room: { ...s.room, slots: { ...s.room.slots, [slot]: { ...p, rot: (p.rot + 1) % 4 } } } });
      },
      placeTrophy: (slot, item) => {
        const s = get();
        const inv = { ...s.inventory };
        const prev = s.room.trophies[slot];
        if (prev) inv[prev] = (inv[prev] ?? 0) + 1;
        if (item) {
          if (!inv[item]) return;
          inv[item] -= 1;
        }
        set({ inventory: inv, room: { ...s.room, trophies: { ...s.room.trophies, [slot]: item } } });
        if (item === 'rio_energy_crystal' && !s.flags.crystalPlaced) {
          get().setFlag('crystalPlaced');
          play('crystal');
          get().toast('The crystal hums… New story chapter available!', '💎');
        }
      },
      upgradeRoom: (cost) => {
        const s = get();
        if (s.saiEnergy < cost) {
          play('error');
          get().toast('Not enough SAI Energy', '⚡');
          return false;
        }
        set({ saiEnergy: s.saiEnergy - cost, room: { ...s.room, level: s.room.level + 1 } });
        play('levelup');
        return true;
      },

      setWallet: (address, collections) => {
        const s = get();
        set({ wallet: { address, collections } });
        if (ownedCities(collections).includes('rio') && !s.skins.includes('rio')) {
          // NFT perks are cosmetic / content, never stats (TZ §7)
          set({ skins: [...get().skins, 'rio'] });
          get().toast('Rio NFT detected: Full City Access + Rio Sai skin', '🎟️');
        }
      },
      claimSeasonTier: (tier, reward) => {
        const s = get();
        if (s.seasonClaimed.includes(tier)) return;
        set({ seasonClaimed: [...s.seasonClaimed, tier] });
        get().grantReward(reward);
        play('collect');
      },
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      checkDaily: () => {
        const s = get();
        const d = today();
        if (s.dailyDate === d) return;
        const quests = { ...s.quests };
        for (const q of QUESTS) if (q.repeat === 'daily') delete quests[q.id];
        const collected: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(s.collected)) {
          if (!k.startsWith('orb:') && !k.startsWith('vp:')) collected[k] = v;
        }
        set({ dailyDate: d, quests, collected, saiEnergy: s.saiEnergy + (s.dailyDate ? 50 : 0) });
        if (s.dailyDate) get().toast('Daily login bonus: +50 SAI Energy. New daily quests!', '🎁');
      },

      resetProgress: () => {
        set({ ...initialPersisted(), scene: 'home', spawn: 'start', panel: null, reward: null, dialog: null, riding: false });
        get().checkDaily();
      },
    }),
    {
      name: 'sai-universe-save-v1',
      partialize: (s) => {
        const keys = Object.keys(initialPersisted()) as (keyof Persisted)[];
        const out: Partial<Persisted> = {};
        for (const k of keys) (out as Record<string, unknown>)[k] = s[k];
        return out;
      },
      onRehydrateStorage: () => (state) => {
        state?.checkDaily();
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

/** Helpers */
export const hasItem = (s: GameState, id: string) => (s.inventory[id] ?? 0) > 0;

export function activeObjective(s: Pick<GameState, 'quests'>, questId: string) {
  const q = s.quests[questId];
  if (!q || q.status !== 'active') return undefined;
  return questById(questId).objectives[q.step];
}
